# BUG-185: Day Closure / Settlement — Opening Balance Logic Not Working

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete — API verified)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** HIGH (R6 financial)
**Severity:** P0 — CRITICAL
**Classification:** FE_BUG (wrong formula — ignores backend value)

## Description
In Day Closure / Settlement, the Expected column, pilferage, and Actual Bal placeholder show wrong numbers.

## Investigation Findings

**API verification (cafe103, June 20):**
Counter waiter: `total_funds=0, today_settlement=0, cash_draw=1791, balance_to_settle=-1791`

**Backend formula:** `balance_to_settle = total_funds - today_settlement - cash_draw`
→ `0 - 0 - 1791 = -1791` ✅

**FE formula (WRONG):** `expected = w.totalFunds - w.settled`
→ `0 - 0 = 0` ❌ **Ignores cash_draw**

**The backend ALREADY sends `balance_to_settle` per waiter. The FE transform correctly maps it to `w.balanceToSettle`. But the FE IGNORES it in 9 places and recomputes with the wrong formula:**

| Line | What FE does (WRONG) | Should do |
|---|---|---|
| 104 | `expected = w.totalFunds - w.settled` | Use `w.balanceToSettle` |
| 106 | pilferage uses FE expected | Use backend balance |
| 145 | Recomputes `totalFunds - settled` | Use `w.balanceToSettle` |
| 250 | Table Expected column recomputes | Use `w.balanceToSettle` |
| 252 | Table pilferage uses FE expected | Use backend value |
| 271 | Displays FE formula result | Display `w.balanceToSettle` |
| 274 | Actual Bal placeholder uses FE expected | Use backend balance |
| 389 | Error message recomputes | Use backend balance |
| 410 | Confirm disabled compares against FE formula | Compare against backend balance |

**Meanwhile FE CORRECTLY uses `w.balanceToSettle` at lines 89, 90, 93, 94, 249, 374.**

## Fix Required
- **FE ONLY** — replace all 9 instances of `w.totalFunds - w.settled` with `w.balanceToSettle`
- Zero business logic in FE — just trust the backend value
- **Owner approval needed** (R6 financial logic)

## Files
- `SettlementPanel.jsx` — lines 104, 106, 145, 146, 250, 252, 271, 274, 355, 389, 395, 410
