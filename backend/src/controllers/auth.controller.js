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

const otpService = require('../utils/otpService');

// POST /api/auth/forgot-password (OTP Request)
const forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    // Find user by phone (standardized format)
    const phoneClean = phone.replace(/\D/g, '');
    const result = await query('SELECT id, email, name FROM users WHERE phone LIKE $1', [`%${phoneClean}`]);
    
    if (result.rows.length === 0) {
      // Don't reveal if user exists for security
      return res.json({ success: true, message: 'If the number is registered, an OTP will be sent.' });
    }

    const user = result.rows[0];
    const otp = otpService.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    await query(
      'INSERT INTO verification_otps (user_id, otp_code, expires_at) VALUES ($1, $2, $3)',
      [user.id, otp, expiresAt]
    );

    // Send mock SMS
    await otpService.sendSMS(phone, otp);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully! Please check your messages (Developer console for now).',
      debug_otp: process.env.NODE_ENV !== 'production' ? otp : undefined 
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const phoneClean = phone.replace(/\D/g, '');
    
    const result = await query(`
      SELECT vo.* FROM verification_otps vo
      JOIN users u ON u.id = vo.user_id
      WHERE u.phone LIKE $1 AND vo.otp_code = $2 AND vo.is_used = false AND vo.expires_at > NOW()
      ORDER BY vo.created_at DESC LIMIT 1
    `, [`%${phoneClean}`, otp]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password-otp
const resetPasswordWithOTP = async (req, res, next) => {
  try {
    const { phone, otp, newPassword } = req.body;
    const phoneClean = phone.replace(/\D/g, '');
    
    // 1. Double check OTP validity
    const otpResult = await query(`
      SELECT vo.* FROM verification_otps vo
      JOIN users u ON u.id = vo.user_id
      WHERE u.phone LIKE $1 AND vo.otp_code = $2 AND vo.is_used = false AND vo.expires_at > NOW()
      ORDER BY vo.created_at DESC LIMIT 1
    `, [`%${phoneClean}`, otp]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Session expired. Please request a new OTP.' });
    }

    const otpData = otpResult.rows[0];

    // 2. Hash and update password
    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, otpData.user_id]);

    // 3. Mark OTP as used
    await query('UPDATE verification_otps SET is_used = true WHERE id = $1', [otpData.id]);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, changePassword, forgotPassword, verifyOTP, resetPasswordWithOTP };
