# Business publishing: live verification and rollback gate

**Status:** Not yet verified against a live Neon database or deployed Render service. Keep `ENABLE_BUSINESS_PUBLISHING` unset/false until all checks pass. GitHub Actions success alone does not satisfy this gate.

## Preflight
1. Select the intended Render workspace and Neon project explicitly; confirm the deployment is a private test environment and uses free-tier resources.
2. Back up the database and verify a restore procedure before applying migrations.
3. Confirm migrations create `forge_business_publications` and `forge_business_publication_snapshots`, including owner-scoped indexes.
4. Verify authentication, same-origin checks, and that publishing is disabled by default.
5. Ensure published HTML is reviewed and safe: static HTML validation is not a full sanitizer. Reject active content, external scripts and forms.

## Acceptance tests (test owner accounts only)
1. With the flag **off**, GET `/business-sites/{uuid}/index` must return 503 and `Cache-Control: no-store`; POST `/api/business/publish` must return 503.
2. With the flag **on**, unauthenticated publish, revision, rollback, listing, and deletion requests must be denied.
3. Publish an approved multi-page test draft. Verify all pages, links, and exactly one snapshot version 1.
4. Attempt invalid HTML, missing approval, malformed IDs, and broken internal links; verify no rows are created.
5. Save an approved revision with `expectedVersion: 1`. Verify the published pages and snapshot version 2.
6. Retry the stale revision with `expectedVersion: 1`; expect a conflict, no extra snapshot, and no changed HTML.
7. Submit two concurrent revisions with the same expected version. Exactly one may win; the loser must not overwrite content or leave partial rows. Check actual database rows, not just HTTP responses.
8. Roll back to version 1. Verify page contents match that snapshot; note rollback currently requires identical slug sets.
9. Verify a second test account cannot read owner-only versions or change/delete another account's publication.
10. Unpublish; verify published URLs are inaccessible, snapshots are gone, and no cached HTML is served.
11. Disable the flag again and confirm public pages return 503.

## Release blockers
- No real Neon transaction/concurrency test has been run.
- Changed page-set revision/rollback is not implemented.
- Revision conflict errors need explicit handling for database uniqueness races.
- HTML validation is a conservative regex-based filter, **not** a full HTML sanitizer.
- No verified live Render deployment or end-to-end custom-domain verification.

Do not claim production readiness until these blockers are resolved and the checks above have recorded results.
