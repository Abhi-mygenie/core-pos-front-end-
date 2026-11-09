# BUG-636 — CPP TAB CRM Lookup Fires Per-Keystroke for International Numbers

**ID:** BUG-636  **Type:** BUG  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (testing agent iteration_12/13, 2026-11-02)
**Related:** CR-479, BUG-631

## Description
`CollectPaymentPanel.jsx` L576-590: the `useEffect` for TAB CRM lookup runs on every `tabPhone` change. For Indian +91, it only fires at exactly 10 digits. But for international numbers, `tabPhone.length >= 6` is true from 6 digits onward — so typing UK `7911123456` fires `lookupCustomer` 5 times (at 6, 7, 8, 9, 10 digits). If lookup returns not-found and a name is entered, `createCustomer` also fires for each partial number, potentially creating junk CRM profiles.

Additionally:
- `createCustomer` at L584 does NOT include `countryCode` in the payload.
- `tabContact` at L1200 does NOT include `tabCountryCode`.

## Evidence
- Testing agent iteration_13: "POST /pos/customer-lookup fired 5 times for UK number"
- Code: CPP L576-590, `useEffect` deps include `tabPhone` — fires on every change ≥6 digits for intl
- Confidence: CONFIRMED (QA reproduced)

## Duplicate Check
**DISTINCT.** No existing bug covers CPP intl CRM debounce.

## Code Reality
**NONE** — no debounce, no countryCode in createCustomer/tabContact.

## Affected Files & Lines
| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `CollectPaymentPanel.jsx` | L576-590 | useEffect fires per-keystroke for intl ≥6 digits |
| 2 | `CollectPaymentPanel.jsx` | L584 | createCustomer missing countryCode |
| 3 | `CollectPaymentPanel.jsx` | ~L1200 | tabContact missing tabCountryCode |

## Blast Radius
**SMALL** — 1 file (CollectPaymentPanel.jsx R5). Logic change in CRM effect + 2 payload additions.

## Fix Scope
1. Add debounce (500ms) to the intl CRM lookup useEffect — only fire after user stops typing
2. Include `countryCode: tabCountryCode` in `createCustomer` payload at L584
3. Include `countryCode: tabCountryCode` in `tabContact` at L1200

## Risk Classification
- **Risk:** MEDIUM (CPP is R5 hotspot, but change is effect timing + payload fields)
- **Fast Lane eligible:** NO (R5 file, logic change)
