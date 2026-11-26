# QA Handover — CR-503 (Order Beta: Pay Later — Print Bill + Collect Payment Actions)

**Date:** 2026-11-25 · **Risk:** HIGH · **Sprint:** nov_cr_batch
**File:** `src/pages/reports-module/OrderReportBetaPage.jsx`

---

## 1. Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | OrderReportBetaPage.jsx:23 | `import CollectBillPanelDrawer` — CR-503 | ✅ confirmed L23 |
| E2 | OrderReportBetaPage.jsx:285 | Collect Bill state management for Hold/Credit rows — CR-503 | ✅ confirmed L285 |
| E3 | OrderReportBetaPage.jsx:414-416 | `setCollectBillTarget({ ...row, id: row.order_id, ... })` handler — CR-503 | ✅ confirmed L414-416 |
| E4 | OrderReportBetaPage.jsx:825-826 | `{hasPermission('clear_payment') && (payment === 'paylater' \|\| fos===8\|\|9) && <Collect button>}` — CR-503 + CR-515 gate | ✅ confirmed L825-826 |

Compile: webpack clean.

---

## 2. Browser Test Cases

**Requires:** A Hold or Pay-Later order on Palmhouse (order with payment_method = 'paylater' / f_order_status = 8 or 9).

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Hold tab shows Collect | Orders (Beta) → Hold tab | Rows with payment_method = 'paylater' show a "Collect" button in Actions column |
| T2 | Collect button opens drawer | Click "Collect" on a Hold/Pay-Later row | CollectBillPanelDrawer slides in with the order pre-loaded |
| T3 | Settlement completes | Complete payment in CollectBillPanelDrawer | Order moves from Hold → Settled; row disappears from Hold tab |
| T4 | Print Bill in drawer | In CollectBillPanelDrawer → click Print Bill | Bill prints successfully |
| T5 | Collect hidden without clear_payment | Login as testwait (HAS clear_payment) → Hold tab | Collect visible. Login as a user WITHOUT clear_payment → Collect hidden |
| T6 | Credit tab: Collect on credit rows | Credit tab → credit row | Collect button also present (CR-526-related, same code path) |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Settled orders unaffected | Collect button only renders for paylater/fos=8,9 — not for settled rows |
| R2 | Change + Unpaid buttons unaffected | Collect is additive, CR-503 didn't modify Change/Unpaid logic |
| R3 | AllOrdersReportPage Collect unaffected | Separate component; CR-503 only touched OrderReportBetaPage |

---

## 4. Registry Sync Confirmation

Registry: CR-503 → GATE_5A_IMPLEMENTED · Sprint: TBD (retroactive 2026-11-16) ✅

---

## 5. Credentials + Environment

| Account | Password | Use |
|---|---|---|
| owner@palmhouse.com | Qplazm@10 | Primary — place a Hold order if none exist |
| testwait@thepalmhouse.com | Qplazm@10 | T5 — verify clear_payment shows Collect |

**Note:** To create a Hold/Pay-Later order: Order Entry → place order → Collect Bill → choose "Pay Later / Hold" payment option. This creates a fos=8/9 order. Then go to Order Beta → Hold tab to verify the Collect button appears.
