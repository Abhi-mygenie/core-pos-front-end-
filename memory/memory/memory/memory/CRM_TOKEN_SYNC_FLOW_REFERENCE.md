# CRM Token Sync Flow — Reference Note

**Date:** 2026-05-20
**Source:** Owner-provided flow description
**Status:** Documentation only — no code in this repo

---

## CRM Login + Token Sync Flow

On valid MyGenie employee login:

```
1. CRM authenticates via MyGenie POS
   → POST /api/v1/auth/vendoremployee/login (on POS backend)
   → Returns: token, role_name, permissions

2. CRM fetches MyGenie profile
   → GET /api/v1/vendoremployee/profile (on POS backend)
   → Returns: restaurant data, settings, features

3. CRM creates/loads local CRM user
   → CRM backend creates or finds existing user record
   → Uses MyGenie employee data as identity source

4. CRM generates/uses users.api_key
   → If user has no api_key → CRM generates one (generate_api_key())
   → If user already has api_key → reuses existing
   → api_key is saved to CRM's MongoDB

5. CRM registers that api_key with POS
   → POST /api/v1/auth/restaurant-crm-token (on POS backend)
   → Payload: { "restaurant_id": "<restaurant_id>", "crm_token": "<users.api_key>" }
   → POS stores/updates the CRM token for that restaurant

6. POS stores/updates CRM token successfully
   → POS now knows the CRM api_key for this restaurant
   → Future POS→CRM API calls can use this token
   → POS login response includes crm_token field
```

---

## How POS Frontend Consumes This

| File | What It Does |
|---|---|
| `authTransform.js` L21 | Maps `crm_token` from POS login response → `crmToken` |
| `crmAxios.js` L4-68 | Uses `crm_token` from login response as `X-API-Key` header for all CRM API calls |

---

## Edge Cases (Not Yet Validated — Backend Not in This Repo)

| Case | Expected Behavior | Validated? |
|---|---|---|
| Existing user with api_key | api_key reused, POS registration called | No — backend code not available |
| Existing user without api_key | api_key generated, saved, POS registration called | No |
| POS returns 409 (already registered) | Treated as success, login continues | No |
| POS returns 5xx/timeout | Login continues, CRM works without POS registration | No |
| MyGenie profile missing CRM key | CRM still sends its own users.api_key to POS | No |

**These edge cases should be validated when the CRM backend codebase is available.**

---

## Related POS3.0 Items

- **BUG-098**: Use restaurant profile CRM key instead of FE env keys — related (profile-based CRM key sourcing)
- **`delivery_assign`**: Also comes from restaurant profile (same API)

---

*— CRM Token Sync Flow Reference — 2026-05-20 —*
