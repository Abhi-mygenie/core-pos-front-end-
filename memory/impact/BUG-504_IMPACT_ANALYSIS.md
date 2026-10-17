# BUG-504 — Impact Analysis (Gate 2)

**ID:** BUG-504
**Date:** 2026-10-07
**Author:** PLANNING agent
**Risk:** CRITICAL (financial safeguard — incorrect discount cap allows over-discounting)
**Code Reality:** PARTIAL — BUG-496 formula partially correct but omits GST-on-advance rule
**Conflict Pre-Check:** CLEAN — BUG-496/492/495/500 all GATE_5A_IMPLEMENTED; no open item on target lines
**Related:** BUG-496 (parent formula, superseded for this aspect)

---

## 1. Owner Business Rule (LOCKED)

"Maximum discount = due balance (excl. GST) − GST collected on the advance payment"

```
gst_on_advance = computeRoomGst(applicable, slabs, advance, nights, 1).gstTotal
               = nightlyUnit(advance/nights/rooms) → slab lookup → gstTotal

max_flat       = max(0, (bc − advance) − gst_on_advance)
max_pct_display = (max_flat / bc × 100)   [shown with decimal precision — see OD-504-02]
```

**Why this rule:** The advance payment implicitly collected GST (at the slab rate applicable to the advance amount per night). After checkout, that GST must be remitted. If the full discount is given, the remaining balance may be zero, but the GST obligation remains. The cap ensures the remaining balance covers at least the GST on the advance.

**Numeric proof (owner's scenario):**
```
bc=9000, advance=1000, nights=1, slabs={0-7500:5%, >7500:18%}

gst_on_advance:
  computeRoomGst(applicable=true, slabs, totalAmount=1000, nights=1, rooms=1)
  → nightlyUnit = 1000/1/1 = 1000
  → slab: 1000 >= 0 and 1000 <= 7500 → 5% slab
  → gstTotal = round2dp(1000 × 0.05) = 50.00

max_flat = (9000 − 1000) − 50 = 7,950
max_pct  = 7950/9000 × 100 = 88.333...%  → "88.33%" (2dp) or "88%" per OD-504-02
```

**Second case (18% slab — e.g. advance=9000/1 night):**
```
nightlyUnit = 9000 → 18% slab → gst_on_advance = 1620
max_flat = (bc−9000) − 1620 → depends on bc
If bc=9000, adv=9000: max_flat = 0 − 1620 → max(0,...) = 0 (full advance, no more discount)
```
The owner confirmed: "if 18% → 180" (meaning advance=1000, if the slab were 18%: gst=180, max=7820, pct=86.89%).

---

## 2. Current Code State

### CheckInForm.jsx (L59-82)
```javascript
// BUG-496: cap = bc − advance (OD-496-01)
const roomDiscountRs = useMemo(() => {
  const raw = parseFloat(ciRoomDiscountAmt) || 0;
  if (raw <= 0) return 0;
  const bc  = Number(c.booking_charge  || 0);
  const cap = Math.max(0, bc - Number(c.advance_payment || 0));  // ← 8000, no gst deducted
  ...
}, [...]);

// BUG-496: maxPct = floor((bc − advance) / bc × 100)
const maxPct = useMemo(() => {
  const bc      = Number(c.booking_charge  || 0);
  const advance = Number(c.advance_payment || 0);
  if (!bc) return 100;
  return Math.floor(Math.max(0, bc - advance) / bc * 100);  // ← floor(88.88) = 88
}, [c.booking_charge, c.advance_payment]);

// Alert text (L219):
Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)})
// = "88% (₹7920)" — floor of floor causes double-rounding loss
```

### CheckInPage.jsx (L277-282)
```javascript
// BUG-496: maxPct = floor((bc − bookingAdv) / bc × 100)
const maxPct = useMemo(() => {
  const bc         = Number(form?.orderAmount || 0);
  const bookingAdv = Number(selected?.charge?.advance_payment || 0);
  if (!bc) return 100;
  return Math.floor(Math.max(0, bc - bookingAdv) / bc * 100);  // ← same: 88
}, [form?.orderAmount, selected?.charge?.advance_payment]);

// Alert text (L920):
Maximum discount: {maxPct}% (₹{Math.floor(Number(form?.orderAmount||0)*maxPct/100)})
// = "88% (₹7920)"
```

---

## 3. Data Flow Trace

**Required data for BUG-504:**

| Data point | CheckInForm.jsx source | CheckInPage.jsx source |
|-----------|----------------------|----------------------|
| `bc` (booking charge) | `c.booking_charge` (row.charge) | `form.orderAmount` |
| `advance` | `c.advance_payment` (row.charge) | `selected?.charge?.advance_payment` |
| `nights` | `row.nights ?? 1` | `formNights ?? 1` |
| `applicable` | NOT present — needs OD-503-01 | `roomGstApplicable` (BUG-386) |
| `slabs` | NOT present — needs BUG-503 | `roomGstSlabs` (BUG-386) |
| `computeRoomGst` | NOT imported — needs BUG-503 | Imported (BUG-386, L12) |

**Key finding:** CheckInPage.jsx has ALL required data. Only the formula needs to change.
CheckInForm.jsx is MISSING `applicable`, `slabs`, and `computeRoomGst` — provided by BUG-503.

**Break point (both files):**
`gst_on_advance` is never computed. `cap` and `maxPct` use `bc − advance` without deducting `gst_on_advance`.

---

## 4. Affected Files and Lines

### CheckInPage.jsx (INDEPENDENT — no BUG-503 dependency)

| Site | Line | Current | Change |
|------|------|---------|--------|
| `maxPct` useMemo | L277-282 | `floor((bc−adv)/bc×100)` | Compute `gst_on_advance = computeRoomGst(applicable, slabs, advance, nights, 1).gstTotal`; `max_flat = max(0, bc-adv-gst_on_advance)`; return decimal pct or floor — see OD-504-02 |
| `roomDiscountRs` useMemo cap | L267-274 | `cap = effectiveBalanceDue` | `effectiveBalanceDue` already uses the right no-GST formula; the cap works. **But the input `max` attribute for Amount mode** (L903) uses `effectiveBalanceDue` which = `bc - rawDiscount - bookingAdv` (changes as you type). The `max` attr should use `max_flat` (static). See §5 analysis |
| Discount input `max` attr | L903 | `effectiveBalanceDue` | Replace with pre-computed `max_flat` (no rawDiscount in the cap — cap is independent of entered discount) |
| Alert text | L920 | `floor(orderAmount × maxPct / 100)` | Show `max_flat` directly (e.g. `₹7,950`) not re-derived from floor'd % |

### CheckInForm.jsx (DEPENDS ON BUG-503 infrastructure)

| Site | Line | Current | Change |
|------|------|---------|--------|
| `maxPct` useMemo | L70-75 | `floor((bc−adv)/bc×100)` | Same formula change as CheckInPage.jsx; uses `c.advance_payment`, `row.nights`, `roomGstSlabs` from BUG-503 |
| `roomDiscountRs` cap | L63 | `bc − advance` | Replace with `max_flat` |
| Discount input `max` attr | L201 | `bc − advance` | Replace with `max_flat` |
| Alert text | L219 | `floor(bc × maxPct / 100)` | Show `max_flat` directly |

**Files WILL NOT touch:** FolioCheckoutPanel.jsx · pmsService.js · frontDeskService.js

---

## 5. `effectiveBalanceDue` Analysis (CheckInPage.jsx — important nuance)

Current `effectiveBalanceDue` (BUG-500, L253-263):
```javascript
return Math.max(0, base - rawDiscount - bookingAdv);
// = 9000 - rawDiscount - 1000
// At 0% discount: 8000. At 88% discount: 80. At 100% discount: 0.
```

This is the **Collect Now** cap (how much the staff can collect today after discount). It is NOT the discount cap. These are two different things:

| Concept | Formula | Use |
|---------|---------|-----|
| `max_flat` (discount cap) | `(bc − adv) − gst_on_adv` = 7,950 | Maximum discount that can be given |
| `effectiveBalanceDue` | `bc − rawDiscount − bookingAdv` | Maximum that can be collected NOW after discount |

**For the discount Amount input max:** The correct value is `max_flat` (static, independent of what's currently typed). Using `effectiveBalanceDue` causes the max to shrink as the user types more discount, creating a confusing loop.

For CheckInForm.jsx L201, the current code already uses `bc − advance` (not `effectiveBalanceDue`). This becomes `max_flat` after BUG-504.

---

## 6. Owner Decisions (OPEN — must be answered before Gate 3)

### OD-504-01 — LOCKED (from investigation 2026-10-07)
Use `computeRoomGst(applicable, slabs, advance, nights, 1).gstTotal` for `gst_on_advance`.
- CheckInForm.jsx: `nights = row.nights ?? 1`
- CheckInPage.jsx: `nights = formNights ?? 1`

### OD-504-02 (OPEN) — Percentage format in alert and maxPct value

**Context:** Current `floor((bc−adv)/bc×100) = 88`. Owner stated "88.32%" (suggesting decimal display). The true value is 88.33%. `floor(88.33) = 88` → `88 × 9000/100 = 7920` (wrong flat amount in alert text).

**Option A — Decimal precision, `toFixed(2)` (RECOMMENDED):**
```javascript
const max_flat = Math.max(0, bc - advance - gst_on_advance);  // = 7950
const max_pct  = (max_flat / bc * 100).toFixed(2);             // = "88.33"
// Alert: "Maximum discount: 88.33% (₹7,950)..."
// discountOverMax trigger: Number(ciRoomDiscountAmt) > Number(max_pct)
```
- Matches owner's expectation ("88.32%" meant decimal precision)
- `max_flat` shown directly in alert (not re-derived from pct)
- `discountOverMax` compared against decimal string max_pct

**Option B — Floor % with correct flat:**
```javascript
const max_flat = Math.max(0, bc - advance - gst_on_advance);  // = 7950
const max_pct  = Math.floor(max_flat / bc * 100);              // = 88 (integer, as now)
// Alert: "Maximum discount: 88% (₹7,950)..." — note: ₹7,950 not ₹7,920
// discountOverMax trigger: roomDiscountRs > max_flat (₹ comparison, not % comparison)
```
- Keeps integer % for the visual
- Still shows correct ₹7,950 (not ₹7,920)
- % trigger also correct (88% × 9000 = 7920 < max_flat 7950 → no false alert at exactly 88%)

**Agent recommendation: Option A (decimal)** — more precise, owner said "88.32%", eliminates the confusing gap where 88% looks like the cap but allows 7920 while actual cap is 7950.

---

### OD-504-03 (OPEN) — `discountOverMax` trigger condition

**Currently:** `ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct`
This only shows the alert for Percent mode, not Amount mode.

**Option A — Keep Percent-only trigger with decimal comparison:**
```javascript
const discountOverMax = ciRoomDiscountType === 'Percent' && Number(ciRoomDiscountAmt) > Number(max_pct);
```
Simple extension of current behavior.

**Option B — Unified ₹ comparison (RECOMMENDED):**
```javascript
const discountOverMax = roomDiscountRs > max_flat;
// Works for both Amount AND Percent mode
// roomDiscountRs is already capped at max_flat (after BUG-504 fix to the cap)
// So this condition is ONLY true when the % mode has rounded-up resolution
```
Actually, after the BUG-504 fix, `roomDiscountRs` is capped at `max_flat`. So `roomDiscountRs > max_flat` would never be true. 

Revised Option B: Show alert when `ciRoomDiscountType === 'Percent' && roomDiscountRs === max_flat && Number(ciRoomDiscountAmt) > Number(max_pct)`?

Actually on reflection, the alert's purpose is to tell the staff "you entered more than the cap, we've silently capped it." This is useful in % mode only. In Amount mode, the input `max` attribute prevents entering more than `max_flat`. So Option A (Percent-only) is correct.

**Agent recommendation: Option A** — alert is only meaningful in % mode; Amount mode is self-limiting via `max` attribute.

---

## 7. Risk Assessment

| Area | Risk | Notes |
|------|------|-------|
| Financial safeguard | CRITICAL — current cap allows ₹50 more discount than safe | Staff can give ₹7,950 now shows ₹8,000 as cap |
| Alert mis-communication | HIGH — shows "₹7,920" as max but actual max is ₹7,950 | 30-rupee confusing gap |
| Regression: effectiveBalanceDue | MEDIUM | effectiveBalanceDue (Collect Now cap) must not be changed — it uses its own correct formula |
| Regression: roomDiscountRs | LOW | Only cap value changes (from `bc-adv` to `max_flat`); the resolution formula is unchanged |
| BUG-503 dependency | HIGH | CheckInForm.jsx fix requires BUG-503 shipped first |

---

## 8. Execution Order

```
BUG-503 (CheckInForm.jsx infra: imports + hook + formNights)
   ↓
BUG-504 CheckInForm.jsx (uses BUG-503 infrastructure)
         — in parallel —
BUG-504 CheckInPage.jsx (independent, all infra already present)
```

Can be implemented as: `BUG-503 + BUG-504(CheckInPage.jsx)` in one pass, then `BUG-504(CheckInForm.jsx)` after BUG-503 is verified. OR all in one implementation batch since BUG-503 is in the same file.

---

## 9. Verification Matrix (seeds QA handover)

| # | Check | Expected | How |
|---|-------|----------|-----|
| V1 | Open CheckInForm: bc=9000, adv=1000, 1 night, 5% slab on adv | max_flat=7950, alert text "7,950" not "7,920" | Browser |
| V2 | Amount input max attr = 7950 | Can't type more than 7950 in Amount mode | Browser DevTools: inspect max attr |
| V3 | Enter 100% in % mode → resolves to 7950 flat (not 8000) | roomDiscountRs=7950, balance=50 | Browser |
| V4 | Enter 88% in % mode → no alert (88% × 9000 = 7920 < 7950 = valid) | No red alert at exactly 88% | Browser |
| V5 | Enter 88.34%+ → alert shows "88.33% (₹7,950)" (or per OD-504-02 choice) | Alert text correct | Browser |
| V6 | CheckInPage.jsx same behavior | As V1-V5 | Browser at /pms/check-in |
| V7 | Walk-in (no advance, adv=0): max_flat = bc − 0 − gstOnAdv(0) = 9000 | No cap restriction for walk-in | Browser |
| V8 | effectiveBalanceDue (Collect Now cap) unchanged | Collect Now still works correctly | Browser: try to over-collect |
| V9 | webpack 0 new warnings | — | tail frontend.out.log |

---

## Post-Code Registry Checklist (for Implementation agent)
```
- [ ] registry.json: BUG-504 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-504 row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-504 2026-10-07
- [ ] Code markers: // BUG-504 at every changed block
- [ ] Compile: 0 new warnings
```
