# POS 3.0 BUG-108 — Coupon CRM Integration Discovery Report

**Date:** 2026-05-25
**Persona:** Senior POS3.0 BUG-108 Coupon CRM Integration Discovery Agent
**Mode:** Discovery only — no code changes, no data mutation, no mutating API calls.
**Audience:** Owner + CRM team + future Coupon Implementation Planning Agent.

---

## 1. Status

```
bug_108_coupon_crm_blocked_missing_crm_contract
```

Coupon UI, payload fields, and feature flag are wired in POS Frontend, but the entire Coupon module is **kill-switched** (`BUG108_FLAGS.couponLive = false`). No CRM coupon contract has been delivered (`CR-001C-C` is explicitly deferred until Loyalty CR closes). No CRM endpoint exists in POS code. No real validate / redeem / reverse calls are ever made. Implementation cannot begin without the CRM coupon contract + owner answers below.

---

## 2. Executive Summary

- **Feature flag state:** `couponLive: false` (`/app/frontend/src/utils/BUG108_FLAGS.js` L35). This is the master kill switch.
- **UI:** Coupon input + Apply button + helper text exists in `CollectPaymentPanel.jsx` (main panel + inline-mirror for room service). Visible only when `customer && restaurantSettings.isCoupon`. Today the inputs render in a "Coming soon" disabled state.
- **Apply handler:** `handleApplyCoupon` (L659–L672) is a guarded no-op when `couponLive=false` — early-return before any logic. No CRM call.
- **Discount math:** `couponDiscount` (L521–L526) is always `0` while `couponLive=false`, even if a `selectedCoupon` somehow existed.
- **Payload (Flow 4 / collectBillExisting + print):** `coupon_discount`, `coupon_title`, `coupon_type`, `coupon_code` are **force-zeroed/empty** by the `couponLive` gate (`orderTransform.js` L1355–L1357, L1785).
- **Payload (Flow 3 / placeOrderWithPayment):** Reads `discounts.coupon` (note: keyname mismatch — CollectPaymentPanel emits `couponDiscount`, not `coupon`), so always falls back to `0`. Not flag-gated. Effectively silently zero today.
- **Payload (Flow 1 / placeOrder, Flow 2 / updateOrder):** Hardcoded `coupon_discount: 0`, `coupon_title: null`, `coupon_type: null`.
- **Payload (Flow 6 / transferToRoom):** No coupon fields in payload at all.
- **Payload (Flow 7 QSR / handleQsrCollectBill via CartPanel.QsrBillingSection):** Hardcoded `couponDiscount: 0`, `couponTitle: ''`, `couponType: ''` (CartPanel.jsx L391–L393). No coupon UI in QSR.
- **CRM endpoints in POS code:** ZERO coupon endpoints in `api/constants.js`. The constants for `LOYALTY_REDEEM` and `MAX_REDEEMABLE` exist, but **no `COUPON_*` constants**.
- **CRM contract:** `CR-001C-C` (Coupon CRM CR) is explicitly **deferred** until `CR-001C-L` (Loyalty) closes (per `CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`). No contract delivered.
- **Customer-coupon entitlement:** Schema slot `customer.coupons` was referenced historically (per BUG-108 discovery doc 2026-05-22) but `customerTransform.js` does not populate it — currently always `undefined`.
- **Hardcoded mock catalog:** REMOVED. The old `generalCoupons = [{code:'FLAT50'},…]` mock catalog was deleted; only the disabled-shell guard remains.
- **Reports:** `reportTransform.js` L442 still displays `couponDiscount` from the historical `coupon_discount` field on order records (read-only display; not active emission).
- **Verdict:** Coupon is a **disabled shell** in POS Frontend. There is no local mock, no partial CRM, no hardcoded redemption — just a stub UI behind a kill switch. Implementation work cannot begin until (a) CRM coupon contract is delivered (CR-001C-C) and (b) owner answers the 5 questions in §18.

---

## 3. Docs Read

### 3.1 Baseline (final/)
1. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
2. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
3. `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
4. `/app/memory/final/FINAL_DOCS_SUMMARY.md`
5. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
6. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
7. `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`

### 3.2 BUG-108 / Coupon-related docs
8. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md` (2026-05-22, the original coupon/loyalty/wallet inventory)
9. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PAYLOAD_PATHS_GAP_PLAN_2026_05_24.md` (all 9 flow inventory)
10. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_LOYALTY_PHASE_C_LR_REDEMPTION_TRIGGER_CORRECTION_PLAN_FROZEN_2026_05_24.md` (frozen Loyalty Phase C architecture — sets the no-direct-mutating-call pattern)
11. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_CRM_TEAM_HANDOFF_2026_05_22.md`
12. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md`
13. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md`
14. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_OWNER_DECISION_MATRIX_2026_05_22.md`
15. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_BASELINE_RECONCILIATION_NOTE_2026_05_22.md`
16. `change_requests/final_sprint_reconciliation/POS3_0_BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md`
17. `bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md` (BUG-108 row)
18. `crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` — confirms `CR-001C-C` (Coupon) is deferred
19. `/app/memory/PRD.md`

### 3.3 Sprint status
20. `change_requests/final_sprint_reconciliation/POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md`

---

## 4. Code Areas Inspected

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `src/utils/BUG108_FLAGS.js` | L34–L62 | Confirmed `couponLive: false`; helper-text strings |
| 2 | `src/api/constants.js` | L6–L98 | Endpoint registry — confirmed **no** coupon endpoint constants |
| 3 | `src/components/order-entry/CollectPaymentPanel.jsx` | L264–L266 (state), L521–L526 (math), L532, L653–L672 (apply handler), L782–L784 (payload emit), L834–L835 (discount_amount grouping), L851 (print override emit), L1046–L1099 (main coupon UI), L1539–L1620 (inline-mirror room service UI) | Full coupon UI + math + payload surface |
| 4 | `src/api/transforms/orderTransform.js` | L903–L905 (Flow 1), L1019–L1021 (Flow 2), L1148–L1150 (Flow 3), L1355–L1357 (Flow 4), L1390–L1430 (Flow 6 transfer-to-room — no coupon), L1785 (Flow 5 print) | All payload paths |
| 5 | `src/api/transforms/profileTransform.js` | L314 | `is_coupon` → `isCoupon` mapping (real backend flag) |
| 6 | `src/api/transforms/reportTransform.js` | L442 | Read-only display of historical `coupon_discount` on order records |
| 7 | `src/api/transforms/customerTransform.js` | full file | Confirmed: customer transform does NOT populate `customer.coupons` |
| 8 | `src/api/services/customerService.js` | full file | Confirmed: no coupon API functions |
| 9 | `src/api/services/orderService.js` | L125 | Only a doc comment mentions `couponCode` in `buildBillPrintPayload` signature |
| 10 | `src/components/order-entry/CartPanel.jsx` | L374–L411 (QsrBillingSection.handleCollectBill) | QSR billing payload — coupon hardcoded to 0/empty |
| 11 | `src/components/order-entry/OrderEntry.jsx` | (referenced by L1126–L1290 for QSR — handleQsrCollectBill) | Hosts `restaurantSettings.isCoupon` flag |
| 12 | `src/components/panels/settings/ViewEditViews.jsx` | L229, L280, L288 | Settings UI toggle for `isCoupon` (round-trips to profile API) |
| 13 | `src/components/reports/CollectBillPanelDrawer.jsx` | (referenced — uses `CollectPaymentPanel`) | Hold-tab/Audit collect-bill path — inherits coupon shell |
| 14 | `src/api/services/loyaltyService.js` / `src/api/transforms/loyaltyTransform.js` | full files | Confirmed: no coupon code lives here (loyalty-only) |

Grep summary (whole `src/`):
- Files referencing `coupon` or `isCoupon` or `generalCoupons`: 9 (listed above).
- No files reference a coupon endpoint path; no axios call to anything coupon-related.

---

## 5. Current Coupon Feature Flag Status

| Item | Value |
|---|---|
| Frontend kill switch | `BUG108_FLAGS.couponLive` |
| File | `src/utils/BUG108_FLAGS.js` L35 |
| Current value | **`false`** |
| Backend profile flag | `is_coupon` (snake) → `restaurantSettings.isCoupon` (camel) via `profileTransform.js` L314 |
| Cascade behavior | UI hidden if `!customer || !restaurantSettings.isCoupon`. UI disabled with "Coming soon" if `couponLive=false`. Payload force-zero if `couponLive=false`. |
| Helper-text strings | `BUG108_COPY.couponDisabledHelper = 'Coming soon'`, `couponBlockedByDiscount = 'Remove the manual discount to apply a coupon.'`, `discountBlockedByCoupon = 'Remove the coupon to apply a manual discount.'` |

---

## 6. Current Coupon UI Status

Locations:
- **Main panel** — `CollectPaymentPanel.jsx` L1046–L1099 (regular Collect Bill payment screen)
- **Inline-mirror** — `CollectPaymentPanel.jsx` L1539–L1620 (room-service / compact billing variant)

UI elements present:
- Coupon input (`data-testid="coupon-input"`)
- Apply button (`data-testid="apply-coupon-btn"`)
- Helper-text slot (`data-testid="coupon-helper-text"`) — currently shows "Coming soon"
- Error slot (`data-testid="coupon-error-text"`)
- Applied-coupon chip (`✓ {code} (-₹{amount})`) with Remove button
- Section wrapper (`data-testid="coupon-section"`)

Gating:
- Render gate: `customer && restaurantSettings?.isCoupon`
- Disable gate: `!BUG108_FLAGS.couponLive || (manualDiscount > 0 || presetDiscount > 0)`
- Mutual exclusion with manual/preset discount per BUG-108 P1 Q10 (no auto-clear; user must remove the other one first)

UI in other screens:
- **QSR `QsrBillingSection` (CartPanel.jsx)** — NO coupon UI at all. Compact billing has no coupon input.
- **Cart panel inline discount** — NO coupon input (discount only).
- **Bill print** — does not render coupon UI; emits payload fields only (`coupon_code` print field).

---

## 7. Current Coupon Calculation Status

`couponDiscount` computation (`CollectPaymentPanel.jsx` L521–L526):
```js
const couponDiscount = (BUG108_FLAGS.couponLive && selectedCoupon)
  ? selectedCoupon.type === "percent"
    ? Math.min(Math.round((itemTotal * selectedCoupon.discount)) / 100, selectedCoupon.maxDiscount || Infinity)
    : selectedCoupon.discount
  : 0;
```

Effective result today: **always `0`** because `couponLive=false`.

The math itself is local (percent and flat branches). The legacy hardcoded `generalCoupons` catalog has been removed (per BUG-108 discovery doc 2026-05-22). `selectedCoupon` can therefore only be set by the `handleApplyCoupon` path, which early-returns when `couponLive=false`.

Included in `totalDiscount` (L532): `manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount` — coupon contributes 0 currently.

Included in `subtotalAfterDiscount` (L533): yes via `totalDiscount`. So tax/GST/VAT proration would automatically pick up coupon when (and only when) `couponLive=true` AND a `selectedCoupon` exists.

---

## 8. Current Coupon Payload Status

| Path | File / Line | Field(s) | Current value | Gate |
|---|---|---|---|---|
| Flow 1 placeOrder | `orderTransform.js` L903–L905 | `coupon_discount`, `coupon_title`, `coupon_type` | `0`, `null`, `null` | Hardcoded zero |
| Flow 2 updateOrder | `orderTransform.js` L1019–L1021 | `coupon_discount`, `coupon_title`, `coupon_type` | `0`, `null`, `null` | Hardcoded zero |
| Flow 3 placeOrderWithPayment (prepaid) | `orderTransform.js` L1148–L1150 | `coupon_discount: discounts.coupon \|\| 0`; `coupon_title: discounts.couponTitle \|\| ''`; `coupon_type: discounts.couponType \|\| ''` | Always `0` / `''` today (see note) | NOT gated by `couponLive`. `discounts.coupon` key never emitted by `CollectPaymentPanel` (it emits `discounts.couponDiscount` at L782). So falls back to `0` via key mismatch. |
| Flow 4 collectBillExisting | `orderTransform.js` L1355–L1357 | `coupon_discount`, `coupon_title`, `coupon_type` | `0`, `''`, `''` | Force-zero via `BUG108_FLAGS.couponLive` |
| Flow 5 buildBillPrintPayload | `orderTransform.js` L1785 | `coupon_code` | `''` | Force-empty via `BUG108_FLAGS.couponLive` |
| Flow 6 transferToRoom | `orderTransform.js` L1390–L1430 | none | NOT EMITTED | No coupon fields in payload at all |
| Flow 7 QSR (CartPanel) | `CartPanel.jsx` L391–L393 → Flow 3 transform | `couponDiscount: 0, couponTitle: '', couponType: ''` | Always `0` / `''` | Hardcoded at caller side |

CollectPaymentPanel → orderTransform handoff (L782–L784 in CPP):
```js
paymentData.discounts = {
  ...
  couponDiscount: couponDiscount,           // → goes to discounts.couponDiscount
  couponTitle:    selectedCoupon?.code || '',
  couponType:     selectedCoupon?.type || '',
  ...
}
```

Print overrides emit (L851 in CPP):
```js
overrides.couponCode = selectedCoupon?.code || '';   // → print: coupon_code (gated by couponLive)
```

**Coupon-specific fields the CRM may also want but POS does not emit today:**
- `usage_id` — never present
- `discount_value` — never emitted (POS emits `coupon_discount`, not `discount_value`)
- coupon UUID / coupon catalog ID — never present
- customer entitlement identifier — never present

---

## 9. Current Coupon Print Status

- `buildBillPrintPayload` emits `coupon_code` (string) at L1785 — force-empty when `couponLive=false`.
- No `coupon_discount` field is included in the print payload itself (only in the bill-payment payload). The historical typo-preserved `loyalty_dicount_amount` exists for loyalty in print; coupon has no equivalent discount field in the print payload.
- Reports view: `reportTransform.js` L442 reads `order.coupon_discount` and exposes it as `couponDiscount` for historical bills only.

---

## 10. Current CRM API Status

| Aspect | Status |
|---|---|
| CRM coupon endpoints in `api/constants.js` | **NONE.** No `COUPONS_*` constant exists. Only `LOYALTY_REDEEM` (L48), `MAX_REDEEMABLE` (L51), and customer-related endpoints are wired. |
| CRM coupon endpoints in `api/services/customerService.js` | **NONE.** No function for `validateCoupon`, `fetchCoupons`, `redeemCoupon`, or `reverseCoupon`. |
| Direct CRM coupon axios call anywhere | **NONE.** Grep across `src/` returns zero hits. |
| Mock fallback / local coupon catalog | **NONE.** Legacy `generalCoupons` array was removed; no local validation. |
| Customer-coupon entitlement read | **NONE.** `customer.coupons` schema slot referenced in earlier discovery (2026-05-22) is not populated by `customerTransform.js`. |
| Existing CRM contract | **NONE delivered.** Per `CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`: "CR-001C-C Coupon — next… Deferred — opens after Loyalty closes." |
| Proposed (not delivered) endpoints | `GET /pos/coupons/available`, `POST /pos/coupons/validate` (per the 2026-05-22 discovery plan §6). Plus potentially `POST /pos/coupons/apply` and reversal endpoints. None have request/response shapes finalized. |

---

## 11. Flow Inventory Table

| Flow | Function / Caller | Coupon UI? | Coupon in totals? | Coupon fields in payload? | CRM API call? | Status | Notes |
|---|---|---|---|---|---|---|---|
| **Flow 1** — placeOrder (unpaid) | `orderTransform.toAPI.placeOrder` | No | No | Yes, **hardcoded 0/null** | No | DISABLED_BY_FLAG | Unpaid order — no payment time |
| **Flow 2** — updateOrder (add items) | `orderTransform.toAPI.updateOrder` | No | No | Yes, **hardcoded 0/null** | No | DISABLED_BY_FLAG | Item addition — no payment time |
| **Flow 3** — placeOrderWithPayment (prepaid / place-and-pay) | `orderTransform.toAPI.placeOrderWithPayment` | Yes (via CollectPaymentPanel) | Math wired but couponDiscount always 0 | Yes, reads `discounts.coupon` (key mismatch → always 0/''). **NOT gated by `couponLive`** — but effectively zero because the data never arrives. | No | DISABLED_BY_FLAG (with a latent bug: key mismatch + missing `couponLive` gate) | If `couponLive` is flipped without fixing the key mismatch, Flow 3 will STILL send 0. |
| **Flow 4** — collectBillExisting (postpaid Bill Payment) | `orderTransform.toAPI.collectBillExisting` | Yes (via CollectPaymentPanel) | Math wired (always 0 today) | Yes, force-zero via `couponLive` gate | No | DISABLED_BY_FLAG | Reference path. Will be the first place coupon goes live. |
| **Flow 5** — buildBillPrintPayload (Print) | `orderTransform.toAPI.buildBillPrintPayload` | N/A (print) | N/A | `coupon_code` only, force-empty via `couponLive` gate | No | DISABLED_BY_FLAG | Print payload missing a discount field; only emits the code. |
| **Flow 6** — transferToRoom (room transfer) | `orderTransform.toAPI.transferToRoom` | No | Not directly (uses `finalTotal`) | **NONE — no coupon fields at all** | No | OUT_OF_SCOPE / NEEDS_OWNER_DECISION | If a customer transfers a coupon-discounted bill to a room, the room folio will not have any coupon audit trail. May or may not matter to owner. |
| **Flow 7** — QSR fresh Place+Pay | `OrderEntry.handleQsrCollectBill` → `placeOrderWithPayment` (via `CartPanel.QsrBillingSection`) | **No** (QSR has no coupon UI) | No | Hardcoded `couponDiscount: 0, couponTitle: '', couponType: ''` at CartPanel L391–L393 | No | DISABLED_BY_FLAG + NEEDS_OWNER_DECISION | Even if `couponLive=true`, QSR will not support coupon without adding UI to `QsrBillingSection`. |
| **Flow 7B** — QSR Collect Bill on placed order (Full View) | `OrderEntry.handleQsrCollectBill` → `collectBillExisting` (inherits Flow 4 via CollectPaymentPanel) | Yes (via CollectPaymentPanel) | Math wired (always 0) | Force-zero via `couponLive` gate | No | DISABLED_BY_FLAG | Inherits Flow 4 path. |
| **Flow 8** — Hold-Tab Collect Bill (Audit Report `CollectBillPanelDrawer`) | `CollectBillPanelDrawer` → `collectBillExisting` (via CollectPaymentPanel) | Yes | Math wired (always 0) | Force-zero via `couponLive` gate | No | DISABLED_BY_FLAG | Inherits Flow 4 path. |

---

## 12. Field Matrix

| Field | In UI state? | Flow 3 payload (prepaid) | Flow 4 payload (bill payment) | Flow 5 print payload | Required by CRM (per proposed contract)? | Notes |
|---|---|---|---|---|---|---|
| `coupon_discount` | derived (`couponDiscount`) | Yes, but reads wrong key `discounts.coupon` → always `0`; NOT `couponLive`-gated | Yes, force-zero via `couponLive` | NO | Yes (likely, per BUG-108 discovery 2026-05-22) | Flow 3 has a latent key mismatch bug to fix when flipping flag |
| `coupon_title` | yes (`selectedCoupon?.code`) | Yes, reads `discounts.couponTitle` → always `''` | Yes, force-empty via `couponLive` | NO | Yes (likely) | Carries coupon code/label in current contract |
| `coupon_type` | yes (`selectedCoupon?.type`: `'percent'` \| `'flat'`) | Yes, reads `discounts.couponType` → always `''` | Yes, force-empty via `couponLive` | NO | Possibly | CRM may not need this if it owns the catalog |
| `coupon_code` | derived (`selectedCoupon?.code`) | NO (not in Flow 3 payload) | NO (Flow 4 uses `coupon_title`) | Yes (print only), force-empty via `couponLive` | Possibly | Print-only field |
| `usage_id` | NO | NO | NO | NO | **Likely yes** — CRM redemption audit trail | Never emitted by POS today |
| `discount_value` | NO | NO (POS emits `coupon_discount`) | NO | NO | **Likely yes** — proposed contract uses `discount_value` | Naming mismatch risk |
| `order_discount` | yes (`discounts.orderDiscountPercent`) | YES | YES | N/A | Not coupon-specific | Existing field, unaffected |
| `discount_type` | yes (`discounts.type`) | YES | YES | N/A | Not coupon-specific | Existing field |
| coupon ID / UUID | NO | NO | NO | NO | **Likely yes** for catalog-served coupons | Schema slot to be added |
| Customer ID (`cust_membership_id`) | yes (from `customer.id`) | YES | resolved via `order_id` backend-side | N/A | YES (for customer-specific coupons) | Already wired |
| Customer phone (`cust_mobile`) | yes | YES | resolved via `order_id` | N/A | Fallback identifier | Already wired |
| Restaurant ID (`restaurant_id`) | yes (from profile) | implicit via session | implicit via session | implicit | YES | Already wired |
| Order ID (`order_id`) | yes (after placement) | N/A (new order) | YES | YES (print) | YES (for redemption commit) | Already wired |

---

## 13. Existing Contract / Missing Contract

**Existing CRM coupon API contract delivered for POS Frontend: NONE.**

Evidence:
- `CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` explicitly classifies CR-001C-C (Coupon) as deferred:
  - "CR-001C-C Coupon — next"
  - "Deferred — opens after Loyalty closes"
  - "§3.1 `GET /pos/coupons/available` — Deferred"
  - "§3.2 `POST /pos/coupons/validate` (BUG-108 body contract + `error.code`) — Deferred"
  - "§3.x customer-coupon entitlement model — Deferred"
- `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md` §6 lists these endpoints as **proposals**, explicitly stating "None of these are assumed to exist."
- No coupon endpoint constant in `api/constants.js`.
- No coupon service function in `api/services/customerService.js`.

**Missing — required from CRM before implementation can begin:**

1. **Endpoint** for catalog / discovery (e.g., `GET /pos/coupons/available?customer_id=…&order_total=…`) — Method, request fields, response fields, error codes.
2. **Endpoint** for apply-time validation (e.g., `POST /pos/coupons/validate`) — Request must include at minimum `coupon_code`, `customer_id` (or `cust_mobile`), `restaurant_id`, `bill_amount`. Response must include `coupon_discount` (or `discount_value`), `coupon_type`, `coupon_id`, expected `error.code` taxonomy (`INVALID_CODE`, `EXPIRED`, `MIN_ORDER_NOT_MET`, `NOT_ENTITLED`, `ALREADY_USED`, `INACTIVE`, `CUSTOMER_NOT_FOUND`, etc.).
3. **Redemption / usage marking** — Whether POS Frontend emits a redeem call, or POS Backend extracts coupon info from `/api/pos/orders` payload and forwards to CRM (mirroring the Loyalty Phase C frozen architecture).
4. **Idempotency** — Whether POS or POS Backend generates an idempotency key, and what field name it lives in (`usage_id`? `idempotency_key`? `coupon_redemption_id`?).
5. **Reversal endpoint** for cancelled/unpaid/changed-payment orders (mirrors loyalty reversal question — currently no CRM rollback hook exists in POS).
6. **Customer requirement** — Does the contract require customer_id, allow open codes, or both?
7. **Backend mapper requirement** — Whether `coupon_discount`, `coupon_title`, `coupon_type` already pass through the `POS Backend → /api/pos/orders → CRM` bridge unstripped, or whether a mapper change is needed (same pattern as the loyalty `used_loyalty_point` / `loyalty_points_used` pass-through that BUG-108 Phase C just verified).

Verdict: `CRM coupon API contract not found in POS docs/code. Needs CRM contract (CR-001C-C) before implementation.`

---

## 14. Risks and Gaps

| # | Risk / Gap | Severity | Notes |
|---|------------|----------|-------|
| 1 | **No CRM coupon contract delivered** | **HIGH** | CR-001C-C deferred. Implementation is blocked. |
| 2 | **Flow 3 (prepaid) key mismatch latent bug** | MEDIUM | `orderTransform.js` L1148 reads `discounts.coupon` while `CollectPaymentPanel.jsx` L782 emits `discounts.couponDiscount`. Currently masked because everything is 0. When `couponLive` is flipped, Flow 3 will STILL send `coupon_discount: 0` because the wrong key is read. Must be fixed alongside the `couponLive` gate addition to Flow 3. |
| 3 | **Flow 3 not gated by `couponLive`** | MEDIUM | Today the gate is absent from L1148–L1150. If any code path ever managed to populate `discounts.coupon` while the flag is false, payload would leak the value. Currently safe only because of the key mismatch in risk 2. |
| 4 | **Field-name lock-in (`coupon_title`)** | MEDIUM | POS uses `coupon_title` — backend may need this exact name. Renaming to `coupon_code` or `discount_value` requires coordinated backend release. |
| 5 | **QSR has no coupon UI** | MEDIUM | `QsrBillingSection` has no coupon input. Even if `couponLive=true`, QSR customers cannot apply a coupon. Hardcoded zeros in CartPanel L391–L393. Needs owner decision (see Q5 in §18). |
| 6 | **`customer.coupons` schema slot orphan** | LOW | The schema slot was referenced historically (BUG-108 discovery 2026-05-22) but `customerTransform.js` never populates it. Either remove the slot or populate it from CR-001C-C catalog. |
| 7 | **No double-discount guard between coupon + loyalty + wallet** | LOW | Today everything sums into `totalDiscount`. There is no rule preventing a coupon AND loyalty AND wallet from stacking. Owner has only specified the **manual-vs-coupon** mutual exclusion (BUG-108 P1 Q10). |
| 8 | **No multi-terminal locking** | MEDIUM | Same as loyalty/wallet — two cashiers can simultaneously apply the same coupon to two bills with no server-side reservation. |
| 9 | **Reversal hook absence** | MEDIUM | No `POST /pos/coupons/reverse` (or equivalent) is wired. Cancel-item / cancel-order / make-unpaid / change-payment paths will not roll back a redeemed coupon. Same blind spot as loyalty/wallet. |
| 10 | **Print parity gap** | LOW | Print payload emits `coupon_code` but no `coupon_discount` value. Bill-print summary may not show "Coupon -₹X" line unless added. |
| 11 | **transferToRoom carries no coupon audit fields** | LOW | If a discounted bill is transferred to a room folio, the room checkout will not know coupon was used. Could affect room-bundle reporting. Needs owner confirmation. |
| 12 | **Reports display reads historical field** | LOW (info) | `reportTransform.js` L442 reads `order.coupon_discount` for display. Backward-compatible for old orders that used the prior local coupon catalog. No action. |

---

## 15. Backend Mapper Impact

Pattern observed during BUG-108 Loyalty Phase C: payload fields emitted by POS Frontend must survive the **POS Backend → `/api/pos/orders` → CRM** bridge unstripped. The loyalty fix required:
- POS Frontend emits `used_loyalty_point` AND `loyalty_points_used` for backward + CRM compatibility.
- POS Backend mapper audited to ensure the fields are forwarded.

The same audit is expected for coupon:
- POS Frontend will emit `coupon_discount`, `coupon_title`, `coupon_type` (Flow 4) and `coupon_code` (print). Whether the POS Backend mapper currently forwards these to CRM `/api/pos/orders` is **unverified**.
- If CRM expects a different field name (e.g., `discount_value` instead of `coupon_discount`), POS Frontend will likely need to emit BOTH names (mirror the loyalty pattern), or POS Backend mapper will need to do the rename. **Owner + Backend mapper team must confirm.**
- New fields the CRM may require (`usage_id`, `coupon_redemption_id`, `idempotency_key`) will need explicit mapper additions.

**Verdict:** Yes, POS Backend mapper work is expected — same magnitude as Loyalty Phase C mapper audit. Cannot be scoped without the CR-001C-C contract.

---

## 16. QSR Impact

QSR billing path (`CartPanel.QsrBillingSection.handleCollectBill` → `OrderEntry.handleQsrCollectBill`):
- **Fresh QSR order (no placed items):** calls `placeOrderWithPayment` (Flow 3). Coupon hardcoded `0/''` at CartPanel L391–L393. Even with `couponLive=true` and Flow 3 key-mismatch fixed, QSR would not pass any coupon data because the caller does not populate it.
- **QSR Collect Bill on placed order:** routes through Full View → `CollectPaymentPanel` → `collectBillExisting` (Flow 4) → inherits the same coupon UI/gating as the regular collect bill. This path will be coupon-capable once `couponLive=true`.
- **QSR has no inline coupon UI**: `QsrBillingSection` is intentionally compact (manual discount + preset discount only).

Owner decision needed (see Q5):
- Option A — QSR remains coupon-free (fresh place+pay).
- Option B — Add coupon UI to `QsrBillingSection` (~80–120 lines of new code mirroring CollectPaymentPanel's coupon section).
- Option C — Force QSR fresh place+pay to go through Full View when a customer applies a coupon (UX nudge).

---

## 17. Recommended Implementation Approach

Pending CR-001C-C and owner answers, the recommended phasing mirrors the proven Loyalty Phase C frozen architecture:

| Phase | Scope | Pre-req |
|---|---|---|
| **108-C-P0** | Owner decisions on Q1–Q5 below; CRM team delivers CR-001C-C contract (endpoints + request/response shapes + error.code taxonomy) | This doc + owner |
| **108-C-P1 (Read parity)** | Populate `customer.coupons` (or call `GET /pos/coupons/available`) from CRM. Wire `getAvailableCoupons` service + transform. No redemption changes — payload still force-zero. | P0 + CR-001C-C |
| **108-C-P2 (Validate at apply time)** | Implement `handleApplyCoupon` calling `POST /pos/coupons/validate`. Display CRM error codes in `couponError` slot. Set `selectedCoupon` from response. Still no payload emit — keep `couponLive=false` so totals stay 0. | P1 |
| **108-C-P3 (Payload emit)** | Flip `couponLive=true`. Fix Flow 3 key mismatch (`discounts.coupon` → `discounts.couponDiscount`) and add `couponLive` gate to Flow 3. Add `loyalty_points_used`-style additional field names if CRM requires (e.g., `discount_value`, `usage_id`). | P2 + Backend mapper audit |
| **108-C-P4 (Commit + Reverse)** | If CRM contract mandates a redeem call from POS Frontend, wire it. If CRM derives redemption from `/api/pos/orders` payload (loyalty pattern), no frontend call. Wire reversal hooks for cancel-item/cancel-order/make-unpaid/change-payment paths if CRM provides them. | P3 |
| **108-C-P5 (Polish)** | Suggested-coupons chips (if `GET /pos/coupons/available` returns customer-targeted list). Print payload `coupon_discount` value (not just code). QSR coupon UI (if owner picks Option B in Q5). transferToRoom coupon audit field (if owner picks "yes" in Q4 below). | P4 |

Each phase is independently reversible by flipping `couponLive=false`.

---

## 18. Owner Questions

### Q1. Who owns the coupon master and entitlement?

- **A.** POS backend owns catalog; CRM stores only per-customer entitlement.
- **B.** CRM owns both catalog and entitlement; POS purely queries.
- **C.** Hybrid — public/global codes in POS backend, customer-targeted codes in CRM.
- **D.** Follow existing CRM contract once CR-001C-C delivers (defer this decision to CRM team).

**Recommended default:** **D**. Loyalty Phase C established the pattern of CRM-owned business rules with POS as a thin caller. Coupon should follow the same pattern.

### Q2. Coupon application order relative to loyalty / manual discount / wallet?

- **A.** Coupon first, then loyalty on the net amount.
- **B.** Loyalty first, then coupon.
- **C.** CRM `/pos/coupons/validate` accepts `bill_amount` and decides — POS just sends pre-coupon subtotal.
- **D.** Keep current POS order (manual + preset + loyalty + coupon + wallet all stack into `totalDiscount`) unless the CRM contract dictates otherwise.

**Current code behavior (effectively):** Coupon stacks with everything else. Manual + coupon are mutually exclusive (BUG-108 P1 Q10). No other guards.

**Recommended default:** **D** for safety; revisit when CR-001C-C delivers and clarifies tax/GST/VAT proration intent.

### Q3. Should coupon usage be marked by POS Frontend, POS Backend, or CRM?

- **A.** POS Backend marks usage after final order payload (mirrors Loyalty Phase C — no direct POS→CRM mutating call).
- **B.** POS Frontend calls `POST /pos/coupons/redeem` or `POST /pos/coupons/apply` directly.
- **C.** CRM auto-derives usage from `/api/pos/orders` payload (no explicit redeem call; same as loyalty).
- **D.** Needs CRM answer.

**Recommended default:** **C**. This is the frozen loyalty pattern and removes the orphan-debit risk class. Frontend stays read-only.

### Q4. Should coupon usage be enabled for which flows initially?

- **A.** Both Flow 3 (prepaid place+pay) AND Flow 4 (postpaid collect bill).
- **B.** Flow 4 only first (lowest risk; matches Loyalty Phase C rollout order).
- **C.** Flow 3 only first.
- **D.** Decide after CR-001C-C contract delivers.

**Recommended default:** **B** (Flow 4 only first), then add Flow 3 after Flow 4 stabilises. Flow 3 also needs the latent key-mismatch fix and `couponLive` gate addition (see §14 Risk #2).

### Q5. Should QSR Fresh Place+Pay support coupons?

- **A.** Yes — add coupon UI to `QsrBillingSection` (mirrors CollectPaymentPanel's coupon section).
- **B.** No — QSR remains coupon-free; cashier must switch to Full View / Collect Bill to apply a coupon.
- **C.** Later CR (defer until QSR usage volume justifies the UI work).
- **D.** Follow the same path as Flow 3 once Flow 3's coupon payload gating is fixed — if shared transform supports it, QSR's caller would still need to populate `discounts.couponDiscount` from somewhere.

**Recommended default:** **B** for scope discipline. QSR is counter-service; coupon redemption volume is likely low. Cashiers who need to apply a coupon can use Full View.

---

## 19. Implementation Readiness Verdict

```
waiting_crm_contract
```

Coupon CRM integration is **not implementable today**. Blockers:
1. CR-001C-C (Coupon CRM CR) has not been delivered — endpoints, request/response shapes, and error.code taxonomy are unknown.
2. Owner answers Q1–Q5 are pending.
3. POS Backend mapper audit for coupon fields has not been performed (depends on field names in the CR-001C-C contract).
4. Latent Flow 3 key-mismatch bug must be co-fixed when `couponLive` is flipped.

Frontend shell, feature flag, settings UI, payload force-zero gates, and POS Backend transport plumbing are all in place. The work that remains is purely CRM-contract dependent.

---

## 20. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No code changed | **Confirmed** |
| 2 | No frontend changed | **Confirmed** |
| 3 | No backend changed | **Confirmed** |
| 4 | No CRM changed | **Confirmed** |
| 5 | No data mutated | **Confirmed** |
| 6 | No mutating API called | **Confirmed** (only read-only file inspection) |
| 7 | `/app/memory/final/` untouched | **Confirmed** |
| 8 | Baseline docs untouched | **Confirmed** |

---

**End of BUG-108 Coupon CRM Integration Discovery Report.**
