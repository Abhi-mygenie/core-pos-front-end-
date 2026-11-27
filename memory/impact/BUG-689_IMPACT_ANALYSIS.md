# BUG-689 — Impact Analysis (Gate 2)

**ID:** BUG-689 · **Type:** BUG · **Area:** Settings / Configuration
**Priority:** P2 · **Risk:** LOW · **QA Severity:** MINOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL** — `frontend/src/components/panels/employee/EmployeeListView.jsx` (BUG-229/230 feature):
- L27-34 `generateEmail`: `rname = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g,'')` then returns `` `${fname}@${rname}.com` ``.
- Called on firstName change for new rows (L88-89) and existing rows (L107-108).
Root cause: the domain suffix `.com` is **hard-coded and unconditional**, and `restaurant.name` is stripped of all non-alphanumerics. So a restaurant named "Ruby Zap" → `rubyzap` → `testqa@rubyzap.com`. If the restaurant name itself already reads like a domain (e.g. contains "com"/a TLD), the result doubles/looks wrong. QA observed `testqa@rubyzap.com` and flagged the always-appended `.com`.

## Conflict Pre-Check
- File owned by BUG-229/230 (GATE_5A_IMPLEMENTED, retroactive). This is a formatting follow-up on that feature. No competing open edit.
- Parallel-safe.

## Data-flow trace
RestaurantContext `restaurant.name` → `generateEmail()` strips non-alphanumerics + appends `.com` → sets `row.email` → submitted as employee User ID. Break point: unconditional `.com` + aggressive strip may yield an unintended/doubled domain for certain restaurant names.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `components/panels/employee/EmployeeListView.jsx` | L31-33 (`generateEmail`) | guard the `.com` suffix (don't append if domain already ends in a TLD); confirm intended domain source |

## Risk
LOW (string builder). MEDIUM-ish because it produces a User ID (login identity) — verify no existing employees depend on current format.

## Owner decisions
- **OD-689-01:** What is the intended email domain — always `.com`, the restaurant's real domain, or a configured value? (Determines whether this is a guard or a config change.)

## Verification seeds
1. Restaurant "Ruby" → `fname@ruby.com` (single `.com`).
2. Restaurant name already containing a TLD-like token → no doubled `.com`.
3. Manual email edit still disables auto-gen (`_emailManual`), BUG-230 sync intact.
