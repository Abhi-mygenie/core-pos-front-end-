# POS 3.0 BUG-108 — Loyalty Phase C API Reconciliation Update

**Date:** 2026-05-23 (later)
**Supersedes:** API readiness verdict in `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEMPTION_PLAN_2026_05_23.md` (§9, §10, §19) and my own placeholder handoff `POS3_0_BUG_108_LOYALTY_PHASE_C_BACKEND_API_HANDOFF_2026_05_23.md`.
**Authoritative CRM source:** `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` (CR-001C-LX, LX-A, GREEN-LIGHT 2026-05-23, signed off by CRM).

---

## 1. Why this update exists

The user correctly flagged that my prior Phase C plan and the placeholder handoff I authored treated `POST /pos/loyalty/redeem` and `POST /pos/loyalty/reverse` as "expected endpoints the backend team needs to build." Those names came from the planning prompt — they were **not** validated against the existing CRM contract.

After re-reading the CRM-authored handoff, the picture is materially different.

Updated status:

```
bug_108_loyalty_phase_c_redemption_deferred_per_crm_handoff_pending_owner_recommission_decision
```

---

## 2. What the authoritative CRM handoff actually says

### 2.1 Phase scope (§1)

CR-001C-L (LX-A) ships **read-only loyalty contract only**. Three endpoints touched: `/pos/customer-lookup`, `/pos/customers/{id}`, `/pos/customers/{id}/loyalty`. All three serve the strict 6-key loyalty blob `{ tier, tier_label, total_points, ratio_per_point, points_value, loyalty_enabled }`.

§1 Phase mapping row states verbatim:

> "§4 redemption / debit / reversal endpoints | Future redemption CR | **Deferred indefinitely per owner sign-off**"

### 2.2 Redemption endpoints (§8.2)

Verbatim table:

| Deferred endpoint | CRM reason |
|---|---|
| `POST /pos/loyalty/redeem` | "Q4 — deferred to future redemption CR" |
| `POST /pos/loyalty/reverse` | **"Q5 — no reversal needed"** |
| `POST /pos/coupons/redeem` | "Q4/Q5 — deferred" |
| `POST /pos/coupons/reverse` | "Q5 — not needed" |
| `POST /pos/wallet/debit` | "Q4 — deferred" |
| `POST /pos/wallet/credit` (refund) | "Q5 — not needed" |
| `POST /pos/wallet/reverse` | "Q5 — not needed" |

This is **critical**: CRM has not just postponed the reverse endpoint, they've declared it not needed at all. Loyalty rollback (any kind) is currently outside the CRM data-model commitment.

### 2.3 What IS green-lit and consumable by POS (§9.3)

`cr001c_lx_a_loyalty_pos_contract_patched_qa_passed_in_preview` — the 6-key loyalty blob across the three read endpoints. POS may consume in preview, with prod deploy gated on a joint batch with CR-001A Phase 2 + CR-001D.

### 2.4 What does NOT exist in code today

| Endpoint | Frontend constant | Frontend service | CRM route |
|---|---|---|---|
| `POST /pos/loyalty/redeem` | Not present | Not present | Not present |
| `POST /pos/loyalty/reverse` | Not present | Not present | Not present |
| `POST /pos/loyalty/health` | Not present | Not present | Not present |

`grep -rn "loyalty/redeem\|loyalty/reverse\|loyalty/health" /app/frontend/src/` → **zero hits.** `/app/frontend/src/api/constants.js` has no loyalty redemption endpoint constants. The endpoints my plan listed are **conceptual / aspirational** — not gaps the backend team is currently chartered to fill.

---

## 3. What's different from my prior Phase C plan / handoff

| Topic | My placeholder said | Authoritative CRM says | Corrected position |
|-------|--------------------|------------------------|--------------------|
| `/pos/loyalty/redeem` status | "BLOCKER — backend must build" | "Deferred indefinitely per owner sign-off" | Not a backend prioritization issue — it's an owner-policy gate. Owner must re-commission. |
| `/pos/loyalty/reverse` status | "BLOCKER — backend must build" | **"Q5 — no reversal needed"** (CRM has explicitly declined to build) | Phase C plan cannot assume a reverse endpoint exists. Owner must explicitly reverse Q5 to put it back on the table. |
| Recommended Phase C path | "Phase C2 + C3 + C4 staged" | (Not addressed by CRM doc — out of CRM scope) | Phase C2 still feasible (frontend wiring behind kill-switch); Phase C3 blocked on owner-recommission, not backend availability. |
| API contract for redeem | I drafted a contract | No CRM-side contract exists | My draft remains a **proposal** to CRM if and when redemption CR is re-opened. It is not yet a committed CRM contract. |
| `loyalty_enabled` field | I asked CRM to add it | **CRM has already shipped it** in the 6-key blob (§3) | GAP-C3 from my plan is RESOLVED. |
| `ratio_per_point` canonicalization | I asked CRM to add it | **CRM has already shipped it** (§3 + §5) | GAP-C5 from my plan is RESOLVED. |
| Per-tier `points_value` resolution | I assumed flat 1.0 | CRM resolves per-tier with fallback chain `per-tier override → restaurant-level → 0.25` | POS frontend should use `loyalty.points_value` directly — already correct in Phase B. |
| Max-usable cap | I asked CRM to add it (GAP-C4) | Not in current contract; out of scope per BUG-108 | Owner Q-L4 already answered: "CRM enforces cap; POS caps at min(points_value, subtotal)". My GAP-C4 was redundant. |
| `POST /pos/loyalty/health` | I suggested as optional | Not in CRM scope | Drop the ask — unnecessary. |

---

## 4. Updated Gap Register (corrected)

| Gap ID | Item | Severity | New status |
|--------|------|----------|------------|
| **GAP-C1** (redeem endpoint) | `POST /pos/loyalty/redeem` does not exist | **OWNER-DEFERRED** (not backend-blocked) | Owner sign-off says deferred indefinitely. To proceed with Phase C3, owner must re-open the redemption CR. |
| **GAP-C2** (reverse endpoint) | `POST /pos/loyalty/reverse` not in CRM commitment | **CRM-DECLINED** ("Q5 — no reversal needed") | If owner re-opens redemption, they must also re-decide Q5. Without reverse, payment-failure rollback is not possible — only mitigation is to redeem AFTER payment success (owner Q3=A path), accepting points-debited-but-payment-failed as a rare failure mode for manual recovery. |
| ~~GAP-C3~~ (`loyalty_enabled`) | ~~Missing field~~ | RESOLVED | Already in CRM 6-key blob since LX-A. |
| ~~GAP-C4~~ (max usable cap) | ~~Cap policy~~ | RESOLVED / OUT-OF-SCOPE | Owner Q-L4 = C: CRM enforces; POS caps at min. |
| ~~GAP-C5~~ (canonical `ratio_per_point`) | ~~POS back-computed~~ | RESOLVED | Now first-class in the 6-key blob. |
| ~~GAP-C6~~ (idempotency contract) | ~~Documented~~ | DEFERRED — N/A until redeem endpoint exists. Idempotency stays as a requirement on any future redemption-CR contract. |
| ~~GAP-C7~~ (health endpoint) | ~~Optional~~ | DROPPED. Not needed. |
| **GAP-C8** (order-cancellation hook) | If a redeemed order is later cancelled / refunded, what happens? | **CRM-DECLINED via Q5** | Same status as GAP-C2 — no reverse path exists. |

Net: of the eight original Phase-C gaps, **three resolved** by the existing CRM contract, **two declined** by CRM (redeem + reverse), **two dropped** (cap, health), and **one deferred** (idempotency — moot without endpoint). My placeholder handoff overstated the backend "asks" by 4-5 items.

---

## 5. Updated API Readiness Verdict

```
deferred_per_crm_handoff_owner_signoff
```

Not `backend_blocked` (implies a backend ticket is in flight) — this is `deferred_indefinitely` per the CRM handoff's exact phrasing.

To move to `ready_for_phase_c2_implementation`, the owner must answer the existing Phase C planning Q1–Q8 **plus** two new questions arising from the reconciliation (see §6).

To move to `ready_for_phase_c3_implementation`, the owner must:
1. Re-commission the redemption CR (overrides the current "deferred indefinitely" sign-off).
2. Decide whether to ask CRM to also build the reverse endpoint (overrides current Q5 "not needed" decision) — or accept the no-rollback constraint.

---

## 6. Two NEW Owner Questions (arising from reconciliation)

These supplement the eight Q1–Q8 already in `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEMPTION_PLAN_2026_05_23.md`.

**Q9. The 2026-05-22 owner sign-off deferred the redemption CR indefinitely (per CR-001C-LX handoff §1). To enable Phase C live redemption, this sign-off needs to be reversed. Do you want to:**
- A. Re-commission the redemption CR now (CRM team starts building `POST /pos/loyalty/redeem` per the proposed contract in §9 of Phase C plan) ← **recommended if Phase C is in this sprint**
- B. Keep redemption deferred; only proceed with Phase C2 (frontend kill-switch wiring + legacy field cleanup) and ship Phase C3 later
- C. Drop Phase C entirely from BUG-108 scope; BUG-108 closes after Phase B + Customer Pipeline + CustomerModal Search

**Q10. CRM has explicitly marked `POST /pos/loyalty/reverse` as "Q5 — no reversal needed". Without it, payment-failure rollback is impossible. Pick one:**
- A. Ask CRM to also build the reverse endpoint (re-opens Q5; cleanest safety story) ← **recommended**
- B. Accept "no reverse" — proceed with the safer order-of-operations: redeem AFTER payment success only (owner Q3 effectively forced to A). Failure mode = "payment settled, points didn't debit" → manual CRM-side fix. POS surfaces an inline error and a retry button.
- C. Defer Phase C3 until the reverse decision is revisited

---

## 7. What Phase C2 looks like with the corrected picture

Phase C2 (frontend wiring behind a kill-switch) is still feasible **without** any new CRM endpoint, because Phase C2's deliverable is purely defensive frontend code:

- Replace `customer?.loyaltyPoints` (singular, dead) with `customer?.loyalty?.points_value`/`customer?.loyalty?.total_points`/`customer?.pointsValue`/`customer?.totalPoints` at the five sites in `CollectPaymentPanel.jsx`.
- Mirror the `BUG108_FLAGS.loyaltyRatioLive ? ... : 0` flag pattern from `orderTransform.js:1356/1768` into the place-order / prepaid / update-order sites at L908/L1026/L1153 — currently hardcoded zero.
- Build the UI state machine (idle/redeeming/redeemed/error) and the inline error region.
- Wire a `redeemLoyalty` service stub that throws "Redemption API not yet available" when called — so the UI machine can be fully tested without a live endpoint.
- Add a new sub-flag `loyaltyRedeemLive` defaulting to `false` so the redeem-API path stays inert.

This is risk-zero (flag stays off in prod) and unblocks Phase C3 the moment owner Q9 = A and the new CRM endpoint(s) land.

---

## 8. Updated Implementation Readiness Verdict

| Sub-phase | Verdict | Blocker |
|-----------|---------|---------|
| C1 (planning) | **DONE** | none |
| **C1.5 (this reconciliation)** | **DONE** | none |
| C2 (kill-switched frontend wiring) | `waiting_owner_answers` | Q1–Q8 from main plan + Q9, Q10 from this update |
| C3 (live redemption) | `deferred_per_crm_handoff_owner_signoff` | Owner Q9 + Q10 + CRM delivery of the re-commissioned endpoint(s) |
| C4 (owner smoke) | dependent on C3 | — |

---

## 9. Status of the placeholder handoff doc

The file at:
`/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_BACKEND_API_HANDOFF_2026_05_23.md`

was authored by me in the prior turn before reconciling. It is **not authoritative**. Its API shape proposal can stay on file as a **draft proposal** for if/when the redemption CR is re-commissioned (Q9 = A), but it does not represent a current CRM commitment. The authoritative loyalty contract remains `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`.

A header should be added to that placeholder file marking it as `DRAFT / SUPERSEDED FOR PHASE B; PROPOSAL FOR FUTURE REDEMPTION CR`. (Not done here; calling it out so the next agent can either annotate or delete.)

---

## 10. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed by this reconciliation | Confirmed |
| 2 | No backend changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redemption / reverse API invoked (none exist) | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | Authoritative CRM handoff at `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` is now the single source of truth for loyalty endpoint contract | Confirmed |
| 8 | My prior placeholder handoff doc remains on disk but is now superseded for the read-only contract; it remains as a draft proposal for the still-deferred redemption CR | Confirmed |

---

**End of BUG-108 Loyalty Phase C API Reconciliation Update.**
