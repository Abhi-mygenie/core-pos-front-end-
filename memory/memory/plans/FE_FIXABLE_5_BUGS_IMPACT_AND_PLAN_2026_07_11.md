# Impact Analysis + Implementation Plan — 5 FE-Fixable Bugs

**Date:** 2026-07-11
**Agent:** PLANNING (Gate 2 + Gate 3)
**Risk:** BUG-186 HIGH (R6 financial), rest LOW
**Code Reality:** ALL NONE (0 markers for all 5)
**Conflict Pre-Check:** SAFE — no in-flight items on target files

---

## Edit 1: BUG-194 — Payments Report Empty (P1, LOW risk)

**Root cause:** `fetchInsightsSales` returns `{ data: <payload>, orderCount: 0 }` but `PaymentsMockup` reads `.summary` / `.payments` / `.daily` directly instead of `.data.summary` etc. CR-049 regression.

**File:** `pages/reports-module/PaymentsMockup.jsx`

| Line | Current | New |
|------|---------|-----|
| L213 | `const s = salesData.summary \|\| {};` | `const s = salesData.data?.summary \|\| salesData.summary \|\| {};` |
| L219 | `const backendPayments = salesData.payments \|\| [];` | `const backendPayments = salesData.data?.payments \|\| salesData.payments \|\| [];` |
| L255 | `const daily = (salesData.daily \|\| []).map(d => ({` | `const daily = (salesData.data?.daily \|\| salesData.daily \|\| []).map(d => ({` |

**Downstream:** Zero — this is a leaf report page, no other consumers.
**Verify:** Load Payments report with a date range → data renders (was empty before).

---

## Edit 2: BUG-186 — Partial Settlement Blocked (P1, HIGH risk — R6 financial)

**Root cause:** When `expected = totalFunds - settled` is ≤ 0 (over-settlement), `Math.max(prefill, 0)` → 0, and `disabled={settleAmount <= 0}` blocks the button. Also `settleAmount > expected` shows error when expected is negative.

**File:** `components/panels/SettlementPanel.jsx`

| Line | Current | New | Why |
|------|---------|-----|-----|
| L145 | `const expected = w.totalFunds - w.settled;` | `const expected = w.totalFunds - w.settled;` | Keep (no change) |
| L146 | `const prefill = actual !== undefined ? Math.min(Math.abs(Math.round(actual)), expected) : Math.min(Math.abs(Math.round(w.balanceToSettle)), expected);` | `const absBalance = Math.abs(w.balanceToSettle \|\| 0);` `const prefill = actual !== undefined ? Math.abs(Math.round(actual)) : absBalance;` | Use absolute balance, don't clamp to expected |
| L147 | `setSettleAmount(Math.max(prefill, 0));` | `setSettleAmount(Math.max(prefill, 0));` | Keep |
| L386 | `borderColor: settleAmount > (settleModal.totalFunds - settleModal.settled) ? "#EF4444" : COLORS.borderGray` | `borderColor: COLORS.borderGray` | Remove red border on over-expected (allow partial) |
| L388-389 | `{settleAmount > (settleModal.totalFunds - settleModal.settled) && (` error msg | Remove this block | Allow settling beyond simple expected |
| L395 | Full button recalc with `Math.min(..., exp)` | Use `Math.abs(w.balanceToSettle)` as prefill | Same pattern as L146 fix |
| L410 | `disabled={saving \|\| settleAmount <= 0 \|\| settleAmount > (settleModal.totalFunds - settleModal.settled)}` | `disabled={saving \|\| settleAmount <= 0}` | Remove the over-expected guard |

**Downstream:** Settlement API call at L107 — payload unchanged (amount, type, pilferage). Backend accepts any positive amount.
**Verify:** Open settle for waiter with negative balance → amount prefills → Confirm enabled → settlement succeeds.

---

## Edit 3: BUG-195 — Takeaway Name Mandatory Ignores Toggle (P1, MEDIUM risk)

**Root cause:** `CartPanel.jsx:805` hardcodes `isNameRequired = orderType === 'takeAway' || orderType === 'delivery'`. Ignores the CR-051 localStorage toggles.

**File:** `components/order-entry/CartPanel.jsx`

| Line | Current | New |
|------|---------|-----|
| L805 | `const isNameRequired = orderType === 'takeAway' \|\| orderType === 'delivery';` | `const isNameRequired = (() => { if (orderType === 'delivery') return true; if (orderType === 'takeAway') return localStorage.getItem('mygenie_takeaway_name_required') !== 'false'; if (orderType === 'walkIn') return localStorage.getItem('mygenie_walkin_name_required') === 'true'; if (orderType === 'dineIn') return localStorage.getItem('mygenie_dinein_name_required') === 'true'; return false; })();` |
| L806 | `const isPhoneRequired = orderType === 'delivery';` | `const isPhoneRequired = (() => { if (orderType === 'delivery') return true; if (orderType === 'takeAway') return localStorage.getItem('mygenie_takeaway_phone_required') === 'true'; if (orderType === 'walkIn') return localStorage.getItem('mygenie_walkin_phone_required') === 'true'; if (orderType === 'dineIn') return localStorage.getItem('mygenie_dinein_phone_required') === 'true'; return false; })();` |

**Note:** This mirrors the exact same logic in `OrderEntry.jsx:894-901` (CR-051). CartPanel was missed during CR-051 implementation.
**Downstream:** `nameMissing` / `phoneMissing` / `hasValidationErrors` all derive from these — no other changes needed.
**Verify:** Settings → disable takeaway name toggle → CartPanel no longer shows name as required for takeaway.

---

## Edit 4: BUG-187 — Red Border Missing on Customer Name (P2, LOW risk)

**Root cause:** Already handled. Looking at L1021-1035 the red styling IS applied: icon color turns red (L1021), border turns red (L1032), background turns pink (L1034), shadow turns red (L1035). 

**Re-check against investigation report claim...**

The investigation says "NO red border class applied" but L1032 clearly has `borderColor: nameMissing ? '#ef4444' : COLORS.borderGray`. This may have been fixed AFTER the investigation ran, or the investigation traced a different input field.

**Conclusion:** Mark as **ALREADY FIXED** — code at L1021-1035 applies full red styling when `nameMissing`. If the issue persists, it's because `isNameRequired` was hardcoded (BUG-195) — fixing BUG-195 will cascade the correct `nameMissing` state.

---

## Edit 5: BUG-188 — Discount Row CSS Alignment (P2, LOW risk)

**Root cause:** The discount section at L526-568 uses `flex items-center justify-between gap-2`. The `select` + `input` + `span` inside a nested `flex gap-1.5` can overflow when discount value is long. The container has no `overflow-hidden` or `flex-shrink-0` on the value span.

**File:** `components/order-entry/CartPanel.jsx`

| Line | Current | New |
|------|---------|-----|
| L566 | `{totalDiscount > 0 && <span className="font-medium" style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount.toFixed(2)}</span>}` | `{totalDiscount > 0 && <span className="font-medium flex-shrink-0 whitespace-nowrap" style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount.toFixed(2)}</span>}` |
| L526 | `<div className="flex items-center justify-between gap-2 pb-1.5"` | `<div className="flex items-center justify-between gap-2 pb-1.5 overflow-hidden"` |

**Downstream:** Zero — CSS only.
**Verify:** Apply large discount → value doesn't overlap scrollbar.

---

## Verification Matrix

| Edit | ID | File | Change | How to Verify |
|------|-----|------|--------|---------------|
| 1 | BUG-194 | PaymentsMockup.jsx | 3 lines: .data? prefix | Load Payments report → data shows |
| 2 | BUG-186 | SettlementPanel.jsx | ~10 lines: negative balance handling | Settle waiter with -₹ balance → works |
| 3 | BUG-195 | CartPanel.jsx | 2 lines: read localStorage toggles | Disable takeaway name → not required |
| 4 | BUG-187 | — | ALREADY FIXED (L1021-1035) | Cascades from BUG-195 fix |
| 5 | BUG-188 | CartPanel.jsx | 2 lines: flex-shrink-0 + overflow | Large discount → no overlap |

---

## Post-Code Registry Checklist
- [ ] registry.json: 4 items → IMPLEMENTED (BUG-187 → CLOSED — already fixed)
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: PaymentsMockup, SettlementPanel, CartPanel
- [ ] Code markers: // BUG-194, // BUG-186, // BUG-195, // BUG-188
- [ ] Compile check: 0 new warnings

---

## Summary

| ID | Risk | Lines | Files | Type |
|----|------|:-----:|:-----:|------|
| BUG-194 | LOW | 3 | 1 (PaymentsMockup) | Data access fix |
| BUG-186 | **HIGH (R6)** | ~10 | 1 (SettlementPanel) | Financial logic |
| BUG-195 | MEDIUM | 2 | 1 (CartPanel) | Business rule |
| BUG-187 | — | 0 | — | Already fixed, cascades from BUG-195 |
| BUG-188 | LOW | 2 | 1 (CartPanel) | CSS fix |

**Total: ~17 lines across 3 files. BUG-187 requires 0 code (already fixed). Awaiting Gate 4 GO for BUG-186 (R6 financial).**
