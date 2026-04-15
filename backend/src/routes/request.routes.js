const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getRequests, createRequest, updateRequestStatus, getRequestById, verifyQRCode } = require('../controllers/request.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.get('/', authenticate, getRequests);
router.get('/:id', authenticate, getRequestById);

router.post('/', authenticate, authorize('receiver', 'admin'), [
  body('donation_id').isUUID().withMessage('Valid donation ID required'),
  body('quantity_requested').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('delivery_address').trim().isLength({ min: 10 }).withMessage('Delivery address required'),
  body('urgency_level').optional().isInt({ min: 1, max: 5 }).withMessage('Urgency must be 1-5'),
  validate
], createRequest);

router.patch('/:id/status', authenticate, [
  body('status').isIn(['accepted', 'rejected', 'assigned', 'in_transit', 'completed', 'cancelled']).withMessage('Invalid status'),
  validate
], updateRequestStatus);

router.post('/:id/verify-qr', authenticate, verifyQRCode);

module.exports = router;
