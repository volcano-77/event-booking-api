# Event Booking API Testing

## Project Overview

A small original event booking REST API built as a system under test for software testing practice. The business model follows common event reservation scenarios. The implementation focuses on authentication, capacity boundaries, ownership, state changes, and testable error responses.

## Project Status

This repository deliberately separates the implemented system from testing work that is prepared but not yet executed.

### Implemented system capabilities

- 11 REST endpoints for registration, login, event management, booking, cancellation, and booking views.
- JWT authentication with distinct missing, malformed, invalid, and expired-token responses.
- User and Organizer role checks plus event-owner authorization.
- Server-side field, boundary, strict-ID, and future-time validation.
- MySQL foreign keys, unique constraints, indexed booking counts, and event-row locking for booking transactions.
- Swagger UI and OpenAPI source documentation.

### Prepared test assets — execution status: Not Run

- API test plan and 63 manual cases with stable IDs.
- Postman collection, local environment template, token extraction, request dependencies, assertions, and a critical business chain.
- Read-only SQL validation goals and query templates.
- Evidence, defect-report, and test-summary templates.
- Local Newman runner that writes raw execution artifacts only when the tester explicitly runs it.

No formal API test result, confirmed defect, screenshot, conclusion, or test success rate is claimed in this repository at this stage.

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

## Prepared Test Workspace

Start with the [API test plan](docs/test-plan.md), then read the [manual API cases](test-cases/api-test-cases.md). The plan defines scope, identities, entry criteria, evidence rules, and execution boundaries. Every case begins as `Not Run`.

Import these into Postman:

- `postman/Event-Booking-API.postman_collection.json`
- `postman/local.postman_environment.json`

Before running the main chain, create a dedicated local Organizer account and enter its email and password in Postman's local/current environment values. Run the `Main Business Chain - Not Run` folder from item 01 so generated users, tokens, event ID, and booking IDs are created in dependency order. See [Postman instructions](postman/README.md).

After you understand and manually execute the chain, Newman is available through `npm run test:api`. It requires `EVENT_BOOKING_ORGANIZER_EMAIL` and `EVENT_BOOKING_ORGANIZER_PASSWORD` in the current PowerShell process and writes raw JSON/JUnit evidence under `evidence/newman/<run-id>/`. See [Newman instructions](scripts/newman/README.md). The runner has not been executed as part of preparing this skeleton.

Use [SQL validation templates](sql-validation/README.md) only against the same test database. Create defect reports only from reproducible observed behavior, and complete a copy of the [test summary template](reports/test-summary-template.md) only after real execution.

## Testing Goals

Practice equivalence partitioning, boundary values, authentication, role and object ownership checks, strict ID validation, duplicate requests, state transitions, booking capacity, and database consistency. Postman environments and dynamic variables can carry generated tokens and IDs into later requests.

## Testing Scope

The [testing scope draft](docs/testing-scope.md) gives the high-level direction. The detailed [test plan](docs/test-plan.md) and [API case catalog](test-cases/api-test-cases.md) cover Auth, Event, Booking, authorization, boundaries, state changes, critical chains, and data consistency. All execution statuses remain `Not Run` or `Pending` until the tester records real evidence.

## Project Structure

```text
src/       Express app, routes, validation, JWT middleware, MySQL schema and connection
scripts/   database setup, organizer provisioning, smoke check, and explicit Newman runner
docs/      business rules, OpenAPI, database design, testing scope, and detailed test plan
test-cases/ manual API cases; initial status Not Run
postman/   prepared collection, environment template, and usage guide
sql-validation/ read-only database validation targets and query templates
evidence/  guidance and future real execution artifacts
bug-reports/ defect-report guidance and blank template; no confirmed defects
reports/   blank test-summary template
tests/     pointer for future additional automated test assets
```

## Known Limitations

- No email verification, password reset, rate limiting, or detailed audit log.
- Organizer provisioning is a local operator script rather than a self-service workflow.
- The transaction design targets one MySQL database instance. A future concurrency exercise should measure actual last-place behavior; no unverified race condition is claimed as a confirmed bug.
- The API accepts safe integer IDs although the schema uses `BIGINT`, so extremely large database IDs are outside the supported API range.

## References

No particular external repository or source code was used. The business rules reflect common event booking scenarios; no third-party README, tests, or project structure were copied.
