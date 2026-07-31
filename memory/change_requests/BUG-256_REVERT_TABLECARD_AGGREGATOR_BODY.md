# BUG-256 — Revert BUG-252: TableCard Aggregator Body Makes Cards 2× Height

**ID:** BUG-256
**Type:** BUG
**Created:** 2026-07-27
**Priority:** P1 — HIGH (grid alignment broken, aggregator cards ~2× height of regular)
**Risk:** LOW (revert — delete code added by BUG-252)
**Module:** Dashboard — TableCard
**Duplicate Check:** DISTINCT. Reverts BUG-252 implementation.
**Source:** OWNER-REPORTED (screenshot comparison: aggregator 6 rows vs regular 3 rows)
**Confidence:** CONFIRMED — visual comparison + owner directive
**Code Reality:** EXISTS (BUG-252 body block at ~L412-443 to be removed)

## Description
BUG-252 added items, customer+phone, and rider status to aggregator TableCards. This makes them ~2× the height of regular delivery cards, breaking the grid alignment. Owner says: keep aggregator cards at same compact height as regular cards.

## Fix
Delete the BUG-252 aggregator body block from `TableCard.jsx` (~L412-443):
```jsx
{/* BUG-252: Aggregator card body — items, customer+phone, rider status */}
{isAggregator && table.order && ( ... )}
```
~30 lines to remove. Aggregator cards revert to: S badge + order# + status + time + Ready button.

## Blast Radius
SMALL — 1 file (`TableCard.jsx`), delete ~30 lines. No logic change, pure removal.
