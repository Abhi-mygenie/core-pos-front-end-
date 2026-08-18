# CR-167 — Printer Agent: Add/Edit Printer Wizard → Single-Step Inline Form

**ID:** CR-167
**Type:** CR (UX Improvement)
**Severity:** P2 — MEDIUM
**Risk:** LOW (1 file, no API change, no financial logic)
**Area:** Settings → Printer Settings → Printers Tab → Add/Edit Printer
**Sprint:** POS 5.x
**Created:** 2026-08-18
**Source:** OWNER-REPORTED
**Duplicate check:** DISTINCT from CR-133 (CR-133 built the printer config screen; this improves UX within it)
**Related:** CR-133 (IMPLEMENTED — source of current wizard), BATCH-09

---

## Description

When adding or editing a printer in Settings → Printer Agent Config → Printers tab, the flow currently launches a **3-step wizard**:

| Step | Content |
|---|---|
| Step 1 | "How is this printer connected?" — pick USB / LAN / Bluetooth from large buttons |
| Step 2 | Printer name + connection details (IP/Port, USB name, or MAC) + paper size |
| Step 3 | Kitchen stations (KOT routing) + "Prints Bills" toggle |

Owner feedback: **"2-3 steps, should be 1 step — UX experience is not good."**

This should be collapsed into a **single scrollable form** with all fields visible at once, using conditional sections based on the selected connection type.

---

## Code Reality

- **File:** `PrintersTab.jsx` — `PrinterWizard` component (lines 28–192)
- **Line 73:** `"Step {step} of 3"` — confirms 3 steps
- **Step navigation:** `next()` (line 44), `finish()` (line 55), `setStep(step - 1)` back button
- Code reality: **FULL** (wizard fully built and working — UX redesign only)

---

## Proposed UX — Single Inline Form

All fields on one screen, no Next/Back buttons:

```
┌─────────────────────────────────────────┐
│ [✕] Add Printer                         │
├─────────────────────────────────────────┤
│ Printer Name *          [____________] │
│                                         │
│ Connection Type *       [USB ▼        ] │
│                                         │
│ ── (conditional: USB) ──────────────── │
│ USB Printer Name *      [____________] │
│ [+ Show advanced: Vendor / Product ID] │
│                                         │
│ ── (conditional: LAN) ──────────────── │
│ IP Address *            [____________] │
│ Port *                  [9100         ] │
│                                         │
│ ── (conditional: Bluetooth) ─────────  │
│ MAC Address *           [____________] │
│                                         │
│ Paper Size              [80 mm ▼      ] │
│                                         │
│ Prints Bills            [toggle]        │
│                                         │
│ Kitchen Stations (KOT)                 │
│ [____________] [Add]                   │
│ [KDS ✕] [Bar ✕]                       │
│                                         │
│ ⚠ This printer has no stations...      │
│                                         │
│        [Cancel]    [Add Printer ✓]     │
└─────────────────────────────────────────┘
```

---

## Evidence

- `PrintersTab.jsx:28–192` — `PrinterWizard` component with `step` state (1→2→3)
- `PrintersTab.jsx:73` — `"Step {step} of 3"` label visible in UI
- Source: OWNER-REPORTED
- Confidence: HIGH

---

## Blast Radius

- **1 file only:** `PrintersTab.jsx` — rewrite `PrinterWizard` component (lines 28–192) into a single `PrinterForm`
- `step` state removed; all fields always visible with conditional rendering
- Validation logic (`validatePrinter`) unchanged — just moves from `next()` + `finish()` to a single `save()` call
- `handleWizardDone`, `newPrinter`, `printerTypes` options — all unchanged
- No API change, no transform change, no other file change
- Hotspot files: **NO**
- Estimated scope: **SMALL** — ~1 file, rewrite ~165 lines → ~120 lines (net reduction)

---

## Risk Classification

- **LOW** — pure UI restructure, no logic/API/state change beyond removing step navigation
- Validation rules stay identical
- No financial, order, print payload, or report logic
- **Fast Lane eligible** — 1 file, UX-only, no hotspot, no financial logic
  - Lines changed: ~165 rewrite → borderline (>10 lines but single component rewrite)
  - Recommend: **Full Gate 2-3** (not fast lane — component rewrite >10 lines)

---

## Open Questions

- **OQ-1:** Should the form open as an inline panel (replaces wizard area, same as current) or as a modal/drawer overlay?
- **OQ-2:** On mobile/narrow screen, is single-column layout acceptable or should fields be 2-column on wide screens?
- **OQ-3:** Should connection type be a `<select>` dropdown or remain as large radio-button-style cards (current Step 1 style)?

---

## Next: Gate 2 (Impact Analysis) — after OQ-1/2/3 answered or deferred to planning
**Suggest adding to BATCH-09** (alongside CR-160, CR-161 — printer/station batch).
