const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const authController = require('../controllers/authController');

// Fluxo de Cadastro e Verificação
router.post('/register', authController.register);
router.post('/verify-and-set-password', authController.verifyEmailAndSetPassword);

// Fluxo de Redefinição de Senha
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rotas Originais
router.post('/login', authController.login);
router.put('/update', authMiddleware, authController.update);
//router.delete('/delete', authMiddleware, authController.delete);

module.exports = router;