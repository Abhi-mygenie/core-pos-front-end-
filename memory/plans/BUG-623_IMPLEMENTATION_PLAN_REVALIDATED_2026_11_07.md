# BUG-623 — Implementation Plan (Revalidated 2026-11-07)

**ID:** BUG-623
**Title:** Null Variation Entry Crashes orderTransform.reduce + BUG-618 Markers Missing
**Stage:** Gate 3 — Implementation Plan (Revalidated)
**Agent role:** PLANNING
**Risk:** MEDIUM
**Previous plan:** Embedded in `/app/memory/impact/QA_BATCH_BUGS_623_627_IMPACT_ANALYSIS_2026_10_28.md`
**Registry status:** GATE_3_PLAN_COMPLETE (confirmed — plan revalidation updates line numbers and adds E6)

---

## Revalidation Summary

The original plan (Oct 28) embedded Gate 3 edits inside the impact analysis.
This revalidation traced every edit against the current source files on 2026-11-07.

| Edit | Original File:Line | Actual File:Line | Finding | Action |
|---|---|---|---|---|
| E1 | orderTransform.js:706 | **L708** | Line drift (+2). Map block uses optional chaining in all branches — null `v` falls safely to `v?.name\|\|'Variant'` fallback. No crash, but produces noisy `{name:'Variant'}` entries. | UPDATE line. Keep as defensive improvement. |
| E2 | orderTransform.js:722 | **L724** | Line drift (+2). `v.price` on L726 — **DIRECT CRASH** on null `v`. No guard. | UPDATE line. CRITICAL fix. |
| E3 | orderTransform.js:1552 | **L1558** | Line drift (+6). `v.price` on L1559 — **DIRECT CRASH** on null `v`. The `item.variation?.length > 0` outer guard does NOT protect null elements inside the array. | UPDATE line. CRITICAL fix. |
| E4 | components/CollectPaymentPanel.jsx:259 | **components/order-entry/CollectPaymentPanel.jsx:260** | **Wrong subdirectory** in original plan + line drift (+1). Marker still reads `BUG-NEW`. | UPDATE path + line. |
| E5 | components/CollectPaymentPanel.jsx:261 | **components/order-entry/CollectPaymentPanel.jsx:262** | **Wrong subdirectory** + line drift (+1). Marker still reads `BUG-NEW`. | UPDATE path + line. |
| **E6** | *(missing from original plan)* | **orderTransform.js:L2007** | **PLAN GAP — new crash site.** `v.values` on L2008 — DIRECT CRASH on null `v`. Pattern: `(item.variation \|\| []).reduce((sum, v) => sum + (Array.isArray(v.values) ? ...` — the `v.values` access throws before Array.isArray can guard. | **ADD this edit.** |

---

## Conflict Pre-Check (re-run)

- `orderTransform.js` — last BUG-623-touching lines (708, 724, 1558, 2007) — no other open item in registry touches these exact lines. No conflict.
- `CollectPaymentPanel.jsx` — lines 260, 262 — only BUG-618 and BUG-623 touch these. BUG-618 is GATE_5B_QA_PASS (closed path). No active conflict.

---

## Code Reality Check

```
grep -rn "filter(Boolean)" /app/frontend/src/api/transforms/orderTransform.js
```
Result: 0 hits on variation lines → **None of the edits have been applied.** Full plan is NOT yet implemented.

---

## Files WILL Change

1. `/app/frontend/src/api/transforms/orderTransform.js` — E1, E2, E3, E6
2. `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` — E4, E5

## Files WILL NOT Touch

- Any other component, context, page, or service file
- No API contracts changed
- No state management changes

---

## Exact Edits (Revalidated)

### E1 — orderTransform.js:L708 — Defensive filter before .map()

**Current (L708):**
```js
variations = item.variation.map(v => {
```

**Replace with:**
```js
variations = item.variation.filter(Boolean).map(v => {   // BUG-623: filter null variation entries
```

**Why:** Optional chaining in the map body already prevents crash, but null entries silently produce `{name:'Variant',values:{label:[]}}` variation rows that pollute the request payload. Filter eliminates them before processing.

**Risk:** LOW — purely defensive. Non-null entries are unaffected.

---

### E2 — orderTransform.js:L724 — CRITICAL: filter before .reduce() [crash fix]

**Current (L724-730):**
```js
variationAmount = item.variation.reduce((sum, v) => {
  // Try direct price (legacy)
  if (v.price) return sum + (parseFloat(v.price) || 0);
  // Parse nested values array: values[].optionPrice
  const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
  return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
}, 0);
```

**Replace with:**
```js
variationAmount = item.variation.filter(Boolean).reduce((sum, v) => {   // BUG-623: filter null entries before reduce
  // Try direct price (legacy)
  if (v.price) return sum + (parseFloat(v.price) || 0);
  // Parse nested values array: values[].optionPrice
  const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
  return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
}, 0);
```

**Why:** `v.price` on L726 throws `TypeError: Cannot read properties of null (reading 'price')` when any variation entry is null. This is the primary crash.

**Risk:** MEDIUM — crash fix on order render path.

---

### E3 — orderTransform.js:L1558 — CRITICAL: filter before .reduce() in collectBill path [crash fix]

**Current (L1557-1562):**
```js
if (item.variation?.length > 0) {
  variationAmount = item.variation.reduce((sum, v) => {
    if (v.price) return sum + (parseFloat(v.price) || 0);
    const vals = Array.isArray(v.values) ? v.values : [];
    return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
  }, 0);
}
```

**Replace with:**
```js
if (item.variation?.length > 0) {
  variationAmount = item.variation.filter(Boolean).reduce((sum, v) => {   // BUG-623: filter null entries
    if (v.price) return sum + (parseFloat(v.price) || 0);
    const vals = Array.isArray(v.values) ? v.values : [];
    return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
  }, 0);
}
```

**Why:** Same pattern as E2. The `?.length > 0` guard only protects against empty/null array — not null elements inside. `v.price` crashes on null.

**Risk:** MEDIUM — crash fix on collectBill path.

---

### E4 — CollectPaymentPanel.jsx:L260 — Relabel BUG-NEW → BUG-618

**File:** `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Current (L260):**
```js
const addonSum = (item.addOns || []).reduce((s, a) => s + (a ? (parseFloat(a.price) || 0) * (a.quantity || a.qty || 1) : 0), 0); // BUG-NEW: null guard — aggregator socket data can include null addon entries
```

**Replace marker comment with:**
```js
const addonSum = (item.addOns || []).reduce((s, a) => s + (a ? (parseFloat(a.price) || 0) * (a.quantity || a.qty || 1) : 0), 0); // BUG-618: null guard — aggregator socket data can include null addon entries
```

**Why:** Code traceability — `BUG-NEW` is an orphaned marker; correct ID is BUG-618.

**Risk:** LOW — comment-only change.

---

### E5 — CollectPaymentPanel.jsx:L262 — Relabel BUG-NEW → BUG-618

**File:** `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`

**Current (L262):**
```js
      if (!group) return s; // BUG-NEW: null guard — aggregator/scan order socket re-hydration can include null variation entries; accessing group.values on null throws TypeError caught by ErrorBoundary
```

**Replace marker comment with:**
```js
      if (!group) return s; // BUG-618: null guard — aggregator/scan order socket re-hydration can include null variation entries; accessing group.values on null throws TypeError caught by ErrorBoundary
```

**Why:** Same as E4 — orphaned marker.

**Risk:** LOW — comment-only change.

---

### E6 — orderTransform.js:L2007 — CRITICAL: filter before .reduce() in GST/tax path [NEW — plan gap]

**Current (L2007-2010):**
```js
const variationPerUnit = (item.variation || []).reduce(
  (sum, v) => sum + (Array.isArray(v.values) ? v.values.reduce(
    (s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0) : 0), 0
);
```

**Replace with:**
```js
const variationPerUnit = (item.variation || []).filter(Boolean).reduce(   // BUG-623: filter null entries
  (sum, v) => sum + (Array.isArray(v.values) ? v.values.reduce(
    (s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0) : 0), 0
);
```

**Why:** `Array.isArray(v.values)` on L2008 — `v.values` throws `TypeError` before `Array.isArray` can evaluate when `v` is null. The `(item.variation || [])` guard only protects against null array, not null elements inside.

**Risk:** MEDIUM — crash fix on GST/tax calculation path (affects OrderCard, TableCard, RePrintButton per the comment at L2004).

---

## Verification Matrix (Revalidated)

| # | Edit | File | Check | Method |
|---|---|---|---|---|
| 1 | E1 | orderTransform.js:708 | `.filter(Boolean).map(` present | `grep -n "filter(Boolean).map" src/api/transforms/orderTransform.js` |
| 2 | E2 | orderTransform.js:724 | `.filter(Boolean).reduce(` present (first occurrence) | `grep -n "filter(Boolean).reduce" src/api/transforms/orderTransform.js` |
| 3 | E3 | orderTransform.js:1558 | `.filter(Boolean).reduce(` present (second occurrence) | same grep |
| 4 | E6 | orderTransform.js:2007 | `.filter(Boolean).reduce(` present (third occurrence) | same grep |
| 5 | E4 | CollectPaymentPanel.jsx:260 | `BUG-618` replaces `BUG-NEW` on addon line | `grep -n "BUG-NEW\|BUG-618" src/components/order-entry/CollectPaymentPanel.jsx` |
| 6 | E5 | CollectPaymentPanel.jsx:262 | `BUG-618` replaces `BUG-NEW` on variation line | same grep |
| 7 | REG | Both files | Non-null variation entries unchanged (existing tests pass) | `npx craco test --watchAll=false --testPathPattern=orderTransform` |
| 8 | COMPILE | Frontend | Webpack compiles with 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-623 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add orderTransform.js (BUG-623, 2026-11-07) + CollectPaymentPanel.jsx (BUG-623, 2026-11-07)
- [ ] Code markers: // BUG-623 comment on E1, E2, E3, E6
- [ ] Code markers: // BUG-618 replaces BUG-NEW on E4, E5
```

---

## Execution Sequence

1. E1 → E2 → E3 → E6 (all in orderTransform.js — do in one pass)
2. E4 → E5 (both in CollectPaymentPanel.jsx — do in one pass)
3. Webpack compile check
4. Run orderTransform unit tests
5. Registry + ownership sync
