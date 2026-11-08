# Forge Studio persistent learning memory (private beta)

This optional module stores bounded, user-submitted observations in the existing Neon Postgres database. It does not autonomously train models, read third-party apps, or run background collection.

## Enable
1. Run the existing database migration with `npm run db:migrate`.
2. Set `ENABLE_FORGE_LEARNING_MEMORY=true` on the Forge Studio server only after the database and authentication are configured.
3. Keep the flag unset or false to disable API access.

## API
- `POST /api/intelligence/memory`: authenticated, same-origin JSON body matching `LearningObservationSchema`.
- `GET /api/intelligence/memory?projectId=...`: authenticated retrieval, up to 200 recent observations.
- `DELETE /api/intelligence/memory?projectId=...`: authenticated, same-origin deletion for one project.
- `DELETE /api/intelligence/memory?all=true`: authenticated, same-origin deletion of **all observations owned by the signed-in user**.
- After each successful insertion, the server trims the owner's stored observations to the most recent 1,000 (by timestamp and ID). This is a retention cap, not a concurrency-safe rate limit.

Every query is scoped to the signed-in owner. The project key is an application-level label, not a substitute for owner authentication. There is no autonomous training, feedback inference, or cross-app data transfer.

## Owner feedback in Forge
The intelligence control center provides a project feedback form. Owners can record helpful, unhelpful or unverified outcomes and load a project-scoped summary. Review priorities require at least three distinct helpful owner-feedback records and a helpful ratio of at least 75% among verified feedback in that category. Exact duplicate records, automated audits and unverified outcomes cannot promote a priority. Priorities guide human review; they never modify sites or train models. Summaries cover only the returned window (up to 200 recent records).

## Rollback and removal
1. Set `ENABLE_FORGE_LEARNING_MEMORY=false` to disable API access.
2. Export any observations needed for retention through the authenticated GET endpoint before deletion (pagination is not implemented; GET returns only the most recent 200).
3. Delete observations through the authenticated per-project endpoint or `?all=true` to remove all observations owned by the signed-in user.
4. After a verified database backup and explicit approval, an operator can drop `forge_learning_observations` to remove the module's database table.
5. Remove the memory API, migration registration, and learning-memory modules if full code removal is required.

**Limitations:** The database is not verified in a live environment by CI; bulk export and concurrency-safe storage quotas are not yet implemented. A successful code build does not prove database connectivity.
