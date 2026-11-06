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
- [ ] Wire revision saving into the UI and verify concurrent revision handling.
- [ ] Support full versioned rollback across changed page sets.
- [ ] Connect publishing to the builder's owner-approval UI.
- [ ] Verify the production database migration and authentication flow.
- [ ] Test published navigation, assets, accessibility, forms, mobile layout, and reduced-motion behavior.
- [ ] Verify public pages and health endpoints from outside the deployment.
- [ ] Confirm deployment rollback and removal procedures.

## Activation
Run `npm run db:migrate` against the intended database before enabling the feature flag. Do not enable publication until the remaining production checks pass. A successful CI run is not evidence of successful live deployment.

The HTML route disables JavaScript and form submissions via Content Security Policy. Generated pages requiring client-side behavior or forms will need separate approved, tested functionality.
