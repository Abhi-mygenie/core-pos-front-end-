# BACKEND_BRIEF_B2_RECIPE_500_2026_07_20

## Summary
- Issue: POST /store-recipe, /store-sub-recipe, and /store-addon-recipe all crash with 500 "Undefined array key 'id'" after passing frontend validation
- Classification: BACKEND_BUG
- Frontend impact: Recipe creation (standard, sub, addon) is blocked despite correct payloads
- Priority/Risk: P1 / HIGH

## Endpoints
- POST /api/v2/vendoremployee/recipe/store-recipe → 500 at RecipeController.php:3319
- POST /api/v2/vendoremployee/recipe/store-sub-recipe → 500 at RecipeController.php:678
- POST /api/v2/vendoremployee/recipe/store-addon-recipe → 500 at RecipeController.php:3319
- Auth: Bearer token for owner@kunafamahal.com (RID 689)

## Reproduction
1. Login as owner@kunafamahal.com
2. Navigate to Inventory → Recipes → Create Recipe
3. Select a food item that doesn't already have a recipe
4. Add at least one ingredient with quantity
5. Click Save → 500 error

## Payload / Response
- Standard recipe payload: {"name":<food_id>,"recipe_qty":1,"recipe_unit":"kg","preparation_time":"0","serve_time":"0","serves_people":1,"ingredients":[{"ingredient_id":10741,"quantity":1,"unit":"gm"}]}
- Sub-recipe payload: {"sub_recipe_name":"test","qty":1,"subunit":"gm","prepration_time":"0","serve_time":0,"serve_people":1,"thershold_qty":0,"thershold_unit":"","ingredient":[{"ingredient_id":10741,"quantity":1,"unit":"gm"}]}
- Addon recipe payload: {"addon_id":11586,"name":"test","recipe_qty":1,"recipe_unit":"kg","preparation_time":0,"serves_people":1,"serve_time":0,"ingredients":[{"ingredient_id":10741,"quantity":1,"unit":"gm"}]}
- Response: {"message":"Undefined array key \"id\"","exception":"ErrorException","file":"RecipeController.php","line":3319}

## Frontend Workaround
- Available: NO
- The error is in backend controller logic after validation passes. Frontend payloads are confirmed correct.
