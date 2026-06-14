# POS 3.0 BUG-108 — Loyalty Phase C Redeem-Only Continuation Status Check

**Date:** 2026-05-23 (later)
**Persona:** BUG-108 Loyalty Phase C Redeem-Only Continuation Status Agent
**Mode:** Status check ONLY — no implementation, no edits, no API calls, no data mutation
**Authoritative planning doc:** `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md`
**Authoritative CRM contract:** `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`

---

## 1. Status Check Verdict

```
bug_108_loyalty_phase_c_redeem_only_preprod_plan_waiting_owner_implementation_approval
```

Verdict: Status matches the expected status from the prompt. No drift detected. The latest accepted planning doc is the Redeem-Only Preprod Plan (2026-05-23, later). Phase B is owner-smoke PASSED and intact. Phase C is scoped to **redeem-only**; reverse/coupon/wallet are deferred. Q1–Q5 owner answers are intended (A/A/C/A/A) but **not yet formally captured** in a dedicated owner-approval document.

Sub-verdict on readiness (per plan §20 — `split_backend_frontend_required`):
- CRM redeem API contract: fully spec'd; implementation not started; CRM team can begin immediately (Q1–Q5 do not block contract).
- POS frontend C-FE-1 (kill-switched wiring): can start in parallel; merge blocks on Q1–Q5 written approval.
- POS frontend C-FE-2 (live wiring): blocked on CRM redeem API live on preprod + Q1–Q5 written approval + C-FE-1 merged.
- Joint preprod QA / owner smoke / prod release: gated downstream per §17/§20.

---

## 2. Docs Read

1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` (full, 813 lines)
2. `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` (§1, §2, §8.2 inspected; doc is 426 lines)
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_API_RECONCILIATION_UPDATE_2026_05_23.md` (§1, §2 inspected; doc is 183 lines)
4. POS frontend code surface:
   - `/app/frontend/src/utils/BUG108_FLAGS.js` (current flag set)
   - `/app/frontend/src/api/services/` (no `loyaltyService.js`)
   - `/app/frontend/src/api/transforms/` (no `loyaltyTransform.js`)
   - grep `/app/frontend/src/` for `loyalty/redeem|pos/loyalty|redemption_id|redeemLoyalty` → **0 hits**
5. POS backend scaffold (`/app/backend/`) — confirmed it is unrelated scaffold; CRM redeem API would live in the CRM repo (`https://crm.mygenie.online/api`), not in this codebase.

Indexed but not exhaustively re-read:
- Phase B closure docs (Phase B Implementation Report, Customer Pipeline Fix Implementation Report, Phase B Owner Smoke PASS report) — referenced by §3 of the plan as still authoritative.

---

## 3. Latest Accepted Scope

**Redeem-Only Preprod Plan** is the latest accepted scope (supersedes the earlier "Full Preprod Implementation Plan" only in the reverse-API stance).

In scope (Phase C, this plan):
1. CRM backend: ONE new endpoint — `POST /api/pos/loyalty/redeem` (commit-only; atomic; idempotent; audit-logged; no reservation; no reverse).
2. POS frontend: enable existing loyalty checkbox under new `loyaltyRedeemLive` flag; state machine; double-click guard; inline errors; "Remove" allowed only pre-payment.
3. POS payload wiring: populate `used_loyalty_point`, `loyalty_dicount_amount` (typo preserved), and new `loyalty_redemption_id` on the bill-payment / settlement / print payloads after successful redeem.
4. Sequence: **A-resolved** — redeem AFTER cashier confirms intent and BEFORE payment gateway (gives cashier the correct discounted total to charge).
5. Failure handling without reverse: orphan-debit detection, persistent yellow banner with `redemption_id`, localStorage persistence, manual admin reconciliation path documented.
6. Calculation: pre-tax discount; `min(points_value, subtotal_after_other_discounts)`; integer points; 2-dp rupees.
7. Audit: one CRM ledger row per redeem; idempotency table on CRM side.
8. Preprod QA matrix (32 cases) + owner smoke gated subset.

Hard non-scope: reverse/rollback API, auto-reverse, reservation/two-phase, coupon, wallet, earn/accrual, production release, `/app/memory/final/`, baseline docs, `orderTransform.js` math beyond payload flips, payment-gateway changes, dead-code cleanup beyond the 5 `customer?.loyaltyPoints` legacy reads.

---

## 4. Owner Answers Q1–Q5 Status

**Intended answers (received in this continuation prompt):**
- Q1 = A. Redeem after payment success.
- Q2 = A. Apply max available capped amount.
- Q3 = C. Follow current POS discount convention.
- Q4 = A. If redeem succeeds but final order/payment fails, show manual recovery warning and log `redemption_id`.
- Q5 = A. Production release not approved until preprod QA + owner smoke.

**Where they are captured today:** Only as "RECOMMENDED" lines inside §19 of the plan doc. **No dedicated owner-approval document yet exists** for Phase C Redeem-Only Q1–Q5.

**Cross-check against plan recommendations (§19):**
- Q1: prompt says "A. Redeem after payment success." Plan's §10 recommendation is **A-resolved** (= redeem AFTER cashier confirms intent, BEFORE payment gateway). Both are labelled "A" in the plan but they are not the same sequence. **Minor reconciliation needed** when the formal owner-approval doc is authored — confirm whether owner means strict "after payment success" (plan §10 Option A, with cashier-visible-discount caveat) or A-resolved (the actual recommendation). This is a clarification, not a blocker.
- Q2: prompt A = plan recommended A. Aligned.
- Q3: prompt C = plan recommended C (which equals A in outcome: pre-tax / current POS discount convention). Aligned.
- Q4: prompt A = plan recommended A. Aligned.
- Q5: prompt A = plan recommended A. Aligned.

**Captured? NO — needs formal owner-approval doc + the Q1 sequence reconciliation note.**

---

## 5. Redeem API Existence Check

**Existence: NO.**

Evidence:
- `grep -rn "loyalty/redeem" /app/frontend/src/` → 0 hits.
- `grep -rn "redeemLoyalty\|pos/loyalty\|redemption_id" /app/frontend/src/` → 0 hits.
- No `loyaltyService.js` in `/app/frontend/src/api/services/`.
- No `loyaltyTransform.js` in `/app/frontend/src/api/transforms/`.
- No `LOYALTY_REDEEM` constant in `/app/frontend/src/api/constants.js` (file absent / no hits).
- `/app/frontend/src/utils/BUG108_FLAGS.js` has only `couponLive`, `loyaltyRatioLive`, `loyaltyPreviewLive`, `walletDebitLive` — **no `loyaltyRedeemLive` flag yet**.
- `/app/backend/` is unrelated scaffold (FastAPI starter) — not the CRM service.
- CRM handoff §8.2 explicitly lists `POST /pos/loyalty/redeem` as deferred-to-future-CR. The Redeem-Only Preprod Plan §7.2 re-confirms: "Does not exist — must be built (Scope A)".
- API Reconciliation Update §2.4 verbatim: `POST /pos/loyalty/redeem` — "Frontend constant: Not present; Frontend service: Not present; CRM route: Not present."

**Endpoint contract spec'd on paper (plan §8):**
- Method/Path: `POST /api/pos/loyalty/redeem`
- Auth: `X-API-Key`
- Idempotent (keyed on `restaurant_id + idempotency_key`)
- Atomic (debit + audit insert in single transaction)
- Commit-only (no reservation, no reverse)
- Request body, response body, full 12-row validation matrix, 9-rule implementation requirements, and 9-rule acceptance criteria are all fully specified.

So: contract exists on paper; implementation does NOT exist anywhere (CRM repo or POS repo).

---

## 6. POS Frontend Readiness Check

**Frontend live wiring (C-FE-2): NOT ready** — blocked on CRM redeem API being live on preprod + Q1–Q5 written approval.

**Frontend kill-switched wiring (C-FE-1): READY to start in parallel** — does not require CRM endpoint live; only requires Q1–Q5 written approval before merge. C-FE-1 work plan per plan §9.1:

| File | State today | C-FE-1 change |
|---|---|---|
| `src/utils/BUG108_FLAGS.js` | exists; no `loyaltyRedeemLive` | Add `loyaltyRedeemLive: false` |
| `src/api/constants.js` | no `LOYALTY_REDEEM` | Add endpoint constant |
| `src/api/services/loyaltyService.js` | absent | Create — `redeemLoyalty(payload)` wrapper (kill-switched stub that throws "API not ready" until C-FE-2) |
| `src/api/transforms/loyaltyTransform.js` | absent | Create — req/res mappers + `error_code → user copy` |
| `src/components/order-entry/CollectPaymentPanel.jsx` | uses `customer?.loyaltyPoints` (singular) at 5 sites | Migrate to `customer?.loyalty?.points_value` / `total_points` (rupee/points); wire UI state machine; inline error region; redemption_id surfacing |
| `src/components/order-entry/OrderEntry.jsx` | exists | Lift redemption state to OrderEntry context; localStorage persistence for orphan-debit warnings |
| `src/api/transforms/orderTransform.js` | Bill-Payment site at L1356 gated on `loyaltyRatioLive` | Re-gate on `(loyaltyRedeemLive && redemptionId) ? value : 0`; add `loyalty_redemption_id`; Print site (~L1768) same pattern; Place-Order / Prepaid / Update-Order sites stay zero |

Net: 7 files (5 modified, 2 new). All kill-switched behind `loyaltyRedeemLive=false` so behavior at C-FE-1 merge is identical to current Phase B owner-smoke-passed build.

---

## 7. Reverse/Rollback Deferred Confirmation

**Confirmed deferred. NOT a blocker.**

Evidence:
- Plan §2 captures owner correction verbatim: "Reverse/rollback API is deferred. This phase focuses only on loyalty redeem. Do NOT include CRM reverse/rollback API design or implementation in this phase. Do NOT block this phase on reverse API."
- Plan §5 explicit non-scope row: `POST /pos/loyalty/reverse` — "Owner-deferred. Stays as CRM handoff §8.2 declared. Will be a separate future CR if/when reopened."
- Plan §11 designs failure handling for the no-reverse world (orphan-warning banner + localStorage + manual admin reconciliation path).
- CRM handoff §8.2 verbatim: `POST /pos/loyalty/reverse` — "Q5 — no reversal needed".
- Plan §13.2 confirms no reverse rows are mutated; §13.3 audit schema's `event_type` CHECK excludes `'reverse'` for this phase.

Net: reverse stays deferred; redeem-only Phase C does not introduce, design, or build any reverse path. Manual admin reconciliation is the documented recovery channel.

---

## 8. Exact Next Step

**Two parallel tracks. Critical-path unblocker is Track A.**

**Track A — CRM redeem API implementation (CRITICAL PATH).**
- Hand off plan §8 (header + request body + response + validation matrix + implementation requirements + acceptance criteria) to the CRM backend team for ticketing and implementation against preprod.
- Owner Q1–Q5 do NOT block the CRM contract (plan §20 sub-bullet).
- Deliverables expected from CRM team: endpoint live on preprod, schema migrations applied (`loyalty_redemptions`, `loyalty_audit_ledger`, `loyalty_idempotency`), seeded test customers per tier (Bronze/Silver/Gold + zero-points + loyalty_disabled), Postman/curl collection, ledger query access.

**Track B — Formal capture of owner Q1–Q5 answers (PARALLEL, non-blocking for CRM).**
- Create a dedicated owner-approval doc capturing Q1=A, Q2=A, Q3=C, Q4=A, Q5=A.
- Reconcile Q1 wording: prompt says "Redeem after payment success" but plan §10's recommended "A-resolved" is "Redeem AFTER cashier confirms intent and BEFORE payment gateway." Clarify with owner which sequence is intended before C-FE-2 wiring.
- Required for C-FE-1 merge gate.

**Track C — POS C-FE-1 kill-switched wiring (PARALLEL, blocked on Track B for merge only).**
- Can start coding in a branch immediately; merge after Track B owner-approval doc exists.
- C-FE-2 live wiring stays blocked on Track A + Track B.

**Recommended next-step taxonomy (matches prompt's A/B/C/D taxonomy):**
- **A. CRM redeem API implementation** ← primary critical-path next step.
- B. POS frontend integration — only the kill-switched C-FE-1 slice can begin in parallel; live wiring (C-FE-2) blocks on A.
- C. Joint QA — blocks on A + C-FE-2 merge.
- D. More owner questions — only the Q1 sequence-wording reconciliation note above; no new questions needed.

---

## 9. Recommended Next Agent Type

Two agents needed; they can run in parallel:

1. **CRM backend implementation agent** (primary / critical-path)
   - Mission: implement `POST /api/pos/loyalty/redeem` exactly per plan §8 (header, request, response, validations, atomicity, idempotency, audit, concurrency, latency, logging, error bodies); migrate `loyalty_redemptions` / `loyalty_audit_ledger` / `loyalty_idempotency` tables on preprod; seed test customers per plan §17.1; deliver Postman/curl collection to POS team.
   - Working environment: CRM repository (not this POS frontend repo).

2. **POS frontend Phase C C-FE-1 wiring agent** (parallel; safe to start now)
   - Mission: kill-switched wiring per plan §9.1 (add `loyaltyRedeemLive=false` flag, create `loyaltyService.js` + `loyaltyTransform.js`, migrate 5 legacy `customer?.loyaltyPoints` reads, wire UI state machine behind the flag, add `loyalty_redemption_id` field plumbing in `orderTransform.js`). All behavior at flag-off must be byte-identical to current Phase B build.
   - Gate: merge only after owner-approval doc for Q1–Q5 exists.

A third agent should be queued for the owner-approval doc capture if owner is not available to author directly. It is short and non-implementation.

---

## 10. Required Next Prompt Scope

For the **CRM backend implementation agent**:
- Inputs: plan §8 (full), CRM handoff §3 (6-key blob), CRM handoff §8.2 (reverse-deferred policy), preprod credentials, schema-migration owner.
- Deliverables: endpoint live on preprod + ≥30 unit-test fixtures PASS + idempotency replay test + atomicity test + concurrency test + Postman collection + seeded test customers (Bronze/Silver/Gold/zero/loyalty_disabled).
- Acceptance: plan §8.6 verbatim.

For the **POS frontend C-FE-1 agent**:
- Inputs: plan §6.2, §6.3, §6.4, §9.1, §9.2, §15.4 — together they specify the exact files/lines/behaviour.
- Deliverables: 7 files touched (5 modified, 2 new); `loyaltyRedeemLive=false` everywhere; service stub raises "API not ready"; Phase B owner-smoke regression matrix re-PASS (plan §17.2 row 22 + row 26).
- Acceptance: zero functional diff vs Phase B at flag-off; build PASS; lint PASS; existing Phase B smoke matrix PASS.

For the **owner-approval doc agent** (short):
- Inputs: plan §19 + the intended answers (Q1=A, Q2=A, Q3=C, Q4=A, Q5=A) + the Q1 wording-reconciliation note above.
- Deliverable: a new doc `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_OWNER_APPROVAL_2026_05_23.md` capturing the answers verbatim, with Q1 disambiguated (strict-after-payment vs A-resolved), and elevating status to `bug_108_loyalty_phase_c_redeem_only_owner_approved_ready_for_implementation`.

---

## 11. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed in this status check | Confirmed |
| 2 | No backend changed (no CRM call, no POS backend edit) | Confirmed |
| 3 | No data mutated (no DB write; no localStorage write; no points debited) | Confirmed |
| 4 | No redeem API invoked (endpoint does not exist; not called) | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | Phase B work intact (read-only loyalty + pipeline fix + CustomerModal parity all preserved) | Confirmed |
| 8 | Reverse/rollback explicitly deferred — not designed, not implemented, not blocking | Confirmed |
| 9 | Coupon / Wallet explicitly out of scope | Confirmed |
| 10 | Production release explicitly out of scope (preprod-only) | Confirmed |
| 11 | Phase C Q1–Q5 owner answers intended (A/A/C/A/A) but NOT yet captured in a formal owner-approval doc | Pending — Track B above |

---

**End of BUG-108 Loyalty Phase C Redeem-Only Continuation Status Check.**
