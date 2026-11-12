# Integration status — 2026-11-12

Implementation and deployment are separate. This table describes source capabilities, not live acceptance.

| Component | Current capability | Remaining prerequisite or scope |
| --- | --- | --- |
| LangGraph | Optional self-hosted desktop/mobile quality inspection → metadata repair → reinspection graph | Provision worker and HTTPS ingress; discovery, content and publishing agents still use existing queue |
| Ollama | Existing loopback inference and model readiness checks | Available local hardware/model; Cloudflare AI binding remains existing hosted provider |
| Playwright | Existing capture worker, PR #75 evidence collector, new inert-render quality worker | No generated script execution or external-image network validation in new quality worker |
| axe-core | New worker checks serious/critical WCAG A/AA violations at desktop/mobile sizes | Live activation requires worker; does not replace human accessibility review |
| Pexels | Optional server-only search adapter with subject, size, deduplication and attribution checks | Free `PEXELS_API_KEY`; live source requests unverified |
| Unsplash / Commons | Existing source references and Commons metadata discovery | Existing photography fallback; no new Unsplash API app registration |
| GrapesJS / Three.js / React Three Fiber / Lucide | Existing application dependencies preserved | Broader editor persistence and business-specific immersive acceptance still required |
| GSAP | Evaluated; not added | Standard license is not an open-source license and restricts competing visual animation builders. Existing reduced-motion-aware CSS remains in use. Source: https://webflow.com/legal/product-terms section 9 |
| Dify / Flowise | Not activated | Would duplicate queue/orchestration for current generation path; only add an adapter for a concrete unique workflow |
| Activepieces | Not activated | Existing GitHub Actions already cover build/deploy notifications; no external workflow target supplied |
| ComfyUI / Sharp | Not implemented by current change | Image generation requires available compute, model/workflow and a persistent asset-delivery path; native optimization belongs outside Workers |
| Crawlee / Lighthouse | Not added by current change | Existing permitted-source capture remains; production performance budgets and real browser extraction coverage remain outstanding |

No paid inference service or paid host has been added. External image licensing metadata and credits remain attached to generated pages. New optional services require server-only configuration, not end-user controls.
