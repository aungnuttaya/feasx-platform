# Day 4 — Sandbox authentication and AI jobs

Base: committed Day 3 `4e4d7c2`, branch `audit/feasx-v2-day4`.
No production changes, real credentials/data, payment edits, deployment or merge.

## Reuse and execution

Existing `lib/identity.cjs` verifies signed sandbox JWTs; there is no new auth
system. Existing `contract.cjs` validates requests/results for report/OCR/GPS.
`execution.cjs` extracts provider timeout/abort/result validation from the Day 3
synchronous gateway, so both the gateway and job worker use the same execution.

`createJobService` requires an explicit `{kind:'mock',execute}` provider supplied
by trusted local code/tests. No live adapter, request-controlled provider flag,
environment credential or token persistence was added.

Lifecycle:
`created → validated → queued → processing → completed`
Validation failure: `created → failed` with no provider execution.
Transient failure: `processing → failed → queued` after scheduled delay;
retry only timeout/provider failure, at most two attempts by default (config cap three).
Invalid results and authorization revocation fail without retry.

The bounded in-memory queue stores at most 100 jobs by default (cap 1000).
Each worker claims a queued job synchronously before awaiting, preventing
duplicate concurrent claims in this process. Completion snapshots are copies;
late timed-out results cannot mutate completed jobs. History tracks attempts and
transitions, and responses omit input payload/owner identifiers.

Ownership comes only from verified identity. Task authorization is checked on
create, read and before processing. Cross-owner reads return 404, matching
unknown IDs. The HTTP handler checks injected identity/rate limit and sanitizes
internal errors. No worker or retry HTTP endpoint is exposed.

## HTTP route boundary

`/api/ai/jobs` provides POST create and GET status handler contracts. The actual
Next route is deliberately unbound/fail closed, like `/api/ai`: all anonymous or
forged JWT requests return 401. Valid JWT + job create/read is tested using the
actual verifier/handler/service factories with ephemeral synthetic signing keys.
There is no credentials-dependent application mode or test-only web backdoor.

## Validation

Run `npm test`, `npm run build`, `npm audit`, and `npm run test:rls`.
For browser checks start the local compiled server on 127.0.0.1:3103 then run
`npm run test:browser`. Use clean environment commands documented in Day 3;
do not call Payment APIs or any live provider/project. Stop only owned processes.
SQL/RLS tests remain isolated test-schema checks, not real Supabase verification.

## Remaining limitations

- Queue/history are process-local and disappear on restart; no durable store,
  distributed locks, worker daemon, dead-letter queue or crash recovery.
- No create-request idempotency, retention/TTL or capacity eviction yet.
- No billing/quota reservation/commit/refund integration.
- No real auth/provider bindings; the public route does not process jobs.
- Timeout signals abort; a non-cooperative provider may keep working, though its
  late result is discarded. Mock providers must respect signal for resource cleanup.
- Provider kind is a trusted injection contract, not a network sandbox; tests
  have no network provider and use only invented data.
- Existing production billing findings, zoning provenance/ROI issues and actual
  Supabase policies remain outside Day 4 scope.

Day 5 scope requires approval before adding persistence or binding any sandbox
runtime. Do not modify setup draft, main, Production, Secrets or payment APIs.
