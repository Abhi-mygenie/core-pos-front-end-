# Test Credentials — MyGenie POS Preprod

**Last updated:** 2026-07-08 (BUG-168 investigation session)
**Environment:** `https://preprod.mygenie.online`

| Tenant | Email | Password | Role | Notes |
|---|---|---|---|---|
| 18March | `owner@18march.com` | `Qplazm@10` | Owner | Verified working — used to fetch orders #002384, #002386 |
| Hogwarts (rest id 618) | `Manager@hogwarts.com` | `Qplazm@10` | Manager | Verified working — used to fetch order #000334. **Requires `?role_name=Manager` query param on `/pos/employee-orders-list`** (undocumented gotcha). |
| Kunafamahal | `owner@kunafamahal.com` | `Qplazm@10` | Owner | Verified 2026-07-17 — used for recipe curl validation. 92 recipes, 8 employees. |

## Login endpoint
`POST /api/v1/auth/vendoremployee/login`
Body: `{ "email": "...", "password": "..." }`
Response contains `token` field (Bearer JWT).

## Useful endpoint reference (this session)
| Purpose | Method | Path | Notes |
|---|---|---|---|
| Login | POST | `/api/v1/auth/vendoremployee/login` | Returns `token` + `firebase_token` + `crm_token` |
| Profile / restaurants | GET | `/api/v1/vendoremployee/profile` | `.restaurants[0].id` = tenant restaurant_id |
| Running orders | GET | `/api/v1/vendoremployee/pos/employee-orders-list?role_name={Role}` | 403 without role_name |
| Single order (full) | POST | `/api/v2/vendoremployee/get-single-order-new` | Body: `{"order_id": <internal_id>}` |
| Paid orders | GET | `/api/v2/vendoremployee/paid-order-list?page=1&per_page=50&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` | Caps ~30 records per response |

## Session artifacts
- `/app/memory/evidence/BUG-168/order_940279.json` (order #002384 — 18March)
- `/app/memory/evidence/BUG-168/order_940281.json` (order #002386 — 18March)
- `/app/memory/evidence/BUG-168/order_940284.json` (order #000334 — Hogwarts)
