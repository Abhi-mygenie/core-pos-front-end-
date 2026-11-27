# Implementation Plan (Gate 3) — Batch 2026-11-19 (BUG-711, 704, 705, 706, 707)

**Role:** PLANNING (Gate 3). No code written. Awaiting Gate 4 GO.
**Source IA:** `/app/memory/impact/BATCH_2026_11_19_IMPACT_ANALYSIS.md`
**Code reality:** all target lines re-verified on current `main`. Entry checks below are exact.
**Conflict pre-check (FILE_OWNERSHIP):** No competing OPEN item on these files. `OrderReportBetaPage.jsx` receives edits from 3 items this batch (BUG-711, 706, 705-caller) at distinct lines — apply together. `CollectBillPanelDrawer.jsx` is SHARED by OrderReportBetaPage (OrderBeta) and AllOrdersReportPage (Audit→Hold, BUG-042-A owner-locked) — see BUG-705.

---

## Edits

### BUG-711 — Reprint permission gate (CRITICAL, 1 line)
- **File:** `pages/reports-module/OrderReportBetaPage.jsx`
- **Entry (L779):** `{row.f_order_status === 6 && (`  (Reprint button; `hasPermission` already in scope at L268)
- **Change:** `{hasPermission('print_icon') && row.f_order_status === 6 && (`
- **Marker:** `// BUG-711`

### BUG-706 — VAT/GST label (3 sites, derive from profile)
- **File:** `pages/reports-module/OrderReportBetaPage.jsx` (`restaurant` already destructured L265)
- **Add (near L266):** `const taxLabel = restaurant?.tax?.gstStatus ? 'GST' : (restaurant?.tax?.vatStatus ? 'VAT' : 'GST'); // BUG-706`
- **L501:** `{ key: 'gst', label: 'GST', ... }` → `label: taxLabel` (drives table + export column header)
- **L699:** `<th ...>GST</th>` → `<th ...>{taxLabel}</th>`
- **L881:** `<span ...>GST</span>` → `<span ...>{taxLabel}</span>`
- **No backend / no profileTransform change** (gstStatus + vatStatus already mapped). **Marker:** `// BUG-706`

### BUG-705 — PayLater: show all configured methods (Option A, via caller prop)
> Owner decision = Option A (show ALL) **for OrderBeta**. Because the drawer is shared with the owner-locked Audit→Hold flow (BUG-042-A), achieve Option A by making `allowedMethods` caller-driven — do NOT delete the restriction globally.
- **File 1 `components/reports/CollectBillPanelDrawer.jsx`:** add `allowedMethods` to the component's props (L79-100 signature) and forward it to `<CollectPaymentPanel allowedMethods={allowedMethods} .../>` at **L300** (replace the hardcoded `['cash','card','upi']`).
- **File 2 `pages/AllOrdersReportPage.jsx` (L1151 `<CollectBillPanelDrawer .../>`):** pass `allowedMethods={['cash','card','upi']}` (preserves BUG-042-A owner-lock).
- **File 3 `pages/reports-module/OrderReportBetaPage.jsx` (L921 `<CollectBillPanelDrawer .../>`):** pass NO `allowedMethods` (→ `undefined` → `isHoldContext=false` → all configured methods show).
- **Marker:** `// BUG-705` in all three. **Risk:** MEDIUM (shared component + owner-locked flow).

### BUG-704 — LM preset persistence (1 line)
- **File:** `pages/reports-module/ItemSalesLedgerMockup.jsx`
- **Entry (L166):** LM branch `... setAppliedFrom(range.from); setAppliedTo(range.to); setActivePreset(p); } return; }`
- **Change:** add `setSharedFrom(range.from); setSharedTo(range.to);` before `setActivePreset(p);`. (FY already correct — no change.)
- **Marker:** `// BUG-704`

### BUG-707 — Cancellation date format (2 sites, reuse existing format)
- **File:** `pages/reports-module/CancellationsMockup.jsx`
- **Entry L736 & L954 (identical):** `{r.orderDate} {r.orderTime}` (raw strings)
- **Change:** render via the same formatter already used at L980, e.g. build a datetime from `r.orderDate`+`r.orderTime` and format with `toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true })`; fall back to raw if unparseable. Define a small local `const fmtCancelDT = (d,t) => {...}` once; use at both cells.
- **No new util file.** **Marker:** `// BUG-707`

---

## Verification Matrix (seeds QA)
| # | Item | File:line | How to verify | Auto? |
|---|---|---|---|---|
| 1 | BUG-711 | OrderReportBetaPage L779 | Login T@t.com (print_icon=false) → Order Report Beta → Reprint button ABSENT on settled rows; login owner (print_icon=true) → present | NO |
| 2 | BUG-706 | OrderReportBetaPage L501/699/881 | owner@beanmeup.com (VAT) → column/header/footer read "VAT"; owner@cafe103 (GST) → "GST" | NO |
| 3 | BUG-705 | CollectBillPanelDrawer+2 callers | OrderBeta PayLater Collect → Split/Credit/To-Room/dynamic VISIBLE; Audit→Hold Collect → still ONLY Cash/Card/UPI | NO |
| 4 | BUG-704 | ItemSalesLedgerMockup L166 | Item Sales → click LM → navigate away → back → still LM range | NO |
| 5 | BUG-707 | CancellationsMockup L736/954 | Cancellation Report → Date/Time cell matches Punch Time style | NO |
| 6 | all | — | `yarn build` / webpack: 0 new warnings | YES |

## Regression focus
- **BUG-705 (hotspot/shared):** full re-test of Audit→Hold Collect (must stay Cash/Card/UPI) AND OrderBeta PayLater (now all) — same drawer.
- **BUG-711/706:** OrderBeta renders for GST and VAT restaurants; other row actions (Change/Unpaid/Collect) unaffected.

## Post-Code Registry Checklist (for Implementation agent)
- [ ] registry.json: each ID → status IMPLEMENTED, sprint_key `nov_cr_batch`
- [ ] BUG_TRACKER.md rows updated
- [ ] FILE_OWNERSHIP.md: OrderReportBetaPage.jsx, CollectBillPanelDrawer.jsx, AllOrdersReportPage.jsx, ItemSalesLedgerMockup.jsx, CancellationsMockup.jsx
- [ ] Code markers `// BUG-7xx` in every modified file
- [ ] webpack 0 new warnings

## Scope lock
- **WILL change:** OrderReportBetaPage.jsx, CollectBillPanelDrawer.jsx, AllOrdersReportPage.jsx, ItemSalesLedgerMockup.jsx, CancellationsMockup.jsx.
- **WILL NOT touch:** profileTransform.js, CollectPaymentPanel.jsx (already accepts `allowedMethods`), any backend, any transform.

## Single-batch execution recommendation
**YES — all 5 can ship in ONE implementation batch.** Rationale:
- All frontend-only; no API/transform/env/socket/localStorage changes.
- No cross-item ordering dependency; each is behaviorally independent.
- File coupling only: `OrderReportBetaPage.jsx` gets BUG-711 + BUG-706 + BUG-705's 1-line caller prop (distinct lines) → apply together in one pass; BUG-705 also edits CollectBillPanelDrawer.jsx + AllOrdersReportPage.jsx.
- Group edits by file, one compile, one combined QA pass.
- **Risk split:** BUG-711/704/706/707 are LOW; **BUG-705 is MEDIUM** (shared owner-locked component) → the only item needing focused regression. If the owner prefers to de-risk, BUG-705 can be split into a second batch, but it is not required.

---
*Gate 3 Implementation Plan. No code written. Awaiting Gate 4 GO.*
