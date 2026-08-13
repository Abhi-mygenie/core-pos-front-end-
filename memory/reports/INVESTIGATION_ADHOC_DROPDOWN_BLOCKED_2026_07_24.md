# BUG-236 — Investigation Report — 2026-07-24

**Bug:** Smart Purchase Ad-hoc Typeahead Dropdown Clipped by `overflow-hidden`
**Agent Role:** INVESTIGATION → handover to BUG FIX
**Steps Used:** 4/10
**Confidence:** HIGH
**Risk:** LOW (display-only, 1 non-hotspot file, ≤5 lines)
**Priority:** P1

---

## 1. Summary

Root cause: `overflow-hidden` on the `AutoShoppingList` card container (`AutoShoppingList.jsx:67`) clips the absolute-positioned typeahead dropdown. When a user clicks "+ Add Ad-hoc Item" and types a search query, the matching ingredient dropdown renders below the input at the bottom of the card — but the card's `overflow-hidden` prevents it from being visible. The "WILL SUBMIT AS 1 VENDOR PO" section below the card further blocks any visual escape.

Classification: **FE_BUG**
Confidence: **HIGH**

---

## 2. Reproduction Steps

1. Navigate to **Smart Purchase** (Inventory → Smart Purchase tab)
2. Wait for the auto shopping list to load (needs at least 1 item)
3. Click **"+ Add Ad-hoc Item"** in the header
4. A search input appears at the **bottom** of the card
5. Type an ingredient name (e.g., "Amul")
6. **Expected:** Dropdown with matching ingredients appears below the input
7. **Actual:** Dropdown is clipped/invisible — hidden behind the card boundary and the "WILL SUBMIT" section below

---

## 3. Root Cause — Exact Code

**File:** `src/components/inventory/smart/AutoShoppingList.jsx`

### The culprit — Line 67:
```jsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="auto-shopping-list">
```
`overflow-hidden` clips ALL absolutely-positioned children that extend beyond the container.

### The dropdown — Line 164:
```jsx
<div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown">
```
`position: absolute` + `z-10` — needs to overflow the parent container, but cannot.

### The typeahead wrapper — Lines 155-174:
Positioned AFTER `</table>` at the bottom of the card. Dropdown extends downward into the clipped zone.

### Why `overflow-hidden` exists:
Paired with `rounded-xl` to keep table corners clipped within rounded card corners. Standard CSS pattern — but it inadvertently clips the dropdown too.

---

## 4. Data Flow Trace

```
User clicks "+ Add Ad-hoc Item" (L79)
  → setShowTypeahead(true) (L36)
  → Renders typeahead input at BOTTOM of card (L156-174)
  → User types query → filteredMaster computed (L39-44)
  → Dropdown renders below input: absolute z-10 mt-1 (L164)
  → Parent div has overflow-hidden (L67)
  → CLIPPED — dropdown invisible
```

---

## 5. Recommended Fix — Option A (Split Overflow)

**Approach:** Remove `overflow-hidden` from the outer card div. Apply `overflow-x-auto` only to the table wrapper to maintain horizontal scroll + rounded corners.

### Edit 1 — Line 67: Remove `overflow-hidden` from card container

**Current:**
```jsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="auto-shopping-list">
```

**Fix:**
```jsx
<div className="bg-white rounded-xl border border-slate-200" data-testid="auto-shopping-list">
```

### Edit 2 — Line 85: Add overflow containment to table wrapper only

**Current:**
```jsx
<div className="overflow-x-auto">
```

**Fix:**
```jsx
<div className="overflow-x-auto overflow-y-visible">
```

### Edit 3 — Line 164: Increase z-index for dropdown safety

**Current:**
```jsx
<div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown">
```

**Fix:**
```jsx
<div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown">
```

---

## 6. Files WILL Change

| # | File | Line(s) | Change |
|---|---|---|---|
| 1 | `components/inventory/smart/AutoShoppingList.jsx` | L67 | Remove `overflow-hidden` from card container |
| 2 | `components/inventory/smart/AutoShoppingList.jsx` | L85 | Add `overflow-y-visible` to table wrapper |
| 3 | `components/inventory/smart/AutoShoppingList.jsx` | L164 | Increase dropdown z-index from `z-10` to `z-50` |

## 7. Files Will NOT Touch

| File | Reason |
|---|---|
| `SmartPurchasePanel.jsx` | Orchestrator — no overflow/layout issue |
| `GroupedVendorPreview.jsx` | Below the card — not the cause |
| `VendorSuggestionCell.jsx` | Unrelated |
| `HorizonPicker.jsx` | Unrelated |
| Any service/transform/context | Zero API/data change |

---

## 8. Verification Steps (for Bug Fix Agent)

| # | What to Verify | How | Expected |
|---|---|---|---|
| V1 | Compilation | `yarn start` → webpack compiles | 0 new errors/warnings |
| V2 | Dropdown visible | Click "+ Add Ad-hoc Item" → type any letter → dropdown appears | Dropdown overlays the "WILL SUBMIT" section, fully visible |
| V3 | Picking an item works | Click an ingredient in the dropdown | Item added to table as AD-HOC row, typeahead closes |
| V4 | Table horizontal scroll preserved | Narrow the browser → table scrolls horizontally | Table still scrolls inside the card |
| V5 | Card rounded corners preserved | Visual check | Card corners still rounded, no content poking out |
| V6 | Dropdown closes on blur | Click outside the typeahead | Dropdown disappears |

---

## 9. Risk Register

| Risk | Mitigation | Residual |
|---|---|---|
| Table corners lose rounding | `overflow-x-auto` on table wrapper maintains containment | LOW — visual check in V5 |
| Dropdown behind other elements | Increased z-index to `z-50` | NONE |
| Table horizontal scroll broken | `overflow-x-auto` preserved on table wrapper (L85) | NONE — V4 verifies |

---

## 10. Registry Entry

| Field | Value |
|---|---|
| ID | BUG-236 |
| Title | Smart Purchase — Ad-hoc Typeahead Dropdown Clipped by overflow-hidden |
| Type | BUG |
| Priority | P1 |
| Risk | LOW |
| Status | INVESTIGATION COMPLETE → ready for BUG FIX |
| Sprint | POS 5.0 |
| Area | Inventory → Smart Purchase → AutoShoppingList |
| Files | `src/components/inventory/smart/AutoShoppingList.jsx` |
| Related | None |

---

## 11. Handover to BUG FIX Agent

```
Root cause: FE_BUG — overflow-hidden on card container clips typeahead dropdown.
Confidence: HIGH. Steps: 4/10.
Fix: 3 edits in 1 file (AutoShoppingList.jsx L67, L85, L164).
Scope: ≤5 lines changed. Non-hotspot file. Zero API/state/financial impact.
Risk: LOW.
Investigation report: /app/memory/reports/INVESTIGATION_ADHOC_DROPDOWN_BLOCKED_2026_07_24.md
Verification: 6 checks (V1-V6).
Next: BUG FIX agent applies edits → verify V1-V6 → QA.
```
