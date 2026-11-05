# BUG-511 — Gate 3: Implementation Plan

**ID:** BUG-511
**Date:** 2026-10-07
**Role:** PLANNING (Gate 3 — Implementation Plan; Gate 4 GO not yet given)
**Impact Analysis:** `impact/BUG-511_IMPACT_ANALYSIS.md`
**Risk:** CRITICAL (R6 — tax calculation display)
**Sprint:** oct_bug_batch

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx`
- `src/pages/pms/CheckInPage.jsx`

**Files WILL NOT touch:**
- `FolioCheckoutPanel.jsx`
- `pmsService.js` (submit path uses `gstBase` at L310, untouched)
- `roomGstCalculator.js`
- `CollectPaymentPanel.jsx` (R5)
- `orderTransform.js` (R5)
- Any test file (no unit tests exist for this display-only logic)

---

## Entry Verification (MANDATORY — Implementation agent must run before any code change)

```bash
# Verify E1 anchor has not drifted
grep -n "BUG-509.*universal formula\|const computeBase = Math.max(0, gstBase - gstOnAdvFloor)" \
  /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# Expected: L104 and L105

# Verify E2 anchor has not drifted
grep -n "BUG-509.*remove embedded\|const computeBase509 = Math.max(0, gstBase - gstOnAdvFloor509)" \
  /app/frontend/src/pages/pms/CheckInPage.jsx
# Expected: L948 and L951
```

If either grep returns nothing or different line numbers → **STOP. Return to PLANNING. Plan is stale.**

---

## Edit E1 — CheckInForm.jsx: Replace universal formula with conditional (Lines 95-107)

### Current code (lines 95–107, exact):

```js
  // BUG-503+508+509: displayGstTotal useMemo — computeBase removes embedded gstOnAdv to prevent compound GST
  // gstBase structurally = advance + gstOnAdvFloor + (maxFlat − roomDiscountRs) at ALL discount levels.
  // Applying GST to full gstBase taxes the gstOnAdv component a second time (compound).
  // Fix: always subtract gstOnAdvFloor from gstBase before computing GST.
  // At max (gstBase=1050): computeBase=1000 ✓. At near-max (gstBase=1051): computeBase=1001 ✓.
  const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst, displayGstBase } = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    const gstBase = Math.max(0, bc - roomDiscountRs);
    // BUG-509: universal formula — always remove gstOnAdv component before GST computation
    const computeBase = Math.max(0, gstBase - gstOnAdvFloor);
    return { ...computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase, formNights, 1), displayGstBase: computeBase };
  }, [c.booking_charge, c.advance_payment, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights, gstOnAdvFloor]);
```

### Replacement code:

```js
  // BUG-503+508+511: displayGstTotal useMemo — computeBase conditional on near-max zone
  // Near-max zone (extraRoom < gstOnAdvFloor): subtract gstOnAdvFloor to avoid compound GST on advance.
  // Standard zone (extraRoom >= gstOnAdvFloor): apply GST to full discounted amount.
  // Owner confirmed: ₹7,900 → extraRoom=50, NOT near-max → GST = 5%×1100 = ₹55.
  // At max (₹7,950): extraRoom=0 < 50 → computeBase=1000 ✓. At ₹7,949: extraRoom=1 < 50 → computeBase=1001 ✓.
  const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst, displayGstBase } = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    const gstBase = Math.max(0, bc - roomDiscountRs);
    // BUG-511: near-max zone only — subtract gstOnAdvFloor only when (maxFlat − roomDiscountRs) < gstOnAdvFloor
    const extraRoom   = maxFlat - roomDiscountRs; // BUG-511
    const computeBase = extraRoom < gstOnAdvFloor ? gstBase - gstOnAdvFloor : gstBase; // BUG-511
    return { ...computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase, formNights, 1), displayGstBase: computeBase };
  }, [c.booking_charge, c.advance_payment, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights, gstOnAdvFloor, maxFlat]);
```

### What changed:
1. Comment block updated — references BUG-511, describes near-max rule and boundary
2. `// BUG-509: universal formula` comment → `// BUG-511: near-max zone only`
3. `const computeBase = Math.max(0, gstBase - gstOnAdvFloor)` → **two lines**:
   - `const extraRoom = maxFlat - roomDiscountRs;`
   - `const computeBase = extraRoom < gstOnAdvFloor ? gstBase - gstOnAdvFloor : gstBase;`
4. deps array: `gstOnAdvFloor` kept + **`maxFlat` added** (extraRoom depends on it)

### Verification E1:
- `grep -n "BUG-511" CheckInForm.jsx` → returns ≥ 2 lines (extraRoom + computeBase)
- `grep -n "BUG-509" CheckInForm.jsx` → L104 comment removed; any remaining BUG-509 refs are from earlier comment block only (L95 tag will show `BUG-503+508+511` — no stale BUG-509)
- Browser self-test (before Gate 5b QA): enter flat discount ₹7,900 → CGST shows ₹27.50, Total GST ₹55, Balance ₹155

---

## Edit E2 — CheckInPage.jsx: Replace universal formula with conditional (Lines 948–951)

### Current code (lines 948–951, exact):

```js
                      // BUG-509: remove embedded gstOnAdv component to prevent compound GST (mirrors CheckInForm.jsx fix)
                      const bookingAdv = Number(selected?.charge?.advance_payment || 0);
                      const gstOnAdvFloor509 = Math.max(0, amt - bookingAdv - maxFlat);
                      const computeBase509 = Math.max(0, gstBase - gstOnAdvFloor509);
```

### Replacement code:

```js
                      // BUG-511: near-max zone only — mirrors CheckInForm.jsx conditional fix
                      const bookingAdv = Number(selected?.charge?.advance_payment || 0);
                      const gstOnAdvFloor509 = Math.max(0, amt - bookingAdv - maxFlat);
                      const extraRoom509     = maxFlat - roomDiscountRs; // BUG-511
                      const computeBase509   = extraRoom509 < gstOnAdvFloor509 ? gstBase - gstOnAdvFloor509 : gstBase; // BUG-511
```

### What changed:
1. Comment: `// BUG-509: remove embedded...` → `// BUG-511: near-max zone only...`
2. `const computeBase509 = Math.max(0, gstBase - gstOnAdvFloor509)` → **two lines**:
   - `const extraRoom509 = maxFlat - roomDiscountRs;`
   - `const computeBase509 = extraRoom509 < gstOnAdvFloor509 ? gstBase - gstOnAdvFloor509 : gstBase;`

### Scope notes for E2:
- `roomDiscountRs`: already in scope at L946 (`gstBase = Math.max(0, amt - roomDiscountRs)`)
- `maxFlat`: already in scope at L950 (`gstOnAdvFloor509 = ... - maxFlat`)
- `bookingAdv`: defined at L949, unchanged — still needed for `gstOnAdvFloor509`
- No deps array here (this is a render-time IIFE, not a useMemo)

### Verification E2:
- `grep -n "BUG-511" CheckInPage.jsx` → returns ≥ 2 lines
- `grep -n "computeBase509 = Math.max" CheckInPage.jsx` → 0 results (old formula removed)
- Browser self-test (legacy `/pms/check-in` route): same discount values produce same corrected GST

---

## Execution Sequence

```
1. Edit E1 (CheckInForm.jsx)     — search_replace, single call
2. Edit E2 (CheckInPage.jsx)     — search_replace, single call (parallel with E1)
3. Compile check                 — tail frontend log → "Compiled successfully"
4. Self-test (browser)           — enter ₹7,900 flat discount → verify GST ₹55
5. EXIT GATE (5 checkboxes)      — see below
```

Both edits are **independent** — run in parallel (one `search_replace` per file simultaneously).

---

## Verification Matrix

| # | Edit | File | What to Verify | Method |
|---|---|---|---|---|
| V1 | E1 | CheckInForm.jsx | `extraRoom` const present, BUG-511 marker on both new lines | `grep -n "extraRoom\|BUG-511" CheckInForm.jsx` → ≥2 hits |
| V2 | E1 | CheckInForm.jsx | `maxFlat` added to useMemo deps array | `grep -n "maxFlat\]" CheckInForm.jsx` → 1 hit |
| V3 | E2 | CheckInPage.jsx | `extraRoom509` const present, BUG-511 marker on both new lines | `grep -n "extraRoom509\|BUG-511" CheckInPage.jsx` → ≥2 hits |
| V4 | E2 | CheckInPage.jsx | Old `Math.max(0, gstBase - gstOnAdvFloor509)` formula removed | `grep -n "Math.max.*gstBase.*gstOnAdvFloor509" CheckInPage.jsx` → 0 hits |
| V5 | Both | webpack | 0 new warnings | `tail -n 10 /var/log/supervisor/frontend.out.log` → "Compiled successfully" |
| V6 | E1 | Browser | ₹7,900 discount → CGST ₹27.50, Total GST ₹55.00, Balance ₹155 | CheckInForm panel on test booking |
| V7 | E1 | Browser | ₹7,950 max → Total GST ₹50.00, Balance ₹50 (unchanged) | Same panel |
| V8 | E2 | Browser | Same values on legacy `/pms/check-in` route | CheckInPage route |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `maxFlat` missing from deps causes stale computeBase | LOW (maxFlat is stable per booking; booking fields in deps already) | Added explicitly to deps array |
| `roomDiscountRs` not accessible inside CheckInPage IIFE | NONE — already used at L946 | Verified in entry check |
| Boundary case ₹7,900 (extraRoom = 50, `50 < 50 = FALSE`) regresses | NONE — owner explicitly confirmed | Verified in V6 |
| Near-max ₹7,901 (extraRoom = 49) uses subtraction — is this correct? | NONE — owner confirmed boundary ≥ 50 = standard | Formula matches owner-stated rule |
| BUG-512 interaction — both touch CheckInForm/CheckInPage | NONE — different lines | BUG-511 first; BUG-512 follows |

---

## Post-Code Registry Checklist (EXIT GATE — MANDATORY before QA handover)

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f: d = json.load(f)
     items = {i['id']: i for i in d['items']}
     assert 'BUG-511' in items, 'BUG-511 MISSING'
     assert 'IMPLEMENTED' in items['BUG-511'].get('status',''), 'BUG-511 not IMPLEMENTED'
     print('✅ Registry sync PASS')
     "
     If FAIL → update registry.json NOW.

□ 2. BUG_TRACKER.md: BUG-511 row updated to GATE_5A_IMPLEMENTED

□ 3. FILE_OWNERSHIP.md: Add row —
     | CheckInForm.jsx | L104-107: extraRoom + conditional computeBase | BUG-511 IMPL 2026-10-07 |
     | CheckInPage.jsx | L948-951: extraRoom509 + conditional computeBase509 | BUG-511 IMPL 2026-10-07 |

□ 4. CODE MARKERS: grep -n "BUG-511" CheckInForm.jsx CheckInPage.jsx
     Must return ≥ 2 hits per file (extraRoom line + computeBase line each)

□ 5. COMPILE CHECK: tail -n 5 /var/log/supervisor/frontend.out.log
     Must show "Compiled successfully" with 0 new warnings
```

---

## QA Handover Seed (for Gate 5b)

| # | Test Case | Steps | Expected |
|---|---|---|---|
| TC-1 | Normal discount ₹7,900 (boundary) | Front Desk check-in form, enter flat ₹7,900 | CGST ₹27.50, SGST ₹27.50, Total GST ₹55.00, Balance ₹155 |
| TC-2 | Near-max ₹7,949 | Enter flat ₹7,949 | CGST ₹25.03, SGST ₹25.02, Total GST ₹50.05, Balance ₹51.05 |
| TC-3 | Max ₹7,950 | Enter flat ₹7,950 | CGST ₹25, SGST ₹25, Total GST ₹50, Balance ₹50 |
| TC-4 | Normal discount ₹4,000 | Enter flat ₹4,000 | Total GST ₹250.00, Balance ₹4,250 |
| TC-5 | 18% slab ₹300 | Enter flat ₹300 | GST 18%, Total GST ₹1,566, Balance ₹9,266 |
| TC-6 | Legacy path ₹7,900 | Same test on CheckInPage route | Same corrected GST values |
| REG-1 | Regression: max discount unchanged | ₹7,950 | GST ₹50 (was ₹50 before, must stay ₹50) |
| REG-2 | Regression: near-max unchanged | ₹7,949 | GST ₹50.05 (was ₹50.05 before, must stay) |

> **Environment note:** All TC require a today-dated check-in booking in RID 69 (The Goan Kitchen). Current bookings are 26 Oct — owner must create a test booking before Gate 5b QA.

---

## Gate 3 Summary

```
Implementation Plan complete: BUG-511
Edits: 2 (E1 + E2), independent, parallel execution
Files: CheckInForm.jsx (L95-107) · CheckInPage.jsx (L948-951)
Risk: CRITICAL (R6) — display-only, no backend payload change
Owner decisions needed: NONE
Self-test: V6/V7/V8 (browser) + V1-V5 (grep + compile)
EXIT GATE: 5 checkboxes
Awaiting Gate 4 GO → IMPLEMENTATION
```
