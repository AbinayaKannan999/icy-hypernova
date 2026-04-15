const { query } = require('../database/db');
const { createNotification } = require('../utils/helpers');
const logger = require('../utils/logger');

// GET /api/deliveries - Get deliveries
const getDeliveries = async (req, res, next) => {
  try {
    const user = req.user;
    let whereClause = 'WHERE 1=1';
    const params = [];
    const { status, monitor_only } = req.query;

    if (monitor_only === 'true') {
      whereClause += " AND d.status IN ('pending', 'picked_up', 'in_transit')";
    } else if (user.role === 'receiver') {
      whereClause += ' AND d.receiver_id = $1';
      params.push(user.id);
    } else if (user.role === 'donor') {
      whereClause += ' AND fd.donor_id = $1';
      params.push(user.id);
    }

    if (status) {
      const statusList = status.split(',');
      whereClause += ` AND d.status = ANY($${params.length + 1})`;
      params.push(statusList);
    }

    const result = await query(
      `SELECT d.*,
        fr.delivery_address, fr.delivery_city, fr.delivery_latitude, fr.delivery_longitude,
        fd.title as donation_title, fd.pickup_address, fd.pickup_latitude, fd.pickup_longitude,
        u_rec.name as receiver_name, u_rec.phone as receiver_phone
       FROM deliveries d
       JOIN food_requests fr ON d.request_id = fr.id
       JOIN food_donations fd ON fr.donation_id = fd.id
       JOIN users u_rec ON d.receiver_id = u_rec.id
       ${whereClause}
       ORDER BY d.created_at DESC`,
      params
    );

    res.json({ success: true, data: { deliveries: result.rows } });
  } catch (error) {
    next(error);
  }
};

// POST /api/deliveries - Create delivery (volunteer accepts)
const createDelivery = async (req, res, next) => {
  try {
    const { request_id } = req.body;
    const user = req.user;

    if (user.role !== 'receiver') {
      return res.status(403).json({ success: false, message: 'Only receivers can initiate their own pickups.' });
    }

    // Check request is accepted
    const requestResult = await query(
      `SELECT fr.*, fd.pickup_latitude, fd.pickup_longitude, fd.title,
              fr.delivery_latitude, fr.delivery_longitude, fd.donor_id
       FROM food_requests fr
       JOIN food_donations fd ON fr.donation_id = fd.id
       WHERE fr.id = $1 AND fr.status = 'accepted' AND fr.receiver_id = $2`,
      [request_id, user.id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Accepted request not found for this user.' });
    }

    const request = requestResult.rows[0];

    // Create delivery (Receiver mission)
    const result = await query(
      `INSERT INTO deliveries (request_id, receiver_id, status, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6) RETURNING *`,
      [request_id, user.id, request.pickup_latitude, request.pickup_longitude,
       request.delivery_latitude, request.delivery_longitude]
    );

    // Update request with status
    await query(
      "UPDATE food_requests SET status = 'in_transit', updated_at = NOW() WHERE id = $1",
      [request_id]
    );

    const delivery = result.rows[0];
    const io = req.app.get('io');

    // Notify donor
    await createNotification(io, request.donor_id, 'delivery_started',
      'Receiver En Route! 🚚', `${user.name} is coming to pick up "${request.title}"`, delivery.id, 'delivery');

    res.status(201).json({ success: true, message: 'Mission started!', data: { delivery } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/deliveries/:id/status
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;

    const deliveryResult = await query(
      `SELECT d.*, fr.receiver_id, fd.donor_id, fd.title
       FROM deliveries d
       JOIN food_requests fr ON d.request_id = fr.id
       JOIN food_donations fd ON fr.donation_id = fd.id
       WHERE d.id = $1 AND d.receiver_id = $2`,
      [id, req.user.id]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mission not found.' });
    }

    const delivery = deliveryResult.rows[0];

    let extraUpdates = '';
    if (status === 'picked_up') extraUpdates = ', pickup_time = NOW()';
    if (status === 'delivered') extraUpdates = ', actual_delivery_time = NOW()';

    const result = await query(
      `UPDATE deliveries SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()${extraUpdates}
       WHERE id = $3 RETURNING *`,
      [status, notes, id]
    );

    // Sync request status
    const requestStatusMap = { picked_up: 'in_transit', delivered: 'completed' };
    if (requestStatusMap[status]) {
      await query(
        'UPDATE food_requests SET status = $1, updated_at = NOW() WHERE id = $2',
        [requestStatusMap[status], delivery.request_id]
      );
    }

    const io = req.app.get('io');
    const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    const adminIds = admins.rows.map(a => a.id);

    // If Delivered (Receiver Action): Notify Admin, Donor
    if (status === 'delivered') {
      const targets = [...adminIds, delivery.donor_id];
      for (const tid of targets) {
        await createNotification(io, tid, 'delivery_completed',
          'Mission Completed! 🌉', 
          `Receiver ${req.user.name} has confirmed delivery of "${delivery.title}"`, id, 'delivery');
      }
    } else {
      // For picking up / transit updates
      await createNotification(io, delivery.donor_id, 'delivery_started',
        status === 'picked_up' ? 'Food Picked Up! 🎒' : 'Status Update', 
        `Receiver "${req.user.name}" status for "${delivery.title}" is now ${status.replace('_', ' ')}`, id, 'delivery');
    }

    // Emit socket event
    io.to(`delivery_${id}`).emit('delivery_status', { delivery_id: id, status, timestamp: new Date() });

    res.json({ success: true, message: `Delivery updated to ${status}.`, data: { delivery: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};

// GET /api/deliveries/:id/tracking
const getDeliveryTracking = async (req, res, next) => {
  try {
    const tracking = await query(
      `SELECT * FROM location_tracking WHERE delivery_id = $1 ORDER BY recorded_at DESC LIMIT 50`,
      [req.params.id]
    );
    const delivery = await query(
      'SELECT * FROM deliveries WHERE id = $1',
      [req.params.id]
    );

    res.json({ success: true, data: { tracking: tracking.rows, delivery: delivery.rows[0] } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDeliveries, createDelivery, updateDeliveryStatus, getDeliveryTracking };
