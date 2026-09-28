# CR-390 — Impact Analysis
## Screen Reference PDFs for ALL Modules — committed, repeatable pipeline

> **CURRENT AMENDMENT — 2026-09-28:** Step 1 analysis complete; **OD-390-16…22 LOCKED FOR PLANNING**. Owner selected Palm House Normal, Kunafa Mahal Aggregator, and Palm House Premium for switching/comparison only; no Party setup. See `CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` §7. Code reality PARTIAL; recovery risk CRITICAL. **Await separate Step 2 instruction; Gate 3 NOT STARTED, no new Gate 4 GO.** Original pipeline design below is historical, not capture authorization. No source/original assets changed; no external asset acceptance implied.

**Gate:** 2 — Impact Analysis
**Date:** 2026-09-27
**Planning agent:** PLANNING role (v0.7)
**Sprint:** `modules_pdf`
**Risk:** LOW — zero change to `frontend/src/` runtime code (confirmed below)

---

## Code Reality: NONE (for new pipeline code)

```bash
grep -rn "CR-390\|screen.reference\|screen_reference\|generate_pms_pdf" /app/frontend/src/
# Result: 0 hits
```

- PMS Screen Reference PDFs (`public/MyGenie_PMS_Screen_Reference.pdf` v2.0 + v1.0) exist — these are deliverable artifacts, not pipeline code.
- Generator scripts (`generate_pms_pdf_v2.py`, `pms_dummy_data.py`) are ABSENT from repo (confirmed: `ls /app/frontend/scripts/` → only `gen_dashboard_sync.py`; `ls /app/*.py` → none).
- `frontend/scripts/screen-reference/` does NOT exist → all new work.
- `memory/design_briefs/downloads/screen_reference/` does NOT exist → new output directory.

**Conclusion:** Code Reality = NONE for pipeline. Proceed with full plan.

---

## Conflict Pre-Check

| File / Directory | Last CR to touch | Risk |
|---|---|---|
| `frontend/scripts/screen-reference/` | NOT EXISTS — no prior ownership | CLEAN |
| `memory/design_briefs/downloads/screen_reference/` | NOT EXISTS | CLEAN |
| `frontend/public/*.pdf` | CR-372 carve-out (PMS PDFs, temporary) | Note: PMS PDFs will be MOVED (not modified) to `memory/design_briefs/` during M6 regen, closing the CR-372 carve-out — does not conflict with any active CR |
| `frontend/src/**` | NOT TOUCHED by CR-390 | CLEAN |
| `memory/evidence/CR-390/` | Created at INTAKE — empty structure | CLEAN |

**Conflict result: CLEAN. No parallel-safety issues. No execution ordering constraints.**

---

## Risk Classification

| Field | Value |
|---|---|
| Risk | **LOW** |
| Trigger | Zero change to `frontend/src/` runtime code (OD-390-01a/b confirmed). New files in `scripts/` and `memory/` only. |
| Upgrade condition | Would become MEDIUM only if OD-390-01=(c) demo-mode flag — locked as DEFERRED, not (c). |
| Financial logic | NONE (R6 N/A) |
| R5 hotspot files | NOT modified; `OrderEntry.jsx`/`DashboardPage.jsx` only *rendered* for screenshots |
| Fast Lane eligible | NO — multi-file tooling, ~90-100 screens |

---

## What the Pipeline Does (Data Flow)

```
Owner provides credentials (per module, at Gate 4)
        ↓
runner.py  (Playwright Python)
  ├─ authenticates at https://preprod.mygenie.online via /api/v1/auth/vendoremployee/login
  ├─ reads manifest/<MODULE>.json → journey (route list + pre-actions per state)
  ├─ navigates to each route in journey order
  ├─ executes pre-actions (click, wait, type — to reach interaction states)
  ├─ DOM-swaps restaurant name → "Sharma Hotel & Restaurant" (OD-390-02)
  ├─ page.screenshot() → PNG at 1440×900
  └─ saves: memory/evidence/CR-390/<MODULE>/NN_<slug>.png
        ↓
assemble.py  (Python + fpdf2 + pypdf)
  ├─ reads PNGs from evidence dir
  ├─ reads manifest for page metadata (section, title, description, badge number)
  ├─ reads persona.json + config/template.json
  ├─ generates per-module PDF:
  │    cover page → contents → per-page (badge + eyebrow + title + desc + screenshot + footer)
  │    footer: "Sample data · © MyGenie 2026"  (OD-390-14b)
  │    cover line: "All figures are sample data for illustration purposes only"  (OD-390-14b)
  ├─ saves: memory/design_briefs/downloads/screen_reference/<MODULE>/MyGenie_<Module>_Screen_Reference_v1_<date>.pdf
  └─ saves PNG pack: memory/evidence/CR-390/<MODULE>/pack/
        ↓
master_assemble.py  (Python + pypdf)
  ├─ reads all per-module PDFs (in OD-390-07 sequence)
  ├─ inserts module divider pages
  └─ saves: memory/design_briefs/downloads/screen_reference/MyGenie_Complete_Screen_Reference_v1_<date>.pdf
```

---

## Module × Route Inventory (code-verified from App.js 2026-09-27)

### MM — Menu Management
| # | Route | Component | Est. states |
|---|---|---|---|
| 1 | `/menu` | MenuManagementPage | 2 (categories list, item list expanded) |
| 2 | `/menu` + add-item drawer | MenuManagementPage | 2 (add item form, variation panel) |
| 3 | `/menu` + bulk editor | BulkEditor | 1 (bulk table) |
| 4 | `/visibility/status-config` | StatusConfigPage | 2 (availability overview, category toggle) |
*Journey order: PENDING sub-gate G-journey (owner approves at module start)*

### EM — Expenses Management
| # | Route | Component | Est. states |
|---|---|---|---|
| 1 | `/expense-setup` | ExpenseSetupPage | 2 (categories list, add category form) |
| 2 | `/expenses` | ExpenseEntryPage | 2 (log list, add entry form) |
*Journey order: PENDING sub-gate G-journey*

### IM — Inventory Management
| # | Route | Component | Est. states |
|---|---|---|---|
| 1 | `/inventory-setup` | InventorySetupPage | 2 (ingredient list, edit ingredient drawer) |
| 2 | `/inventory-smart-purchase` | SmartPurchasePage | 2 (smart list, vendor preview) |
| 3 | `/inventory-receive` | InventoryReceivePage | 1 (receive form) |
| 4 | `/inventory-current-stock` | InventoryCurrentStockPage | 2 (stock table, search filtered) |
| 5 | `/inventory-sub-recipe-stock` | SubRecipeStockPage | 1 (sub-recipe table) |
| 6 | `/inventory-audit` | StockAuditPage | 2 (audit list, edit row) |
| 7 | `/inventory-dashboard` | InventoryIntelligencePage | 2 (dashboard tiles, low-stock list) |
| 8 | `/recipes` | RecipeManagementPage | 2 (recipe list, recipe detail) |
*Journey order: PENDING sub-gate G-journey*

### DC — Day Closure & Settlement
| # | Route | Component | Est. states |
|---|---|---|---|
| 1 | `/settlement/preview` | SettlementMockup | 2 (settlement overview, cashier row expanded) |
| 2 | `/reports-module/cashier-settlement` | CashierSettlementMockup | 2 (cashier table, cashier detail) |
| 3 | `/day-closure` | DayClosurePage | 2 (day closure summary, confirm modal) |
| 4 | `/reports-module/settlement` | SettlementReportMockup | 2 (settlement report table, date filter) |
*Journey order: PENDING sub-gate G-journey*

### CM — Credit Management
| # | Route | Component | Est. states |
|---|---|---|---|
| 1 | `/credit` | CreditManagementPage | 3 (ledger list, customer drill-down, collect payment) |
*Journey order: PENDING sub-gate G-journey*

### DR — Daily Report (OD-390-11 locked)
| # | Route | Component | Est. states |
|---|---|---|---|
| 1 | `/reports-module/profit-loss` | PLReportPage | 2 |
| 2 | `/reports-module/expense-report` | ExpenseReportPage | 2 |
| 3 | `/reports-module/purchase-report` | PurchaseReportPage | 2 |
| 4 | `/reports/summary` | OrderSummaryPage | 2 (summary KPIs, detail table) |
| 5 | `/reports/audit` | AllOrdersReportPage | 2 (order list, order detail) |
| 6 | `/reports-module/settlement` | SettlementReportMockup | 1 (already in DC — reference only) |
*Journey order: PENDING sub-gate G-journey*

### IN-Basic — Insights Basic (13 reports, OD-390-12 locked)
| Route | Label |
|---|---|
| `/reports-module/dashboard` | Sales Dashboard |
| `/reports-module/sales` | Sales Overview |
| `/reports-module/daily-sales` | Daily Sales |
| `/reports-module/hourly-sales` | Hourly Sales |
| `/reports-module/day-of-week` | Day-of-Week Trend |
| `/reports-module/items-hybrid` | Items Ledger |
| `/reports-module/item-sales` | Item Sales |
| `/reports-module/payments` | Payments Overview |
| `/reports-module/cashier-settlement` | Cashier Settlement |
| `/reports-module/discounts` | Discount Report |
| `/reports-module/cancellations` | Cancellations |
| `/reports-module/locations-tables` | Table-wise Sales |
| `/reports-module/expense-report` | Expense Report |
*Journey order: sidebar order (catalogue module — per OD-390-04 hybrid recommendation). Still subject to G-journey owner approval.*

### IN-Advanced — Insights Advanced (23 reports, OD-390-12 locked)
| Route | Label |
|---|---|
| `/reports-module/channel-pivot` | Channel & Payment |
| `/reports-module/variation-addon-sales` | Variation & Addon |
| `/reports-module/order-ledger` | Orders Ledger |
| `/reports-module/gateway-recon` | Gateway Recon |
| `/reports-module/tips` | Tip Report |
| `/reports-module/round-off` | Round-Off |
| `/reports-module/tax-detail` | GST/VAT Detail |
| `/reports-module/tax-slabs` | Tax Slabs |
| `/reports-module/tax-calc` | Inclusive/Exclusive |
| `/reports-module/coupons` | Coupon Usage |
| `/reports-module/cancel-detail` | Item Cancel Detail |
| `/reports-module/order-notes` | Order Notes |
| `/reports-module/locations-delivery` | Delivery Charges |
| `/reports-module/locations-transfers` | Room Transfers |
| `/reports-module/staff-servers` | Server Performance |
| `/reports-module/staff-cashiers` | Cashier Activity |
| `/reports-module/audit-log` | Order Edit Audit |
| `/reports-module/customers-rfm` | Customer Intelligence |
| `/reports-module/customers-mix` | Guest vs Registered |
| `/reports-module/kitchen-ops` | Kitchen Ops |
| `/reports-module/kot-variance` | KOT Variance |
| `/reports-module/room-orders` | Room Orders |
| `/reports-module/food-court` | Food Court |
*Beta routes excluded (OD-390-12): food-court-beta, customers-intel-beta, customers-gvr-beta, order-report-beta.*
*Journey order: sidebar group order. Subject to G-journey owner approval.*

### PMS — PMS redo
*DEFERRED — journey defined after PMS work settles (OD-390-13). Sequenced last.*

---

## New Files / Directories (complete list)

| # | Path | Type | Description |
|---|---|---|---|
| N1 | `frontend/scripts/screen-reference/runner.py` | NEW | Playwright screenshot runner |
| N2 | `frontend/scripts/screen-reference/assemble.py` | NEW | Per-module PDF assembler (fpdf2) |
| N3 | `frontend/scripts/screen-reference/master_assemble.py` | NEW | Master PDF assembler (pypdf merge) |
| N4 | `frontend/scripts/screen-reference/persona.json` | NEW | Shared fictional business persona (OD-390-02) |
| N5 | `frontend/scripts/screen-reference/config/template.json` | NEW | PDF template config (cover, footer, badge, accent) |
| N6 | `frontend/scripts/screen-reference/manifests/MM_menu.json` | NEW | MM route inventory + journey placeholder |
| N7 | `frontend/scripts/screen-reference/manifests/EM_expenses.json` | NEW | EM route inventory |
| N8 | `frontend/scripts/screen-reference/manifests/IM_inventory.json` | NEW | IM route inventory |
| N9 | `frontend/scripts/screen-reference/manifests/DC_day_closure.json` | NEW | DC route inventory |
| N10 | `frontend/scripts/screen-reference/manifests/CM_credit.json` | NEW | CM route inventory |
| N11 | `frontend/scripts/screen-reference/manifests/DR_daily_report.json` | NEW | DR route inventory (OD-390-11) |
| N12 | `frontend/scripts/screen-reference/manifests/INB_insights_basic.json` | NEW | IN-Basic route inventory (OD-390-12) |
| N13 | `frontend/scripts/screen-reference/manifests/INA_insights_advanced.json` | NEW | IN-Advanced route inventory (OD-390-12) |
| N14 | `frontend/scripts/screen-reference/manifests/PMS_pms.json` | NEW | PMS placeholder (journey DEFERRED OD-390-13) |
| N15 | `frontend/scripts/screen-reference/README.md` | NEW | Pipeline usage instructions |
| N16 | `memory/design_briefs/downloads/screen_reference/` | NEW DIR | Output location for all PDFs (OD-390-06) |
| N17 | `memory/evidence/CR-390/<MODULE>/` | NEW DIRs | PNG packs per module (OD-390-05) |

**Files WILL NOT touch:**
- `frontend/src/**` (zero runtime impact)
- `frontend/public/**` (PMS PDFs stay until M6 regen)
- `frontend/package.json` (playwright available via system Python, no yarn add needed)
- `.env`, supervisor configs, `AppProviders.jsx`, all R5 hotspots

---

## Dependencies

| Dependency | Status | Notes |
|---|---|---|
| `playwright` (Python) | Available system-wide | Used by testing agents — no install needed |
| `fpdf2` | Needs `pip install fpdf2` | For per-module PDF layout |
| `pypdf` | Needs `pip install pypdf` | For master PDF merge |
| `pillow` | Likely installed | For image resizing/optimization |

Install command (pre-implementation): `pip install fpdf2 pypdf pillow`

---

## Sub-Gate G-Journey (mandatory pre-execution gate per module)

Per OD-390-04, **before any module pipeline run:**
1. Agent drafts the ordered screen list (journey) from the route inventory above
2. Agent presents the journey to the owner in the session
3. Owner approves or modifies the journey
4. Agent locks `journey_approved: true` + `journey_approved_date` in manifest
5. Only then: runner.py executes for that module

This gate applies to every module. No shortcuts.

---

## Per-Module Execution Cycle (one cycle per module, 9 total)

```
1. G-journey: agent drafts journey → owner approves → manifest locked
2. Owner provides credentials for this module's restaurant account
3. runner.py --module <CODE> --url <preprod> --email ... --password ...
4. PNGs land in memory/evidence/CR-390/<MODULE>/
5. assemble.py --module <CODE>  →  per-module PDF in design_briefs/downloads/screen_reference/<MODULE>/
6. Owner reviews PDF → feedback
7. If revisions: re-run targeted screenshots only → re-assemble
8. Owner approves → PDF edition v1.0 locked
9. After all modules done: master_assemble.py → master PDF
```

---

## Impact Summary

| Area | Impact |
|---|---|
| `frontend/src/` runtime | ZERO |
| `frontend/scripts/screen-reference/` | NEW — 15 files across pipeline + manifests + config |
| `memory/design_briefs/downloads/screen_reference/` | NEW — 9 per-module PDFs + 1 master PDF (generated, not coded) |
| `memory/evidence/CR-390/` | NEW — 9 PNG pack directories (generated) |
| `frontend/public/` | UNCHANGED now; PMS PDFs moved during M6 regen (closes CR-372 carve-out) |
| Blast radius | SMALL (0 runtime files; large surface via ~90-100 screenshots) |
