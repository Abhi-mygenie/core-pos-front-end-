# BUG-328 — Discount Type Configuration Not Accessible / Missing

**Type:** Bug
**ID:** BUG-328
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner reports "Discount Type Configuration is missing." The Settings → Discount Types tile exists in the SettingsPanel and maps to `DiscountTypesView`, but the owner cannot configure discount types. Root cause unknown — could be: (a) API not returning discount types, (b) the Add/Edit form is non-functional, or (c) the view renders "No discount types configured" with no working Add button.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Settings → Discount Types |
| Priority | P1 |
| Severity | HIGH — operators cannot configure discount types; all discount application is affected |
| Risk | HIGH (discount configuration affects order pricing / financial) |
| Fast Lane | NO — financial logic; investigation needed first |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Open Settings → Discount Types → observe missing/broken configuration
- Confidence: REPORTED (unverified — needs Investigation sub-step)

## Code Reality Check

```bash
# SettingsPanel.jsx line 23: { id: "discount-types", label: "Discount Types", icon: Tags }
# SettingsPanel.jsx line 39: "discount-types": DiscountTypesView
# ListFormViews.jsx line 128: export const DiscountTypesView = () => { ... }
# ListFormViews.jsx line 166: discountTypes.length === 0 → "No discount types configured."
```

- **Code reality: FULL** — UI component and routing exist; data or form functionality is the likely failure point
- Relevant files:
  - `src/components/panels/settings/ListFormViews.jsx` (DiscountTypesView)
  - `src/components/panels/SettingsPanel.jsx` (menu + view map)
  - `src/contexts/RestaurantContext.jsx` or `useRestaurant()` (discountTypes data source)
  - API service backing `discountTypes`

## Blast Radius

- ~117 lines reference `discountType` across codebase
- Hotspot files: `ListFormViews.jsx`, discount-related transforms, order entry (applies discount)
- Estimated scope: MEDIUM (3-5 files)

## Expected Behavior

- Settings → Discount Types should allow: List, Add, Edit, Delete discount types
- Types should appear in the POS order entry discount selector

## Owner Decisions Needed

1. Is this completely absent (never worked on this deployment), or was it previously working?
2. Are there existing discount types already configured in the backend?

## Duplicate Check

DISTINCT — no prior BUG references Discount Types configuration specifically.

---

**Next:** Planning Gate 2 (Investigation → Impact Analysis)
