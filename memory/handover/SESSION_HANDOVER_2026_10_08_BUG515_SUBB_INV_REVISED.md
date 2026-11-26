# Session Handover — BUG-515 Sub-B Revised Investigation (2026-10-08)

**Role:** INVESTIGATION (Round 2 — "no changes visible" after implementation)
**Status:** COMPLETE — root cause identified HIGH confidence

---

## Summary

Fix E-5/E-6/E-7 is present, compiled, and architecturally correct on THIS pod (react-app-deploy-20).
User tests at core-pos-front-5 (DIFFERENT pod) — that pod has no E-5/E-6/E-7.
Action needed: DEPLOY this pod's code to production so user can test at core-pos-front-5.

---

## Root Causes

**RC1 (Environment):** react-app-deploy-20 ≠ core-pos-front-5. User sees old code.
**RC2 (Code, on core-pos-front-5):** joinRowBalances without E-5 drops discount fields. renderExpansion without E-6/E-7 passes raw snap row. hasDiscount always false. Rack data always shown.

## "..." balance column explained

BUG-435 focus-refresh between screenshots triggered snap reload → setBalances(undefined) → "...". Expected graceful degradation. NOT a separate bug.

## Next

Deploy this pod → user can verify fix at core-pos-front-5.
Or owner tests fix at react-app-deploy-20.preview.emergentagent.com directly.

Report: investigations/INV-BUG515-SUBB-REVISED-2026-10-08.md
