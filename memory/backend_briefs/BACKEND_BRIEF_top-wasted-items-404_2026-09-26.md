# BACKEND_BRIEF_top-wasted-items-404_2026-09-26

## Summary
- Issue: `top-wasted-items` endpoint returns **404 (route not registered/deployed)** on preprod, breaking the Consumption → Wastage tab.
- Classification: **BACKEND_BUG (missing route)**
- Frontend impact: Wastage tab shows toast **"Failed to load wastage data"**; DevTools shows the request as a **"CORS error"** (misleading — see below).
- Priority/Risk: **P1 / MEDIUM** (report feature broken, no data loss).

## Endpoint
- Method: POST
- URL: `https://preprod.mygenie.online/api/v2/vendoremployee/inventory/top-wasted-items`
- Auth/context: Bearer token (same session as its working sibling `wastage-report`)

## Reproduction (curl — no auth needed to prove the route is missing)
```
# Missing route → 404 (both POST and OPTIONS)
POST  /api/v2/vendoremployee/inventory/top-wasted-items   → HTTP 404 (text/html)
OPTIONS (preflight) same path                              → HTTP 404

# Working sibling on the SAME base path / same middleware
POST  /api/v2/vendoremployee/inventory/wastage-report      → HTTP 401 (auth) = route exists
OPTIONS (preflight) same path                              → HTTP 200
```

## Why the browser shows "CORS error" (not a frontend/CORS bug)
Both requests are POST + Authorization + JSON, so the browser sends a CORS **preflight (OPTIONS)** first.
- `wastage-report` preflight → **200** → actual request proceeds (works).
- `top-wasted-items` preflight → **404** (route absent). A non-2xx preflight **fails the CORS check**, so Chrome blocks the actual request and labels it **"CORS error"** with size 0. The real cause is the missing route, not CORS configuration (the domain's CORS headers are fine — `wastage-report` works identically).

## Expected vs Actual
- Expected: `top-wasted-items` registered and returning `{ top_by_quantity: [...] }` (frontend reads `wTop.top_by_quantity`).
- Actual: 404 on both POST and OPTIONS.

## Frontend status
- Frontend code is CORRECT. Service: `src/api/services/wastageReportService.js` (`getTopWastedItems`), endpoint constant `INVENTORY_ENDPOINTS.TOP_WASTED_ITEMS` in `src/api/constants.js:222`. Sibling `WASTAGE_REPORT` (line 221) works.
- Action for backend: register/deploy the `inventory/top-wasted-items` route on preprod (and prod) so its OPTIONS returns 2xx and POST returns data.

## Frontend Workaround (optional — owner chose NOT to implement now, option 2a)
- Available: YES. In `ConsumptionReportPage.fetchWastage()` the two calls run under a single `Promise.all`; the 404 on top-items rejects the whole promise, so the Wastage Log (which loads fine) is also hidden behind the error toast. Splitting into independent try/catch would let the Wastage Log render even while Top Items is unavailable. (Not requested this session.)
