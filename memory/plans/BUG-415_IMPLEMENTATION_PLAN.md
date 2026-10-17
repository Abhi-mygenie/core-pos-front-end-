# Implementation Plan — BUG-415
## Room Orders Report: Fix Y-axis Tick Formatter

**Date:** 2026-09-15
**Agent:** PLANNING (ALPHA v0.7)
**Gate:** 3 — Implementation Plan
**IA doc:** `impact/BUG-415_IMPACT_ANALYSIS.md`
**Entry verification:** L583 confirmed current — `tickFormatter={(v) => \`₹${(v/1000).toFixed(0)}k\`}` exactly as planned.

---

## Scope Lock

**Files WILL change:**
- `src/pages/reports-module/RoomOrdersMockup.jsx` — 1 edit site

**Files WILL NOT touch:** everything else

---

## Execution

### E1 — Replace tick formatter

**File:** `src/pages/reports-module/RoomOrdersMockup.jsx`
**Line:** 583

**Find (exact):**
```jsx
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
```

**Replace with:**
```jsx
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(1)}k` : `₹${Math.round(v)}`} />{/* BUG-415 */}
```

**Why this works:**
- `v < 1000` (e.g. ₹200, ₹800): shows `₹200`, `₹800` — no k suffix, no zero
- `v ≥ 1000` (e.g. ₹1200, ₹5400): shows `₹1.2k`, `₹5.4k` — 1 decimal for precision
- `v = 0`: shows `₹0` (not `₹0k`)

---

## Verification Matrix

| # | Test | Expected | How |
|---|---|---|---|
| V1 | Chart with low values (₹200, ₹800, ₹1200) | Y-axis: `₹200`, `₹800`, `₹1.2k` — no duplicates | Browser |
| V2 | Chart with high values (₹5000, ₹10000) | Y-axis: `₹5.0k`, `₹10.0k` | Browser |
| V3 | All values = 0 | Y-axis: `₹0` | Browser |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-415 → GATE_5A_IMPLEMENTED, gate: 5
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: RoomOrdersMockup.jsx — BUG-415
- [ ] Code marker: `// BUG-415` inline
- [ ] webpack: 0 new warnings

*Plan written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
