# BUG-633 — PhoneInputField Styling Mismatch With Sibling Inputs (Height/Bg/Shadow/Border)

**ID:** BUG-633  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (screenshot comparison, 2026-11-02)
**Related:** CR-479, BUG-631, BUG-632

## Description
PhoneInputField's outer container is visually inconsistent with sibling inputs on every screen where they sit side-by-side. The mismatch is most noticeable on CartPanel and CheckInPage where name + phone are in a `grid-cols-2` row.

### Specific mismatches

| Property | Sibling Input (CartPanel) | Sibling Input (CheckInPage) | PhoneInputField |
|---|---|---|---|
| **Height** | `py-2.5` (~40px) | `h-10` (40px) | `py-[7px]` (~34px) ❌ |
| **Background** | `#f9fafb` | `bg-white` | `#fff` ❌ (no match to CartPanel) |
| **Shadow** | `0 1px 3px rgba(0,0,0,0.08)` | none | none ❌ |
| **Border color** | `COLORS.borderGray` | `#E5E5E5` | `#E2E8F0` ❌ |
| **Font size** | `13px` | `13px` | `text-sm` (14px) ❌ |

Owner screenshot clearly shows two boxes of different visual weight sitting next to each other.

## Evidence
- Owner-provided screenshot: CartPanel — name box has gray background + shadow, phone box is flat white
- Code traced: PhoneInputField.jsx L103-107 (container styling) vs CartPanel.jsx L1086-1093 (name input styling)
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** BUG-631 addressed compact size (no chevron, smaller text). This is about visual styling consistency (height, background, shadow, border color) which was not part of BUG-631.

## Code Reality
**NONE** — PhoneInputField has its own hardcoded styling that doesn't adapt to context.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `PhoneInputField.jsx` | L103-107 | Container: `borderColor: '#E2E8F0'`, `backgroundColor: '#fff'`, no shadow, `py-[7px]` |
| 2 | `PhoneInputField.jsx` | L134 | Phone input: `text-sm` (14px) vs sibling 13px |
| 3 | `PhoneInputField.jsx` | L113 | Button: `py-[7px]` — contributes to shorter height |

## Blast Radius
**SMALL** — 1 file (PhoneInputField.jsx). Styling-only. No logic, no API, no state.

## Fix Scope
Match PhoneInputField outer container to standard input conventions:
- Height: `py-[7px]` → match via `h-10` or increased padding
- Background: accept from caller or default to `#f9fafb` when not focused
- Shadow: add subtle `boxShadow: '0 1px 3px rgba(0,0,0,0.08)'` to match
- Border: standardize to `#E5E5E5` / `COLORS.borderGray`
- Font: phone input `text-sm` → `text-[13px]` to match sibling

## Risk Classification
- **Risk:** LOW — CSS-only changes in 1 file, no logic affected
- **Fast Lane eligible:** YES (1 file, ≤10 lines, no logic, no R5/hotspot, no financial)
