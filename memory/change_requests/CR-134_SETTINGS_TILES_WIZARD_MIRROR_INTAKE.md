# CR-134 — Settings Tiles: Mirror All Restaurant Setup Wizard Fields

**ID:** CR-134
**Type:** CR (Feature Enhancement)
**Priority:** P2
**Risk:** MEDIUM
**Status:** INTAKE
**Gate:** 1
**Sprint:** pos_5_1
**Registered:** 2026-08-08
**Source:** OWNER-REPORTED
**Related Investigation:** `investigation/INV-SETTINGS-COVERAGE_2026_08_08.md`

---

## Description

The Settings panel (Screen 1) has 12 tiles that display restaurant configuration. The Restaurant Setup wizard (Screen 2, 6 steps) allows setting/updating 69 fields via the `settings-list` API.

**The problem:** 83% of wizard fields (57/69) are invisible in the tiles. Owner has no way to quickly view current values for these fields without re-opening the full 6-step wizard.

Additionally, 9 fields appear in tiles but read from a different API source (`profileTransform` / login-time data), meaning tiles may show stale values after a wizard save until the next login.

**Owner's request:** All fields that appear in the Restaurant Setup wizard should also be visible (and ideally editable) in the corresponding Settings tiles.

---

## Evidence

- Investigation: `investigation/INV-SETTINGS-COVERAGE_2026_08_08.md` — HIGH confidence, 6/10 steps
- Code trace: `ViewEditViews.jsx` (tiles) vs `restaurantSettingsTransform.js` (wizard)
- Confirmed: 57 fields with zero tile coverage, 9 with stale-risk data source mismatch
- Source: OWNER-REPORTED (2026-08-08 session)
- Confidence: CONFIRMED

---

## Step 0a — Code Reality Check

```bash
grep -rn "restaurantSettingsTransform\|settingsResponse" ViewEditViews.jsx SettingsPanel.jsx
→ 0 results
```

**Code Reality: NONE** — tiles make zero reference to restaurantSettingsTransform. No partial implementation exists.

---

## Step 0b — Duplicate Check

| Check | Result |
|---|---|
| CR-019 (Settings Wizard) | CLOSED — built the wizard only. Did NOT wire tiles. |
| CR-020 (Settings Bug Sweep) | CLOSED — bug fixes only |
| CR-132 (New Backend Fields) | IN PROGRESS — adds fields to wizard. Does NOT touch tiles. |
| Keyword scan (tile/wizard/mirror/parity) | No match in registry |

**Duplicate check: DISTINCT**

---

## Uncovered Fields — 57 Total

### Currently in wizard but NOT visible in any tile:

| Category | Count | Fields |
|---|---|---|
| Identity & Branding | 4 | `fssai`, `shortCode`, `logoUrl`, `pdfMenuUrl` |
| Tax & Compliance | 5 | `gstEnabled`, `gstMode`, `gstTax`, `vatEnabled`, `vatCode` |
| Payment Config | 13 | `payCash`, `payUpi`, `payCc`, `payTab`, `onlinePayment`, `upiId`, `dynamicUpiValue`, `orderPaymentType`, `showCashOnDelivery`, `walkinOnlinePayment`, `dineinOnlinePayment`, `takeawayOnlinePayment`, `deliveryOnlinePayment` |
| Charges & Discounts | 5 | `autoServiceCharge`, `serviceChargePercentage`, `serviceChargeTax`, `availableDiscount`, `totalRound` |
| Order & Kitchen | 15 | `defOrdStatus`, `listServeItem`, `printKot`, `billingAutoBillPrint`, `canclePostServe`, `voiceInKds`, `realTimeOrderStatus`, `showPopularCategory`, `foodLevelNotes`, `showFoodVarriance`, `orderConfirmForWeb`, `showAcNonMenu`, `foodDate`, `showScanPopup`, `searchBy` |
| Inventory & Extras | 12 | `inventoryNegative`, `inventoryAlertNumber`, `inventoryManagerName`, `phoneNumberOnBill`, `reportNumber`, `deliveryContactNo`, `deliveryPersonName`, `settelmentReport`, `feedBack`, `sendFeedbackLink`, `feedbackUrl`, `onlineOrderingLink` |
| Owner/Vendor Info | 3 | `firstName`, `lastName`, `vendorPhone` |

### Stale-risk fields (in tile, wrong data source — 9):

`dineIn`, `takeAway`, `delivery`, `room`, `serviceCharge`, `tip`, `inventory`, `gstCode`, `tax`
→ Tile shows profile/login-time value. Wizard save not reflected until next login.

---

## Severity Rubric

**P2 — MEDIUM:** Wizard functions correctly. Owner CAN configure all fields via wizard. The gap is visibility — current values are not quickly accessible via tiles without re-opening the 6-step wizard. No functionality broken.

**Upgrade to P1 if:** Owner workflow depends on tiles as the daily quick-view dashboard for restaurant config.

---

## Risk Classification

**Risk: MEDIUM**
- Trigger: Multiple files, new API call pattern in tiles, UI restructure
- NOT financial logic (no R6 fields)
- NOT hotspot files (R5)
- Key architectural decision needed: data source for tiles (OD-1)
- Fast Lane eligible: NO (6+ files, architectural change)

---

## Blast Radius

| File | Change |
|---|---|
| `components/panels/settings/ViewEditViews.jsx` | Expand all 5 existing view-edit tiles with settings-list fields |
| `components/panels/SettingsPanel.jsx` | Possibly add new tile slots for wizard steps with no current tile |
| `api/services/restaurantSettingsService.js` | New `getSettings()` call used by tiles |
| New hook or context | `useRestaurantSettings()` — fetch + cache settings-list in tiles |
| `api/transforms/restaurantSettingsTransform.js` | fromAPI already exists — tiles will reuse |

**Estimated scope:** LARGE — 6+ files, ~300–400 lines new/changed. All tiles affected.

---

## Owner Decisions Needed at Gate 2

| OD | Question | Why it matters |
|---|---|---|
| **OD-1** | Should tiles READ from `settings-list` API (same as wizard) or continue from `profileTransform` (login data)? | Core architectural decision. If settings-list: adds new API call per tile open. If profileTransform: stale-risk remains. |
| **OD-2** | ALL 57 missing wizard fields in tiles, or a prioritised subset? | Full mirror is ~400 lines. Subset is scoped. |
| **OD-3** | Expand existing tiles OR add new tiles matching wizard step structure? (e.g., new "Order & Kitchen" tile, "Charges" tile) | Determines SettingsPanel.jsx changes |
| **OD-4** | After wizard save, should tiles auto-refresh (re-fetch settings-list)? | Needs refresh hook or context invalidation |
| **OD-5** | Should tile fields be **read-only display** or **editable** (inline edit within tiles)? | Editable = write path in tiles + save button. Read-only = simpler, less scope. |

---

## Next Step

PLANNING (Gate 2) — awaiting OD-1 through OD-5 owner answers before impact analysis can proceed.

---

## ⏸ HOLD — 2026-08-08

**Backend is adding more fields. CR-134 is ON HOLD and DEPENDS ON CR-132.**

Resumption order (strict sequence):
1. **Wait** for backend to confirm field freeze on `settings-list` API
2. **Wait** for CR-132 to be implemented (wizard fields finalized)
3. Re-answer OD-1..OD-5 with final field list in hand
4. Run fresh coverage audit (wizard fields vs tiles) with updated field set
5. Only then write Gate 2 Impact Analysis for CR-134

**Do NOT plan or implement CR-134 until CR-132 is fully implemented.**
