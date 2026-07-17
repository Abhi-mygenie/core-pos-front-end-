# Backend Escalation — Tax / Discount / Service Charge / Delivery Charge NOT REVERTED on Cancelled Orders

**Date:** 2026-06-02
**Priority:** 🔴 **CRITICAL (P0)** — financial accuracy issue affecting every restaurant's reports
**Raised by:** Owner verbatim 2026-06-02: *"if order is cancelled tax, discount service charge delivery charge all has be reverted, this needs to be flagged to back end with critical priority"*
**Filed under:** CR-011-AUDIT-01 / Backend Coordination
**Owner:** POS Backend team
**Reference CR:** CR-011 — Complete Reports Module
**Investigation source:** `/api/v2/vendoremployee/report/order-logs-report` raw payload, Palm House (rid=541), 2026-04-03 to 2026-06-02

---

## 1. Business rule (FROZEN 2026-06-02 by owner)

> **When an order or line is cancelled, ALL of the following financial fields MUST be reverted to ₹0:**
> - **Tax** (`gst_tax_amount` + `vat_tax_amount`)
> - **Discount** (`discount_amount` per line + `order_discount` + `restaurant_discount_amount` + `coupon_discount_amount` per order)
> - **Service Charge** (`service_charge` per line + `service_gst_tax_amount` per order)
> - **Delivery Charge** (`delivery_charge` + `delivery_charge_gst` per order, when order is fully cancelled)

**Current backend behaviour: violates this rule across all 3 cancel-types** (`Order`, `Pre-Serve`, `Post-Serve`).

---

## 2. Evidence (Palm House, last 60 days)

### 2.1 Cancelled-line-level leakage (302 cancelled lines audited)

| Backend `cancel_type` | Total lines | Lines with tax leak | Tax leaked | Verdict |
|---|---|---|---|---|
| `Order` (whole order voided) | 46 | **5 (11%)** | **₹62** | ⚠ MUST be ₹0 — backend bug |
| `Pre-Serve` (line cancelled before serving) | 110 | **25 (23%)** | **₹380** | ⚠ MUST be ₹0 — backend bug |
| `Post-Serve` (line cancelled after serving) | 146 | 22 (15%) | ₹314 | per owner: also should be reverted |
| **TOTAL** | **302** | **52 (17%)** | **₹757** | |

### 2.2 Order-level leakage on fully-cancelled orders (78 orders)

For 78 orders where every line is `food_status='3'`:

| Order-level field | Sum (should be ₹0) |
|---|---|
| `order_discount + restaurant_discount_amount + coupon_discount_amount` | **₹48 leaked** |
| `delivery_charge` | ₹0 (no delivery orders in sample) |
| `delivery_charge_gst` | ₹0 |
| `service_gst_tax_amount` | ₹0 |
| `tip_amount` | ₹0 |

**Note:** Most order-level financial fields appear correctly zeroed on full-cancellations — the bug is concentrated at **line level** (`gst_tax_amount`, `vat_tax_amount`).

### 2.3 Two concrete sample orders (Zanzibar Burger reproduction)

**Sample A — `Post-Serve` line cancel with tax leakage**
```json
{
  "restaurant_order_id": "013575",
  "food_id": 107739,
  "food_status": "3",
  "quantity": 1,
  "price": 400,
  "gst_tax_amount": "20.00",    // ⚠ should be 0
  "vat_tax_amount": "0.00",
  "cancel_type": "Post-Serve",
  "reason_type": 3,
  "cancel_at": "2026-05-09 19:45:40",
  "cancel_by_name": "Counter"
}
```

**Sample B — `Order` (whole-order) cancel with tax leakage**
```json
{
  "restaurant_order_id": "012714",
  "food_id": 107739,
  "food_status": "3",
  "quantity": 2,
  "price": 800,
  "gst_tax_amount": "40.00",    // ⚠ should be 0 — order was fully voided
  "vat_tax_amount": "0.00",
  "cancel_type": "Order",
  "reason_type": null,
  "cancel_at": "2026-04-04 20:19:19",
  "cancel_by_name": "Counter",
  // parent orders_table:
  "_parent_cancellation_reason": "Before serving",
  "_parent_f_order_status": 3
}
```

---

## 3. Asks for Backend team

### 3.1 Immediate fix (P0 — critical)

When a line transitions to `food_status='3'`:
- Zero out the line's `gst_tax_amount`, `vat_tax_amount`, `discount_amount`, `service_charge`, `tax_amount`, `item_gst`, `item_vat`

When an order transitions to fully-cancelled (`f_order_status='3'` or `cancel_at` set with `cancellation_reason`):
- Zero out the order's `order_discount`, `restaurant_discount_amount`, `coupon_discount_amount`, `delivery_charge`, `delivery_charge_gst`, `service_gst_tax_amount`, `tip_amount`, `total_gst_tax_amount`, `total_vat_tax_amount`, `total_service_tax_amount`, `total_tax_amount`, `tip_tax_amount`

### 3.2 Migration / backfill

The current production database carries inconsistent state across all restaurants (Palm House sample shows ~17% line leakage). Two options:
- (a) **Live-go-forward** only — new cancellations zero financial fields; historical untouched. Reports stay inaccurate for old data.
- (b) **One-time migration** — recompute every cancelled line/order in DB, zero out leaked fields, log delta for audit. Cleanest but heaviest.

Owner preference: TBD — recommend owner be asked.

### 3.3 Contract: how should backend signal cancellation downstream

Today the only reliable cancellation signal on a line is `food_status='3'` + `cancel_type` field. **`cancel_type` is 100% populated on Palm House data** (302/302 cancelled lines). Frontend will rely on this field as the authoritative cancel-scope signal in future audits. Backend confirmation requested that `cancel_type` is universally populated across all restaurants (not Palm-House-specific).

---

## 4. Frontend posture until backend ships

- **FE-17 (CR-011-AUDIT-01)** continues to flag every cancelled-with-tax row AMBER on the S5 Audit tab. Visibility maintained for owner.
- **Export gate** continues to block exports until ALL audit flags clear.
- **No FE compensating logic** will be added (e.g. no "strip tax from cancelled rows in aggregation"). Frontend will NOT mask the backend bug — per owner directive.
- **Pending FE rules to add** (next session, requires owner approval):
  - **FE-49** (candidate) — Extend FE-17 from "tax-presence audit" to "financial-presence audit": AMBER also when discount/service charge/delivery charge > 0 on cancelled lines, with same business reason. Pending owner sign-off.

---

## 5. Related artefacts

| File | Purpose |
|---|---|
| `OWNER_DECISION_QUEUE.md` Category D (Backend Escalations) | This row tracked there as P0 |
| `SPRINT_STATUS.md` Owner Decision Log | Decision logged with owner verbatim quote |
| `auditManifest.js` FE-17 entry | Frontend audit that catches tax leakage today |
| `/tmp/orders_created.json` | Raw payload used for evidence (ephemeral; agent can re-fetch if needed) |
| Backend escalation file (this doc) | Single-source-of-truth for the bug report |

---

## 6. Reconciliation note

This escalation also impacts (downstream):
- S2 Item Sales — same cancelled-with-tax rows appear, same problem
- S6 Order Ledger Hybrid (Phase 2, not yet started) — will inherit the issue
- Audit Report (already shipped) — also exposed to this leakage
- Tab Management / Credit module reports — exposed if they sum cancelled lines

A backend fix is the upstream source of truth for all of these.

---

*Filed 2026-06-02. Awaiting backend acknowledgement + ETA.*
