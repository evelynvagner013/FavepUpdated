// Conteúdo completo do arquivo: src/routes/routeAuth.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const authController = require('../controllers/authController');

// Fluxo de Cadastro e Verificação
router.post('/register', authController.register);
// --- ROTA MODIFICADA ---
// Aponta para a nova função que verifica o CÓDIGO de 6 dígitos
router.post('/verify-email-code', authController.verifyEmailCode);

// Rota antiga (desativada, a menos que você tenha uma página para ela)
// router.post('/verify-and-set-password', authController.verifyEmailAndSetPassword); 

// Fluxo de Redefinição de Senha (permanece o mesmo)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rotas Originais
router.post('/login', authController.login);
router.put('/update', authMiddleware, authController.update);

module.exports = router;