# POS 3.0 BUG-108 — Loyalty Phase C Full Preprod Implementation Plan

**Date:** 2026-05-23 (later)
**Sprint:** POS 3.0 — BUG-108 continues
**Status:** `bug_108_loyalty_phase_c_full_preprod_implementation_planned_waiting_owner_signoff_and_crm_scoping`

**Supersedes:** `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEMPTION_PLAN_2026_05_23.md` (initial plan) and `POS3_0_BUG_108_LOYALTY_PHASE_C_API_RECONCILIATION_UPDATE_2026_05_23.md` (reconciliation). Reads forward from those documents.
**Authoritative CRM loyalty-read contract (unchanged):** `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`

---

## 1. Recommission Context

Per owner direction (2026-05-23, later):

- **Phase C is recommissioned in full.** The earlier "deferred indefinitely" sign-off (CR-001C-LX §1 phase mapping) is hereby reversed for this work.
- **Target environment: preprod.** Real test transactions will run against preprod CRM + POS.
- **Both APIs must be built.** The CRM team's prior "Q5 — no reversal needed" position is reversed. Reverse / rollback is required for safe payment-failure handling.
- **No part of Phase C is to be marked "ready for frontend implementation" until the backend/API implementation plan is in place.** This plan satisfies that gate by including both halves end-to-end.

Verified state going into this plan:

| Component | State |
|---|---|
| Phase B read-only loyalty read endpoints (LX-A) | **LIVE, GREEN-LIGHT, consumed by POS** |
| `customer.loyalty` 6-key blob | **Available** |
| `POST /pos/loyalty/redeem` | **NOT BUILT** — must be designed + implemented |
| `POST /pos/loyalty/reverse` | **NOT BUILT** — must be designed + implemented |
| Idempotency / audit ledger on CRM side | **NOT BUILT** |
| POS redemption UI state machine | **NOT BUILT** |
| POS payload wiring at place-order / prepaid / update-order sites | **PARTIAL** — only bill-payment site flag-gated; other three sites hardcode zero |
| Reverse-on-payment-failure orchestration | **NOT BUILT** |
| Preprod test customers + ledger seeded | **NOT VERIFIED** |

---

## 2. Phase C Scope (All Seven Items)

| # | Item | Owner module | Touched by this plan |
|---|------|--------------|----------------------|
| 1 | CRM redeem API design + implementation | CRM team | §4 |
| 2 | CRM reverse/rollback API design + implementation | CRM team | §5 |
| 3 | Idempotency + audit records (loyalty ledger) | CRM team | §6 |
| 4 | POS frontend redemption UI | POS team | §7 |
| 5 | POS payload wiring (5 sites) | POS team | §8 |
| 6 | Payment-failure rollback orchestration | POS team (with CRM reverse endpoint) | §9 |
| 7 | Preprod QA with real test transactions | Joint POS + CRM | §10 |

---

## 3. Hard Non-Scope (Boundary)

- Coupon API integration (CR-001C-C — separate)
- Wallet debit (CR-001C-W — separate)
- Loyalty earn / accrual flow (already CRM-internal)
- Tax law changes — none; loyalty discount slots into existing pre-tax discount math
- Print receipt format changes beyond surfacing the redemption line
- Dead-code cleanup (`mockCustomers.js`, legacy `loyaltyPoints` field) — P3 backlog
- Backend payment-gateway changes — unchanged
- `/app/memory/final/` and baseline docs — untouched

---

## 4. CRM Backend Work — `POST /pos/loyalty/redeem`

### 4.1 Endpoint specification

| Item | Value |
|------|-------|
| Method + Path | `POST /api/pos/loyalty/redeem` |
| Auth | `X-API-Key: <crm_token>` (same pattern as existing `/pos/customer-lookup`) |
| Content-Type | `application/json` |
| Idempotent? | **YES** — server keyed on `(restaurant_id, idempotency_key)` |
| Atomic? | **YES** — either fully debits or fails; no partial debit |
| Latency budget | p95 ≤ 400 ms |

### 4.2 Request shape

```json
{
  "restaurant_id":        "rest_xxx",
  "customer_id":          "bc92911c-...",
  "customer_phone":       "9004020412",
  "order_id":             "ord_yyy",
  "temp_order_reference": null,
  "bill_amount":          1250.00,
  "points_to_redeem":     86,
  "redeem_amount":        86.00,
  "idempotency_key":      "uuid-v4",
  "source":               "pos_collect_bill",
  "redemption_mode":      "commit"
}
```

Notes:
- `order_id` XOR `temp_order_reference` — exactly one. POS uses `temp_order_reference` when redemption fires before the order is persisted (reservation pattern).
- `redemption_mode`: `commit` (default — debit immediately) or `reserve` (hold; expires after N minutes; requires follow-up `confirm` call). Owner Q3 decides whether reservation is supported.
- `points_to_redeem` is integer; `redeem_amount` = `points_to_redeem * ratio_per_point` (server re-verifies).
- `source` ∈ {`pos_collect_bill`, `pos_prepaid`, `room_service`, `pos_update_order`}.

### 4.3 Response (HTTP 200)

```json
{
  "success":              true,
  "redemption_id":        "red_zzz",
  "points_redeemed":      86,
  "discount_amount":      86.00,
  "remaining_points":     0,
  "remaining_points_value": 0.00,
  "ratio_per_point":      1.0,
  "tier":                 "Bronze",
  "audit_id":             "aud_aaa",
  "redemption_state":     "committed",
  "expires_at":           null,
  "message":              "Redemption successful"
}
```

For `redemption_mode=reserve`: `redemption_state="reserved"`, `expires_at` populated (ISO 8601, default reservation TTL 15 minutes).

### 4.4 Error matrix

| HTTP | `error_code` | Meaning | POS handling |
|------|-------------|---------|--------------|
| 400 | `invalid_request` | Schema / missing field | Inline cashier error; no retry |
| 401 | `auth_failed` | Bad / expired token | Trigger re-login flow |
| 404 | `customer_not_found` | `customer_id` unknown | Inline error; suggest re-pick customer |
| 409 | `idempotency_replay` | Duplicate request | Treat as 200; return cached response |
| 422 | `insufficient_points` | `points_to_redeem > total_points` | Inline error; reset state |
| 422 | `loyalty_disabled` | Customer or restaurant flag off | Hide loyalty UI |
| 422 | `amount_mismatch` | `redeem_amount` ≠ server-computed | Inline error; surface server's amount |
| 422 | `reservation_expired` | `confirm` after TTL | Inline error; start fresh redemption |
| 429 | `rate_limited` | Throttled | Retry with backoff; one toast |
| 500 | `internal_error` | CRM-side fault | Inline error + retry button; do not auto-retry |

All error bodies:
```json
{ "success": false, "error_code": "…", "message": "Human-readable" }
```

### 4.5 CRM-side implementation requirements

1. **Atomicity:** wrap point-debit + audit-insert in a single transaction; failure → rollback both.
2. **Idempotency table:** `(restaurant_id, idempotency_key) → (redemption_id, response_body, created_at)`. TTL 7 days. Replay returns the cached response.
3. **Mode flag:** `redemption_state` column on `loyalty_redemptions` table — `reserved | committed | reversed | expired`.
4. **Reservation expiry job:** background sweep moves `reserved → expired` after TTL; restores `remaining_points` via the audit ledger (not directly).
5. **Concurrency:** row-level lock on `customer.total_points` during debit.
6. **Validation:** server recomputes `redeem_amount` from `points_to_redeem * ratio_per_point` and rejects mismatches > 0.01.
7. **Logging:** every redemption logs `request body, response, latency, source IP, restaurant_id, user_id` (without secrets).

### 4.6 Acceptance criteria for §4

- 100% of 30+ unit-test fixtures pass (boundary + negative cases).
- Idempotency replay test: 5 identical requests in parallel debit exactly once.
- Insufficient-points test: 422 returned, no debit.
- Concurrency test: two simultaneous redeems for the same customer with overlapping point amounts — one succeeds, one fails 422.
- p95 latency under load (10 RPS) ≤ 400 ms on preprod.
- Audit ledger row created for every committed redemption.

---

## 5. CRM Backend Work — `POST /pos/loyalty/reverse`

### 5.1 Endpoint specification

| Item | Value |
|------|-------|
| Method + Path | `POST /api/pos/loyalty/reverse` |
| Auth | `X-API-Key` |
| Idempotent? | **YES** |
| Atomic? | **YES** |
| Latency | p95 ≤ 400 ms |

### 5.2 Request shape

```json
{
  "restaurant_id":   "rest_xxx",
  "customer_id":     "bc92911c-...",
  "redemption_id":   "red_zzz",
  "order_id":        "ord_yyy",
  "reason":          "payment_failed",
  "idempotency_key": "uuid-v4"
}
```

`reason` ∈ {`payment_failed`, `order_cancelled`, `manual`, `refund`, `reservation_expired`}.

### 5.3 Response (HTTP 200)

```json
{
  "success":          true,
  "reversal_id":      "rev_aaa",
  "points_restored":  86,
  "new_total_points": 86,
  "audit_id":         "aud_bbb",
  "message":          "Reversal complete"
}
```

### 5.4 Error matrix

| HTTP | `error_code` | Meaning |
|------|-------------|---------|
| 404 | `redemption_not_found` | Unknown `redemption_id` |
| 409 | `already_reversed` | Return cached reversal_id; treat as 200 |
| 409 | `idempotency_replay` | Return cached response |
| 422 | `redemption_not_reversible` | Outside reversal window (configurable, default 7 days) |
| 422 | `redemption_state_invalid` | E.g., trying to reverse an `expired` reservation that was never committed |
| 500 | `internal_error` | Generic |

### 5.5 CRM-side implementation requirements

1. **Atomicity:** point-restore + audit-insert in single transaction.
2. **No partial reversal:** full reverse only in Phase C. Partial refunds deferred.
3. **Reversal window:** configurable per restaurant (default 7 days). After window, returns `redemption_not_reversible`.
4. **State transition:** `committed → reversed`, `reserved → expired (reversal)` for in-flight reservations.
5. **Audit chain:** reversal row links `original_redemption_id` so the ledger shows the full trail.
6. **Idempotency table:** same pattern as redeem; keyed on `(restaurant_id, idempotency_key)`.

### 5.6 Acceptance criteria

- Reverse of a committed redemption restores points exactly.
- Double-reverse returns the same `reversal_id` (idempotency).
- Reverse outside the window returns 422.
- Audit ledger correctly chains redemption → reversal.

---

## 6. Idempotency & Audit Records

### 6.1 Idempotency contract (both endpoints)

- Key generated client-side as UUID v4 at the moment of the cashier's intent (tick checkbox / confirm reverse).
- Server keyed table: `loyalty_idempotency(restaurant_id, idempotency_key, endpoint, response_body, response_status, created_at)`.
- TTL: 7 days. Beyond TTL, a replay creates a new operation (rare; mostly a safety net).
- Concurrency-safe: a single key triggers exactly one debit/restore even under parallel calls.

### 6.2 Audit ledger schema (CRM-side, new)

Table: `loyalty_audit_ledger`

| Column | Type | Notes |
|--------|------|-------|
| `audit_id` | UUID PK | |
| `restaurant_id` | UUID FK | |
| `customer_id` | UUID FK | |
| `event_type` | enum | `redeem`, `reverse`, `expire`, `accrual` (accrual already exists; this just keeps the table cohesive) |
| `redemption_id` | UUID FK nullable | |
| `original_redemption_id` | UUID FK nullable | For reversals |
| `points_delta` | integer | Signed (-86 for redeem, +86 for reverse) |
| `amount_delta` | numeric(10,2) | Same |
| `balance_after_points` | integer | Snapshot of `customer.total_points` AFTER the change |
| `order_id` / `temp_order_reference` | string | |
| `source` | string | `pos_collect_bill` etc. |
| `reason` | string nullable | For reversals |
| `idempotency_key` | string indexed | |
| `actor_user_id` | UUID nullable | POS cashier (from token, if available) |
| `created_at` | timestamptz | |

### 6.3 Audit queryability

- CRM admin UI gets a "Loyalty Ledger" tab per customer (out of scope for Phase C but the schema supports it).
- POS team can query the ledger via a future `GET /pos/loyalty/audit?customer_id=&order_id=` endpoint (also future; Phase C does not depend on it).

---

## 7. POS Frontend Work — Redemption UI

### 7.1 File-level work plan

| File | Change |
|------|--------|
| `src/utils/BUG108_FLAGS.js` | Add new flag `loyaltyRedeemLive: false` (kill-switch for redeem API path); keep `loyaltyRatioLive: false → true` in C3 |
| `src/api/constants.js` | Add `LOYALTY_REDEEM`, `LOYALTY_REVERSE` endpoint constants |
| `src/api/services/loyaltyService.js` | **NEW** — `redeemLoyalty(payload)`, `reverseLoyalty(payload)`; both with idempotency-key generation, CRM-timeout handling per BUG-078, structured error parsing on `error_code` |
| `src/api/transforms/loyaltyTransform.js` | **NEW** — request/response mappers; map CRM `error_code` → user-facing copy |
| `src/components/order-entry/CollectPaymentPanel.jsx` | Replace dead `customer?.loyaltyPoints` reads at 5 sites with `customer?.loyalty?.points_value` / `customer?.pointsValue`; wire UI state machine; render inline error region; lift `redemptionStaged` / `redemptionId` to OrderEntry context so room-service mirror shares state |
| `src/components/order-entry/OrderEntry.jsx` | Hold redemption state at top; provide reverse-on-payment-fail orchestration; persist unresolved-reversal records to localStorage |
| `src/api/transforms/orderTransform.js` | Replace hardcoded zeros at L908/1026/1153 with the same `BUG108_FLAGS.loyaltyRatioLive ? ... : 0` pattern already used at L1356/1768; add `loyalty_redemption_id` field |

Net: 7 files (5 modified, 2 new). No backend in this list — that's CRM's surface.

### 7.2 UI state machine

```
[idle] ─tick redemption checkbox→ [redeem_in_flight]
[redeem_in_flight] ─200→ [redeemed]
[redeem_in_flight] ─4xx/5xx→ [redeem_error]
[redeem_error] ─retry→ [redeem_in_flight]
[redeem_error] ─untick→ [idle]
[redeemed] ─click Remove→ [reverse_in_flight]
[redeemed] ─click Pay & 200→ [paid_with_redemption]
[redeemed] ─click Pay & 4xx/5xx→ [auto_reverse_in_flight]
[reverse_in_flight] / [auto_reverse_in_flight] ─200→ [idle]
[reverse_in_flight] / [auto_reverse_in_flight] ─4xx/5xx→ [reverse_failed_critical]
[reverse_failed_critical] — persistent banner, localStorage record, manual retry, escalation
```

### 7.3 Visual contract

- Loyalty checkbox enabled when `loyaltyRatioLive=true` AND `customer.loyalty.loyalty_enabled !== false` AND `total_points > 0` AND `points_value > 0`.
- In `redeem_in_flight` / `reverse_in_flight`: spinner + checkbox disabled.
- In `redeemed`: green check + label "₹X applied (Y pts)" + small Remove link.
- Errors render inline (red text below helper). No duplicate toasts.
- Mirror (room-service inline) reads same state. No second redemption call.

### 7.4 Double-click guard

Single in-flight ref. Checkbox `disabled` during any of the in-flight states. The idempotency key is generated once per user intent and carried through retries.

---

## 8. POS Payload Wiring (5 Sites)

### 8.1 Current state per site

| Site | File:line | Today | After C2/C3 |
|------|-----------|-------|-------------|
| Place Order | `orderTransform.js:908` | `used_loyalty_point: 0` (hardcoded) | `BUG108_FLAGS.loyaltyRatioLive ? (discounts.loyaltyPoints \|\| 0) : 0` + `loyalty_redemption_id` field if redemption staged pre-order |
| Prepaid Payment | `orderTransform.js:1026` | Same | Same pattern |
| Update Order | `orderTransform.js:1153` | Same | Same pattern |
| Bill Payment | `orderTransform.js:1356` | Already flag-gated | Add `loyalty_redemption_id` field |
| Print | `orderTransform.js:1768` | Flag-gated `loyalty_dicount_amount` | Add receipt line "Loyalty: -₹X (Y pts)" |

### 8.2 New payload field: `loyalty_redemption_id`

POS sends the `redemption_id` returned by the redeem API on every order-mutation payload that follows the redemption, so the POS backend (and downstream consumers) can correlate the order with the CRM ledger entry.

### 8.3 Field naming preservation

**Critical:** `loyalty_dicount_amount` typo is intentional and must be preserved (matches the existing POS backend field name). Do NOT correct the typo.

---

## 9. Payment-Failure Rollback Orchestration

### 9.1 Sequence

```
1. Cashier ticks Loyalty checkbox
   └─ POS generates idempotency_key K1
2. POS calls /pos/loyalty/redeem (mode = commit OR reserve per owner Q3)
   ├─ 200 → store {redemption_id, audit_id} → state=[redeemed]
   └─ error → inline error → state=[idle]
3. Cashier clicks Pay
4. POS calls bill-payment with used_loyalty_point + loyalty_dicount_amount + loyalty_redemption_id
   ├─ 200 → state=[paid_with_redemption] → done
   ├─ 4xx/5xx → state=[auto_reverse_in_flight], generate K2
   └─ network drop → state=[auto_reverse_in_flight] with retry policy
5. POS calls /pos/loyalty/reverse with reason=payment_failed, idempotency_key=K2
   ├─ 200 → toast "Loyalty points refunded" → state=[idle]
   └─ error → state=[reverse_failed_critical] → persistent banner + localStorage record
```

### 9.2 Order-cancellation hook

If `orderData.loyalty_redemption_id` is set on a cancelled order, POS fires `/pos/loyalty/reverse` with `reason=order_cancelled` before the cancellation completes. Cancel button is `disabled` until reverse succeeds (or the cashier explicitly chooses "Cancel anyway" — which logs the orphan redemption_id for manual support).

### 9.3 Cashier-initiated remove (untick after redeem)

Same flow as 9.1 step 4 but `reason=manual`.

### 9.4 Reservation TTL expiry (if owner Q3 = reserve mode)

POS shows a countdown next to the redemption pill. On expiry, the redemption auto-reverts on the CRM side; POS shows toast "Loyalty reservation expired — please re-tick" and returns to `[idle]`.

### 9.5 LocalStorage unresolved-reversal records

```
localStorage.bug108_pending_loyalty_reversals = [
  { redemption_id, customer_id, order_id, idempotency_key, attempts, last_attempt_at, last_error }
]
```

Banner persists across reloads until cleared. Background retry every 60 s with exponential backoff up to 5 minutes.

---

## 10. Preprod QA with Real Test Transactions

### 10.1 Preprod environment readiness checklist

- [ ] CRM preprod has both endpoints deployed (`/redeem`, `/reverse`)
- [ ] `loyalty_audit_ledger` + `loyalty_idempotency` tables migrated on preprod
- [ ] Test restaurant `jehsnest` (or a dedicated `preprod_loyalty_test` restaurant) seeded with:
  - Bronze customer with 120 pts (ratio 0.25)
  - Silver customer with 620 pts (ratio 1.0)
  - Gold customer with 480 pts (ratio 1.5)
  - Customer with 0 pts (boundary case)
  - Customer with `loyalty_enabled=false`
- [ ] POS preprod build deployed with new `loyaltyRedeemLive=true`, `loyaltyRatioLive=true`
- [ ] POS preprod has access to CRM preprod's `X-API-Key` via existing login flow

### 10.2 Real-transaction QA matrix (Phase C4)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Bronze cust (120 pts, ratio 0.25) → bill ₹1000 → tick loyalty | `redeem` debits 120 pts, applies ₹30 discount, payload `used_loyalty_point=120 loyalty_dicount_amount=30`. CRM ledger shows audit. |
| 2 | Silver cust (620 pts, ratio 1.0) → bill ₹400 → tick loyalty | Capped at ₹400 (subtotal); `redeem_amount=400`, `points_to_redeem=400`. Remaining 220 pts. |
| 3 | Gold cust (480 pts, ratio 1.5) → bill ₹500 → tick loyalty | Cap at ₹500; `points_to_redeem=334` (`ceil(500/1.5)` per server policy — confirm CRM rounding). |
| 4 | Customer with 0 pts | Checkbox disabled |
| 5 | Customer with `loyalty_enabled=false` | Checkbox disabled |
| 6 | Tick loyalty → tick again rapidly (double-click) | Only one `/redeem` call fires |
| 7 | Tick loyalty → wait → CRM down (mock 500) | Inline error; state returns to `[idle]`; no debit on CRM side |
| 8 | Successful redeem → Pay (success) | `bill-payment` carries `loyalty_redemption_id`; ledger correlates |
| 9 | Successful redeem → Pay (fail 500) | `/reverse` fires; ledger shows reverse row; customer points restored |
| 10 | Successful redeem → Pay (network drop) | Retry; idempotency key prevents double-reverse |
| 11 | Reverse fails 500 after payment fail | Persistent banner; localStorage record; manual retry succeeds; banner clears |
| 12 | Cashier removes redemption after applying | `/reverse` fires with `reason=manual`; checkbox returns to `[idle]` |
| 13 | Order cancelled post-bill with redemption | `/reverse` fires with `reason=order_cancelled`; cancel completes |
| 14 | Manual discount + loyalty (owner Q6 = additive) | Both apply; tax computed on post-both subtotal |
| 15 | Preset discount + loyalty | Additive (existing) |
| 16 | Service charge applies on post-discount subtotal | Existing behavior preserved |
| 17 | GST/VAT prorated on post-loyalty subtotal | Per-line tax math unchanged |
| 18 | Round-off | No negative grand totals; no off-by-one paise |
| 19 | Print receipt | Shows "Loyalty: -₹X (Y pts)" line |
| 20 | Reservation mode (if Q3=C) — TTL expiry | Auto-revert, cashier sees expiry toast, can re-tick |
| 21 | Room-service inline mirror | All above repeat identically; mirror shares state |
| 22 | Phase B fallback when `loyaltyRedeemLive=false` | Behavior identical to today's preview-only mode |
| 23 | `idempotency_replay` from CRM | POS receives cached response; no UI flicker |
| 24 | Concurrent cashier rapid-fire (two devices, same customer) | One succeeds 200; other gets 422 `insufficient_points` |
| 25 | Audit ledger query (manual SQL on preprod) | Every redeem + reverse logged with correct deltas and chains |
| 26 | Coupon section unchanged | Still "Coming soon" (couponLive=false) |
| 27 | Wallet section unchanged | Still disabled (walletDebitLive=false) |
| 28 | Phase B owner-smoke regression (Sapna typing + table re-engage + CustomerModal save) | All still pass |

---

## 11. Phased Rollout Sequence

| Phase | Deliverable | Owned by | Gate |
|-------|-------------|----------|------|
| **C-BE-1** | CRM redeem + reverse API implementation, audit ledger, idempotency table, unit tests | CRM team | CRM static QA ≥ 95% pass, p95 ≤ 400 ms |
| **C-BE-2** | Preprod deploy + seed data + smoke (CRM-side curl matrix) | CRM team | All §10.1 readiness items checked |
| **C-FE-1** | POS frontend wiring with both flags off (`loyaltyRedeemLive=false`, `loyaltyRatioLive=false`) — legacy field cleanup + UI state machine + service stubs that throw "API not ready" | POS team | Build PASS; behavior identical to Phase B |
| **C-FE-2** | POS frontend live wiring with `loyaltyRedeemLive=true`, `loyaltyRatioLive=true` on preprod only | POS team | Joint smoke with CRM team — §10.2 first half (rows 1-10) PASS |
| **C-QA-1** | Joint preprod QA — full §10.2 matrix (28 rows) executed with real customers | POS + CRM | All 28 PASS (or documented deferrals with sign-off) |
| **C-OWNER-1** | Owner live smoke on preprod | Owner | Owner verdict PASSED |
| **C-PROD-1** | Production deploy (joint batch per CR-001C-LX §9.3 — with CR-001A Phase 2 + CR-001D) | POS + CRM + Ops | Owner sign-off + go/no-go |
| **C-PROD-2** | Production owner smoke + 7-day stabilization watch | Owner | BUG-108 final closure |

---

## 12. Consolidated Owner Questions (Q1–Q11)

(Q1–Q8 carry forward from the original Phase C plan; Q9–Q10 from the reconciliation; Q11 added by this plan.)

**Q1.** Loyalty applies pre-tax (A) / post-tax (B) / backend decides (C). Recommended: **A**.
**Q2.** Max redeemable cap rule. Recommended: **A** (`min(points_value, subtotal-after-other-discounts)`).
**Q3.** Redemption timing — A (after payment) / B (before payment with auto-reverse) / **C (reserve then confirm)**. **Owner now wants full preprod build — C is preferred IF CRM commits to reservation semantics; otherwise B with auto-reverse.**
**Q4.** Redemption succeeds but payment fails → **A (auto-reverse)**.
**Q5.** Cashier control — **B (checkbox applies max)**.
**Q6.** Manual + loyalty — **B (additive — matches existing math)** unless owner picks A (mutex).
**Q7.** Loyalty + coupon when coupon CR ships — **C (decide in coupon CR)**.
**Q8.** Wallet — **A (keep deferred)**.
**Q9.** Re-commission redemption CR — **A** (already taken; reflected by this plan).
**Q10.** Reverse endpoint — **A** (CRM builds it; reflected by this plan as a hard requirement).
**Q11.** Reservation TTL value — Recommended: **15 minutes**, configurable per restaurant. (Only relevant if Q3 = C.)

These eleven decisions plus the implementation plan above unblock C-BE-1 / C-FE-1 in parallel.

---

## 13. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | CRM-side concurrency bug causes double-debit | Low | High | Row-level lock + idempotency key + concurrency unit test |
| R2 | Reverse endpoint fails after payment-failure → orphan debit | Low-Med | Med | LocalStorage unresolved-reversal + persistent banner + retry; escalation flow with redemption_id |
| R3 | Tax math drift when loyalty discount lands pre-tax | Low | High | Phase C2 keeps math identical to Phase B; only the `loyaltyDiscount` value changes; existing tax tests cover |
| R4 | Cashier confuses redemption vs preview state | Med | Low | State machine + distinct visual treatments (green check vs grey checkbox) |
| R5 | Network drop mid-redeem → ghost reservation | Low | Med | Idempotency key + reservation TTL expiry |
| R6 | Preprod test customers polluted by partial test runs | High | Low | Seed-reset script; tests use unique idempotency_keys per run |
| R7 | Print receipt regression | Low | Low | Visual diff on existing receipts; add new line conditionally |
| R8 | Phase B regression (read-only preview) | Low | High | C-FE-1 build with flags off must match Phase B owner-smoke exactly |
| R9 | CRM `ratio_per_point` drift between read endpoints and redeem endpoint | Low | Med | Both call the same shared `core.loyalty.build_pos_loyalty_blob` helper (per CRM contract §2) |

---

## 14. Implementation Readiness Verdict

```
ready_for_crm_scoping_and_pos_c_fe_1_in_parallel
```

Sub-status:
- **C-BE-1 (CRM API build)**: Ready for CRM team to scope and ticket. Spec in §4 + §5 + §6. CRM-side estimate needed.
- **C-FE-1 (POS frontend wiring with both flags off)**: Ready to start in parallel — no CRM dependency for this slice. Subject to owner answers Q1–Q11.
- **C-BE-2 (CRM preprod deploy + seed)**: Blocked on C-BE-1.
- **C-FE-2 (POS frontend live wiring)**: Blocked on C-BE-1 + C-FE-1 + owner Q1–Q11.
- **C-QA-1 (joint preprod QA)**: Blocked on C-BE-2 + C-FE-2.
- **C-OWNER-1 / C-PROD-1 / C-PROD-2**: Sequential after C-QA-1.

This plan is **not marked frontend-ready for the live-flag phase** until the CRM team commits to a delivery date for C-BE-1 and C-BE-2 per the joint preprod readiness checklist in §10.1.

---

## 15. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed by this plan | Confirmed |
| 2 | No backend changed by this plan (CRM team work is scoped, not built) | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redemption / reverse API invoked (still don't exist) | Confirmed |
| 5 | Plan does NOT claim APIs are already ready | Confirmed |
| 6 | Phase C is NOT deferred — recommissioning is captured in §1 and reflected throughout | Confirmed |
| 7 | Backend API implementation plan is included (§4 + §5 + §6) — no part of frontend is marked ready for the live-flag phase without it | Confirmed |
| 8 | `/app/memory/final/` untouched | Confirmed |
| 9 | Baseline docs untouched | Confirmed |
| 10 | Phase B owner-smoke-passed work remains intact and untouched | Confirmed |
| 11 | This plan supersedes prior Phase C planning (initial plan + reconciliation update) for the API readiness section; other sections continue to apply | Confirmed |

---

**End of BUG-108 Loyalty Phase C Full Preprod Implementation Plan.**
