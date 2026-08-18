# BACKEND_BRIEF_ROLE_TYPE_TEMPLATE_CONFLICT_2026_07_17

## Summary
- Issue: Role Type and Template dropdowns on Role Create/Edit form are independent — no filtering or validation. User can select "Manager" type + "Station (Chef)" template, creating a contradictory role.
- Classification: CONTRACT_MISMATCH / DESIGN_GAP
- Frontend impact: Users can create roles with mismatched type↔permissions. Backend may route operations incorrectly (e.g., Manager type with only 4 kitchen permissions).
- Priority/Risk: P2 / MEDIUM

## Context

### Role Type (6 options from `GET /all-role-list → role_types`)
| ID | Name | Value |
|---|---|---|
| 1 | STATION | STATION |
| 2 | Waiter | Waiter |
| 3 | Manager | Manager |
| 4 | Billing | Billing |
| 5 | Server Waiter | Buffet |
| 6 | Delivery | Delivery |

### Templates (10 presets from `GET /role-master-list`)
| Template | Permissions |
|---|---|
| Owner | 50 |
| Manager | 26 |
| Cashier | 19 |
| Billing User | 16 |
| Waiter(S) | 11 |
| Accountant | 10 |
| Waiter(T) | 7 |
| Captain | 5 |
| Station (Chef) | 4 |
| Delivery Boy | 4 |

## Question for Backend Team

**When a role is created with a specific `role_type`, which templates are valid for that type?**

Example conflicts:
- role_type = "Manager" + template = "Station (Chef)" → Manager operational scope but only 4 kitchen permissions
- role_type = "STATION" + template = "Owner" → Station routing but 50 permissions including billing/reports
- role_type = "Delivery" + template = "Accountant" → Delivery assignment but accounting permissions

### Requested from backend:
1. **Provide a role_type → valid_templates mapping** so FE can filter the Template dropdown based on selected Role Type
2. **Confirm what `role_type` controls on backend** — order routing? KDS assignment? delivery dropdown? employee-orders-list filtering?
3. **Does backend currently enforce any consistency?** Or does it accept any combination silently?
4. **Is `role_type` a single value or array?** FE currently sends `role_type: []` (array), dropdown is single-select

## Current FE Behaviour (as of 2026-07-17)
- Role Type dropdown renders but is NOT wired (no onChange/value). Always sends `role_type: []`.
- Template dropdown works — applies permission preset.
- No cross-validation between the two.
- All 9 existing roles on cafe103 have `role_type: null`.

## FE Action (immediate — BUG-198)
- Wire Role Type dropdown (onChange + value + save payload) — no filtering for now
- Keep both dropdowns independent until backend provides the mapping
- Owner ruling: no FE validation on type↔template conflict for now

## FE Action (after backend responds)
- Filter Template dropdown based on selected Role Type
- Or show warning when combination is conflicting
