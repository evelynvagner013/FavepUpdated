const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const authConfig = require('../config/auth.json');
// Importamos a função de enviar CÓDIGO de redefinição
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendSubUserWelcomeEmail,
  sendPasswordResetCodeEmail 
} = require('../service/mailService');

function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, { expiresIn: 60 });
}

function generateCryptoToken() {
  return crypto.randomBytes(20).toString('hex');
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//Função para gerar senha aleatória segura
function generateRandomPassword() {
  const length = 10;
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+[]{}|;:,.<>?';
  const allChars = upper + lower + numbers + special;

  let password = '';
  // Garante que temos pelo menos um de cada
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Preenche o resto da senha
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Embaralha a senha para não ter uma ordem previsível
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

//Função para validar a força da senha conforme as regras
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\[\]{}|;:,.<>?~\\-]/.test(password);
  
  if (password.length < minLength) {
    return false;
  }
  if (!hasUpperCase) {
    return false;
  }
  if (!hasLowerCase) {
    return false;
  }
  if (!hasSpecialChar) {
    return false;
  }
  return true;
}


module.exports = {
  //#register-controller
  async register(req, res) {
    console.log('➡️ Requisição recebida em /register');
    const { nome, email, telefone, senha } = req.body;

    if (!nome || !email || !telefone || !senha) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, email, telefone e senha.'
      });
    }

    try {
      const existingUser = await prisma.usuario.findUnique({ where: { email } });
      if (existingUser) {
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

      const hashedPassword = await bcrypt.hash(senha, 8);
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      const user = await prisma.usuario.create({
        data: {
          nome,
          email,
          telefone,
          senha: hashedPassword,
          verificationToken: verificationCode,
          verificationTokenExpires: expiresAt,
          emailVerified: false,
          profileCompleted: true, 
          cargo: 'ADMINISTRADOR'
        }
      });

      await sendVerificationEmail(user.email, verificationCode);
      console.log(`✅ E-mail de verificação (código) enviado para ${user.email}`);

      return res.status(201).json({
        message: 'Registro quase completo! Verifique seu e-mail e insira o código de 6 dígitos.'
      });
    } catch (err) {
      console.error('❌ Erro no register:', err.message);
      if (err.code === 'P2002' && err.meta?.target?.includes('telefone')) {
         return res.status(400).json({ error: 'Este telefone já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  },
  
  //#verify-email-code-controller (Modificado para retornar token)
  async verifyEmailCode(req, res) {
    console.log('➡️ Requisição recebida em /verifyEmailCode');
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    try {
      const user = await prisma.usuario.findFirst({
        where: {
          email: email,
          verificationToken: code,
          verificationTokenExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
      }

      const resetToken = generateCryptoToken();
      const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos para usar o token

      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          verificationToken: null, 
          verificationTokenExpires: null,
          emailVerified: true, 
          resetPasswordToken: resetToken, 
          resetPasswordExpires: resetExpires
        }
      });

      console.log('✅ Código verificado com sucesso para:', user.email);
      // Retorna o token para o frontend
      return res.status(200).json({ 
        message: 'Código verificado com sucesso!',
        token: resetToken 
      });

    } catch (error) {
      console.error('❌ Erro ao verificar código:', error.message);
      return res.status(500).json({ error: 'Erro ao verificar o código.' });
    }
  },

  //#pre-register-sub-user-controller
  async preRegisterSubUser(req, res) {
    console.log('➡️ Requisição recebida em /preRegisterSubUser');
    const { email, cargo } = req.body;
    const adminId = req.userId; 

    if (!email || !cargo) {
      return res.status(400).json({ error: 'Email e cargo são obrigatórios.' });
    }
    if (cargo.toUpperCase() === 'ADMINISTRADOR') {
      return res.status(400).json({ error: 'Não é possível criar um sub-usuário como ADMINISTRADOR.' });
    }
    if (!['GERENTE', 'FUNCIONARIO'].includes(cargo.toUpperCase())) {
        return res.status(400).json({ error: 'Cargo inválido. Use GERENTE ou FUNCIONARIO.' });
    }
    try {
      const adminUser = await prisma.usuario.findUnique({
        where: { id: adminId },
        include: { planos: {
          where: {
            status: 'Pago/Ativo',
            dataExpiracao: { gte: new Date() }
          }
        }}
      });
      if (!adminUser || adminUser.cargo !== 'ADMINISTRADOR') {
        return res.status(403).json({ error: 'Apenas administradores podem criar sub-usuários.' });
      }
      const planoGoldAtivo = adminUser.planos.some(p => p.tipo.toLowerCase().includes('gold'));
      if (!planoGoldAtivo) {
         return res.status(403).json({ error: 'Apenas usuários com o Plano Gold podem adicionar membros.' });
      }
      const existingUser = await prisma.usuario.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Este email já está em uso.' });
      }
      const randomPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(randomPassword, 8);
      const subUsuario = await prisma.usuario.create({
        data: {
          nome: 'Cadastro Pendente', 
          email: email,
          telefone: `temp_${email}`, 
          senha: hashedPassword,
          cargo: cargo.toUpperCase(), 
          adminId: adminId,
          profileCompleted: false, 
          emailVerified: true 
        }
      });
      await sendSubUserWelcomeEmail(email, randomPassword);
      console.log(`✅ Sub-usuário ${email} pré-cadastrado pelo Admin ${adminUser.email}`);
      return res.status(201).json({
        message: 'Sub-usuário pré-cadastrado com sucesso. Um email foi enviado com a senha temporária.'
      });
    } catch (err) {
      console.error('❌ Erro no preRegisterSubUser:', err.message);
      if (err.code === 'P2002') {
         return res.status(400).json({ error: 'Este email ou telefone temporário já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao pré-cadastrar sub-usuário.' });
    }
  },

  //#login-controller
  async login(req, res) {
    console.log('➡️ Requisição recebida em /login');
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    try {
      const user = await prisma.usuario.findUnique({
        where: { email },
        include: {
          planos: {
            where: {
              status: 'Pago/Ativo',
              dataExpiracao: {
                gte: new Date()
              }
            }
          }
        }
      });
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
      if (!user.profileCompleted) {
        console.log(`➡️ Login de ${user.email} (sub-usuário) - Perfil incompleto. Enviando código...`);
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            verificationToken: verificationCode,
            verificationTokenExpires: expiresAt
          }
        });
        await sendVerificationEmail(user.email, verificationCode);
        console.log(`✅ Código de 6 dígitos enviado para ${user.email}`);
        return res.status(401).json({
          message: 'Perfil incompleto. Enviamos um código de 6 dígitos para o seu e-mail.',
          action: 'COMPLETE_PROFILE'
        });
      }
      console.log(`✅ Login bem-sucedido para ${user.email}`);
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

  //#complete-sub-user-profile-controller
  async completeSubUserProfile(req, res) {
    console.log('➡️ Requisição recebida em /completeSubUserProfile');
    const { email, code, nome, telefone, senha, confirmarSenha } = req.body;

    if (!email || !code || !nome || !telefone || !senha || !confirmarSenha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    if (senha !== confirmarSenha) {
      return res.status(400).json({ error: 'As senhas não coincidem.' });
    }
    if (!validatePassword(senha)) {
      return res.status(400).json({
        error: 'A senha não é forte o suficiente. Requer mínimo de 8 caracteres, uma maiúscula, uma minúscula e um caractere especial.'
      });
    }
    try {
      const user = await prisma.usuario.findFirst({
        where: {
          email: email,
          verificationToken: code,
          verificationTokenExpires: { gt: new Date() }
        }
      });
      if (!user) {
        return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
      }
      if (user.profileCompleted) {
        return res.status(400).json({ error: 'Este perfil já foi completado.' });
      }
      const existingPhone = await prisma.usuario.findFirst({
        where: {
          telefone: telefone,
          id: { not: user.id } 
        }
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Este telefone já está em uso.' });
      }
      const hashedPassword = await bcrypt.hash(senha, 8);
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          nome: nome,
          telefone: telefone,
          senha: hashedPassword,
          profileCompleted: true, 
          verificationToken: null,
          verificationTokenExpires: null
        }
      });
      console.log(`✅ Perfil do sub-usuário ${user.email} completado com sucesso.`);
      return res.status(200).json({
        message: 'Perfil completado com sucesso! Agora você pode fazer login com sua nova senha.'
      });
    } catch (err) {
      console.error('❌ Erro no completeSubUserProfile:', err.message);
      if (err.code === 'P2002' && err.meta?.target?.includes('telefone')) {
         return res.status(400).json({ error: 'Este telefone já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao completar o perfil do sub-usuário.' });
    }
  },

  //#forgot-password-controller (Modificado para enviar CÓDIGO)
  async forgotPassword(req, res) {
    console.log('➡️ Requisição recebida em /forgotPassword');
    const { email } = req.body;
    try {
      const user = await prisma.usuario.findUnique({ where: { email } });
      
      if (!user) {
        console.warn(`⚠️ Tentativa de "forgotPassword" para email inexistente: ${email}`);
        return res.status(200).json({ message: 'Se um usuário com este e-mail existir, um código de redefinição será enviado.' });
      }

      const resetCode = generateVerificationCode();
      const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos de validade

      // Salva o CÓDIGO nos campos de verificação
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          verificationToken: resetCode,
          verificationTokenExpires: resetExpires
        }
      });

      // ENVIA O CÓDIGO por email
      await sendPasswordResetCodeEmail(user.email, resetCode);
      
      console.log(`✅ E-mail de redefinição (CÓDIGO) enviado para ${user.email}`);
      return res.status(200).json({ message: 'Código de redefinição de senha enviado com sucesso!' });

    } catch (error) {
      console.error('❌ Erro no forgotPassword:', error.message);
      return res.status(500).json({ error: 'Erro ao solicitar a redefinição de senha.' });
    }
  },

  //#reset-password-controller (Modificado para usar TOKEN)
  async resetPassword(req, res) {
    console.log('➡️ Requisição recebida em /resetPassword');
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
  
  //#update-user-controller
  async update(req, res) {
    console.log('➡️ Requisição recebida em /update (PUT)');
    const authenticatedUserId = req.userId;
    const { nome, email, telefone, fotoperfil } = req.body;
    try {
      const updateData = {};
      if (nome) updateData.nome = nome;
      if (email) updateData.email = email;
      if (telefone) updateData.telefone = telefone;
      if (fotoperfil) updateData.fotoperfil = fotoperfil;

      if (telefone) {
        const existingUser = await prisma.usuario.findFirst({
          where: { 
            telefone: telefone,
            id: { not: authenticatedUserId } 
          }
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Este telefone já está em uso.' });
        }
      }
       if (email) {
        const existingUser = await prisma.usuario.findFirst({
          where: { 
            email: email,
            id: { not: authenticatedUserId } 
          }
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Este email já está em uso.' });
        }
      }

      const user = await prisma.usuario.update({
        where: { id: authenticatedUserId },
        data: updateData,
        include: {
          planos: {
            where: {
              status: 'Pago/Ativo',
              dataExpiracao: {
                gte: new Date()
              }
            }
          }
        }
      });

      user.senha = undefined;
      console.log(`✅ Usuário ${user.email} atualizado com sucesso.`);
      return res.status(200).json({
        user,
        token: generateToken({ id: user.id })
      });
    } catch (err) {
      console.error('❌ Erro ao atualizar usuário:', err.message);
      if (err.code === 'P2002') {
         return res.status(400).json({ error: 'Este email ou telefone já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
  },

  // ### ADICIONADO: Nova função para alterar a senha ###
  async changePassword(req, res) {
    console.log('➡️ Requisição recebida em /changePassword');
    const { senhaAtual, novaSenha, confirmarSenha } = req.body;
    const userId = req.userId; // ID do usuário logado (via authMiddleware)

    // 1. Validações de entrada
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: 'A nova senha e a confirmação não coincidem.' });
    }
    if (novaSenha === senhaAtual) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
    }

    // 2. Validação de força da nova senha
    if (!validatePassword(novaSenha)) {
      return res.status(400).json({
        error: 'A senha não é forte o suficiente. Requer mínimo de 8 caracteres, uma maiúscula, uma minúscula e um caractere especial.'
      });
    }

    try {
      // 3. Busca o usuário e sua senha atual
      const user = await prisma.usuario.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // 4. Compara a senha atual
      const isMatch = await bcrypt.compare(senhaAtual, user.senha);
      if (!isMatch) {
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }

      // 5. Hasheia e salva a nova senha
      const hashedPassword = await bcrypt.hash(novaSenha, 8);

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          senha: hashedPassword
        }
      });

      console.log(`✅ Senha alterada com sucesso para o usuário: ${user.email}`);
      return res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
      console.error('❌ Erro no changePassword:', error.message);
      return res.status(500).json({ error: 'Erro ao alterar a senha.' });
    }
  }
};