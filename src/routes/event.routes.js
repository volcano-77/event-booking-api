const express = require('express');
const { pool } = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const { fail, wrap } = require('../utils/http');
const v = require('../validators');

const router = express.Router();
const eventSelect = `SELECT e.id, e.title, e.description, e.capacity, e.status, e.organizer_id,
  e.start_time, e.created_at, COALESCE(c.active_bookings, 0) AS active_bookings
  FROM events e LEFT JOIN (SELECT event_id, COUNT(*) AS active_bookings FROM bookings WHERE status = 'ACTIVE' GROUP BY event_id) c ON c.event_id = e.id`;

// mysql2 returns COUNT/BIGINT as strings with bigNumberStrings enabled.
// A booking count is bounded by capacity (100000), so numeric JSON is safe here.
const eventResponse = event => ({ ...event, active_bookings: Number(event.active_bookings) });

async function getEvent(id, db = pool, lock = false) {
  const [rows] = await db.execute(`SELECT * FROM events WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
  if (!rows.length) fail(404, 'EVENT_NOT_FOUND', 'Event not found');
  return rows[0];
}

function ownEvent(event, user) {
  if (String(event.organizer_id) !== String(user.id)) fail(403, 'NOT_EVENT_OWNER', 'Only the event organizer may do this');
}

function eventInput(body) {
  v.object(body, ['title', 'description', 'capacity', 'start_time'], ['title', 'capacity', 'start_time']);
  return {
    title: v.title(body.title),
    description: Object.hasOwn(body, 'description') ? v.description(body.description) : '',
    capacity: v.capacity(body.capacity),
    start_time: v.startTime(body.start_time),
  };
}

router.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query(`${eventSelect} ORDER BY e.start_time ASC, e.id ASC`);
  res.json({ events: rows.map(eventResponse) });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = v.id(req.params.id);
  const [rows] = await pool.execute(`${eventSelect} WHERE e.id = ?`, [id]);
  if (!rows.length) fail(404, 'EVENT_NOT_FOUND', 'Event not found');
  res.json(eventResponse(rows[0]));
}));

router.post('/', authenticate, requireRole('organizer'), wrap(async (req, res) => {
  const data = eventInput(req.body);
  const [result] = await pool.execute('INSERT INTO events (title, description, capacity, organizer_id, start_time) VALUES (?, ?, ?, ?, ?)', [data.title, data.description, data.capacity, req.user.id, data.start_time]);
  res.status(201).json({ id: String(result.insertId), ...data, start_time: data.start_time.toISOString(), status: 'OPEN', organizer_id: String(req.user.id) });
}));

router.put('/:id', authenticate, requireRole('organizer'), wrap(async (req, res) => {
  const id = v.id(req.params.id);
  const data = eventInput(req.body);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const event = await getEvent(id, conn, true);
    ownEvent(event, req.user);
    if (event.status !== 'OPEN') fail(409, 'EVENT_CLOSED', 'Closed events cannot be edited');
    const [[count]] = await conn.execute("SELECT COUNT(*) AS total FROM bookings WHERE event_id = ? AND status = 'ACTIVE'", [id]);
    if (data.capacity < count.total) fail(409, 'CAPACITY_BELOW_BOOKINGS', 'capacity is below active bookings');
    await conn.execute('UPDATE events SET title = ?, description = ?, capacity = ?, start_time = ? WHERE id = ?', [data.title, data.description, data.capacity, data.start_time, id]);
    await conn.commit();
    res.json({ id, ...data, start_time: data.start_time.toISOString(), status: 'OPEN', organizer_id: String(req.user.id) });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}));

router.patch('/:id/close', authenticate, requireRole('organizer'), wrap(async (req, res) => {
  const id = v.id(req.params.id);
  v.object(req.body === undefined ? {} : req.body, []);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const event = await getEvent(id, conn, true);
    ownEvent(event, req.user);
    if (event.status === 'CLOSED') fail(409, 'EVENT_CLOSED', 'Event is already closed');
    await conn.execute("UPDATE events SET status = 'CLOSED' WHERE id = ?", [id]);
    await conn.commit();
    res.json({ id, status: 'CLOSED' });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}));

router.get('/:id/bookings', authenticate, requireRole('organizer'), wrap(async (req, res) => {
  const id = v.id(req.params.id);
  const event = await getEvent(id);
  ownEvent(event, req.user);
  const [rows] = await pool.execute(`SELECT b.id, b.event_id, b.user_id, u.username, b.status, b.created_at, b.updated_at
    FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.event_id = ? ORDER BY b.id`, [id]);
  res.json({ bookings: rows });
}));

module.exports = { router, getEvent, ownEvent };
