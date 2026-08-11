# CR-131 Code Trace Evidence

## File: CustomersRfmMockup.jsx
- L11: `import { fetchInsightsCustomers } from '../../api/services/insightsService'`
- L61: `setRawData(await fetchInsightsCustomers(appliedFrom, appliedTo))`
- Comment at L4: `* Data source: insights-customers (NEW endpoint)` ← explicitly documented
- NO CRM imports, NO crmApi calls

## File: CustomersMixMockup.jsx
- L11: `import { fetchInsightsCustomers } from '../../api/services/insightsService'`  
- L58: `setRawData(await fetchInsightsCustomers(appliedFrom, appliedTo))`
- NO CRM imports, NO crmApi calls

## File: insightsService.js
- `fetchInsightsCustomers` at L656: `POST /api/v2/vendoremployee/report/insights-customers`
- Uses POS `api` (axios instance), NOT `crmApi`
- Data fields: `top_customers, rfm_bands, summary` — all from POS backend

## Finding:
- BOTH customer reports use 100% POS data (insights-customers endpoint)
- ZERO CRM API calls in either report
- Data source is unambiguously POS only
- Fix: Add 'Source: POS Data' label to both screens
