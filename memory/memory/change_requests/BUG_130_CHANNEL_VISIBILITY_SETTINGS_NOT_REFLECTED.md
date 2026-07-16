# BUG-130 — Channel Visibility: Restaurant Settings Channels Not Reflected in POS Dashboard

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** Bug
**Area:** Dashboard / Settings / Channel Visibility
**Priority:** P1 (functionality — channels enabled/disabled in settings not reflected on POS dashboard)
**Sprint:** POS 4.0

---

## 1. Symptom

When channels (Dine-In, TakeAway, Delivery, Room) are enabled or disabled via the **Restaurant Settings API** (the master channel configuration), those changes are **not reflected as expected** on the POS dashboard for users in that restaurant.

There are two layers of channel visibility:
1. **Restaurant-level (API/Settings):** Master channel config from `settings-list` API — determines which channels the restaurant has enabled. This is the source of truth for all users.
2. **Local visibility (localStorage/StatusConfig):** Per-user override on the "Status Configuration" page (`/visibility/status-config`). A user can locally hide channels for their own view, but they should only be able to see/toggle channels that the restaurant has enabled at the API level.

**Expected:** If the restaurant disables TakeAway in settings, TakeAway should not appear anywhere in the POS for any user — not on the dashboard, not in local visibility toggles, not in order entry channel selection.

**Actual:** Enabling/disabling channels in restaurant settings is not getting properly reflected in POS. Deep investigation needed to trace the full chain.

---

## 2. Screenshot Evidence

Owner-provided screenshot shows Status Configuration page (`/visibility/status-config`) with:
- **Channel Override: ON** (green badge)
- Dine-In: ✅ enabled (orange border + checkmark)
- TakeAway: disabled (gray)
- Delivery: disabled (gray)
- Room: ✅ enabled (orange border + checkmark)
- User: Owner (#558) on `pos-uat.mygenie.online`

The issue is that changes made at the restaurant settings API level (master config) are not properly gating what appears here and on the dashboard.

---

## 3. Investigation Scope (deferred — registration only)

When investigation begins, trace the full chain:
1. **Restaurant Settings API** (`settings-list`) → which channels are enabled
2. **Profile API** → `restaurant.features` → channel flags
3. **`profileTransform.js`** → how channel features are mapped
4. **`StatusConfigPage.jsx`** → CR-024 channel visibility override logic
5. **`DashboardPage.jsx`** → how channels are rendered on dashboard
6. **`OrderEntry.jsx`** → channel selection in order entry
7. **`localStorage`** channel visibility keys → interaction with API-level settings

Related prior work:
- **CR-024** (Channel Visibility Override) — CLOSED, owner QA passed 2026-06-11
- **CR-020 B11** (order-type dropdown filters by features) — PARKED pending live profile validation
- `StatusConfigPage.jsx`, `DashboardPage.jsx`, `restaurantSettingsTransform.js` — files touched by CR-024/CR-020

---

## 4. Impact (preliminary)

- **Files:** Likely `StatusConfigPage.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx`, `profileTransform.js`, `restaurantSettingsTransform.js`
- **Regression risk:** MEDIUM — channel visibility touches dashboard layout, order entry, and local storage
- **Money/payload impact:** Indirect — wrong channels visible could lead to orders placed on disabled channels

---

## 5. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | PENDING (deep investigation deferred per owner) |
| 3 — Implementation Plan | PENDING |
| 4 — Code Gate | PENDING |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*BUG-130 Intake — 2026-06-12*
