const { query } = require('../database/db');
const { createNotification, getPaginationParams, sanitizeUser } = require('../utils/helpers');
const logger = require('../utils/logger');

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { role, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 0;

    if (role) { paramIdx++; whereClause += ` AND role = $${paramIdx}`; params.push(role); }
    if (search) {
      paramIdx++;
      whereClause += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
    }

    params.push(limit, offset);
    const result = await query(
      `SELECT id, name, email, role, phone, city, state, is_active, is_verified, last_login_at, created_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
      params
    );

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page, limit,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/toggle-status
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, is_active',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];
    logger.info(`Admin ${req.user.name} toggled user ${user.email} to ${user.is_active ? 'active' : 'inactive'}`);

    res.json({
      success: true,
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully.`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/role
const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['admin', 'donor', 'volunteer', 'receiver'];
    
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const result = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User role updated.', data: { user: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/activity
const getActivityLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const result = await query(
      `SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM activity_logs');

    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          page, limit,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/broadcast - Send notification to all users or by role
const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, role } = req.body;
    const io = req.app.get('io');

    let usersQuery = 'SELECT id FROM users WHERE is_active = true';
    const params = [];
    if (role) { usersQuery += ' AND role = $1'; params.push(role); }

    const users = await query(usersQuery, params);
    
    for (const user of users.rows) {
      await createNotification(io, user.id, 'system', title, message);
    }

    logger.info(`Admin broadcast sent: "${title}" to ${users.rows.length} users`);

    res.json({
      success: true,
      message: `Notification broadcast sent to ${users.rows.length} users.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, toggleUserStatus, changeUserRole, getActivityLogs, broadcastNotification };
