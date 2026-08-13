# BACKEND_BRIEF_CR132_UPDATE_SETTINGS_500_2026_08_11

## Summary
- Issue: `POST /update-settings` returns HTTP 500 on preprod
- Classification: BACKEND_BUG
- Frontend impact: Wizard "Save & Continue" button cannot progress — saveStep() fails → wizard stuck on Step 1
- Priority/Risk: P1 / HIGH

## Endpoint
- Method: POST
- URL: `https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/update-settings`
- Auth: Bearer token (valid — GET settings-list works fine with same token)

## What Changed (may be cause)
CR-132 added 49 new fields to the payload including:
- New `basic{}` fields: `restaurant_for`, `prepaid_auto_sattle`, `ordersAutoPaid` (int), `no_of_bill`, `no_of_kot`, `printing_in_kds`, `print_bill_customer_copy`, `use_token`, `kot_language`, `order_auto_serve`, `schedule_order`, `confirm_order_show_tab`, `confirm_order_tone`, `locationSelection`, etc.
- Removed `room` from `advanced{}` — now only in `basic{}`
- CR-135 pass-through fields included in basic{}: `aggregator_order_tone`, `aggregator_auto_kot`, etc.

## Reproduction
1. Login as `owner@cafe103.com`
2. POST to `/api/v2/vendoremployee/restaurant-settings/update-settings` with FormData containing `data` JSON key
3. Returns HTTP 500

## Frontend Workaround
- Available: NO — wizard progression is blocked
- Next: Backend must accept new payload shape or return 200 for unknown fields

## Evidence
- GET /settings-list works correctly (returns all new fields)
- Frontend payload shape is curl-verified against the live GET response
- QA test report: `/app/test_reports/iteration_6.json`
