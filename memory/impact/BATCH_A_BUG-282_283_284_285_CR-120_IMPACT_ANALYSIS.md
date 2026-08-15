# Impact Analysis — Batch A (BUG-282, BUG-283, BUG-284, BUG-285, CR-120)

**Stage:** Gate 2 — Impact Analysis
**Date:** 2026-07-31
**Code Reality:** NONE (0 code markers found for any of the 5 items)
**Conflict Pre-Check:** CR-118 (IMPLEMENTED, pending QA) touches same files — but different code sections. **PARALLEL-SAFE.** No merge risk.

---

## File Ownership Pre-Check

| File | Last Modified By | Date | Conflict? |
|------|-----------------|------|-----------|
| `components/dashboard/AggregatorOrderPopOut.jsx` | CR-118 agent | 2026-07-31 | NO — CR-118 added lines 308-328 (checkboxes). BUG-282 adds lines ~295 (addons). BUG-284 changes lines 27-31 (formatAddress). Both are in different sections. |
| `api/transforms/aggregatorTransform.js` | CR-118 / BUG-257 agent | 2026-07-31 | NO — BUG-283 changes line 23 (orderNote). CR-118 changed line 29 (aggrId) and lines 107-117 (addon split). Different fields. |
| `components/cards/OrderCard.jsx` | CR-118 agent | 2026-07-31 | NO — CR-120 narrows conditions at L1013+L1082. BUG-285 changes L1071-1079. CR-118 added L1082-1093. Different blocks, same file. |
| `components/cards/TableCard.jsx` | CR-118 agent | 2026-07-31 | NO — BUG-285 changes L490-517. CR-120 changes L490-517 (KOT→Bill swap). CR-118 added L464-475+L492-503 (KOT icons). Changes are within the same block but additive. |

---

## SCOPE EXPANSION FINDING

**Intake docs for BUG-285 and CR-120 each estimated 1 file (OrderCard.jsx).** Impact analysis reveals `TableCard.jsx` has identical patterns that must also change for consistency:

| Item | Intake Estimate | Actual Scope | Delta |
|------|----------------|--------------|-------|
| BUG-285 | 1 file, ~5 lines | **2 files** (~8 lines) | +1 file (TableCard) |
| CR-120 | 1 file, ~2 lines | **2 files** (~6 lines) | +1 file (TableCard) |

Risk stays LOW — all changes are small, additive, no financial/API/state logic.

**OWNER APPROVAL REQUIRED for scope expansion? NO** — per v0.7, scope expansion approval is needed when "hotspot count increases or risk escalates." Risk stays LOW, TableCard is not a hotspot file. Proceeding.

---

## Item-by-Item Analysis

### BUG-282 — Aggregator Popup: Addons + Variations Not Displayed

**Risk:** LOW
**Data Flow:** API → `aggregatorTransform.js` → `item.addOns[]` + `item.variation[]` → `AggregatorOrderPopOut.jsx` (NOT rendered)

**Root Cause:** `AggregatorOrderPopOut.jsx` lines 288-304 render item rows but never access `item.addOns` or `item.variation`. The transform correctly maps them (confirmed: L107-117 maps addOns, L112-117 maps variation).

**Fix Site:**
- File: `AggregatorOrderPopOut.jsx`
- Location: After line 295 (inside the `items.map()` render block, after `item.notes`)
- Add: Render `item.addOns[]` as indented sub-rows (name + price). Render `item.variation[]` as label text.
- Pattern: Follow `ScanOrderPopOut.jsx` L455-530 styling convention (indented, smaller text, muted color)

**Downstream:** None — purely additive JSX render. No state, no API, no transform change.

**Affected Lines:**
| File | Lines | Change |
|------|-------|--------|
| `AggregatorOrderPopOut.jsx` | After L295 | +~25 lines: addon/variation render block |

---

### BUG-283 — "Order Instructions :::" Prefix Not Stripped

**Risk:** LOW
**Data Flow:** API field `order_note` → `aggregatorTransform.js` L23 → `orderNote` → popup + OrderCard display

**Root Cause:** `aggregatorTransform.js` L23 passes raw `order_note` without stripping Zomato's `"Order Instructions :::"` prefix.

**Fix Site:**
- File: `aggregatorTransform.js`
- Location: Line 23
- Change: Wrap `orderNote` computation with `.replace(/^Order Instructions\s*:::\s*/i, '').trim()` before the `|| null` fallback

**Downstream:** `orderNote` is consumed by:
1. `AggregatorOrderPopOut.jsx` L267 — popup display ✅
2. `OrderCard.jsx` (via order.orderNote) — dashboard card ✅
Both benefit from the fix. No other consumers.

**Affected Lines:**
| File | Lines | Change |
|------|-------|--------|
| `aggregatorTransform.js` | L23 | ~1 line change: add `.replace()` |

---

### BUG-284 — Address Duplicate City "Bangalore, Bangalore"

**Risk:** LOW
**Data Flow:** API `customer_details.address` → `AggregatorOrderPopOut.jsx` L27-31 `formatAddress()` → display

**Root Cause:** `formatAddress` at L27-31 joins `[line_1, line_2, city, pin]` without dedup. Also missing `sub_locality` and `landmark`. When Swiggy sends identical values for `line_1`, `sub_locality`, and `city` (all "Bangalore"), the output duplicates.

**Fix Site:**
- File: `AggregatorOrderPopOut.jsx`
- Location: Lines 27-31
- Change: Add `sub_locality` + `landmark` to parts array, add `.filter((v, i, a) => a.indexOf(v) === i)` dedup

**Downstream:** `formatAddress` is local to this component (not exported). No other consumers.

**Affected Lines:**
| File | Lines | Change |
|------|-------|--------|
| `AggregatorOrderPopOut.jsx` | L27-31 | ~3 line change: add fields + dedup filter |

---

### BUG-285 — "Ready to Dispatch" Button → Text Label

**Risk:** LOW
**Data Flow:** `order.fOrderStatus === 2` → `OrderCard.jsx` L1071-1079 renders `<button>` + `TableCard.jsx` L490-517 renders `<TextButton>`

**Root Cause:** Both `OrderCard.jsx` (L1071-1079) and `TableCard.jsx` (L504-515) render "Ready to Dispatch" as a clickable button with orange border. Owner says it should be a non-interactive status label.

**Fix Site (2 files):**
- **OrderCard.jsx** L1071-1079: Replace `<button>` with `<span>` styled as status label. Remove `onClick`.
- **TableCard.jsx** L504-515: Replace `<TextButton>` with a plain styled `<span>`. Remove `onClick`.

**Downstream:**
- `onAggregatorDispatch` prop still exists but won't be called from this UI path. Safe — the prop is optional (`onAggregatorDispatch?.()`).
- No state or API change.

**Open Question:**
- **OQ-BUG285-1:** Should the `onAggregatorDispatch` handler on DashboardPage also be removed, or kept for future use? **Recommendation:** Keep — zero cost, future-proofing. **Not blocking.**

**Affected Lines:**
| File | Lines | Change |
|------|-------|--------|
| `OrderCard.jsx` | L1071-1079 | ~5 lines: `<button>` → `<span>` status label |
| `TableCard.jsx` | L504-515 | ~5 lines: `<TextButton>` → `<span>` status label |

---

### CR-120 — Split KOT/Bill Buttons by Order Status

**Risk:** LOW
**Data Flow:** `order.fOrderStatus` → `OrderCard.jsx` L1013 (KOT condition) + L1082 (Bill condition) + `TableCard.jsx` L462-517 (KOT/Bill blocks)

**Current vs Desired:**

| fOS | OrderCard KOT | OrderCard Bill | TableCard KOT | TableCard Bill |
|-----|:---:|:---:|:---:|:---:|
| **1 (preparing) — Current** | ✅ | ✅ | ✅ | ❌ |
| **1 (preparing) — Desired** | ✅ | ❌ | ✅ | ❌ |
| **2 (ready) — Current** | ✅ | ✅ | ✅ | ❌ |
| **2 (ready) — Desired** | ❌ | ✅ | ❌ | ✅ |

**Fix Site (2 files):**

**OrderCard.jsx:**
- L1013: Change `(fOrderStatus === 1 || fOrderStatus === 2)` → `fOrderStatus === 1` (KOT only at preparing)
- L1082: Change `(fOrderStatus === 1 || fOrderStatus === 2)` → `fOrderStatus === 2` (Bill only at ready)

**TableCard.jsx:**
- L462-489 (fOS=1 block): Currently has KOT icon + Ready button. KOT icon stays ✅. No Bill button needed. **No change.**
- L490-517 (fOS=2 block): Currently has KOT icon + "Ready to Dispatch" button.
  - **Remove** KOT icon (L492-503)
  - **Add** Bill button (new `<IconButton>` with Printer + "Bill" label, calls `handleAggregatorPrint(e, 'aggr_bill')`)
  - "Ready to Dispatch" → text label (covered by BUG-285)

**Downstream:**
- `handleAggregatorPrint` already exists in TableCard (L241-254). Bill print uses `'aggr_bill'` type. No new handler needed.
- Non-aggregator orders are fully gated by `isAggregator` checks — zero regression risk.

**Affected Lines:**
| File | Lines | Change |
|------|-------|--------|
| `OrderCard.jsx` | L1013 | Condition narrowed: `(1 \|\| 2)` → `1` |
| `OrderCard.jsx` | L1082 | Condition narrowed: `(1 \|\| 2)` → `2` |
| `TableCard.jsx` | L490-517 | Remove KOT icon, add Bill button, text label (BUG-285) |

---

## Combined File Change Matrix

| File | Items | Total Edits | Risk |
|------|-------|:-----------:|------|
| `AggregatorOrderPopOut.jsx` | BUG-282, BUG-284 | 2 | LOW |
| `aggregatorTransform.js` | BUG-283 | 1 | LOW |
| `OrderCard.jsx` | BUG-285, CR-120 | 3 | LOW |
| `TableCard.jsx` | BUG-285, CR-120 | 1 block rewrite | LOW |

**Total: 4 files, ~50 lines changed, all LOW risk.**

---

## Execution Order Recommendation

All 5 items are independent and can be implemented in any order. Recommended batch:
1. **BUG-283** first (1 line, transform layer — lowest risk)
2. **BUG-284** (3 lines, same component as BUG-282)
3. **BUG-282** (~25 lines, same component)
4. **BUG-285 + CR-120** together (same lines in OrderCard + TableCard)

---

## Owner Decisions Needed

| # | Item | Question | Blocking? |
|---|------|----------|-----------|
| OQ-BUG285-1 | BUG-285 | Keep `onAggregatorDispatch` handler on DashboardPage for future use, or remove dead code? | NO — recommend keep |

**No blocking decisions. Batch A can proceed to Gate 3 (Implementation Plan).**
