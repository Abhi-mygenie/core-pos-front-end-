# Next Agent Handover — 2026-07-24

**Priority:** Revalidate Impact Analyses → Gate 3 Implementation Plans → Gate 4 GO → Code
**Role sequence:** PLANNING (Gate 3) → await owner Gate 4 → IMPLEMENTATION

---

## Items to Process (ONLY these — no others)

| # | ID | Title | IA Doc | Gate 2 Status | Risk |
|---|---|---|---|---|---|
| 1 | **CR-098** | Short Code (Item Code) Display on OrderCard | `impact/CR_098_IMPACT_ANALYSIS.md` | ✅ COMPLETE | LOW |
| 2 | **CR-099** | Per-Item Prep & Serve Time on OrderCard | `impact/CR_099_IMPACT_ANALYSIS.md` | ✅ COMPLETE | MEDIUM |
| 3 | **CR-056** | Scan Popup Toggle (Restaurant Setting) | `impact/CR_056_IMPACT_ANALYSIS.md` | ✅ COMPLETE — UNBLOCKED | MEDIUM |
| 4 | **CR-062** | Expense Report — Backend Aggregation Migration | `impact/CR_062_IMPACT_ANALYSIS.md` | ✅ COMPLETE — UNBLOCKED | LOW |
| 5 | **BUG-164** | Category Duplicate → 409 (FE guard simplify) | `impact/BUG_164_IMPACT_ANALYSIS.md` | ✅ COMPLETE — BACKEND FIXED | LOW |
| 6 | **BUG-165** | Item Duplicate → 422 (FE guard validated) | `impact/BUG_165_IMPACT_ANALYSIS.md` | ✅ COMPLETE — BACKEND FIXED | LOW |
| 7 | **BUG-203** | PUT /expenses/{id} accepts unit_price (remove 2-call workaround) | `impact/BUG_203_IMPACT_ANALYSIS.md` | ✅ COMPLETE — BACKEND FIXED | LOW |

---

## What Previous Agent Already Did

1. **CR-098 + CR-099** — Full Gate 2 IA + Gate 3 Implementation Plans already written:
   - `plans/CR_098_IMPLEMENTATION_PLAN.md` (7 edits, 3 files, ~10 lines)
   - `plans/CR_099_IMPLEMENTATION_PLAN.md` (5 edits, 1 file, ~25 lines)
   - **These only need Gate 4 GO from owner, then code.**

2. **CR-056, CR-062, BUG-164, BUG-165, BUG-203** — Gate 2 IA written. Gate 3 plans NOT yet written.

3. **Backend endpoints curl-validated** (all with fresh tokens on 2026-07-24):
   - CR-062: `POST /expense/expense-aggregation` → returns `grand_total`, `daily_totals[]`, `category_totals[]`, `payment_totals[]` with filter support
   - BUG-164: `POST /expense/category` duplicate → HTTP 409 ✅
   - BUG-165: `POST /store_expense` duplicate → HTTP 422 ✅
   - BUG-203: `PUT /expenses/{id}` with `unit_price` → accepted + persisted ✅
   - CR-056: `show_scan_popup: 1` confirmed in `restaurants[0].settings` of profile response

---

## Revalidation Checklist (Do This First)

For each item, verify the starting state hasn't drifted:

### CR-098 (Short Code)
- [ ] `orderTransform.js:112-158` — confirm `itemCode` is NOT mapped (should still be absent)
- [ ] `OrderCard.jsx:659/734/779` — confirm item rows still show `{item.name} ({item.qty})` only
- [ ] `OrderEntry.jsx:531` — confirm search only filters by `item.name`
- [ ] `OrderEntry.jsx:64-91` — confirm `adaptProduct()` does NOT carry `itemCode`
- [ ] Plan exists: `plans/CR_098_IMPLEMENTATION_PLAN.md` — verify edits still match line numbers

### CR-099 (Prep/Serve Time)
- [ ] `orderTransform.js:137-140` — confirm `readyAt`, `serveAt`, `createdAt` ARE mapped
- [ ] `OrderCard.jsx:659` area — confirm no time display exists yet
- [ ] `OrderCard.jsx:1` — confirm imports are `{ useState }` only (need to add `useEffect`)
- [ ] Plan exists: `plans/CR_099_IMPLEMENTATION_PLAN.md` — verify edits still match line numbers

### CR-056 (Scan Popup)
- [ ] `profileTransform.js` — confirm `showScanPopup` is NOT mapped yet (grep for it)
- [ ] `DashboardPage.jsx:1613` — confirm `<ScanOrderPopOut>` renders unconditionally
- [ ] `RestaurantSettingsPage.jsx` Step 4 area — confirm no "Show Scan Pop up" toggle exists
- [ ] Backend field: `settings.show_scan_popup` confirmed at integer `1` in profile response

### CR-062 (Expense Aggregation)
- [ ] `api/constants.js` — confirm no `EXPENSE_AGGREGATION` constant exists yet
- [ ] `ExpenseReportPage.jsx` — confirm it uses client-side aggregation (computes totals in FE)
- [ ] Endpoint: `POST /expense/expense-aggregation` — re-curl if needed (token: login as `owner@kunafamahal.com` / `Qplazm@10`)

### BUG-164 + BUG-165 + BUG-203 (Expense cleanup bundle)
- [ ] `ExpenseSetupPanel.jsx` `addCategory()` — confirm `res.data?.errors?.[0]` workaround exists (~L464)
- [ ] `ExpenseSetupPanel.jsx` `addItem()` — confirm client-side duplicate guard exists
- [ ] `ExpenseSetupPanel.jsx` inline edit — confirm 2-call workaround (PUT + POST set-unit-price) exists
- [ ] These 3 can be bundled into a single implementation plan (all in `ExpenseSetupPanel.jsx`)

---

## If No Blockers → Write Gate 3 Plans For:

1. **CR-056** — 4 files, ~8 lines (profileTransform + settingsTransform + RestaurantSettingsPage + DashboardPage)
2. **CR-062** — 3 files, ~40 lines (constants + expenseService + ExpenseReportPage)
3. **BUG-164 + BUG-165 + BUG-203 bundle** — 2 files, ~18 lines (ExpenseSetupPanel + expenseService)

Plans for CR-098 and CR-099 already exist — skip to Gate 4 GO for those.

---

## Credentials

| Account | Email | Password | Use For |
|---|---|---|---|
| Palm House (owner) | `owner@palmhouse.com` | `Qplazm@10` | CR-056 (has show_scan_popup) |
| Kunafa Mahal (owner) | `owner@kunafamahal.com` | `Qplazm@10` | CR-062, BUG-164/165/203 (expense curls) |
| Kashi Sweets (owner) | `owner@kashisweetsnsnacks.com` | `Qplazm@10` | BUG-237/238 (recipe form) |
| Pav (vishal) | `vishal@pav.com` | `Qplazm@10` | OrderCard testing (CR-098/099) |

---

## Key Files Reference

| File | Lines | What's There |
|---|---|---|
| `api/transforms/orderTransform.js` | L112-158 | Item transform — needs `itemCode` (CR-098) |
| `components/cards/OrderCard.jsx` | L659/734/779 | Item rows — needs short code + time (CR-098/099) |
| `components/order-entry/OrderEntry.jsx` | L64-91, L531, L1653 | adaptProduct, search filter, item pills (CR-098) |
| `api/transforms/profileTransform.js` | L126+ (features), L370+ (settings) | Needs `showScanPopup` mapping (CR-056) |
| `pages/DashboardPage.jsx` | L1613 | `<ScanOrderPopOut>` — needs conditional gate (CR-056) |
| `pages/RestaurantSettingsPage.jsx` | ~L513 (Step 4) | Needs toggle for scan popup (CR-056) |
| `components/expense/ExpenseSetupPanel.jsx` | L458-496 | Delete impact flow, addCategory, addItem guards (BUG-164/165/203) |
| `api/constants.js` | L441 area | Needs EXPENSE_AGGREGATION constant (CR-062) |

---

## Control Docs

- Agent prompt: `/app/memory/control/AGENT_PROMPT_ALPHA.md`
- Registry: `/app/memory/control/registry.json`
- CR Registry: `/app/memory/control/CR_REGISTRY.md`
- Bug Tracker: `/app/memory/control/BUG_TRACKER.md`
- File Ownership: `/app/memory/control/FILE_OWNERSHIP.md`
- Backend Brief: `/app/memory/briefs/BACKEND_BLOCKERS_BRIEF_2026_07_22.html`

---

## DO NOT touch anything outside these 7 items. No new intake. No investigation. Validate → Plan → await GO → Code.
