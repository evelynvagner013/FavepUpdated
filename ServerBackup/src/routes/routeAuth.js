const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');

// Rotas públicas
router.post('/register', authController.register);
router.post('/verify-email-code', authController.verifyEmailCode);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rotas protegidas
router.post('/complete-sub-user-profile', authController.completeSubUserProfile);
router.put('/update', authMiddleware, authController.update); // Alterado para fluxo de verificação de email
router.post('/verify-new-email', authMiddleware, authController.verifyNewEmail); // NOVO: Rota para verificar o novo email

// Rota para o admin pré-cadastrar um sub-usuário
router.post('/pre-register-sub-user', authMiddleware, authController.preRegisterSubUser);

// Rota de alteração de senha com 2FA
router.post('/iniciar-change-password-2fa', authMiddleware, authController.iniciarChangePassword2FA);
router.post('/finalizar-change-password-2fa', authMiddleware, authController.finalizarChangePassword2FA);

module.exports = router;