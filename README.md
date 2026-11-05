# Forge Studio — Foundation v0.1

Independent Next.js + TypeScript website-builder foundation, designed for eventual integration with Growth Lens and LeadFlow.

## Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Implemented
- Responsive builder workspace with cinematic starter preview and three visual styles.
- Editable brand name, tagline, description, CTA, and accent color.
- Browser-local autosave; no server persistence or authentication yet.
- Deterministic starter-site generator (not AI inference).
- Static HTML export with escaped user text.
- Versioned read-only integration capability endpoint at `/api/integrations`.
- Shared Zod site schema to evolve into an authenticated project API.

## Next milestones
1. Database-backed projects, authentication, multi-tenant authorization, version history.
2. AI model adapter and structured generation with schema validation, rate limits, usage budgets.
3. 3D asset uploads, R3F scene editor, performance fallback and mobile optimization.
4. Block editor, templates, publishing and preview domains.
5. Signed, permission-scoped integration APIs for Growth Lens audit input and LeadFlow handoff.

## Security
Do not expose private API keys in client components. Add auth, ownership checks, input limits and abuse controls before enabling writes or external integrations. The current app is a local development foundation, not a production SaaS.
## Additional experimental modules
- Visual composer: `/composer`, with browser-local per-project block autosave and HTML export.
- WebGL 3D preview: optional editor toggle.
- Server-side auth and Neon project API: requires a dedicated database, migrations and environment secrets; not connected to UI.
- Static publishing endpoints: disabled by default (`ENABLE_PUBLISHING=false`).
- AI endpoint: disabled by default (`ENABLE_AI_GENERATION=false`).

**Important:** This source has not passed a verified production build or security audit. Do not expose experimental endpoints to customers.

## Experience Lab
Open /experiences to create a cinematic 3D product scene, luxury brand presentation or business website concept. Edit materials, particle effects, colors, rotation, industry and copy. Experiences save in browser localStorage and can be exported as static HTML.

Important: the exported HTML is a **static fallback** and does not contain the interactive WebGL scene. Interactive scenes currently work only in the running React application. Real 3D product asset uploads, glTF rendering, scroll timelines, AI scene generation, multi-page site publishing, lead forms and accessibility/performance verification are not complete.

## Agent orchestration
Modular task planning lives in src/lib/agents. It is an execution plan, not a background worker. No automated cross-app polling, learning or publication is active.

## Expanded platform modules (source-development milestone)

- `/business`: four-page business website generator with SEO/AEO/GEO quality recommendations and feedback.
- `/experiences`: cinematic 3D editor with GLB/glTF models and local preview; public HTTPS model exports include an interactive viewer.
- `/account`, `/cloud`: opt-in authentication, cloud project persistence and gated publishing.
- `/assets`, `/leads`: private asset library and authenticated lead inbox.
- `/intelligence`: durable agent task queue, approval gates and structured outputs.
- `npm run verify`: run regression tests, type checking and production build.
- `npm run db:migrate`: initialize dedicated database tables.

The Growth Lens and LeadFlow repositories contain opt-in signed Forge Studio event adapters. See `docs/DEPLOYMENT_RUNBOOK.md` and `docs/ACCEPTANCE_REPORT.md` before enabling features. An estimated 85% source feature implementation does **not** mean the deployment or end-to-end integrations have passed verification. All paid API calls remain disabled by default.
