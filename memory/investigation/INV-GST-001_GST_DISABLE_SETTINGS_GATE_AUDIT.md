# INVESTIGATION REPORT — GST Disable Not Working + Full Settings Gate Audit

**ID:** INV-GST-001
**Date:** 2026-08-17
**Role:** INVESTIGATION
**Status:** COMPLETE — root cause confirmed, full audit done
**No code written this session.**

---

## Scope

1. GST is still applied after disabling it in restaurant settings
2. Full audit of all settings flags and whether they are properly gated in the order flow

---

## Part 1 — GST Disable Not Working

### Data Flow Traced

**Settings save path:**
```
RestaurantSettingsPage.jsx (GST Enabled toggle → gstEnabled = false)
  → restaurantSettingsService.updateSettings()
    → POST /api/v2/vendoremployee/restaurant-settings/update-settings
      → payload: { gst: { status: 0 }, ... }       ← saved to backend ✅
  → navigate('/dashboard')                          ← NO profile re-fetch ❌
```

**Profile/context read path:**
```
LoadingPage.jsx (app boot only)
  → profileService.getProfile()
    → GET /api/v1/vendoremployee/profile
      → profileTransform.fromAPI()
        → restaurant.tax.gstStatus = api.gst_status === true
  → setRestaurant(data.profile.restaurant)          ← stored in RestaurantContext
```

**Two separate endpoints, NEVER cross-synced at runtime:**

| Action | Endpoint | Refreshes context? |
|--------|----------|--------------------|
| Save settings | `POST /update-settings` | ❌ NO |
| Read context | `GET /profile` (boot only) | Boot only |

### Root Cause — Layer 1: Stale Profile

After saving settings with GST disabled:
- `restaurant.tax.gstStatus` in React context remains **stale = `true`**
- Profile is only loaded at app boot (LoadingPage) or login
- After `navigate('/dashboard')`, no re-fetch occurs
- **Fix: re-fetch profile after successful settings save**

### Root Cause — Layer 2: CollectPaymentPanel Ignores gstStatus

Even if `gstStatus` were refreshed and = `false`, **GST would still be applied** because `CollectPaymentPanel` doesn't gate on it:

```js
// CollectPaymentPanel.jsx lines 249-275:
const taxTotals = useMemo(() => {
  let sgst = 0, cgst = 0, vat = 0;
  billableItems.forEach(item => {
    const tax = item.tax;
    if (!tax || tax.percentage === 0) return;   // ← only exits if item has 0% tax
    // ... computes SGST + CGST
    // ← ZERO CHECK for restaurant.tax.gstStatus
  });
  ...
}, [billableItems]);
```

Tax is **computed from `item.tax.percentage` only** — the per-menu-item tax rate set in Menu Management.

**The only place `gstStatus` IS checked:**
```js
// BulkEditor.jsx line 213 — for validation warning ONLY:
const gstRequired = restaurant?.tax?.gstStatus === true;
// Used to show a warning if an item is missing tax type in bulk edit
// → Does NOT block tax from being applied in the order flow
```

### Full Root Cause

| Layer | Issue |
|-------|-------|
| L1 | Profile not re-fetched after settings save → `gstStatus` stale in context |
| L2 | `CollectPaymentPanel` computes tax from `item.tax.percentage` without checking `gstStatus` |
| L3 | Menu items retain their tax percentages regardless of `gstStatus` — GST disable doesn't zero out item tax rates |

### Impact

When owner disables GST in Restaurant Settings:
- Order entry still applies per-item GST rates → **overcharges customers**
- Bill shows SGST + CGST despite owner disabling GST
- Reports reflect GST amounts incorrectly

---

## Part 2 — Full Settings Gate Audit

### A. Settings That ARE Properly Gated ✅

| Flag | Source | Gate Location | Status |
|------|--------|---------------|--------|
| `features.dineIn` | Profile | DashboardPage, OrderEntry, Sidebar | ✅ GATED |
| `features.delivery` | Profile | DashboardPage, OrderEntry, Sidebar | ✅ GATED |
| `features.takeaway` | Profile | DashboardPage, OrderEntry, Sidebar | ✅ GATED |
| `features.room` | Profile | DashboardPage, OrderEntry, Sidebar | ✅ GATED |
| `features.serviceCharge` | Profile | `CollectPaymentPanel line 83`: `(features.serviceCharge && serviceChargePercentage) || 0` | ✅ GATED |
| `features.tip` | Profile | `CollectPaymentPanel line 330`: `const tipEnabled = !!restaurant?.features?.tip` | ✅ GATED |
| `paymentMethods` (cash/upi/card/tab) | Profile | `CollectPaymentPanel BUG-080`: `enabledPrimaryMethods` filtered by `restaurantPaymentMethods` | ✅ GATED |
| `features.deliveryAssign` | Profile | `OrderCard`, `TableCard` | ✅ GATED |
| `autoServiceCharge` | Profile | `CollectPaymentPanel line 320`: `!!restaurant?.autoServiceCharge` | ✅ GATED |

---

### B. Settings That Are NOT Properly Gated ❌

#### 1. `tax.gstStatus` — GST Enable/Disable
```
Source: profileTransform → restaurant.tax.gstStatus
Gate in CollectPaymentPanel: NONE
Gate in CartPanel: NONE
Gate in order totals: NONE
Only gate: BulkEditor.jsx (validation warning only — not blocking)
```
**Impact:** GST is always applied from item tax rates regardless of this flag.
**Fix needed:** Add gate in `CollectPaymentPanel` tax computation: `if (!restaurant?.tax?.gstStatus) return` (skip GST items).

---

#### 2. `settings.roomGstApplicable` — Room GST Toggle
```
Source: profileTransform → restaurant.settings.roomGstApplicable (line 240)
         restaurantSettingsTransform → step8.roomGstApplicable
Gate: NONE in CollectPaymentPanel
```
```js
// profileTransform.js line 240:
roomGstApplicable: toBoolean(api.room_gst_applicable)
// → stored in restaurant.settings.roomGstApplicable
// → NEVER checked in CollectPaymentPanel for room orders
```
**Impact:** Room orders always include GST even when `roomGstApplicable = false`.
**Fix needed:** In `CollectPaymentPanel`, when `isRoom === true` and `roomGstApplicable === false`, skip GST computation.

---

#### 3. `settings.showUserGst` — Show GST to Customers
```
Source: profileTransform → restaurant.settings.showUserGst
Gate: Only in RoomCheckInModal.jsx (corporate GST input)
      NOT in: CollectPaymentPanel, CartPanel, bill display
```
**Impact:** GST breakdown is always shown on bill/checkout regardless of this setting.
**Severity:** MEDIUM — display inconsistency, not a financial error.

---

#### 4. **Profile Staleness (ALL settings)** — Cross-cutting issue
```
RestaurantSettingsPage saves via POST /update-settings
Profile context loaded via GET /profile at boot only
After saving settings: NO profile re-fetch
→ All settings changes are INVISIBLE until next login/page reload
```
**Affected flags:** ALL profile-sourced flags (gstStatus, features.*, paymentMethods, autoServiceCharge, etc.)
**Fix needed:** Re-fetch profile (or targeted fields) after `updateSettings` succeeds in `RestaurantSettingsPage.jsx`.

---

### C. Minor / Low-Severity Gaps

| Flag | Issue | Severity |
|------|-------|----------|
| `tax.gstStatus` (VAT equivalent) | No explicit `vatStatus` flag — VAT is purely item-driven (item.tax.type === 'VAT'); disabling "VAT" in settings has no effect on bill | MEDIUM |
| `inventory` feature | Sidebar gates navigation; no gate found on inventory API calls themselves | LOW |
| `deliverChargeGst` | Only in settings; not confirmed to gate delivery GST in all order types | LOW |

---

## Summary Table

| # | Issue | Root Cause | Risk | Fix Scope |
|---|-------|-----------|------|-----------|
| 1 | GST disabled but still applied | L1: Profile not refreshed; L2: CollectPaymentPanel ignores gstStatus | HIGH | Medium |
| 2 | Room GST still applied when disabled | `roomGstApplicable` not checked in CollectPaymentPanel | HIGH | Small |
| 3 | All settings stale after save | Profile not re-fetched after RestaurantSettingsPage save | HIGH | Small (1 line in RestaurantSettingsPage) |
| 4 | `showUserGst` only partial | Only gated in RoomCheckInModal, not in bill display | MEDIUM | Small |

---

## Recommended Items to Register

| ID | Type | Title |
|----|------|-------|
| BUG-336 | BUG | GST Disabled in Settings But Still Applied on Bills (gstStatus not gated in CollectPaymentPanel) |
| BUG-337 | BUG | Profile Not Refreshed After Restaurant Settings Save (All Settings Stale Until Re-login) |
| BUG-338 | BUG | Room GST Applied Even When roomGstApplicable = false |

---

*Investigation complete. No code written.*
