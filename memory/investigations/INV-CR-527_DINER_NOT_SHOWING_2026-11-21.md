# Investigation Report — CR-527 "Diner on credit rows" shows IMPLEMENTED but UI shows nothing

**Role:** INVESTIGATION (Role 6) — read-only, NO application code changed
**Date:** 2026-11-21
**Item:** CR-527 (registry: `IMPLEMENTED 2026-11-20 — CR-527/BB-09`)
**Confidence:** HIGH (FE code-traced + live preprod probe)
**Steps used:** 7/10
**Account:** owner@cafe103.com / Qplazm@10 (preprod)

---

## 1. Summary
- **Root cause:** `DATA_ISSUE (backend)` — **not a frontend bug.** The frontend for CR-527 is fully implemented and present in the build. The backend `tap-customer-record-list` (v2) **now returns the `diner_name` / `diner_mobile` keys (BB-09 is deployed on preprod), but the values are null on every row.** The FE renders `—` whenever `dinerName` is null, so the Diner column appears empty and the diner filter never appears → owner perceives "UI doesn't show."
- **Classification:** BACKEND_DATA_GAP (field exists, never populated).
- **Where the feature lives:** Credit Management → open a credit customer → **Credit Customer Detail Sheet** (the per-order "Diner" column). It is NOT in the Collect Payment / credit-checkout panel.

## 2. Hypotheses Tested
| # | Hypothesis | Method | Result | Evidence |
|---|---|---|---|---|
| H1 | FE code not actually present / not compiled | grep code markers + read | ELIMINATED | `creditTransform.js:107-108` maps `diner_name→dinerName`; `CreditCustomerDetailSheet.jsx` has Diner `<th>` (L198), Diner cell with `—` fallback (L133-142), diner filter (L227-612). Local mapper mirror L270-271. |
| H2 | Backend BB-09 field not deployed → key absent | Live GET credit detail | ELIMINATED | Row keys include `diner_name`, `diner_mobile` (HTTP 200). |
| H3 | Field present but unpopulated (null) | Live scan 12 customers / 428 rows | **CONFIRMED** | **0 / 428 rows had a non-null `diner_name`.** Single-customer sample (id 1796, 71 rows): all `diner_name: null`. |

## 3. Data Flow Trace
```
API v2 tap-customer-record-list?customer_id=N
  → row.diner_name = null  (BB-09 column exists, not backfilled / not captured)
→ creditTransform L107 / sheet mapper L270 : dinerName = diner_name ?? null  → null
→ CreditRow L140-142 : (!dinerName || dinerName==holder) ? '—' : dinerName  → renders "—"
→ distinct-diner filter (L601-612) : 0-1 distinct diners ⇒ filter hidden (OD-527-C)
BREAK POINT: backend never sends a diner_name value → column is all "—", filter suppressed.
```
The **Diner column header DOES render** (always-present `<th>Diner</th>`); only the cell values are `—`.

## 4. Evidence Artifacts (/app/memory/evidence/CR-527/)
- `credit_list.json` — 58 credit customers (tap-waiter-list, HTTP 200)
- `credit_detail.json` — customer 1796, 71 rows, `diner_name`/`diner_mobile` keys present, all null
- Scan result: 12 customers / 428 rows / **0 non-null diner_name**

## 5. Recommendation
- **Classification:** BACKEND_ASK (data population), not an FE fix. FE is correct and shipping.
- **Backend (BB-09 follow-up):** populate `diner_name` / `diner_mobile` on credit rows from the order's customer-at-credit-time. Historical rows may stay null (acceptable per OD — render `—`), but **new credit orders must capture the diner name**, else the feature is permanently invisible in practice.
- **To visually confirm FE now:** need at least one credit row where backend `diner_name` is non-null AND differs from the holder. No such data exists on preprod today → browser QA of the populated state is still blocked by data, exactly as the registry's "QA PENDING" note states.
- **Owner expectation note:** If the owner expected the diner name in the **Collect Payment credit flow** (their screenshots), that is a different surface than CR-527's scope (credit detail sheet). Flag for owner to confirm intended surface.

## 6. Retroactive Candidates
None — CR-527 already registered IMPLEMENTED; this is a backend data dependency, not unregistered code.
