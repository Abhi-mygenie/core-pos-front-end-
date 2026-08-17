# CR-123 — Stock Update: "Update Stock" Button Sticky (Fixed Bottom-Right)

**Intake Date:** 2026-07-31
**Type:** CR (UX improvement)
**Source:** OWNER-REPORTED
**Sprint:** pos_5_0
**Parent:** CR-122 (scope extension — same module)

---

## 1. Owner Request

> "Option B — sticky button always visible"

Context: After CR-122 moved GroupedVendorPreview to the top, the "Update Stock (N vendors)" button remains at the bottom of the page below the full item list. Operator must scroll to the bottom to submit. Owner approved Option B: make the button fixed/floating so it is always visible regardless of scroll position.

---

## 2. User Flow (current vs target)

### Current
1. Select horizon → items load
2. Tick items → vendor summary appears at top (CR-122 done ✓)
3. Select payment method per vendor (top)
4. **Scroll all the way to the bottom** → click "Update Stock"

### Target (CR-123)
1. Select horizon → items load
2. Tick items → vendor summary appears at top + **"Update Stock" button floats at bottom-right**
3. Select payment method per vendor (top)
4. **Click "Update Stock" — visible at all times, no scroll needed**

---

## 3. Classification

- **Type:** CR
- **Area:** Inventory → Stock Update (`SmartPurchasePanel.jsx`)
- **Priority:** P2 — UX improvement; submit is functional but requires scroll
- **Risk:** LOW — CSS positioning change only; no logic, no API, no state
- **Fast Lane eligible:** YES (LOW, 1 file, ≤5 lines CSS, not a hotspot)

---

## 4. Duplicate Check

- **DISTINCT**
- Related: **CR-122** (parent — renamed labels + moved GroupedVendorPreview to top)
- Related: **BUG-263** (toolbar stickiness — already implemented via `sticky top-0 z-10` on toolbar div; DIFFERENT element)

---

## 5. Evidence

- **Screenshot:** Provided — shows "Update Stock (2 vendors)" button at very bottom after item rows
- **Steps to reproduce:**
  1. Inventory → Stock Update tab
  2. Select any items with a vendor assigned
  3. Observe "Update Stock (2 vendors)" button appears below all item rows
  4. Must scroll to find it
- **Code location:** `SmartPurchasePanel.jsx:~287-294`
- **Source:** OWNER-APPROVED (owner selected Option B explicitly)
- **Confidence:** CONFIRMED

---

## 6. Exact Code Location

**File:** `frontend/src/components/inventory/SmartPurchasePanel.jsx`
**Lines:** ~287-294 (submit button block)

**Current:**
```jsx
<div className="mt-6 flex justify-end">
  <Button onClick={handleSubmit} disabled={!canSubmit} ...>
    Update Stock (N vendors)
  </Button>
</div>
```

**Target (Option B — fixed floating):**
```jsx
{/* CR-123: sticky floating submit — always visible, no scroll needed */}
{canSubmit && (
  <div className="fixed bottom-6 right-6 z-50">
    <Button onClick={handleSubmit} disabled={submitting} ...>
      Update Stock (N vendors)
    </Button>
  </div>
)}
```

**Note:** Original `<div className="mt-6 flex justify-end">` block removed (replaced by floating button). `canSubmit` guard preserved — button only appears when items with vendors are selected.

---

## 7. Blast Radius

- **Files WILL change:** 1 — `SmartPurchasePanel.jsx` (~5 lines)
- **Files WILL NOT touch:** `GroupedVendorPreview.jsx`, `AutoShoppingList.jsx`, `Sidebar.jsx`, `InventoryTabBar.jsx`, `App.js`
- **Hotspot check:** Not on R5 list ✅
- **Financial logic:** `handleSubmit` function untouched ✅
- **`canSubmit` guard:** Preserved — button only visible when items with vendors selected ✅

---

## 8. Owner Decisions

All resolved:
- **OD-1: ✅** Option B (fixed sticky) approved by owner
- **OD-2:** Position — bottom-right (standard POS pattern, consistent with other action buttons in app)
- **OD-3:** Visibility condition — only show when `canSubmit` is true (items selected + vendor assigned)

---

## 9. Open Questions

None. All decisions resolved. Fast Lane eligible.

---

*Next: Fast Lane Gate 4 GO → Implementation*
