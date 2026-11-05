# BUG-524 — Implementation Plan (Gate 3)
## Room Discount Alert Clamped in RoomDiscountControls

**Date:** 2026-10-09
**Status:** GATE_3_PLAN_COMPLETE
**Risk:** MEDIUM
**Impact Analysis:** `impact/BUG-524_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 3 edits (all inside `RoomDiscountControls`, lines 54 / 74 / 89)

**Files WILL NOT touch:**
- `CheckInForm.jsx` (already correct via BUG-507)
- `CheckInPage.jsx`
- `CollectPaymentPanel.jsx` (R5)
- `handlePaid` function (L278 guard already correct)
- Any test files

---

## Edits

### E1 — `FolioCheckoutPanel.jsx` L54: extend `discountOverMax` to Amount mode

**Current L54:**
```js
  const discountOverMax = roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct;
```

**New L54–56:**
```js
  // BUG-524: extend to Amount mode (mirror CheckInForm BUG-507 pattern)
  const discountOverMax =
    (roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct) ||
    (roomDiscountType === 'Amount'  && Number(roomDiscount) > (maxCheckoutDiscount ?? baseBalance ?? 0));
```

*(+2 lines — L54 expands to 3 lines)*

---

### E2 — `FolioCheckoutPanel.jsx` L74: remove clamp from `onChange`

**Current L74:**
```js
              onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0))))}
```

**New L74:**
```js
              onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))} // BUG-524: no clamp — alert + handlePaid guard instead (mirror CheckInForm)
```

---

### E3 — `FolioCheckoutPanel.jsx` L89: make alert text mode-aware

**Current L89:**
```js
              Maximum discount: {maxPct}% (≈ ₹{Math.min(Math.floor(Number(c.booking_charge || 0) * maxPct / 100), maxCheckoutDiscount ?? 0)}) or ₹{maxCheckoutDiscount ?? 0} flat. Reduce to {maxPct}% or use Amount mode.{/* BUG-517 */}
```

**New L89:**
```js
              {/* BUG-524: mode-aware message */}
              {roomDiscountType === 'Percent'
                ? <>Maximum discount: {maxPct}% (≈ ₹{Math.min(Math.floor(Number(c.booking_charge || 0) * maxPct / 100), maxCheckoutDiscount ?? 0)}) or ₹{maxCheckoutDiscount ?? 0} flat. Reduce to {maxPct}% or switch to Amount mode.</>
                : <>Maximum discount: ₹{maxCheckoutDiscount ?? 0}. Reduce the amount.</>
              }
```

*(replaces 1 text node with a conditional — same `data-testid="bill-discount-over-max-alert"` on the wrapping div is unchanged)*

---

## Execution Order

E1 → E2 → E3 (same file; E1 must land first since E2/E3 depend on the broader logic context, though they are in different lines)

---

## Verification Matrix

| Edit | File | Line | How to verify | Automated? |
|---|---|---|---|:---:|
| E1 | FolioCheckoutPanel.jsx | 54–56 | `grep -n "roomDiscountType === 'Amount'" FolioCheckoutPanel.jsx` | YES |
| E2 | FolioCheckoutPanel.jsx | 74 | `grep -n "Math.min" FolioCheckoutPanel.jsx` — no longer on line 74 | YES |
| E3 | FolioCheckoutPanel.jsx | 89 | `grep -n "mode-aware" FolioCheckoutPanel.jsx` | YES |
| V1 | Browser | — | Percent mode: type value above maxPct → red alert appears immediately | NO |
| V2 | Browser | — | Percent mode: submit while over max → payError shown, blocked | NO |
| V3 | Browser | — | Amount mode: type above maxCheckoutDiscount → red alert appears | NO |
| V4 | Browser | — | Percent mode: type within max → no alert | NO |
| V5 | Browser | — | Amount mode: type within max → no alert | NO |
| V6 | Compile | — | webpack 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-524 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
□ 2. BUG_TRACKER.md: BUG-524 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: src/components/pms/frontdesk/FolioCheckoutPanel.jsx → BUG-524, 2026-10-09
□ 4. Code markers: // BUG-524 in all 3 edited locations ✓ (already in plan above)
□ 5. Compile check: webpack 0 new warnings
```
