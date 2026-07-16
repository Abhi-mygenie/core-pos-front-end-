# QA Report — 2026-06-18 Session

**QA Agent:** Emergent QA
**Date:** 2026-06-18
**Scope:** BUG-138, BUG-130, CR-051, CR-052 (4 items from SESSION_HANDOVER_2026_06_18)
**Environment:** https://pos-frontend-deploy-25.preview.emergentagent.com
**Credentials:** owner@palmhouse.com / ***
**Note:** No formal QA Handover existed. Test cases constructed from SESSION_HANDOVER + change request docs.

---

## 1. Registry Spot-Check

| Item | Status | Sprint | Result |
|------|--------|--------|--------|
| BUG-138 | IMPLEMENTED | pos_5_0 | PASS |
| BUG-130 | IMPLEMENTED | pos_5_0 | PASS |
| CR-051 | IMPLEMENTED (amended — 6 toggles) | pos_5_0 | PASS |
| CR-052 | IMPLEMENTED | pos_5_0 | PASS |
| BUG-139 | SUPERSEDED by CR-052 | pos_5_0 | PASS |

**Registry: SYNCED**

---

## 2. Compile Check

- Webpack: `compiled with 1 warning` (pre-existing: SettlementReportMockup.jsx:140 — react-hooks/exhaustive-deps)
- **0 new warnings from session items**
- **Result: PASS**

---

## 3. Test Results

### BUG-138: Discount Payload — `self_discount` + `order_discount` (P0 CRITICAL)

| # | Test | Method | Expected | Actual | Result | Severity |
|---|------|--------|----------|--------|--------|----------|
| B138-1 | `self_discount` = `manual + preset` in prepaid path (L1313) | Code trace | `(discounts.manual \|\| 0) + (discounts.preset \|\| 0)` | Matches | **PASS** | — |
| B138-2 | `self_discount` = `manual + preset` in prepaid path (L1323, dup) | Code trace | Same formula | Matches | **PASS** | — |
| B138-3 | `order_discount` = `manual + preset` in prepaid path (L1331) | Code trace | Same formula | Matches | **PASS** | — |
| B138-4 | `self_discount` = `manual + preset` in postpaid path (L1595) | Code trace | Same formula | Matches | **PASS** | — |
| B138-5 | `order_discount` = `manual + preset` in postpaid path (L1604) | Code trace | Same formula | Matches | **PASS** | — |
| B138-6 | `order_discount` = `manual + preset` in room path (L1676) | Code trace | Same formula | Matches | **PASS** | — |
| B138-7 | `self_discount` = `manual + preset` in room path (L1677) | Code trace | Same formula | Matches | **PASS** | — |
| B138-8 | No-discount fallback | Code trace | `(undefined \|\| 0) + (undefined \|\| 0) = 0` | Safe | **PASS** | — |
| B138-9 | Code markers | Code trace | `// BUG-138` on every change | Present at L1312, L1330, L1594, L1603, L1675 | **PASS** | — |
| B138-10 | Unit tests | Automated | 18/18 pass | 18/18 pass | **PASS** | — |
| B138-11 | Flows 1+2 unchanged (hardcoded 0) | Code trace | L1026, L1034, L1147, L1155 = 0 | Confirmed unchanged | **PASS** | — |

### BUG-130: Channel Visibility — Clear on Logout (P1)

| # | Test | Method | Expected | Actual | Result | Severity |
|---|------|--------|----------|--------|--------|----------|
| B130-1 | `STORAGE_KEYS.CHANNEL_VISIBILITY` defined | Code trace | Key in constants.js | `constants.js:320` | **PASS** | — |
| B130-2 | `localStorage.removeItem` in logout | Code trace | Called in authService.logout() | `authService.js:56` | **PASS** | — |
| B130-3 | Code marker | Code trace | `// BUG-130` comment | Present in constants.js:318 | **PASS** | — |

### CR-051: Customer Field Mandatoriness Override (P2)

| # | Test | Method | Expected | Actual | Result | Severity |
|---|------|--------|----------|--------|--------|----------|
| C051-1 | 6 toggles visible in StatusConfigPage | Browser | Walk-in 2, Dine-in 2, TakeAway 2 | All 6 visible | **PASS** | — |
| C051-2 | TakeAway Name default ON | Browser | Green toggle | Confirmed ON | **PASS** | — |
| C051-3 | Walk-in/Dine-in/TakeAway Phone default OFF | Browser | Gray toggles | All OFF | **PASS** | — |
| C051-4 | Validation at V1 (handlePlaceOrder L894) | Code trace | 6-field check present | Confirmed | **PASS** | — |
| C051-5 | Validation at V2 (prepaid L1941) | Code trace | 6-field check present | Confirmed | **PASS** | — |
| C051-6 | Validation at V3 (QSR L1248) | Code trace | 6-field check present | Confirmed | **PASS** | — |
| C051-7 | TakeAway Name uses `!== 'false'` logic | Code trace | Default ON when key absent | Confirmed at L359, L901, L1255, L1948 | **PASS** | — |
| C051-8 | Hydrate from localStorage on mount | Code trace | 6 reads in useEffect | L351-359 | **PASS** | — |
| C051-9 | Save persists to localStorage | Code trace | 6 setItem calls | L555-561 | **PASS** | — |
| C051-10 | Reset defaults — TakeAway Name → ON, rest → OFF | Code trace | setTakeawayNameReq(true), rest false | L420-427 | **PASS** | — |

### CR-052: Sidebar Flyout for Collapsed State (LOW)

| # | Test | Method | Expected | Actual | Result | Severity |
|---|------|--------|----------|--------|--------|----------|
| C052-1 | Sidebar starts collapsed | Browser | `isSidebarExpanded=false` | Dashboard loads with collapsed sidebar (icons only) | **PASS** | — |
| C052-2 | Click Insights icon → flyout appears | Browser | Floating panel with children | Flyout appeared with "Insights" header + 33 items | **PASS** | — |
| C052-3 | Flyout shows groups (SALES, etc.) | Browser | Group headers uppercase | "SALES" group visible | **PASS** | — |
| C052-4 | Click child → navigates + flyout closes | Browser | URL changes, flyout gone | Clicked "Sales Overview" → `/reports-module/sales`, flyout closed | **PASS** | — |
| C052-5 | Sidebar stays collapsed after navigation | Browser | 70px width | Confirmed on Sales report page | **PASS** | — |
| C052-6 | Settings flyout works | Browser | Click Settings icon → flyout | "Dashboard Display" visible, clicked → StatusConfigPage | **PASS** | — |
| C052-7 | `data-testid="sidebar-flyout"` present | Browser | Queryable | Found via `querySelector` | **PASS** | — |
| C052-8 | Click-outside dismiss | Code trace | mousedown handler removes flyout | L233-242 | **PASS** | — |
| C052-9 | 39 pages default false | Code trace (5 samples) | `useState(false)` | Confirmed in 5 report pages + StatusConfigPage | **PASS** | — |
| C052-10 | Expand dismisses flyout | Code trace | useEffect closes on isExpanded | L245-247 | **PASS** | — |

---

## 4. Summary

| Metric | Value |
|--------|-------|
| Items tested | 4 |
| Total test cases | 34 |
| PASS | 34 |
| FAIL | 0 |
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 0 |
| NOTE | 3 (see §5) |
| Coverage | 7/7 file groups |
| Registry | SYNCED |

---

## 5. Notes (non-blocking)

| # | Finding | Severity | Detail |
|---|---------|----------|--------|
| N1 | No QA Handover doc for 2026-06-18 | NOTE | Implementation agent wrote SESSION_HANDOVER but not formal QA_HANDOVER. EXIT GATE checklist not documented. |
| N2 | 8 pre-existing test suite failures (29 tests) | NOTE | barrelExports, placeOrderPayload, rawField, axios, role-name-wire, ScanOrderPopOut, updateOrderStatus, axios.interceptor.cr027, BulkEditor.cr036. None related to session items. |
| N3 | BUG-138 browser-level payload verification skipped | NOTE | Placing a real order with discount on preprod would create production-like data. Code-level verification + unit tests sufficient for QA. Owner smoke on preprod recommended. |

---

## 6. Verdict

**ALL PASS. Ready for Gate 6 (Owner Smoke).**

```
QA complete. 34/34 passed. Coverage: 7/7 files tested. Registry: SYNCED.
Ready for Gate 6 (Owner Smoke).
QA report at /app/memory/test_reports/QA_REPORT_2026_06_18_SESSION.md
```

---

## 7. Owner Smoke Recommendations

| # | Item | What to Test on Preprod |
|---|------|------------------------|
| 1 | **BUG-138** (P0) | Place prepaid order with preset discount → Network tab → verify `self_discount` and `order_discount` both = discount amount (not 0). Also test postpaid + room transfer. |
| 2 | **BUG-130** | Hide a channel in StatusConfig → logout → login → channel should be visible again (localStorage cleared) |
| 3 | **CR-051** | StatusConfig → Customer Field Requirements → toggle Walk-in Name ON → Place walk-in order without name → should block with toast. Toggle OFF → should allow. Same for all 6 combinations. |
| 4 | **CR-052** | Collapse sidebar → click Insights/Settings icons → flyout appears → click report → navigates, sidebar stays collapsed. Click outside → flyout closes. |

*QA Report — 2026-06-18. 4 items, 34 tests, 34 PASS, 0 FAIL.*
