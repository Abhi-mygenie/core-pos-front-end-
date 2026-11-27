# CR-491 — Impact Analysis (Gate 2)

**ID:** CR-491  **Gate:** 2 — IMPACT ANALYSIS  **Date:** 2026-11-05
**Risk:** HIGH  **Code Reality:** PARTIAL — code audit complete, full inventory below
**Conflict Pre-Check:** NONE — no open items touch the target files below (App.js routes are additive-only)

---

## 1. Scope Summary

Remove all hardcoded API paths, URLs, mock/sample data, demo pages, and backup files from the codebase. Pure cleanup — **no behaviour change** (OD-491-05 LOCKED).

**Approach:** Waves (OD-491-01 LOCKED — Reports first, then other sections).

## 2. Full Inventory

### Category A — DEMO PAGES TO DELETE (12 files + routes + imports)

These are **unprotected routes** — accessible without login (confirmed by screenshots 2026-11-05). All are CR-132/CR-133/CR-135 design previews that served their purpose during development and should not be shipped to production.

| # | File | Route | What it shows |
|---|---|---|---|
| A-1 | `pages/SettingsPreviewPage.jsx` | `/settings-preview` | CR-132 Settings wizard preview (6 steps, static mock data) |
| A-2 | `pages/Screen1ComparisonPage.jsx` | `/screen1-compare` | CR-132 before/after comparison — Basic Settings |
| A-3 | `pages/Screen2ComparisonPage.jsx` | `/screen2-compare` | CR-132 comparison — Printer Settings |
| A-4 | `pages/Screen3ComparisonPage.jsx` | `/screen3-compare` | CR-132 comparison — Screen 3 (calls API) |
| A-5 | `pages/Screen4ComparisonPage.jsx` | `/screen4-compare` | CR-132 comparison — Screen 4 (calls API) |
| A-6 | `pages/Screen5ComparisonPage.jsx` | `/screen5-compare` | CR-132 comparison — Screen 5 |
| A-7 | `pages/Screen6ComparisonPage.jsx` | `/screen6-compare` | CR-132 comparison — Screen 6 |
| A-8 | `pages/Screen7ComparisonPage.jsx` | `/screen7-compare` | CR-132 comparison — Screen 7 |
| A-9 | `pages/Screen8ComparisonPage.jsx` | `/screen8-compare` | CR-132 comparison — Screen 8 |
| A-10 | `pages/Screen9ComparisonPage.jsx` | `/screen9-compare` | CR-132 comparison — Screen 9 |
| A-11 | `pages/AggregatorPreviewPage.jsx` | `/aggregator-preview` | CR-135 Aggregator Setup preview (hardcoded zomato/swiggy "18march" URLs) |
| A-12 | `pages/PrinterConfigPreviewPage.jsx` | `/printer-config-preview` | CR-133 Printer config preview |

**Also delete from `App.js`:**
- **Imports:** L63-72, L74, L76 (12 import lines)
- **Routes:** L267-275, L278, L280 (13 route lines, all `<Route path="/...preview|compare" element={<...Page />} />` — NO `<ProtectedRoute>` wrapper = public access)

**Also check:** `CR132PrintPage` at App.js L277 (`/cr132-print`) — same design preview family, confirm deletion scope.

### Category B — BACKUP FILES TO DELETE (16 files)

All `*.bak*` files in `src/`. These are manual backups from past CRs (CR-008, CR-013, D1). Safe to delete — the originals are in git history.

| # | File |
|---|---|
| B-1 | `api/transforms/orderTransform.js.bak.cr013` |
| B-2 | `api/transforms/orderTransform.js.bak.cr013p15` |
| B-3 | `api/transforms/orderTransform.js.bak.d1cap` |
| B-4 | `api/transforms/profileTransform.js.bak.cr013` |
| B-5 | `api/transforms/profileTransform.js.bak.cr013p15-fix1` |
| B-6 | `components/cards/OrderCard.jsx.bak.cr013` |
| B-7 | `components/cards/TableCard.jsx.bak.cr013` |
| B-8 | `components/order-entry/CartPanel.jsx.bak.cr008r3` |
| B-9 | `components/order-entry/CollectPaymentPanel.jsx.bak.cr013` |
| B-10 | `components/order-entry/CollectPaymentPanel.jsx.bak.cr013p15` |
| B-11 | `components/order-entry/CollectPaymentPanel.jsx.bak.d1gate` |
| B-12 | `components/order-entry/OrderEntry.jsx.bak.cr008r3` |
| B-13 | `components/order-entry/OrderEntry.jsx.bak.cr013` |
| B-14 | `components/order-entry/OrderEntry.jsx.bak.cr013p15-fix2` |
| B-15 | `components/order-entry/OrderEntry.jsx.bak.d1cap` |
| B-16 | `components/order-entry/RePrintButton.jsx.bak.cr013` |

### Category C — RAW API PATHS TO MOVE TO `constants.js` (7 services + 1 transform)

These files have inline `/api/v*` paths instead of using `api/constants.js` endpoints.

| # | File:Line | Current hardcoded path | Action |
|---|---|---|---|
| C-1 | `api/services/reportService.js:790` | `/api/v1/vendoremployee/profit-loss-report` | Add to constants.js, use ENDPOINTS.xxx |
| C-2 | `api/services/settlementService.js:6` | `BASE = (uses constants.js BASE already)` | **FALSE POSITIVE** — uses `ENDPOINTS.SETTLEMENT_*` via BASE. Comments only mention paths. SKIP. |
| C-3 | `api/services/orderService.js:197` | `/api/v1/vendoremployee/order-discount-manage` | Add to constants.js |
| C-4 | `api/services/menuManagementService.js:7-8` | `BASE_V2 = '/api/v2/vendoremployee/product'`; `BASE_V1 = '/api/v1/...'` | Consolidate under constants.js |
| C-5 | `api/services/stationService.js:188` | `/api/v1/vendoremployee/station-order-list` | Add to constants.js |
| C-6 | `api/crmAxios.js:93` | `/api/v2/vendoremployee/restaurant-crm-token` | Add to constants.js |
| C-7 | `api/transforms/roomListTransform.js:3` | API path in a transform file | Move to constants.js or calling service |

### Category D — HARDCODED EXTERNAL URLs

| # | File:Line | URL | Action |
|---|---|---|---|
| D-1 | `constants/colors.js:21` | `LOGO_URL` → emergentagent.com PNG | **OD-491-06:** Move to `public/` as app asset (re-check at Gate 2 — see §5) |
| D-2 | `constants/colors.js:22` | `GENIE_LOGO_URL` → emergentagent.com SVG | Same as D-1 |
| D-3 | `pages/RestaurantSettingsPage.jsx:350` | Same SVG URL inline | Replace with `GENIE_LOGO_URL` constant (then D-1/D-2 handle the source) |
| D-4 | `pages/AggregatorPreviewPage.jsx:27-35` | zomato.com/18march, swiggy.com/18march | **DELETED with Category A** (demo page) |
| D-5 | `reports/GuestVsRegisteredBeta.jsx:76` | `wa.me/91${phone}` | **KEEP** (OD-491-03: +91 stays fixed) |
| D-6 | `reports/CustomerIntelligenceBeta.jsx:414` | `wa.me/91${phone}` | **KEEP** (OD-491-03: +91 stays fixed) |
| D-7 | `components/order-entry/AddressFormModal.jsx:24` | Google Maps script URL | Deduplicate with D-8 into shared loader |
| D-8 | `pages/DeliveryManagementPage.jsx:35` | Google Maps script URL (duplicate) | Consolidate with D-7 |

### Category E — LIVE REPORTS (rename only, NOT delete)

The 38 `pages/reports-module/*Mockup.jsx` files are **LIVE Insights reports** (37 call APIs). They must NOT be deleted.

**Action:** Rename to drop "Mockup" suffix (e.g. `SalesMockup.jsx` → `SalesReport.jsx`). This is a Wave 2 item — large rename affecting App.js routes, imports, and any cross-references. **Deferred to Wave 2.**

## 3. Wave Plan

### Wave 1 (this sprint — safe, no behaviour change)
- **A:** Delete 12 demo pages + routes + imports from App.js
- **B:** Delete 16 .bak files
- **C:** Move raw API paths to constants.js (5 actual changes — C-2 was false positive)
- **D-1/D-2/D-3:** Logo URL handling (pending OD-491-06 confirmation)

### Wave 2 (next sprint)
- **D-7/D-8:** Google Maps loader deduplication
- **E:** Rename 38 *Mockup.jsx files

## 4. Affected Files Summary

| Wave | Files created | Files modified | Files deleted |
|---|---|---|---|
| Wave 1 | 0 | `App.js` (routes+imports), `constants.js` (endpoints), `reportService.js`, `orderService.js`, `menuManagementService.js`, `stationService.js`, `crmAxios.js` — **7 modified** | **28 deleted** (12 demo pages + 16 .bak files) |
| Wave 2 | 0 | `App.js` (routes), 38 renamed files, imports | 0 |

## 5. Open Question — OD-491-06 (Logo)

The hardcoded URLs in `constants/colors.js` point to **MyGenie brand logos** on `customer-assets.emergentagent.com`:
- `LOGO_URL` — green genie character PNG (used as app logo)
- `GENIE_LOGO_URL` — "mygenie" text SVG (used in settings page)

**Options:**
- **(a)** Download both to `public/` and reference as `/logo.png` and `/logo.svg` — fast, self-contained
- **(b)** Load from restaurant profile API — more dynamic but requires backend field

**Owner provisionally accepted (a) at round 5 — to be re-confirmed at Gate 3 before implementation.**

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Demo page deletion breaks a bookmark | LOW | LOW | Pages are design previews, not user-facing |
| Route removal in App.js causes 404 on old links | LOW | LOW | No ProtectedRoute = never linked from sidebar; only dev URLs |
| constants.js endpoint move breaks API call | MEDIUM | HIGH | Each move: verify endpoint string identical, run API call test |
| .bak file needed for reference | VERY LOW | NONE | All in git history |

## 7. Verification Matrix (Wave 1)

| # | What | How to Verify |
|---|---|---|
| V-1 | Demo routes return 404 or redirect | Browser: /settings-preview, /screen1-compare, etc. |
| V-2 | No orphaned imports in App.js | webpack compiles with 0 new errors |
| V-3 | .bak files gone | `find src -name "*.bak*"` returns 0 |
| V-4 | reportService P&L call still works | curl: profit-loss-report endpoint |
| V-5 | orderService discount-manage call still works | curl: order-discount-manage |
| V-6 | menuManagement calls still work | Browser: Menu Management page loads |
| V-7 | stationService calls still work | Browser: station order list |
| V-8 | crmAxios token call still works | curl: restaurant-crm-token |
| V-9 | All existing Insights reports load | Browser: /reports-module/dashboard + 2-3 reports |
| V-10 | webpack compile: 0 new errors, 0 new warnings | `yarn build` or dev server |

## 8. Next

- **Owner to re-confirm OD-491-06** (logo: local asset vs profile API)
- Gate 3 → Implementation Plan with exact edits for Wave 1
