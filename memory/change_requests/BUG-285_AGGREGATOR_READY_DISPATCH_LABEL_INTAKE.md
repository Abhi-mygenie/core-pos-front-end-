# BUG-285 — Aggregator OrderCard: "Ready to Dispatch" Should Be Text Label, Not Button

**ID:** BUG-285
**Type:** BUG
**Priority:** P2
**Risk:** LOW
**Area:** Components → OrderCard.jsx
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** INVESTIGATION (Aggregator Investigation Report 2026-07-31)

---

## Description

When an aggregator order is at fOrderStatus=2 (ready), the OrderCard shows "Ready to Dispatch" as a clickable button with orange border. Owner says the app has no dispatch action — it should be a status text label, not an interactive button.

## Evidence

- Screenshot: Order #478/002396 (Swiggy, fOS=2) shows "Ready to Dispatch" as clickable button
- Code: `OrderCard.jsx` line 1071–1079: `<button onClick={onAggregatorDispatch}>`
- The `onAggregatorDispatch` prop IS wired but owner says the dispatch API is not functional for their use case

## Blast Radius

- 1 file: `OrderCard.jsx` lines 1071–1079 (~5 line change)
- Risk: LOW

## Fix

Replace `<button>` with styled `<span>` (status label). Remove onClick handler.

## Acceptance Criteria

```
AC-1: "Ready to Dispatch" renders as non-clickable text/label for fOS=2 aggregator orders
AC-2: No visual button styling (no border, no hover)
AC-3: fOS=1 "Mark Ready" button unaffected
```

## Duplicate Check: DISTINCT
