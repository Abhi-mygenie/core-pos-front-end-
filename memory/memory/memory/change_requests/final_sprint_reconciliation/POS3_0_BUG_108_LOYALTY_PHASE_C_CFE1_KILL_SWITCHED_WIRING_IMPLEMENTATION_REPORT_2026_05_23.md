# POS 3.0 BUG-108 — Loyalty Phase C C-FE-1 Kill-Switched Wiring Implementation Report

**Date:** 2026-05-23 (later)
**Persona:** Senior POS3.0 BUG-108 Loyalty Phase C POS C-FE-1 Kill-Switched Wiring Agent
**Sprint:** POS 3.0 — BUG-108 Phase C, redeem-only mini-phase, sub-task C-FE-1
**CRM endpoint contract (frozen):** `POST /api/pos/loyalty/redeem` per `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md`
**CRM-side implementation:** GREEN-LIGHT in preview (`cr001c_lr_pos_loyalty_redeem_api_qa_passed`, 36/36 PASS, 2026-05-23).

---

## 1. Final Status

```
bug_108_loyalty_phase_c_cfe1_kill_switched_wiring_implemented_waiting_agent_smoke
```

Operational sub-status:
- POS C-FE-1 kill-switched wiring: **IMPLEMENTED** (kill switch `loyaltyRedeemLive=false`, all defense-in-depth gates in place).
- Build: `CI=false yarn build` → **PASS** (22.78s, 474.65 kB gzipped main.js, no errors, only one pre-existing unrelated eslint warning).
- Live preview: `http://localhost:3000/` returns HTTP 200; supervisor `frontend` RUNNING.
- Live CRM redeem endpoint at `https://insights-phase.preview.emergentagent.com/api/pos/loyalty/redeem` is **NOT** called by POS in this build (kill switch off; service wrapper throws `LOYALTY_REDEEM_DISABLED` before any network activity).

---

## 2. Docs Read

1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md` (frozen contract — request/response/error envelope/idempotency)
2. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_ONLY_PREPROD_PLAN_2026_05_23.md` (especially §6, §9, §12, §15)
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_CONTINUATION_STATUS_CHECK_2026_05_23.md`
4. `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` (LX-A read-side contract, still authoritative for the 6-key blob)
5. POS frontend code surface:
   - `/app/frontend/src/utils/BUG108_FLAGS.js`
   - `/app/frontend/src/api/constants.js`
   - `/app/frontend/src/api/crmAxios.js` (interceptor attaches `X-API-Key` from login token)
   - `/app/frontend/src/api/services/index.js`, `customerService.js`
   - `/app/frontend/src/api/transforms/customerTransform.js` (Phase B `buildSyntheticLoyalty` shape)
   - `/app/frontend/src/api/transforms/orderTransform.js` (payload sites L908, L1026, L1153, L1356/1358, L1768/1770)
   - `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (loyalty calc L507, payment data L720, print overrides L781, Loyalty section L1030–L1077, inline mirror L1545–L1582, receipt summary L1791–L1799)

---

## 3. Files Modified

| Action | File | Purpose |
|---|---|---|
| MODIFIED | `src/utils/BUG108_FLAGS.js` | Add `loyaltyRedeemLive: false` + Phase C cashier-copy strings |
| MODIFIED | `src/api/constants.js` | Add `LOYALTY_REDEEM: '/pos/loyalty/redeem'` |
| **NEW**  | `src/api/transforms/loyaltyTransform.js` | Request/response mappers, error-code → copy, idempotency-key builder, UI state-machine constants, localStorage key constants |
| **NEW**  | `src/api/services/loyaltyService.js` | Kill-switched `redeemLoyalty(...)` wrapper |
| MODIFIED | `src/api/transforms/orderTransform.js` | Defense-in-depth payload force-zero — adds `&& loyaltyRedeemLive` to both sites (L1358 Bill Payment, L1770 Print) |
| MODIFIED | `src/components/order-entry/CollectPaymentPanel.jsx` | Migrate 2 legacy `customer?.loyaltyPoints` reads to current Phase B contract (`customer?.loyalty?.points_value` / `total_points` with flat fallback) |

Net: **6 files** (2 new, 4 modified). All other files untouched.

`grep -rn "customer\?\.loyaltyPoints" /app/frontend/src/ --include='*.jsx' --include='*.js'` → **0 hits** in live src (remaining hits are in pre-existing `.bak.cr013*` / `.bak.d1gate` legacy snapshot files that are not part of the build).

---

## 4. Feature Flag Behavior

```js
export const BUG108_FLAGS = {
  couponLive: false,
  loyaltyRatioLive: false,
  loyaltyPreviewLive: true,
  loyaltyRedeemLive: false,   // ← NEW — Phase C C-FE-1 kill switch
  walletDebitLive: false,
};
```

Effect of `loyaltyRedeemLive=false` (default):
- `loyaltyService.redeemLoyalty(...)` throws `Error('LOYALTY_REDEEM_DISABLED')` **synchronously, before any network call** — guarantees zero outbound traffic to `/pos/loyalty/redeem`.
- `orderTransform.js` payload fields stay force-zero: both `used_loyalty_point` (L1358) and `loyalty_dicount_amount` (L1770) require **both** `loyaltyRatioLive` **and** `loyaltyRedeemLive` to be true; either being false → 0.
- The existing Phase B loyalty-section UI is unchanged. Checkbox remains disabled (already gated on `!BUG108_FLAGS.loyaltyRatioLive || !displayPoints` at L1054 / L1559).
- New cashier copy strings in `BUG108_COPY` (e.g. `loyaltyRedeemArmedHelper`, `loyaltyRedeemOrphanWarning`) are defined but **not yet referenced by any UI element** — they are pre-staged for C-FE-2.

When the flag is flipped to `true` by C-FE-2 (preprod only):
- `loyaltyService.redeemLoyalty(...)` will POST to the CRM endpoint with `X-API-Key` attached by `crmAxios` interceptor.
- Payload field gates in `orderTransform.js` will allow the actual values through when both flags are true and a committed redemption is staged.

---

## 5. Service Wrapper Behavior

**File:** `src/api/services/loyaltyService.js`

```js
export const redeemLoyalty = async ({
  customerId, pointsToRedeem, orderId, orderTotal, idempotencyKey
}) => {
  if (!BUG108_FLAGS.loyaltyRedeemLive) {
    const err = new Error('Loyalty redemption is not enabled in this build.');
    err.type = 'LOYALTY_REDEEM_DISABLED';
    err.retryable = false;
    throw err;
  }
  // ... POST via crmApi using API_ENDPOINTS.LOYALTY_REDEEM
};
```

Endpoint construction:
- Base URL: `process.env.REACT_APP_CRM_BASE_URL` (`crmAxios.js:9`)
- Currently set to: `https://insights-phase.preview.emergentagent.com/api`
- Constant `LOYALTY_REDEEM = '/pos/loyalty/redeem'`
- Effective full URL: `https://insights-phase.preview.emergentagent.com/api/pos/loyalty/redeem` (matches frozen contract §4.1)

Auth:
- `X-API-Key` is attached by the existing `crmApi.interceptors.request` (`crmAxios.js:62-72`) using the login-response `crm_token` — exactly the same path used by `searchCustomers`, `lookupCustomer`, `getCustomerDetail`, address ops. No new credential plumbing.

Error mapping (when flag is ON in C-FE-2; not exercised in C-FE-1):
- HTTP 200 + `success=true`: returns `{ ok: true, data: <fromAPI.redeemSuccess shape> }`.
- HTTP 200 + `success=false`: returns `{ ok: false, error: <fromAPI.redeemError shape>, copy: <user message> }`. **Never throws** for business failures — caller branches on `error.code`.
- HTTP 401: throws `Error` with `type='AUTH_FAILED'`, `retryable=false`.
- HTTP 422: throws `Error` with `type='SCHEMA_VIOLATION'`, `retryable=false`, `detail=response body`.
- HTTP 5xx: throws `Error` with `type='SERVER_ERROR'`, `retryable=true`.
- Network / timeout / unknown: throws `Error` with `type='NETWORK_ERROR'`, `retryable=true`.

`retryable=true` is the contract signal that the caller MUST retry with the SAME `idempotencyKey` and SAME body per CR-001C-LR §6.2.

---

## 6. UI State Machine Behavior

State constants exported from `src/api/transforms/loyaltyTransform.js`:

```js
export const LOYALTY_REDEEM_STATES = Object.freeze({
  IDLE:                    'idle',
  ELIGIBLE:                'eligible',
  APPLYING:                'applying',
  APPLIED:                 'applied',
  ERROR:                   'error',
  MANUAL_RECOVERY_WARNING: 'manual_recovery_warning',
});
```

C-FE-1 wiring posture:
- States are **exported** for consumption by C-FE-2 but no `useState` hook for the state machine has been added inside `CollectPaymentPanel.jsx` yet. Rationale: introducing the hook now would require a new conditional render branch that the kill switch must mask in five layout sites (main loyalty section, inline mirror, receipt summary line, print overrides, Bill Payment branches). Keeping the hook out of C-FE-1 keeps the diff minimal and guarantees byte-identical Phase B behavior at flag-off — which is the C-FE-1 acceptance gate.
- The cashier copy strings the state machine will consume (`loyaltyRedeemArmedHelper`, `loyaltyRedeemApplyingHelper`, `loyaltyRedeemAppliedHelper`, `loyaltyRedeemCappedHelper`, `loyaltyRedeemRetryHelper`, `loyaltyRedeemOrphanWarning`) are already pre-staged in `BUG108_COPY` so C-FE-2 has nothing to author at the copy layer.
- C-FE-2 will: (a) introduce a single `useRedemption()` hook (or local `useState`) in `CollectPaymentPanel.jsx`, (b) wire the checkbox `onChange` to advance `IDLE → ELIGIBLE` (no API call), (c) wire the Pay button click to fire `redeemLoyalty()` and transition `ELIGIBLE → APPLYING → {APPLIED | ERROR | MANUAL_RECOVERY_WARNING}`, (d) gate all transitions on `loyaltyRedeemLive===true`, (e) replace the existing checkbox `disabled` predicate with the new state-machine gates.

C-FE-1 also adds **no new render branches** in CollectPaymentPanel. The existing Phase B loyalty section (read-only preview) is the only UI surface; checkbox stays disabled at flag-off.

---

## 7. Payload Safety Confirmation

**Force-zero is intact and now triple-guarded by `loyaltyRedeemLive`:**

| Site | File:line | Pre-C-FE-1 gate | Post-C-FE-1 gate |
|---|---|---|---|
| Place Order | `orderTransform.js:908` | hardcoded `0` | hardcoded `0` (unchanged) |
| Prepaid Payment | `orderTransform.js:1026` | hardcoded `0` | hardcoded `0` (unchanged) |
| Update Order | `orderTransform.js:1153` | hardcoded `0` | hardcoded `0` (unchanged) |
| Bill Payment `used_loyalty_point` | `orderTransform.js:1358` | `loyaltyRatioLive ? value : 0` | `(loyaltyRatioLive && loyaltyRedeemLive) ? value : 0` |
| Print `loyalty_dicount_amount` | `orderTransform.js:1770` | `loyaltyRatioLive ? value : 0` | `(loyaltyRatioLive && loyaltyRedeemLive) ? value : 0` |

At the current flag matrix (`loyaltyRatioLive=false`, `loyaltyRedeemLive=false`) both new gates evaluate to `false → 0` for the same reason they did pre-change (`loyaltyRatioLive=false` short-circuits first). **Behavior at flag-off is byte-identical to Phase B owner-smoke build.**

The defense-in-depth is meaningful only when C-FE-2 flips `loyaltyRedeemLive=true` on preprod: at that moment `loyaltyRatioLive` will also be flipped, and a committed redemption state must populate `discounts.loyaltyPoints` (Bill Payment) / `overrides.loyaltyAmount` (Print). If either flag is missing, the payload stays at `0` — preventing accidental field promotion under a half-rolled flag flip.

Bill total / tax / payable: unchanged. `loyaltyDiscount` in `CollectPaymentPanel.jsx:507-510` still evaluates to `0` at `loyaltyRatioLive=false`, so `totalDiscount` / `subtotalAfterDiscount` / `serviceCharge` / `tax` / `finalTotal` are byte-identical to the pre-change build.

---

## 8. Legacy Loyalty Read Cleanup

Two live-source reads of the deprecated singular `customer?.loyaltyPoints` were migrated:

| Site | File:line (post-edit) | Before | After |
|---|---|---|---|
| Discount math | `CollectPaymentPanel.jsx:~510` | `Math.min(customer.loyaltyPoints, itemTotal - manualDiscount)` | `Math.min(customerPointsValue, itemTotal - manualDiscount)` where `customerPointsValue = customer?.loyalty?.points_value ?? customer?.pointsValue ?? 0` |
| Receipt summary line | `CollectPaymentPanel.jsx:~1798` | `({customer?.loyaltyPoints} pts)` | `({customer?.loyalty?.total_points ?? customer?.totalPoints ?? 0} pts)` |

Note on the local `loyaltyPoints` keys remaining in source (intentionally KEPT):
- `CollectPaymentPanel.jsx:720` — `loyaltyPoints: loyaltyDiscount` inside the `paymentData.discounts` payload object. This is a **payload field name** consumed by `orderTransform.js:1356` as `discounts.loyaltyPoints`. Renaming would break the contract between the panel and the transform. Not a customer-shape read.
- `CollectPaymentPanel.jsx:781` — `loyaltyAmount: loyaltyDiscount` inside the print `overrides` object. Same reasoning; consumed by `orderTransform.js:1770` as `overrides.loyaltyAmount`.

Live-source grep confirmation after edits:
```
$ grep -rn "customer\?\.loyaltyPoints" /app/frontend/src/ --include='*.jsx' --include='*.js'
(no matches)
```
The only remaining hits are inside pre-existing `.bak.cr013` / `.bak.cr013p15` / `.bak.d1gate` snapshot files (untracked by the build, untouched by this change).

---

## 9. Idempotency Prep

**Helper:** `buildRedeemIdempotencyKey({ restaurantId, orderId, points })` in `loyaltyTransform.js`.

Format (per CR-001C-LR §4.1 recommendation):
```
pos_{restaurant_id}_{order_id}_loyalty_{points}
```

Sanitization: non-alphanumeric/underscore characters in `restaurantId` / `orderId` are stripped to keep the key safe for log/audit grepping. Defaults `unknown` / `noorder` / `0` are used when inputs are missing.

LocalStorage keys exported for C-FE-2:
```js
LOYALTY_LS_KEYS = {
  ORPHAN_DEBITS:   'bug108_loyalty_orphan_debits',
  IDEMPOTENCY_MAP: 'bug108_loyalty_idempotency_map',
};
```

C-FE-1 does **not** write to localStorage. The keys are defined so C-FE-2 has stable names to use when:
- persisting `(orderId → idempotency_key, transaction_id)` across page refreshes (so a refresh between redeem-success and payment-success doesn't generate a new key)
- recording orphan-debit records when redeem succeeds but the downstream order/payment fails

Generation rules (encoded in `buildRedeemIdempotencyKey`):
- Key is **deterministic** for a given `(restaurant_id, order_id, points)` triplet.
- Caller MUST retry with the SAME key on `retryable=true` errors (NETWORK_ERROR / SERVER_ERROR).
- Caller MUST generate a NEW key only when the user changes the redeem amount (different `points` → different key).
- Reuse of the same key for a different `(customer_id, order_id, points)` triplet → server returns `IDEMPOTENCY_CONFLICT` (POS bug surfaces explicitly per §6.1 of contract).

---

## 10. Response Mapping

`fromAPI.redeemSuccess(responseBody)` in `loyaltyTransform.js` maps the frozen CRM response shape to camelCase JS state:

| CRM response field | POS state field | Notes |
|---|---|---|
| `data.transaction_id` | `transactionId` | **MUST be persisted** on the POS order — handle for future reverse |
| `data.points_redeemed` | `pointsRedeemed` | **Display this value**, not the typed value (auto-cap may apply) |
| `data.ratio_per_point` | `ratioPerPoint` | Tier-aware snapshot (for receipt) |
| `data.redeemed_value` | `redeemedValue` | **₹ amount to apply as discount line** — never re-derive client-side |
| `data.remaining_points` | `remainingPoints` | Post-redeem balance |
| `data.remaining_points_value` | `remainingPointsValue` | Receipt footer support |
| `data.tier` | `tier` | Unchanged by redeem (rule #1, no downgrade) |
| `data.total_points_redeemed` | `totalPointsRedeemed` | Lifetime counter |
| `data.customer_id` | `customerId` | Echo |
| `data.idempotent` | `idempotent` (bool) | `true` only on replay; treat functionally identical to first success |
| `message` (top-level) | `message` | Includes "(idempotent replay)" suffix on replay |

`fromAPI.redeemError(responseBody)` maps the failure envelope:
| CRM response field | POS state field |
|---|---|
| `data.error.code` | `code` (string, e.g. `LOYALTY_DISABLED`) |
| `data.error.message` (fallback: `message`) | `message` |
| `data.error.existing` | `existing` (triplet for `IDEMPOTENCY_CONFLICT`) |
| `data.error.min_redemption_points` | `minRedemptionPoints` (for `BELOW_MIN_REDEMPTION`) |

`errorCodeToCopy(code)` returns user-facing copy for all 9 frozen codes (`ORDER_ID_REQUIRED`, `IDEMPOTENCY_KEY_REQUIRED`, `INVALID_POINTS`, `IDEMPOTENCY_CONFLICT`, `SETTINGS_MISSING`, `LOYALTY_DISABLED`, `CUSTOMER_NOT_FOUND`, `BELOW_MIN_REDEMPTION`, `INSUFFICIENT_POINTS`) + `UNKNOWN_ERROR` catch-all.

---

## 11. Build Result

| Item | Value |
|---|---|
| Command | `cd /app/frontend && CI=false yarn build` |
| Exit code | 0 |
| Duration | 22.78 s |
| Output | `Compiled with warnings.` (one pre-existing warning) |
| Main bundle | `build/static/js/main.30160032.js` — **474.65 kB gzipped** |
| CSS bundle | `build/static/css/main.ee2036b2.css` — 16.76 kB gzipped |
| Warning summary | `src/components/order-entry/OrderEntry.jsx:1297:6 — react-hooks/exhaustive-deps: 'printOrder' unnecessary dependency`. Pre-existing; unrelated to this change. |

Lint (`mcp_lint_javascript`) across all 6 modified/new files → **No issues found**.

Frontend supervisor service: restarted, `RUNNING`, HTTP 200 on `http://localhost:3000/`.

---

## 12. Regression Guardrails

Behavior at `loyaltyRedeemLive=false` (the default kill-switch state):

| Surface | Pre-C-FE-1 | Post-C-FE-1 |
|---|---|---|
| Phase B loyalty section (read-only preview) | Renders 6-key blob, checkbox disabled | Renders 6-key blob, checkbox disabled (no visual change) |
| Phase B inline mirror (room service) | Same | Same (no visual change) |
| Bill Payment payload `used_loyalty_point` | `0` (force-zero) | `0` (force-zero, triple-guarded) |
| Bill Payment payload `loyalty_dicount_amount` | `0` (force-zero) | `0` (force-zero, triple-guarded) |
| Print receipt loyalty line | Suppressed (`loyaltyDiscount === 0`) | Suppressed |
| `customer.loyaltyPoints` legacy reads | 2 live-source hits | 0 live-source hits (migrated to Phase B contract) |
| `loyaltyService.redeemLoyalty()` invocation | n/a (didn't exist) | Throws `LOYALTY_REDEEM_DISABLED` synchronously; no network activity |
| CRM `/pos/loyalty/redeem` traffic from POS | 0 | 0 |
| `localStorage.bug108_loyalty_*` writes | 0 | 0 |
| Tax engine | Unchanged | Unchanged (no new branch executes at flag-off) |
| `finalTotal` for a given cart | Value X | Value X (byte-identical) |
| Phase B owner-smoke matrix | PASS | Expected PASS (regression guarded) |

Hot reload notice: the frontend supervisor service was restarted after the 6-file batch was committed; the dev server picked up the changes successfully. The production `build/` artifact reflects the new code.

---

## 13. Confirmation — no redeem API called while flag false

Confirmed.

Evidence:
- `loyaltyService.redeemLoyalty(...)` throws `LOYALTY_REDEEM_DISABLED` before any `axios.post` call when `BUG108_FLAGS.loyaltyRedeemLive === false`. See `src/api/services/loyaltyService.js:57-63` (kill-switch guard placed at function entry, ahead of body construction).
- No caller of `redeemLoyalty` exists yet in the codebase (`grep -rn "redeemLoyalty\|loyaltyService" /app/frontend/src/ --include='*.jsx' --include='*.js'` → only the service file itself).
- CollectPaymentPanel does not import `loyaltyService`; no UI surface can trigger a redeem call in C-FE-1.

Independent connectivity probe in this session (read in §11 of the contract-freeze doc): one **empty unauthenticated POST** to the live preview endpoint was sent purely to confirm route existence — server returned HTTP 401 (auth gate) before any business logic ran. No body, no auth, no key debited, no PT row written. This probe was completed BEFORE the kill switch was authored and was the only call ever made from this environment to the redeem endpoint.

---

## 14. Confirmation — no backend / data mutation

Confirmed.

- No edits to `/app/backend/` (POS scaffold) — it remains the unrelated FastAPI starter.
- No edits to any CRM repo (out of this environment's reach in any case).
- No DB writes from POS: the POS-side stack writes only to its own backend (POS), which itself is untouched.
- No `localStorage.bug108_loyalty_*` writes in C-FE-1 — only the key strings are defined for C-FE-2.
- No CRM PT rows inserted: redeem endpoint was not invoked with a real body or auth.
- The static QA fixtures on the CRM side (36/36) were exercised by the CRM team before this session; this session does not re-run them.

---

## 15. Confirmation — `/app/memory/final/` untouched

Confirmed.

Verbatim cross-check:
- `/app/memory/final/` directory list: 8 files (ARCHITECTURE_DECISIONS_FINAL.md, BUSINESS_RULES_BASELINE_FINAL.md, CHANGE_REQUEST_PLAYBOOK.md, FINAL_DOCS_APPROVAL_STATUS.md, FINAL_DOCS_SUMMARY.md, IMPLEMENTATION_AGENT_RULES.md, MODULE_DECISIONS_FINAL.md, OPEN_QUESTIONS_FINAL_RESOLUTION.md).
- No file in this directory was opened, edited, or deleted in this session.

---

## 16. Confirmation — baseline docs untouched

Confirmed.

- LX-A read-side handoff (`/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`): not edited.
- Phase C Redeem-Only Preprod Plan (the planning doc): not edited.
- Phase C Continuation Status Check: not edited.
- Phase B closure docs (Implementation Report, Customer Pipeline Fix, CustomerModal Search Parity, Phase B Owner Smoke PASS Report): not edited.
- Coupon / Wallet / Visibility / `points_transactions` references: not edited.

Only two new docs are produced by C-FE-1 (this report + the QA handoff `..._QA_HANDOFF_2026_05_23.md`).

---

**End of POS3.0 BUG-108 Loyalty Phase C C-FE-1 Kill-Switched Wiring Implementation Report.**
