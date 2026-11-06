# Browser-based acceptance verification

The current CI runs static tests, TypeScript checking, and a Next.js build. It does **not** currently execute Playwright browser tests.

To verify a deployed Forge Studio site:
1. Install and pin Playwright in CI, with the browser binaries downloaded during the workflow.
2. Start the application against a test database and a test owner account.
3. Exercise generated-site navigation, contact forms, keyboard accessibility, mobile viewport, and reduced-motion behavior.
4. Publish the draft to a disposable test hostname once publishing exists, then fetch all public pages.
5. Record the CI run ID, commit SHA, HTTPS base URL, checked timestamp, and each check result.
6. Confirm the CI run and retained artifacts independently before accepting any browser report.
7. Exercise rollback and repeat the public-page fetch.

The `browser-verification-report` module validates the report's shape but does not run Playwright or prove the report's provenance. Do not claim end-to-end browser testing based solely on a parsed report.
