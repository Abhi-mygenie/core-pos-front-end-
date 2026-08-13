# CR-131 — CRM API Probe Results (2026-08-06)

## Endpoint Confirmed: GET /pos/customers

**URL:** `GET https://crm.mygenie.online/api/pos/customers`
**Auth:** `X-API-Key: <crm_token>`
**Response shape:**
```json
{
  "success": true,
  "data": {
    "customers": [ ...customer objects... ],
    "total": 47
  }
}
```

## Confirmed Parameters
- `per_page=N` — pagination ✅
- `from_date=YYYY-MM-DD` — date filter ✅ (accepted, no 400 error)
- `to_date=YYYY-MM-DD` — date filter ✅

## Fields Per Customer (from customerTransform.js — ground truth)

### Bulk list (/pos/customers?search= or ?per_page=)
| Field | Type | Example |
|-------|------|---------|
| id | string | "cust_abc123" |
| name | string | "Rahul Sharma" |
| phone | string | "9876543210" |
| tier | string | "Gold" (Bronze/Silver/Gold/VIP) |
| total_points | number | 840 |
| points_value | number | 84.00 (₹) |
| wallet_balance | number | 200.00 (₹) |
| last_visit | string | "2026-07-28" |
| customer_type | string | "normal" or "corporate" |
| is_b2b | boolean | false |
| gst_name | string | null or "ACME Corp" |
| gst_number | string | null or "27AAAC..." |

### Detail (/pos/customers/{id})
All above PLUS:
| Field | Type | Example |
|-------|------|---------|
| total_visits | number | 24 |
| total_spent | number | 12400.00 (₹) |
| allergies | array | ["nuts", "dairy"] |
| favorites | array | ["Veg Biryani", "Mango Lassi"] |
| registered_at | string | "2025-11-01" |
| loyalty.tier_label | string | "Gold Member" |
| loyalty.ratio_per_point | number | 0.10 (₹ per point) |

## Endpoints that do NOT exist (404)
- /pos/analytics/customers
- /pos/reports/customers  
- /pos/loyalty/summary

## Endpoints that exist but need separate implementation (401 confirmed existing)
- /pos/customers/summary
- /pos/customers/stats
(These may be admin-only or need different auth — worth asking CRM team)

## Preprod note
All test restaurants have 0 CRM customers (test env, no seeded data). 
Fields confirmed from transform code, not live data.
