require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../src/db/connection');
const v = require('../src/validators');

async function main() {
  const [rawUsername, rawEmail] = process.argv.slice(2);
  const rawPassword = process.env.ORGANIZER_PASSWORD;
  if (!rawUsername || !rawEmail || !rawPassword) throw new Error('Set ORGANIZER_PASSWORD in the current shell, then run: npm run create:organizer -- <username> <email>');
  const username = v.username(rawUsername);
  const email = v.email(rawEmail);
  const password = v.password(rawPassword);
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hash, 'organizer']);
  console.log(`Created organizer ${email} with ID ${result.insertId}`);
}
main().catch(error => { console.error('Organizer creation failed:', error.message); process.exitCode = 1; }).finally(() => pool.end());
