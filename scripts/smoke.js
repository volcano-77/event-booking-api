// Development availability check. It creates temporary rows and removes them.
require('dotenv').config();
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { pool } = require('../src/db/connection');

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const suffix = Math.random().toString(36).slice(2, 10);
let organizerId, userId, eventId;

async function request(method, path, body, token) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function expectStatus(method, path, body, token, expected) {
  const result = await request(method, path, body, token);
  assert.equal(result.status, expected, `${method} ${path}: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function main() {
  await pool.query('SELECT 1');
  const organizerEmail = `smoke_org_${suffix}@example.test`;
  const userEmail = `smoke_user_${suffix}@example.test`;
  const password = `SmokePass_${suffix}`;
  const hash = await bcrypt.hash(password, 12);
  const [orgResult] = await pool.execute("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'organizer')", [`org_${suffix}`, organizerEmail, hash]);
  organizerId = String(orgResult.insertId);

  const user = await expectStatus('POST', '/api/auth/register', { username: `user_${suffix}`, email: userEmail, password }, undefined, 201);
  userId = user.id;
  assert.equal(user.role, 'user');
  const organizerLogin = await expectStatus('POST', '/api/auth/login', { email: organizerEmail, password }, undefined, 200);
  const userLogin = await expectStatus('POST', '/api/auth/login', { email: userEmail, password }, undefined, 200);
  const orgToken = organizerLogin.token;
  const userToken = userLogin.token;

  const input = { title: `Smoke event ${suffix}`, description: 'Temporary availability check', capacity: 1, start_time: new Date(Date.now() + 86400000).toISOString() };
  const event = await expectStatus('POST', '/api/events', input, orgToken, 201);
  eventId = event.id;
  const list = await expectStatus('GET', '/api/events', undefined, undefined, 200);
  assert.ok(list.events.some(item => String(item.id) === eventId));
  await expectStatus('POST', `/api/events/${eventId}/book`, {}, userToken, 201);
  await expectStatus('POST', `/api/events/${eventId}/book`, {}, userToken, 409);
  await expectStatus('PUT', `/api/events/${eventId}`, input, userToken, 403);
  await expectStatus('DELETE', `/api/events/${eventId}/book`, undefined, userToken, 200);
  await expectStatus('POST', `/api/events/${eventId}/book`, {}, userToken, 200);
  await expectStatus('DELETE', `/api/events/${eventId}/book`, undefined, userToken, 200);
  await expectStatus('PATCH', `/api/events/${eventId}/close`, {}, orgToken, 200);
  await expectStatus('POST', `/api/events/${eventId}/book`, {}, userToken, 409);
  console.log('Smoke check passed: startup, DB, auth, event, booking, duplicate, cancellation, rebooking, closure, and role access');
}

main().catch(error => { console.error('Smoke check failed:', error); process.exitCode = 1; }).finally(async () => {
  try {
    if (eventId) {
      await pool.execute('DELETE FROM bookings WHERE event_id = ?', [eventId]);
      await pool.execute('DELETE FROM events WHERE id = ?', [eventId]);
    }
    if (userId) await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    if (organizerId) await pool.execute('DELETE FROM users WHERE id = ?', [organizerId]);
  } catch (error) { console.error('Smoke cleanup failed:', error.message); process.exitCode = 1; }
  await pool.end();
});
