# BUG-632 — CR-479 Flag Picker Tablet/Responsive Overflow on All 5 Screens

**ID:** BUG-632  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (CR-479 feedback, 2026-11-01 session handover)
**Related:** CR-479 (parent), BUG-631 (sibling — narrow panel layout), BUG-555 (tablet responsiveness umbrella)

## Description
Owner feedback on CR-479 implementation: all 5 screens with the PhoneInputField need tablet/responsive compatibility check. The flag picker dropdown may overflow or clip on smaller screens (<1024px). On narrow viewports the dropdown search/list panel could extend beyond the screen edge or overlap other UI elements.

**Owner's exact feedback:** "All 5 screens need tablet/responsive compatibility check. The flag picker dropdown may overflow or clip on smaller screens (<1024px)."

## Evidence
- **Screens to check:**
  1. `CartPanel.jsx:1122` — order entry right panel (NARROW — most critical)
  2. `CustomerModal.jsx:654, 759` — new + edit customer modes
  3. `CollectPaymentPanel.jsx:3273` — Credit/TAB phone
  4. `RoomCheckInModal.jsx:953` — PMS check-in modal
  5. `CheckInPage.jsx:673` — Front Desk v2 walk-in form
- **Steps to reproduce:**
  1. Login as owner@palmhouse.com
  2. Open any screen above on a tablet viewport (768px-1024px)
  3. Click the flag picker dropdown
  4. Observe if dropdown clips, overflows, or extends off-screen
- **Source:** OWNER-REPORTED
- **Confidence:** SUSPECTED (owner flagged, agent confirmed dropdown has no responsive positioning)

## Duplicate Check
**RELATED to BUG-555** (tablet responsiveness umbrella). BUG-555 covers broad tablet issues across order entry, sidebar, header, reports. This is specifically about the PhoneInputField dropdown positioning — a new component added by CR-479 that BUG-555 doesn't cover. Registering as separate bug for CR-479 traceability.

## Code Reality
**NONE** — PhoneInputField.jsx dropdown uses `absolute top-full left-0` positioning with no viewport boundary check or responsive adaptation.

## Affected Files
| # | File | Issue |
|---|------|-------|
| 1 | `PhoneInputField.jsx` | Dropdown uses `absolute top-full left-0 w-[280px]` — may overflow on narrow viewports |
| 2 | `CartPanel.jsx` | Narrow panel — dropdown could extend past panel boundary |
| 3 | `CustomerModal.jsx` | Modal — should be fine but needs verification |
| 4 | `CollectPaymentPanel.jsx` | Narrow panel context |
| 5 | `RoomCheckInModal.jsx` | Modal — should be fine but needs verification |
| 6 | `CheckInPage.jsx` | Right panel — walk-in form sidebar |

## Blast Radius
**SMALL** — 1 file primary fix (PhoneInputField.jsx responsive positioning), 0-5 caller adjustments if needed.

## Open Decisions
- **OD-632-01:** Dropdown positioning strategy — fixed position overlay (like shadcn Popover) or contained within parent with max-height scroll?
  - **Recommended:** Use `fixed` position with viewport boundary detection (top/bottom flip) — same pattern as shadcn Select.

## Risk Classification
- **Risk:** MEDIUM (5 files touched but change is CSS/positioning only)
- **Process required:** Full gate flow (touches multiple screens)
