# Test Credentials

## MyGenie POS (external backend: preprod.mygenie.online)

| Tenant | Email | Password |
|---|---|---|
| Kashi Sweets & Snacks | owner@kashisweetsnsnacks.com | Qplazm@10 |

## Login Endpoint
- POST `https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
- Body: `{"email":"...","password":"..."}`
- Response: `{ token, firebase_token, crm_token, role_name, role[] }`

## Frontend
- URL: https://4ee149d8-f405-4536-b723-618fbf8c3f1e.preview.emergentagent.com
- Port: 3000
- Auto Settle toggle: Settings → Visibility Settings → UI Elements → Auto Settle
