# BUG-723 — Implementation Plan (Gate 3) — 2026-11-20

**Batch:** B4-PRESETS · **Risk:** LOW · **Role:** PLANNING (plan only, NO code)
**IA:** `impact/BUG-723_IMPACT_ANALYSIS.md` · **Code Reality:** PARTIAL · **Conflict:** CLEAN

## Scope — 4 files (1 util + 3 screens)
WILL change: `utils/datePresets.js`, `pages/reports-module/SalesMockup.jsx`, `CancellationsMockup.jsx`, `DashboardMockup.jsx`.
WILL NOT touch: `AuditLogMockup.jsx` (B2; keeps its local `matchPreset`), `InsightsCacheProvider`, any service/transform, any other report screen.

## Edits (exact)

**E1 — `utils/datePresets.js`** — add a shared, pure `matchPreset` (verbatim copy of Audit's logic; `fmtISO` + `computePresetRange` already live in this file):
```js
// BUG-723: shared preset reconciler (was local to AuditLogMockup — BUG-697)
export const matchPreset = (from, to) => {
  if (!from || !to) return '';
  const t = new Date();
  const td = fmtISO(t);
  const now = new Date();
  const cands = {
    Today: { from: fmtISO(t), to: td },
    '7D': { from: fmtISO(new Date(t.getTime() - 6 * 86400000)), to: td },
    '30D': { from: fmtISO(new Date(t.getTime() - 29 * 86400000)), to: td },
    MTD: { from: fmtISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: td },
    LM: { from: fmtISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmtISO(new Date(now.getFullYear(), now.getMonth(), 0)) },
  };
  const fy = computePresetRange('FY');
  if (fy) cands.FY = fy;
  for (const [label, r] of Object.entries(cands)) {
    if (r.from === from && r.to === to) return label;
  }
  return '';
};
```

**E2 — `SalesMockup.jsx`**
- Import: `import { fmtISO, DATE_PRESETS, computePresetRange, matchPreset } from '../../utils/datePresets';` (L30).
- L121 chip init: `const [activePreset, setActivePreset] = useState(() => matchPreset(sharedFrom, sharedTo)); // BUG-723`
- `handlePreset` — propagate to shared in every branch. LM branch (after its 4 setters) add `setSharedFrom(lf); setSharedTo(lt);`; FY branch add `setSharedFrom(range.from); setSharedTo(range.to);`; generic tail (after `setAppliedTo(td)`) add `setSharedFrom(fd); setSharedTo(td);`.

**E3 — `CancellationsMockup.jsx`**
- Import matchPreset (L51). L206 chip init → `useState(() => matchPreset(sharedFrom, sharedTo)) // BUG-723`.
- `handlePreset` LM/FY/generic branches: add the same `setSharedFrom/setSharedTo` pairs mirroring E2.

**E4 — `DashboardMockup.jsx`**
- Import matchPreset (L32). L67 chip init → `useState(() => matchPreset(sharedFrom, sharedTo)) // BUG-723`.
- `handlePreset` (single tail, no early returns): before `setActivePreset(preset)` add `setSharedFrom(f); setSharedTo(t);`.

## Verification Matrix (seeds QA — account owner@cafe103.com / Qplazm@10, route `/reports-module/*`)
| # | Scenario | Expected | Automated? |
|---|----------|----------|:---:|
| 1 | Set FY in Audit → open Sales | Sales chip = FY; dates = FY range | NO (browser) |
| 2 | Set LM in Audit → open Dashboard | Dashboard chip = LM | NO |
| 3 | Set 30D in Audit → open Cancellations | Cancellations chip = 30D | NO |
| 4 | Pick FY on Sales → open Cancellations | Cancellations range + chip = FY (propagated) | NO |
| 5 | Pick a custom (non-preset) range via Apply | No chip highlighted (matchPreset → '') | NO |
| 6 | `matchPreset` unit | known ranges → labels; custom/empty → '' | YES |

## Unit test (NEW)
`utils/__tests__/datePresets.matchPreset.test.js` — assert `matchPreset` returns 'FY'/'LM'/'7D'/'Today' for `computePresetRange`/known inputs and `''` for a custom range and for empty args.

## Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| matchPreset drift vs Audit's copy | Low | verbatim copy; unit test; dedupe Audit later in B2 |
| Preset → shared causes refetch loop | Low | shared setters already used by handleApply with no loop; preset only sets, no effect dependency added |
| Chip shows '' on first load when default range ≠ a preset | Expected | matches Audit behaviour (BUG-697) |

## Post-Code Registry Checklist (for IMPLEMENTATION agent)
- [ ] registry.json: BUG-723 → IMPLEMENTED, gate GATE_5A
- [ ] CR_REGISTRY.md / BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: add the 4 files with `// BUG-723`
- [ ] Code markers `// BUG-723` in every modified file
- [ ] webpack compiles clean; matchPreset unit test passes

## Handover
Gate-3 plan ready — LOW risk, 4 files, no backend, no owner decision. Next: Gate-4 GO → IMPLEMENTATION.
