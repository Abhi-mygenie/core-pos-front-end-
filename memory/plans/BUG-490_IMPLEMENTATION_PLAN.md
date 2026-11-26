# BUG-490 — Implementation Plan (Gate 3)

**ID:** BUG-490
**Title:** Room discount cap missing — can exceed balance due (advance already paid not respected)
**Date:** 2026-10-05
**Role:** PLANNING (Gate 3)
**IA verified:** Gate 2 anchors re-confirmed against live code this session — all match.
**Code Reality:** NONE
**Risk:** MEDIUM

---

## Scope Lock

**Files WILL change (7 edit sites):**
- `src/components/pms/frontdesk/CheckInForm.jsx` — E1 (L57-65 useMemo), E2 (L186 max)
- `src/pages/pms/CheckInPage.jsx` — E3 (new effectiveBalanceDue useMemo before L254), E4 (L254-261 roomDiscountRs useMemo), E5 (L880 max)
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — E6 (L80 max), E7 (L83 onChange)

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx`, `orderTransform.js`, `DashboardPage.jsx` (R5 hotspots)
- `pmsService.js`, `frontDeskService.js`, any other file

---

## Execution Sequence

Recommended order (independent files can be done in parallel, but FolioCheckoutPanel edits should be done in one pass):

```
1. CheckInForm.jsx     — E1, E2   (independent)
2. CheckInPage.jsx     — E3, E4, E5  (E3 must precede E4 since E4 references effectiveBalanceDue)
3. FolioCheckoutPanel.jsx — E6, E7  (in one pass; NOTE: do these ALONGSIDE BUG-491 edits
                                     to this same file to avoid two separate passes)
```

**Cross-item note:** BUG-490 E6-E7 and BUG-491 E3-E6 both touch `FolioCheckoutPanel.jsx`. Implement ALL of them in one combined pass following the BUG-491 implementation plan's ordering (BUG-491 Sub-C useMemo first, then Sub-C badge, Sub-B balance, Sub-D info, then BUG-490 E6, E7).

---

## Edit E1 — `CheckInForm.jsx` — roomDiscountRs useMemo (cap at balance_due)

**Lines:** 57–65 (comment + useMemo block)

**Current:**
```javascript
  // BUG-489: resolve discount to ₹ — OD-489-01: base = c.booking_charge (mirrors form.orderAmount in CheckInPage)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.floor(Number(c.booking_charge || 0) * raw / 100);
    }
    return Math.floor(raw);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge]);
```

**New:**
```javascript
  // BUG-489: resolve discount to ₹ — OD-489-01: base = c.booking_charge (mirrors form.orderAmount in CheckInPage)
  // BUG-490: cap result at c.balance_due (what guest actually owes after advance)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    const cap = Number(c.balance_due || 0); // BUG-490: discount cannot exceed outstanding balance
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(Number(c.booking_charge || 0) * raw / 100), cap);
    }
    return Math.min(Math.floor(raw), cap);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.balance_due]);
```

**Self-test:** Enter Amount=6700 with balance_due=6335 → `roomDiscountRs` should be capped at 6335. Enter 100% → `Math.floor(6700 * 100/100) = 6700` then `Math.min(6700, 6335) = 6335`. ✓

---

## Edit E2 — `CheckInForm.jsx` — Amount input max attribute

**Line:** 186

**Current:**
```jsx
                  max={ciRoomDiscountType === 'Percent' ? 100 : undefined}
```

**New:**
```jsx
                  max={ciRoomDiscountType === 'Percent' ? 100 : Number(c.balance_due || 0) || undefined}
```

**Note:** `Number(c.balance_due || 0) || undefined` → when balance_due is a positive number the HTML5 input is capped; when it is 0/null/undefined fallback to `undefined` (no HTML attr) because the useMemo already returns 0 in that case.

**Self-test:** Switch to Amount mode, type 9999 → browser should prevent entering above balance_due value. ✓

---

## Edit E3 — `CheckInPage.jsx` — INSERT effectiveBalanceDue useMemo (new)

**Insert location:** Immediately **before** the line `// CR-407 Sub-scope A: resolve discount to ₹ before send (OD-407-01)` (currently at L253).

**Insert block:**
```javascript
  // BUG-490: effective balance due = room amount + GST − advance already paid
  const effectiveBalanceDue = useMemo(() => {
    const base    = Number(form?.orderAmount   || 0);
    const advance = Number(form?.advancePayment || 0);
    const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, base, formNights ?? 1, 1);
    return Math.max(0, base + (gstTotal || 0) - advance);
  }, [form?.orderAmount, form?.advancePayment, roomGstApplicable, roomGstSlabs, formNights]);

```

**Note:** `computeRoomGst` already imported (L12). `roomGstApplicable`, `roomGstSlabs` from `restaurant?.checkInFlags` (L68). `formNights` useMemo already exists (L248). All deps available.

**Self-test (data: orderAmount=6700, advance=700, gst≈335, 1 night):** `effectiveBalanceDue = 6700 + 335 - 700 = 6335`. ✓

---

## Edit E4 — `CheckInPage.jsx` — roomDiscountRs useMemo (cap at effectiveBalanceDue)

**Lines:** 253–261 (after E3 insert, this block shifts by ~7 lines; match on content not line number)

**Current:**
```javascript
  // CR-407 Sub-scope A: resolve discount to ₹ before send (OD-407-01)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.floor(Number(form?.orderAmount || 0) * raw / 100);
    }
    return Math.floor(raw);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount]);
```

**New:**
```javascript
  // CR-407 Sub-scope A: resolve discount to ₹ before send (OD-407-01)
  // BUG-490: cap result at effectiveBalanceDue
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(Number(form?.orderAmount || 0) * raw / 100), effectiveBalanceDue);
    }
    return Math.min(Math.floor(raw), effectiveBalanceDue);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount, effectiveBalanceDue]);
```

**Self-test:** orderAmount=6700, advance=700, gst=335, effectiveBalanceDue=6335. Enter Amount=6700 → `Math.min(6700, 6335) = 6335`. Enter 100% → `Math.min(Math.floor(6700*1), 6335) = 6335`. ✓

---

## Edit E5 — `CheckInPage.jsx` — Amount input max attribute

**Line:** 880

**Current:**
```jsx
                            max={ciRoomDiscountType === 'Percent' ? 100 : form?.orderAmount || undefined}
```

**New:**
```jsx
                            max={ciRoomDiscountType === 'Percent' ? 100 : effectiveBalanceDue || undefined}
```

**Self-test:** Amount mode with effectiveBalanceDue=6335 → browser caps input at 6335. ✓

---

## Edit E6 — `FolioCheckoutPanel.jsx` — Amount input max attribute

**Line:** 80 (inside `RoomSection`)

**Current:**
```jsx
                  type="number" min="0" max={roomDiscountType === 'Percent' ? 100 : undefined}
```

**New:**
```jsx
                  type="number" min="0" max={roomDiscountType === 'Percent' ? 100 : Number(c.balance_due || 0) || undefined}
```

**Self-test:** Amount mode with balance_due=5680 → browser caps at 5680. ✓

---

## Edit E7 — `FolioCheckoutPanel.jsx` — onChange clamp

**Line:** 83 (inside `RoomSection`)

**Current:**
```javascript
                  onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
```

**New:**
```javascript
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), c.balance_due != null ? Number(c.balance_due) : Infinity))}
```

**Note:** `c.balance_due != null ? Number(c.balance_due) : Infinity` — if balance_due is not yet loaded, no cap (safe fallback). The useMemo in BUG-491 Sub-C will still enforce the cap when `roomDiscountRs` is computed.

**Self-test:** Paste 9999 with balance_due=5680 → state should be clamped to 5680. ✓

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| E1 | CheckInForm.jsx L57-65 | useMemo caps at `c.balance_due` | FD v2 → open Bill for checked-in guest with advance → enter Amount > balance_due → badge shows capped value | NO |
| E2 | CheckInForm.jsx L186 | `max` = balance_due for Amount mode | Same flow → try typing above balance_due → input blocked | NO |
| E3 | CheckInPage.jsx (new) | `effectiveBalanceDue` useMemo | `/pms/check-in` → select arrival with advance → verify effectiveBalanceDue = orderAmount + gstTotal - advance | NO |
| E4 | CheckInPage.jsx L253-261 | useMemo caps at `effectiveBalanceDue` | Enter Amount above effectiveBalanceDue → badge shows effectiveBalanceDue value | NO |
| E5 | CheckInPage.jsx L880 | `max` = effectiveBalanceDue | Amount mode → input HTML max attr = effectiveBalanceDue | NO |
| E6 | FolioCheckoutPanel.jsx L80 | `max` = balance_due for Amount mode | FD v2 Bill panel → Amount input cannot exceed balance_due | NO |
| E7 | FolioCheckoutPanel.jsx L83 | onChange clamps at balance_due | Paste oversized value → state clamped | NO |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `c.balance_due` is 0 for no-advance stays | POSSIBLE | `|| undefined` fallback on max (E2, E6) and `Infinity` fallback on onChange (E7) ensures no regression |
| `effectiveBalanceDue` calls `computeRoomGst` on every keystroke in advance field | LOW IMPACT | useMemo cached; `computeRoomGst` is pure math, no API call |
| BUG-490 E1 modifies same useMemo as BUG-489 | MANAGED | BUG-489 is implemented + QA pending; verify L57 content before coding |
| FolioCheckoutPanel combined pass with BUG-491 | MANAGED | Follow BUG-491 plan sequence (Sub-C first, then these edits) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-490 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-490 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx + FolioCheckoutPanel.jsx with BUG-490 + date
- [ ] Code markers: // BUG-490 comment at E1, E2, E3, E4, E5, E6, E7 (7 sites total)
```
