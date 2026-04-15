const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getVolunteers } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/volunteers', authenticate, authorize('admin'), getVolunteers);
router.get('/:id/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
