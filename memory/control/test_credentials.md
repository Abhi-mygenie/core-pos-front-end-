# Test Credentials — MyGenie POS Preprod

**Last updated:** 2026-07-18

| Tenant | Email | Password | Role | Notes |
|---|---|---|---|---|
| cafe103 | owner@cafe103.com | Qplazm@10 | Owner | — |
| 18March | owner@18march.com | Qplazm@10 | Owner | — |
| Hogwarts (618) | Manager@hogwarts.com | Qplazm@10 | Manager | — |
| Kunafa Mahal | owner@kunafamahal.com | Qplazm@10 | Owner | `restaurant_type_flag = normal` — use for inventory UX (non-franchise) checks |
| Palm India | owner@palmindia.com | Qplazm@10 | Owner | `restaurant_type_flag = franchise` · `parent_restaurant_id = 813` — use for CR-077 Receive + inventory-transfer flows |
| Central Kitchen (#813) | **not yet shared** | — | Owner (master) | **NEEDED** for CR-077 Dispatch/Approval flow validation |

## Login endpoint
`POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
Body: `{ "email": "...", "password": "..." }`

## Priced items on cafe103
- pav (Kitchen) — ₹20
- pav (Milk) — ₹26
- pav (To Owner) — ₹30

## Notes
- Tokens expire quickly — re-login before each curl session.
- `restaurant_type_flag` is at `restaurants[0].restaurant_type_flag` in the `/profile` v1 response (tri-state: `normal` / `franchise` / presumed `master`).
