# BUG-506-REV + BUG-508 — Impact Analysis (Gate 2)

**IDs:** BUG-506 (revision) + BUG-508 (unparked)
**Date:** 2026-10-07
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent
**Code Reality:** PARTIAL — two defects confirmed at HEAD (details §3)
**Conflict Pre-Check:** CLEAN — CheckInForm.jsx L96-103, L287 last touched by BUG-506+507 IMPL 2026-10-07 (same series). No other open item touches these lines.
**Phase:** PMS → New Booking + Check-In (same series as BUG-490 → BUG-507)
**Investigation:** `investigations/INV-CHECKINFORM-STRIP-BALANCE-2026_10_07.md`

---

## 1. Are these part of the previous bug fix?

**Yes — directly.**

| BUG-506 (revision) | BUG-508 (unpark) |
|-------------------|-----------------|
| BUG-506 was implemented 2026-10-07. The `displayBalance` conditional formula (`bc−disc−advance`) is correct at zero and max discount but **wrong for partial discounts** — it excludes the recalculated GST. | BUG-508 was discovered 2026-10-07 and parked as "LOW priority — 2.50 discrepancy only." Owner screenshots now confirm it causes the strip to show ₹1,102.50 (wrong) instead of ₹1,050 at max discount. No longer low priority. |
| Root: the conditional used `bc − discount − advance` (no GST) for all non-zero discounts. | Root: `displayGstTotal` useMemo applies 5% to `gstBase = 1,050 = advance + gstOnAdv`, computing GST on the GST-on-advance component. |

Both are resolved by the **same unified fix** — 3 edits, 1 file.

---

## 2. Owner-confirmed expected values (from this session)

| Scenario | Balance due (current) | Balance due (correct) | Strip Total incl. GST (current) | Strip (correct) |
|---------|----------------------|----------------------|-------------------------------|-----------------|
| Zero discount | ₹9,620 ✅ | ₹9,620 | — (strip hidden) | — |
| Partial ₹6,000 | ₹2,000 ❌ | **₹2,150** | ₹3,150 ✅ | ₹3,150 |
| Max ₹7,950 | ₹50 ✅ | ₹50 | ₹1,102.50 ❌ | **₹1,050** |

---

## 3. Code Reality (confirmed at HEAD)

### Defect D-1 — `displayBalance` wrong for partial discount (L96-98)

```javascript
// L96-98 CURRENT (BUG-506 implementation — partial defect):
const displayBalance = roomDiscountRs > 0
  ? Math.max(gstOnAdvFloor, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))
  : Number(c.total_with_gst || 0) - Number(c.advance_payment || 0);
```

When `roomDiscountRs > 0`: formula = `bc − disc − advance` — **no GST included**.
At ₹6,000 discount: `max(50, 9000−6000−1000) = 2,000` ← WRONG (should be 2,150)
At ₹7,950 max: `max(50, 9000−7950−1000) = 50` ← correct by coincidence

The `bc − disc − advance` formula is missing the recalculated GST for partial discounts.

### Defect D-2 — `displayGstTotal` compound error at max (L100-103)

```javascript
// L100-103 CURRENT:
const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst } = useMemo(() => {
    const gstBase = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs);
    return computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1);
}, [c.booking_charge, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights]);
```

At max discount: `gstBase = 1,050 = advance(1,000) + gstOnAdv(50)`
`computeRoomGst(slabs, 1050, 1, 1) = 5%×1050 = 52.50`
BUT correct = `5%×1000 = 50` (GST on advance principal only, not on gstOnAdv itself)

Compound: `5%×50 = ₹2.50` = GST on the already-preserved GST component.

### Defect D-3 — Strip "Total incl. GST" wrong at max (L287)

```javascript
// L287 CURRENT:
(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs) + displayGstTotal)
= 1050 + 52.50 = 1102.50  ← WRONG (should be 1050)
```

---

## 4. Data Flow Trace

```
User enters roomDiscountRs (flat ₹ or %) → capped at maxFlat
  ↓
displayGstTotal useMemo (L100-103):
  gstBase = bc − roomDiscountRs
  computeRoomGst(slabs, gstBase, ...)
  → at partial: 5%×3000 = 150  ✅ (correct)
  → at max:     5%×1050 = 52.50 ❌ (compound error — gstBase includes gstOnAdv)
  ↓
displayBalance (L96-98):
  → zero:    total_with_gst − advance = 9620  ✅
  → partial: max(50, bc−disc−advance) = 2000  ❌ (ignores displayGstTotal=150)
  → max:     max(50, bc−disc−advance) = 50    ✅ (correct by coincidence)
  ↓
Balance due JSX (L209-210):  fmtINR(displayBalance)
  → zero:    ₹9,620  ✅
  → partial: ₹2,000  ❌ (should be ₹2,150)
  → max:     ₹50     ✅
  ↓
Strip "Total incl. GST" JSX (L287): gstBase + displayGstTotal
  → partial: 3000 + 150 = ₹3,150  ✅
  → max:     1050 + 52.50 = ₹1,102.50  ❌ (should be ₹1,050)

BREAK POINTS:
  D-1: L96-97 — conditional branch drops GST for partial
  D-2: L101 — gstBase includes gstOnAdv at max → compound
  D-3: L287 — uses raw gstBase (1050) not corrected base (1000) at max
```

---

## 5. Fix — Unified `computeBase` approach

Both D-1, D-2, and D-3 are solved by ONE structural change: the `displayGstTotal` useMemo computes on `computeBase` (not raw `gstBase`), and `displayBalance` is replaced with `computeBase + displayGstTotal − advance`.

```
computeBase guard:
  when gstBase ≤ advance + gstOnAdvFloor  →  use advance  (at max: avoids compound GST)
  when gstBase > advance + gstOnAdvFloor  →  use gstBase  (at partial/zero: normal)

Result table:
  disc=0:     computeBase=9000, GST=1620, balance=9620, strip=10620  ✅
  disc=6000:  computeBase=3000, GST=150,  balance=2150, strip=3150   ✅
  disc=7950:  computeBase=1000, GST=50,   balance=50,   strip=1050   ✅
```

**Key property:** `displayBalance = computeBase + displayGstTotal − advance`
No conditional needed. `gstOnAdvFloor` (already at L95) reused as the threshold.

---

## 6. Affected Files

### Files WILL change:
| File | Lines | Nature |
|------|-------|--------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L95-98 (displayBalance), L100-103 (displayGstTotal useMemo), L287 (strip Total incl. GST) | Revision of BUG-506 + BUG-508 |

### Files will NOT touch:
| File | Reason |
|------|--------|
| `CheckInForm.jsx` L90 `collectMax` | Backend-compatible formula — must NOT change (BUG-500/OD-500-04) |
| `CheckInPage.jsx` | Not affected — has no bill grid balance display |
| `CheckInForm.jsx` L86-88 (`discountOverMax`) | BUG-507 fix — correct, not touching |
| `CheckInForm.jsx` L105-111 (`displayGstRate`) | At max discount, both 1,050 and 1,000 are in the 5% slab — slab badge stays "5% Slab" ✅ |
| `CheckInForm.jsx` L196-210 (bill grid static values) | BUG-505 fix — not touching |

---

## 7. Downstream Consumer Analysis

| Consumer | Uses | Impact after fix |
|----------|------|-----------------|
| `Balance due` JSX (L209-210) | `displayBalance` | Correct at all discount levels ✅ |
| Strip "Total incl. GST" (L287) | `bc−disc + displayGstTotal` → changes to `displayGstBase + displayGstTotal` | ₹1,050 at max (was ₹1,102.50) ✅ |
| Strip CGST/SGST (L274-280) | `displayCgst`, `displaySgst` | From same useMemo — auto-corrected to ₹25/₹25 at max ✅ |
| Strip Total GST (L282-284) | `displayGstTotal` | ₹50 at max (was ₹52.50) ✅ |
| Strip slab badge (L258) | `displayGstRate` | Uses own useMemo — unaffected (both 1000+1050 → 5% slab) ✅ |
| `collectMax` (L90) | NOT changed | Stays backend-compatible ✅ |
| Confirm button (L313) | `discountOverMax`, `collectOverMax` | Not affected ✅ |

---

## 8. Risk Classification

**Risk: HIGH**
- Trigger: Financial display — balance due wrong at partial discounts; GST strip shows wrong values
- `displayBalance` and strip use the same corrected `displayGstBase` source
- No API change, no backend payload change (collectMax stays unchanged)
- Confined to 1 file, 3 edit sites

**Fast Lane eligible: NO** — financial display logic (Rule R6)

---

## 9. Open Decisions

**None.** All formulas mathematically confirmed this session:
- Owner confirmed: balance = 9,620 at zero, 50 at max ✅
- Owner confirmed: GST strip shows recalculated values ✅
- Investigation confirmed: ₹2,150 correct at partial (GST-inclusive) ✅
- `computeBase` guard eliminates compound error ✅

---

## 10. Registry

BUG-506 status: `GATE_5A_IMPLEMENTED` → needs revision to `GATE_5A_IMPLEMENTED (REVISION PENDING)`
BUG-508: register and advance to `GATE_2_IMPACT_ANALYSIS`
Sprint: `oct_bug_batch`
Artifact: `impact/BUG-506-REV_BUG-508_IMPACT_ANALYSIS.md`
