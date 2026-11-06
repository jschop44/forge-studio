# Business website publishing acceptance checklist

The current `/api/business/publish` endpoint deliberately returns HTTP 503. Exported HTML can be reviewed, but Forge Studio does **not** yet provide verified live business-site publishing.

## Required before enabling publication
- [ ] Authenticated owner confirms the exact business name, services, contact details, and page content.
- [ ] Run `preflightReviewedPublication(pages, true)` on the same draft that will be deployed.
- [ ] Run browser-based navigation and interaction checks, including mobile viewport and reduced-motion mode.
- [ ] Verify image assets and accessibility; test links and forms on the published origin.
- [ ] Ensure a protected publishing endpoint persists each page under the correct authenticated owner.
- [ ] Confirm that published pages are reachable through the configured production host.
- [ ] Test rollback, deletion, and unauthorized access.
- [ ] Verify the production deployment with `/api/health/ready` and an actual public-page fetch.

A passing static preflight is necessary but not sufficient for deployment. Do not turn on publishing based on code compilation alone.
