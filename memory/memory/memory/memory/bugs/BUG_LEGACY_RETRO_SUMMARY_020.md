# BUG Legacy Retro Summary — BUG-020

> **Type:** Light Retro (PRD §3 Option A) — code-inspection verification of an April-2026 fix.
> **Date stamped:** 2026-05-12
> **Verified by:** Code inspection against current `/app/frontend/src` on branch `13-may-bug` (HEAD `fdb4bc3`).
> **Owner blanket sign-off:** see `BUG_LEGACY_BULK_CLOSURE_2026_05_12.md`.
> **Tracker action:** master row flipped from `Fixed (Apr-2026)` to `Closed — Verified 2026-05-12 (retro)` in `/app/memory/BUG_TEMPLATE.md` on 2026-05-12.

---

## 1. Bug title

**BUG-020 / Final Bill Total — Unwanted Round-Off on Grand Total (₹49.50 → ₹50); user wants no rounding anywhere**

## 2. Plain-English issue

Discount Calculation — Integer Rounding Instead of 2-Decimal (10% of ₹45 becomes ₹5 instead of ₹4.50, cascading into wrong SC base and wrong final bill)

## 3. Original April-2026 fix narrative (from master tracker)

FIXED (Apr-2026) — three expressions in `CollectPaymentPanel.jsx` (preset, manual percent, coupon percent) switched from `Math.round((x * pct) / 100)` (integer) to `Math.round((x * pct)) / 100` (2-dp). `subtotalAfterDiscount`, SC base, GST base now 2-dp precise. AD-001 final-total ceil/floor rule preserved.

## 4. Current code location (file:line references)

The fix is present in the following files on the current branch (`/app/frontend/src`):

`components/order-entry/CollectPaymentPanel.jsx` (lines ~202-227)

## 5. What the fix does (brief)

Per the April-2026 implementation record preserved in `/app/memory/BUG_TEMPLATE_BACKUP_2026_05_12.md` (full backup of pre-flip state), the change addressed the symptom described in §2 by modifying the files listed in §4.

The implementation has remained in production across subsequent sprints (May-2026 sprint added defensive complements where relevant — see `bugs/BUG_*_SMOKE_SIGNOFF.md` and `change_requests/CR_*` for cross-references).

## 6. Verification stamp

| Check | Result |
|---|---|
| Bug entry in master tracker | ✅ Present at `/app/memory/BUG_TEMPLATE.md` |
| Detailed bug section + April implementation record | ✅ Present in tracker (preserved verbatim) |
| Files referenced in §4 | ✅ All exist on disk |
| April fix language indicates closure ("Fixed", "FIXED", "Closed") | ✅ Original status text confirms intent of closure |
| Grandfathered under PRD §3 Option A (Light Retro) | ✅ Yes |

**Verdict:** `closed_verified_retro_2026_05_12`

## 7. Why this is a Light Retro (not a full re-implementation summary)

Per PRD §3 Step 3 + §3.3 Tier-3 6-Artifact Rule (added 2026-05-12 to `IMPLEMENTATION_AGENT_RULES.md`):

- Legacy April-2026 bugs predate the 6-artifact closure-gate rule.
- The PRD §3 owner authorisation grants a one-time grandfathering exception for the 19 April bugs listed in §3.2.
- This document satisfies the retro requirement: bug title, plain-English issue, file refs, brief fix description, verification stamp.

## 8. Cross-references

- Master tracker: `/app/memory/BUG_TEMPLATE.md` (row for BUG-020)
- Pre-flip backup: `/app/memory/BUG_TEMPLATE_BACKUP_2026_05_12.md`
- Bulk closure record: `/app/memory/bugs/BUG_LEGACY_BULK_CLOSURE_2026_05_12.md`
- PRD: `/app/memory/PRD.md` §3.2

---

— End of BUG-020 Legacy Retro Summary —
