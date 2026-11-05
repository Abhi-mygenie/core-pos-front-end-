# BUG-634 — CheckInPage Phone Clipped — Missing Compact + Hint Adds Clutter

**ID:** BUG-634  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (screenshot, 2026-11-02)
**Related:** CR-479, BUG-631 (CartPanel compact done), BUG-632

## Description
CheckInPage Walk-in form uses `grid grid-cols-2 gap-3` for Guest Name + Phone — same narrow column context as CartPanel. But PhoneInputField is NOT passed `compact`, so the full picker (flag + +91 + chevron ▽) overflows the column, clipping phone text to "Phone nu...".

Additionally, the "10 digits, starts 6-9" validation hint text below the phone input adds vertical clutter in the already tight form layout. In compact mode this hint is hidden.

Owner screenshot (2nd image) clearly shows "Phone nu..." clipped on CheckInPage.

## Evidence
- Owner-provided screenshot: Walk-in Guest form — "Phone nu..." visibly clipped
- Code: `CheckInPage.jsx:666-667` — `grid grid-cols-2 gap-3`, PhoneInputField at L673 with NO `compact` prop
- CartPanel (same layout pattern) already has `compact` and improved
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** BUG-631 fixed CartPanel + CPP narrow panels. CheckInPage was intentionally left as "full picker for pages" but the grid-cols-2 layout makes it narrow enough to clip — this is a separate gap discovered after BUG-631 implementation.

## Code Reality
**NONE** — CheckInPage PhoneInputField does not pass `compact`.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `CheckInPage.jsx` | L673 | PhoneInputField missing `compact` prop |

## Blast Radius
**SMALL** — 1 file, 1 word added (`compact`). No logic change.

## Fix Scope
Add `compact` prop to CheckInPage's PhoneInputField at L673, identical to the CartPanel fix.

## Risk Classification
- **Risk:** LOW — 1 prop in 1 file, CSS-only effect
- **Fast Lane eligible:** YES (1 file, 1 word, no logic, no R5/hotspot, no financial)
