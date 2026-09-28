# Additional Automated Tests

Status: `Not Run`.

This directory is reserved for future code-level or additional automated test suites. Current API testing assets are organized as follows:

- Manual cases: `test-cases/api-test-cases.md`
- Postman collection and environment: `postman/`
- Newman runner: `scripts/newman/`
- SQL checks: `sql-validation/`
- Real execution artifacts, when they exist: `evidence/`

`npm run smoke` is a development availability check and must not be presented as the formal API test result.
