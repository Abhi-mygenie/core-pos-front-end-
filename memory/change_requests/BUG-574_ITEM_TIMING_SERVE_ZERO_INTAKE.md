# BUG-574 — Intake (Gate 1)
## No item-level timing shown when item is in serving state (Serve: 0m)

**ID:** BUG-574 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P2 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** RELATED to CR-099 (introduced elapsed timing). BUG-574 is a gap in served item timing — DISTINCT.
**Source:** OWNER-REPORTED + screenshot (smoke test 2026-10-16)

## Description
Item-level timing shows correctly for "Preparing" state. For items in "Served" state, the serve time always shows as "0m" even for items that were served some time ago. Expected: show actual elapsed time since the item was served.

## Code Reality: PARTIAL
`OrderCard.jsx:L847-850`:
```
{item.serveAt ? ` · Serve: ${formatElapsed(new Date(item.serveAt).getTime() - new Date(item.readyAt).getTime())}` : ''}
```
If `item.serveAt` is null/undefined → serve time shows nothing or 0m. Likely `serve_at` is not populated by backend in API response.

## Evidence
Screenshots (second + third) — "Prep: 17m · Serve: 0m", "Prep: 0m · Serve: 0m" for served items.

## Blast Radius: SMALL (data gap likely)
- `orderTransform.js` — check if `serveAt` field is mapped from API
- Backend may need to return `serve_at` field on order items

## Open Decisions
**OD-574-01:** Backend probe — is `serve_at` field present in running-orders API response for served items? If no → backend brief needed. If yes → transform gap in `orderTransform.js`.
