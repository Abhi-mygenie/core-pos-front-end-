# CR-011-AUDIT-01 — Implementation Plan: S5 Audit Tab + Frontend Business Logic Gate

**Date:** 2026-06-02
**Parent CR:** CR-011 — Complete Reports Module
**Sub-CR:** **CR-011-AUDIT-01 — Frontend Business Logic Audit Gate** (registered in `CR_REGISTRY.md` Standalone CRs section 2026-06-02; planning status)
**Related protocol:** `CR_011_SCREEN_FREEZE_PROTOCOL.md §8 — Frontend Business Logic Disclosure Rule` (added 2026-06-02)
**Related decision queue:** `OWNER_DECISION_QUEUE.md` Category G (G1–G14 pre-seeded REVIEW items)
**Trigger:** Owner directive 2026-06-02 verbatim: *"Summary v3 approved · register CR-011-AUDIT-01 + protocol §8 + decision queue · go write the plan"*
**Status:** PLAN DRAFT — awaiting §14 owner approvals A1–A6 before any code edit.

---

## 0. Reading order

1. `CR_011_SCREEN_FREEZE_PROTOCOL.md §8` — the constitutional rule this CR enforces
2. `CR_REGISTRY.md` — CR-011-AUDIT-01 row
3. `OWNER_DECISION_QUEUE.md` Category G — the 14 pre-seeded REVIEW items
4. This document — step-by-step implementation
5. `CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md` — independent track; this plan does NOT alter the data-scope fix
6. `CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md §2.6` — export gate behaviour (this CR adds an audit-driven disable layer)

---

## 1. Scope summary

### 1.1 In scope
- New 6th tab "Audit" on S5 (`ItemSalesHybridMockup.jsx`) only. S2 untouched.
- New utility `/app/frontend/src/utils/auditManifest.js` — central manifest of every FE business rule with approval status, source location, plain-English explanation.
- New utility `/app/frontend/src/utils/auditEngine.js` — runtime engine that computes audit flags (RED + AMBER + REVIEW) from current data + manifest.
- New `// @audit:rule` annotation convention — applied inline to every FE business-logic site.
- Service-side annotation pass: add `taxRate`, `taxType`, `taxCalc` to each aggregated row in `insightsService.js` (single-value carry, not accumulated; used by the audit engine).
- Audit-driven export gate on S5 Download menu: Excel + PDF disabled while any audit flag is non-empty.
- In-place row tinting on the other 5 tabs (subtle amber/red border + ⚠ chip) so flagged rows are visible in their natural bucket.
- Audit tab UI: dedicated table view of all flags grouped by severity, with explanation per flag.
- Annotation of the 14 pre-seeded rules in source (FE-01 through FE-14) so the manifest builds at first run.

### 1.2 Out of scope
- Adding audit tab to S2 (frozen) — Protocol §7 re-open not required for this rule.
- Adding audit tab to S0/S1/S4 (Phase-1 frozen screens) — §8.3 applies in principle; physical Audit tabs land per-screen at owner's call.
- Adding audit to S6–S10 right now (those screens don't exist yet; audit is part of their gate ④ when they're built).
- Auto-resolving REVIEW items — owner approval is chat-only, plan tracks the action but does not auto-execute.
- Backend changes — no API change requested; rate data is already in the existing payload.
- WhatsApp / SMS / Email placeholders — remain disabled (Phase 2B).
- Re-freezing S2/S3/S5 (data-scope fix track is independent — owner's Gate ⑤ on that is still pending).

### 1.3 Non-goals
- Replacing or refactoring `getItemSalesAggregated`.
- Visual redesign of S5 (the addition of the 6th tab + chip is the only visual delta).
- Introducing a new state-management library or context.

---

## 2. Pre-implementation checks (run before coding)

| # | Check | Command / location | Why |
|---|---|---|---|
| 2.1 | Grep all uses of `@audit:rule` (should be 0) | `grep -rn "@audit:rule" /app/frontend/src` | Confirm clean slate |
| 2.2 | Existing rate fields in `food_details` | Already verified 2026-06-02 via API response inspection: `food_details.tax` (numeric percent), `food_details.tax_type` ("GST"|"VAT"), `food_details.tax_calc` ("Exclusive"|"Inclusive") | Source of truth confirmed |
| 2.3 | Test the manifest collector doesn't break webpack | Build smoke test | Annotation comments must not become runtime payload |
| 2.4 | Existing tests | `grep -rln "ItemSalesHybridMockup\\|getItemSalesAggregated" /app/frontend/src/__tests__` | Update fixtures if any |
| 2.5 | Bundle size impact | `du -sh /app/frontend/build/static/js` before + after | Manifest is JSON-ish; expected delta < 5 KB |

---

## 3. New artefacts (3 files)

### 3.1 `/app/frontend/src/utils/auditManifest.js` (NEW)

Central manifest. Every FE business rule has one entry. Source of truth for the Audit tab REVIEW section.

```js
/**
 * auditManifest.js — CR-011-AUDIT-01
 * Source of truth for ALL frontend business rules.
 * Per CR_011_SCREEN_FREEZE_PROTOCOL.md §8, no FE business rule may exist
 * outside this manifest. Every rule must have a matching // @audit:rule
 * annotation at its source site.
 */
export const AUDIT_RULES = [
  {
    id: 'FE-01',
    name: 'Slow Movers threshold',
    explains: 'An item is a Slow Mover if it sold ≤ 1 unit and is not currently cancelled.',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', line: 'filteredData memo' },
    approved: false,
    approvedDate: '',
    approvedSource: '',
    category: 'threshold',
    screens: ['S5'],
  },
  {
    id: 'FE-02',
    name: 'Top Sellers definition',
    explains: 'Top Sellers tab shows the top 20 items ranked by revenue (descending).',
    source: { file: 'pages/reports-module/ItemSalesHybridMockup.jsx', line: 'filteredData memo' },
    approved: false,
    approvedDate: '',
    approvedSource: '',
    category: 'threshold',
    screens: ['S5'],
  },
  // … FE-03 through FE-13 (one entry each per OWNER_DECISION_QUEUE.md Category G)
  {
    id: 'FE-14',
    name: 'Per-bucket discount/tax/avgPrice split',
    explains: 'Service aggregates discount, tax, and avgSalePrice into Sold/Cancelled/Complementary buckets in parallel with the existing revenue/qty split.',
    source: { file: 'api/services/insightsService.js', line: 'getItemSalesAggregated accumulator' },
    approved: true,
    approvedDate: '2026-06-02',
    approvedSource: 'CR_011_DATA_SCOPE_FIX_IMPLEMENTATION_PLAN_2026_06_02.md §9 + Owner verbatim "go"',
    category: 'aggregation',
    screens: ['S2', 'S5', 'S3'],
  },
];

export const ruleById = (id) => AUDIT_RULES.find((r) => r.id === id);
export const pendingReviewRules = () => AUDIT_RULES.filter((r) => !r.approved);
export const approvedRules     = () => AUDIT_RULES.filter((r) =>  r.approved);
```

### 3.2 `/app/frontend/src/utils/auditEngine.js` (NEW)

Runtime engine — given a row set, computes flags.

```js
/**
 * auditEngine.js — CR-011-AUDIT-01
 * Pure functions; no React, no DOM, no side effects.
 */
import { AUDIT_RULES, pendingReviewRules } from './auditManifest';

const ABS = Math.abs;

// Per-row × per-bucket data-integrity audit.
// Input: apiRows already enriched with taxRate, taxType, taxCalc per row.
// Output: array of flag records.
export function auditRows(apiRows, opts = {}) {
  const tolerance = opts.tolerance ?? 0;  // §14 A4: zero tolerance default
  const flags = [];

  const buckets = [
    { id: 'sold',      label: 'Sold',          revKey: 'revenueSold',          taxKey: 'taxSold',          gstKey: null,  vatKey: null  },
    { id: 'cancelled', label: 'Cancelled',     revKey: 'revenueCancelled',     taxKey: 'taxCancelled',     gstKey: null,  vatKey: null  },
    { id: 'comp',      label: 'Complimentary', revKey: 'revenueComplementary', taxKey: 'taxComplementary', gstKey: null,  vatKey: null  },
  ];

  for (const r of apiRows) {
    for (const b of buckets) {
      const revenue = r[b.revKey] || 0;
      const tax     = r[b.taxKey] || 0;
      if (revenue === 0 && tax === 0) continue;       // skip empty cells

      // RED — GST + VAT both > 0 on the same food_id × bucket
      // (computed at line level in service; carried as bucket-level booleans)
      if (r[`bothTaxesBooked_${b.id}`] === true) {
        flags.push({
          severity: 'RED',
          foodId: r.id, name: r.name, bucket: b.label,
          revenue, actualTax: tax,
          reason: 'GST + VAT both booked on the same line — business rule allows only one tax type per item',
          ruleRef: 'Owner directive 2026-06-02 (Audit Summary v3 #6)',
        });
        continue;
      }

      // AMBER — actual tax ≠ expected tax per product config
      const rate = r.taxRate || 0;
      const expectedTax = r.taxCalc === 'Inclusive'
        ? revenue - (revenue / (1 + rate / 100))
        : revenue * (rate / 100);
      const delta = tax - expectedTax;
      if (ABS(delta) > tolerance) {
        flags.push({
          severity: 'AMBER',
          foodId: r.id, name: r.name, bucket: b.label,
          revenue, actualTax: tax, expectedTax: Math.round(expectedTax * 100) / 100,
          delta: Math.round(delta * 100) / 100,
          taxRate: rate, taxType: r.taxType || '—', taxCalc: r.taxCalc || 'Exclusive',
          reason: `Expected ₹${Math.round(expectedTax)} (${rate}% ${r.taxType} on ₹${Math.round(revenue)}), actual ₹${Math.round(tax)} — Δ ₹${Math.round(delta)}`,
        });
      }
    }
  }
  return flags;
}

// REVIEW (FE-rule disclosure) — pure read from manifest, no per-row computation.
export function auditReviewItems(screenId = 'S5') {
  return pendingReviewRules()
    .filter((r) => r.screens.includes(screenId))
    .map((r) => ({
      severity: 'REVIEW',
      ruleId: r.id, name: r.name, explains: r.explains,
      source: r.source, category: r.category,
    }));
}

export function auditSummary(apiRows, screenId = 'S5', opts) {
  const dataFlags = auditRows(apiRows, opts);
  const reviewItems = auditReviewItems(screenId);
  const red    = dataFlags.filter((f) => f.severity === 'RED').length;
  const amber  = dataFlags.filter((f) => f.severity === 'AMBER').length;
  const review = reviewItems.length;
  return {
    red, amber, review,
    total: red + amber + review,
    blocksExport: (red + amber + review) > 0,
    flags: dataFlags,
    reviewItems,
  };
}
```

### 3.3 Inline annotations (no new file; touches existing files)

Apply 14 `// @audit:rule` comments at the source sites of FE-01…FE-14. These are **comments only**, no functional change. Webpack treats them as comments — zero bundle impact.

Example at the Slow Movers branch in `ItemSalesHybridMockup.jsx`:
```js
} else if (activeTab === 'slow') {
  // @audit:rule id="FE-01" name="Slow Movers threshold"
  //   explains="An item is a Slow Mover if it sold ≤ 1 unit and is not currently cancelled."
  //   approved=false approvedDate="" approvedSource=""
  data = data.filter(d => d.qty <= 1 && d.status !== 'cancelled');
}
```

---

## 4. Edits to existing files

### 4.1 `/app/frontend/src/api/services/insightsService.js`

| Change | What | Why |
|---|---|---|
| §4.1.A | Parse `taxRate`, `taxType`, `taxCalc` from `food_details` once per line (in the line iteration block) | Source data for audit's expected-tax calculation |
| §4.1.B | Carry `taxRate`, `taxType`, `taxCalc` onto each `itemMap` row (single-value, not accumulated — first-seen wins per food_id) | Per-item rate availability in apiRows |
| §4.1.C | Track per-bucket `bothTaxesBooked_<bucket>` flags — `true` if any line in that bucket has both `gst_tax_amount > 0` AND `vat_tax_amount > 0` | Drives RED severity in audit |
| §4.1.D | Apply 4–5 `// @audit:rule` annotations (FE-07 through FE-13) | Manifest collector source sites |

### 4.2 `/app/frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx`

| Change | What | Why |
|---|---|---|
| §4.2.A | Import `auditSummary` from `auditEngine.js` | Computes audit on demand |
| §4.2.B | New `audit = useMemo(() => auditSummary(apiRows, 'S5', { tolerance: 0 }), [apiRows])` | Reactive audit recompute when data changes |
| §4.2.C | Map service row's new fields (`taxRate`, `taxType`, `taxCalc`, `bothTaxesBooked_sold/cancelled/comp`) through `apiRows` mapper | Audit engine input |
| §4.2.D | Add 6th tab `audit` to `TABS` array: `{ id: 'audit', label: 'Audit' }` | Tab strip |
| §4.2.E | Tab count badge changes — append `(N · m red, k amber, j review)` when `audit.total > 0` | At-a-glance severity |
| §4.2.F | New rendering branch in the table area when `activeTab === 'audit'` — table of flags grouped by severity | Audit tab UI |
| §4.2.G | In-place row tinting on the other 5 tabs — add `audit-flagged-{severity}` className lookup per row | Contextual visibility |
| §4.2.H | Download menu Excel + PDF rows — `enabled = !audit.blocksExport && rowsExist` + tooltip surfaces audit reason | Export gate |
| §4.2.I | Apply ~6 `// @audit:rule` annotations (FE-01 through FE-06) | Manifest collector source sites |

### 4.3 `/app/frontend/src/utils/reportExporter.js`

No code change. (The export gate is implemented at the consumer site — S5 — by disabling the menu items, not by changing the exporter.)

---

## 5. Audit tab UI

### 5.1 Header strip
- Title: `Audit · S5 Item Sales Hybrid`
- KPI strip: 4 cards — `Total flags` · `RED` (red tint) · `AMBER` (amber tint) · `REVIEW pending` (info-blue tint)
- Helper text: `Resolve all RED + AMBER before exporting. Approve REVIEW items via chat per §8 protocol.`

### 5.2 Table
Three sections, in order:

**Section 1 — 🔴 RED Data Integrity Failures**
Columns: Item · Bucket · Revenue · Actual Tax · Reason

**Section 2 — 🟠 AMBER Tax Calculation Mismatches**
Columns: Item · Bucket · Revenue · Actual Tax · Expected Tax · Δ · Rate · Reason

**Section 3 — 🔵 REVIEW Frontend Business Logic Disclosures**
Columns: Rule ID · Name · Category · Explains · Source · Owner Decision (pending)
Each row has two ghost buttons — `Approve` and `Reject` — clicking either copies a chat-paste line to clipboard like:
> `G1 approve` / `G1 reject — use qty ≤ 3 instead`
So owner can paste it directly back. No actual code modification triggered by the button.

### 5.3 Empty states
- No data flags + no review pending → "✅ Audit clean for this date range. Export ready."
- No data, with review pending → "🔵 No data anomalies. N FE rules awaiting approval."

### 5.4 `data-testid` table
| Element | Test ID |
|---|---|
| Audit tab button | `reports-items-tab-audit` |
| RED section table | `audit-red-table` |
| AMBER section table | `audit-amber-table` |
| REVIEW section table | `audit-review-table` |
| Per-row severity chip | `audit-row-chip-<RULE_OR_FOODID>` |
| Approve chat-paste button | `audit-review-approve-<RULE_ID>` |
| Reject chat-paste button | `audit-review-reject-<RULE_ID>` |
| Total KPI card | `audit-kpi-total` |

---

## 6. In-place flag display on other 5 tabs

On All Items / Top Sellers / Slow Movers / Cancelled / Complimentary tabs, rows that appear in the current `audit.flags` set get:

- Background tint: `bg-red-50` for RED, `bg-amber-50` for AMBER
- Left border: `border-l-4 border-red-400` / `border-l-4 border-amber-400`
- Inline chip after item name: `⚠ red` or `⚠ amber` linking to the Audit tab on click (sets `activeTab = 'audit'`)
- No tint for REVIEW (since REVIEW flags are rule-level, not row-level)

The other-tabs tinting is purely visual — sort, filter, count math is unchanged.

---

## 7. Export gate behaviour

Per Protocol §8.6:
- `audit.blocksExport = (audit.red + audit.amber + audit.review) > 0`
- When true:
  - Excel and PDF rows in the Download menu render with `disabled={true}` styling (same grey-out treatment as Email/WhatsApp/SMS today)
  - Tooltip on hover: `"Audit blocks export: m red, k amber, j review. Resolve in Audit tab."`
- When false:
  - Excel + PDF behave exactly as they do today (call `reportExporter.js` with full lensed payload)

---

## 8. Verification matrix (Gate ⑤)

| # | Test | Expected |
|---|---|---|
| 8.1 | Open S5 with `?from=2026-05-01&to=2026-06-02` | Loads. New 6th tab "Audit" present in tab strip with badge `N · m red, k amber, j review` |
| 8.2 | Click Audit tab | Three sections render (RED + AMBER + REVIEW); KPI strip shows correct totals |
| 8.3 | REVIEW section count | Equals 13 (FE-01..FE-13; FE-14 is pre-approved and shows in approved sub-list — actually 6 in S5 file + 7 in service = 13 candidates) |
| 8.4 | RED section | Any row where same food_id × bucket has both `gst_tax_amount > 0` AND `vat_tax_amount > 0` — count via service inspection should match Audit-tab RED count |
| 8.5 | AMBER section | For each row, `\|actualTax − expectedTax\| > 0` per current data. (Likely many — Pattern-B cancellations from earlier investigation will all surface here.) |
| 8.6 | On All Items tab, scroll the table | Flagged rows show amber/red left-border + chip |
| 8.7 | Click an amber chip on Cancelled tab | Navigates to Audit tab and scrolls to that row (or filters to it) |
| 8.8 | Download menu while audit > 0 | Excel + PDF rows disabled with tooltip surfacing the audit reason |
| 8.9 | Set date range to one with no data (e.g. `?from=2030-01-01&to=2030-01-02`) | Audit tab shows: 0 data flags but 13 REVIEW pending; export still blocked because REVIEW > 0 |
| 8.10 | Copy-paste a review row's Approve button | Clipboard contains `G1 approve` (or equivalent rule id) |
| 8.11 | Bundle size | `du -sh build/static/js` delta < 5 KB |
| 8.12 | Existing 5 tabs functionality | All tab counts, KPI numbers, exports, filters, sort, drill — unchanged |
| 8.13 | S2 (`/reports-module/items`) regression | No Audit tab on S2; numbers identical to S5 (excluding audit chip) |
| 8.14 | Lint | Zero new warnings on `auditManifest.js`, `auditEngine.js`, S5 file, service file |

---

## 9. Rollout sequence (atomic, single deploy)

1. Create `/app/frontend/src/utils/auditManifest.js` (FE-01..FE-14 entries)
2. Create `/app/frontend/src/utils/auditEngine.js`
3. Patch `insightsService.js` — add `taxRate`, `taxType`, `taxCalc`, `bothTaxesBooked_*` carry-throughs + 4–5 inline `// @audit:rule` annotations
4. Patch `ItemSalesHybridMockup.jsx` — import audit utilities, compute `audit` memo, new 6th tab, tab rendering branch, in-place tinting on other tabs, Download menu disable, 6 inline annotations
5. Lint all 4 files (`mcp_lint_javascript`)
6. Confirm `Compiled with warnings.` (no errors)
7. Screenshot S5 with date range that has data — verify Audit tab renders all 3 sections
8. Screenshot Download menu over flagged data — confirm Excel/PDF rows disabled
9. Smoke-verify clipboard copy on a REVIEW approve button
10. Hand back to owner for Gate ⑤ — review each REVIEW item, decide Approve / Reject
11. As owner approves each rule, flip `approved: false → true` in `auditManifest.js` (cosmetic doc update; no functional change)
12. Once REVIEW count hits 0 AND no RED/AMBER for chosen window, exports unlock automatically

Steps 1–9 are agent execution. Steps 10–12 are owner-paced iterations.

---

## 10. Affected files matrix

| File | Type | Change | LOC delta | Risk |
|---|---|---|---|---|
| `utils/auditManifest.js` (NEW) | utility | Static manifest, 14 entries | +120 | NONE |
| `utils/auditEngine.js` (NEW) | utility | 3 pure functions + 1 summary | +90 | LOW — no side effects |
| `api/services/insightsService.js` | service | Carry-through of rate/type/calc + bothTaxesBooked tracking + 4 annotations | +20 | LOW — additive |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | screen | Tab #6 + tab body + in-place tinting + Download disable + 6 annotations | +150 | MEDIUM — large UI delta but isolated to new tab + disabled-state of existing menu |
| `control/CR_REGISTRY.md` | doc | New CR row | +1 row | NONE (already shipped) |
| `control/CR_011_SCREEN_FREEZE_PROTOCOL.md` | doc | §8 added | +50 lines | NONE (already shipped) |
| `control/OWNER_DECISION_QUEUE.md` | doc | Category G + 14 rows | +30 lines | NONE (already shipped) |
| `control/SPRINT_STATUS.md` | doc | Owner Decision Log rows | +3 rows | NONE (already shipped) |

**Total code delta:** ~+380 LOC across 4 source files (2 new + 2 patched). **Total docs:** 4 control files (already updated).

---

## 11. Risk register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Audit produces a flood of AMBER flags from existing data anomalies, overwhelming owner | HIGH | LOW | Audit tab uses pagination + filter-by-bucket. Owner can sort by Δ descending to focus on biggest mismatches first. |
| R2 | Manifest collector missing an FE rule | MEDIUM | LOW | First run produces best-effort list. Owner can ask "did you cover X?" — adding it later is a one-line manifest edit. |
| R3 | Annotation comments accidentally compiled into bundle | LOW | LOW | They're pure comments. Webpack strips them. Verified at §2.3 build smoke. |
| R4 | `bothTaxesBooked_*` flag races with line-level data and gives false positives | LOW | MEDIUM | Computed per-line in service before bucketing; deterministic. Verified in §8.4. |
| R5 | Owner approves a REVIEW rule but forgets to update manifest → audit keeps flagging | MEDIUM | LOW | Approve button copies a chat-line to clipboard; agent updates manifest in next message. Audit will reflect on next reload. |
| R6 | Export gate blocks legitimate exports when REVIEW exists but data is clean | MEDIUM | LOW | This is intentional per §8.6 + owner's "until we solve all audit issues" directive. If owner wants exports unblocked while REVIEW pending, that's a separate decision (option to toggle in v2). |
| R7 | Audit tab JS bug → S5 crashes | LOW | HIGH | Audit memo wrapped in try/catch; on failure shows "Audit unavailable — exports allowed". |
| R8 | Tax rate parsing fails for malformed `food_details` | LOW | LOW | `parseFloat(... || 0)` fallback; missing rate → expectedTax = 0 → row flags AMBER if actual > 0. |

---

## 12. Rollback strategy

If §8 verification fails:
1. Revert all 4 code files (2 new + 2 patched) via `git checkout HEAD~ -- <files>`.
2. Manifest pre-seed in `OWNER_DECISION_QUEUE.md` Category G can stay (it's a tracking document).
3. Protocol §8 stays (it's a constitutional rule independent of implementation).
4. Owner Decision Log entry remains as audit trail.

No DB, no backend, no external side-effects → rollback is pure file revert.

---

## 13. Doc updates after merge

| Doc | Update |
|---|---|
| `CR_REGISTRY.md` row CR-011-AUDIT-01 | Status: `REGISTERED — PLANNING` → `IMPLEMENTED + AWAITING REVIEW` |
| `SPRINT_STATUS.md` Owner Decision Log | "CR-011-AUDIT-01 SHIPPED" row |
| `CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md` | New §3 "Audit gate added" |
| `CONTROL_DASHBOARD.md` | Last-updated note |
| This plan | Header status → `SHIPPED` |

---

## 14. Owner approval matrix (gates before any code edit)

| # | Approval | Why binding | Default if "go" |
|---|---|---|---|
| **A1** | Approve **this plan** as-is | Owner directive: "go write the plan" — plan now drafted | n/a |
| **A2** | Approve **§3 new utilities + service annotations** | New files + service touch | Implement as specified |
| **A3** | Approve **§4 S5 screen changes** (6th tab, in-place tinting, Download disable) | Visual + behavioural delta to S5 | Implement as specified |
| **A4** | Confirm **zero-tolerance** for AMBER deviations (no fudge) | Audit Summary v3 decision #4 | Yes |
| **A5** | Confirm **GST+VAT both booked = RED** (not amber) | Audit Summary v3 decision #6 | Yes |
| **A6** | Confirm **REVIEW count gates exports** (not just RED+AMBER) | Per §8.6 — owner's "until we solve all audit issues" implies REVIEW too. If owner wants softer ("REVIEW doesn't block exports"), say A6 = soft. | Hard gate (REVIEW blocks) |

Reply with all six in a single message (e.g. *"A1–A6 approved · go"*) and §9 executes atomically.

---

## 15. Estimated time

| Phase | Time |
|---|---|
| Create `auditManifest.js` + `auditEngine.js` (§3.1 + §3.2) | ~15 min |
| Patch service (§4.1) + inline annotations | ~10 min |
| Patch S5 screen — Audit tab UI + in-place tinting + Download disable + annotations (§4.2) | ~25 min |
| Lint + supervisor compile check (§9 steps 5–6) | ~3 min |
| Playwright screenshots S5 Audit tab + Download menu disabled (§9 steps 7–9) | ~10 min |
| Owner Gate ⑤ + approve/reject 13 REVIEW items | depends on owner |
| Doc updates (§13) | ~5 min after owner closes the REVIEW queue |

**Total agent time end-to-end:** ~70 min. Owner validation time depends on the pace of REVIEW resolutions.

---

## 16. Open questions for owner

| # | Question | Default if no answer |
|---|---|---|
| Q1 | After approving a REVIEW item via chat, do you want me to update `auditManifest.js` immediately, or batch them? | Update immediately per approval. |
| Q2 | Should the chat-paste buttons in the REVIEW section produce **G-prefixed** ids (G1..G13) matching `OWNER_DECISION_QUEUE.md`, or **FE-prefixed** ids matching the manifest (FE-01..FE-13)? | G-prefixed (matches the decision queue you'll already be looking at). |
| Q3 | If you reject a rule (e.g. "Slow Movers should be qty ≤ 3"), should that immediately trigger a follow-up sub-sub-CR or wait until you've cleared all 13? | Wait until all 13 resolved; one consolidated patch sub-CR. |
| Q4 | RED row treatment — currently shows both as RED in the Audit tab AND red-tint on the originating tab. Acceptable, or only in Audit? | Both. |
| Q5 | Should the data-scope fix (S2/S3/S5) be re-frozen before this CR ships, or can audit ship first? | Audit can ship first (they're independent). Owner closes data-scope fix on its own track. |

---

*This is a NO-EDIT plan. No source file has been modified. Implementation begins only after explicit §14 A1–A6 approvals.*
