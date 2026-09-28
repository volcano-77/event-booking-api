# Newman Runner

Execution status: `Not Run`.

The PowerShell runner executes the prepared Postman collection and writes machine-generated JSON and JUnit XML under `evidence/newman/<run-id>/`. It does not create a test summary or defect conclusion.

## Prerequisites

- MySQL and the API are running against a dedicated test database.
- `npm install` has installed the local Newman development dependency.
- Organizer A has been created locally.
- You understand and have manually tried the main Postman chain first.

## Run from PowerShell

```powershell
$env:EVENT_BOOKING_ORGANIZER_EMAIL = 'organizer@example.test'
$env:EVENT_BOOKING_ORGANIZER_PASSWORD = 'your-local-test-password'
npm run test:api
Remove-Item Env:EVENT_BOOKING_ORGANIZER_EMAIL
Remove-Item Env:EVENT_BOOKING_ORGANIZER_PASSWORD
```

Optional explicit run ID:

```powershell
./scripts/newman/run.ps1 -RunId 'course-run-001'
```

The secrets are passed to Newman at runtime and are not saved in the committed environment template. They may still be visible to the local process environment while the command runs, so use only dedicated local test credentials.

After execution, inspect the real output, link it to selected test-case IDs, redact sensitive values if needed, and then update a copy of `reports/test-summary-template.md`. Do not infer a defect from a failed assertion until prerequisites and repeatability are checked.
