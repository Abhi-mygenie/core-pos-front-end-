# QA Handover — BUG-756-B
## `handlePrintBillFromBeta`: Print Bill from Order Beta Collect Drawer

**Date:** 2026-11-27
**Branch:** `20261127_171508`
**EXIT GATE:** 5/5 PASS

---

## 1. Inherited from Plan (Verification Matrix)

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E1 | `OrderReportBetaPage.jsx` L436 | `resp.data?.data` → multi-fallback unwrap | ✅ Code verified — `resp.data?.data` absent from file |
| E2 | `OrderReportBetaPage.jsx` L454 | `printOrder(items,agents,opts)` → correct signature | ✅ Code verified — old call absent from file |
| guard-1 | L446 | `if (!raw \|\| Array.isArray(raw))` added | ✅ Present |
| guard-2 | L451 | `if (!order?.rawOrderDetails?.length)` added | ✅ Present |
| markers | L436, L454 | `// BUG-756-B E1` and `// BUG-756-B E2` | ✅ Both present |
| webpack | — | 0 new warnings | ✅ "webpack compiled with 1 warning" (pre-existing allDays only) |

---

## 2. Manual Test Cases (browser required — preprod.mygenie.online)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Print Bill no longer fails with "No order data" | Login pms@macha.com → Order Report Beta → find PayLater row → click Collect → click Print Bill | No "No order data" toast. Toast reads "Bill request sent" |
| V2 | print-bill API called with correct order_id | V1 + open Network tab → watch for print-bill request | Payload contains `order_id: <integer>` (not NaN, not undefined) |
| V3 | print-bill API uses bill type (not KOT) | V2 continued → inspect payload | `print_type: "bill"` present |
| V4 | Printer receives job | V1 continued — physical printer or printer agent logs | Bill job delivered |
| V5 | Reprint (handleReprint) regression | Same page → find a Paid row → click Reprint | Still works; "Bill request sent" toast |
| V6 | Collect-pay flow unaffected | PayLater → Collect → pay Cash → no regression | Payment succeeds normally |
| V7 | AllOrders print unaffected | AllOrders page → Collect → Print Bill | Still works |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | `handleReprint` (OrderReportBetaPage L383) works | Same file; edit is at L432–462, disjoint |
| R2 | `handlePrintBillFromAudit` (AllOrdersReportPage L832) works | Different file; zero changes |
| R3 | Dashboard Collect Bill unaffected | Does NOT use CollectBillPanelDrawer |
| R4 | No new webpack warnings | Pre-existing allDays warning only |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-756-B → GATE_5A_IMPLEMENTED 2026-11-27, sprint_key: dec_sprint
EXIT GATE: 5/5 PASS
  1. Registry ✅
  2. BUG_TRACKER.md ✅
  3. FILE_OWNERSHIP.md ✅
  4. Code markers ✅ (E1 + E2)
  5. Webpack ✅ (0 new warnings)
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | https://genie-core-pos-2--0px7nr5e.preview.emergentagent.com |
| API | https://preprod.mygenie.online/ |
| Test account | pms@macha.com / Qplazm@10 (RID 69) |
| Alt account | owner@palmhouse.com / Qplazm@10 (RID 541) |
| Branch | `20261127_171508` |
