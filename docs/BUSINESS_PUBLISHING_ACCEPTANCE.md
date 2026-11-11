# Business website publishing acceptance checklist

The opt-in `POST /api/business/publish` route now exists, but **publishing is disabled by default** unless `ENABLE_BUSINESS_PUBLISHING=true` is explicitly configured. It has not been validated against a live production database.

## Implementation status
- [x] Require a valid authenticated session and same-origin request.
- [x] Require explicit owner approval and strict bounded request validation.
- [x] Reject structurally invalid pages, duplicate slugs, and broken local links.
- [x] Use one atomic SQL INSERT for all pages of a publication.
- [x] Register `forge_business_publications` migration.
- [x] Serve stored pages from `/business-sites/{id}/{slug}` with restrictive CSP.
- [x] Add owner-scoped unpublish endpoint: `DELETE /api/business/publish/{id}` (same-origin, authenticated, feature-gated).
- [x] Add initial versioned snapshot storage, owner-only version metadata, and compatible-page-set rollback endpoint.
- [x] Remove snapshot history on unpublish.
- [x] Add owner-only publication management UI and a revision API for unchanged page sets.
- [x] Wire revision saving and version lookup into the builder UI; live concurrency acceptance remains pending.
- [ ] Support full versioned rollback across changed page sets.
- [x] Connect publishing to the builder's owner-approval UI with matching static eligibility checks.
- [ ] Verify the production database migration and authentication flow.
- [ ] Test published navigation, assets, accessibility, forms, mobile layout, and reduced-motion behavior.
- [ ] Verify public pages and health endpoints from outside the deployment.
- [ ] Confirm deployment rollback and removal procedures.

## Activation
Run `npm run db:migrate` against the intended database before enabling the feature flag. Do not enable publication until the remaining production checks pass. A successful CI run is not evidence of successful live deployment.

The HTML route disables JavaScript and form submissions via Content Security Policy. Generated pages requiring client-side behavior or forms will need separate approved, tested functionality.

## Request parsing budgets

Publication and revision requests are capped at 8 MiB of raw UTF-8 JSON; rollback requests are capped at 4096 bytes. Streamed requests without Content-Length are bounded before JSON parsing. Oversized requests return 413 and malformed JSON/UTF-8 returns 400 after the existing origin, feature-flag and session checks. Per-page content validation and explicit owner approval remain mandatory. This does not establish live publishing acceptance.

## Standard-page metadata and runtime boundaries

Standard generated pages retain their inert JSON-LD metadata during validation and storage. Only exact type-only application/ld+json elements with bounded object/array JSON are exempt from the executable-script check. External/executable scripts, event handlers, forms and embedded content remain blocked, and the response CSP still disables script execution. The builder checks the same publication policy before enabling submission, explains unsupported interactive drafts, and keeps reviewed ZIP export available. This does not make immersive hosting production-accepted.
