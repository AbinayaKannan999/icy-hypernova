require('dotenv').config();
const { pool } = require('./db');

async function checkUsers() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT name, email, role FROM users');
    console.log('Current Users in DB:');
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers().catch(console.error);
