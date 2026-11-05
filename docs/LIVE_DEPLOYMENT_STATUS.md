# Live deployment verification — 2026-11-05

## Provisioned resources

- Forge Studio: Render free web service, https://forge-studio-free.onrender.com, connected to jschop44/forge-studio main with automatic deployment.
- Dedicated Neon project: forge-studio-free, project young-night-65648740, isolated from the original Neon project.
- PostgreSQL schema: users, projects, publications, leads, assets, jobs, feedback, and rate limits. Tables were created and verified by a database query.
- Server-only secrets: DATABASE_URL, AUTH_SECRET, FORGE_WORKER_SECRET, FORGE_INTEGRATION_SECRET provisioned in Forge Render environment.
- Growth Lens and LeadFlow Render backends: shared Forge event signing secret and Forge event endpoint configured, with new connectors deployed.

## Verification evidence

The Render build for commit df7d42fa reported 14/14 automated tests passed, TypeScript typecheck succeeded, Next.js production compilation succeeded, and deployment reached live status. A later deployment is needed to verify newer security and autopilot commits.

Growth Lens Render deployment of 95d80391 and LeadFlow Render deployment of a336a0c6 reached live status. LeadFlow logs reported a completed independent intelligence scheduler cycle and a successful Neon library integration test.

## Operational limitations

- No complete authenticated browser session or actual lead form round trip was exercised in this session.
- No end-to-end signed event with a real tenant was exercised; connectors are configured, but successful cross-app delivery is unverified.
- The Forge in-process autopilot runs only while its free Render Node service is awake. GitHub scheduled polling still requires repository Actions variables/secrets.
- A local Ollama provider is optional, disabled by default and not installed on the Render free service. Without it, business generation is deterministic, not LLM-powered.
- The free Neon project has strict quotas; operations may pause at resource limits.
- Public 3D export uses an externally hosted viewer for public HTTPS model URLs; private asset URLs cannot be embedded in public HTML.
- Production security testing, user acceptance testing, mobile testing and disaster recovery verification are outstanding.

These limitations must be resolved before any claim of 100% production readiness.
