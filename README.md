# AI Productivity Hub

AI Productivity Hub is a React and Express application for user-owned tasks, goals, habits, focus sessions, notifications, and audited provider integrations.

## Local setup

1. Copy `.env.example` to `.env` and replace every required placeholder.
2. Run `scripts/bootstrap.sh` to install locked backend and frontend dependencies.
3. Run `scripts/database-setup.sh` to apply the base schema and ordered additive migrations.
4. Run `./start.sh`. The launcher never installs packages, creates or seeds databases, or terminates unrelated processes.

Demo data is destructive and isolated behind an explicit command:

```sh
CONFIRM_DEMO_SEED=yes scripts/seed-demo.sh
```

The command requires strong `DEMO_ADMIN_PASSWORD` and `DEMO_USER_PASSWORD` values and must never target a shared or production database.

## Security and tenancy

- `JWT_SECRET` is required and must be at least 32 characters. During signing-key rotation, move the previous value to `JWT_PREVIOUS_SECRET`; new tokens use the current key while unexpired old tokens remain verifiable.
- Access tokens are short lived. Refresh tokens rotate in database-backed sessions; logout and password changes revoke sessions.
- Personal Google Calendar, Outlook, and Google Fit environment credentials are deliberately single-owner. Set `INTEGRATION_OWNER_USER_ID` to the local user allowed to use them. A multi-tenant deployment must replace environment credentials with encrypted per-tenant credential storage before onboarding more users.
- Production startup fails closed without database credentials and SMTP account-recovery configuration.
- Never enable `EXPOSE_DEMO_TOKENS` in production.

## Integrations

Calendar reads and writes use provider OAuth refresh credentials. Event writes require an `idempotency_key`; updates may include the provider `version`/ETag to detect conflicts. Slack and SMTP operations are outbound, Google Fit is read-only, and Apple Health accepts only authenticated, consented daily summaries with a source record identifier. Every attempted operation writes a per-user audit record when the database is available.

Provider credentials, hardware/device consent, and production delivery cannot be validated from source alone. Exercise revocation, rate limits, duplicate webhooks/requests, conflict responses, and reconciliation in provider sandboxes before launch.

## Verification

CI applies the schema and migrations, runs backend tests (including task workflow, token rotation, migration safety, and provider adapters), then runs frontend tests and a production build. The repository should not be declared deployment-ready until the same checks and representative browser/provider workflows pass in staging.
