# BUG-534 — Implementation Plan (Gate 3)

**Item:** BUG-534 — ExtendStayForm Result Panel: Missing "Check-in Discount" Row After Confirm
**Date:** 2026-10-11
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Impact Analysis:** `impact/BUG-534_IMPACT_ANALYSIS_2026_10_11.md`
**Code Reality (re-verified at HEAD):** NONE — anchors match IA exactly
**Risk:** HIGH
**Sprint:** oct_bug_batch

---

## Scope Lock

### Files WILL change
```
src/components/pms/frontdesk/ExtendStayForm.jsx   (1 edit)
```

### Files WILL NOT touch
```
InHousePanel.jsx · DeparturesPanel.jsx · FolioCheckoutPanel.jsx
pmsService.js · frontDeskService.js · money.js
CollectPaymentPanel.jsx (R5) · orderTransform.js (R5)
Any test file · Any other file
```

If scope expands beyond this list → STOP, re-declare, get owner approval.

---

## Entry Verification (Implementation agent runs this before touching code)

```bash
# Confirm L77 anchor
sed -n '77p' /app/frontend/src/components/pms/frontdesk/ExtendStayForm.jsx
# Expected: <span className="text-[#767676]">Booking charge</span>...extend-bill-charge...

# Confirm L78 anchor
sed -n '78p' /app/frontend/src/components/pms/frontdesk/ExtendStayForm.jsx
# Expected: <span className="text-[#767676]">SGST</span>...extend-bill-sgst...

# Confirm discountAmt available at component level
sed -n '33p' /app/frontend/src/components/pms/frontdesk/ExtendStayForm.jsx
# Expected: const discountAmt = row.roomDiscountAmount ?? 0; // BUG-533
```

If any anchor differs → **STOP. Return to Planning.**

---

## Edit E1 — Insert "Check-in discount" row in result panel

**File:** `src/components/pms/frontdesk/ExtendStayForm.jsx`
**Where:** After L77 (Booking charge row), before L78 (SGST row) — inside the result panel bill grid

**Current (L77–L78):**
```jsx
            <span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>
```

**After (L77–L79, new line inserted):**
```jsx
            <span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
            {discountAmt > 0 && <><span className="text-[#767676]">Check-in discount</span><span className="text-right text-[#329937]" data-testid="extend-bill-discount">−{fmtINR(discountAmt)}</span></>} {/* BUG-534 */}
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>
```

**Implementation agent uses `search_replace`:**
```
old_str:
            <span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>

new_str:
            <span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
            {discountAmt > 0 && <><span className="text-[#767676]">Check-in discount</span><span className="text-right text-[#329937]" data-testid="extend-bill-discount">−{fmtINR(discountAmt)}</span></>} {/* BUG-534 */}
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>
```

**Key design decisions (all locked from investigation):**
- `discountAmt > 0` guard — no row for non-discounted rooms
- Uses component-level `discountAmt` (= `row.roomDiscountAmount ?? 0`, L33) — no new import needed
- `rc.balance_due` on L82 **left completely untouched** — server authority
- `rc.total_with_gst` on L80 **left completely untouched** — rack total per contract
- Green colour (`text-[#329937]`) matches the check-in discount styling in pre-confirm "Current bill" panel
- `data-testid="extend-bill-discount"` per data-testid mandate

---

## Execution Sequence

1. Run Entry Verification (3 greps above)
2. Apply E1 via `search_replace`
3. Verify webpack compiles — `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully"
4. Run self-verification V1–V4 (see Verification Matrix below)
5. Execute EXIT GATE (5 checkboxes)
6. Write QA Handover

---

## Verification Matrix (Step 4)

| # | Edit | File | Change | How to Verify | Automated? |
|---|---|---|---|---|---|
| V1 | E1 | ExtendStayForm.jsx | Discount row present when discountAmt > 0 | Browser: extend bonk r4 (discount ₹1,000) → Confirm → result panel shows "Check-in discount −₹1,000" between Booking charge and SGST | NO |
| V2 | E1 | ExtendStayForm.jsx | `rc.balance_due` = ₹11,020 unchanged | Browser: same flow — Balance due row still ₹11,020 | NO |
| V3 | E1 | ExtendStayForm.jsx | No row for non-discounted room | Browser: extend a non-discounted room → Confirm → no "Check-in discount" row visible | NO |
| V4 | E1 | ExtendStayForm.jsx | `data-testid="extend-bill-discount"` in DOM | DevTools: inspect element — `extend-bill-discount` present when discountAmt > 0 | NO |
| V5 | E1 | ExtendStayForm.jsx | Webpack clean | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully" with 0 new warnings | YES |

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | `discountAmt` is 0 for this guest (no check-in discount) → row not shown | By design | `discountAmt > 0` guard handles correctly |
| R2 | BUG-533 rolled back after QA failure → `discountAmt` undefined | Low (BUG-533 is live at HEAD) | `?? 0` fallback on L33 means worst case: guard is false, row not shown. No crash. |
| R3 | Line drift since IA written | None — verified at HEAD 2026-10-11 same session | — |

---

## Post-Code Registry Checklist (Step 5)

Implementation agent MUST execute after coding:

```
- [ ] registry.json: BUG-534 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: ExtendStayForm.jsx — BUG-534 IMPL 2026-10-11 row added
- [ ] Code marker: // BUG-534 comment present on the inserted line
- [ ] Compile check: webpack 0 new warnings
```

---

## QA Handover Seed

Test credentials: `owner@thegoankitchen.com` / `Qplazm@10` (RID 69)
Test booking: bonk r4 · check-in discount ₹1,000 · 1 night pre-extension
Test flow: InHouse → row expand → Extend → pick +1 night date → reason → Confirm → inspect result panel

Expected result panel order:
```
Booking charge      ₹13,400
Check-in discount  −₹1,000   ← NEW
SGST                  ₹335
CGST                  ₹335
Total (incl. GST)  ₹14,070
─────────────────────────────
Paid so far         ₹2,000
Balance due        ₹11,020
```
