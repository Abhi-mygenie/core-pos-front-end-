# Gate 3 — Implementation Plan: BUG-390
## Normal Menu Image Upload Hidden (Aggregator Gate Regression)

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**IA verified:** Lines 336–360 confirmed live in current code. No drift.
**Batch:** A — item 1 (implement FIRST — CR-373 depends on this)

---

## Entry Verification ✅

| Plan says | Live code | Match? |
|---|---|---|
| Line 336: BUG-375 comment | `{/* BUG-375: Zomato image upload — aggregator food only... */}` | ✅ |
| Line 337: Aggregator gate | `{menuType === 'Aggregator' && (` | ✅ |
| Line 339: label text | `>Zomato Image</label>` | ✅ |
| Line 360: gate closing | `)}` | ✅ |

---

## Edits

### E1 — Line 336: Update comment
**File:** `src/components/panels/menu/ProductForm.jsx`

```
FROM: {/* BUG-375: Zomato image upload — aggregator food only (symmetrical fix to BUG-327 for Swiggy) */}
TO:   {/* BUG-390: Item image upload — shown for all menu types */}
```

### E2 — Line 337: Remove Aggregator gate (opening)
**File:** `src/components/panels/menu/ProductForm.jsx`

```
REMOVE ENTIRE LINE: {menuType === 'Aggregator' && (
```

### E3 — Line 339: Rename label
**File:** `src/components/panels/menu/ProductForm.jsx`

```
FROM: <label ...>Zomato Image</label>
TO:   <label ...>Item Image</label>
```

### E4 — Line 360: Remove Aggregator gate (closing)
**File:** `src/components/panels/menu/ProductForm.jsx`

```
REMOVE ENTIRE LINE: )}
```
> Note: Only the `)}` at line 360 that closes the BUG-375 Aggregator gate. The `)}` at line 390 (BUG-327 Swiggy block) is untouched.

---

## Summary

| | |
|---|---|
| File | `ProductForm.jsx` only |
| Lines changed | 2 modified + 2 removed = 4 touches |
| Net line delta | −2 lines |
| New files | 0 |
| Risk | LOW |

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Open Normal menu → Add Item | Image upload block visible |
| V2 | Open Aggregator menu → Add Item | Image upload still visible (no regression) |
| V3 | Label text | Shows "Item Image" not "Zomato Image" |
| V4 | Save Normal item with image | Image saved to backend |
| V5 | Save Normal item without image | No error — image optional |

---

## Post-Code Registry Checklist

```
□ registry.json: BUG-390 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
□ BUG_TRACKER.md: row updated → IMPLEMENTED
□ FILE_OWNERSHIP.md: ProductForm.jsx → BUG-390 E1–E4 (date)
□ Code markers: // BUG-390 on lines E1 + E3
□ Compile: 0 new warnings
```

---

*Gate 3 complete. 1 file, 4 touches. Implement FIRST in Batch A.*
