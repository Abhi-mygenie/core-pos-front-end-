# BUG-506-REV + BUG-508 — Implementation Plan (Gate 3)

**IDs:** BUG-506 (revision of displayBalance) + BUG-508 (compound GST)
**Date:** 2026-10-07
**Stage:** GATE_3_IMPLEMENTATION_PLAN
**Author:** PLANNING agent
**Risk:** HIGH (financial display)
**Sprint:** oct_bug_batch
**Phase:** PMS → New Booking + Check-In
**IA:** `impact/BUG-506-REV_BUG-508_IMPACT_ANALYSIS.md`

---

## 0. Entry Verification (re-verified at HEAD)

| Anchor | File | Expected | HEAD | Match? |
|--------|------|----------|------|--------|
| Old `displayBalance` | CheckInForm.jsx L96-98 | `roomDiscountRs > 0 ? Math.max(...)` conditional | ✅ exact | ✅ |
| `displayGstTotal` useMemo | CheckInForm.jsx L100-103 | `const gstBase = Math.max(0, bc - roomDiscountRs)` | ✅ exact | ✅ |
| Strip "Total incl. GST" | CheckInForm.jsx L287 | `(Math.max(0, Number(c.booking_charge \|\| 0) - roomDiscountRs) + displayGstTotal)` | ✅ exact | ✅ |

**Structural note:** `displayBalance` (L96-98) currently sits **before** the `displayGstTotal` useMemo (L100-103). The new `displayBalance` formula requires `displayGstBase` from the useMemo. These two must be reordered in one combined edit (E-1) so the useMemo runs first and `displayBalance` follows. E-1 covers L92-103 as a single search_replace.

---

## 1. Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx` — E-1 (L92-103) + E-2 (L287)

**Files will NOT touch:**
- `CheckInForm.jsx` L90 `collectMax` — backend-compatible, must not change
- `CheckInForm.jsx` L86-88 `discountOverMax` — BUG-507 fix, correct
- `CheckInForm.jsx` L105-111 `displayGstRate` — slab badge; both 1,000 and 1,050 fall in 5% slab, unaffected
- `CheckInForm.jsx` L196-210 bill grid static values — BUG-505 fix, not touching
- `CheckInPage.jsx` — no bill grid balance display, not in scope

---

## 2. Edits

### E-1 — CheckInForm.jsx L92-103: Combined reorder + fix (BUG-506-REV + BUG-508)

This single edit:
- Keeps `gstOnAdvFloor` const (still needed as useMemo dep)
- Removes old `displayBalance` conditional block (L96-98)
- Rewrites `displayGstTotal` useMemo with `computeBase` guard + adds `displayGstBase` to return
- Adds new unified `displayBalance` **after** useMemo

**Current (L92-103):**
```javascript
  // BUG-506: display balance — GST-inclusive at zero discount; gstOnAdv floor secured when discount applied
  // gstOnAdvFloor = bc − advance − maxFlat (equals gstOnAdv from maxFlat useMemo; no new dep)
  // collectMax (L88) deliberately unchanged — backend-compatible (BUG-500/OD-500-04: bp=room−disc−adv)
  const gstOnAdvFloor  = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
  const displayBalance = roomDiscountRs > 0
    ? Math.max(gstOnAdvFloor, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))
    : Number(c.total_with_gst || 0) - Number(c.advance_payment || 0);
  // BUG-503: live GST on discounted price — updates as discount changes (OD-503-02 Option A)
  const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst } = useMemo(() => {
    const gstBase = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs);
    return computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1);
  }, [c.booking_charge, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights]);
```

**Replace with:**
```javascript
  // BUG-506: gstOnAdvFloor = bc − advance − maxFlat (= gstOnAdv secured by cap; used as guard below)
  // collectMax (L88) deliberately unchanged — backend-compatible (BUG-500/OD-500-04: bp=room−disc−adv)
  const gstOnAdvFloor  = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
  // BUG-503+508: displayGstTotal useMemo — computeBase guards against compound GST at max discount
  // When gstBase = advance + gstOnAdv (max discount): use advance as base (avoids 5%×gstOnAdv)
  // Exposes displayGstBase so displayBalance + strip "Total incl. GST" use the same corrected base
  const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst, displayGstBase } = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    const gstBase = Math.max(0, bc - roomDiscountRs);
    // BUG-508: at max discount gstBase(1050) = advance(1000) + gstOnAdv(50); use advance to avoid compound
    const computeBase = gstBase <= advance + gstOnAdvFloor ? advance : gstBase;
    return { ...computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase, formNights, 1), displayGstBase: computeBase };
  }, [c.booking_charge, c.advance_payment, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights, gstOnAdvFloor]);
  // BUG-506+508: unified balance = computeBase + recalcGST − advance (correct at all discount levels)
  const displayBalance = displayGstBase + displayGstTotal - Number(c.advance_payment || 0); // BUG-506+508
```

**Why this ordering:** `displayBalance` must come AFTER `displayGstTotal` useMemo because it references `displayGstBase` and `displayGstTotal` from that useMemo. The `gstOnAdvFloor` const must remain BEFORE the useMemo since it's a useMemo dep.

**Trace:**

| Discount | computeBase | displayGstTotal | displayBalance |
|----------|------------|----------------|----------------|
| ₹0 | 9,000 (9,000>1,050) | 18%×9,000=1,620 | 9,000+1,620−1,000=**9,620** ✅ |
| ₹6,000 | 3,000 (3,000>1,050) | 5%×3,000=150 | 3,000+150−1,000=**2,150** ✅ |
| ₹7,950 | 1,000 (1,050≤1,050) | 5%×1,000=50 | 1,000+50−1,000=**50** ✅ |

---

### E-2 — CheckInForm.jsx L287: Fix strip "Total incl. GST" to use `displayGstBase` (BUG-508)

**Current (L287):**
```jsx
                    <span className="text-[#15803D] text-[13px]">₹{(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs) + displayGstTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
```

**Replace with:**
```jsx
                    <span className="text-[#15803D] text-[13px]">₹{(displayGstBase + displayGstTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{/* BUG-508 */}</span>
```

**Why:** `displayGstBase` is the `computeBase` from the useMemo (1,000 at max, 3,000 at partial). Using `displayGstBase + displayGstTotal` gives:
- ₹6,000 disc: 3,000 + 150 = **3,150** ✅ (unchanged)
- ₹7,950 max: 1,000 + 50 = **1,050** ✅ (was 1,102.50)

---

## 3. Execution Sequence

```
1. E-1 — CheckInForm.jsx L92-103 (combined reorder + useMemo fix + unified displayBalance)
2. E-2 — CheckInForm.jsx L287 (strip Total incl. GST fix)
3. Verify webpack compiled successfully
4. Self-test Verification Matrix
```

Both edits are in the same file. Apply E-1 first — E-2 is independent of E-1's output (L287 is far from L92-103).

---

## 4. Verification Matrix

| # | Edit | Change | How to verify | Auto? |
|---|------|--------|--------------|:---:|
| V1 | E-1 | `displayBalance` defined AFTER useMemo | Grep: `displayBalance = displayGstBase + displayGstTotal` below useMemo | YES |
| V2 | E-1 | `displayGstBase` in useMemo return | Grep: `displayGstBase: computeBase` in useMemo | YES |
| V3 | E-1 | Old conditional removed | Grep: `roomDiscountRs > 0 ? Math.max(gstOnAdvFloor` absent | YES |
| V4 | E-1 | `computeBase` guard present | Grep: `gstBase <= advance + gstOnAdvFloor` | YES |
| V5 | E-2 | Strip uses `displayGstBase` | Grep: `displayGstBase + displayGstTotal` at L287 area | YES |
| V6 | E-2 | Raw `gstBase` expression gone from strip | Grep: `Math.max(0, Number(c.booking_charge \|\| 0) - roomDiscountRs) + displayGstTotal` absent in strip | YES |
| V7 | Logic | Zero discount: balance = 9,620 | Browser: no discount → balance ₹9,620 | NO |
| V8 | Logic | Partial ₹6,000: balance = 2,150 (was 2,000) | Browser: ₹6,000 flat → balance ₹2,150 | NO |
| V9 | Logic | Max ₹7,950: balance = 50 | Browser: ₹7,950 flat → balance ₹50 | NO |
| V10 | Logic | Strip at max: Total incl. GST = 1,050 (was 1,102.50) | Browser: ₹7,950 → strip shows ₹1,050 | NO |
| V11 | Logic | Strip at partial ₹6,000: Total incl. GST = 3,150 | Browser: unchanged ✅ | NO |
| V12 | Reg | collectMax (L90) unchanged | Grep: `bc - roomDiscountRs - advance` at L90 | YES |
| V13 | Compile | webpack 0 new warnings | Log | YES |

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `displayGstBase` undefined (useMemo not returning it) | LOW — spread `...computeRoomGst(...)` fills gstTotal/cgst/sgst; `displayGstBase: computeBase` appended | `computeBase` is always a Number ≥ 0 |
| `computeBase = advance = 0` (no advance) | LOW — if advance = 0 and gstOnAdvFloor = 0 (maxFlat = bc), then guard: gstBase ≤ 0 only when bc−disc ≤ 0, which means maxFlat cap prevents this | Safe |
| `displayGstRate` useMemo showing wrong slab badge | NONE — both 1,000 and 1,050 fall in 5% slab; badge unchanged | Confirmed |
| `collectMax` accidentally changed | NONE — E-1 only touches L92-103, far from L90 | Out of search_replace range |
| Strip at partial suddenly wrong | LOW — at partial (gstBase > 1,050), computeBase = gstBase; displayGstBase = gstBase (same as before) | Trace: 3,000+150=3,150 ✅ |

---

## 6. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-506 → GATE_5A_IMPLEMENTED (REVISED), BUG-508 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx row updated (BUG-506-REV+BUG-508 IMPL date)
- [ ] Code markers: // BUG-506+508 in every modified line
- [ ] webpack: compiled successfully, 0 new warnings
```

---

## 7. After-fix display state

**At ₹6,000 discount (partial):**
```
Balance due: ₹2,150   (was ₹2,000 — now includes 5% GST on ₹3,000)
GST strip:   CGST ₹75 · SGST ₹75 · Total ₹150 · Total incl. GST ₹3,150  ✅ (unchanged)
```

**At ₹7,950 discount (max):**
```
Balance due: ₹50      ✅ (unchanged)
GST strip:   CGST ₹25 · SGST ₹25 · Total ₹50 · Total incl. GST ₹1,050  ✅ (was ₹1,102.50)
```

**At ₹0 discount:**
```
Balance due: ₹9,620   ✅ (unchanged)
GST strip:   hidden (roomDiscountRs = 0)
```
