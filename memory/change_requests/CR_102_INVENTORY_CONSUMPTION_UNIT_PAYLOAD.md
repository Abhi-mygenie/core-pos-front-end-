# CR-102 — Inventory Add/Edit: Send `consumption_unit` in Payload (G-020 Alignment)

**Registered:** 2026-07-24
**Source:** OWNER-REPORTED (investigation session)
**Classification:** CR
**Priority:** P1
**Risk:** LOW
**Duplicate Check:** RELATED to BUG-226 (converion_factor saved). DISTINCT — BUG-226 addressed the factor field; CR-102 addresses the missing `consumption_unit` companion field required by backend G-020 validation.

---

## Summary

The FE inventory form collects `smallUnit` + `conversionFactor` for unit conversion, but the `toAPI.addIngredient()` and `toAPI.updateIngredient()` payloads send `small_unit` (legacy/display-only) instead of `consumption_unit` (what backend G-020 requires). This makes the conversion factor UI effectively dead — the backend either rejects the payload (422 `CONSUMPTION_UNIT_REQUIRED`) or ignores the factor.

## Evidence

- **Investigation report:** `/app/memory/impact/INVESTIGATION_CONSUMPTION_FACTOR_2026_07_24.md`
- **Backend contract:** `add_inventory_payload_frontend.md` (user-provided)
- **Curl:** All 106 ingredients have `consumption_unit: null`, `has_unit_conversion: false`
- **Code:** `inventoryTransform.js` toAPI L128-137 (add) + L141-152 (update) — no `consumption_unit`
- **Source:** OWNER-REPORTED, Confidence: CONFIRMED

## Blast Radius

- **1 file:** `inventoryTransform.js` (toAPI only)
- **~4 lines** changed
- **Hotspot:** NO
- **Scope:** SMALL

## Fix (from investigation §9)

Repurpose existing `smallUnit` form value → send as `consumption_unit`:
- `addIngredient`: add `consumption_unit: data.smallUnit || ''`
- `updateIngredient`: add `consumption_unit: data.smallUnit || ''`
- Only send `converion_factor` when both `smallUnit` and `conversionFactor` are provided
- No form UI changes needed

## Open Questions

None — investigation resolved all owner decisions (§6 Q1-Q3).

## Fast Lane

NOT ELIGIBLE — transform file change (condition #4 fails).
