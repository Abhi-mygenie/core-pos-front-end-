# CR-028: Item-Level Discount — IMPLEMENTED (v3, 2026-06-12)

**Registered:** 2026-06-11
**Revised:** 2026-06-12 (v2: owner clarifications F1/F5/F6) → **v3: CODE COMPLETE** (2026-06-12)
**Sprint:** pos_4_0 (carried → next sprint backlog)
**Priority:** P1 (money-impacting — discount math + payload contract)
**Status:** GATE 4 COMPLETE — All phases implemented + QA validated. Pending owner smoke test.
**Owner directive (verbatim):** *"so there are gaps 1. we need to send item level discount 2. if discount not applicable for any item it should be excluded"*
**Extended scope (owner 2026-06-11):** *"also add when coupon code comes in picture for item level discount that time it becomes additional discount only on that item"*
**Related:** CR-025 (order-level discount payload fix), BUG-114 (discount_type/member-category threading), CR-013 (GST proration via discountRatio), BUG-018 (complimentary carve-out — pattern to copy), BUG-108 (coupon/loyalty/wallet CRM wiring)

---

## 0. REVISION LOG

| Date | Change | Source |
|------|--------|--------|
| 2026-06-12 | **F1:** Removed `discount_value` from item-level payload. Backend does not have this column at item level. Only `discount_amount` sent per item. | Owner directive |
| 2026-06-12 | **F5:** Confirmed item-level key is `discount_amount` (not `discount_value`). No order-level key change needed — `discount_value` at order level stays as-is. | Owner directive |
| 2026-06-12 | **F6:** Test item "Bitt" (id=201143, price=₹10) confirmed in Palm House (rid=541) with `give_discount='No'`. 1 of 465 products. | API-verified |
| 2026-06-12 | **FE-51 audit rule confirmed:** `discount_amount` at item level is a legacy unused field (always ₹0). `discount_on_food` is the backend-computed per-line allocation. CR-028 populates `discount_amount` with FE-computed value. | Code-verified (`insightsService.js:148`) |
| 2026-06-12 | **Phase 1-4 + GST fix implemented.** All phases coded and QA-validated with 13 scenario walkthroughs. Per-item `gst_amount` / `vat_amount` now recomputed on post-discount base. | Code complete |

---

## 1. GAPS (ALL CLOSED)

### Gap 1 — ~~Payload sends NO item-level discount~~ → FIXED
`discount_amount` per item now carries real ₹ discount via `distributeItemDiscounts()` in Flows 3 & 4.

### Gap 2 — ~~`give_discount = 'No'` items NOT excluded~~ → FIXED
`giveDiscount` boolean mapped in `productTransform.js` → threaded to cart via `adaptProduct()` → `fromAPI.orderItem()`. Discount math in both panels uses `discountableTotal` (excludes `giveDiscount=false`). Distribution function excludes non-discountable items.

### Gap 3 — ~~Coupon item/category not distributed per-item~~ → FIXED
`distributeItemDiscounts()` handles `couponType='item'|'category'` via CRM `benefit_items` targeted mapping.

### Gap 4 — ~~BOGO `benefit_items` display-only~~ → FIXED
BOGO benefit amounts flow through same targeted distribution path. `discount_amount = food_amount` for 100% off items.

### Gap 5 — Per-item `gst_amount` was pre-discount → FIXED
Post-processing in Flows 3 & 4 recomputes `gst_amount` and `vat_amount` on `(fullLine - discount_amount)` base. Verified: sum of per-item GST matches order-level `gst_tax`.

---

## 2. OWNER DECISIONS — ALL LOCKED

| # | Question | Answer | Source |
|---|----------|--------|--------|
| OD-1 | Does POS menu API return `give_discount`? | **Yes** — key: `give_discount`, values: `Yes` / `No` | Owner confirmed |
| OD-2 | Flat ₹ discount > `discountableTotal`: cap or bleed? | **CAP** at discountableTotal | Owner confirmed |
| OD-3 | Do coupon/loyalty/wallet respect `give_discount='No'`? | **Yes** — all discount types respect the flag | Owner confirmed |
| OD-4 | Does backend accept/store per-item discount fields? | **Yes** — `discount_amount` ONLY. ~~`discount_value`~~ not used at item level. | Owner confirmed (revised F1) |
| OD-5 | Did legacy POS exclude `give_discount='No'` items? | **Yes** | Owner confirmed |
| OD-6 | Coupon additive on top of manual/preset? | **N/A** — mutually exclusive (code-verified) | Code verified |
| OD-7 | BOGO: food_amount real + discount or food_amount zeroed? | **Option A** — `food_amount` = real menu value, `discount_amount` = food_amount (100% off) | Owner confirmed |
| OD-8 | Trust CRM `benefit_items` values? | **Yes** — POS writes CRM amounts directly | Owner confirmed |
| OD-9 | Does CRM coupon override `give_discount='No'`? | **No** — coupon blocked if target item is non-discountable | Owner confirmed |
| OD-10 | ~~`discount_value` at item level?~~ | **REMOVED** — no `discount_value` at item level. Only `discount_amount`. | Owner directive (F1) |
| OD-11 | Item-level key for discount? | **`discount_amount`** — confirmed correct key. Order-level `discount_value` unchanged. | Owner directive (F5, Option B) |
| OD-12 | Per-item `gst_amount` post-discount? | **Yes** — GST should be computed on `(fullLine - discount_amount)`. Owner confirmed via payload review. | Owner directive (2026-06-12) |

---

## 3. LOCKED PAYLOAD CONTRACT (FINAL)

### ITEM LEVEL — Per-item fields in `cart[]` / `food_detail[]`

| Field | What it is | CR-028 change |
|-------|-----------|---------------|
| `food_amount` | Full line price (qty × unit_price) | Unchanged |
| `variation_amount` | Variation price total | Unchanged |
| `addon_amount` | Addon price total | Unchanged |
| `discount_amount` | ₹ of discount applied to this item (string, 2dp). `'0.00'` = no discount. | **NEW: real value** |
| `gst_amount` | GST on post-discount line (string, 2dp) | **CHANGED: now post-discount** |
| `vat_amount` | VAT on post-discount line (string, 2dp) | **CHANGED: now post-discount** |

~~`discount_value`~~ **NOT SENT at item level.** Backend does not have this column.

**`discount_amount` formula:**
```
fullLineTotal = food_amount + variation_amount + addon_amount
discount_amount = distributed ₹ (largest-remainder proportional, or CRM targeted)
discount_amount = min(discount_amount, fullLineTotal)   // cap at line total
discount_amount = String(discount_amount.toFixed(2))    // string, 2dp
```

**`gst_amount` / `vat_amount` formula (post-discount):**
```
postDiscountLine = fullLineTotal - discount_amount
gst_amount (exclusive) = postDiscountLine × (taxPct / 100)
gst_amount (inclusive) = postDiscountLine - postDiscountLine / (1 + taxPct / 100)
```

### ORDER LEVEL — Header fields (UNCHANGED from current)

| Field | Value | Notes |
|-------|-------|-------|
| `order_discount` | Manual discount ₹ resolved amount | CR-025 |
| `order_discount_type` | `'Percent'` / `'Amount'` | How cashier entered it |
| `comm_discount` | Preset (category) ₹ amount | |
| `discount_type` | Category name (preset) or `'percent'`/`'flat'` (manual) | |
| `discount_value` | Total ₹ resolved discount | No change — stays as-is |
| `self_discount` | `0` | CR-025 |
| `coupon_code` | CRM code | |
| `coupon_discount` | CRM ₹ amount | |
| `coupon_title` | CRM title | |
| `coupon_type` | `'order'`/`'item'`/`'category'` | |
| `discount_member_category_id` | Preset category ID | |
| `discount_member_category_name` | Preset category name | |

### KEY DISAMBIGUATION

| Key | Order Level | Item Level |
|-----|-------------|------------|
| `discount_value` | Total ₹ resolved discount (existing, unchanged) | **NOT SENT** — backend has no column |
| `discount_amount` | **Not sent** at order level | ₹ discount applied to this item (CR-028 new) |

### PER-ITEM MAPPING BY SCENARIO

| Scenario | `discount_amount` | `gst_amount` (5% excl example) |
|----------|-------------------|-------------------------------|
| Manual 10% on ₹100 item | `'10.00'` | `'4.50'` (5% of 90) |
| Manual flat ₹200 across 3 items | Prorated ₹ (largest-remainder) | Post-discount GST per item |
| Preset 15% on ₹200 item | `'30.00'` | `'8.50'` (5% of 170) |
| Coupon order-scope (CRM ₹100) | Prorated ₹ (largest-remainder) | Post-discount GST per item |
| Coupon item-scope (CRM ₹50 on Item B) | `'50.00'` on B; `'0.00'` on others | Post-discount on B; full on others |
| BOGO free item (₹200) | `'200.00'` | `'0.00'` (post-discount = 0) |
| `give_discount='No'` | `'0.00'` | Full GST (no discount) |
| Complimentary | `'0.00'` | `'0.00'` |
| No discount on order | `'0.00'` | Full GST (unchanged) |

---

## 4. IMPLEMENTATION — COMPLETE ✅

### Phase Summary

| Phase | Work | Status |
|---|---|---|
| **1** | Map `give_discount` → `giveDiscount` boolean through pipeline | ✅ DONE |
| **2** | `discountableTotal` in both panels; % on discountable base; flat ₹ capped | ✅ DONE |
| **3** | Per-item `discount_amount` distribution via largest-remainder in Flows 3 & 4 | ✅ DONE |
| **3B** | Coupon item/category targeting; BOGO; E-5 guard for `give_discount='No'` | ✅ DONE |
| **4** | QA: 13 scenario walkthroughs, all pass. Regression checks all clear. | ✅ DONE |
| **GST** | Per-item `gst_amount` / `vat_amount` recomputed on post-discount base in Flows 3 & 4 | ✅ DONE |

### Files Changed (5 files)

| File | Changes |
|------|---------|
| `productTransform.js` L136 | `giveDiscount: api.give_discount !== 'No'` |
| `OrderEntry.jsx` L90 | `giveDiscount: product.giveDiscount !== false` |
| `orderTransform.js` L158 | `giveDiscount: (foodDetails.give_discount \|\| 'Yes') !== 'No'` |
| `orderTransform.js` L489-575 | New `distributeItemDiscounts()` + `_distributeProportional()` helpers |
| `orderTransform.js` L1209-1232 | Flow 3: per-item discount + post-discount GST injection |
| `orderTransform.js` L1505-1518 | Flow 4: per-item discount + post-discount GST injection |
| `orderTransform.js` L1204-1208 | Flow 3: coupon info passthrough |
| `orderTransform.js` L1499-1503 | Flow 4: coupon info passthrough |
| `CartPanel.jsx` L361-363 | `discountableTotal` computation |
| `CartPanel.jsx` L390-394 | % discount on `discountableTotal`; flat ₹ capped |
| `CollectPaymentPanel.jsx` L516-518 | `discountableTotal` computation |
| `CollectPaymentPanel.jsx` L527-534 | % discount on `discountableTotal`; flat ₹ capped |
| `CollectPaymentPanel.jsx` L885-894 | E-5 guard: reject coupon targeting `give_discount='No'` |
| `CollectPaymentPanel.jsx` L1057-1058 | `benefitItems` passthrough in discounts object |

### Flow Coverage

| Flow | Discount? | CR-028 Applied? | GST Fixed? |
|------|-----------|----------------|-----------|
| **Flow 1** placeOrder | No (all zeros) | N/A — `'0.00'` correct | N/A |
| **Flow 2** updateOrder | No (all zeros) | N/A — `'0.00'` correct | N/A |
| **Flow 3** placeOrderWithPayment | Yes | ✅ discount + GST | ✅ |
| **Flow 4** collectBillExisting | Yes | ✅ discount + GST | ✅ |
| **Flow 5** transferToRoom | No per-item | N/A | N/A |
| **Flow 6** buildBillPrintPayload | Uses backend data | N/A | N/A |

### Caller Coverage (all paths that hit Flows 3/4)

| Caller | Flow | CR-028 Active? |
|--------|------|---------------|
| QSR fresh order (`OrderEntry L1228`) | Flow 3 | ✅ |
| Full Mode prepaid (`OrderEntry L1877`) | Flow 3 | ✅ |
| QSR already-placed (`OrderEntry L1359`) | Flow 4 | ✅ |
| Full Mode collect bill (`OrderEntry L1981`) | Flow 4 | ✅ |
| Audit report collect (`CollectBillPanelDrawer L171`) | Flow 4 | ✅ |

### QA Results (13 scenarios, all pass)

| # | Scenario | Result |
|---|----------|--------|
| 1 | 10% manual, 1 non-discountable | ✅ `[10, 20, 0]` sum=30 |
| 2 | Flat ₹50, 1 non-discountable | ✅ `[50, 0]` |
| 3 | Flat > discountableTotal (cap) | ✅ Capped correctly |
| 4 | No discount | ✅ All zeros |
| 5 | All non-discountable | ✅ All zeros |
| 6 | Rounding (₹33.33 + ₹66.67) | ✅ Sum=10.00 exact |
| 7 | Complimentary item | ✅ Excluded |
| 8 | Item-scope coupon | ✅ Targeted correctly |
| 9 | BOGO 100% off | ✅ `discount_amount = food_amount` |
| 10 | Category coupon + loyalty remainder | ✅ Targeted + proportional |
| 11 | Order-scope coupon | ✅ Proportional distribution |
| 12 | Coupon targets non-discountable | ✅ Excluded (guard in UI) |
| 13 | Coupon > line total (cap) | ✅ Capped at fullLine |

### GST Verification (user payload: 50% discount, 5% GST exclusive)

| Item | food_amount | discount_amount | gst_amount (old) | gst_amount (new) |
|------|-----------|----------------|-----------------|-----------------|
| 116593 | 90 | 45.00 | 4.50 ❌ | 2.25 ✅ |
| 116791 | 350 | 175.00 | 17.50 ❌ | 8.75 ✅ |
| 116729 | 200 | 100.00 | 10.00 ❌ | 5.00 ✅ |
| 116619 | 180 | 90.00 | 9.00 ❌ | 4.50 ✅ |
| **Sum** | **820** | **410** | **41.00** ❌ | **20.50** ✅ = `gst_tax` |

### Regression Checks (all clear)

| Regression | Status |
|-----------|--------|
| CR-025 (order_discount, self_discount, discount_value) | ✅ Unchanged |
| BUG-114 (discount_member_category_id/name) | ✅ Unchanged |
| CR-021 (effectiveTotal / split-clearing) | ✅ Unchanged |
| CR-013 (discountRatio GST proration in panels) | ✅ Unchanged |
| BUG-020 (2-dp rounding) | ✅ All new math uses `Math.round(x*100)/100` |
| BUG-018 (complimentary carve-out) | ✅ No double-exclude |
| Flow 1/2 (no-discount paths) | ✅ Still emit `'0.00'` |
| QSR CartPanel (no coupon) | ✅ `couponDiscount: 0` unchanged |

---

## 5. OPEN QUESTIONS — ALL RESOLVED ✅

| # | Question | Resolution |
|---|----------|------------|
| ~~Q-F1~~ | `discount_value` at item level? | **No** — backend doesn't have column. Only `discount_amount`. |
| ~~Q-F5~~ | Item-level key for discount? | **`discount_amount`** — confirmed correct key. No order-level change needed (Option B). |
| ~~Q-F6~~ | Test item for `give_discount='No'`? | **"Bitt"** (id=201143, ₹10) in Palm House. |
| ~~OQ-1~~ | Does Flow 2 send `discount_value`? | **No** — all discount keys 0/null on update path. |
| ~~OQ-2~~ | Per-item GST post-discount? | **Yes** — owner confirmed. Implemented in Flows 3 & 4. |

---

## 6. TEST DATA

| Item | Restaurant | ID | `give_discount` | Price | Notes |
|------|-----------|-----|-----------------|-------|-------|
| Bitt | Palm House (rid=541) | 201143 | **No** | ₹10 | Only non-discountable item in Palm House |

**Coupon testing:** Zero coupon orders in Palm House. Test on Kunafa Mahal (rid=689) with customer Abhishek Jain.

---

## 7. ARTIFACT TRACKER (6-Artifact Rule)

| # | Artifact | Status |
|---|----------|--------|
| 1 | Intake | ✅ DONE (2026-06-11) |
| 2 | Discovery / Impact | ✅ DONE (2026-06-11, extended 2026-06-12) |
| 3 | Implementation Plan | ✅ DONE — v3 (2026-06-12) |
| 4 | Code Implementation | ✅ DONE (2026-06-12) — Phases 1-4 + GST fix |
| 5 | QA Report | ✅ DONE — 13 scenarios pass, regressions clear |
| 6 | Owner Smoke / Signoff | **PENDING** |

**Handover for next agent:** `memory/handover/CR028_HANDOVER_2026_06_12.md`
