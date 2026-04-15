const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const { sanitizeUser, createNotification } = require('../utils/helpers');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, city, state, address, latitude, longitude } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Validate role
    const allowedRoles = ['donor', 'volunteer', 'receiver'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be donor, volunteer, or receiver.' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, city, state, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, email, passwordHash, role, phone || null, city || null, state || null, address || null, latitude || null, longitude || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    // Send welcome email (non-blocking)
    sendEmail(email, 'welcome', [name, role]).catch(() => {});

    // Log activity
    await query(
      "INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES ($1, 'register', $2, $3)",
      [user.id, `New ${role} registered`, req.ip]
    ).catch(() => {});

    logger.info(`New user registered: ${email} as ${role}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user: sanitizeUser(user),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});

    // Log activity
    await query(
      "INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES ($1, 'login', $2, $3)",
      [user.id, `${user.role} logged in`, req.ip]
    ).catch(() => {});

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        user: sanitizeUser(user),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      data: { user: sanitizeUser(result.rows[0]) }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    // Generic message to prevent account enumeration
    res.json({ 
      success: true, 
      message: 'If an account exists with that email, a password reset link has been sent. Please contact abinayakannan999@gmail.com if you do not receive it in 15 minutes.' 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword, forgotPassword };
