# Planned testing scope

This is a scope draft. It contains no execution results.

## Auth

- Register: required fields, email format, username and password boundaries, duplicate identity, supplied role rejection.
- Login: correct and incorrect credentials, missing fields, wrong types.
- Token: missing, malformed, modified, and expired JWT; role-specific authorization.

## Event

- Query: public list and detail, malformed and nonexistent IDs.
- Create: organizer role, required fields, value boundaries, future timestamp.
- Modify: owning organizer, other organizer, user; capacity below active count.
- Close: owner, other organizer, repeated close, booking after close.

## Booking

- Normal booking, last place and full event, duplicate active booking, started or CLOSED event.
- Cancel, repeated cancel, release of capacity, rebooking after cancellation.
- Personal list and organizer event list; isolation of another user's or organizer's data.

## Data consistency

- Compare event capacity with active booking rows after booking, cancellation, and rebooking.
- Check unique user/event row, statuses, timestamps, and transaction behavior after rejected requests.

## Prepared tools and future execution

- Postman environment variables, dynamic IDs and tokens, assertion scaffolding, and a dependency-aware business chain are prepared under `postman/`; execution status is `Not Run`.
- A local Newman runner is prepared under `scripts/newman/`; execution and evidence review remain `Pending`.
- JMeter or another concurrent client may later probe last-place booking behavior. No concurrency result is claimed.
