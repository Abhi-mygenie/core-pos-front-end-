# CR-056 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_056_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** NONE — grep confirms `showScanPopup` / `show_scan_popup` absent from codebase
**Conflict Pre-Check:** DashboardPage is R5 hotspot but change is 1-line conditional wrap. No active CR touches ScanOrderPopOut render. RestaurantSettingsPage was last modified by CR-020 agent (2026-06-10) — no conflict.
**Risk:** MEDIUM (R5 hotspot DashboardPage, but display-only gate)
**Scope Lock:** 4 files WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `profileTransform.js:~375` | Map `show_scan_popup` → `showScanPopup` boolean in settings | Code inspection: field present after transform | NO |
| 2 | `restaurantSettingsTransform.js:~130` (toAPI) | Map `showScanPopup` → `show_scan_popup` integer for POST | Code inspection: payload includes field | NO |
| 3 | `RestaurantSettingsPage.jsx` (Step 4 defaults + render) | Add `showScanPopup: true` default + Toggle in Display Preferences | Browser: toggle visible in Step 4, saves correctly | NO |
| 4 | `DashboardPage.jsx:1613` | Gate `<ScanOrderPopOut>` on `showScanPopup !== false` | Browser: disable toggle → popup stops appearing | NO |

---

## Edits (Execution Sequence)

### Edit 1: `api/transforms/profileTransform.js` — Map setting from backend

**File:** `api/transforms/profileTransform.js`
**Line:** After L373 (`useToken: toBoolean(apiSettings.settings?.use_token),`) — last field before closing `};`
**Current:** No `showScanPopup` field
**New:** Add one line:
```js
      showScanPopup: toBoolean(apiSettings.settings?.show_scan_popup ?? 1), // CR-056: default ON (1 = enabled)
```

**Rationale:** Backend returns `show_scan_popup` as integer `1`/`0` inside `restaurants[0].settings`. Default to `1` (ON) per owner decision.

### Edit 2: `api/transforms/restaurantSettingsTransform.js` — toAPI mapping

**File:** `api/transforms/restaurantSettingsTransform.js`
**Line:** Inside `toAPI.settingsPayload()`, in the `advanced` object — after the last existing field in the advanced block
**Current:** No `show_scan_popup` output
**New:** Add one line in the `advanced` return object:
```js
        show_scan_popup: s4.showScanPopup ? 1 : 0,   // CR-056: scan popup toggle
```

### Edit 3a: `pages/RestaurantSettingsPage.jsx` — Add default state

**File:** `pages/RestaurantSettingsPage.jsx`
**Line:** L28 (`step4: { defOrdStatus: 2, listServeItem: 'Dynamic', ...}`)
**Current:** `step4` default object has no `showScanPopup`
**New:** Add `showScanPopup: true` to the `step4` defaults object:
```js
  step4: { defOrdStatus: 2, listServeItem: 'Dynamic', printKot: true, billingAutoBillPrint: false, canclePostServe: true, voiceInKds: true, realTimeOrderStatus: true, showPopularCategory: true, foodLevelNotes: true, showFoodVarriance: false, orderConfirmForWeb: true, showAcNonMenu: false, foodDate: false, showScanPopup: true, searchBy: [] },
```

### Edit 3b: `pages/RestaurantSettingsPage.jsx` — Add Toggle in Step 4 UI

**File:** `pages/RestaurantSettingsPage.jsx`
**Line:** Inside Step 4, "Display Preferences" `<SectionCard>`, after the "Food Date Tracking" Toggle (before the "Search By" `<div className="mt-4">`)
**Current:** No scan popup toggle
**New:** Add one Toggle:
```jsx
                <Toggle label="Show Scan Pop Up" hint="Show scan order popup on dashboard" checked={s4.showScanPopup} onChange={(v) => updateStep('step4', 'showScanPopup', v)} />
```

### Edit 4: `pages/DashboardPage.jsx` — Gate ScanOrderPopOut

**File:** `pages/DashboardPage.jsx`
**Line:** L1613 (`<ScanOrderPopOut`)
**Current:** Renders unconditionally:
```jsx
      <ScanOrderPopOut
        orders={orders}
        ...
      />
```
**New:** Wrap in conditional:
```jsx
      {/* CR-056: Gate scan popup on restaurant setting */}
      {restaurant?.settings?.showScanPopup !== false && (
        <ScanOrderPopOut
          orders={orders}
          snoozedOrders={snoozedOrders}
          onToggleSnooze={toggleSnooze}
          onAccept={handleConfirmOrder}
          onReject={handleCancelOrderFromCard}
          onEdit={handleTableClick}
          currencySymbol={currencySymbol}
          suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}
        />
      )}
```

**Note:** `restaurant` comes from `useRestaurant()` already destructured in DashboardPage. The `settings` object is populated by `profileTransform.js` Edit 1. Default `!== false` ensures popup shows until setting is explicitly disabled (backwards-compatible).

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Default value | ON (`true` / `1`) | Owner decision: scan popup should show by default |
| 2 | Gate check | `!== false` (not `=== true`) | Backwards-compatible — existing restaurants without the field still see popup |
| 3 | Toggle placement | Step 4 "Display Preferences" section | Groups with other display toggles (Real-Time Status, Popular Category, etc.) |

---

## Scope Lock

**Files WILL change:**
- `api/transforms/profileTransform.js` (1 line)
- `api/transforms/restaurantSettingsTransform.js` (1 line)
- `pages/RestaurantSettingsPage.jsx` (2 edits: default + toggle)
- `pages/DashboardPage.jsx` (1 edit: conditional wrap)

**Files WILL NOT touch:**
- ScanOrderPopOut.jsx, socketHandlers.js, OrderCard.jsx, OrderEntry.jsx, LoadingPage.jsx, constants.js

## Post-Code Registry Checklist

- [ ] registry.json: CR-056 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add profileTransform.js, restaurantSettingsTransform.js, RestaurantSettingsPage.jsx, DashboardPage.jsx with CR-056
- [ ] Code markers: // CR-056 comment in every modified file

---

**Next:** Gate 4 GO → Implementation
