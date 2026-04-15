const { query } = require('../database/db');
const { createNotification } = require('../utils/helpers');
const logger = require('../utils/logger');

// GET /api/analytics/overview
const getOverview = async (req, res, next) => {
  try {
    const [
      totalDonations, activeDonations, totalRequests, completedRequests,
      totalUsers, totalBeneficiaries, foodSaved, volunteers
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM food_donations'),
      query("SELECT COUNT(*) FROM food_donations WHERE is_available = true AND expiry_time > NOW()"),
      query('SELECT COUNT(*) FROM food_requests'),
      query("SELECT COUNT(*) FROM food_requests WHERE status = 'completed'"),
      query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      query("SELECT COALESCE(SUM(beneficiary_count), 0) as total FROM food_requests WHERE status = 'completed'"),
      query("SELECT COALESCE(SUM(fr.quantity_requested), 0) as total FROM food_requests fr WHERE fr.status = 'completed'"),
      query("SELECT COUNT(*) FROM users WHERE role = 'volunteer' AND is_active = true")
    ]);

    const userBreakdown = await query(
      "SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role"
    );

    const efficiency = parseInt(totalRequests.rows[0].count) > 0
      ? Math.round((parseInt(completedRequests.rows[0].count) / parseInt(totalRequests.rows[0].count)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalDonations: parseInt(totalDonations.rows[0].count),
          activeDonations: parseInt(activeDonations.rows[0].count),
          totalRequests: parseInt(totalRequests.rows[0].count),
          completedRequests: parseInt(completedRequests.rows[0].count),
          totalUsers: parseInt(totalUsers.rows[0].count),
          totalBeneficiaries: parseInt(totalBeneficiaries.rows[0].total),
          foodSavedServings: parseInt(foodSaved.rows[0].total),
          totalVolunteers: parseInt(volunteers.rows[0].count),
          deliveryEfficiency: efficiency
        },
        userBreakdown: userBreakdown.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/donations-over-time
const getDonationsOverTime = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = Math.min(365, Math.max(7, parseInt(period)));

    const result = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as donations,
        COALESCE(SUM(quantity), 0) as total_quantity
       FROM food_donations
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({ success: true, data: { chart: result.rows, period: days } });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/requests-by-status
const getRequestsByStatus = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT status, COUNT(*) as count FROM food_requests GROUP BY status ORDER BY count DESC`
    );

    res.json({ success: true, data: { chart: result.rows } });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/food-by-category
const getFoodByCategory = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT food_type, COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_servings
       FROM food_donations GROUP BY food_type ORDER BY count DESC`
    );

    res.json({ success: true, data: { chart: result.rows } });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/leaderboard - Top donors
const getLeaderboard = async (req, res, next) => {
  try {
    const [donors, volunteers] = await Promise.all([
      query(`
        SELECT u.id, u.name, u.avatar_url, u.city,
          COUNT(fd.id) as donations_count,
          COALESCE(SUM(fr.quantity_requested), 0) as food_shared,
          COALESCE(SUM(fr.beneficiary_count), 0) as people_helped
        FROM users u
        LEFT JOIN food_donations fd ON u.id = fd.donor_id
        LEFT JOIN food_requests fr ON fd.id = fr.donation_id AND fr.status = 'completed'
        WHERE u.role = 'donor' AND u.is_active = true
        GROUP BY u.id, u.name, u.avatar_url, u.city
        ORDER BY donations_count DESC
        LIMIT 10
      `),
      query(`
        SELECT u.id, u.name, u.avatar_url, u.city,
          COUNT(DISTINCT fr.id) as deliveries_count,
          COALESCE(AVG(f.rating), 0) as avg_rating
        FROM users u
        LEFT JOIN food_requests fr ON u.id = fr.volunteer_id AND fr.status = 'completed'
        LEFT JOIN feedback f ON u.id = f.reviewee_id
        WHERE u.role = 'volunteer' AND u.is_active = true
        GROUP BY u.id, u.name, u.avatar_url, u.city
        ORDER BY deliveries_count DESC
        LIMIT 10
      `)
    ]);

    res.json({
      success: true,
      data: {
        topDonors: donors.rows,
        topVolunteers: volunteers.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/my-stats - Personal stats for current user
const getMyStats = async (req, res, next) => {
  try {
    const user = req.user;
    let stats = {};

    if (user.role === 'donor') {
      const result = await query(
        `SELECT
          COUNT(DISTINCT fd.id) as total_donations,
          COALESCE(SUM(fd.quantity), 0) as total_food_donated,
          COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_requests,
          COALESCE(SUM(CASE WHEN fr.status = 'completed' THEN fr.beneficiary_count ELSE 0 END), 0) as people_helped,
          COALESCE(AVG(f.rating), 0) as avg_rating
         FROM food_donations fd
         LEFT JOIN food_requests fr ON fd.id = fr.donation_id
         LEFT JOIN feedback f ON fd.donor_id = f.reviewee_id
         WHERE fd.donor_id = $1`,
        [user.id]
      );
      stats = result.rows[0];
    } else if (user.role === 'volunteer') {
      const result = await query(
        `SELECT
          COUNT(DISTINCT fr.id) as total_deliveries,
          COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) as completed_deliveries,
          COALESCE(SUM(CASE WHEN fr.status = 'completed' THEN fr.beneficiary_count ELSE 0 END), 0) as people_helped,
          COALESCE(AVG(f.rating), 0) as avg_rating
         FROM food_requests fr
         LEFT JOIN feedback f ON fr.volunteer_id = f.reviewee_id
         WHERE fr.volunteer_id = $1`,
        [user.id]
      );
      stats = result.rows[0];
    } else if (user.role === 'receiver') {
      const result = await query(
        `SELECT
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as received_donations,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN beneficiary_count ELSE 0 END), 0) as beneficiaries_fed,
          COALESCE(AVG(f.rating), 0) as avg_rating_given
         FROM food_requests fr
         LEFT JOIN feedback f ON fr.receiver_id = f.reviewer_id
         WHERE fr.receiver_id = $1`,
        [user.id]
      );
      stats = result.rows[0];
    }

    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview, getDonationsOverTime, getRequestsByStatus, getFoodByCategory, getLeaderboard, getMyStats };
