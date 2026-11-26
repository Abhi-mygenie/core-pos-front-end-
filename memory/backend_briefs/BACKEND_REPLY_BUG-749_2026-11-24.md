# BUG-749 — Backend reply for FE (Gate 2/3) — VERBATIM

**Received:** 2026-11-24 · **From:** Backend (Gyan) · **Status:** SHIPPED on preprod.
**In reply to:** `backend_briefs/BACKEND_BRIEF_BUG-749_2026-11-24.md`

---

**Shipped.** Dedicated register endpoint is live on preprod.

## Endpoint
- **Method/URL:** `POST /api/v1/vendoremployee/device-token`
- **Auth:** employee bearer `AUTH_TOKEN` (same as profile; post login-as-restaurant for admin/CS)
- **Body:**
```json
{ "fcm_token": "<current Firebase device token>" }
```
- **Success `200`:**
```json
{ "status": "ok", "fcm_token": "<stored token>" }
```
- **Validation fail:** `403` + standard `errors` shape (missing/empty `fcm_token`)

## Behavior (locked)
| Decision | Answer |
|----------|--------|
| **D1** | Path/method confirmed above |
| **D2** | Writes same column as login: `vendor_employees.firebase_token` |
| **D3** | Single token per employee — last-write-wins |
| **D4** | Keyed on authenticated employee row (employee + restaurant) |
| **D5** | Idempotent — safe to POST every reload with **no client dedupe**; no rate limit |
| **D6** | Echoes stored `fcm_token` for drift logging |
| **D7** | Counterpart of logout: `POST /api/v2/vendoremployee/employee-logout` clears the **same** column to `null` |
| **D8** | No `fcm_token_updated_at` |

## FE call pattern
1. On every authenticated boot/reload (incl. after login-as-restaurant), when permission is granted and you have a token → **POST** it here.
2. If permission denied/default / no token → **do not call** (no body to send).
3. No client-side dedupe (OD-749-04).

## Relation to CR-562
Profile GET `?fcm_token=` upsert + response `fcm_token` still exists. For boot registration, **prefer this dedicated POST** (OD-749-02). Profile field remains useful for diagnostics.

**Ready for FE Gate 2/3.**
