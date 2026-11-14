# QA Handover — BUG-368 Split Bill Reprint Fix
**Date:** 2026-09-02
**Implementation agent:** IMPLEMENTATION role
**Status:** IMPLEMENTED — ready for QA

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|---|---|---|---|
| E1-a–e | `OrderReportBetaPage.jsx:304–320` | Path4 empty-array guard + `Array.isArray(raw)` + `rawOrderDetails?.length` | ✅ PASS — logic trace verified |
| E2-a–e | `AllOrdersReportPage.jsx:830–854` | Parity fix — identical pattern | ✅ PASS — logic trace verified |
| Compile | Both files | `webpack compiled successfully` | ✅ PASS — 0 new warnings |
| Code markers | Both files | `// BUG-368` present | ✅ PASS — confirmed grep |

**Self-test: 5/5 scenarios PASS** (see python trace output)

---

## 2. Test Cases

| # | Test | Steps | Expected | Severity if fail |
|---|---|---|---|---|
| **T1** | Reprint partial-payment order (primary) | Login → Orders (Beta) → find order `000301` (Partial, ₹242) → click **Reprint** | `"Bill request sent"` toast fires. No error toast. | **BLOCKER** |
| **T2** | Reprint partial-payment — All Orders | Login → All Orders report → find a settled `partial` order → click Reprint icon | `"Bill request sent"` toast. No error. | **BLOCKER** |
| **T3** | Reprint normal (non-split) settled order | Login → Orders (Beta) → find any `cash` or `upi` settled order (f_order_status=6) → click Reprint | Still works — `"Bill request sent"` toast | **BLOCKER** (regression) |
| **T4** | Cancelled order — no Reprint button | Login → Orders (Beta) → find a cancelled order (status=Cancel) | Reprint button does NOT appear | MINOR |
| **T5** | Unpaid order — no Reprint button | Login → Orders (Beta) → find an Unpaid order | Reprint button does NOT appear | MINOR |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | `CollectBillPanelDrawer` still reprints normally | Uses same `SINGLE_ORDER_NEW` endpoint; our change is in a different handler. Verify no cross-impact. |
| R2 | AllOrdersReportPage Reprint on a non-split order | `handlePrintBillFromAudit` modified — must confirm normal orders unaffected |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-368
Status: IMPLEMENTED — Awaiting QA
Sprint: pos_5_1
EXIT GATE: ALL 5 PASSED
  □1 ✅ Registry: BUG-368 → IMPLEMENTED, sprint_key: pos_5_1
  □2 ✅ BUG_TRACKER.md: IMPLEMENTED — Awaiting QA
  □3 ✅ FILE_OWNERSHIP.md: both files listed under BUG-368 2026-09-02
  □4 ✅ Code markers: // BUG-368 in both modified files
  □5 ✅ Compile: webpack compiled successfully, 0 new warnings
```

---

## 5. Credentials + Environment

| Field | Value |
|---|---|
| URL | https://react-app-deploy-8.preview.emergentagent.com |
| Account | owner@ruby.com / *** (see test_credentials.md) |
| Restaurant | uat Ruby (id 672) |
| Test order | `restaurant_order_id = 000301`, internal `order_id = 1232186`, payment=partial |
| Report path | Sidebar → Orders (Beta) → date 2026-09-01 |

---

## 6. Files Changed

| File | Lines changed |
|---|---|
| `src/pages/reports-module/OrderReportBetaPage.jsx` | 304–320 (handleReprint unwrap chain) |
| `src/pages/AllOrdersReportPage.jsx` | 830–854 (handlePrintBillFromAudit unwrap chain) |
