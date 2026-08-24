# BUG-300 Code Trace Evidence

## File: crmAxios.js (full file read)

### Token lifecycle:
- L17: `currentCrmToken = sessionStorage.getItem('crm_token') || null` — restored from sessionStorage on page load
- `setCrmToken()`: called ONCE from `authService.login()` — no subsequent refresh
- `clearCrmToken()`: called on logout

### Request interceptor (L62-74):
- Attaches `X-API-Key: <currentCrmToken>` to every CRM request
- If token missing: warns but proceeds (returns config)

### Response interceptor (L76-116):
- Handles errors: Laravel 422, timeout, network errors
- Adds `error.readableMessage` property
- **NO 401 handling** — expired/invalid token returns error.readableMessage but NO retry/refresh
- **NO token refresh mechanism anywhere**

### Failure mode when CRM token expires:
1. CRM returns HTTP 401 → error.response.status === 401
2. Error interceptor adds `readableMessage` ('CRM request failed' or API message)
3. Caller receives rejected promise → catch block → empty results or silent failure
4. No user-visible error in most CRM calls (optional feature)
5. Re-login → fresh `crm_token` from login response → `setCrmToken()` called → works again

### Root cause: No CRM token expiry detection or refresh mechanism.
