# BUG-675 — Remove "Total sale: ₹X" subtitle under Cash Collected — Impact Analysis (Gate 2) — 2026-11-15

**Role:** PLANNING (Gate 2 only)
**Code Reality:** FULL — both target lines confirmed in source
**Conflict Pre-Check:** CLEAR — no open items touching SettlementPanel or SettlementPage
**Risk:** LOW (cosmetic subtitle removal, no data/logic change)
**Backend-blocked:** NO

---

## Owner Decision (locked)

BUG-629 fix removed "definition pending" text. Owner screenshot (round 3) shows the remaining visible text is the **subtitle line** on the Cash Collected KPI card: `Total sale: ₹2,015`. Owner decision: **remove the subtitle entirely** (not replace with something else).

SettlementMockup.jsx L181 is separately being deleted under CR-372-B — no edit needed there.

---

## Probe Results

No API probe needed — root cause fully in FE source code.

---

## Data Flow Trace

```
SettlementPanel.jsx / SettlementPage.jsx
  → <KpiCard label="Cash Collected" value={totals.cashCollected}
       sub={<span data-testid="…">{`Total sale: ${fmt(totals.totalSale)}`}</span>}
     />
  → KpiCard renders sub prop below the value → user sees "Total sale: ₹X"
  FIX: remove sub={...} prop entirely → KpiCard renders with no subtitle
```

---

## Affected Code

| Site | File | Line | Current | Fix |
|------|------|------|---------|-----|
| S-1 | `src/components/panels/SettlementPanel.jsx` | 249 | `sub={<span data-testid="settlement-panel-total-sale-footnote">{`Total sale: ${fmt(totals.totalSale)}`}</span>}` | Remove `sub={...}` prop entirely |
| S-2 | `src/pages/SettlementPage.jsx` | 224 | `sub={<span data-testid="settlement-total-sale-footnote">{`Total sale: ${fmt(totals.totalSale)}`}</span>}` | Remove `sub={...}` prop entirely |

---

## Files WILL change

| File | Change |
|------|--------|
| `src/components/panels/SettlementPanel.jsx` | Remove `sub` prop at L249 |
| `src/pages/SettlementPage.jsx` | Remove `sub` prop at L224 |

## Files WILL NOT touch

| File | Reason |
|------|--------|
| `src/pages/SettlementMockup.jsx` | Deleted under CR-372-B; do not edit |
| Any settlement transform / API | No data change — purely cosmetic |
| `KpiCard` component | Interface unchanged; removing a prop is backward-safe |

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | data-testid `settlement-panel-total-sale-footnote` / `settlement-total-sale-footnote` will disappear | LOW | No test currently asserts on these testids. Remove testid with the span. |
| R-2 | CR-372-B deletes SettlementMockup.jsx — do not accidentally edit it | LOW | Only touch the two files listed above. |

---

## Owner Decisions

| OD | Decision |
|----|----------|
| OD-675-A | Remove the subtitle entirely (not replace). |
| OD-675-B | SettlementMockup.jsx is deleted under CR-372-B — no edit needed. |

---

## Verification Matrix (seeds QA handover)

| # | Verification | Method | Automated? |
|---|-------------|--------|:---:|
| V-1 | Settlement page: Cash Collected KPI card has no subtitle | Browser: open Settlement → verify card | NO |
| V-2 | No "Total sale" text anywhere on Settlement page | Browser: visual scan | NO |
| V-3 | SettlementPanel: same (panel view, not page) | Browser: check panel | NO |
| V-4 | Compile: 0 new warnings | `webpack compiled` | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-675 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: SettlementPanel.jsx + SettlementPage.jsx + BUG-675 + date
- [ ] Code marker: // BUG-675 on the edited lines
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change:** `src/components/panels/SettlementPanel.jsx` · `src/pages/SettlementPage.jsx`
**Files WILL NOT touch:** `SettlementMockup.jsx` · all transforms · all APIs
**BLOCKERS: NONE** — Code Reality FULL, owner decision locked, no backend dependency.

```
Planning complete: BUG-675
Stage: Impact Analysis (Gate 2)
Code reality: FULL
Risk: LOW
Files WILL change: SettlementPanel.jsx (L249), SettlementPage.jsx (L224)
Files WILL NOT touch: SettlementMockup.jsx, all transforms, all APIs
Owner decisions: LOCKED (remove subtitle; skip Mockup)
Docs: memory/impact/BUG-675_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) — ready, no open ODs
```
