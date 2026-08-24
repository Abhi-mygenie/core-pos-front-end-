# BUG-256 + BUG-257 — Impact Analysis + Implementation Plan (Gate 2+3)

**Document:** `plans/BUG256_257_IMPACT_AND_PLAN.md`
**Created:** 2026-07-27
**Role:** PLANNING (Gate 2+3 combined — both ≤10 lines, LOW risk, single file each)
**Status:** AWAITING GATE 4 GO

---

## Header Block

| Field | Value |
|---|---|
| **Code Reality** | BUG-256: EXISTS (code to delete). BUG-257: NONE (field alias missing). |
| **Entry Verification** | All target lines verified 2026-07-27 — MATCH |
| **Conflict Pre-Check** | NONE — both files last modified by our sprint, no other in-flight |
| **Risk** | LOW (both: delete/add only, no logic change, no hotspot) |
| **Scope Lock** | 2 files. 0 new files. |

---

## BUG-256: Revert TableCard Aggregator Body

### Impact Analysis

**Problem:** BUG-252 added items/customer/rider body to aggregator TableCards → cards are ~2× height of regular delivery cards → grid alignment broken.

**Data flow:** `TableCard.jsx` L412-443 renders a conditional block `{isAggregator && table.order && (...)}` with 3 sub-sections (items, customer+phone, rider). Removing this block returns aggregator cards to the same compact format as regular cards: header pill (S badge + order# + amount) + waiter/status + time + action buttons.

**Files WILL change:** `TableCard.jsx` (delete L412-443)
**Files WILL NOT touch:** Everything else

### Implementation Plan — 1 edit

**Edit 256-1 — `components/cards/TableCard.jsx` — Delete L412-443**

**Delete this entire block:**
```jsx
            {/* BUG-252: Aggregator card body — items, customer+phone, rider status */}
            {isAggregator && table.order && (
              <div className="flex-1 flex flex-col gap-1 mb-2 min-h-0">
                {/* Condensed items (first 2 + overflow) */}
                ...
                {/* Customer + phone */}
                ...
                {/* Rider status */}
                ...
              </div>
            )}
```

**~30 lines deleted. 0 lines added.**

### Verification

| # | Check | How |
|---|-------|-----|
| V1 | Aggregator cards same height as regular delivery cards | Login → dashboard → visual comparison: S badge cards same height as "Del ₹105" |
| V2 | S badge still present | Aggregator cards still show orange S circle |
| V3 | Ready button still works | Aggregator preparing cards still have Ready button |
| V4 | Regular cards unchanged | "Del ₹105", mayur, parth, saurav unchanged |

---

## BUG-257: OrderCard item.qty Field Mismatch

### Impact Analysis

**Problem:** OrderCard L692 renders `{item.name} ({item.qty})`. Regular `orderTransform.js:126` maps `qty: detail.quantity || 1`. But `aggregatorTransform.js` maps `quantity:` (not `qty:`). Result: `item.qty` is `undefined` → empty parens `()`.

**Data flow:**
```
aggregatorTransform → item { quantity: 1 } (no qty field)
  → OrderContext.orders[]
    → OrderCard L692: {item.name} ({item.qty}) → "Double Chicken Keema Roll ()"
```

**Files WILL change:** `aggregatorTransform.js` (add 1 line in item mapping)
**Files WILL NOT touch:** OrderCard.jsx (reads `item.qty` — this is correct, transform must match)

### Implementation Plan — 1 edit

**Edit 257-1 — `api/transforms/aggregatorTransform.js` L98**

**Current:**
```js
          quantity: Number(f.quantity) || 1,
```

**New:**
```js
          quantity: Number(f.quantity) || 1,
          qty: Number(f.quantity) || 1, // BUG-257: OrderCard reads item.qty (not item.quantity)
```

**1 line added.**

### Verification

| # | Check | How |
|---|-------|-----|
| V5 | OrderCard shows qty in parens | Login → Order view → aggregator order → "Double Chicken Keema Roll (1)" not "()" |
| V6 | TableCard items unaffected | TableCard still shows compact format (no items in body after BUG-256 revert) |

---

## Combined Summary

| Bug | File | Change | Lines |
|-----|------|--------|-------|
| BUG-256 | `TableCard.jsx` | Delete L412-443 (aggregator body block) | -30 |
| BUG-257 | `aggregatorTransform.js` | Add `qty:` alias at L99 | +1 |

**Total: -29 net lines. 2 files. Parallel-safe (no overlap).**

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-256 + BUG-257 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: files listed
- [ ] Code markers: // BUG-256, // BUG-257
- [ ] Compile check: webpack 0 new warnings
```

---

## Handover

```
Plan ready. 2 edits across 2 files (-29 net lines).
  BUG-256: Delete TableCard aggregator body (~L412-443). Cards return to compact height.
  BUG-257: Add qty: alias in aggregatorTransform L99. Fixes empty parens in OrderCard.
Both parallel-safe. Both LOW risk. Both owner-approved.
Verification: 6 checks.
Awaiting Gate 4 GO.
```
