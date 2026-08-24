# CR-166 — Owner Q&A (All OQs Confirmed 2026-08-20)

## OQ-1: login_type === 'admin' → picker, 'employee' → normal flow
## OQ-2: COMMON_TOKEN = common-login response.token (keep); AUTH_TOKEN = login-as response.restaurant_token; CRM from crm_token
## OQ-3: Switch = /restaurant-picker reusing COMMON_TOKEN; logout via POST /adminemployee/logout
## OQ-4: assigned_restaurants[] + total_count; show restaurant_status===1 only; logo=filename
## OQ-5: restaurant_token→AUTH_TOKEN; crm_token→CRM; no permissions in response (LoadingPage boot handles it)
