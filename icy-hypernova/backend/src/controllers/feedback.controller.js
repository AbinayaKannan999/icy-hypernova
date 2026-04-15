const { query } = require('../database/db');
const { createNotification, getPaginationParams } = require('../utils/helpers');
const logger = require('../utils/logger');

// POST /api/feedback - Submit feedback
const createFeedback = async (req, res, next) => {
  try {
    const { request_id, reviewee_id, rating, comment, feedback_type } = req.body;

    // Validate request exists and is completed
    const requestResult = await query(
      "SELECT * FROM food_requests WHERE id = $1 AND status = 'completed'",
      [request_id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Completed request not found.' });
    }

    // Check duplicate
    const existing = await query(
      'SELECT id FROM feedback WHERE request_id = $1 AND reviewer_id = $2 AND feedback_type = $3',
      [request_id, req.user.id, feedback_type]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Feedback already submitted.' });
    }

    const result = await query(
      `INSERT INTO feedback (request_id, reviewer_id, reviewee_id, rating, comment, feedback_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [request_id, req.user.id, reviewee_id, rating, comment || null, feedback_type]
    );

    const feedback = result.rows[0];
    const io = req.app.get('io');

    // Notify reviewee
    await createNotification(io, reviewee_id, 'feedback_received',
      'New Feedback Received ⭐',
      `${req.user.name} rated you ${rating}/5 stars.`,
      request_id, 'request'
    );

    res.status(201).json({ success: true, message: 'Feedback submitted!', data: { feedback } });
  } catch (error) {
    next(error);
  }
};

// GET /api/feedback/:userId - Get feedback for a user
const getUserFeedback = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const result = await query(
      `SELECT f.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar
       FROM feedback f
       JOIN users u ON f.reviewer_id = u.id
       WHERE f.reviewee_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.userId, limit, offset]
    );

    const stats = await query(
      'SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total FROM feedback WHERE reviewee_id = $1',
      [req.params.userId]
    );

    res.json({
      success: true,
      data: {
        feedback: result.rows,
        stats: {
          averageRating: parseFloat(stats.rows[0].avg_rating).toFixed(1),
          totalFeedback: parseInt(stats.rows[0].total)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createFeedback, getUserFeedback };
