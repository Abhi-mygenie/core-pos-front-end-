# BACKEND_BRIEF_CR-473_FOOD_FOR_NOT_ACTIVE_2026_10_26

## Summary
- Issue: `food_for` parameter on recipe mapping endpoints is NOT active on preprod
- Classification: CONTRACT_MISMATCH
- Frontend impact: CR-473 (Recipe Mapping by Menu Master) cannot be end-to-end tested — frontend can build UI scaffolding but mapping/unlinking/export for per-menu foods will not work
- Priority/Risk: P2 / MEDIUM (blocks CR-473 Gate 5b QA, not blocking other work)

## Endpoints Affected

All 4 recipe mapping endpoints under `{HOST}/api/v2/vendoremployee/recipe/`:

### 1. GET /food-recipe-mapping
- Method: GET
- URL: `{HOST}/api/v2/vendoremployee/recipe/food-recipe-mapping?food_for=Normal`
- Auth: Bearer token (owner@palmhouse.com, RID 541)

### 2. POST /update-recipe-mapping-batch
- Method: POST
- URL: `{HOST}/api/v2/vendoremployee/recipe/update-recipe-mapping-batch`
- Body: `{ "food_for": "{menu_name}", "updates": [{ "item_id": N, "recipe_id": N }] }`

### 3. POST /unlink-recipe-mapping
- Method: POST
- URL: `{HOST}/api/v2/vendoremployee/recipe/unlink-recipe-mapping`
- Body: `{ "food_for": "{menu_name}", "item_id": N }`

### 4. GET /export-recipe-mapping
- Method: GET
- URL: `{HOST}/api/v2/vendoremployee/recipe/export-recipe-mapping?food_for={menu_name}`

## Reproduction

```bash
# Step 1: Login
TOKEN=$(curl -s -X POST "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" -H "Accept: application/json" -H "X-localization: en" \
  -d '{"email":"owner@palmhouse.com","password":"***"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Step 2: Menu Master works fine
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/product/menu-master" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
# Returns: {"message":"Menus fetched successfully","menus":[{"id":1624,"menu_name":"Normal"},{"id":1623,"menu_name":"Party"},{"id":1622,"menu_name":"Premium"}]}

# Step 3: food_for on food-recipe-mapping — NOT WORKING
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/recipe/food-recipe-mapping?food_for=Normal" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
# Returns: same response as without food_for — no "foods" array, no "food_for" field, no "foods_total"/"foods_mapped" in stats

# Step 4: food_for=Party — same
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/recipe/food-recipe-mapping?food_for=Party" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"
# Returns: identical to no-param call. foods=None, food_for=None.
```

## Payload / Response

### Expected (per spec `menumaster.md`)
```json
{
  "success": true,
  "food_for": "Normal",
  "recipes": [...],
  "foods": [
    { "id": 1001, "food_name": "Paneer Tikka", "recipe_id": null, "recipe_name": null, "food_for": "Normal" }
  ],
  "aggregator_foods": [],
  "stats": {
    "recipes_total": 108,
    "aggregator_total": 0,
    "aggregator_mapped": 0,
    "foods_total": 1,
    "foods_mapped": 0
  }
}
```

### Actual (preprod 2026-10-26)
```json
{
  "success": true,
  "client_id": null,
  "filter_by_client": false,
  "clients": [],
  "selected_client": null,
  "recipes": [{"id": 88, "name": "Paneer Tikka"}, ...],
  "aggregator_foods": [{"id": 3605, "food_name": "Cortado", "recipe_id": 0, "recipe_name": null}, ...],
  "stats": {"recipes_total": 108, "aggregator_total": 5, "aggregator_mapped": 0}
}
```

No `food_for`, no `foods[]`, no `foods_total`/`foods_mapped` in stats. The `food_for` query parameter is silently ignored.

## Questions for Backend

- **Q1:** Is the `food_for` enhancement on recipe mapping endpoints deployed on preprod? If not, when is the expected deployment date?
- **Q2:** Is this behind a feature flag or restaurant setting that needs to be enabled for RID 541 (The Palm House)?
- **Q3:** The `menu-master` endpoint IS live — was it deployed as a standalone or as part of the same release as the recipe mapping enhancement?
- **Q4:** The spec mentions `update-recipe-mapping-batch` with `food_for` in body (no `type`). Is the POST body parsing already updated, or is that also pending?
- **Q5:** Any migration or data prerequisite needed for `food_for` to work (e.g., foods need to be tagged with a menu in the backend)?

## Frontend Workaround

- Available: PARTIAL
- Details: Frontend can build the menu-master dropdown UI (endpoint is live) and scaffold the per-menu recipe mapping UI. But actual mapping/unlinking/export calls with `food_for` will return old-shape responses until backend deploys. Frontend will code to the spec and gate E2E testing on backend readiness.

## Evidence

- Curl outputs inline above (session context, 2026-10-26)
- Spec document: `menumaster.md` (owner-provided)
