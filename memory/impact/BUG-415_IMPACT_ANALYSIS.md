# Impact Analysis — BUG-415
## Room Orders Report: Y-axis Ticks Show ₹0k or Collide at Low Values

**Date:** 2026-09-15  **Agent:** PLANNING (ALPHA v0.7)  **Stage:** Gate 2
**Code Reality:** NONE — fix not applied
**Duplicate check:** DISTINCT
**Conflict pre-check:** RoomOrdersMockup.jsx — no recent modifications in target section. Zero conflicts.

---

## Risk Classification

**Risk: LOW**  
Trigger: Display only. One formatter function on one chart. No data, no API, no business logic.

---

## Root Cause Trace

```
RoomOrdersMockup.jsx L583:
  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />

Behaviour at small values:
  v=200  → (200/1000)=0.2 → .toFixed(0)='0' → shows '₹0k'  ← implies zero, wrong
  v=800  → (800/1000)=0.8 → .toFixed(0)='1' → shows '₹1k'
  v=1200 → (1200/1000)=1.2 → .toFixed(0)='1' → shows '₹1k'  ← same as ₹800, collision

Fix:
  (v) => v >= 1000
    ? '₹' + (v/1000).toFixed(1) + 'k'   // ₹1.2k, ₹5.4k
    : '₹' + Math.round(v)                 // ₹200, ₹800 (no k suffix)
```

---

## Affected Files

### WILL CHANGE — `src/pages/reports-module/RoomOrdersMockup.jsx`

| Edit | Location | Current | Change |
|---|---|---|---|
| E1 | Line 583 | `tickFormatter={(v) => \`₹${(v/1000).toFixed(0)}k\`}` | Replace with smart formatter: `tickFormatter={(v) => v >= 1000 ? '₹' + (v/1000).toFixed(1) + 'k' : '₹' + Math.round(v)}` |

**1 edit site, 1 line**

### WILL NOT TOUCH
- Everything else

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Chart with values ₹200, ₹800, ₹1,200 | Y-axis: ₹200 · ₹800 · ₹1.2k (no duplicates, no ₹0k) |
| V2 | Chart with values ₹5,000, ₹10,000 | Y-axis: ₹5.0k · ₹10.0k |
| V3 | All values = 0 | Y-axis: ₹0 (not ₹0k) |

---

## Owner Decisions: NONE — 1 line fix, no business rule

## Post-Code Registry Checklist

- [ ] registry.json: BUG-415 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: RoomOrdersMockup.jsx BUG-415
- [ ] Code marker: `// BUG-415`
- [ ] webpack: 0 new warnings

*IA written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
