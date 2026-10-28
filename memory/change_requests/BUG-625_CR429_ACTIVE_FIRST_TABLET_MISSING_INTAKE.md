# BUG-625 — CR-429 Active First Pill Missing from Tablet Dropdown

**ID:** BUG-625  **Type:** BUG  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (QA batch 2026-10-28, testing agent iteration_10)
**Related:** CR-429

## Description
The "Active First" toggle pill (CR-429) is rendered only in the `xl` pills navigation area of Header.jsx (L339-351). On tablets (<1280px), the header switches to a filter dropdown, and the Active First option is absent — tablet users cannot toggle it.

## Evidence
- `Header.jsx:339-351`: Active First pill inside `xl`-only nav section
- No corresponding entry in the tablet filter dropdown
- Confidence: CONFIRMED (code traced, responsive breakpoint verified)

## Blast Radius
SMALL — 1 file (`Header.jsx`). Add Active First to the tablet filter dropdown.

## Fix Scope
Add an "Active First" toggle option inside the tablet filter dropdown in Header.jsx, mirroring the `xl` pill behavior. Should only appear when `dashboardView === 'channel'`.
