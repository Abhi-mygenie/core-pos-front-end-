# SESSION HANDOVER — oct_cr_batch (10-item batch)

**Date:** 2026-10-12
**From:** INTAKE / INVESTIGATION session (13 items processed; CR-408/409/411 shipped)
**To:** Next agent — process the 10 remaining items **as a single batch**
**Entry role:** PLANNING (Gate 2 Impact Analysis) → PLANNING (Gate 3 Plan) → owner "Gate 4 GO" → IMPLEMENTATION → QA

---

## 0. 4-LINE STATE HEADER

- **Sprint:** `oct_cr_batch`
- **Shipped last session:** CR-408 (coupon auto-apply removed), CR-409 (scan-order coupon pre-load — *to be reverted by CR-413*), CR-411 (cart persistence) — all GATE_5A_IMPLEMENTED, pending Gate 5b QA.
- **This batch:** 10 items at GATE_1_INTAKE (8 actionable now, 1 deferred, 1 backend-blocked).
- **Hard rule:** NO code until owner says verbatim **"Gate 4 GO"**. Gates 2 (Impact Analysis) + 3 (Plan) are doc-only.

---

## 1. BATCH OVERVIEW — EXECUTION ORDER

Process in this order (quick wins → risky). Each item needs Gate 2 → Gate 3 → Gate 4 GO → Impl → QA.

| # | ID | Title | Risk | Files | ODs open? | Test |
|---|----|-------|------|-------|-----------|------|
| 1 | **BUG-540** | P&L expenses column + KPI wrong value/label | LOW | `PLReportPage.jsx` | none | Screenshot |
| 2 | **BUG-536** | SC-GST missing from manual bill print | CRITICAL | `orderTransform.js` | none | testing_agent (both) |
| 3 | **BUG-539** | Report pages header wrap + table clip | LOW-MED | `PLReportPage.jsx` (+others) | **OD-539-01** | Screenshot |
| 4 | **BUG-538** | Role-based discount not wired to CPP | CRITICAL | `OrderEntry.jsx` + `CollectPaymentPanel.jsx` | **OD-538-01** | testing_agent (FE) |
| 5 | **CR-413** | Remove CR-409 coupon pre-load from CPP | CRITICAL | `CollectPaymentPanel.jsx` + `OrderEntry.jsx` | locked (OD-INV-01=A) | testing_agent (FE) |
| 6 | **CR-412** | Loyalty pre-tick when `redeemed=true` | CRITICAL | `orderTransform.js` + `CollectPaymentPanel.jsx` + `OrderEntry.jsx` | locked (OD-INV-02=B) | testing_agent (FE) — **blocked by CR-410** |
| 7 | **BUG-537** | Dashboard broken on Android tablets (problem) | HIGH | — (report parent of CR-414) | locked | Screenshot |
| 8 | **CR-414** | Dashboard tablet responsive redesign (fix) | HIGH | `Header.jsx` + `ChannelColumn.jsx` + `ChannelColumnsLayout.jsx` | **OD-414-01/02** | Screenshot (600/768/1280px) |
| 9 | **CR-415** | Sidebar cleanup (Coming Soon + duplicates) | LOW | `Sidebar.jsx` | **DEFERRED — needs owner list** | Screenshot |
| 10 | **CR-410** | Expose loyalty key in order API/socket | CRITICAL | backend brief filed | **BACKEND-BLOCKED** | Both |

**Recommended grouping:**
- **Wave 1 (quick wins, no ODs):** BUG-540, BUG-536 — start here.
- **Wave 2 (joint, same files, ODs locked):** CR-413 + CR-412 — one gate cycle (both touch `CollectPaymentPanel.jsx`+`OrderEntry.jsx`). **CR-412 blocked until backend ships `loyalty_info` in socket (CR-410)** — CR-413 can proceed alone.
- **Wave 3 (needs owner ODs):** BUG-538 (OD-538-01), BUG-539 (OD-539-01).
- **Wave 4 (tablet, needs ODs):** BUG-537 + CR-414 (OD-414-01/02).
- **Deferred/blocked:** CR-415 (owner list), CR-410 (backend).

---

## 2. PENDING OWNER DECISIONS (must resolve before those items' Gate 2)

| OD | Item | Question | Agent rec |
|----|------|----------|-----------|
| **OD-538-01** | BUG-538 | No-permission discount UI: (A) hidden / (B) visible-but-disabled | **B** |
| **OD-539-01** | BUG-539 | Fix (A) all report pages / (B) P&L only first | — |
| **OD-414-01** | CR-414 | Channel dropdown: (A) downward overlay / (B) inline | **A** |
| **OD-414-02** | CR-414 | `< >` column count persists on tablet? (A) yes / (B) tablet auto-only | **A** |
| **CR-415 list** | CR-415 | Owner's final confirmed list of links to remove/hide | — |

OD-537-01/02/03 (BUG-537) and OD-INV-01/02 + OD-GAP3 (CR-412/413) are **LOCKED** — see per-item detail.

---

## 3. PER-ITEM DETAIL (exact fixes — verify line numbers at Gate 3 Entry Verification, code may have drifted)

### ITEM 1 — BUG-540 · P&L expenses data (LOW · `PLReportPage.jsx` only · ~4 lines)
`/reports-module/profit-loss`. API: `GET /api/v1/vendoremployee/profit-loss-report`.
- **Bug A (row):** L115 `expenses: numStr(r.total_expenses)` (=₹200 combined) → `numStr(r.expenses)` (=₹100 pure).
- **Bug B (KPI):** L90 add `totalExpensesCombined: numStr(s.total_expenses_combined)` to summary useMemo. L224 KPI label `"Total Expenses"` → `"Total Expenses and Purchases"`, value `summary.totalExpenses` → `summary.totalExpensesCombined`.
- **Keep unchanged:** TOTAL footer row L303 uses `summary.totalExpenses` (sum of pure expenses) — correct, leave it.
- Planning-skip eligible (1 file, ≤10 lines, not R5, but IS financial-display → owner approval still needed per R6). Test: screenshot of P&L page.

### ITEM 2 — BUG-536 · SC-GST missing from manual bill print (CRITICAL · `orderTransform.js` R5 · 2 lines)
API: `POST /api/v1/vendoremployee/order-temp-store`. Fn `buildBillPrintPayload`.
- Collect-Bill path (L1886–1962) is CORRECT (L1954 `gst_tax += serviceChargeAmount * scTaxRate`).
- Manual-print path (L1964–2011) never adds SC GST. After L2010 (`gst_tax = Math.round(gst_tax * 100) / 100;`) insert:
```javascript
const scTaxRateManual = (overrides.serviceChargeTaxPct || 0) / 100;
gst_tax = Math.round((gst_tax + serviceChargeAmount * scTaxRateManual) * 100) / 100;
```
- Safe for all callers: `OrderCard` + `PrintBillButton` already pass `serviceChargeTaxPct`; `FolioCheckoutPanel` + report reprints pass `{}` → `+0`, no regression.
- R5 + R6 (financial). Owner approval + regression required. Test: testing_agent (both — curl the temp-store payload + UI print).

### ITEM 3 — BUG-539 · report page layout (LOW-MED · `PLReportPage.jsx` + maybe other report pages)
- **Header wrap (L175):** `<div className="flex items-center justify-between mb-6">` → add `flex-wrap gap-y-2` so date controls drop to 2nd line on narrow widths.
- **Table clip (L264):** wrap `<table>` in `<div className="overflow-x-auto">` inside the `overflow-hidden` container.
- **OD-539-01** decides whether to apply to all report pages (audit Expense/Purchase/Settlement report pages for same skeleton) or P&L only. Test: screenshot desktop (sidebar open ~1366) + 390px.

### ITEM 4 — BUG-538 · role-based discount wiring (CRITICAL · `OrderEntry.jsx` R5 + `CollectPaymentPanel.jsx` R5)
- `OrderEntry.jsx` L334 `const canDiscount = hasPermission('discount')` is declared but NEVER passed to CPP.
- `restaurantSettingsTransform.js` L98 maps `roleBaseDiscount` correctly — DO NOT touch it.
- Fix: pass `canDiscount` prop OrderEntry → CPP. In CPP add prop `canDiscount = true`, compute `const discountAllowed = !restaurantSettings?.roleBaseDiscount || canDiscount;` and gate the discount selector+input per **OD-538-01** (hide vs disable) with hint "Discount requires manager role".
- Test: testing_agent FE — login as staff without `discount` perm → section locked; with perm → usable.

### ITEM 5 — CR-413 · remove CR-409 coupon pre-load (CRITICAL · `CollectPaymentPanel.jsx` R5 + `OrderEntry.jsx` R5 · ~12 lines removed)
**OD-INV-01 = A (LOCKED):** cashier must always choose coupon; CPP coupon field opens blank for all order types.
- REMOVE CR-409 **E-2**: CPP `initialCoupon=null` prop (L76–77) + mount useEffect L333–342 (`setSelectedCoupon(initialCoupon)`).
- REMOVE CR-409 **E-3**: OrderEntry `initialCoupon` shape build + prop pass (~L1936–1953).
- **KEEP CR-409 E-1** (`orderTransform.js` coupon fields in `fromAPI.order`) — still used by `AggregatorOrderPopOut`, `OrderDetailSheet`, `orderLedgerService`.
- KEEP test `orderTransform.cr409.test.js` (tests E-1 only).
- Test: testing_agent FE — scan order with coupon → CPP opens with empty coupon field.

### ITEM 6 — CR-412 · loyalty pre-tick (CRITICAL · `orderTransform.js` + `CollectPaymentPanel.jsx` + `OrderEntry.jsx`, all R5 · ~15 lines)
**OD-INV-02 = B (LOCKED):** pre-tick loyalty whenever `loyalty_info.redeemed = true`, regardless of `redeemed_amount` (even 0).
**OD-GAP3 (LOCKED):** backend will add `loyalty_info` to `update-order` socket payload — no FE socket guard needed.
- Layer A: `orderTransform.js` `fromAPI.order` — add `loyaltyRedeemed: api.loyalty_info?.redeemed === true` (confirm exact field at Gate 2 via probe).
- Layer B: CPP — add `initialLoyalty` prop + mount useEffect to seed `useLoyalty`.
- OrderEntry — pass `initialLoyalty` prop.
- **BLOCKER:** backend must ship `loyalty_info` in socket first → see CR-410 brief `backend_briefs/BACKEND_BRIEF_CR-410_LOYALTY_KEY_2026_10_11.md`. LIST-API path works today; socket path blocked. Can implement FE and test LIST path; socket pre-tick validated once backend ships. Test: testing_agent FE (probe orders 1233149 redeemed=true/amount=7, 1233147 redeemed=true/amount=0).

### ITEM 7 — BUG-537 · dashboard tablet (problem report, parent of CR-414)
ODs LOCKED: OD-537-01 both 600px+768px; OD-537-02 single-row tablet header (remove Web/POS counters, channel pills → compact multiselect dropdown, all selected default, no 2nd row); OD-537-03 channels stack vertically <768px, cards `minmax(140px,1fr)` auto-fill, `< >` arrows still work, desktop 1280px+ unchanged. Implementation lives in CR-414.

### ITEM 8 — CR-414 · dashboard tablet responsive redesign (HIGH · 3 files)
- `Header.jsx`: `sm:hidden` on Web/POS counters; new compact channel multiselect dropdown (per OD-414-01 direction); `md:flex` guard on existing pills. Target single row at 600px: `[Logo][≡ Channels ▼][Search flex-1][+ Add]`.
- `ChannelColumn.jsx` L284: CSS grid `repeat(${actualColumns}, 160px)` → `repeat(auto-fill, minmax(140px,1fr))` at tablet breakpoint; keep fixed 160px desktop.
- `ChannelColumnsLayout.jsx` L19/L92: add `flex-col md:flex-row` so channels stack vertically on tablet, side-by-side on desktop.
- DO NOT touch `DashboardPage.jsx` (R5). Needs OD-414-01/02. Verification matrix V-1..V-9 in intake doc. Test: screenshots at 600, 768, 1280px.

### ITEM 9 — CR-415 · sidebar cleanup (LOW · `Sidebar.jsx` only) — DEFERRED
4 Coming Soon items (`item-report`, `operating-hours`, `cancellation-reasons`, `food-mapping`) + duplicates (Expense Report ×2, Customer Intelligence Beta/non-beta, Guest vs Registered Beta/non-beta, Front Desk legacy/Beta, Settings triple). **Needs owner's final confirmed list before Gate 2.**

### ITEM 10 — CR-410 · expose loyalty key (CRITICAL) — BACKEND-BLOCKED
Backend brief: `backend_briefs/BACKEND_BRIEF_CR-410_LOYALTY_KEY_2026_10_11.md`. Awaiting backend to deliver dedicated loyalty key in socket payload + order API. Unblocks CR-412 socket path. Keep PARKED until backend confirms.

---

## 4. GATE DISCIPLINE REMINDERS (from AGENT_PROMPT_ALPHA v0.7)

- **R3:** don't invent business rules — resolve ODs with owner first.
- **R5 hotspots touched this batch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx` (imported only) → file-level plans + regression checklists mandatory.
- **R6 financial (owner approval + regression):** BUG-540 (expense display), BUG-536 (tax), BUG-538 (discount), CR-412/413 (coupon/loyalty).
- **R18:** every modified file needs a `// BUG-XXX` / `// CR-XXX` marker.
- **EXIT GATE (5 checks)** before any handover: registry.json sync, CR_REGISTRY.md row, FILE_OWNERSHIP.md, code markers, `yarn build` 0 new warnings.
- **Yarn only.** Build check: `yarn build` must exit 0.
- Per-item final response format: use the IMPLEMENTATION / QA templates in the prompt.

---

## 5. ARTIFACTS ALREADY ON DISK

Intakes (all in `/app/memory/change_requests/`): BUG-536/537/538/539/540, CR-412/413/414/415 `_INTAKE.md`.
Investigations: `INV-SC-GST-PRINT_INVESTIGATION_REPORT.md`, `INV-LOYALTY-COUPON-SCAN-OCT12_INVESTIGATION_REPORT.md`.
Backend brief: `backend_briefs/BACKEND_BRIEF_CR-410_LOYALTY_KEY_2026_10_11.md`.
Evidence: `evidence/BUG-537/`, `evidence/INV-LOYALTY-COUPON-SCAN-OCT12/`.
Next to create at Gate 2/3: `impact/<ID>_IMPACT_ANALYSIS.md` + `plans/<ID>_IMPLEMENTATION_PLAN.md` per item.

---

## 6. CREDENTIALS

Owner (RID 69, The Goan Kitchen): `owner@thegoankitchen.com` / `Qplazm@10` (see `/app/memory/test_credentials.md` / PRD).
Prior-session owner alias also in registry: `owner@kunafamahal.com`. External backend `preprod.mygenie.online`, socket `presocket.mygenie.online`.

---

## 7. FIRST ACTIONS FOR NEXT AGENT

1. Read this handover + the 10 intake docs.
2. Ask owner the 5 pending decisions in §2 (and whether to defer CR-415 / keep CR-410 parked).
3. Enter PLANNING role → Gate 2 Impact Analysis for Wave 1 (BUG-540, BUG-536) first, then the rest in order.
4. Do NOT code until owner says "Gate 4 GO".
