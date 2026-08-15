# BUG-252 — TableCard Missing Items/Customer/Rider for Aggregator per Design

**ID:** BUG-252
**Type:** BUG
**Created:** 2026-07-26
**Priority:** P2 — MEDIUM (design gap, no data loss, staff can switch to list view)
**Risk:** MEDIUM (UI enhancement on TableCard, conditional for aggregator)
**Module:** Dashboard — TableCard
**Duplicate Check:** DISTINCT. Related: CR-106.
**Source:** INVESTIGATION (Report #1, §I-1)
**Confidence:** CONFIRMED — mockup section 3 vs live TableCard comparison
**Code Reality:** NONE

## Description

Design mockup (cr105-design-flow.html Section 3) shows aggregator cards with: items list ("1× Paneer Butter Masala"), customer name + phone ("SWIGGY +919999999992"), rider status ("Awaiting Runner"). Current TableCard only shows: S badge, order number, amount, waiter name, status, time, Ready button. Items/customer/rider not rendered for ANY order type in grid view.

## Fix

Enhance TableCard body for `isAggregator` cards: render condensed items, customer+phone, rider status. ~30-40 lines. Needs Gate 2-3 planning.

## Blast Radius

MEDIUM — 1 file (`TableCard.jsx`), ~40 lines. Non-aggregator rendering unchanged.
