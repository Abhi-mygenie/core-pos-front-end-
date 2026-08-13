# POS 3.0 BUG-108 — Loyalty Phase C Redeem API Contract Freeze

**Date:** 2026-05-23 (later, take 2)
**Persona:** BUG-108 Loyalty Phase C Redeem API Contract Freeze Agent
**Mode:** Contract freeze ONLY — no implementation, no edits, no API calls with payload/auth, no data mutation, no reverse work
**Supersedes:** the earlier same-day take of this document (which froze on the LX-A read-only handoff and produced verdict `contract_needs_clarification`). This take consumes the actual CR-001C-LR redeem handoff pasted by the owner and produces a complete contract freeze.

---

## 1. Status

```
bug_108_loyalty_phase_c_redeem_api_contract_frozen_ready_for_crm_implementation
```

**Operational sub-status:** `cr001c_lr_pos_loyalty_redeem_api_qa_passed` (per pasted handoff §15) — CRM-side implementation is **already complete** in preview (static QA 36/36 PASS, GREEN-LIGHT banner, endpoint live and auth-gated at `https://insights-phase.preview.emergentagent.com/api/pos/loyalty/redeem` — verified 401 on no-auth empty POST, confirming the route exists). The contract is therefore frozen for **POS frontend implementation**; CRM has nothing left to build for the redeem mini-phase.

In terms of the prompt's readiness taxonomy: **`contract_complete_ready_for_pos_and_crm_parallel_implementation`**, with the note that CRM has already completed its half (CR-001C-LR shipped to preview), so only POS-side implementation remains.

---

## 2. Handover Source

Owner pasted the CRM-authored handoff `# POS Loyalty Redeem API — Handoff to POS Team` (CR-001C-LR, Phase LR, drafted 2026-05-23) directly into this prompt. The pasted content includes:
- §1 in-scope table (redeem endpoint ✅; reverse ❌ deferred; coupons/wallet ❌ separate CRs)
- §2 endpoint path + preview origin
- §3 auth (`X-API-Key` via existing `verify_pos_auth`)
- §4 request contract (5 required fields, recommended idempotency key format)
- §5 success response (`data` envelope with 9 fields incl. `transaction_id`)
- §5.1 idempotent replay marker
- §6 failure response (HTTP 200 + `success=false` + `data.error.code`; 9 codes)
- §6.2 HTTP-level error mapping
- §7 8 business rules (owner-approved Q-LR1 through Q-LR6 + LX-A + plan §6)
- §8 data mutation surface (informational)
- §9 recommended POS billing flow
- §10 cURL examples (success, replay, conflict)
- §11 anti-pattern table (7 POS pitfalls)
- §12 QA evidence (36/36 PASS)
- §13 open items (reverse, max-redeemable tier-aware upgrade, etc.)
- §15 final CRM status: `cr001c_lr_pos_loyalty_redeem_api_qa_passed`

This is a **CRM-authored** redeem-API handoff (distinct from the LX-A **read-only** handoff that was pasted in the prior turn).

Cross-check against on-disk:
- No file `CR_001C_LR_*` exists in `/app/memory/crm/crm_1_0/handoff/` (only the LX-A handoff is present). The pasted content is the canonical version delivered by the CRM team.
- Endpoint connectivity probe (empty POST, no auth) → HTTP 401 → endpoint exists and auth is enforced. No data mutated by this probe.

---

## 3. Docs Read

1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` (full, 813 lines — esp. §8 endpoint draft, §9 POS file plan, §15 payload mapping)
2. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_CONTINUATION_STATUS_CHECK_2026_05_23.md`
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_API_RECONCILIATION_UPDATE_2026_05_23.md`
4. `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` (LX-A read-side handoff — provides 6-key blob + `ratio_per_point` resolution for redeem inputs)
5. The freeze attempt from earlier in this session (`POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` — verdict `needs_clarification` against the wrong handoff; superseded by this document)
6. Pasted CR-001C-LR handoff (this prompt body)
7. POS frontend state:
   - `/app/frontend/src/utils/BUG108_FLAGS.js` — no `loyaltyRedeemLive` flag
   - `/app/frontend/src/api/services/` — no `loyaltyService.js`
   - `/app/frontend/src/api/transforms/` — no `loyaltyTransform.js`
   - `grep -rn "loyalty/redeem|redeemLoyalty|loyaltyRedeem|points_to_redeem" /app/frontend/src/` → **0 hits**
   - `/app/frontend/.env` — `REACT_APP_CRM_BASE_URL=https://insights-phase.preview.emergentagent.com/api` (already aligned with pasted §2 preview origin)
8. Connectivity probe: `curl -s -o /dev/null -w "%{http_code}" -X POST "$CRM/api/pos/loyalty/redeem" -H "Content-Type: application/json" -d '{}'` → **401** (auth gate enforced; endpoint exists; no auth provided; no payload mutated)

---

## 4. Final Frozen API Contract

### 4.1 Endpoint

| | |
|---|---|
| Method | `POST` |
| Path | `/api/pos/loyalty/redeem` |
| Preview origin | `https://insights-phase.preview.emergentagent.com` |
| Full preview URL | `https://insights-phase.preview.emergentagent.com/api/pos/loyalty/redeem` |
| Prod path | Same; only host changes |
| POS base var | `REACT_APP_CRM_BASE_URL` (already set in `/app/frontend/.env`) |
| Effective construction | `${REACT_APP_CRM_BASE_URL}/pos/loyalty/redeem` (the `/api` segment is already inside `REACT_APP_CRM_BASE_URL`) |

### 4.2 Auth

| | |
|---|---|
| Header | `X-API-Key: <restaurant_api_key>` (same key POS already uses for `/pos/orders`, `/pos/customers/{id}`, etc.) |
| Fallback | JWT Bearer accepted; `type=customer` rejected. POS production traffic SHOULD use `X-API-Key` exclusively. |
| `restaurant_id` scoping | Derived server-side from the API key — **not** sent in body. |

### 4.3 Request schema (5 required fields)

```http
POST /api/pos/loyalty/redeem HTTP/1.1
Content-Type: application/json
X-API-Key: <restaurant_api_key>

{
  "customer_id":      "cust_abc123",
  "points_to_redeem": 100,
  "order_id":         "868999",
  "order_total":      850,
  "idempotency_key":  "pos_order_868999_loyalty_100"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `customer_id` | string | YES | Must resolve under this restaurant; else `CUSTOMER_NOT_FOUND` |
| `points_to_redeem` | integer (positive) | YES | Non-integer → HTTP 422; ≤ 0 → `INVALID_POINTS` |
| `order_id` | string | YES | Empty / whitespace → `ORDER_ID_REQUIRED` |
| `order_total` | number | YES | Used for `max_redemption_percent` enforcement and auto-cap derivation |
| `idempotency_key` | string | YES | Empty / whitespace → `IDEMPOTENCY_KEY_REQUIRED`; recommended format `pos_{restaurant_id}_{order_id}_loyalty_{points}` |

**No optional fields** are defined by the contract.

### 4.4 Success response (HTTP 200, `success=true`)

```json
{
  "success": true,
  "message": "Points redeemed successfully",
  "data": {
    "customer_id":             "cust_abc123",
    "points_redeemed":         100,
    "ratio_per_point":         1.5,
    "redeemed_value":          150.0,
    "remaining_points":        380,
    "remaining_points_value":  570.0,
    "tier":                    "Gold",
    "total_points_redeemed":   100,
    "transaction_id":          "53e3faef-be5c-4e53-94dc-5396b92156c7"
  }
}
```

| Field | Type | POS use |
|---|---|---|
| `success` | bool (top-level) | Primary discriminator — **POS MUST check this, not HTTP status** |
| `message` | string (top-level) | Human-readable; on idempotent replay reads `"Points redeemed successfully (idempotent replay)"` |
| `data.customer_id` | string | Echo |
| `data.points_redeemed` | integer | **Actual capped points deducted. POS MUST display this, not the typed value.** |
| `data.ratio_per_point` | float | Tier-aware ratio used (snapshot for receipt) |
| `data.redeemed_value` | float | `points_redeemed × ratio_per_point` — the ₹ discount POS applies to the bill |
| `data.remaining_points` | integer | New balance after redeem |
| `data.remaining_points_value` | float | `remaining_points × ratio_per_point` — receipt footer |
| `data.tier` | string | Unchanged by redeem (rule #1) |
| `data.total_points_redeemed` | integer | New lifetime counter |
| `data.transaction_id` | string (UUID) | **PT row id. POS MUST persist on the POS order — required by future reverse endpoint.** |

### 4.5 Idempotent replay (HTTP 200, `success=true`, with marker)

Same `idempotency_key` + same `customer_id` + same `order_id` + same `points_to_redeem` → server returns the **same body as the original success** plus:

```json
"data": { "...same fields...", "idempotent": true }
```

POS treats `data.idempotent` purely as a log/metric segmenter; functionally identical to first success.

### 4.6 Failure response (HTTP 200, `success=false`) — error envelope

```json
{
  "success": false,
  "message": "Loyalty program is disabled.",
  "data": {
    "error": {
      "code": "LOYALTY_DISABLED",
      "message": "Loyalty program is currently disabled."
    }
  }
}
```

Some error codes carry extra diagnostic fields inside `data.error.*` (e.g. `existing` triplet on `IDEMPOTENCY_CONFLICT`, `min_redemption_points` on `BELOW_MIN_REDEMPTION`).

### 4.7 Error-code catalog (frozen — 9 codes)

| Code | Trigger | POS action |
|---|---|---|
| `ORDER_ID_REQUIRED` | Empty / whitespace `order_id` | Fix payload. Do not retry. |
| `IDEMPOTENCY_KEY_REQUIRED` | Empty / whitespace `idempotency_key` | Fix payload. Do not retry. |
| `INVALID_POINTS` | `points_to_redeem ≤ 0` | Refuse submission at UI level. |
| `IDEMPOTENCY_CONFLICT` | Same key previously used with different `customer_id` / `order_id` / `points`. `data.error.existing` carries original triplet. | **Do not retry.** Treat as POS bug — key reuse violation. |
| `SETTINGS_MISSING` | Restaurant has no `loyalty_settings` doc | Hide redeem UI (treat as disabled). |
| `LOYALTY_DISABLED` | `loyalty_settings.loyalty_enabled = false` | Hide redeem UI. (Pre-gate from LX-A `loyalty_enabled`.) |
| `CUSTOMER_NOT_FOUND` | `customer_id` not found under this restaurant | Show "customer not found". |
| `BELOW_MIN_REDEMPTION` | Customer balance or requested points below `min_redemption_points`. `data.error.min_redemption_points` carries threshold. | Show min-threshold message. |
| `INSUFFICIENT_POINTS` | After auto-cap, zero points are redeemable | Show available balance. |

### 4.8 HTTP-level errors

| Status | Meaning | POS action |
|---|---|---|
| `200` | All business outcomes (success and most failures) | Branch on `success` + `data.error.code` |
| `401` | Missing / invalid `X-API-Key` | POS config issue; do not retry; route to ops |
| `422` | Pydantic schema violation (missing required field, wrong type — e.g. `points_to_redeem: 12.5`) | Fix payload; do not retry |
| `5xx` | Server error | **Retry with the SAME `idempotency_key`** |

---

## 5. Calculation Rules (frozen)

1. **`ratio_per_point` is tier-aware** — resolved server-side at redeem time using LX-A's helper (`core.loyalty.build_pos_loyalty_blob`): per-tier override → restaurant `redemption_value` → `0.25` fallback.
2. **`redeemed_value = points_redeemed × ratio_per_point`** — computed server-side and returned in response. POS MUST NOT recompute or override.
3. **Auto-cap, do not reject** (rule #6 / Q-LR6). When `points_to_redeem` exceeds any of:
   - `customer.total_points` (insufficient balance)
   - `max_redemption_percent × order_total` (percentage cap)
   - `max_redemption_amount` (absolute cap)
   …the server **silently caps** `points_redeemed` to the maximum allowed and returns the capped value. `INSUFFICIENT_POINTS` is returned ONLY when the cap reduces redemption to zero.
4. **`min_redemption_points`** enforced on both customer balance AND requested points → `BELOW_MIN_REDEMPTION`.
5. **POS-side calculation contract:**
   - POS does NOT send `redeem_amount` (removed vs Phase C plan §8.2).
   - POS does NOT send `eligible_amount` (removed; server uses `order_total` + settings).
   - POS sends `points_to_redeem` as desired; server caps.
   - POS displays `data.points_redeemed` (capped) and `data.redeemed_value` (₹) verbatim — never re-derived client-side.
6. **Discount slot** = current POS discount convention (pre-tax, slots into existing `totalDiscount` math at `CollectPaymentPanel.jsx:~522`) — owner Q3=C. The server returns ₹; POS applies it as a discount line; tax engine recomputes on subtotal-after-discount per existing logic.
7. **Rounding:** server-decided. POS receives final values and renders to 2 dp.

---

## 6. Idempotency Rules (frozen)

| Rule | Behavior |
|---|---|
| Required? | YES — POS MUST send `idempotency_key` |
| Key format (recommended) | `pos_{restaurant_id}_{order_id}_loyalty_{points}` |
| Generation | POS-generated, deterministic per redeem action |
| Retry on transient (network / 5xx / timeout) | Send EXACT same key + same body |
| Same key, same body | Replay → original success body + `data.idempotent: true` (no double-deduct, no extra PT row) |
| Same key, different body (customer / order / points) | `IDEMPOTENCY_CONFLICT` (HTTP 200, `success=false`). `data.error.existing` carries original `{customer_id, order_id, points}` triplet. **Do not retry.** |
| Reuse same key for a new redeem action | Forbidden by contract — POS bug if it happens; surfaces as `IDEMPOTENCY_CONFLICT` |
| Storage | Server-side (PT row's `idempotency_key` field per §8 of pasted handoff). POS does not maintain a server-side idempotency table contract; storage is CRM-internal. |
| TTL | Not stated; treat as effectively unbounded (CRM-internal). |
| POS-side persistence | POS SHOULD persist `idempotency_key` with the order so a page refresh between submit and confirm doesn't generate a new key. |

---

## 7. Audit / Ledger Rules (frozen — server-internal, informational only)

POS does NOT directly read or write the ledger. The relevant CRM-side mutation (informational per pasted §8):

- **Collection: `points_transactions` (PT)** — existing earn-side collection is REUSED for redeem-side.
- One PT row per successful (non-replay) redeem with:
  - `transaction_type = "redeem"`
  - `points` = positive integer (direction encoded by `transaction_type`, not sign — rule #2 / Q-LR2)
  - `redeemed_value`, `ratio_per_point`, `balance_after`, `order_id`, `idempotency_key`, `bill_amount` (= `order_total`), `points_expired=false`, `created_at`
- Idempotent replay does NOT insert a duplicate row.
- The PT row's `_id` is returned as `data.transaction_id` to POS.

POS must persist `transaction_id` on the POS order record — it's the handle for the future reverse endpoint.

---

## 8. Data Mutation Rules (frozen — server-internal, informational only)

| Collection | Mutation |
|---|---|
| `customers` | `$set total_points` (decremented by `points_redeemed`); `$inc total_points_redeemed` (by `points_redeemed`). **`tier` NOT touched. `total_points_earned` NOT touched.** |
| `points_transactions` | One new row per non-replay redeem (see §7 above) |

**No mutation of:**
- `tier` (rule #1 — no downgrade on redeem)
- `total_points_earned`
- Wallet anything
- Coupon anything
- Loyalty settings
- LX-A read endpoints (read-only)

---

## 9. POS Frontend Integration Contract (frozen)

### 9.1 Recommended billing flow (from pasted §9; aligned with owner Q1–Q5)

```
1. Cashier opens bill (order_total known, customer_id resolved from /pos/customer-lookup
   or /pos/customers/{id}/loyalty — both already live since Phase B/LX-A).
2. POS pre-gates redeem UI on LX-A's loyalty_enabled flag (avoid hitting LR endpoint
   when known disabled).
3. Cashier enters redeem amount (in points) → POS optionally calls
   /pos/max-redeemable to display the cap (note from pasted §13: that helper is
   NOT yet tier-aware; LR's auto-cap compensates).
4. On confirm:
       idempotency_key = `pos_${restaurant_id}_${order_id}_loyalty_${points}`
       POST ${REACT_APP_CRM_BASE_URL}/pos/loyalty/redeem
       (Content-Type: application/json, X-API-Key: <restaurant_api_key>)
5. On HTTP 200 + success=true:
       - Apply data.redeemed_value as a discount line on the bill
       - Display data.points_redeemed (the CAPPED value, not the typed one)
       - Persist data.transaction_id on the POS order record
6. On HTTP 5xx / timeout:
       - Retry with EXACT same idempotency_key + EXACT same body
7. On success=false:
       - Branch on data.error.code per §4.7 above
```

### 9.2 Payload field mapping (POS → POS backend, after redeem success)

| POS payload field (existing) | Source | Notes |
|---|---|---|
| `used_loyalty_point` | `data.points_redeemed` (capped) | Int |
| `loyalty_dicount_amount` (typo preserved) | `data.redeemed_value` | Float |
| `loyalty_redemption_id` (NEW field in POS payload) | `data.transaction_id` | String UUID — required for future reverse |

Gating in `orderTransform.js` (per plan §15.4):
```js
const redeemActive = BUG108_FLAGS.loyaltyRedeemLive
                  && redemption?.transaction_id
                  && redemption?.state === 'committed';
const usedLoyaltyPoint    = redeemActive ? redemption.points_redeemed   : 0;
const loyaltyDicountAmt   = redeemActive ? redemption.redeemed_value    : 0;
const loyaltyRedemptionId = redeemActive ? redemption.transaction_id    : null;
```

Note: the plan §15.4 example used `redemption.discount_amount` / `redemption.redemption_id`; **these are renamed to `redeemed_value` / `transaction_id` per the frozen contract**. The plan's §9 and §15 file plan must be amended to use the contract's field names — non-blocking for C-FE-1 since the kill-switch path doesn't read these fields, but mandatory before C-FE-2.

### 9.3 Anti-patterns (from pasted §11 — must be honored)

| Anti-pattern | Correct behavior |
|---|---|
| Re-derive `redeemed_value` client-side and apply it | Use server-returned `data.redeemed_value` |
| Display `points_to_redeem` (typed) after auto-cap | Display `data.points_redeemed` (actual) |
| Generate a fresh `idempotency_key` on retry | Send the SAME key as the original attempt |
| Reuse an `idempotency_key` for a new redeem | New deterministic key per action; reuse only on retry |
| Discard `data.transaction_id` | Persist on POS order — required for future reverse |
| Treat HTTP 200 as automatic success | Always check `success` + `data.error.code` |
| Call when `loyalty_enabled=false` | Pre-gate via LX-A loyalty blob |

### 9.4 Failure handling when final order/payment fails AFTER redeem succeeds (owner Q4=A)

Per Phase C plan §11.1 + the contract:
- If POS calls `/pos/loyalty/redeem` and gets 200 + `success=true`, then the subsequent payment-gateway / order-settlement step fails → POS shows persistent yellow banner in CollectPaymentPanel with `transaction_id`, `order_id`, `points_redeemed`, `redeemed_value`.
- Banner record persisted to `localStorage.bug108_loyalty_orphan_debits` and survives refresh.
- Cashier can retry payment (same redeem already debited) or escalate to admin manual reconciliation.
- **No reverse API call is fired** — reverse is deferred (pasted §13).
- Persisted `transaction_id` is the handle admin uses for the future reverse endpoint when it ships.

---

## 10. Reverse / Rollback Deferred Confirmation

**Confirmed deferred. NOT a blocker.**

Verbatim from pasted handoff:
- §1 scope table: "Loyalty reverse / refund — ❌ Future redemption CR"
- §13 open items: "Loyalty reverse / refund endpoint — Owner: CRM — Status: Deferred (future redemption CR). PT schema already supports it."

Verbatim from Phase C plan §2 + §5 + §11: reverse is deferred; failure handling is via manual recovery banner + localStorage + admin reconciliation.

`transaction_id` returned by LR is **forward-compatible** with the future reverse endpoint (per pasted §8): the PT row schema already carries everything the reverse will need (`order_id`, `idempotency_key`, `bill_amount`, `balance_after`, etc.).

No reverse endpoint to be designed, built, or invoked in Phase C.

---

## 11. Contract vs Current CRM Code Check

**Redeem API implementation exists? YES — already in preview.**

Evidence:
- Pasted handoff §1 banner: "🟢 STATUS: GREEN-LIGHT — POS may consume in preview."
- Pasted §12 QA: 36 / 36 PASS (assertions cover success path, auto-cap, below-min, loyalty_disabled, settings_missing, customer_not_found, invalid_points × 3, missing order_id, missing idempotency_key, idempotent replay, idempotency conflict × 2, no tier downgrade, tier-aware Gold ratio, LX-A 6-key regression, /api/health regression).
- Pasted §15 final status: `cr001c_lr_pos_loyalty_redeem_api_qa_passed`.
- Connectivity probe (this turn): `POST https://insights-phase.preview.emergentagent.com/api/pos/loyalty/redeem` with empty body and no auth → **HTTP 401** (route exists, auth gate enforced). No data mutated by this probe.
- Implementation report: `/app/memory/crm/crm_1_0/implementation/CR_001C_LR_POS_LOYALTY_REDEEM_API_IMPLEMENTATION_REPORT.md` (referenced by pasted handoff parent docs; not opened in this freeze pass).
- QA report: `/app/memory/crm/crm_1_0/qa/CR_001C_LR_POS_LOYALTY_REDEEM_API_QA_REPORT.md` (referenced by pasted §12; not opened in this freeze pass).

CRM has **nothing left to build** for redeem-only. POS-side wiring is the only remaining work.

---

## 12. Contract vs POS Phase C Plan Check

The frozen contract **differs materially** from Phase C plan §8 (the POS team's draft). All differences are non-blocking — POS just needs to follow the frozen contract; the plan needs cosmetic amendments to use the correct field names before C-FE-2 wiring.

### 12.1 Request body — plan §8.2 vs frozen

| Plan §8.2 draft field | Frozen contract | Action for POS |
|---|---|---|
| `restaurant_id` | Removed — derived from `X-API-Key` | Do not send |
| `customer_id` | Kept | Send as-is |
| `customer_phone` | Removed | Do not send |
| `order_id` | Kept (mandatory; no XOR with `temp_order_reference`) | Send the POS order id |
| `temp_order_reference` | Removed — `order_id` is always required | POS must finalize order id before redeem call |
| `bill_amount` | Renamed → `order_total` | Send `order_total` |
| `eligible_amount` | Removed — server auto-caps using `order_total` + settings | Do not send |
| `points_to_redeem` | Kept | Send as-is |
| `redeem_amount` | Removed — server computes and returns | Do not send |
| `idempotency_key` | Kept | Send as-is |
| `source` | Removed | Do not send |
| `actor_user_id` | Removed | Do not send |

Net: **5 required fields** (vs 12 in plan).

### 12.2 Response body — plan §8.3 vs frozen

| Plan §8.3 draft field | Frozen contract | Note |
|---|---|---|
| `success` | Top-level | Match |
| `redemption_id` | Renamed → `data.transaction_id` | **POS must rename in state, payload, localStorage** |
| `points_redeemed` | `data.points_redeemed` | Match (nested under `data`) |
| `discount_amount` | Renamed → `data.redeemed_value` | **POS must rename** |
| `previous_points` | Removed | — |
| `remaining_points` | `data.remaining_points` | Match |
| `ratio_per_point` | `data.ratio_per_point` | Match |
| `tier` | `data.tier` | Match |
| `audit_id` | Removed — `transaction_id` is the audit handle | — |
| `message` | Top-level | Match |
| — | NEW: `data.remaining_points_value` | Receipt footer support |
| — | NEW: `data.total_points_redeemed` | Lifetime counter |
| — | NEW: `data.idempotent: true` on replay | Replay marker |

### 12.3 Error envelope — plan §8.4 vs frozen

| Plan §8.4 draft | Frozen contract | Change kind |
|---|---|---|
| HTTP 4xx body `{success:false, error_code, message}` | HTTP **200** body `{success:false, message, data:{error:{code, message, …}}}` | **Envelope and HTTP-status both differ.** POS error parsing logic must not key off HTTP status (except 401/422/5xx); must drill into `data.error.code`. |
| `invalid_request` | Split into `ORDER_ID_REQUIRED`, `IDEMPOTENCY_KEY_REQUIRED`, `INVALID_POINTS` | Rename + split |
| `auth_failed` | HTTP 401 (no error envelope) | Rename + HTTP status only |
| `customer_not_found` | `CUSTOMER_NOT_FOUND` | Case rename |
| `loyalty_disabled` | `LOYALTY_DISABLED` + sibling `SETTINGS_MISSING` | Rename + split |
| `insufficient_points` | `INSUFFICIENT_POINTS` (only when auto-cap reduces redemption to zero) | Rename + semantic change |
| `amount_mismatch` | **Removed** — server auto-caps; no rejection | Removed (auto-cap behavior) |
| `amount_exceeds_cap` | **Removed** — server auto-caps; no rejection | Removed (auto-cap behavior) |
| `idempotency_replay` (as error) | Now a SUCCESS marker `data.idempotent: true` (HTTP 200, `success=true`) | Promoted from error → success |
| `duplicate_redemption_for_order` | Replaced by `IDEMPOTENCY_CONFLICT` (same key, different body) | Different semantics — duplicate redeem on same order with same key + same body is a **replay**, not a conflict |
| `rate_limited` | Not in contract | Not surfaced |
| `internal_error` | HTTP 5xx (no envelope code); POS must retry with same key | Rename + HTTP status |
| — | NEW: `BELOW_MIN_REDEMPTION` (with `data.error.min_redemption_points`) | New |

### 12.4 Behavioral diffs requiring POS UX adjustments

1. **Auto-cap instead of reject:** Phase C plan §9.2 state machine assumed an explicit `amount_exceeds_cap` error to trigger `[redeem_error]`. The contract instead silently caps and returns 200/success with a smaller `points_redeemed`. POS UX must:
   - Display `data.points_redeemed` (not the typed amount) in the `[redeemed]` chip.
   - Optionally surface a non-blocking info note when `data.points_redeemed < points_to_redeem` ("Capped to maximum allowed: X pts / ₹Y").
   - Update tests accordingly (plan §17.2 row 11 description must change — insufficient-points still throws `INSUFFICIENT_POINTS` only when cap is zero).
2. **Business failures via HTTP 200:** axios success handlers must inspect `success` flag; do not treat HTTP 200 as automatic UI success.
3. **Order ID is hard-required:** the A-resolved sequence (redeem BEFORE payment gateway) is fine — POS just needs to ensure `order_id` is finalized at redeem-call time, not generated post-payment. If the existing flow generates the `order_id` only at bill-payment commit, that step must move earlier (e.g. at "create order" / "freeze cart") so it's available for redeem.

### 12.5 Q1 sequence wording — final reconciliation

Owner Q1=A "Redeem after payment success." Pasted handoff §9 recommended flow is "redeem on cashier confirm, BEFORE payment gateway" (plan §10's A-resolved). The contract supports **both** sequences:

- **Strict Q1=A (redeem AFTER payment gateway success):** `order_id` is fully finalized; orphan-window is "payment settled but redeem failed" → POS already handles via Q4=A manual-recovery banner. Customer paid the FULL bill (no loyalty discount applied at gateway); the loyalty discount becomes a CRM-side credit only — cashier UX is suboptimal because the bill the customer paid is higher than the bill with redeem.
- **A-resolved (redeem on confirm, BEFORE gateway):** customer pays the discounted bill (correct UX); orphan-window is "redeem committed but payment failed" → cashier owes the discounted total, banner surfaces `transaction_id` for manual reverse. Smaller orphan window (<5s typical).

Recommend Track B (formal owner-approval doc) document **A-resolved as the chosen sequence**, with a note that Q1=A's literal interpretation ("after payment success") is technically supported by the contract but produces inferior cashier UX. If owner truly wants the literal Q1=A, document the trade-off explicitly.

---

## 13. Gaps / Clarifications

### 13.1 Blocking gaps: **0**

The contract is complete and CRM-implemented. There are zero blockers for POS implementation.

### 13.2 Non-blocking clarifications

| # | Item | Type | Resolution |
|---|---|---|---|
| N1 | Q1 sequence wording — strict-after-payment vs A-resolved | `OWNER_DECISION_REQUIRED` | Track B owner-approval doc; recommend A-resolved with trade-off documented |
| N2 | Phase C plan §8, §9, §15.4 use stale field names (`redemption_id`, `discount_amount`, `bill_amount`, `audit_id`, `redeem_amount`, `eligible_amount`, `source`, `actor_user_id`, `customer_phone`, `temp_order_reference`, `restaurant_id` in body, etc.) and error-code names | Plan amendment | C-FE-2 agent should add a plan-amendment addendum doc with contract-accurate field names; or update the plan in place. Non-blocking for C-FE-1 (kill-switched). |
| N3 | Phase C plan §9.2 state machine assumes explicit `amount_exceeds_cap` error path; contract uses silent auto-cap | UX amendment | Replace `[redeem_error: amount_exceeds_cap]` branch with a non-blocking info note on the `[redeemed]` chip when `points_redeemed < points_to_redeem` |
| N4 | Phase C plan §11.1 row 8 ("API timeout → POS retries once") needs alignment with pasted §6.2 ("5xx: POS must retry with same key" — no single-retry cap stated) | Plan amendment | Document retry policy explicitly: retry on 5xx/network/timeout with same key, with a sensible client backoff and max-attempts policy (POS-side decision; not in contract) |
| N5 | `order_id` must be finalized BEFORE redeem call (no `temp_order_reference` path) | POS-flow design | C-FE-2 agent ensures order id materialization happens at or before "cashier confirms redeem", not at payment commit |
| N6 | `max_redemption_percent` / `max_redemption_amount` values are restaurant-configured; POS does not know them client-side | UX decision | Acceptable — server auto-caps; POS can optionally call `/pos/max-redeemable` (per pasted §9 step 3, with the caveat in pasted §13 that it's not yet tier-aware) for a preview cap value |
| N7 | `min_redemption_points` is restaurant-configured; POS doesn't know it client-side until first `BELOW_MIN_REDEMPTION` response | UX decision | Cache the value returned in `data.error.min_redemption_points` for subsequent UX hints, or accept first-call surface |
| N8 | `idempotency_key` POS-side persistence across page refresh between confirm and gateway | POS-state design | Persist key in localStorage with order ref (per plan §12 already proposed); not part of CRM contract |

---

## 14. Owner / CRM Questions

**0 blocking questions.** Contract is frozen and CRM has shipped.

Open non-blocking questions (none block POS C-FE-1 or C-FE-2):

| # | Question | Audience | Blocker? |
|---|---|---|---|
| Q-O1 | Q1 sequence: A-resolved (recommended; correct cashier UX) vs literal "redeem after payment success" (Q1=A text)? | Owner | No — both work; affects UX only |
| Q-C1 (optional) | When `/pos/max-redeemable` upgrade lands (tier-aware), should POS switch to using it for the pre-redeem cap preview? | CRM | No — `/pos/loyalty/redeem` auto-caps regardless |

---

## 15. Implementation Readiness Verdict

```
contract_complete_ready_for_pos_and_crm_parallel_implementation
```

…with the explicit note that **CRM has already completed its implementation** (`cr001c_lr_pos_loyalty_redeem_api_qa_passed`, 36/36 PASS, GREEN-LIGHT in preview). Only **POS-side wiring** remains.

Concrete next-action breakdown:

| Track | Status | Critical-path? |
|---|---|---|
| CRM redeem API implementation | ✅ DONE (CR-001C-LR shipped to preview) | No |
| POS owner-approval doc capture (Q1–Q5) | Open — short doc | Gates C-FE-1 merge, NOT C-FE-1 authoring |
| POS C-FE-1 kill-switched wiring | Unblocked — can start now | Critical |
| POS Phase C plan amendment for contract field-name alignment | Optional but recommended before C-FE-2 | Soft-gate for C-FE-2 |
| POS C-FE-2 live wiring | Blocked on C-FE-1 merged + owner-approval doc + plan amendment | Critical (sequence after C-FE-1) |
| Joint preprod QA (C-QA-1) | Blocked on C-FE-2 | Critical |
| Owner preprod smoke (C-OWNER-1) | Blocked on C-QA-1 | Critical |
| Production release | Out of CR scope; gated on joint batch | — |

---

## 16. Recommended Next Agent

**Split CRM + POS Parallel Agents** — but with CRM having no remaining work. Concretely:

1. **POS C-FE-1 Kill-Switched Wiring Agent** (PRIMARY, can start now)
   - Mission: implement plan §9.1 (7 files: 5 modified, 2 new) with `loyaltyRedeemLive=false` everywhere; add `loyaltyService.js` (stub raises "API not ready" when flag off); add `loyaltyTransform.js` (request/response mappers using **frozen contract field names** — `transaction_id`, `redeemed_value`, `remaining_points`, etc.); migrate 5 legacy `customer?.loyaltyPoints` reads; wire UI state machine (`idle → redeem_armed → redeem_in_flight → {redeemed | redeem_error | orphan_warning}`) behind the flag.
   - Gate: zero functional diff vs Phase B at flag-off; Phase B owner-smoke matrix re-PASS.
   - Merge gate: owner-approval doc (Q1–Q5) exists.

2. **Owner Approval Doc Agent** (PARALLEL, short)
   - Mission: capture Q1=A, Q2=A, Q3=C, Q4=A, Q5=A verbatim with Q1 wording disambiguated to A-resolved (recommended) per §12.5 above; new doc `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_OWNER_APPROVAL_2026_05_23.md`; elevates status to `bug_108_loyalty_phase_c_redeem_only_owner_approved_ready_for_implementation`.

3. **POS Phase C Plan Amendment Agent** (PARALLEL, short, OPTIONAL)
   - Mission: produce a slim addendum doc that re-statements plan §8, §9, §15.4 against the frozen contract field names + auto-cap behavior, so C-FE-2 has a single source of truth. Alternatively, the C-FE-2 agent can absorb this work.

4. **CRM Redeem API Implementation Agent** — **NOT NEEDED**. CRM work is done.

5. **Clarification Agent** — **NOT NEEDED**. Contract is frozen; no blocking questions.

---

## 17. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed in this freeze pass | Confirmed |
| 2 | No backend changed in this freeze pass | Confirmed |
| 3 | No data mutated (no DB write, no localStorage write, no points debited) | Confirmed |
| 4 | No redeem API invoked with payload or auth | Confirmed — only an empty unauth POST as connectivity probe (server replied 401 before any business logic ran; zero side-effects) |
| 5 | Reverse API not built; not designed; not invoked in this pass | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |
| 8 | Phase B work intact (read-only loyalty + customer pipeline + CustomerModal parity all preserved) | Confirmed |
| 9 | Coupon / Wallet explicitly out of scope | Confirmed |
| 10 | Production release explicitly out of scope | Confirmed |
| 11 | Owner Q1–Q5 answers intended (A/A/C/A/A) but not yet captured in formal owner-approval doc | Pending — Track 2 (Owner Approval Doc Agent) above; non-blocking for C-FE-1 authoring |
| 12 | Frozen contract field names supersede Phase C plan §8/§9/§15.4 field names (`transaction_id`, `redeemed_value`, `remaining_points_value`, `total_points_redeemed`, etc.) | Confirmed — Track 3 (plan amendment) or absorb into C-FE-2 agent |
| 13 | This freeze supersedes the earlier `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` (same path; that version was frozen against the wrong handoff and is now superseded by this take) | Confirmed |

---

**End of BUG-108 Loyalty Phase C Redeem API Contract Freeze (take 2 — frozen against CR-001C-LR).**
