# Business publishing acceptance — 2026-11-12

The production build of source commit cf4b0a4513ce3e51e7534bada938847ecd79368c passed the existing publishing acceptance script against the explicitly isolated Neon branch `br-nameless-lake-bb8rrmnk`. No production publications were created or changed.

- 52 HTTP checks passed: authenticated owner login, same-origin enforcement, explicit review approval, rejection of executable markup, four-page publication, internal navigation, tenant isolation, revision history, stale-write conflicts, rollback, concurrent revision isolation, unpublishing and logout.
- The SQL concurrency check produced exactly one winner and one unique-constraint conflict, with consistent live pages and snapshots.
- HTTP concurrent saves produced exactly one 200 and one 409, without mixed page content or extra snapshots.
- Cleanup verified zero synthetic users, publications, snapshots and rate-limit records remaining.
- Read-only inspection confirmed that the existing main Neon branch has the publication/snapshot columns and required unique indexes. The deployed app reported its database reachable.

This evidence supports enabling the existing authenticated, owner-approved **static HTML** publication feature on the existing Cloudflare deployment. Anonymous access and scripts/forms/embedded content remain blocked. Roll back the feature by setting `ENABLE_BUSINESS_PUBLISHING=false` and deploying the verified configuration.

Scope limits: this was isolated database acceptance with a local production HTTP server, not a real customer's live publishing session. Scripted immersive websites remain export-only under the current static publication policy. It does not establish live optional-model, image-generation or external-workflow acceptance.
