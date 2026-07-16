# BUG-028 QA Report (Round 4 — qa_failed)

## QA Status
- **Failed**

## New Finding — `auto_service_charge` field ignored

### Backend fields for Young Monk Cafe (owner@youngmonk.com)
- `service_charge`: "Yes" — SC feature enabled
- `service_charge_percentage`: "2.50" — 2.5%
- `auto_service_charge`: **"No"** ← the actual control for default state

### Frontend mapping
- `profileTransform.js` line 82: `autoServiceCharge: toBoolean(api.auto_service_charge)` — MAPPED
- BUT `restaurant?.autoServiceCharge` is **NEVER USED** anywhere in the codebase

### Current fix (Round 3) — still wrong
```js
useState(
  (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
  && serviceChargePercentage > 0
  // ← MISSING: && !!restaurant?.autoServiceCharge
)
```

For Young Monk: SC=2.5% (>0), orderType=dineIn → defaults TICKED ❌
But `auto_service_charge = 'No'` → should default UNTICKED

## Exact Fix Required

**File:** `CollectPaymentPanel.jsx` — useState initializer

```js
const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
  (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
  && serviceChargePercentage > 0
  && !!restaurant?.autoServiceCharge    // ← ADD THIS
);
```

- `restaurant?.autoServiceCharge` already mapped in `profileTransform.js` line 82
- No new API calls or transforms needed

## Expected behavior per restaurant

| Restaurant | auto_service_charge | SC % | Checkbox default |
|-----------|--------------------|----- |-----------------|
| 18march   | needs check        | 10%  | TICKED if auto=Yes |
| Young Monk| No                 | 2.5% | UNTICKED ✅ |

## QA Decision
- Status: **qa_failed**
- Send back to Implementation Agent: add `&& !!restaurant?.autoServiceCharge` to useState initializer
