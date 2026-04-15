const { query } = require('../database/db');
const { sanitizeUser } = require('../utils/helpers');

// GET /api/users/:id/profile
const getProfile = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: { user: sanitizeUser(result.rows[0]) } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile - Update own profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, city, state, country, pincode, latitude, longitude, avatar_url } = req.body;

    const result = await query(
      `UPDATE users SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        country = COALESCE($6, country),
        pincode = COALESCE($7, pincode),
        latitude = COALESCE($8, latitude),
        longitude = COALESCE($9, longitude),
        avatar_url = COALESCE($10, avatar_url),
        updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [name, phone, address, city, state, country, pincode, latitude, longitude, avatar_url, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: sanitizeUser(result.rows[0]) }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/volunteers - Get available volunteers (for admin)
const getVolunteers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, city, latitude, longitude,
        (SELECT COUNT(*) FROM food_requests WHERE volunteer_id = u.id AND status = 'completed') as completed_deliveries
       FROM users u WHERE role = 'volunteer' AND is_active = true ORDER BY name`,
    );
    res.json({ success: true, data: { volunteers: result.rows } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, getVolunteers };
