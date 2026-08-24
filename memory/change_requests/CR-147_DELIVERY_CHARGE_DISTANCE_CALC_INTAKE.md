# CR-147 — Online Delivery Charge Configuration with Distance Calculation

**Type:** Change Request (Feature Enhancement)
**ID:** CR-147
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner wants delivery charge to be configurable based on **distance** (e.g., per-km slab or radius zones). Currently the Delivery Settings panel exists but supports only flat-rate or percentage-based delivery charges — no distance-based calculation is present.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Delivery Settings |
| Priority | P1 |
| Severity | HIGH — affects delivery order billing for every restaurant using delivery |
| Risk | HIGH (billing/charges logic; CRITICAL if it changes active delivery order totals) |
| Fast Lane | NO — billing logic, multi-file change |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Open Settings → Delivery Settings → observe no distance-based configuration option
- Confidence: REPORTED (owner-described)

## Code Reality Check

```
grep -rn "distance\|Distance\|distance_calc\|distanceBased" src/components/panels/settings/ → 0 matches
grep -rn "delivery.*charge\|distanceCharge" src/ → 407 matches (flat-rate delivery charge exists)
```

- **Code reality: PARTIAL** — flat delivery charge exists; distance-based calculation is NONE
- Relevant files:
  - `src/components/panels/settings/DeliverySettingsView.jsx` (current delivery settings UI)
  - `src/api/transforms/productTransform.js` (delivery charge transform)
  - `src/api/services/` (delivery-related service calls)

## Blast Radius

- ~407 lines reference delivery charge
- Hotspot files: `DeliverySettingsView.jsx`, delivery transforms, order total computation
- Estimated scope: LARGE (6+ files if distance affects order total computation)

## Expected Behavior

- Settings → Delivery Settings should have a distance-based pricing section
- Support for: slabs (0-2km: ₹30, 2-5km: ₹60, 5-10km: ₹100, etc.) or radius zones
- The calculated delivery charge should flow into the order total at checkout

## Owner Decisions Needed

1. Should distance be: (a) slab-based (per-km ranges) or (b) flat per-km multiplier?
2. Where does the distance data come from? (Google Maps API / manually set per order?)
3. Should this override or supplement existing delivery charge config?

## Duplicate Check

DISTINCT — no prior CR/BUG references distance-based delivery charge in registry.

---

**Next:** Planning Gate 2
