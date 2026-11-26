# BUG-555 — INVESTIGATION REPORT
**Role:** INVESTIGATION (Role 6) · **Date:** 2026-10-15 · **Steps used:** 9/10 (step 9 = 16-viewport resolution matrix, §3.6)
**Item:** BUG-555 "Complete screen does not fit display on tablet screens — content cut off" (P1, MEDIUM → upgraded HIGH, see §5)
**Related:** BUG-537 / CR-414 (Dashboard, GATE_5A), BUG-539 (Report pages, GATE_5A)

---

## 1. Summary

**Root cause (layout):** The owner's tablet is a 1280×800 Android device with **devicePixelRatio 1.5 → CSS viewport is 853×533 (landscape) / 533×853 (portrait)**, not 1280×800. Every screenshot's pixel measurements match this exactly (sidebar 70px → 105px in image; CategoryPanel 176px → 265px). Four independent layout defects were confirmed at that viewport, each with its own file:line break point (§3). None are covered by BUG-537 / CR-414 / BUG-539 code.

**Root cause (crash, screenshot 5):** `firebase/messaging` v13 `getMessaging()` performs its browser-support check **asynchronously** (`isWindowSupported().then(... throw ...)`) so the `try/catch` in `config/firebase.js:21-27` cannot catch it → unhandled promise rejection → CRA dev overlay "Uncaught runtime errors" blocks the whole app on any browser without Push/ServiceWorker/IndexedDB (Firefox-Android, private mode, WebViews, iframes).

| | |
|---|---|
| Classification | **FE_BUG** (all 5 findings) |
| Confidence | **HIGH** — every symptom reproduced at 853×533 / 533×780 with DOM measurements + screenshots |
| Backend involvement | NONE |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Tablet reports a CSS viewport much smaller than its 1280×800 panel (DPR ≠ 1) | Pixel-ratio analysis of owner screenshots vs known CSS widths (`w-44`=176, sidebar 70px) | 1 | **CONFIRMED** — ratio 1.5 on all 4 layout shots | §3.0 |
| H2 | Order Entry uses fixed `w-44` + `w-96` side panels and an un-shrinkable middle → total > 853px | Code trace + DOM measurement in 853px frame | 2 | **CONFIRMED** — panels 176 + 367 + 384 = **927px**, right panel clipped 74px | `L02_order_entry_853x533.jpg`, `L03_collect_payment_853x533.jpg` |
| H3 | Dashboard sidebar scrolls away because CR-414 tablet stacking makes the document taller than the viewport and the sidebar is not sticky | Code trace + `scrollTo(bottom)` measurement | 1 | **CONFIRMED** — docScrollH 1723 vs vh 533; sidebar top = **-1190px** after scroll | `L01_dashboard_scrolled_853x533.jpg` |
| H4 | Header "Add" button is pushed off-screen in portrait (533px) | DOM overflow scan in 533px frame | 1 | **CONFIRMED** — header right group R=658 (> 533), `search-input` R=539 | `P01_dashboard_533x780.jpg` |
| H5 | Report-module page headers (date presets) do not wrap — BUG-539 pattern on pages BUG-539 did not touch | Route sweep (24 routes) + clipped-vs-scrollable classifier | 2 | **CONFIRMED** — 7 report routes clipped (not scrollable), max R=1317; 34/41 report pages lack `flex-wrap` | `BUG-555_measurements.json`, `L04`, `L05` |
| H6 | Firebase crash is thrown asynchronously, bypassing the existing try/catch | Read `node_modules/@firebase/messaging/dist/esm/index.esm.js:1810-1824` + reproduce in iframe | 1 | **CONFIRMED** — `PAGEERROR: Messaging: This browser doesn't support…` while console shows `[Firebase] Init failed` (sync part was caught; async part was not) | §3.5 |

---

## 3. Data Flow Trace / Break Points

### 3.0 Device model (applies to all)
Owner tablet: 1280×800 physical, DPR 1.5 → **853×533 CSS landscape**, **533×853 CSS portrait**. Tailwind `lg` (1024) correctly treats it as tablet; `md` (768) is **not** hit in landscape, `sm` (640) is **not** hit in portrait. Any layout that assumes ≥ 927px of fixed chrome breaks.

### 3.1 Order Entry + Collect Payment (owner screenshots 1 & 3) — **P1**
```
OrderEntry.jsx:1666  fixed inset-0 flex                      (no horizontal scroll, no breakpoints)
  CategoryPanel.jsx:32   w-44 flex-shrink-0                 → 176px fixed
  OrderEntry.jsx:1683    flex-1 flex flex-col min-h-0        → NO min-w-0; min-content = header row
  OrderEntry.jsx:1685    px-4 py-3 flex items-center gap-3   → search(max-w-xs) + 5 icon buttons, no wrap → 367px floor
  OrderEntry.jsx:1863    w-96 flex-shrink-0                  → 384px fixed (hosts CartPanel AND CollectPaymentPanel)
BREAK: 176 + 367 + 384 = 927px > 853px → right panel R=927, 74px clipped (Phone input, Qty col, Collect Bill, Pay btn, Discount select, Tip input)
PORTRAIT (533px): right panel L=543 → cart/payment panel 100% off-screen
```
Zero `sm:/md:/lg:` or `matchMedia` in OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, CategoryPanel.jsx (grep count = 0).

### 3.2 Dashboard sidebar scroll-away (owner screenshot 4) — **P1**
```
DashboardPage.jsx:1668  root  flex min-h-screen             (grows with content)
DashboardPage.jsx:1737  wrap  flex-1 flex flex-col min-h-screen overflow-hidden
ChannelColumnsLayout.jsx:107  isTablet (<1024) → channels stacked, natural height (CR-414 by design)
Sidebar.jsx:492         aside h-screen … relative           (NOT sticky, NOT fixed)
BREAK: document height 1723px > 533px → body scrolls → sidebar scrolls out of view (top=-1190 at bottom)
```
Desktop never exposed this because columns had bounded heights with inner scroll. CR-414's stacking is correct; the shell (root height / sidebar stickiness) was never tablet-proofed. Same pattern exists on `/restaurant-settings` (docScrollH 2309) and `/reports-module/profit-loss` (1404) — those pages render no sidebar or scroll internally, so only Dashboard is user-visible.

### 3.3 Header "Add" button clipped in portrait (owner screenshot 2) — **P2**
```
Header.jsx:433   flex-1 flex justify-end px-2 lg:px-4     (CR-414)
Header.jsx:441   relative flex-1 lg:flex-initial min-w-0  (search fluid <1024)
Header.jsx:765   flex items-center gap-3                  (Add button + online dot group)
BREAK at 533px: filter dropdown + search + Add group min-content > 533 → Add group R=658, invisible
```
Landscape (853px) is fine (R≤853). CR-414 locked `lg`=1024 only; no second breakpoint for portrait tablet.

### 3.4 Report-module headers clipped (AGENT-DISCOVERED, extends BUG-539) — **P2**
Clipped (NOT inside any `overflow-x-auto` ancestor) at 853px:

| Route | Clipped elements | maxRight |
|---|---|---|
| /reports-module/settlement | `SettlementReportMockup.jsx:359` header `flex items-center gap-3` → presets | 1317 |
| /reports-module/dashboard | `DashboardMockup.jsx:308` → `reports-date-presets` | 1119 |
| /reports-module/items | `ItemSalesHybridMockup.jsx:911` → `reports-date-presets` | 1095 |
| /reports-module/expense-report | presets | 1019 |
| /reports-module/sales | `sales-presets` | 996 |
| /reports-module/cashier-settlement | `s19-presets` | 996 |
| /reports-module/profit-loss | `PLReportPage.jsx:186` inner `flex items-center gap-3` → `pl-export-pdf` | 884 |

BUG-539 fixed only PLReportPage (outer row) + ConsumptionReportPage (OD-539-01=B). **34 of 41** report-module pages with a presets toolbar have no `flex-wrap` on the header row.

**Scrollable (acceptable, no action):** `/employees` table (80 els), `/reports/audit` tabs+table, `/inventory` sub-nav, `/reports-module/consumption-report` table — all inside `overflow-x-auto`.

**Clean at 853px:** /settings, /menu, /credit, /day-closure, /expenses, /delivery-management, /reports/summary, /reports/rooms, /pms/front-desk-v2, /pms/reservations, /visibility/status-config, /local-printer-setup.

### 3.5 Firebase `messaging/unsupported-browser` crash (owner screenshot 5) — **P1 (dev/preview), P2 (prod)**
```
config/firebase.js:23   messaging = getMessaging(app)   inside try/catch (lines 21-27)
@firebase/messaging index.esm.js:1815
    isWindowSupported().then(isSupported => { if (!isSupported) throw ERROR_FACTORY.create("unsupported-browser") }, …)
    return _getProvider(app,'messaging').getImmediate();
BREAK: the throw is inside a Promise .then → escapes try/catch → window 'unhandledrejection'
      → CRA dev overlay (preview URL) blocks the login page. In a production build it is a console error only,
        but the browser still has no FCM and `requestFCMToken` logs noise on every login.
```
Reproduced 3× in this session (iframe context lacks Push API). Owner's screenshot shows the same on a tablet browser without Push support. Fix shape: `isSupported().then(ok => { if (ok) messaging = getMessaging(app); })` — exported SDK helper, 1 file, ~6 lines.

### 3.6 Resolution matrix (step 9) — 16 tablet CSS viewports × Dashboard / Order Entry / 2 report pages
Source: `BUG-555_resolution_matrix.json` (iframe resized after a single login; heights capped at 780 by harness).

| Device (CSS viewport) | Dashboard header | Dashboard sidebar scrolls away | Order Entry right panel | Settlement report header | Item Ledger header |
|---|---|---|---|---|---|
| iPad Pro 12.9 L (1366) | OK | **YES** (doc 1352 > 780) | OK | OK | OK |
| Surface Pro 7 L (1368) | OK | YES | OK | OK | OK |
| Android 10" DPR1 L (1280) | OK | YES | OK | **CLIPPED** R=1317 | OK |
| iPad Air L (1180) | OK | YES | OK | CLIPPED | OK |
| **iPad L (1024×768)** | **CLIPPED — desktop header, `add-table-btn` R=1078** | YES | OK | CLIPPED | CLIPPED |
| Android 10" DPR1.25 L (1024×640) | **CLIPPED** (same) | YES | OK | CLIPPED | CLIPPED |
| Galaxy Tab A 10.1 DPR2 L (960×600) | OK | YES | OK | CLIPPED | CLIPPED |
| Android 7" L (960×600) | OK | YES | OK | CLIPPED | CLIPPED |
| Owner DPR1.5 L (853×533) | OK | YES | **CLIPPED** (927) | CLIPPED | CLIPPED |
| Surface Pro 7 P (912) | OK | YES | **CLIPPED** (927) | CLIPPED | CLIPPED |
| iPad Air P (820) | OK | YES | CLIPPED | CLIPPED | CLIPPED |
| Android 10" DPR1 P (800) | OK | YES | CLIPPED | CLIPPED | CLIPPED |
| iPad P (768) | OK | YES | CLIPPED | CLIPPED | CLIPPED |
| Galaxy Tab P (712) | OK | YES | CLIPPED | CLIPPED | CLIPPED |
| Android 7" P (600) | **CLIPPED** Add R=658 | YES | CLIPPED | CLIPPED | CLIPPED |
| Owner DPR1.5 P (533) | **CLIPPED** Add R=658 | YES | CLIPPED (cart 100% off-screen) | CLIPPED | CLIPPED |

**Thresholds derived:**
- Order Entry breaks at **vw < 927px** → every tablet in portrait + any landscape tablet with DPR ≥ 1.5. Fine at ≥ 960.
- Dashboard sidebar scroll-away happens at **every** size tested, including ≥1024 desktop layout — it is not tablet-specific; it shows whenever the card list is taller than the viewport (P1 for tablets where it always happens, latent on desktop).
- **NEW (P1):** Desktop header (≥1024, CR-414 untouched zone) is **54px too wide at exactly 1024–~1077px** (`Header.jsx:765-769` Add group R=1078). iPad landscape and 1280×800 @1.25 Android — the two most common tablets — sit precisely in this gap. CR-414 tablet mode starts at 1023 and desktop assumes ≥ ~1080.
- Portrait header Add clipped at **vw ≤ 600** (not 712+).
- **NEW (P2→P1 scope):** Settlement report header clips at **≤ 1280** (R=1317) — i.e. on *every* tablet landscape except iPad Pro/Surface, and also on 1280-wide laptops. Item Ledger clips at ≤ 1024. The `flex items-center gap-3` toolbar (`SettlementReportMockup.jsx:359-390`: title + daterange + presets + apply + refresh + download) has no wrap at any width.

---

## 4. Evidence Artifacts — `/app/memory/evidence/BUG-555/`
| File | What |
|---|---|
| `L01_dashboard_scrolled_853x533.jpg` | Sidebar gone after scroll (sidebar top = -1190) |
| `L02_order_entry_853x533.jpg` | Right panel clipped (927 > 853) |
| `L03_collect_payment_853x533.jpg` | Pay / Discount / Tip clipped — same container |
| `L04_reports_items_853x533.jpg` | Item Ledger header crushed, presets clipped |
| `L05_reports_settlement_853x533.jpg` | Settlement presets clipped |
| `P01_dashboard_533x780.jpg` | Portrait: Add button off-screen |
| `P02_order_entry_533x780.jpg` | Portrait: cart panel 100% off-screen |
| `BUG-555_measurements.json` §landscape_853x533.routes_* | 24-route DOM overflow sweep |
| `BUG-555_resolution_matrix.json` | 16 tablet viewports × Dashboard / Order Entry / Settlement / Item Ledger (§3.6) |
| `BUG-555_measurements.json` | Panel widths, scroll heights, clipped counts (all runs) |
| `BUG-555_repro_landscape_script.py` / `BUG-555_repro_portrait_script.py` | Playwright repro scripts (password masked) |

Method: owner's tablet emulated faithfully via an 853×533 / 533×780 iframe (media queries + matchMedia evaluated at frame width). Credentials masked.

---

## 5. Recommendations

**Risk upgrade:** BUG-555 MEDIUM → **HIGH** (touches `OrderEntry.jsx` and `CollectPaymentPanel.jsx` — R5 hotspots — plus `DashboardPage.jsx`). Planning-skip **NOT eligible** for the layout work.

**Recommended split (owner decision OD-555-01):** keep BUG-555 as the umbrella and plan it as 4 scoped work packages, OR register 3 children. Either way, Gate 2 should cover:

| WP | Scope | Files | Risk | Phase |
|---|---|---|---|---|
| WP-A | Order Entry 3-pane layout for <1024px: fluid right panel (`w-96` → clamp / `lg:w-96`), `min-w-0` on middle pane, wrapping/compact header icons; portrait needs a collapsible cart (owner UX decision OD-555-02) | OrderEntry.jsx, CategoryPanel.jsx, CollectPaymentPanel.jsx (container only) | HIGH (R5) | 1 (tablet landscape), portrait = Phase 2 |
| WP-B | Dashboard shell: root `h-screen` (or sidebar `sticky top-0`) so sidebar stays pinned while the stacked channel list scrolls inside `<main>` | DashboardPage.jsx:1668/1737, Sidebar.jsx:492 | HIGH (R5 DashboardPage) | 1 |
| WP-C | Header: (i) desktop header min-width gap at 1024–1077px — shift CR-414 tablet mode to `xl`=1280 or compact the Add group; (ii) portrait ≤600 — Add into second row / icon-only | Header.jsx:433-441, 765-769 | MEDIUM | (i) **1** (iPad landscape is affected), (ii) 2 |
| WP-D | Report-module header `flex-wrap gap-y-2` sweep (34 pages) — mechanical, same edit as BUG-539 E1; Settlement clips even at 1280 | pages/reports-module/*.jsx | LOW | 1 |

**New DISTINCT bug (needs INTAKE, not in BUG-555 scope):** Firebase async unsupported-browser rejection → `config/firebase.js`. 1 file, ~6 lines, not hotspot, not financial → **DIRECT_BUG_FIX eligible after registration (owner must approve skip)**. Suggested severity P1 (blocks login on preview for unsupported browsers; prod = console noise).

**Owner decisions queued:**
- OD-555-01: umbrella with 4 WPs vs 3 child IDs
- OD-555-02: portrait Order Entry UX — (a) collapsible cart drawer, (b) stacked panes, (c) landscape-only support for now
- OD-555-03: Phase 1 = landscape 853px only (WP-A/B/D), Phase 2 = portrait 533px (WP-C + portrait part of WP-A)? (matches owner's "tab in phase one, mobile in phase two")

---

## 5a. Owner decisions — session 2026-10-15 (plain-English review)

**Context supplied by owner:** staff use the **production URL and the installed PWA** (not the dev preview); tablets are used **primarily for taking orders (Order Entry)**; **reports including Settlement are opened on tablets**.

| ID | Decision | Status | Consequence |
|---|---|---|---|
| OD-555-04 Device floor | Support all common 10" Android + iPad now; 7" / 600px-class devices go to the **mobile phase** | **LOCKED** (floor value pending — see Q1) | Phase 1 landscape target must include the owner's own 853px device → proposed floor **800px landscape**, **768px portrait** |
| OD-555-02 Portrait Order Entry | **(c) landscape-only in Phase 1** with a "rotate your tablet" notice in portrait; (a) cart drawer / (b) stacked panes explored in **Phase 2** | **LOCKED** | WP-A scope shrinks to landscape ≥800px; portrait shows notice. PWA manifest can additionally lock orientation (Q2) |
| OD-555-05 Dashboard sidebar | **(b) hamburger / slide-over on tablets** (<1024) instead of a pinned 70px rail | **LOCKED** | WP-B moves from a 2-line shell fix to a Sidebar.jsx self-contained change (Sidebar is mounted by 94 pages → must be implemented *inside* Sidebar.jsx so no page is touched). Also removes the scroll-away problem on tablets by construction. Desktop latent scroll-away: Q3 |
| OD-555-06 Report toolbars | **(a) fix all 34 report pages** in one mechanical `flex-wrap` sweep | **LOCKED** | WP-D in Phase 1, LOW risk, Settlement toolbar wraps to a 2nd row at ≤1280 |
| OD-555-07 Firebase crash severity | Production + PWA: Chrome/Android PWA supports Push → red overlay never appears in prod; impact = console error + no FCM on unsupported browsers | **Agent re-classified P1 → P2** | Still a cheap, safe 1-file fix; tracking choice pending (E-3) |
| OD-555-08 Work order | Order Entry first (primary tablet use) → WP-A, then WP-D (reports used on tablets), then WP-B (sidebar hamburger), then WP-C(i) (1024–1077 header gap) | **PROPOSED** | Planning Gate 2 sequence |
| OD-555-01 Tracking | umbrella vs child IDs | **PENDING** (owner asked for review first — see §5b) | |
| OD-555-03 Phasing | landscape-first (2a) vs both now (2b) | **Effectively 2a** by OD-555-02 + OD-555-04 | Phase 2 = mobile + portrait Order Entry + ≤600 widths |

### 5b. Agent review of the tracking options (for E)
- **1a — one umbrella BUG-555, 4 work packages.** Pros: one Impact Analysis, one plan, one QA pass, one Sheet row. Cons: 4 different risk levels (HIGH for OrderEntry/Dashboard hotspots, LOW for the 34-page sweep) all gated by the slowest one; a single QA FAIL on the sidebar blocks closing the Order Entry fix.
- **1b — child IDs.** BUG-555 = Order Entry (HIGH, R5 hotspot); BUG-55x = Sidebar hamburger (HIGH, 94 mount points); BUG-55y = Header 1024–1077 + portrait Add (MEDIUM); extend BUG-539 → "BUG-539-B" = 34-page toolbar sweep (LOW, Fast-Lane-like but >1 file so normal flow). Pros: each ships/closes independently, LOW items are not held hostage by HIGH ones, matches the registry's one-risk-per-item rule. Cons: 4 intake docs + 4 plans (mechanical).
- **Agent recommendation: 1b**, because the risk spread is LOW→HIGH and the owner wants Order Entry first — it should not wait for the sidebar hamburger QA.
- **Firebase (E-3): 3a** — register as **P2** BUG, approve DIRECT_BUG_FIX (1 file, ~6 lines, not hotspot, not financial, meets planning-skip criteria).

### 5c. FROZEN decisions — 2026-10-15 (investigation closed)

**Devices confirmed:** Samsung Galaxy Tab A7 Lite (SM-T225) + Xiaomi Redmi Pad SE 4G — both 8.7", 1340×800 panel, DPR 1.33–1.5 → CSS **893×533** (default) / **1006×600** (small display setting); portrait 533–600 wide. Earlier "853" figure was an upload-scaling artefact; all thresholds unchanged (Order Entry needs 927 > 893; reports clip ≤1280).

| ID | Frozen decision |
|---|---|
| **OD-555-04 Device floor** | Phase 1 = **landscape ≥ 800px** (Order Entry, Dashboard, Reports) and **portrait ≥ 533px for Dashboard + Reports**. Order Entry is landscape-only in Phase 1. 7"/600-class + phones = mobile phase. |
| **OD-555-02 Portrait Order Entry** | **(c)** landscape-only; portrait shows a **full-screen blocking "Rotate your tablet" overlay** (Q3a). Drawer (a) / stacked (b) explored in Phase 2. |
| **OD-555-09 PWA orientation** | **No** manifest `orientation` lock (Q2b). Notice only. |
| **OD-555-05 Sidebar** | **(b)** hamburger / slide-over on tablets, implemented inside `Sidebar.jsx` (94 mount points untouched). **Plus `sticky top-0` pin on desktop** (Q4a). |
| **OD-555-10 Breakpoints** | **Header + sidebar hamburger: tablet mode < 1280px** (covers iPad landscape 1024/1180 and the 1024–1077 gap). **Channel/table grid stacking stays < 1024px.** Desktop ≥ 1280 untouched. (Q5a) |
| **OD-555-06 Report toolbars** | **(a)** `flex-wrap` sweep across all 34 report-module pages, Phase 1. |
| **OD-555-07 Firebase** | Re-classified **P2** (prod + PWA: Push supported, no overlay). Separate item. |
| **OD-555-08 Work order** | WP-A Order Entry → WP-D Reports → WP-B Sidebar hamburger + desktop pin → WP-C Header (<1280 tablet header, Add visible down to 533). |
| **OD-555-01 Tracking** | **(a) FROZEN — single umbrella BUG-555 with 4 work packages** (owner overrode agent's child-ID recommendation; rationale: one intake, one plan, one QA pass). |
| **OD-555-03 Phasing** | **FROZEN** — Phase 1 landscape-first; Phase 2 = mobile + portrait Order Entry. |
| **OD-555-11 Pipeline** | **FROZEN** — INTAKE → Gate 2 Impact Analysis → design agent tablet mockups → owner design review → Gate 3 → Gate 4 GO → build → QA at 893×533 / 1006×600 / 533×893. |
| **E-3 Firebase** | **(b) FROZEN** — register as a **separate P2 BUG**, **full Gate 2–3** (no direct-fix skip). |

**Phase 1 scope lock (for INTAKE/PLANNING):**
- WP-A `OrderEntry.jsx` (3-pane fluid ≥800: `w-96`→responsive, `min-w-0` middle, wrapping toolbar), `CategoryPanel.jsx` (`w-44` responsive), `CollectPaymentPanel.jsx` container only, new portrait overlay. Risk HIGH (R5).
- WP-B `Sidebar.jsx` (hamburger <1280 + slide-over + desktop `sticky top-0`), `DashboardPage.jsx:1668/1737` shell height. Risk HIGH (R5 DashboardPage).
- WP-C `Header.jsx:433-441, 765-769` (tablet header <1280; Add visible at 533–600). Risk MEDIUM.
- WP-D 34 × `pages/reports-module/*.jsx` toolbar `flex-wrap gap-y-2`. Risk LOW.
- Phase 2 (mobile): portrait Order Entry UX, ≤600 widths, phones.

**Design gate recommendation (owner asked):** call the design agent **after Intake and after Impact Analysis (Gate 2), before the Implementation Plan (Gate 3)**. Reason: Impact Analysis fixes *which* components/breakpoints are in scope and surfaces constraints (R5 hotspots, 94 Sidebar mount points, 927px floor); the design agent then produces tablet mockups for exactly that scope (Order Entry 893×533 + 1006×600, rotate overlay, hamburger/slide-over, header <1280, report toolbar wrap), and Gate 3 plans against approved designs instead of re-planning after design changes. Owner reviews designs between Gate 2 and Gate 3.

**Investigation status: CLOSED — root cause HIGH confidence, 9/10 steps. All owner decisions frozen. Next role: INTAKE.**

---

## 6. Retroactive Candidates
NONE. BUG-537 / CR-414 / BUG-539 code exists exactly as the registry says (GATE_5A); nothing found that is implemented-but-unregistered.
