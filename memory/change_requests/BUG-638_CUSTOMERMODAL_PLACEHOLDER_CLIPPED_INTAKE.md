# BUG-638 — CustomerModal Phone Placeholder "10-digit mobi..." Clipped

**ID:** BUG-638  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P3  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (testing agent iteration_12/13, 2026-11-02)
**Related:** CR-479

## Description
`CustomerModal.jsx` L658 and L763: when India +91 is selected, the placeholder text is `'10-digit mobile'` which needs ~116px to render fully. The phone input inside PhoneInputField is only ~104px wide in the CustomerModal context, so it renders as "10-digit mobi..." (clipped).

## Evidence
- Testing agent iteration_12/13: "input is only 104px wide, but placeholder '10-digit mobile' needs about 116px"
- Code: CustomerModal.jsx L658, L763 — `placeholder={countryCode === '+91' ? '10-digit mobile' : 'Phone number'}`
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** No existing bug for this specific placeholder text.

## Code Reality
**NONE** — placeholder text unchanged.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `CustomerModal.jsx` | L658 | Placeholder '10-digit mobile' too long for input width |
| 2 | `CustomerModal.jsx` | L763 | Same placeholder in edit mode |

## Blast Radius
**SMALL** — 1 file, 2 lines. Text-only change.

## Fix Scope
Shorten placeholder: `'10-digit mobile'` → `'Phone number'` (matches other screens and always fits). The validation hint below already says "10 digits, starts 6-9" for India.

## Risk Classification
- **Risk:** LOW — text-only change, no logic
- **Fast Lane eligible:** YES (1 file, 2 lines, text only, no R5)
