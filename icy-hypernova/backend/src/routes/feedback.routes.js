const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { createFeedback, getUserFeedback } = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.post('/', authenticate, [
  body('request_id').isUUID().withMessage('Valid request ID required'),
  body('reviewee_id').isUUID().withMessage('Valid reviewee ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('feedback_type').isIn(['donor', 'volunteer', 'receiver']).withMessage('Invalid feedback type'),
  validate
], createFeedback);

router.get('/:userId', authenticate, getUserFeedback);

module.exports = router;
