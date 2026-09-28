# API Test Plan

## 1. Document status

- Plan status: `Pending`
- Test execution status: `Not Run`
- Target system: Event Booking API Testing v1.0.0
- Source of truth: `docs/business-rules.md`, `docs/openapi.yaml`, database schema, and current route implementation
- This plan defines intended testing work. It contains no execution result, defect conclusion, screenshot, or pass rate.

## 2. Objective

Verify that the 11 REST APIs enforce the documented authentication, role, ownership, validation, booking capacity, and state-transition rules, and that API responses remain consistent with persisted MySQL data.

## 3. Scope

### In scope

| Module | Endpoints | Main risks |
| --- | --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login` | Input validation, duplicate identities, password handling, JWT issuance |
| Event query | `GET /api/events`, `GET /api/events/:id` | Public access, strict IDs, active booking counts |
| Event management | `POST /api/events`, `PUT /api/events/:id`, `PATCH /api/events/:id/close` | Organizer role, event ownership, validation, capacity reduction, CLOSED state |
| User booking | `POST /api/events/:id/book`, `DELETE /api/events/:id/book`, `GET /api/bookings/me` | Duplicate booking, full capacity, cancellation, rebooking, user isolation |
| Organizer booking view | `GET /api/events/:id/bookings` | Organizer role, object-level authorization, returned data scope |
| Data validation | `users`, `events`, `bookings` | Foreign keys, unique row per user/event, ACTIVE counts, state persistence |

### Out of scope for this phase

- UI, browser compatibility, mobile, accessibility, email, password recovery, and payment testing.
- Load, stress, soak, and formal concurrency execution. The transaction design may later be probed separately.
- Production deployment, security penetration testing, and third-party integrations.
- Any claim that an unexecuted case has passed or failed.

## 4. Test basis and traceability

| Source | Purpose |
| --- | --- |
| `docs/business-rules.md` | Roles, state transitions, capacity and status-code rules |
| `docs/openapi.yaml` | Endpoint, request, authentication, and response contract |
| `src/routes/*.routes.js` | Implemented request flow and persistence behavior |
| `src/middleware/auth.js` | JWT authentication and role authorization |
| `src/validators/index.js` | Exact field and ID boundaries |
| `src/db/schema.sql` | Keys, constraints, indexes, and relationships |
| `test-cases/api-test-cases.md` | Executable manual cases and stable case IDs |

## 5. Test approach

1. **Contract tests:** method, path, body, headers, status code, and response fields.
2. **Authentication tests:** missing, malformed, invalid, and expired JWTs.
3. **Authorization tests:** User versus Organizer and owner versus non-owner.
4. **Validation tests:** required fields, unknown fields, wrong types, malformed JSON, and strict IDs.
5. **Boundary tests:** username, password, title, description, capacity, timestamps, and ID limits.
6. **Workflow tests:** register, login, create, book, cancel, rebook, close, and reject booking after closure.
7. **Data consistency checks:** compare responses with SQL templates after state-changing requests.
8. **Automation preparation:** Postman variables, token extraction, dependent IDs, assertions, and Newman runner.

## 6. Test environment

| Item | Planned value | Status |
| --- | --- | --- |
| API base URL | `http://localhost:3000` by default | Pending |
| Database | Dedicated local MySQL 8 database | Pending |
| API documentation | `/api/docs` and `docs/openapi.yaml` | Pending |
| Client | Postman; Newman after manual familiarization | Pending |
| Timezone | Record local timezone and use ISO 8601 request values with explicit timezone | Pending |

Do not use personal or production credentials. Keep `.env`, Postman current values, JWTs, database dumps, and raw password values out of Git.

## 7. Required test identities and data

| Data | Purpose | Preparation | Status |
| --- | --- | --- | --- |
| User A | Primary booking flow | Register through API | Pending |
| User B | Capacity and data-isolation checks | Register through API | Pending |
| Organizer A | Creates the primary event | Create using local organizer script | Pending |
| Organizer B | Non-owner authorization checks | Create using local organizer script | Pending |
| Event A, capacity 1 | Last-place, cancellation, rebooking, CLOSED flow | Organizer A creates through API | Pending |
| Event B | Ownership check for Organizer B | Organizer B creates through API | Pending |

Use unique email addresses for each execution. The supplied Postman collection generates unique User A and User B identities; Organizer credentials must be prepared locally before execution.

## 8. Entry criteria

- Application and MySQL configuration are available locally.
- Database schema has been initialized.
- API starts and Swagger/OpenAPI can be opened.
- Organizer A and Organizer B test accounts exist.
- Postman environment contains local organizer credentials but no shared secrets are committed.
- Test data can be reset or uniquely generated without affecting unrelated projects.

All entry criteria are currently `Pending` until the tester begins an execution cycle.

## 9. Exit criteria

An execution cycle may be summarized only after:

- Selected case IDs and scope are recorded.
- Actual responses and relevant database observations are captured.
- Each executed case receives an evidence-backed outcome.
- Unexpected behavior is reproduced before a defect report is created.
- Blocked or skipped cases include a reason.
- The summary uses the template in `reports/test-summary-template.md`.

No exit criterion is currently claimed as complete.

## 10. Suspension and resumption

Suspend execution if the API cannot start, the test database is unavailable, required Organizer accounts are missing, test data is contaminated, or the documented contract changes during the run. Record the affected case IDs as `Pending` and the reason. Resume only after the environment or contract is stabilized and prerequisites are rechecked.

## 11. Evidence and defect handling

- Store only evidence from real execution under `evidence/`.
- Name evidence with date, run ID, and case ID where practical.
- Redact passwords, JWTs, database credentials, and unrelated personal data.
- Use `bug-reports/bug-report-template.md` only after observed behavior differs reproducibly from the expected result.
- A failed request that matches the expected negative case is not a defect.

## 12. Deliverables

| Deliverable | Location | Initial status |
| --- | --- | --- |
| Test plan | `docs/test-plan.md` | Pending review |
| Manual API test cases | `test-cases/api-test-cases.md` | Not Run |
| Postman collection and environment | `postman/` | Not Run |
| SQL validation templates | `sql-validation/` | Not Run |
| Evidence guidance | `evidence/README.md` | Pending |
| Defect template | `bug-reports/` | Pending |
| Test summary template | `reports/test-summary-template.md` | Pending |
| Newman runner | `scripts/newman/` | Not Run |

## 13. Risks and assumptions

- Tests that depend on the current time must generate a future timestamp at execution time.
- Reusing fixed emails can cause duplicate-registration conflicts; use a unique run ID.
- Postman and SQL checks can observe different databases if environment configuration is inconsistent.
- Newman execution requires local Organizer credentials supplied at runtime.
- Formal concurrent last-place testing remains separate from this sequential collection.
- Test cases reflect the current implementation and documented first-version rules; contract changes require traceability review.
