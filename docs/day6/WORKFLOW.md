# Day 6 sandbox recovery hardening

Base: 8fcabd2d1ce30206d477aaddb07f2ccd3371cf3e (verified GitHub Day 5).
Branch: audit/feasx-v2-day6. Reuses Day 4/5 job service, SQLite adapter,
identity verifier and loopback mock runtime. No production binding.

An expired worker claim cannot finalize even when the recovery loop has not run
yet. The job remains processing with no committed result until recovery requeues
it or records terminal failure. Existing atomic claim-token checks still fence
stale workers after recovery; completed jobs are never scheduled again.

New tests cover exact lease expiry before recovery, interruption between provider
return and durable commit, completed replay after reopen, persisted retry deadline,
authorization revocation at worker execution and ownership after recovery/restart.
The commit-interruption test injects a transaction failure and verifies rollback;
the existing real SIGKILL runtime test separately proves process-crash recovery.
These tests do not claim power-loss or filesystem-corruption recovery.

Provider execution remains at-least-once: the interrupted-completion test proves
two executions may occur while only one authoritative completion is stored.
Results remain synthetic and the only provider is mock. Lease timing remains
wall-clock based; there is no heartbeat or production operational health channel.

Run npm test, npm run test:rls, npm run build, npm run test:browser (local compiled
Next at 127.0.0.1:3103), and npm audit. Use a clean environment with no app secrets.
Backup/retention is a proposal only in BACKUP_RETENTION_PLAN.md.
No merge/deploy/push or Day 7 work is implied by Day 6 authorization.
