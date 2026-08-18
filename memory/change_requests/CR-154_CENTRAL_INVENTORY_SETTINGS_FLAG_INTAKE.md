# CR-154 — Settings Flags for Inventory as Central Inventory

**Type:** Change Request (New Feature)
**ID:** CR-154
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner wants a settings flag to designate a restaurant's inventory mode as **Central Inventory** — where inventory is managed centrally (from one location) and distributed to multiple outlets, rather than each outlet managing its own independent inventory.

This flag would control inventory behavior throughout the POS (stock deduction, purchase orders, wastage recording, etc.).

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Inventory / General Settings |
| Priority | P1 |
| Severity | HIGH — affects core inventory data flow for multi-outlet setups |
| Risk | HIGH (configuration flag that changes inventory behavior system-wide; incorrect toggle could affect stock counts) |
| Fast Lane | NO — settings flag + downstream logic implications |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce: Open Settings → Inventory or General Settings — no "Central Inventory" toggle/flag visible
- Confidence: REPORTED

## Code Reality Check

```bash
grep -rn "centralInventory\|central_inventory\|isCentral\|is_central\|CENTRAL" src/ → 0 matches
```

- **Code reality: NONE** — no central inventory concept exists in the frontend codebase
- Related files (for implementation reference):
  - `src/components/panels/settings/GeneralSettingsView.jsx` (likely home for this flag)
  - `src/contexts/RestaurantContext.jsx` (restaurant profile/settings data)
  - `src/api/transforms/restaurantSettingsTransform.js` (settings transform)

## Blast Radius

- 0 existing lines (SMALL — new flag addition)
- If flag gates inventory behavior: downstream impact could be LARGE
- Estimated scope: MEDIUM (settings UI + transform + context + potentially conditional logic in inventory)

## Expected Behavior

- Settings → General Settings (or dedicated Inventory Settings) has a toggle: "Central Inventory Mode"
- When enabled: inventory operations are centralized
- Flag is saved to backend via restaurant settings API
- Downstream inventory components respect the flag (show/hide outlet-specific controls)

## Owner Decisions Needed

1. What does "Central Inventory" concretely change in the UI?
   - Does it hide per-outlet stock counts?
   - Does it redirect purchase orders to a central store?
   - Does it restrict local stock adjustments?
2. Is this a single flag or a multi-outlet configuration?
3. What is the backend field name for this flag?

## Duplicate Check

DISTINCT — no prior CR for central inventory configuration.

---

**Backend Brief Needed:** Yes — need field name, API endpoint, and behavior contract from backend.
**Next:** Planning Gate 2 (owner decisions needed before impact analysis can proceed)
