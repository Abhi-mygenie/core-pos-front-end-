# POS3.1 — BUG-109 + BUG-110 + BUG-111 — Combined Plan (Mini-CR, Streamlined)

**Date:** 2026-05-27
**Sprint anchor:** POS3.1 (owner-selected Option A, 2026-05-27)
**CR ID:** `POS3_1_BUG_109_110_111_QSR_GATE_AND_BILL_SYNC` (single combined CR)
**Stage:** 5 — Plan (Stages 1-4 collapsed into this doc per streamlined mini-CR process)
**Owner approval rule (this CR):** **STRICT — every stage + every code change must be approved before the next move.** No recode; surgical correction only. **Use existing predicates and existing data fields wherever they already exist.**

**Supersedes:** `POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_PLAN_2026_05_27.md` (extended with BUG-111).

**Status of in-flight edits:** Diffs 1, 2, 3 (BUG-109 + BUG-110) **already applied** to `CartPanel.jsx`, build green, lint clean, statically traced 13/13 PASS. Awaiting QA + live smoke for those two. BUG-111 is the NEW addition in this plan revision.

---

## 1. One-line scope (revised)

> Make QSR mode obey the **existing Full Mode behaviour** for:
> (a) mandatory takeaway/delivery customer + address validation
> (b) prepaid lock after payment
> (c) **bill summary display for placed orders — sourced from the server-synced order, not locally recomputed**
> No new rules. No recode. Reuse `orderFinancials` and `orderTransform.order` patterns that already exist in Full Mode.

---

## 2. Frozen Acceptance Criteria

### 2.1 BUG-109 — QSR validation parity (unchanged from prior revision)

| AC | Rule |
|---|---|
| AC-109-1 | QSR + takeAway + empty name → Pay button disabled |
| AC-109-2 | QSR + delivery + missing (name OR 10-digit phone OR address) → Pay disabled |
| AC-109-3 | QSR + dinein/walk-in → no new gate; existing behaviour preserved |
| AC-109-4 | Full Mode validation behaviour unchanged (regression-free) |
| AC-109-5 | Existing visual indicators (red borders, asterisks) preserved |

### 2.2 BUG-110 — QSR prepaid lock parity (unchanged from prior revision)

| AC | Rule |
|---|---|
| AC-110-1 | When QSR order is paid (`payment_type='prepaid'`) AND `hasPlacedItems` → Pay button + Full Billing link both hidden (M-B wrap) |
| AC-110-2 | "Full Billing" link unhidden behaviour preserved when order is not prepaid+placed |
| AC-110-3 | Place & Hold (paylater, unpaid) → Pay button visible |
| AC-110-4 | Normal-mode prepaid → no regression |

### 2.3 BUG-111 — QSR bill display sourced from server (NEW)

| AC | Rule |
|---|---|
| **AC-111-1** | When `hasPlacedItems === true`, the **Grand Total** shown in QSR BILLING equals `orderFinancials.amount` (server-side authoritative total post-everything). |
| **AC-111-2** | When `hasPlacedItems === true`, the **Cash Received auto-fill** also uses the server-side total (it already cascades from `effectiveTotal` at L367-371 — no separate code change needed once `effectiveTotal` reads server). |
| **AC-111-3** | When `hasPlacedItems === true` AND the placed order has a non-zero `discount`, a "**Discount −₹X**" row is rendered. Value sourced from `orderFinancials.discount` (extended from `orderTransform.order.discount`). |
| **AC-111-4** | When `hasPlacedItems === true` AND the placed order has a non-zero `couponDiscount`, a "**Coupon (<code>) −₹X**" row is rendered. Sourced from `orderFinancials.couponDiscount` (extended). |
| **AC-111-5** | When `hasPlacedItems === true` AND the placed order has a non-zero `loyaltyDiscount`, a "**Loyalty −₹X**" row is rendered. Sourced from `orderFinancials.loyaltyDiscount` (extended). |
| **AC-111-6** | When `hasPlacedItems === true`, **Item Total** shows `orderFinancials.subtotalBeforeTax` (already in state today, just unused by QSR section). |
| **AC-111-7** | When `hasPlacedItems === true`, **Tax (GST)** shows `orderFinancials.serviceTax` (extended; sourced from `orderTransform.order.serviceTax` which already exists) — or derived as `amount − subtotalAmount − tipAmount − deliveryCharge` if `serviceTax` proves unreliable. **Default plan = read `serviceTax` directly.** |
| **AC-111-8** | When `hasPlacedItems === false` (unplaced cart) → QSR section continues to compute locally as today (no behaviour change for fresh orders). |
| **AC-111-9** | Cashier-applied QSR-mode discount (via the existing QSR discount input at L423-475) on an unplaced cart still works as today — i.e. local QSR discount is only used in the pre-placement flow. |
| **AC-111-10** | If `orderTransform.order` does NOT echo a coupon/loyalty field back from the GET response (backend gap), the corresponding row simply doesn't render (graceful — `value > 0` guard). No crash, no console spam. |

### 2.4 Build / lint / regression

| AC | Description |
|---|---|
| AC-COMMON-1 | `cd /app/frontend && CI=false yarn build` → exit 0 |
| AC-COMMON-2 | No new ESLint errors beyond pre-existing `OrderEntry.jsx:1308` warning |
| AC-COMMON-3 | Files touched are bounded to the list in §3 |
| AC-COMMON-4 | `/app/memory/final/`, `/app/memory/crm/crm_1_0/` untouched |
| AC-COMMON-5 | No backend / CRM / payload schema change |

---

## 3. Field map — Source of truth chain

Every field the new QSR bill summary displays must trace cleanly from backend → frontend prop. This is the chain — **all existing infrastructure except the 5 new field-reads in orderTransform.order**:

| Display row | Backend API field | `orderTransform.order` field | `orderFinancials` state key | Prop into CartPanel | Prop into QsrBillingSection |
|---|---|---|---|---|---|
| **Grand Total** | `order_amount` | `amount` (existing L55) | `amount` (existing) | `total` (existing, L2149) | `total` (existing, L245) |
| **Item Total** | `order_sub_total_without_tax` | `subtotalBeforeTax` (existing L56) | `subtotalBeforeTax` (existing) | NEW — `placedItemTotal` | NEW — `placedItemTotal` |
| **Discount** | `restaurant_discount_amount` (or fallback `discount_value`) | `discount` (existing L225) | NEW — `discount` | NEW — `placedDiscount` | NEW — `placedDiscount` |
| **Coupon** | `coupon_discount`, `coupon_code`, `coupon_title` | NEW — `couponDiscount`, `couponCode`, `couponTitle` | NEW — same | NEW — `placedCoupon` (object: `{discount, code, title}`) | NEW — `placedCoupon` |
| **Loyalty** | `loyalty_discount`, `loyalty_points_used` (or `used_loyalty_point`) | NEW — `loyaltyDiscount`, `loyaltyPointsUsed` | NEW — same | NEW — `placedLoyalty` (object: `{discount, points}`) | NEW — `placedLoyalty` |
| **Tax (GST)** | `total_service_tax_amount` | `serviceTax` (existing L58) | NEW — `serviceTax` | NEW — `placedTax` | NEW — `placedTax` |
| **Delivery** | `delivery_charge` | `deliveryCharge` (existing L293) | `deliveryCharge` (existing) | already passed (L2184 effective) | NEW — `placedDeliveryCharge` |
| **Tip** | `tip_amount` | `tipAmount` (existing L217) | NEW — `tipAmount` (optional v1) | optional | optional |
| **Round-off** | derived `amount − (subtotalBeforeTax + serviceTax + discount + coupon + loyalty + delivery + tip)` OR read `round_up` if exposed | not currently exposed; can derive | not needed in state | not needed | derived in QsrBillingSection from the values it already has |

**Convention:** any field whose value is 0 / absent → row not rendered (per AC-111-10).

---

## 4. Exact diffs (as text — for owner review BEFORE any edit)

### Diff 4 — Extend `orderTransform.order` to expose 5 new fields

**File:** `/app/frontend/src/api/transforms/orderTransform.js`
**Anchor:** inside the `order: (api) => { ... return { ... } }` object literal, after the existing `discount: ...` line (around L225-228).

```diff
       discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0) || 0,
+      // POS3.1 BUG-111 (2026-05-27): expose coupon / loyalty fields on the
+      // order shape so QSR bill summary can render them server-side-sourced.
+      // Same parity-extraction pattern as the existing `discount` field above.
+      couponDiscount:    parseFloat(api.coupon_discount) || 0,
+      couponCode:        api.coupon_code || '',
+      couponTitle:       api.coupon_title || '',
+      loyaltyDiscount:   parseFloat(api.loyalty_discount) || 0,
+      loyaltyPointsUsed: parseInt(api.loyalty_points_used ?? api.used_loyalty_point ?? 0, 10) || 0,
       paymentStatus: api.payment_status || 'unpaid',
       paymentType: api.payment_type || '',
       paymentMethod: api.payment_method || api.payment_mode || '',
```

**Net change:** +5 field lines + 3 comment lines = **+8 lines**.

**Backward compat:** if backend GET response omits any of these fields, default of `0` / `''` keeps the order shape stable. Any downstream consumer that doesn't know about these fields (everyone today except the new QSR billing reader) is unaffected.

---

### Diff 5 — Extend `orderFinancials` state initializer + 4 setOrderFinancials sites

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`

**5a — Initial state** (L142-149):

```diff
   const [orderFinancials, setOrderFinancials] = useState({
     amount: orderData?.amount || 0,
     subtotalAmount: orderData?.subtotalAmount || 0,
     subtotalBeforeTax: orderData?.subtotalBeforeTax || 0,
     deliveryCharge: orderData?.deliveryCharge || 0,
+    // POS3.1 BUG-111 (2026-05-27): server-side bill components for QSR section
+    // to render placed-order bill summary without locally recomputing.
+    serviceTax:        orderData?.serviceTax || 0,
+    discount:          orderData?.discount || 0,
+    couponDiscount:    orderData?.couponDiscount || 0,
+    couponCode:        orderData?.couponCode || '',
+    couponTitle:       orderData?.couponTitle || '',
+    loyaltyDiscount:   orderData?.loyaltyDiscount || 0,
+    loyaltyPointsUsed: orderData?.loyaltyPointsUsed || 0,
   });
```

**5b — savedCart restore branch** (currently L356-362):

```diff
       setOrderFinancials({
         amount: orderData.amount || 0,
         subtotalAmount: orderData.subtotalAmount || 0,
         subtotalBeforeTax: orderData.subtotalBeforeTax || 0,
         deliveryCharge: orderData.deliveryCharge || 0,
+        serviceTax:        orderData.serviceTax || 0,
+        discount:          orderData.discount || 0,
+        couponDiscount:    orderData.couponDiscount || 0,
+        couponCode:        orderData.couponCode || '',
+        couponTitle:       orderData.couponTitle || '',
+        loyaltyDiscount:   orderData.loyaltyDiscount || 0,
+        loyaltyPointsUsed: orderData.loyaltyPointsUsed || 0,
       });
```

**5c — orderData-only branch** (currently L397-402): identical 7-line addition (same fields, same mapping).

**5d — Socket-synced live-order branch** (currently L457-485): the existing block that runs when `orders.find(o => o.orderId === placedOrderId)` updates. Add the same 7 fields to the setOrderFinancials payload there too. Single biggest setter — most important to update (this is what runs after the Full Mode payment commits, when socket echoes the post-discount/coupon/loyalty values).

```diff
       setOrderFinancials({
         amount: orderFromContext.amount,
         subtotalAmount: orderFromContext.subtotalAmount || 0,
         subtotalBeforeTax: orderFromContext.subtotalBeforeTax || 0,
         deliveryCharge: orderFromContext.deliveryCharge || 0,
+        serviceTax:        orderFromContext.serviceTax || 0,
+        discount:          orderFromContext.discount || 0,
+        couponDiscount:    orderFromContext.couponDiscount || 0,
+        couponCode:        orderFromContext.couponCode || '',
+        couponTitle:       orderFromContext.couponTitle || '',
+        loyaltyDiscount:   orderFromContext.loyaltyDiscount || 0,
+        loyaltyPointsUsed: orderFromContext.loyaltyPointsUsed || 0,
       });
```

**Net change for Diff 5 (all 4 sites combined):** +35 lines (~9 per site × 4 sites including comment).

---

### Diff 6 — Thread the bill summary into CartPanel via a single new prop

**File:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`
**Anchor:** at the existing `<CartPanel>` render site (~L2147-2210).

Single new prop passed:

```diff
       <CartPanel
         cartItems={cartItems}
         total={total}
         ...
         orderFinancials={orderFinancials}
+        placedOrderBill={hasPlacedItems ? orderFinancials : null}
         ...
       />
```

**Net change:** +1 line. `placedOrderBill` is `null` when no placed items (preserves the unplaced-cart local-computation behaviour exactly).

> Note: `orderFinancials` is already passed to CartPanel today at L1481 / L2181 — so we COULD have QsrBillingSection just read it directly. But `placedOrderBill` is a named, intention-revealing prop that defaults to `null` when not applicable, which avoids QSR section having to recompute `hasPlacedItems` from cart items inside its own scope. Cleaner contract.

---

### Diff 7 — CartPanel forwards the prop to QsrBillingSection

**File:** `/app/frontend/src/components/order-entry/CartPanel.jsx`
**Anchor:** at the existing `<QsrBillingSection>` render site (currently ~L1255-1275).

```diff
         <QsrBillingSection
           ...
           hasPlacedItems={hasPlacedItems}
           hasValidationErrors={hasValidationErrors}
+          placedOrderBill={placedOrderBill}
         />
```

**Plus** add `placedOrderBill` to the outer CartPanel's prop list (~L596 onward). Default to `null`.

**Net change:** +2 lines (1 prop pass-through, 1 prop accept).

---

### Diff 8 — QsrBillingSection: accept prop + render server-sourced rows when placed

**File:** `/app/frontend/src/components/order-entry/CartPanel.jsx`
**Anchor:** prop destructure at L244-252 + the rendered JSX (between header L416 and Collect Bill CTA L562).

**8a — Add to prop destructure:**

```diff
 const QsrBillingSection = ({
   ...
   hasPlacedItems = false,
   hasValidationErrors = false,
+  placedOrderBill = null,
 }) => {
```

**8b — Compute effective total from server-side when placed:**

```diff
   const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - effectiveTotal) : 0;
+
+  // POS3.1 BUG-111 (2026-05-27): when order is placed, the server-side bill
+  // is the source of truth — use orderFinancials.amount (delivered via the
+  // placedOrderBill prop) instead of locally recomputing from cartItems.
+  // Mirrors OrderEntry.jsx:788-792 (`hasPlacedItems ? orderFinancials.amount
+  // : applyRoundOff(rawLocalTotal)`).
+  const serverTotal = placedOrderBill ? (placedOrderBill.amount || 0) : null;
+  const displayTotal = serverTotal != null ? serverTotal : effectiveTotal;
```

Then **replace the existing `effectiveTotal` references** in:
- Cash Received auto-fill effect at L368 → `displayTotal`
- Pay button label at L578-584 (currently shows `effectiveTotal.toLocaleString()`) → `displayTotal`
- `change` calc at L373 → `displayTotal`
- Payment payload at L378 (`finalTotal: effectiveTotal`) → `displayTotal`
- `disabled` shortfall check at L573 → `displayTotal`

> Net inside-component: replace 5 references to `effectiveTotal` with `displayTotal`. The variable `effectiveTotal` itself remains computed (for when `placedOrderBill === null`, i.e. unplaced cart flow). Just stop reading it directly when placed.

**8c — Render the bill summary rows (when `placedOrderBill` is set):**

In the existing QSR BILLING section markup (between L416 and L560), find the existing "Item Total / Tax / Round-off / Grand Total" block (approximate L496-540 — I'll re-confirm exact lines at gate-approval time). Replace the local computations in that JSX with conditional rendering:

```jsx
{placedOrderBill ? (
  <>
    <Row label="Item Total"          value={placedOrderBill.subtotalBeforeTax} />
    {placedOrderBill.discount > 0 && (
      <Row label="Discount"          value={-placedOrderBill.discount}        accent="discount" />
    )}
    {placedOrderBill.couponDiscount > 0 && (
      <Row label={`Coupon${placedOrderBill.couponCode ? ' (' + placedOrderBill.couponCode + ')' : ''}`}
                                     value={-placedOrderBill.couponDiscount}  accent="discount" />
    )}
    {placedOrderBill.loyaltyDiscount > 0 && (
      <Row label="Loyalty"           value={-placedOrderBill.loyaltyDiscount} accent="discount" />
    )}
    <Row label="Tax (GST)"           value={placedOrderBill.serviceTax} />
    {placedOrderBill.deliveryCharge > 0 && (
      <Row label="Delivery"          value={placedOrderBill.deliveryCharge} />
    )}
    <Divider />
    <Row label="Grand Total"         value={displayTotal} bold />
  </>
) : (
  /* existing locally-computed rows — unchanged */
  <>
    <Row label="Item Total"          value={itemTotal} />
    <Row label="Tax (GST)"           value={taxTotals.sgst + taxTotals.cgst} />
    {roundOff !== 0 && (
      <Row label="Round-off"         value={roundOff} />
    )}
    <Divider />
    <Row label="Grand Total"         value={effectiveTotal} bold />
  </>
)}
```

**Note:** the `Row` / `Divider` helpers above are pseudocode for the existing rendering pattern (which uses div + flex). The implementer can either:
- (a) extract a tiny inline helper at the top of the function, OR
- (b) repeat the existing `<div className="flex justify-between">` JSX inline 6 times

I recommend (b) to avoid even a tiny abstraction. Net JSX block: ~40 lines of explicit markup, no new component definitions.

**Net change for Diff 8:** ~50 lines added in QsrBillingSection (prop + serverTotal/displayTotal computation + the conditional bill summary block) + ~5 references swapped to `displayTotal`. Existing local code for unplaced flow stays intact.

---

### Diff Totals (combined CR)

| Bug | Diff | Lines added | Files |
|---|---|---|---|
| BUG-109 + BUG-110 | Diffs 1, 2, 3 (already applied) | +8 | `CartPanel.jsx` |
| BUG-111 (new) | Diff 4 — orderTransform extension | +8 | `orderTransform.js` |
| BUG-111 | Diff 5 — orderFinancials state + 4 setter sites | +35 | `OrderEntry.jsx` |
| BUG-111 | Diff 6 — CartPanel call-site prop | +1 | `OrderEntry.jsx` |
| BUG-111 | Diff 7 — CartPanel forward prop | +2 | `CartPanel.jsx` |
| BUG-111 | Diff 8 — QsrBillingSection bill summary | +~50 | `CartPanel.jsx` |
| **Combined CR total** | | **+~104 lines** | **3 files** |

3 files: `orderTransform.js`, `OrderEntry.jsx`, `CartPanel.jsx`. No new files. No new dependencies. No new APIs.

---

## 5. Test Matrix (extended)

### 5.1 BUG-109 (unchanged) — 8 cases

(Q-1 through Q-8 as in prior plan revision)

### 5.2 BUG-110 (unchanged) — 4 cases (P-1 through P-4)

### 5.3 Full Mode regression (BUG-110) — 3 cases (F-1, F-2, F-3)

### 5.4 BUG-111 — new cases (server-sourced bill display)

| # | Pre-condition | Action | Expected QSR BILLING after returning to QSR |
|---|---|---|---|
| **B-1** | QSR mode, place 4 items totaling ₹1,142 → click "Full Billing" → CollectPaymentPanel → apply ₹500 manual discount → Pay ₹675 → cashier returns to Order screen | View QSR section | Item Total **₹1,142**, **Discount −₹500**, Tax GST shown, **Grand Total ₹675**, Cash Received auto-fill **₹675** |
| **B-2** | QSR mode, place items, apply coupon SEED_V3B_BOGO in CollectPaymentPanel, pay | Return to QSR | Coupon line "Coupon (SEED_V3B_BOGO) −₹X" rendered with correct amount; Grand Total = server total |
| **B-3** | QSR mode, place items, apply loyalty 50 pts in CollectPaymentPanel, pay | Return to QSR | Loyalty line "Loyalty −₹X" rendered; Grand Total = server total |
| **B-4** | QSR mode, place items, NO discount/coupon/loyalty, pay | Return to QSR | Only Item Total / Tax / Grand Total rows. No phantom zero discount / coupon / loyalty rows. |
| **B-5** | QSR mode, fresh unplaced cart | Add items, watch QSR BILLING | Local computation as today (Item Total / Tax / Round-off / Grand Total) — no regression |
| **B-6** | QSR mode, place + hold (paylater) — order NOT paid, `payment_type !== 'prepaid'`, `hasPlacedItems === true` | View QSR section | Grand Total shows server's `amount` (= unpaid total). Pay button still visible (BUG-110 gate is `isPrepaid && hasPlacedItems`, so this stays unlocked). |
| **B-7** | Backend GET response omits `coupon_discount` field | Place + pay flow | No coupon row rendered (graceful `value > 0` guard). No crash. |
| **B-8** | Cashier toggles QSR Discount in the QSR section (existing local-discount input) for an UNPLACED cart, then places | During unplaced cart, local discount calc shown; on place, server takes over | Unplaced flow uses local discount; placed flow uses server. No double-counting. |

### 5.5 Build / lint

| # | Test |
|---|---|
| B-1 | `yarn build` exit 0 |
| B-2 | Lint clean on the 3 changed files |

**Total ACs:** 23 (10 for BUG-111, 5 for BUG-109, 4 for BUG-110, 3 for Full Mode regression, 1 misc, build/lint covered separately).

---

## 6. Rollback

Three-file revert in one command:

```bash
git checkout HEAD~1 -- frontend/src/components/order-entry/CartPanel.jsx \
                       frontend/src/components/order-entry/OrderEntry.jsx \
                       frontend/src/api/transforms/orderTransform.js
```

`orderFinancials` defaults to 0 / '' for the new fields → no consumer breaks. `orderTransform.order` defaults the new fields to 0 / '' → no downstream consumer breaks. `placedOrderBill` prop defaults to `null` → QsrBillingSection falls back to local compute.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend GET order response doesn't echo `coupon_discount` / `loyalty_discount` | M | M | AC-111-10 — render-on-`value > 0` guard means absent fields render as nothing. Add a one-line `console.debug('orderTransform: coupon/loyalty absent on order N')` if the implementer wants observability — optional. |
| `orderTransform.order` gets called by other consumers besides OrderEntry (e.g. reportTransform passthrough) | L | L | New fields are additive on the returned object. Existing consumers ignore unknown fields. Audit: `grep -rn "orderTransform\.order\\|fromAPI\\.order" /app/frontend/src` to confirm consumer count before edit. |
| `serviceTax` field on `orderTransform.order` is already exposed but may not perfectly match the sum of `sgst + cgst + vat` displayed in Full Mode CollectPaymentPanel | L | L | If discrepancy seen during smoke, fall back to `amount − subtotalBeforeTax − discount − couponDiscount − loyaltyDiscount − deliveryCharge − tipAmount` (derived). Plan-only; no code change unless smoke shows issue. |
| Hot-reload race: orderFinancials updates before placedOrderBill propagates → brief flicker on QSR section | L | L | React batching handles this. Worst case: 1-frame flicker. Acceptable. |
| Touching `orderTransform.js` is a hotspot per playbook §165 | M | M | Additive field reads only. No existing field touched. No mapping logic changed. The 5 added lines use the same `parseFloat(...) || 0` pattern as existing reads. |
| `OrderEntry.jsx` setOrderFinancials has 4 sites and updating all 4 must stay in sync | L | M | All 4 sites listed explicitly in Diff 5. QA matrix covers savedCart restore (B-1 scenario) which exercises the most-used setter. |

---

## 8. Regression risk classification (per CHANGE_REQUEST_PLAYBOOK §165)

| Hotspot file touched? | Answer |
|---|---|
| `DashboardPage.jsx` | NO |
| **`OrderEntry.jsx`** | **YES** — but changes are additive field expansions of `orderFinancials` state. No mutation logic touched. No socket-handler change. No new useEffect. |
| `CollectPaymentPanel.jsx` | NO |
| `RoomCheckInModal.jsx` | NO |
| `StatusConfigPage.jsx` | NO |
| **`orderTransform.js`** | **YES** — but additive field reads only. Same pattern as existing fields. |
| `reportService.js` | NO |
| socket handlers | NO |
| localStorage keys | NO |
| payment / tax / discount / service charge / round-off math | **READ-ONLY** — we only DISPLAY discount/coupon/loyalty server values; no computation logic changes |
| **`CartPanel.jsx`** | **YES** — already touched for BUG-109/110; BUG-111 extends within the same hotspot |

Combined classification: **medium-high regression risk** (3 hotspot files). Mitigated by:
- All additions are field-read or display-only — zero math/logic mutation
- Test matrix covers 23 scenarios
- Default values keep all existing consumers behaving exactly as today
- Single-file rollback per bug if needed

---

## 9. Implementation order & gate ladder

```
Stage 6a (BUG-109 + BUG-110) — APPLIED ALREADY
  ↑ Diffs 1, 2, 3                                    ✅ done (build green, lint clean)

Gate G-1 — APPROVE THIS UPDATED PLAN                 [PENDING owner approval]

Stage 6b (BUG-111) — Implementation order:
  Step 1 — Apply Diff 4 (orderTransform.js)           [HOLD until G-1 + G-2]
    Gate G-2 — Approve Diff 4 explicitly              
  Step 2 — Apply Diff 5 (OrderEntry orderFinancials)  [HOLD]
    Gate G-3 — Approve Diff 5
  Step 3 — Apply Diff 6 (OrderEntry → CartPanel prop) [HOLD]
    Gate G-4 — Approve Diff 6
  Step 4 — Apply Diff 7 (CartPanel forward + accept)  [HOLD]
    Gate G-5 — Approve Diff 7
  Step 5 — Apply Diff 8 (QsrBillingSection rendering) [HOLD]
    Gate G-6 — Approve Diff 8
  Step 6 — Build + lint                                [auto]
    Gate G-7 — Build/lint result reviewed
  Step 7 — Static trace ACs                            [auto]
    Gate G-8 — Static trace reviewed

Gate G-9 — APPROVE COMBINED QA + HANDOFF DOC DRAFT    [HOLD]
Live smoke on R689 (mutating — owner-driven session)  [HOLD]
Gate G-10 — APPROVE FINAL CLOSE-OUT                   [HOLD]
```

Owner can collapse multiple gates with a single explicit message (e.g. "approve all BUG-111 diffs at once") — must state which gates.

---

## 10. Sprint scaffold (unchanged)

Plan + companion docs live at:
```
/app/memory/change_requests/pos_3_1/
├── README.md
├── POS3_1_BUG_109_110_111_QSR_GATE_AND_BILL_SYNC_PLAN_2026_05_27.md   (THIS doc)
└── (QA + handoff doc to be created at Gate G-9)
```

---

## 11. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code edited by writing this plan revision | CONFIRMED |
| 2 | All diffs shown as text, not applied | CONFIRMED |
| 3 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 4 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 5 | No recode — every field reuses existing source patterns | CONFIRMED |
| 6 | No new dependencies, no new APIs, no backend/CRM change | CONFIRMED |
| 7 | Single combined CR (BUG-109 + 110 + 111) per owner direction | CONFIRMED |
| 8 | Streamlined mini-CR format honoured (1 plan doc + 1 QA/handoff to come) | CONFIRMED |
| 9 | Strict per-gate owner approval honoured | CONFIRMED |
| 10 | All ACs derived verbatim from owner's three bug reports + clarifications | CONFIRMED |

---

**End of POS3.1 BUG-109 + BUG-110 + BUG-111 Combined Plan. Stage 5 (revised) — awaiting owner approval at Gate G-1.**
