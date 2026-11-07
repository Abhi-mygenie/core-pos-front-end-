# BUG-535 — Implementation Plan (Gate 3)

**Item:** BUG-535 — FolioCheckoutPanel: `discountedPrice * nights` Causes Wrong GST Slab for Multi-Night Bookings After Extension
**Date:** 2026-10-11
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Impact Analysis:** `impact/BUG-535_IMPACT_ANALYSIS_2026_10_11.md`
**Code Reality (re-verified at HEAD):** NONE — anchors match IA exactly
**Risk:** HIGH
**Sprint:** oct_bug_batch
**OD-535-01:** RESOLVED — BE deployed 2026-10-11
**OD-535-02:** RESOLVED — normal gate process, no feature flag (owner 2026-10-11)

---

## Scope Lock

### Files WILL change
```
src/components/pms/frontdesk/FolioCheckoutPanel.jsx   (2 edits — L248, L253)
```

### Files WILL NOT touch
```
ExtendStayForm.jsx · InHousePanel.jsx · DeparturesPanel.jsx
pmsService.js · frontDeskService.js · roomGstCalculator.js
CollectPaymentPanel.jsx (R5) · orderTransform.js (R5) · DashboardPage.jsx (R5)
Any test file · Any other file
```

If scope expands beyond this list → STOP, re-declare, get owner approval.

---

## Entry Verification (Implementation agent runs this before touching code)

```bash
# Confirm L248 anchor
sed -n '248p' /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Expected: ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)

# Confirm L253 anchor
sed -n '253p' /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Expected: ? gst.gstTotal / (discountedPrice * nights) : 0;   // BUG-517

# Confirm no BUG-535 marker already present (code reality = NONE)
grep -n "BUG-535" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Expected: empty output
```

If any anchor differs → **STOP. Return to Planning.**

---

## Edit E1 — Remove `* nights` from `computeRoomGst` call (L248)

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**Line:** 248 (inside the `baseBalance / displaySgst / displayCgst / maxCheckoutDiscount` useMemo)

**Current:**
```js
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
```

**After:**
```js
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice, nights, 1)          // BUG-535: discountedPrice = total-stay; nights handled inside computeRoomGst
```

**Why:** `discountedPrice = bc − discountAmt` where `bc = charge.booking_charge` = rack total for ALL nights (e.g. ₹12,400 for 2 nights after BE fix). `computeRoomGst` divides `totalAmount` by `nights` internally to get `nightlyUnit`. Passing `discountedPrice * nights` gives `nightlyUnit = discountedPrice` (full total, not per-night) → wrong slab.

**Verification:** `computeRoomGst(applicable, slabs, ₹12,400, 2, 1)` → `nightlyUnit = ₹6,200` → 5% slab → `gstTotal = ₹620` ✓

**Implementation agent `search_replace`:**
```
old_str:
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)

new_str:
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice, nights, 1)          // BUG-535: discountedPrice = total-stay; nights handled inside computeRoomGst
```

---

## Edit E2 — Remove `* nights` from `gstRate` denominator (L253)

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**Line:** 253 (immediately below E1, same useMemo)

**Current:**
```js
      ? gst.gstTotal / (discountedPrice * nights) : 0;                          // BUG-517
```

**After:**
```js
      ? gst.gstTotal / discountedPrice : 0;                                     // BUG-517, BUG-535: discountedPrice = total-stay
```

**Why:** `gstRate` feeds `maxCheckoutDiscount = base − floor(advance × gstRate)`. With `* nights` in denominator: `gstRate = ₹620 / ₹24,800 = 0.025` (half correct). After fix: `gstRate = ₹620 / ₹12,400 = 0.05` ✓. This corrects the checkout discount cap for multi-night bookings.

**1-night note:** `discountedPrice * 1 = discountedPrice` — the `* nights` was a no-op for all existing 1-night bookings. Zero regression.

**Implementation agent `search_replace`:**
```
old_str:
      ? gst.gstTotal / (discountedPrice * nights) : 0;                          // BUG-517

new_str:
      ? gst.gstTotal / discountedPrice : 0;                                     // BUG-517, BUG-535: discountedPrice = total-stay
```

---

## Execution Sequence

1. Run Entry Verification (3 greps above)
2. Apply E1 (`search_replace` on `discountedPrice * nights` in computeRoomGst call)
3. Apply E2 (`search_replace` on `gst.gstTotal / (discountedPrice * nights)`)
4. Verify webpack compiles — `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully"
5. Run self-verification V1–V6 (see Verification Matrix below)
6. Execute EXIT GATE (5 checkboxes)
7. Write QA Handover

**Note:** E1 and E2 are in the same useMemo block and can be applied in a single session. Neither depends on the other's output — both are independent removals of `* nights`.

---

## Verification Matrix (Step 4)

| # | Edit | File | Change | How to Verify | Automated? |
|---|---|---|---|---|---|
| V1 | E1 + E2 | FolioCheckoutPanel.jsx | 2-night extended booking (bonk r4): SGST ₹310 · CGST ₹310 · Room balance ₹11,020 | Browser: open Bill after extend r4 (2 nights, discount ₹1,000) → inspect folio bill | NO |
| V2 | E1 + E2 | FolioCheckoutPanel.jsx | 1-night booking (any): folio balances unchanged vs pre-fix | Browser: open Bill on any 1-night non-extended booking — values identical to before | NO |
| V3 | E1 + E2 | FolioCheckoutPanel.jsx | Non-discounted 2-night: correct GST slab (no regression from fix) | Browser: extend a non-discounted room to 2 nights → open Bill → verify GST correct | NO |
| V4 | E1 | FolioCheckoutPanel.jsx | `computeRoomGst` called with `discountedPrice` (not `* nights`) | `grep -n "discountedPrice \* nights" FolioCheckoutPanel.jsx` → empty output | YES |
| V5 | E2 | FolioCheckoutPanel.jsx | `gstRate` denominator = `discountedPrice` only | `grep -n "gstTotal / (discountedPrice \* nights)" FolioCheckoutPanel.jsx` → empty output | YES |
| V6 | E1+E2 | FolioCheckoutPanel.jsx | Webpack clean | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully" 0 new warnings | YES |

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | 1-night regression | None — `* 1` was no-op; after fix same value | V2 covers this |
| R2 | `discountedPrice = 0` (no discount, GST applicable = false) | Covered — `discountedPrice > 0` guard at L247 short-circuits; E1/E2 line not reached | No change to guard |
| R3 | `roomGstApplicable = false` (restaurant has no room GST) | Covered — same guard at L247; ternary returns `{ gstTotal:0, sgst:0, cgst:0 }` unchanged | No change |
| R4 | BUG-517 useMemo structure disturbed | None — only removing `* nights` suffix on 2 values; all variable names, deps array, return object unchanged | Check compile |
| R5 | Line drift | None — verified at HEAD same session (2026-10-11) | Entry Verification greps confirm |

---

## Post-Code Registry Checklist (Step 5)

Implementation agent MUST execute after coding:

```
- [ ] registry.json: BUG-535 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated to GATE_5A_IMPLEMENTED, remove "BE co-deploy required" note
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-535 IMPL 2026-10-11 row added (L248 + L253)
- [ ] Code markers: // BUG-535 comment on both changed lines (already included in new_str above)
- [ ] Compile check: webpack 0 new warnings
```

---

## QA Handover Seed

**Test credentials:** `owner@thegoankitchen.com` / `Qplazm@10` (RID 69)
**Test booking:** bonk r4 · originally 1 night · extended to 2 nights · check-in discount ₹1,000 · advance ₹2,000 · bp ₹10,400

**Primary test (V1):**
1. Login → Front Desk → InHouse tab → r4 row expand → Bill
2. Verify folio bill shows:

| Field | Expected | Was (before FE fix) |
|---|---|---|
| SGST | ₹310 | ₹2,232 |
| CGST | ₹310 | ₹2,232 |
| Room balance | ₹11,020 | ₹14,864 |

**Regression test (V2):**
- Open Bill on any 1-night non-extended booking → values unchanged

**Non-discounted 2-night regression (V3):**
- Extend a non-discounted room to 2 nights → open Bill → GST at correct slab for that room rate
