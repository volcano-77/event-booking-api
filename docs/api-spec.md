# API notes

The machine-readable specification is [openapi.yaml](openapi.yaml). Run the service and open `http://localhost:3000/api/docs` for Swagger UI or `/api/openapi.yaml` for the source.

There are 11 business endpoints: two auth, five event, three user booking, and one organizer booking endpoint. All authenticated endpoints use `Authorization: Bearer <JWT>`. IDs are returned as strings because MySQL `BIGINT` may exceed JavaScript's safe integer range. Request IDs must still fit the safe integer range accepted by this implementation.

Example event input:

```json
{
  "title": "API Testing Workshop",
  "description": "A practice event",
  "capacity": 20,
  "start_time": "2030-01-15T10:00:00Z"
}
```

`PUT /api/events/:id` replaces these editable fields. `description` is optional and becomes empty when omitted. `POST /api/events/:id/book` returns `201` for a new booking and `200` for a reactivated cancelled booking. Both booking POST and close PATCH accept an empty object or no body.
