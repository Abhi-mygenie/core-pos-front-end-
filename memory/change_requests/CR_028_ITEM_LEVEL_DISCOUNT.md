# CR-028: Item-Level Discount — Payload + `give_discount` Exclusion

**Registered:** 2026-06-11
**Sprint:** pos_4_0 (carried → next sprint backlog)
**Priority:** P1 (money-impacting — discount math + payload contract)
**Status:** REGISTERED — INTAKE COMPLETE (investigation done, code-verified). NO CODE YET.
**Owner directive (verbatim):** *"so there are gaps 1. we need to send item level discount 2. if discount not applicable for any item it should be excluded"*
**Related:** CR-025 (order-level discount payload fix — order_discount ₹ amount, self_discount 0), BUG-114 (discount_type/member-category threading), CR-013 (GST proration via discountRatio), BUG-018 (complimentary carve-out — the pattern to copy)

---

## 1. GAPS (code-verified 2026-06-11)

### Gap 1 — Payload sends NO item-level discount
Every food item row in Place Order / Collect Bill payloads sends hardcoded:
```js
discount_amount: '0.00',        // orderTransform.js:603 — buildFoodItem()
```
Discount travels ONLY on the order header (`order_discount`, `comm_discount`, `discount_value`, `discount_type`, `discount_member_category_id/name`, `self_discount: 0` — per CR-025). Backend therefore cannot know how the discount distributes across items.

### Gap 2 — `give_discount = 'No'` items are NOT excluded from discount
- The flag exists only in Menu Management: `menuManagementTransform.js:95/245` (`giveDiscount` ⇄ `give_discount` Yes/No), `ProductForm.jsx:363` ("Allow Discount" toggle), `BulkEditor.jsx:27` ("Give Discount" column).
- The order-entry pipeline never reads it: `productTransform.js` (builds cart items) does **not map the field** → cart items don't carry it → CartPanel / CollectPaymentPanel / orderTransform cannot check it.
- Result: a 10% order discount today applies to **all billable items, including "Give Discount = No" items**.

### Current discount math (both panels, identical)
```
itemTotal      = Σ linePrice(billableItems)            // billable = active, not cancelled,
presetDiscount = round(itemTotal × catPct)/100         //   not complimentary, not check-in
manualDiscount = round(itemTotal × pct)/100 OR flat ₹  //   marker, not room-balance
totalDiscount  = manual + preset (+ coupon/loyalty/wallet in Collect Bill)
discountRatio  = totalDiscount / itemTotal             // GST proration only (CR-013)
```
Locations: `CartPanel.jsx:384-387` (Place Order/QSR), `CollectPaymentPanel.jsx:514-527, 579-583` (Collect Bill).

---

## 2. REQUIRED BEHAVIOUR (target)

1. **Discountable base:** `discountableItems = billableItems.filter(i => i.giveDiscount !== false)`.
   Percent discounts (manual % + category preset %) compute on `discountableTotal`, not `itemTotal`.
2. **Per-item distribution:** order discount distributed across **discountable items only**, proportional to line value:
   `itemDiscount = totalDiscount × (linePrice / discountableTotal)` (2-dp; rounding residue on largest line — standard largest-remainder).
   Excluded items (`give_discount='No'`, complimentary, cancelled, room-balance) always send `discount_amount: '0.00'`.
3. **Payload:** `buildFoodItem()` emits the real per-item `discount_amount`; header totals unchanged (must still equal Σ item discounts).
4. **GST proration follows the same base:** `discountRatio` must become per-item (excluded items keep full tax base) — today's uniform ratio under-taxes excluded items' GST once exclusion lands.
5. **UI:** on-screen Discount row = same total (now computed on discountable base); optional "(n items not discountable)" hint.

---

## 3. IMPLEMENTATION PLAN (4 phases — pending owner go-ahead)

| Phase | Work | Files |
|---|---|---|
| 1 | Carry `giveDiscount` into cart items: map `give_discount` in `productTransform.js`; verify field present in menu list API used by order entry (it IS in menu-management API; **confirm the POS menu endpoint returns it** — if not, BACKEND ASK) | `productTransform.js`, `MenuContext.jsx` |
| 2 | Discountable-base math: `discountableItems`/`discountableTotal` alongside `billableItems`; % discounts on the new base; flat ₹ capped at `discountableTotal` | `CartPanel.jsx`, `CollectPaymentPanel.jsx` |
| 3 | Per-item distribution + payload: pass per-item discount map into transform; `buildFoodItem()` emits real `discount_amount`; per-item GST ratio | `orderTransform.js` (all 3 builders: place, placeWithPayment, collectBillExisting) |
| 4 | QA: payload assertions (Σ item discount_amount === order_discount; excluded items 0.00), regression on CR-025/BUG-114/CR-021 payload fields, GST totals vs CR-013 rules | tests + manual |

---

## 4. OPEN DECISIONS (owner/backend — block Phase 2+)

| # | Question | Why it matters |
|---|---|---|
| OD-1 | Does the POS order-entry menu API return `give_discount`? (Menu-management API does.) If not → backend ask | Phase 1 feasibility |
| OD-2 | Flat ₹ discount larger than `discountableTotal`: cap at discountableTotal, or allow and bleed into non-discountable items? | edge math |
| OD-3 | Do coupon / loyalty / wallet discounts also respect `give_discount='No'`, or only manual+preset? (CRM computes loyalty caps server-side) | scope |
| OD-4 | Does backend accept/store per-item `discount_amount` today, or does it need a backend change? (Field exists in payload schema but always 0.00 from POS) | Phase 3 contract |
| OD-5 | Old POS parity: did legacy POS exclude `give_discount='No'` items? (sets expected behaviour baseline) | acceptance criteria |

---

## 5. ARTIFACT TRACKER (6-Artifact Rule)
| # | Artifact | Status |
|---|----------|--------|
| 1 | Intake | DONE — this file (investigation 2026-06-11, code citations verified) |
| 2 | Discovery / Impact | DONE — §1, §2 |
| 3 | Implementation Plan | DRAFT — §3 (blocked on OD-1…OD-5) |
| 4 | Code Implementation | NOT STARTED |
| 5 | QA Report | — |
| 6 | Owner Smoke / Signoff | — |

**Handover for next agent:** `memory/handover/CR028_HANDOVER_2026_06_11.md`
