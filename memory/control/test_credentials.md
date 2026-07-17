# Test Credentials — MyGenie POS Preprod

**Last updated:** 2026-07-17

| Tenant | Email | Password | Role |
|---|---|---|---|
| cafe103 | owner@cafe103.com | Qplazm@10 | Owner |
| 18March | owner@18march.com | Qplazm@10 | Owner |
| Hogwarts (618) | Manager@hogwarts.com | Qplazm@10 | Manager |

## Login endpoint
`POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
Body: `{ "email": "...", "password": "..." }`

## Priced items on cafe103
- pav (Kitchen) — ₹20
- pav (Milk) — ₹26
- pav (To Owner) — ₹30
