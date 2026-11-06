# Forge Studio persistent learning memory (private beta)

This optional module stores bounded, user-submitted observations in the existing Neon Postgres database. It does not autonomously train models, read third-party apps, or run background collection.

## Enable
1. Run the existing database migration with `npm run migrate` if configured, or invoke the project's migration entrypoint.
2. Set `ENABLE_FORGE_LEARNING_MEMORY=true` on the Forge Studio server only after the database and authentication are configured.
3. Keep the flag unset or false to disable API access.

## API
- `POST /api/intelligence/memory`: authenticated, same-origin JSON body matching `LearningObservationSchema`.
- `GET /api/intelligence/memory?projectId=...`: authenticated retrieval, up to 200 recent observations.
- `DELETE /api/intelligence/memory?projectId=...`: authenticated, same-origin deletion for one project.

Every query is scoped to the signed-in owner. The project key is an application-level label, not a substitute for owner authentication. There is no autonomous training, feedback inference, or cross-app data transfer.

## Rollback and removal
1. Set `ENABLE_FORGE_LEARNING_MEMORY=false` to disable API access.
2. Export any observations needed for retention through the authenticated GET endpoint before deletion (pagination is not implemented; GET returns only the most recent 200).
3. Delete observations for each project through the authenticated DELETE endpoint.
4. After a verified database backup and explicit approval, an operator can drop `forge_learning_observations` to remove the module's database table.
5. Remove the memory API, migration registration, and learning-memory modules if full code removal is required.

**Limitations:** The database is not verified in a live environment by CI; retention limits and bulk export are not yet implemented. A successful code build does not prove database connectivity.
