# BUG-375 INTAKE — Zomato Image Title Shown in Normal Menu Management
**Date:** 2026-09-01 | **Priority:** P3 | **Risk:** LOW | **Severity:** MINOR | **Status:** INTAKE

## Description
In Normal Menu Management (non-aggregator mode), the "Zomato Image" label and image field appears in the product edit form. This field is only relevant for restaurants with Zomato/aggregator integration and should be hidden for non-aggregator restaurants.

## Code Reality: PARTIAL
`ProductForm.jsx:337`:
```jsx
<label>Zomato Image</label>
[image input field]
← NOT wrapped in any aggregator/Zomato gate
```

**Symmetrical gap to BUG-327:** BUG-327 fixed the Swiggy image upload field to show only for aggregator items (`{/* BUG-327: Swiggy image upload — aggregator food only */}` at line 358). The same gate was NOT applied to the Zomato Image field at line 337.

## Duplicate Check: DISTINCT — symmetrical to BUG-327 (already CLOSED)
## Related: BUG-327 (Swiggy image gating)
## Blast Radius: SMALL (1 file — ProductForm.jsx, ~2 lines)
## Planning Skip: YES eligible — owner approval needed
## Next: Gate 4 GO (Fast Lane)
