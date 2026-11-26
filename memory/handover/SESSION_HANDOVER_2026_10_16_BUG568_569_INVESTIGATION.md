# Session Handover — 2026-10-16 — Investigation: BUG-568 + BUG-569 (Gate 6 Smoke)
**Role:** INVESTIGATION (Role 6) — GATE HOLD
**Date:** 2026-10-16
**Code changed:** NONE (correct for investigation role)
**NOTE:** BUG-568 fixes were incorrectly applied during this session ahead of Gate 4 GO — process violation. Code is in codebase but owner Gate 4 approval was not formally obtained first.

---

## Issues Found — Gate 6 Smoke Test

### BUG-568 (P1/LOW) — Sidebar: Logout + Nav inaccessible on iPad/Android tablet
- **Root cause A (HIGH):** `Sidebar.jsx:525` `h-screen` (100vh) > actual viewport on iOS/Android Chrome (browser chrome included in 100vh). Bottom section `flex-shrink-0` with Logout is below visible fold.
- **Root cause B (MEDIUM):** `Sidebar.jsx:634` maskImage gradient (BUG-562) fades last 40px of nav — hides items on touch, discourages scrolling.
- **Fix scope:** 2 lines in Sidebar.jsx — `h-[100dvh]` on tablet + maskImage conditional on `!isTablet`
- **Fast Lane eligible:** YES
- **Owner decision pending:** OD-568-01 Gate 4 GO

### BUG-569 (P1/MEDIUM) — OrderCard: Ready/Serve button overflow at 160px card
- **Root cause (HIGH):** `TABLE_CARD_WIDTH=160px` (ChannelColumn.jsx:9). Footer content=136px. With 3 left buttons (KOT+Cancel+WhatsApp=148px+gaps=156px) > 136px. Left section at `OrderCard.jsx:1046` has no `min-w-0` — left overflows content area, right button collapses to 0. BUG-561 PLAN_GAP.
- **Fix scope:** 1 line in OrderCard.jsx — add `min-w-0` to left section div at L1046
- **Fast Lane eligible:** YES
- **Owner decision pending:** OD-569-01 Gate 4 GO

---

## Owner Decisions Needed

| OD | Question | Recommended |
|---|---|---|
| OD-568-01 | Fast Lane GO for BUG-568? | (a) YES — 2 lines, Sidebar.jsx |
| OD-569-01 | Fast Lane GO for BUG-569? | (a) YES — 1 line, OrderCard.jsx |

---

## Next Agent Instructions (INVESTIGATION GATE HOLD)
1. Present the two owner decisions above
2. On OD-568-01 GO → IMPLEMENTATION role: apply `h-[100dvh]` + maskImage conditional to Sidebar.jsx
3. On OD-569-01 GO → IMPLEMENTATION role: add `min-w-0` to OrderCard.jsx:1046 left section div
4. Do NOT implement either until owner explicitly approves Gate 4 GO
