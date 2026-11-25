# Gate 3 — Implementation Plan — Cancellation Reports batch — 2026-11-19 (REV 2: BUG-708 folded in)

**Role:** PLANNING (ROLE 2) · stage = implementation_plan (plan only — NO code in this gate)
**Items:** BUG-713, CR-554, CR-555, CR-556 **+ BUG-708 (folded in this revision)** · **P0** · release 2026-11-17 · assignee Abhishek · sprint nov_cr_batch
**Upstream:** IA `impact/BATCH_2026_11_19_CANCELLATION_REPORTS_IA.md` (BUG-713/CR-554/555/556) · IA `impact/BATCH_2026_11_19_IMPACT_ANALYSIS.md` §BUG-708 · Mockup `frontend/public/cancellation_reports_mockup.html` · Design `design_guidelines.json`
**Owner decisions locked:**
- CR-555 thresholds = CR-543 **5/15/30** (Audit consistency). Column layout = **7-group consolidated** (from mockup). CR-556 duration filter = **risk-tier dropdown**.
- **BUG-708 (owner 2026-11-19): REMOVE the "Cancel Note" column.** Owner confirmed the column carries no data and is not wired to any backend key — see "BUG-708 confirmation" below.
**Scope:** 100% frontend. No backend, no contract change (live probe confirmed all fields present). No money path.

---

## BUG-708 confirmation (evidence the column is dead)
- `CancellationsMockup.jsx` renders `r.cancelNote` at L972–975, but the screen's own transform (L254–289, mapping `cancelBackend.items`) **never defines a `cancelNote` key** → `r.cancelNote` is always `undefined` → cell always renders "—".
- Repo-wide, `cancelNote` is only ever produced in `api/services/insightsService.js:313` (`cancelNote: line.cancel_item_note || ''`) which feeds a **different** consumer (single-order detail), NOT this report's `fetchInsightsCancellations` path.
- IA live probe (Cafe 103, 65 cancelled rows): backend `cancel_item_note` is **empty in all 65 rows**; `cancel_note` does not exist; only `notes` carries content (8/65) and is already shown by the working "Notes" column.
- Export config (L402–416) **never included** `cancelNote` → removing the column has **zero export impact**.
**Verdict:** removing the column deletes no data and is layout-positive (one fewer column helps BUG-713 overflow).

---

## RECOMMENDATION: one batch, sequenced internally (do NOT ship as 5 separate changes)

**Ship as ONE batch / one PR**, built in this internal order:

| Step | Work | Why this order |
|---|---|---|
| 0 | **Shared util** `utils/riskTier.js` (+ refactor Audit to use it) | Foundation for CR-555 badge + CR-556 risk filter; prevents threshold drift |
| 1 | **BUG-713 + CR-554 + BUG-708** (table layout on both screens → 7 groups incl. Punch Time + Duration; **drop the dead Cancel Note column**) | Same `<thead>/<tbody>` edit; doing BUG-708 inside the same restructure avoids a second overlapping edit |
| 2 | **CR-555** (risk badge into the shared Timing & Risk column on both screens) | Needs Duration present (step 1) + util (step 0) |
| 3 | **CR-556** (filter bar on both screens, incl. risk-tier) | Risk-tier filter needs CR-555's tier; filters sit above the finished tables |

**Why one batch, not five:**
- All five touch the **same two files** (`CancellationsMockup.jsx`, `CancelDetailMockup.jsx`). Separate changes = overlapping edits to the same `<thead>/<tbody>` → repeated merge/QA churn.
- BUG-713, CR-554, CR-555, CR-556 are **dependency-chained**; BUG-708 is a column deletion inside the exact table BUG-713 rebuilds — cheapest to do in the same pass.
- Same sprint / owner / release / risk profile; **one QA pass** covers all five + regression.
- **Conflict register:** with BUG-708 folded in, there is now **no remaining open same-file item**. Last modifiers of `CancellationsMockup.jsx` (BUG-707, CR-524, BUG-674) are all GATE_5A_IMPLEMENTED (not actively editing). `CancelDetailMockup.jsx` has no other open items. **Batch is conflict-free.**

---

## File-by-file changes

### 0. NEW `src/utils/riskTier.js`
- `durationMins(createdAt, cancelTimeFull)` → reuse the exact calc in `CancellationsMockup.jsx` L284–288 (null-safe): `const s=Date.parse(createdAt), e=Date.parse(cancelTimeFull); return Number.isFinite(s)&&Number.isFinite(e) ? Math.max(0, Math.round((e-s)/60000)) : null;`
- `getRiskTier(mins)` → **behaviour-identical to** `AuditLogMockup.jsx` L69–74: `mins>=30 → 'high_risk' · >=15 → 'risk' · >=5 → 'doubt' · else → 'ok'`. Add one guard at top: `if (mins == null) return null;` (Audit never passes null, so refactor stays neutral).
- `RISK_TIER_CONFIG = { doubt:{label:'Doubt',icon:Clock,classes:'bg-amber-50 text-amber-700 border-amber-200'}, risk:{label:'Risk',icon:AlertTriangle,classes:'bg-orange-50 text-orange-700 border-orange-200'}, high_risk:{label:'High Risk',icon:ShieldAlert,classes:'bg-red-50 text-red-700 border-red-200'} }` (icons imported from `lucide-react`).
- `RiskBadge({ mins })` presentational component → computes tier; renders nothing for `null`/`'ok'`; else a pill from `RISK_TIER_CONFIG`. Add `data-testid="risk-badge-<tier>"`.
- **Refactor** `AuditLogMockup.jsx` L69–74: delete the local `getRiskTier` body and `import { getRiskTier } from '../../utils/riskTier';`. All call sites (L242–245) unchanged → regression-neutral. Add `// CR-555` marker on the import line.

### 1. `src/pages/reports-module/CancellationsMockup.jsx` — BUG-713 + BUG-708 + CR-555 + CR-556
- **Data:** already present per row — `punchTime` (L282), `cancelTimeFull` (L283), `cancellationDuration` (L284–288). No transform change needed for layout. (Leave the dead `cancelNote` render to be deleted, not mapped.)
- **BUG-708 (DELETE dead column):**
  - Remove header `<th>Cancel Note</th>` at **L942**.
  - Remove its cell block at **L971–978** (the `{r.cancelNote ? … : —}` `<td>`).
  - No transform edit (there is nothing mapped to remove). No export edit (cancelNote absent from L402–416).
- **BUG-713 (on-screen table, header L932–947 / body L949–988):** rebuild from 13 flat columns to **7 groups** (after BUG-708 removal there are 12 columns to consolidate):
  1. **Order Info** — `#{orderNumber}` (L934/952) + `Date` (L936/954, keep BUG-707 formatter)
  2. **Item** — `foodName` (L935/953) + Scope pill (L939/957–961)
  3. **Reason / Notes** — `reason` (L940/962) + `notes` icon (L941/963–970)
  4. **Stage** — `stageBadge` (L938/956)
  5. **Loss** — `amount` red (L937/955)
  6. **Personnel** — `cancelledBy` (L943/979) + `station` (L946/982)
  7. **Timing & Risk** — `punchTime` (L944/980) + `cancellationDuration` (L945/981) + **CR-555 `<RiskBadge mins={r.cancellationDuration} />`**
  - Update the empty-state `colSpan` at **L986** from `12` → **`7`** (matches the new group count; also fixes the pre-existing off-by-one — old table had 13 cols but colSpan 12).
  - Keep `overflow-x-auto` (L930) as a safety net only; at ≥1366px the 7-group table must fit with no horizontal scroll.
- **CR-555:** render `<RiskBadge mins={r.cancellationDuration} />` in the Timing & Risk cell; nothing shown when duration is `null` (the empty-`created_at` rows). Icons already imported (`Clock, AlertTriangle, ShieldAlert` L42–44).
- **CR-556:** add state `stageFilter, scopeFilter, reasonFilter, cancelledByFilter, riskTierFilter` (near L189); add a filter bar (white `rounded-xl` card) above the table (~L928); extend `filteredTable` (L423–428) to AND these filters on top of `activeScope`. Option lists derived from `cancelledItems`. Risk-tier options map to `getRiskTier` buckets (doubt/risk/high_risk). `Clear` button. testids: `cx-filter-stage|scope|reason|cancelledby|risk`, `cx-filter-clear`.
  - **Scope-tab interplay:** the All/Item/Order scope tabs (`activeScope`, L643) already filter scope. Hide/disable the Scope *filter* while a non-"All" scope tab is active (avoid double control) — document in a `// CR-556` comment.

### 2. `src/pages/reports-module/CancelDetailMockup.jsx` — CR-554 + CR-555 + CR-556
- **State (L51–52):** add `scopeFilter, cancelledByFilter, riskTierFilter` (`useState('')` each).
- **Imports (L15):** add `Clock, ShieldAlert` to the lucide import; `import { RiskBadge, getRiskTier, durationMins } from '../../utils/riskTier';`.
- **Data (`analytics`, L73–84):** enrich each filtered item with `punchTime = i.created_at` and `cancellationDuration = durationMins(i.created_at, i.cancel_time_full)`; derive `scopes = [...new Set(items.map(i=>i.scope).filter(Boolean))]` and `cancelledByList = [...new Set(items.map(i=>i.cancelled_by).filter(Boolean))]`; extend the filter chain (L79–80) with `scopeFilter` (`i.scope`), `cancelledByFilter` (`i.cancelled_by`), and `riskTierFilter` (`getRiskTier(durationMins(i.created_at,i.cancel_time_full)) === riskTierFilter`). Add `scopes`, `cancelledByList` to the returned object; dep array (L84) gains the 3 new filters.
- **CR-554 + layout (table L135–163):** restructure the 8 columns to **7 groups**: Order Info (`#{order_id}` + `cancel_date`) · Item (`name` + `× qty`) · Stage · Loss · Reason · By · **Timing & Risk (`punchTime` + `cancellationDuration` + `<RiskBadge>`)**. Update header row L136–143 and body row L147–154 to match.
- **CR-555:** render `<RiskBadge mins={item.cancellationDuration} />` in the Timing & Risk cell (duration computed in analytics map above).
- **tfoot (L158–163):** recompute colSpans for the 7-group layout — TOTAL label cell, then Qty total, Loss total, then a trailing `<td colSpan={N} />` so the footer spans exactly 7 columns (currently `colSpan={5}` for the old 8-col table). Verify visually.
- **CR-556 (filters L128–132):** add Scope, Cancelled By, Risk-Tier `<select>`s alongside existing Stage + Reason; update the Clear button condition (L131) to include the 3 new filters and reset them. testids: extend the existing `s28-filter-*` family → `s28-filter-scope`, `s28-filter-cancelledby`, `s28-filter-risk`.
- **Export parity (`buildExportPayload`, L90–95):** add `{ key: 'punchTime', label: 'Punch Time', format: 'text', align: 'left', width: 120 }` and `{ key: 'cancellationDuration', label: 'Duration (min)', format: 'integer', align: 'right', width: 90 }` to the columns array so downloads match the screen (rows already carry these keys after the analytics enrichment).

---

## Scope lock
- **WILL change:** `src/utils/riskTier.js` (NEW), `src/pages/reports-module/CancellationsMockup.jsx`, `src/pages/reports-module/CancelDetailMockup.jsx`, `src/pages/reports-module/AuditLogMockup.jsx` (import refactor only).
- **WILL NOT touch:** `insightsService.js` (no transform/contract change), export config of CancellationsMockup (L402–416 stays flat), any backend, any other report page.

## Verification matrix (single QA pass — testing_agent after build)
| Item | File | Test | Automated? |
|---|---|---|:--:|
| BUG-713 | CancellationsMockup | At 1366×768, Cancellations table shows all 7 groups incl. Punch Time + Duration with **no horizontal scroll**; `document` has no element wider than viewport. | NO (browser) |
| BUG-708 | CancellationsMockup | "Cancel Note" column is **gone** from header and every row; "Notes" column still renders `notes` (8/65 rows have content); empty-state colSpan spans full width. | NO (browser) |
| CR-554 | CancelDetailMockup | Item Cancellation Detail shows Punch Time + Duration; values equal the Cancellations screen for the same order/item; Excel/PDF export now includes both columns. | NO (browser + download) |
| CR-555 | both screens + riskTier util | Boundary durations 4/5/14/15/29/30 min → ok(no badge)/doubt/doubt/risk/risk/high_risk, identical on both screens and equal to Audit tier for the same order. Null duration → no badge. | YES (util unit) + browser |
| CR-556 | both screens | Each filter (Stage/Scope/Reason/Cancelled By/Risk-Tier) narrows rows; combined filters AND; Clear resets all; counts/totals update. Scope filter hidden while a scope tab is active (Cancellations). | NO (browser) |
| Regression | both + Audit | CR-524 punch/duration columns + Excel/PDF export intact; `AuditLogMockup` risk bars unchanged after getRiskTier import refactor; existing `s28-filter-stage/reason`; scope tabs; date presets; KPI tiles. | NO (browser) |

## Post-Code Registry Checklist (Implementation agent executes after coding)
- [ ] registry.json: BUG-713, CR-554, CR-555, CR-556, **BUG-708** → status `IMPLEMENTED`, sprint_key `nov_cr_batch`.
- [ ] BUG_TRACKER.md: BUG-713 + BUG-708 rows updated to IMPLEMENTED. CR_REGISTRY.md: CR-554/555/556 rows updated.
- [ ] FILE_OWNERSHIP.md: add `utils/riskTier.js`, `CancellationsMockup.jsx`, `CancelDetailMockup.jsx`, `AuditLogMockup.jsx` with IDs + date.
- [ ] Code markers: `// BUG-713`, `// BUG-708`, `// CR-554/555/556` in every modified file.
- [ ] webpack compiles with 0 new warnings.

## Rollback
Pure FE. Revert the two report components + the `AuditLogMockup` import line, delete `utils/riskTier.js`. BUG-708 rollback = restore the deleted header L942 + cell block. No data/migration impact.

## Estimate / risk
~1 focused FE session. Risk LOW–MEDIUM (display/filter only, no money path). BUG-708 = LOW (dead-column deletion, owner-confirmed). Thresholds, layout, and the BUG-708 decision are all pre-decided → low ambiguity.

---
**Handover:** Gate 3 plan complete for **BUG-713 + CR-554/555/556 + BUG-708** as a single sequenced FE batch. Conflict register now clean (BUG-708 folded in; no open same-file items). Ready for Gate 4/5 (implementation) by the execution role, which MUST run testing_agent before marking any item fixed.
