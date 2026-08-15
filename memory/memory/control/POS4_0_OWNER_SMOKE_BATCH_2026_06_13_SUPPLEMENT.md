# POS 4.0 — Owner Smoke Batch (Gate 6) — Supplement: June 12-13 Items

**Created:** 2026-06-13 (CLOSURE agent gap audit backfill)
**Supplements:** `POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md` (S-1 through S-9)
**Rule:** Every item below must be marked PASS (or owner-attested) before the POS 4.0 baseline can be frozen.
**Creds:** owner@welcomeresort.com / owner@palmhouse.com — `Qplazm@10` (preprod.mygenie.online).
**Smoke completed:** 2026-06-13 — ALL 10 items PASS. Owner verified.

---

| # | Item | Priority | What to verify | Result |
|---|------|----------|----------------|--------|
| S-10 | **BUG-132 Settlement formula fix** | **P1 (money)** | Settlement panel: (1) "Expected" KPI = Total Funds minus Settled (NOT subtracting pilferage). (2) Pilferage column shows real backend value (not 0). (3) New "Total Funds" KPI card present (6th card). (4) Waiter rows: Expected = waiter's total funds minus waiter's settled. Login as Welcome Resort, open Settlement, verify numbers match backend reality. | ✅ PASS (2026-06-13) |
| S-11 | **CR-039 Credit Total Wire** | **P1 (money)** | Credit Management panel: (1) "Total Credit" KPI tile shows real value from API (not hardcoded). (2) "Total Paid" KPI tile shows real value. (3) Portfolio export runs instantly (no N+1 API calls per customer). Login as Welcome Resort (has credit/TAB history). | ✅ PASS (2026-06-13) |
| S-12 | **BUG-133 Check In item filter** | **P1 (money)** | Open any Insights report (Dashboard, Order Ledger, Item Sales, Sales, etc.) for Welcome Resort with date range covering rooms. Verify: zero "Check In" items anywhere. Previously 118 items = ~₹1.5L phantom revenue. Check all 8 report surfaces. | ✅ PASS (2026-06-13) |
| S-13 | **CR-037 Remove Popular Items** | **P2** | (1) Boot the app — no "Popular" or "popular-items" API call in Network tab. (2) Order Entry: no "Popular" tab in category panel. Boot time should be ~8s faster. | ✅ PASS (2026-06-13) |
| S-14 | **CR-038 Boot Retry Policy** | **P2** | Force a boot failure (disconnect network or use bad creds). Verify: (1) "Attempt 1 of 3" counter visible. (2) After 3 failures: retry button disabled + "Contact support" message. (3) Counter is global (doesn't reset between retries). | ✅ PASS (2026-06-13) |
| S-15 | **CR-040 Sidebar Rename Labels** | **P3** | Sidebar under Insights: labels read "Daily Report" (not "All Orders Report"), "Daily Summary" (not "Order Summary"), "Daily Room Report" (not "Room Orders Report"). X/Y/Z Report entries completely removed. | ✅ PASS (2026-06-13) |
| S-16 | **CR-042 Item Ledger rename** | **P3** | Sidebar + page header: "Item Ledger" replaces "Items & Menu". Export file title also says "Item Ledger". Audit tab header updated. | ✅ PASS (2026-06-13) |
| S-17 | **BUG-131 Sidebar bottom sticky** | **P2** | Open sidebar. Scroll the nav section up/down. Verify: bottom actions (Ringer, Refresh, User, Logout) remain pinned at the bottom — they do NOT scroll away. | ✅ PASS (2026-06-13) |
| S-18 | **CR-044 Insights Shared Cache** | **P1 (perf)** | Navigate to any Insights report (e.g., Dashboard). Wait for load. Then navigate to another report (e.g., Order Ledger) with SAME date range. Verify in Network tab: NO new `order-logs-report` API call — data comes from cache. Change date range → API call fires (cache miss). Logout → login as different restaurant → verify ZERO data from previous restaurant (security). | ✅ PASS (2026-06-13) |
| S-19 | **CR-045 Field Stripping** | **P2 (perf)** | Open any Insights report. In Network tab, check the response size of `order-logs-report`. Compare mental model of response payload — unused fields (like full order_details_table nested arrays) should be stripped from the JS objects in memory (response itself still comes from backend unchanged — stripping is FE-side). Verify reports still display correctly with no missing data. | ✅ PASS (2026-06-13) |

---

**All S-10 through S-19 PASSED. Combined with S-1→S-9 PASS → sprint freeze can proceed.**
