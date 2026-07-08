# INVESTIGATION — All Bill-Print Paths (BUG-168 scope expansion)

**Session:** 2026-07-08 (INVESTIGATION role — read-only)
**Trigger:** owner-shared print payload for order #002384 shows `order_item_total: 69` while backend truth = 219.
**Evidence dir:** `/app/memory/evidence/BUG-168/`
**Simulator:** `simulate_all_print_paths.py` (run this any time to reproduce)

---

## 1. All bill-print emission sites (7 paths, 3 KOT paths omitted)

| ID | Caller | File:line | SC pct | Overrides shape |
|----|--------|-----------|--------|-----------------|
| **B1** | AllOrdersReportPage — Reports audit reprint | `AllOrdersReportPage.jsx:820` | 0 | `{}` — pure fallback |
| **B2** | RePrintButton — `PrintBillButton` (order-entry header) | `RePrintButton.jsx:115` | auto | `{ scGstPct, delGstPct }` — no itemTotal override |
| **B6** | OrderCard — dashboard printer icon | `OrderCard.jsx:217` | auto | `{ scGstPct, delGstPct }` — same as B2 |
| **B7** | TableCard — dashboard printer icon | `TableCard.jsx:221` | auto | `{ scGstPct, delGstPct }` — same as B2 |
| **B3** | OrderEntry — auto-print after PLACE (new) | `OrderEntry.jsx:1377/1415` | live | full `paymentData` overrides |
| **B4** | OrderEntry — auto-print after UPDATE | `OrderEntry.jsx:1487` | live | full `paymentData` overrides |
| **B5** | OrderEntry — Collect Bill (postpaid/prepaid/split) | `OrderEntry.jsx:1782/1886/2180` | live | full `paymentData` overrides |

All 7 go through the single choke-point: **`toAPI.buildBillPrintPayload` (orderTransform.js L1712-2144)**. The `finalOrderItemTotal` value it emits (L1921-1923) is:

```js
overrides.orderItemTotal !== undefined
  ? overrides.orderItemTotal        // Path B3 / B4 / B5 (live UI)
  : (order.subtotalAmount            // Path B1 / B2 / B6 / B7 (backend-hydrated field)
     || computedSubtotal              // ← fallback where BUG-168 L1808 lives
     || 0);
```

## 2. Simulation results on **live backend response for order #002384**

Backend truth (via GET `/api/v2/vendoremployee/get-single-order-new` order_id=940279):

```
order_sub_total_amount      = 219.00   ← items + addons (correct)
order_sub_total_without_tax = 240.90   ← items+addons+SC pre-tax
total_service_tax_amount    =  21.90   ← 10% SC on 219
```

Item shape (single item, qty=3, addon qty=1 @ ₹50):
```
{ quantity:3, unit_price:"23.00", price:69, add_ons:[{price:50, quantity:1}] }
// ⚠️  NO `total_add_on_price` field
```

### Happy path — `subtotalAmount` populated (219):

| ID | Path | `order_item_total` emitted | `order_subtotal` | Result |
|----|------|---------------------------|------------------|--------|
| B1 | Reports reprint | **219.00** | 262.80 | ✅ (uses `order.subtotalAmount`) |
| B2 | PrintBillButton | **219.00** | 262.80 | ✅ (uses `order.subtotalAmount`) |
| B6 | OrderCard printer | **219.00** | 262.80 | ✅ (uses `order.subtotalAmount`) |
| B7 | TableCard printer | **219.00** | 262.80 | ✅ (uses `order.subtotalAmount`) |
| B3 | Auto-print after Place | 219.00 | 240.90 | ✅ (live UI overrides — `getItemLinePrice` L212-224 in CollectPaymentPanel is correct) |
| B4 | Auto-print after Update | 219.00 | 240.90 | ✅ same |
| B5 | Collect Bill | 219.00 | 240.90 | ✅ same |

### 💥 The failure mode — `subtotalAmount = 0` (socket race / partial hydration):

| ID | Path | `order_item_total` emitted | Result |
|----|------|---------------------------|--------|
| B1 | Reports reprint | **69.00** | ❌ BROKEN |
| B2 | PrintBillButton | **69.00** | ❌ BROKEN |
| B6 | OrderCard printer | **69.00** | ❌ BROKEN |
| B7 | TableCard printer | **69.00** | ❌ BROKEN |
| B3/B4/B5 | Live-UI paths | 219.00 | ✅ unaffected (they bypass fallback) |

The failure branches into `computedSubtotal` (L1802-1826) — which is where **BUG-168 L1808 lives**. As already proven, L1808's `+ (parseFloat(item.total_add_on_price) || 0)` degrades to **`+ 0`** because backend omits that field on `rawOrderDetails[]`. So L1808 does nothing.

## 3. Why owner's shared payload showed `69` — root cause

The payload owner shared has `payment_status:"unpaid", payment_method:"pending", payment_amount:250` (matches `order.amount=250` exactly). This is a **B2 / B6 / B7-shaped print** (no live-UI override; `finalPaymentAmount = order.amount` fell through). The only way `finalOrderItemTotal=69` is emitted from this path is if **`order.subtotalAmount` was 0 (unhydrated) at print time** — then `computedSubtotal=69` was used (because L1808 fix is a no-op on this backend shape).

**Two combined root causes:**

1. **RC1 (data hydration):** dashboard socket path can present an order whose `subtotalAmount` is 0 (e.g., partial socket update, in-flight order created without a `get-single-order-new` refetch). Print then hits the fallback.
2. **RC2 (fix scope error):** the current L1808 fix trusts a `total_add_on_price` field that the `orderDetails[]` shape doesn't carry. The correct fields (`item.add_ons[].price × item.add_ons[].quantity × item.quantity`) are available and ignored.

Both must be true to reproduce. The user's payload proves both hold in production.

## 4. Cross-path differences (side-effects worth noting)

| Concern | B1/B2/B6/B7 (no-override) | B3/B4/B5 (live-UI override) |
|---------|--------------------------|------------------------------|
| item_total source | `order.subtotalAmount` → `computedSubtotal` fallback | `paymentData.itemTotal` (from CollectPanel `getItemLinePrice` — **correct**) |
| SC amount | Recomputed from `serviceChargePercentage × postDiscountSub` (L1867) — **inherits the addon bug when computedSubtotal is used** | `overrides.serviceChargeAmount` from live UI ✅ |
| GST/VAT | Recomputed from `food_details.tax` per line (L1811-1825) — **taxed off wrong lineTotal** | `overrides.gstTax/vatTax` ✅ |
| Tip / Delivery | Comes from `overrides` OR backend order fields | Comes from live UI |
| Discount | `overrides.discountAmount` OR `order.discount` (BUG-050 fallback) | Live UI |

**Cascading effect:** in the failure mode, not only `order_item_total` is wrong — the fallback also emits wrong SC, wrong GST, wrong VAT, wrong `finalOrderSubtotal` (all derived from the buggy `computedSubtotal`). Fixing L1808 to use `add_ons[]` corrects the whole cascade in a single line.

## 5. Recommended fix (scope: single-line, but hotspot file → OWNER APPROVAL required)

**File:** `orderTransform.js` L1808
**Risk:** HIGH (hotspot + financial print base) — per Alpha R5+R6

```js
// Before (current, broken for this backend shape):
const lineTotal = (price * qty) + (parseFloat(item.total_add_on_price) || 0); // BUG-168

// After (proven correct against live order #002384):
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
  0
);
const lineTotal = (price * qty) + (addonPerUnit * qty); // BUG-168 v2: addon × per-unit-qty × item.qty
```

**Why this pattern is safe:**
- Matches `getItemLinePrice` in `CollectPaymentPanel.jsx:212-224` verbatim (same math, same field names) → guarantees fallback path ≡ live-UI path.
- No change to override branches → B3/B4/B5 behavior unchanged.
- No change to complimentary carve-out (L1734-1783) → BUG-018 semantics preserved.
- Backward-compatible: if a future backend adds `total_add_on_price`, we can keep it as an assertion.

## 6. Regression tests owner should sign off on before rollout

Reproduce (using preprod creds owner supplied):
- ✅ **Order #002384** — B2/B6/B7: print → `order_item_total` must equal **219.00**, SC **21.90**, VAT **8.76**
- Order without addons — same paths must still emit correct totals (no double-count regression)
- Order with variations only (no addons) — no regression (varSum path is in CollectPanel's live path; fallback still uses `unit_price × qty` which is right)
- Complimentary-flagged item — L1734-1783 already zeroes it; verify addonPerUnit=0 after the map at L1768

## 7. Related registry & doc drift to clean up (CLOSURE Phase B work)

- `FILE_OWNERSHIP.md` L329 claims BUG-168 fix at L698 (`× (item.qty || 1)`) — actually reverted; drop or rewrite.
- `registry.json` BUG-168 status = `IMPLEMENTED` but title/scope describe the reverted L698 change, not the surviving L1808 (broken) change.
- `BUG_166_168_ADDON_REVERT_PLAN.md` — never mentions L1808; should be updated with what actually shipped or archived.

## 8. Confidence & steps

- **Confidence: HIGH** — evidence is a live backend response cross-checked with 7 caller call-sites and a working simulator.
- **Steps used:** 9 / 10.
- **Next role suggestion:** BUG FIX (with owner approval), then QA re-verify against order #002384, then CLOSURE Phase B for registry drift.

---

## Files touched by this investigation (no code changes)

```
/app/memory/evidence/BUG-168/order_940279.json           ← live backend response
/app/memory/evidence/BUG-168/simulate_all_print_paths.py ← re-runnable simulator
/app/memory/evidence/BUG-168/INVESTIGATION_REPORT.md     ← this file
```
