# BUG-514 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-514
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Based on:** `impact/BUG-514_IMPACT_ANALYSIS.md`
**Risk:** CRITICAL (R6 financial)
**ODs locked:** OD-514-01=a · OD-514-02=a · OD-514-03=a
**Awaiting:** Owner **Gate 4 GO** before any code change

---

## Scope Lock

**Files WILL change:**
- `src/api/services/frontDeskService.js` — E-1 (1 line, L104)
- `src/components/pms/frontdesk/CheckInForm.jsx` — E-2a + E-2b (~5 lines in confirm())
- `src/pages/pms/CheckInPage.jsx` — E-3 (~5 lines in handleConfirm()) + E-4 (~5 lines in handleConfirm())

**Files will NOT touch:**
- `src/api/services/pmsService.js` — E-4 fixes the value in the caller; pmsService uses `p.roomDiscount` verbatim, correct value flows through
- `GuestTable.jsx`, `ArrivalsPanel.jsx`, any other file

**Total: 4 edits, 3 files, ~16 changed lines**

---

## Entry Verification (Implementation agent MUST run before writing any code)

```bash
# E-1 anchor
grep -n "gst_tax.*'0'" /app/frontend/src/api/services/frontDeskService.js
# Must return: L104:  fd.append('gst_tax', '0');

# E-2 anchor
grep -n "roomDiscountRs\|roomDiscountValue.*parseFloat" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx | grep -A1 "roomDiscount:"
# Must show roomDiscount: roomDiscountRs and roomDiscountValue: parseFloat(ciRoomDiscountAmt) in confirm()

# E-3 anchor
grep -n "gstBase = Math.max" /app/frontend/src/pages/pms/CheckInPage.jsx
# Must return line ~314: const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs);

# E-4 anchor
grep -n "roomDiscount:.*roomDiscountRs" /app/frontend/src/pages/pms/CheckInPage.jsx
# Must return line ~381: roomDiscount:      roomDiscountRs,
```

If any anchor returns a different line number or content → **STOP. Return to Planning.**

---

## Edit E-1 — `frontDeskService.js` L104: wire `gst_tax` field

**File:** `src/api/services/frontDeskService.js`
**Line:** 104

**Current:**
```js
  fd.append('gst_tax', '0');
```

**New:**
```js
  fd.append('gst_tax',         String(to2(p.gstTax ?? 0)));              // BUG-514: post-discount GST (was hardcoded '0')
```

**Why safe:** `to2` helper already defined in this file (L72: `const to2 = (n) => ...`). When `p.gstTax` is undefined (no discount), `to2(0) = 0` — identical to current. When `p.gstTax = 35` (with discount), sends `35`. Pattern matches `pmsService.js L285`.

---

## Edit E-2a — `CheckInForm.jsx`: compute `roomDiscountToApi` before the `checkIn()` call

**File:** `src/components/pms/frontdesk/CheckInForm.jsx`
**Location:** Inside `confirm()`, between the `upgradeReason` line and the `// BUG-489` comment

**Current (the comment line L135-136 area):**
```js
        upgradeType: isUpgrade ? upgrade.type : 'none', upgradeAmount: upgrade.amount, upgradeReason: upgrade.reason,
        // BUG-489: pass room discount to backend (mirrors CR-407 A-E3)
        ...(roomDiscountRs > 0 ? {
          roomDiscount:       roomDiscountRs,
          roomDiscountType:   ciRoomDiscountType,
          roomDiscountValue:  parseFloat(ciRoomDiscountAmt) || 0,
          roomDiscountReason: '',
        } : {}),
```

**New:**
```js
        upgradeType: isUpgrade ? upgrade.type : 'none', upgradeAmount: upgrade.amount, upgradeReason: upgrade.reason,
        gstTax: displayGstTotal,  // BUG-514: post-discount GST (was missing — frontDeskService hardcoded '0')
        // BUG-489: pass room discount to backend (mirrors CR-407 A-E3)
        ...(roomDiscountRs > 0 ? {
          roomDiscount:       roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor : roomDiscountRs,  // BUG-514: bc−adv at max
          roomDiscountType:   ciRoomDiscountType,
          roomDiscountValue:  roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor : roomDiscountRs,  // BUG-514
          roomDiscountReason: '',
        } : {}),
```

**Why this approach (inline expression vs separate variable):**
- The expression `roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor : roomDiscountRs` is compact and avoids a separate variable declaration inside an async function
- `roomDiscountRs`, `maxFlat`, `gstOnAdvFloor` are all in scope as useMemo-derived constants
- At partial discount: `roomDiscountRs < maxFlat` → expression returns `roomDiscountRs` (unchanged, current behaviour)
- At max discount: `roomDiscountRs === maxFlat` → expression returns `maxFlat + gstOnAdvFloor = bc − advance`

**Note on `displayGstTotal`:** Already computed at L103-112 via useMemo. Fully in scope inside `confirm()`.

---

## Edit E-3 — `CheckInPage.jsx` L312-322: apply BUG-511 near-max correction to submit `gstBase`

**File:** `src/pages/pms/CheckInPage.jsx`
**Lines:** ~312-322 (handleConfirm, gstBase block)

**Current:**
```js
      // BUG-386: compute GST before submit — BUG-496: gstBase = discounted price (OD-496-02)
      // Note: backend ignores sent gst_tax (probe 2026-10-06) but we send the correct display value
      const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs); // BUG-496
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase, // BUG-496: discounted room amount
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

**New:**
```js
      // BUG-386: compute GST before submit — BUG-496: gstBase = discounted price (OD-496-02)
      // BUG-514: apply BUG-511 near-max correction to submit path (mirrors display path L956-960)
      const gstBase_514        = Math.max(0, Number(form.orderAmount) - roomDiscountRs); // BUG-496+514
      const extraRoom_514      = maxFlat - roomDiscountRs;                               // BUG-514
      const computeBase_514    = extraRoom_514 < gstOnAdvFloor_ci                        // BUG-514
          ? gstBase_514 - gstOnAdvFloor_ci
          : gstBase_514;
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        computeBase_514,  // BUG-514: corrected base (was gstBase, missed near-max zone)
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

**Why `_514` suffix on variable names:** Avoids any name clash with the display path variables (`gstBase`, `extraRoom509`, `computeBase509`). Clearly scoped to this bug fix.

**`gstOnAdvFloor_ci`** is already computed at L291 — in scope of handleConfirm. `maxFlat` is in scope from L268 useMemo. Both are const, no mutation risk.

**Stale comment removed:** The comment "Note: backend ignores sent gst_tax (probe 2026-10-06)" is no longer accurate after BE additive deploy. Replaced with BUG-514 note.

---

## Edit E-4 — `CheckInPage.jsx` L380-385: use `roomDiscountToApi_ci` in pmsCheckIn spread

**File:** `src/pages/pms/CheckInPage.jsx`
**Lines:** ~379-385 (handleConfirm, pmsCheckIn roomDiscount spread)

**Current:**
```js
        // CR-407 Sub-scope A: check-in room discount (OD-407-01: FE computes ₹)
        ...(roomDiscountRs > 0 ? {
          roomDiscount:      roomDiscountRs,
          roomDiscountType:  ciRoomDiscountType,
          roomDiscountValue: parseFloat(ciRoomDiscountAmt) || 0,
          roomDiscountReason: '',
        } : {}),
```

**New:**
```js
        // CR-407 Sub-scope A: check-in room discount (OD-407-01: FE computes ₹)
        // BUG-514: at max discount, send bc−advance (maxFlat+gstOnAdvFloor_ci) not capped maxFlat
        ...(roomDiscountRs > 0 ? {
          roomDiscount:      roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor_ci : roomDiscountRs,  // BUG-514
          roomDiscountType:  ciRoomDiscountType,
          roomDiscountValue: roomDiscountRs >= maxFlat ? roomDiscountRs + gstOnAdvFloor_ci : roomDiscountRs,  // BUG-514
          roomDiscountReason: '',
        } : {}),
```

**`gstOnAdvFloor_ci`** = `Math.max(0, orderAmount - bookingAdv - maxFlat)` at L291 — in scope.

---

## Execution Sequence

```
1. Entry verification — run all 4 grep checks (see above)
2. Apply E-1 (frontDeskService.js L104) — 1 line
3. Compile check after E-1
4. Apply E-2a+E-2b (CheckInForm.jsx confirm()) — gstTax + roomDiscountToApi inline
5. Compile check after E-2
6. Apply E-3 (CheckInPage.jsx L312-322) — gstBase correction
7. Apply E-4 (CheckInPage.jsx L379-385) — roomDiscountToApi_ci
8. Final compile check — must be 0 new warnings
9. EXIT GATE 5-checkbox pass
10. Write QA handover
```

---

## Verification Matrix

| # | Edit | File | Verification | Steps | Auto? |
|---|---|---|---|---|---|
| V-1 | E-1 | frontDeskService.js | `gst_tax` wired to `p.gstTax` | `grep -n "gst_tax.*to2" frontDeskService.js` → hits L104 | YES |
| V-2 | E-2 gstTax | CheckInForm.jsx | `gstTax: displayGstTotal` present in confirm() | `grep -n "gstTax.*displayGstTotal" CheckInForm.jsx` | YES |
| V-3 | E-2 roomDiscount | CheckInForm.jsx | inline expression present | `grep -n "roomDiscountRs >= maxFlat" CheckInForm.jsx` | YES |
| V-4 | E-3 | CheckInPage.jsx | `computeBase_514` in handleConfirm | `grep -n "computeBase_514" CheckInPage.jsx` | YES |
| V-5 | E-4 | CheckInPage.jsx | `gstOnAdvFloor_ci` in roomDiscount spread | `grep -n "gstOnAdvFloor_ci.*roomDiscount" CheckInPage.jsx` | YES |
| V-6 | compile | all | webpack 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "compiled" | YES |
| V-7 | API gst_tax (A) | frontDeskService path | Network tab → multipart `gst_tax=35` at max discount + collect=0 | Browser + Network tab | NO |
| V-8 | API room_discount (B) | frontDeskService path | Network tab → multipart `room_discount=6000` at max discount | Browser + Network tab | NO |
| V-9 | API gst_tax (CheckInPage) | pmsService path | Network tab → gst_tax=35 from CheckInPage at max discount | Browser + Network tab | NO |
| V-10 | API room_discount (CheckInPage) | pmsService path | Network tab → room_discount=6000 from CheckInPage at max discount | Browser + Network tab | NO |
| V-11 | partial regression | both flows | 60% discount: room_discount = roomDiscountRs (unchanged, not 6000) | Browser + Network tab | NO |
| V-12 | no discount regression | both flows | No discount: gst_tax=0, no room_discount field sent | Browser + Network tab | NO |
| V-13 | gstTax match | CheckInPage | At max discount: submit gstTax = display gstTotal = 35 (not 36.75) | Console log or Network tab | NO |

---

## Post-Code Registry Checklist (Step 5)

```
- [ ] registry.json: BUG-514 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-514 row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 3 files:
      frontDeskService.js — BUG-514 E-1, 2026-10-08
      CheckInForm.jsx     — BUG-514 E-2a+E-2b, 2026-10-08
      CheckInPage.jsx     — BUG-514 E-3+E-4, 2026-10-08
- [ ] Code markers: // BUG-514 on every modified line (E-1 L104, E-2 both lines, E-3 3 new lines, E-4 2 modified lines)
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## Risk Register

| Risk | Probability | Mitigation |
|---|---|---|
| `roomDiscountRs >= maxFlat` evaluates true at partial discount | NONE — `roomDiscountRs = Math.min(..., maxFlat)` so it can never exceed maxFlat; `>= maxFlat` ↔ `=== maxFlat` | V-11 regression test |
| `gstOnAdvFloor` = 0 when no GST configured | LOW — `gstOnAdvFloor = bc - advance - maxFlat` = `gstOnAdv`. If no GST, `gstOnAdv = 0` → `roomDiscountToApi = maxFlat + 0 = maxFlat` — no change | Safe |
| `gstOnAdvFloor_ci` sign mismatch | NONE — computed with `Math.max(0, ...)` at L291 so never negative | Safe |
| `_514` variable suffix names — future readability | LOW | Marker comments explain the suffix |
| E-3 stale comment removal | LOW — replaced with accurate BUG-514 note | No functional impact |

---

## QA Handover Seed

Feeds directly into the combined check-in discount QA sweep (BUG-511/512/513/514):

| TC | Scenario | Steps | Expected API fields |
|---|---|---|---|
| TC-514-1 | Max discount + no collect (CheckInForm path) | front-desk-v2, 88.34%/₹5965, confirm | `gst_tax=35`, `room_discount=6000` |
| TC-514-2 | Max discount + no collect (CheckInPage path) | /pms/check-in, same booking | `gst_tax=35`, `room_discount=6000` |
| TC-514-3 | Partial discount (CheckInForm path) | 60% discount | `gst_tax=<recalculated>`, `room_discount=roomDiscountRs` (unchanged) |
| TC-514-4 | No discount | No discount entered | `gst_tax=0` (or field absent), no `room_discount` field |
| TC-514-5 | Backend stored GST verification | Check order after check-in via API | `room_info.gst_tax=35` (not 335) |

