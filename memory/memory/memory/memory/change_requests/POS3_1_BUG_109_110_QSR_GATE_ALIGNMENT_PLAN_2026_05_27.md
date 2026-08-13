# POS3.1 — BUG-109 + BUG-110 — Combined Plan (Mini-CR, Streamlined)

**Date:** 2026-05-27
**Sprint anchor:** POS3.1 (owner-selected Option A, 2026-05-27)
**CR ID:** `POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT` (single combined CR)
**Stage:** 5 — Plan (Stages 1-4 collapsed into this doc per streamlined mini-CR process)
**Owner approval rule (this CR):** **STRICT — every stage + every code change must be approved before the next move.** No recode; surgical correction only.

**Pairs with:**
- `/app/memory/change_requests/POS_QSR_BUGS_BUG_109_BUG_110_DISCOVERY_REGISTRATION_2026_05_27.md` (discovery)
- `/app/memory/change_requests/POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md` (sibling — QSR bill server-parity, owner-requested 2026-05-27)

---

## 1. One-line scope

> Make QSR mode obey the **existing Full Mode gates** for (a) mandatory takeaway/delivery customer + address validation and (b) prepaid lock after payment. **No new rules. No recode.** Three lines of correction, one file.

---

## 2. Frozen Acceptance Criteria

### 2.1 BUG-109 — QSR validation parity

| AC | Owner-stated rule (verbatim → frozen) |
|---|---|
| **AC-109-1** | When `qsrMode === true` AND `orderType === 'takeAway'` AND `customer.name` is empty → QSR "Place & Pay" / "Pay" button is **disabled**. |
| **AC-109-2** | When `qsrMode === true` AND `orderType === 'delivery'` AND any of `customer.name`, `customer.phone (≠ 10 digits)`, `selectedAddress` is empty → QSR Pay button is **disabled**. |
| **AC-109-3** | When `qsrMode === true` AND `orderType === 'dinein'` (or any non-takeaway/non-delivery) → no new gate; existing behaviour preserved. |
| **AC-109-4** | When `qsrMode === false` (Full Mode) → existing Place Order + Collect Bill validation unchanged (regression-free). |
| **AC-109-5** | Visual indication: same red-border + asterisk + `nameMissing/phoneMissing/addressMissing` field decoration already exists at CartPanel L889-1023 — no new UX, just the button gate. |

### 2.2 BUG-110 — QSR prepaid lock parity

| AC | Owner-stated rule (verbatim → frozen) |
|---|---|
| **AC-110-1** | After a QSR order is paid (server echoes `payment_type === 'prepaid'`) **and** the cart has placed items → QSR Pay button is **hidden** (matches Full Mode L1272 / L1293 pattern). |
| **AC-110-2** | The "Full Billing" link still works on a paid QSR order → it opens OrderEntry in Full Mode. Full Mode's existing `isPrepaid` lock chain (L1272 / L1293 / L1079 / L1407 / L1419) already gates editing for any prepaid order — no new Full Mode change in this CR. |
| **AC-110-3** | When `payment_type !== 'prepaid'` (e.g. unpaid QSR order, or place-and-hold) → QSR Pay button visible and functional as before. |
| **AC-110-4** | Normal-mode prepaid orders → no regression. The fix is QSR-section-local; the Full Mode lock chain is untouched. |

### 2.3 Build / lint / regression

| AC | Description |
|---|---|
| **AC-COMMON-1** | `cd /app/frontend && CI=false yarn build` → exit 0. No new ESLint errors beyond the pre-existing `OrderEntry.jsx:1308` `printOrder` warning. |
| **AC-COMMON-2** | No file outside `/app/frontend/src/components/order-entry/CartPanel.jsx` is touched. |
| **AC-COMMON-3** | `/app/memory/final/`, `/app/memory/crm/crm_1_0/` untouched. |
| **AC-COMMON-4** | No CRM contract change, no POS Backend change, no socket-handler change, no payload-shape change. |

---

## 3. Exact diffs (as text — for owner review BEFORE any edit)

> Format: 3 anchored search-replace blocks. No reformat, no comment rewriting. Pure additive predicate wiring.

### Diff 1 — QsrBillingSection prop destructure (closes BUG-109 part a)

**File:** `/app/frontend/src/components/order-entry/CartPanel.jsx`
**Lines (today):** 244-251

```diff
 const QsrBillingSection = ({
   cartItems, total, orderType, restaurant, qsrDiscountEnabled,
   deliveryCharge: dcProp, onDeliveryChargeChange,
   isPrepaid, isWebOrder, initialDeliveryCharge,
   isRoom, associatedOrders = [], roomInfo,
   onQsrCollectBill, onFullBilling, isPlacingOrder,
   hasPlacedItems = false,
+  hasValidationErrors = false,
 }) => {
```

**Net change:** +1 line. Default `false` keeps the prop optional → if any other caller exists (none today), it stays backward-compatible.

---

### Diff 2 — QSR Pay button disable expression (closes BUG-109 part b AND BUG-110)

**File:** `/app/frontend/src/components/order-entry/CartPanel.jsx`
**Lines (today):** 561-572

```diff
       {/* Collect Bill CTA + Full Billing link */}
       <div className="p-4" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
+        {!(isPrepaid && hasPlacedItems) && (
         <button
           onClick={handleCollectBill}
           disabled={
             isPlacingOrder ||
+            hasValidationErrors ||
             (paymentMethod === 'cash' && cashReceived && parseFloat(cashReceived) < effectiveTotal)
           }
           className="w-full py-3 rounded-lg font-bold text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
           style={{ backgroundColor: COLORS.primaryGreen }}
           data-testid="qsr-collect-bill-btn"
         >
```

**And the matching closing brace** at the end of the button block (after the existing `</button>` at ~L580):

```diff
         </button>
+        )}
```

**Net change:** +3 lines (1 wrapper open, 1 `hasValidationErrors` clause, 1 wrapper close). Mirrors Full Mode pattern at L1272 / L1293.

> **Important:** the wrap at the outer `{!(isPrepaid && hasPlacedItems) && (` covers BOTH the Pay button *and* the existing "Full Billing" link below it? NO — re-reading the file, the "Full Billing" link sits **outside** the Pay button block but **inside** the same outer `<div>`. Owner must decide one of two micro-options below before implementation:

| Micro-option | What the wrapper covers | Resulting UX on paid QSR order |
|---|---|---|
| **M-A** (recommended) | Wrap **only the `<button data-testid="qsr-collect-bill-btn">`** block — the "Full Billing" link stays visible | Pay button gone; cashier can still click "Full Billing" to open the read-only-equivalent Full Mode view of the paid order. **Matches owner's "view only" intent.** |
| **M-B** | Wrap the whole outer `<div className="p-4">` | Pay button AND Full Billing link both gone | Cashier loses the easy entry-point to Full Mode; would have to navigate back via dashboard |

**Plan default = M-A** (matches your Q2 = "view only" answer earlier). If you want M-B, say so and I'll adjust the wrap location before edit.

---

### Diff 3 — QsrBillingSection call site, pass `hasValidationErrors` (closes BUG-109 part a wiring)

**File:** `/app/frontend/src/components/order-entry/CartPanel.jsx`
**Lines (today):** 1249-1267

```diff
         <QsrBillingSection
           cartItems={cartItems}
           total={total}
           orderType={orderType}
           restaurant={restaurant}
           qsrDiscountEnabled={qsrDiscountEnabled}
           deliveryCharge={deliveryCharge}
           onDeliveryChargeChange={onDeliveryChargeChange}
           isPrepaid={isPrepaid}
           isWebOrder={isWebOrder}
           initialDeliveryCharge={initialDeliveryCharge}
           isRoom={isRoom}
           associatedOrders={associatedOrders}
           roomInfo={roomInfo}
           onQsrCollectBill={onQsrCollectBill}
           onFullBilling={onFullBilling}
           isPlacingOrder={isPlacingOrder}
           hasPlacedItems={hasPlacedItems}
+          hasValidationErrors={hasValidationErrors}
         />
```

**Net change:** +1 line.

---

### Diff Totals

| Bug | Diff | Lines |
|---|---|---|
| BUG-109 | Diff 1 (+1) + Diff 3 (+1) + the `\|\| hasValidationErrors` clause inside Diff 2 (+1) | +3 |
| BUG-110 | The `!(isPrepaid && hasPlacedItems)` wrap inside Diff 2 (+2 → outer wrap open and close) | +2 |
| **Total** | One file: `CartPanel.jsx` | **+5 lines, 0 deletions, 0 rewrites** |

---

## 4. Test Matrix

### 4.1 QSR positive — should be blocked

| # | Mode | Order type | name | phone | address | Already paid? | Expected |
|---|---|---|---|---|---|---|---|
| Q-1 | QSR | takeaway | empty | — | — | No | Pay button **disabled** |
| Q-2 | QSR | takeaway | "Anand" | empty | — | No | Pay button **enabled** (phone not required for takeaway) |
| Q-3 | QSR | delivery | empty | filled | filled | No | Pay button **disabled** (name missing) |
| Q-4 | QSR | delivery | "Anand" | "12345" (≠10 digits) | filled | No | Pay button **disabled** (phone invalid) |
| Q-5 | QSR | delivery | "Anand" | "9876543210" | no address | No | Pay button **disabled** (address missing) |

### 4.2 QSR positive — should be allowed

| # | Mode | Order type | name | phone | address | Already paid? | Expected |
|---|---|---|---|---|---|---|---|
| Q-6 | QSR | dinein | empty | empty | — | No | Pay button **enabled** (validation doesn't apply to dinein) |
| Q-7 | QSR | takeaway | "Anand" | — | — | No | Pay button **enabled** |
| Q-8 | QSR | delivery | "Anand" | "9876543210" | filled | No | Pay button **enabled** |

### 4.3 QSR prepaid lock (BUG-110)

| # | Sequence | Expected |
|---|---|---|
| P-1 | QSR → place & pay (cash) → server echoes `payment_type='prepaid'` → cashier navigates to Cart and back to Order | Pay button **hidden**. "Full Billing" link still visible (M-A). |
| P-2 | QSR → place & pay → click "Full Billing" link | Full Mode opens; `isPrepaid===true`; existing Full Mode Place Order + Collect Bill buttons hidden (L1272 / L1293) |
| P-3 | QSR → place & hold (no pay yet) | Pay button **visible** (still unpaid; `isPrepaid===false`) |

### 4.4 Full Mode regression (BUG-110 must not affect Full Mode)

| # | Sequence | Expected |
|---|---|---|
| F-1 | Full Mode → place order → collect bill → pay | Place Order + Collect Bill buttons hide post-payment (unchanged — L1272 / L1293 still gating) |
| F-2 | Full Mode → takeaway with empty name | Place Order button disabled (unchanged — L1276 still gates) |
| F-3 | Full Mode → delivery with no address | Collect Bill button disabled (unchanged — L1299 still gates) |

### 4.5 Build / lint

| # | Test |
|---|---|
| B-1 | `cd /app/frontend && CI=false yarn build` → exit 0 |
| B-2 | ESLint clean on `CartPanel.jsx` (one file edit) |

---

## 5. Rollback

**One-file revert:** `git checkout HEAD~1 -- frontend/src/components/order-entry/CartPanel.jsx`.

No data migration. No state cleanup. No localStorage key. No socket-handler change. No backend change. Zero blast radius.

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `hasValidationErrors` not in scope at the QsrBillingSection call site (CartPanel L1249-1267) | None | — | Verified during audit — `hasValidationErrors` is defined at L689 in the same `CartPanel` outer component scope, before the call site. |
| Wrapping the Pay button hides the "Full Billing" link too | Owner-decided | — | M-A keeps Full Billing visible (default); M-B hides both — owner picks at top of §3 Diff 2. |
| Full Mode's `isPrepaid` lock chain doesn't fully prevent cart-item edits on paid orders (qty change, item add/remove) | M (pre-existing behaviour) | M | **Out of scope** of this CR. Per owner direction "QSR follows Full Mode" — if Full Mode allows it, QSR allowing it via the Full Billing link is also acceptable for now. If owner wants stricter Full Mode lockdown, that's a separate CR (call it POS3.1-BUG-111). |
| Socket-echo race: cashier clicks Pay → server processes → echo not yet received → `isPrepaid` still false for ~200ms → Pay button visible during race | L | L | Acceptable. The race exists in Full Mode too. Self-heals on next socket frame. |
| Hot-reload breaks during edit | L | L | Standard CRA dev-server resilience. |

---

## 7. Regression risk classification (per CHANGE_REQUEST_PLAYBOOK §165)

| Hotspot file touched? | Answer |
|---|---|
| `DashboardPage.jsx` | NO |
| `OrderEntry.jsx` | NO |
| `CollectPaymentPanel.jsx` | NO |
| `RoomCheckInModal.jsx` | NO |
| `StatusConfigPage.jsx` | NO |
| `orderTransform.js` | NO |
| `reportService.js` | NO |
| socket handlers | NO |
| localStorage keys | NO |
| payment/tax/discount/service charge/round-off logic | NO |
| **`CartPanel.jsx`** | **YES — but the changes are additive predicates that mirror existing patterns; no logic rewrite.** |

Per the playbook, the **CartPanel.jsx** touch alone keeps this at **medium regression risk** — mitigated by the test matrix in §4 (8 QSR cases + 3 Full Mode no-regression cases).

---

## 8. Approval gates per owner direction (strict)

```
Gate A — APPROVE THIS PLAN DOC                  [PENDING owner approval]
Gate B — APPROVE DIFF 1 (prop destructure)      [HOLD]
Gate C — APPROVE DIFF 2 (button wrap + clause;  [HOLD]
                          including M-A vs M-B)
Gate D — APPROVE DIFF 3 (call-site prop pass)   [HOLD]
Gate E — APPROVE POS3.1 sprint scaffold creation [HOLD]
Gate F — Build + lint summary shown            [auto after edit]
Gate G — APPROVE QA + handoff doc draft         [HOLD]
Gate H — APPROVE close-out                       [HOLD]
```

Owner can collapse Gates B/C/D into a single "go ahead with all three diffs" approval if desired — just say so explicitly.

---

## 9. Sprint scaffold note

POS3.1 sprint folder will be created at Gate E (just before code edit), with:
```
/app/memory/change_requests/pos_3_1/
  README.md                                          (sprint scaffold)
  POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_PLAN.md     (this doc — moved/copied)
  POS3_1_BUG_109_110_QSR_GATE_ALIGNMENT_QA.md       (written at Gate G)
```

For now, this plan doc lives at `/app/memory/change_requests/POS_QSR_BUGS_BUG_109_BUG_110_DISCOVERY_REGISTRATION_2026_05_27.md`-adjacent path **TBD at scaffold time**.

---

## 10. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code edited by writing this plan | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Single combined CR per owner direction | CONFIRMED |
| 7 | Streamlined mini-CR format per owner direction | CONFIRMED |
| 8 | Strict per-gate owner approval honoured | CONFIRMED |
| 9 | All ACs derived verbatim from owner's bug reports | CONFIRMED |
| 10 | All diffs shown as text BEFORE any edit | CONFIRMED |

---

**End of POS3.1 BUG-109 + BUG-110 Combined Plan. Stage 5 awaiting owner approval at Gate A.**
