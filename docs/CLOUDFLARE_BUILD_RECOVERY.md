# Forge Studio — Cloudflare Workers Builds recovery

## Verified mismatch (2026-11-10)

GitHub's failing Cloudflare check is titled **Workers Builds: forge-studio** and links to the Cloudflare Worker service **forge-studio**. The checked-in `wrangler.jsonc` names the deploy target **forge-studio-preview**, which serves the existing preview at
`https://forge-studio-preview.stands-old-3h.workers.dev/`.

Cloudflare's Workers Builds documentation requires the connected Worker name to equal the `name` in the Wrangler configuration. The failure also occurs on the existing `main` commit, whereas the GitHub Actions OpenNext build succeeds. These observations identify a definite name mismatch; the precise Cloudflare log has not been retrieved, so other build-settings problems may also exist.

## Read-only account diagnosis

The `Inspect Cloudflare dashboard build configuration` GitHub workflow ran on 2026-11-10 using the existing repository secrets. Cloudflare's Workers Scripts API confirmed **both** `forge-studio` and `forge-studio-preview` exist in the account. The Workers Builds configuration and build-logs API returned **HTTP 401** for both targets. The existing token is therefore sufficient to list Workers but cannot inspect or change Git-associated builds; a separate user-scoped Builds API token would be required for remote API repair. No Cloudflare resources were modified.

## Preferred zero-cost repair: use the existing verified GitHub Actions deploy

The repository already has `.github/workflows/verified-preview.yml`. It deploys the correctly named `forge-studio-preview` Worker **only for a successful push to `main`**, and then checks health and AI functionality.

1. Sign in to Cloudflare, select **Workers & Pages**, then select the Worker **forge-studio** (the one identified by the failing GitHub check, **not** `forge-studio-preview`).
2. Open **Settings → Builds** and confirm this Worker is connected to `jschop44/forge-studio`. If it is, select **Disconnect** for the Git repository. This disconnects that Worker's automatic *Git builds*; it does **not** delete or rename a Worker.
3. Leave `forge-studio-preview` and its runtime environment, bindings, secrets, routes, and deployment intact. Do **not** remove the entire Cloudflare GitHub app, since other projects might use it.
4. Keep using `Verify` followed by `Deploy verified Forge preview` in GitHub Actions after merging. Confirm the deploy workflow succeeds and `/api/health` returns the expected service.
5. On a fresh commit, confirm the mismatched `Workers Builds: forge-studio` check no longer appears. A historical failed check will remain visible on earlier commits. If repository rules require this removed check, update the required-check rule to rely on the verified GitHub Actions checks instead (without bypassing application tests).

This removes the duplicate, incorrectly targeted Cloudflare build path and retains automatic free GitHub Actions-to-Cloudflare deployment.

## Alternative: use Cloudflare dashboard builds instead of GitHub deploy

Only choose this path if you intentionally want Cloudflare Builds to be the deployment authority.

1. Connect the repository to the **forge-studio-preview** Worker, matching `wrangler.jsonc`, rather than to **forge-studio**.
2. In its **Settings → Builds**, set the root directory to the repository root and set **Build command** to `npm run build:cloudflare` and **Deploy command** to `npm run deploy:cloudflare`. The commands in `package.json` call `opennextjs-cloudflare build` and `opennextjs-cloudflare deploy`.
3. Ensure its runtime bindings and permissions are unchanged, and inspect branch-preview settings separately. Cloudflare preview deployments are not automatically production releases.
4. Do not leave two independent pipelines publishing the same production Worker; select one deployment authority and test it before disabling the other.

## If the Cloudflare dashboard still fails

Open the exact failed build and inspect its logs. Cloudflare Workers Builds also has a REST API for inspecting logs, but it requires a **user-scoped API token** with Workers Builds Configuration permissions; the existing GitHub deployment token may not have that permission. Do not print credentials or build-time secrets.

Official references:
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/
- https://opennext.js.org/cloudflare/howtos/dev-deploy
