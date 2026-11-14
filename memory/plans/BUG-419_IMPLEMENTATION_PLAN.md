# BUG-419 — Implementation Plan: Corp/B2B Position in CheckInPage

**Code Reality:** PARTIAL — Corp/B2B block EXISTS at L731-764, wrong position.
**Conflict Pre-Check:** No other open item touches CheckInPage form field order.
**Risk:** LOW — JSX reorder only, zero logic/state/API change.
**Fast Lane:** ELIGIBLE (1 file, ≤30 lines moved, non-financial, non-hotspot). Owner approval required.

---

## Owner Decision Resolved

| ID | Question | Answer |
|----|----------|--------|
| OD-419-01 | Where exactly? After Name+Phone row, before Room Assignment? | **YES — confirmed** |

---

## Impact Analysis

**Current form order (CheckInPage.jsx right panel `<div className="p-5 space-y-4">`):**

1. Name / Phone grid (`L585–597`)
2. Room Assignment (`L599–614`)
3. Check-in / Check-out / Nights (`L616–629`)
4. Occupancy & Guest Register — Adults, extra adults, children (`L631–728`)
5. **Corp/B2B toggle** (`L731–764`) ← current (too late in form)
6. GuestDocsSection / ID upload (`L766–778`)
7. Room Amount / Advance (`L780–818`)

**Desired order (owner-confirmed):**

1. Name / Phone grid
2. **Corp/B2B toggle** ← NEW POSITION
3. Room Assignment
4. Check-in / Check-out / Nights
5. Occupancy & Guest Register
6. GuestDocsSection / ID upload
7. Room Amount / Advance

**Side-effects:** NONE. Corp/B2B state (`isCorpBooking`, `firmName`, `firmGst`) initialised at component top. Moving the JSX block does not change hook order, effect dependencies, or form validation.

---

## Implementation Plan

### Edit E1 — Move Corp/B2B JSX block

| Field | Value |
|-------|-------|
| File | `src/pages/pms/CheckInPage.jsx` |
| Action | Cut lines 731–764 (Corp/B2B `<div>…</div>`); paste after closing `</div>` of Name/Phone grid (~L597), before Room Assignment `<div>` (~L599) |
| Lines changed | ~30 moved (0 new, 0 deleted) |
| Code marker | `{/* BUG-419: Corp/B2B moved above Room Assignment per OD-419-01 */}` |

**Search anchor (old position — to cut):**
```
                    {/* CR-379: Corporate / B2B toggle (DD-7) */}
                    <div>
```

**Insert anchor (new position — after name/phone grid, before Room Assignment):**
```
                    </div>

                    <div>
                      <label className="text-[12px] text-[#888] mb-1 block">Room Assignment *</label>
```
Insert the entire Corp/B2B block between the `</div>` of the name/phone grid and the `<div>` opening Room Assignment.

---

## Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Corp/B2B appears immediately below Guest Name / Phone fields | Browser: `/pms/check-in`, start walk-in |
| 2 | Corp/B2B appears before Room Assignment dropdown | Visual |
| 3 | Checkbox toggles firm-name / GSTIN sub-fields correctly | Check/uncheck |
| 4 | All other form fields unchanged in order | Visual scan |
| 5 | No compile error | webpack 0 new warnings |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-419 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `pages/pms/CheckInPage.jsx` + BUG-419
- [ ] Code marker: `// BUG-419` in moved block
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-419
Stage: Impact Analysis + Implementation Plan
Code reality: PARTIAL (JSX exists, wrong position)
Risk: LOW
Files WILL change: src/pages/pms/CheckInPage.jsx (1 JSX reorder, ~30 lines)
Files WILL NOT touch: all others
Owner decisions: OD-419-01 resolved
Next: Gate 4 GO / Implementation
```
