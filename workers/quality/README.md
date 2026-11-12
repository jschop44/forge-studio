# Optional generated-site quality worker

This self-hosted Node process supplies LangGraph orchestration for the rendered quality stage. It extends PRs #74 and #75; it does not replace the durable agent queue or claim that discovery/content agents run on LangGraph.

Install with `npm ci` in this directory, then `npx playwright install chromium`. Set a random `FORGE_QUALITY_WORKER_SECRET` of at least 32 characters and run `npm start`. It binds only to loopback port 8788; expose `/review` through an authenticated HTTPS reverse proxy or private tunnel you control. No paid host is required; an existing machine must be available. Do not expose an unprotected browser service.

Configure the application server with `FORGE_QUALITY_WORKER_URL=https://your-worker/review` and the same `FORGE_QUALITY_WORKER_SECRET`. Neither value is returned to clients. Without configuration, generation retains existing behavior and reports `not-configured`. A configured worker that fails, times out, or reports blockers prevents the business generation endpoint from returning an approved draft.

The graph renders all supplied pages at desktop and mobile sizes, collects evidence, checks serious/critical WCAG A/AA findings using axe-core, repairs missing title metadata, and renders again. It allows at most two repairs. Unrepairable findings return immediately. Page identities and titles must remain unchanged. One request runs at a time; payloads, page counts, browser navigation and graph recursion are bounded.

Generated JavaScript is blocked by a prefixed Content Security Policy; all network requests are disabled during inspection. This makes markup safe to inspect without exposing the host network or credentials, but means this worker **does not verify external photo reachability, runtime navigation, WebGL, dynamic layouts, performance or image subject relevance**. `passed` covers only this inert-render inspection scope, not production readiness. Broken embedded images, static internal links, missing titles/images, overflow and accessibility are checked. It deliberately does not hide overflow, invent photographs, or rewrite business content to make checks pass.

## Additional authenticated endpoints

The same loopback service exposes POST `/capture`, `/visual`, and `/performance`, protected by the same bearer secret and single-job concurrency limit. Request bodies are validated and errors return 422 without service details. Expose only through your controlled HTTPS ingress.

- `/capture`: `{ "url": "https://authorized-source.example/" }`. Set `FORGE_CAPTURE_HOSTS` to the comma-separated source/resource host allowlist. Crawlee uses Playwright with public DNS checks, robots checks, safe navigation, four-page and rate limits. It returns browser evidence for the existing appearance-reconstruction consumer.
- `/visual`: `{ "businessName": "Example", "industry": "baseball equipment", "description": "...", "services": ["Baseball gloves"] }`. Requires `COMFYUI_URL`, `COMFYUI_WORKFLOW_JSON` (API-format owner workflow), `COMFYUI_PROMPT_NODE`, `COMFYUI_OUTPUT_NODE`, and `COMFYUI_MODEL_LICENSE`; optional `COMFYUI_TOKEN`. Sharp returns bounded metadata-free WebP bytes as base64. Missing configuration returns `not-configured`. Assets require visual review and persistent delivery before production use; the endpoint does not silently replace site photographs.
- `/performance`: `{ "path": "/business" }`. Lighthouse audits only the owned Forge deployment and approved published-site paths. Returns category scores and explicit budget outcome.

The command-line dispatcher offers the same jobs for existing-machine and CI execution: `node --import tsx integrations-cli.ts capture|visual|quality|performance input.json output.json`. Input/output files can contain private business data; use private directories and remove them after consumption.

Remaining deployment prerequisites: an available existing-machine process, HTTPS ingress, application secrets and any optional model configuration. No live worker or model has been provisioned by this source change. Dify, Flowise and Activepieces remain unactivated; broader coordinated generation orchestration and asset delivery remain incomplete. This service preserves the existing durable queue.
