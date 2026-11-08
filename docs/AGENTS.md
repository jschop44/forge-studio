# Modular intelligence agents
The architecture separates LeadFlow enrichment, Growth Lens audits, Forge Studio planning, generation, quality review and publication review.
Agent decisions are deterministic until an explicitly configured, quota-limited model provider is available. Approved queue generation calls the configured AI generation service and records its provider and draft. The model selects a validated responsive composition (editorial or image-led) and a bounded sand, mint or sky palette alongside its copy. The renderer applies these choices to generated pages; no model-generated HTML, scripts or CSS are executed. Supplied business identity and services remain authoritative. Known transient provider failures schedule bounded exponential retries, using the same tenant/attempt/lease fence as completion. Invalid model output and exhausted retries block the task for review. Provider failures never silently generate a template-only result. Deterministic generation remains available only in the pure helper used by unit tests.

The authenticated worker can claim durable database jobs and enqueue the next stage. It requires ENABLE_AGENT_QUEUE, a configured database and worker secret; its scheduled workflow also requires FORGE_WORKER_URL. Source code and unit tests do not establish that these settings or live cross-app connectors are operational.

Website audits require supplied HTML and a website URL; the worker does not crawl the URL. Generation passes every generated page to quality review. Quality review blocks missing or invalid content, duplicate slugs, broken internal HTML links, document errors and high-severity markup findings. Successful reviews retain per-page audits and timestamped quality evidence in the job result. Markup checks do not verify browser interactions, visual quality, immersive 3D, live deployment or AI generation.

Generation requires plan approval. Publication and outreach remain approval-gated. Paid model usage is disabled by policy.

Stage completion and successor enqueueing use one atomic Postgres statement, guarded by tenant, attempt and the exact claim timestamp. Database write failures leave the claim recoverable by the existing expired-job retry process. Local Postgres tests cover rollback, replay and stale-claim rejection; live queue execution remains unverified.

Before broader autonomous operation, verify live tenant isolation, retries and dead-letter handling, queue observability, and secure service-to-service connectors. The queue worker is not an autonomous repository code editor.

Retry delays begin at 60 seconds and double up to one hour. The hourly scheduler processes due retries on its next available run; GitHub schedules can be delayed. A scheduled retry ends the bounded drain, preventing immediate repeated inference attempts. Local Postgres tests verify retry fencing, exhaustion and delayed availability.
