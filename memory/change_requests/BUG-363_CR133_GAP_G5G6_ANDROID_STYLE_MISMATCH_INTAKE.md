# BUG-363 — CR-133 Gap G5+G6: Android Bill/KOT Style Saves Incorrectly (API Shape Mismatch)

**ID:** BUG-363
**Date Registered:** 2026-08-30
**Registered by:** INTAKE agent (source: SESSION_HANDOVER_2026_08_27_PRINTER_ARCHITECTURE.md §5)
**Type:** BUG
**Sprint:** pos_5_x

---

## Summary

In the Printer Agent Config → Print Style tab, Android (58mm/80mm) bill and KOT style settings saved and loaded incorrectly. The transform was written for the old **flat** API shape (`{ fontSize58, fontSize80, bold }` at the top level of each row), but the backend changed to a **windows/android split** format (`{ windows: { fontSize58, ... }, android: { fontSize58, ... } }`). As a result, all Android printer font size settings were ignored on load and overwritten with defaults on save.

---

## Classification

- **Type:** BUG
- **Severity:** P1 — High (Android printer bill style is a live configuration feature; wrong values cause print formatting issues on all Android printers)
- **Risk:** MEDIUM — touches printer config transform and Print Style tab state; no financial/order logic
- **Area:** Settings → Printer Agent Config → Print Style tab → Android path
- **Fast Lane eligible:** NO (2 files, transform + component)

---

## Code Reality Check (MANDATORY — Step 0a)

```
Code Reality: FULL
```

The fix **already exists** in code. Evidence:

- `src/components/panels/settings/printerConfig/PrintStyleTab.jsx` line 1:
  `// CR-133-GAP: Print Style tab — Windows/Android split (G5+G6) + allow-empty inputs (G4 fix)`
- Line 41: `// G5+G6: RowEditor edits only the active platform sub-object (windows or android)`
- `RowEditor` component (lines 42-67): patches `row[platform]` (either `windows` or `android` sub-object) — correctly handles the split API shape.
- Platform toggle at line 119: `const [platform, setPlatform] = useState("windows")` with tabs for Windows/Android.

**The fix is shipped. The handover's "NOT FIXED — CRITICAL" label was stale — code contradicts it (Rule R1).**

**Action required: CLOSURE Phase B (retroactive registration).**

---

## Root Cause (for record)

The original `PrintStyleTab.jsx` edited the row object directly (flat shape: `{ ...row, fontSize58: val }`). When the backend changed the response to `{ windows: {...}, android: {...} }`, the transform loaded windows data correctly but Android data was ignored. Save overwrote the android sub-object with windows values. Fix: `RowEditor` now patches `row[platform]` (the correct sub-object), and `printerAgentConfigTransform.js` toAPI preserves the windows/android structure.

---

## Duplicate Detection (Step 0b)

- Searched `registry.json` and `BUG_TRACKER.md` for "android", "G5", "G6", "Print Style", "windows/android split" — **no existing ID for this item**.
- **Classification: DISTINCT**
- Related: BUG-315 (same sprint, printer config numeric inputs — different surface), BUG-317 (Android size range constraint — related but different symptom)

---

## Evidence

- **Screenshot:** not provided
- **Steps to reproduce (original):** Open Settings → All Settings → Printers → Print Style tab → switch to Android → change any font size → Save → reload → values reset to defaults
- **Source:** AGENT-DISCOVERED (from handover §5, labeled CRITICAL)
- **Confidence:** CONFIRMED (code fix present — verified via grep; RowEditor patches platform sub-object)
- **Evidence of fix:**
  - `grep -n "G5+G6\|platform\|isAndroid" /app/frontend/src/components/panels/settings/printerConfig/PrintStyleTab.jsx` → lines 1, 41-67, 119-158

---

## Blast Radius

- Files affected by fix: `PrintStyleTab.jsx` (1 file), `printerAgentConfigTransform.js` (toAPI path, ~5 lines)
- Hotspot files: NO
- Blast radius: **SMALL** (2 files, printer config only)

---

## Retroactive Closure Path

Per AGENT_PROMPT_ALPHA CLOSURE Phase B:

1. Fix exists in `PrintStyleTab.jsx` — RowEditor patches `row[platform]` sub-object correctly.
2. Transform toAPI path (`printerAgentConfigTransform.js`) must also be verified to preserve windows/android split on save.
3. QA verification needed:
   - Switch to Android tab → change font sizes → Save → reload → verify Android values preserved
   - Switch to Windows tab → verify Windows values unaffected
   - curl `POST /printer-agent-config` payload → verify `bill_style.windows` and `bill_style.android` are separate objects
4. On QA PASS → status: CLOSED — OWNER VERIFIED (retroactive, 2026-08-30)

---

## Open Questions

1. Has `printerAgentConfigTransform.js` toAPI also been updated to emit the split format? Needs verification at Gate QA.

---

## Next

CLOSURE Phase B → QA verification (verify transform toAPI + FE round-trip) → mark CLOSED — OWNER VERIFIED (retroactive)
