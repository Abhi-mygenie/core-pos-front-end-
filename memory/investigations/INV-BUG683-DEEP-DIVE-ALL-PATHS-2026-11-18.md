# INVESTIGATION REPORT — BUG-683 Deep Dive (All Paths)

**Date:** 2026-11-18
**Investigator:** E1 Agent (INVESTIGATION role)
**Steps Used:** 10/10
**Confidence:** HIGH (code-traced all 6 order API paths + CPP display + CartPanel display; owner payload evidence for postpaid collect)
**Test Account:** owner@beanmeup.com (RID 742, GST OFF + VAT OFF, autoServiceCharge=Yes, SC=10%)

---

## 1. Summary

BUG-683 is **CONFIRMED across ALL order paths**. The root cause is that `profileTransform.js` never extracts the VAT switch from the profile API. This cascades into **9 distinct gaps** across 5 files.

**Owner's evidence (BeanMeUp, GST OFF + VAT OFF, 4 items incl. 2 VAT bar items):**

| Field | Expected | Actual | Verdict |
|-------|----------|--------|---------|
| `gst_tax` | 0 | 0 | ✅ GST OFF working |
| `vat_tax` | 0 | **154** | ❌ VAT OFF broken |
| `service_tax` | 90 (SC was ON in this test) | 90 | ✅ Correct for this test |
| `service_gst_tax_amount` | 0 | 0 | ✅ SC GST zeroed (GST OFF) |
| `order_amount` | 900 (food only) | **1144** (900+90+154) | ❌ Inflated by ₹244 |
| Per-item `vat_amount` (bar items) | "0.00" | **"77.00"** | ❌ Not zeroed |
| CPP UI: VAT line | Hidden | **₹154.00 shown** | ❌ Visible despite OFF |

---

## 2. All 9 Gaps Found

### GAP 1 — ROOT CAUSE: profileTransform never reads VAT switch
**File:** `src/api/transforms/profileTransform.js` L177-188
**What:** The `tax` block extracts `gstStatus: api.gst_status === true` (L187) but has **ZERO** VAT equivalent. No `vatStatus`, no `vatEnabled`, no `vat_info`, no `vat_status`.
**Result:** `restaurant.settings.vatEnabled` = always `undefined` throughout the app.
**Owner identified:** Mantri profile API returns `vat_info.status` at top level.
**All downstream gaps flow from this.**

---

### GAP 2 — OrderEntry taxFlags: wrong property path (8 sites)
**File:** `src/components/order-entry/OrderEntry.jsx`
**Lines:** L1339, L1402, L1736, L1886, L2515, L2619
**Code:** `vatEnabled: restaurant?.settings?.vatEnabled !== false`
**Eval:** `undefined !== false` = `true` → **vatEnabled is ALWAYS true**
**Affects:** placeOrder, updateOrder, placeOrderWithPayment, collectBillExisting — ALL paths

---

### GAP 3 — OrderEntry localTax/unplacedTax: wrong property path (2 sites)
**File:** `src/components/order-entry/OrderEntry.jsx`
**Lines:** L1152, L1167
**Code:** `if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return sum;`
**Eval:** `!undefined` = `true` → **ALWAYS skips VAT** (inverted from Gap 2!)
**Affects:** Cart button total (pre-place) — always hides VAT from button total even when VAT should be ON. Inverse bug of the payload.

---

### GAP 4 — CartPanel taxTotals: inverted check (always hides VAT)
**File:** `src/components/order-entry/CartPanel.jsx`
**Lines:** L434, L455
**Code:** `if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return;`
**Eval:** `!undefined` = `true` → **ALWAYS returns** (skips VAT items)
**Affects:** Cart panel VAT display — VAT is NEVER shown in CartPanel, even when restaurant has VAT ON. This is the **inverse** of Gap 2/5 (payload sends VAT when OFF, cart hides VAT when ON).

---

### GAP 5 — CollectPaymentPanel: NO VAT skip check
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Lines:** L337-340
**Code:**
```javascript
} else if ((tax.type || '').toUpperCase() === 'VAT') {
    vat += taxAmt;   // ← NO vatStatus CHECK — always accumulates
```
**Comparison:** GST skip check EXISTS at L321: `if (taxType === 'GST' && restaurant?.tax?.gstStatus === false) return;`
**Affects:** CPP tax display (₹154 shown in screenshot) + `vat_tax` in collectBillExisting payload (passes through CPP value)

---

### GAP 6 — CPP scGst/tipGst/deliveryGst: no gstEnabled check (display-payload mismatch)
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Lines:** L822-824
**Code:** `const scGst = serviceCharge * scTaxRate;` (no gstEnabled gate)
**Compare:** orderTransform L951: `service_gst_tax_amount: gstEnabled ? ... : 0` (payload correctly zeros)
**Affects:** For restaurants with SC GST configured + GST OFF: CPP would DISPLAY SC/Tip/Delivery GST while the PAYLOAD correctly zeros them. **Not visible for BeanMeUp** (SC GST rate = 0%) but IS a gap for other restaurants.

---

### GAP 7 — collectBillExisting discount branch ignores taxFlags
**File:** `src/api/transforms/orderTransform.js`
**Lines:** L1683-1684
**Code:**
```javascript
gst_amount: String((isGst ? newTax : 0).toFixed(2)),
vat_amount: String((!isGst ? newTax : 0).toFixed(2)),
```
**What:** When discount > 0, `food_detail` is recomputed from raw tax config. The recomputation does NOT check `gstEnabled`/`vatEnabled`. Even if `applyTaxFlags` zeroed the initial food_detail items, the discount branch overwrites them with non-zero tax.
**Affects:** collectBillExisting with discount applied — food_detail `vat_amount`/`gst_amount` ignore toggle.
**Not visible in owner's test** (no discount) but IS a gap.

---

### GAP 8 — collectBillExisting vat_tax passes through CPP value
**File:** `src/api/transforms/orderTransform.js`
**Lines:** L1711
**Code:** `vat_tax: vatAmount || 0`
**What:** `vatAmount` comes directly from CPP (which has no VAT skip check — Gap 5). Even if taxFlags correctly zeroed item-level `vat_amounts`, the order-level `vat_tax` would still be non-zero.
**Affects:** BILL_PAYMENT payload `vat_tax` field — always reflects CPP's broken display value.

---

### GAP 9 — BUG-678: CPP serviceChargeEnabled defaults ON for prepaid
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Lines:** L470-474
**Code:** No `isPrepaid` check on `serviceChargeEnabled` init
**Already documented:** BUG-678 re-investigation. Included for completeness.

---

## 3. Path-by-Path Matrix

| Path | Function | GST OFF | VAT OFF | SC Untick | SC Prepaid Default |
|------|----------|---------|---------|-----------|-------------------|
| **placeOrder** (postpaid) | orderTransform L1074 | ✅ gst_tax=0 | ❌ vat_tax>0 (Gap 2) | N/A (SC set at collect) | N/A |
| **placeOrderWithPayment** (QSR prepaid) | orderTransform L1315 | ✅ gst_tax=0 | ❌ vat_tax>0 (Gap 2) | ❌ BUG-678 (Gap 9) | ❌ BUG-678 |
| **updateOrder** | orderTransform L1206 | ✅ gst_tax=0 | ❌ vat_tax>0 (Gap 2) | N/A | N/A |
| **collectBillExisting** (postpaid pay) | orderTransform L1536 | ✅ gst_tax=0 | ❌ vat_tax>0 (Gap 5+8) | ✅ Works if toggled | N/A |
| **collectBillExisting** (QSR pay) | orderTransform L1536 | ✅ gst_tax=0 | ❌ vat_tax>0 (Gap 5+8) | ❌ BUG-678 | ❌ BUG-678 |
| **collectBillExisting + discount** | orderTransform L1654 | ⚠️ food_detail gap (Gap 7) | ❌ food_detail gap (Gap 7) | N/A | N/A |
| **CPP display** | CPP L315-345 | ✅ GST hidden (L321) | ❌ VAT shown (Gap 5) | ✅ SC=0 if toggled | ❌ BUG-678 |
| **CPP SC/Tip GST display** | CPP L822-824 | ⚠️ SC GST not gated (Gap 6) | N/A | N/A | N/A |
| **CartPanel display** | CartPanel L425-455 | ✅ GST hidden (L433) | ❌ INVERTED: always hidden (Gap 4) | N/A | N/A |
| **Cart button total** | OE L1152, L1167 | ✅ GST hidden | ❌ INVERTED: always hidden (Gap 3) | N/A | N/A |
| **Payload food_detail items** | applyTaxFlags L802 | ✅ gst_amount="0.00" | ❌ vat_amount>0 (Gap 2) | N/A | N/A |

---

## 4. The Three Inconsistent Behaviors

Because `restaurant.settings.vatEnabled` is undefined, three different code patterns produce three different results:

| Pattern | Location | Eval with `undefined` | Result |
|---------|----------|----------------------|--------|
| `x !== false` | OrderEntry taxFlags, orderTransform | `undefined !== false` = `true` | **VAT ALWAYS ON** in payloads |
| `!x` | CartPanel L434, OE L1152/L1167 | `!undefined` = `true` | **VAT ALWAYS OFF** in cart display |
| (no check) | CPP L337 | — | **VAT ALWAYS ON** in CPP display |

This means: Cart shows no VAT, Collect Payment shows VAT, and backend receives VAT — all while the restaurant has VAT OFF. Maximum confusion for the cashier.

---

## 5. Evidence Artifacts

- Owner payload (place order): saved in this report §1
- Owner payload (collect bill): `vat_tax: 154, service_tax: 90, grant_amount: 1144`
- Owner screenshot: CPP showing VAT ₹154.00, SC ₹90.00, Grand Total ₹1,144
- Code traces: all line references in §2

---

## 6. Recommendations

### Fix Priority Order:

**Fix A — profileTransform.js (ROOT CAUSE):** Add VAT status extraction
```javascript
// In tax: {} block at L177
vatStatus: (api.vat_info?.status === true || api.vat_info?.status === 1),
```
Need: Curl probe to confirm exact field shape (`vat_info.status` per owner — boolean? int? string?)

**Fix B — OrderEntry.jsx (8 taxFlags sites):** Correct property path
```javascript
// FROM: restaurant?.settings?.vatEnabled !== false
// TO:   restaurant?.tax?.vatStatus !== false
```
Lines: L1339, L1402, L1736, L1886, L2515, L2619

**Fix C — OrderEntry.jsx (2 localTax/unplacedTax sites):** Correct property path
```javascript
// FROM: !restaurant?.settings?.vatEnabled
// TO:   restaurant?.tax?.vatStatus === false
```
Lines: L1152, L1167

**Fix D — CartPanel.jsx (2 sites):** Correct property path + fix inverted logic
```javascript
// FROM: !restaurant?.settings?.vatEnabled
// TO:   restaurant?.tax?.vatStatus === false
```
Lines: L434, L455

**Fix E — CollectPaymentPanel.jsx L337:** Add VAT skip check (mirror GST L321)
```javascript
if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return;
```

**Fix F — CollectPaymentPanel.jsx L822-824 (Gap 6):** Gate scGst/tipGst/deliveryGst on gstStatus
```javascript
const scGst  = restaurant?.tax?.gstStatus !== false ? serviceCharge * scTaxRate : 0;
const tipGst = restaurant?.tax?.gstStatus !== false ? tip * scTaxRate : 0;
const deliveryGst = restaurant?.tax?.gstStatus !== false ? deliveryCharge * delTaxRate : 0;
```

**Fix G — orderTransform.js collectBillExisting discount branch (Gap 7):** Apply taxFlags
```javascript
// L1683-1684: add gstEnabled/vatEnabled check
gst_amount: String((isGst && gstEnabled ? newTax : 0).toFixed(2)),
vat_amount: String((!isGst && vatEnabled ? newTax : 0).toFixed(2)),
```

**Fix H — BUG-678 CPP serviceChargeEnabled (Gap 9):** Add `&& !isPrepaid`
(Already documented in BUG-678 — separate item)

### Risk Assessment:
- Fix A: LOW (additive field in transform)
- Fix B-D: LOW (property path change, same logic intent)
- Fix E: MEDIUM (financial display in R5 hotspot)
- Fix F: MEDIUM (financial display in R5 hotspot)
- Fix G: MEDIUM (financial payload in R5 hotspot)
- Fix H: MEDIUM (BUG-678 scope — separate item)

### Planning Skip Eligibility: **NO**
- 5 files touched
- 3 R5 hotspot files
- Financial/tax logic
- Full gate flow required

---

## 7. Open Decisions (carried from intake + new)

| # | Question | Impact |
|---|----------|--------|
| OD-683-01 | Exact shape of `vat_info.status` in profile API | Determines Fix A transform logic |
| OD-683-02 | Test restaurant with VAT items + VAT OFF | Needed for verification |
| OD-683-03 (NEW) | Should Fix F (CPP SC GST display gate) be in BUG-683 scope or separate? | Affects scope + testing |
| OD-683-04 (NEW) | Should Fix G (discount branch) be in BUG-683 scope or separate? | Affects scope + testing |

---

## 8. Retroactive Candidates
NONE
