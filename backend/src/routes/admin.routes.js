const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getUsers, toggleUserStatus, changeUserRole, getActivityLogs, broadcastNotification } = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.patch('/users/:id/role', [
  body('role').isIn(['admin', 'donor', 'volunteer', 'receiver']).withMessage('Invalid role'),
  validate
], changeUserRole);
router.get('/activity', getActivityLogs);
router.post('/broadcast', [
  body('title').trim().isLength({ min: 3 }).withMessage('Title required'),
  body('message').trim().isLength({ min: 5 }).withMessage('Message required'),
  validate
], broadcastNotification);

module.exports = router;
