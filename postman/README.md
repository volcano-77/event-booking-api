# Postman Assets

Execution status: `Not Run`.

This directory contains a prepared collection and a local environment template. Assertions describe expected behavior; they are not evidence that any request has been executed.

## Files

- `Event-Booking-API.postman_collection.json`: all 11 API operations arranged into a dependency-aware business chain, plus selected negative templates.
- `local.postman_environment.json`: base URL, local credentials, generated identities, tokens, and dependent IDs.

## Before the first run

1. Initialize the database and start the API.
2. Provision Organizer A using `npm run create:organizer` as documented in the root README.
3. Import both JSON files into Postman.
4. Select the imported local environment.
5. Set `organizerEmail` and `organizerPassword` in Postman's local/current values. For manual owner-versus-non-owner cases, also prepare `otherOrganizerEmail`, `otherOrganizerPassword`, `otherOrganizerToken`, and `otherEventId`. Do not export or commit those values.
6. Confirm `baseUrl` points to the API connected to the intended test database.

The collection supplies a harmless test-only default for `userPassword`. User names, emails, future event time, tokens, IDs, and booking IDs are generated or extracted during the chain.

## Main business chain

Run the `Main Business Chain - Not Run` folder from item 01 in order. It prepares:

1. unique User A and User B identities;
2. User and Organizer JWTs;
3. a capacity-1 OPEN event;
4. owner update, list, and detail checks;
5. User A booking and duplicate-booking conflict;
6. User B full-capacity conflict;
7. personal and organizer booking views;
8. cancellation, rebooking with the same booking ID, and another cancellation;
9. User B taking the released place;
10. Organizer closing the event and a rejected booking after closure.

The `Independent Negative Templates - Not Run` folder depends on variables produced by the completed main chain. It covers selected missing-token, wrong-role, illegal-ID, and repeated-close responses. The complete manual scope remains in `test-cases/api-test-cases.md`.

## Automatic variable handling

| Variable | Source |
| --- | --- |
| `runId`, User names/emails | Generated before item 01 |
| `futureStartTime` | Generated seven days ahead before item 01 |
| `userAToken`, `userBToken` | Extracted from User login responses |
| `organizerToken` | Extracted from Organizer login response |
| `eventId` | Extracted after event creation |
| `bookingId` | Extracted from User A's first booking |
| `userBBookingId` | Extracted after User B takes the released place |
| `otherOrganizerEmail`, `otherOrganizerPassword`, `otherOrganizerToken`, `otherEventId` | Empty placeholders for manual object-level authorization cases |

## Assertion policy

Each prepared request checks its expected HTTP status. Key requests also check role, state, error code, record identity, data isolation, or dependency reuse. If an assertion later reports an unexpected result, first save the real request/response, verify prerequisites, and reproduce it before creating a defect report.

Do not publish environment exports containing current passwords or JWTs. Do not treat Postman's green or red UI alone as a final report; link assertions to case IDs and supporting evidence.
