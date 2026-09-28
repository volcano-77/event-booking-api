# Test Evidence

This directory is intentionally empty of execution evidence until formal testing begins.

Store only artifacts produced by a real, identified execution, for example:

```text
evidence/
  manual/<run-id>/<test-case-id>/
  newman/<run-id>/newman-results.json
  newman/<run-id>/newman-results.xml
  sql/<run-id>/<test-case-id>.txt
```

Recommended metadata for every artifact:

- Run ID and execution date/time.
- Test case ID.
- Environment name and API version or Git commit.
- Request method and URL without secrets.
- Relevant response and database observation.

Redact JWTs, passwords, database credentials, and unrelated personal data. Do not add fabricated screenshots, responses, SQL output, defects, or conclusions. Generated Newman evidence is ignored by Git by default; selectively add reviewed and redacted evidence only when it is appropriate to preserve it.
