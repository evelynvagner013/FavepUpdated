const express = require('express');
const router = express.Router();
const MercadoPagoController = require('../controllers/MercadoPagoController');
const authMiddleware = require('../middlewares/auth');

router.post('/create-preference', authMiddleware, MercadoPagoController.createPreference);
router.post('/webhook', MercadoPagoController.handleWebhook);

module.exports = router;