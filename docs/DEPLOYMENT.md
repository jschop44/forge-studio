# Deployment guide
1. Run `npm install`, `npm run typecheck` and `npm run build` locally or in GitHub Actions.
2. Build the included Dockerfile on a hosting provider with a free tier if available.
3. Keep `ENABLE_AI_GENERATION=false` unless authentication, durable quotas and billing safeguards are implemented.
4. Keep `OPENAI_API_KEY` server-side and out of Git.
5. Configure TLS and health checks on `/api/health`.
6. Do not advertise multi-user project storage or server-side publishing: projects currently live only in browser localStorage.
7. For production, add database migrations, asset storage, backups, authorization and deployment rollback before onboarding users.
