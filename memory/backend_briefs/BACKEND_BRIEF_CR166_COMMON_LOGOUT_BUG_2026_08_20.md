# BACKEND_BRIEF — CR-166 Common Logout Bug

## Summary
- Issue: POST /api/v1/auth/adminemployee/logout returns 500 with SQL UNIQUE constraint violation
- Classification: BACKEND_BUG
- Frontend impact: CS agents cannot properly terminate common session
- Priority/Risk: P2 / HIGH (affects logout flow — security concern)

## Endpoint
- Method: POST
- URL: https://preprod.mygenie.online/api/v1/auth/adminemployee/logout
- Auth: Bearer <common_token>

## Error
SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry '' for key 'admins.auth_token'
File: AdminEmployeeLoginController.php:625

## Root Cause
Backend logout clears auth_token by setting it to '' (empty string).
admins table has UNIQUE constraint on auth_token column.
If multiple admins have already logged out (token = ''), second logout fails.

## Fix Required (Backend)
Set auth_token to NULL instead of '' on logout, OR use a random UUID.
Alternatively: use DELETE or set to NULL (NULL is not subject to UNIQUE constraints in SQL).

## FE Workaround (in commonAuthService.js)
Always clear COMMON_TOKEN locally even if API call fails:
  try { await api.post(COMMON_LOGOUT, ...) } catch (e) { /* ignore */ }
  finally { localStorage.removeItem(STORAGE_KEYS.COMMON_TOKEN) }
This ensures user is always logged out from FE perspective regardless of backend error.

## Resolution
**FIXED 2026-08-20** — re-tested with fresh token:
- POST /logout → `{"message": "Logout successful"}` HTTP 200 ✅
- Token invalidated server-side: subsequent GET /assigned-restaurants → `auth-003: Token required` ✅
- No FE workaround needed. commonAuthService.js can call logout normally (still keep try/catch for network resilience).
