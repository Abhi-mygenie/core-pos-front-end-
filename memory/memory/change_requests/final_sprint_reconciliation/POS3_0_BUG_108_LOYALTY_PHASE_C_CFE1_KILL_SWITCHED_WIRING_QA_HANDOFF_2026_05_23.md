# POS 3.0 BUG-108 — Loyalty Phase C C-FE-1 Kill-Switched Wiring QA Handoff

**Date:** 2026-05-23 (later)
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C POS C-FE-1 Kill-Switched Wiring Agent
**Implementation report:** `POS3_0_BUG_108_LOYALTY_PHASE_C_CFE1_KILL_SWITCHED_WIRING_IMPLEMENTATION_REPORT_2026_05_23.md`
**Contract reference (frozen):** `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md`
**Phase C plan:** `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md`
**Status entering QA:** `bug_108_loyalty_phase_c_cfe1_kill_switched_wiring_implemented_waiting_agent_smoke`

---

## 1. Scope of this QA Pass

This QA pass validates **kill-switched wiring only** (`BUG108_FLAGS.loyaltyRedeemLive === false`). Live redemption (`true`) is OUT OF SCOPE for this QA pass — it ships in C-FE-2.

The primary acceptance gate is: **at flag-off, behavior is byte-identical to the Phase B owner-smoke build.**

---

## 2. Build & Service State (Pre-QA Snapshot)

| Item | State |
|---|---|
| `yarn build` | PASS (22.78 s, 474.65 kB gzipped main.js, no errors) |
| Lint (ruff/eslint on 6 touched files) | No issues |
| Frontend supervisor service | `RUNNING` |
| `http://localhost:3000/` | HTTP 200 |
| `REACT_APP_CRM_BASE_URL` | `https://insights-phase.preview.emergentagent.com/api` |
| `BUG108_FLAGS.loyaltyRedeemLive` | `false` (default — kill switch ON) |
| `BUG108_FLAGS.loyaltyRatioLive` | `false` (unchanged from Phase B) |
| `BUG108_FLAGS.loyaltyPreviewLive` | `true` (unchanged from Phase B) |

---

## 3. Files Under Test

| File | Change |
|---|---|
| `src/utils/BUG108_FLAGS.js` | `+loyaltyRedeemLive` + Phase C copy strings |
| `src/api/constants.js` | `+LOYALTY_REDEEM` endpoint constant |
| `src/api/transforms/loyaltyTransform.js` | NEW — request/response mappers + state constants + idempotency helper |
| `src/api/services/loyaltyService.js` | NEW — kill-switched `redeemLoyalty()` |
| `src/api/transforms/orderTransform.js` | Payload gates L1358 + L1770 now require both flags |
| `src/components/order-entry/CollectPaymentPanel.jsx` | 2 legacy `customer?.loyaltyPoints` reads migrated to Phase B contract |

---

## 4. Test Matrix — C-FE-1 (Kill-Switched)

### 4.1 Flag mechanics (P0)

| # | Test | Steps | Expected |
|---|---|---|---|
| F1 | `loyaltyRedeemLive` exported and false | Open `src/utils/BUG108_FLAGS.js` | `loyaltyRedeemLive: false` present |
| F2 | Service refuses to call API at flag-off | In a JS console after app loads: `(await import('/static/js/main.…js'))` … or run unit-style test inside dev console; call `redeemLoyalty({...})` | Throws synchronously with `err.type === 'LOYALTY_REDEEM_DISABLED'` and `err.retryable === false`. NO network request to `/pos/loyalty/redeem` (verify in DevTools Network tab — should remain empty for the redeem path). |
| F3 | Constants present | `grep LOYALTY_REDEEM /app/frontend/src/api/constants.js` | `LOYALTY_REDEEM: '/pos/loyalty/redeem'` present |

### 4.2 Network-traffic absence (P0 — security/safety)

| # | Test | Steps | Expected |
|---|---|---|---|
| N1 | No redeem traffic during full bill flow | Login → open running order → open Collect Payment → add discount → click Pay (cash) → finish | DevTools Network tab shows ZERO requests to `*/pos/loyalty/redeem`. |
| N2 | No redeem traffic on Print Bill | Login → open running order → click Print Bill | Same — zero traffic to `*/pos/loyalty/redeem`. |
| N3 | No redeem traffic on Phase B preview tick attempts | If the loyalty checkbox is disabled (expected), confirm clicking it does nothing AND fires no network call | Checkbox is `disabled`; click is a no-op; no redeem traffic. |
| N4 | No localStorage writes | After full bill flow, inspect `localStorage` keys | `bug108_loyalty_orphan_debits` and `bug108_loyalty_idempotency_map` are NOT present. |

### 4.3 Phase B regression (P0 — byte-identical behavior)

| # | Test | Expected |
|---|---|---|
| B1 | Customer with positive `points_value` (e.g. Gold customer 480 pts, ₹720 value) | Loyalty section shows tier chip + `(480 pts)` + `₹720 available` preview. Checkbox disabled. Helper `"Redemption will be enabled in a future update."` |
| B2 | Customer with 0 points | Loyalty section shows `(0 pts)` + `No points`. Checkbox disabled. Helper text unchanged. |
| B3 | Customer with `loyalty_enabled=false` | Loyalty section shows disabled state. Helper `"Loyalty program unavailable"` |
| B4 | No customer attached | Loyalty section not rendered (existing Phase B gate) |
| B5 | Room-service inline mirror | All B1–B3 cases reproduce identically inside the inline mirror |
| B6 | Bill payment → cash → finalize | Payment succeeds; PLACE_ORDER / BILL_PAYMENT / PRINT payloads carry `used_loyalty_point=0`, `loyalty_dicount_amount=0`. Final total unchanged vs Phase B build. |
| B7 | CustomerModal save (Name/Phone typeahead → CRM lookup → 6-key blob) | Behavior unchanged; loyalty section reflects fresh CRM data |
| B8 | Sapna typeahead (CartPanel customer search) | Behavior unchanged |
| B9 | Order restore via `enrichCustomerLoyaltyFromCRM` | Behavior unchanged; preview updates after CRM lookup |
| B10 | Receipt summary line | When `loyaltyDiscount === 0` (current state), Loyalty Points line is hidden — unchanged |

### 4.4 Legacy-read cleanup verification (P1)

| # | Test | Expected |
|---|---|---|
| L1 | `grep -rn "customer\?\.loyaltyPoints" /app/frontend/src/ --include='*.jsx' --include='*.js'` | **0 live-source hits.** (Hits in `.bak.cr013*`/`.bak.d1gate` legacy snapshots are acceptable.) |
| L2 | `loyaltyDiscount` calc reads `customer?.loyalty?.points_value` fallback chain | Confirmed in `CollectPaymentPanel.jsx:~509` |
| L3 | Receipt summary reads `customer?.loyalty?.total_points` fallback chain | Confirmed in `CollectPaymentPanel.jsx:~1798` |
| L4 | `paymentData.discounts.loyaltyPoints` field name preserved (NOT renamed) | Confirmed in `CollectPaymentPanel.jsx:720` — this is the field name expected by `orderTransform.js:1358` |
| L5 | Print overrides `loyaltyAmount` field name preserved (NOT renamed) | Confirmed in `CollectPaymentPanel.jsx:781` — expected by `orderTransform.js:1770` |

### 4.5 Transform unit checks (P1 — can be run via Node REPL or Jest if available)

| # | Test | Expected |
|---|---|---|
| T1 | `buildRedeemIdempotencyKey({restaurantId: '478', orderId: '868999', points: 100})` | Returns `'pos_478_868999_loyalty_100'` |
| T2 | Special-char sanitization | `buildRedeemIdempotencyKey({restaurantId: '47-8/!', orderId: 'ord#9', points: 50})` returns `'pos_478_ord9_loyalty_50'` |
| T3 | `toAPI.redeem({customerId, pointsToRedeem: '100', orderId, orderTotal: '850.5', idempotencyKey: 'k'})` | Returns `{customer_id, points_to_redeem: 100, order_id, order_total: 850.5, idempotency_key: 'k'}` (integer / number coercion) |
| T4 | `fromAPI.redeemSuccess(sampleSuccessBody)` | All 11 fields mapped to camelCase; `idempotent` defaults to `false` when absent |
| T5 | `fromAPI.redeemError(sampleErrorBody)` | `code`, `message`, `existing`, `minRedemptionPoints` all populated when present |
| T6 | `errorCodeToCopy('LOYALTY_DISABLED')` | Returns `'Loyalty program is currently disabled.'` |
| T7 | `errorCodeToCopy('UNKNOWN_NEW_CODE')` | Returns the `UNKNOWN_ERROR` fallback copy |

### 4.6 Payload force-zero (P0)

For each of the 5 payload sites in `orderTransform.js`:

| # | Site | Test cart | Expected `used_loyalty_point` | Expected `loyalty_dicount_amount` |
|---|---|---|---|---|
| P1 | Place Order (`:908`) | Any cart with customer | `0` | (n/a) |
| P2 | Prepaid Payment (`:1026`) | Prepaid order | `0` | (n/a) |
| P3 | Update Order (`:1153`) | Add items to existing | `0` | (n/a) |
| P4 | Bill Payment (`:1356-1358`) | Any cart, cash payment | `0` | (n/a) |
| P5 | Print (`:1768-1770`) | Any cart, print bill | (n/a) | `0` |

Capture the actual payloads (DevTools Network tab → Request Payload) for the cash/finalize and Print Bill flows. The two fields above MUST be `0`.

### 4.7 Acceptance gate (single decisive check)

| # | Test | Expected |
|---|---|---|
| A1 | Run the same scripted scenario that produced the Phase B owner-smoke PASS on 2026-05-23, against this build, with no customer flag changes. Compare PLACE_ORDER / BILL_PAYMENT / PRINT payloads. | **Byte-identical** for `used_loyalty_point`, `loyalty_dicount_amount`, `coupon_*`, `use_wallet_balance`. Final total, tax, service charge, grand total: byte-identical. |

If A1 passes, C-FE-1 is acceptable for merge.

---

## 5. Bug-report Template

If a defect is found, file under bug-id `BUG-108-CFE1-{nnn}` with:
- Repro steps
- Affected files (from §3)
- Expected vs Observed
- Network capture (HAR) showing the redeem URL is or isn't called
- localStorage dump
- Screenshot of the loyalty section / receipt

---

## 6. Out-of-Scope for this QA Pass

- Live redemption (`POST /pos/loyalty/redeem`) at `loyaltyRedeemLive=true` — that's C-FE-2.
- UI state-machine wiring (`IDLE → ELIGIBLE → APPLYING → APPLIED / ERROR / MANUAL_RECOVERY_WARNING`) inside CollectPaymentPanel — that's C-FE-2.
- localStorage orphan-debit persistence — that's C-FE-2.
- Owner-approval doc for Q1–Q5 — separate parallel track.
- Plan §8/§9/§15.4 field-name addendum — separate parallel track (or absorbed into C-FE-2).
- Coupon / Wallet / Reverse — separate CRs, out of this phase.
- Production release — gated separately.

---

## 7. Test Credentials

CRM API key is sourced from the login response's `crm_token` field per BUG-098 (`crmAxios.js:23-27`). Any valid preprod login (e.g. the same credentials used for Phase B owner-smoke on `18march` / `pos_0001_restaurant_478`) provides the `X-API-Key`. No new credentials are needed for C-FE-1 QA — none of the test cases above require the redeem endpoint to be called.

If a future C-FE-2 QA pass needs live redeem traffic, use the seeded test customers from CR-001C-LR §17.1 / pasted handoff §10 (Bronze 120 pts, Silver 620 pts, Gold 480 pts, zero-points customer, loyalty_disabled customer).

---

## 8. Acceptance Verdict Format

When QA completes, the testing agent should produce one of:

- `PASS — bug_108_loyalty_phase_c_cfe1_kill_switched_wiring_agent_smoke_passed` (all P0 tests pass; all P1 transform checks pass; no redeem traffic observed; Phase B regression byte-identical)
- `FAIL — bug_108_loyalty_phase_c_cfe1_kill_switched_wiring_agent_smoke_defects_filed` (one or more defects in §4; file under BUG-108-CFE1-{nnn})

On PASS, the next agent should be:
- **Owner Approval Doc Agent** (parallel, short) — captures Q1–Q5 verbatim
- **POS Phase C Plan Amendment Agent** (parallel, short, optional) — addendum aligning field names to frozen contract
- **POS C-FE-2 Live Wiring Agent** (after both above land) — flips `loyaltyRedeemLive=true` on preprod, wires the UI state machine, persists orphan-debit records, runs the 32-row preprod QA matrix per plan §17.2

---

**End of POS3.0 BUG-108 Loyalty Phase C C-FE-1 Kill-Switched Wiring QA Handoff.**
