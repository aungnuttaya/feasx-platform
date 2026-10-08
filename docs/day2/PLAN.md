# FeasX V2 Day 2 — development scope

Branch: `audit/feasx-v2-day2`, based on `2e3c6c882f53f68a14280976d18bb265a4234dd4`.
No main update, deployment, production access, secret changes or payment API changes.

## Run locally

Use the existing isolated checkout; do not create a worktree unless requested.
Node is pinned to 24.19.0 in `.nvmrc`. Run `npm ci`, `npm test`, then
`NEXT_TELEMETRY_DISABLED=1 npm run build`. Stop a dev server before building
because both write `.next`. Start with `npm run start -- --hostname 127.0.0.1`.
Do not configure real credentials during this task. No `.env` file is needed.

Guest mode has no hardcoded Supabase binding. Client config names are
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; these are only
future sandbox integration interfaces. No values or bindings were saved.

## Implemented

- Pure land-unit parser with validity flag and anchored unit matching;
  standalone rai/ngan and compound units are supported, negative/junk input rejected.
- ROI validation and explicit metric definitions: A project margin, B/C annual
  gross yield before operating costs. Zoning assumptions remain unverified.
- Synthetic parcel fixtures replace owner/deed and scraped listing arrays.
- `/api/ai` scaffold fails closed with HTTP 401. It has no auth adapter,
  provider binding or credential access. Tests inject mock identity, authorization,
  rate limiter and provider functions in process, never through request/environment flags.
- Three UI AI flows use the same local client contract. HTTP errors or invalid
  results cannot become empty successful reports. There are payload/result checks,
  trace IDs, sanitized errors, timeouts and an abort signal to the mock provider.
- Report generation no longer calls `use_report` before the disabled gateway.
  It grants no real report/credit operation. Existing credit RPC and payment flows
  were not modified. Quota lifecycle remains a design task.
- Entitlement read errors deny report access instead of granting fallback credits.
- Small JPEG/PNG-only sandbox intake; PDF and files over 30 KB rejected.
- Regression tests use only injected fakes and invented identities/data.

## Dependency upgrade plan

The lockfile freezes the current installed dependency resolution; it does not fix
the Next 13.5.6/PostCSS advisories. No `audit fix --force` or runtime upgrade was run.
Before Day 3 upgrade, select a currently maintained patched Next release from
official advisories, check its React/Node peer requirements, and upgrade React/DOM
together if necessary. Run routing, dynamic loading, API-handler and domain tests,
build, and a browser smoke test. Do not assume npm's 13.5.11 suggestion clears all
advisories. npm audit must be rerun against the resulting lockfile.

## Supabase local/sandbox verification plan

Need credential-free schema/RLS/RPC exports or a new isolated test schema, including
subscriptions, usage_cycles, credit_transactions, stripe_events, use_credit and
use_report. No production export command was run and no RLS policy was changed.

Acceptance cases for Day 3, if approved:
1. Anonymous cannot read/update another user's subscription/usage.
2. Synthetic user A cannot read/write user B rows or choose a target identity in RPC.
3. Credit/report consumption is atomic, cannot become negative, and replay is idempotent.
4. Unauthorized client cannot mint credits or change plan/status.
5. Concurrent debit and RPC failure preserve invariants.
6. Server identity adapter verifies issuer/audience/expiry and cannot trust body userId.

Current tests prove mock filters/identity propagation only, **not real RLS**.

## AI quota/job design — not connected to billing

Future isolated flow: authorize → create idempotent job → reserve sandbox quota →
run provider → validate output → commit success or release reservation on failure.
Persist request ID, user ID, input fingerprint, state and provenance; minimize PII.
Never label model confidence as verified zoning/legal facts. Human review is required.
Day 2 returns only a mock provenance flag, not a durable job/audit record.

## Billing backlog — design only

Payment API files must remain byte-for-byte unchanged during Day 2.
Proposed future acceptance tests: verified server identity, strict plan enum,
checked Supabase errors, retryable failures return non-success, atomic event dedupe,
upgrade/downgrade/out-of-order event handling, and quota consistency.
The Day 1 mocked findings remain unresolved. Fixing payment files or running a
payment sandbox requires a separate explicit authorization.

## Day 3 approval boundary

Pending: real auth adapter, actual local RLS/RPC verification, dependency upgrade,
browser E2E, durable jobs/quota lifecycle, validated zoning provenance and
consistent ROI labels throughout the legacy UI. Dormant launch-offer local
subscription behavior is unchanged and must not be treated as payment proof.
No provider key or production data is needed for current regression tests.
