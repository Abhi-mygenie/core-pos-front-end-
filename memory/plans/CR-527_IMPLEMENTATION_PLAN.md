# IMPLEMENTATION PLAN (Gate 3) — CR-527 / BB-09 — Diner on credit rows

**Date:** 2026-11-20 · **Role:** PLANNING (plan only, NO code) · **Risk:** HIGH (customer-data display) · **Priority:** P2
**IA:** `impact/CR-527_IMPACT_ANALYSIS.md` · **Contract:** `contracts/BATCH-B_CR-527_API_CONTRACT_2026_11_15.md` (FINAL v1 LOCKED) · **Decisions:** OD-527-A/B/C, OD-B-BB09
**Backend handoff (validated):** `backend_replies/CR-527_BB-09_FRONTEND_HANDOFF_2026-11-20.md`
**Branch:** ec798d1. **Supersedes** GATE_2.5_DESIGN_APPROVED.

## Backend status (UNBLOCKS this build)
`GET /api/v2/vendoremployee/pos/tap-customer-record-list?customer_id={holder}` now returns per credit row:
- `diner_name` (string|null), `diner_mobile` (string|null) — snapshot of the order's diner at credit time (may differ from holder).
- Stored **plain text**, no CRM link/sync (resolves OD-B-BB09). Historical rows → `null` (no backfill). Preprod-verified (restaurant 672, orders 1578984/1578985); **production needs the migration deployed**.

## Step 0 — Code Reality (ec798d1) — NONE
- `api/transforms/creditTransform.js` `creditEntryFromAPI` (L96-107): maps `{id, orderId, restaurantOrderId, customerId, amount, …}` — no diner fields.
- `components/credit/CreditCustomerDetailSheet.jsx` keeps its **own local mapper** (L239-249) — does NOT use `creditEntryFromAPI`; also no diner fields. `CreditRow` (L115-170) renders No./Date/Order/Amount/Status/View/Remove — no Diner cell. Bucket tables (covered/partial/open) each have their own `<thead>`.
- No diner filter anywhere.

## Step 1 — Conflict Pre-Check — CLEAN
Same file as CR-526 (Remove-from-credit, already IMPLEMENTED in this sheet) but different region (adds column/filter, not the remove action). Additive. No open item owns an overlapping change.

## Scope — 2 files
`api/transforms/creditTransform.js` (E1) · `components/credit/CreditCustomerDetailSheet.jsx` (E2-E5).

## Edits (exact)

**E1 — `creditTransform.js` `creditEntryFromAPI` (~L107)** — single source of truth + unit-testable:
```js
  hasOrderDetail: Number(raw?.order_id) > 0,
  dinerName: raw?.diner_name ?? null,     // CR-527/BB-09
  dinerMobile: raw?.diner_mobile ?? null, // CR-527/BB-09
```

**E2 — `CreditCustomerDetailSheet.jsx` local mapper (L239-249)** — mirror the fields (sheet re-maps raw):
```js
      hasOrderDetail: Number(c.order_id) > 0,
      dinerName: c.diner_name ?? null,     // CR-527/BB-09
      dinerMobile: c.diner_mobile ?? null, // CR-527/BB-09
```

**E3 — `CreditRow` (L115-170)** — new **Diner** cell (after the Order column, before Amount). Pass holder in to suppress redundant display:
```jsx
function CreditRow({ entry, index, coverage, onViewBill, onRemove, canRemove, holder }) {
  ...
  // after the Order <td> (L125):
  <td className="px-3 py-2 max-w-[160px] truncate" title={c.dinerName || ''}
      style={{ color: COLORS.darkText }} data-testid={`credit-txn-diner-${c.id}`}>
    {(!c.dinerName || (c.dinerName === holder?.name && (c.dinerMobile || '') === (holder?.mobile || '')))
      ? '—' : c.dinerName}
  </td>
```
All 3 bucket `CreditRow` call-sites pass `holder={customer}`.

**E4 — bucket table headers** — add `<th>Diner</th>` after the Order header in each bucket `<thead>` (covered / partial / open) so columns align with E3.

**E5 — Diner filter (OD-527-C), inside the credits section (~L541, scoped to `filteredCredits`)**:
- Build distinct diners from `filteredCredits` (key = `dinerName|dinerMobile`; null → "(no name)" bucket, sorted last). Each: order count + open amount (from FIFO `openItems`). Sort by most orders.
- **0-1 distinct → no filter control.** **2-5 → chips** (`Diner: All (N orders · M diners)` + one chip per diner with count). **6+ → one searchable dropdown** (same label; typeahead).
- Selecting a diner filters the rendered rows and shows a line: `"<diner>: N orders · ₹X open"`. `All` clears it. New state `dinerFilter` (default All); apply it to the `filteredCredits` used by the buckets.
- data-testids: `credit-diner-filter`, `credit-diner-chip-<key>`, `credit-diner-dropdown`, `credit-diner-active-summary`.

## Tests
- extend `api/transforms/__tests__/*creditTransform*`: `dinerName`/`dinerMobile` map from `diner_name`/`diner_mobile`; null when absent. (NEW file `creditTransform.cr527.test.js` if none exists.)
- Browser QA: filter thresholds + column (matrix below).

## Verification Matrix (seeds QA — account owner@…/Qplazm@10; preprod restaurant with diner snapshots)
| # | Scenario | Expected |
|---|----------|----------|
| 1 | Credit row with diner ≠ holder | Diner column shows diner name (truncated, full on hover); holder unchanged |
| 2 | Diner == holder OR diner null | Diner column shows `—` |
| 3 | 1 distinct diner | no filter control |
| 4 | 2-5 distinct diners | chips render; selecting filters rows + shows active summary |
| 5 | 6+ distinct diners | searchable dropdown; typeahead filters list; selection filters rows |
| 6 | Historical rows (null) | render `—`, no crash; counts exclude them into "(no name)" |
| 7 | creditTransform unit | diner fields mapped; null when missing |

## Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| Column misalignment (header vs row) | Med | E3+E4 paired; verify all 3 buckets |
| Prod shows `—` everywhere | Expected pre-deploy | backend migration to `manage.mygenie.online` required (handoff) |
| Historical null noise | Low | `—` fallback + "(no name)" bucket |
| PII display (diner mobile) | Low | display-only; plain text; no CRM side-effect (confirmed) |

## Scope lock
WILL change: `creditTransform.js`, `CreditCustomerDetailSheet.jsx` (+1 test).
WILL NOT touch: `creditService.js`, credit list (API 1), payment/TAB write path, CR-526 remove action, any backend.

## Out of scope (flagged separately)
**Prepaid amount discrepancy** — restaurant **672**, order **1578984** (bill 000823): placed ₹127 but saved & credited **₹132.71** (postpaid 1578985 correct). Money-correctness bug, unrelated to diner display → needs its own P1 intake.

## Handover
Gate-3 plan ready — backend BB-09 delivered & validated; 2-file additive FE change + diner filter (OD-527-C). Next: Gate-4 GO → IMPLEMENTATION.
