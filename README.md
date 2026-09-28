# Event Booking API Testing

## Project Overview

A small original event booking REST API built as a system under test for software testing practice. The business model follows common event reservation scenarios. The implementation focuses on authentication, capacity boundaries, ownership, state changes, and testable error responses.

## Why This Project Exists

The API gives a concrete target for Postman and later Newman testing. Its few endpoints have enough rules to exercise positive paths, invalid inputs, permission checks, conflicts, and database consistency without a frontend or unrelated infrastructure.

## Business Scenario

An organizer publishes an event with a finite number of places. Users browse events, book one place per event, cancel, and book again if a place remains. The organizer can change or close only their own event.

## Roles

| Role | Capabilities |
| --- | --- |
| `user` | Register, log in, browse, book, cancel own booking, view own bookings |
| `organizer` | Log in, browse, create and manage own events, view own event bookings |

Public registration always creates a user. An operator with database credentials creates an organizer using the local script. No API accepts a requested role or promotes an account.

## Core Business Rules

Events have `OPEN` and `CLOSED` states; bookings have `ACTIVE` and `CANCELLED` states. An event cannot exceed its capacity, and one user cannot hold two active bookings for the same event. Cancellation releases a place; rebooking reactivates the same database row. IDs are strictly parsed. Ownership and role rules are enforced server-side. See [business rules](docs/business-rules.md) for the full contract and status code choices.

## API Overview

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Receive JWT |
| GET | `/api/events` | Public | List events |
| GET | `/api/events/:id` | Public | Event details |
| POST | `/api/events` | Organizer | Create event |
| PUT | `/api/events/:id` | Owning organizer | Edit event |
| PATCH | `/api/events/:id/close` | Owning organizer | Close event |
| POST | `/api/events/:id/book` | User | Book or rebook |
| DELETE | `/api/events/:id/book` | User | Cancel own booking |
| GET | `/api/bookings/me` | User | Own booking history |
| GET | `/api/events/:id/bookings` | Owning organizer | Event booking list |

## Tech Stack

Node.js, Express, MySQL 8 with InnoDB, `mysql2`, JWT, `bcrypt`, and OpenAPI 3 with Swagger UI. Node.js 20 or newer is required.

## Database Design

The three tables are `users`, `events`, and `bookings`. Foreign keys preserve ownership links, unique constraints prevent duplicate identities and user/event booking rows, and indexes support status counts and personal history. Booking and capacity writes lock the event row inside a transaction. See [database design](docs/database-design.md) and [schema](src/db/schema.sql).

## Local Setup

1. Install Node.js 20+ and start MySQL 8. Create a MySQL account that can create this project's database and tables. Use only a database dedicated to this project.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a random `JWT_SECRET` of at least 32 characters. `.env` is Git ignored. The example database name is `event_booking_api_testing`.
4. Run `npm run db:init` to create the database and tables. This command is idempotent and does not reset existing rows.
5. Run `npm start`. Startup verifies the database connection. The default base URL is `http://localhost:3000`.
6. In PowerShell, set a temporary organizer password with `$env:ORGANIZER_PASSWORD = 'choose-a-strong-password'`, run `npm run create:organizer -- organizer organizer@example.test`, then remove it with `Remove-Item Env:ORGANIZER_PASSWORD`. This script inserts a bcrypt hash directly and requires database access. The password is not passed as a command argument.

The organizer command is an operator setup action, not an API endpoint. Avoid using sample passwords or production credentials. If the MySQL account cannot create databases, create the named database with an administrator account first and grant table creation privileges, then rerun `npm run db:init`.

To run the disposable development check, start the server and run `npm run smoke` in another terminal. It creates unique temporary identities and an event, exercises the main flow, and removes those rows. Its output is not a formal testing result.

## Swagger / API Documentation

Open `http://localhost:3000/api/docs` while the server runs. The source [OpenAPI file](docs/openapi.yaml) is also served at `/api/openapi.yaml`; [API notes](docs/api-spec.md) explain IDs and rebooking. Authentication uses `Authorization: Bearer <token>`.

## Testing Goals

Practice equivalence partitioning, boundary values, authentication, role and object ownership checks, strict ID validation, duplicate requests, state transitions, booking capacity, and database consistency. Postman environments and dynamic variables can carry generated tokens and IDs into later requests.

## Testing Scope

The [testing scope draft](docs/testing-scope.md) lists planned Auth, Event, Booking, and data consistency checks, plus later Postman, Newman, and optional concurrency work. It intentionally contains no Pass/Fail claims. The [Postman](postman/README.md) and [tests](tests/README.md) directories are placeholders for work backed by actual execution.

## Project Structure

```text
src/       Express app, routes, validation, JWT middleware, MySQL schema and connection
scripts/   database setup, organizer provisioning, disposable smoke check
docs/      business rules, OpenAPI, API notes, database design, testing scope
postman/   future collection guidance
tests/     future test assets and real evidence
```

## Known Limitations

- No email verification, password reset, rate limiting, or detailed audit log.
- Organizer provisioning is a local operator script rather than a self-service workflow.
- The transaction design targets one MySQL database instance. A future concurrency exercise should measure actual last-place behavior; no unverified race condition is claimed as a confirmed bug.
- The API accepts safe integer IDs although the schema uses `BIGINT`, so extremely large database IDs are outside the supported API range.

## References

No particular external repository or source code was used. The business rules reflect common event booking scenarios; no third-party README, tests, or project structure were copied.
