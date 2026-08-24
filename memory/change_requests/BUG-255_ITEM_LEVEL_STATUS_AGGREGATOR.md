# BUG-255 — Item-Level Ready/Serve Dots Shown for Aggregator Orders

**ID:** BUG-255
**Type:** BUG
**Created:** 2026-07-26
**Priority:** P1 — HIGH (misleading UX — staff thinks they can manage item status on Swiggy orders)
**Risk:** LOW (additive guard)
**Module:** Dashboard — OrderCard Items
**Duplicate Check:** DISTINCT. Related: CR-106.
**Source:** INVESTIGATION (Report #2, §I-3) + owner statement "we will not have item level ready and serve in aggregator order"
**Confidence:** CONFIRMED — code traced, no `isAggregator` guard on item status toggles
**Code Reality:** NONE

## Description

OrderCard item-level status dots (lines 623-720) render clickable preparing→ready→served toggles for ALL orders. Aggregator item status is managed by the aggregator platform, not per-item on POS. Owner confirmed: "we will not have item level ready and serve in aggregator order".

## Fix

Add `!isAggregator` guard on `onItemStatusChange` call (line 401) and on item action dot rendering (line 623+). ~3 lines.

## Blast Radius

SMALL — 1 file (`OrderCard.jsx`), ~3 lines.
