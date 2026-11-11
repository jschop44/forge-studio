# Publishing SQL acceptance — November 11, 2026

Source revision: `1d154f824381cf99658e5d191093a4a48ea9b9c0`.

The actual SQL templates from the publication, revision, versions, rollback and deletion routes passed **24/24 state assertions** on local PGlite and the existing isolated Neon branch:

- Project `forge-studio-free` / `young-night-65648740`.
- Test branch `forge-memory-schema-check` / `br-nameless-lake-bb8rrmnk`, confirmed non-primary and non-default before execution.
- The production/default database branch was not mutated.

## Evidence

The exact executed SQL is [retained here](acceptance/2026-11-11-publishing-sql.sql). Its SHA-256 is `0aa01b077cd9d2bee346a0269597291687c6c379ad973bca5d852a18c86d8b52`.

It creates only synthetic UUID/email fixture owners. Every mutation is inside an exception subtransaction that intentionally rolls back after all checks. Unexpected custom triggers block execution. After rollback, the SQL independently checks fixture absence. A separate Neon query also returned:

```json
{"fixture_users":0,"fixture_publications":0,"fixture_snapshots":0}
```

No credentials or customer payloads were retrieved or stored in this evidence. Customer publishing remains disabled.

| Case | Result |
| --- | --- |
| Initial complete page set and version-1 snapshots | Passed |
| Revision advances version and live content together | Passed |
| Earlier snapshots stay immutable | Passed |
| Stale revision creates no pages or snapshots | Passed |
| Other owner cannot revise, list versions or unpublish | Passed |
| Changed page-set revision stays blocked | Passed; support remains unimplemented |
| Rollback restores content as a new retained version | Passed |
| Stale rollback and missing snapshot are rejected | Passed |
| Unpublish removes all pages and retained history | Passed |
| Snapshot conflict rolls back every attempted live page | Passed |
| All synthetic fixtures disappear after rollback | Passed |

## Reproduction and limits

`node scripts/business-publishing-sql-acceptance.mjs` runs a fresh local PGlite fixture using SQL extracted directly from the current route source and the actual publication table initializer. The worker/script test suite runs this automatically. `--sql` emits a new rollback-only SQL fixture for reviewed execution on an explicitly selected isolated branch; it never connects to a database itself.

Extraction fails if the expected SQL-template shape or interpolation names change, requiring fixture review. It does not silently switch to a copied query.

This is **SQL-state acceptance**, not authenticated deployed HTTP acceptance. Concurrent SQL and isolated production-build HTTP checks subsequently passed as documented below. Cloudflare-hosted browser sessions, visual/asset acceptance and custom-domain behavior still require verification. No production flags were enabled, and no customer publication was created.

## Genuine concurrent SQL acceptance

The connector serialized the first parallel-request probe, so that attempt was not counted as SQL-contention acceptance. The same existing test branch was then reached through the installed official Neon client using credentials in memory through non-echoing stdin. No provider accounts or compute resources were created.

The [exact concurrent fixture](acceptance/2026-11-11-publishing-concurrency-fixture.json) adds a bounded two-second latency probe to the route's next-version query to force overlapping version reads. Business predicates and mutations remain the route SQL. [Observed result](acceptance/2026-11-11-publishing-concurrency.json): one committed revision, one database error 23505, one complete version-2 snapshot, and no mixed page content. Cleanup returned zero fixture accounts, publications and snapshots. The artificial latency is not a production performance benchmark.

## Authenticated production-build HTTP acceptance

A private local production server compiled from the same source revision connected to the isolated live Neon branch. It used synthetic test owners and a temporary signing key in memory, with agent autopilot/queue execution and ecosystem forwarding disabled. The customer Cloudflare Worker was never reconfigured.

[All 52 API/database assertions passed](acceptance/2026-11-11-publishing-http.json), including real test-owner login, secure session-cookie attributes, invalid-session/password rejection, origin/approval protection, approved four-page publication, tenant isolation, stored relative navigation, immutable snapshots, revisions, stale conflicts, rollback, two concurrent HTTP revisions yielding 200/409, complete history, unpublish and logout. The response CSP and no-store headers were verified on actual stored published HTML. Fixtures used deterministic test-site content; this is not an AI generation test.

Cleanup stopped the private test server and removed only fixture-owned rows and synthetic rate-limit keys. A separate read-only query through the Neon connector confirmed all four fixture counts were zero. No passwords, cookies, connection credentials or customer payloads are in the evidence artifacts.

The optional live runner is scripts/live-business-publishing-acceptance.mjs, invoked with node --import tsx. It refuses missing stdin input, non-approved branch IDs and credentials whose endpoint fingerprint does not match the isolated branch. It does not run live from ordinary CI. Ordinary CI runs the rollback-only PGlite acceptance and negative scope guards without database credentials.

These results accept the backend SQL and isolated API journey. They do not enable customer publishing or establish Cloudflare-hosted browser, image availability, forms, arbitrary immersive runtimes, changed page-set support, custom domains, backups or restore-drill acceptance.
