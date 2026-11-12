# Optional generated-site quality worker

This self-hosted Node process supplies LangGraph orchestration for the rendered quality stage. It extends PRs #74 and #75; it does not replace the durable agent queue or claim that discovery/content agents run on LangGraph.

Install with `npm ci` in this directory, then `npx playwright install chromium`. Set a random `FORGE_QUALITY_WORKER_SECRET` of at least 32 characters and run `npm start`. It binds only to loopback port 8788; expose `/review` through an authenticated HTTPS reverse proxy or private tunnel you control. No paid host is required; an existing machine must be available. Do not expose an unprotected browser service.

Configure the application server with `FORGE_QUALITY_WORKER_URL=https://your-worker/review` and the same `FORGE_QUALITY_WORKER_SECRET`. Neither value is returned to clients. Without configuration, generation retains existing behavior and reports `not-configured`. A configured worker that fails, times out, or reports blockers prevents the business generation endpoint from returning an approved draft.

The graph renders all supplied pages at desktop and mobile sizes, collects evidence, checks serious/critical WCAG A/AA findings using axe-core, repairs missing title metadata, and renders again. It allows at most two repairs. Unrepairable findings return immediately. Page identities and titles must remain unchanged. One request runs at a time; payloads, page counts, browser navigation and graph recursion are bounded.

Generated JavaScript and all network requests are disabled during inspection. This makes markup safe to inspect without exposing the host network or credentials, but means this worker **does not verify external photo reachability, runtime navigation, WebGL, dynamic layouts, performance or image subject relevance**. `passed` covers only this inert-render inspection scope, not production readiness. Broken embedded images, static internal links, missing titles/images, overflow and accessibility are checked. It deliberately does not hide overflow, invent photographs, or rewrite business content to make checks pass.

Remaining deployment prerequisite: provision the existing-machine process, HTTPS ingress and secrets. No live worker has been provisioned by this source change. Ollama already exists in the main server; ComfyUI, Dify, Flowise, Activepieces, Crawlee, Sharp, Lighthouse and full multi-agent LangGraph orchestration are not implemented by this worker.
