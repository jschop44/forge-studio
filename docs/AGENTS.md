# Modular intelligence agents
The architecture separates LeadFlow enrichment, Growth Lens audits, Forge Studio planning, generation, quality review and publication review.
Agent decisions are deterministic until an explicitly configured, quota-limited model provider is available.
The orchestrator currently computes next-step decisions only. It does not run background jobs, fetch websites, send messages, publish websites, or connect to other app databases.
Required before autonomous operation: authenticated tenant identities, a durable task queue, consent records, idempotent execution, retries, dead-letter handling, observability, and secure service-to-service connectors.
Publication and outreach remain approval-gated. Paid model usage is disabled by policy.
