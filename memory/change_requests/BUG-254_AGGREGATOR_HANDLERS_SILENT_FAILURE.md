# BUG-254 — Aggregator API Handlers Fail Silently (No Toast)

**ID:** BUG-254
**Type:** BUG
**Created:** 2026-07-26
**Priority:** P1 — HIGH (staff clicks Ready/Accept/Dispatch, nothing happens, no feedback)
**Risk:** LOW (add toast notifications, no logic change)
**Module:** Dashboard — Aggregator Handlers
**Duplicate Check:** DISTINCT. Related: CR-106.
**Source:** INVESTIGATION (Report #2, §I-2)
**Confidence:** CONFIRMED — tested: Ready click → API error → console.error only, no toast
**Code Reality:** NONE

## Description

All 4 aggregator handlers in DashboardPage.jsx (`handleAggregatorAccept`, `handleAggregatorReject`, `handleAggregatorReady`, `handleAggregatorDispatch`) catch errors with `console.error` only. No toast/notification shown to user on success or failure.

## Fix

Add toast on success ("Order marked ready") and error ("Failed to update order — please retry") in each handler. ~10 lines per handler.

## Blast Radius

SMALL — 1 file (`DashboardPage.jsx`), ~40 lines across 4 handlers.
