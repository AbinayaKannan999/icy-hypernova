const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getDonations, getDonationById, createDonation, updateDonation, deleteDonation } = require('../controllers/donation.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.get('/', authenticate, getDonations);
router.get('/:id', authenticate, getDonationById);

router.post('/', authenticate, authorize('donor', 'admin'), [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('food_type').isIn(['cooked_meals', 'raw_produce', 'packaged_food', 'beverages', 'dairy', 'bakery', 'other']).withMessage('Invalid food type'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('condition').isIn(['excellent', 'good', 'fair', 'needs_immediate_use']).withMessage('Invalid condition'),
  body('expiry_time').isISO8601().withMessage('Valid expiry time required'),
  body('pickup_address').trim().isLength({ min: 10 }).withMessage('Pickup address required (min 10 chars)'),
  validate
], createDonation);

router.put('/:id', authenticate, authorize('donor', 'admin'), updateDonation);
router.delete('/:id', authenticate, authorize('donor', 'admin'), deleteDonation);

module.exports = router;
