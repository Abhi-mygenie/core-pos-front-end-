# BUG-186: Day Closure / Settlement — Unable to Settle Payment in Partial Mode

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete — API verified)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT (same root cause as BUG-185)
**Risk:** HIGH (R6 financial)
**Severity:** P1
**Classification:** FE_BUG (side effect of BUG-185 formula bug)

## Description
In Day Closure → Settle modal, switching to "Partial" mode shows Amount=₹0 and Confirm button is disabled.

## Investigation Findings

**This is a DIRECT SIDE EFFECT of BUG-185.** Same root cause.

The settle modal flow:
1. `openSettleModal` (L143-149): `expected = w.totalFunds - w.settled` → **WRONG** (ignores cash_draw)
2. `prefill = Math.min(Math.abs(actual), expected)` → when expected=0, prefill=0
3. `setSettleAmount(Math.max(0, 0))` → amount=0
4. Line 410: `disabled={settleAmount <= 0}` → button disabled

**With the correct value** (`w.balanceToSettle`), prefill would use the real backend balance and the button would be enabled.

## Fix Required
- **Same fix as BUG-185** — once Expected uses `w.balanceToSettle`, partial settlement will work automatically
- Both bugs are fixed together

## Files
- `SettlementPanel.jsx` (same lines as BUG-185)
