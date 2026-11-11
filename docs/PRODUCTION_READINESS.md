# Production acceptance ledger

Updated November 10, 2026 (America/New_York). Source baseline: `7dbf0e83911aa1de3f5fed78ed090a7d4a471d39`.

## Verified evidence

- PR #38 merged with all six PR checks passing. Main verification: https://github.com/jschop44/forge-studio/actions/runs/42956973715 (pending at this checkpoint).
- Successful deployment of `494c83dccf71713c046c0e88964970afd9a95870`: https://github.com/jschop44/forge-studio/actions/runs/42956386448 . Inspected actual deployment logs.
- Live `/api/health` returned healthy; `/api/health/ready` returned database reachable in this session.
- Deployment AI diagnostic verified all six stages, real Cloudflare inference, four generated pages and quality review. It explicitly reported `persisted:false`, `published:false`, publication `needs-approval`.
- Authenticated deployed worker returned zero processed jobs. This proves authentication and endpoint execution, **not** durable end-to-end queue progression.
- Local baseline plus deployment-attestation changes: 529/529 TypeScript tests and 117/117 worker/script tests passed. Type validation passed. The `tsx` executable's IPC socket is unavailable in this environment; equivalent `node --import tsx --test` invocation passed the complete suite without exclusions.

## Deployment identity correction

The health endpoint previously returned only a fixed version. The proposed release embeds the explicitly supplied verified SHA during Next compilation and returns it with `Cache-Control: no-store`. The existing deployment authority must match this value to its verified source before reporting success. Missing, old and malformed revisions fail closed. No new Worker, runtime secrets or infrastructure are introduced.

## Remaining acceptance by area

Percentages remain unassigned until each area's full acceptance inventory is measured. Test pass rates below describe only executed tests, never product completeness. No production-acceptance percentage is inferred from code or endpoint existence.

| Area | Evidence | Outstanding production acceptance |
| --- | --- | --- |
| Extraction | Existing extraction/source design tests pass locally | Computed styles, custom fonts, source screenshot fidelity, permitted multi-page completeness |
| Generation | Four-page real inference diagnostic and structural quality pass | Broad live business/asset accuracy, full visual acceptance, externally verified links |
| Editor | Existing unit and browser suites in repository | Complex imported-site acceptance, reviewed publishing, live revision rollback |
| Immersive 3D | Existing keyboard/mobile/WebGL test implementations | Arbitrary models, authored hotspots, real mobile GPU and cross-page continuity |
| Engine 1: lead-enrichment | Isolated live diagnostic passes | Durable tenant-scoped live progression and source-app delivery |
| Engine 2: website-audit | Isolated live diagnostic passes | Durable live progression and real source completeness |
| Engine 3: site-plan | Isolated live diagnostic passes | Durable approved handoff and universal application of findings |
| Engine 4: site-generation | Real Cloudflare inference diagnostic passes | Durable approved execution, retries and recovery under actual failures |
| Engine 5: quality-review | Isolated four-page diagnostic passes | Durable progression and live visual/interaction evidence |
| Engine 6: publish-review | Diagnostic stops for approval | Live reviewed publication, rollback and authorization acceptance |
| Database | Live readiness query succeeds | Test-account auth, projects/assets, forms/leads, concurrency and rollback round trips |
| Ecosystem | Signed ingestion contracts and tests exist | Actual signed tenant-isolated, idempotent GrowthLens/LeadFlow deliveries |
| Deployment | Earlier source deployed with successful diagnostics | Current main and proposed release must finish CI and deployment; exact live SHA attestation |
| Security/recovery | Local security and persistence regressions pass | Independent acceptance, restore drill, live tenant boundaries and retained evidence |

## Next sequence

1. Finish current-main CI/deployment and verify actual live source.
2. Review PR #39 portable export navigation, reconcile with latest main, require complete checks before merge.
3. Release deployment identity correction only through verified-preview workflow.
4. Execute `BUSINESS_PUBLISHING_LIVE_VERIFICATION.md` in an isolated test environment with test owners and recoverability. Never enable customer publishing merely to satisfy tests.
5. Verify durable six-stage jobs and signed cross-app deliveries; retain independent plan/publication approvals.
6. Complete source-fidelity and real-device 3D visual/performance acceptance.

Historical documents describe earlier environments. The active deployment authority remains `.github/workflows/verified-preview.yml`, targeting only `forge-studio-preview`. Preserve `backup/forge-preview-pre-pr6-20261110`.
