const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');
const v = require('../validators');
const { fail, wrap } = require('../utils/http');

const router = express.Router();

router.post('/register', wrap(async (req, res) => {
  v.object(req.body, ['username', 'email', 'password'], ['username', 'email', 'password']);
  const username = v.username(req.body.username);
  const email = v.email(req.body.email);
  const password = v.password(req.body.password);
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hash, 'user']);
  res.status(201).json({ id: String(result.insertId), username, email, role: 'user' });
}));

router.post('/login', wrap(async (req, res) => {
  v.object(req.body, ['email', 'password'], ['email', 'password']);
  const email = v.email(req.body.email);
  const password = v.password(req.body.password);
  const [rows] = await pool.execute('SELECT id, username, email, password, role FROM users WHERE email = ?', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  const user = rows[0];
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user.id), algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
  res.json({ token, token_type: 'Bearer', user: { id: String(user.id), username: user.username, email: user.email, role: user.role } });
}));

module.exports = router;
