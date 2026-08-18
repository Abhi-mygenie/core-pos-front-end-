# POS 3.0 BUG-108 — Final Owner Approvals (UX Q1-Q8 + Blockers B1-B5 + Q10-sub)

**Date:** 2026-05-22
**Status:** Owner has signed off on the full UX direction + answered all open blocker clarifications.
**Pairs with:**
- `POS3_0_BUG_108_FRONTEND_UX_PLANNING_AND_OWNER_APPROVAL_2026_05_22.md` (Q1-Q8 framing)
- `POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md` (Q1-Q6 from Decision Matrix)
- `POS3_0_BUG_108_OWNER_DECISIONS_ADDENDUM_Q9_Q11_2026_05_22.md` (Q9-Q11)
- `POS3_0_BUG_108_BASELINE_RECONCILIATION_NOTE_2026_05_22.md` (gap analysis)
- `POS3_0_BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md` (5 CRM asks)

---

## 1. Status

```
bug_108_owner_approvals_complete_one_soft_conflict_flagged_p1_implementation_handoff_can_be_drafted
```

All Q1-Q8 + Q10-sub + B1-B5 answered. **One soft conflict** between B2 ("ideally coupon should be owned by CRM") and earlier Q1 ("POS backend owns catalog") — flagged in §5 for owner clarification. Does not block P1 UX work since the UI/payload-safety direction is the same either way.

**Remaining open items (not blocking P1 UX work):** B6 (BUG-099 status check) and B7 (CR Playbook compliance) — owner did not tick; recommended defaults applied.

---

## 2. UX Q1-Q8 — Final Owner Answers

| Q | Topic | Owner Answer | Notes / Custom Copy |
|---|-------|--------------|---------------------|
| **Q1** | Pre-API coupon UI | **B — Visible but disabled with tooltip** | Helper copy: **"Coming soon"** (owner-specified — replaces my proposed "Coupons temporarily unavailable…") |
| **Q2** | Manual coupon code entry | **A — Allow only after validate API exists** | Manual entry stays gated until `POST /pos/coupons/validate` ships |
| **Q3** | Coupon list placement | **A — Inside Collect Bill payment panel** | Current location preserved |
| **Q4** | Coupon validation errors | **A — Inline only** | No toast. Lower-noise UX. (My ★ was C; owner picked A for simplicity.) |
| **Q5** | Loyalty pre-API | **B — Show redemption input disabled** | With helper text. |
| **Q6** | Wallet pre-API | **B — Show use-wallet input disabled** | With helper text. |
| **Q7** | CRM unavailable | **B — Show disabled sections with banner** | Banner copy: **"loyalty program unavailable"** (owner-specified — replaces my proposed "Customer perks unavailable — CRM is offline.") |
| **Q8** | Phase 1 scope | **C — Full cleanup + read-only loyalty/wallet + disabled coupon + payload safety + Q10 mutual-exclusivity gating** | Full ★ scope confirmed |

### 2.1 Copy Strings — Final Locked Versions

Now that the owner has chosen specific copy for Q1 and Q7, the final tooltip / helper text strings for P1 are:

| Context | Final cashier-facing copy |
|---------|----------------------------|
| Coupon section disabled (pre-API) | **"Coming soon"** |
| Coupon `?` info tooltip | "Coupon support is part of the upcoming CRM integration." (existing) |
| Coupon — no coupons available (post-API) | "No coupons available for this customer right now." |
| Coupon — checking | "Checking…" (spinner inline) |
| Coupon — applied | "Applied: {code} (-₹{amount})" |
| Coupon error `INVALID_CODE` | "Invalid coupon code." |
| Coupon error `EXPIRED` | "This coupon has expired." |
| Coupon error `MIN_ORDER_NOT_MET` | "Minimum order of ₹{min} required for this coupon." |
| Coupon error `NOT_ENTITLED` | "This coupon isn't available for this customer." |
| Coupon error `ALREADY_USED` | "This coupon has already been used." |
| Coupon error `INACTIVE` | "This coupon is no longer active." |
| Coupon error — generic / network | "Couldn't apply coupon. Please try again." |
| Loyalty — points available but redeem disabled | "Loyalty program unavailable" *(matches Q7 banner phrasing for consistency)* |
| Wallet — usage disabled | "Wallet payments will be available after the next update." |
| **CRM unavailable banner (whole section)** | **"loyalty program unavailable"** *(owner-specified)* |

**Display rules per Q4:**
- Coupon validation errors are **inline only** (red text under the input). **No toast.**
- All other helper text remains gray, small (≤12px), italic where appropriate.

---

## 3. Q10-sub — Manual ↔ Coupon Switching Behavior

**Owner answer:** **A — Manual switch only (cashier-driven).**

When the cashier removes a manual discount (or removes a coupon), the **other input does NOT auto-fill or auto-clear**. The cashier must manually re-enter or re-apply the other if desired.

**Implementation impact:**
- Manual discount field: when cleared (set to 0), Coupon section becomes enabled but stays empty.
- Coupon section: when "Remove" is clicked, Manual discount field becomes enabled but stays at 0.
- No auto-fill, no auto-clear, no toast/confirmation. Predictable cashier-driven workflow.

---

## 4. Blockers B1-B5 — Final Owner Answers

| B | Topic | Owner Answer | Notes |
|---|-------|--------------|-------|
| **B1** | `GET /pos/coupons/available` (CRM) | **A — CRM will build, ETA ~2 hours** | Owner confirmed availability soon. Frontend P1 can proceed with the rest while waiting. |
| **B2** | `POST /pos/coupons/validate` ownership | **C — Owner will decide after CRM/POS-BE alignment.** Plus note: *"ideally coupon shd be owned by CRM"* | ⚠️ **Soft conflict with Q1** — see §5 |
| **B3** | Loyalty tier→ratio source | **C — Owner will ask CRM team** | Frontend assumes Option A schema as placeholder |
| **B4** | Sample real `customer.loyalty` blob | **B — Owner will ask CRM team to share** | Awaiting |
| **B5** | Loyalty-page screenshot | **D — Wait** | Tier→ratio mapping is on hold until owner shares or CRM team confirms |

---

## 5. ⚠️ ~~Soft Conflict Flagged~~ → RESOLVED 2026-05-22

**Original flag (now resolved):** I had earlier captured `Q1=a` as "POS backend owns coupon catalog" — that captured against an option text I provided in the Decision Matrix. The owner's actual intent was always: **CRM owns coupons (catalog + entitlement + validation); POS consumes CRM APIs**. This is exactly what Q1 option **(b)** said in the original framing, so the owner answer is corrected to **Q1 = (b)**.

| Source | Captured answer | Correction (2026-05-22) |
|--------|------------------|--------------------------|
| Q1 (Decision Matrix) | (a) POS owns catalog; CRM stores entitlement | **(b) CRM owns both catalog and entitlement; POS queries only** |
| B2 (this round) | (c) decide later; note "ideally CRM-owned" | **(a) CRM team owns validate endpoint** — consistent with corrected Q1 |

**Owner clarification (verbatim):**
> "Menu is owned by POS and coupons are owned by CRM and pos uses CRM api to process coupon — what's the conflict?"

There was no architectural conflict; only a bookkeeping mismatch in how I labeled the Q1 options. The owner's mental model has been consistent throughout:
- **POS** owns: menu, food prices, discount math (when applied to bill), payment collection.
- **CRM** owns: customers, coupons (catalog + entitlement + validate + mark-used), loyalty (balance + tier + ratio), wallet (balance + debit/credit lifecycle).
- **POS calls CRM APIs** to fetch/validate/commit anything CRM-owned.

### 5.1 Downstream Doc Corrections

| Doc | Section that was wrong | Corrected understanding |
|-----|------------------------|--------------------------|
| `BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md` §3.1 | Listed coupon catalog endpoint as POS-backend-hosted | **Should read: CRM-hosted.** `GET /pos/coupons` (catalog) is on CRM, alongside `/pos/coupons/available` and `/pos/coupons/validate` |
| `BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md` §2 Q1 | "POS backend owns coupon catalog…" | **Should read: CRM owns both catalog and entitlement; POS queries only** |
| `BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md` §7 Q1 | "Recommended: (b)" — already correct | Owner-aligned |

**Action:** No re-write of those docs (per "don't edit existing baseline docs" mandate); the correction is recorded **only here** as the authoritative latest answer. Any future implementation handoff must read this file as the source of truth for Q1 + B2 over the earlier docs.

### 5.2 Updated B-line Answers

| B | Corrected answer | Notes |
|---|------------------|-------|
| **B1** | **A** — CRM will build, ETA ~2 hours | Unchanged |
| **B2** | **A** — CRM team owns coupon validate endpoint | **Corrected from C to A** (consistent with clarified Q1) |
| **B3** | C — Owner will ask CRM team | Unchanged |
| **B4** | B — Owner will ask CRM team to share | Unchanged |
| **B5** | D — Wait | Unchanged |

---

## 6. Remaining Open Blockers (Not Answered This Round)

| # | Topic | Recommended default applied |
|---|-------|------------------------------|
| **B6** | BUG-099 sprint status check (CollectPaymentPanel hotspot) | I'll check the sprint-status doc and report back when implementation handoff is drafted |
| **B7** | CR Playbook compliance for P1 handoff | **★ Default applied: YES** — the implementation handoff doc will follow the 10-step format (Impact Analysis + Approval Gate + File-Level Change Plan + Testing Checklist + Handover Note) per `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` |

---

## 7. Net Locked Scope for BUG-108 P1 Implementation

Now that Q1-Q8, Q9-Q11, Q10-sub, and B1-B5 are answered, the P1 scope is **finalized** as:

### 7.1 In Scope (P1)

1. **Remove hardcoded mock catalog** — delete `generalCoupons = [FLAT50, SAVE10]` from `CollectPaymentPanel.jsx:644-647`.
2. **Feature-flag set** (e.g., `BUG108_FLAGS = { couponLive: false, loyaltyRatioLive: false, walletDebitLive: false }`) read by both UI and `orderTransform.js`. Default all to `false` until CRM endpoints are verified live.
3. **Payload safety** in `orderTransform.js` — force `coupon_discount` / `coupon_title` / `coupon_type` / `coupon_code` / `used_loyalty_point` / `loyalty_dicount_amount` / `use_wallet_balance` / `wallet_used_amount` to **zero / empty** whenever the corresponding flag is `false`.
4. **Coupon section UI (Q1=B):**
   - Section visible (when `customer && restaurantSettings.isCoupon`).
   - Input disabled, "Apply" button disabled.
   - Helper text: **"Coming soon"**.
5. **Loyalty section UI (Q5=B):**
   - Section visible, points + tier rendered read-only.
   - "Use Loyalty" checkbox disabled.
   - Helper text: **"Loyalty program unavailable"**.
6. **Wallet section UI (Q6=B):**
   - Section visible, balance rendered read-only.
   - "Use Wallet" checkbox disabled, amount input hidden.
   - Helper text: **"Wallet payments will be available after the next update."**
7. **Q10 mutual-exclusivity gating** between Manual Discount and Coupon:
   - If `manualDiscount > 0` → Coupon section disabled even when CRM is live, helper: *"Remove the manual discount to apply a coupon."*
   - If `selectedCoupon !== null` → Manual discount input disabled, helper: *"Remove the coupon to apply a manual discount."*
   - **No auto-clear / no auto-fill** (Q10-sub = A).
8. **CRM-unavailable banner (Q7=B):**
   - When CRM call fails (`crmAxios` error), show banner at top of Coupon/Loyalty/Wallet block.
   - Banner copy: **"loyalty program unavailable"**.
9. **Validation errors (Q4=A — inline only):**
   - When validate API exists (post-CRM ETA ~2h), render errors **inline only** below the input. No toast.
10. **Synced changes** in **both** views inside `CollectPaymentPanel.jsx`:
    - Standard view (lines 940-1003 ≈)
    - Room-service inline mirror (lines 1391-1462 ≈)

### 7.2 Deferred / Out of Scope (P1)

- Real coupon validate API wiring (P2 — once B1/B2 endpoints land).
- Per-tier loyalty ratio math (P2 — once B3/B4/B5 arrive).
- Wallet debit lifecycle (separate Wallet CR, per Q4 + Q11).
- Coupon redemption / "mark used" / reversal (separate Coupon CR, per Q4 + Q5 + Q11).
- ROI report (separate `108-ROI` ticket, per Q6).
- BUG-099 coordination (B6 — to be verified).

---

## 8. Documents Updated By This Round

| Doc | Update |
|-----|--------|
| `POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md` | **NEW** (this file) |
| `POS3_0_BUG_108_FRONTEND_UX_PLANNING_AND_OWNER_APPROVAL_2026_05_22.md` | Appending an "Owner Answers Captured" section pointing to this file (lightweight reference, original Q1-Q8 framing preserved) |
| `POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md` | **No edit** — Q1-Q6 from that doc remain intact; the B2 soft conflict is captured here in §5 |
| `POS3_0_BUG_108_BASELINE_RECONCILIATION_NOTE_2026_05_22.md` | **No edit** — gap count noted as "fully closed" via this file |
| `PRD.md` | Appending one summary line |

---

## 9. Next Action Items

| # | Action | Owner | Blocker for |
|---|--------|-------|-------------|
| 1 | Resolve B2 soft conflict definitively (CRM vs POS-BE for coupon validate) before P2 | Owner + CRM + POS-BE | 108-P2 |
| 2 | Share sample `customer.loyalty` blob from preprod | Owner / CRM team | P2 loyalty implementation |
| 3 | Share Loyalty-page screenshot / paste tier→ratio table | Owner | P2 loyalty implementation |
| 4 | Confirm `GET /pos/coupons/available` is live (B1 ETA ~2h) | CRM team | P2 coupon implementation |
| 5 | Verify BUG-099 sprint status to avoid CollectPaymentPanel.jsx hotspot collision | Frontend agent (read-only check) | P1 kickoff |
| 6 | Produce CR Playbook 10-step P1 handoff doc | Next agent | P1 code start |

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend or backend code was changed | ✅ |
| 2 | No baseline doc was edited | ✅ |
| 3 | Existing BUG-108 Q1-Q8 framing preserved (this file references it; doesn't overwrite) | ✅ |
| 4 | Soft conflict between Q1 and B2 surfaced for owner clarification | ✅ |
| 5 | No APIs invoked | ✅ |
| 6 | No data mutated | ✅ |

---

**End of BUG-108 Final Owner Approvals.**
