# Batch Intake — 2026-11-19 — Investigation Findings (INTAKE role)

**Source investigations:**
- `investigations/INV-5ISSUES-2026-11-18.md`
- `investigations/INV-PAYLATER-VAT-LM-2026-11-18.md`
- `investigations/INV_DATEFMT_CR523_CR515_2026_11_19.md`

**Sprint:** nov_cr_batch · **Assignee:** Abhishek · **Client:** ALL · **Status:** GATE_1_INTAKE
All items read-only investigated; no code written. IDs assigned sequentially (BUG-703 / CR-552 were the prior max).

---

## New items registered (9 BUG + 1 CR)

| ID | Type | Pri | Risk | Area | Title | OG ref |
|---|---|---|---|---|---|---|
| BUG-704 | BUG | P2 | LOW | Reports / Analytics | Item Sales Ledger — 'Last Month'/'FY' preset not persistent across navigation | OG-PAYL-003 |
| BUG-705 | BUG | P1 | MEDIUM | Payments / Coupons / Credit | Order Beta PayLater Collect shows only Cash/UPI/Card | OG-PAYL-001 |
| BUG-706 | BUG | P2 | MEDIUM | Payments / Coupons / Credit | Order Report Beta — VAT amount mislabelled 'GST' | OG-PAYL-002 |
| BUG-707 | BUG | P2 | LOW | Reports / Analytics | Cancellation Report — date/time format inconsistent | OG-DATE-001 |
| BUG-708 | BUG | P1 | LOW | Reports / Analytics | Cancellation Report — staff cancel-note column always '—' | OG-INV5-002 |
| BUG-709 | BUG | P1 | MEDIUM | Reports / Analytics | Audit Log — 'Make Unpaid' event missing after order cancelled (backend) | OG-INV5-004 |
| BUG-710 | BUG | P2 | MEDIUM | Payments / Coupons / Credit | Reports — discount applied after bill print not reflected | OG-INV5-005 |
| BUG-711 | BUG | P0 | CRITICAL | Permissions / Security | Order Report Beta — Reprint prints bill WITHOUT print_icon | OG-CR515-001 |
| BUG-712 | BUG | P0 | MEDIUM | Menu / Order Entry | Customer name not persisted/returned on order (CR-523 follow-up) | OG-CR523-001 |
| CR-553 | CR | P2 | MEDIUM | Permissions / Security | Require print_icon (plus clear_payment) to print bill during Collect | OG-CR515-002 |

---

## Per-item detail

### BUG-711 — Reprint without print_icon (P0, CRITICAL)
- **Symptom:** A role with no bill-print rights can still reprint bills from the Order Report (Beta).
- **Root cause:** `OrderReportBetaPage.jsx` L779 gates Reprint only by `row.f_order_status===6`; missing `hasPermission('print_icon')`. `handleReprint` → `printOrder('bill')`. Sibling actions (update_payment L753, order_unpaid L763, clear_payment L814) ARE gated.
- **Fix:** add `hasPermission('print_icon') &&` to L779. 1 file, 1 line. Planning-skip eligible.

### BUG-712 — Customer name not captured (P0, CR-523 follow-up)
- **Symptom:** Customer name not sticking; phone persists, name blank on reopen (owner screenshot, order #015925).
- **Analysis:** FE save path verified correct (`saveCustomerToServer` POSTs `f_name` to `user-check-create`; guard `effectiveTable.orderId = placedOrderId||table.orderId` passes). Rehydration reads `orderData.customerName ← api.user_name / user.f_name` → returns blank → **backend read-back gap**.
- **Next:** live read-only `SINGLE_ORDER` probe on a customer-linked order; likely backend brief.

### BUG-705 — PayLater methods restricted (P1)
- `CollectBillPanelDrawer.jsx` L300 hardcodes `allowedMethods=['cash','card','upi']` (from BUG-042-A), reused by CR-503 → `isHoldContext` hides Split/Credit/To-Room/dynamic. Owner decision A/B.

### BUG-706 — VAT labelled GST in Order Beta (P2)
- `OrderReportBetaPage.jsx` hardcodes 'GST' (L501/L699/L881); `profileTransform` has no `taxType`; backend sends VAT in `gst_amount`. Fix spans 2 files; backend confirm `tax_type`.

### BUG-704 — LM/FY preset not persistent (P2)
- `ItemSalesLedgerMockup.jsx` `handlePreset` LM branch early-returns before `setSharedFrom/setSharedTo` (L164 vs L175); FY same. Same pattern as BUG-697/698 (Audit page). ~1-line fix each branch.

### BUG-707 — Cancellation date format inconsistent (P2)
- `CancellationsMockup.jsx` raw strings (L736/L954) vs `toLocaleString` (L980). Standardize via a shared formatter (app-wide gap).

### BUG-708 — cancelNote always '—' (P1)
- `CancellationsMockup.jsx` transform never maps `cancelNote` (render L972). FE add `cancelNote: i.cancel_note`; backend probe for `notes`.

### BUG-709 — Make Unpaid audit event missing (P1, BACKEND)
- `insights-audit` drops `make_unpaid` events once order cancelled. FE filter correct. Backend brief: audit append-only.

### BUG-710 — Discount after print not in report (P2, needs probe)
- FE reads `restaurant_discount_amount` (reportTransform L183). Likely backend not storing discount from collect-bill-after-print. Live probe priti orders.

### CR-553 — Gate Collect-flow bill print by print_icon (P2, owner decision)
- Collect-Bill prints a bill gated by `clear_payment` only. Decide whether `print_icon` should also be required.

---

## Related existing items (NOT re-filed)
- **BUG-673** (keyboard auto-select): INV-5ISSUES I-3 found the shipped fix is INCOMPLETE (dep `filteredItems.length` not `filteredItems`; no-`itemCode` → index 0). Note appended to BUG-673; re-open candidate (OG-INV5-003).
- **OG-CR515-003** (dashboard Print/Re-Print visible): code shows both ARE gated by `print_icon`; NOT registered as a bug — needs a live probe of the specific no-print role's permissions.

---
*INTAKE role. No code written. No remote push (owner directive).*
