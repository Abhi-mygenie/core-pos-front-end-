# BUG-286 — Aggregator KOT/Bill Buttons Hidden on OrderCard (canPrintBill Permission Gate)

**ID:** BUG-286
**Type:** BUG
**Priority:** P1
**Risk:** LOW
**Area:** Dashboard → OrderCard → Footer Actions
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** OWNER-REPORTED (screenshot: OrderCard expanded view shows "Mark Ready" but no KOT/Bill printer icons)

---

## Description

Aggregator order OrderCard (expanded view on dashboard) does not show KOT or Bill printer buttons. TableCard (compact grid view) shows them correctly. Root cause: `canPrintBill` prop gates both KOT and Bill in OrderCard, but TableCard renders them unconditionally for aggregator orders.

`canPrintBill` = `hasPermission('print_icon')` — relies on browser session having the permission loaded. If session is stale or permissions not populated, buttons disappear.

Owner directive: **Always show KOT/Bill for aggregator orders** — aggregator print uses a dedicated UrbanPiper API (`/urbanpiper/manually-print-aggregator`), not the POS thermal printer system. The `print_icon` permission was designed for POS printers, not aggregator API calls.

## Evidence

- Screenshot: Owner provided OrderCard expanded view — "Mark Ready" button visible, but NO printer icons on left side
- TableCard: Printer icons visible (no `canPrintBill` gate) — confirmed via dashboard screenshot
- Code trace:
  - `OrderCard.jsx:1013` — KOT: `canPrintBill && (isAggregator ? (fOrderStatus === 1) : ...)`
  - `OrderCard.jsx:1082` — Bill: `isAggregator && fOrderStatus === 2 && canPrintBill`
  - `TableCard.jsx:462-517` — KOT/Bill: NO `canPrintBill` check for aggregator blocks
- API: `print_icon` IS in login response `role[]` array — permission exists but may not be in browser session

## Steps to Reproduce

1. Login as owner@18march.com
2. Dashboard shows aggregator orders (Swiggy/Zomato)
3. View OrderCard expanded view (click on an order card)
4. Observe: "Mark Ready" button present, but no KOT or Bill printer icons

## Blast Radius

- 1 file: `OrderCard.jsx` — 2 line changes (L1013, L1082)
- Risk: LOW — condition change only, no logic/state/API change

## Fix

Remove `canPrintBill` gate for aggregator path only. POS orders keep the permission gate.

- L1013: `canPrintBill && (isAggregator ? (fOS === 1) : ...)` → `(isAggregator || canPrintBill) && (isAggregator ? (fOS === 1) : ...)`
- L1082: `isAggregator && fOS === 2 && canPrintBill` → `isAggregator && fOS === 2`

## Acceptance Criteria

```
AC-1: Aggregator fOS=1 OrderCard shows KOT printer icon (regardless of print_icon permission)
AC-2: Aggregator fOS=2 OrderCard shows Bill printer button (regardless of print_icon permission)
AC-3: Non-aggregator orders still gated by canPrintBill (print_icon permission)
```

## Duplicate Check: DISTINCT
