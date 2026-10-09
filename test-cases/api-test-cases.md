# API Test Cases

## Document status

- Design status: maintained manual catalog
- Manual execution status for every case: `Not Run`
- This catalog has not been executed case-by-case by a human. Related automated scenarios have real results in `reports/test-summary-2026-10-09.md`; do not infer all variants here passed.
- Source: current business rules, OpenAPI, validators, route implementation, and database schema.

## Execution conventions

- Replace placeholders such as `<userA-token>` and `<eventA-id>` with current test data.
- Send JSON requests with `Content-Type: application/json` unless the case intentionally tests malformed input.
- For protected endpoints use `Authorization: Bearer <token>`.
- Record actual results and evidence only during a real execution cycle.
- Use `sql-validation/validation-queries.sql` only against the same dedicated test database used by the API.

## Auth cases

| Test Case ID | Module / Feature | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Severity | Test Type | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-001 | Register | Verify that a valid public registration creates a User | Unique email and username | 1. POST `/api/auth/register`<br>2. Send valid body<br>3. Record returned user ID | username `qa_user_a`; unique email; password `QaPass123!` | HTTP 201; response contains ID, normalized email, username, and `role=user`; password is absent | High | Major | Functional | Not Run | Source: Requirement; SQL U-01 |
| TC-AUTH-002 | Register | Verify that a client cannot choose the Organizer role | Unique identity | 1. POST register<br>2. Add `role: organizer` | Valid registration fields plus role | HTTP 400; `error.code=UNKNOWN_FIELD`; no user is created | High | Critical | Permission | Not Run | Source: Requirement |
| TC-AUTH-003 | Register | Verify required registration fields are enforced | None | Repeat request while omitting one required field at a time | Missing username, email, then password | Each request returns HTTP 400 with `MISSING_FIELD`; no partial user row | High | Major | Validation | Not Run | Source: Requirement |
| TC-AUTH-004 | Register | Verify username length boundaries after trimming | Unique emails per request | Register with each username value | 2 chars; 3 chars; 50 chars; 51 chars; spaces only; `  abc  ` | 2/51/blank return 400; 3/50 accepted; trimmed valid value is stored and returned without surrounding spaces | Medium | Major | Boundary | Not Run | Source: Requirement |
| TC-AUTH-005 | Register | Verify invalid email formats are rejected | Unique username per request | Register with each email | `abc`, `a@`, `a@b`, `.a@example.com`, `a..b@example.com`, `a@-b.com` | HTTP 400 with `INVALID_EMAIL`; no user row | High | Major | Validation | Not Run | Source: Requirement |
| TC-AUTH-006 | Register | Verify email normalization and uniqueness | One email not yet used | 1. Register mixed-case email<br>2. Register same email in lower case | `Case.User@Example.com`, `case.user@example.com` | First accepted and returned in lower case; second returns HTTP 409 `DUPLICATE` | High | Major | Data Persistence | Not Run | Source: Requirement; SQL U-01 |
| TC-AUTH-007 | Register | Verify password boundaries including UTF-8 byte limit | Unique identity for each accepted attempt | Register with boundary passwords | 7 chars; 8 ASCII chars; 72 ASCII bytes; 73 ASCII bytes; multibyte value above 72 bytes | 7 and values above 72 UTF-8 bytes return 400; valid boundaries may be accepted | High | Major | Boundary | Not Run | Source: Requirement |
| TC-AUTH-008 | Register | Verify duplicate username is rejected | Existing user | Register a different email with existing username | Existing username, unique email | HTTP 409 `DUPLICATE`; original user remains unchanged | High | Major | Negative | Not Run | Source: Requirement |
| TC-AUTH-009 | Login | Verify User login returns a usable JWT | Registered User A | POST `/api/auth/login` with correct credentials | User A email/password | HTTP 200; non-empty token; `token_type=Bearer`; user role is `user`; save token | High | Critical | Functional | Not Run | Source: Requirement |
| TC-AUTH-010 | Login | Verify Organizer login returns Organizer identity | Organizer A provisioned by local script | POST login with correct credentials | Organizer A email/password | HTTP 200; non-empty token; returned role is `organizer`; save token | High | Critical | Functional | Not Run | Source: Requirement |
| TC-AUTH-011 | Login | Verify invalid credentials do not reveal whether an email exists | Existing user available | Login once with wrong password and once with unknown email | Wrong password; unknown email | Both return HTTP 401 `INVALID_CREDENTIALS` with the same public message shape | High | Major | Negative | Not Run | Source: Requirement |
| TC-AUTH-012 | JWT | Verify a protected endpoint rejects a missing token | Existing event optional | POST `/api/events` without Authorization header | Valid event body | HTTP 401 `TOKEN_MISSING`; no event is created | High | Critical | Authentication | Not Run | Source: Requirement |
| TC-AUTH-013 | JWT | Verify malformed Bearer headers are rejected | None | Call a protected endpoint with malformed headers | `Token abc`; `Bearer`; `Bearer ` | HTTP 401 `TOKEN_MALFORMED` | High | Major | Authentication | Not Run | Source: Requirement |
| TC-AUTH-014 | JWT | Verify a modified or random token is rejected | None | Call a protected endpoint with invalid token | Random text; one-character-modified JWT | HTTP 401 `TOKEN_INVALID`; protected action is not performed | High | Critical | Authentication | Not Run | Source: Requirement |
| TC-AUTH-015 | JWT | Verify an expired token is distinguished from other invalid tokens | Token generated with short test expiry or retained until expiry | Call protected endpoint after expiry | Expired validly signed JWT | HTTP 401 `TOKEN_EXPIRED`; action is not performed | High | Major | Authentication | Not Run | Source: Requirement; setup may require short local expiry |

## Event query cases

| Test Case ID | Module / Feature | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Severity | Test Type | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-EVT-Q-001 | Event list | Verify event list is publicly accessible | At least one event preferred | GET `/api/events` without token | N/A | HTTP 200; response contains `events` array; each item exposes documented event fields and active booking count | High | Major | Functional | Not Run | Source: Requirement |
| TC-EVT-Q-002 | Event list | Verify OPEN and CLOSED events remain visible | One OPEN and one CLOSED event | GET event list | Known event IDs | HTTP 200; both records are returned with their persisted statuses | Medium | Minor | Functional | Not Run | Source: Requirement |
| TC-EVT-Q-003 | Event detail | Verify a valid event can be retrieved publicly | Existing Event A | GET `/api/events/<eventA-id>` without token | Valid ID | HTTP 200; returned ID and fields belong to Event A; active booking count is present | High | Major | Functional | Not Run | Source: Requirement |
| TC-EVT-Q-004 | Event ID | Verify syntactically invalid IDs are rejected strictly | None | GET event detail for each value | `0`, `-1`, `01`, `12abc`, `1.5`, `+1`, encoded surrounding spaces, value above JS safe integer | Each request returns HTTP 400 `INVALID_ID`; `12abc` is not treated as ID 12 | High | Major | Validation | Not Run | Source: Requirement |
| TC-EVT-Q-005 | Event detail | Verify a valid-format nonexistent ID returns not found | Choose unused positive safe integer | GET event detail | Unused ID | HTTP 404 `EVENT_NOT_FOUND` | High | Major | Negative | Not Run | Source: Requirement |

## Event management cases

| Test Case ID | Module / Feature | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Severity | Test Type | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-EVT-M-001 | Create event | Verify Organizer can create an OPEN event | Organizer A token | 1. POST `/api/events`<br>2. Send valid future event<br>3. Save ID | title; description; capacity 1; future ISO timestamp | HTTP 201; status `OPEN`; organizer ID matches Organizer A; response values match normalized input | High | Critical | Functional | Not Run | Source: Requirement; SQL E-01 |
| TC-EVT-M-002 | Create event | Verify User cannot create an event | User A token | POST create event with valid body | Valid event body | HTTP 403 `FORBIDDEN`; no event row is created | High | Critical | Permission | Not Run | Source: Requirement |
| TC-EVT-M-003 | Create event | Verify required fields and unknown fields are rejected | Organizer A token | Omit each required field; then add `organizer_id` or `status` | Missing title/capacity/start_time; extra fields | HTTP 400 `MISSING_FIELD` or `UNKNOWN_FIELD`; no event row | High | Major | Validation | Not Run | Source: Requirement |
| TC-EVT-M-004 | Create event | Verify title boundaries are enforced after trimming | Organizer A token | Create with each title value | blank; 1 char; 120 chars; 121 chars; surrounding spaces | Blank/121 return 400; 1/120 accepted; surrounding spaces are trimmed | Medium | Major | Boundary | Not Run | Source: Requirement |
| TC-EVT-M-005 | Create event | Verify description boundaries and optional behavior | Organizer A token | Create events with each description condition | omitted; empty; 2000 chars; 2001 chars | Omitted/empty/2000 accepted, omitted becomes empty string; 2001 returns 400 | Medium | Major | Boundary | Not Run | Source: Requirement |
| TC-EVT-M-006 | Create event | Verify capacity type and boundaries | Organizer A token | Create with each capacity | `0`, `1`, `100000`, `100001`, `-1`, `1.5`, string `"1"`, null | 1 and 100000 accepted; all other listed values return HTTP 400 `INVALID_CAPACITY` | High | Major | Boundary | Not Run | Source: Requirement |
| TC-EVT-M-007 | Create event | Verify start time must be a real future ISO timestamp with timezone | Organizer A token | Create with each timestamp | Future UTC; future `+08:00`; past; current; no timezone; `2030-02-30T10:00:00Z`; non-string | Valid future timestamps accepted; all invalid/past/current values return 400 `INVALID_START_TIME` | High | Major | Boundary | Not Run | Source: Requirement |
| TC-EVT-M-008 | Update event | Verify owning Organizer can replace editable fields | OPEN Event A owned by Organizer A | PUT `/api/events/<eventA-id>` with complete valid body | New title, description, capacity, future time | HTTP 200; all editable fields reflect input; owner and OPEN state remain unchanged | High | Critical | Functional | Not Run | Source: Requirement; SQL E-01 |
| TC-EVT-M-009 | Update event | Verify PUT requires all required editable fields | OPEN Event A; Organizer A token | Omit title, capacity, or start_time in separate requests | Partial bodies | HTTP 400 `MISSING_FIELD`; existing event values remain unchanged | High | Major | Validation | Not Run | Source: Requirement |
| TC-EVT-M-010 | Update event | Verify User cannot update an event | OPEN Event A; User A token | PUT event with valid body | Valid update body | HTTP 403 `FORBIDDEN`; event remains unchanged | High | Critical | Permission | Not Run | Source: Requirement |
| TC-EVT-M-011 | Event ownership | Verify another Organizer cannot update Event A | Event A owned by Organizer A; Organizer B token | PUT Event A with valid body | Valid update body | HTTP 403 `NOT_EVENT_OWNER`; event remains unchanged | High | Critical | Permission | Not Run | Source: Requirement |
| TC-EVT-M-012 | Update capacity | Verify capacity cannot be reduced below ACTIVE booking count | Event A has at least two ACTIVE bookings; Organizer A token | PUT Event A with capacity one below active count | active count 2; requested capacity 1 | HTTP 409 `CAPACITY_BELOW_BOOKINGS`; capacity and bookings remain unchanged | High | Critical | Business Conflict | Not Run | Source: Requirement; SQL E-02/B-02 |
| TC-EVT-M-013 | Update capacity | Verify capacity may equal the ACTIVE booking count | Event A has known ACTIVE count; Organizer A token | PUT with capacity equal to active count | active count N; capacity N | HTTP 200; capacity becomes N; no booking changes | Medium | Major | Boundary | Not Run | Source: Requirement |
| TC-EVT-M-014 | Close event | Verify owning Organizer can close an OPEN event | OPEN Event A; Organizer A token | PATCH `/api/events/<eventA-id>/close` with `{}` | Empty JSON object | HTTP 200; response and persisted status are `CLOSED` | High | Critical | Workflow | Not Run | Source: Requirement; SQL E-01 |
| TC-EVT-M-015 | Close event | Verify User cannot close an event | OPEN Event A; User A token | PATCH close | Empty body | HTTP 403 `FORBIDDEN`; event remains OPEN | High | Critical | Permission | Not Run | Source: Requirement |
| TC-EVT-M-016 | Event ownership | Verify another Organizer cannot close Event A | OPEN Event A owned by Organizer A; Organizer B token | PATCH close Event A | Empty body | HTTP 403 `NOT_EVENT_OWNER`; event remains OPEN | High | Critical | Permission | Not Run | Source: Requirement |
| TC-EVT-M-017 | CLOSED state | Verify closing an already CLOSED event is rejected | CLOSED Event A; owner token | PATCH close again | Empty body | HTTP 409 `EVENT_CLOSED`; status remains CLOSED | High | Major | State Transition | Not Run | Source: Requirement |
| TC-EVT-M-018 | CLOSED state | Verify a CLOSED event cannot be modified | CLOSED Event A; owner token | PUT with otherwise valid body | Valid update body | HTTP 409 `EVENT_CLOSED`; persisted event fields remain unchanged | High | Major | State Transition | Not Run | Source: Requirement |

## Booking and booking-view cases

| Test Case ID | Module / Feature | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Severity | Test Type | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-BKG-001 | Book event | Verify User can take an available place | User A token; OPEN future Event A with free capacity | POST `/api/events/<eventA-id>/book` with `{}` | Event A ID | HTTP 201; `status=ACTIVE`; `rebooked=false`; user/event IDs match; save booking ID | High | Critical | Functional | Not Run | Source: Requirement; SQL B-01/B-02 |
| TC-BKG-002 | Book event | Verify a missing token cannot create a booking | OPEN future event | POST book without Authorization | Valid event ID | HTTP 401 `TOKEN_MISSING`; no booking is created | High | Critical | Authentication | Not Run | Source: Requirement |
| TC-BKG-003 | Book event | Verify Organizer cannot book an event | Organizer A token; OPEN future event | POST book | Valid event ID | HTTP 403 `FORBIDDEN`; no booking is created | High | Critical | Permission | Not Run | Source: Requirement |
| TC-BKG-004 | Book event | Verify booking rejects invalid and nonexistent event IDs | User A token | POST book for each ID | `12abc`, `0`, unused valid positive ID | Invalid formats return 400 `INVALID_ID`; unused valid ID returns 404 `EVENT_NOT_FOUND` | High | Major | Validation | Not Run | Source: Requirement |
| TC-BKG-005 | Book event | Verify booking body accepts no fields | User A token; OPEN future event | POST book with unknown body property | `{ "user_id": "other" }` | HTTP 400 `UNKNOWN_FIELD`; no booking is created | High | Critical | Permission | Not Run | Source: Requirement |
| TC-BKG-006 | Duplicate booking | Verify a second ACTIVE booking by the same User is rejected | User A already has ACTIVE booking for Event A | POST book Event A again | Same event and User A | HTTP 409 `ALREADY_BOOKED`; only one user/event row exists | High | Critical | Business Conflict | Not Run | Source: Requirement; SQL B-01 |
| TC-BKG-007 | Capacity | Verify another User is rejected when capacity is full | Capacity-1 Event A occupied by User A; User B token | POST book as User B | Event A ID | HTTP 409 `EVENT_FULL`; User B receives no booking; ACTIVE count stays 1 | High | Critical | Boundary | Not Run | Source: Requirement; SQL B-02 |
| TC-BKG-008 | Event start | Verify an already-started OPEN event cannot be booked | OPEN event with start time now in the past; User A has no active booking | POST book | Started event ID | HTTP 409 `EVENT_STARTED`; no booking is created | High | Major | Business Conflict | Not Run | Source: Requirement; prepare by allowing test time to pass or controlled DB fixture |
| TC-BKG-009 | CLOSED state | Verify a CLOSED event cannot be booked | CLOSED Event A; eligible User | POST book | Event A ID | HTTP 409 `EVENT_CLOSED`; no new or reactivated booking | High | Critical | State Transition | Not Run | Source: Requirement |
| TC-BKG-010 | Cancel booking | Verify User can cancel an ACTIVE own booking | User A has ACTIVE booking | DELETE `/api/events/<eventA-id>/book` with User A token | Event A ID | HTTP 200; same booking ID; status becomes `CANCELLED`; ACTIVE count decreases by one | High | Critical | Workflow | Not Run | Source: Requirement; SQL B-02/B-03 |
| TC-BKG-011 | Cancel booking | Verify cancellation uses the authenticated User identity | User A and User B exist; only User A has booking | DELETE event booking with User B token | Event A ID | HTTP 404 `BOOKING_NOT_FOUND`; User A booking remains unchanged | High | Critical | Object Authorization | Not Run | Source: Requirement |
| TC-BKG-012 | Cancel booking | Verify repeated cancellation is rejected | User A booking is CANCELLED | DELETE same booking again | Event A ID | HTTP 409 `BOOKING_CANCELLED`; row remains CANCELLED | High | Major | State Transition | Not Run | Source: Requirement |
| TC-BKG-013 | Cancel booking | Verify cancellation of a never-booked event returns not found | Existing Event B; User A has no row for Event B | DELETE booking | Event B ID | HTTP 404 `BOOKING_NOT_FOUND`; no row is created | Medium | Major | Negative | Not Run | Source: Requirement |
| TC-BKG-014 | Cancel booking | Verify cancellation remains allowed after the event closes | User A has ACTIVE booking; owner then closes event | DELETE booking as User A | CLOSED event ID | HTTP 200; booking becomes CANCELLED and releases capacity | High | Major | State Transition | Not Run | Source: Requirement |
| TC-BKG-015 | Rebooking | Verify a cancelled booking can be reactivated | User A booking is CANCELLED; event OPEN, future, and has capacity | POST book again | Same event ID | HTTP 200; `status=ACTIVE`; `rebooked=true`; booking ID equals original ID | High | Critical | Workflow | Not Run | Source: Requirement; SQL B-03 |
| TC-BKG-016 | Rebooking | Verify rebooking is rejected if another User consumed the released place | Capacity-1 event; User A cancelled; User B then booked | POST book as User A | Event A ID | HTTP 409 `EVENT_FULL`; User A row remains CANCELLED; User B remains ACTIVE | High | Critical | Business Conflict | Not Run | Source: Requirement |
| TC-BKG-017 | Capacity release | Verify cancellation lets another User take the released last place | Capacity-1 event; User A ACTIVE; User B was rejected as full | 1. Cancel User A<br>2. Book as User B | Event A ID | Cancel returns 200; following User B booking returns 201; final ACTIVE count is 1, not 2 | High | Critical | Workflow | Not Run | Source: Requirement; SQL B-02 |
| TC-BKG-018 | My bookings | Verify User sees own ACTIVE and CANCELLED history only | User A and User B have booking history | GET `/api/bookings/me` as User A | User A token | HTTP 200; array contains only User A records; each item has ID, event ID, title, status, and timestamps | High | Critical | Data Isolation | Not Run | Source: Requirement; SQL B-04 |
| TC-BKG-019 | My bookings | Verify Organizer cannot call User booking history endpoint | Organizer A token | GET `/api/bookings/me` | Organizer token | HTTP 403 `FORBIDDEN` | Medium | Major | Permission | Not Run | Source: Requirement |
| TC-BKG-020 | Event booking list | Verify owning Organizer can view bookings for own event | Event A owned by Organizer A with booking history | GET `/api/events/<eventA-id>/bookings` | Organizer A token | HTTP 200; records belong to Event A; username and status are present; email and password are absent | High | Critical | Functional | Not Run | Source: Requirement; SQL B-04 |
| TC-BKG-021 | Event ownership | Verify non-owner Organizer cannot view Event A bookings | Event A owned by Organizer A; Organizer B token | GET Event A bookings | Event A ID | HTTP 403 `NOT_EVENT_OWNER`; no booking data is returned | High | Critical | Object Authorization | Not Run | Source: Requirement |
| TC-BKG-022 | Event booking list | Verify User cannot view an event's organizer booking list | Event A exists; User A token | GET Event A bookings | Event A ID | HTTP 403 `FORBIDDEN`; no organizer-level data is returned | High | Critical | Permission | Not Run | Source: Requirement |

## Critical business-chain cases

| Test Case ID | Module / Feature | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Severity | Test Type | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-E2E-001 | Main workflow | Verify register-login-create-book-cancel-rebook-close chain | Organizer A exists; unique User A identity | 1. Register User A<br>2. Login User A and Organizer A<br>3. Organizer creates capacity-1 event<br>4. User books<br>5. User cancels<br>6. User rebooks<br>7. Organizer closes event<br>8. User cancels existing booking<br>9. User attempts new booking | Unique identities and future event | Each transition returns its documented status; one booking row is reused; CLOSED prevents new booking; final persisted states match the last successful actions | High | Critical | End-to-End | Not Run | Source: Requirement; Postman main chain |
| TC-E2E-002 | Capacity workflow | Verify the last place moves from User A to User B only after cancellation | Two Users; capacity-1 OPEN event | 1. A books<br>2. B attempts booking<br>3. A cancels<br>4. B books<br>5. Query active count | Event A ID | Step 2 returns `EVENT_FULL`; after cancellation B receives the place; final ACTIVE count equals capacity | High | Critical | End-to-End | Not Run | Source: Requirement; SQL B-02 |
| TC-E2E-003 | Ownership workflow | Verify event management stays isolated between two Organizers | Organizer A owns Event A; Organizer B owns Event B | Attempt update, close, and booking-list view across ownership boundaries | Both organizer tokens and event IDs | Owner actions may proceed when state permits; every non-owner action returns 403 `NOT_EVENT_OWNER`; neither event is changed by non-owner requests | High | Critical | End-to-End | Not Run | Source: Requirement |

## Coverage map

| Required area | Primary cases |
| --- | --- |
| All 11 APIs | AUTH-001/009, EVT-Q-001/003, EVT-M-001/008/014, BKG-001/010/018/020 |
| JWT authentication | AUTH-012 through AUTH-015, BKG-002 |
| User / Organizer roles | EVT-M-002/010/015, BKG-003/019/022 |
| Event ownership | EVT-M-011/016, BKG-021, E2E-003 |
| Parameter validation | AUTH-003 through AUTH-007, EVT-Q-004, EVT-M-003 through EVT-M-007, BKG-004/005 |
| Duplicate booking | BKG-006 |
| Capacity limit | EVT-M-012/013, BKG-007/017, E2E-002 |
| Cancellation releases capacity | BKG-010/017, E2E-002 |
| CLOSED state | EVT-M-014/017/018, BKG-009/014, E2E-001 |
| Illegal ID | EVT-Q-004/005, BKG-004 |
| Boundary values | AUTH-004/007, EVT-M-004 through EVT-M-007/013 |
| Critical business chains | E2E-001 through E2E-003 |

## Execution notes

- `npm run test:lab` provisions two local Organizers in a fresh isolated instance; its environment export stays under ignored `.runtime/`.
- Actual redacted automation evidence is preserved in `evidence/runs/`; no commit is automatic.
- Repeated runs use fresh data directories and unique identities, not destructive database resets.
- Bounded concurrency and SQL cases are in `concurrency-and-db.md`; their actual results are separate from this manual catalog.
