# INVESTIGATION REPORT — Check-In Discount: 3 Issues
**ID:** INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07
**Role:** INVESTIGATION (Role 6)
**Date:** 2026-10-07
**Trigger:** Owner-reported (with screenshots, Front Desk v2 page `/pms/front-desk-v2`)
**Scenario:** Room 9,000 · GST 1,620 (18%) · Total 10,620 · Advance 1,000 · Balance due 9,620
**Steps used:** 8 / 10
**Sandbox:** Zero mutations — read-only grep + code trace. No curl. No code written.

---

## 1. Summary

Three root causes found — all confirmed HIGH confidence by code trace.

| # | Issue | Classification | Confidence | Files |
|---|-------|---------------|-----------|-------|
| F1 | Alert div is a sibling flex item → discount input shrinks | FE_BUG (CSS) | HIGH | CheckInForm.jsx · CheckInPage.jsx |
| F2 | GST not recalculated in CheckInForm.jsx (mirror component never got BUG-500 F2) | FE_BUG (missing feature) | HIGH | CheckInForm.jsx only |
| F3 | Max discount cap formula ignores GST-on-advance reservation rule | FE_BUG (formula) | HIGH | CheckInForm.jsx · CheckInPage.jsx |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test method | Steps | Result |
|---|-----------|-------------|-------|--------|
| H1 | Alert appears inside the flex row → squeezes input | grep + view L183-222 (Form) L886-923 (Page) | 1 | **CONFIRMED** |
| H2 | BUG-500 F2 (GST strip) was ported to CheckInForm.jsx | grep imports + view CheckInForm.jsx full | 2 | **ELIMINATED — never ported** |
| H3 | GST strip in CheckInPage.jsx recalculates correctly | view L927-970, trace gstBase formula | 3 | **CONFIRMED — Page OK, Form not OK** |
| H4 | maxPct formula accounts for GST on advance | grep + view BUG-496 plan + both useMemos | 4 | **ELIMINATED — formula is floor((bc-adv)/bc)** |
| H5 | User's 5% on advance = advance amount vs slab (not room rent vs slab) | trace computeRoomGst + slab spec | 5–6 | **CONFIRMED — nightlyUnit=advance/nights vs slab** |
| H6 | Flat cap (bc−adv) allows full discount to 0 balance, violating GST reservation | trace CheckInForm.jsx L201, L63 | 7 | **CONFIRMED — cap=8000, no gst deducted** |
| H7 | Alert text recalculates from floor'd % → understates true flat max | trace L219 (Form) L920 (Page) | 8 | **CONFIRMED — floor(9000×88/100)=7920 ≠ 7950** |

---

## 3. Root Cause Traces

---

### F1 — Alert inside flex row → discount input shrinks

**CheckInForm.jsx L183-222:**
```
<div className="flex items-center gap-2">          ← FLEX CONTAINER
  <div>[₹/%  type toggle]</div>
  <div className="relative flex-1">
    <input ... />                                   ← flex-1 shrinks when F2 added
  </div>
  {roomDiscountRs > 0 && <span>-₹{...}</span>}
  {discountOverMax && (                             ← SIBLING FLEX ITEM ← BUG
    <div className="... rounded px-2 py-1 mt-1">
      Maximum discount: {maxPct}%...
    </div>
  )}
</div>
```

The alert is rendered as the 4th sibling in `flex items-center gap-2`. When it appears, flex distributes space among all siblings. The `flex-1` input loses its exclusive claim, the green `-₹` span and the wide alert text compress the input to near-zero width (visible in all 3 screenshots).

**Same structure in CheckInPage.jsx L886-923** — identical pattern, identical bug.

**Break point:** Alert div is inside the flex row. Should be moved OUTSIDE (below) the flex container as a block element.

---

### F2 — GST not recalculated in CheckInForm.jsx (mirror)

**CheckInForm.jsx bill section — static GST display:**
```jsx
<span>SGST</span><span>{fmtINR(c.sgst)}</span>    ← c.sgst = 810 (booking-time 18%)
<span>CGST</span><span>{fmtINR(c.cgst)}</span>    ← c.cgst = 810 (booking-time 18%)
```
These are hardwired to `row.charge.sgst` / `row.charge.cgst`. They never update.

**CheckInForm.jsx imports — `computeRoomGst` ABSENT:**
```
grep "computeRoomGst" CheckInForm.jsx → 0 hits
grep "roomGstSlabs"   CheckInForm.jsx → 0 hits
grep "useRestaurant"  CheckInForm.jsx → 0 hits
```

**CheckInForm.jsx props signature:**
```
({ row, meta, rooms, rules, onDone, onClose })
```
No `roomGstSlabs`, no `roomGstApplicable`. The component has no path to receive slab config.

**BUG-500 scope (from plan):** "File WILL change: `src/pages/pms/CheckInPage.jsx` ONLY — 2 edits." CheckInForm.jsx was explicitly out of scope for BUG-500. The mirror rule (AGENT_PROMPT_ALPHA §CR-385 note: "mirror rule until FU-385-C") means both files should track each other, but this GST feature was never ported.

**CheckInPage.jsx L927-970 — live GST strip (WORKING):**
```javascript
const gstBase = Math.max(0, amt - roomDiscountRs);   // ← uses discounted price ✓
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (gstBase/nights) >= s.min && ...) → shows "5% Slab" or "18% Slab"
```
This recalculates correctly when discount pushes `gstBase/nights` below 7500. CheckInPage is CORRECT; CheckInForm is the gap.

**Effect:**
- User applies 88% discount on CheckInForm → room rent effectively becomes 9000 - 7920 = 1080
- Correct GST: 1080 < 7500 → 5% → SGST 27, CGST 27 (total 54)
- Shown GST: c.sgst=810, c.cgst=810 (unchanged, booking-time 18%) ← 16× wrong
- Shown Balance due: `c.balance_due − roomDiscountRs` = 9620 − 7920 = 1700 (uses original GST in c.balance_due)

---

### F3 — Max discount cap formula ignores GST-on-advance

**Owner's stated business rule:**
```
max_discount = (bc − advance) − gst_on_advance_at_slab
            = 8000 − 50 = 7,950
            (where gst_on_advance: nightlyUnit=1000/night < 7500 → 5% slab → gst = 50)
```
"Can't give discount where balance due (excl GST) will become less than GST of advance."
Equivalent: after discount, remaining `(bc − discount − advance) >= gst_on_advance`.

**Current BUG-496 implementation in CheckInForm.jsx L59-75:**
```javascript
// cap = bc − advance = 9000 − 1000 = 8000  ← NO gst deducted
const cap = Math.max(0, bc - Number(c.advance_payment || 0)); // L63

// maxPct = floor((bc−adv)/bc×100) = floor(88.888) = 88  ← floor loses precision
return Math.floor(Math.max(0, bc - advance) / bc * 100); // L74

// Alert text (L219):
// floor(bc × maxPct / 100) = floor(9000 × 88 / 100) = 7920  ← NOT the real max
```

**Current BUG-496 implementation in CheckInPage.jsx L277-282:**
```javascript
// Same formula: floor((bc−bookingAdv)/bc×100) = 88
return Math.floor(Math.max(0, bc - bookingAdv) / bc * 100);

// Alert text (L920):
// floor(orderAmount × maxPct / 100) = floor(9000 × 88 / 100) = 7920
```

**What the two wrong values mean:**
| Value | Source | Why wrong |
|-------|--------|-----------|
| **GREEN ₹8,000** | `roomDiscountRs` capped at `bc − adv` = 8,000 | Allows full discount to 0 balance — the ₹50 GST-on-advance is not protected |
| **RED ₹7,920 (88%)** | `floor(bc × floor_pct / 100)` = floor(9000 × 88/100) | floor(88.88→88) × 9000 = 7920 ≠ actual max 7,950 — loses 30 rupees of headroom |

**Correct values per owner's formula:**
```
gst_on_advance = computeRoomGst(applicable, slabs, advance=1000, nights=1, rooms=1).gstTotal
               = nightlyUnit(1000) → 5% slab → round2dp(50) = 50.00

max_flat       = (bc − adv) − gst_on_advance = 8000 − 50 = 7,950

max_pct_display = (max_flat / bc × 100).toFixed(2) = (7950/9000×100).toFixed(2) = 88.33%
                 (NOT floor'd — floor loses 30 rupees)

Alert text should read: "Maximum discount: 88.33% (₹7,950)..."
Amount input max: 7,950 (not 8,000)
```

**Why the user says 7,949 instead of 7,950:**
The owner's hand-calculation matches exactly at 7,950. "7,949" in the owner's message is off by ₹1 and is almost certainly a manual arithmetic approximation. `computeRoomGst(1000, 1, 1)` with 5% slab returns `gstTotal=50.00` exactly → max_flat=7,950.

**18% case proof (owner's second example "if 18% → 180"):**
If nightlyUnit = advance/nights > 7500 (e.g. advance=9000):
- gst_on_advance = computeRoomGst(applicable, slabs, 9000, 1, 1) → 18% → gst=1620
- max_flat = (bc-adv) − gst_on_advance = (9000−9000) − 1620 → max(0, ...) = 0

For the owner's stated "if 18% → 180" case: advance=1000, room rent=9000, if we use the ROOM RENT slab for advance GST:
- room_rent/nights = 9000/1 = 9000 > 7500 → 18% → gst_on_advance = 1000×18% = 180
- max_flat = 8000 − 180 = 7,820 → max_pct = 7820/9000×100 = 86.89% ✓ (owner confirmed)

The distinction: the owner uses the ADVANCE AMOUNT per night for slab lookup, not the room rent. For adv=1000/night < 7500 → 5%. This matches `computeRoomGst(applicable, slabs, advance=1000, nights=1, rooms=1)`.

**Note: CheckInForm.jsx additional constraint for F3 fix:**
CheckInForm.jsx has NO access to `roomGstApplicable`/`roomGstSlabs` (no `useRestaurant`, not in props). The F3 fix on CheckInForm.jsx REQUIRES F2 infrastructure (prop injection or hook import) — both fixes share the same prerequisite.

---

## 4. Evidence Artifacts

All findings from code trace — no curl evidence needed (no API involved).

| File | Lines | Finding |
|------|-------|---------|
| `CheckInForm.jsx` | L183-222 | Alert inside flex row (F1) |
| `CheckInPage.jsx` | L886-923 | Alert inside flex row (F1) |
| `CheckInForm.jsx` | L173-174, imports | Static SGST/CGST, no computeRoomGst (F2) |
| `CheckInPage.jsx` | L927-970 | Live GST strip — correct reference impl |
| `CheckInForm.jsx` | L59-75, L201, L219 | Cap = bc−adv (8000), maxPct floor'd, alert uses floor (F3) |
| `CheckInPage.jsx` | L277-282, L903, L920 | Same cap formula (F3) |
| `roomGstCalculator.js` | full | GST calc with round2dp — used for F3 math |

---

## 5. Recommendations

### F1 — Alert shrinks discount input
- **Classification:** FE_BUG (CSS only)
- **Risk:** LOW
- **Fix:** In both files, move the `{discountOverMax && <div>...}` block OUT of the `flex items-center gap-2` container, into a new `<div>` directly below it
- **Scope:** 2 files, ~4 lines each (~8 total). Not hotspot. Not financial logic.
- **Planning skip eligible:** YES — Fast Lane (≤10 lines, CSS only, 2 files). Needs owner "Fast Lane APPROVED."

### F2 — GST not recalculated in CheckInForm.jsx
- **Classification:** FE_BUG (missing feature — mirror gap)
- **Risk:** HIGH (financial display in check-in critical flow)
- **Fix requires:**
  1. Add `useRestaurant` hook import OR accept `roomGstApplicable`/`roomGstSlabs` as props
  2. Add `computeRoomGst` import
  3. Add `formNights` computed from `row.checkin`/`row.checkout` (analogous to CheckInPage.jsx L248-251)
  4. Replace static `c.sgst`/`c.cgst` with dynamic values based on discounted room rent
  5. Add live GST strip (mirroring CheckInPage.jsx L927-970)
  6. Update balance due formula to use `c.balance_due − roomDiscountRs` correctly (pending correct GST)
- **Scope:** 1 file primarily (CheckInForm.jsx ~30 lines), possibly parent that renders it if prop injection chosen
- **New bug:** Recommend registering as **BUG-502** (P1/HIGH, RELATED to BUG-500)
- **Planning skip eligible:** NO — HIGH risk, financial display, mirror of R5 adjacent logic → full Gate 2-3

### F3 — Cap formula missing GST-on-advance reservation
- **Classification:** FE_BUG (formula error in BUG-496 implementation)
- **Risk:** CRITICAL (incorrect discount cap is a financial safeguard)
- **Fix:**
  ```
  BOTH FILES need:
  1. Compute gst_on_advance = computeRoomGst(applicable, slabs, advance, nights, 1).gstTotal
     → For CheckInForm.jsx: requires F2 infrastructure (roomGstSlabs + nights)
  2. max_flat = Math.max(0, (bc − advance) − gst_on_advance)  [replaces bc − advance]
  3. max_pct_display = (max_flat / bc * 100).toFixed(2)        [replaces floor()]
  4. Alert text: use max_flat directly, not floor(bc × floor_pct/100)
  5. Input max (Amount mode): max_flat   [replaces bc − advance in Form, effectiveBalanceDue formula tweak in Page]
  ```
- **Scope:** 2 files, ~10 lines. CheckInForm.jsx has DEPENDENCY on F2 (needs slab config). CheckInPage.jsx can be fixed independently.
- **New bug:** Recommend registering as **BUG-503** (P0/CRITICAL — financial cap calculation wrong)
  - Note: This is a correction to BUG-496's formula, not a new feature. BUG-496 plan used `floor((bc-adv)/bc*100)` — owner's rule was not captured in that plan.
- **Planning skip eligible:** NO — CRITICAL, financial, 2 files (one hotspot-adjacent), full Gate 2-3

---

## 6. Retroactive Candidates

None. All three issues are new defects not previously registered.

---

## 7. Implementation Dependency Order

```
F1 (CSS fix) — independent, can be Fast Lane now
     ↓
F2 (GST recalc in CheckInForm.jsx) — must come BEFORE F3 for CheckInForm.jsx
     ↓
F3 (cap formula) — CheckInPage.jsx independent of F2; CheckInForm.jsx depends on F2
```

---

## Handover

"Root cause confirmed for all 3 issues. Confidence: HIGH. Steps: 8/10.

F1 (UI shrink): CSS — alert div inside flex row. Fast Lane eligible (2 files, ~8 lines, CSS only). Owner approve?

F2 (GST recalc): Missing in CheckInForm.jsx mirror — BUG-500 only fixed CheckInPage.jsx. Needs useRestaurant + computeRoomGst + dynamic nights in CheckInForm. ~30 lines. HIGH risk → full Gate 2-3. Recommend BUG-502 (P1/HIGH).

F3 (cap formula): BUG-496 formula floor((bc-adv)/bc×100) doesn't preserve gst_on_advance. Owner's rule: max_flat = (bc−adv) − computeRoomGst(slabs, advance, nights). For adv=1000, nights=1 → gst_on_advance=50 → max_flat=7,950 (not 8,000); max_pct=88.33% shown (not floor'd 88% → ₹7920). CheckInPage.jsx independent fix; CheckInForm.jsx needs F2 first. CRITICAL → full Gate 2-3. Recommend BUG-503 (P0/CRITICAL).

Planning skip: F1=YES (Fast Lane). F2=NO. F3=NO.
Escalated from Bug Fix: NO.
Retroactive candidates: NONE.
Report at: investigations/INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07.md"
