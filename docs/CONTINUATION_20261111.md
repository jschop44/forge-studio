# Forge Studio continuation checkpoint — November 11, 2026

## Verified live baseline
Main and last independently attested deployment: 1d154f824381cf99658e5d191093a4a48ea9b9c0.
Deployment: https://github.com/jschop44/forge-studio/actions/runs/43029191604
Live Worker: forge-studio-preview; never recreate forge-studio.
Existing verified-preview workflow remains deployment authority. Customer publishing remains disabled.

## Pending changes
- PR #47: https://github.com/jschop44/forge-studio/pull/47
  Head 376e29a503cf2c1019aa0b62c8f70f5362836596.
  Retains 24 SQL assertions, genuine concurrent SQL acceptance, 52 authenticated isolated production-build HTTP/database assertions and safe reproduction tooling.
  Local 552/552 application tests, 121/121 script tests and TypeScript validation passed.
  First CI attempt: application, validation, build and Worker packaging passed. Both browser jobs failed during apt dependency installation with Ubuntu mirror DNS failures before executing tests. Failed jobs retried; results must be retrieved.
- PR #48: https://github.com/jschop44/forge-studio/pull/48
  Head e4ab2ad6613f5a7943b56b6de4f8c87a2ed036b7.
  Preserves validated captured font fallback stacks instead of forcing sans-serif. Rejects malformed/empty/excessive stacks. Local 554/554 application tests and TypeScript validation passed.
  Required CI remains pending. Neither PR is merged at this checkpoint.

## Isolated backend acceptance and limits
The existing non-default Neon branch br-nameless-lake-bb8rrmnk in project young-night-65648740 was used. No provider resources or production schema changes were created. Synthetic test owners, publications, snapshots and rate-limit rows were cleaned; independent queries returned zero fixture rows.
The tests accept isolated SQL and authenticated API behavior, including tenant boundaries, version conflicts, immutable history, rollback and deletion. They do not accept customer Cloudflare hosted publishing, real browser publication journeys, asset availability, arbitrary immersive runtimes, custom domains or restore drills. Never enable publishing merely to satisfy acceptance.

## Remaining phases
No defensible overall completion percentage is assigned. Test pass rates are not whole-product completion.
- A/J: resolve browser environment failure, run complete required checks on exact heads, merge safely, verify main CI and actual deployment steps, independently match live health revision.
- B: source screenshot/layout fidelity, custom font availability, page-specific design and permitted multi-page source completeness.
- C/H: broader real-business imagery/content, full page navigation and desktop/mobile visual/accessibility acceptance.
- D: complex imported-site visual editor and reviewed publishing/browser acceptance.
- E: arbitrary models, authorable hotspots, mobile GPU/performance and cross-page continuity.
- F: durable live tenant-scoped progression across all six stages, real-model provenance, retries/recovery, separate plan/publication approvals.
- G: hosted publishing browser acceptance plus projects/assets/forms/leads and broader concurrency/recovery.
- I: wider security review, operational backups and restore drill.
- Ecosystem: diagnostics previously showed signingConfigured:false. Need configured shared integration signing and actual signed tenant-isolated/idempotent GrowthLens/LeadFlow deliveries. Endpoint existence is insufficient.
- K: free-only constraints remain satisfied. No paid OpenAI, no new paid infrastructure.

## Resume procedure
Retrieve fresh main, both PR heads, checks/reviews and deployment runs before modifying anything. Do not overwrite newer concurrent work. Inspect failed job logs; do not skip tests or merge failing branches. Keep existing rollback branches. After verified merges, use only the established deployment workflow and confirm the actual live revision and disabled publishing state.
Read docs/PUBLISHING_SQL_ACCEPTANCE_20261111.md on PR #47 and docs/BUSINESS_PUBLISHING_LIVE_VERIFICATION.md before further database acceptance.
Normal Chat may have fewer execution tools: state actual access limits and never claim changes or deployments without evidence.

## Work allowance
The assistant cannot read the ChatGPT Work usage meter or automatically detect 5% remaining. The user must report the warning. Upon that report, prepare a normal Chat handoff using fresh repository state and this checkpoint; do not promise automatic monitoring.
