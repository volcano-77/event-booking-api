# SQL Validation Templates

Status: `Not Run`.

These files support API-to-database consistency checks. They contain query templates and expected validation points, not execution output.

## Safe use

1. Connect only to the dedicated test database configured for this project.
2. Copy `validation-queries.sql` to a local scratch file if you need to fill IDs.
3. Set `@user_id`, `@event_id`, `@booking_id`, and related variables from the current API run.
4. Run only the section related to the current test case.
5. Save sanitized output under `evidence/sql/<run-id>/` only after real execution.
6. Never save database credentials, full JWTs, or plaintext passwords in evidence.

The queries are read-only. Their comments describe the expected validation point. A different result must be checked against test prerequisites and reproduced before it is treated as a defect.

## Query map

| Query ID | Validation target | Related cases |
| --- | --- | --- |
| U-01 | Registered identity, role, and password-hash characteristics | AUTH-001, AUTH-006 |
| E-01 | Event ownership, status, and saved fields | EVT-M-001, EVT-M-008, EVT-M-014 |
| E-02 | Capacity compared with ACTIVE booking count | EVT-M-012, EVT-M-013 |
| B-01 | One booking row per user/event | BKG-001, BKG-006, BKG-015 |
| B-02 | ACTIVE count and remaining capacity | BKG-007, BKG-010, BKG-017, E2E-002 |
| B-03 | Cancel/rebook lifecycle and timestamps | BKG-010, BKG-012, BKG-015 |
| B-04 | User and event booking isolation | BKG-018, BKG-020, BKG-021 |
| C-01 | Foreign-key relationship integrity | Data consistency review |
