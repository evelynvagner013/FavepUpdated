const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);
router.get('/properties', propertyController.getAllProperties);
router.get('/propGetById/:id', propertyController.getPropertyById);
router.post('/registerProp', propertyController.createProperty);
router.put('/updateProp/:id', propertyController.updateProperty);
router.delete('/propDelete/:id', propertyController.deleteProperty);

module.exports = router;