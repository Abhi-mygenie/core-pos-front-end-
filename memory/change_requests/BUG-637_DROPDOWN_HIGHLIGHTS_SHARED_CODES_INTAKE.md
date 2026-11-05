# BUG-637 — Dropdown Highlights All Countries Sharing a Calling Code

**ID:** BUG-637  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P3  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (testing agent iteration_12/13, 2026-11-02)
**Related:** CR-479, BUG-632

## Description
`PhoneInputField.jsx` L190: the dropdown row highlight condition compares `country.callingCode === currentCountry.callingCode`. When UK (+44) is selected, Guernsey, Isle of Man, and Jersey (all +44) are also highlighted with `bg-orange-50 text-orange-700 font-semibold`. Same for +1 (US, Canada, American Samoa, etc.).

The `PRIMARY_COUNTRY_MAP` fix (BUG-632) ensures the correct primary flag is displayed, but the dropdown still highlights all siblings.

## Evidence
- Testing agent iteration_13: "When UK is selected, GG, IM, JE and GB are all highlighted"
- Code: PhoneInputField.jsx L190 — `country.callingCode === currentCountry.callingCode`
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** BUG-632 covered dropdown positioning. This is about row highlight logic.

## Code Reality
**NONE** — highlight uses callingCode match, not ISO code match.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `PhoneInputField.jsx` | L190 | Highlight compares callingCode, not ISO code |

## Blast Radius
**SMALL** — 1 file, 1 line. CSS-only change.

## Fix Scope
Change highlight condition from `country.callingCode === currentCountry.callingCode` to `country.code === currentCountry.code` (compare ISO country code, not calling code).

## Risk Classification
- **Risk:** LOW — 1 line, CSS highlight logic only
- **Fast Lane eligible:** YES (1 file, 1 line, no logic, no R5)
