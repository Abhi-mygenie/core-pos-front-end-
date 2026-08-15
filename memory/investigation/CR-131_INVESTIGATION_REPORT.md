# CR-131 Investigation Report

**ID:** CR-131  
**Date:** 2026-08-05  
**Investigator:** INVESTIGATION AGENT  
**Steps used:** 4/10

---

## 1. Summary

**Root cause:** Both customer report screens (`CustomersRfmMockup.jsx` and `CustomersMixMockup.jsx`) use **100% POS data** from `POST /api/v2/vendoremployee/report/insights-customers`. **Zero CRM API calls** exist in either report. The data source is unambiguously POS-only. No label indicates this to the owner.

- **Classification:** FE_FIX (display label — cosmetic)
- **Confidence:** HIGH — both files fully traced
- **Steps used:** 4/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Reports use POS insights-customers endpoint only | grep imports, fetch calls in both files | **CONFIRMED** | Both import `fetchInsightsCustomers` from insightsService, which calls POS `/insights-customers` |
| H2 | Reports also use CRM API for some data | grep for crmApi, crmAxios in both files | **ELIMINATED** | Zero CRM imports or calls found |
| H3 | fetchInsightsCustomers is a mixed POS+CRM aggregator | Code trace insightsService.js L656 | **ELIMINATED** | Pure POS call: `api.post(INSIGHTS_CUSTOMERS, {...})` using POS axios, not crmApi |

---

## 3. Data Flow Trace

```
CustomersRfmMockup.jsx:
  fetchInsightsCustomers(from, to)
  → insightsService.js L656
  → POST /api/v2/vendoremployee/report/insights-customers
  → Returns: { top_customers, rfm_bands, summary: { unique_customers, repeat_pct... }}
  → Source: 100% POS order data
  → Comment in file: 'Data source: insights-customers (NEW endpoint)'

CustomersMixMockup.jsx:
  Same fetchInsightsCustomers() call → same POS endpoint
  Returns: { guest_count, registered_count, daily breakdown... }
  → Source: 100% POS order data

CRM data (crmApi): NEVER called in either report screen.
```

---

## 4. Evidence Artifacts

- Code trace: `/app/memory/evidence/CR-131/code_trace.md`

---

## 5. Recommendations

**Classification:** FE_FIX (display only)

**Fix:** Add a small 'Source: POS Data' badge/chip to both report screens.
- Location: below the report title/subtitle line in each screen
- Style: small muted chip (e.g., `text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full`)
- Text: `'Source: POS Order Data'` for both screens

**Scope:** 2 files, ~3 lines each (~6 lines total)
- `CustomersRfmMockup.jsx` — ~L93 near title
- `CustomersMixMockup.jsx` — ~L89 near title
- Non-hotspot files, LOW risk

**Planning skip eligibility:** YES — ALL fast-lane conditions met:
- LOW risk (static display text)
- ≤10 lines per file
- No API/state/auth change
- Non-hotspot files
- No financial logic

**BUT: Fast Lane requires owner approval.**

**Recommended next step:** Recommend FAST LANE (owner approval needed). Can be done in same session if owner approves.

---

## 6. Retroactive Candidates

NONE — no drift found.
