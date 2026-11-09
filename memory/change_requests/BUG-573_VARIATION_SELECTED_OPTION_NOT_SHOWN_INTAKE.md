# BUG-573 — Intake (Gate 1)
## Order Card Variation: Selected option not shown (shows group name only)

**ID:** BUG-573 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** DISTINCT
**Source:** OWNER-REPORTED + screenshot (smoke test 2026-10-16)

## Description
When an order has a variation (e.g., "Choice of milk" → customer selected "Oat milk"), the order card shows only the GROUP NAME ("Choice of milk" / "Choice Of") but not the SELECTED OPTION ("Oat milk"). Staff cannot see what variation the customer chose.

## Code Reality: PARTIAL
`OrderCard.jsx:L699-711` — `variantStr` builds a display string from `item.variation`. Falls back to `v.value || v.option_label || v.label || v.selected_option || ''` for the selected option. If the backend returns `item.variation` in a format where none of these fields carries the selected option label, only the group name shows.

## Evidence
Screenshot (third screenshot) — "Choice Of Dip", "Choice Of" shown without selected values.

## Blast Radius: SMALL
- `OrderCard.jsx:L699-711` — adjust field mapping for variation value
- Needs backend probe to confirm actual API field name for selected option

## Open Decisions
**OD-573-01:** Backend probe needed — what field name does `item.variation[n]` use for the selected option label in the running-orders API? (candidate fields: `v.value`, `v.label`, `v.option_label`, `v.selected_option`, `v.values`)
