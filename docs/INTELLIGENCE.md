# Intelligence engine v1
This deterministic engine turns structured Growth Lens or LeadFlow business context into a bounded, explainable score, evidence signals and prioritized actions.
The score is a heuristic context-completeness and reported-issues score, NOT a measured business success, conversion, revenue, SEO, AEO or GEO score.
No automated scraping or external model invocation occurs in this engine.
The analysis endpoint is authenticated and disabled by default.
Local feedback events capture accept/reject/defer decisions, but do not automatically retrain a model. Persistent cross-app feedback and autonomous scheduling require secure backend infrastructure.
To enable automation safely: use signed service-to-service identity, durable queues, scoped tenant consent, idempotency keys, retry/dead-letter handling, monitoring and rate limits.
