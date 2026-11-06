# BACKEND_BRIEF_CR375_2026_09_11

## Summary
- **Issue:** Frontend BulkEditor deliberately blocks bulk delete for Aggregator menu items because the `/delete-bulk` endpoint does not support `food_for: 'Aggregator'` — only `Normal|Party|Premium` are accepted.
- **Classification:** BACKEND_MISSING_FEATURE / CONTRACT_MISMATCH
- **Frontend impact:** Aggregator menu users in POS cannot bulk-delete items. They must delete each item one at a time via the card view, which is impractical for menus with 100+ items.
- **Priority/Risk:** P2 / MEDIUM (UX productivity gap, no data corruption risk)

---

## Questions for Backend

**Q1 — Does `DELETE /v2/delete/{foodId}` work for aggregator food IDs?**
- The FE service `deleteFood(id, reason)` calls this endpoint with no `food_for` restriction
- If this endpoint already handles aggregator items, we can implement a sequential loop on the FE side as a workaround (Path B)
- If it does NOT work for aggregator IDs, Path B is not viable

**Q2 — Can `/delete-bulk` be extended to support `food_for: 'Aggregator'`?**
- Current accepted values: `Normal | Party | Premium`
- Request: add `Aggregator` to the accepted `food_for` values
- This is Path A — the cleanest solution, matches the existing bulk delete pattern
- If accepted, no FE changes are needed beyond removing the FE guard

---

## Endpoint

- **Method:** DELETE
- **URL:** `https://preprod.mygenie.online/api/v2/vendoremployee/product/delete-bulk`
- **Auth/context:** Standard Bearer token (vendor employee)

**Current payload shape:**
```json
{
  "ids": [123, 456, 789],
  "delete_reason": "Discontinued",
  "food_for": "Normal"
}
```

**Requested payload shape (Path A):**
```json
{
  "ids": [123, 456, 789],
  "delete_reason": "Discontinued",
  "food_for": "Aggregator"
}
```

---

## Reproduction

1. Log into POS as a restaurant with Aggregator menu items
2. Navigate to Menu Management → Aggregator menu type → Bulk Edit
3. Observe: no checkboxes, no "Delete Selected" option
4. Root cause in FE: `BulkEditor.jsx:396` → `const showBulkDelete = menuType !== 'Aggregator'`
5. Root cause in service: `menuManagementService.js:106–112` documents endpoint does not support `food_for: 'Aggregator'`

---

## Payload / Response

- **Current accepted values:** `food_for: 'Normal' | 'Party' | 'Premium'`
- **Expected extension:** `food_for: 'Aggregator'`
- **FE service code:** `/app/frontend/src/api/services/menuManagementService.js:110–112`
- **FE guard code:** `/app/frontend/src/components/panels/menu/BulkEditor.jsx:395–396`

---

## Evidence

- **FE service comment:** `menuManagementService.js:106–108` explicitly documents exclusion
- **FE guard:** `BulkEditor.jsx:396` comment: "CR-159: Aggregator menu does not support delete-bulk endpoint"

---

## Frontend Workaround

- **Available:** YES (partial) — Path B uses `deleteFood` (single-item DELETE) in a loop
- **Risk:** UNKNOWN — requires backend to confirm `DELETE /v2/delete/{foodId}` handles aggregator items
- **Recommendation:** Path A (extend `/delete-bulk`) is preferred over Path B (sequential loop) for atomicity and consistency with existing bulk delete behaviour

---

*Backend Brief filed: 2026-09-11. Awaiting backend response to unblock CR-375.*
