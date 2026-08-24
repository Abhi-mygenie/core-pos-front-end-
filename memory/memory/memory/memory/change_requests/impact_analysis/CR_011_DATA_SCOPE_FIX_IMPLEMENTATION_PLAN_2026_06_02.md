# CR-011 — Implementation Plan: Data-Scope Fix (Option 1)

**Date:** 2026-06-02
**Owner CR:** CR-011 — Complete Reports Module (POS 4.0)
**Related decision artifact:** `CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md`
**Author directive:** Owner *"first i need detailed planning and to be documented without missing anything"* — this document is that plan.
**Status:** PLAN DRAFT — awaiting owner sign-off before code change.
**Affects:** `insightsService.js` (service), `ItemSalesMockup.jsx` (frozen S2 — re-open per §7), `ItemSalesHybridMockup.jsx` (S5), `ItemDrillSheet.jsx` (side-sheet, S3 template — needs decision), per-screen export payload builder.

---

## 0. Reading order

1. `CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md` — the decision (Option 1 chosen)
2. `CR_011_SCREEN_FREEZE_PROTOCOL.md` §7 — the re-open mechanism
3. This document — the step-by-step implementation
4. `CR_011_LOADING_AND_INTERACTION_SPEC.md` — no change required (no loading-state delta)
5. `CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md` — no change required (export contract unchanged)

---

## 1. Scope summary

### 1.1 In scope
- Backwards-compatible expansion of `getItemSalesAggregated` return-row schema with 9 new fields (3 buckets × 3 metrics).
- Lens fix in `ItemSalesMockup.jsx` (frozen S2) — formally re-opens S2 from ✅ → 🔧 → ✅.
- Lens fix in `ItemSalesHybridMockup.jsx` (S5).
- Export payload builder fix in `ItemSalesHybridMockup.jsx` `buildExportPayload()` so XLSX + PDF Cancelled / Comp sheets honour the new lens.
- Side-sheet (`ItemDrillSheet.jsx`) decision + minimal change.
- Doc updates after merge.

### 1.2 Out of scope
- `getDashboardAggregated` (Dashboard tile uses a separate code path; tile shows aggregated cancellations + comp from `operations[]` + `food_status` — not affected).
- Phase-3 sub-tabs S15–S18 (not yet built — will inherit new schema automatically).
- Backend `/api/v2/.../report/order-logs-report` — no payload change requested; fix is entirely client-side.
- Variation / addon drill aggregates (unchanged).
- Combined Export across multiple reports (not in CR-011 scope).

### 1.3 Non-goals
- Refactoring the existing service function or extracting helpers.
- Adding new tabs.
- Touching the visual design (Gate ② sign-off remains intact).

---

## 2. Pre-implementation checks (must run before coding)

| # | Check | Command / location | Why |
|---|---|---|---|
| 2.1 | All other consumers of `getItemSalesAggregated` | `grep -rn "getItemSalesAggregated" /app/frontend/src` | Confirmed: only `ItemSalesMockup.jsx` (S2) + `ItemSalesHybridMockup.jsx` (S5) |
| 2.2 | All consumers of fields `discount`/`tax`/`avgSalePrice` from the service rows | `grep -n "r\\.tax\\|r\\.discount\\|r\\.avgSalePrice" insightsService.js` plus the two screen files | Map every read so nothing silently regresses |
| 2.3 | Tests covering the service | `find /app/frontend/src -name "*.test.*" -exec grep -l "getItemSalesAggregated\\|insightsService" {} \\;` | Update fixtures + expectations |
| 2.4 | Side-sheet (`ItemDrillSheet.jsx`) reads of `item.discount` / `item.tax` | grep | Lines 298 + 302 — confirm intended scope after fix |
| 2.5 | Export-builder reads in S5 (`buildExportPayload` body) | `grep -n "discount\\|tax\\|avgPrice" ItemSalesHybridMockup.jsx` | Builder feeds reportExporter — must be lens-correct per tab |
| 2.6 | Dashboard tile path | open `getDashboardAggregated` body in `insightsService.js` | Confirm zero dependency on the new fields |

Outcomes of 2.1–2.6 are recorded in §10 (Affected files matrix) and §11 (Risk register).

---

## 3. Service-layer change (`/app/frontend/src/api/services/insightsService.js`)

### 3.1 Function affected
`getItemSalesAggregated(fromDate, toDate, sortBy = 'collect_bill', signal)` — aggregation block lines ~140–249.

### 3.2 Accumulator additions (existing branch at lines ~173–184)

Current code:
```js
existing.qtySold              += (isCancelled || isComplementary) ? 0 : qty;
existing.qtyCancelled         += isCancelled        ? qty : 0;
existing.qtyComplementary     += isComplementary    ? qty : 0;
existing.revenueSold          += (isCancelled || isComplementary) ? 0 : price;
existing.revenueCancelled     += isCancelled        ? price : 0;
existing.revenueComplementary += isComplementary    ? (menuPrice * qty) : 0;
existing.discount             += discount;
existing.tax                  += tax;
existing.unitPriceSum         += unitPrice;
existing.lineCount            += 1;
```

After fix — **9 new lines added; 4 existing lines (totals) kept for backward-compat**:
```js
existing.qtySold              += (isCancelled || isComplementary) ? 0 : qty;
existing.qtyCancelled         += isCancelled        ? qty : 0;
existing.qtyComplementary     += isComplementary    ? qty : 0;
existing.revenueSold          += (isCancelled || isComplementary) ? 0 : price;
existing.revenueCancelled     += isCancelled        ? price : 0;
existing.revenueComplementary += isComplementary    ? (menuPrice * qty) : 0;

// NEW — per-bucket discount + tax
existing.discountSold          += (isCancelled || isComplementary) ? 0 : discount;
existing.discountCancelled     += isCancelled        ? discount : 0;
existing.discountComplementary += isComplementary    ? discount : 0;
existing.taxSold               += (isCancelled || isComplementary) ? 0 : tax;
existing.taxCancelled          += isCancelled        ? tax : 0;
existing.taxComplementary      += isComplementary    ? tax : 0;

// NEW — per-bucket unitPriceSum + lineCount (used to compute per-bucket avg)
existing.unitPriceSumSold          += (isCancelled || isComplementary) ? 0 : unitPrice;
existing.lineCountSold             += (isCancelled || isComplementary) ? 0 : 1;
existing.unitPriceSumCancelled     += isCancelled    ? unitPrice : 0;
existing.lineCountCancelled        += isCancelled    ? 1         : 0;
existing.unitPriceSumComplementary += isComplementary? unitPrice : 0;
existing.lineCountComplementary    += isComplementary? 1         : 0;

// KEPT — total figures (backward compat for All / Top / Slow tabs + Drill summary)
existing.discount      += discount;
existing.tax           += tax;
existing.unitPriceSum  += unitPrice;
existing.lineCount     += 1;
```

### 3.3 Initial-row additions (`else` branch at lines ~192–208)

Add to the `itemMap.set(foodId, { ... })` literal — initialise the 12 new keys to per-bucket starts (mirroring the qty/revenue split exactly):

```js
discountSold:          (isCancelled || isComplementary) ? 0 : discount,
discountCancelled:      isCancelled    ? discount : 0,
discountComplementary:  isComplementary? discount : 0,
taxSold:               (isCancelled || isComplementary) ? 0 : tax,
taxCancelled:           isCancelled    ? tax : 0,
taxComplementary:       isComplementary? tax : 0,
unitPriceSumSold:          (isCancelled || isComplementary) ? 0 : unitPrice,
lineCountSold:             (isCancelled || isComplementary) ? 0 : 1,
unitPriceSumCancelled:      isCancelled    ? unitPrice : 0,
lineCountCancelled:         isCancelled    ? 1         : 0,
unitPriceSumComplementary:  isComplementary? unitPrice : 0,
lineCountComplementary:     isComplementary? 1         : 0,
```

### 3.4 Row-finalisation (line ~248)

Current:
```js
avgSalePrice: r.lineCount > 0 ? r.unitPriceSum / r.lineCount : 0,
```

After fix — append 3 new computed averages alongside (keep `avgSalePrice` as backward-compat total):
```js
avgSalePrice:              r.lineCount             > 0 ? r.unitPriceSum             / r.lineCount             : 0,
avgSalePriceSold:          r.lineCountSold         > 0 ? r.unitPriceSumSold         / r.lineCountSold         : 0,
avgSalePriceCancelled:     r.lineCountCancelled    > 0 ? r.unitPriceSumCancelled    / r.lineCountCancelled    : 0,
avgSalePriceComplementary: r.lineCountComplementary> 0 ? r.unitPriceSumComplementary/ r.lineCountComplementary: 0,
```

### 3.5 Net schema (per row returned from service) — final list

```
foodId, name, category, station, veg, drill,

qtySold, qtyCancelled, qtyComplementary,
revenueSold, revenueCancelled, revenueComplementary,
discount, discountSold, discountCancelled, discountComplementary,
tax, taxSold, taxCancelled, taxComplementary,
avgSalePrice, avgSalePriceSold, avgSalePriceCancelled, avgSalePriceComplementary,

unitPriceSum, lineCount,                          // existing totals
unitPriceSumSold, lineCountSold,                  // new
unitPriceSumCancelled, lineCountCancelled,        // new
unitPriceSumComplementary, lineCountComplementary // new
```

The 4 bottom helper accumulators (`unitPriceSum*` + `lineCount*`) are not consumed downstream but kept on the row for parity + future debugging. They cost ~32 bytes/row — negligible.

---

## 4. Screen layer — frozen S2 (`ItemSalesMockup.jsx`)

### 4.1 Mandatory step zero — formally re-open S2

Per `CR_011_SCREEN_FREEZE_PROTOCOL.md §7`:
1. Flip `CR_011_SCREEN_FREEZE_LOG.md` S2 row from `✅ FROZEN` → `🔧 Re-open requested` **before** editing the file. (Already done by this plan's predecessor doc, dated 2026-06-02.)
2. Wait for explicit owner direction to revise. **Direction received 2026-06-02:** *"option 1 first update this in document"* — direction is conditional on this plan being approved.
3. After patch + owner re-validation, flip back to `✅ FROZEN` with the new date stamp.

### 4.2 Schema mapping (line ~256–275 in `apiRows` mapper)

Current keeps only one `discount`, `tax`, `avgPrice` per row. After fix, propagate all bucket variants forward:

```js
const apiRows = useMemo(() => {
  if (!fetchResult?.rows) return [];
  return fetchResult.rows.map((r) => ({
    id: r.foodId,
    name: r.name,
    category: r.category,
    station: r.station,
    isVeg: r.veg,

    qty: r.qtySold,
    qtyCancelled: r.qtyCancelled,
    qtyComplementary: r.qtyComplementary,

    revenue:               Math.round(r.revenueSold),
    revenueCancelled:      Math.round(r.revenueCancelled),
    revenueComplementary:  Math.round(r.revenueComplementary),

    discount:              Math.round(r.discount),
    discountSold:          Math.round(r.discountSold),
    discountCancelled:     Math.round(r.discountCancelled),
    discountComplementary: Math.round(r.discountComplementary),

    tax:               Math.round(r.tax),
    taxSold:           Math.round(r.taxSold),
    taxCancelled:      Math.round(r.taxCancelled),
    taxComplementary:  Math.round(r.taxComplementary),

    avgPrice:                  Math.round(r.avgSalePrice),
    avgPriceSold:              Math.round(r.avgSalePriceSold),
    avgPriceCancelled:         Math.round(r.avgSalePriceCancelled),
    avgPriceComplementary:     Math.round(r.avgSalePriceComplementary),

    status: r.qtySold > 0 ? 'sold' : (r.qtyCancelled > 0 ? 'cancelled' : 'unsold'),
    isComplimentary: r.qtyComplementary > 0,
    drill: r.drill,
  }));
}, [fetchResult]);
```

### 4.3 Lens update (`lensFilteredData` around line ~340)

Current:
```js
if (activeTab === 'cancelled')
  return filteredData.map(d => ({ ...d, revenue: d.revenueCancelled,     qty: d.qtyCancelled     }));
if (activeTab === 'comp')
  return filteredData.map(d => ({ ...d, revenue: d.revenueComplementary, qty: d.qtyComplementary }));
return filteredData;
```

After fix:
```js
if (activeTab === 'cancelled')
  return filteredData.map(d => ({
    ...d,
    qty:      d.qtyCancelled,
    revenue:  d.revenueCancelled,
    discount: d.discountCancelled,
    tax:      d.taxCancelled,
    avgPrice: d.avgPriceCancelled,
  }));
if (activeTab === 'comp')
  return filteredData.map(d => ({
    ...d,
    qty:      d.qtyComplementary,
    revenue:  d.revenueComplementary,
    discount: d.discountComplementary,
    tax:      d.taxComplementary,
    avgPrice: d.avgPriceComplementary,
  }));
return filteredData;
```

### 4.4 Table cells (around lines 746–748)
No change required — the JSX already reads `row.discount`, `row.tax`, `row.avgPrice`. Lens now feeds the correct value per tab.

---

## 5. Screen layer — S5 (`ItemSalesHybridMockup.jsx`)

### 5.1 Schema mapping
Identical to §4.2 — same `apiRows` mapper signature. Patch in place.

### 5.2 Lens update
Identical to §4.3.

### 5.3 Export payload builder — `buildExportPayload()` (around line 268)

The Cancelled + Comp sheets currently map only `qty` + `revenue`. After fix, also map the three new bucket fields so XLSX + PDF Cancelled/Comp sheets reflect the same scope:

```js
} else if (tabId === 'cancelled') {
  rows = apiRows
    .filter((d) => d.qtyCancelled > 0)
    .map((d) => ({
      ...d,
      qty:      d.qtyCancelled,
      revenue:  d.revenueCancelled,
      discount: d.discountCancelled,
      tax:      d.taxCancelled,
      avgPrice: d.avgPriceCancelled,
    }));
} else if (tabId === 'comp') {
  rows = apiRows
    .filter((d) => d.isComplimentary)
    .map((d) => ({
      ...d,
      qty:      d.qtyComplementary,
      revenue:  d.revenueComplementary,
      discount: d.discountComplementary,
      tax:      d.taxComplementary,
      avgPrice: d.avgPriceComplementary,
    }));
}
```

`totalDisc` and `totalTax` reducers (around lines 282–284) automatically pick up the new values — no further change.

### 5.4 KPI strip
Unchanged. KPIs are computed from "All Items" sheet which uses the unlensed totals — correct.

---

## 6. Side-sheet — `ItemDrillSheet.jsx` (S3 template, FROZEN 2026-06-01)

### 6.1 Decision required

Drill sheet shows the clicked item's `discount` + `tax` (lines 298 + 302) as KPI cards. Two valid behaviours:

| Option | What user sees on Cancelled-tab row click | Pros | Cons |
|---|---|---|---|
| **6.1.A — Show item totals** (status quo) | Total tax/discount across all line types for that food item | No protocol disruption to S3; consistent across tabs | Same scope mismatch as the table column (perpetuates the very issue this fix corrects) |
| **6.1.B — Show lensed values** (recommended) | Tax/discount for cancelled lines only when entered from Cancelled tab | Drill agrees with the table row that opened it; intuitive | Requires re-opening FROZEN S3 + tiny `selectedRow` shape contract change |

**Recommendation: 6.1.B.** Re-open S3 via §7 in the same change set (one-line dependency since the lensed values are already attached to `selectedRow` by `lensFilteredData`).

If owner picks **6.1.A**, no S3 change — but the drill sheet's Tax KPI will show the same anomaly the owner flagged on the table. This is undesirable.

### 6.2 Code change for 6.1.B
None in `ItemDrillSheet.jsx` itself — it already reads `item.discount` and `item.tax`. Since `selectedRow` is now a lensed object, the drill automatically shows the per-tab value. **Zero code edit; logical re-open only.**

### 6.3 Caveat
On All/Top/Slow tabs the drill continues to show totals — same as today. No regression.

---

## 7. Tests + lint

### 7.1 Existing tests
Run pre-change:
```bash
grep -rln "insightsService\\|getItemSalesAggregated\\|revenueCancelled" /app/frontend/src/__tests__
```
If any fixture asserts row keys explicitly, append the new bucket fields. Likely no test exists for this service per current codebase pattern.

### 7.2 New smoke (manual, owner-driven)
Covered by §8 Verification Matrix.

### 7.3 Lint
Run `mcp_lint_javascript` on the three touched files post-edit. Expect zero new warnings (only the pre-existing OrderEntry.jsx warning remains).

---

## 8. Verification matrix (Gate ⑤ re-validation)

Test set runs on Palm House (rid=541) with `?from=2026-04-01&to=2026-04-30` (the reference window where Cancelled Lines = 145 = 43 order + 102 item, Net Sales ₹36,326).

| # | Screen | Tab | Assertion |
|---|---|---|---|
| 8.1 | S2 (`/reports-module/items`) | All Items | Numbers identical to pre-fix snapshot (totals unchanged) |
| 8.2 | S2 | Top Sellers | Numbers identical to pre-fix snapshot |
| 8.3 | S2 | Slow Movers | Numbers identical to pre-fix snapshot |
| 8.4 | S2 | Cancelled Lines | For every row: **Tax ≤ Revenue** (or Tax = 0); Discount + Avg Price scoped to cancelled lines; Americano example: ₹140 revenue / ₹0 (or near-zero) tax |
| 8.5 | S2 | Complimentary | For every row: Tax + Discount + Avg Price scoped to comp lines only |
| 8.6 | S5 (`/reports-module/items-hybrid`) | All five tabs | Same numbers as S2 (parity check screen-vs-screen) |
| 8.7 | S5 Excel export | All Items / Top / Slow sheets | Identical to pre-fix snapshot |
| 8.8 | S5 Excel export | Cancelled / Complimentary sheets | TOTAL row's tax + discount columns reflect bucketed values |
| 8.9 | S5 PDF export | Section per tab | Same scope as table; visual format unchanged (Credit/Tab Management parity) |
| 8.10 | S5 row click on Cancelled tab | Side-sheet (S3) | Tax + Discount KPI cards show cancelled-only values (per 6.1.B) |
| 8.11 | Dashboard (`/reports-module/dashboard`) | All 9 tiles | Numbers unchanged (zero dependency on new fields confirmed) |
| 8.12 | URL date persistence | Dashboard → S5 navigation | Still works |
| 8.13 | Loading shield | Edit dates, click Apply on S5 | Header disables correctly during refetch (no regression) |
| 8.14 | Backward-compat consumers | grep for `r.discount` / `r.tax` / `r.avgSalePrice` outside the two screens | Returns zero new affected sites; field totals preserved |

---

## 9. Rollout sequence (single commit, atomic)

| Step | Action | File(s) |
|---|---|---|
| 1 | Re-open S2 + S3 in freeze log (status flip only) | `CR_011_SCREEN_FREEZE_LOG.md` |
| 2 | Patch service | `insightsService.js` |
| 3 | Patch S2 mapper + lens | `ItemSalesMockup.jsx` |
| 4 | Patch S5 mapper + lens + export builder | `ItemSalesHybridMockup.jsx` |
| 5 | Lint all three files | (parallel lint call) |
| 6 | Confirm supervisor "Compiled with warnings" (no errors) | `tail /var/log/supervisor/frontend.out.log` |
| 7 | Screenshot S2 Cancelled + S5 Cancelled at the reference window | Playwright |
| 8 | Trigger Excel + PDF exports, verify Cancelled/Comp sheets | Playwright |
| 9 | Hand back to owner for combined Gate ⑤ on S2 + S5 | — |
| 10 | On approval, flip S2 + S3 + S5 to `✅ FROZEN` + dates | `CR_011_SCREEN_FREEZE_LOG.md` |
| 11 | Owner Decision Log entry capturing re-freeze | `SPRINT_STATUS.md` |
| 12 | `CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md` §6 checkboxes ticked | (decision artifact) |

All 12 steps are sequential. No partial state shipped.

---

## 10. Affected files matrix

| File | Type | Change | LOC delta (est.) | Risk |
|---|---|---|---|---|
| `/app/frontend/src/api/services/insightsService.js` | Service | Accumulator + initial row + finalisation | +30 lines | LOW — pure addition, totals preserved |
| `/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx` (FROZEN S2 → §7 re-open) | Screen | Mapper + lens | +18 lines | LOW — additive; visual unchanged |
| `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx` (S5) | Screen | Mapper + lens + export builder | +24 lines | LOW |
| `/app/frontend/src/pages/reports-module/ItemDrillSheet.jsx` (FROZEN S3 → §7 logical re-open, no code edit) | Component | Behaviour change via upstream `selectedRow` only | 0 | LOW |
| `/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md` | Doc | Status flips + dates | +4 lines | NONE |
| `/app/memory/control/SPRINT_STATUS.md` | Doc | Owner Decision Log entry | +1 row | NONE |
| `/app/memory/memory/change_requests/impact_analysis/CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md` | Doc | §6 checkboxes | inline | NONE |

**Total code LOC delta:** ~+72. **Total files touched:** 7 (4 code + 3 doc).

---

## 11. Risk register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Other consumer reads `r.tax` and breaks | LOW | LOW | Greps in §2.1 + §2.2 confirmed no out-of-scope consumer. Totals preserved for safety net. |
| R2 | Per-bucket avg price ÷ by zero | LOW | LOW | Guarded: `lineCountX > 0 ? sum / count : 0` (mirrors current `avgSalePrice` logic). |
| R3 | Dashboard tile shows different numbers post-deploy | LOW | MEDIUM | Out-of-scope per §1.2 (separate code path). §8.11 explicitly verifies. |
| R4 | Frozen S3 drill panel renders differently and surprises owner | MEDIUM | LOW | 6.1.B is explicitly approved by owner before code lands. Caveat in §6.3. |
| R5 | XLSX/PDF Cancelled-sheet totals show different numbers from old export | MEDIUM (expected — that's the point) | LOW | Documented as the intended outcome; §8.8 verifies. |
| R6 | Existing tests break | LOW | LOW | §7.1 lists how to refresh. No green tests block release at the moment. |
| R7 | Re-opening S2 triggers a cascade of other "fix while we're here" requests | MEDIUM | MEDIUM | Strict adherence to §1.2 (out of scope). Any new ask → separate plan. |
| R8 | Backend payload changes during work | LOW | MEDIUM | No backend dependency — entirely client-side. |

---

## 12. Rollback strategy

If §8 verification fails:

1. Revert all 4 code files to their pre-change commit (single `git checkout HEAD~ -- <files>`).
2. Set S2 back to `✅ FROZEN` with original date.
3. Set S5 back to `🟠 API wired + Export shipped`.
4. Add an Owner Decision Log entry capturing the rollback + reason.

No DB / no backend / no external side-effects → rollback is purely a file revert.

---

## 13. Doc updates after merge

| Doc | Update |
|---|---|
| `CR_011_SCREEN_FREEZE_LOG.md` | S2, S3, S5 rows: status, dates, validation note |
| `SPRINT_STATUS.md` Owner Decision Log | "Data-scope fix shipped + S2/S3/S5 re-frozen" row |
| `CONTROL_DASHBOARD.md` | Last-updated note appended |
| `CR_011_DATA_SCOPE_FIX_PLAN_2026_06_02.md` §6 | Tick the three approval checkboxes + add "SHIPPED" header |
| `CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md` | Append "Data-scope fix integrated 2026-06-02; reportExporter contract unchanged" |
| `BASELINE_INDEX.md` | (Skip — no business-rule promotion; baseline unchanged) |
| `PRD.md` | Append a 1-line bullet under "What's Been Implemented" |
| This plan (`CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md`) | Header status → `SHIPPED`; archive |

---

## 14. Owner approval matrix (gates before any code edit)

| # | Approval needed | Why it's binding | Default if you say "go" |
|---|---|---|---|
| A1 | Approve **this plan** as-is | Owner directive: "first I need detailed planning and to be documented without missing anything" | n/a |
| A2 | Approve §3 service changes | Service is shared by 2 screens; signature change | Implements §3.2 + §3.3 + §3.4 exactly |
| A3 | Approve **S2 re-open** per §7 of freeze protocol | Frozen screen — explicit consent required | Lens patched + re-frozen after Gate ⑤ |
| A4 | Approve **S3 drill sheet** under **Option 6.1.B** (recommended) | Frozen — same protocol clause | Drill shows lensed values on Cancelled/Comp tabs |
| A5 | Confirm **§8 verification window** is Palm House `?from=2026-04-01&to=2026-04-30` (or supply alternative) | Owner-attested reference window from Phase 1 | Uses Palm House April 2026 |

Reply with all five in a single message (e.g. *"A1–A5 approved, go ahead with 6.1.B"*) and I will execute §9 atomically.

---

## 15. Estimated time

| Phase | Time |
|---|---|
| Service patch (§3) + S2 + S5 mappers + lens + export builder (§4 §5) | ~15 min |
| Lint + supervisor compile check (§9 step 5–6) | ~3 min |
| Playwright re-screenshot S2 + S5 Cancelled tab + Excel + PDF (§9 step 7–8, §8 verification 8.1–8.10) | ~10 min |
| Owner Gate ⑤ validation (you) | depends on you |
| Re-freeze + doc updates (§13) | ~5 min after your "freeze it" |

**Total agent time end-to-end:** ~30 min. Owner validation time depends on you.

---

## 16. Open questions for owner

| # | Question | Default if no answer |
|---|---|---|
| Q1 | Confirm 6.1.B for drill sheet behaviour. | I will use 6.1.B (recommended) unless you say otherwise. |
| Q2 | Should the **All Items / Top Sellers / Slow Movers** tabs change behaviour at all? (They keep totals today.) | No change — totals preserved. |
| Q3 | Should the **Dashboard cancellation tile** also use per-bucket tax/discount in its drill? | Out of scope; can be added later if needed. |
| Q4 | Validation window — Palm House April 2026 OK? | Yes, default. |
| Q5 | Any change to export filename when Cancelled sheet shows different totals? | No change — same filename pattern. |

---

*This is a NO-EDIT plan. No source file has been modified. Implementation begins only after explicit §14 approvals.*
