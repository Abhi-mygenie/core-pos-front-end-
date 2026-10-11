# BUG-502 — Implementation Plan (Gate 3)

**Date:** 2026-10-07
**Author:** PLANNING agent
**Risk:** LOW
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx` · `src/pages/pms/CheckInPage.jsx`
**Files WILL NOT touch:** FolioCheckoutPanel.jsx · pmsService.js · any other file
**Owner decisions:** NONE — Fast Lane eligible. Awaiting owner "Fast Lane APPROVED" before Gate 4.
**Lines changed per file:** ~4 (move JSX block from inside flex to outside flex)

---

## Context

The `discountOverMax` alert `<div>` is currently the last child inside `<div className="flex items-center gap-2">`. When it renders, it becomes a flex sibling of the `flex-1` input and collapses it. Fix: move the alert OUTSIDE the flex container, as a block element immediately below it, still inside the outer `<div className="mt-3">` wrapper.

---

## E1 — CheckInForm.jsx · Move alert outside flex row

**Current (L183-222):**
```jsx
            <div className="flex items-center gap-2">
              ...type toggle...
              <div className="relative flex-1">
                <input ... />
              </div>
              {roomDiscountRs > 0 && (
                <span ...>−₹{roomDiscountRs}</span>
              )}
              {/* BUG-492 Sub-B: red alert when % > maxPct */}
              {discountOverMax && (
                <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="checkin-form-discount-over-max-alert">
                  Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
                </div>
              )}
            </div>
          </div>
```

**After:**
```jsx
            <div className="flex items-center gap-2">
              ...type toggle...
              <div className="relative flex-1">
                <input ... />
              </div>
              {roomDiscountRs > 0 && (
                <span ...>−₹{roomDiscountRs}</span>
              )}
            </div>
            {/* BUG-492 Sub-B / BUG-502: alert moved OUTSIDE flex row to prevent input collapse */}
            {discountOverMax && (
              <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="checkin-form-discount-over-max-alert">
                Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
              </div>
            )}
          </div>
```

**What changes:** `{discountOverMax && ...}` block moves from inside `flex items-center gap-2` to directly below its closing `</div>`, still inside the `<div className="mt-3">` wrapper. Zero logic change. Alert text unchanged (BUG-504 will update it later).

---

## E2 — CheckInPage.jsx · Move alert outside flex row

**Current (L886-923):**
```jsx
                      <div className="flex items-center gap-2">
                        ...type toggle...
                        <div className="relative flex-1">
                          <input ... />
                        </div>
                        {roomDiscountRs > 0 && (
                          <span ...>−₹{roomDiscountRs}</span>
                        )}
                        {/* BUG-492 Sub-B: red alert when % > maxPct */}
                        {discountOverMax && (
                          <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="ci-discount-over-max-alert">
                            Maximum discount: {maxPct}% (₹{Math.floor(Number(form?.orderAmount||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
                          </div>
                        )}
                      </div>
                    </div>
```

**After:**
```jsx
                      <div className="flex items-center gap-2">
                        ...type toggle...
                        <div className="relative flex-1">
                          <input ... />
                        </div>
                        {roomDiscountRs > 0 && (
                          <span ...>−₹{roomDiscountRs}</span>
                        )}
                      </div>
                      {/* BUG-492 Sub-B / BUG-502: alert moved OUTSIDE flex row to prevent input collapse */}
                      {discountOverMax && (
                        <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="ci-discount-over-max-alert">
                          Maximum discount: {maxPct}% (₹{Math.floor(Number(form?.orderAmount||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
                        </div>
                      )}
                    </div>
```

**What changes:** Same move as E1. Alert text unchanged (BUG-504 updates it later).

---

## Verification Matrix

| # | Edit | Check | How |
|---|------|-------|-----|
| V1 | E1 | Enter >88% in CheckInForm → alert appears BELOW input, input remains full width | Browser: open Front Desk Beta, enter booking, discount tab, type 90% |
| V2 | E2 | Enter >88% in CheckInPage → same | Browser: /pms/check-in, enter >88% |
| V3 | Both | `discountOverMax` alert is NOT a child of `.flex.items-center.gap-2` | DevTools: inspect flex container — should have ≤3 children |
| V4 | Both | Alert text, testid, bg-red-50 styling unchanged | Visual match |
| V5 | Both | webpack 0 new warnings | tail frontend.out.log |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-502 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-502 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-502 2026-10-07
- [ ] Code markers: // BUG-502 on moved alert block (both files)
- [ ] Compile: 0 new warnings
```
