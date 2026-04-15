require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function seed() {
  const client = await pool.connect();
  try {
    logger.info('Starting database seeding...');

    // Hash password for admin: Admin123Admin123
    const hashedPassword = await bcrypt.hash('Admin123Admin123', 12);

    // Seed Users
    const adminId = uuidv4();
    const donorId = uuidv4();
    const volunteerId = uuidv4();
    const receiverId = uuidv4();

    await client.query(`
      INSERT INTO users (id, name, email, password_hash, role, phone, city, state, country, latitude, longitude, is_active, is_verified)
      VALUES
        ($1, 'System Admin', 'abinayakannan999@gmail.com', $5, 'admin', '+91-9876543210', 'Mumbai', 'Maharashtra', 'India', 19.0760, 72.8777, true, true),
        ($2, 'Rajesh Kumar', 'donor@foodbridge.com', $5, 'donor', '+91-9876543211', 'Mumbai', 'Maharashtra', 'India', 19.0895, 72.8656, true, true),
        ($3, 'Priya Singh', 'volunteer@foodbridge.com', $5, 'volunteer', '+91-9876543212', 'Mumbai', 'Maharashtra', 'India', 19.0748, 72.8801, true, true),
        ($4, 'Arun Sharma', 'receiver@foodbridge.com', $5, 'receiver', '+91-9876543213', 'Mumbai', 'Maharashtra', 'India', 19.0610, 72.8358, true, true)
      ON CONFLICT (email) DO NOTHING
    `, [adminId, donorId, volunteerId, receiverId, hashedPassword]);

    // Seed Donations
    const donation1Id = uuidv4();
    const donation2Id = uuidv4();
    const donation3Id = uuidv4();

    await client.query(`
      INSERT INTO food_donations (id, donor_id, title, description, food_type, quantity, quantity_unit, condition, preparation_time, expiry_time, pickup_address, pickup_city, pickup_latitude, pickup_longitude, serving_count)
      VALUES
        ($1, $4, 'Fresh Biryani', 'Freshly cooked chicken biryani, enough for a small gathering', 'cooked_meals', 50, 'plates', 'excellent', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '4 hours', '123 MG Road, Andheri', 'Mumbai', 19.1136, 72.8697, 50),
        ($2, $4, 'Vegetable Curry Pack', 'Mixed vegetable curry and rice packets, freshly prepared', 'cooked_meals', 30, 'packets', 'good', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '6 hours', '456 Linking Road, Bandra', 'Mumbai', 19.0543, 72.8398, 30),
        ($3, $4, 'Bread and Butter', 'Fresh bakery bread loaves with butter packets', 'bakery', 20, 'loaves', 'excellent', NULL, NOW() + INTERVAL '2 days', '789 FC Road, Dadar', 'Mumbai', 19.0183, 72.8479, 60)
      ON CONFLICT DO NOTHING
    `, [donation1Id, donation2Id, donation3Id, donorId]);

    // Seed Requests
    const request1Id = uuidv4();
    await client.query(`
      INSERT INTO food_requests (id, donation_id, receiver_id, status, quantity_requested, delivery_address, delivery_city, delivery_latitude, delivery_longitude, beneficiary_count, urgency_level)
      VALUES
        ($1, $2, $3, 'accepted', 20, 'Community Center, Dharavi', 'Mumbai', 19.0426, 72.8536, 20, 4)
      ON CONFLICT DO NOTHING
    `, [request1Id, donation1Id, receiverId]);

    logger.info('Database seeded successfully!');
    logger.info('Demo Accounts:');
    logger.info('  Admin:     admin@foodbridge.com     / Password123!');
    logger.info('  Donor:     donor@foodbridge.com     / Password123!');
    logger.info('  Volunteer: volunteer@foodbridge.com / Password123!');
    logger.info('  Receiver:  receiver@foodbridge.com  / Password123!');

  } catch (error) {
    logger.error('Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
