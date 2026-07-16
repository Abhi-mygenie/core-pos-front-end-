# Print Path Unification — Corrective Plan — 2026-05-17

## 1. Purpose

Corrects the partial Mini-CR (which set `payment_amount === grant_amount === effectiveTotal`) and resolves the cross-branch drift surfaced by the 3 owner receipts.

Owner-locked decisions ahead of this plan:
- **Q1**: `payment_amount` → "Total" line → **food-only** (2,676 for #102); `grant_amount` → "Grand Total" line → **full payable** (11,510 for #102).
- **Q2 = C**: Math lives **inside `buildBillPrintPayload`** by default; callers MAY override individual fields when they have live UI state.
- **Q3 = (i)**: Keep Mini-CR + Addendum as the foundation; layer corrective patch on top (no roll-back).
- **Q4 = (1)**: Include the **Item Total / SC / Sub Total / CGST / SGST drift** in the same plan.
- Frozen new business rule: **All Print Bill paths must produce identical payload** for the same order. Single source of truth.

**No source files modified yet.**

---

## 2. The 3 receipts — what owner observed

| Receipt | Path | Total line | Grand Total | Item Total | SC | Sub Total | CGST | SGST |
|---|---|---|---|---|---|---|---|---|
| #1 "order page" | OrderEntry header pill (default branch) | 2676 ✓ | **2676 ✗** | **2119 ✗** | **211.90 ✗** | **2330.90 ✗** | **72.27 ✗** | **72.27 ✗** |
| #2 "outside" | Dashboard OrderCard printer icon (default branch) | 2676 ✓ | **2676 ✗** | **2119 ✗** | **211.90 ✗** | **2330.90 ✗** | **72.27 ✗** | **72.27 ✗** |
| #3 "inside" | CollectPaymentPanel inside Bill Summary (override branch — Mini-CR path) | **11510 ✗** | 11510 ✓ | 2239 | 223.90 | 2462.90 | 75.57 | 75.57 |

Target (after this plan): all 3 receipts identical with **Total 2676 / Grand Total 11510 / Item Total 2239 / SC 223.90 / Sub Total 2462.90 / CGST 75.57 / SGST 75.57 / VAT 61.60**.

---

## 3. Root causes (read-only inspection findings)

### 3.1 Total / Grand Total bug

The Mini-CR set both `payment_amount` and `grant_amount` to `effectiveTotal`. That conflates two distinct numbers. Correct mapping:
- `payment_amount` = `finalTotal` (food + tax + SC + tip + delivery) — what the **restaurant's bill** is.
- `grant_amount` = `effectiveTotal` (food bill + associated-orders total + room balance) — what the **cashier collects right now**.

### 3.2 Default-branch room rollup missing

The L1646 comment claims `order.amount` is room-inclusive ("per Task 4 `computeRoomCardAmount`"). **This is wrong.** `computeRoomCardAmount` in `DashboardPage.jsx` L39-45 only computes a display value for the dashboard card; it does NOT mutate `order.amount`. The Print Bill path receives the raw `order.amount` = food-only.

So when OrderEntry header pill or Dashboard OrderCard printer icon fires Print Bill on a room order:
- `finalPaymentAmount` = `order.amount` = 2676 (food-only)
- `payment_amount` = `grant_amount` = 2676 → both Total and Grand Total print 2676

### 3.3 Item Total drift (120-rupee gap)

Two divergent sources of truth for "item total":
- **Override branch** (CollectPaymentPanel L486): `itemTotal = Σ getItemLinePrice(item)` — `getItemLinePrice` (L199-211) explicitly sums `price + addonSum + varSum`. **Includes variations + add-ons** → 2239.
- **Default branch** (orderTransform L1601-1603): `finalOrderItemTotal = order.subtotalAmount || computedSubtotal` — `order.subtotalAmount` comes from backend `api.order_sub_total_amount` which stores **base `price` sum only**. **Excludes variation/add-on uplift** → 2119.

For Room #102: 3 items have variation/add-on charges totalling +120 → matches the observed 2239 vs 2119 delta exactly.

### 3.4 SC / Sub Total / CGST / SGST drift (cascades from 3.3)

- SC = 10% of Item Total → 10% of 2119 = 211.90 (default) vs 10% of 2239 = 223.90 (override).
- Sub Total = Item Total + SC → 2330.90 vs 2462.90.
- CGST/SGST on `Sub Total + Tip + Delivery - Discount` → drifts proportionally.
- VAT 61.60 stays constant (the 22% VAT item has no variation/add-on, base price = 280 in both).

### 3.5 Architectural cause

Two code paths, two computations, two answers. The Mini-CR fixed only one (badly). Patching surface-by-surface keeps reintroducing the same class of bug (BUG-050 was the same lesson).

---

## 4. Fix design — Option C (one branch + selective overrides)

Single computation lives inside `buildBillPrintPayload`. Every caller becomes a thin wrapper. Callers MAY override individual fields when they hold fresher live state.

### 4.1 New value semantics inside `buildBillPrintPayload`

The function reads from `order` (which already carries `amount`, `roomInfo`, `associatedOrders`, items via `_raw`, etc.) and computes:

1. **`itemBase`** — sum of `price + variation + add-on` for each non-cancelled item, using a helper that mirrors `getItemLinePrice` from CollectPaymentPanel. Single shared function (moved to `orderTransform.js` so the helper is reusable; CollectPaymentPanel imports/uses it for the cart UI as well — kills the dual implementation).
2. **`serviceChargeAmount`** — recomputed against `itemBase` using `restaurant.serviceChargePercentage`, applicability gate (BUG-023), and post-discount semantic (AD-101 / BUG-006). Already exists in current default branch; will now feed off the corrected `itemBase`.
3. **`taxTotals` (CGST + SGST + VAT)** — per-item iteration with proration, mirroring CollectPaymentPanel's `taxTotals` useMemo (L219-240). Single implementation.
4. **`finalTotal`** = `itemBase + SC + GST + VAT + tip + delivery - discount` (the food-bill grand total). Round-off applied per ROUND-002 only at the grand-total emission, not intermediate.
5. **`associatedTotal`** = Σ `order.associatedOrders[].amount` (already computed at L1655 area).
6. **`roomBalance`** = `order.roomInfo.balancePayment || 0`.
7. **`effectiveTotal`** = `finalTotal + (isRoom ? associatedTotal + roomBalance : 0)`.

Emit:
- `payment_amount` = `overrides.paymentAmount ?? finalTotal`
- `grant_amount` = `overrides.grantAmount ?? effectiveTotal`
- `order_item_total` = `overrides.orderItemTotal ?? itemBase` (no more bypassing variations)
- `order_subtotal` = `overrides.orderSubtotal ?? (itemBase + SC + tip + delivery)`
- `service_charge_amount` = `overrides.serviceChargeAmount ?? SC`
- `gst_tax` / `cgst_amount` / `sgst_amount` / `vat_tax` = computed values, with override hooks
- `discount_amount` (BUG-050 cascade) — unchanged
- `rtype` / `payment_status` / `payment_method` (Mini-CR Addendum) — unchanged

### 4.2 Caller-side simplification

- **CollectPaymentPanel.handlePrintBill** — instead of sending `paymentAmount: effectiveTotal` (which we now realize was wrong), it sends:
  - `paymentAmount: finalTotal` (live food-only with all discount/tip/SC reflected)
  - `grantAmount: effectiveTotal` (live full payable)
  - other overrides only when the cashier has typed a value the order context doesn't yet have (discount, tip, etc.)
- **OrderEntry header `PrintBillButton`** — no change needed at call site (no overrides). Transform now computes both numbers itself.
- **Dashboard OrderCard / TableCard printer icon** — no change needed.
- **Future Audit Report Print Bill (BUG-059)** — inherits automatically.

### 4.3 The shared `getItemLinePrice` helper

Move (or duplicate verbatim) from `CollectPaymentPanel.jsx` L199-211 into `orderTransform.js`. Long-term, both files import the same function. Short-term, two identical implementations are acceptable to limit blast radius — but the eventual goal is **one** copy.

### 4.4 Cleanup of misleading comments

- Remove/correct the L1646 comment that wrongly claims `order.amount` is room-inclusive.
- Remove/correct the L1614-1622 comment block that assumes default branch never sees room data.

---

## 5. Files to be modified (in next gate)

| File | Reason | Approx. size |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | All new compute logic + override hooks + corrected comments | ~80 lines net change |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `handlePrintBill` sends `finalTotal` + `grantAmount: effectiveTotal` (correcting Mini-CR) | ~6 lines |
| `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js` | Re-baseline assertions: split `payment_amount` (food-only) vs `grant_amount` (full payable); assert correct `order_item_total` includes variations | ~30 lines |
| **NEW** `frontend/src/api/transforms/__tests__/print-payload-parity.test.js` | New regression suite: same order via override-branch vs default-branch must produce identical 8-field payload (lock the "single source of truth" rule) | ~80 lines |

**Estimated total**: 4 files, ~+150 / -40 lines.

---

## 6. Frozen business rule (to record in BUSINESS_RULES_BASELINE_FINAL)

> **PRINT-001 (May-2026): Print Payload Single Source of Truth.**
> Every Print Bill entry point (OrderEntry header pill, Dashboard OrderCard printer icon, Dashboard TableCard printer icon, CollectPaymentPanel Bill-Summary Print Bill, Audit Report Paid-tab Print Bill, PrintBillButton component, and any future surface) MUST produce an identical print payload for the same order. The single source of truth for all computed monetary fields (`order_item_total`, `service_charge_amount`, `order_subtotal`, `gst_tax`, `cgst_amount`, `sgst_amount`, `vat_tax`, `payment_amount`, `grant_amount`) is `buildBillPrintPayload` in `api/transforms/orderTransform.js`. Callers MAY override individual fields only when they hold fresher live UI state. A regression test suite (`print-payload-parity.test.js`) locks this invariant: any two callers producing different payloads for the same order is a test failure.

> **PRINT-002 (May-2026): payment_amount vs grant_amount semantics.**
> - `payment_amount` = the restaurant's own bill total ("Total" line) = `itemBase + SC + GST + VAT + tip + delivery − discount`.
> - `grant_amount` = the amount the cashier actually collects right now ("Grand Total" line) = `payment_amount + (isRoom ? associatedTotal + roomBalance : 0)`.
> For non-room orders, the two are equal (associated = 0, roomBalance = 0). For room orders, `grant_amount` adds previous-orders-transferred-to-room + the room folio balance.

These rules anchor BUG-050 (discount cascade), the Mini-CR (`rtype` etc.), this corrective plan, and any future print-related fix.

---

## 7. Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Non-room order receipts change Item Total / SC / CGST / SGST | **Medium** if Item Total includes variation/add-on uplift owner expects (some restaurants display base + add-on separately) | Verify with owner on a sample non-room order before approving the diff. If owner wants legacy behavior for some templates, gate the new compute behind a feature flag. |
| Tests for non-room dashboard reprint break | **Expected** for `req3-room-bill-print.test.js` (re-baselined as part of plan). For `qa_subtotal_delivery_validation.test.js` — depends. | Run full suite after applying; re-baseline only assertions that encoded the old buggy behavior. |
| `getItemLinePrice` duplication | Low | Acceptable short-term; long-term refactor as separate ticket. |
| Round-off drift between branches | Low | Use the same `Math.round(x * 100) / 100` everywhere, single helper if needed. |
| Hidden override-branch math the override callers depend on (e.g., wallet/loyalty) | Low | Preserve all existing `overrides.*` hooks; transform only adds **new** defaults when override is absent. |

Overall: **Medium** — meaningful refactor in a hotspot file. Saved by extensive test coverage + new parity test that locks the invariant going forward.

---

## 8. Sequence of work (after approval)

1. **Gate 7 — Exact code diff preview** for all 4 files (or split into 2 sub-buckets if owner prefers).
2. Apply changes after owner approves diff.
3. Run full Jest suite + lint + webpack.
4. Update `BUSINESS_RULES_BASELINE_FINAL.md` with PRINT-001 + PRINT-002.
5. Owner smoke: print same Room #102 from all 3 surfaces → all 3 receipts identical.
6. Then resume Wave 4 BUG-059 (which inherits the fix automatically).

---

## 9. Open question (owner clarification needed before Gate 7)

**Non-room Item Total expectation** — Today on non-room orders, default-branch prints `Item Total = order.subtotalAmount` (backend value, base prices only). Override branch prints `Item Total = Σ getItemLinePrice` (with variations + add-ons). Both produce numbers, neither matches the other.

For a non-room order with variations / add-ons (e.g. takeaway with a +50 add-on selection), which one is owner-correct?
- **Variant 1**: Item Total = base price sum only. Add-ons / variations appear inside their parent item line and are NOT additive to Item Total. (current default-branch behavior)
- **Variant 2**: Item Total = base + variations + add-ons. (current override-branch behavior; CollectPaymentPanel cart UI shows this number)

Without this answer I'll default to **Variant 2** (CollectPaymentPanel + receipt #3 behavior) because that's the value the cashier sees on screen at payment time, and the spirit of the new business rule is "all surfaces show what the cashier sees."

---

## 10. Approval required

- **A.** Approve plan → I produce Gate 7 exact code-diff preview for all 4 files.
- **B.** Modify plan (e.g., split files differently, change semantics, defer parity test).
- **C.** Stop / abandon.

Reply A / B / C. Also reply on §9 Variant 1 or Variant 2 if you have a preference (else I'll default to Variant 2).

---

*— End of Print Path Unification — Corrective Plan —*
