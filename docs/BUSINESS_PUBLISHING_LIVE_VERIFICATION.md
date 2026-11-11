# Business publishing: live verification and rollback gate

**Status:** Rollback-only SQL, true concurrent SQL, and authenticated production-build HTTP acceptance passed against the isolated live Neon branch. Cloudflare-hosted browser/publication acceptance remains unverified. Keep `ENABLE_BUSINESS_PUBLISHING` unset/false until all checks pass. GitHub Actions success alone does not satisfy this gate.

## Preflight
1. Select an isolated test environment and Neon branch explicitly; use only existing free resources. The live Worker remains forge-studio-preview and customer publishing must stay disabled. Do not create a duplicate Worker for testing.
2. Back up the database and verify a restore procedure before applying migrations.
3. Confirm migrations create `forge_business_publications` and `forge_business_publication_snapshots`, including owner-scoped indexes.
4. Verify authentication, same-origin checks, and that publishing is disabled by default.
5. Ensure published HTML is reviewed and safe: static HTML validation is not a full sanitizer. Reject executable content, external scripts and forms. The sole script exception is a type-only application/ld+json element containing bounded object/array JSON. All other protections inspect the original HTML; data metadata cannot hide unsafe attributes or markup.

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
- Isolated Neon SQL passed 24 assertions, independent connections proved a 23505 revision conflict, and the production-build API passed 52 assertions. Cloudflare-hosted browser, visual/asset and custom-domain acceptance remain required. See PUBLISHING_SQL_ACCEPTANCE_20261111.md.
- Changed page-set revision/rollback is not implemented.
- Uniqueness races return 409 in source; real concurrent Neon verification remains required.
- HTML validation is a conservative regex-based filter, **not** a full HTML sanitizer.
- Live Cloudflare application deployment is verified separately; this does not establish live publishing or custom-domain acceptance.

Do not claim production readiness until these blockers are resolved and the checks above have recorded results.

## Non-writing production route acceptance

After npm run build, run node scripts/verify-publishing-gates.mjs. CI executes this in the production-build job. It starts isolated local production servers with publishing off/on and exercises 16 HTTP authorization, origin and opt-in checks. No authenticated sessions or database writes are used. These checks do not replace the live test-owner publication, revision and rollback matrix above. All publication routes now resolve the feature switch from request-time Worker bindings via runtimeValue, falling back to Node environment values for local tests.

Approved stored pages and revisions normalize known root-relative/extensionless page destinations to sibling HTML filenames so navigation stays within /business-sites/{id}/. Query strings and fragments are preserved; external, contact, unknown-file and backend destinations are not rewritten. Source drafts in memory are not mutated. Actual hosted navigation must still pass the live test-owner acceptance matrix.

The canonical Worker configuration explicitly pins ENABLE_BUSINESS_PUBLISHING=false for this release. Local enabled-gate tests do not activate live customer publishing. Change the deployed switch only after isolated live acceptance and an explicit activation review.
