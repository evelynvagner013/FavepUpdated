const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const authMiddleware = require('../middlewares/auth');

// 🔧 deixe sem autenticação enquanto testa
router.get('/', weatherController.getWeather);

// depois, quando quiser proteger:
// router.get('/', authMiddleware, weatherController.getWeather);

module.exports = router;
