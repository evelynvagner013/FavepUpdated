const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const authConfig = require('../config/auth.json');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../service/mailService'); // Verifique o caminho

// Gera um token JWT para autenticação
function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, { expiresIn: 86400 });
}

// Gera um token aleatório para verificação de e-mail e redefinição de senha
function generateCryptoToken() {
  return crypto.randomBytes(20).toString('hex');
}

module.exports = {
  // # register
  async register(req, res) {
    console.log('➡️ Requisição recebida em /register');
    const { nome, email, telefone } = req.body;

    if (!nome || !email || !telefone) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, email, telefone.'
      });
    }

    try {
      const existingUser = await prisma.usuario.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe com este email.' });
      }

      const verificationToken = generateCryptoToken();
      
      const user = await prisma.usuario.create({
        data: {
          nome,
          email,
          telefone,
          senha: '', // Senha vazia até a verificação
          verificationToken: verificationToken,
        }
      });

      await sendVerificationEmail(user.email, verificationToken);
      console.log(`✅ E-mail de verificação enviado para ${user.email}`);

      return res.status(201).json({
        message: 'Usuário pré-registrado! Verifique seu e-mail para confirmar o cadastro e definir sua senha.'
      });
    } catch (err) {
      console.error('❌ Erro no register:', err.message);
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  },

  // # verifyEmailAndSetPassword
  async verifyEmailAndSetPassword(req, res) {
    const { token, senha, confirmarSenha } = req.body;
    
    if (!token || !senha || !confirmarSenha) {
        return res.status(400).json({ error: 'Token e senhas são obrigatórios.' });
    }

    if (senha !== confirmarSenha) {
        return res.status(400).json({ error: 'As senhas não coincidem.' });
    }
    
    try {
      const user = await prisma.usuario.findFirst({ 
        where: { verificationToken: token } 
      });
      
      if (!user) {
        return res.status(400).json({ error: 'Token de verificação inválido ou expirado.' });
      }
        
      const hashedPassword = await bcrypt.hash(senha, 8);
        
      await prisma.usuario.update({
          where: { id: user.id },
          data: {
              senha: hashedPassword,
              verificationToken: null,
              emailVerified: true
          }
      });

      console.log('✅ Senha definida com sucesso para o usuário:', user.email);
      return res.status(200).json({ message: 'E-mail verificado e senha definida com sucesso! Agora você pode fazer login.' });
    } catch (error) {
        console.error('❌ Erro ao definir senha:', error.message);
        return res.status(500).json({ error: 'Erro ao verificar o e-mail e definir a senha.' });
    }
  },

  // # forgotPassword
  async forgotPassword(req, res) {
    const { email } = req.body;

    try {
      const user = await prisma.usuario.findUnique({ where: { email } });

      if (!user) {
        // Resposta genérica para segurança
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

  // # resetPassword
  async resetPassword(req, res) {
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
              resetPasswordExpires: { gt: new Date() } // 'gt' significa "greater than" (maior que)
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

  // # login
  async login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
      const user = await prisma.usuario.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: 'Usuário não encontrado.' });
      }

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

// # update
  async update(req, res) {
    const authenticatedUserId = req.userId;
    const { nome, email, telefone, fotoperfil } = req.body; // Adicione fotoperfil aqui

    try {
      const updateData = {};
      if (nome) updateData.nome = nome;
      if (email) updateData.email = email;
      if (telefone) updateData.telefone = telefone;
      if (fotoperfil) updateData.fotoperfil = fotoperfil; // Adicione esta linha para a foto de perfil

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