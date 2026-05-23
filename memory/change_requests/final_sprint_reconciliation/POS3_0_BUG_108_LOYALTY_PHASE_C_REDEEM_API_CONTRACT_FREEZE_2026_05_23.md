# POS 3.0 BUG-108 — Loyalty Phase C Redeem API Contract Freeze

**Date:** 2026-05-23 (later)
**Persona:** BUG-108 Loyalty Phase C Redeem API Contract Freeze Agent
**Mode:** Contract freeze ONLY — no implementation, no edits, no API calls, no data mutation, no reverse work
**Authoritative planning doc:** `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md`

---

## 1. Status

```
bug_108_loyalty_phase_c_redeem_api_contract_needs_clarification
```

**Reason:** The MD content pasted into the prompt by the owner is the **CR-001C-LX (LX-A) read-only Loyalty API handoff** (3 endpoints: `POST /pos/customer-lookup`, `GET /pos/customers/{id}`, `GET /pos/customers/{id}/loyalty`). This handoff explicitly **defers** the redeem API in its §8.2 — verbatim:

> | `POST /pos/loyalty/redeem` | **Q4 — deferred to future redemption CR** |
> | `POST /pos/loyalty/reverse` | **Q5 — no reversal needed** |

And in §1 Phase mapping verbatim:

> | §4 redemption / debit / reversal endpoints | Future redemption CR | **Deferred indefinitely per owner sign-off** |

The pasted document therefore **does not contain a redeem API contract**. It cannot be frozen as the Phase C redeem contract because the contract simply isn't in it. The handoff that was needed (`CR_001C_LXX_POS_BUG_108_LOYALTY_REDEEM_API_HANDOFF_TO_POS.md` or equivalent — covering `POST /pos/loyalty/redeem`) has not been produced by the CRM team yet.

The pasted document IS, however, an excellent source-of-truth for the read-side loyalty contract (the 6-key blob) which the redeem flow will rely upon for ratio resolution, tier, and balance lookup.

---

## 2. Handover Source

Owner pasted CRM MD handover content directly into this prompt.

Cross-check against on-disk copy:
- Pasted content matches `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` byte-for-byte (header banner, CR ID `CR-001C-LX`, Phase `LX-A`, "3 endpoints in §2", §8.2 redeem-deferred row, status banner `cr001c_lx_a_loyalty_pos_contract_patched_qa_passed_in_preview`).
- This is the **read-only** loyalty handoff. It is not the redeem API handoff.

It appears the owner either (a) pasted the wrong document, (b) intended this to be the source of the read-side contract while a separate redeem handoff is still being authored on the CRM side, or (c) expects the redeem contract to be inferred from the Phase C Redeem-Only Preprod Plan (§8). Clarification required.

---

## 3. Docs Read

1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` (full, 813 lines — esp. §8 endpoint contract draft)
2. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_CONTINUATION_STATUS_CHECK_2026_05_23.md` (full, just created)
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_API_RECONCILIATION_UPDATE_2026_05_23.md` (§1, §2 — confirms `POST /pos/loyalty/redeem` "Frontend constant: Not present; Frontend service: Not present; CRM route: Not present")
4. `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` (full — same as pasted content)
5. POS frontend code surface:
   - `/app/frontend/src/utils/BUG108_FLAGS.js` — `loyaltyRedeemLive` flag NOT present
   - `/app/frontend/src/api/services/` — no `loyaltyService.js`
   - `/app/frontend/src/api/transforms/` — no `loyaltyTransform.js`
   - grep `loyalty/redeem|pos/loyalty|redemption_id|redeemLoyalty` across `/app/frontend/src/` → **0 hits**
6. POS backend scaffold (`/app/backend/`) — confirmed unrelated to CRM service.

---

## 4. Final Frozen API Contract

**Cannot be frozen from the pasted document.** The pasted document does not contain a redeem endpoint contract.

What WAS extracted from the pasted document (for downstream reference only — these inform but do not constitute the redeem contract):

| Item | Value (from pasted LX-A handoff) |
|---|---|
| Read-side loyalty blob shape (6 keys) | `tier`, `tier_label`, `total_points`, `ratio_per_point`, `points_value`, `loyalty_enabled` |
| `ratio_per_point` resolution order | `settings.{tier}_redemption_value` → `settings.redemption_value` → `0.25` |
| `loyalty_enabled` semantics | `true` → show UI; `false` → hide UI even though `points_value` is still numeric |
| Read endpoints auth | `X-API-Key: <crm_token>` |
| URL prefix convention | All endpoints behind `/api`; full form `${REACT_APP_BACKEND_URL}/api/pos/...` |
| Helper shared by all read sites | `core.loyalty.build_pos_loyalty_blob(customer, settings)` |
| Redeem endpoint | **EXPLICITLY DEFERRED in §8.2 — `POST /pos/loyalty/redeem` → "Q4 — deferred to future redemption CR"** |

What the Phase C Redeem-Only Preprod Plan §8 proposes (this is the POS team's **drafted target**, not a CRM commitment):

| Item | Drafted value (plan §8) — NEEDS_CRM_CONFIRMATION |
|---|---|
| Endpoint | `POST /api/pos/loyalty/redeem` |
| Auth | `X-API-Key: <crm_token>` |
| Idempotent | YES, keyed on `(restaurant_id, idempotency_key)` |
| Atomic | YES (debit + audit insert in single transaction) |
| Reservation? | NO (commit-only) |
| Latency budget | p95 ≤ 400 ms on preprod |
| Request body | `restaurant_id`, `customer_id`, `customer_phone`, `order_id`, `temp_order_reference`, `bill_amount`, `eligible_amount`, `points_to_redeem`, `redeem_amount`, `idempotency_key`, `source`, `actor_user_id` (12 fields total; `order_id` XOR `temp_order_reference`) |
| Response (200) | `success`, `redemption_id`, `points_redeemed`, `discount_amount`, `previous_points`, `remaining_points`, `ratio_per_point`, `tier`, `audit_id`, `message` |
| Error envelope | `{ "success": false, "error_code": "...", "message": "..." }` |

Until a CRM-authored redeem-API handoff arrives confirming or amending these field names/types, the above is `POS_ASSUMPTION_PROPOSED` and cannot be frozen.

---

## 5. Calculation Rules

From pasted LX-A handoff (READ-side, applies to redeem inputs):
- `points_value = round(total_points × ratio_per_point, 2)` — locked, server-computed.
- `ratio_per_point` resolution: per-tier override → restaurant-level `redemption_value` → `0.25` default. Locked.
- `loyalty_enabled = false` → POS hides loyalty UI (no redeem possible).
- POS-side `redeem_amount` must reconcile with server recompute within ±0.01 — **`POS_ASSUMPTION_PROPOSED` from plan §8.4 (`amount_mismatch` 422); not in pasted doc.**

From Phase C plan §14 (POS-side, applies to redeem UX):
- `eligible_amount = max(0, itemTotal - manualDiscount - presetDiscount)` (pre-tax)
- `max_redeem_amount = min(points_value, eligible_amount)`
- `max_redeem_points = round(max_redeem_amount / ratio_per_point)` capped at `total_points`
- Auto-apply max capped amount (owner Q2 = A)
- Pre-tax slot (owner Q3 = C, equivalent to plan recommendation A)
- 2-dp rupee rounding; integer points

**Owner / CRM gaps:**
- `NEEDS_CRM_CONFIRMATION`: Does the server recompute `points_to_redeem` from `redeem_amount` or vice versa when they disagree? Plan §8.4 assumes server returns 422 `amount_mismatch`; pasted doc is silent.
- `NEEDS_CRM_CONFIRMATION`: Tie-break for `max_redeem_points` rounding when ratio is fractional (e.g. Gold 1.5 ratio, bill 500 → `floor(500/1.5)=333` vs `ceil=334` vs `round=333`). Plan §17.2 row 3 explicitly flags this as "confirm in QA". Server policy must be stated.
- `NEEDS_CRM_CONFIRMATION`: Per-restaurant `redemption_cap_per_order` (plan §8.5.6) — does this exist on `loyalty_settings`? Pasted doc shows only per-tier/per-restaurant `*_redemption_value` fields, no cap field.

---

## 6. Idempotency Rules

**Not present in pasted document.** Idempotency is a redeem-side concern; the pasted LX-A handoff covers read-only endpoints which are naturally idempotent.

From Phase C plan §12 — all `POS_ASSUMPTION_PROPOSED`:
- Key: client-generated UUID v4 at `[redeem_armed]`.
- Key reuse: same key for any retry of same logical intent (including timeout retry).
- Key rotation: new key only on untick → re-tick.
- Server table: `loyalty_idempotency(restaurant_id, idempotency_key, endpoint, response_status, response_body, created_at)` UNIQUE on `(restaurant_id, idempotency_key)`.
- Replay: returns cached `response_body`, client maps `error_code: 'idempotency_replay'` (with original 200) to `[redeemed]` state.
- TTL: 7 days server-side.
- Persistence: POS persists `idempotency_key` to localStorage with order ref so a page refresh between redeem and payment doesn't generate a duplicate.

**Owner / CRM gaps:**
- `NEEDS_CRM_CONFIRMATION`: Replay behavior on **same key + different payload** — plan §8.4 lists no row for this. Industry-standard answer is "return 422 `idempotency_payload_mismatch` and do NOT mutate". Must be explicit.
- `NEEDS_CRM_CONFIRMATION`: TTL of 7 days — owner/CRM policy.
- `NEEDS_CRM_CONFIRMATION`: Whether `loyalty_idempotency` table exists or must be created. Pasted doc never mentions this table.

---

## 7. Audit / Ledger Rules

**Not present in pasted document.** The pasted handoff only specifies read-side behavior. Write-side ledger schema is unspecified.

From Phase C plan §13.3 — all `POS_ASSUMPTION_PROPOSED`:
- Table: `loyalty_audit_ledger` (CRM-side).
- Per-redeem row: `audit_id` (UUID PK), `restaurant_id`, `customer_id`, `event_type='redeem'`, `redemption_id`, `points_delta` (negative), `amount_delta` (negative), `balance_after_points`, `balance_after_value`, `order_id`, `source`, `idempotency_key`, `actor_user_id`, `created_at`.
- Separate table: `loyalty_redemptions` for redemption header (`redemption_id`, `state='committed'`, `order_id` indexed for duplicate-per-order guard).
- `event_type` CHECK excludes `'reverse'` and `'expire'` for this phase (per owner correction).

**Owner / CRM gaps:**
- `NEEDS_CRM_CONFIRMATION`: Does CRM already have a `points_transactions` collection/table where loyalty earn currently writes? If so, redeem should likely write to the same store (with a `transaction_type='redeem'` discriminator) rather than introduce a new `loyalty_audit_ledger`. Plan §8.5.7 assumes a new table; pasted doc never names the existing earn-side ledger.
- `NEEDS_CRM_CONFIRMATION`: Is `loyalty_redemptions` a new table or part of an existing `loyalty_*` namespace?
- `NEEDS_CRM_CONFIRMATION`: Is the audit row's `audit_id` surfaced in the API response, or only `redemption_id`? Plan §8.3 returns both; pasted doc has neither.

---

## 8. Data Mutation Rules

**Not present in pasted document.** Mutation is a redeem-side concern; pasted doc is read-only.

From Phase C plan §13.1 — all `POS_ASSUMPTION_PROPOSED`:
- Atomic in single transaction: `UPDATE customer SET total_points = total_points - N; INSERT INTO loyalty_redemptions ...; INSERT INTO loyalty_audit_ledger ...; INSERT INTO loyalty_idempotency ...; COMMIT;`
- Row-level lock: `SELECT … FOR UPDATE` on `customer.total_points`.
- No wallet mutation. No tier recompute (plan §13.2 is silent — must confirm).
- No customer-stats mutation.

**Owner / CRM gaps:**
- `NEEDS_CRM_CONFIRMATION`: **Source of truth for "current balance"** — is it `customer.total_points` (the field returned by the LX-A 6-key blob)? Or does CRM internally maintain a separate `loyalty_point` field that the LX-A helper sums and exposes? The pasted doc returns `total_points` but does not document the backing storage. Critical because the redeem `UPDATE` must target the correct field.
- `NEEDS_CRM_CONFIRMATION`: Does a redeem trigger a `tier` recompute? Loyalty programs typically recompute tier on accrual, not on redeem, but the answer must be explicit. Plan §17.2 row 28 only verifies remaining balance, not tier.
- `OWNER_DECISION_REQUIRED`: If a customer's balance dips below a tier threshold due to redeem, do they immediately drop tier, or is tier sticky on accrued-points (not spendable)? Common practice is sticky-on-accrued, but must be documented.

---

## 9. POS Frontend Integration Contract

From the Phase C plan §9 + §15, gated by owner Q1–Q5 (intended: A/A/C/A/A; not yet formally captured):

| Aspect | Specification |
|---|---|
| When to call redeem | After cashier confirms intent (clicks Pay) and BEFORE payment gateway — "A-resolved" per plan §10. Prompt's Q1=A says "after payment success"; sequence wording reconciliation required (see §13). |
| State machine | `idle → redeem_armed → redeem_in_flight → {redeemed | redeem_error | orphan_warning}` (plan §9.2) |
| Apply discount | At `redeem_armed` for UI preview; commits to payload at `redeemed` |
| Frontend state to store | `redemption_id`, `points_redeemed`, `discount_amount`, `idempotency_key`, `state`, `customer_id`, `order_id` |
| Payload field — `used_loyalty_point` | int; `points_redeemed` on success; `0` otherwise (`orderTransform.js:~1356`, `~1768`) |
| Payload field — `loyalty_dicount_amount` (typo preserved) | float; `discount_amount` on success; `0` otherwise |
| Payload field — `loyalty_redemption_id` (NEW) | string; `redemption_id` on success; `null` otherwise |
| Failure handling — redeem succeeds, payment/order fails | Persistent yellow banner in CollectPaymentPanel with `redemption_id`, `order_id`, `points_redeemed`, `discount_amount`; localStorage record at `bug108_loyalty_orphan_debits`; banner survives refresh; dismiss with audit log; admin manual recovery (owner Q4=A) |
| Failure handling — redeem fails | No discount applied; inline red error; cashier can retry with same `idempotency_key` or pay without loyalty; no orphan |
| Flag gating | `BUG108_FLAGS.loyaltyRedeemLive && BUG108_FLAGS.loyaltyRatioLive && redemption?.state === 'committed'` for payload field flips |
| Phase B regression | Flag-off behavior MUST equal Phase B owner-smoke build byte-for-byte |

**Owner / CRM gaps:**
- `NEEDS_CRM_CONFIRMATION`: Whether the redeem call must accept `order_id` only, or `temp_order_reference` only, when called BEFORE payment-gateway (in A-resolved sequence). Plan §8.2 says XOR; if A-resolved fires before gateway, `order_id` may not yet be finalized in some flows.
- `NEEDS_CRM_CONFIRMATION`: Endpoint shape under `${REACT_APP_BACKEND_URL}/api/...` vs `${REACT_APP_CRM_BASE_URL}/...` — pasted doc §2 footnote says all endpoints are at `${REACT_APP_BACKEND_URL}/api/pos/...`, but POS frontend `.env` has both `REACT_APP_BACKEND_URL` AND `REACT_APP_CRM_BASE_URL` (currently `https://crm-may-branch.preview.emergentagent.com/api`). Which base URL does the redeem endpoint use? Likely `REACT_APP_CRM_BASE_URL` based on POS service patterns, but unstated.

---

## 10. Reverse / Rollback Deferred Confirmation

**Confirmed deferred. NOT a blocker.**

Verbatim evidence:
- Pasted handoff §1: "§4 redemption / debit / reversal endpoints | Future redemption CR | **Deferred indefinitely per owner sign-off**"
- Pasted handoff §8.2: `POST /pos/loyalty/reverse` — "Q5 — no reversal needed"
- Phase C Redeem-Only Plan §2 (owner correction verbatim): "Reverse/rollback API is deferred. ... Do NOT block this phase on reverse API."
- Phase C plan §5 non-scope table: reverse endpoint marked "Owner-deferred"
- Phase C plan §11 designs full failure handling for the no-reverse world (orphan-warning + localStorage + admin manual recovery)

Manual recovery flow (out of scope for POS code; documented for admin in plan §11.4):
1. CRM admin UI surfaces `loyalty_audit_ledger` rows (or the existing `points_transactions` equivalent).
2. Admin manually creates compensating audit entry (`event_type='manual_credit'`, `points_delta=+N`, linked to original `redemption_id`).
3. Customer balance restored.

No reverse endpoint is to be designed, built, or invoked in this phase.

---

## 11. Contract vs Current CRM Code Check

**Redeem API implementation exists? NO.**

Evidence:
- Pasted handoff §8.2 verbatim: `POST /pos/loyalty/redeem` is "deferred to future redemption CR".
- API Reconciliation Update doc §2.4 verbatim: `POST /pos/loyalty/redeem` — "Frontend constant: Not present; Frontend service: Not present; **CRM route: Not present**".
- Phase C Redeem-Only Plan §7.2 verbatim: "Does not exist — must be built (Scope A)".
- POS frontend grep across `/app/frontend/src/`: 0 hits for `loyalty/redeem`, `redeemLoyalty`, `pos/loyalty`, `redemption_id`.
- POS frontend has no `loyaltyService.js`, no `loyaltyTransform.js`, no `LOYALTY_REDEEM` constant.
- `BUG108_FLAGS.js` has no `loyaltyRedeemLive` flag.

The CRM has implemented and shipped the **read-side** (LX-A: 6-key blob across 3 endpoints, GREEN-LIGHT on preview, 63/63 static QA, 5/5 smoke on `18march`). The redeem-side endpoint, table, and helper are absent on both sides.

What CRM has that can be reused:
- `core.loyalty.build_pos_loyalty_blob(customer, settings)` helper — guarantees identical ratio math; redeem-side validation should use the **same helper** to recompute `redeem_amount` from `points_to_redeem` and reject mismatches.
- `loyalty_settings` schema (per-tier + restaurant-level `redemption_value` + `loyalty_enabled`) — already live.

What CRM is missing for redeem (must be authored):
- A new handoff document `CR_001C_?_POS_BUG_108_LOYALTY_REDEEM_API_HANDOFF_TO_POS.md`.
- The endpoint code (`POST /api/pos/loyalty/redeem`) and its router wiring.
- Tables: `loyalty_redemptions`, `loyalty_idempotency` (assuming `points_transactions` is reused or `loyalty_audit_ledger` is introduced — see §7 gap).
- Migrations + seed customers on preprod.
- Postman/curl collection.

---

## 12. Contract vs POS Phase C Plan Check

| Phase C plan §8 element | Status against pasted handoff |
|---|---|
| Endpoint `POST /api/pos/loyalty/redeem` | **Not in handoff — explicitly deferred (§8.2)** |
| Auth `X-API-Key` | Aligned with handoff's read-side auth pattern (§2 of pasted doc) — likely re-usable, but unstated for redeem |
| Request schema (12 fields) | **Not in handoff** |
| Response schema (10 fields) | **Not in handoff** |
| Validation matrix (12 rows) | **Not in handoff** |
| Idempotency table + key strategy | **Not in handoff** |
| Atomicity + row lock | **Not in handoff** |
| Audit ledger schema | **Not in handoff** |
| Latency p95 ≤ 400 ms | **Not in handoff** |
| Acceptance criteria | **Not in handoff** |
| Sequence (A-resolved) | Not applicable to handoff (UX, not API) |
| Owner Q1–Q5 capture | Not yet captured anywhere |

Conclusion: the pasted handoff and the Phase C plan §8 do not contradict each other — they are simply orthogonal. The plan §8 is the POS team's best-guess draft of what the redeem contract should look like; the pasted handoff covers the read side only. A separate CRM-authored redeem handoff is required to freeze the contract.

---

## 13. Gaps / Clarifications

### 13.1 Blocking gaps (must be resolved before contract can be frozen)

| # | Gap | Type | Recommended resolution |
|---|---|---|---|
| B1 | **Redeem endpoint path** — final URL including base | `NEEDS_CRM_CONFIRMATION` | CRM team to author redeem handoff; expected `POST ${REACT_APP_CRM_BASE_URL}/pos/loyalty/redeem` (i.e. `https://crm-may-branch.preview.emergentagent.com/api/pos/loyalty/redeem`) but unconfirmed |
| B2 | **Auth method/header for redeem** | `NEEDS_CRM_CONFIRMATION` | Likely `X-API-Key` (matches read-side); confirm whether a different scope/scope-tag is needed for write operations |
| B3 | **Request body — final field names, types, requireds, optionals** | `NEEDS_CRM_CONFIRMATION` | Plan §8.2 is the POS draft; CRM must confirm or amend |
| B4 | **Response body — final field names, types** | `NEEDS_CRM_CONFIRMATION` | Plan §8.3 is the POS draft; CRM must confirm or amend |
| B5 | **Error envelope and `error_code` taxonomy** | `NEEDS_CRM_CONFIRMATION` | Plan §8.4 lists 12 codes (`invalid_request`, `auth_failed`, `customer_not_found`, `loyalty_disabled`, `insufficient_points`, `amount_mismatch`, `amount_exceeds_cap`, `idempotency_replay`, `duplicate_redemption_for_order`, `rate_limited`, `internal_error`); CRM must confirm |
| B6 | **Source of truth for balance** — is `customer.total_points` the backing column/field that gets decremented, or is the LX-A `total_points` a derived sum? | `NEEDS_CRM_CONFIRMATION` | Critical — the redeem `UPDATE` cannot target an ambiguous field |
| B7 | **Audit ledger location** — new `loyalty_audit_ledger` table, or reuse existing `points_transactions` collection? | `NEEDS_CRM_CONFIRMATION` | If `points_transactions` exists for earn-side, redeem should write there too with a discriminator |
| B8 | **Idempotency table** — does it exist or must CRM create it? | `NEEDS_CRM_CONFIRMATION` | Cannot freeze idempotency contract without knowing storage |
| B9 | **Idempotency replay — same key, different payload** | `NEEDS_CRM_CONFIRMATION` | Must be explicit (recommended: 422 `idempotency_payload_mismatch`, no mutation) |
| B10 | **Duplicate-redemption-per-order guard** | `NEEDS_CRM_CONFIRMATION` | Plan §8.4 row says 409 `duplicate_redemption_for_order`; confirm or replace |
| B11 | **Rounding policy for `points_to_redeem` when ratio is fractional** | `NEEDS_CRM_CONFIRMATION` | Floor vs ceil vs round — affects Gold-tier QA case directly |

### 13.2 Non-blocking gaps (can be resolved during implementation or QA)

| # | Gap | Type | Recommended resolution |
|---|---|---|---|
| N1 | Q1 sequence wording reconciliation: prompt's "Redeem after payment success" vs plan §10's A-resolved "after cashier confirm, before gateway" | `OWNER_DECISION_REQUIRED` | Owner to confirm exact sequence in formal owner-approval doc |
| N2 | Tier recompute on redeem (sticky vs dynamic) | `OWNER_DECISION_REQUIRED` | Common practice is sticky-on-accrued; confirm |
| N3 | `tier_label` customization (today derived as "{tier} Member") | Future CR | Out of Phase C scope |
| N4 | Per-restaurant `redemption_cap_per_order` field on `loyalty_settings` | `NEEDS_CRM_CONFIRMATION` | If absent, POS-sent `eligible_amount` is the cap |
| N5 | Latency budget p95 ≤ 400 ms | `NEEDS_CRM_CONFIRMATION` | Plan §8.1 proposes; CRM to confirm achievable |
| N6 | Whether `audit_id` is surfaced in API response | `NEEDS_CRM_CONFIRMATION` | Cosmetic; plan §8.3 includes it |
| N7 | TTL on idempotency records | `NEEDS_CRM_CONFIRMATION` | Plan §12 proposes 7 days; CRM to confirm |
| N8 | Whether redeem response includes updated `points_value` / `tier` for fresh UI update | `POS_ASSUMPTION_PROPOSED` | Plan §8.3 returns `tier`, `ratio_per_point`, `remaining_points`; POS computes `points_value` client-side |

---

## 14. Owner / CRM Questions

Only questions that **truly block** implementation are listed. Each blocking gap from §13.1 maps to one question.

| # | Question | Audience |
|---|---|---|
| Q-C1 | What is the final redeem endpoint URL? (Full base + path.) | CRM |
| Q-C2 | Which auth header is required for the redeem endpoint? `X-API-Key` (same as read) or a different scope? | CRM |
| Q-C3 | Please confirm or amend the request body in Phase C plan §8.2 (12 fields including `order_id` XOR `temp_order_reference`). | CRM |
| Q-C4 | Please confirm or amend the response body in Phase C plan §8.3 (10 fields). | CRM |
| Q-C5 | Please confirm or amend the error envelope and `error_code` taxonomy in Phase C plan §8.4 (12 codes). | CRM |
| Q-C6 | Which CRM field is the source of truth for spendable points balance? (`customer.total_points`? A separate `loyalty_point`?) Where does the redeem `UPDATE` write? | CRM |
| Q-C7 | Where do redeem audit rows live? New `loyalty_audit_ledger` table, or reuse the existing `points_transactions` (which earn currently writes to)? | CRM |
| Q-C8 | Does CRM already have a `loyalty_idempotency` table? If not, will CRM create it as part of this CR, and is the `(restaurant_id, idempotency_key)` UNIQUE constraint acceptable? | CRM |
| Q-C9 | On idempotency replay with **same key + different payload**, what is the server response? (Recommended: 422 `idempotency_payload_mismatch` + no mutation.) | CRM |
| Q-C10 | On duplicate redeem for the same `order_id`, what is the server response? (Plan proposes 409 `duplicate_redemption_for_order`.) | CRM |
| Q-C11 | Rounding policy for `points_to_redeem = redeem_amount / ratio_per_point` when ratio is fractional — floor, ceil, or round? Will the server adjust POS-sent `points_to_redeem` or reject? | CRM |
| Q-O1 | Q1 sequence reconciliation: is the redeem call placed (a) after cashier confirms intent and BEFORE payment gateway (plan §10 A-resolved), or (b) strictly AFTER payment gateway success (literal prompt text)? | Owner |

---

## 15. Implementation Readiness Verdict

```
contract_incomplete_blocking_implementation
```

Reasoning:
- The redeem API contract is not in the pasted document.
- 11 blocking gaps (§13.1) prevent freeze.
- CRM-side implementation does not exist (read-side LX-A is live and green; redeem-side is unbuilt).
- POS-side C-FE-1 (kill-switched wiring) can still safely start in parallel because it depends only on the **flag mechanics** and the **read-side contract** (both already covered by the pasted handoff). Live wiring (C-FE-2) cannot start until the redeem contract is frozen.

What is unblocked right now (despite this verdict):
1. **POS C-FE-1 (kill-switched wiring)** — fully unblocked. Can be authored in a branch; merge gate is the formal owner-approval doc for Q1–Q5, not the redeem contract.
2. **Owner Q1–Q5 formal capture doc** — unblocked; small standalone work.
3. **CRM redeem handoff authoring** — the only true critical-path item. Once the CRM team produces a redeem-side handoff (analogous to the pasted LX-A handoff but for `POST /pos/loyalty/redeem`), the 11 blocking gaps will resolve and contract freeze can proceed.

---

## 16. Recommended Next Agent

**Clarification Agent** (primary, critical-path).

Mission: request that the CRM team author a redeem-API-specific handoff document covering the 11 blocking gaps in §13.1 above, plus the 4 non-blocking `NEEDS_CRM_CONFIRMATION` items in §13.2. The Phase C Redeem-Only Preprod Plan §8 can be attached as the POS team's drafted target for CRM to confirm/amend rather than starting from scratch.

In parallel (non-blocking):
- **POS C-FE-1 Kill-Switched Wiring Agent** — can begin work today on the 7 files per plan §9.1, with `loyaltyRedeemLive=false`. Behavior at flag-off must be byte-identical to current Phase B owner-smoke build. Merges after the owner-approval doc lands.
- **Owner Approval Doc Agent** — short doc capturing Q1=A, Q2=A, Q3=C, Q4=A, Q5=A verbatim with the Q1 sequence wording disambiguated (see Q-O1 above).

Do **not** start the **CRM Redeem API Implementation Agent** yet — its inputs are not frozen.

---

## 17. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed in this freeze pass | Confirmed |
| 2 | No backend changed in this freeze pass | Confirmed |
| 3 | No data mutated in this freeze pass (no DB write, no localStorage write, no points debited) | Confirmed |
| 4 | No redeem API invoked (endpoint does not exist) | Confirmed |
| 5 | Reverse API not built; not designed; not invoked | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |
| 8 | Phase B work intact | Confirmed |
| 9 | Coupon / Wallet explicitly out of scope | Confirmed |
| 10 | Production release explicitly out of scope | Confirmed |
| 11 | Owner Q1–Q5 answers intended (A/A/C/A/A) but not yet captured in formal owner-approval doc | Pending — non-blocking for CRM handoff authoring |

---

**End of BUG-108 Loyalty Phase C Redeem API Contract Freeze.**
