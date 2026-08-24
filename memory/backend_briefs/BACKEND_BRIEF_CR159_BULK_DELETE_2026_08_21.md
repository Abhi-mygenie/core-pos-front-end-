# BACKEND_BRIEF — Bulk Delete Endpoint Missing
## ID: CR-159_BULK_DELETE_ENDPOINT
## Date: 2026-08-21
## Classification: BACKEND_BUG — Route not implemented

---

## Summary
- **Issue:** `DELETE /api/v2/vendoremployee/product/delete-bulk` returns `Method App\Http\Controllers\Api\V2\VendorEmployee\FoodController does not exist.`
- **Frontend impact:** Bulk delete confirm dialog fires the API → 500 error → toast "Error: Method ... does not exist."
- **Priority/Risk:** P1 / HIGH — CR-159 feature is non-functional until this ships

---

## Endpoint

- **Method:** DELETE
- **URL:** `https://preprod.mygenie.online/api/v2/vendoremployee/product/delete-bulk`
- **Auth:** `Authorization: Bearer <token>`
- **Content-Type:** `application/json`

---

## Payload (exact contract)

```json
{
  "ids": [217622, 217624],
  "delete_reason": "Item not in menu any more",
  "food_for": "Normal"
}
```

| Field | Type | Notes |
|---|---|---|
| `ids` | `number[]` | Array of food IDs to delete |
| `delete_reason` | `string` | Must be a valid reason from `/delete-reasons` list |
| `food_for` | `"Normal"\|"Party"\|"Premium"` | Menu type — Aggregator excluded by FE guard |

---

## Reproduction

1. Log in to POS → Menu Management → Bulk Edit
2. Check any 2+ rows (Normal menu)
3. Click "Delete Selected (N)" → select reason → Confirm Delete
4. See error toast: `Method App\Http\Controllers\Api\V2\VendorEmployee\FoodController does not exist.`

---

## Expected Response (success)

```json
{ "status": true, "message": "Items deleted successfully" }
```

## Expected Response (partial failure / validation)

```json
{ "status": false, "message": "Some items could not be deleted", "failed_ids": [217622] }
```

---

## Frontend Workaround

- **Available:** NO — feature blocked until endpoint ships
- **FE code:** `menuManagementService.js:107` — correct per spec, no FE fix needed
- **Error toast:** Now shows actual backend message for better debugging (2026-08-21 fix)

---

## Notes

- `food_for: "Aggregator"` is never sent — FE guard `menuType !== 'Aggregator'` prevents it
- The single-delete endpoint `DELETE /delete/{foodId}` works fine — this is only the bulk endpoint
