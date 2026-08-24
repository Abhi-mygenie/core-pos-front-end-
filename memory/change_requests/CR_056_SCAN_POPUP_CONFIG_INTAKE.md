# CR-056 — Intake Document (Gate 0 + Gate 1)

**Status:** REGISTERED · **Priority:** P2 · **Risk:** MEDIUM · **Sprint:** POS 5.0 · **Date:** 2026-07-04
**Source:** OWNER-REPORTED (batch intake 2026-07-04)
**Type:** CR (config/setting) — Frontend (Restaurant Settings + Dashboard scan popup)
**Duplicate check:** DISTINCT

---

## 1. Requirement
When orders arrive via the scan channel, the app currently shows a popup on the dashboard (`components/dashboard/ScanOrderPopOut.jsx`). Owner wants a **restaurant-level configuration** to enable/disable this popup so restaurants that don't want the interruption can suppress it.

Owner phrasing (verbatim in intake): "When orders comes from scan its shows in pop up — is there a configuration to show pop or not?"

## 2. Expected Behavior
- Add a toggle in Restaurant Settings (likely Step 4 "Order & Kitchen" or Step 2 "Channels & Payments") — e.g. `scanOrderPopup` / `show_scan_popup` (name TBD).
- Persist via existing `restaurantSettingsTransform.js` (map to backend field).
- On Dashboard, gate `ScanOrderPopOut` render on the setting.
- Default value: ON (preserves current behavior for existing restaurants) — owner to confirm.

## 3. Code Reality
- `pages/DashboardPage.jsx` renders scan-order popup handlers (L1286, L1950 cancel-scan modal seen in grep).
- `components/dashboard/ScanOrderPopOut.jsx` — popup component exists.
- `pages/RestaurantSettingsPage.jsx` — existing toggle pattern (e.g. `Toggle` component used for `gstEnabled`, `vatEnabled`, `shortCode`) is directly reusable.
- `api/transforms/restaurantSettingsTransform.js` — add new field mapping.

## 4. Blast Radius
3–5 files (Settings page + transform + Dashboard gate + backend field). Blast: MEDIUM. Hotspots: NO.

## 5. Evidence & Reference
- Owner verbal report only. Confidence: REPORTED.
- Screenshot of current popup: NOT PROVIDED (component already located in code).

## 6. Open Questions (for Planning)
1. Default ON or OFF for new restaurants?
2. Exact wording / hint for the toggle label?
3. Is the setting per-branch (restaurant) or per-user? (Owner ruling required.)
4. Coordinate with backend for the new field, or store client-side only (localStorage) as a phase-1 quick win?

## 7. Next
Planning Gate 2 — owner ruling on default + storage strategy; then Impact Analysis.
