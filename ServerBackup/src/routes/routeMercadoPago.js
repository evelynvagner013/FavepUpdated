const express = require('express');
const router = express.Router();
const mercadoPagoController = require('../controllers/MercadoPagoController');
const authMiddleware = require('../middlewares/auth');

router.post('/create-subscription', authMiddleware, mercadoPagoController.createSubscription);
router.post('/webhook', mercadoPagoController.handleWebhook);

module.exports = router;