# QA Handover — BUG-136 Sidebar Scroll Persistence

**Date:** 2026-06-17
**Items:** BUG-136
**Implementation agent self-test:** 5/5 edits verified
**EXIT GATE:** 5/5 PASS

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| 1 | InsightsCacheContext.jsx:16 | `sidebarScrollTop` state created + provided | PASS ✅ |
| 2a | Sidebar.jsx:18-35 | `useSidebarScroll` hook: navRef + saveScroll + useLayoutEffect restore | PASS ✅ |
| 2b | Sidebar.jsx:350,368,381,398 | `saveScroll()` before all 4 navigate() paths | PASS ✅ |
| 2c | Sidebar.jsx:530 | `ref={navRef}` on `<nav>` | PASS ✅ |
| 3 | 37 report screens | Zero modifications | PASS ✅ |

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Scroll preserved after Insights navigation | Login → Insights → scroll down to Tax/Discount section → click "Discount Report" | Sidebar stays scrolled to same position (Discount Report visible, NOT jumped to top) |
| T2 | Scroll preserved across multiple navigations | From T1 → click "Staff Report" (also below fold) → click "Tax Report" | Each navigation keeps sidebar scroll, active item visible |
| T3 | First load starts at top | Fresh login → navigate to any Insights page | Sidebar starts at scroll position 0 (top) |
| T4 | Logout resets scroll | Scroll down in sidebar → logout → login again → go to Insights | Sidebar starts at top (InsightsCacheContext resets) |
| T5 | Non-Insights navigation unaffected | Dashboard → Orders → Reports → Audit | No errors, sidebar behaves normally |
| T6 | Collapsed sidebar works | Collapse sidebar → navigate between Insights pages → expand | No errors, scroll state independent of collapse |
| T7 | No console errors | Navigate 5+ Insights screens with sidebar scrolled | 0 new console errors |
| T8 | Webpack compiles | Check frontend log | 0 new warnings from BUG-136 |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Login → Dashboard loads | Sidebar renders on initial page |
| R2 | Insights cache still works (CR-044) | BUG-136 adds state to InsightsCacheContext — verify date range sharing still works |
| R3 | Logout clears cache (CR-044 R-8) | `clearInsightsCache()` still called, context resets on provider unmount |
| R4 | Report screens render correctly | Zero report files changed — spot-check 2-3 reports |

## 4. Registry Sync Confirmation

Registry synced: YES
Items: BUG-136
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED

## 5. Credentials + Environment

Account: Use any test account with Insights access (e.g., `cafe103_no_rooms_postpaid_gst` alias)
URL: Preview environment
Login API: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`

---

*QA handover ready. 8 test cases + 4 regression checks.*
