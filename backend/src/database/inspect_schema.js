require('dotenv').config();
const { pool } = require('./db');

async function inspectSchema() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('deliveries', 'location_tracking', 'food_requests')
      ORDER BY table_name, column_name;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

inspectSchema().catch(console.error);
