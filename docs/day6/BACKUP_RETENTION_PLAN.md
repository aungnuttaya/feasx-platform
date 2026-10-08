# Production backup and retention proposal — NOT ENABLED

Day 6 uses only local SQLite, synthetic identities and mock AI. This document
proposes future production controls; it installs no jobs, storage, credentials,
deletion policy or infrastructure. Activation requires separate approval.

## Decisions required before activation

Confirm database architecture (managed transactional database versus single-host
SQLite), data classification, legal retention/holds, hosting region, owners,
cost and approved recovery objectives. Proposed starting targets, not verified
guarantees: RPO <= 15 minutes, RTO <= 4 hours. Production secrets and customer
data must never enter development fixtures or this repository.

## Backup and recovery design

- Prefer managed encrypted backups and point-in-time recovery with separate,
  least-privilege backup/restore roles, audited access and isolated backup storage.
- If SQLite is approved, use SQLite's online backup API or a verified consistent
  snapshot while coordinating writers. Do not copy only jobs.sqlite while WAL
  writes continue. Include schema/version metadata and an integrity manifest.
- Proposed schedule: daily consistent snapshots plus approved incremental/PITR
  coverage to meet RPO, 7 daily and 4 weekly snapshots, subject to classification.
  Encryption/key ownership and deletion of expired backups require approval.
- Restore first into an isolated network with real-provider and payment execution
  disabled; validate integrity, schema compatibility, row counts, owner scope,
  idempotency constraints and job/result/history consistency before any cutover.
- Restored processing jobs must recover expired leases, fence obsolete claims and
  respect attempt caps. Backup restore can lose completions after the snapshot;
  reconcile provider request identifiers before enabling real workers. At-least-once
  execution remains possible; external effects require provider idempotency.
- Quarterly restore drills using synthetic data initially: record achieved RPO/RTO,
  compare completion counts and reject invalid/corrupt snapshots. Define rollback,
  incident owner and explicit approval before production restoration.

## Retention proposal

| Record | Proposed policy pending approval |
|---|---|
| queued/processing/retry jobs | Never remove as routine retention |
| completed/terminal failed payload/result | 30 days; minimum necessary data only |
| owner-scoped idempotency tombstone | 90 days or longer than contractual replay window |
| audit metadata | 90 days, subject to legal/security obligations |
| backup copies | Expire on approved snapshot schedule; holds override deletion |

Do not delete full jobs without preserving owner/key/fingerprint/terminal outcome
for the replay window: otherwise a replay could execute again. Define the response
for expired result data (for example, terminal tombstone with unavailable result).
No such tombstone or deletion implementation exists in Day 6.
Deletion should be paginated, transactional, observable and dry-run reviewed;
exclude active jobs and legal holds, account for replicas and backups, and prove
that deletion cannot break ownership or revive completed jobs.

## Gates and monitoring

Before activation: approved policy, migrations and restore tooling; synthetic
tests for WAL consistency, integrity failures, restore/replay and retention holds;
least-privilege review; staging drill and approval for any production change.
Monitor backup age/failures, restore verification, disk capacity, job age,
expired leases, retries and retention outcomes without logging tokens/payloads.
Single-host SQLite remains a sandbox limitation; HA is not delivered here.
