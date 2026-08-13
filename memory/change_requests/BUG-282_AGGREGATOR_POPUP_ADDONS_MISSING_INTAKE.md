# BUG-282 — Aggregator Popup: Addons + Variations Not Displayed

**ID:** BUG-282
**Type:** BUG
**Priority:** P1
**Risk:** LOW
**Area:** Dashboard → AggregatorOrderPopOut
**Sprint:** pos_5_0
**Intake Date:** 2026-07-31
**Gate:** 0-1
**Source:** INVESTIGATION (Aggregator Investigation Report 2026-07-31)

---

## Description

When an aggregator order (Swiggy/Zomato) arrives with add-ons or variations, the acceptance popup (`AggregatorOrderPopOut.jsx`) does not display them. Only item name, category, quantity, price, and notes are rendered. The equivalent web-order popup (`ScanOrderPopOut.jsx`) correctly renders both addons and variations.

## Evidence

- Live data: Order #478/002407 (Swiggy) has `add_ons: [{name: "egg", price: 10}, {name: "cheese", price: 50}]` — not shown in popup
- Order #478/002401 (Zomato) has `add_ons: [{name: "Paneer", price: 80}]` — not shown
- `AggregatorOrderPopOut.jsx`: `grep -c "addon\|addOn\|variation" → 0` hits
- `ScanOrderPopOut.jsx`: Lines 455–530 render both correctly
- Transform (`aggregatorTransform.js`): Correctly maps `item.addOns[]` + `item.variation[]` ✅

## Steps to Reproduce

1. Login as owner@18march.com on preprod
2. Place/receive aggregator order with add-ons via Swiggy/Zomato
3. Observe popup — add-ons not visible under item rows
4. Compare: web/scan order popup shows add-ons correctly

## Blast Radius

- 1 file: `AggregatorOrderPopOut.jsx` (~30 new lines)
- Risk: LOW — additive UI render block, no logic change

## Acceptance Criteria

```
AC-1: Aggregator popup shows add-on names + prices under each item (same pattern as ScanOrderPopOut)
AC-2: Aggregator popup shows variation labels under each item
AC-3: Items without add-ons/variations render unchanged
```

## Duplicate Check: DISTINCT
