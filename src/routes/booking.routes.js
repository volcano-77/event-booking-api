const express = require('express');
const { pool } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const { getEvent } = require('./event.routes');
const { fail, wrap } = require('../utils/http');
const v = require('../validators');

const router = express.Router();

router.post('/events/:id/book', authenticate, requireRole('user'), wrap(async (req, res) => {
  const id = v.id(req.params.id);
  v.object(req.body === undefined ? {} : req.body, []);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const event = await getEvent(id, conn, true);
    if (event.status !== 'OPEN') fail(409, 'EVENT_CLOSED', 'Closed events cannot be booked');
    if (new Date(event.start_time).getTime() <= Date.now()) fail(409, 'EVENT_STARTED', 'Started events cannot be booked');
    const [existing] = await conn.execute('SELECT id, status FROM bookings WHERE user_id = ? AND event_id = ?', [req.user.id, id]);
    if (existing.length && existing[0].status === 'ACTIVE') fail(409, 'ALREADY_BOOKED', 'An active booking already exists');
    const [[count]] = await conn.execute("SELECT COUNT(*) AS total FROM bookings WHERE event_id = ? AND status = 'ACTIVE'", [id]);
    if (count.total >= event.capacity) fail(409, 'EVENT_FULL', 'Event is full');
    let bookingId;
    let rebooked = false;
    if (existing.length) {
      bookingId = String(existing[0].id);
      rebooked = true;
      await conn.execute("UPDATE bookings SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [bookingId]);
    } else {
      const [result] = await conn.execute("INSERT INTO bookings (user_id, event_id, status) VALUES (?, ?, 'ACTIVE')", [req.user.id, id]);
      bookingId = String(result.insertId);
    }
    await conn.commit();
    res.status(rebooked ? 200 : 201).json({ id: bookingId, event_id: id, user_id: String(req.user.id), status: 'ACTIVE', rebooked });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}));

router.delete('/events/:id/book', authenticate, requireRole('user'), wrap(async (req, res) => {
  const id = v.id(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await getEvent(id, conn, true);
    const [rows] = await conn.execute('SELECT id, status FROM bookings WHERE user_id = ? AND event_id = ?', [req.user.id, id]);
    if (!rows.length) fail(404, 'BOOKING_NOT_FOUND', 'Your booking was not found');
    if (rows[0].status === 'CANCELLED') fail(409, 'BOOKING_CANCELLED', 'Booking is already cancelled');
    await conn.execute("UPDATE bookings SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [rows[0].id]);
    await conn.commit();
    res.json({ id: String(rows[0].id), event_id: id, user_id: String(req.user.id), status: 'CANCELLED' });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}));

router.get('/bookings/me', authenticate, requireRole('user'), wrap(async (req, res) => {
  const [rows] = await pool.execute(`SELECT b.id, b.event_id, e.title, b.status, b.created_at, b.updated_at
    FROM bookings b JOIN events e ON e.id = b.event_id WHERE b.user_id = ? ORDER BY b.id DESC`, [req.user.id]);
  res.json({ bookings: rows });
}));

module.exports = router;
