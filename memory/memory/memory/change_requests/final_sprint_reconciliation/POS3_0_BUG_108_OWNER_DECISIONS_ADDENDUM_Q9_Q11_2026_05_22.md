# POS 3.0 BUG-108 — Owner Decisions Addendum (Q9-Q11)

**Date:** 2026-05-22
**Recorded by:** Senior POS3.0 BUG-108 Frontend UX Planning Agent
**Trigger:** Owner replied to the 3 new questions surfaced by baseline reconciliation (`POS3_0_BUG_108_BASELINE_RECONCILIATION_NOTE_2026_05_22.md` §5).
**Pairs with:** `POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md` (Q1-Q6) + `POS3_0_BUG_108_FRONTEND_UX_PLANNING_AND_OWNER_APPROVAL_2026_05_22.md` (Q1-Q8).
**Scope:** Recording decisions only. No code changes, no API wiring, no edits to existing BUG-108 docs.

---

## 1. Status

```
bug_108_owner_decisions_q9_q11_recorded_q10_introduces_ui_gating_change_for_p1
```

Two of the three answers (Q9, Q11) **defer** behavior to the future redemption / wallet CR — no impact on BUG-108 P1. One answer (Q10) is an **immediate UI behavior change** for BUG-108 P1.

---

## 2. Decisions

### Q9. Coupon + Loyalty + Wallet combinability (from CQ-CR-11)

**Original question:** Should coupon + loyalty + wallet combine additively (current behavior) or be mutually exclusive?

**Owner answer:**
> "Coupon will combine with loyalty — we will discuss when coupon we work on."

**Interpretation:**
- Coupon and Loyalty **can combine** on the same order (this is the owner's stated intent).
- Wallet combinability sits with the future wallet CR (per Q11 below).
- Final stacking rules across all three will be set in the **future Coupon CR** (the deferred redemption CR from Q4).

**Impact on BUG-108 P1:**
- **None.** P1 is read + validate only — no redemption math changes.
- Current additive code behavior in `CollectPaymentPanel.jsx:517` stays untouched.
- Payload-safety plan (§10 of UX Plan) continues to force loyalty/wallet payload fields to zero pre-redemption-CR.

---

### Q10. Manual discount vs. coupon — stack or override? (from CQ-CR-12)

**Original question:** If a cashier applies both a manual discount AND a coupon, should they stack (current behavior) or should the coupon override the manual?

**Owner answer:**
> "Override — either manual discount or coupon, one can be applied."

**Interpretation:**
- **Mutual exclusivity rule:** at any given time, **only one** of {manual discount, coupon} can be active on an order.
- Neither overrides the other automatically; the cashier must remove one before applying the other.

**Impact on BUG-108 P1 — IMMEDIATE UI CHANGE REQUIRED:**

| Current behavior (`CollectPaymentPanel.jsx`) | Required new behavior |
|----------------------------------------------|------------------------|
| Manual discount input + Coupon input are independent; both can be non-zero simultaneously; `totalDiscount` sums them (line 517) | The two are mutually exclusive at the **UI level** — applying one disables the other; the cashier must clear one to switch |

**Proposed UI gating (for next planning pass — not implemented here):**

1. **When a manual discount is entered (>0):**
   - Coupon section "Apply" button is **disabled**.
   - Coupon input is **disabled**.
   - Helper text on coupon section: *"Remove the manual discount to apply a coupon."*

2. **When a coupon is applied (`selectedCoupon !== null`):**
   - Manual discount input is **disabled** (value preserved but read-only, greyed out).
   - "Clear coupon" link visible (existing Remove button works).
   - Helper text on discount section: *"Remove the coupon to apply a manual discount."*

3. **Order of operations:**
   - If cashier tries to apply a coupon while manual discount is active → block with inline error: *"Remove manual discount first."*
   - If cashier tries to enter manual discount while coupon is active → block with inline error: *"Remove coupon first."*

**Payload safety:**
- Since current local computation already sums both, `totalDiscount` works either way at the math level. The fix is **purely UI gating**. No transform changes required.

**Open sub-question (recommended to ask owner before P1 implementation):**

> When a cashier removes one (e.g., removes the coupon to apply a manual discount), should the other auto-clear, or should the cashier manually re-enter it?

**Recommended default:** Manual switch (cashier-driven). Auto-clear can cause accidental loss of work.

---

### Q11. BUG-104 ↔ BUG-108 overlap — Credit/tab customer + CRM wallet/loyalty (from OQ-CR-05)

**Original question:** When a credit/tab customer eventually settles, should CRM loyalty/wallet rules apply on the settlement payment?

**Owner answer:**
> "It will attach to wallet — we will take in wallet CR."

**Interpretation:**
- The credit ↔ wallet linkage (e.g., a credit customer's tab balance can be settled from their CRM wallet, OR settling a tab earns loyalty points, OR the credit balance lives in the wallet) is **fully deferred to the future wallet CR**.
- The wallet CR will own:
  - Whether credit balances are stored separately or as a wallet sub-balance.
  - Whether tab settlement triggers CRM loyalty earnings.
  - Whether a credit customer can pay their tab using wallet balance.

**Impact on BUG-108 P1:**
- **None.** Out of scope per owner.
- BUG-104 continues with its current mobile-number-based model (PAY-008 rule). No CRM `customer_id` linkage in BUG-108 P1.

---

## 3. Reconciliation Note — Updated Verdict

After Q9-Q11 answers, the reconciliation note's gap count changes:

| Bucket | Before Q9-Q11 | After Q9-Q11 |
|--------|----------------|--------------|
| Hard conflicts with baseline | 0 | 0 |
| Owner-approved overrides | 3 | **4** (added Q10 manual-vs-coupon override) |
| Gaps surfaced by baseline | 3 (Q9, Q10, Q11) | **0** (all answered) |
| Cross-CR overlaps to coordinate | 2 | 2 (BUG-099, BUG-104 ↔ wallet CR) |
| Already-aligned items | 6 | 6 |
| Format requirements for P1 handoff | 1 | 1 |

**Net new BUG-108 P1 implementation item from Q10:**

- **UI gating** between manual discount input and coupon section in `CollectPaymentPanel.jsx` (both the standard view at lines 940-1003 and the room-service inline mirror at lines 1391-1462).

---

## 4. Updated Recommended P1 Scope

In addition to the original P1 scope (`UX Plan §6.4` + `§10`), P1 must now include:

| Item | Files | Risk |
|------|-------|------|
| Manual discount ↔ Coupon mutual-exclusivity UI gating | `CollectPaymentPanel.jsx` (standard view + room-service inline mirror) | **Low** — UI-only, no transform changes |
| Helper text for both states ("Remove manual discount to apply coupon" / vice versa) | Same component | Low |
| Inline error on user attempts to apply both | Same component | Low |
| Verify totalDiscount math still works correctly when one is zeroed | `CollectPaymentPanel.jsx:517` | **Trivial** — math already handles zero contributions |

**Payload safety:** Unchanged. If both manual and coupon are simultaneously non-zero (shouldn't happen under new UI gating but as a defense), `orderTransform.js` does not need to take a side — the UI prevents the state.

---

## 5. Pending Sub-Question Before P1 Kickoff

> **Q10-sub:** When the cashier removes a manual discount (or removes a coupon), should the other auto-fill / auto-clear, or stay as the cashier set it?

Three options for owner:
- **(A)** Manual switch only — cashier removes one, then manually applies the other. ← **Recommended (predictable, no surprises)**
- **(B)** Auto-clear the other when one is applied — accidental loss risk if cashier was mid-edit.
- **(C)** Keep the value (greyed out) and re-enable when the other is removed — preserves state, slight complexity.

**This is a P1 implementation detail, not a blocker for owner approval of UX direction. Can be answered alongside the existing Q1-Q8 in the UX Planning doc.**

---

## 6. Open Items Remaining for BUG-108 P1 Kickoff

After this addendum, the **only** remaining blockers are:

1. **Owner approval of Q1-Q8** (in `BUG_108_FRONTEND_UX_PLANNING_AND_OWNER_APPROVAL_2026_05_22.md` §11) — Q1-Q8 are still awaiting owner tick.
2. **Owner approval of Q10-sub** (auto-clear vs manual-clear in §5 of this addendum).
3. **BUG-099 sprint status check** to coordinate the `CollectPaymentPanel.jsx` hotspot.
4. **Loyalty-page screenshot** from owner (for Q3 tier→ratio mapping).
5. **CRM team responses** to the 5 asks in `BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md`.

Once 1-5 are resolved, an Implementation Handoff doc (following the CR Playbook 10-step format from `final/CHANGE_REQUEST_PLAYBOOK.md`) can be produced and 108-P1 can kick off.

---

## 7. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend or backend code was changed | ✅ |
| 2 | No existing BUG-108 doc was edited | ✅ |
| 3 | No baseline doc was edited | ✅ |
| 4 | No APIs invoked | ✅ |
| 5 | No data mutated | ✅ |
| 6 | Only one new file created: this addendum | ✅ |

---

**End of BUG-108 Owner Decisions Addendum (Q9-Q11).**
