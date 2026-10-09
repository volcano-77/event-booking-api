# Business rules

This document defines the first version of the system before implementation. The API uses two roles (`user`, `organizer`), two event states (`OPEN`, `CLOSED`), and two booking states (`ACTIVE`, `CANCELLED`).

## Identity and access

1. Anyone may list events and read event details. Booking and personal booking history require a valid JWT.
2. Public registration always creates a `user`. A client supplied `role` is rejected. An operator creates an organizer through the local `npm run create:organizer` command with database access; no public endpoint grants that role.
3. Only organizers create events. Only the event's organizer may edit or close it, or read its booking list. Users cannot edit events. Organizers cannot book events.
4. A user may read only their own bookings and may cancel only their own booking. Cancellation identifies the booking from the authenticated user and event ID. DELETE body/query values do not select another user; the current DELETE handler ignores body/query fields rather than applying a JSON-field whitelist.
5. Missing, malformed, invalid, and expired JWTs return `401`, with distinct stable error codes. A valid identity without the needed role or ownership returns `403`.

## Events

6. `title` is 1–120 trimmed characters; `description` is at most 2000 characters; `capacity` is a positive integer up to 100000; `start_time` is a real ISO 8601 timestamp with an explicit timezone and must be in the future when an event is created or its start time is changed. Input types must match the documented types.
7. Events start `OPEN`. Closing is permanent in this version. A closed event can still be read, but cannot be edited or booked.
8. Capacity cannot be reduced below the current number of active bookings. Changing capacity does not alter existing bookings.
9. Event IDs must be decimal positive safe integers with no whitespace, signs, fractions, suffixes, or leading zeros. Thus `12abc` and `0` are invalid (`400`). A well formed ID with no matching event returns `404`.

## Bookings

10. Only a `user` can book an `OPEN` event whose start time has not passed. The number of `ACTIVE` bookings must remain below capacity.
11. One `(user_id, event_id)` pair has at most one row. Booking it twice while `ACTIVE` returns `409`. Booking after `CANCELLED` reactivates that row, preserving the same booking ID.
12. A user may cancel only their own `ACTIVE` booking. Cancellation changes its status to `CANCELLED` and releases one place. Cancellation without a booking returns `404`; cancelling an already cancelled booking returns `409`. Cancellation is allowed after the event closes or starts so the user's history stays consistent.
13. Each booking or rebooking transaction locks its event row, checks the active count, and writes the booking before commit. Capacity changes use the same event lock. This serializes these writes for a given event on the configured MySQL instance.

## Validation and HTTP status

- `400 BAD_REQUEST`: malformed JSON, unknown or missing fields, invalid ID, invalid type, invalid email, short password, or invalid event fields. Email is checked on the server. Passwords require at least 8 characters and at most 72 UTF-8 bytes; usernames require 3–50 trimmed characters.
- `401 UNAUTHORIZED`: missing, malformed, invalid, or expired token; failed login credentials.
- `403 FORBIDDEN`: authenticated account lacks the role or ownership.
- `404 NOT_FOUND`: a validly identified resource or the user's own booking does not exist.
- `409 CONFLICT`: duplicate username/email, duplicate active booking, full/closed/started event, repeated cancellation, or capacity below active bookings.

Responses use `{ "error": { "code": "...", "message": "..." } }`. Internal database failures return `500` without exposing credentials or SQL. Register/login, create/update event, close PATCH, and booking POST reject unknown JSON fields. GET and cancellation DELETE do not apply that body whitelist; ignored fields never override the authenticated identity.
