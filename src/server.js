require('dotenv').config();
const app = require('./app');
const { pool } = require('./db/connection');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  await pool.query('SELECT 1');
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Event Booking API listening on http://localhost:${port}`));
}

start().catch(error => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
