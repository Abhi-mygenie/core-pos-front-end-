# QA Handover — CR-100 — Smart Purchase Partial Payment
**Date:** 2026-08-08 | **Role:** IMPLEMENTATION → QA

---

## 1. Inherited Verification Matrix (Self-Test Results)

| Edit | File | Change | Self-Test |
|---|---|---|---|
| E1 | `inventoryTransform.js` | `payment_type` enum, `partial_payments[]`, notes dropped | ✅ code traced — `data.paymentType→payment_type`, splits→`payment_mode/amount/transaction_id` |
| E2 | `SmartPurchasePanel.jsx` | `validate()` — split sum + type check loop | ✅ logic traced — type missing / splits missing / sum mismatch all return correct errors |
| E3 | `SmartPurchasePanel.jsx` | `handleSubmit()` — `paymentType+splits` replaces `paymentMethod+notes` | ✅ `pmData.type` + `pmData.splits` passed correctly to service |
| E4 | `GroupedVendorPreview.jsx` | Full rewrite — Paid/Partial/Unpaid tabs + split rows | ✅ webpack compiled successfully, lint clean |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | No payment type → blocks submit | Add item, enter rate, skip payment tabs → Submit | Toast: "Select a payment type for \<vendor\>" |
| T2 | Paid — no method selected | Click Paid tab, leave Method as "Method…" → Submit | Toast: "Select a payment mode for all rows for \<vendor\>" |
| T3 | Partial — sum mismatch blocks | Click Partial, Cash ₹50 + Card ₹50 on ₹200 PO → Submit | Toast: "Payment ₹100.00 ≠ PO total ₹200.00 for \<vendor\>" |
| T4 | Partial — balanced → submits | Cash ₹100 + Card ₹100 on ₹200 PO → Submit | Network: `payment_type:"partial"`, `partial_payments:[{payment_mode:"Cash",amount:100},{payment_mode:"Card",amount:100}]`. No `notes`. |
| T5 | Partial — with ref ID | Card row: type `CARD-TXN-8821` in Ref ID → Submit | Network: `partial_payments[1].transaction_id:"CARD-TXN-8821"` |
| T6 | Partial — no ref ID | Cash row: leave Ref ID blank → Submit | Network: no `transaction_id` key on that row |
| T7 | Paid single → submits | Click Paid, select Cash (amount auto=subtotal) → Submit | Network: `payment_type:"paid"`, `partial_payments:[{payment_mode:"Cash",amount:<subtotal>}]` |
| T8 | Unpaid → submits | Click Unpaid → Submit | Network: `payment_type:"unpaid"`, `partial_payments:[]`. Red credit notice visible. |
| T9 | Add / remove split rows | Partial → click "Add payment row" × 2 → 3 rows. Click trash on row 2 → 2 rows. Trash hidden when 1 row only. | UI behaves as described |
| T10 | Live sum indicator | Partial: unbalanced splits → amber ⚠ "needs ₹X". Balance → green ✓ | Indicator colour changes correctly |
| T11 | Type switch behaviour | Paid (Cash ₹200) → switch to Partial → splits preserved. Switch to Unpaid → splits cleared. Back to Paid → 1 new row at subtotal. | As described |
| T12 | Multi-vendor different types | 2 vendors: A=Paid(Cash), B=Unpaid → Submit | Both POs submit. A: `payment_type:"paid"`. B: `payment_type:"unpaid"`. |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Add items + rate entry flow unchanged | Edits only touch submit path |
| R2 | Validation: empty items, zero qty, no vendor still blocked | Earlier validate() checks still intact |
| R3 | Partial-success UX (some vendors fail) shows ok/failed list | handleSubmit loop unchanged |
| R4 | `purchase_items` fields in network payload unchanged | Only payment fields changed in transform |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- CR-100: status → `IMPLEMENTED`, sprint_key → `pos_5_0`
- EXIT GATE: **5/5 PASS**
- Compile: **PASS**

---

## 5. Credentials & Environment

- Account: owner@kunafamahal.com / `***`
- Preview URL: https://pos-app-runner.preview.emergentagent.com
- Path: Login → Inventory → Smart Purchase tab
- Backend: https://preprod.mygenie.online
- Validated endpoint: `POST /api/v2/vendoremployee/inventory/add-purchase`
