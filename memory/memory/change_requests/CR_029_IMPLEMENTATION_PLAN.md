# CR-029 — Implementation Plan (Gate 3) — Room food included everywhere

**Date:** 2026-06-11 · Workstream B · Decisions: H6 (include all: RM/SRM/transferToRoom), H6-b (pm='ROOM' revenue at folio settlement = fs-6 + collection date), H6-c (Ledger Paid includes room food), Q3-val (existing tab rules sufficient), Q2 (room_revenue = food at checkout, verified), Q-B (header labels)

## Scope (LOCKED)
Remove room-row exclusion from Sales/Payments/Order Ledger pipelines. NO new tab rules (Q3-validated). No change to Dashboard/Items (already include rooms). Room Orders Report untouched.

## Changes
1. `frontend/src/api/services/orderLedgerService.js` — remove `isRoomOrderForReport` filtering (delete the copy; rows flow through)
2. `frontend/src/pages/AllOrdersReportPage.jsx` — remove upstream room stripping in `fetchOrders`; existing TAB_FILTERS classify all room stages (validated: checkout→Paid, TAB→Credit, pending RM→Running, transferToRoom→Running, pm='ROOM' fs6→Paid)
3. `SalesMockup.jsx` / `PaymentsMockup.jsx` — inherit via service; verify no local room guards remain
4. Payment buckets: `pm='ROOM'` rows surface as "Room Bill" bucket (CR-032 classifier)
5. Header labels (Q-B): handled in CR-030 plan (single label component)

## Expected number shifts (harness targets, room food paid value)
| Month | Sales/Payments/Ledger-Paid gain |
|---|---|
| Mar | +₹1,78,172 → Sales ≈ Dashboard ₹13,46,993 (punch-basis interim) |
| Apr | +₹1,43,603 · May +₹1,01,081 · Jun +₹3,445 |
Ledger Running gains the 12 unpaid RM orders (₹26,213 across months).

## QA
Harness: post-change Sales = pre-change Sales + room paid value per month, both restaurants; Ledger tab counts match replica per category table (Q3-val matrix). Room Orders Report regression: unchanged.

## Sequencing
Land BEFORE CR-030 collection-basis switch (so one variable changes at a time; harness isolates each delta).

## Freeze-log
S7 Sales + S8 Payments amendments at Gate 4 (H34 per-screen).
