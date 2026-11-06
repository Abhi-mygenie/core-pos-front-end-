# BUG-623 + BUG-624 + BUG-625 — Line-by-Line Implementation Plan (Gate 3 refresh)

**Date:** 2026-11-06
**Role:** PLANNING (Role 2). No code is written in this stage.
**Based on:** `impact/QA_BATCH_BUGS_623_627_IMPACT_ANALYSIS_2026_10_28.md` (Gate 2, 2026-10-28), re-verified against the current code today.
**Sprint:** `nov_cr_batch`

| Bug | Gate today | Code reality (2026-11-06) | Plan action |
|---|---|---|---|
| BUG-623 | GATE_3_PLAN_COMPLETE | NONE in orderTransform.js · `BUG-NEW` markers still at CPP L260/L262 | **Refreshed.** Line drift + a 4th vulnerable site found (E4) |
| BUG-624 | GATE_5B_QA_PASS | **FULL** — `StatusConfigPage.jsx` L1086 has the conditional color + `// BUG-624` marker | **No plan needed.** Awaiting owner smoke (Gate 6) |
| BUG-625 | GATE_3_PLAN_COMPLETE | NONE — Active First only in the xl nav (Header.jsx L339-352) | **Refreshed.** Exact JSX below |

---

## A. BUG-623 — null variation entry crashes orderTransform (+ marker fix)

**Risk:** MEDIUM · **R5:** YES (`orderTransform.js`, `CollectPaymentPanel.jsx`) → Gate 4 owner approval · **Fast Lane:** NO
**Conflict pre-check:** CR-513/BUG-592 (today) edited `orderTransform.js` L234 + ~L2167 · BUG-641 L1870. Different lines from E1-E4, so parallel-safe. Text anchors are used, not line numbers.
**Drift vs Oct-28 plan:** L706→**L707**, L722→**L723**, L1552→**L1556**; CPP L259/261→**L260/262**. **New site E4 (L2004)** was missed in the Oct plan.

### Root cause
`item.variation` can contain `null` entries (aggregator / scan socket re-hydration, BUG-618). Three loops read `v.price` / `v.values` without a null check → `TypeError` → ErrorBoundary. The `.map` loop doesn't crash but emits a junk `{name:'Variant', values:{label:[]}}` group for each null.

### Edits

**E1 — `orderTransform.js` L707 (buildCartItem, response-shape normalise)**
```js
// current
    variations = item.variation.map(v => {
// new
    variations = item.variation.filter(Boolean).map(v => { // BUG-623: drop null entries (aggregator/scan re-hydration)
```

**E2 — `orderTransform.js` L723 (buildCartItem variation amount)**
```js
// current
    variationAmount = item.variation.reduce((sum, v) => {
// new
    variationAmount = item.variation.filter(Boolean).reduce((sum, v) => { // BUG-623
```

**E3 — `orderTransform.js` L1556 (collectBillExisting variation amount)**
```js
// current
          variationAmount = item.variation.reduce((sum, v) => {
// new
          variationAmount = item.variation.filter(Boolean).reduce((sum, v) => { // BUG-623
```

**E4 — `orderTransform.js` L2004 (buildBillPrintPayload manual-print tax fallback) — NEW**
```js
// current
        const variationPerUnit = (item.variation || []).reduce(
// new
        const variationPerUnit = (item.variation || []).filter(Boolean).reduce( // BUG-623
```

**E5 — `CollectPaymentPanel.jsx` L260 (marker only)**: `// BUG-NEW: null guard` → `// BUG-618: null guard`
**E6 — `CollectPaymentPanel.jsx` L262 (marker only)**: `// BUG-NEW: null guard` → `// BUG-618: null guard`

Total: 4 changed lines in orderTransform.js + 2 comment-only lines in CPP. No logic change for non-null entries.

### Out of scope (noted)
Null *options* inside `v.values` (`opt.optionPrice` at L728, L1559, L2005) are a different shape; not reported. Do not touch (R14).

### Verification Matrix
| # | Edit | Check | How | Auto |
|---|---|---|---|:---:|
| V1 | E1-E4 | `filter(Boolean)` precedes all 4 variation loops | `grep -n "variation.*filter(Boolean)" orderTransform.js` → 4 hits | YES |
| V2 | E1 | `[null, {name:'Size', values:[{label:'L', optionPrice:'20'}]}]` → 1 group, no 'Variant' junk | unit test U1 | YES |
| V3 | E2 | the same input → variation amount 20, no throw | unit test U2 | YES |
| V4 | E3 | `collectBillExisting` with a null variation → no throw, correct `variation_amount` | unit test U3 | YES |
| V5 | E4 | `buildBillPrintPayload` (no overrides) with a null variation in a raw detail → no throw | unit test U4 | YES |
| V6 | REG | non-null variation payloads byte-identical | existing variation tests (`orderTransformAddonQty`, BUG-VQTY suites) pass | YES |
| V7 | E5-E6 | `grep -c "BUG-NEW" CollectPaymentPanel.jsx` → 0 | grep | YES |
| V8 | all | webpack 0 new warnings | log | YES |

New test file: `src/__tests__/api/transforms/orderTransform.bug623.test.js` (U1-U4).

### Post-Code Registry Checklist
- [ ] registry.json BUG-623 → GATE_5A_IMPLEMENTED · BUG_TRACKER row
- [ ] FILE_OWNERSHIP: orderTransform.js (E1-E4), CollectPaymentPanel.jsx (E5-E6), new test file
- [ ] Markers: `// BUG-623` on E1-E4, `// BUG-618` on E5-E6
- [ ] Hotspot → QA regression + 2 cross-flow tests (place order with variant item, collect bill with variant item)

---

## B. BUG-624 — OFF badge contrast

Already implemented and QA-passed (`iteration_11`). Code at `StatusConfigPage.jsx` L1086: `color: servedAutoExpand ? '#fff' : COLORS.darkText` with `// BUG-624` marker. **Next: owner smoke** (Status Config → toggle OFF → text readable; ON → white on green). No edits.

---

## C. BUG-625 — Active First missing from tablet dropdown (<1280px)

**Risk:** LOW · **R5:** NO (`Header.jsx`) · **Fast Lane:** NO (>10 lines) · **Conflict pre-check:** Header.jsx last touched by BUG-555 WP-C / CR-414 (Oct). Adding new lines only, so no conflict.
**Props already available in Header:** `channelActiveFirst` (L48), `onChannelActiveFirstToggle` (L49), `Check` icon, `COLORS`. No new props or state; DashboardPage untouched.
**Placement:** the dropdown's channel-view branch (`dashboardView !== 'status'`, L410-436). This is the same view gate as the xl pill (L278 `dashboardView === 'status' ? … : <channel pills incl. Active First>`).

### E1 — `Header.jsx` insert after L435 (`</button>` closing the Schedule item), before L436 `</>`
```jsx
                    {/* BUG-625: Active First in tablet dropdown — mirrors CR-429 xl pill (L339-352) */}
                    <div className="my-1 border-t" style={{ borderColor: COLORS.borderGray }} />
                    <button
                      data-testid="tablet-filter-active-first"
                      onClick={onChannelActiveFirstToggle}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                      style={{ color: channelActiveFirst ? COLORS.primaryOrange : COLORS.grayText }}
                    >
                      <Check className="w-4 h-4 flex-shrink-0" style={{ visibility: channelActiveFirst ? 'visible' : 'hidden', color: COLORS.primaryOrange }} />
                      <span>Active First</span>
                    </button>
```
- The divider separates the sort toggle from the status filters (it's a sort, not a filter).
- Clicking does **not** close the dropdown, which matches the existing status/schedule items.
- The active-count badge (L373-375) is **not** changed. Active First is a sort, not a filter count. (OD-625-01 below.)

### Verification Matrix
| # | Check | How | Auto |
|---|---|---|:---:|
| V1 | 1024px viewport, Channel View → open `tablet-filter-dropdown-btn` → `tablet-filter-active-first` visible | browser | NO |
| V2 | click → check mark toggles; tables reorder active-first; state persists (DashboardPage L1910-1912 handler) | browser | NO |
| V3 | Status View → item NOT shown | browser | NO |
| V4 | ≥1280px → dropdown hidden, xl pill `filter-active-first` works unchanged | browser | NO |
| V5 | xl pill and dropdown item stay in sync | browser | NO |
| V6 | webpack 0 new warnings | log | YES |

### Owner decision
- **OD-625-01:** Should "Active First" add +1 to the dropdown count badge when ON? Agent recommends **NO** (badge counts filters only).

### Post-Code Registry Checklist
- [ ] registry.json BUG-625 → GATE_5A_IMPLEMENTED · BUG_TRACKER row · FILE_OWNERSHIP Header.jsx · marker `// BUG-625`

---

## Execution order (Implementation agent)
1. BUG-625 (non-R5, independent).
2. BUG-623 E1-E4 + tests U1-U4 → E5-E6 → compile.

## Next
Owner: **Gate 4 GO** for BUG-623 (R5) and BUG-625 · OD-625-01 · smoke BUG-624.


## IMPLEMENTED 2026-11-06
- OD-625-01 = **NO** (owner: functionality mirrors desktop, which has no count).
- BUG-623 E1-E6 + test file (3/3). BUG-625 E1. testing_agent `iteration_27` 100%. BUG-624 unchanged (awaiting smoke).
