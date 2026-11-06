# BUG-504 — Implementation Plan (Gate 3)

**Date:** 2026-10-07
**Author:** PLANNING agent
**Risk:** CRITICAL
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx` · `src/pages/pms/CheckInPage.jsx`
**Files WILL NOT touch:** FolioCheckoutPanel.jsx · pmsService.js · frontDeskService.js

**OD-504-01 → LOCKED** (computeRoomGst on advance amount / nights)
**OD-504-02 → Agent-selected Option A** (toFixed(2) decimal precision — owner confirm at Gate 4 GO)
**OD-504-03 → Agent-selected Option A** (Percent-mode trigger only — no code change, already Percent-only)

**CheckInForm.jsx edits DEPEND ON BUG-503** (needs computeRoomGst import + roomGstSlabs + formNights)
**CheckInPage.jsx edits are INDEPENDENT** (all infrastructure already present from BUG-386)

---

## Formula Reference

```
gst_on_advance = computeRoomGst(roomGstApplicable, roomGstSlabs, advance, nights, 1).gstTotal
max_flat       = Math.max(0, bc - advance - gst_on_advance)
max_pct        = Number((max_flat / bc * 100).toFixed(2))   // OD-504-02 Option A: decimal

Scenario proof (bc=9000, adv=1000, nights=1, 5% slab on 1000/night):
  gst_on_advance = 50.00
  max_flat       = 9000 − 1000 − 50 = 7,950
  max_pct        = (7950/9000×100).toFixed(2) = "88.33" → Number("88.33") = 88.33

Walk-in (advance=0):
  gst_on_advance = 0  (computeRoomGst with amount=0 → returns {gstTotal:0})
  max_flat       = bc − 0 − 0 = bc  (no restriction)
  max_pct        = 100.00
```

---

## CRITICAL: useMemo reordering required (both files)

**Current order in both files:**
```
roomDiscountRs useMemo  (uses bc − advance as cap)
maxPct useMemo          (returns integer)
```

**Required order after BUG-504:**
```
maxPct+maxFlat useMemo  (returns { maxPct: decimal, maxFlat }) ← MUST BE FIRST
roomDiscountRs useMemo  (uses maxFlat from above)
```

`maxFlat` must be declared before `roomDiscountRs` can reference it. The plan moves/replaces the `maxPct` useMemo to precede `roomDiscountRs` in both files.

---

## CheckInPage.jsx Edits (INDEPENDENT — run first or in parallel with BUG-503)

### Entry Verification
| Edit | File | Plan says | Check |
|------|------|-----------|-------|
| F1 | CheckInPage.jsx L277-282 | `const maxPct = useMemo(() => { ... return Math.floor(...); }, [...])` | view |
| F2 | CheckInPage.jsx L267-274 | `const roomDiscountRs = useMemo(() => { ... return Math.min(..., effectiveBalanceDue); }, [...])` | view |
| F3 | CheckInPage.jsx L903 | `max={ciRoomDiscountType === 'Percent' ? maxPct : effectiveBalanceDue || undefined}` | view |
| F4 | CheckInPage.jsx L920 | alert text with `Math.floor(Number(form?.orderAmount||0)*maxPct/100)` | view |

---

### F1 — CheckInPage.jsx · Replace maxPct useMemo + move BEFORE roomDiscountRs (L275-282 → new position at L265)

The implementation agent must:
1. DELETE the existing `maxPct` useMemo (L275-282 comment + L277-282 code)
2. INSERT the new `{ maxPct, maxFlat }` useMemo BEFORE the `roomDiscountRs` useMemo (i.e., before L265 `// CR-407...` comment)

**New useMemo to insert before `roomDiscountRs`:**
```javascript
  // BUG-496+504: maxPct/maxFlat — GST-on-advance preservation rule (OD-496-01 + OD-504-01)
  // MUST precede roomDiscountRs (roomDiscountRs uses maxFlat as its cap)
  // IMPORTANT: form.advancePayment = collect-now. Booking advance = selected?.charge?.advance_payment
  const { maxPct, maxFlat } = useMemo(() => {
    const bc         = Number(form?.orderAmount || 0);
    const bookingAdv = Number(selected?.charge?.advance_payment || 0);
    if (!bc) return { maxPct: 100, maxFlat: bc };
    const gstOnAdv   = computeRoomGst(roomGstApplicable, roomGstSlabs, bookingAdv, formNights ?? 1, 1).gstTotal; // BUG-504
    const flat       = Math.max(0, bc - bookingAdv - gstOnAdv); // BUG-504
    const pct        = Number((flat / bc * 100).toFixed(2));     // BUG-504: OD-504-02 Option A
    return { maxPct: pct, maxFlat: flat };
  }, [form?.orderAmount, selected?.charge?.advance_payment, roomGstApplicable, roomGstSlabs, formNights]);
```

**Delete the old useMemo (currently at L275-282):**
```javascript
  // BUG-496: maxPct = floor((bc − bookingAdv) / bc × 100) — uses LR booking advance (OD-496-01)
  // IMPORTANT: form.advancePayment = collect-now (starts empty). Booking advance = selected?.charge?.advance_payment
  const maxPct = useMemo(() => {
    const bc         = Number(form?.orderAmount || 0);
    const bookingAdv = Number(selected?.charge?.advance_payment || 0); // BUG-496: booking advance from LR
    if (!bc) return 100;
    return Math.floor(Math.max(0, bc - bookingAdv) / bc * 100);
  }, [form?.orderAmount, selected?.charge?.advance_payment]);
```
→ **DELETE entirely.**

---

### F2 — CheckInPage.jsx · Update roomDiscountRs cap (L267-274)

**Current:**
```javascript
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(Number(form?.orderAmount || 0) * raw / 100), effectiveBalanceDue);
    }
    return Math.min(Math.floor(raw), effectiveBalanceDue);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount, effectiveBalanceDue]);
```

**After:**
```javascript
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(Number(form?.orderAmount || 0) * raw / 100), maxFlat); // BUG-504
    }
    return Math.min(Math.floor(raw), maxFlat); // BUG-504
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount, maxFlat]); // BUG-504
```

**What changes:** Cap from `effectiveBalanceDue` (circular, changes as user types) → `maxFlat` (static business cap = 7,950). `effectiveBalanceDue` stays as the Collect Now cap at L850 — unchanged.

---

### F3 — CheckInPage.jsx · Update discount Amount input max attr (L903)

**Current:**
```jsx
                            max={ciRoomDiscountType === 'Percent' ? maxPct : effectiveBalanceDue || undefined}
```

**After:**
```jsx
                            max={ciRoomDiscountType === 'Percent' ? maxPct : maxFlat || undefined} {/* BUG-504 */}
```

---

### F4 — CheckInPage.jsx · Update alert text (L920)

**Current:**
```jsx
                            Maximum discount: {maxPct}% (₹{Math.floor(Number(form?.orderAmount||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
```

**After:**
```jsx
                            Maximum discount: {maxPct}% (₹{maxFlat.toLocaleString('en-IN')}). Entering above {maxPct}% has no additional effect.{/* BUG-504 */}
```

**What changes:** `Math.floor(orderAmount * maxPct / 100)` = ₹7,920 (wrong) → `maxFlat.toLocaleString()` = ₹7,950 (correct).

---

## CheckInForm.jsx Edits (DEPENDS ON BUG-503 — implement AFTER BUG-503 is done)

### Entry Verification (after BUG-503 is applied)
| Edit | File | Plan says | Check |
|------|------|-----------|-------|
| G1 | CheckInForm.jsx | `computeRoomGst` imported | grep import |
| G2 | CheckInForm.jsx | `roomGstApplicable`, `roomGstSlabs` in scope | grep in component body |
| G3 | CheckInForm.jsx | `formNights` in scope (= `row?.nights ?? 1`) | grep |
| G4 | CheckInForm.jsx L59-68 | `roomDiscountRs` useMemo with `cap = Math.max(0, bc - ...)` | view |
| G5 | CheckInForm.jsx L70-75 | `maxPct` useMemo (returns integer) | view |
| G6 | CheckInForm.jsx L201 | `max={... Math.max(0, Number(c.booking_charge || 0) - Number(c.advance_payment || 0)) || undefined}` | view |
| G7 | CheckInForm.jsx L219 | alert text with `Math.floor(Number(c.booking_charge||0)*maxPct/100)` | view |

---

### G1 — CheckInForm.jsx · Replace maxPct useMemo + move BEFORE roomDiscountRs (L70-75 → before L57)

The implementation agent must:
1. DELETE the existing `maxPct` useMemo (L69-75 comment + L70-75 code)
2. INSERT the new `{ maxPct, maxFlat }` useMemo BEFORE the `roomDiscountRs` useMemo (before L57 `// BUG-489...` comment)

**New useMemo to insert BEFORE roomDiscountRs:**
```javascript
  // BUG-496+504: maxPct/maxFlat — GST-on-advance preservation rule (OD-496-01 + OD-504-01)
  // MUST precede roomDiscountRs (roomDiscountRs uses maxFlat as its cap)
  const { maxPct, maxFlat } = useMemo(() => {
    const bc       = Number(c.booking_charge  || 0);
    const advance  = Number(c.advance_payment || 0);
    if (!bc) return { maxPct: 100, maxFlat: bc };
    const gstOnAdv = computeRoomGst(roomGstApplicable, roomGstSlabs, advance, formNights, 1).gstTotal; // BUG-504
    const flat     = Math.max(0, bc - advance - gstOnAdv); // BUG-504
    const pct      = Number((flat / bc * 100).toFixed(2)); // BUG-504: OD-504-02 Option A
    return { maxPct: pct, maxFlat: flat };
  }, [c.booking_charge, c.advance_payment, roomGstApplicable, roomGstSlabs, formNights]);
```

**Delete the old useMemo (currently L69-75):**
```javascript
  // BUG-496: maxPct = floor((bc − advance) / bc × 100) — max disc preserves GST on advance (OD-496-01)
  const maxPct = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    if (!bc) return 100;
    return Math.floor(Math.max(0, bc - advance) / bc * 100);
  }, [c.booking_charge, c.advance_payment]);
```
→ **DELETE entirely.**

---

### G2 — CheckInForm.jsx · Update roomDiscountRs cap (L59-68)

**Current:**
```javascript
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    const bc  = Number(c.booking_charge  || 0);
    const cap = Math.max(0, bc - Number(c.advance_payment || 0)); // BUG-496: max = bc − advance
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(bc * raw / 100), cap);
    }
    return Math.min(Math.floor(raw), cap);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.advance_payment]);
```

**After:**
```javascript
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    const bc  = Number(c.booking_charge  || 0);
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(bc * raw / 100), maxFlat); // BUG-504
    }
    return Math.min(Math.floor(raw), maxFlat); // BUG-504
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, maxFlat]); // BUG-504
```

**What changes:** `cap = bc − advance` (8,000) → `maxFlat` (7,950). `bc` local var kept for Percent mode computation.

---

### G3 — CheckInForm.jsx · Update discount Amount input max attr (L201)

**Current:**
```jsx
                  max={ciRoomDiscountType === 'Percent' ? maxPct : Math.max(0, Number(c.booking_charge || 0) - Number(c.advance_payment || 0)) || undefined} // BUG-496
```

**After:**
```jsx
                  max={ciRoomDiscountType === 'Percent' ? maxPct : maxFlat || undefined} {/* BUG-504 */}
```

---

### G4 — CheckInForm.jsx · Update alert text (L219)

**Current:**
```jsx
                  Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
```

**After:**
```jsx
                  Maximum discount: {maxPct}% (₹{maxFlat.toLocaleString('en-IN')}). Entering above {maxPct}% has no additional effect.{/* BUG-504 */}
```

---

## discountOverMax — NO CHANGE NEEDED (both files)

Current condition: `ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct`

With OD-504-02 Option A, `maxPct` is now `88.33` (number, not integer 88). The comparison `parseFloat(ciRoomDiscountAmt) > 88.33` is correct:
- User types "88.33" → 88.33 > 88.33 = false → no alert ✓
- User types "88.34" → 88.34 > 88.33 = true → alert fires ✓ (roomDiscountRs capped at 7950 anyway)

The condition is already Percent-only — OD-504-03 Option A requires no change.

---

## collectMax in CheckInForm.jsx — NO CHANGE NEEDED

```javascript
const collectMax = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0));
```

At max discount (roomDiscountRs = 7950): `collectMax = 9000 − 7950 − 1000 = 50`. This is exactly `gst_on_advance` — staff can still collect the GST. ✓ Formula naturally correct after BUG-504 changes roomDiscountRs cap.

---

## Verification Matrix

| # | Edit | Check | Expected | How |
|---|------|-------|----------|-----|
| V1 | F1 | maxPct useMemo is destructured `{ maxPct, maxFlat }` | Code inspection | view |
| V2 | F1 | gst_on_advance uses computeRoomGst on advance amount | Code inspection | view |
| V3 | F1/G1 | bc=9000, adv=1000, nights=1 → maxFlat=7950, maxPct=88.33 | Compute: floor(gstOnAdv=50) → max(0,8000-50)=7950; 7950/9000*100=88.33 | code review |
| V4 | F2/G2 | roomDiscountRs capped at 7950 (not 8000) | Enter 8000 flat → shown as 7950 | Browser |
| V5 | F3/G3 | Amount input max attr = 7950 | DevTools: inspect max attr | Browser |
| V6 | F4/G4 | Alert text: "Maximum discount: 88.33% (₹7,950)" | Enter 89% → alert fires with correct text | Browser |
| V7 | Both | Enter exactly 88.33% → NO alert (88.33 > 88.33 = false) | No red alert | Browser |
| V8 | Both | Enter 88.34% → alert fires, roomDiscountRs still capped at 7950 | Alert visible, -₹7950 shown | Browser |
| V9 | F1 | Walk-in (advance=0): maxFlat=bc, maxPct=100 | No false cap on walk-in | Browser: walk-in flow |
| V10 | F2 | effectiveBalanceDue (Collect Now cap at L850) UNCHANGED | Collect Now still works correctly | Browser: try over-collect |
| V11 | G1/G2 | After BUG-503 + BUG-504: CheckInForm behavior matches CheckInPage | Parallel test on both pages | Browser |
| V12 | Both | webpack 0 new warnings | — | tail frontend.out.log |

---

## Execution Sequence

```
Step 1: BUG-503 on CheckInForm.jsx (adds computeRoomGst + slab config)
Step 2: BUG-504 on CheckInPage.jsx (independent — can run in parallel with Step 1)
Step 3: BUG-504 on CheckInForm.jsx (uses BUG-503 infrastructure)
Step 4: webpack compile check
```

Can all be done in one implementation session; Steps 1+2 are parallel; Step 3 after Step 1 verified.

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-504 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-504 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-504 2026-10-07
- [ ] Code markers: // BUG-504 on every changed block (F1-F4, G1-G4)
- [ ] Compile: 0 new warnings
```
