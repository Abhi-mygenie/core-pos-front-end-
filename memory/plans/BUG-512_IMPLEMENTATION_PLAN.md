# BUG-512 — Gate 3: Implementation Plan

**ID:** BUG-512
**Date:** 2026-10-07
**Role:** PLANNING (Gate 3 — Implementation Plan; Gate 4 GO not yet given)
**Impact Analysis:** `impact/BUG-512_IMPACT_ANALYSIS.md`
**Risk:** CRITICAL (R6 — tax collection at wrong stage)
**Sprint:** oct_bug_batch

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx`
- `src/pages/pms/CheckInPage.jsx`

**Files WILL NOT touch:**
- `CheckInForm.jsx` L90: `collectMax = bc − roomDiscountRs − advance` ← MUST NOT CHANGE (BUG-500/OD-500-04)
- `CheckInPage.jsx` L256-263: `effectiveBalanceDue` useMemo ← MUST NOT CHANGE (BUG-500/OD-500-04)
- `pmsService.js`
- `FolioCheckoutPanel.jsx`
- `CollectPaymentPanel.jsx` (R5)
- `orderTransform.js` (R5)
- Any test file

---

## Pre-condition: BUG-511 must land first

BUG-511 modifies `CheckInForm.jsx` L95-107 (useMemo comment block) and `CheckInPage.jsx` L948-951 (GST IIFE). These lines do **not** overlap with BUG-512's edit sites, but:

> **Implementation agent must verify BUG-511 is already committed and webpack compiles cleanly before starting BUG-512.**

```bash
grep -n "BUG-511" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# Must return ≥2 hits. If 0 → BUG-511 not yet applied. STOP. Apply BUG-511 first.
```

---

## Entry Verification (MANDATORY — run before any code change)

```bash
# Verify all 8 anchor sites have not drifted

# CheckInForm.jsx
grep -n "gstOnAdvFloor  =" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → L94

grep -n "displayBalance > collectMax && collectMax > 0" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → L304

grep -n "checkin-collect-over-max" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → L315

grep -n "disabled=.*collectOverMax.*checkin-confirm-btn\|checkin-confirm-btn.*disabled=.*collectOverMax" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → L325

# CheckInPage.jsx
grep -n "Number(ciRoomDiscountAmt) > maxFlat);" /app/frontend/src/pages/pms/CheckInPage.jsx
# → L289

grep -n "!discountOverMax; // CR-380" /app/frontend/src/pages/pms/CheckInPage.jsx
# → L291

grep -n "ci-collect-room-hint" /app/frontend/src/pages/pms/CheckInPage.jsx
# → L859

grep -n "ci-collect-over-max" /app/frontend/src/pages/pms/CheckInPage.jsx
# → L864
```

If any grep returns nothing or wrong line → **STOP. Plan is stale. Return to PLANNING.**

---

## Execution Sequence

```
Phase 1a — CheckInForm.jsx (sequential within file):
  E-A1 → E-A2 → E-A3 → E-A4

Phase 1b — CheckInPage.jsx (sequential within file, parallel with Phase 1a):
  E-B1 → E-B2 → E-B3 → E-B4

Phase 2 — Compile check (after both files saved)
Phase 3 — Self-test (browser)
Phase 4 — EXIT GATE (5 checkboxes)
```

---

## Edit E-A1 — CheckInForm.jsx: Add detection consts after L94

### Current (L94, exact):
```js
  const gstOnAdvFloor  = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
```

### Replacement (add 3 lines after — expand the single line):
```js
  const gstOnAdvFloor  = Number(c.booking_charge || 0) - Number(c.advance_payment || 0) - maxFlat;
  // BUG-512: detect when collectMax = gstOnAdv (max discount → zero room balance, pure GST)
  const collectAtMaxGst     = collectMax > 0 && collectMax <= gstOnAdvFloor; // BUG-512
  const collectBlockedAtMax = collectAtMaxGst && collectAmt > 0;             // BUG-512: blocks submit
```

### Why it works:
- `collectMax` defined at L90 ✓ (in scope before L94)
- `collectAmt` defined at L56 ✓ (in scope)
- `gstOnAdvFloor` defined on the same line (L94) — new consts placed immediately after ✓
- `collectAtMaxGst`: TRUE only when `collectMax = gstOnAdv` (max discount), FALSE everywhere else
- `collectBlockedAtMax`: TRUE only when at max AND user has entered any collect amount

### Verification E-A1:
```bash
grep -n "collectAtMaxGst\|collectBlockedAtMax" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → ≥4 hits (definitions + usage in E-A2/E-A3/E-A4)
```

---

## Edit E-A2 — CheckInForm.jsx: Fix hint condition + message (L303-308)

### Current (L303-308, exact):
```jsx
            {/* BUG-509: room-only cap hint when GST makes displayBalance > collectMax */}
            {displayBalance > collectMax && collectMax > 0 && (
              <div className="mb-1 text-[11px] text-[#767676]" data-testid="checkin-collect-room-hint">
                Room balance: {fmtINR(collectMax)} · GST settled at checkout
              </div>
            )}
```

### Replacement:
```jsx
            {/* BUG-512: hint — normal discounts (displayBalance > collectMax); max discount (collectAtMaxGst) */}
            {collectMax > 0 && (displayBalance > collectMax || collectAtMaxGst) && (
              <div className="mb-1 text-[11px] text-[#767676]" data-testid="checkin-collect-room-hint">
                {collectAtMaxGst
                  ? <>Maximum discount applied — GST ({fmtINR(gstOnAdvFloor)}) settled at checkout. Nothing to collect at check-in.</>
                  : <>Room balance: {fmtINR(collectMax)} · GST settled at checkout</>}
              </div>
            )}
```

### What changed:
- Condition: `displayBalance > collectMax && collectMax > 0` → `collectMax > 0 && (displayBalance > collectMax || collectAtMaxGst)`
- Message: static text → conditional (max = GST message, normal = existing room balance text)
- Comment updated from BUG-509 to BUG-512

### Verification E-A2:
```bash
grep -n "checkin-collect-room-hint" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → L now shows (displayBalance > collectMax || collectAtMaxGst)
```

---

## Edit E-A3 — CheckInForm.jsx: Fix error condition + message (L315)

### Current (L315, exact):
```jsx
            {collectOverMax && <div className="mt-1 text-[11px] text-[#B91C1C]" data-testid="checkin-collect-over-max">Collect exceeds room balance ({fmtINR(collectMax)}). GST is settled at checkout.</div>} {/* BUG-497 + BUG-509 */}
```

### Replacement:
```jsx
            {(collectOverMax || collectBlockedAtMax) && <div className="mt-1 text-[11px] text-[#B91C1C]" data-testid="checkin-collect-over-max">{collectAtMaxGst ? <>Maximum discount applied. GST ({fmtINR(gstOnAdvFloor)}) is settled at checkout — nothing to collect.</> : <>Collect exceeds room balance ({fmtINR(collectMax)}). GST is settled at checkout.</>}</div>} {/* BUG-497 + BUG-512 */}
```

### What changed:
- Condition: `collectOverMax` → `(collectOverMax || collectBlockedAtMax)`
- Message: static → conditional (max = GST message, normal = existing message)
- Trailing comment: `BUG-509` → `BUG-512`

### Verification E-A3:
```bash
grep -n "collectBlockedAtMax" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → hits at E-A1 definition and E-A3/E-A4 usage
```

---

## Edit E-A4 — CheckInForm.jsx: Add collectBlockedAtMax to Confirm disabled (L325)

### Current (L325, exact — the disabled attribute only):
```
disabled={!ready || busy || discountOverMax || collectOverMax}
```
(full line context for search_replace uniqueness):
```jsx
            <button type="button" onClick={confirm} disabled={!ready || busy || discountOverMax || collectOverMax} data-testid="checkin-confirm-btn" className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Confirm check-in</button> {/* BUG-497 */}
```

### Replacement:
```jsx
            <button type="button" onClick={confirm} disabled={!ready || busy || discountOverMax || collectOverMax || collectBlockedAtMax} data-testid="checkin-confirm-btn" className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Confirm check-in</button> {/* BUG-497 + BUG-512 */}
```

### What changed:
- `disabled` condition: `... || collectOverMax` → `... || collectOverMax || collectBlockedAtMax`
- Trailing comment: `BUG-497` → `BUG-497 + BUG-512`

### Verification E-A4:
```bash
grep -n "collectBlockedAtMax.*checkin-confirm-btn\|checkin-confirm-btn.*collectBlockedAtMax" \
  /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
# → 1 hit
```

---

## Edit E-B1 — CheckInPage.jsx: Add detection consts before formValid (L289-291)

### Current (L289-291, exact):
```js
    (ciRoomDiscountType === 'Amount'  && Number(ciRoomDiscountAmt) > maxFlat);

  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= effectiveBalanceDue && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax; // CR-380 + BUG-411 + BUG-492 + BUG-497
```

### Replacement:
```js
    (ciRoomDiscountType === 'Amount'  && Number(ciRoomDiscountAmt) > maxFlat);
  // BUG-512: detect max-discount case (effectiveBalanceDue = gstOnAdv → zero room balance)
  const gstOnAdvFloor_ci       = Math.max(0, Number(form?.orderAmount || 0) - Number(selected?.charge?.advance_payment || 0) - maxFlat); // BUG-512
  const collectAtMaxGst_ci     = effectiveBalanceDue > 0 && effectiveBalanceDue <= gstOnAdvFloor_ci;  // BUG-512
  const collectBlockedAtMax_ci = collectAtMaxGst_ci && Number(form?.advancePayment || 0) > 0;         // BUG-512

  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= effectiveBalanceDue && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax; // CR-380 + BUG-411 + BUG-492 + BUG-497
```

### Why it works:
- `effectiveBalanceDue` defined at L256-263 ✓ (in scope)
- `maxFlat` defined at L268-276 ✓ (in scope; used at L289 `Number(ciRoomDiscountAmt) > maxFlat` confirms availability)
- `form?.orderAmount`, `selected?.charge?.advance_payment` ✓ (component state, always in scope)
- `gstOnAdvFloor_ci` = `bc - bookingAdv - maxFlat` = same as gstOnAdv by construction
- `collectAtMaxGst_ci` is TRUE only when `effectiveBalanceDue = gstOnAdv` (max discount only)

### Verification E-B1:
```bash
grep -n "collectAtMaxGst_ci\|collectBlockedAtMax_ci\|gstOnAdvFloor_ci" /app/frontend/src/pages/pms/CheckInPage.jsx
# → ≥3 hits (definitions + usage in E-B2/E-B3/E-B4)
```

---

## Edit E-B2 — CheckInPage.jsx: Block formValid at max discount (L291)

### Current (L291, exact):
```js
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= effectiveBalanceDue && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax; // CR-380 + BUG-411 + BUG-492 + BUG-497
```

### Replacement:
```js
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= effectiveBalanceDue && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax && !collectBlockedAtMax_ci; // CR-380 + BUG-411 + BUG-492 + BUG-497 + BUG-512
```

### What changed:
- Added `&& !collectBlockedAtMax_ci` before the trailing comment
- Comment: `+ BUG-512` appended

### Verification E-B2:
```bash
grep -n "collectBlockedAtMax_ci" /app/frontend/src/pages/pms/CheckInPage.jsx
# → hits at E-B1 definition and E-B2/E-B4 usage
```

---

## Edit E-B3 — CheckInPage.jsx: Fix hint message at max discount (L857-862)

### Current (L857-862, exact):
```jsx
                        {/* BUG-509: room-only cap hint when GST creates a higher display balance */}
                        {roomDiscountRs > 0 && effectiveBalanceDue > 0 && (
                          <div className="mt-1 text-[11px] text-[#767676]" data-testid="ci-collect-room-hint">
                            Room balance: ₹{effectiveBalanceDue.toLocaleString('en-IN')} · GST settled at checkout
                          </div>
                        )}
```

### Replacement:
```jsx
                        {/* BUG-512: hint — normal discounts show room balance; max discount shows GST-only message */}
                        {roomDiscountRs > 0 && effectiveBalanceDue > 0 && (
                          <div className="mt-1 text-[11px] text-[#767676]" data-testid="ci-collect-room-hint">
                            {collectAtMaxGst_ci
                              ? <>Maximum discount applied — GST (₹{gstOnAdvFloor_ci.toLocaleString('en-IN')}) settled at checkout. Nothing to collect at check-in.</>
                              : <>Room balance: ₹{effectiveBalanceDue.toLocaleString('en-IN')} · GST settled at checkout</>}
                          </div>
                        )}
```

### What changed:
- Comment: `BUG-509` → `BUG-512`
- Content: static text → conditional using `collectAtMaxGst_ci`
- Normal case: text unchanged
- Max case: "Maximum discount applied — GST (₹50) settled at checkout. Nothing to collect."

### Verification E-B3:
```bash
grep -n "ci-collect-room-hint" /app/frontend/src/pages/pms/CheckInPage.jsx
# → line now contains `collectAtMaxGst_ci`
```

---

## Edit E-B4 — CheckInPage.jsx: Fix error condition at max discount (L863-867)

### Current (L863-867, exact):
```jsx
                        {Number(form.advancePayment) > effectiveBalanceDue && Number(form.advancePayment) > 0 && (
                          <div className="mt-1 text-[11px] text-[#B91C1C]" data-testid="ci-collect-over-max">
                            Collect exceeds room balance (₹{effectiveBalanceDue.toLocaleString('en-IN')}). GST is settled at checkout.
                          </div>
                        )}
```

### Replacement:
```jsx
                        {(Number(form.advancePayment) > effectiveBalanceDue || collectBlockedAtMax_ci) && Number(form.advancePayment) > 0 && (
                          <div className="mt-1 text-[11px] text-[#B91C1C]" data-testid="ci-collect-over-max">
                            {collectAtMaxGst_ci
                              ? <>Maximum discount applied. GST (₹{gstOnAdvFloor_ci.toLocaleString('en-IN')}) is settled at checkout — nothing to collect.</>
                              : <>Collect exceeds room balance (₹{effectiveBalanceDue.toLocaleString('en-IN')}). GST is settled at checkout.</>}
                          </div>
                        )}
```

### What changed:
- Condition: `Number(form.advancePayment) > effectiveBalanceDue` → `(Number(form.advancePayment) > effectiveBalanceDue || collectBlockedAtMax_ci)`
- Message: static → conditional
- Normal case: text unchanged
- Max case: GST-specific error message

### Verification E-B4:
```bash
grep -n "ci-collect-over-max" /app/frontend/src/pages/pms/CheckInPage.jsx
# → line now contains `collectBlockedAtMax_ci`
```

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|---|---|---|---|
| V1 | E-A1 | CheckInForm.jsx | `collectAtMaxGst` + `collectBlockedAtMax` defined with BUG-512 marker | `grep -n "BUG-512" CheckInForm.jsx` → ≥4 hits |
| V2 | E-A2 | CheckInForm.jsx | Hint fires at max (₹7,950) with correct message | Browser: enter ₹7,950 → hint shows "Maximum discount applied — GST (₹50)" |
| V3 | E-A3 | CheckInForm.jsx | Error fires at max when user enters any collect amount | Browser: ₹7,950 + type 50 → red error "Maximum discount applied. GST (₹50) is settled at checkout" |
| V4 | E-A4 | CheckInForm.jsx | Confirm greyed out when collect > 0 at max | Browser: ₹7,950 + type 50 → Confirm button disabled ✓ |
| V5 | E-B1 | CheckInPage.jsx | 3 new consts defined | `grep -n "gstOnAdvFloor_ci\|collectAtMaxGst_ci\|collectBlockedAtMax_ci" CheckInPage.jsx` → ≥3 definitions |
| V6 | E-B2 | CheckInPage.jsx | formValid false when advancePayment > 0 at max | Browser (legacy path): ₹7,950 + type 50 advance → Confirm disabled |
| V7 | E-B3 | CheckInPage.jsx | Hint message correct at max | Browser (legacy): ₹7,950 → hint "Maximum discount applied" (not "Room balance: ₹50") |
| V8 | E-B4 | CheckInPage.jsx | Error fires at max for any advance | Browser (legacy): ₹7,950 + type 50 → red error |
| REG-1 | Both | Normal discount | ₹4,000 hint unchanged: "Room balance: ₹4,000" | Browser: enter ₹4,000 → hint text is "Room balance: ₹4,000 · GST settled at checkout" |
| REG-2 | Both | Normal error | Collect ₹4,001 at ₹4,000 discount still errors | Browser: ₹4,000 discount + type 4001 → "Collect exceeds room balance (₹4,000)" |
| REG-3 | Both | Collect ₹0 at max | No block when nothing collected at max | Browser: ₹7,950 discount, collect field empty → Confirm ENABLED ✓ |
| V9 | Both | webpack | 0 new warnings after both files saved | `tail -n 5 /var/log/supervisor/frontend.out.log` → "Compiled successfully" |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `maxFlat` undefined when E-B1 consts run | NONE — maxFlat defined L268-276, consts inserted at L289+ | Verified: `maxFlat` already used at L289 |
| `collectAtMaxGst_ci` TRUE for ₹7,949 (near-max) | NONE — effectiveBalanceDue=51 > gstOnAdvFloor_ci=50 → FALSE | Verified in IA |
| Normal discount (₹4,000) behaviour changes | NONE — `collectAtMaxGst` is FALSE at 4000 ≤ 50 = FALSE | REG-1/REG-2 cover this |
| Guest with zero collect at max blocked from check-in | NONE — `collectBlockedAtMax = collectAtMaxGst && collectAmt > 0` — zero collect is fine | REG-3 covers this |
| BUG-511 not yet applied when BUG-512 implemented | LOW — covered by pre-condition check | Implementation agent checks BUG-511 marker first |

---

## Post-Code Registry Checklist (EXIT GATE — MANDATORY before QA handover)

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f: d = json.load(f)
     items = {i['id']: i for i in d['items']}
     assert 'BUG-512' in items, 'BUG-512 MISSING'
     assert 'IMPLEMENTED' in items['BUG-512'].get('status',''), 'BUG-512 not IMPLEMENTED'
     print('✅ Registry sync PASS')
     "
     If FAIL → update registry.json NOW.

□ 2. BUG_TRACKER.md: BUG-512 row updated to GATE_5A_IMPLEMENTED

□ 3. FILE_OWNERSHIP.md: Add rows —
     | CheckInForm.jsx | After L94: collectAtMaxGst+collectBlockedAtMax; L304-308 hint; L315 error; L325 disabled | BUG-512 IMPL 2026-10-07 |
     | CheckInPage.jsx | After L289: gstOnAdvFloor_ci+collectAtMaxGst_ci+collectBlockedAtMax_ci; L291 formValid; L857-867 hint+error | BUG-512 IMPL 2026-10-07 |

□ 4. CODE MARKERS: grep -rn "BUG-512" CheckInForm.jsx CheckInPage.jsx
     Must return ≥4 hits per file

□ 5. COMPILE CHECK: tail -n 5 /var/log/supervisor/frontend.out.log
     Must show "Compiled successfully" with 0 new warnings
```

---

## QA Handover Seed

| # | Test Case | Path | Steps | Expected |
|---|---|---|---|---|
| TC-1 | Max discount — hint correct | Front Desk (CheckInForm) | Enter flat ₹7,950 → check hint area | "Maximum discount applied — GST (₹50) settled at checkout. Nothing to collect at check-in." |
| TC-2 | Max discount — collect blocks Confirm | Front Desk | ₹7,950 + type 50 in Collect + select Cash | Error shows, Confirm **greyed out** |
| TC-3 | Max discount — zero collect allows Confirm | Front Desk | ₹7,950 + collect field empty | Confirm **enabled** ✓ |
| TC-4 | Normal discount hint unchanged | Front Desk | Enter flat ₹4,000 | "Room balance: ₹4,000 · GST settled at checkout" |
| TC-5 | Normal > max error unchanged | Front Desk | ₹4,000 + type 4001 | "Collect exceeds room balance (₹4,000)" |
| TC-6 | Legacy path max discount | CheckInPage `/pms/check-in` | ₹7,950 + type 50 advance | Hint shows "Maximum discount applied", Confirm greyed out |
| TC-7 | Legacy path zero collect at max | CheckInPage | ₹7,950 + advance = 0 | Confirm enabled ✓ |
| TC-8 | Legacy path normal hint | CheckInPage | ₹4,000 | "Room balance: ₹4,000 · GST settled at checkout" |

> **Environment note:** Today-dated check-in booking needed for RID 69 (all current bookings are 26 Oct).

---

## Gate 3 Summary

```
Implementation Plan complete: BUG-512
Edits: 8 (E-A1…E-A4 in CheckInForm, E-B1…E-B4 in CheckInPage)
Execution: Phase 1a (CheckInForm, sequential) ‖ Phase 1b (CheckInPage, sequential)
Pre-condition: BUG-511 must be implemented and compiled first
Files: CheckInForm.jsx · CheckInPage.jsx
MUST NOT CHANGE: L90 collectMax · L256-263 effectiveBalanceDue (backend-compatible)
Risk: CRITICAL (R6) — UI-only, zero backend payload change
Owner decisions: NONE
Self-test: V1-V8 (grep) + REG-1/2/3 (browser) + V9 (webpack)
EXIT GATE: 5 checkboxes
Awaiting Gate 4 GO → IMPLEMENTATION
```
