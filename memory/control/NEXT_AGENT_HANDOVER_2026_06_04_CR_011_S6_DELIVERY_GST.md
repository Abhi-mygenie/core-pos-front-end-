# Next Agent Handover · 2026-06-04 — CR-011 S6 Order Ledger · Delivery-GST Audit + Subtotal-Drift Resolution

**Project:** MyGenie POS · CR-011 Reports Module · S6 Order Ledger Hybrid
**Session type:** Fork session, 2026-06-04 (Block A audit refinement — delivery-GST rules, location badges, de-dup, backend subtotal-drift root-cause)
**Owner present:** Yes (owner@cafe103.com). All decisions captured verbatim below + in `auditManifest.js` `approvedSource` fields.
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Credentials:** owner@cafe103.com / Qplazm@10 → route `/reports-module/order-ledger` → **Ledger Audit** tab

---

## TL;DR — where things stand

| Item | Status |
|---|---|
| **S6 Order Ledger — Block A audit** | 🟢 **Gate ⑤ in-flight** · Code complete · Owner actively auditing |
| FE-86 mass-firing (the old P0 from 06-03) | ✅ **RESOLVED** (prior fork: `sumItemTax` fix). FE-86 now ~54 real flags on cafe103, not 2069. |
| **NEW: FE-89 Delivery-GST rule (AMBER)** | ✅ Shipped + verified live |
| **NEW: Delivery-GST location badges + FE-88 AMBER downgrade** | ✅ Shipped + verified live |
| **NEW: FE-86 / FE-88 de-dup vs FE-82R** | ✅ Shipped + verified live |
| **Backend subtotal double-count (FE-82R)** | ✅ **ROOT-CAUSED + RESOLVED** — was a backend query that *was not committed*; owner committed it → now correct. |
| Lint / compile | Clean across all S6 files |

S5 Hybrid remains **PARKED** (backend GST bug ESC-3). S6 is the active screen.

---

## What was built / decided this session (2026-06-04)

### 1. FE-89 — Delivery charge GST not applied (AMBER) ✅
Restaurant profile declares a delivery-GST rate (`profile.deliver_charge_gst`, cafe103 = **5%** → `restaurant.deliveryChargeGstPct`). For delivery orders carrying a delivery charge, backend must book `delivery_charge_gst = deliveryCharge × rate%`. It currently arrives as **₹0**. FE-89 flags this **AMBER** (policy gap, self-heals on backfill, ±₹0.02 tolerance).
- Single-line columns added to the bill-math table: **Del. GST (API)** · **Exp. Del. GST** · **Del. GST Drift**.
- Owner directive verbatim: *"1 Amber"*, *"2 just single line then our drift and this column should match"*.

### 2. Delivery-GST location classification + badges + FE-88 AMBER downgrade ✅
The backend is **inconsistent about where it parks the (un-booked) delivery GST**. The engine now classifies and badges it:

| Badge | Meaning | Rule / Severity |
|---|---|---|
| `Del GST → Total` | Delivery GST sits **only inside `order_amount`**, not booked in any GST field → FE-88 total drift == `deliveryCharge × rate%` | **FE-88 RED → AMBER** (self-heals) |
| `Del GST → Header` | Delivery GST **lumped into header `total_gst_tax_amount`** (header tax = item tax + delivery GST), not itemized | **FE-86 RED** |
| `Delivery GST` | API `delivery_charge_gst` ≠ expected (=0) | **FE-89 AMBER** |

Downgrade fires **only** when the drift exactly equals `deliveryCharge × rate%` (±₹0.02), so genuine math breaks stay RED.

### 3. FE-86 / FE-88 de-dup against FE-82R (subtotal double-count) ✅
Owner directive verbatim: *"this is already highlighted red in subtotal drift so we don't need these orders here"* + *"supress"*.
When an order is **already RED in FE-82R** (delivery charge double-counted in `order_sub_total_without_tax`):
- Its **FE-86** `Del GST → Header` flag is suppressed (gate: `delGstInHeader && fe82rFired`) — the header GST is actually correct (`5% × (items + delivery)`), so it's not a real GST bug.
- Its **FE-88** flag is suppressed (gate: `fe82rFired`) — FE-88's expected total is built on the wrong subtotal, so its drift is just the subtotal error resurfacing.
- The order stays RED **only in FE-82R** (the single root cause) + AMBER in FE-89.
- Result on cafe103 (May 1–Jun 4): RED dropped **145 → 117** (−13 FE-86, −15 FE-88); zero AMBER/genuine flags lost.

### 4. Backend subtotal double-count — ROOT-CAUSED + RESOLVED ✅
Investigation (orders #011949, #010658, #011218, #010815, #010542, #010447 etc.):
- The frontend renders the API **faithfully** (verified by calling `order-logs-report` directly with the session token — same values).
- The API's `order_sub_total_without_tax` was inflated (e.g. #011949: 1,080 vs correct 1,030 = delivery counted twice), while **`total_gst_tax_amount` (51.50) and `order_amount` (1,082) were already correct** (computed from the proper ₹1,030 base). So only the stored subtotal field was wrong.
- All affected rows shared a frozen `updated_at = 2026-05-27T13:05:30Z` → no write since the May-27 batch.
- **Owner confirmed: the backend query that corrects the subtotal had not been committed. Owner committed it → now working fine.** FE-82R flags will clear as the corrected `order_sub_total_without_tax` flows through.

---

## Critical engineering notes (read before touching the engine)

- **`TOLERANCE = 0.025`** in `orderLedgerAuditEngine.js` — global financial tolerance. DO NOT revert; it hides expected paise-level API noise on FE-82R/86/88.
- **Frontend renders REAL backend drift.** `orderLedgerService.js` reads native `api.order_amount` (no frontend re-aggregation). If drift "looks worse," it's because we now render the truthful backend value.
- **`auditOrder(o, opts)` / `auditAllOrders(orders, opts)`** take an `opts.deliveryChargeGstPct` — wired from `OrderLedgerMockup.jsx` via `useRestaurant()`. The rate flows from `profileTransform.js` (`deliver_charge_gst` → `deliveryChargeGstPct`).
- **De-dup ordering dependency:** FE-82R is evaluated **before** FE-86 and FE-88 inside `auditOrder`, so `const fe82rFired = flags.some(f => f.ruleId === 'FE-82R')` is reliable. Do not reorder the rule branches.
- **`delGstInHeader`** detection lives in the `tags` block of `auditOrder` and is reused by FE-86. `DEL_GST_HEADER` badge still renders for residual orders that have a correct subtotal (no FE-82R) — intended.

---

## Block A engine — current rule state (cafe103, May 1 → Jun 4, pre backend-commit snapshot)

| Rule | Severity | Meaning | Count |
|---|---|---|---|
| FE-81 | RED | Cancelled order carries tax | 0 ✓ |
| FE-82R | RED | `subTotal = itemTotal − discount + delivery + service + tip` | 15 (backend subtotal double-count — RESOLVING via owner commit) |
| FE-83 | RED | Order has both GST and VAT | 0 ✓ |
| FE-86 | RED | `headerTax = Σ items.tax_amount` (de-dup'd vs FE-82R; `Del GST → Header` subset) | 54 |
| FE-88 | RED/AMBER | `total = subTotal + gst + vat + roundOff` (AMBER for `Del GST → Total` + missing round-off; de-dup'd vs FE-82R) | 772 |
| FE-89 | AMBER | Delivery GST not applied (`delivery_charge_gst = 0`) | 28 |
| FE-84 / FE-85 | POLICY | ₹0 fuzzy tolerance / skip all-zero orders | — |
| FE-82 | REJECTED | (tax is per-item, not order-level) | — |

Headline after de-dup: **RED 117 / AMBER 752**.

---

## Action items for next agent (priority order)

### 🟡 P1 · Tab labels final rename — STILL PENDING (owner said *"wait"*)
Placeholders today: **"Audit"** (reconciliation) + **"Ledger Audit"** (Block A). Owner deferred — *do not rename without owner-approved names.* Ask owner when audit phase wraps.

### 🟡 P1 · FE-86 "Preparing" (fStatus=1) exclusion — DEFERRED (owner *"wait we are still auditing"*)
Active/preparing orders have incomplete `order_details_table` → false GST-rollup flags. Owner chose NOT to suppress while auditing (wants flags visible). Revisit on owner GO.

### 🟡 P1 · Aggregator predicate extension (zomato_gold)
cafe103 marks Zomato Gold via `payment_method='zomato_gold'`. Extend `TAB_FILTERS.aggregator` in `OrderLedgerMockup.jsx`:
```js
aggregator: (o) =>
  ['zomato','swiggy'].includes((o.orderIn||'').toLowerCase()) ||
  ['zomato_gold','zomato','swiggy','swiggy_dineout'].includes((o.paymentMethod||'').toLowerCase()),
```

### 🟢 P2 · Block B/C rule decisions — owner triage pending.
### 🟢 P2 · Loyalty/coupon discount rules — owner said "add later".

### 🔵 Backlog (backend — auto-resolve, no FE action)
- `order_sub_total_without_tax` double-count → **owner committed fix** (FE-82R clearing).
- `delivery_charge_gst` field = 0 → backfill resolves FE-89 + `Del GST → Total` AMBER.
- `round_up` field missing → backfill resolves the remaining FE-88 round-off AMBER.
- ESC-3 (cancelled financials not reverted) → blocks S5 Hybrid unpark.

---

## Files touched this session (S6 ownership)

| File | Purpose of change |
|---|---|
| `frontend/src/utils/orderLedgerAuditEngine.js` | `auditOrder/auditAllOrders` `opts` param; `delGstInHeader` detection; FE-89 branch; FE-86 `DEL_GST_HEADER` tag + de-dup gate; FE-88 `Del GST → Total` AMBER downgrade + de-dup gate |
| `frontend/src/utils/auditManifest.js` | FE-89 rule registered (AMBER, approved 2026-06-04) |
| `frontend/src/api/services/orderLedgerService.js` | `toLedgerRow` now passes `deliveryChargeGst` (was dropped) |
| `frontend/src/pages/reports-module/OrderLedgerMockup.jsx` | Rate wiring via `useRestaurant()`; Del.GST columns; `DEL_GST_TOTAL` / `DEL_GST_HEADER` badge styles+labels; FE-86/FE-88/FE-89 explainer banners; `RULE_ORDER`/`RULE_LABELS` add FE-89 |

**Read-only inheritance (DO NOT modify):** `AllOrdersReportPage.jsx` (canonical TAB_FILTERS), `reportTransform.js`, `profileTransform.js`, `OrderDetailSheet.jsx`, `reportExporter.js`.

---

## Quick-start for next agent

1. Read this doc + `CONTROL_DASHBOARD.md`.
2. Login owner@cafe103.com / Qplazm@10 → `/reports-module/order-ledger`.
3. Set range **May 1 → Jun 4** → click **Ledger Audit** tab.
4. Confirm: FE-82R (subtotal — should be shrinking as backend fix lands), FE-86 (`Del GST → Header` residuals), FE-88 (`Del GST → Total` AMBER + RED), FE-89 (delivery-GST AMBER).
5. Do NOT add the FE-86 fStatus=1 exclusion or rename tabs without explicit owner GO.
6. Verify backend subtotal fix: call `order-logs-report` for #011949 and confirm `order_sub_total_without_tax` now reads **1,030** (was 1,080).

## Things NOT to do
- Don't revert `TOLERANCE`.
- Don't re-introduce frontend subtotal re-aggregation in `orderLedgerService.js`.
- Don't reorder rule branches in `auditOrder` (FE-82R must precede FE-86/FE-88 for de-dup).
- Don't suppress flags the owner wants visible during the audit phase (fStatus=1 exclusion).
- Don't rename tab labels without owner-approved names.
