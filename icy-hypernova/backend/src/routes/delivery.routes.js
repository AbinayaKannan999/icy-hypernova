const express = require('express');
const router = express.Router();
const { getDeliveries, createDelivery, updateDeliveryStatus, getDeliveryTracking } = require('../controllers/delivery.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, getDeliveries);
router.post('/', authenticate, authorize('volunteer', 'admin'), createDelivery);
router.patch('/:id/status', authenticate, authorize('volunteer', 'admin'), updateDeliveryStatus);
router.get('/:id/tracking', authenticate, getDeliveryTracking);

module.exports = router;
