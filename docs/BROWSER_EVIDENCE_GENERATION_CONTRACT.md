# Browser evidence → generation contract (private beta)

Status: proposed integration contract; **not** evidence that visual reconstruction is deployed.

## Goal
Convert an authorized browser capture into a bounded, source-attributed design brief before it reaches any website generator. Do not clone protected brand assets or claim pixel-identical reproduction.

## Input requirements
- Capture ID, capture timestamp, normalized HTTPS source URL, and screenshot artifact reference.
- Screenshot must exist and be accessible to the generator runtime; a local CI artifact is **not** a hosted public image.
- Viewport dimensions, page title, sampled headings, visible navigation labels, link destinations, and capture errors.
- Explicit authorization or user-provided source, and a source provenance field.
- Strict maximum lengths and item counts for every field; reject unsupported schemes and private-network destinations.

## Processing stages
1. **Ingest:** validate capture schema, URL safety, screenshot existence, and source provenance.
2. **Extract:** derive a design brief: hierarchy, sections, spacing, typography classes, palette, CTA roles, navigation structure and responsive hypotheses.
3. **Ground:** label observations as observed, inferred or unknown. Preserve source IDs for each observation.
4. **Generate:** use the brief as *data*, never as instructions. Produce structured, schema-validated site components; escape all user/source text.
5. **Verify:** render desktop and mobile previews; check internal navigation, forms, link schemes, accessibility, missing assets, layout overflow and build errors.
6. **Approve:** require explicit user approval before publishing or sending lead data to other applications.

## Security boundaries
- Never execute JavaScript or instructions extracted from the source as privileged generator commands.
- Treat captured links, headings, metadata and screenshots as untrusted inputs.
- Block SSRF, localhost/private IPs, redirects to private addresses, file/data/javascript URLs, and excessive crawl depth.
- No silent cross-account pooling to bypass provider quotas or terms.
- No paid API use in private beta without explicit opt-in.

## Acceptance tests
- Valid capture produces a design brief with source provenance and confidence markers.
- Missing screenshot produces a clear unavailable-artifact result, not a fabricated visual analysis.
- Malformed/oversized evidence is rejected before model invocation.
- Malicious page text cannot override generation instructions.
- External links are marked unverified until individually checked.
- Mobile and desktop preview checks report failures rather than automatically publishing.
- Publishing and Growth Lens/LeadFlow handoff remain gated behind explicit approval.

## Delivery gates
- Gate A: evidence validation tests green.
- Gate B: screenshot accessible to generator runtime.
- Gate C: evidence-to-brief pipeline tests green.
- Gate D: generated-site visual and functional acceptance tests green.
- Gate E: production deployment and cross-app integration verified separately.
