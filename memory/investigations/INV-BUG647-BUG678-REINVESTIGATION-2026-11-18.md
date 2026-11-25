# INVESTIGATION REPORT — BUG-647 + BUG-678 Re-Investigation (Smoke Test Failure)

**Date:** 2026-11-18
**Investigator:** E1 Agent (INVESTIGATION role)
**Steps Used:** 8/10
**Confidence:** HIGH (code-traced + live API data verified for BeanMeUp)
**Test Account:** owner@beanmeup.com / Qplazm@10 (RID with GST ON, autoServiceCharge=Yes, SC=10%)

---

## 1. Summary

Both BUG-647 and BUG-678 were marked GATE_5A_IMPLEMENTED but fail smoke test. Root causes found for each.

| Bug | Previous Fix Status | Why Still Broken | Classification | Confidence |
|-----|-------------------|-----------------|----------------|------------|
| BUG-647 (VAT) | Implemented — `applyTaxFlags` + `taxFlags` plumbing | `restaurant.settings.vatEnabled` **does not exist** in profile boot data — always `undefined` → always `true` | CODE_ERROR (incomplete fix) | HIGH |
| BUG-647 (GST) | Implemented — `gstStatus !== false` check | GST check on `restaurant.tax.gstStatus` works for profile data but CollectPaymentPanel L337-340 has **no VAT skip check** | CODE_ERROR (incomplete fix) | HIGH |
| BUG-678 (SC prepaid) | Implemented — removed `autoServiceCharge ||` from OrderEntry | CollectPaymentPanel initializes `serviceChargeEnabled=true` for prepaid orders — doesn't check `isPrepaid` | CODE_ERROR (incomplete fix) | HIGH |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|---------|
| H1 | `vatEnabled` flag is never populated from profile API | Code trace profileTransform.js L344-431 | 1 | **CONFIRMED** | No `vatEnabled` / `vatStatus` in `fromAPI.settings()`. Only exists in `restaurantSettingsTransform.js` (settings page). |
| H2 | `restaurant.settings.vatEnabled !== false` resolves as `true` even when VAT is off | JavaScript eval | 1 | **CONFIRMED** | `undefined !== false` = `true`. Flag is always truthy. |
| H3 | CollectPaymentPanel has VAT skip check like GST | Code trace CPP L315-345 | 1 | **ELIMINATED** | L321 has GST check. L337-340 has NO VAT check. VAT always accumulates. |
| H4 | BUG-678 OrderEntry fix is in place | Code trace OE L1719-1720 | 1 | **CONFIRMED** | Fix IS applied — `autoServiceCharge ||` removed. |
| H5 | CPP SC toggle defaults ON for prepaid orders | Code trace CPP L470-474 | 1 | **CONFIRMED** | `serviceChargeEnabled` init does NOT check `isPrepaid`. Defaults `true` when `autoServiceCharge=true`. |
| H6 | BeanMeUp API returns `gst_status` correctly | Curl probe `/api/v1/vendoremployee/profile` | 2 | **CONFIRMED** | `gst_status: True`, `service_charge: 'Yes'`, `auto_service_charge: 'Yes'`, `service_charge_percentage: '10.00'`. NO `vat_status` field at all. |

---

## 3. Data Flow Traces

### BUG-647 — VAT Path (BROKEN)

```
API profile response: NO vat_status field
→ profileTransform.js L187: gstStatus: api.gst_status === true  (GST only, no VAT equivalent)
→ profileTransform.js L344-431: settings.{...} — no vatEnabled, no vatStatus
→ RestaurantContext: restaurant.settings.vatEnabled = undefined

OrderEntry.jsx L1339:
  taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false,
              vatEnabled: restaurant?.settings?.vatEnabled !== false }
  = { gstEnabled: true/false (from API), vatEnabled: undefined !== false = TRUE }  ← ALWAYS TRUE

→ orderTransform.js L803: const { vatEnabled = true } = taxFlags;  // always true
→ orderTransform.js L807: if (isVat && !vatEnabled) → NEVER triggers
→ PAYLOAD: vat_amount always included regardless of restaurant VAT toggle
```

### BUG-647 — CollectPaymentPanel VAT Display (BROKEN)

```
CollectPaymentPanel.jsx L316-345:
  billableItems.forEach(item => {
    L321: if (taxType === 'GST' && restaurant?.tax?.gstStatus === false) return; // ← GST SKIP EXISTS
    ...
    L337: } else if (taxType === 'VAT') {
    L340:   vat += taxAmt;  // ← NO vatStatus CHECK — VAT ALWAYS ACCUMULATED
  })
→ UI: VAT tax always shown even when restaurant has VAT disabled
```

### BUG-678 — Service Charge Prepaid Path (BROKEN)

```
CollectPaymentPanel.jsx L470-474:
  serviceChargeEnabled = (orderType === 'dineIn' || ...)
    && serviceChargePercentage > 0        // 10 for BeanMeUp
    && !!restaurant?.autoServiceCharge    // true for BeanMeUp
    // ← NO isPrepaid CHECK
  → serviceChargeEnabled = true for prepaid orders

→ L796: serviceCharge = subtotal * 10/100 = non-zero  (SC computed)
→ paymentData.serviceCharge > 0 = true
→ OrderEntry.jsx L1720: scApplicable = true (BUG-678 fix trusts CPP value — but CPP sends non-zero!)
→ PAYLOAD: service_charge included for prepaid order
→ order_amount inflated beyond actual payment collected
```

---

## 4. Live API Evidence (BeanMeUp)

```json
{
  "gst_status": true,
  "gst_tax": "5.00",
  "service_charge": "Yes",
  "auto_service_charge": "Yes",
  "service_charge_percentage": "10.00",
  "service_charge_tax": "0.00",
  "tax": 0
}
```

**No `vat_status` field exists in the profile API response for BeanMeUp.** This confirms `restaurant.settings.vatEnabled` is always undefined.

---

## 5. Recommendations

### BUG-647 Fix (3 locations):

**Fix A — profileTransform.js**: Add VAT status to profile boot data
```
// Need to identify the correct API field for VAT toggle.
// restaurantSettingsTransform uses: (basic.vat?.status ?? 0) === 1
// Profile API may carry: vat_status, settings.vat_status, or similar
// ACTION: Probe API for VAT restaurant to find the field, then add:
//   vatStatus: api.vat_status === 1 || api.vat_status === true
// to the tax: {} block at L177
```

**Fix B — CollectPaymentPanel.jsx L337**: Add VAT skip check (mirror GST L321)
```javascript
// AFTER L337:
if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return;
```

**Fix C — OrderEntry.jsx (all 6 taxFlags sites)**: Use correct property path
```javascript
vatEnabled: restaurant?.tax?.vatStatus !== false  // was: restaurant?.settings?.vatEnabled !== false
```

### BUG-678 Fix (1 location):

**Fix D — CollectPaymentPanel.jsx L470-474**: Add `isPrepaid` gate
```javascript
const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
    (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
    && serviceChargePercentage > 0
    && !!restaurant?.autoServiceCharge
    && !isPrepaid  // BUG-678: prepaid orders should not auto-apply SC
);
```

### Risk Assessment:
- Fix A: LOW (additive field in transform)
- Fix B: MEDIUM (financial display logic in R5 hotspot)
- Fix C: LOW (property path change, same logic)
- Fix D: MEDIUM (financial toggle default in R5 hotspot)

---

## 6. Retroactive Candidates
NONE
