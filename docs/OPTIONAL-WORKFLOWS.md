# Optional external workflows

These adapters are connected to `generateWithLocalAi`, shared by interactive generation and queued site-generation tasks. They are disabled without server configuration. No subscription or paid inference is required by Forge. Use your own existing self-hosted services and free/local models; Forge cannot inspect or guarantee the billing configuration of an external flow.

## Dify or Flowise design knowledge

Select **one** advisor using `FORGE_DESIGN_ADVISOR=dify` or `flowise`. The advisor can retrieve design recommendations from your configured knowledge library. It receives only the business industry and service names, never contact details, source HTML, credentials or generated pages. Its output can choose only `editorial` or `image-led`; it cannot change business identity, copy, products, images, links or HTML. Explicit design-library choices take precedence and skip the advisor.

Dify: set `DIFY_WORKFLOW_URL=https://your-service/v1/workflows/run` and `DIFY_API_KEY`. Publish a Workflow with string inputs `industry` and `services`, and an output named `layout` containing either `editorial` or `image-led`. All other output keys are rejected. The API is called with blocking response mode.

Flowise: set `FLOWISE_PREDICTION_URL=https://your-service/api/v1/prediction/your-flow-id` and `FLOWISE_API_KEY`. Configure the flow to return exactly JSON `{"layout":"editorial"}` or `{"layout":"image-led"}` in its text response. Forge never submits overrideConfig, tool settings, credentials or conversation history.

Only one provider is called, once, with a 2.5-second timeout and a 16 KB response limit. Missing, invalid, failed, oversized or late responses leave existing layout selection unchanged. No competing orchestration system is started.

## Activepieces draft events

Configure `ACTIVEPIECES_WEBHOOK_URL` with your Catch Webhook URL. Optionally set `ACTIVEPIECES_WEBHOOK_TOKEN` and validate its bearer token in your flow. Treat the webhook URL as a secret. HTTPS, no credentials in the URL, and no redirects are required.

The shared generator emits `draft.generated` after rendering or `draft.failed` after a generation failure. Each attempted generation receives a random event ID, also included in `X-Forge-Event-Id`. Payloads contain version, ID, event type, requiresReview=true, and optional model provider and page count. No business identifiers, contact details, content, raw errors, endpoint URLs or keys are sent. Deduplicate by event ID in downstream flows. HTTP acceptance means webhook receipt, not successful completion of the external automation.

Events are best effort: one attempt, a two-second timeout, and no automatic retries. A failed webhook cannot fail website generation. A generated draft has not passed subsequent browser inspection or publication approval; do not use this event to auto-publish. Existing GitHub Actions continue to handle build and deployment, avoiding duplicate CI orchestration.

## Deployment

The existing verified-preview workflow synchronizes these optional GitHub secrets to the same Cloudflare Worker without erasing missing values. Set only the advisor you intend to use. No keys or external endpoints are exposed through generated pages or user-facing controls.

Source adapters and protocol checks do not establish live service acceptance. Actual activation requires owner-provided HTTPS endpoints, credentials and correctly configured workflows; none are provisioned by these changes.

Protocol references:
- https://docs.flowiseai.com/api-reference/prediction
- https://github.com/langgenius/dify/blob/main/api/controllers/service_api/app/workflow.py
- https://www.activepieces.com/pieces/webhook
