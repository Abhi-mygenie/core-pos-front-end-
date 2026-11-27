# BUG-506 + BUG-507 — Implementation Plan (Gate 3)

**IDs:** BUG-506 (balance display), BUG-507 (flat discount alert)
**Date:** 2026-10-07
**Stage:** GATE_3_IMPLEMENTATION_PLAN
**Author:** PLANNING agent
**Risk:** HIGH (BUG-506 — financial display) / LOW (BUG-507 — alert only)
**Sprint:** oct_bug_batch
**Phase:** PMS → New Booking + Check-In
**Investigation:** `investigations/INV-CHECKINFORM-FORMULA-2026_10_07.md`

---

## 0. Entry Verification (re-verified at HEAD)

| Edit | File | Line | Plan expects | HEAD actual | Match? |
|------|------|------|-------------|------------|--------|
| E-A1 | CheckInForm.jsx | L86 | `ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct` | ✅ exact | ✅ |
| E-A2 | CheckInForm.jsx | L89–L90 | `collectOverMax` line then `// BUG-503:` comment | ✅ exact | ✅ |
| E-A3 | CheckInForm.jsx | L200–201 | `BUG-505` comment + `fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - ...` | ✅ exact | ✅ |
| E-B1 | CheckInPage.jsx | L287 | `ciRoomDiscountType === 'Percent' && Number(ciRoomDiscountAmt) > maxPct` | ✅ exact | ✅ |

---

## 1. Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx` — E-A1, E-A2, E-A3 (3 edits)
- `src/pages/pms/CheckInPage.jsx` — E-B1 (1 edit)

**Files will NOT touch:**
- `CheckInForm.jsx` L88 `collectMax` — **MUST NOT change** (backend-compatible, BUG-500/OD-500-04)
- `CheckInPage.jsx` L256–263 `effectiveBalanceDue` — **MUST NOT change** (same backend constraint)
- `CheckInForm.jsx` L91–102 `displayGst*` useMemos — not in scope
- `CheckInForm.jsx` L247–285 Part B GST strip — not in scope
- Any other file

---

## 2. Edits

### E-A1 — CheckInForm.jsx L86: Extend `discountOverMax` to cover Amount mode (BUG-507)

**Current (L86):**
```javascript
  const discountOverMax = ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct;
```

**Replace with:**
```javascript
  const discountOverMax = // BUG-507: extend to Amount mode — flat input > maxFlat also triggers alert
    (ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct) ||
    (ciRoomDiscountType === 'Amount'  && parseFloat(ciRoomDiscountAmt) > maxFlat);
```

**Why:** `discountOverMax` drives the alert at L241-245 and disables the Confirm button at L304. Amount mode currently bypasses both even when flat input (e.g. ₹8,000) exceeds `maxFlat` (₹7,950). The alert div already exists — only the condition needs extending. No JSX change.

---

### E-A2 — CheckInForm.jsx: INSERT after L89 — add `gstOnAdvFloor` + `displayBalance` consts (BUG-506)

**Insert point:** immediately after `const collectOverMax = ...` (L89), before `// BUG-503:` comment (L90).

**Insert:**
```javascript
  // BUG-506: display balance — GST-inclusive at zero discount; gstOnAdv floor secured with discount
  // gstOnAdvFloor = bc − advance − maxFlat (equals gstOnAdv computed in maxFlat useMemo, no new dep)
  // collectMax (L88) deliberately unchanged — backend-compatible (BUG-500/OD-500-04: bp = room−disc−adv)
  const gstOnAdvFloor  = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
  const displayBalance = roomDiscountRs > 0
    ? Math.max(gstOnAdvFloor, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))
    : Number(c.total_with_gst || 0) - Number(c.advance_payment || 0);
```

**Why:** `gstOnAdvFloor` (= ₹50) is the GST-on-advance amount secured by the discount cap — derived from `maxFlat` which is already in scope. `displayBalance` switches bases:
- **No discount** → `total_with_gst − advance = 9,620` (full GST-inclusive invoice amount) ✅
- **With discount** → `max(gstOnAdvFloor, bc − disc − advance)` (room balance; floor = secured GST) ✅
- **Max discount** → `max(50, 50) = 50` (gstOnAdv secured) ✅
- **₹102.50 never appears** — compound-GST formula no longer used ✅

`collectMax` (L88) is NOT changed — it remains `bc − roomDiscountRs − advance` for backend compatibility.

---

### E-A3 — CheckInForm.jsx L200–201: Replace inline balance formula with `displayBalance` (BUG-506)

**Current (L200–201):**
```jsx
            {/* BUG-505: balance due = bc − discount − advance (backend formula, no GST added) */}
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0)))}{/* BUG-505 */}</span>
```

**Replace with:**
```jsx
            {/* BUG-506: displayBalance — total_with_gst−adv (no disc) | max(gstOnAdvFloor, bc−disc−adv) (disc) */}
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(displayBalance)}{/* BUG-506 */}</span>
```

**Why:** `displayBalance` (defined in E-A2) replaces the hardcoded inline formula. The JSX line shrinks — `fmtINR(displayBalance)` is clean and the logic is in the const above.

---

### E-B1 — CheckInPage.jsx L287: Extend `discountOverMax` to cover Amount mode (BUG-507)

**Current (L287):**
```javascript
  const discountOverMax = ciRoomDiscountType === 'Percent' && Number(ciRoomDiscountAmt) > maxPct;
```

**Replace with:**
```javascript
  const discountOverMax = // BUG-507: extend to Amount mode — flat input > maxFlat also triggers alert
    (ciRoomDiscountType === 'Percent' && Number(ciRoomDiscountAmt) > maxPct) ||
    (ciRoomDiscountType === 'Amount'  && Number(ciRoomDiscountAmt) > maxFlat);
```

**Why:** Mirrors E-A1. CheckInPage uses `Number()` (not `parseFloat()`) for consistency with the existing code style on L287. The alert at L923–925 and `formValid` at L289 both reference `discountOverMax` — both benefit automatically.

---

## 3. Execution Sequence

```
1. E-A1 — CheckInForm.jsx L86 (discountOverMax extend)
2. E-A2 — CheckInForm.jsx after L89 (insert displayBalance consts)
3. E-A3 — CheckInForm.jsx L200-201 (use displayBalance in JSX)
4. E-B1 — CheckInPage.jsx L287 (discountOverMax extend)
5. Verify webpack compiled successfully
6. Self-test against Verification Matrix
```

---

## 4. Verification Matrix

| # | Edit | File | How to verify | Automated? |
|---|------|------|--------------|:---:|
| V1 | E-A1 | CheckInForm.jsx:86 | Grep: `Amount.*maxFlat` present on L86 | YES |
| V2 | E-A2 | CheckInForm.jsx:~90 | Grep: `displayBalance` + `gstOnAdvFloor` present | YES |
| V3 | E-A3 | CheckInForm.jsx:201 | Grep: `fmtINR(displayBalance)` on balance line | YES |
| V4 | E-B1 | CheckInPage.jsx:287 | Grep: `Amount.*maxFlat` present on L287 | YES |
| V5 | E-A2 | Logic | Zero discount: `displayBalance = total_with_gst − advance = 9,620` | Browser |
| V6 | E-A2 | Logic | Max discount ₹7,950: `displayBalance = max(50, 50) = 50` | Browser |
| V7 | E-A1 | Logic | Flat ₹8,000 > maxFlat(₹7,950): alert fires | Browser |
| V8 | E-A1 | Logic | Flat ₹7,950 = maxFlat: no alert | Browser |
| V9 | — | NO-TOUCH | collectMax (L88) unchanged: `bc − roomDiscountRs − advance` | Grep |
| V10 | — | NO-TOUCH | effectiveBalanceDue (CheckInPage L262) unchanged | Grep |
| V11 | — | Compile | webpack `compiled successfully`, 0 new warnings | Log |

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `c.total_with_gst` null/undefined at zero discount | LOW — confirmed present in all check-in row data (used at L198 already) | `Number(c.total_with_gst || 0)` handles gracefully |
| `maxFlat` is 0 (no booking charge) | LOW — already guarded in maxFlat useMemo: `if (!bc) return {maxPct:100, maxFlat:bc}` | `gstOnAdvFloor = 0 − 0 − 0 = 0`; `max(0, 0−0−0) = 0`; safe |
| collectMax/effectiveBalanceDue accidentally touched | NONE — explicitly excluded from scope lock | Guard: grep after implementation |
| CheckInPage alert text mentions % when Amount mode fires | ACCEPTED — existing text already shows `₹{maxFlat}` so still informative; deferred improvement |

---

## 6. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-506 + BUG-507 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: rows for BUG-506 + BUG-507 added/updated (GATE_5A_IMPLEMENTED)
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx rows updated (BUG-506+507 IMPL date)
- [ ] Code markers: // BUG-506 and // BUG-507 in every modified line
- [ ] webpack: compiled successfully, 0 new warnings
```

---

## 7. Expected Display State After Fix

**Zero discount (bc=₹9,000, advance=₹1,000, 18% GST):**
```
Balance due:   ₹9,620   ← total_with_gst(10,620) − advance(1,000) ✅ (was ₹8,000)
Collect Now max: ₹8,000  ← bc − advance (backend-compatible, unchanged)
Flat alert:    fires when flat input > ₹7,950 ✅ (was silent)
```

**Max discount ₹7,950:**
```
Balance due:   ₹50      ← max(gstOnAdvFloor=50, 9000−7950−1000=50) ✅
Flat alert:    ₹7,951+ triggers alert ✅ ; ₹7,950 = no alert ✅
102.50:        never appears ✅
```
