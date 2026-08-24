# Investigation Report — Settings Field Coverage Across Both Screens
**ID:** INV-SETTINGS-COVERAGE | **Date:** 2026-08-08 | **Role:** INVESTIGATION
**Steps used:** 6/10 | **Confidence:** HIGH

---

## 1. Summary

| Finding | Detail |
|---|---|
| Root cause | DATA_ISSUE — Two screens use two different API endpoints with no sync |
| Classification | DATA_ISSUE + ARCHITECTURE_GAP |
| Confidence | HIGH — full code trace + live API comparison |

**One-line:** 83% of wizard fields (57/69) are invisible in tiles, and 9 fields that appear in tiles show values from a different API endpoint (stale after wizard saves).

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result |
|---|---|---|---|
| H1 | All wizard fields are shown in at least one tile | Code trace: wizard fields vs ViewEditViews.jsx | ❌ ELIMINATED — only 3 match (name/phone/addr) |
| H2 | Tiles and wizard use the same data source | Code trace: useRestaurant() vs restaurantSettingsTransform() | ❌ ELIMINATED — completely different endpoints |
| H3 | Tiles show a read-only summary of wizard state | Code trace: profileTransform.js vs restaurantSettingsTransform.js | ❌ ELIMINATED — no shared state |

---

## 3. Data Flow Trace

```
SCREEN 2 — WIZARD
  Write: RestaurantSettingsPage → restaurantSettingsTransform.toAPI()
       → POST /api/v2/vendoremployee/restaurant-settings/settings-update
       → Saves 69 fields

SCREEN 1 — TILES
  Read: SettingsPanel → ViewEditViews → useRestaurant() → RestaurantContext
       → Data comes from /api/v1/auth/vendoremployee/login (on boot) OR
         separate profile endpoint
       → profileTransform maps: restaurant.name, restaurant.features,
         restaurant.settings, restaurant.tax etc.
  
  NO BRIDGE between the two endpoints.
  If wizard saves dine_in=false via settings-update →
  tile still shows dineIn=true (from last login profile) until page reload.
```

---

## 4. Full Coverage Map

### ❌ 57 Wizard Fields — NOT in any tile (83%)

| Wizard Step | Fields with no tile |
|---|---|
| **Step 1** | fssai, shortCode, logoUrl, pdfMenuUrl, gstEnabled, gstMode, gstTax, vatEnabled, vatCode |
| **Step 2** | payCash, payUpi, payCc, payTab, onlinePayment, upiId, dynamicUpiValue, orderPaymentType, showCashOnDelivery, walkinOnlinePayment, dineinOnlinePayment, takeawayOnlinePayment, deliveryOnlinePayment |
| **Step 3** | autoServiceCharge, serviceChargePercentage, serviceChargeTax, availableDiscount, totalRound |
| **Step 4** | defOrdStatus, listServeItem, printKot, billingAutoBillPrint, canclePostServe, voiceInKds, realTimeOrderStatus, showPopularCategory, foodLevelNotes, showFoodVarriance, orderConfirmForWeb, showAcNonMenu, foodDate, showScanPopup, searchBy |
| **Step 5** | inventoryNegative, inventoryAlertNumber, inventoryManagerName, phoneNumberOnBill, reportNumber, deliveryContactNo, deliveryPersonName, settelmentReport, feedBack, sendFeedbackLink, feedbackUrl, onlineOrderingLink |
| **Step 6** | firstName, lastName, vendorPhone |

### ⚠ 9 Fields — In tile but DIFFERENT data source (stale risk)

| Field | Wizard saves to | Tile reads from | Risk |
|---|---|---|---|
| `gstCode` | `basic.gst.code` | `restaurant.tax.gstCode` | Stale after wizard save |
| `tax` | `advanced.tax` | `restaurant.tax.percentage` | Stale after wizard save |
| `dineIn` | `advanced.dine_in` | `restaurant.features.dineIn` | Stale after wizard save |
| `takeAway` | `advanced.take_away` | `restaurant.features.takeaway` | Stale after wizard save |
| `delivery` | `advanced.delivery` | `restaurant.features.delivery` | Stale after wizard save |
| `room` | `advanced.room` | `restaurant.features.room` | Stale after wizard save |
| `serviceCharge` | `advanced.service_charge` | `restaurant.features.serviceCharge` | Stale after wizard save |
| `tip` | `advanced.tip` | `restaurant.features.tip` | Stale after wizard save |
| `inventory` | `advanced.inventory` | `restaurant.features.inventory` | Stale after wizard save |

### ✅ 3 Fields — In tile, same concept

`name`, `phone`, `address` — shown in Restaurant Info tile.
Still technically different API source but semantically the same data.

### 🔵 6 Tile-Only Fields — NOT in wizard at all

| Field | Tile | Note |
|---|---|---|
| `email` | Restaurant Info | Not in settings-list API |
| `currency` | Restaurant Info | Not in settings-list API |
| `isCoupon` | General Settings | Only editable via tile |
| `aggregatorAutoKot` | General Settings | Only editable via tile |
| `defaultPrepTime` | General Settings | Only editable via tile |
| `enableDynamicTables` | General Settings | localStorage only — no API |

---

## 5. Root Cause

**Classification:** DATA_ISSUE + ARCHITECTURE_GAP

The two screens were built at different times:
- **Tiles (Screen 1)** — built on `useRestaurant()` context from `profileTransform` (login-time data)
- **Wizard (Screen 2)** — built on `restaurantSettingsTransform` from `settings-list` API

No unification was ever built. Both write to/read from different endpoints.
**There is no mechanism to refresh tiles after wizard saves.** The tile data is only refreshed on full login.

---

## 6. Recommendations

| Priority | Action | Scope |
|---|---|---|
| **P1 — CR-132 immediate** | Add new fields to wizard (Screen 2 only) — it has the working write path | CR-132 scope |
| **P2 — CR-132 follow-up** | For the 9 stale-risk fields, add a profile refresh after wizard save | Small hook change |
| **P3 — New CR** | Tile-only fields (email, currency, isCoupon, aggregatorAutoKot, defaultPrepTime) need wizard coverage if they're to be editable via settings-list | New CR |
| **P4 — Design decision** | Decide if tiles should become a "quick view" of wizard state or remain independent | Owner decision |

---

## 7. Retroactive Candidates
None — no unregistered code found.

---

## Handover
```
Root cause: DATA_ISSUE — two screens use different API endpoints. No bridge.
Classification: ARCHITECTURE_GAP
Confidence: HIGH — full code + API trace, 6/10 steps
Scope for CR-132: All 16 new fields → wizard only (Screen 2). Tile stale-risk noted.
Recommendation: No code change needed for investigation. Planning (CR-132 Gate 3) can proceed.
Report: /app/memory/investigation/INV-SETTINGS-COVERAGE_2026_08_08.md
```
