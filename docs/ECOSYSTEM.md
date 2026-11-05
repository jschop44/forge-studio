# Forge Studio ↔ Growth Lens ↔ LeadFlow integration contract
This is an opt-in adapter, not a claim of live cross-app synchronization.

## Business context
Growth Lens can supply audited business name, website, findings and prioritized recommendations.
LeadFlow can supply business name, website, industry and lead reference.
The shared schema is src/lib/integrations/contracts.ts; the bridge maps business context to a draft Forge Studio website.
The UI can import a validated JSON context and use its findings as the initial website brief.
No automatic scraping, lead outreach or financial uplift claims are performed.

## Future authenticated API
POST /api/integrations/v1/context is protected by a Forge session and disabled unless ENABLE_ECOSYSTEM_INTEGRATION=true.
Currently validates and echoes data; it does not write projects or call either existing application.
Do not enable publicly before origin/CSRF controls, durable quotas, OAuth or signed service credentials, consent, audit logging and tenant ownership are implemented.

## Outbound
createAuditHandoff and createLeadHandoff produce versioned JSON payloads for later adapters.
Growth Lens and LeadFlow repositories and their data stores are not changed by this module.
