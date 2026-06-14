# CR-011 — Screen Freeze Log

**CR:** CR-011 — Complete Reports Module
**Started:** 2026-06-01
**Governance:** `/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md` (binding for ALL agents)

---

## Per-screen gate (binding)

For every screen below, the sequence is **non-skippable**:

```
①  Mockup with seed data
   ↓
②  Owner review in chat
   ↓  (changes → loop ①)
③  OWNER SIGN-OFF (explicit "lock it" reply)
   ↓
④  Wire to live API on preprod (real numbers, real edge cases)
   ↓
⑤  Owner validates with API data ("numbers match" or "fix X")
   ↓
⑥  Frozen → next screen begins
```

**No screen leaves "API-validated" status before the next starts.**
**No agent may begin a downstream screen until the preceding one is API-validated.**

---

## Status Legend

- ⏳ Queued — not started
- 🟡 Mockup ready — awaiting owner review
- 🔵 Locked (visual) — sign-off done, awaiting API wiring
- 🟠 API wired — awaiting owner data validation
- ✅ FROZEN — locked + validated, downstream may proceed
- 🔧 Revision requested

---

## PHASE 1 — Visual DNA Freeze (5 critical screens)

**Code Gate 1: PASSED 2026-06-02** — All 5 screens audited against §5 acceptance checklist (17 items). Zero code changes needed. Primitives (ReportLoadingShield, useReportFetch) already integrated during API wiring. Artifacts: `CR_011_CODE_GATE_1_IMPLEMENTATION_PLAN_2026_06_02.md` + `CR_011_CODE_GATE_1_SCOPE_LOCK_2026_06_02.md`.

**Post-Gate owner-directed revisions (2026-06-02):**
- S0 re-opened by owner for 3 fixes: (1) cancellation cancel_at attribution via Option A second API call + double-counting fix, (2) Payment Mix total badge, (3) date filter persistence to Item Sales via URL params. S2 also updated for URL param reading. All changes owner-reviewed. S0+S2 re-frozen below.

| # | Screen | Mockup | Sign-off | API wired | API validated | Status | §5 Compliance |
|---|---|---|---|---|---|---|---|
| **S0** | Landing Dashboard (KPI tiles) | 2026-06-01 | **2026-06-01** | **2026-06-02 v2** (9 tiles + fixes: Cancellations now cancel_at via Option A second API call, order/item buckets mutually exclusive; Payment Mix total badge; Audit tile shows actor name + method change; tile navigation passes date params to S2) | **2026-06-02 v2** (owner validated Palm House Apr: 145 total = 43 order + 102 item, ₹36,326; Payment Mix ₹10,22,433 total = Net Sales) | ✅ FROZEN | ✅ 17/17 |
| **S1** | Module Shell + Sidebar Entry + Top Nav | 2026-06-01 | **2026-06-01** | 2026-06-01 (sidebar nav wired — no data API on S1) | **2026-06-01** | ✅ FROZEN | ✅ N/A (no fetch) |
| **S2** | Aggregated Report Template + Item Sales (Option C merge) | 2026-06-01 | **2026-06-01** (visual) | **2026-06-01 v3 + 2026-06-02 URL params + 2026-06-02 data-scope fix** (API wired; per-tab date attribution: Cancelled tab → cancel_at \| created_at; other tabs → collect_bill \| created_at; reads ?from=&to= URL query params from Dashboard navigation; Cancelled/Comp tabs now show per-bucket Discount/Tax/AvgPrice — lens patched per `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` §4) | **2026-06-01** | 🟠 Re-validation pending — patch shipped 2026-06-02, awaiting owner Gate ⑤ confirmation that numbers match expectations on the reference window | ✅ N/A (no fetch in 17/17 row above; this row is the visible item-sales screen) |
| **S2** | Generic Report Page Template (ref: Item Sales) | _____ | _____ | _____ | _____ | ⏳ Queued | — |
| **S3** | Side-sheet Drill Template | 2026-06-01 | **2026-06-01** | **2026-06-01** (API wired; drill data: 20 order lines per item, variation breakdown, addon attach rates, cancellation reasons from reason_type lookup via /cancellation-reasons + cancel_reason_text as notes; Item vs Order scope tags; verified on Palm House owner@palmhouse.com #014151 Sundries Tomatoes + Pav&Pages Hot Coffee) | **2026-06-01** | 🔧 Logical re-open 2026-06-02 (Option 6.1.B per `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` §6) — no code edit, but `selectedRow` shape now carries lensed `discount`/`tax`/`avgPrice` on Cancelled/Comp tabs so drill KPIs match the row that opened it | ✅ N/A (props) |
| **S4** | Edge States Template (empty/loading/error/no-permission) | 2026-06-01 | **2026-06-01** | N/A (visual template — no API wiring; states demoed via toggle) | **2026-06-01** | ✅ FROZEN | ✅ N/A (demo) |

---

## PHASE 2 — Section "Hero" Screens (6 screens with unique character)

| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| **S5** | Item Sales Hybrid (5 tabs + unified Download menu: Excel · PDF · Email · WhatsApp · SMS) — scope addendum 2026-06-02 (`/app/memory/memory/change_requests/impact_analysis/CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md`); Email + WhatsApp + SMS placeholders disabled, formatting parity with Credit/Tab Management `creditStatementGenerator.js`. **2026-06-03 SCOPE EXPANSION: 4-bucket model (Sold/Cancelled/Comp/Pending Billing) + tab rename "All Items"→"Sold Items" + new "Pending Billing" tab. Plan: `CR_011_S5_PENDING_BILLING_TAB_PLAN_2026_06_03.md`.** | **2026-06-02** (file: `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx`; preview route: `/reports-module/items-hybrid/preview`; auth route: `/reports-module/items-hybrid`) | **2026-06-02** (owner: *"lock it ok with request"*) | **2026-06-02** (live API wired via `useReportFetch` + `getItemSalesAggregated` + `ReportLoadingShield`; URL `?from=&to=` honoured; per-tab attribution toggle preserved) + **`reportExporter.js` SHIPPED at Code Gate 1.5** (owner directive "go path C") → Excel + PDF buttons functional (multi-sheet `.xls` + HTML→Blob print PDF, format parity with Credit/Tab Management). **2026-06-02 data-scope fix shipped** per `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` §5 — Cancelled/Comp tabs now use per-bucket Discount/Tax/AvgPrice; export builder lensed; verified: Cappuccino Cancelled row Tax = ₹8 (was inflated), Excel TOTAL row Tax = ₹552 lensed, S2↔S5 parity confirmed. **2026-06-02 CR-011-AUDIT-01 SHIPPED** — 6th Audit tab + KPI strip + RED/AMBER/EXEMPT/REVIEW sections + Download gate. **2026-06-02 FE-15 (Comp exempt, light-green) + FE-16 (group separators) approved.** **2026-06-02 FE-17 approved + Full FE Disclosure batch (FE-18..FE-47) shipped** — 30 previously-undisclosed FE rules registered for owner triage. **2026-06-02 FE-17 SCOPE CORRECTED same-day** (tax-presence audit: `tax = 0` → EXEMPT, `tax > 0` → AMBER, `gst+vat both > 0` → RED). **2026-06-02 FE-48 APPROVED** (context-aware column headers: Cancelled tab → "Cancelled Qty" + "Lost Revenue"; Comp tab → "Comp Qty" + "Would-be Revenue"). **2026-06-02 FE-43 REJECTED** (Comp badge bleed — chip now hidden on Cancelled + Comp tabs). **2026-06-02 CRITICAL BACKEND ESCALATION FILED** (`CR_011_BACKEND_ESCALATION_CANCELLED_FINANCIALS_2026_06_02.md`) — tax/discount/SC/delivery NOT reverted on cancellation; ₹757 tax leakage in 60-day Palm House sample; FE-17 AMBER continues to surface until backend ships. | _____ | ✅ **FROZEN 2026-06-05** — S5 Re-open complete. All 6 business rules implemented + post-lock revisions (tab reorder, toggle removal, badge cleanup, re-fetch fix, Hybrid chip removal). 42 REVIEW rules batch-approved by owner. Audit tab env-gated (REACT_APP_SHOW_AUDIT_TAB). Cancelled+Comp tabs show "REVENUE LOSS" in red. |
| **S6** | Order Ledger Hybrid (lean + side-sheet drill) | **2026-06-03** | **2026-06-03** | **2026-06-03** (Gate ④ + Gate ⑤ revision) | **2026-06-05** | ✅ **FROZEN 2026-06-05** — Tab filter fixes: `cancelled` case-insensitive (`'cancelled'` lowercase from API); `audit` true catch-all (negation of all other tabs, no phantom zone). Export overhaul: PDF page break (summary Page 1, data Page 2+); Excel TOTAL row all 22 numeric columns; "Settled (incl. Credit)" sheet with Payment Category flag column. Env-gated Audit/Ledger Audit tabs. Attribution toggle removed (hardcoded Punched Date). Non-prod labels removed (S6 Hybrid chip, Phase 2B badges, Coming soon tooltips). Revised KPI summary (Net Revenue, Pending Revenue, Revenue Loss, payment split). Sidebar linked. |
| **S7** | Sales (daily revenue, channel mix, payment mix, hourly) | **2026-06-05** | **2026-06-05** | **2026-06-05** (live API via `orderLedgerService`) | **2026-06-05** | ✅ **FROZEN 2026-06-05** — Revenue = `fOrderStatus === 6` only (paid/settled). Discount = `discount + couponDiscount` combined. Room orders excluded. Interactive recharts: animated BarChart (daily revenue), PieChart donuts (channel + payment method), AreaChart (hourly distribution). KPI cards: Total Revenue, Avg Order Value, Tax Collected, Discount Given. Daily breakdown table with TOTAL footer. Excel/PDF export (4 sheets: Daily Sales, By Channel, By Payment, By Hour). Sidebar linked (`/reports-module/sales`, comingSoon removed). |
| **S8** | Payments (payment method breakdown + daily trends) | **2026-06-05** | **2026-06-05** | **2026-06-05** (live API via `orderLedgerService`) | **2026-06-05** | ✅ **FROZEN 2026-06-05** — Revenue = `fOrderStatus === 6` only. Room orders excluded. Dynamic payment classifier: Cash/Card/UPI/TAB/Partial + `zomato_gold` → "Zomato Gold" + unknown methods auto title-cased (no catch-all "Other"). 4 KPI cards (Total Settled, Cash %, Digital %, TAB %). Payment Method Donut. Method Performance Cards. Stacked Bar (daily trends). Cash vs Digital Area Chart. Dynamic daily breakdown table. Excel/PDF export (3 sheets). Sidebar linked. **CRITICAL BACKEND GAP: `order-logs-report` does NOT return partial payment cash/card/upi split — 128 fields inspected, `payment_details: null`. Partial stays as single bucket until settlement module ships. Affects S8, S7 (payment breakdown), S19 (Cashier Settlement), S20 (Gateway Reconciliation).** |
| **S9** | Cancellations (3-stage cancellation + order/item level) | **2026-06-05** (Gate ①) | **2026-06-06** | **2026-06-06** (live API via order-logs-report, raw order_details_table) | **2026-06-06** | ✅ **FROZEN 2026-06-06** — Gate ⑤ owner validated. 3 fixes shipped: FIX 1 (useReportFetch + ReportLoadingShield), FIX 2 (S5 header pattern), FIX 3B (revenue formula). Audit tab (env-gated). |
| **S10** | Prep & Serve Time (lifecycle-mode-aware) | **2026-06-06** (Gate ①) | **2026-06-07** (owner: "approved") | **2026-06-07** (Gate ④ live API wired — order-logs-report, raw timestamp classification: Kitchen/Bar/Direct using 30s threshold. Escalation Matrix = Coming Soon. Outlier cap 120 min. Cancelled items excluded. Dynamic station names from data.) | **2026-06-07** (owner approved — real-time testing deferred) | ✅ **FROZEN 2026-06-07** — Timestamp-based classification (Kitchen: ready_at >> created_at, Bar: ready_at ≈ created_at + serve later, Direct: no timestamps). Uses rawReadyAt/rawServeAt to avoid parseOrderItem Direct-serve fallback. Station breakdown dynamic from API. Verified on Pav: KDS 352 items (Kitchen:324, Direct:28), PACKAGED 201 (Direct:201), OTHER 18 (Direct:18). Serve time deep-dive deferred to real-time testing. |
| **S-ROOM** | Room Orders (PMS + POS historic room revenue) | **2026-06-06** (Gate ①) | **2026-06-06** (owner: "lock it") | **2026-06-06** (3 issues fixed) | **2026-06-06** (owner validated) | ✅ **FROZEN 2026-06-06** — Gate ⑤ fixes: (1) Header S7 pattern (Cabinet Grotesk, bordered date, green Apply, grouped presets, outlined Download+chevron), (2) ReportLoadingShield correct props, (3) Single-call — N+1 eliminated, pre-scans room_info+SRM. KPI: room-only. Charts/table: full folio. Occupancy Heatmap enhancement shipped. |

---

## CUSTOM REPORTS — Food Court (CR-013)

| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| **S-FC** | Food Court — Station-wise Order Breakdown | **2026-06-06** | **2026-06-07** (owner: "approved") | **2026-06-06** (live API wired — same order-logs-report) | **2026-06-07** (owner approved) | ✅ **FROZEN 2026-06-07** — CR-013. S6 clone + station dropdown. Business rules frozen: `item.price` base-only formula (no addons/variations), FE proportional discount. FE-PROPORTIONAL-001 closed as intentional divergence. |
| **S-FC-AUDIT** | Food Court Audit Tab — Station × Time Bucket Cross-Tabulation | **2026-06-07** | **2026-06-07** (owner: "approved") | **2026-06-07** (live API wired — per-order pivot, 5 metrics, proportional discount/subtotal/total, drift column, cancelled item tax exclusion, UNASSIGNED station) | **2026-06-07** (owner approved) | ✅ **FROZEN 2026-06-07** — CR-013-AUDIT. All 174 orders ₹0 drift on Jun 1 across all 5 metrics. 2 backend gaps remain (BE-ADDON-001, BE-CANCELLED-TAX-001). FE-PROPORTIONAL-001 CLOSED. |

### S-FC Business Rule Freeze (2026-06-07)

**Owner decision:** CR-013 Food Court and S5 Item Sales use intentionally different formulas. Both frozen as-is.

**CR-013 Food Court formula (FROZEN):**
```
itemTotal = item.price (= unit_price × qty, NO addons/variations)
discount  = restaurant_discount_amount × (station_share)     [FE proportional]
subTotal  = itemTotal − discount
tax       = Σ item.gst + vat WHERE food_status ≠ 3
total     = subTotal + tax
```

**Rationale:** Food Court report attributes revenue to kitchen stations by base item price. Addons/variations are excluded because they represent customizations, not station-attributable production. Proportional discount distribution ensures each station's share reflects its base revenue contribution.

**S5 Item Sales formula (FROZEN — reference only, not modified):**
```
itemTotal = unit_price × qty + total_add_on_price + total_variation_price
discount  = discount_on_food                                  [backend per-line]
subTotal  = itemTotal − discount + service_charge
```

**Rationale:** Item Sales shows full menu item cost including all customizations. Backend-distributed discount gives per-line accuracy.

**Divergence evidence (June 1, Shimla Food Court):** 29/174 orders show different Item Total due to addons (18 orders) or variations (13 orders). This is expected and intentional. Validation scripts at `/app/scripts/compare_reports.py` + `/app/scripts/dryrun_validate.py`.

**Binding:** No agent may align these formulas without explicit owner approval. FE-PROPORTIONAL-001 in OPEN_GAPS_REGISTER.md is CLOSED.

---

## PHASE 3 — Mechanical Applications of Templates (28 reports)

### Sales (4)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S11 | Daily Sales Summary | _____ | _____ | _____ | _____ | ⏳ Queued |
| S12 | Hourly Sales Curve | _____ | _____ | _____ | _____ | ⏳ Queued |
| S13 | Day-of-Week Trend | _____ | _____ | _____ | _____ | ⏳ Queued |
| S14 | Channel × Status Pivot | _____ | _____ | _____ | _____ | ⏳ Queued |

### Items — sub-tabs of S5 (4)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S15 | Variation Sales tab | _____ | _____ | _____ | _____ | ⏳ Queued |
| S16 | Addon Sales tab | _____ | _____ | _____ | _____ | ⏳ Queued |
| S17 | Complementary Items tab | _____ | _____ | _____ | _____ | ⏳ Queued |
| S18 | Station Performance tab | _____ | _____ | _____ | _____ | ⏳ Queued |

### Payments (4)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S19 | Cashier Settlement | _____ | _____ | _____ | _____ | ⏳ Queued |
| S20 | Gateway Reconciliation | _____ | _____ | _____ | _____ | ⏳ Queued |
| S21 | Tip Report | _____ | _____ | _____ | _____ | ⏳ Queued |
| S22 | Round-Off Report | _____ | _____ | _____ | _____ | ⏳ Queued |

### Tax (3)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S23 | GST / VAT Detail | _____ | _____ | _____ | _____ | ⏳ Queued |
| S24 | Tax Slab Summary | _____ | _____ | _____ | _____ | ⏳ Queued |
| S25 | Inclusive vs Exclusive Mix | _____ | _____ | _____ | _____ | ⏳ Queued |

### Discounts (2)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S26 | Discount Report | _____ | _____ | _____ | _____ | ⏳ Queued |
| S27 | Coupon Usage | _____ | _____ | _____ | _____ | ⏳ Queued |

### Cancellations (1)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S28 | Item Cancellation Detail | _____ | _____ | _____ | _____ | ⏳ Queued |

### Locations (3)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S29 | Table-wise Sales | _____ | _____ | _____ | _____ | ⏳ Queued |
| S30 | Delivery Charge Report | _____ | _____ | _____ | _____ | ⏳ Queued |
| S31 | Room Transfer Trail | _____ | _____ | _____ | _____ | ⏳ Queued |

### Staff (2)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S32 | Server / Captain Performance | _____ | _____ | _____ | _____ | ⏳ Queued |
| S33 | Cashier Activity | _____ | _____ | _____ | _____ | ⏳ Queued |

### Audit (2)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S34 | Order Edit Audit | _____ | _____ | _____ | _____ | ⏳ Queued |
| S35 | Order Note Audit | _____ | _____ | _____ | _____ | ⏳ Queued |

### Customers (2)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S36 | Repeat Customer (RFM bands) | _____ | _____ | _____ | _____ | ⏳ Queued |
| S37 | Guest vs Registered Mix | _____ | _____ | _____ | _____ | ⏳ Queued |

### Operational (1)
| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S38 | KOT-vs-Bill Variance | _____ | _____ | _____ | _____ | ⏳ Queued |

---

## PHASE 4 — Cross-cutting Hardening (3 screens)

| # | Screen | Mockup | Sign-off | API wired | API validated | Status |
|---|---|---|---|---|---|---|
| S39 | Role / Permission Settings UI | _____ | _____ | _____ | _____ | ⏳ Queued |
| S40 | Print-friendly variant template | _____ | _____ | _____ | _____ | ⏳ Queued |
| S41 | Large-dataset / Performance banner | _____ | _____ | _____ | _____ | ⏳ Queued |

---

## Exit criteria for Phases → enables Gate 3 (Implementation Plan) revision

| Phase | Exit when | Effect |
|---|---|---|
| Phase 1 (S0–S4) | All 5 screens FROZEN | Visual DNA fully locked. Sub-CR split can be drafted. |
| Phase 2 (S5–S10) | All 6 hero screens FROZEN | Section-level patterns locked. Per-section sub-CRs drafted. |
| Phase 3 (S11–S38) | All 28 mechanical screens FROZEN | Catalog complete. Final column/filter specs frozen. |
| Phase 4 (S39–S41) | All 3 hardening screens FROZEN | All edge cases covered. Implementation Plan revision triggered. |
| **All 4 phases complete** | **Implementation Plan revision** | **Then Gate 3 (Implementation Plan) revision → Gate 4 (Code Gate)** |

---

## Backend-blocked reports (parked until BE-1 / BE-3 land)

These will rejoin Phase 3 backlog when backend delivers (no schedule impact today):

- Payment Mix accuracy on partial orders (BE-1)
- Cashier Settlement accuracy on partial orders (BE-1)
- Item Sales category grouping (BE-3)
- Order Report 51-col XLSX "Cash / Card / UPI / TAB / Zomato Gold / Partial" columns (BE-1)

Coordination note: `/app/memory/memory/change_requests/impact_analysis/CR_011_BACKEND_COORDINATION_NOTE_2026_06_01.md`

---

## Cross-screen Code Gate spec

Loading / disable / cancellation behavior for every Insights report screen is governed by
`/app/memory/memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md`
(created 2026-06-01, owner-confirmed scope). Spec is **planning-only** in the visual-DNA phase;
implementation lands at Gate 4 (Code Gate) and retrofits every previously-FROZEN screen.

---

## S5 Re-open — "All Items" Tab + Punched-Date Default (Business Rule Freeze)

**Date:** 2026-06-05
**Screen:** S5 — Item Sales Hybrid (`ItemSalesHybridMockup.jsx`)
**Trigger:** Owner request to add a true "All Items" tab and flip the default date attribution to Punched Date.
**Status:** 🟡 Mockup-spec frozen (business rules only) — awaiting owner sign-off before code.
**Scope:** P0 only. Pending Billing dual-fetch (P1) and 42 REVIEW triage (P2) are explicitly OUT OF SCOPE for this freeze.

---

### 1. Default toggle (date attribution)

| Item | Current | New (frozen) |
|---|---|---|
| `paidPunchedToggle` initial state | `'collect_bill'` (Paid Date) | `'created_at'` (**Punched Date**) |

**Rule:** On screen load, the date-attribution toggle defaults to **Punched Date** (`created_at`). Owner may flip to Paid Date (`collect_bill`) per session; selection is not persisted across reloads (no change to persistence behavior).

---

### 2. New tab — "All Items"

| Item | Frozen value |
|---|---|
| Tab `id` | `all_items` |
| Tab `label` | `All Items` |
| Position in `TABS` array | **Index 0** (leftmost) |
| Default `activeTab` on screen load | `all_items` |

**Rule:** The new tab sits to the left of `Sold Items`, `Pending Billing`, `Cancelled`, `Comp` and is the landing tab when the screen opens.

---

### 3. Aggregation rule for "All Items" tab

**Grouping:**
Rows are grouped **by bucket** in the following fixed visual order:
1. **Sold** (delivered + paid items)
2. **Pending Billing** (delivered, bill not yet collected)
3. **Cancelled**
4. **Comp** (complementary)

A group separator/header is shown between buckets (consistent with FE-16 group separators already shipped on other tabs).

**Bucket assignment uses the same predicates already in use elsewhere in `ItemSalesHybridMockup.jsx`** — no new bucket definitions are introduced by this freeze.

---

### 4. Revenue rule — Cancelled & Comp = 0

| Bucket | Revenue shown in "All Items" |
|---|---|
| Sold | actual revenue |
| Pending Billing | actual (would-be) revenue |
| **Cancelled** | **₹0** (lost revenue is informational only; not added to Revenue column) |
| **Comp** | **₹0** (would-be revenue is informational only; not added to Revenue column) |

**Rule:** In the "All Items" tab, the `Revenue` column **must** display ₹0 for every Cancelled row and every Comp row, regardless of underlying item price. This ensures the All Items total row reflects only realised + realisable revenue (Sold + Pending). Qty columns remain accurate per bucket.

**Note:** This rule applies **only** to the "All Items" tab. The existing per-bucket tabs (Cancelled, Comp) retain their context-aware columns ("Lost Revenue" / "Would-be Revenue") per FE-48.

---

### 5. Default sort

| Item | Frozen value |
|---|---|
| Default sort column on "All Items" tab | **Revenue** |
| Default sort direction | **Descending** |
| Sort scope | **Within each bucket group** (group order is fixed; sort runs inside each group) |

**Rule:** Within each of the 4 bucket groups, rows are sorted by `Revenue` desc. Because Cancelled and Comp revenue = ₹0 (per §4), tie-breaking inside those two groups falls back to existing tie-break order (no new tie-break rule introduced).

---

### 6. `tabCounts` rule

`tabCounts.all_items` = sum of counts of (Sold + Pending Billing + Cancelled + Comp). No de-duplication needed because the underlying buckets are already mutually exclusive.

---

### 7. Out of scope (explicit)

The following are **NOT** part of this freeze and must not be touched in the same code pass:
- Pending Billing dual-fetch (P1) — separate plan
- 42 REVIEW items triage (P2)
- 11 OVER TAXED / 4 TAX NOT COMPUTED bugs (P2)
- Any change to Cancelled or Comp tab columns/behavior
- Any change to existing Sold Items tab behavior
- Any export/Excel/PDF builder logic (`reportExporter.js`)
- Any change to side-sheet drill (S3)

---

### 8. Gate sequence

```
①  Business rule freeze (this entry)           ← DONE 2026-06-05
②  Owner sign-off ("lock it" reply)            ← DONE 2026-06-05 (owner verbatim: "lock it")
③  Code change in ItemSalesHybridMockup.jsx    ← DONE 2026-06-05
④  Smoke screenshot (owner@cafe103.com)        ← DONE 2026-06-05 (verified: All Items tab, bucket separators, ₹0 revenue for cancelled/comp, Punched Date default)
⑤  Owner data validation                       ← PENDING
⑥  Frozen
```

### 8a. Post-lock owner revisions (2026-06-05)

| # | Directive | Status |
|---|-----------|--------|
| R1 | Tab order changed: All → Sold → Cancelled → Comp → Pending → Top Sellers → Slow Movers | SHIPPED |
| R2 | Attribution toggle (Paid Date / Punched Date) removed entirely | SHIPPED |
| R3 | All audit badges/tinting/separators removed from data tabs | SHIPPED |
| R4 | Tab renames: "Sold Items" → "Sold", "Cancelled Lines" → "Cancelled" | SHIPPED |
| R5 | Re-fetch fix: hardcoded `created_at`, removed from deps — instant tab switching | SHIPPED |
| R6 | Hybrid · S5 chip removed | SHIPPED |
| R7 | Audit tab env-gated: `REACT_APP_SHOW_AUDIT_TAB` (preprod=true, production=false) | SHIPPED |
| R8 | Cancelled + Comp tabs: "REVENUE LOSS" in red (summary strip + table cells) | SHIPPED |
| R9 | 42 REVIEW rules batch-approved in auditManifest.js | SHIPPED |
| R10 | Route swap: `/reports-module/items` → S5 (replaces old S2) | SHIPPED |
| R11 | Future date cap: `max={today}` on both From and To date inputs | SHIPPED |
| R12 | Bucket summary bar on All Items tab (Sold/Pending/Cancelled/Comp totals) | SHIPPED |
| R13 | Station summary table on All Items tab (Sold bucket, alphabetical) | SHIPPED |
| R14 | Excel/PDF: "By Station" + "By Category" summary sheets (Sold bucket, alphabetical) | SHIPPED |

---

*Log auto-updated by main agent on every gate transition. Manual editing forbidden — go through the protocol.*

---
## AMENDMENT 2026-06-11 — S9 Cancellations (BUG-125, Wave GO-1)
Owner GO-1 received 2026-06-11 ("go 1 only"). Per-screen amendment per H34.
| Change | Detail |
|---|---|
| S9 order-scope predicate | `pm === 'cancelled'` (dead string, 0 matches live) → `String(f_order_status) === '3' \|\| pm === 'cancel' \|\| pm === 'cancelled'` (H1=b). Merge guard KEPT (upstream `pm === 'merge'` continue). Totals unchanged — order/item partition only. Gate-4 doc: memory/bugs/GO1_CODE_GATE_2026_06_11.md |

---
## AMENDMENT 2026-06-11 — S7 Sales · S8 Payments (Wave GO-2)
Owner GO-2 received 2026-06-11 ("go 2"). Per-screen amendments per H34.
| Screen | Change |
|---|---|
| S7 Sales | Basis switch punch→COLLECTION (`REVENUE_BASIS='collect'`): fs6 by collect_bill business day, room food INCLUDED (CR-029), TAB punched EXCLUDED, TAB settlements ADDED as 'Credit' (H5/R1). TAB GST stays in tax. Header label added. Payment mix via shared classifier (CR-032) + Room channel surfaces. Acceptance: daily total == daily-sales `paid_revenue` — harness 31/31 March exact |
| S8 Payments | Same pipeline. Local classifier → shared `utils/paymentClassifier.js` (CR-032). 'TAB / Credit' KPI → 'Credit Settled' (money-in). Buckets: Cash/Card/UPI/Credit/Room Bill/Partial/Zomato Gold. Header label added |
| (Dashboard) | Not frozen, recorded for completeness: revenue tiles collection-dated; Credit Outstanding tile (BUG-127, R2-AMEND) from restaurant-tap-summary, "as of today" |
Gate-4 doc: memory/change_requests/code_gates/GO2_CODE_GATE_2026_06_11.md

---
## AMENDMENT 2026-06-11 — S9 Cancellations · S5 Items & Menu (Wave GO-3)
Owner GO-3 received 2026-06-11 ("go 3"). Per-screen amendments per H34.
| Screen | Change |
|---|---|
| S9 Cancellations | Attribution punch→CANCEL date (H21): 45d-lookback fetch (+1 tail), rows gated by cancel_at business day; shared valuation module (H18/H19/H22); order-scope loss via OPS-CANCEL (`previous_order_amount` else line consolidation); label "By cancellation date". Cross-month cancels now surface (4 in May) |
| S5 Items & Menu | NEW "Added to Credit" bucket/tab (CR-034: parent pm='TAB'; precedence Cancelled→Comp→Credit→Sold→Pending; Sold+Credit ≡ old Sold to the rupee, Credit May = ₹49,460 exact). Cancelled bucket by cancel_at (CR-031). Comp valued at complementary_price (H22). Label "By punch date" |
| (Dashboard) | Cancel tile on shared module + dedicated 45d cancel fetch → identity with S9 by construction; counts qty-based (H20) |
Gate-4 doc: memory/change_requests/code_gates/GO3_CODE_GATE_2026_06_11.md

---
## AMENDMENT 2026-06-11 — S5/S7/S8/S9 + Dashboard (CR-035, visual-only)
"ⓘ Definitions" inline link appended to the existing basis-label line on Sales, Payments,
Items & Menu, Cancellations and Dashboard headers → routes to new static page
`/reports-module/definitions`. ZERO data/aggregation changes. Gate-4 doc:
memory/change_requests/code_gates/CR_035_CODE_GATE_2026_06_11.md
