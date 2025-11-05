// Conteúdo completo do arquivo: src/controllers/authController.js
// MODIFICADO: Função 'login' atualizada para incluir os planos.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const authConfig = require('../config/auth.json');
// O 'sendVerificationEmail' agora envia o CÓDIGO
const { sendVerificationEmail, sendPasswordResetEmail } = require('../service/mailService');

// Gera um token JWT para autenticação
function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, { expiresIn: 86400 });
}

// Gera um token aleatório (para redefinição de senha)
function generateCryptoToken() {
  return crypto.randomBytes(20).toString('hex');
}

// --- FUNÇÃO AUXILIAR ---
// Gera um código de 6 dígitos
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  // --- MODIFICADO ---
  // # register
  async register(req, res) {
    console.log('➡️ Requisição recebida em /register');
    // Agora aceita 'senha' (como na sua foto image_3eb77d.jpg)
    const { nome, email, telefone, senha } = req.body;

    if (!nome || !email || !telefone || !senha) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, email, telefone e senha.'
      });
    }

    try {
      const existingUser = await prisma.usuario.findUnique({ where: { email } });
      if (existingUser) {
        // Se o usuário existir mas não estiver verificado, apenas atualizamos o código
        if (!existingUser.emailVerified) {
          const newCode = generateVerificationCode();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
          
          await prisma.usuario.update({
            where: { email },
            data: {
              verificationToken: newCode,
              verificationTokenExpires: expiresAt
            }
          });
          
          await sendVerificationEmail(email, newCode);
          console.log(`✅ Código de verificação reenviado para ${email}`);
          return res.status(200).json({
            message: 'Usuário já cadastrado, mas não verificado. Enviamos um novo código para seu e-mail.'
          });
        }
        return res.status(400).json({ error: 'Usuário já existe com este email.' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, 8);
      // Gera código de 6 dígitos
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
      
      const user = await prisma.usuario.create({
        data: {
          nome,
          email,
          telefone,
          senha: hashedPassword, // Salva a senha com hash
          verificationToken: verificationCode, // Salva o código de 6 dígitos
          verificationTokenExpires: expiresAt, // Salva a expiração
          emailVerified: false // Inicia como não verificado
        }
      });

      await sendVerificationEmail(user.email, verificationCode);
      console.log(`✅ E-mail de verificação (código) enviado para ${user.email}`);

      return res.status(201).json({
        message: 'Registro quase completo! Verifique seu e-mail e insira o código de 6 dígitos.'
      });
    } catch (err) {
      console.error('❌ Erro no register:', err.message);
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  },

  // --- RENOMEADO e MODIFICADO ---
  // # verifyEmailCode
  // Esta função substitui 'verifyEmailAndSetPassword'
  async verifyEmailCode(req, res) {
    const { email, code } = req.body;
    
    if (!email || !code) {
        return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }
    
    try {
      const user = await prisma.usuario.findFirst({ 
        where: { 
          email: email,
          verificationToken: code,
          verificationTokenExpires: { gt: new Date() } // gt = "greater than" (maior que agora)
        } 
      });
      
      if (!user) {
        return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
      }
        
      await prisma.usuario.update({
          where: { id: user.id },
          data: {
              verificationToken: null, // Limpa o token
              verificationTokenExpires: null,
              emailVerified: true // VERIFICADO!
          }
      });

      console.log('✅ E-mail verificado com sucesso para:', user.email);
      return res.status(200).json({ message: 'E-mail verificado com sucesso! Agora você pode fazer login.' });
    } catch (error) {
        console.error('❌ Erro ao verificar código:', error.message);
        return res.status(500).json({ error: 'Erro ao verificar o código.' });
    }
  },

  // --- MODIFICADO (Conforme solicitação anterior) ---
  // # login
  // Esta função agora inclui os planos do usuário na resposta.
  async login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    try {
      // --- MODIFICAÇÃO AQUI ---
      // Adicionado 'include' para buscar os planos do usuário
      // Filtra apenas planos que estão "Pago/Ativo"
      const user = await prisma.usuario.findUnique({
        where: { email },
        include: {
          planos: {
            where: {
              status: 'Pago/Ativo'
            }
          }
        }
      });
      // --- FIM DA MODIFICAÇÃO ---

      if (!user) {
        return res.status(400).json({ error: 'Usuário não encontrado.' });
      }
      
      // Esta verificação é crucial e já existia no seu código!
      if (!user.emailVerified) { 
        return res.status(401).json({ error: 'Por favor, confirme seu e-mail antes de fazer login.' });
      }
      
      const isMatch = await bcrypt.compare(senha, user.senha);
      if (!isMatch) {
        return res.status(400).json({ error: 'Senha inválida.' });
      }
      user.senha = undefined;
      return res.status(200).json({
        user,
        token: generateToken({ id: user.id })
      });
    } catch (err) {
      console.error('❌ Erro no login:', err.message);
      return res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  },
  
  // --- SEM MUDANÇAS (Pode manter para "Esqueceu a senha") ---
  // # forgotPassword
  async forgotPassword(req, res) {
    const { email } = req.body;
    try {
      const user = await prisma.usuario.findUnique({ where: { email } });
      if (!user) {
        return res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de redefinição de senha será enviado.' });
      }
      const resetToken = generateCryptoToken();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hora de validade
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires
        }
      });
      await sendPasswordResetEmail(user.email, resetToken);
      console.log(`✅ E-mail de redefinição enviado para ${user.email}`);
      return res.status(200).json({ message: 'E-mail de redefinição de senha enviado com sucesso!' });
    } catch (error) {
      console.error('❌ Erro no forgotPassword:', error.message);
      return res.status(500).json({ error: 'Erro ao solicitar a redefinição de senha.' });
    }
  },

  // --- SEM MUDANÇAS ---
  // # resetPassword
  async resetPassword(req, res) {
    // ... (seu código original)
    const { token, senha, confirmarSenha } = req.body;
    if (!token || !senha || !confirmarSenha) {
        return res.status(400).json({ error: 'Token e senhas são obrigatórios.' });
    }
    if (senha !== confirmarSenha) {
        return res.status(400).json({ error: 'As senhas não coincidem.' });
    }
    try {
      const user = await prisma.usuario.findFirst({
          where: { 
              resetPasswordToken: token,
              resetPasswordExpires: { gt: new Date() }
          }
      });
      if (!user) {
          return res.status(400).json({ error: 'Token de redefinição de senha inválido ou expirado.' });
      }
      const hashedPassword = await bcrypt.hash(senha, 8);
      await prisma.usuario.update({
          where: { id: user.id },
          data: {
              senha: hashedPassword,
              resetPasswordToken: null,
              resetPasswordExpires: null
          }
      });
      console.log('✅ Senha redefinida com sucesso para o usuário:', user.email);
      return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        console.error('❌ Erro no resetPassword:', error.message);
        return res.status(500).json({ error: 'Erro ao redefinir a senha.' });
    }
  },

  // --- SEM MUDANÇAS ---
  // # update
  async update(req, res) {
    // ... (seu código original)
    const authenticatedUserId = req.userId;
    const { nome, email, telefone, fotoperfil } = req.body; 
    try {
      const updateData = {};
      if (nome) updateData.nome = nome;
      if (email) updateData.email = email;
      if (telefone) updateData.telefone = telefone;
      if (fotoperfil) updateData.fotoperfil = fotoperfil; 
      const user = await prisma.usuario.update({
        where: { id: authenticatedUserId },
        data: updateData
      });
      user.senha = undefined;
      return res.status(200).json({
        user,
        token: generateToken({ id: user.id })
      });
    } catch (err) {
      console.error('❌ Erro ao atualizar usuário:', err.message);
      return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
  },
};