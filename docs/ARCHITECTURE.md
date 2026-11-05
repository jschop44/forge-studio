# Forge Studio architecture
## Current boundary
Forge Studio is independent of Growth Lens and LeadFlow. No existing app or database is modified.
## Layers
- Next.js app router UI and server endpoints.
- Zod schemas for site and page blocks.
- Browser-local projects and JSON backup.
- Optional server-side AI provider adapter.
- HTML export with escaped text.
- WebGL scene component loaded only in browser.
## Future production architecture
- Authentication with server-managed sessions and CSRF controls.
- Postgres tenant-scoped projects, revision history, assets and deployments.
- Object storage with signed uploads and media validation.
- Async generation queue, bounded provider spend and usage accounting.
- Publishing service with immutable artifacts and rollback.
- Permissioned integration adapters for Growth Lens and LeadFlow, signed requests and per-tenant scopes.
## Current limitations
The block composer is experimental and not yet persisted into the Site schema. Export does not include WebGL scenes. No production authentication, billing, publishing or database. Browser storage is per-device. AI requires an API key and an explicit server-side enable flag.
