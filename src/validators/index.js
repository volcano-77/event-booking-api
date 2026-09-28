const { fail } = require('../utils/http');

function object(body, allowed, required = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'INVALID_BODY', 'A JSON object is required');
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fail(400, 'UNKNOWN_FIELD', `Unknown field: ${key}`);
  for (const key of required) if (!Object.hasOwn(body, key)) fail(400, 'MISSING_FIELD', `Missing field: ${key}`);
}

function id(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) fail(400, 'INVALID_ID', 'ID must be a positive decimal integer');
  return raw;
}

function string(value, name, min, max, trim = true) {
  if (typeof value !== 'string') fail(400, 'INVALID_FIELD', `${name} must be a string`);
  const result = trim ? value.trim() : value;
  if (result.length < min || result.length > max) fail(400, 'INVALID_FIELD', `${name} must be ${min}–${max} characters`);
  return result;
}

function username(value) { return string(value, 'username', 3, 50); }
function password(value) {
  const result = string(value, 'password', 8, 72, false);
  if (Buffer.byteLength(result, 'utf8') > 72) fail(400, 'INVALID_FIELD', 'password must be at most 72 UTF-8 bytes');
  return result;
}
function email(value) {
  const result = string(value, 'email', 3, 254).toLowerCase();
  const parts = result.split('@');
  const local = parts[0] || '';
  const domain = parts[1] || '';
  const labels = domain.split('.');
  if (parts.length !== 2 || local.length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) fail(400, 'INVALID_EMAIL', 'email must be a valid address');
  return result;
}
function title(value) { return string(value, 'title', 1, 120); }
function description(value) { return string(value, 'description', 0, 2000); }
function capacity(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100000) fail(400, 'INVALID_CAPACITY', 'capacity must be an integer from 1 to 100000');
  return value;
}
function startTime(value) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) fail(400, 'INVALID_START_TIME', 'start_time must be ISO 8601 with timezone');
  const [, year, month, day, hour, minute, second, fraction, zone, sign, offsetHour, offsetMinute] = match;
  const offset = zone === 'Z' ? 0 : (sign === '+' ? 1 : -1) * (Number(offsetHour) * 60 + Number(offsetMinute));
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31 || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Math.abs(offset) > 14 * 60 || (offsetHour && Number(offsetMinute) > 59)) fail(400, 'INVALID_START_TIME', 'start_time must be a real timestamp');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(400, 'INVALID_START_TIME', 'start_time must be a real timestamp');
  const local = new Date(date.getTime() + offset * 60000).toISOString();
  if (local.slice(0, 19) !== `${year}-${month}-${day}T${hour}:${minute}:${second}` || local.slice(20, 23) !== (fraction || '').padEnd(3, '0')) fail(400, 'INVALID_START_TIME', 'start_time must be a real timestamp');
  if (date.getTime() <= Date.now()) fail(400, 'INVALID_START_TIME', 'start_time must be in the future');
  return date;
}

module.exports = { object, id, username, password, email, title, description, capacity, startTime };
