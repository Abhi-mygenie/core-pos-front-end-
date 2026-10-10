# BUG-490 — Impact Analysis (Gate 2)

**ID:** BUG-490
**Title:** Room discount cap missing: can exceed balance due (advance already paid not respected)
**Date:** 2026-10-05
**Role:** PLANNING (Gate 2)
**Code Reality:** NONE — no cap logic in any of the 3 files (grep: `Math.min|balance_due.*discount` → 0 hits)
**Risk:** MEDIUM
**Severity:** P1

---

## Conflict Pre-Check

| File | Last Modified By | Date | Overlap? |
|------|-----------------|------|---------|
| `CheckInForm.jsx` | BUG-489 (roomDiscountRs useMemo added, lines 57-65) | 2026-10-05 | Lines 58-65 + 186 — **SEQUENTIAL** (BUG-490 edits same useMemo BUG-489 introduced; verify exact line state before coding) |
| `CheckInPage.jsx` | CR-407 (ciRoomDiscountAmt/useMemo, lines 254-261; input line 880) | 2026-10-05 | Lines 254-261 + 880 — no other active item on same lines; parallel-safe |
| `FolioCheckoutPanel.jsx` | CR-407 (lines 80, 83) | 2026-10-05 | Lines 80, 83 — no other active item; parallel-safe |

**Execution rule:** BUG-490 implementation must be done AFTER BUG-489 is QA-verified (shared CheckInForm.jsx lines 58-65). BUG-491 can be coded in same pass (no line overlap with BUG-490 in any file).

---

## Data Flow Trace

```
Cashier types discount → input onChange/max → roomDiscountRs useMemo → badge display
                                                                      → handleConfirm / handlePaid payload
```

**Break point (all 3 components):**
- Amount input has `max={undefined}` (CheckInForm) or `max={form?.orderAmount}` (CheckInPage) — neither is capped at actual balance owed
- `roomDiscountRs` useMemo: base is `booking_charge` or `orderAmount` with no `Math.min` cap → result can exceed `balance_due`
- Backend receives oversized discount → 422 or silent over-discount

---

## Affected Files — Exact Code Reality

### File 1: `src/components/pms/frontdesk/CheckInForm.jsx`

**Line 58-65 — roomDiscountRs useMemo (current):**
```javascript
const roomDiscountRs = useMemo(() => {
  const raw = parseFloat(ciRoomDiscountAmt) || 0;
  if (raw <= 0) return 0;
  if (ciRoomDiscountType === 'Percent') {
    return Math.floor(Number(c.booking_charge || 0) * raw / 100);  // BUG-490: no Math.min(result, c.balance_due)
  }
  return Math.floor(raw);  // BUG-490: no Math.min(raw, c.balance_due)
}, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge]);
```

**Line 186 — Amount input max (current):**
```jsx
max={ciRoomDiscountType === 'Percent' ? 100 : undefined}  // BUG-490: Amount mode → no upper cap
```

**`c.balance_due` already available:** `c = row?.charge ?? {}` — `c.balance_due` is present in all check-in scenarios (confirmed in intake static trace).

---

### File 2: `src/pages/pms/CheckInPage.jsx`

**Line 254-261 — roomDiscountRs useMemo (current):**
```javascript
const roomDiscountRs = useMemo(() => {
  const raw = parseFloat(ciRoomDiscountAmt) || 0;
  if (raw <= 0) return 0;
  if (ciRoomDiscountType === 'Percent') {
    return Math.floor(Number(form?.orderAmount || 0) * raw / 100);  // BUG-490: no Math.min cap
  }
  return Math.floor(raw);  // BUG-490: no Math.min cap
}, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount]);
```

**Line 880 — Amount input max (current):**
```jsx
max={ciRoomDiscountType === 'Percent' ? 100 : form?.orderAmount || undefined}
// BUG-490: caps at booking_charge (₹6,700) NOT at balance_due (₹6,335 when advance=₹700)
```

**`balance_due` NOT directly available** — `form.orderAmount` = booking_charge, `form.advancePayment` = advance paid.
Must compute: `effectiveBalanceDue = form.orderAmount + gstTotal - form.advancePayment`

`computeRoomGst` is already imported (line 12). `roomGstApplicable`, `roomGstSlabs` available at L68. `formNights` useMemo available at L248.

**New useMemo needed (`effectiveBalanceDue`):**
```javascript
const effectiveBalanceDue = useMemo(() => {
  const base = Number(form?.orderAmount || 0);
  const advance = Number(form?.advancePayment || 0);
  const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, base, formNights ?? 1, 1);
  return Math.max(0, base + (gstTotal || 0) - advance);
}, [form?.orderAmount, form?.advancePayment, roomGstApplicable, roomGstSlabs, formNights]);
```

> **Note for Implementation agent:** insert this useMemo AFTER line 261 (after existing `roomDiscountRs` useMemo) and BEFORE line 263 (formValid).

---

### File 3: `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`

**Line 80 — Amount input max (current):**
```jsx
max={roomDiscountType === 'Percent' ? 100 : undefined}  // BUG-490: no Amount cap
```

**Line 83 — onChange (current):**
```javascript
onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
// BUG-490: clamps at 0 but not at c.balance_due
```

**`c.balance_due` available:** `c = row.charge ?? {}` at line 40 in `RoomSection`. `c.balance_due` is in scope.

**Note:** BUG-491 Sub-C adds `roomDiscountRs` useMemo to this component (after line 186) which already includes `Math.min(result, balanceDue)` for Percent mode. BUG-490 still needs to fix the Amount input `max` (L80) and `onChange` (L83) for direct user input capping and browser-native HTML validation. Recommend implementing BUG-490 + BUG-491 changes to this file in a single pass.

---

## Risk Assessment

| Risk Factor | Assessment |
|-------------|-----------|
| Files touched | 3 — none are R5 hotspots |
| Financial formula change? | NO — this is input validation only; no payment amount formula changes |
| localStorage touched? | NO |
| Provider order touched? | NO |
| API contract changed? | NO — discount payload still computed from `roomDiscountRs`; cap ensures it cannot exceed balance |
| Overall risk | **MEDIUM** (input validation, 3 files, no hotspots) |

---

## Downstream Consumers

| Consumer | Impact |
|----------|--------|
| `handleConfirm` in CheckInPage | Receives capped `roomDiscountRs` — already correct (uses the useMemo value) |
| `confirm` in CheckInForm | Receives capped `roomDiscountRs` — already correct |
| `handlePaid` in FolioCheckoutPanel | Receives capped `roomDiscount` state — already correct |
| Backend `user-group-check-in` / `collectBillExisting` | Receives smaller (valid) discount — no schema change |

---

## Owner Decisions

**None.** All decisions are locked per intake doc. Gate 3 can proceed immediately.

---

## Verification Matrix (seeds QA)

| Edit # | File | Change | How to Verify |
|--------|------|--------|---------------|
| E1 | CheckInForm.jsx L58-65 | `Math.min(result, c.balance_due)` in useMemo | Enter Amount > balance_due → badge shows balance_due value |
| E2 | CheckInForm.jsx L186 | `max={... : Number(c.balance_due || 0) \|\| undefined}` | HTML5 blocks input above balance_due |
| E3 | CheckInPage.jsx L254-261 | `Math.min(result, effectiveBalanceDue)` in useMemo | Enter Amount > effectiveBalanceDue → badge shows effectiveBalanceDue |
| E4 | CheckInPage.jsx (new) | `effectiveBalanceDue` useMemo added after L261 | Verify with advance=700, orderAmount=6700, gstTotal=335 → effectiveBalanceDue=6335 |
| E5 | CheckInPage.jsx L880 | `max={... : effectiveBalanceDue \|\| undefined}` | HTML5 blocks input above effectiveBalanceDue |
| E6 | FolioCheckoutPanel.jsx L80 | `max={... : Number(c.balance_due \|\| 0) \|\| undefined}` | HTML5 blocks input above balance_due |
| E7 | FolioCheckoutPanel.jsx L83 | `Math.min(value, Number(c.balance_due \|\| 0))` in onChange | Pasting a number > balance_due clips it |

---

## Scope Lock

**WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx` — lines 58-65 (useMemo), line 186 (max)
- `src/pages/pms/CheckInPage.jsx` — lines 254-261 (useMemo), new useMemo after L261, line 880 (max)
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — line 80 (max), line 83 (onChange)

**WILL NOT touch:**
- `orderTransform.js`, `CollectPaymentPanel.jsx`, `pmsService.js`, `DashboardPage.jsx` (R5 hotspots)
- Any payment formula, API endpoint, or localStorage key
- Any file not in the 3-file list above

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-490 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-490 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add all 3 files with BUG-490 marker
- [ ] Code markers: // BUG-490 comment in every modified site (7 total)
```
