-- Event Booking API Testing: read-only SQL validation templates
-- Execution status: Not Run
-- Replace NULL placeholders with IDs from the same API execution and database.

SET @user_id = NULL;
SET @other_user_id = NULL;
SET @organizer_id = NULL;
SET @other_organizer_id = NULL;
SET @event_id = NULL;
SET @other_event_id = NULL;
SET @booking_id = NULL;

-- U-01: Registered identity and role
-- Expected validation points:
--   * Public registration stores role = 'user'.
--   * username and email equal normalized API values.
--   * password column is populated with a bcrypt-style hash; do not export its value.
SELECT
  id,
  username,
  email,
  role,
  created_at,
  password REGEXP '^\\$2[aby]\\$' AS has_bcrypt_prefix,
  CHAR_LENGTH(password) AS stored_password_length
FROM users
WHERE id = @user_id;

-- E-01: Event ownership and persisted state
-- Expected validation points:
--   * organizer_id equals the authenticated creator's ID.
--   * title, description, capacity, status, and start_time match the last successful API action.
SELECT
  e.id,
  e.title,
  e.description,
  e.capacity,
  e.status,
  e.organizer_id,
  u.username AS organizer_username,
  e.start_time,
  e.created_at
FROM events e
JOIN users u ON u.id = e.organizer_id
WHERE e.id = @event_id;

-- E-02: Capacity and ACTIVE count
-- Expected validation points:
--   * active_bookings never exceeds capacity after sequential API operations.
--   * a rejected capacity reduction leaves capacity unchanged.
SELECT
  e.id AS event_id,
  e.capacity,
  COUNT(CASE WHEN b.status = 'ACTIVE' THEN 1 END) AS active_bookings,
  e.capacity - COUNT(CASE WHEN b.status = 'ACTIVE' THEN 1 END) AS remaining_capacity,
  COUNT(CASE WHEN b.status = 'ACTIVE' THEN 1 END) <= e.capacity AS within_capacity
FROM events e
LEFT JOIN bookings b ON b.event_id = e.id
WHERE e.id = @event_id
GROUP BY e.id, e.capacity;

-- B-01: Unique user/event booking row
-- Expected validation points:
--   * grouped query returns zero rows before first booking and row_count=1 after booking.
--   * duplicate booking and rebooking never make row_count exceed 1.
SELECT
  user_id,
  event_id,
  COUNT(*) AS row_count,
  MIN(id) AS booking_id,
  MIN(status) AS current_status
FROM bookings
WHERE user_id = @user_id
  AND event_id = @event_id
GROUP BY user_id, event_id;

-- B-02: Booking allocation for an event
-- Expected validation points:
--   * only ACTIVE rows consume capacity.
--   * cancellation reduces the active count.
--   * another User may take a released place without exceeding capacity.
SELECT
  b.id,
  b.user_id,
  u.username,
  b.event_id,
  b.status,
  b.created_at,
  b.updated_at
FROM bookings b
JOIN users u ON u.id = b.user_id
WHERE b.event_id = @event_id
ORDER BY b.id;

SELECT
  e.capacity,
  COALESCE(SUM(b.status = 'ACTIVE'), 0) AS active_bookings,
  COALESCE(SUM(b.status = 'CANCELLED'), 0) AS cancelled_bookings
FROM events e
LEFT JOIN bookings b ON b.event_id = e.id
WHERE e.id = @event_id
GROUP BY e.id, e.capacity;

-- B-03: Cancellation and rebooking lifecycle
-- Expected validation points:
--   * cancellation changes status to CANCELLED without deleting the row.
--   * rebooking changes the same row back to ACTIVE.
--   * id and created_at remain stable; updated_at reflects the latest transition.
SELECT
  id,
  user_id,
  event_id,
  status,
  created_at,
  updated_at
FROM bookings
WHERE id = @booking_id
  AND user_id = @user_id
  AND event_id = @event_id;

-- B-04: Data isolation comparison
-- Expected validation points:
--   * the first query is the complete database view for the selected event.
--   * /api/bookings/me for @user_id corresponds only to the second query.
--   * an Organizer may request the first view only for an event they own.
SELECT id, user_id, event_id, status, created_at, updated_at
FROM bookings
WHERE event_id = @event_id
ORDER BY id;

SELECT id, user_id, event_id, status, created_at, updated_at
FROM bookings
WHERE user_id = @user_id
ORDER BY id DESC;

-- C-01: Relationship integrity checks
-- Expected validation points:
--   * each query returns zero rows.
SELECT e.id AS event_without_organizer
FROM events e
LEFT JOIN users u ON u.id = e.organizer_id
WHERE u.id IS NULL;

SELECT b.id AS booking_without_user
FROM bookings b
LEFT JOIN users u ON u.id = b.user_id
WHERE u.id IS NULL;

SELECT b.id AS booking_without_event
FROM bookings b
LEFT JOIN events e ON e.id = b.event_id
WHERE e.id IS NULL;

-- Optional ownership comparison for two prepared organizers.
-- Expected validation point: each event's organizer_id matches its intended owner.
SELECT id, organizer_id, status
FROM events
WHERE id IN (@event_id, @other_event_id)
ORDER BY id;
