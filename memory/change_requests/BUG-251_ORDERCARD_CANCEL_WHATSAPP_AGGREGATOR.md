# BUG-251 — OrderCard Shows Cancel + WhatsApp for Aggregator Orders

**ID:** BUG-251
**Type:** BUG
**Created:** 2026-07-26
**Priority:** P1 — HIGH (violates OD-10 read-only design; Cancel confuses staff)
**Risk:** LOW (additive guard, no logic change)
**Module:** Dashboard — OrderCard
**Duplicate Check:** DISTINCT. Related: CR-106.
**Source:** INVESTIGATION (Report #1, §I-3)
**Confidence:** CONFIRMED — code traced (OrderCard.jsx:965-992, no isAggregator guard)
**Code Reality:** NONE

## Description

OrderCard "Normal flow" (lines 946-996) renders Cancel (X) and WhatsApp Payment Link buttons for ALL orders. The `isAggregator` guard only applies to right-side Ready/Dispatch buttons. Design spec says: "No Cancel button (uses reject flow in popup)", "No Settle/Bill (payment by aggregator)".

## Fix

Add `!isAggregator &&` before `isOrderCancelAllowed` (line 966) and `showWhatsAppPayment` (line 979). ~2 lines.

## Blast Radius

SMALL — 1 file (`OrderCard.jsx`), 2 lines changed.
