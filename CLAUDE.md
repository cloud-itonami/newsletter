# etzhayyim-project-newsletter — Newsletter Factory

**URL**: `https://newsletter.etzhayyim.com` / `https://nwsl0001.etzhayyim.com`
**DID**: `did:web:newsletter.etzhayyim.com`
**nanoid**: `nwsl0001`
**ADR**: `90-docs/adr/2605072000-langgraph-agent-loop-pattern.md`

## Architecture

- **Server**: TS thin-edge CF Worker (proxies XRPC to dispatcher)
- **Agent Loop**: LangGraph (Python, L8) via LangServer
- **Delivery**: Resend batch (per-subscriber personalized)
- **Schedule**: Every Tuesday 09:00 JST (LangServer BPMN-contract timer `0 0 * * 2`)
- **Input**: news.etzhayyim.com (`com.etzhayyim.apps.news.article`) + narou.etzhayyim.com chapters via subscribeRepos
- **Ad Integration**: ads.etzhayyim.com `createCampaign` (optional sponsor slot)

## Flow

```
Weekly BPMN timer (Tue 09:00 JST)
  → newsletter.run_curation_agent  (LangGraph: ingest → filter → rank → draft → personalize → store)
  → newsletter.send_via_resend     (Resend batch, per-cohort personalization)
  → newsletter.create_sponsor_slot (ads.etzhayyim.com createCampaign, if includeAdSlot=true)

On-demand:
  createCampaign XRPC → CF Worker → Dispatcher → LangServer
    → same BPMN flow triggered immediately
```

## LangGraph Nodes

| Node | Input | Output |
|---|---|---|
| `ingest_signals` | RW query: `vertex_news_article` + `vertex_narou_chapter` (last 7d) | `raw_signals[]` |
| `filter_relevant` | topic + cohortName → Claude relevance score | `filtered_signals[]` |
| `rank_content` | engagement potential scoring (Claude) | `ranked_signals[]` (top 10) |
| `draft_newsletter` | Claude: subject + body HTML | `subjectLine`, `bodyHtml` |
| `personalize` | per-cohort copy variants (Claude) | `cohort_variants{}` |
| `quality_gate` | score ≥ 0.7 → proceed, else retry | `qualityScore` |
| `store_campaign` | RW INSERT `vertex_newsletter_campaign` | `campaignId` |

## XRPC Endpoints

### Procedure (3)
`com.etzhayyim.apps.newsletter.{createCampaign, addSubscriber, sendCampaign}`

### Query (2)
`com.etzhayyim.apps.newsletter.{getCampaign, listCampaigns}`

## RisingWave Tables

| Table | Purpose |
|---|---|
| `vertex_newsletter_campaign` | Campaign records (status, subjectLine, bodyHtml, qualityScore) |
| `vertex_newsletter_subscriber` | Subscriber list (email, name, cohortName, status) |
| `vertex_newsletter_engagement` | Open/click events from Resend webhook |
| `edge_newsletter_sent` | Campaign → subscriber send record |

## Python Worker

`40-engine/kotoba/crates/kotoba-kotodama/py/src/kotodama/newsletter_worker_main.py`

Job types:
- `newsletter.run_curation_agent` — LangGraph loop (180s, 2 retries)
- `newsletter.send_via_resend` — Resend batch (120s, 3 retries)
- `newsletter.create_sponsor_slot` — ads.etzhayyim.com XRPC (30s, 2 retries)

## Env

```
AGENTGATEWAY_MCP_URL        — LangServer gRPC
RW_URL               — RisingWave postgres
ANTHROPIC_API_KEY
RESEND_API_KEY
RESEND_FROM          — newsletter@etzhayyim.com
ADS_XRPC_URL         — ads.etzhayyim.com base
NEWS_XRPC_URL        — news.etzhayyim.com base (default https://news.etzhayyim.com)
```

## Deploy

```bash
cd 60-apps/etzhayyim-project-newsletter/appview/newsletter-nwsl0001
etzhayyim deploy

python -m kotodama.newsletter_worker_main

curl https://nwsl0001.etzhayyim.com/health
curl -X POST https://nwsl0001.etzhayyim.com/xrpc/com.etzhayyim.apps.newsletter.addSubscriber \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","cohortName":"cohort-apqc-3-market-sell"}'
curl -X POST https://nwsl0001.etzhayyim.com/xrpc/com.etzhayyim.apps.newsletter.createCampaign \
  -H "Content-Type: application/json" \
  -d '{"name":"Weekly AI Digest #1","topic":"AI business tools and marketing automation"}'
```
