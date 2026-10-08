# Day 5 — Durable sandbox jobs

Base Day 4: `cdab61efc58a67b976a5bc57167eae24c6bccd76`.
Branch `audit/feasx-v2-day5`; no main/production/payment/secret/deploy changes.

## Reuse

Day 4 job service accepts a storage adapter instead of owning a Map. The memory
adapter preserves existing regression behavior. SQLite uses Node 24's built-in
`node:sqlite`, so no new dependency/package/lockfile change is necessary.
JWT verification, payload/result schemas, execution timeout/abort and HTTP job
handler are reused. Mock provider has fixed synthetic output and no network calls.

## Durable semantics

SQLite persists jobs/history/attempts/results with WAL + synchronous FULL.
Creation, claim, recovery and finalization use BEGIN IMMEDIATE transactions.
A UNIQUE(owner,idempotency-key) constraint backs owner-scoped idempotency.
Payload hashes use canonical key ordering; same input/key returns the existing
job even at capacity, different input/key reuse returns 409. Idempotency is
required by the sandbox runtime HTTP header; optional internal factory calls
remain compatible with Day 4 and generate a unique key when omitted.

Workers claim jobs atomically and store a random fencing token/lease deadline.
Restart recovery requeues expired processing leases up to the attempt limit;
otherwise it records terminal failure. Retry deadlines/counts survive restart.
Stale worker completion cannot overwrite a recovered/newly claimed job.
Completed replay never schedules another attempt.

Crash recovery is **at least once** for provider execution. A crash after a mock
provider has returned but before durable completion may repeat that attempt.
Exactly-once external side effects are not claimed; future real providers would
need their own idempotency/transaction support. No real provider is used here.

## Local sandbox runtime

`startSandboxRuntime` binds only 127.0.0.1 and a local SQLite path under /tmp or
/workspace. The two allowed subjects are fixed synthetic UUIDs. Public synthetic
JWKS is supplied by the trusted harness; private signing keys stay in parent
test memory. There is no token mint endpoint, real JWKS fetch, credentials file
or environment secret binding. /jobs uses existing JWT/authorization/ownership
checks plus bounded local rate limiting and mandatory Idempotency-Key.

`scripts/sandbox-runtime.cjs` starts only through harness IPC. Its inputs are
public synthetic JWKS/local options, not real credentials. It is not a production
daemon/CLI. The main Next /api/ai/jobs route remains unbound and fail closed.

## Checks

`npm test` includes durable reopen/atomic claims/rollback/fencing, actual local
HTTP signed-JWT checks and forced child process crash/restart recovery.
`npm run test:browser` adds real browser fetches against the separate local
runtime, including read after runtime restart and terminal timeout.
Run local compiled Next server on 127.0.0.1:3103 for existing browser cases.
Run `npm run build`, `npm run test:rls`, and `npm audit` as before.
No production API, Payment APIs, customer upload or credential is needed.
Only test-owned processes/directories are closed/removed after tests.

## Remaining risks

- SQLite is one-host storage; no HA/distributed filesystem guarantees or backups.
- Durability requires keeping the DB/WAL directory; tests cover process restart,
  not loss of disk, machine/snapshot restoration or filesystem corruption.
- No job retention/TTL/eviction; terminal jobs consume bounded capacity.
- No schema migration/versioning, admin recovery UI or operational monitoring.
- Rate counters and synthetic signing keys are not durable. Test parent supplies
  the same public JWKS to restarted children; no real rotation/revocation integration.
- Lease expiry is based on wall clock; no heartbeat/long-running worker extension.
- No quota/billing integration or real Supabase policies/provider binding.

Day 6 requires new approval. This task checks remote refs read-only and records
push status; it does not infer authorization to publish code from a status check.
