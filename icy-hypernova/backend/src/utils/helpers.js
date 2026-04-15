const { query } = require('../database/db');
const logger = require('./logger');

/**
 * Create a notification and emit it via Socket.IO
 */
const createNotification = async (io, userId, type, title, message, relatedId = null, relatedType = null) => {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, title, message, relatedId, relatedType]
    );

    const notification = result.rows[0];

    // Emit real-time notification via Socket.IO
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.related_id,
        createdAt: notification.created_at,
        isRead: false
      });
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula (in km)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Find nearest donations to a receiver location
 */
const findNearestDonations = async (latitude, longitude, radiusKm = 20) => {
  try {
    const result = await query(
      `SELECT fd.*, u.name as donor_name, u.phone as donor_phone,
        (6371 * acos(cos(radians($1)) * cos(radians(pickup_latitude)) *
        cos(radians(pickup_longitude) - radians($2)) + sin(radians($1)) *
        sin(radians(pickup_latitude)))) AS distance
      FROM food_donations fd
      JOIN users u ON fd.donor_id = u.id
      WHERE fd.is_available = true
        AND fd.expiry_time > NOW()
        AND fd.pickup_latitude IS NOT NULL
        AND fd.pickup_longitude IS NOT NULL
      HAVING distance < $3
      ORDER BY distance ASC
      LIMIT 20`,
      [latitude, longitude, radiusKm]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to find nearest donations:', error.message);
    return [];
  }
};

/**
 * Sanitize user object (remove sensitive fields)
 */
const sanitizeUser = (user) => {
  const { password_hash, reset_token, reset_token_expires, ...safeUser } = user;
  return safeUser;
};

/**
 * Paginate query results
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = {
  createNotification,
  calculateDistance,
  findNearestDonations,
  sanitizeUser,
  getPaginationParams
};
