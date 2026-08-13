# Impact Analysis — Session 2026-06-12 (10 Items)

**Created:** 2026-06-12
**Scope:** CR-037 through CR-042 + BUG-130 through BUG-133

---

## 1. File-Level Overlap Matrix

| File | CR-037 | CR-038 | CR-039 | BUG-130 | CR-040 | CR-041 | CR-042 | BUG-131 | BUG-132 | BUG-133 |
|------|--------|--------|--------|---------|--------|--------|--------|---------|---------|---------|
| **Sidebar.jsx** | | | | | ✅ | ✅ | ✅ | ✅ | | |
| **LoadingPage.jsx** | ✅ | ✅ | | | | | | | | |
| **constants.js** | ✅ | | | | | | | | | |
| **MenuContext.jsx** | ✅ | | | | | | | | | |
| **OrderEntry.jsx** | ✅ | | | | | | | | | |
| **CategoryPanel.jsx** | ✅ | | | | | | | | | |
| **productService.js** | ✅ | | | | | | | | | |
| **productTransform.js** | ✅ | | | | | | | | | |
| **useRefreshAllData.js** | ✅ | | | | | | | | | |
| **creditService.js** | | | ✅ | | | | | | | |
| **CreditManagementPanel.jsx** | | | ✅ | | | | | | | |
| **StatusConfigPage.jsx** | | | | ✅ | | | | | | |
| **DashboardPage.jsx** | | | | ✅ | | ✅ | | | | |
| **ChannelColumnsLayout.jsx** | | | | ✅ | | | | | | |
| **profileTransform.js** | | | | ✅ | | | | | | |
| **SettlementPanel.jsx** | | | | | | | | | ✅ | |
| **SettlementReportMockup.jsx** | | | | | | | | | ✅ | |
| **settlementService.js** | | | | | | | | | ✅ | |
| **settlementReportService.js** | | | | | | | | | ✅ | |
| **insightsService.js** | | | | | | | | | | ✅ |
| **reportTransform.js** | | | | | | | | | | ✅ |
| **orderLedgerService.js** | | | | | | | | | | ✅ |
| **ItemSalesHybridMockup.jsx** | | | | | | | ✅* | | | ✅ |
| **App.js** | | | | | ✅ | ✅ | | | | |

*CR-042: only if page header echoes sidebar label

---

## 2. Natural Groupings (by file overlap + logical dependency)

### PHASE 1 — "Sidebar Sweep" (4 items, 1 file primary)
**CR-040 + CR-042 + BUG-131 + CR-041 (investigation only)**

All touch `Sidebar.jsx`. Do them in one pass:

| Item | Change | Effort |
|------|--------|--------|
| **CR-040** | Rename 3 labels + remove 3 X/Y/Z children | ~10 min, 6 lines |
| **CR-042** | Rename "Items & Menu" → "Item Ledger" | ~2 min, 1 line |
| **BUG-131** | Sticky bottom section — the `<div className="p-4">` at L529 needs to be outside the `overflow-y-auto` container. Currently: `<nav flex-1 overflow-y-auto>` scrolls menu, then bottom div is AFTER it (already correct structure with `flex-col` on parent `aside`). **Investigation result: the layout is actually correct** — `aside` is `h-screen flex flex-col`, `nav` is `flex-1 overflow-y-auto`, bottom `div` is after nav. The bottom SHOULD already be sticky. Need to verify if some parent CSS is breaking this, or if it's a panel-overlay issue (e.g., when Menu Management panel is open, sidebar gets squished). | ~30 min investigation + CSS fix |
| **CR-041** | Investigation only — catalogue all nav patterns, no code | ~45 min investigation, 0 code |

**Files:** `Sidebar.jsx` (primary), `App.js` (remove X/Y/Z routes if they exist — they DON'T, already verified), `ItemSalesHybridMockup.jsx` (header rename if needed)

**Risk:** LOW — label changes + CSS fix. No data/payload impact.

---

### PHASE 2 — "Boot Optimization" (2 items, 1 file primary)
**CR-037 + CR-038**

Both touch `LoadingPage.jsx`. Do them in one pass:

| Item | Change | Effort |
|------|--------|--------|
| **CR-037** | Remove `loadPopularFood` function (L461-476), remove from `loaderMap` (L506), remove from `API_LOADING_ORDER` (constants.js L288), remove `setPopularFood` dispatch (L569), remove from `MenuContext.jsx` (state + callback + context value), remove from `OrderEntry.jsx` (L51, L525-527), remove "Popular" from `CategoryPanel.jsx` (L10), remove `getPopularFood` + `getPopularProducts` from `productService.js`, remove `popularFoodResponse` from `productTransform.js`, remove `POPULAR_FOOD` endpoint from `constants.js`, remove from `useRefreshAllData.js` (L30). | ~30 min, 8 files |
| **CR-038** | Add `retryCount` state, increment in `handleRetry`, disable button + show "Contact support" at count ≥ 3, show "Attempt N of 3" text. | ~20 min, 1 file |

**Files:** `LoadingPage.jsx`, `constants.js`, `MenuContext.jsx`, `OrderEntry.jsx`, `CategoryPanel.jsx`, `productService.js`, `productTransform.js`, `useRefreshAllData.js`

**Risk:** LOW — CR-037 is all removals, CR-038 is additive UI state. No financial/payload impact.

---

### PHASE 3 — "Credit Total Wire" (1 item, 1-2 files)
**CR-039**

Standalone — no file overlap with anything else:

| Item | Change | Effort |
|------|--------|--------|
| **CR-039** | Change `getTabCustomerList()` in `creditService.js` to return top-level totals from `res.data`. Update `CreditManagementPanel.jsx` to destructure new shape. | ~20 min, 2 files |

**Open dependency:** Need to verify exact field names from `tap-waiter-list` API response (`total_credit`/`total_paid` vs `total_tap_credit_amount`/`total_tap_debit_amount`). Can curl-probe during implementation.

**Risk:** LOW — additive data wiring, existing Outstanding tile unaffected.

---

### PHASE 4 — "Investigation-Only Items" (3 items, 0 code)
**BUG-130 + BUG-132 + BUG-133**

All require deep investigation before any code. No file overlap between them. Can investigate in parallel:

| Item | Investigation | Effort |
|------|---------------|--------|
| **BUG-130** | Trace channel visibility chain: `settings-list` API → `profileTransform.js` → `StatusConfigPage.jsx` → `DashboardPage.jsx` → `ChannelColumnsLayout.jsx` → localStorage. Compare what restaurant settings API returns vs what profile API returns vs what StatusConfig reads. | ~1-2 hours |
| **BUG-132** | Settlement report: check `get-settlement-report` API response, verify date/business-day boundary, check `SettlementReportMockup.jsx` vs `SettlementPanel.jsx` (two different surfaces). Cross-ref CR-015/CR-016. | ~1-2 hours |
| **BUG-133** | "Check In" item in reports: already filtered in `productTransform.js:48` and `orderTransform.js:278,1763` and `categoryTransform.js:37`. Need to check which report services DON'T have the filter: `insightsService.js`, `reportTransform.js`, `orderLedgerService.js`, `roomOrdersService.js`, `foodCourtService.js`. | ~1 hour |

**Risk:** N/A — investigation only, no code changes.

---

## 3. Recommended Execution Order

```
PHASE 1: Sidebar Sweep (CR-040 + CR-042 + BUG-131 + CR-041 investigation)
   ↓  (quick wins, all in one file, no dependencies)
PHASE 2: Boot Optimization (CR-037 + CR-038)
   ↓  (medium scope, 8 files but all removals + simple add)
PHASE 3: Credit Total Wire (CR-039)
   ↓  (standalone, needs API probe)
PHASE 4: Investigations (BUG-130, BUG-132, BUG-133)
   ↓  (deep dives, no code, results feed future implementation CRs)
```

**Rationale:**
- Phase 1 first: highest bang-for-buck (4 items closed, single file, visual impact)
- Phase 2 second: 8.6s boot improvement is user-facing performance win
- Phase 3 third: standalone, quick, but needs API verification
- Phase 4 last: investigations produce findings, not shipped code — can be done whenever

---

## 4. Total Effort Estimate

| Phase | Items | Est. Time | Code Files | Risk |
|-------|-------|-----------|------------|------|
| 1 | 4 | ~1.5 hours | 2-3 | LOW |
| 2 | 2 | ~1 hour | 8 | LOW |
| 3 | 1 | ~30 min | 2 | LOW |
| 4 | 3 | ~4 hours (investigation) | 0 | N/A |

**Total: ~7 hours** (3 hours code, 4 hours investigation)

---

## 5. Dependency Map

```
CR-040 ──┐
CR-042 ──┤── PHASE 1 (Sidebar.jsx)   ── no dependencies
BUG-131 ─┤
CR-041 ──┘

CR-037 ──┤── PHASE 2 (LoadingPage.jsx + 7 files) ── no dependencies
CR-038 ──┘

CR-039 ──── PHASE 3 (creditService.js)  ── needs API curl-probe

BUG-130 ─┐
BUG-132 ─┤── PHASE 4 (investigation)   ── findings may spawn new CRs
BUG-133 ─┘
```

No cross-phase dependencies. Phases can technically run in any order, but the recommended sequence optimizes for quick visible wins first.

---

*Impact Analysis — 2026-06-12. All 10 items assessed.*
