# INVESTIGATION REPORT — FINAL (API-Verified)
## Batch Intake 2026-07-11 — 13 Bugs + 1 CR
## Date: 2026-07-11

### APIs Curled
- ✅ `POST /api/v1/vendoremployee/waiter/get-settlement-report` (cafe103, July 11 + June 20)
- ✅ `POST /api/v2/vendoremployee/report/insights-locations` (palmhouse, May 2026)
- ✅ `POST /api/v2/vendoremployee/report/insights-sales` (cafe103, June 2026)
- ✅ `POST /api/v1/vendoremployee/delivery-employee-list` (cafe103)
- ✅ `POST crm.mygenie.online/api/pos/customers/order-suggestions` (cafe103 crm_token)
- ✅ Login for cafe103 + palmhouse

### Credentials Used
- cafe103: owner@cafe103.com (token obtained, crm_token obtained)
- palmhouse: owner@palmhouse.com (token obtained)

### Key Findings

**BUG-185/186:** Backend formula = `total_funds - today_settlement - cash_draw`. FE formula = `totalFunds - settled` (MISSING cash_draw). Proven with Counter waiter: backend=-1791, FE=0. FE has `balanceToSettle` available but ignores it at 9 code locations.

**BUG-193:** Backend returns `room_transfers[]` and `table_transfers[]` as separate arrays with `type` field (rm/tb). FE has `.data` wrapper access bug. All 50 palmhouse room transfers have `from_room=null` (backend doesn't populate).

**BUG-194:** API returns 6 payment methods + ₹22L revenue. FE reads `salesData.summary` instead of `salesData.data.summary`. Triple confirmed.

**BUG-190:** CRM token from login returns "Invalid API key" at CRM server. ALL CRM features broken for cafe103.

### Evidence Files
- `/app/memory/evidence/login_response.json`
- `/app/memory/evidence/BUG-185/settlement_response.json`
- `/app/memory/evidence/BUG-185/settlement_20june.json`
- `/app/memory/evidence/BUG-190/crm_response.json`
- `/app/memory/evidence/BUG-193/palmhouse_locations.json`
- `/app/memory/evidence/BUG-193/locations_v2.json`
