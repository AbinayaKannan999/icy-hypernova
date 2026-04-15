const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const logger = require('../utils/logger');

let io;

function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query('SELECT id, name, role FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
      
      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.user = result.rows[0];
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.name} (${user.role}) - ${socket.id}`);

    // Join personal room for targeted notifications
    socket.join(`user_${user.id}`);
    
    // Join role-based room
    socket.join(`role_${user.role}`);

    // Update last activity
    query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});

    // Handle location update from receivers
    socket.on('location_update', async (data) => {
      try {
        const { delivery_id, latitude, longitude } = data;
        
        if (!delivery_id || !latitude || !longitude) return;

        // Save location to database
        await query(
          `INSERT INTO location_tracking (delivery_id, receiver_id, latitude, longitude)
           VALUES ($1, $2, $3, $4)`,
          [delivery_id, user.id, latitude, longitude]
        );

        // Update delivery current location
        await query(
          `UPDATE deliveries SET current_latitude = $1, current_longitude = $2, updated_at = NOW()
           WHERE id = $3 AND receiver_id = $4`,
          [latitude, longitude, delivery_id, user.id]
        );

        // Get the request to notify receiver and donor
        const deliveryResult = await query(
          `SELECT fr.receiver_id, fd.donor_id, d.id as delivery_id
           FROM deliveries d
           JOIN food_requests fr ON d.request_id = fr.id
           JOIN food_donations fd ON fr.donation_id = fd.id
           WHERE d.id = $1`,
          [delivery_id]
        );

        if (deliveryResult.rows.length > 0) {
          const { donor_id } = deliveryResult.rows[0];
          
          // Broadcast location to donor and admin
          const locationData = {
            delivery_id,
            receiver_id: user.id,
            receiver_name: user.name,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          };
          
          io.to(`user_${donor_id}`).emit('receiver_location', locationData);
          io.to('role_admin').emit('receiver_location', locationData);
          // Also omit to the delivery room for any active monitor
          io.to(`delivery_${delivery_id}`).emit('receiver_location', locationData);
        }
      } catch (error) {
        logger.error('Location update error:', error.message);
      }
    });

    // Handle delivery status updates
    socket.on('delivery_status_update', async (data) => {
      const { delivery_id, status } = data;
      
      const result = await query(
        `SELECT fr.receiver_id, fd.donor_id FROM deliveries d
         JOIN food_requests fr ON d.request_id = fr.id
         JOIN food_donations fd ON fr.donation_id = fd.id
         WHERE d.id = $1`,
        [delivery_id]
      );

      if (result.rows.length > 0) {
        const { receiver_id, donor_id } = result.rows[0];
        const updateData = { delivery_id, status, updated_by: user.name, timestamp: new Date().toISOString() };
        
        io.to(`user_${receiver_id}`).emit('delivery_update', updateData);
        io.to(`user_${donor_id}`).emit('delivery_update', updateData);
        io.to('role_admin').emit('delivery_update', updateData);
      }
    });

    // Handle joining delivery tracking room
    socket.on('join_delivery_room', (delivery_id) => {
      socket.join(`delivery_${delivery_id}`);
      logger.debug(`${user.name} joined delivery room: ${delivery_id}`);
    });

    socket.on('leave_delivery_room', (delivery_id) => {
      socket.leave(`delivery_${delivery_id}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${user.name} - ${reason}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocketIO, getIO };
