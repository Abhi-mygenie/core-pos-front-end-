# BUG-679 + CR-545 Scope Fix — Impact Analysis + Implementation Plan (Gate 2+3)

**Items:** BUG-679 (cancelled items in popup) + CR-545 OBS-5 (hide APS ₹1 amount)
**Gate:** 2 (IA) + 3 (Plan) — combined, same file, same session
**Role:** PLANNING
**Date:** 2026-11-17
**Risk:** MEDIUM (ScanOrderPopOut — web order confirmation flow)
**Code Reality:** PARTIAL — CR-545 Phase 1 is implemented, these are refinements

---

## 1. Owner Decisions (ALL LOCKED 2026-11-17)

| # | Decision | Answer |
|---|----------|--------|
| OD-OBS2-01 | Cancelled items in popup | **B — Show as strikethrough** (same pattern as CartPanel: opacity 0.5, line-through, "(Cancelled)" label) |
| OD-OBS5-01 | APS ₹1 display | **Hide ₹1 amount — do not show price for APS items** |

---

## 2. Conflict Pre-Check

| Item | File | Conflict? |
|------|------|-----------|
| CR-545 Phase 1 (IMPLEMENTED) | ScanOrderPopOut.jsx | **NO** — these edits refine the same code CR-545 added |
| CR-534 (INTAKE) | ScanOrderPopOut.jsx | **NO** — CR-534 is customer info, different section (L363-376) |
| CR-533 (INTAKE) | ScanOrderPopOut.jsx + DashboardPage.jsx | **NO** — CR-533 is minimize to YTC, different section (footer/state) |
| BUG-676 (INTAKE) | ScanOrderPopOut.jsx | **NO** — BUG-676 is ringer/notification, different system |

**Result: CLEAN.**

---

## 3. BUG-679 — Cancelled Items Strikethrough

### Current code (ScanOrderPopOut.jsx L461-472):

```javascript
.map((it, idx) => {
    const qty = Number(it?.qty ?? it?.quantity) || 1;
    const unit = Number(it?.unitPrice ?? it?.price) || 0;
    const lineTotal = unit * qty;
    const isComp = Boolean(it?.isComplementary || it?.isComplementaryRuntime);
    // ⚠️ No cancel check — all items render identically
    return (
      <li
        key={`${it?.id ?? it?.foodId ?? idx}-${idx}`}
        className="px-3 py-2 text-sm"
        // ⚠️ No opacity/style change for cancelled items
```

### How CartPanel does it (L67-99):

```javascript
const isCancelled = item.status === 'cancelled';
// Row: opacity: isCancelled ? 0.5 : 1
// Name: textDecoration: isCancelled ? 'line-through' : 'none'
//       color: isCancelled ? '#9CA3AF' : COLORS.darkText
// Label: {isCancelled && <span>(Cancelled)</span>}
// Cancel button: hidden for cancelled items
// Qty: hidden for cancelled items
```

### Fix — 3 edits in ScanOrderPopOut.jsx:

**E1 — Add `isCancelled` check (after L464, insert 1 line):**
```javascript
const isCancelled = it?.status === 'cancelled' || Number(it?.foodStatus ?? it?.food_status) === 3;
```

**E2 — Apply strikethrough styling to `<li>` row (L471-472, modify):**
```javascript
// CURRENT:
className="px-3 py-2 text-sm"

// NEW:
className="px-3 py-2 text-sm"
style={{ opacity: isCancelled ? 0.5 : 1 }}
```

**E3 — Apply strikethrough + "(Cancelled)" to item name (L477-481, modify):**
```javascript
// CURRENT:
<span
  style={{ color: COLORS.darkText }}
  className="font-medium truncate"
>
  {qty}× {it?.name || it?.productName || 'Item'}
</span>

// NEW:
<span
  style={{
    color: isCancelled ? '#9CA3AF' : COLORS.darkText,
    textDecoration: isCancelled ? 'line-through' : 'none',
  }}
  className="font-medium truncate"
>
  {qty}× {it?.name || it?.productName || 'Item'}
  {isCancelled ? <span className="ml-1 text-xs font-normal no-underline" style={{ textDecoration: 'none' }}>(Cancelled)</span> : null}
</span>
```

**E4 — Hide cancel (X) button for already-cancelled items (L511, modify):**
```javascript
// CURRENT:
{onCancelItem ? (

// NEW:
{onCancelItem && !isCancelled ? (
```

**E5 — Hide price for cancelled items (L503-509, modify):**
```javascript
// CURRENT:
<span style={{ color: COLORS.grayText }} className="font-mono flex-shrink-0">
  {currencySymbol}{lineTotal.toFixed(2)}
</span>

// NEW:
{!isCancelled ? (
  <span style={{ color: COLORS.grayText }} className="font-mono flex-shrink-0">
    {currencySymbol}{lineTotal.toFixed(2)}
  </span>
) : null}
```

---

## 4. CR-545 OBS-5 — Hide APS ₹1 Amount

### Current code (ScanOrderPopOut.jsx L503-508):

```javascript
<span style={{ color: COLORS.grayText }} className="font-mono flex-shrink-0">
  {currencySymbol}{lineTotal.toFixed(2)}
</span>
```

APS items (unit === 1, !isComp) show "₹1.00" — misleading placeholder.

### Fix — 1 edit:

**E6 — Replace ₹1 with "Price TBD" for APS items (L503-509, modify — combined with E5):**

The combined price display logic (E5 + E6 merged):

```javascript
{/* BUG-679: hide price for cancelled items / CR-545 OBS-5: replace ₹1 with "Price TBD" for APS */}
{isCancelled ? null : (unit === 1 && !isComp) ? (
  <span
    className="text-[11px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded"
    style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
  >
    Price TBD
  </span>
) : (
  <span style={{ color: COLORS.grayText }} className="font-mono flex-shrink-0">
    {currencySymbol}{lineTotal.toFixed(2)}
  </span>
)}
```

---

## 5. Execution Order

```
E1 → E2 → E3 → E4 → E5+E6 (all in ScanOrderPopOut.jsx, top to bottom)
```

All edits in ONE file: `ScanOrderPopOut.jsx`
Total lines changed: ~15 (modify existing) + ~5 (new) = ~20 lines

---

## 6. Files Changed Summary

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `ScanOrderPopOut.jsx` | E1-E6: cancel check, strikethrough, hide price, APS "Price TBD" | ~20 | LOW (styling + guard conditions) |
| **Total** | **1 file** | **~20** | **LOW** |

**Files WILL NOT touch:** DashboardPage.jsx, CartPanel.jsx, orderTransform.js, any service, any context

---

## 7. Verification Matrix

| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | Cancelled item shows as strikethrough + "(Cancelled)" | Browser: cancel item in popup, observe | Grey text, line-through, 50% opacity |
| V2 | Cancelled item has no X (cancel) button | Browser: cancelled item row | No X button |
| V3 | Cancelled item price hidden | Browser: cancelled item row | No price shown |
| V4 | APS item shows "Price TBD" instead of ₹1 | Browser: web order with APS item | Orange "Price TBD" pill, no ₹1 |
| V5 | APS badge still visible | Browser: APS item | Orange "APS" badge still present |
| V6 | Non-APS items show normal price | Browser: regular items | ₹299.00 format |
| V7 | Comp items unaffected | Browser: comp item | "Comp" badge, normal display |
| V8 | Active items fully functional | Browser: non-cancelled items | Cancel X, price, qty all visible |
| V9 | `// BUG-679` and `// CR-545 OBS-5` markers | grep | ≥3 hits |
| V10 | Webpack 0 new warnings | dev server | compiled |

---

## 8. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-679 → status: IMPLEMENTED
- [ ] registry.json: CR-545 → status note: "OBS-5 fixed (hide ₹1)"
- [ ] FILE_OWNERSHIP.md: ScanOrderPopOut.jsx — BUG-679 + CR-545-OBS5
- [ ] Code markers: // BUG-679, // CR-545 OBS-5 in ScanOrderPopOut.jsx
```

---

```
Planning complete: BUG-679 + CR-545 OBS-5
Stage: Impact Analysis + Implementation Plan (Gate 2+3)
Code reality: PARTIAL (CR-545 Phase 1 exists, these refine it)
Risk: LOW (styling + guard conditions, 1 file)
Files WILL change: ScanOrderPopOut.jsx (~20 lines)
Files WILL NOT touch: DashboardPage.jsx, CartPanel.jsx, orderTransform.js
Owner decisions: ALL LOCKED (OD-OBS2-01: B strikethrough, OD-OBS5-01: hide ₹1)
Docs: impact/BUG-679_CR-545-OBS5_COMBINED_PLAN_2026_11_17.md
Next: Gate 4 GO → Implementation
```
