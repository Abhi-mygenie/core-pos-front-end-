# BUG-635 — RoomCheckInModal Full Picker Borderline Width on Tablets

**ID:** BUG-635  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** AGENT-DISCOVERED (consistency audit, 2026-11-02)
**Related:** CR-479, BUG-631, BUG-632 (tablet responsive), BUG-555 (tablet umbrella)

## Description
RoomCheckInModal uses the full PhoneInputField (with chevron + hint) inside a modal. On tablets or narrower viewports (<1024px), the modal width shrinks and the full picker may clip the phone text, similar to CheckInPage.

Unlike CartPanel/CPP (compact) and CheckInPage (BUG-634 to fix), RoomCheckInModal has not been assessed for tablet width compatibility with the full picker.

## Evidence
- Code: `RoomCheckInModal.jsx:953` — PhoneInputField with NO compact prop
- Modal width is responsive — shrinks on tablets
- Confidence: SUSPECTED (code traced, not reproduced on device)

## Duplicate Check
**RELATED to BUG-632** (tablet responsive overflow umbrella). BUG-632 covers all 5 screens generically. This is a specific instance for RoomCheckInModal.

## Code Reality
**NONE** — no compact or responsive adaptation for RoomCheckInModal phone input.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `RoomCheckInModal.jsx` | L953 | PhoneInputField — no compact, modal may be narrow on tablets |

## Blast Radius
**SMALL** — 1 file, 1 prop if compact needed.

## Fix Scope
Two options:
- **A (recommended):** Add `compact` to RoomCheckInModal's PhoneInputField (consistent with CartPanel/CPP/CheckInPage)
- **B:** Verify modal has min-width that accommodates full picker on smallest supported tablet (893px per BUG-555)

## Risk Classification
- **Risk:** LOW — 1 prop in 1 file, CSS-only
- **Fast Lane eligible:** YES (1 file, 1 word, no logic)
