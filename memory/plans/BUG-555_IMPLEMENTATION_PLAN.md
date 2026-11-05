# BUG-555 — Implementation Plan (Gate 3)
## Tablet Responsiveness umbrella — WP-A Order Entry → WP-D Report toolbars → WP-B Sidebar → WP-C Header

**ID:** BUG-555 · **Date:** 2026-10-15 · **Role:** PLANNING (Gate 3 only — no code)
**Inputs:** `impact/BUG-555_IMPACT_ANALYSIS.md` (Gate 2 CLOSED, §9 locked ODs) · `/app/design_guidelines.json` · `frontend/public/bug555-tablet-design-review.html` (approved)
**Code Reality:** NONE (re-verified at HEAD 2026-10-15 — `grep BUG-555 frontend/src` = 0; all anchors below re-read)
**Revision:** v2 2026-10-15 — line-by-line revalidation `plans/BUG-555_PLAN_REVALIDATION_2026_10_15.md` (all anchors 100% match at HEAD). Owner accepted amendments F1–F3, F5, F7–F11, F15; **OD-555-18 = static rotate icon** (no animation). Changes marked **[v2]** below. File count unchanged (44).
**Risk:** HIGH (umbrella via WP-A, R5 `OrderEntry.jsx`) · WP-A HIGH · WP-B MEDIUM (OD-555-15) · WP-C MEDIUM · WP-D LOW
**Layout-only (OD-555-17):** no colour/font/icon/style token changes; only width / wrap / breakpoint classes + 2 new shells (rotate overlay, sidebar rail+drawer) reusing existing `COLORS`.
**Breakpoint contract:** tablet = `< 1280px` (`xl`). Grid stacking stays `< 1024px` (`ChannelColumnsLayout.jsx:107` untouched).

---

## 0. Scope Lock (R14)
| WILL change (44 files) | WILL NOT touch |
|---|---|
| `components/order-entry/OrderEntry.jsx` (R5) | `CollectPaymentPanel.jsx`, `CartPanel.jsx` (OD-555-12=a) |
| `components/order-entry/CategoryPanel.jsx` | `pages/DashboardPage.jsx` (OD-555-15) |
| `components/layout/Sidebar.jsx` | `components/dashboard/ChannelColumnsLayout.jsx` |
| `components/layout/Header.jsx` | 94 Sidebar host pages (except the 40 report pages for WP-D toolbar classes only) |
| 40 × `pages/reports-module/*.jsx` (toolbar classes only) | `orderTransform.js`, `AppProviders.jsx`, `public/manifest.json`, any API/service/transform, any localStorage key (`mygenie_sidebar_expanded` untouched — R8), `config/firebase.js` (BUG-560) |

Hotspots: 1 (`OrderEntry.jsx`). Financial logic (R6): none. Gate 4 owner GO required (R5).

## 1. Execution Sequence & Conflict Notes
1. **WP-A** (Order Entry) → 2. **WP-D** (reports) → 3. **WP-B** (Sidebar) → 4. **WP-C** (Header).
- WP-C edits the same `lg:` classes CR-414 introduced → **run WP-C after CR-414 QA PASS** (or owner accepts re-testing CR-414 header cases at 1280 instead of 1024).
- BUG-538 / CR-410 touch OrderEntry logic lines (canDiscount / loyalty props) — parallel-safe; if either lands first, re-verify anchors A1–A6 (Entry Verification, Implementation Step 0).
- Compile check after each WP; checkpoint list per WP (Implementation rule for 3+ files).

---

## 2. WP-A — Order Entry (HIGH, R5) · OD-555-02/04/12/13

| # | File:line (HEAD) | Current | New |
|---|---|---|---|
| A1 | `OrderEntry.jsx:2` | `import { ChevronDown, Search, UserPlus, StickyNote, Plus, Truck, ShoppingBag, UtensilsCrossed, Scissors, ArrowRightLeft, GitMerge, X } from "lucide-react";` | same list `+ RotateCw` |
| A2 | `OrderEntry.jsx:54` (after `DROPDOWN_TABLE_SORT`, before component comment L55) | — | `// BUG-555 WP-A (OD-555-13=c): (portrait AND <1280) OR <800 → rotate overlay`<br>`const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)';` |
| A3 | `OrderEntry.jsx:103` (after `const [searchQuery, setSearchQuery] = useState("");`) | — | `const [isRotateBlocked, setIsRotateBlocked] = useState(() => window.matchMedia(ROTATE_MQ).matches); // BUG-555`<br>`useEffect(() => { const mq = window.matchMedia(ROTATE_MQ); const h = (e) => setIsRotateBlocked(e.matches); mq.addEventListener('change', h); return () => mq.removeEventListener('change', h); }, []);` (same pattern as `ChannelColumnsLayout.jsx:107`) |
| A4 | `OrderEntry.jsx:1683` middle pane | `className="flex-1 flex flex-col min-h-0"` | `className="flex-1 flex flex-col min-h-0 min-w-0"` `{/* BUG-555 */}` |
| A5 | `OrderEntry.jsx:1685` header row | `className="px-4 py-3 flex-shrink-0 flex items-center gap-3"` | `className="px-4 py-3 flex-shrink-0 flex flex-wrap items-center gap-3 gap-y-2"` **[v2 F2: row-gap 8px = mockup `.mhead`]** |
| A6 | `OrderEntry.jsx:1687` search wrapper | `className="relative flex-1 max-w-xs"` | `className="relative flex-1 max-w-xs min-w-[140px]"` |
| A7 | `OrderEntry.jsx:2997` — inside root `<div data-testid="order-entry-screen">`, after the last modal block `)}` (L2997) and before the root closing `</div>` (L2998) | — | Rotate overlay (below) |
| A8 | `CategoryPanel.jsx:32` | `className="w-44 flex-shrink-0 flex flex-col min-h-0"` | `className="w-32 xl:w-44 flex-shrink-0 flex flex-col min-h-0"` `/* BUG-555 */` |
| A9 | `CategoryPanel.jsx:58` category `<button>` (opens L58; `truncate` span L68) | (no title) | `+ title={\`${category.name} (${category.count})\`}` — full name on hover/long-press |
| A10 **[v2 F3]** | `OrderEntry.jsx:1738` icon group | `className="flex items-center gap-3 flex-shrink-0"` | `className="flex items-center gap-3 flex-shrink-0 ml-auto"` — right-aligns the 5 icons when they wrap to row 2 (mockup `.icons{margin-left:auto}`); no-op on desktop because the `flex-1` spacer (L1707) absorbs free space first |

**Unchanged by design:** right pane `OrderEntry.jsx:1863 w-96` (384px — OD-555-12=a), spacer L1707, chips L1715/L1727 (`flex-shrink-0`; the menu-type chip is conditional, so at 800px it may wrap to row 2 with the icons — accepted, see matrix), items area L1817 (`flex flex-wrap`, already fluid).

**A7 overlay JSX (layout shell, existing COLORS only) — [v2 F4a/b static icon per OD-555-18, F5 `absolute`]:**
```jsx
{/* BUG-555 WP-A (OD-555-02=c): sibling layer — OrderEntry stays mounted, cart/customer/search preserved */}
{isRotateBlocked && (
  <div
    data-testid="order-entry-rotate-overlay"
    role="dialog" aria-modal="true" aria-labelledby="oe-rotate-title"
    className="absolute inset-0 z-[120] backdrop-blur flex flex-col items-center justify-center text-center px-10"
    style={{ backgroundColor: "rgba(26,26,26,0.95)" }}
  >
    <RotateCw className="w-24 h-24 mb-6" style={{ color: COLORS.primaryOrange }} />
    <h2 id="oe-rotate-title" className="text-2xl font-bold text-white mb-2">Rotate your tablet</h2>
    <p className="text-sm max-w-xs" style={{ color: "#CFCFCF" }}>Order Entry works in landscape. Turn your tablet sideways to continue.</p>
    <p data-testid="order-entry-rotate-cart-kept" className="mt-6 text-xs px-3 py-1.5 rounded-full text-white"
       style={{ border: `1px solid ${COLORS.primaryGreen}`, backgroundColor: "rgba(50,153,55,0.25)" }}>
      Your order and cart are kept
    </p>
  </div>
)}
```
Constraints: never conditionally unmount siblings (BUG-452/CR-411 `orderEntryResetNonce` contract); `absolute inset-0` inside the `fixed inset-0 z-50` root (L1665) = full viewport, same stacking context as the 18 order-entry modals (`z-[100]`/`z-[110]`, none portaled) → `z-[120]` always on top; `backdrop-blur` = 8px (mockup `.rot`); icon **static** (OD-555-18); copy = approved mockup text; no manifest orientation lock (OD-555-09).

**Width budget after WP-A:** 800 → 128 + 288 + 384 · 893 → 128 + 381 + 384 · 1006 → 128 + 494 + 384 · ≥1280 → 176 + flex + 384 (unchanged).

---

## 3. WP-D — Report toolbars (LOW) · OD-555-06/14

Edit-site list saved: `evidence/BUG-555/BUG-555_WPD_edit_sites_2026_10_15.txt`.

**D-OUTER** (append to class): `flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200[ shrink-0]` → `… flex-wrap gap-y-3`
**D-INNER** (append to class): `flex items-center gap-3` (or `gap-2.5`) → `… flex-wrap`

| # | File | D-OUTER line | D-INNER line |
|---|---|---|---|
| D1 | AuditLogMockup.jsx | 94 | 100 |
| D2 | CancelDetailMockup.jsx | 101 | 107 |
| D3 | CancellationsMockup.jsx | 345 | 368 |
| D4 | CashierSettlementMockup.jsx | 84 | 89 |
| D5 | ChannelPivotMockup.jsx | 204 | 212 |
| D6 | CouponUsageMockup.jsx | 87 | 92 |
| D7 | CustomersMixMockup.jsx | 89 | 94 |
| D8 | CustomersRfmMockup.jsx | 93 | 98 |
| D9 | DailySalesMockup.jsx | 211 | 221 |
| D10 | DashboardMockup.jsx | 284 | 308 |
| D11 | DayOfWeekMockup.jsx | 189 | 197 |
| D12 | DeliveryChargeMockup.jsx | 82 | 87 |
| D13 | DiscountReportMockup.jsx | 95 | 100 |
| D14 | EdgeStatesMockup.jsx | 75 | 97 |
| D15 | ExpenseReportPage.jsx | 304 | 314 |
| D16 | FoodCourtBetaPage.jsx | 308 | **323** (scan mis-read 370 = presets itself; 323 verified by eye) |
| D17 | FoodCourtMockup.jsx | 482 | 492 |
| D18 | GatewayReconMockup.jsx | 65 | 67 |
| D19 | HourlySalesMockup.jsx | 192 | 200 |
| D20 | ItemSalesHybridMockup.jsx | 881 | 911 |
| D21 | ItemSalesLedgerMockup.jsx | 375 | 384 (`gap-2.5`) |
| D22 | KotVarianceMockup.jsx | 79 | 81 |
| D23 | OrderLedgerMockup.jsx | 613 | 623 |
| D24 | OrderNotesMockup.jsx | 91 | 97 |
| D25 | PaymentsMockup.jsx | 370 | 387 |
| D26 | PrepServeTimeMockup.jsx | 313 | 328 |
| D27 | RoomOrdersMockup.jsx | 498 | 508 |
| D28 | RoomTransfersMockup.jsx | 79 | 84 |
| D29 | RoundOffMockup.jsx | 45 | 47 |
| D30 | SalesMockup.jsx | 300 | 317 |
| D31 | SettlementReportMockup.jsx | 349 | 359 |
| D32 | StaffCashiersMockup.jsx | 92 | 97 |
| D33 | StaffServersMockup.jsx | 91 | 96 |
| D34 | TableSalesMockup.jsx | 88 | 93 |
| D35 | TaxCalcMockup.jsx | 87 | 92 |
| D36 | TaxDetailMockup.jsx | 94 | 99 |
| D37 | TaxSlabsMockup.jsx | 88 | 93 |
| D38 | TipReportMockup.jsx | 65 | 67 |
| D39 | VariationAddonMockup.jsx | 237 | 245 (`gap-2.5`) |
| D40 | PLReportPage.jsx | — (L176 already `flex-wrap gap-y-2`, BUG-539) | 186 |

Excluded (already wrap): ConsumptionReportPage.jsx L238, PurchaseReportPage.jsx L262.
**Edit method [v2 F14]:** in every header the title row (`outer+1`) and the controls row carry the byte-identical class `flex items-center gap-3`, so hand `search_replace` is 80 risky anchors. Implementer MUST use a line-number-driven Python edit: for each row in the table, read the file, assert the D-OUTER line contains `flex items-center justify-between px-8 py-5` (D40: `flex-wrap gap-y-2`) and the D-INNER line contains `flex items-center gap-3` / `gap-2.5`, abort on any mismatch, then append the classes and add one `{/* BUG-555 */}` comment per file adjacent to D-OUTER (R18). Re-run the scan (`evidence/BUG-555/BUG-555_WPD_toolbar_scan_2026_10_15.txt` method) afterwards → 0 NOWRAP. All 40 (file, line, content) pairs were re-verified at HEAD on 2026-10-15 (revalidation §1).

---

## 4. WP-B — Sidebar rail + drawer <1280, desktop sticky (MEDIUM) · OD-555-05/10/12b/15

| # | File:line (HEAD) | Current | New |
|---|---|---|---|
| B1 | `Sidebar.jsx:3-8` lucide import | `… ArrowLeftRight, BedDouble` | `… ArrowLeftRight, BedDouble, Menu` |
| B2 | `Sidebar.jsx:248-249` props | `isExpanded, ` / `setIsExpanded, ` | `isExpanded: isExpandedProp, ` / `setIsExpanded: setIsExpandedProp, ` |
| B3 | `Sidebar.jsx:287` after `const location = useLocation();` | — | block below (before first `isExpanded` use at L325) |
| B4 | `Sidebar.jsx:490-497` `<aside>` | `data-testid="sidebar"` · `className="h-screen flex flex-col transition-all duration-300 flex-shrink-0 relative"` | `data-testid={isTablet ? "sidebar-drawer" : "sidebar"}` · `className={\`h-screen flex flex-col transition-all duration-300 flex-shrink-0 ${isTablet ? \`fixed inset-y-0 left-0 z-[100] shadow-2xl ${drawerOpen ? "translate-x-0" : "-translate-x-full invisible"}\` : "sticky top-0"}\`}` · **[v2 F8]** `role={isTablet ? "dialog" : undefined}` `aria-modal={isTablet ? true : undefined}` `aria-hidden={isTablet && !drawerOpen}` `inert={isTablet && !drawerOpen}` (React 19 boolean `inert` — closed drawer leaves the tab order; `invisible` flips at the end of the slide-out / start of the slide-in under `transition-all`) (style unchanged — width resolves to 280 in tablet because `isExpanded` is forced true) |
| B5 | `Sidebar.jsx:489` `return (` | `return (\n    <aside` | `return (\n    <>{isTablet && (rail)}{isTablet && drawerOpen && (backdrop)}\n    <aside` |
| B6 | `Sidebar.jsx:862` | `    </aside>\n  );` | `    </aside>\n    </>\n  );` |

**B3 block:**
```jsx
// BUG-555 WP-B: tablet (<1280) = 56px rail + slide-over drawer. Drawer state is LOCAL —
// never calls the page's setIsExpanded, so localStorage `mygenie_sidebar_expanded` (R8) is untouched.
const [isTablet, setIsTablet] = useState(() => window.matchMedia('(max-width: 1279px)').matches);
const [drawerOpen, setDrawerOpen] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 1279px)');
  const h = (e) => { setIsTablet(e.matches); setDrawerOpen(false); };
  mq.addEventListener('change', h);
  return () => mq.removeEventListener('change', h);
}, []);
useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
useEffect(() => {
  if (!drawerOpen) return;
  const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [drawerOpen]);
const isExpanded = isTablet ? true : isExpandedProp;
const setIsExpanded = isTablet ? (v) => { if (!v) setDrawerOpen(false); } : setIsExpandedProp;
```
Effect: all existing `isExpanded` reads (33 lines) render the full 280px tree inside the drawer; the existing collapse button (L512 `setIsExpanded(false)`) closes the drawer; CR-052 flyout (`flyoutItem && !isExpanded`) never shows in tablet mode; ≥1280 behaviour byte-identical except `relative` → `sticky top-0` (both positioned → flyout `absolute` anchoring unchanged). Full keyboard focus-trap inside the open drawer is **out of scope** (new dependency) — logged as follow-up in revalidation F8.

**B5 rail + backdrop JSX:**
```jsx
{isTablet && (
  <div data-testid="sidebar-rail" className="w-14 h-screen sticky top-0 flex-shrink-0 flex flex-col items-center pt-3"
       style={{ backgroundColor: COLORS.lightBg, borderRight: `1px solid ${COLORS.borderGray}` }}>
    <button data-testid="sidebar-hamburger-btn" aria-label="Open menu" aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
      <Menu className="w-5 h-5" style={{ color: COLORS.darkText }} />
    </button>
  </div>
)}
{isTablet && drawerOpen && (
  <div data-testid="sidebar-drawer-backdrop" className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />  {/* [v2 F7] blur per mockup/design_guidelines */}
)}
```
Fragment children are flex items of each host page's `flex h-screen` / `flex min-h-screen` wrapper → rail is the only in-flow item (56px); drawer + backdrop are `fixed`. No host page edited.

---

## 5. WP-C — Dashboard Header tablet mode <1280, Add visible ≤600 (MEDIUM) · OD-555-10

All in `components/layout/Header.jsx` (mounted only by DashboardPage). C1–C8: replace `lg:` with `xl:` on the CR-414 sites only (these 8 lines are the **only** breakpoint classes in the file); update the trailing `{/* CR-414: … <1024px */}` comments to `{/* CR-414 + BUG-555: … <1280px */}`. **[v2 F9]** Also update the block comment at **L337-338** ("Visible <1024px only (OD-537-02, OD-414-01=A, OD-414-05=A)") → "Visible <1280px only (… + BUG-555 OD-555-10)".

| # | Line | Current | New |
|---|---|---|---|
| C1 | 271 | `hidden lg:flex items-center gap-1 ml-4` | `hidden xl:flex items-center gap-1 ml-4` |
| C2 | 339 | `relative lg:hidden ml-2` | `relative xl:hidden ml-2` |
| C3 | 428 | `hidden lg:flex items-center pl-3 ml-1 border-l` | `hidden xl:flex items-center pl-3 ml-1 border-l` |
| C4 | 433 | `flex-1 flex justify-end px-2 lg:px-4` | `flex-1 flex justify-end px-2 xl:px-4` |
| C5 | 438 | `hidden lg:flex items-center mr-3` | `hidden xl:flex items-center mr-3` |
| C6 | 441 | `relative flex-1 lg:flex-initial min-w-0` | `relative flex-1 xl:flex-initial min-w-0` |
| C7 | 445 | `isSearchFocused ? "lg:w-64" : "lg:w-48"` | `isSearchFocused ? "xl:w-64" : "xl:w-48"` |
| C8 | 483 | `right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 mt-1 w-80 lg:w-96` | `right-0 xl:right-auto xl:left-1/2 xl:-translate-x-1/2 mt-1 w-80 xl:w-96` |
| C9 | 765 | `<div className="flex items-center gap-3">` (Add + online group) | `<div className="flex items-center gap-3 flex-shrink-0"> {/* BUG-555 */}` |
| C10 | 770 (`add-table-btn` className; testid at 769) | `className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"` | `className="flex items-center justify-center gap-1.5 px-3 py-2.5 max-sm:min-w-[44px] max-sm:min-h-[44px] rounded-lg transition-colors hover:opacity-80"` + `aria-label="Add"` **[v2 F1: `max-sm:` scoping — desktop button stays 40px tall (OD-555-17); 44×44 touch target only <640]** |
| C11 | 775 | `<span className="text-sm font-medium">Add</span>` | `<span className="hidden sm:inline text-sm font-medium">Add</span>` |

`ChannelColumnsLayout.jsx:107` (`max-width: 1023px`) **unchanged** (OD-555-10).

---

## 6. Verification Matrix (seeds QA)
Viewports: **V1** 893×533 · **V2** 1006×600 · **V3** 533×893 · **V4** 800×500 · **V5** 1024×768 · **V6** 1920×800 (regression). Method per IA §7 repro (iframe or `set_viewport_size`; log in once).

| Edit | Check | Viewports | How | Auto? |
|---|---|---|---|---|
| A4–A6, A8 | Right pane `getBoundingClientRect().right ≤ innerWidth`; Collect Bill / Pay / Discount / Tip visible; no horizontal overflow | V1 V2 V4 | Playwright DOM overflow check (BUG-555 repro script) | YES |
| A5, A10 | Middle header wraps to 2 rows (row-gap 8px); search on row 1; icon group fully visible on row ≤2 and **right-aligned** (group `right` ≈ middle-pane right edge − 16px); chips may sit on either row **[v2 F15]**; all 5 icon buttons clickable (≥40px) | V4 V1 | screenshot + DOM rect + click `add-custom-item-btn`, `customer-info-btn`, `order-notes-btn` | YES |
| A8–A9 | Category rail 128px <1280, 176px at V6; long names truncate with `title` | V1 V6 | DOM width of `category-panel` | YES |
| A2–A3, A7 | `order-entry-rotate-overlay` visible at V3; absent at V1/V2/V6; `getComputedStyle(overlay).backdropFilter` contains `blur`; icon static (no `animation-name`) **[v2]** | V3 V1 V6 | testid presence + computed style | YES |
| A7 | Add 2 items → rotate to portrait → back to landscape → same 2 items in cart, customer kept | V1↔V3 | resize sequence | YES |
| A7 | Overlay above an open modal (e.g. Order Notes) | V3 | open modal at V1, resize to V3 | YES |
| WP-A regression | Place order → Collect Bill → settle (dine-in + walk-in R13) | V1 + V6 | E2E | MANUAL/QA |
| D1–D40 | Each toolbar: no element `right > innerWidth`; title row 1, controls wrap | V1 V3 | loop 40 routes, overflow check; re-run edit-site scan → 0 NOWRAP | YES |
| D1–D40 | Desktop toolbar single row, pixel-identical | V6 | screenshot diff 5 sample pages | YES |
| B2–B6 | `<1280`: `sidebar-rail` 56px, `sidebar-hamburger-btn` opens `sidebar-drawer` (280px) + `sidebar-drawer-backdrop` (computed `backdropFilter` contains `blur`); backdrop tap / Escape / nav item closes; closed drawer: `visibility: hidden`, `inert` set, Tab from `sidebar-hamburger-btn` never focuses inside `sidebar-drawer` **[v2 F7/F8]** | V1 V5 | click flow + keyboard | YES |
| B3 | localStorage `mygenie_sidebar_expanded` unchanged after opening/closing drawer | V1 | read before/after | YES |
| B4 | ≥1280: sidebar stays in view after scrolling Dashboard to bottom (`sidebar` top = 0) | V6 | scroll + rect | YES |
| B4 | CR-052 flyout works when collapsed (hover/click a parent item) | V6 | click flow | YES |
| B | Logout, Switch Restaurant, sound toggle, view toggles inside drawer | V1 | click flow | MANUAL/QA |
| C1–C8 | 1024–1279: tablet dropdown (`tablet-filter-dropdown-btn`) shown, pills hidden, `add-table-btn` right ≤ innerWidth | V5 V2 | DOM | YES |
| C9–C11 | Add visible icon-only (≥44×44) at V3; label visible ≥640; **desktop `add-table-btn` height unchanged at 40px (V6)** **[v2 F1]** | V3 V1 V6 | DOM rect | YES |
| C | ≥1280 header identical (pills, PlatformDropdown, counter chip) | V6 | screenshot diff | YES |
| C2-comment | `grep -n "<1024px" Header.jsx` → only non-CR-414 hits (none expected) | — | CLI | YES |
| ALL | `yarn build` exit 0; webpack 0 new warnings; jest suites unaffected (`DashboardPage.bug452.test.jsx`, `phase1_5.cr385.test.jsx` mocks Sidebar) | — | CLI | YES |

## 7. Regression Checklist (R5 hotspot + cross-flow)
1. Login → Dashboard → open table → add items → Collect Bill → settle → report shows order (V6 and V1).
2. Walk-in order separately (R13).
3. Shift table / merge table from Order Entry header icons at V4.
4. Scan-order edit opens Order Entry with cart intact.
5. Desktop 1920: Dashboard, Order Entry, Settlement report, Sidebar expanded/collapsed screenshots identical to pre-change baseline.
6. CR-414 header cases re-run with tablet threshold 1280 (header only); grid stacking still at 1024.

## 8. Risk Register (carried from IA §6, mitigations bound to edits)
| Risk | Edit | Mitigation |
|---|---|---|
| Overlay remount loses cart | A7 | sibling conditional layer only; matrix row "rotate round-trip" |
| CPP clipping | — | CPP untouched; right pane fixed 384 |
| Drawer writes saved preference | B3 | local `drawerOpen`; wrapper `setIsExpanded` no-op except close |
| Flyout regress desktop | B4 | `sticky` keeps positioned ancestor; matrix flyout row |
| Report class typo / wrong line | D1–D40 | line-number-asserted scripted edit (v2 F14); post-edit scan = 0 NOWRAP |
| CR-414 QA invalidated | C1–C8 | sequence after CR-414 QA; CR-414 header cases updated to 1280 |
| Desktop Add button grows 40→44px (OD-555-17 breach) | C10 | `max-sm:` scoping (v2 F1); matrix row C9–C11 V6 height check |
| Hidden drawer reachable by keyboard | B4 | `invisible` + `inert` when closed (v2 F8) |

## 8a. Owner decision added at revalidation
| ID | Locked decision |
|---|---|
| **OD-555-18** | **Static rotate icon** on the Order Entry rotate overlay — no animation (owner 2026-10-15: "static"). Overlay keeps mockup blur (8px) + 96px icon + approved copy. Tilt keyframe (would add `index.css`) and `animate-spin` both rejected. File count stays 44. |

## 9. Post-Code Registry Checklist (Implementation agent MUST execute)
- [ ] `registry.json`: BUG-555 → `GATE_5A_IMPLEMENTED`, `sprint_key: oct_cr_batch`, `files` = 44-file list, `qa_handover` path
- [ ] `BUG_TRACKER.md`: BUG-555 row + Last Updated line
- [ ] `FILE_OWNERSHIP.md`: OrderEntry.jsx, CategoryPanel.jsx, Sidebar.jsx, Header.jsx, 40 report pages — BUG-555 + date + edit IDs
- [ ] Code markers: `// BUG-555` / `{/* BUG-555 */}` in every modified file (44)
- [ ] Compile: `yarn build` exit 0, 0 new warnings
- [ ] QA handover: `handover/QA_HANDOVER_BUG555_<DATE>.md` inheriting §6 + §7
- [ ] EXIT GATE 5/5 before session handover

## 10. Gate 4
```
OWNER APPROVAL REQUIRED
Reason: R5 hotspot OrderEntry.jsx + 44-file layout change across Order Entry, Sidebar (94 host pages), Header, 40 report pages
Risk: HIGH
Plan revision: v2 (revalidated line-by-line 2026-10-15, amendments F1–F3/F5/F7–F11/F15 applied, OD-555-18 static icon)
Proposed next step: IMPLEMENTATION WP-A (A1–A10) → WP-D (D1–D40, scripted) → WP-B (B1–B6) → WP-C (C1–C11 + L337 comment) per this plan (WP-C after CR-414 QA PASS)
I will not proceed until owner approves.
```
