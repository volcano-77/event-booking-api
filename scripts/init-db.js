require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const name = process.env.DB_NAME || 'event_booking_api_testing';
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('DB_NAME may contain only letters, numbers, and underscores');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'event_booking', password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${name}\``);
    await connection.query(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8'));
    console.log(`Database ${name} is ready`);
  } finally { await connection.end(); }
}
main().catch(error => { console.error('Database setup failed:', error.message); process.exitCode = 1; });
