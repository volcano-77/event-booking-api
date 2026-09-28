const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'event_booking',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_booking_api_testing',
  timezone: 'Z',
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: true,
};

const pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 10 });
module.exports = { pool, config };
