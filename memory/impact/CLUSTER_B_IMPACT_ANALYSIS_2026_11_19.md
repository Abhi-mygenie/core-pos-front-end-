# Impact Analysis (Gate 2) — Cluster B: Cancellation Reports — 2026-11-19

**Role:** PLANNING (Gate 2) · **Sprint:** nov_cr_batch · **Client:** ALL · **Assignee:** Abhishek (FE, not backend-blocked)
**Items:** BUG-714, BUG-715, BUG-716, BUG-717, BUG-718, BUG-729
**Priority:** P0 (owner flat-override) · **Risk:** LOW/MEDIUM (display/filter/navigation; no money, no data write)

---

## Header — mandatory checks

**Code Reality: FULL.** All six are defects *inside* freshly-shipped code (CR-554/555/556 + BUG-708/713 batch, passed live QA iteration_8). This is fix-forward, NOT retroactive registration and NOT greenfield.

**Conflict Pre-Check:**
- Target files last modified by: `CancellationsMockup.jsx` → BUG-707 (2026-11-19), CR-524/BUG-674 (2026-11-16); `CancelDetailMockup.jsx` → CR-554/556 (2026-11-19). No *other* OPEN item holds these files except the two below.
- **⚠ CROSS-CLUSTER CONFLICT — BUG-723 (Cluster E, preset chip).** BUG-723 edits `CancellationsMockup.jsx:206` (`useState('7D')` → `matchPreset(...)`) + a new import, and shares the file with this cluster.
  - **Resolution:** line-ranges are DISJOINT (B touches 445/662/854/1015; 723 touches 206 + import region ~L51). **Parallel-safe by content, but MUST be implemented in the SAME owner-session / single PR on this file** — never two independent branches. Recommend: implement Cluster B first, then BUG-723 in the same session (or vice-versa), compile once at the end.
- No conflict on `CancelDetailMockup.jsx` (B-only).

**BUG-723 validation (watch-first, per owner request):** CONFIRMED.
- `CancellationsMockup.jsx:206` and `CancelDetailMockup.jsx:46` both hard-code `activePreset = '7D'`.
- `AuditLogMockup.jsx:194` already fixed via `useState(() => matchPreset(sharedFrom, sharedTo))` (BUG-697); `matchPreset` is a LOCAL un-exported fn (`AuditLogMockup.jsx:35`).
- BUG-723's fix will extract `matchPreset` into `utils/datePresets.js` and consume it. **Cluster B does NOT touch `datePresets.js` nor line 206** → no overlap with B's edits.

---

## Data-flow (shared context)

API `insights-cancellations` → `fetchInsightsCancellations(from,to)` → both screens.
Date range is shared app-wide via `InsightsCacheContext` (`sharedFrom/sharedTo`, default = today). Both screens seed `fromDate/appliedFrom` from it but pin the preset chip to `'7D'` (the BUG-723 surface, out of B-scope).
Risk tier is centralised in `utils/riskTier.js` (`getRiskTier`, `RiskBadge`, `durationMins`) — already shared; **do NOT re-implement**.

---

## Per-item impact

| ID | Sev | Risk | File(s) | Root cause (verified in code) | Downstream |
|----|-----|------|---------|-------------------------------|-----------|
| **BUG-714** | P2 | LOW | `CancellationsMockup.jsx` | Scope `<select>` renders only on the *All* tab (`L955-957`), but `filteredTable` applies `scopeFilter` on every tab (`L445`). A stale `scopeFilter` set on *All* then persists invisibly on *Item/Order* tabs → 0 rows, only the Clear button hints at it. | Table row count only. No export/KPI effect (KPIs come from backend summary, not `filteredTable`). |
| **BUG-715** | P2 | LOW | `CancellationsMockup.jsx` + `CancelDetailMockup.jsx` | Punch Time formatted with `new Date(created_at).toLocaleString('en-IN', {...})` and **no `timeZone`** (`Cancellations L1015`, `Detail L169`) → renders in browser TZ while Order/cancel columns are IST wall-clock. In a non-IST browser the two disagree by ~5.5h. | Display only. Also affects export (see BUG-718). |
| **BUG-716** | P3 | LOW | `CancelDetailMockup.jsx` | `tbody` maps `analytics.items` then `tfoot` TOTAL, with **no empty-state row** (`L161-177`). Report screen has one (`Cancellations L1023-1025`, `colSpan=7`); detail does not. | Cosmetic. |
| **BUG-717** | P3 | LOW | `CancelDetailMockup.jsx` | (a) subtitle `L122` still says "filterable by stage & reason" though 5 filters exist; (b) Order cell `L163` shows raw `{cancel_date} {cancel_time}` vs report's formatted date; (c) scope options `L144` map sorted `analytics.scopes` → Item-Level first, whereas report (`L956`) is Full Order first. | Cosmetic / consistency. |
| **BUG-718** | P3 | LOW | `CancelDetailMockup.jsx` | `buildExportPayload` rows = `analytics.items` whose `punchTime = i.created_at` (raw ISO, `L81`); export column `punchTime` (`L108`) dumps `2026-10-01T22:17:29+05:30`. | Export files only. **Parity note:** report export (`Cancellations L289/424`) has the same latent raw-ISO punchTime — OUT of BUG-718 scope; flagged below. |
| **BUG-729** | P2 | LOW (x-axis) / **NEEDS-REPRO** (loss) | `CancellationsMockup.jsx` | (a) Daily Trend `XAxis tickFormatter={(v)=>v.slice(0,5)}` (`L854`) → `"2026-11-19".slice(0,5)` = `"2026-"` clipped. CONFIRMED FE fix. (b) "Revenue Loss chart empty": the Daily chart plots counts; loss shows only in `BarTooltip` from `daily[].orderLoss/itemLoss` = `by_day.order_loss/item_loss` (`L327-328`). If backend `by_day` omits those keys, tooltip loss = ₹0. **NOT confirmed FE-only** — needs a live `by_day` payload probe. | (a) x-axis labels. (b) tooltip loss figure / possible BACKEND_BRIEF. |

---

## Owner decisions (surface before Gate 4)

1. **BUG-715/718 timezone source:** hard-code `'Asia/Kolkata'` (all MyGenie clients are IST) vs a per-restaurant timezone field. *Recommendation: hard-code `'Asia/Kolkata'` — no restaurant-TZ field exists today.*
2. **BUG-729 "empty Loss chart":** approve a QA/curl probe of the `insights-cancellations` `by_day` payload. If `order_loss`/`item_loss` are absent → raise BACKEND_BRIEF (Gyan); the x-axis clip is fixed FE regardless.
3. **BUG-718 parity:** fix the *report-screen* export's raw-ISO punch time too (same defect, out of the registered BUG-718 scope), or leave for a separate item? *Recommendation: include it in the same PR for consistency — ~1 line.*

## Scope lock (preview)
- **WILL change:** `CancellationsMockup.jsx`, `CancelDetailMockup.jsx`.
- **WILL NOT touch:** `utils/riskTier.js`, `utils/datePresets.js`, `InsightsCacheContext.jsx`, `insightsService.js`, backend. (datePresets/line-206 belong to BUG-723.)

**Next:** Gate 3 Implementation Plan → `plans/CLUSTER_B_IMPLEMENTATION_PLAN_2026_11_19.md`.
