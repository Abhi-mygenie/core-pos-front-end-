# Next Agent Handover · 2026-06-04 Evening — CR-011 S6 Order Ledger · Deep RCA Session

**Project:** MyGenie POS · CR-011 Reports Module · S6 Order Ledger Hybrid
**Session type:** Deep investigation session, 2026-06-04 evening (owner-directed RCA on RED flags + unmatched orders + manifest staleness fix)
**Owner present:** Yes. All investigations owner-requested.
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Credentials:** owner@cafe103.com / Qplazm@10 → route `/reports-module/order-ledger` → **Ledger Audit** tab
**Branch:** `4-june-v3`

---

## TL;DR — what happened this session

| Item | Status |
|---|---|
| **Manifest staleness fix** (FE-84, FE-82R, FE-86, FE-88 + engine header) | ✅ SHIPPED — 5 doc-vs-code mismatches corrected, zero runtime change |
| **FE-88 RED deep RCA** (3 orders: #012130, #012099, #012065) | ✅ ROOT-CAUSED — 3 distinct backend bugs identified |
| **transfer_order_in full-May scan** (24 transfers) | ✅ COMPLETE — 1/24 broken (#012130 only, May 27) |
| **order_edit full-May scan** (326 edited orders) | ✅ COMPLETE — 5/326 with drift (1.5%) |
| **order_edit deep RCA** (5 drifted orders, 4 patterns) | ✅ ROOT-CAUSED — 3 backend bugs classified |
| **FE-86 RED deep RCA** (9 orders in screenshot) | ✅ ROOT-CAUSED — split_order stale headers (5), FE-88-only (3), stale subTotal (1) |
| **split_order full-May scan** (348 split-affected orders) | ✅ COMPLETE — 19/348 FE-86 RED (5.5%), clustered May 4-6 |
| **Unmatched orders investigation** (12 orders) | ✅ ROOT-CAUSED — pre-billing cancellations with `paymentMethod='pending'` + `fOrderStatus=3` |
| Lint / compile | ✅ Clean — same pre-existing ESLint warning only |

---

## 1. Manifest Staleness Fix (code change)

Updated `auditManifest.js` to match actual engine code. **Zero runtime behavior change.**

| Rule | Field | Was (stale) | Now (matches code) |
|---|---|---|---|
| FE-84 | `name` | "tolerance = ₹0 (zero)" | "tolerance = ±₹0.02 (paise rounding)" |
| FE-84 | `explains` | "strict equality, no rounding" | Documents TOLERANCE=0.02, S5 vs S6 difference |
| FE-82R | `explains` | "Tolerance ₹0 (FE-84)" | "Tolerance ±₹0.02 (FE-84)" |
| FE-86 | `name` | "Σ items.tax = header tax" | "Σ items.tax + delivery GST = header tax" |
| FE-86 | `explains` | Only Σ items.tax | Adds delivery-GST component, tolerance ref, de-dup |
| FE-88 | `explains` | "RED severity — header math break" | 3-tier severity (RED/AMBER Del-GST/AMBER round-off), de-dup |
| Engine L11 | Comment | "FE-84 POLICY Zero tolerance" | "FE-84 POLICY ±₹0.02 tolerance (paise rounding)" |

---

## 2. Backend Bugs Identified (3 distinct bugs, prioritized)

### BUG A (P0) — `split_order` copies parent financial headers to ALL children

**Scope:** 19/348 split-affected orders in May have FE-86 drift (5.5%). Clustered May 4-6. Not systemic — 329/348 are clean. Likely an edge case (edited parent + split) or a transient backend regression.

**Mechanism:** When an order is split, the backend creates child orders with correct `order_amount` and correct item assignments, but **copies the PARENT's header fields unchanged** into each child:
- `order_sub_total_amount` → parent's total (not child's)
- `order_sub_total_without_tax` → parent's total
- `total_gst_tax_amount` → parent's full GST
- Per-line `gst_tax_amount` → NOT recalculated after qty split (e.g., parent had 6× Tandoori Roti with ₹12 GST → child gets 1× Tandoori Roti but still carries ₹12 GST)

**Proof:** #010703 + #010708 are sibling children of the same parent. Both carry identical `order_sub_total_amount = ₹650` and `total_gst_tax_amount = ₹32.50`, but #010703 has only Veg Biryani (₹330) and #010708 has only Allfredo Pasta (₹320). Together ₹330 + ₹320 = ₹650 = parent's total.

**Affected orders:** #010591, #010595, #010596, #010703, #010708 (confirmed FE-86 RED). #010735, #010879, #010932, #010942, #011105, #011509, #011740, #011747, #011846 and others have stale headers but FE-86 stays clean because header GST happens to match items (coincidental).

### BUG B (P1) — `order_edit` / `update-place-order` recomputes `order_amount` using product catalog tax rate instead of stored per-line `gst_tax_amount`

**Scope:** 5/326 edited orders in May have FE-88 drift (1.5%). Last occurrence: May 27.

**3 sub-patterns:**

| Pattern | Order | Drift | Mechanism |
|---|---|---|---|
| **B1: Qty reduction → amount increases** | #012065 | +₹4 | Edit reduces Tandoori Roti 6→4, but order_amount goes UP by ₹168 instead of DOWN by ₹84. Backend does additive recompute. Billing partially corrects (−₹80) but leaves ₹4 ghost GST. |
| **B2: Ghost GST on zero-tax items** | #012099 | +₹10.50 | "Top of Ice Cream" (food_id 181573) has per-line gst=₹0 (product was in the May-22 batch with 0% rate). Edit recomputes using catalog 5% → injects ₹10.50 ghost GST into `order_amount`. |
| **B3: GST applied to cancelled items** | #012138 | +₹5 | 2× Carbonated Drinks cancelled (food_status=3, gst=₹0). Edit recomputes using catalog 5% on cancelled items → ₹5 ghost GST. |

**Also identified (separate root cause):**
| Pattern | Orders | Drift | Mechanism |
|---|---|---|---|
| **B4: split_order_out stale headers** | #011740 (−₹779), #011877 (−₹160.50) | Negative | Split correctly updates `order_amount` but does NOT update `order_sub_total_without_tax` or `total_gst_tax_amount`. Headers stay at pre-split values. |

### BUG C (P2) — `transfer_order_in` GST double-count

**Scope:** 1/24 transfer orders in May (#012130 only, May 27). Rare edge case — source order had `order_edit_count=2`.

**Mechanism:** Cappuccino (₹190) transferred from source #012126 → target #012130. Transfer delta should be ₹199.50 (₹190 + ₹9.50 GST). Backend computed ₹209 (₹190 + ₹9.50 + ₹9.50) — GST counted twice.

---

## 3. Unmatched Orders Investigation (12 orders — classifier gap)

**All 12 "Unmatched Orders" in the Ledger Audit tab share the same profile:**

| Field | Value |
|---|---|
| `paymentMethod` | `pending` |
| `paymentStatus` | `null` |
| `f_order_status` | `3` (cancelled) |
| `order_status` | `cancelled` |
| `payment_type` | `postpaid` |
| `collect_bill` | `null` |
| All items `food_status` | `3` |
| `cancel_type` | Mix of `Pre-Serve` and `Post-Serve` |

**Root cause:** These are orders where **every item was individually cancelled before billing**. Staff cancelled items one by one while the order was still in `paymentMethod = 'pending'` state. The billing flow (`order_bill_payment`) never ran, so `paymentMethod` was never set to `'Cancel'`.

**Why the classifier misses them:** The Cancelled tab filter is:
```js
cancelled: (o) => o.paymentMethod === 'Cancel'
```
These have `paymentMethod = 'pending'`. They also don't match Paid (fStatus≠6), Credit (pm≠TAB), Hold (pm≠paylater, fStatus≠8/9), Merged (pm/ps≠Merge), or Running (ps≠unpaid).

**Fix needed (frontend):** Extend the cancelled predicate:
```js
cancelled: (o) => o.paymentMethod === 'Cancel' || o.fOrderStatus === 3
```
This catches both post-billing cancellations AND pre-billing cancellations. **Requires owner approval before implementing** — ask owner if these should appear in the Cancelled tab or in a separate "Voided" tab.

**Orders:** #012072, #012042, #012031, #011823, #011736, #011723, #011712, #011503, #011202, #010889, #010787, #010609

---

## 4. Files Changed This Session

| File | Change |
|---|---|
| `frontend/src/utils/auditManifest.js` | FE-84 name+explains+approvedSource updated; FE-82R explains tolerance ref; FE-86 name+explains+approvedSource updated (delivery GST + de-dup); FE-88 explains+approvedSource updated (3-tier severity + de-dup) |
| `frontend/src/utils/orderLedgerAuditEngine.js` | Line 11 comment: "Zero tolerance" → "±₹0.02 tolerance" |

**Read-only / NOT modified:** `orderLedgerService.js`, `OrderLedgerMockup.jsx`, `reportTransform.js`, `AllOrdersReportPage.jsx`

---

## 5. Action Items for Next Agent (priority order)

### 🔴 P0 — Owner decisions needed

1. **Unmatched orders classifier fix** — should pre-billing cancellations (`paymentMethod='pending'` + `fOrderStatus=3`) go into the existing Cancelled tab, or a new "Voided" tab? **Do not implement without owner GO.**

2. **Tab labels final rename** — still pending from prior session (owner said "wait").

3. **FE-86 fStatus=1 exclusion** — still deferred (owner "still auditing").

### 🟡 P1 — Ready to implement on owner GO

4. **Aggregator predicate extension** (zomato_gold) — small, ready:
```js
aggregator: (o) =>
  ['zomato','swiggy'].includes((o.orderIn||'').toLowerCase()) ||
  ['zomato_gold','zomato','swiggy','swiggy_dineout'].includes((o.paymentMethod||'').toLowerCase()),
```

### 🔵 Backend escalations (share with backend team)

5. **BUG A** — `split_order` must recalculate per-child: `order_sub_total_amount`, `order_sub_total_without_tax`, `total_gst_tax_amount`, AND per-line `gst_tax_amount`.

6. **BUG B** — `update-place-order` must sum stored per-line `gst_tax_amount`, NOT re-derive from product catalog. Also: qty-reduction should subtract (not add), and cancelled items (food_status=3) must be excluded from total recomputation.

7. **BUG C** — `transfer_order_in` must not double-count GST on transferred items when source was edited.

### 🟢 P2 — Backlog

8. Block B/C rule decisions — owner triage pending.
9. Loyalty/coupon discount rules — owner said "add later".
10. S5 Item Sales Hybrid unpark — blocked on backend ESC-3 (cancelled financials).

---

## 6. Things NOT to do

- Don't revert `TOLERANCE` (0.02) in orderLedgerAuditEngine.js.
- Don't re-introduce frontend subtotal re-aggregation in orderLedgerService.js.
- Don't reorder rule branches in auditOrder (FE-82R must precede FE-86/FE-88 for de-dup).
- Don't suppress flags the owner wants visible during audit phase (fStatus=1 exclusion).
- Don't rename tab labels without owner-approved names.
- Don't implement the cancelled classifier fix without owner confirming Cancelled vs Voided tab.

---

## 7. Quick-start for next agent

1. Read this doc + `CONTROL_DASHBOARD.md`.
2. Login owner@cafe103.com / Qplazm@10 → `/reports-module/order-ledger`.
3. Set range **May 1 → Jun 4** → click **Ledger Audit** tab.
4. Ask owner about P0 items #1 (unmatched orders → Cancelled or Voided?) and #2 (tab labels).
5. Full investigation data is cached at `/tmp/may_1_15.json` + `/tmp/may_16_31.json` (2,202 orders). These are ephemeral — re-fetch if pod restarts.
