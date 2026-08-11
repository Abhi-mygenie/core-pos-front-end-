# BUG-253 — Platform Dropdown Missing "Aggregator" Filter

**ID:** BUG-253
**Type:** BUG
**Created:** 2026-07-26
**Priority:** P1 — HIGH (cannot filter by Swiggy/Zomato orders on dashboard)
**Risk:** LOW (additive option + predicate, no existing logic change)
**Module:** Dashboard — PlatformDropdown
**Duplicate Check:** DISTINCT. Code comment planned it: "Future BE values (aggregator) extend this list"
**Source:** INVESTIGATION (Report #2, §I-1) + owner screenshot
**Confidence:** CONFIRMED — `PLATFORM_OPTIONS` has 3 items, no aggregator
**Code Reality:** NONE (planned in comments, not executed)

## Description

`PlatformDropdown.jsx` only has: "Platform: All", "POS", "Web / Scan". No "Aggregator" option. Aggregator orders fall into "POS" bucket which is incorrect. Staff cannot filter dashboard to show only Swiggy/Zomato orders.

## Fix

Add `{ value: 'aggregator', label: 'Aggregator' }` to `PLATFORM_OPTIONS`. Update `platformMatches` predicate in DashboardPage.jsx. ~10 lines, 2 files.

## Blast Radius

SMALL — 2 files (`PlatformDropdown.jsx`, `DashboardPage.jsx`), ~10 lines.
