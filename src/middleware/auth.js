const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');
const { fail, wrap } = require('../utils/http');

const authenticate = wrap(async (req, res, next) => {
  const header = req.get('authorization');
  if (!header) fail(401, 'TOKEN_MISSING', 'Bearer token is required');
  if (!/^Bearer\s+\S+$/i.test(header)) fail(401, 'TOKEN_MALFORMED', 'Authorization must use Bearer token');
  let payload;
  try {
    payload = jwt.verify(header.replace(/^Bearer\s+/i, ''), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') fail(401, 'TOKEN_EXPIRED', 'Token has expired');
    fail(401, 'TOKEN_INVALID', 'Token is invalid');
  }
  if (!payload || typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) fail(401, 'TOKEN_INVALID', 'Token is invalid');
  const [rows] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [payload.sub]);
  if (!rows.length) fail(401, 'TOKEN_INVALID', 'Token user no longer exists');
  req.user = rows[0];
  next();
});

const requireRole = role => (req, res, next) => {
  if (req.user.role !== role) return next(new (require('../utils/http').HttpError)(403, 'FORBIDDEN', `Requires ${role} role`));
  next();
};

module.exports = { authenticate, requireRole };
