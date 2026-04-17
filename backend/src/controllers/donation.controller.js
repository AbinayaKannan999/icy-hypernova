const { query } = require('../database/db');
const { createNotification, getPaginationParams } = require('../utils/helpers');
const { sendEmail } = require('../utils/emailService');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

// GET /api/donations - List all available donations
const getDonations = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { food_type, city, available_only } = req.query;

    let whereClause = 'WHERE fd.expiry_time > NOW()';
    const params = [];
    let paramCount = 0;

    if (available_only !== 'false') {
      whereClause += ' AND fd.is_available = true';
    }
    if (food_type) {
      paramCount++;
      whereClause += ` AND fd.food_type = $${paramCount}`;
      params.push(food_type);
    }
    if (city) {
      paramCount++;
      whereClause += ` AND fd.pickup_city ILIKE $${paramCount}`;
      params.push(`%${city}%`);
    }

    // For donors: only show their own donations
    if (req.user.role === 'donor') {
      paramCount++;
      whereClause += ` AND fd.donor_id = $${paramCount}`;
      params.push(req.user.id);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM food_donations fd ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT fd.*, u.name as donor_name, u.phone as donor_phone, u.city as donor_city,
        (SELECT COUNT(*) FROM food_requests fr WHERE fr.donation_id = fd.id AND fr.status NOT IN ('rejected', 'cancelled')) as request_count
       FROM food_donations fd
       JOIN users u ON fd.donor_id = u.id
       ${whereClause}
       ORDER BY fd.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      success: true,
      data: {
        donations: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/donations/:id - Get single donation
const getDonationById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT fd.*, u.name as donor_name, u.phone as donor_phone, u.email as donor_email, u.avatar_url as donor_avatar
       FROM food_donations fd
       JOIN users u ON fd.donor_id = u.id
       WHERE fd.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    res.json({ success: true, data: { donation: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};

// POST /api/donations - Create donation
const createDonation = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins are mission overseers only and cannot create donations.' });
    }
    const {
      title, description, food_type, quantity, quantity_unit, condition,
      preparation_time, expiry_time, pickup_address, pickup_city,
      pickup_latitude, pickup_longitude, special_instructions, allergen_info,
      is_vegetarian, serving_count
    } = req.body;

    // Validate expiry time
    const expiryDate = new Date(expiry_time);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

    if (expiryDate <= now) {
      return res.status(400).json({ success: false, message: 'Expiry time must be in the future.' });
    }
    if (hoursUntilExpiry < 1) {
      return res.status(400).json({ success: false, message: 'Food expires too soon (less than 1 hour). Cannot add unsafe food.' });
    }

    const result = await query(
      `INSERT INTO food_donations (
        donor_id, title, description, food_type, quantity, quantity_remaining, quantity_unit, condition,
        preparation_time, expiry_time, pickup_address, pickup_city, pickup_latitude,
        pickup_longitude, special_instructions, allergen_info, is_vegetarian, serving_count
      ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        req.user.id,                          // $1 donor_id
        title,                                // $2 title
        description || null,                  // $3 description
        food_type || 'other',                 // $4 food_type
        quantity,                             // $5 quantity (also used for quantity_remaining)
        quantity_unit || 'servings',          // $6 quantity_unit
        condition || 'good',                  // $7 condition
        preparation_time || null,             // $8 preparation_time
        expiry_time,                          // $9 expiry_time
        pickup_address || '',                 // $10 pickup_address
        pickup_city || 'Chennai',             // $11 pickup_city
        pickup_latitude || null,              // $12 pickup_latitude
        pickup_longitude || null,             // $13 pickup_longitude
        special_instructions || null,         // $14 special_instructions
        allergen_info || null,                // $15 allergen_info
        is_vegetarian !== false,              // $16 is_vegetarian
        serving_count || quantity             // $17 serving_count
      ]
    );

    const donation = result.rows[0];

    // Notify all admins
    const io = req.app.get('io');
    const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    for (const admin of admins.rows) {
      await createNotification(io, admin.id, 'donation_added',
        'New Food Donation', `${req.user.name} added: ${title} (${quantity} ${quantity_unit || 'servings'})`,
        donation.id, 'donation');
    }

    logger.info(`Donation created: ${title} by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: 'Donation added successfully!',
      data: { donation }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/donations/:id - Update donation
const updateDonation = async (req, res, next) => {
  try {
    const donation = await query('SELECT * FROM food_donations WHERE id = $1', [req.params.id]);
    
    if (donation.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    if (donation.rows[0].donor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this donation.' });
    }

    const { title, description, quantity, condition, expiry_time, is_available, special_instructions } = req.body;

    const result = await query(
      `UPDATE food_donations SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        quantity = COALESCE($3, quantity),
        condition = COALESCE($4, condition),
        expiry_time = COALESCE($5, expiry_time),
        is_available = COALESCE($6, is_available),
        special_instructions = COALESCE($7, special_instructions),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, quantity, condition, expiry_time, is_available, special_instructions, req.params.id]
    );

    res.json({ success: true, message: 'Donation updated.', data: { donation: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/donations/:id
const deleteDonation = async (req, res, next) => {
  try {
    const donation = await query('SELECT * FROM food_donations WHERE id = $1', [req.params.id]);
    
    if (donation.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    if (donation.rows[0].donor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await query('DELETE FROM food_donations WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Donation deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDonations, getDonationById, createDonation, updateDonation, deleteDonation };
