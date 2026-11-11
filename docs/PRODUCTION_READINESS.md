# Production acceptance ledger

## Publishing follow-up — November 11, 2026

Baseline main/live source remains 9bd3171d2c72e804753357b3a331b51f48611228. Standard generated pages were reproduced as failing publication because their JSON-LD metadata was rejected. The follow-up validates a narrow inert metadata exception, keeps all other protections on the original HTML, aligns builder eligibility with the server, and resolves publication feature switches from Worker runtime bindings. Publishing remains opt-in and has not been enabled.

Local validation: 550/550 TypeScript tests, completed TypeScript validation and production build passed. The local production server passed 16/16 HTTP opt-in, authorization and origin checks without database writes. Browser, full CI and deployment of this follow-up are still required at this checkpoint. Live test-owner persistence, revision/concurrency/rollback, cross-app signing and full visual/3D acceptance remain open.


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

## Subsequent verification in this session

- PR #39 merged as `4a75e9e` after all required checks passed: portable exported routes. PR #40 merged as `3fd7440`: exact deployed source verification. PR #41 merged as `95a2c46`: single validated website ZIP. PR #42 merged as `d2bce69`: streamed publication/rollback request limits, after all application/build/packaging/browser checks passed.
- Live business recognition passed 4/4 cases with Cloudflare inference. Live browser interaction generated a four-page synthetic coffee website, followed the Home-to-Menu link, and switched to the 390px preview. This is a limited acceptance observation, not comprehensive mobile visual acceptance.
- Live publishing POST returned 503 with publishing disabled, as required. Production dependency audit reported zero vulnerabilities. Rollback branch still points to `36ddcb1e0659755589a6b10f3298e4689f57e631`.
- Read-only Neon inspection found a same-tenant parent-linked chain: completed planning, approved generation with four persisted pages, completed quality review with status `passed`, and publication review waiting for approval. The historical generation result has no provider field, so it does **not** prove durable real-model generation. Stages 1/2 and live retry/concurrency acceptance remain unverified. No customer payloads were retrieved and no database mutations were made.
- A local rerun of the isolated audit pipeline returned `AUDIT_SOURCE_TRANSIENT`; the inspected deployed workflow diagnostic passed. Local browser binary download failed; browser acceptance used GitHub Actions and the available live browser. Neither restriction is represented as a product pass.
- Publication hardening branch: 538/538 TypeScript tests, 114/114 worker/script tests, and type validation passed locally. The prior attestation branch additionally includes three worker/script regressions.
- Agent contact handoff now validates and passes supplied email into inference/rendering instead of dropping it. Nine focused agent/contract tests and TypeScript validation passed. This is a regression fix, not live publishing acceptance.

Latest merged main at this checkpoint: `d2bce699975471f321b76e082abb9dd3a44b9047`. Current-main CI and a live revision-attested deployment remain required. Avoid interpreting skipped older deployment runs as failures: the workflow intentionally refuses to deploy superseded source.

## Verified release and final UI regression

Main `5867804af125d25f60e2079a40e7e96dc27fbeb4` passed all six required checks and deployed successfully through https://github.com/jschop44/forge-studio/actions/runs/42959793184 . Actual upload, exact live source attestation, database/auth readiness, 4/4 recognition cases, the six-stage real Cloudflare diagnostic and authenticated worker execution all passed. The diagnostic remained non-persistent and unpublished; the worker processed zero jobs. Independent live health probing also matched the full SHA. Combined local release validation: 542/542 TypeScript tests, 117/117 worker/script tests and production build passed; PR #44 browser logs recorded 263/263 passed.

Live worker/projects/assets unauthenticated probes returned 401. Disabled business publication POST and public pages returned 503; public pages used `Cache-Control: no-store`. Ecosystem diagnostics returned `enabled:true`, `storageConfigured:true`, `signingConfigured:false`; signed ingestion returned `Integration not configured`. The deploy sync had access only to `FORGE_WORKER_SECRET`. Cross-app delivery therefore needs the existing shared `FORGE_INTEGRATION_SECRET` made available to the established deployment workflow and Worker, then actual signed tenant-scoped deliveries. Never paste secret values into source, reports or logs.

The final live UI check exposed an additional defect: the app's own inline example `Industry: Soccer club; Offerings: ...` polluted the industry with the offerings text and lost the supplied service list. Normalize semicolons only before recognized field labels, share the tested brief parser, and use the normalized brief consistently for explicit-fact precedence. Eleven focused brief/recognition tests and TypeScript validation passed. A new browser regression checks the actual generation request and offering headings. This new correction must pass full CI and a new exact-revision deployment; the preceding deployed release does not prove this correction live.

No overall production-completion percentage is asserted. Full live publishing/rollback/concurrency, source fidelity, actual cross-app delivery, durable six-stage real-model provenance and real-device immersive acceptance remain open. No production flags were enabled and no database rows were changed by this session.
