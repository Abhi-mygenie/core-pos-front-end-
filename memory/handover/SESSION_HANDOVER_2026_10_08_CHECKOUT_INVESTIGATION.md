# Session Handover — Checkout Phase Investigation (2026-10-08)

**Role:** INVESTIGATION
**Status:** COMPLETE — 4 root causes identified HIGH confidence, 7/10 steps

---

## Summary

Checkout phase (FolioCheckoutPanel.jsx) has 4 confirmed issues + 1 answered owner question.
No code changes made this session.

---

## Findings

| # | Issue | Root cause | Fix scope |
|---|---|---|---|
| A | VAT item shows "GST 22%" label | folioTransform.js missing taxType; FolioCheckoutPanel L193 hardcodes "GST" | Fast Lane eligible (2 files, ~3 lines) |
| B | Room discount % formula wrong | roomDiscountRs applies % to baseBalance (not bc) at L47/L261/L313 | PLANNING (R6, 3 edit sites) |
| C | 'Both' display ≠ payload (BUG-499 gap) | RoomSection display = min(800,600)=600 but handlePaid sends floor(800/2)=400 | PLANNING (R6, multiple sites) |
| D | Room discount controls on LEFT | Statement/RoomSection interactive on left; user wants right-only | PLANNING (structural, ~50 lines moved) |

## Owner Question Answered

"Should not give discount more than balance_due" → YES, Amount mode already capped at `baseBalance`. But % formula is wrong (Issue B).

---

## Next

Owner decides:
1. Issue A: Fast Lane GO? (safe, display-only)
2. Issue B+C: Gate 2 GO → Planning (together, R6)  
3. Issue D: Owner confirms layout spec → Gate 2 GO → Planning

Report: investigations/INV-CHECKOUT-PHASE-2026-10-08.md
