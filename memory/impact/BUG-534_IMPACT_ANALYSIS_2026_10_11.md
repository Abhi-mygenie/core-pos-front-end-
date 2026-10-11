# BUG-534 — Impact Analysis (Gate 2)

**Item:** BUG-534 — ExtendStayForm Result Panel: Missing "Check-in Discount" Row After Confirm
**Date:** 2026-10-11
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Code Reality:** NONE — fix not applied (confirmed by grep)
**Conflict Pre-Check:** RELATED to BUG-533 (same file, dependency — see §Conflict below)

---

## 1. Summary

After a cashier clicks **Confirm** on the Extend Stay form, the result panel shows:
- `rc.booking_charge = ₹13,400` (rack, correct per contract)
- `rc.sgst = ₹335`, `rc.cgst = ₹335`
- `rc.total_with_gst = ₹14,070` (rack total — correct per contract: no discount applied here)
- `rc.advance_payment = ₹2,000`
- `rc.balance_due = ₹11,020` (server authority — already net of discount — correct)

The **₹1,050 gap** (discount ₹1,000 + GST saving ₹50) between `₹14,070 − ₹2,000 = ₹12,070` and the displayed balance of `₹11,020` is **completely invisible** to the cashier. No row explains it.

**Fix:** Insert 1 JSX line (a conditional "Check-in discount" row) between "Booking charge" and "SGST" in the result panel, using the component-level `discountAmt` variable already available from BUG-533.

---

## 2. Contract (from `extend_stay_charge_fe.md`)

| Field | Semantics |
|---|---|
| `rc.booking_charge` | RACK rent — always, even after extend |
| `rc.total_with_gst` | Rack total incl. GST — **NOT** post-discount |
| `rc.balance_due` | **Server authority** — already net of check-in discount. Do NOT subtract `discountAmt` from it again. |

**CRITICAL:** The fix must display the discount for transparency only. `rc.balance_due` must be rendered as-is.

---

## 3. Data Flow Trace

```
enrichedRow (from BUG-533 hoist in InHousePanel/DeparturesPanel)
  → row.roomDiscountAmount = ₹1,000
  → passed as prop to ExtendStayForm

ExtendStayForm.jsx L33:
  const discountAmt = row.roomDiscountAmount ?? 0;   ← ALREADY AVAILABLE ✓

extendStay() API call
  → result.charge = rc
  → rc.booking_charge = ₹13,400 (rack — backend deployed)
  → rc.sgst = ₹335 · rc.cgst = ₹335
  → rc.total_with_gst = ₹14,070 (rack total — correct per contract)
  → rc.advance_payment = ₹2,000
  → rc.balance_due = ₹11,020 (server authority — correct)

Result panel JSX (L77-83):
  L77: Booking charge  ₹13,400   ← PRESENT
  [MISSING: Check-in discount −₹1,000]
  L78: SGST             ₹335    ← PRESENT
  L79: CGST             ₹335    ← PRESENT
  L80: Total incl. GST  ₹14,070 ← PRESENT (rack, correct per contract)
  L81: Paid so far      ₹2,000  ← PRESENT
  L82: Balance due      ₹11,020 ← PRESENT (server authority, correct)
```

**Break point:** No "Check-in discount" row exists in the result panel JSX (L77–L83). `discountAmt` is available but unused in this block.

---

## 4. Affected File

| File | Path | R5? | Change |
|---|---|---|---|
| `ExtendStayForm.jsx` | `src/components/pms/frontdesk/ExtendStayForm.jsx` | NO | Insert 1 JSX line between L77 and L78 |

**Total:** 1 file · ~2 rendered lines (1 conditional JSX expression + its `<>` wrapper) · NOT R5.

---

## 5. Exact Edit

**Current L77–L78 (unchanged):**
```jsx
<span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
<span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>
```

**After edit (insert between L77 and L78):**
```jsx
<span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
{discountAmt > 0 && <><span className="text-[#767676]">Check-in discount</span><span className="text-right text-[#329937]" data-testid="extend-bill-discount">−{fmtINR(discountAmt)}</span></>}
<span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>
```

**Key safeguards:**
- `discountAmt > 0` guard — non-discounted rooms show nothing (no regression)
- Uses `discountAmt` (component-level, from BUG-533 `row.roomDiscountAmount`) — NOT subtracted from `rc.balance_due`
- `rc.balance_due` rendered unchanged on L82 — server authority preserved
- `data-testid="extend-bill-discount"` added per data-testid mandate

---

## 6. Conflict Pre-Check

| Conflict | Detail |
|---|---|
| **RELATED — BUG-533** | BUG-534 depends on `discountAmt` (L33) which was added by BUG-533 IMPL. BUG-533 is at GATE_5A_IMPLEMENTED — code is live in the file. The variable is present at HEAD. **No blocking conflict — BUG-534 can proceed.** |
| Any other item on `ExtendStayForm.jsx`? | NO — grep of registry/tracker shows no other open items on this file. BUG-533 is the only recent modifier. |

**Execution order:** BUG-534 can be implemented now (BUG-533 code is present). If QA rejects BUG-533 and rolls it back, BUG-534 must wait. Otherwise parallel-safe.

---

## 7. Risk Classification

| Field | Value |
|---|---|
| **Risk** | HIGH (cashier sees unexplained ₹1,050 gap — operational confusion at handoff) |
| **Trigger** | Display gap visible to staff processing a discounted extension |
| **Fast Lane** | ELIGIBLE: 1 file · ≤10 lines · NOT R5 · display-only · no financial formula change · not a hotspot |
| **Owner approval** | Required for Fast Lane. Normal gate: Gate 3 + Gate 4 GO. |

---

## 8. Non-Regression Analysis

**1-night bookings (unextended):** `discountAmt > 0` is false for rooms without a check-in discount → single-row result panel unchanged. Zero regression.

**Extended bookings without discount:** `discountAmt = 0` → guard prevents display. Zero regression.

**`rc.balance_due` formula:** NOT touched. Server sends correct value; FE renders it as-is. Zero financial risk.

**BUG-533 current bill panel (L106-116):** NOT touched. Different JSX block, different data source (`c = row.charge` not `rc = result.charge`).

---

## 9. Files WILL change

```
src/components/pms/frontdesk/ExtendStayForm.jsx  (1 file)
```

## Files WILL NOT touch

```
InHousePanel.jsx · DeparturesPanel.jsx · FolioCheckoutPanel.jsx
pmsService.js · frontDeskService.js · any other file
```

---

## 10. Owner Decisions

None open. Root cause and fix are unambiguous. `rc.balance_due` must remain unchanged — confirmed by contract doc.

---

## 11. Verification (seeds Gate 3 Verification Matrix)

| # | Check | Method |
|---|---|---|
| V1 | Discounted booking (bonk r4): result panel shows "Check-in discount −₹1,000" row between Booking charge and SGST | Browser — extend r4, click Confirm, inspect result panel |
| V2 | `rc.balance_due` still shows ₹11,020 unchanged | Browser — same flow, verify Balance due row |
| V3 | Non-discounted booking: no "Check-in discount" row in result panel | Browser — extend non-discounted room, verify row absent |
| V4 | `data-testid="extend-bill-discount"` present in DOM when `discountAmt > 0` | DevTools element inspector |
| V5 | Webpack compiles with 0 new warnings | `yarn start` log |

---

## 12. Registry Checklist (Post-Code — for Implementation agent)

```
- [ ] registry.json: BUG-534 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: ExtendStayForm.jsx BUG-534 row added
- [ ] Code marker: // BUG-534 in modified line
```
