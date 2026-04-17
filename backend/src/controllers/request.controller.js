const { query, getClient } = require('../database/db');
const { createNotification, getPaginationParams } = require('../utils/helpers');
const { sendEmail } = require('../utils/emailService');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// GET /api/requests - Get requests based on user role
const getRequests = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status } = req.query;
    const user = req.user;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 0;

    if (status) {
      paramIdx++;
      whereClause += ` AND fr.status = $${paramIdx}`;
      params.push(status);
    }

    // Role-based filtering
    if (user.role === 'receiver') {
      paramIdx++;
      whereClause += ` AND fr.receiver_id = $${paramIdx}`;
      params.push(user.id);
    } else if (user.role === 'donor') {
      paramIdx++;
      whereClause += ` AND fd.donor_id = $${paramIdx}`;
      params.push(user.id);
    }
    
    // Integrity: Only show requests for food that hasn't expired or expired very recently (e.g. 1 hour ago for pickup)
    // No outdated requests from 2-3 days ago.
    whereClause += ` AND fd.expiry_time > (NOW() - INTERVAL '3 hours')`; 
    // admin sees all

    const countResult = await query(
      `SELECT COUNT(*) FROM food_requests fr
       JOIN food_donations fd ON fr.donation_id = fd.id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT fr.*,
        fd.title as donation_title, fd.food_type, fd.condition, fd.pickup_address, fd.pickup_city,
        fd.pickup_latitude, fd.pickup_longitude, fd.expiry_time, fd.image_url as donation_image,
        u_receiver.name as receiver_name, u_receiver.phone as receiver_phone, u_receiver.email as receiver_email,
        u_donor.name as donor_name, u_donor.phone as donor_phone, u_donor.email as donor_email
       FROM food_requests fr
       JOIN food_donations fd ON fr.donation_id = fd.id
       JOIN users u_receiver ON fr.receiver_id = u_receiver.id
       JOIN users u_donor ON fd.donor_id = u_donor.id
       ${whereClause}
       ORDER BY fr.created_at DESC
       LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
      params
    );

    res.json({
      success: true,
      data: {
        requests: result.rows,
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

const createRequest = async (req, res, next) => {
  const client = await getClient();
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins are mission overseers only and cannot request food.' });
    }

    const {
      donation_id, quantity_requested, delivery_address, delivery_city,
      delivery_latitude, delivery_longitude, beneficiary_count, special_notes, urgency_level
    } = req.body;

    await client.query('BEGIN');

    // ATOMIC STOCK INTEGRITY: Lock the donation row for update
    const donationResult = await client.query(
      `SELECT * FROM food_donations WHERE id = $1 AND is_available = true AND expiry_time > NOW() FOR UPDATE`,
      [donation_id]
    );

    if (donationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Donation not found or no longer available.' });
    }

    const donation = donationResult.rows[0];

    if (quantity_requested > donation.quantity_remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Only ${donation.quantity_remaining} ${donation.quantity_unit} remaining.` });
    }

    // Check for duplicate request within transaction
    const existing = await client.query(
      `SELECT id FROM food_requests WHERE donation_id = $1 AND receiver_id = $2 AND status NOT IN ('rejected', 'cancelled')`,
      [donation_id, req.user.id]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'You already have an active request for this donation.' });
    }

    // Generate QR code for this request
    const qrPayload = JSON.stringify({ type: 'foodbridge_delivery', requestId: uuidv4(), donationId: donation_id, receiverId: req.user.id, ts: Date.now() });
    let qrCode = null;
    try {
      qrCode = await QRCode.toDataURL(qrPayload);
    } catch (qrErr) {
      logger.error('QR generation failed (non-fatal):', qrErr.message);
    }

    const result = await client.query(
      `INSERT INTO food_requests (
        donation_id, receiver_id, quantity_requested, delivery_address, delivery_city,
        delivery_latitude, delivery_longitude, beneficiary_count, special_notes, urgency_level, qr_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        donation_id, req.user.id, quantity_requested, delivery_address || null, delivery_city || null,
        delivery_latitude || null, delivery_longitude || null,
        beneficiary_count || 1, special_notes || null, urgency_level || 3, qrCode
      ]
    );

    const request = result.rows[0];

    // Deduct quantity from donation
    const newRemaining = donation.quantity_remaining - quantity_requested;
    await client.query(
      'UPDATE food_donations SET quantity_remaining = $1, is_available = $2 WHERE id = $3',
      [newRemaining, newRemaining > 0, donation.id]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');

    // Notify donor
    const donorResult = await client.query('SELECT id, name, email FROM users WHERE id = $1', [donation.donor_id]);
    const donor = donorResult.rows[0];
    
    await createNotification(io, donor.id, 'request_received',
      'New Food Request!',
      `${req.user.name} requested ${quantity_requested} servings of "${donation.title}"`,
      request.id, 'request'
    );

    // Email donor
    sendEmail(donor.email, 'requestReceived', [
      donor.name, { title: donation.title, quantity: quantity_requested, urgency: urgency_level }
    ]).catch(() => {});

    // Notify admins
    const admins = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    for (const admin of admins.rows) {
      await createNotification(io, admin.id, 'request_received',
        'New Food Request', `${req.user.name} requested food from ${donor.name}`,
        request.id, 'request');
    }

    logger.info(`Food request created by ${req.user.name} for donation ${donation_id}`);

    res.status(201).json({
      success: true,
      message: 'Food request submitted successfully!',
      data: { request }
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    next(error);
  } finally {
    if (client) client.release();
  }
};

// PATCH /api/requests/:id/status - Update request status (donor/admin accepts/rejects, volunteer picks up)
const updateRequestStatus = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const { status, rejection_reason, volunteer_id } = req.body;
    const { id } = req.params;
    const user = req.user;

    const requestResult = await client.query(
      `SELECT fr.*, fd.donor_id, fd.title as donation_title, u.name as receiver_name, u.email as receiver_email
       FROM food_requests fr
       JOIN food_donations fd ON fr.donation_id = fd.id
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = requestResult.rows[0];
    
    // Authorization checks
    if (status === 'accepted' || status === 'rejected') {
      if (user.role !== 'admin' && user.id !== request.donor_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'Only the donor or admin can accept/reject requests.' });
      }
    }
    if (status === 'assigned' && user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Only admin can assign volunteers.' });
    }

    // Restriction: Admin should ONLY monitor and manage users. 
    // Admin should NOT: Add deliveries, Request food, Accept volunteer tasks
    if (user.role === 'admin' && (status === 'accepted' || status === 'completed')) {
      // Admin should only review/audit, not perform the action themselves if possible.
      // But they may need to force status if a user is stuck. 
      // Requirement says "Admin permissions & restrictions: Admin should ONLY monitor and manage users"
    }

    // Update request
    const updates = { status };
    if (status === 'accepted') updates.accepted_at = new Date();
    if (status === 'completed') updates.completed_at = new Date();

    let updateQuery = `UPDATE food_requests SET status = $1, updated_at = NOW()`;
    let updateParams = [status];
    let paramIdx = 1;

    if (status === 'accepted') { paramIdx++; updateQuery += `, accepted_at = $${paramIdx}`; updateParams.push(new Date()); }
    if (status === 'rejected' && rejection_reason) { paramIdx++; updateQuery += `, rejection_reason = $${paramIdx}`; updateParams.push(rejection_reason); }
    if (status === 'completed') { paramIdx++; updateQuery += `, completed_at = $${paramIdx}`; updateParams.push(new Date()); }

    paramIdx++;
    updateQuery += ` WHERE id = $${paramIdx} RETURNING *`;
    updateParams.push(id);

    const updatedRequest = await client.query(updateQuery, updateParams);

    // If rejected or cancelled, restore quantity to donation
    if (status === 'rejected' || status === 'cancelled') {
        const donationResult = await client.query('SELECT quantity_remaining FROM food_donations WHERE id = $1', [request.donation_id]);
        if (donationResult.rows.length > 0) {
            const restoredRemaining = donationResult.rows[0].quantity_remaining + request.quantity_requested;
            await client.query(
                'UPDATE food_donations SET quantity_remaining = $1, is_available = true WHERE id = $2',
                [restoredRemaining, request.donation_id]
            );
        }
    }

    // If completed, create delivery record for receiver
    if (status === 'completed') {
      await client.query(
        'INSERT INTO deliveries (request_id, receiver_id, status, actual_delivery_time) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
        [id, request.receiver_id, 'delivered']
      );
    }

    await client.query('COMMIT');

    // Triple Notification Logic per Requirement
    const io = req.app.get('io');
    const admins = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = true");
    const adminIds = admins.rows.map(a => a.id);

    // If Received/Completed (Receiver Action): Notify Admin, Donor, Volunteer
    if (status === 'completed') {
      const targets = [...adminIds, request.donor_id, request.volunteer_id].filter(Boolean);
      for (const tid of targets) {
        await createNotification(io, tid, 'delivery_completed', 
          'Food Received! ✅', 
          `Receiver ${request.receiver_name} has confirmed receiving "${request.donation_title}"`, 
          id, 'request');
      }
    }

    // If Accepted/Rejected (Donor Action): Notify Receiver, Admin
    if (status === 'accepted' || status === 'rejected') {
      const targets = [...adminIds, request.receiver_id];
      const title = status === 'accepted' ? 'Request Accepted! 🎉' : 'Request Rejected ❌';
      const msg = status === 'accepted' ? `Your request for "${request.donation_title}" was accepted.` : `Your request for "${request.donation_title}" was rejected: ${rejection_reason || 'No reason'}`;
      for (const tid of targets) {
        await createNotification(io, tid, `request_${status}`, title, msg, id, 'request');
      }
    }

    logger.info(`Request ${id} status updated to ${status} by ${user.name}`);

    res.json({
      success: true,
      message: `Request ${status} successfully.`,
      data: { request: updatedRequest.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// GET /api/requests/:id
const getRequestById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT fr.*,
        fd.title as donation_title, fd.food_type, fd.condition, fd.quantity as total_quantity,
        fd.pickup_address, fd.pickup_city, fd.pickup_latitude, fd.pickup_longitude,
        fd.expiry_time, fd.image_url as donation_image, fd.special_instructions,
        u_receiver.name as receiver_name, u_receiver.phone as receiver_phone, u_receiver.email as receiver_email,
        u_donor.id as donor_id, u_donor.name as donor_name, u_donor.phone as donor_phone
       FROM food_requests fr
       JOIN food_donations fd ON fr.donation_id = fd.id
       JOIN users u_receiver ON fr.receiver_id = u_receiver.id
       JOIN users u_donor ON fd.donor_id = u_donor.id
       WHERE fr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.json({ success: true, data: { request: result.rows[0] } });
  } catch (error) {
    next(error);
  }
};

// POST /api/requests/:id/verify-qr - Verify QR code on delivery
const verifyQRCode = async (req, res, next) => {
  try {
    const { qr_data } = req.body;
    const request = await query('SELECT * FROM food_requests WHERE id = $1', [req.params.id]);
    
    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const req_data = request.rows[0];
    
    if (req_data.qr_verified) {
      return res.status(400).json({ success: false, message: 'QR code already verified.' });
    }

    await query(
      'UPDATE food_requests SET qr_verified = true, qr_verified_at = NOW(), status = $1 WHERE id = $2',
      ['completed', req.params.id]
    );

    res.json({ success: true, message: 'QR code verified! Delivery confirmed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRequests, createRequest, updateRequestStatus, getRequestById, verifyQRCode };
