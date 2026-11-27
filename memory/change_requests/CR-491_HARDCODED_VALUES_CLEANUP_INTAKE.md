# CR-491 — Codebase cleanup — remove hardcoded API calls, URLs, mock/sample data from Reports and other sections

**ID:** CR-491  **Type:** CR  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE — ODs OPEN
**Area:** Tooling / Control Layer (cross-module; Reports primary)  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** BUG-053, BUG-373, BUG-501, CR-071

## Description
Owner: "in reports and few other sections we have written hardcoded things like API calls etc — complete clean of such things is needed."
Remove all hardcoded API calls/paths, URLs, restaurant-specific values and mock/sample data from the FE; route every endpoint through `api/constants.js` and every config value through API/settings or env.

## Evidence
- Source: OWNER-REPORTED + agent read-only code audit (grep) 2026-11-05
- Confidence: CONFIRMED (code)

## Duplicate Check
RELATED — earlier single-item hardcode fixes (BUG-053 GST label, BUG-373 SC label, BUG-501 copyright year). No existing app-wide cleanup CR → DISTINCT scope.

## Code Reality
PARTIAL — `api/constants.js` exists as the central endpoint registry, but audit (2026-11-05, read-only grep) found:
1. **Raw API paths outside constants.js (7 service files):** reportService.js:790 (`/api/v1/vendoremployee/profit-loss-report`), settlementService.js:6, orderService.js:197 (`order-discount-manage`), menuManagementService.js:7-8, stationService.js:188, crmAxios.js:93 (`restaurant-crm-token`), transforms/roomListTransform.js:3 (API path inside a transform).
2. **Hardcoded external URLs:** constants/colors.js + RestaurantSettingsPage.jsx (logo/asset on customer-assets.emergentagent.com), AggregatorPreviewPage.jsx (swiggy/zomato `/18march` store links), `wa.me/91` country code in CustomerIntelligenceBeta.jsx + GuestVsRegisteredBeta.jsx, Google Maps script URL in AddressFormModal.jsx + DeliveryManagementPage.jsx (key via env — OK, URL duplicated).
3. **Mock / sample data screens:** 38 `pages/reports-module/*Mockup.jsx` + 12 `*Comparison*/ *Preview*` pages; ~106 references in App.js routes. Plus mock/sample constants in ExpenseReportPage, PurchaseReportPage, OrderReportBetaPage, DeliveryManagementPage, PrinterConfigPreviewPage.
4. **Stale backup files:** 16 `*.bak*` files in src (e.g. OrderEntry.jsx.bak.cr013).
Full file-by-file inventory to be produced at Gate 2 (Impact Analysis).

## Risk
HIGH — touches many files incl. services used by order flow (orderService.js) and R5 hotspot neighbours; regression risk on route removal. Fast Lane: NO.

## Blast Radius
LARGE (≈ 7 services + 1 transform + ~50 mockup/preview pages + App.js routes + 16 .bak files + several report pages)

## Open Owner Decisions
- OD-491-01 Scope: (A) Reports module first, then other sections in waves, or (B) whole app in one pass — OPEN (agent recommends A, waves)
- OD-491-02 Mockup/Comparison/Preview pages: delete, or keep behind a dev-only flag (not shipped to customers) — OPEN
- OD-491-03 Restaurant-specific values (logo URL, aggregator store links, +91 country code) → move to restaurant profile/settings from API, or to env/config — OPEN
- OD-491-04 Delete `*.bak*` files — agent recommends YES
- OD-491-05 Rule: no behaviour change — pure refactor; each wave regression-tested (R1) — agent recommendation, confirm

## Next
Owner ODs → Gate 2 full inventory + wave plan.

## Owner Decisions (2026-11-05)
- OD-491-01 **LOCKED** — Reports first, then other sections in waves.
- OD-491-05 **LOCKED** — pure clean-up, no behaviour change.
## Code Reality CORRECTION (2026-11-05)
- The 38 `pages/reports-module/*Mockup.jsx` files are **LIVE Insights reports** (37 call APIs; only `ReportDefinitionsMockup` is static) — they are NOT demo pages and must NOT be deleted. Clean-up = rename (drop "Mockup") + move hardcoded values out.
- Demo/design-only pages (candidates to remove), all **unprotected routes (no login)** in App.js L267-280: `/screen1-compare` … `/screen9-compare` (Screen1–9ComparisonPage.jsx; Screen3/4 call APIs), `/settings-preview` (SettingsPreviewPage.jsx), `/aggregator-preview` (AggregatorPreviewPage.jsx), `/printer-config-preview` (PrinterConfigPreviewPage.jsx).
- Backup files (16): CartPanel.jsx.bak.cr008r3 · CollectPaymentPanel.jsx.bak.cr013 / .bak.cr013p15 / .bak.d1gate · OrderEntry.jsx.bak.d1cap / .bak.cr008r3 / .bak.cr013 / .bak.cr013p15-fix2 · RePrintButton.jsx.bak.cr013 · OrderCard.jsx.bak.cr013 · TableCard.jsx.bak.cr013 · profileTransform.js.bak.cr013 / .bak.cr013p15-fix1 · orderTransform.js.bak.d1cap / .bak.cr013 / .bak.cr013p15.
- OPEN (re-asked): OD-491-02 delete the 12 demo pages? · OD-491-03 explained to owner (restaurant-specific values) · OD-491-04 delete 16 backups?

## Owner Decisions (2026-11-05, round 4)
- OD-491-02 **LOCKED: DELETE** the 12 demo pages + their routes (App.js L267-280).
- OD-491-03 **LOCKED** — store links + logo from restaurant profile; **+91 stays fixed**.
- OD-491-04 **LOCKED: DELETE** all 16 `*.bak*` files.
## Hardcoded value details (code, 2026-11-05)
| File:line | Value | Action |
|---|---|---|
| constants/colors.js:21 `LOGO_URL` | PNG on customer-assets.emergentagent.com | move (see OD-491-06) |
| constants/colors.js:22 `GENIE_LOGO_URL` | MyGenie SVG on customer-assets.emergentagent.com | move (see OD-491-06) |
| pages/RestaurantSettingsPage.jsx:350 | same MyGenie SVG URL inline | use constant |
| pages/AggregatorPreviewPage.jsx:27-35 | zomato.com/18march, swiggy.com/18march(-sub), codes '478' | removed with demo page |
| pages/reports-module/GuestVsRegisteredBeta.jsx:76 | `wa.me/91` | keep +91 (owner) |
| pages/reports-module/CustomerIntelligenceBeta.jsx:414 | `wa.me/91` | keep +91 (owner) |
| components/order-entry/AddressFormModal.jsx:24 · pages/DeliveryManagementPage.jsx:35 | Google Maps script URL (key from env) — duplicated | single shared loader |
| 7 services: reportService.js:790 · settlementService.js:6 · orderService.js:197 · menuManagementService.js:7-8 · stationService.js:188 · crmAxios.js:93 · transforms/roomListTransform.js:3 | raw `/api/v*` paths | move to api/constants.js |
- OPEN: OD-491-06 the hardcoded logos are the **MyGenie brand logo** (not the restaurant's). Store links exist only on the demo page being deleted. → keep MyGenie logo as an app asset (`public/`), and show restaurant logo from profile where a restaurant logo is needed?

## Owner Decision (2026-11-05, round 5 — FROZEN)
- OD-491-06 — logo plan accepted provisionally; **re-check with owner during Impact Analysis (Gate 2)**.
- **INTAKE FROZEN** (OD-491-06 carried to Gate 2).
