# CR-108 — Wire Auto-KOT on Aggregator Accept

**ID:** CR-108
**Type:** CR (Feature)
**Created:** 2026-07-26
**Priority:** P2 — MEDIUM (KOT can be printed manually; auto-KOT saves time)
**Risk:** MEDIUM (touches printing pipeline for aggregator flow)
**Module:** Dashboard — Aggregator Accept + Printing
**Duplicate Check:** DISTINCT. Extends CR-106. Related: regular `autoKot` in OrderEntry.
**Source:** INVESTIGATION (Report #2, §I-6)
**Confidence:** CONFIRMED — settings UI exists (`ViewEditViews.jsx:283`), backend has `aggregator_auto_kot: Yes`, but accept handler doesn't trigger KOT
**Code Reality:** PARTIAL (settings UI exists, wiring missing)

## Description

Backend setting `aggregator_auto_kot: Yes` is configured for restaurant 478. Settings UI for the toggle exists. But the aggregator accept handler (`handleAggregatorAccept` in DashboardPage.jsx) does NOT check this setting and does NOT trigger KOT printing after a successful accept.

Similarly, `aggregator_auto_bill: No` and `aggregator_auto_bill_stage: Ready` exist but are not wired.

## Blast Radius

MEDIUM — 1-2 files (`DashboardPage.jsx`, printer integration), ~15 lines. Needs Gate 2-3 (touches printing).
