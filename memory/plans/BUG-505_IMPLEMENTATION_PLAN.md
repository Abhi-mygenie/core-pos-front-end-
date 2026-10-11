# BUG-505 — Implementation Plan (Gate 3)

**ID:** BUG-505
**Date:** 2026-10-07
**Stage:** GATE_3_IMPLEMENTATION_PLAN
**Author:** PLANNING agent
**Risk:** HIGH (financial display — not transaction)
**Sprint:** oct_bug_batch
**Phase:** PMS → New Booking + Check-In → Front Desk (Beta) → CheckInForm (expand-in-place)

---

## 0. Entry Verification (re-verified at HEAD before writing plan)

All IA anchors confirmed identical at HEAD — no line drift since Gate 2 was written moments ago.

| Edit | File | Line | Plan expects | HEAD actual | Match? |
|------|------|------|-------------|------------|--------|
| E-A1 | CheckInForm.jsx | L196 | `{fmtINR(displaySgst)}{/* BUG-503 */}` | ✅ exact | ✅ |
| E-A2 | CheckInForm.jsx | L197 | `{fmtINR(displayCgst)}{/* BUG-503 */}` | ✅ exact | ✅ |
| E-A3 | CheckInForm.jsx | L198 | `{roomGstApplicable && displayGstRate > 0 && <span...>...% Slab</span>}{/* BUG-503 */}` | ✅ exact | ✅ |
| E-A4 | CheckInForm.jsx | L199 | `fmtINR(Math.max(0, Number(c.booking_charge \|\| 0) - roomDiscountRs) + displayGstTotal)` | ✅ exact | ✅ |
| E-A5 | CheckInForm.jsx | L201 | `{/* BUG-491 Sub-B + BUG-503: balance due uses live GST on discounted price */}` | ✅ exact | ✅ |
| E-A6 | CheckInForm.jsx | L202 | `roomDiscountRs + displayGstTotal - Number(c.advance_payment \|\| 0)` | ✅ exact | ✅ |
| E-B1 | CheckInForm.jsx | L247–L248 | `</div>` then `<div className="mt-3 pt-3 border-t...">` | ✅ exact | ✅ |

---

## 1. Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/CheckInForm.jsx` — Part A (6 line reverts) + Part B (insert GST strip ~45 lines)

**Files will NOT touch:**
- `src/pages/pms/CheckInPage.jsx` — clean, do not touch
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — not in scope
- `src/api/services/pmsService.js` — no API change needed
- `src/utils/roomGstCalculator.js` — correct as-is
- `src/api/services/frontDeskService.js` — not in scope

**useMemos that MUST be kept (do NOT remove):**
- L91-94: `displayGstTotal`, `displayCgst`, `displaySgst` — needed by Part B
- L96-102: `displayGstRate` — needed by Part B

---

## 2. Edits — Part A: Revert bill grid to static booking-time values

### E-A1 — L196: SGST — revert to static `c.sgst`

**Current (L196):**
```jsx
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="checkin-bill-sgst">{fmtINR(displaySgst)}{/* BUG-503 */}</span>
```

**Replace with:**
```jsx
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="checkin-bill-sgst">{fmtINR(c.sgst)}{/* BUG-505: static booking-time value */}</span>
```

**Why:** `displaySgst` is post-discount GST (₹26.25 at 90% disc) — mismatches the static `c.booking_charge` (₹9,000) above it. `c.sgst` is the booking-time SGST (₹810, 18% of ₹9,000).

---

### E-A2 — L197: CGST — revert to static `c.cgst`

**Current (L197):**
```jsx
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="checkin-bill-cgst">{fmtINR(displayCgst)}{/* BUG-503 */}</span>
```

**Replace with:**
```jsx
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="checkin-bill-cgst">{fmtINR(c.cgst)}{/* BUG-505: static booking-time value */}</span>
```

---

### E-A3 — L198: Remove slab badge row from bill grid entirely

**Current (L198):**
```jsx
            {roomGstApplicable && displayGstRate > 0 && <span className="col-span-2 text-right text-[10px] font-semibold text-[#166534]">{displayGstRate}% Slab</span>}{/* BUG-503 */}
```

**Replace with:** *(empty — delete this line entirely)*
```jsx
```

**Why:** Slab badge belongs in the separate GST strip (Part B), not in the static bill grid. Removing it from the bill grid avoids the inconsistency where booking-time SGST/CGST are shown with a post-discount slab badge.

---

### E-A4 — L199: Total (incl. GST) — revert to static `c.total_with_gst`

**Current (L199):**
```jsx
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="checkin-bill-total">{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs) + displayGstTotal)}{/* BUG-503 */}</span>
```

**Replace with:**
```jsx
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="checkin-bill-total">{fmtINR(c.total_with_gst)}{/* BUG-505: static booking-time value */}</span>
```

**Why:** `c.total_with_gst` = ₹10,620 (18% of ₹9,000 + ₹9,000 — booking-time). The current formula produces ₹1,102.50, which doesn't reconcile with ₹9,000 in the same grid.

---

### E-A5 — L201: Update comment

**Current (L201):**
```jsx
            {/* BUG-491 Sub-B + BUG-503: balance due uses live GST on discounted price */}
```

**Replace with:**
```jsx
            {/* BUG-505: balance due = bc − discount − advance (backend formula, no GST added) */}
```

---

### E-A6 — L202: Balance due — fix formula (remove `+ displayGstTotal`)

**Current (L202):**
```jsx
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs + displayGstTotal - Number(c.advance_payment || 0)))}</span>
```

**Replace with:**
```jsx
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0)))}{/* BUG-505 */}</span>
```

**Why:** `+ displayGstTotal` causes compound GST: `5% × 1050 = 52.50` where 1050 = advance(1000) + gst_on_advance(50). Adding it to balance applies GST to already-preserved GST. Owner confirmed: `bc − discount − advance = 9000 − 7950 − 1000 = ₹50`. This is also consistent with `collectMax` (L88) which already uses the same formula.

---

## 3. Edits — Part B: Insert live GST strip after discount section

### E-B1 — Insert after L247 (`</div>` that closes the Room Discount block)

**Insert point:** Between `          </div>` (L247 — closes `<div className="mt-3">` Room Discount section) and `          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">` (L248 — opens Collect Now section).

Uses the existing useMemos: `displayGstTotal`, `displayCgst`, `displaySgst`, `displayGstRate` (L91-102). No new computation needed.

**Current (L247–L248 boundary):**
```jsx
          </div>
          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
```

**Replace with:**
```jsx
          </div>
          {/* BUG-505 Part B: live GST strip — informational only, visible when discount > 0 */}
          {roomGstApplicable && roomGstSlabs && roomDiscountRs > 0 && (
            <div
              data-testid="ci-gst-strip"
              className={`mt-3 rounded-xl border px-4 py-3 flex flex-col gap-1.5 text-[12px] ${displayGstTotal > 0 ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FAFAFA] border-[#E5E5E5]'}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`font-semibold text-[11px] uppercase tracking-wide ${displayGstTotal > 0 ? 'text-[#166534]' : 'text-[#888]'}`}>
                  GST after discount
                </span>
                {displayGstTotal > 0
                  ? <span className="text-[10px] font-bold bg-[#22C55E] text-white px-2 py-0.5 rounded-full">{displayGstRate}% Slab</span>
                  : <span className="text-[10px] font-semibold bg-[#E5E5E5] text-[#888] px-2 py-0.5 rounded-full">Not Applicable</span>
                }
              </div>
              {displayGstTotal > 0 ? (
                <>
                  <div className="flex justify-between text-[#374151]">
                    <span>CGST ({displayGstRate / 2}%)</span>
                    <span>₹{displayCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[#374151]">
                    <span>SGST ({displayGstRate / 2}%)</span>
                    <span>₹{displaySgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#888] italic border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                    <span>Total GST (CGST + SGST)</span>
                    <span className="font-semibold text-[#166534]">₹{displayGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1A1A1A] border-t border-[#BBF7D0] pt-1.5 mt-0.5">
                    <span>Total incl. GST</span>
                    <span className="text-[#15803D] text-[13px]">₹{(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs) + displayGstTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <span className="text-[#888] text-[12px]">GST not applicable at this discount level.</span>
              )}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
```

**Why:** Provides the live post-discount GST info in a clearly labelled, separate panel. Uses existing `displayGstTotal/Cgst/Sgst/Rate` useMemos — no new computation. Condition `roomDiscountRs > 0` ensures it only renders when a discount is actually entered. Informational only — does not affect Balance Due or any submitted value.

---

## 4. Verification Matrix

| Edit | File | Line(s) | Change | How to Verify | Automated? |
|------|------|---------|--------|---------------|:---:|
| E-A1 | CheckInForm.jsx | L196 | `displaySgst` → `c.sgst` | Browser: enter 90% discount → SGST shows ₹810 (not ₹26.25) | NO |
| E-A2 | CheckInForm.jsx | L197 | `displayCgst` → `c.cgst` | Browser: enter 90% discount → CGST shows ₹810 (not ₹26.25) | NO |
| E-A3 | CheckInForm.jsx | L198 | Remove slab badge from bill grid | Browser: no "5% Slab" badge inside the bill grid | NO |
| E-A4 | CheckInForm.jsx | L199 | Total → `c.total_with_gst` | Browser: enter 90% discount → Total shows ₹10,620 (not ₹1,102.50) | NO |
| E-A5 | CheckInForm.jsx | L201 | Comment update | Grep: `BUG-491 Sub-B + BUG-503` absent from file | YES (grep) |
| E-A6 | CheckInForm.jsx | L202 | Balance formula removes `+ displayGstTotal` | Browser: enter max discount → Balance due = ₹50 (not ₹102.50) | NO |
| E-B1 | CheckInForm.jsx | ~L248 | Insert GST strip block | Browser: enter 90% discount → GST after discount strip appears with 5% Slab, CGST ₹26.25, SGST ₹26.25, Total ₹52.50, Total incl. GST ₹1,102.50 | NO |
| E-B1 | CheckInForm.jsx | ~L248 | Strip condition `roomDiscountRs > 0` | Browser: zero discount entered → strip NOT visible | NO |
| Regression | CheckInForm.jsx | L91-102 | useMemos NOT removed | Grep: `displayGstTotal\|displayCgst\|displaySgst\|displayGstRate` present at L91-102 | YES (grep) |
| Regression | CheckInForm.jsx | L88 | `collectMax` unchanged | Grep: same formula as before | YES (grep) |
| Regression | CheckInForm.jsx | — | webpack compiles | `tail -5 /var/log/supervisor/frontend.out.log` → `compiled successfully` | YES |
| Regression | — | — | Bill grid numbers add up | `c.booking_charge + c.sgst + c.cgst ≈ c.total_with_gst` at zero discount | NO (visual) |

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `c.sgst`/`c.cgst`/`c.total_with_gst` null/undefined | LOW — confirmed in sibling components (ExtendStayForm, FolioCheckoutPanel, ArrivalsPanel) | `fmtINR()` already handles null/undefined gracefully |
| `displayGstTotal` not defined when Part B renders | NONE — useMemos at L91-94 always computed (no conditional) | — |
| Part B strip shows when `roomGstApplicable=false` | NONE — condition `roomGstApplicable && roomGstSlabs && roomDiscountRs > 0` prevents this | — |
| Collect Now max changes | NONE — `collectMax` (L88) uses `bc − discount − advance`, same as new Balance Due formula | — |
| `displayGstRate / 2` = float (e.g. 2.5) | LOW — same pattern as CheckInPage.jsx L954/959 — renders as "2.5%" which is correct | — |

---

## 6. Execution Sequence

```
1. Apply E-A1 (L196) — SGST revert
2. Apply E-A2 (L197) — CGST revert
3. Apply E-A3 (L198) — remove slab badge line
4. Apply E-A4 (L199) — Total revert
5. Apply E-A5 (L201) — comment update
6. Apply E-A6 (L202) — balance formula fix
7. Apply E-B1 (~L247–L248) — insert GST strip
8. Verify webpack compiled successfully
9. Self-test against Verification Matrix
```

All edits are in one file. Apply in sequence. No cross-file dependencies.

---

## 7. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-505 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-505 row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx row updated — add BUG-505 IMPL 2026-10-07
- [ ] Code markers: // BUG-505 present in every modified line (already in plan text above)
- [ ] webpack: compiled successfully, 0 new warnings
```

---

## 8. After-Fix Display State (owner-confirmed, OD-505-01 LOCKED)

At max discount ₹7,950 entered (booking: bc=₹9,000, advance=₹1,000, 18% GST):

```
Room bill · from the booking          ← ALL STATIC (c.* values)
  Booking charge:     ₹9,000
  SGST:               ₹810    (18% booking-time — c.sgst)
  CGST:               ₹810    (18% booking-time — c.cgst)
  Total (incl. GST):  ₹10,620 (booking-time    — c.total_with_gst)
  Already paid:       ₹1,000
  Balance due:        ₹50     ← bc − discount − advance = 9000−7950−1000 ✓

  [Room Discount ₹7,950]      ← existing discount block, unchanged

  ┌─────────────────────────────────────┐   ← Part B (NEW — informational)
  │ GST AFTER DISCOUNT          5% Slab │
  │ CGST (2.5%)          ₹26.25         │
  │ SGST (2.5%)          ₹26.25         │
  │ Total GST            ₹52.50         │
  │ Total incl. GST      ₹1,102.50      │
  └─────────────────────────────────────┘

  Collect now · optional        ← unchanged
```

At zero discount: GST strip NOT visible. Bill grid shows booking-time values unchanged.
