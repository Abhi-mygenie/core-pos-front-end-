# BUG-571 — Intake (Gate 1)
## Order View — Gaps between cards instead of tiled layout

**ID:** BUG-571 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P2 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** DISTINCT
**Source:** OWNER-REPORTED + screenshot (smoke test 2026-10-16)

## Description
In order view (not table view), the order cards have unwanted gaps/empty spaces between them. Cards should be tiled one after another with no empty vertical space. Screenshot shows visible gaps between card groups.

## Code Reality: PARTIAL
`ChannelColumn.jsx:L258` — order cards are rendered in groups (`flex-col gap-2`) by status. Each group has a header ("No active items" text). Empty status groups still render their header/container, creating visible vertical space between occupied groups.

## Evidence
Screenshot attached by owner (second screenshot — order view with gap).

## Blast Radius: SMALL
- `ChannelColumn.jsx` — hide empty status group containers or remove gap

## Open Decisions
**OD-571-01:** Should empty status groups be hidden entirely in order view, or just have their "No active items" text removed?
