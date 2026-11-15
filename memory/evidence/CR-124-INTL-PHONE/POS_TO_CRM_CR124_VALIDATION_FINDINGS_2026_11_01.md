# POS → CRM — CR-124 Contract Validation Findings

**To:** CRM team
**From:** POS team
**Date:** 2026-11-01
**Re:** CR-124 — International Phone Number Support — contract validation on CRM preview
**Environment:** `https://mygenie-crm-app-1--1mjjz4pi.preview.emergentagent.com/api`
**Test restaurant:** Cafe103 (API key from `crm_token` in login response)

---

## Summary

We validated the CR-124 contract against the live CRM preview. The **customer detail endpoint works correctly** — `country_code: "+44"` is returned for the UK test customer. However, two other POS-facing routes have gaps.

---

## Findings

### 1. `GET /pos/customers?search=` — `country_code` NOT in response

**Contract says:** *"country_code field was already present in all customer responses"*

**Actual:** Search results do NOT include `country_code`.

**Probe:**
```
GET /api/pos/customers?search=UK&limit=5
X-API-Key: dp_live_...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "name": "V2 UK Guest",
        "phone": "7911123456",
        "id": "66f9f19e-...",
        "tier": "Bronze",
        "total_points": 0,
        "wallet_balance": 0,
        "last_visit": null,
        "customer_type": "normal",
        "is_b2b": false,
        "gst_name": null,
        "gst_number": null
      }
    ]
  }
}
```

**Missing:** `country_code` field is absent. Only 11 keys returned.

**Compare with detail endpoint** (`GET /pos/customers/{id}`) which correctly returns `country_code: "+44"` for the same customer.

**POS impact:** Search typeahead cannot show the country flag or auto-populate the country code picker when user selects a search result. We would need a secondary GET detail call after every selection, which adds latency.

**Ask:** Please add `country_code` to the search response alongside the existing fields.

---

### 2. `POST /pos/customer-lookup` — international phone not found

**Contract says:** *"International phones found by correct {phone, country_code} match"*

**Actual:** Lookup by phone digits alone returns `registered: false` for the UK customer.

**Probe:**
```
POST /api/pos/customer-lookup
X-API-Key: dp_live_...
Content-Type: application/json

{ "phone": "7911123456" }
```

**Response:**
```json
{ "data": { "registered": false } }
```

**But the customer exists** — confirmed via search (`search=UK` returns the customer) and detail endpoint (`GET /pos/customers/66f9f19e-...` returns `phone: "7911123456"`, `country_code: "+44"`).

**Possible cause:** Lookup may require `country_code` in the request body for non-Indian numbers. The contract example (§3.2) shows lookup by phone only — this doesn't work for international numbers.

**Ask:** Either:
- **(A)** Accept `country_code` as an optional field in the lookup request — when provided, match on `{phone, country_code}` pair
- **(B)** Fall back to matching on phone digits alone when `country_code` is not provided (current behavior for Indian numbers)

POS preference is **(A)** — we can send `country_code` when we have it.

---

### 3. `GET /pos/customers/{id}` — WORKS CORRECTLY ✅

Detail endpoint returns `country_code: "+44"` for the UK test customer. Full field set present. No issues.

---

## Validation Matrix

| # | Route | Contract claim | Actual result | Status |
|---|---|---|---|---|
| V1 | `GET /pos/customers?search=` | `country_code` in response | **NOT present** — 11 keys, no `country_code` | **GAP** |
| V2 | `POST /pos/customer-lookup` | International phones found | `registered: false` for UK phone `7911123456` | **GAP** |
| V3 | `GET /pos/customers/{id}` | `country_code` in response | `country_code: "+44"` ✅ | **PASS** |
| V4 | `POST /pos/customers` (create) | International numbers accepted | Customer already existed — created previously with `+44` | **PASS** (prior test) |
| V5 | Indian phone unchanged | Existing behavior preserved | `search=saurav` → `phone: 9035133228`, no `country_code` (expected — Indian default) | **PASS** |

---

## What POS needs to proceed with CR-479

1. **`country_code` in search results** — so we can show 🇬🇧 +44 in the typeahead dropdown and auto-populate the country picker on selection
2. **Lookup to find international customers** — either by accepting `country_code` in the request or by matching phone digits across all country codes

Once these two are resolved, POS can ship CR-479 (international phone UI) end-to-end.

---

**Evidence stored at:** `/app/memory/evidence/CR-124-INTL-PHONE/`
