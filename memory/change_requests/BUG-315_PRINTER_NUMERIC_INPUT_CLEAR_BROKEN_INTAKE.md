# BUG-315 — Intake: Printer Config — Numeric Inputs Cannot Be Cleared to Retype

**Date:** 2026-08-13  
**Source:** OWNER-REPORTED + AGENT-CONFIRMED (code trace)  
**Confidence:** CONFIRMED  
**Duplicate check:** RELATED to CR-133 Gap Batch G4 (attempted fix — incomplete for controlled inputs)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 — MEDIUM (UX friction — user can still type new value via different method) |
| Risk | LOW |
| Fast Lane eligible | NO (2 files) |

---

## Description

In all numeric input fields across the Printer Config page — Bill Copies, KOT Copies (AutoPrintTab), and all style size fields (PrintStyleTab) — the user **cannot fully clear** a number to retype it:

1. User selects "1" in Bill Copies and presses Delete/Backspace
2. The "1" visually snaps back immediately
3. User cannot enter a new 2-digit number easily

**Root cause:** `StyleInput` (PrintStyleTab) and `NumberInput` (shared.jsx) both use `if (v === '') return` on a React controlled input. When cleared, `onChange` is not called → state stays at old value → React re-renders → input reverts.

---

## Affected Files

- `src/components/panels/settings/printerConfig/PrintStyleTab.jsx` — `StyleInput` component (local)
- `src/components/panels/settings/shared.jsx` — `NumberInput` component (shared)

---

## Fix Summary

Add local display-value state to both components, separate from the prop-driven state. ~15 lines per component.  
Investigation report: `/app/memory/BUG-315-319_PRINTER_CR_GAPS_INVESTIGATION_REPORT.md` (GAP BUG-315 section)

---

## Owner Decisions Needed

None.
