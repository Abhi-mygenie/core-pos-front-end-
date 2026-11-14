# BUG-631 — CR-479 Phone Layout Cramped in Narrow Panels (CartPanel + CPP)

**ID:** BUG-631  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (CR-479 feedback, 2026-11-01 session handover)
**Related:** CR-479 (parent), BUG-632 (sibling — tablet responsive)

## Description
Owner confirmed the CR-479 flag picker works functionally but reported that in the **CartPanel** (order entry right panel), the three elements — customer name input + country code picker (`🇮🇳 +91` flag dropdown) + phone number input — don't fit well in the narrow panel width. The flag picker takes too much horizontal space, pushing the phone input to clip ("Phone nu..." visible, rest cut off).

Same issue exists in **CollectPaymentPanel** Credit/TAB phone input area (also a narrow panel context).

**Owner's exact feedback:** "CartPanel (order entry right panel) — customer name + country code picker + phone number don't fit well in the narrow panel. The 3 elements need layout adjustment to fit the panel width. Currently the flag picker takes too much horizontal space, pushing the phone input to clip."

**Suggested approach (from handover):** Make the country picker compact (just flag + code, no chevron) for narrow panels (CartPanel, CPP). Full picker with search for modals/pages.

## Evidence
- **Screenshot:** CartPanel showing cramped layout — `🇮🇳 +91` + "Phone nu..." clipped (captured 2026-11-02 investigation)
- **Steps to reproduce:**
  1. Login as owner@palmhouse.com
  2. Click any available table → order entry opens
  3. Observe the right panel: Customer name + flag picker + phone input row
  4. Phone input shows "Phone nu..." (clipped text)
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (reproduced via screenshot + code traced)

## Duplicate Check
**DISTINCT.** CR-479 intake covers the international phone feature itself (transforms, payloads, UI). This bug is specifically about the LAYOUT of the implemented picker in narrow panels — a post-implementation defect not covered by CR-479's 7 gaps.

## Code Reality
**NONE** — no compact variant exists for PhoneInputField. Current implementation is full-width dropdown for all contexts.

## Affected Files
| # | File | Current State | Fix Needed |
|---|------|--------------|------------|
| 1 | `PhoneInputField.jsx` | Single full-width variant with search dropdown, chevron | Add `compact` prop — flag + code only, no chevron, narrower width |
| 2 | `CartPanel.jsx:1122` | Uses full PhoneInputField in narrow panel | Pass `compact={true}` |
| 3 | `CollectPaymentPanel.jsx:3273` | Uses full PhoneInputField in narrow panel | Pass `compact={true}` |

## Blast Radius
**SMALL** — 1 new prop in PhoneInputField + 2 callers updated. No logic changes, no API/transform/state changes.

## Open Decisions
- **OD-631-01:** Compact picker shows flag emoji + "+91" only? Or flag + code + tiny dropdown arrow?
  - **Recommended:** Flag + code only, no chevron. Tap opens full dropdown overlay.

## Risk Classification
- **Risk:** MEDIUM (touches CartPanel which is R5 hotspot, but change is CSS/props only)
- **Process required:** Full gate flow (not Fast Lane eligible — CartPanel is R5)
