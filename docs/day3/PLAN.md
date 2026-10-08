# FeasX V2 Day 3 — isolated validation

Day 2 is preserved as local commit `2f46fcd` on `audit/feasx-v2-day2`.
Day 3 runs on `audit/feasx-v2-day3`; no main changes, push, deployment,
production connection or credential configuration. Payment API files remain unchanged.

## Repeatable checks

Use Node 24.19.0 and the existing isolated checkout. Run `npm ci`, `npm test`,
`npm run test:rls`, then `npm run build`. Stop any dev server before build.
The RLS runner requires Docker, refuses a pre-existing container with its name,
and creates/removes only its own network-disabled tmpfs PostgreSQL container.
Its image is digest-pinned. No database ports, external URLs or secret values are used.

Start `npm run start -- --hostname 127.0.0.1 --port 3103` then run
`npm run test:browser`. Chromium must be installed; this machine uses
`/usr/bin/chromium`. Local headless execution uses `--no-sandbox` within the
isolated task machine, so do not use this configuration for browsing untrusted sites.
Browser tests abort all external page requests. They do not login, purchase,
send OTP, call providers or upload real deeds. Stop the server after checks.

## Dependency changes

Next 16.4.0 uses Node >=20.9; Node 24 is compatible. React/DOM are upgraded
together to 19.3.0. `swcMinify` is removed because the option is obsolete.
Build explicitly retains webpack, avoiding an unrelated Turbopack migration.
Stripe and Supabase dependency declarations are unchanged; no payment code edits.
The dependency audit describes the installed lockfile, not a production penetration test.

## Identity adapter

`createIdentityVerifier` verifies signed JWTs against explicitly supplied public
JWKS using jose. It checks algorithm, issuer, audience, expiry, not-before,
issued-at/max age, UUID subject and authenticated role. It does not fetch remote
keys, trust request body identities, use environment secrets or accept unsigned tokens.
Tests generate ephemeral synthetic signing keys in memory; values are not saved/logged.

The public `/api/ai` route remains unbound/fail closed. Successful verifier tests
do not imply a production or Supabase project binding exists. Real key rotation,
revocation/session semantics and adapter wiring require a separately approved sandbox.

## Actual local PostgreSQL tests

These use real PostgreSQL RLS and transaction/concurrency behavior on a new
synthetic schema. There is no Supabase stack/PostgREST integration and no copy
of existing project schema. `auth.uid()` emulates the trusted JWT subject GUC;
test clients use NOLOGIN roles through container-local admin psql.

Verified cases: anonymous row denial, two-user isolation, direct mutation denial,
RPC permissions, actor binding, idempotent replay, concurrent distinct/replayed
debits, nonnegative balance and transaction rollback. The test-only credit RPC
is not deployed, not integrated with billing, and not a migration for the real schema.

## Remaining boundaries

Payment findings from Day 1 remain unresolved by instruction. Real project
RLS/RPC/schema and auth configuration remain unaudited. AI provider/job/quota
integration remains mocked/unbound. Zoning provenance, consistent ROI presentation,
PDF handling and comprehensive product E2E remain future work.

No cloud setup draft, secrets or deployment settings were changed.
