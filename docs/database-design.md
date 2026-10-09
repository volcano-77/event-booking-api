# Database design

The schema is [schema.sql](../src/db/schema.sql). It uses MySQL 8 InnoDB and three tables.

Dates use UTC driver conversion and `SET time_zone = '+00:00'` on each pooled connection. Both are required: driver timezone alone does not change MySQL TIMESTAMP/NOW session behavior. The isolated test SQL connection also uses UTC. See BUG-002 and its real reproduction evidence.

| Table | Purpose | Important constraints and indexes |
| --- | --- | --- |
| `users` | Identity and role | Unique username and email; role restricted to `user` or `organizer` |
| `events` | Activity and capacity | Organizer foreign key; status/start index; capacity check |
| `bookings` | Current and past reservation state | User and event foreign keys; unique `(user_id,event_id)`; event/status and user/status indexes |

Cancelled bookings remain in the table. A later booking by the same user for the same event updates that row to `ACTIVE`; therefore a user cannot have two simultaneous active bookings. Active counts are computed from `bookings.status = 'ACTIVE'`. The event row is locked with `SELECT ... FOR UPDATE` for booking, cancellation, closure, and capacity updates so writes for one event are serialized. This is intended for a single MySQL database instance.

The database stores `start_time` in UTC `DATETIME(3)`. API inputs require an explicit timezone, and the Node MySQL connection uses UTC. Password hashes, not plaintext passwords, are stored. Do not inspect or publish real password hashes or tokens in project reports.
