# CR-355 INTAKE — Sidebar Printers Shortcut: Shows "Coming Soon" for All Users
**Date:** 2026-08-31
**Risk:** LOW | **Priority:** P3 | **Status:** INTAKE

## Summary
Sidebar → Settings section has a "Printers" shortcut registered as `comingSoon: true` in Sidebar.jsx. This means tapping it always shows a "Coming Soon" toast, even for restaurants with fully configured Printer Agent or Local Printer screens.

## Code Reality: PARTIAL
| File | What exists |
|---|---|
| `Sidebar.jsx:115` | `{ id: "printers", label: "Printers", comingSoon: true }` |
| `ListFormViews.jsx` | `PrintersViewGate` component — routes to LocalPrinterSetupView or PrinterAgentConfigView based on `localStorage.getItem('mygenie_printer_type')` |

## Fix Scope
Remove `comingSoon: true` flag and wire the sidebar Printers shortcut to `PrintersViewGate` (same routing logic already used by Settings → All Settings → Printers tile).

## Risk: LOW
- 1 file (Sidebar.jsx)
- ~3 lines
- Not financial, not hotspot (R5)
- Fast Lane eligible with owner approval

## Duplicate Check: DISTINCT
## Blast Radius: SMALL (1 file, ~3 lines)
## Source: Open gap from handover 2026-08-30
