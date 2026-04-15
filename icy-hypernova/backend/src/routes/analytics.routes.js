const express = require('express');
const router = express.Router();
const { getOverview, getDonationsOverTime, getRequestsByStatus, getFoodByCategory, getLeaderboard, getMyStats } = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/overview', authenticate, getOverview);
router.get('/donations-over-time', authenticate, getDonationsOverTime);
router.get('/requests-by-status', authenticate, getRequestsByStatus);
router.get('/food-by-category', authenticate, getFoodByCategory);
router.get('/leaderboard', authenticate, getLeaderboard);
router.get('/my-stats', authenticate, getMyStats);

module.exports = router;
