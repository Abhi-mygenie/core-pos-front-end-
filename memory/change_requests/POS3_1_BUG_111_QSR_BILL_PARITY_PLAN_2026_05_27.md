# POS3.1 — BUG-111 — QSR Grand Total Server-Parity Plan (Mini-CR, Minimal)

**Date:** 2026-05-27
**Sprint anchor:** POS3.1 (extends BUG-109/110 alignment scope)
**CR ID:** `POS3_1_BUG_111_QSR_BILL_PARITY`
**Stage:** 5 — Plan
**Owner approval rule:** **STRICT — every stage + every code change must be approved before the next move.**
**Selected option (owner-confirmed 2026-05-27):** **Option Y** — 1-line core fix + hide misleading breakdown chrome on placed orders.

**Paired docs:**
- `/app/memory/change_requests/POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_PLAN_2026_05_27.md` (sibling — code-merged)
- `/app/memory/change_requests/POS_QSR_BUGS_BUG_109_BUG_110_DISCOVERY_REGISTRATION_2026_05_27.md` (discovery)

---

## 1. One-line scope

> `QsrBillingSection` already receives the server-authoritative `total` prop on placed orders (from `OrderEntry.jsx:788-792` → `orderFinancials.amount`) but **ignores it** and re-derives a local total from `cartItems`. Read the existing prop instead. **No new fields, no new props, no payload change, no transform change, no `orderFinancials` plumbing, no recompute.** 6 lines, 1 file.

---

## 2. Root cause (proven, line-by-line)

| Step | File:Line | Code | State |
|---|---|---|---|
| 1 | `OrderEntry.jsx:788-792` | `const total = hasPlacedItems ? (orderFinancials.amount \|\| 0) + ... : applyRoundOff(rawLocalTotal) + deliveryAddOn;` | Server-authoritative ₹675 on placed orders. ✅ already correct. |
| 2 | `OrderEntry.jsx:2149` | `<CartPanel ... total={total} ... />` | ✅ already passed. |
| 3 | `CartPanel.jsx:1257` | `<QsrBillingSection ... total={total} ... />` | ✅ already forwarded. |
| 4 | `CartPanel.jsx:244` | `const QsrBillingSection = ({ cartItems, total, ... }) =>` | ✅ already destructured. |
| 5 | `CartPanel.jsx:302-364` | `itemTotal = …reduce(…); … finalTotal = …; effectiveTotal = finalTotal + …` | ❌ **never reads `total`** — recomputes locally → shows ₹1,200 instead of ₹675. |

The prop is on the wire, holding the correct value. The component just doesn't consume it.

---

## 3. Frozen Acceptance Criteria

| AC | Rule |
|---|---|
| **AC-111-1** | When `hasPlacedItems === true` → `effectiveTotal` (and therefore the displayed Grand Total + Pay button amount + Cash Received auto-fill) **MUST** use the `total` prop (= server's `orderFinancials.amount` + deltas). |
| **AC-111-2** | When `hasPlacedItems === false` (new unplaced QSR order) → local-compute path is **unchanged**. QSR Discount selector + delivery editor + cash-received logic work exactly as today. |
| **AC-111-3** | On placed orders, the breakdown rows (`Item Total`, `Discount`, `Service Charge`, `Delivery`, `Tax (GST)`, `VAT`, `Round-off`) are **hidden** — they are locally recomputed and would mismatch the server's authoritative total, confusing the cashier. Only the Grand Total + payment buttons remain. |
| **AC-111-4** | Full Mode (`qsrMode === false`) → `CollectPaymentPanel.jsx` untouched, zero regression. |
| **AC-111-5** | `cd /app/frontend && CI=false yarn build` → exit 0. No new ESLint errors beyond the pre-existing `OrderEntry.jsx:1308` warning. |
| **AC-111-6** | Files touched: **exactly 1** — `/app/frontend/src/components/order-entry/CartPanel.jsx`. |
| **AC-111-7** | No outbound payload field added/removed/reshaped. No `orderTransform.js` change. No `OrderEntry.jsx` change. No new prop. |
| **AC-111-8** | `/app/memory/final/`, `/app/memory/crm/crm_1_0/` untouched. |

---

## 4. Exact diff (as text — for owner review BEFORE any edit)

**File:** `/app/frontend/src/components/order-entry/CartPanel.jsx`

### Diff 1 — Switch `effectiveTotal` to server-authoritative `total` on placed orders (L362-364)

```diff
   const roomBalance = isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0;
   const associatedTotal = associatedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
-  const effectiveTotal = finalTotal + (isRoom ? associatedTotal : 0) + roomBalance;
+  // POS3.1 BUG-111 (2026-05-27): on placed orders, prefer the server-authoritative
+  // `total` prop (= orderFinancials.amount + deltas, computed at OrderEntry.jsx:788-792)
+  // over the local recompute. Mirrors the Full Mode total branch upstream so QSR and
+  // Full Mode display the same Grand Total when Full Mode applied discount/coupon/
+  // loyalty/wallet. Unplaced orders keep local compute so the QSR Discount selector
+  // remains interactive. See POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md.
+  const authoritativeTotal = hasPlacedItems ? (total || finalTotal) : finalTotal;
+  const effectiveTotal = authoritativeTotal + (isRoom ? associatedTotal : 0) + roomBalance;
```

**Net change:** +7 lines (1 logic line + 6 comment), -1 line. **Net +6.**

**Cascades automatically (no further edits):**
- L368-371 cash auto-fill effect keys off `effectiveTotal` → corrects on its own.
- L373 `change` calc keys off `effectiveTotal` → corrects.
- L505 Grand Total `<span>` displays `effectiveTotal.toLocaleString()` → corrects.
- L573 Pay button disable predicate `cashReceived < effectiveTotal` → corrects.
- L582 / L584 Pay button label `Pay ₹{effectiveTotal.toLocaleString()}` → corrects.

### Diff 2 — Hide breakdown chrome on placed orders (L492-500)

```diff
-        {/* Bill summary rows */}
-        <div className="pt-1.5 space-y-1" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
+        {/* Bill summary rows — POS3.1 BUG-111 (2026-05-27): hidden on placed orders.
+            The breakdown is locally recomputed and would mismatch the server's
+            authoritative Grand Total (which already reflects Full Mode discount /
+            coupon / loyalty / wallet). Only Grand Total + payment buttons remain
+            on placed orders. Unplaced orders show the full breakdown as today. */}
+        {!hasPlacedItems && (
+        <div className="pt-1.5 space-y-1" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
           <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Item Total</span><span style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span></div>
           {totalDiscount > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Discount</span><span style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount.toFixed(2)}</span></div>}
           {serviceCharge > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Service Charge ({scPct}%)</span><span style={{ color: COLORS.darkText }}>₹{serviceCharge.toFixed(2)}</span></div>}
           {deliveryCharge > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Delivery</span><span style={{ color: COLORS.darkText }}>₹{deliveryCharge.toFixed(2)}</span></div>}
           {(sgst + cgst) > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Tax (GST)</span><span style={{ color: COLORS.darkText }}>₹{(sgst + cgst).toFixed(2)}</span></div>}
           {vatAmount > 0.01 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>VAT</span><span style={{ color: COLORS.darkText }}>₹{vatAmount.toFixed(2)}</span></div>}
           {roundOff !== 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Round-off</span><span style={{ color: COLORS.darkText }}>₹{roundOff.toFixed(2)}</span></div>}
         </div>
+        )}
```

**Net change:** +7 lines (1 wrapper open + 1 wrapper close + 5 comment), 0 logic deletions. **Net +7.**

> **Note on the QSR Discount selector (L424-468):** it's already gated on `qsrDiscountEnabled` (a profile toggle). On a placed order the cashier can technically still flip the dropdown, but the locally-computed `totalDiscount` no longer drives `effectiveTotal` (Diff 1) and the breakdown row is hidden (Diff 2). So even if the cashier interacts with it, nothing visible or chargeable changes. **No additional gate needed in this CR** — keeps the diff minimal. If owner wants to disable the dropdown UI too on placed orders, that's a 1-line follow-up CR.

### Diff Totals

| File | Lines added | Lines deleted | Net |
|---|---|---|---|
| `CartPanel.jsx` | +14 | -1 | **+13 (mostly comments)** |
| **Logic lines only (excluding comments/whitespace):** | **+3** | **-1** | **+2** |

**1 file, 2 small additive edits, mirrors the existing Full Mode `total` branch upstream.**

---

## 5. Test Matrix

### 5.1 Server-prefer path (placed orders — main fix)

| # | Setup (Full Mode applied first, then switch to QSR) | Expected QSR display | Expected behaviour |
|---|---|---|---|
| S-1 | Plain placed order (no discount), `orderFinancials.amount = 1142` | Breakdown rows hidden. Grand Total ₹1,142. | Pay button shows ₹1,142. Cash auto-fill ₹1,142. |
| S-2 | Full Mode applied ₹500 restaurant discount → `amount = 675` | Breakdown rows hidden. Grand Total ₹675. | Pay button ₹675. Cash auto-fill ₹675. **Cashier no longer overcharges.** |
| S-3 | Full Mode applied coupon (₹100 off) → `amount = 1100` | Breakdown rows hidden. Grand Total ₹1,100. | Pay button ₹1,100. |
| S-4 | Full Mode applied loyalty (₹30 off, 300 pts) → `amount = 1170` | Breakdown rows hidden. Grand Total ₹1,170. | Pay button ₹1,170. |
| S-5 | Full Mode applied wallet (₹75 off) → `amount = 1125` | Breakdown rows hidden. Grand Total ₹1,125. | Pay button ₹1,125. |
| S-6 | All four (S-2+3+4+5) → `amount = 437` | Breakdown rows hidden. Grand Total ₹437. | Pay button ₹437. |
| S-7 | Placed delivery order, server `amount` includes delivery + delivery GST | Breakdown rows hidden. Grand Total = server's full delivery-inclusive total. | Pay button matches. |
| S-8 | Room order, server `amount` already includes room balance + associated table totals | Breakdown rows hidden. Grand Total = `total + associatedTotal + roomBalance`. | Pay button matches. (If server already rolls these in, the `+ associatedTotal + roomBalance` adds 0 because they're 0 — verify with owner if regression.) |
| S-9 | Placed-but-unpaid order (cashier did "Place Order" then opened QSR) | Breakdown rows hidden. Grand Total = server amount. | Pay button visible (BUG-110 wrap only hides on `isPrepaid && hasPlacedItems`). |

### 5.2 Local-compute path (unplaced new orders — no regression)

| # | Setup (fresh QSR order, no `placedOrderId`, `hasPlacedItems === false`) | Expected |
|---|---|---|
| L-1 | Cashier picks items, no discount | **Breakdown rows visible** (same as today). Local Item Total, Tax, Grand Total. |
| L-2 | Cashier flips QSR Discount → 10% | Discount row appears, Grand Total recomputes locally. Same as today. |
| L-3 | Cashier types delivery charge in QSR delivery editor | Delivery row updates, Grand Total recomputes locally. Same as today. |
| L-4 | Empty cart | QsrBillingSection not rendered (existing gate at L1255). |

### 5.3 Edge cases

| # | Scenario | Expected |
|---|---|---|
| E-1 | `hasPlacedItems === true` but `total` prop is 0/undefined (race) | Falls back to `finalTotal` via `(total \|\| finalTotal)` guard. No NaN. |
| E-2 | Placed order then cashier adds a new item (creates unplaced delta) | `hasPlacedItems === true` → server path. Server `amount` doesn't yet include the delta. **Pay button = server total ignoring the new item.** This is consistent with `OrderEntry.jsx:788-792` which adds `applyRoundOff(rawUnplacedTotal)` to `total` — so the delta IS already in `total` upstream. Verify in S-9b live test. |
| E-3 | Room order — does `total` from upstream already include `associatedTotal + roomBalance`? | Per L788-792, `total = orderFinancials.amount + unplacedRound + deliveryDelta`. Room balance is **NOT** added at L788. The QSR path's existing `+ (isRoom ? associatedTotal : 0) + roomBalance` continues to add them on top — preserved in Diff 1. ✅ no regression. |

### 5.4 Full Mode no-regression

| # | Scenario | Expected |
|---|---|---|
| F-1 | Full Mode order with discount/coupon/loyalty → Collect Bill | `CollectPaymentPanel` untouched. Same as today. |
| F-2 | Full Mode order → re-engage from dashboard | `OrderEntry.jsx:788-792` `total` branch already correct (unchanged). Same as today. |

### 5.5 Build / lint

| # | Test |
|---|---|
| B-1 | `cd /app/frontend && CI=false yarn build` → exit 0 |
| B-2 | ESLint clean on `CartPanel.jsx` |

---

## 6. Rollback

**Single-file revert:** `git checkout HEAD~1 -- frontend/src/components/order-entry/CartPanel.jsx`.

**Even narrower kill switch:** revert Diff 1 only by changing the new line back to `const effectiveTotal = finalTotal + (isRoom ? associatedTotal : 0) + roomBalance;`. Diff 2 (breakdown hide) can stay or revert independently.

No data migration. No state cleanup. No localStorage. No socket. No backend. **Zero blast radius.**

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `total` prop is 0 on a placed order (race / missing socket frame) | L | L | `(total \|\| finalTotal)` fallback → degrades to today's behaviour, not worse. |
| Cashier confused by missing breakdown on placed orders | L | L | Grand Total + Pay button + Cash Received remain visible. If owner wants the breakdown back, flip Diff 2 (1-line revert). |
| `total` upstream already includes room balance and we double-count | L | M | Verified at L788-792: room balance is **NOT** in `total`; the `+ associatedTotal + roomBalance` add is preserved. S-8 live test confirms. |
| Hot-reload breaks during edit | L | L | Standard CRA dev-server resilience. |

---

## 8. Regression risk classification (per CHANGE_REQUEST_PLAYBOOK §165)

| Hotspot file touched? | Answer |
|---|---|
| `DashboardPage.jsx` | NO |
| `OrderEntry.jsx` | NO |
| `CollectPaymentPanel.jsx` | NO |
| `orderTransform.js` | NO |
| `reportService.js` | NO |
| socket handlers | NO |
| localStorage keys | NO |
| payment / tax / discount / SC / round-off logic | NO logic change — only display path swaps from local-recompute to existing-prop-passthrough on placed orders. |
| **`CartPanel.jsx`** | **YES — but additive only (1 ternary, 1 conditional wrap). No deletions, no rewrites.** |

Per playbook: **single-hotspot, additive-only, with kill switch → LOW regression risk.** Mitigated by §5 test matrix (9 server cases + 4 local cases + 3 edge + 2 Full Mode + build/lint).

---

## 9. Approval gates per owner direction (strict)

```
Gate A — APPROVE THIS PLAN DOC                          [PENDING owner approval]
Gate B — APPROVE DIFF 1 (effectiveTotal swap, +7 lines)  [HOLD]
Gate C — APPROVE DIFF 2 (breakdown hide wrap, +7 lines)  [HOLD]
Gate D — Build + lint summary shown                     [auto after edit]
Gate E — APPROVE combined QA + handoff doc for           [HOLD]
         BUG-109 + BUG-110 + BUG-111
Gate F — APPROVE close-out                                [HOLD]
```

Owner can collapse B + C into a single "go ahead with both diffs" approval if desired — say so explicitly.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code edited by writing this plan | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Streamlined mini-CR format per owner direction | CONFIRMED |
| 7 | Strict per-gate owner approval honoured | CONFIRMED |
| 8 | All ACs derived from owner bug screenshots + "use same code as prepaid" directive | CONFIRMED |
| 9 | All diffs shown as text BEFORE any edit | CONFIRMED |
| 10 | No outbound payload contract change | CONFIRMED |
| 11 | No CRM / BE / socket / localStorage change | CONFIRMED |
| 12 | Mirrors existing `OrderEntry.jsx:788-792` Full Mode `total` branch | CONFIRMED |
| 13 | Single file touched | CONFIRMED |

---

## 11. Why this is the right fix (vs. the over-engineered earlier draft)

The earlier draft of this plan proposed surfacing 11 new transform keys, extending `orderFinancials` state shape with 15 keys across 5 re-seed sites, threading them through CartPanel, and re-rendering 7 bill rows from server data — a 3-file, ~120-line additive change with medium regression risk.

That was wrong. The server data **is already in `orderFinancials.amount`**, **is already added into `total`** at `OrderEntry.jsx:788-792` (with proper handling of unplaced deltas and delivery delta), **is already passed as a prop** through CartPanel → QsrBillingSection. The only bug is that `QsrBillingSection` doesn't consume the prop it already receives.

Reading the prop = 1 logic line. Hiding the misleading breakdown rows = 1 conditional wrap. Done.

This is the **exact same pattern** that Full Mode uses upstream (L788-792 ternary). No new architecture; no new abstraction; no parallel data flow.

---

**End of POS3.1 BUG-111 Phase 1 Minimal Plan.**

---

## 12. PHASE 1 SHIPPED STATUS (2026-05-27)

| Gate | Status | Notes |
|---|---|---|
| Gate A — Plan approval | ✅ APPROVED 2026-05-27 |
| Gate B — Diff 1 (effectiveTotal swap) | ✅ APPLIED `CartPanel.jsx` L362 |
| Gate C — Diff 2 (breakdown hide on placed) | ✅ APPLIED `CartPanel.jsx` L492 |
| Gate D — Build + lint | ✅ PASSED exit 0, no new ESLint errors, bundle -45B |
| Gate E — Combined QA doc (109/110/111) | ⏳ PENDING (next session) |
| Gate F — Close-out | ⏳ PENDING |

**Owner-confirmed live observation (2026-05-27 screenshot, order with ₹675 Grand Total):**
- ✅ Grand Total now correctly reads ₹675 (server-authoritative `total` prop) instead of locally-recomputed ₹1,200+
- ✅ Pay button + Cash Received auto-fill cascade correctly
- ❌ **Open issue surfaced:** breakdown rows (Item Total, Discount, Subtotal, Tax) are completely hidden on placed orders — owner wants them VISIBLE but populated from server data → **see Phase 2 below**

---

## 13. PHASE 2 PLAN — SERVER-DRIVEN BREAKDOWN (PROPOSED, AWAITING APPROVAL)

**Status:** Stage 5 PROPOSED — awaiting Gate A approval next session.

**One-line scope:** Replace the "hide breakdown on placed orders" wrap (Phase 1 Diff 2) with a server-driven breakdown branch that renders Item Total / Discount (aggregated) / Subtotal / Tax / Round-off from `orderFromContext`/`orderData` fields. Unplaced orders keep local recompute (interactive QSR Discount selector).

### Phase 2 — Diffs (3 files, ~+32 lines net)

| Diff | File | Change | Net lines |
|---|---|---|---|
| **3** | `orderTransform.js fromAPI.order` (after L227) | Surface 6 missing server fields: `couponDiscount`, `loyaltyDiscount`, `walletDebit`, `gstTax`, `vatTax`, `roundUp` (all `parseFloat \|\| 0`, missing → 0 → row hidden by `> 0` guard) | +8 |
| **4** | `OrderEntry.jsx` L2147 `<CartPanel>` prop list | Add 1 prop: `placedOrderData={orderFromContext \|\| orderData}` (uses the socket-synced order when present, falls back to initial transform) | +3 |
| **5** | `CartPanel.jsx` outer destructure + `QsrBillingSection` destructure (L244-252) + call site (L1256-1275) | Forward `placedOrderData` prop through both layers | +3 |
| **6** | `CartPanel.jsx` L492-501 (replaces Phase 1 Diff 2 wrapper) | Add 2-branch ternary: `hasPlacedItems && placedOrderData` → render server-driven breakdown block (8 rows reading from `placedOrderData.*`); else → existing local-recompute block (unchanged) | ~+21 net (~+30 add, -9 wrapper removal) |
| **Total** | 3 files | | **~+35 lines, 3 files, 0 logic rewrites** |

### Phase 2 — Frozen Acceptance Criteria

| AC | Rule |
|---|---|
| **AC-111-P2-1** | When `hasPlacedItems === true` AND `placedOrderData !== null` → breakdown rows render from server fields: `Item Total = placedOrderData.subtotalAmount`; **`Discount = sum(discount + couponDiscount + loyaltyDiscount + walletDebit)`** (single aggregated row per owner directive 2026-05-27); `Subtotal = placedOrderData.subtotalBeforeTax`; `Service Charge = placedOrderData.serviceTax`; `Delivery = placedOrderData.deliveryCharge`; `Tax (GST) = placedOrderData.gstTax`; `VAT = placedOrderData.vatTax`; `Round-off = placedOrderData.roundUp`. |
| **AC-111-P2-2** | Grand Total still reads `effectiveTotal` (Phase 1 Diff 1) → byte-identical to today. |
| **AC-111-P2-3** | `> 0` (or `> 0.01` for VAT, `!== 0` for round-off) guards on each row → server-zero fields hide cleanly. |
| **AC-111-P2-4** | Unplaced order or `placedOrderData === null` → fallback to local-recompute block (today's behaviour). |
| **AC-111-P2-5** | Single aggregated "Discount" row — owner directive 2026-05-27: "loyalty + coupon + other discounts all shd club in single discount for qsr view". |
| **AC-111-P2-6** | No outbound payload change. No `orderFinancials` state extension. No new prop besides `placedOrderData`. |
| **AC-111-P2-7** | Phase 1 fix retained (effectiveTotal uses server `total` prop). |

### Phase 2 — Critical live test (BLOCKING for Phase 2 close-out)

**Test scenario T-DISCOUNT-CLUB (owner directive 2026-05-27):**
1. Open a fresh order in Full Mode → add items totalling, say, ₹1,200.
2. Apply **all four** discount sources in Full Mode `CollectPaymentPanel`:
   - Restaurant discount (e.g. ₹50 manual)
   - Coupon (e.g. WELCOME10, ₹100 off)
   - Loyalty redemption (e.g. 300 pts = ₹30 off)
   - Wallet debit (e.g. ₹50 off)
3. Submit Collect Bill → server returns single-order-new with `restaurant_discount_amount=50, coupon_discount=100, loyalty_discount=30, use_wallet_balance=50, order_amount=...`.
4. Navigate back to the order in QSR mode.
5. **Expected:** QSR Billing summary shows:
   - `Item Total ₹1,200`
   - `Discount -₹230` ← **single aggregated row** (50 + 100 + 30 + 50)
   - `Service Charge ₹X`
   - `Subtotal ₹X`
   - `Tax (GST) ₹X`
   - `Round-off ₹X`
   - `Grand Total ₹X` (server-authoritative)
6. **FAIL if:** discount rows appear separated, OR any single source is missed, OR breakdown values don't match Full Mode's Collect Bill summary for the same order.

### Phase 2 — Approval gates

```
Gate A-P2 — APPROVE PHASE 2 PLAN                              [PENDING next session]
Gate B-P2 — APPROVE DIFF 3 (orderTransform.js +8 lines)        [HOLD]
Gate C-P2 — APPROVE DIFF 4 (OrderEntry.jsx +3 lines)           [HOLD]
Gate D-P2 — APPROVE DIFF 5 (CartPanel.jsx wire-through +3)     [HOLD]
Gate E-P2 — APPROVE DIFF 6 (server-driven breakdown render)    [HOLD]
Gate F-P2 — Build + lint summary shown                         [auto after edit]
Gate G-P2 — Live test T-DISCOUNT-CLUB executed                 [HOLD — needs preprod order]
Gate H-P2 — APPROVE combined QA doc (109/110/111-P1/P2)         [HOLD]
Gate I-P2 — APPROVE close-out                                   [HOLD]
```

**End of POS3.1 BUG-111 Plan (Phase 1 SHIPPED + Phase 2 PROPOSED). Awaiting next session for Phase 2 Gate A-P2 approval.**
