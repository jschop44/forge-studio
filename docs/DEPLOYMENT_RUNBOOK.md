# Forge Studio deployment and automation runbook

This repository is a Next.js application. No deployment or cloud resources are provisioned by this document.

## Free-first deployment
Use a separate free-tier Neon Postgres database dedicated to Forge Studio. Never reuse the Growth Lens or LeadFlow database without explicit approval. Configure DATABASE_URL and AUTH_SECRET as server-only secrets. Install dependencies, run npm test, npm run typecheck, npm run build, then npm run db:migrate. All commands must pass before enabling production features.

Set ENABLE_REGISTRATION=true only when ready to onboard users. Set ENABLE_PUBLISHING=true after verifying authentication, migrations and site content. Set ENABLE_LEAD_CAPTURE=true only after verifying abuse controls and privacy policies. Set ENABLE_ASSET_STORAGE=true after verifying file upload limits and quotas.

## Intelligence queue
ENABLE_AGENT_QUEUE=true enables authenticated queue creation and policy evaluation. The worker runs only safe, deterministic stages and never sends outreach or publishes without human approval. Set FORGE_WORKER_SECRET to a random value at least 32 characters. Configure GitHub Actions variable FORGE_WORKER_URL to the deployed absolute /api/agents/worker endpoint and secret FORGE_WORKER_SECRET to the same value. The scheduled workflow checks hourly. Until the deployment and both settings exist, the workflow does not execute useful work.

## Signed Growth Lens and LeadFlow events
Set ENABLE_ECOSYSTEM_INTEGRATION=true and FORGE_INTEGRATION_SECRET to a distinct random 32+ character secret. Authorized clients sign the exact JSON request body with HMAC SHA-256 over timestamp + '.' + rawBody and send headers x-forge-timestamp (milliseconds since epoch) and x-forge-signature (lowercase hex). POST to /api/integrations/v1/events with eventId, tenantId, source, businessName and consent:true. Duplicate event IDs are ignored. A signature key must remain server-side and never be exposed in browser code. Actual upstream event dispatch is not yet configured.

## Important limitations
The 3D Experience Lab can preview local GLB models and load stored private assets while authenticated. Exported HTML is a static fallback without the live WebGL scene. Public asset delivery and full cinematic export remain future work.

Lead capture has a basic in-memory rate limiter, not a distributed anti-abuse solution. Public rollout requires privacy disclosures, retention policies and stronger abuse protection. This project has not passed verified production acceptance tests.
