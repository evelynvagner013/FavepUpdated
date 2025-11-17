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
router.put('/update', authMiddleware, authController.update);

// Rota para o admin pré-cadastrar um sub-usuário
router.post('/pre-register-sub-user', authMiddleware, authController.preRegisterSubUser);


module.exports = router;