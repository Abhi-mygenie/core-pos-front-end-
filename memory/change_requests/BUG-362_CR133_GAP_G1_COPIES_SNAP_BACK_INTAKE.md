# BUG-362 — CR-133 Gap G1: Bill/KOT Copies Inputs Snap Back to 1

**ID:** BUG-362
**Date Registered:** 2026-08-30
**Registered by:** INTAKE agent (source: SESSION_HANDOVER_2026_08_27_PRINTER_ARCHITECTURE.md §5)
**Type:** BUG
**Sprint:** pos_5_x

---

## Summary

In the Printer Agent Config → Auto Print tab, the Bill Copies and KOT Copies number inputs snap back to 1 whenever the user types a new value. The user cannot enter more than 1 copy because the controlled input fires `onChange` on every keystroke, and the parent state update forces a re-render before the user finishes typing.

---

## Classification

- **Type:** BUG
- **Severity:** P2 — Medium (copies stuck at 1 is a usability issue; workaround: none)
- **Risk:** LOW — single UI component, no financial/order logic
- **Area:** Settings → Printer Agent Config → Auto Print tab
- **Fast Lane eligible:** NO (2 files touched by fix — exceeds 1-file limit)

---

## Code Reality Check (MANDATORY — Step 0a)

```
Code Reality: FULL
```

The fix **already exists** in code. Evidence:

- `src/components/panels/settings/shared.jsx` line 5:
  `// CR-133-GAP: G1 fix — NumberInput allow-empty onChange + blur clamp`
- `shared.jsx` `NumberInput` component has `localVal` state + `onBlur` clamp (same pattern as `StyleInput` in `PrintStyleTab.jsx`).
- `AutoPrintTab.jsx` line 30-31 imports `NumberInput` from `../shared` and uses it for Bill/KOT copies.

**The fix is shipped. The handover's "NOT FIXED" label was stale — code contradicts it (Rule R1).**

**Action required: CLOSURE Phase B (retroactive registration).**

---

## Duplicate Detection (Step 0b)

- Searched `registry.json` and `BUG_TRACKER.md` for "copies", "G1", "snap", "NumberInput" — **no existing ID for this exact symptom in the Printer Agent path**.
- BUG-315 covers the same pattern (numeric inputs can't be cleared) in `PrintStyleTab.jsx` but was a separate surface. The G1 fix in `shared.jsx` was shipped alongside BUG-315 fixes but never received its own ID.
- **Classification: DISTINCT** (different file, different component, same root pattern as BUG-315 but independent fix)
- Related: BUG-315 (IMPLEMENTED, same snap-back pattern in PrintStyleTab)

---

## Evidence

- **Screenshot:** not provided
- **Steps to reproduce (original):** Open Settings → All Settings → Printers → Auto Print tab → try to change Bill Copies from 1 to 2 → input snaps back to 1 on every keystroke
- **Curl:** not applicable (pure FE state bug)
- **Source:** AGENT-DISCOVERED (from handover §5)
- **Confidence:** CONFIRMED (code fix already present — verified via grep)
- **Evidence of fix:** `grep -n "G1 fix\|localVal" /app/frontend/src/components/panels/settings/shared.jsx` → lines 5, 27

---

## Blast Radius

- Files affected by fix: `shared.jsx` (1 file, ~15 lines)
- Consumers of `NumberInput` from shared: `AutoPrintTab.jsx` (confirmed)
- Hotspot files: NO
- Blast radius: **SMALL**

---

## Retroactive Closure Path

Per AGENT_PROMPT_ALPHA CLOSURE Phase B:

1. Fix exists at `shared.jsx` lines 5, 25-50 (NumberInput with localVal + onBlur clamp)
2. `AutoPrintTab.jsx` imports `NumberInput` from `../shared` → consumers automatically benefit
3. QA verification needed: open Auto Print tab, enter "2" for Bill Copies → verify value saves, does not snap back
4. On QA PASS → status: CLOSED — OWNER VERIFIED (retroactive, 2026-08-30)

---

## Open Questions

None. Fix is complete. Needs QA verification only.

---

## Next

CLOSURE Phase B → QA verification → mark CLOSED — OWNER VERIFIED (retroactive)
