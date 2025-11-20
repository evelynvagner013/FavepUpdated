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
  return jwt.sign(params, authConfig.secret, { expiresIn: 3900 });
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

// Helper para injetar planos do Admin no Sub-usuário
function inheritAdminPlans(user) {
  if (user.admin && user.admin.planos && user.admin.planos.length > 0) {
    // Combina os planos do usuário (se houver) com os do admin
    // O Frontend vai ler 'user.planos' e encontrar o plano Gold/Base lá
    user.planos = [...(user.planos || []), ...user.admin.planos];
  }
  // Remove o objeto admin para não trafegar dados desnecessários
  delete user.admin;
  return user;
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
    const { email, cargo, propriedades } = req.body; // Recebe a lista de propriedades
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
      // Busca admin, planos E propriedades (para validar posse)
      const adminUser = await prisma.usuario.findUnique({
        where: { id: adminId },
        include: { 
          planos: {
            where: {
              status: 'Pago/Ativo',
              dataExpiracao: { gte: new Date() }
            }
          },
          propriedades: true 
        }
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

      // Lógica de conexão de propriedades (Validação)
      let propriedadesParaConectar = [];
      if (propriedades && Array.isArray(propriedades) && propriedades.length > 0) {
        // Filtra apenas as propriedades que realmente pertencem ao Admin
        propriedadesParaConectar = propriedades.filter(propId => 
            adminUser.propriedades.some(adminProp => adminProp.id === propId)
        );
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
          emailVerified: true,
          // Conecta as propriedades permitidas na tabela de relação
          propriedadesAcessiveis: {
             connect: propriedadesParaConectar.map(id => ({ id }))
          }
        }
      });

      await sendSubUserWelcomeEmail(email, randomPassword);
      console.log(`✅ Sub-usuário ${email} pré-cadastrado pelo Admin ${adminUser.email} com acesso a ${propriedadesParaConectar.length} propriedades.`);
      
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
      // --- MODIFICAÇÃO: Incluir propriedadesAcessiveis ---
      let user = await prisma.usuario.findUnique({
        where: { email },
        include: {
          planos: {
            where: {
              status: 'Pago/Ativo',
              dataExpiracao: {
                gte: new Date()
              }
            }
          },
          propriedadesAcessiveis: true, // Inclui as permissões de visualização
          admin: {
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

      // --- MODIFICAÇÃO: Herdar planos do Admin ---
      user = inheritAdminPlans(user);
      
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
  
  //#update-user-controller (MODIFICADO para fluxo de verificação de email)
  async update(req, res) {
    console.log('➡️ Requisição recebida em /update (PUT)');
    const authenticatedUserId = req.userId;
    const { nome, email, telefone, fotoperfil } = req.body;
    
    try {
      const userToUpdate = await prisma.usuario.findUnique({ where: { id: authenticatedUserId } });

      if (!userToUpdate) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const updateData = {};
      let verificationNeeded = false;
      let oldEmail = userToUpdate.email;

      // --- 1. LÓGICA DE MUDANÇA DE E-MAIL ---
      if (email && email !== userToUpdate.email) {
        const existingEmailUser = await prisma.usuario.findFirst({
          where: { 
            email: email,
            id: { not: authenticatedUserId } 
          }
        });
        if (existingEmailUser) {
          return res.status(400).json({ error: 'Este novo e-mail já está em uso.' });
        }

        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        
        updateData.email = email; 
        updateData.emailVerified = false; 
        updateData.verificationToken = verificationCode;
        updateData.verificationTokenExpires = expiresAt;
        
        verificationNeeded = true;
      } else if (email) {
        updateData.email = email;
      }

      // --- 2. LÓGICA DE MUDANÇA DE TELEFONE/NOME/FOTO ---
      if (nome) updateData.nome = nome;
      if (telefone) updateData.telefone = telefone;
      if (fotoperfil) updateData.fotoperfil = fotoperfil;

      if (telefone && telefone !== userToUpdate.telefone) {
        const existingPhoneUser = await prisma.usuario.findFirst({
          where: { 
            telefone: telefone,
            id: { not: authenticatedUserId } 
          }
        });
        if (existingPhoneUser) {
          return res.status(400).json({ error: 'Este telefone já está em uso.' });
        }
      }
      
      // --- MODIFICAÇÃO: Incluir propriedadesAcessiveis ---
      let user = await prisma.usuario.update({
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
          },
          propriedadesAcessiveis: true,
          admin: {
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
          }
        }
      });
      
      // --- MODIFICAÇÃO: Herdar planos ---
      user = inheritAdminPlans(user);

      // 3. ENVIO DO E-MAIL (após sucesso no DB)
      if (verificationNeeded) {
        await sendVerificationEmail(email, updateData.verificationToken);
        console.log(`✅ E-mail de verificação enviado para o NOVO e-mail: ${email}`);
        
        user.senha = undefined;
        return res.status(202).json({ 
          user, 
          message: `Perfil atualizado. Um código de verificação foi enviado para o novo e-mail (${email}).`,
          verificationPending: true,
          oldEmail: oldEmail
        });
      }

      user.senha = undefined;
      console.log(`✅ Usuário ${user.email} atualizado com sucesso.`);
      return res.status(200).json({
        user,
        token: generateToken({ id: user.id })
      });
      
    } catch (err) {
      console.error('❌ Erro ao atualizar usuário:', err.message);
      return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
  },
  
  // ### NOVO: Função para validar o novo e-mail ###
  async verifyNewEmail(req, res) {
    console.log('➡️ Requisição recebida em /verify-new-email');
    const authenticatedUserId = req.userId;
    const { code } = req.body;
    const cleanCode = code ? code.trim() : '';

    if (!cleanCode) {
      return res.status(400).json({ error: 'O código de verificação é obrigatório.' });
    }

    try {
      const user = await prisma.usuario.findFirst({
        where: {
          id: authenticatedUserId,
          verificationToken: cleanCode,
          verificationTokenExpires: { gt: new Date() },
          emailVerified: false, 
        },
        include: {
          planos: {
            where: {
              status: 'Pago/Ativo',
              dataExpiracao: {
                gte: new Date()
              }
            }
          },
          propriedadesAcessiveis: true,
          admin: {
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
          }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
      }

      // Finaliza a verificação
      let updatedUser = await prisma.usuario.update({
        where: { id: user.id },
        data: {
          verificationToken: null, 
          verificationTokenExpires: null,
          emailVerified: true, 
        },
        include: {
           planos: {
            where: {
              status: 'Pago/Ativo',
              dataExpiracao: {
                gte: new Date()
              }
            }
          },
          propriedadesAcessiveis: true,
          admin: {
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
          }
        }
      });

      // --- MODIFICAÇÃO: Herdar planos ---
      updatedUser = inheritAdminPlans(updatedUser);

      updatedUser.senha = undefined;
      console.log('✅ Novo e-mail verificado com sucesso para:', updatedUser.email);
      
      return res.status(200).json({ 
        message: 'E-mail verificado com sucesso!',
        user: updatedUser,
        token: generateToken({ id: user.id })
      });

    } catch (error) {
      console.error('❌ Erro ao verificar novo e-mail:', error.message);
      return res.status(500).json({ error: 'Erro ao verificar o código.' });
    }
  },
  
  // ### ADICIONADO: Passo 1 do 2FA - Iniciar alteração de senha ###
  async iniciarChangePassword2FA(req, res) {
    console.log('➡️ Requisição recebida em /iniciar-change-password-2fa (Passo 1)');
    const { senhaAtual, novaSenha, confirmarSenha } = req.body;
    const userId = req.userId; 

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: 'A nova senha e a confirmação não coincidem.' });
    }
    if (novaSenha === senhaAtual) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
    }

    if (!validatePassword(novaSenha)) {
      return res.status(400).json({
        error: 'A nova senha não atende aos requisitos de segurança (min. 8 caracteres, maiúscula, minúscula e especial).'
      });
    }

    try {
      const user = await prisma.usuario.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const isMatch = await bcrypt.compare(senhaAtual, user.senha);
      if (!isMatch) {
        console.log(`⚠️ Falha na verificação da senha atual para ${user.email}.`);
        return res.status(400).json({ error: 'Erro ao iniciar alteração de senha. Verifique a senha atual.' });
      }
      
      const authCode = generateVerificationCode(); 
      const authCodeExpires = new Date(Date.now() + 10 * 60 * 1000); 

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          authCode: authCode,
          authCodeExpires: authCodeExpires
        }
      });
      
      await sendPasswordResetCodeEmail(user.email, authCode);
      
      console.log(`✅ Código 2FA para mudança de senha enviado para ${user.email}`);
      return res.status(200).json({ message: 'Código de verificação enviado para seu e-mail/telefone!' });

    } catch (error) {
      console.error('❌ Erro no iniciarChangePassword2FA:', error.message);
      return res.status(500).json({ error: 'Erro interno ao iniciar alteração de senha.' });
    }
  },

  // ### ADICIONADO: Passo 2 do 2FA - Confirmar e finalizar alteração ###
  async finalizarChangePassword2FA(req, res) {
    console.log('➡️ Requisição recebida em /finalizar-change-password-2fa (Passo 2)');
    const { senhaAtual, novaSenha, otp } = req.body; 
    const userId = req.userId;
    const cleanOtp = otp ? otp.trim() : '';

    if (!novaSenha || !cleanOtp || !senhaAtual) {
      return res.status(400).json({ error: 'Os dados de senha e o código são obrigatórios.' });
    }
    
    if (!validatePassword(novaSenha)) {
      return res.status(400).json({
        error: 'A nova senha não atende aos requisitos de segurança.'
      });
    }

    try {
      const user = await prisma.usuario.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const isMatch = await bcrypt.compare(senhaAtual, user.senha);
      if (!isMatch) {
        console.log(`⚠️ Falha na verificação da senha atual no Passo 2 para ${user.email}.`);
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }

      const isExpired = user.authCodeExpires && user.authCodeExpires.getTime() < Date.now();
      const isCodeMatch = user.authCode === cleanOtp; 

      if (!isCodeMatch || isExpired) {
        console.log(`⚠️ Falha na verificação do OTP para ${user.email}. isCodeMatch: ${isCodeMatch}, isExpired: ${isExpired}`);
        
        await prisma.usuario.update({
          where: { id: userId },
          data: {
            authCode: null,
            authCodeExpires: null
          }
        });
        return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
      }

      const hashedPassword = await bcrypt.hash(novaSenha, 8);

      await prisma.usuario.update({
        where: { id: userId },
        data: {
          senha: hashedPassword,
          authCode: null,
          authCodeExpires: null 
        }
      });

      console.log(`✅ Senha alterada com sucesso via 2FA para: ${user.email}`);
      return res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (error) {
      console.error('❌ Erro no finalizarChangePassword2FA:', error.message);
      return res.status(500).json({ error: 'Erro interno ao finalizar alteração de senha.' });
    }
  }
};