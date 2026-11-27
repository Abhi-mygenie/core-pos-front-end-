# CR-491 — Implementation Plan (Gate 3) — Wave 1

**ID:** CR-491  **Gate:** 3 — IMPLEMENTATION PLAN  **Date:** 2026-11-05
**Risk:** HIGH  **Scope:** Wave 1 only (deletions + API path centralization + logo)
**Files WILL change:** App.js, constants.js, reportService.js, orderService.js, menuManagementService.js, stationService.js, crmAxios.js, settlementService.js, constants/colors.js, RestaurantSettingsPage.jsx
**Files will NOT touch:** Any *Mockup.jsx report (Wave 2), OrderDetailSheet, OrderEntry, CartPanel, CollectPaymentPanel
**Code Reality:** PARTIAL  **Conflict:** NONE
**IA:** `impact/CR-491_IMPACT_ANALYSIS.md`
**OD-491-06:** LOCKED — Option (a), download logos to `public/`

---

## Section A — DELETE DEMO PAGES (13 files + App.js cleanup)

### Edit A-1: Delete 13 demo page files

```bash
rm src/pages/SettingsPreviewPage.jsx
rm src/pages/Screen1ComparisonPage.jsx
rm src/pages/Screen2ComparisonPage.jsx
rm src/pages/Screen3ComparisonPage.jsx
rm src/pages/Screen4ComparisonPage.jsx
rm src/pages/Screen5ComparisonPage.jsx
rm src/pages/Screen6ComparisonPage.jsx
rm src/pages/Screen7ComparisonPage.jsx
rm src/pages/Screen8ComparisonPage.jsx
rm src/pages/Screen9ComparisonPage.jsx
rm src/pages/CR132PrintPage.jsx
rm src/pages/AggregatorPreviewPage.jsx
rm src/pages/PrinterConfigPreviewPage.jsx
```

### Edit A-2: Remove 13 import lines from App.js

**File:** `src/App.js`
**Remove lines 63, 64-72, 73, 74, 76:**

```
import SettingsPreviewPage from "./pages/SettingsPreviewPage"; // CR-132 design preview
import Screen1ComparisonPage from "./pages/Screen1ComparisonPage"; // CR-132 Screen 1 comparison
import Screen2ComparisonPage from "./pages/Screen2ComparisonPage"; // CR-132 Screen 2 — Printer Settings
import Screen3ComparisonPage from "./pages/Screen3ComparisonPage"; // CR-132 Screen 3 comparison
import Screen4ComparisonPage from "./pages/Screen4ComparisonPage"; // CR-132 Screen 4 comparison
import Screen5ComparisonPage from "./pages/Screen5ComparisonPage"; // CR-132 Screen 5 comparison
import Screen6ComparisonPage from "./pages/Screen6ComparisonPage"; // CR-132 Screen 6 comparison
import Screen7ComparisonPage from "./pages/Screen7ComparisonPage"; // CR-132 Screen 7 comparison
import Screen8ComparisonPage from "./pages/Screen8ComparisonPage"; // CR-132 Screen 8 comparison
import Screen9ComparisonPage from "./pages/Screen9ComparisonPage"; // CR-132 Screen 9 comparison
import CR132PrintPage from "./pages/CR132PrintPage"; // CR-132 All screens printable PDF
import AggregatorPreviewPage from "./pages/AggregatorPreviewPage"; // CR-135 Aggregator Setup design preview
import PrinterConfigPreviewPage from "./pages/PrinterConfigPreviewPage"; // CR-133 Gap Batch preview
```

### Edit A-3: Remove 13 route lines from App.js

**File:** `src/App.js`
**Remove from the Routes block (approx L267-280):**

```
              <Route path="/settings-preview" element={<SettingsPreviewPage />} />
              <Route path="/screen1-compare" element={<Screen1ComparisonPage />} />
              <Route path="/screen2-compare" element={<Screen2ComparisonPage />} />
              <Route path="/screen3-compare" element={<Screen3ComparisonPage />} />
              <Route path="/screen4-compare" element={<Screen4ComparisonPage />} />
              <Route path="/screen5-compare" element={<Screen5ComparisonPage />} />
              <Route path="/screen6-compare" element={<Screen6ComparisonPage />} />
              <Route path="/screen7-compare" element={<Screen7ComparisonPage />} />
              <Route path="/screen8-compare" element={<Screen8ComparisonPage />} />
              <Route path="/screen9-compare" element={<Screen9ComparisonPage />} />
              <Route path="/cr132-print" element={<CR132PrintPage />} />
              <Route path="/aggregator-preview" element={<AggregatorPreviewPage />} />
              <Route path="/printer-config-preview" element={<PrinterConfigPreviewPage />} />
```

---

## Section B — DELETE BACKUP FILES (16 files)

### Edit B-1: Delete all .bak files

```bash
rm src/api/transforms/orderTransform.js.bak.cr013
rm src/api/transforms/orderTransform.js.bak.cr013p15
rm src/api/transforms/orderTransform.js.bak.d1cap
rm src/api/transforms/profileTransform.js.bak.cr013
rm src/api/transforms/profileTransform.js.bak.cr013p15-fix1
rm src/components/cards/OrderCard.jsx.bak.cr013
rm src/components/cards/TableCard.jsx.bak.cr013
rm src/components/order-entry/CartPanel.jsx.bak.cr008r3
rm src/components/order-entry/CollectPaymentPanel.jsx.bak.cr013
rm src/components/order-entry/CollectPaymentPanel.jsx.bak.cr013p15
rm src/components/order-entry/CollectPaymentPanel.jsx.bak.d1gate
rm src/components/order-entry/OrderEntry.jsx.bak.cr008r3
rm src/components/order-entry/OrderEntry.jsx.bak.cr013
rm src/components/order-entry/OrderEntry.jsx.bak.cr013p15-fix2
rm src/components/order-entry/OrderEntry.jsx.bak.d1cap
rm src/components/order-entry/RePrintButton.jsx.bak.cr013
```

---

## Section C — CENTRALIZE RAW API PATHS (6 services → constants.js)

### Edit C-1: Add new endpoints to constants.js

**File:** `src/api/constants.js`
**Insert after L244** (after REPORT_ENDPOINTS closing brace):

```js
// CR-491: Centralized endpoints migrated from inline service paths
export const SETTLEMENT_ENDPOINTS = {
  BASE: '/api/v1/vendoremployee/waiter',
};

export const STATION_ENDPOINTS = {
  STATION_ORDER_LIST: '/api/v1/vendoremployee/station-order-list',
};

export const ORDER_DISCOUNT_ENDPOINTS = {
  MANAGE: '/api/v1/vendoremployee/order-discount-manage',
};

export const MENU_ENDPOINTS = {
  BASE_V2: '/api/v2/vendoremployee/product',
  BASE_V1: '/api/v1/vendoremployee/product',
};

export const CRM_AUTH_ENDPOINTS = {
  TOKEN_REFRESH: '/api/v2/vendoremployee/restaurant-crm-token',
};
```

Also add to REPORT_ENDPOINTS (before closing brace, L243):
```js
  PROFIT_LOSS: '/api/v1/vendoremployee/profit-loss-report', // CR-491
```

### Edit C-2: Update reportService.js

**File:** `src/api/services/reportService.js`
**Line 1 area:** Verify `REPORT_ENDPOINTS` is imported. Add if missing:
```js
import { REPORT_ENDPOINTS } from '../constants';
```

**Line 790:** Change:
```js
  const { data } = await api.post('/api/v1/vendoremployee/profit-loss-report', {
```
→
```js
  const { data } = await api.post(REPORT_ENDPOINTS.PROFIT_LOSS, { // CR-491
```

### Edit C-3: Update orderService.js

**File:** `src/api/services/orderService.js`
**Add import:**
```js
import { ORDER_DISCOUNT_ENDPOINTS } from '../constants'; // CR-491
```

**Line 197:** Change:
```js
  const response = await api.post('/api/v1/vendoremployee/order-discount-manage', {
```
→
```js
  const response = await api.post(ORDER_DISCOUNT_ENDPOINTS.MANAGE, { // CR-491
```

### Edit C-4: Update menuManagementService.js

**File:** `src/api/services/menuManagementService.js`
**Line 5:** Add import:
```js
import { MENU_ENDPOINTS } from '../constants'; // CR-491 (alongside existing AGGREGATOR_SYNC_ENDPOINTS, API_ENDPOINTS)
```
Or extend existing import on L5:
```js
import { AGGREGATOR_SYNC_ENDPOINTS, API_ENDPOINTS, MENU_ENDPOINTS } from '../constants';
```

**Lines 7-8:** Change:
```js
const BASE_V2 = '/api/v2/vendoremployee/product';
const BASE_V1 = '/api/v1/vendoremployee/product';
```
→
```js
const BASE_V2 = MENU_ENDPOINTS.BASE_V2; // CR-491
const BASE_V1 = MENU_ENDPOINTS.BASE_V1; // CR-491
```

### Edit C-5: Update stationService.js

**File:** `src/api/services/stationService.js`
**Add import:**
```js
import { STATION_ENDPOINTS } from '../constants'; // CR-491
```

**Line 188:** Change:
```js
    const response = await api.post('/api/v1/vendoremployee/station-order-list', formData);
```
→
```js
    const response = await api.post(STATION_ENDPOINTS.STATION_ORDER_LIST, formData); // CR-491
```

### Edit C-6: Update crmAxios.js

**File:** `src/api/crmAxios.js`
**Add import:**
```js
import { CRM_AUTH_ENDPOINTS } from './constants'; // CR-491
```

**Line 93:** Change:
```js
        const res = await api.get('/api/v2/vendoremployee/restaurant-crm-token');
```
→
```js
        const res = await api.get(CRM_AUTH_ENDPOINTS.TOKEN_REFRESH); // CR-491
```

### Edit C-7: Update settlementService.js

**File:** `src/api/services/settlementService.js`
**Add import (after L4):**
```js
import { SETTLEMENT_ENDPOINTS } from '../constants'; // CR-491
```

**Line 6:** Change:
```js
const BASE = '/api/v1/vendoremployee/waiter';
```
→
```js
const BASE = SETTLEMENT_ENDPOINTS.BASE; // CR-491
```

---

## Section D — LOGO URLs (OD-491-06 Option A)

### Edit D-1: Download logos to public/

```bash
curl -sL "https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/g6fet1ss_Screenshot%202026-03-19%20at%2012.18.41%E2%80%AFAM.png" -o public/mygenie-logo.png
curl -sL "https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg" -o public/mygenie-logo.svg
```

### Edit D-2: Update constants/colors.js

**File:** `src/constants/colors.js`
**Lines 21-22:** Change:
```js
export const LOGO_URL = "https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/g6fet1ss_Screenshot%202026-03-19%20at%2012.18.41%E2%80%AFAM.png";
export const GENIE_LOGO_URL = "https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg";
```
→
```js
export const LOGO_URL = "/mygenie-logo.png"; // CR-491: local asset (was external CDN)
export const GENIE_LOGO_URL = "/mygenie-logo.svg"; // CR-491: local asset (was external CDN)
```

### Edit D-3: Update RestaurantSettingsPage.jsx

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Line 350:** Change:
```jsx
          <img src="https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg" alt="MyGenie" className="h-9 mb-5" />
```
→
```jsx
          <img src={GENIE_LOGO_URL} alt="MyGenie" className="h-9 mb-5" /> {/* CR-491: use constant */}
```
**Verify:** `GENIE_LOGO_URL` is already imported in this file. If not, add:
```js
import { GENIE_LOGO_URL } from "../constants";
```

---

## Verification Matrix (Wave 1)

| # | Test | Steps | Expected | Auto? |
|---|---|---|---|:---:|
| V-1 | Demo routes gone | Browser: /settings-preview | 404 or blank (no route match) | NO |
| V-2 | /screen1-compare gone | Browser: /screen1-compare | 404 | NO |
| V-3 | /aggregator-preview gone | Browser: /aggregator-preview | 404 | NO |
| V-4 | No .bak files remain | `find src -name "*.bak*"` | 0 results | YES — bash |
| V-5 | webpack compiles clean | Dev server or `yarn build` | 0 new errors | YES |
| V-6 | P&L report loads | Browser: Insights → P&L | Data loads, no error | NO |
| V-7 | Order discount works | Apply discount to an order | API call succeeds | NO |
| V-8 | Menu Management loads | Browser: Menu Management | Page loads, items show | NO |
| V-9 | Station order list works | KDS/station view if available | Orders load | NO |
| V-10 | CRM token refresh works | Browser: CRM features → trigger 401 | Token refreshes silently | NO |
| V-11 | Settlement page works | Browser: Settlement | Data loads | NO |
| V-12 | MyGenie logo shows | Login page, Sidebar header | Logo renders from local /public | NO |
| V-13 | Settings page logo | Browser: Settings | MyGenie logo renders | NO |
| V-14 | No orphan imports | webpack compile | 0 "unused import" warnings | YES |
| V-15 | Aggregator Setup still works | Browser: /aggregator/setup (protected) | Page loads (NOT deleted — this is the real page) | NO |

## Post-Code Registry Checklist

- [ ] registry.json: CR-491 → status: GATE_5A_IMPLEMENTED (Wave 1), sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: all modified files listed with CR-491
- [ ] Code markers: `// CR-491` in every modified file
- [ ] Compile: webpack 0 new errors

## Execution Sequence

**Phase 1 — Deletions (safe, no compile needed between steps):**
1. A-1: Delete 13 demo page files
2. B-1: Delete 16 .bak files

**Phase 2 — App.js cleanup (compile after):**
3. A-2: Remove 13 imports from App.js
4. A-3: Remove 13 routes from App.js
5. Compile check → MUST pass before proceeding

**Phase 3 — API centralization (compile after each service):**
6. C-1: Add endpoints to constants.js
7. C-2 through C-7: Update 6 service files (can be done in parallel)
8. Compile check → MUST pass

**Phase 4 — Logo assets:**
9. D-1: Download logos to public/
10. D-2: Update colors.js
11. D-3: Update RestaurantSettingsPage.jsx
12. Compile check → MUST pass

**Phase 5 — Full verification:**
13. Run V-1 through V-15

---

## Wave 2 Scope (deferred — next sprint)

- Rename 38 `*Mockup.jsx` → drop "Mockup" suffix
- Deduplicate Google Maps loader (AddressFormModal + DeliveryManagementPage)
- Update all imports and App.js routes for renamed files
