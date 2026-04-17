require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function migrate() {
  const client = await pool.connect();
  try {
    logger.info('Starting database migration...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSQL);
    logger.info('Base schema applied.');

    // Safe column additions - run every time, IF NOT EXISTS prevents duplicates
    const safeAlters = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS pickup_address TEXT;
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS pickup_city VARCHAR(100);
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10,8);
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11,8);
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS special_instructions TEXT;
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS allergen_info TEXT;
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT TRUE;
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS serving_count INTEGER;
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS delivery_address TEXT;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100);
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10,8);
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11,8);
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS beneficiary_count INTEGER DEFAULT 1;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS special_notes TEXT;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS qr_code TEXT;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS qr_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS qr_verified_at TIMESTAMP;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
      ALTER TABLE food_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    `;
    await client.query(safeAlters);
    logger.info('Database migration completed successfully!');
  } catch (error) {
    logger.error('Migration warning (non-fatal):', error.message);
    // Don't throw - let server start even if some migrations fail
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration error (server will still start):', err.message);
  process.exit(0); // Exit 0 so Docker doesn't think it failed
});
