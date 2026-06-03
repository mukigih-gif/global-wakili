# Integration Tests

These tests run against a real Neon DB (or local Postgres).
They are automatically skipped when DATABASE_URL is not set.

Run: DATABASE_URL=<url> npm run test:integration

They verify:
- Cross-tenant data isolation on real DB
- Trust account overdraw prevention on real DB
- Journal double-entry enforcement on real DB
- AI prompt injection detection
- HR/Payroll PAYE calculation compliance
