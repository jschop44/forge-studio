# Optional server-side persistence
This optional API requires a dedicated Neon Postgres database. It is not connected to existing Growth Lens or LeadFlow databases.
## Configuration
Set DATABASE_URL and AUTH_SECRET (random 32+ characters) in the deployment environment. Do not commit secrets.
Run initializeDatabase() in a controlled migration step, not in public request handlers.
Provision the first user through a trusted admin script or manual SQL insert using hashPassword() to derive a salted scrypt hash. Public sign-up is intentionally not enabled.
POST /api/auth/login establishes a secure HttpOnly session cookie.
GET /api/projects lists projects for the authenticated user.
POST /api/projects creates or updates an owned site; site.id must be a UUID.
DELETE /api/projects/:id deletes an owned project.
## Limitations before production
No durable login attempt throttling, password reset, MFA, CSRF token, audit trail, migration CLI or revision rollback yet. Keep the API unexposed until these are added. Browser-local editing is still the default; server sync UI is not connected.
