# BUG-257 — OrderCard item.qty Undefined for Aggregator — Empty Parens

**ID:** BUG-257
**Type:** BUG
**Created:** 2026-07-27
**Priority:** P1 — HIGH (items display broken: "Double Chicken Keema Roll ()" with empty parens)
**Risk:** LOW (1-line field alias addition)
**Module:** Dashboard — OrderCard / aggregatorTransform
**Duplicate Check:** DISTINCT. Related: CR-106.
**Source:** INVESTIGATION (Report #3, G1)
**Confidence:** CONFIRMED — code traced: OrderCard:692 reads `item.qty`, aggregatorTransform sets `item.quantity`
**Code Reality:** NONE — `qty` alias missing from aggregatorTransform

## Description
OrderCard line 692 renders `{item.name} ({item.qty})`. Regular `orderTransform.js:126` maps API `quantity` → `qty`. But `aggregatorTransform.js` sets `quantity:` (not `qty:`). Result: `item.qty` is `undefined` → renders empty parens.

## Fix
In `aggregatorTransform.js` item mapping, add `qty:` alias:
```js
quantity: Number(f.quantity) || 1,
qty: Number(f.quantity) || 1, // BUG-257: OrderCard reads item.qty
```
1 line. Result: `Double Chicken Keema Roll (1)`.

## Blast Radius
SMALL — 1 file (`aggregatorTransform.js`), 1 line.
