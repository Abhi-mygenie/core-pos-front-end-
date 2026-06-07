# POS 3.0 BUG-108 — Coupon + Loyalty Final Reconciliation

**Date:** 2026-05-26
**Persona:** Senior POS3.0 BUG-108 Coupon + Loyalty Final Reconciliation Agent
**Mode:** Read-only. No code, frontend, backend, or CRM changes. No data mutation. No mutating API calls.
**Rule applied:** Code is the final implementation truth. Docs define contract/history/scope; current code wins for actual implementation status.

---

## 1. Final Sprint Status

```
bug_108_coupon_loyalty_sprint_implementation_complete_in_code
v1_v2_v3a_v3b_v3c_live_pending_e2e_owner_smoke_for_v2_v3
loyalty_phase_b_qa_passed_owner_smoke_passed
loyalty_phase_c_joint_qa_passed_owner_payload_verified_flow_3_and_flow_4
wallet_deferred_separate_cr
qsr_coupon_intentionally_deferred_owner_q4_a
room_hotel_coupon_supported_via_collectpaymentpanel_inline_mirror
```

The full Coupon engine (V1 + V2 + V3-A + V3-B + V3-C) and Loyalty Phase B + Phase C are implemented in code on the current build (`/app/frontend` working tree, `27-may` branch). Loyalty has owner-verified payloads on both prepaid (Flow 3 = 1052 pts) and postpaid (Flow 4 = 663 pts/1127 pts). Coupon V1B Step 1 passed code-level checks and QA handoff was issued; V1B Step 2 (3 UX fixes + V1 closure) landed same day. V2/V3 transforms, error codes, and UI (cart filter, benefit_items display) are present in code but **no QA pass document exists for V2/V3-B/V3-C**. `couponLive` flag has been removed (V1 closure done). Coupon module is gated only by `restaurantSettings.isCoupon`.

---

## 2. Docs Read

### Tier 1 — CRM Contract Source of Truth
1. `/app/memory/crm/crm_1_0/handoff/CR_001C_C_COUPON_POS_API_HANDOFF_SUMMARY.md` — 211/211 CRM QA pass (V1 45 + V2 45 + V3-A 31 + V3-B 49 + V3-C 41)

### Tier 2 — Coupon docs (chronological, 2026-05-25)
2. `POS3_0_BUG_108_COUPON_CRM_INTEGRATION_DISCOVERY_REPORT_2026_05_25.md`
3. `POS3_0_BUG_108_COUPON_CRM_CONTRACT_GAP_AND_QUESTIONS_2026_05_25.md`
4. `POS3_0_BUG_108_COUPON_CRM_CONTRACT_FREEZE_V1_2026_05_25.md`
5. `POS3_0_BUG_108_COUPON_FRONTEND_PAYLOAD_MAPPING_DISCOVERY_2026_05_25.md`
6. `POS3_0_BUG_108_COUPON_PHASE_V1_IMPLEMENTATION_PLAN_2026_05_25.md`
7. `POS3_0_BUG_108_COUPON_V1B_UI_MAPPING_PLAN_2026_05_25.md`
8. `POS3_0_BUG_108_COUPON_V1A_FOUNDATION_IMPLEMENTATION_REPORT_2026_05_25.md`
9. `POS3_0_BUG_108_COUPON_V1A_FOUNDATION_QA_HANDOFF_2026_05_25.md`
10. `POS3_0_BUG_108_COUPON_V1B_STEP1_IMPLEMENTATION_REPORT_2026_05_25.md`
11. `POS3_0_BUG_108_COUPON_V1B_STEP1_QA_HANDOFF_2026_05_25.md`
12. `POS3_0_BUG_108_COUPON_V1B_STEP1_SESSION_CLOSE_OUT_2026_05_25.md`
13. `POS3_0_BUG_108_COUPON_V1B_IMPLEMENTATION_STATUS_VERIFICATION_2026_05_25.md`
14. `POS3_0_BUG_108_COUPON_V1B_STEP2_DROPDOWN_AND_STALE_CACHE_FIX_REPORT_2026_05_25.md`
15. `POS3_0_BUG_108_COUPON_V2_ITEM_CATEGORY_API_CAPABILITY_DISCOVERY_2026_05_25.md`
16. `POS3_0_BUG_108_COUPON_V3BC_DISCOVERY_AND_API_MAPPING_2026_05_25.md`

### Tier 3 — Parent BUG-108 docs (2026-05-22)
17. `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md`
18. `POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md`
19. `POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md`
20. `POS3_0_BUG_108_OWNER_DECISION_MATRIX_2026_05_22.md`
21. `POS3_0_BUG_108_P1_BUG_099_HOTSPOT_CHECK_AND_CR_PLAYBOOK_HANDOFF_2026_05_22.md`
22. `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md`

### Tier 4 — Frozen baseline (read-only; not modified)
23-29. `/app/memory/final/{ARCHITECTURE_DECISIONS_FINAL,MODULE_DECISIONS_FINAL,CHANGE_REQUEST_PLAYBOOK,IMPLEMENTATION_AGENT_RULES,FINAL_DOCS_APPROVAL_STATUS,FINAL_DOCS_SUMMARY,OPEN_QUESTIONS_FINAL_RESOLUTION}.md`

### Tier 5 — Loyalty Phase B/C docs (additional)
- `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_PASS_REPORT_2026_05_23.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_IMPLEMENTATION_REPORT_2026_05_24.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_POS_MAX_REDEEMABLE_QA_HANDOFF_2026_05_24.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_COLLECT_BILL_PAYLOAD_VERIFICATION_2026_05_24.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_FLOW_DECISION_RECONCILIATION_2026_05_24.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_ALL_PATHS_PAYLOAD_FIX_IMPLEMENTATION_REPORT_2026_05_24.md`
- `POS3_0_BUG_108_LOYALTY_PHASE_C_JOINT_QA_REPORT_2026_05_24.md`
- `POS3_0_BUG_108_BILL_PAYLOAD_GAP_FIX_PLAN_2026_05_25.md`
- `POS3_0_BUG_108_PRINT_PAYLOAD_GAP_FIX_PLAN_2026_05_25.md`

### Tier 5 — Product state
- `/app/memory/PRD.md`

---

## 3. Current Code Inspected

| # | File | Mode |
|---|------|------|
| 1 | `frontend/src/utils/BUG108_FLAGS.js` | Full file read |
| 2 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | grep + range reads (700-1100, 1280-1420) |
| 3 | `frontend/src/api/services/couponService.js` | Full file read |
| 4 | `frontend/src/api/transforms/couponTransform.js` | Full file read |
| 5 | `frontend/src/api/transforms/orderTransform.js` | grep + range reads (100-125, 1140-1210, 1360-1420) |
| 6 | `frontend/src/api/constants.js` | grep |
| 7 | `frontend/src/components/order-entry/CartPanel.jsx` | grep (coupon refs) + range (370-410) |
| 8 | `frontend/src/api/services/loyaltyService.js` | Full file read |
| 9 | `frontend/src/components/order-entry/OrderEntry.jsx` | grep (couponCode/couponDiscount) |
| 10 | Build | `cd /app/frontend && CI=false yarn build` → Exit 0, 1 pre-existing warning, 19.22s, 483.61 kB gzipped |

---

## 4. Current Code Truth Summary

### 4.1 Feature flags (`BUG108_FLAGS.js`)
```js
// L34-40
{
  // couponLive: REMOVED at V1 closure (2026-05-25). Gated only by restaurantSettings.isCoupon.
  loyaltyRatioLive: true,
  loyaltyPreviewLive: true,
  loyaltyRedeemLive: false,   // dead code; no direct frontend redeem
  walletDebitLive: false,
}
```

### 4.2 Coupon coverage in code

| Capability | Status | Code Evidence |
|---|---|---|
| `GET /pos/coupons/available` | LIVE | `couponService.getAvailableCoupons` (L36), `COUPONS_AVAILABLE = '/pos/coupons/available'` |
| `POST /pos/coupons/validate` | LIVE | `couponService.validateCoupon` (L66), accepts `items[]` parameter |
| V1 order scope (simple/order) | IMPLEMENTED | `couponTransform.fromAPI.availableCoupons/validateCoupon`, full /validate flow |
| V2 item/category scope | IMPLEMENTED | `posCartItem` mapper (couponTransform.js L173-181), `categoryId` in `fromAPI.orderItem` (orderTransform.js L116), `items[]` built when `requiresCartValidation === true` (CollectPaymentPanel L846-848), 5 V2 error codes wired |
| V3-A time-window | IMPLEMENTED | `withinWindowNow`/`nextWindowStart`/`timeWindowConfigured` mapped, outside-window dropdown UI (CollectPaymentPanel L1363), `OUTSIDE_TIME_WINDOW` in `errorCodeToCopy` (L815) |
| V3-B BOGO/BXG | IMPLEMENTED | `buyQuantity/getQuantity/getDiscountType/getDiscountValue/maxApplications/allowRepeat/sameItemRequired` in `fromAPI.availableCoupons` (L59-65), cart filter for `hint.kind === 'bogo'/'bxg'` (L751-756), 7 V3-B error codes wired (L822-828) |
| V3-C Every-Nth | IMPLEMENTED | `nthItemNumber/nthDiscountType/nthDiscountValue` mapped (L66-68/L109-111), cart filter for `hint.kind === 'nth_item'` (L757-762), 5 V3-C error codes wired (L829-833) |
| `benefit_items` UI | IMPLEMENTED | `data-testid="coupon-benefit-items"` block (CollectPaymentPanel L1390-1398) — shows "qty× name FREE" or "qty× name −₹X" per benefit_items entry |
| `applied_applications` mapping | IMPLEMENTED | couponTransform L105 |
| `buy_match_summary`/`get_match_summary` | IMPLEMENTED | couponTransform L106-107 |
| `nth_item_number` mapping | IMPLEMENTED | couponTransform L66 + L109 |
| Channel map (`pos`→never sent) | IMPLEMENTED | `couponTransform.toAPI.channel` (L132): `dineIn/walkIn/roomService → dine_in`, `takeAway → takeaway`, `delivery → delivery`, fallback `dine_in` (Owner B-6) |
| Type-ahead dropdown (max 5, sorted) | IMPLEMENTED | CollectPaymentPanel L1341-1371 |
| Auto-apply (500ms debounce + on-fetch) | IMPLEMENTED | L872-890 (debounced typed prefix) + L779-784 (best in-window order-scope on `displayedCoupons` change) |
| Reactive loyalty/cart filter | IMPLEMENTED | `displayedCoupons` useMemo (L734-765) |
| Auto-remove non-stackable coupon on loyalty toggle | IMPLEMENTED | L788-802 + sonner toast |
| `pos_instruction` display | IMPLEMENTED | L1383 `data-testid="coupon-pos-instruction-text"` |
| `error.code` handling | IMPLEMENTED | `errorCodeToCopy` (L805-834) covers 27 codes: 9 V1 + 5 V2 + 1 V3-A + 7 V3-B + 5 V3-C + NETWORK |
| Manual discount ↔ coupon mutex | IMPLEMENTED | L1289-1294 (helperText shown, input disabled when manual active) |
| Flow 1 (placeOrder unpaid) coupon fields | IMPLEMENTED (parity zeros) | orderTransform.js L907-910 |
| Flow 2 (updateOrder) coupon fields | IMPLEMENTED (parity zeros) | orderTransform.js L1028-1031 |
| Flow 3 (placeOrderWithPayment prepaid) | IMPLEMENTED | orderTransform.js L1168-1171: `coupon_code/coupon_discount/coupon_title/coupon_type` (V1 closure: ternaries removed; fields unconditional) |
| Flow 4 (collectBillExisting postpaid) | IMPLEMENTED | orderTransform.js L1381-1384 |
| Flow 5 (print payload) | IMPLEMENTED | orderTransform.js L1819-1822: `coupon_code`/`coupon_discount` |
| Auto-print override (4 sites in OrderEntry.jsx) | IMPLEMENTED | L1208/1209, L1271/1272, L1659/1660, L1883/1884 — all read `paymentData.discounts.couponCode` + `couponDiscount` (P-1/P-3 print payload gap fix applied) |
| QSR (CartPanel) coupon UI | INTENTIONALLY ABSENT | L391-393 emit zeros only; no UI per Owner Q4=A |
| Room-service inline mirror coupon UI | IMPLEMENTED | Mirror in CollectPaymentPanel includes dropdown + applied chip + error + instruction |

### 4.3 Loyalty coverage in code

| Capability | Status | Code Evidence |
|---|---|---|
| `POST /pos/max-redeemable` integration | LIVE | `loyaltyService.getMaxRedeemable` (L117), `MAX_REDEEMABLE = '/pos/max-redeemable'`, debounced caller in CollectPaymentPanel (L906-952), `loyaltyRatioLive` gated |
| Phase B preview (read-only points/tier) | LIVE | `loyaltyPreviewLive: true` |
| Phase C max-redeemable display | LIVE | `loyaltyRatioLive: true` |
| Customer gate (no UI without customer) | IMPLEMENTED | CollectPaymentPanel L1405 |
| Ratio source = CRM `/pos/max-redeemable` | CONFIRMED | `maxRedeemable?.ratioPerPoint` from CRM, no hardcoding |
| No direct frontend `/pos/loyalty/redeem` call | CONFIRMED | `loyaltyService.redeemLoyalty` kill-switched on `loyaltyRedeemLive=false`; 0 grep hits in CollectPaymentPanel |
| Flow 3 prepaid loyalty payload | IMPLEMENTED | orderTransform L1178-1187: `used_loyalty_point`, `loyalty_points_used`, `loyalty_discount`, `loyalty_redemption_id: null` (all gated on `loyaltyRatioLive`) |
| Flow 4 postpaid loyalty payload | IMPLEMENTED | orderTransform L1395-1405: same field set |
| `loyalty_discount` ₹ field (G-1) | IMPLEMENTED | All 4 flows (L915, L1039, L1184, L1401) |
| `loyalty_idempotency_key` (G-2) | NOT IN FE (by design) | Owner decision 2026-05-25: POS BE owns generation; POS FE sends zero lines |
| `loyalty_redemption_id` | IMPLEMENTED | always `null` from FE; POS BE fills |
| Phase B owner smoke | PASSED | Doc 2026-05-23 |
| Phase C joint QA | PASSED with 12 DEFERRED (live UI/payload capture) | Doc 2026-05-24 |
| Phase C owner payload verification (prepaid + postpaid) | PASSED | Implementation report §4: order 868926 (663 pts) + restaurant 689 prepaid (1052 pts) both owner-confirmed |

### 4.4 Wallet coverage in code

| Capability | Status | Code Evidence |
|---|---|---|
| `walletDebitLive` | `false` | BUG108_FLAGS.js L39 |
| Wallet payload fields | Force-zeroed | `use_wallet_balance: walletDebitLive ? value : 0` at all flows |
| Wallet UI | Disabled with helper | "Wallet payments will be available after the next update." |
| CRM wallet integration | NOT IMPLEMENTED | Per Owner Q11 = separate Wallet CR |

### 4.5 Build & runtime
- `yarn build` — Exit 0, 1 pre-existing eslint warning (`OrderEntry.jsx:1301 useCallback/printOrder` — unrelated to BUG-108).
- Frontend supervisor RUNNING. Live URL responds 200.

---

## 5. Docs vs Code Conflicts

| # | Doc | Doc Claim | Current Code Truth | Verdict | Resolution |
|---|-----|-----------|-------------------|---------|-----------|
| C-1 | `POS3_0_BUG_108_COUPON_V1B_IMPLEMENTATION_STATUS_VERIFICATION_2026_05_25.md` §6 | `couponLive: true` |  `couponLive` REMOVED from `BUG108_FLAGS.js` (L35 comment confirms) | **CONFLICT** | Code wins — V1 closure was executed later same day (V1B Step 2 report §7) |
| C-2 | `POS3_0_BUG_108_COUPON_V2_ITEM_CATEGORY_API_CAPABILITY_DISCOVERY_2026_05_25.md` §1 | `bug_108_coupon_v2_blocked_missing_item_data` | V2 fully implemented: `posCartItem` real impl, `categoryId` mapped, `items[]` built, 5 V2 error codes | **CONFLICT** | Code wins — V2 was implemented after this discovery doc was written |
| C-3 | `POS3_0_BUG_108_COUPON_V3BC_DISCOVERY_AND_API_MAPPING_2026_05_25.md` §1 | `bug_108_coupon_v3bc_discovery_complete_ready_for_planning` | V3-B + V3-C fully implemented: transforms, cart filter for `hint.kind`, 12 V3 error codes, benefit_items UI | **CONFLICT** | Code wins — V3-B/V3-C implementation landed after the discovery doc |
| C-4 | `POS3_0_BUG_108_LOYALTY_PHASE_C_FLOW_DECISION_RECONCILIATION_2026_05_24.md` §5 | Flow 3 BACKEND_BLOCKED — backend `place-order` does NOT process `used_loyalty_point`; recommends hiding loyalty on prepaid path | Owner subsequently confirmed BE DOES process it; implementation report §4 verified prepaid payload `used_loyalty_point: 1052` works | **CONFLICT (resolved)** | Code + later report win — backend was wired by BE team after that reconciliation doc was written |
| C-5 | `POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md` §2 | Coupon copy "Coming soon" helper | Helper removed at V1 closure (couponDisabledHelper deleted from BUG108_COPY) | **HISTORICAL** | Doc was correct at time of P1 shell; code has since progressed through V1B Step 1 + V1B Step 2 (V1 closure). No live conflict — the "Coming soon" path simply no longer exists. |
| C-6 | `PRD.md` Prioritized Backlog P1 §70 | "V1 Closure: Remove `BUG108_FLAGS.couponLive` constant + dead code cleanup" still queued | Already done in V1B Step 2 | **STALE** | PRD backlog out of date; not modified per scope rules |
| C-7 | `PRD.md` Backlog P2 §75 | "Coupon V2: blocked by categoryId gap in Flow 4 + POS BE mapper audit" | categoryId gap closed in code; POS BE audit still external | **PARTIAL STALE** | First half resolved; second half (POS BE mapper audit for `items[]` forwarding at commit) remains valid |
| C-8 | `PRD.md` Backlog P2 §76 | "Coupon V3: blocked by CRM admin UI for V3 creation" | CRM admin UI for V3-B/V3-C still missing per CRM handoff §16; V3 coupons must be seeded via API/DB | **STILL VALID** | Per CRM handoff §16: V3-B/V3-C admin UI not implemented |

---

## 6. Coupon Status by Phase

| Phase | Scope | Code Status | QA Status | Owner Smoke | Final Verdict |
|---|---|---|---|---|---|
| **V1A** | Foundation: constants, couponService, couponTransform | IMPLEMENTED | QA handoff issued (foundation-only, no UI) | N/A — superseded by V1B | **COMPLETE** |
| **V1B Step 1** | UI wiring on Collect Bill, all 4 commit flows, print payload | IMPLEMENTED | QA handoff issued + V1B Implementation Status Verification confirms all 29 planned items present | Awaiting owner smoke (handoff §5 sign-off criteria not yet ticked) | **IMPLEMENTED_WAITING_QA / OWNER_SMOKE_PENDING** |
| **V1B Step 2** | 3 UX hotfixes (dropdown close, debounce race guard, reactive loyalty filter) + V1 closure (couponLive removed, dead-code stripped) | IMPLEMENTED | Report self-asserts build clean; no separate QA doc | None | **IMPLEMENTED_WAITING_QA** |
| **V2** | item/category scope (`posCartItem`, items[] in /validate, 5 V2 error codes, categoryId in `fromAPI.orderItem`, cart filter for `food_ids`/`category_names`) | IMPLEMENTED | **NONE** — V2 Discovery doc still says "blocked" | Not started | **STATUS_CONFLICT_DOCS_VS_CODE** → code COMPLETE / QA absent |
| **V3-A** | Time-window/Happy-hour: `withinWindowNow`, `nextWindowStart`, outside-window dropdown UI, `OUTSIDE_TIME_WINDOW` error | IMPLEMENTED | Implicit via V1B QA handoff §2.1 T-9..T-11 | Pending | **IMPLEMENTED_WAITING_QA** |
| **V3-B** | BOGO/BXG: 7 metadata fields in availableCoupons + 5 in validateCoupon, `hint.kind === 'bogo'/'bxg'` cart filter, 7 V3-B error codes, benefit_items UI | IMPLEMENTED | **NONE** — V3BC Discovery doc still says "ready for planning" | Not started | **STATUS_CONFLICT_DOCS_VS_CODE** → code COMPLETE / QA absent |
| **V3-C** | Every-Nth: `nth_item_number/nth_discount_type/nth_discount_value`, `hint.kind === 'nth_item'` cart filter, 5 V3-C error codes, benefit_items UI | IMPLEMENTED | **NONE** | Not started | **STATUS_CONFLICT_DOCS_VS_CODE** → code COMPLETE / QA absent |
| **QSR coupon** | CartPanel quick-billing | INTENTIONALLY ABSENT (Owner Q4=A; QSR routes through Full Billing → CollectPaymentPanel) | N/A | N/A | **DEFERRED (by owner decision)** |
| **Room/Hotel coupon** | room-service inline mirror in CollectPaymentPanel | IMPLEMENTED | Implicit via V1B QA handoff §2.1 T-17 + regression matrix | Pending | **IMPLEMENTED_WAITING_QA** |
| **Coupon reversal / refund** | Post-commit cancel reversal | NOT IMPLEMENTED | N/A — Phase 2 deliverable, CRM has no reversal endpoint yet | N/A | **DEFERRED (Phase 2; CRM_BLOCKED)** |
| **Cashier-cancel warning toast (B-1)** | OrderEntry.jsx toast on post-commit cancel with applied coupon | NOT IMPLEMENTED — closed as "not applicable" in V1B Step 2 §7 (no UI path exists for post-commit cancel) | N/A | N/A | **DEFERRED (spec-only; re-evaluate after CRM reversal API)** |

---

## 7. Loyalty Status by Phase

| Phase | Scope | Code Status | QA Status | Owner Smoke / Verification | Final Verdict |
|---|---|---|---|---|---|
| **Phase A** | UI shell disabled with helper text | Superseded by Phase B | N/A | N/A | **COMPLETE** |
| **Phase B** | `loyaltyPreviewLive=true`, read-only points/tier display | IMPLEMENTED | QA handoff + agent smoke report | Owner smoke PASS (2026-05-23) | **COMPLETE / QA_PASSED** |
| **Phase C (max-redeemable)** | `loyaltyRatioLive=true`, `/pos/max-redeemable` integration, CRM-driven discount, customer gate, no direct frontend redeem | IMPLEMENTED | Joint QA PASS (40 PASS / 0 FAIL / 12 DEFERRED live-UI) | Owner payload verified Flow 3 (prepaid, 1052 pts) + Flow 4 (postpaid, 663 pts / 1127 pts) | **COMPLETE / QA_PASSED** |
| **Phase C — Bill Payload Gap (G-1, `loyalty_discount` ₹ field)** | Add `loyalty_discount` to all 4 flows | IMPLEMENTED (orderTransform L915, L1039, L1184, L1401) | Plan executed; no separate QA doc | Live in build | **COMPLETE** |
| **Phase C — `loyalty_idempotency_key` (G-2)** | POS BE owns generation (Option B, owner 2026-05-25) | N/A on POS FE (zero lines per decision) | N/A | Pending POS BE wiring | **OWNED_BY_POS_BACKEND** |
| **Phase C — Direct frontend `/pos/loyalty/redeem`** | Kill-switched (`loyaltyRedeemLive: false`) | INTENTIONALLY DEAD | 0 grep hits | N/A | **REMOVED (by design)** |
| **Loyalty cashier-orphan recovery** | Persistent manual-recovery warning with `transaction_id` (Phase C Owner Q4=A) | NOT NEEDED (frontend doesn't redeem directly; POS BE handles redemption + orphans) | N/A | N/A | **N/A (architecture changed)** |
| **QSR loyalty** | Available via Full Billing → CollectPaymentPanel → Flow 4 (placed order) | IMPLEMENTED via existing two-step | Owner clarified (FLOW_DECISION_RECONCILIATION) | Pending | **IMPLEMENTED_WAITING_QA** |

---

## 8. Wallet Status

| Capability | Status |
|---|---|
| `walletDebitLive` flag | `false` (force-zero everywhere) |
| UI | Visible-but-disabled with helper text "Wallet payments will be available after the next update." |
| Payload fields | All wallet fields zeroed in all flows |
| CRM wallet integration | NOT IMPLEMENTED — separate Wallet CR (Owner Q11) |
| **Verdict** | **DEFERRED (separate Wallet CR; out of BUG-108 scope)** |

---

## 9. CRM Contract Status

| Item | CRM Status | POS FE Code Status |
|---|---|---|
| `GET /pos/coupons/available` (V1+V2+V3-A+V3-B+V3-C metadata) | LIVE — 211/211 backend QA pass | Fully consumed |
| `POST /pos/coupons/validate` (V1+V2+V3-A+V3-B+V3-C with items[]) | LIVE | Fully consumed |
| `POST /pos/orders` coupon commit fields (`coupon_code`, `coupon_discount`, `coupon_title`, `coupon_type`, `items[]`) | LIVE per CRM handoff §7 | All 4 coupon fields emitted by all 4 commit flows; `items[]` forwarded via POS BE mapper (not directly by FE on commit) |
| `POST /pos/max-redeemable` (loyalty) | LIVE | Fully consumed |
| `POST /pos/loyalty/redeem` | LIVE | NOT called from FE (POS BE handles redemption); kill switch enforces |
| `POST /api/pos/coupons/apply` (legacy) | DEPRECATED per CRM handoff §13 | NOT used by FE |
| CRM coupon reversal endpoint | NOT IMPLEMENTED (Phase 2 deliverable per CRM handoff §16) | N/A — blocked |
| CRM admin UI for V3-B/V3-C coupon creation | NOT IMPLEMENTED — coupons must be created via direct DB/API (CRM handoff §16) | Out of POS scope |
| CRM `excluded_item_ids` / `excluded_category_ids` admin UI | NOT IMPLEMENTED (CRM handoff §16) | Out of POS scope |
| Variant/add-on coupon matching | NOT SUPPORTED (CRM handoff §16) | Out of POS scope |
| Multi-coupon per order | NOT SUPPORTED — locked at 1 (CRM handoff §16) | Out of POS scope |
| CRM wallet endpoints | NOT IN BUG-108 | Out of scope |
| CRM `/pos/max-redeemable` slowness on staging-15 (~17s) | Known — N+1 fix planned | POS has 30s timeout workaround |

---

## 10. POS Backend Mapper Status

| Item | Status | Notes |
|---|---|---|
| POS BE forwards `coupon_code`/`coupon_discount`/`coupon_title`/`coupon_type` to CRM `/api/pos/orders` | **UNVERIFIED** — V1B QA-handoff item I-1, marked **PENDING smoke**. POS BE team to verify with `coupon_code='TEST_DRY'`, `coupon_discount=0.01` against CRM logs | Audit external to POS FE |
| POS BE forwards `items[]` (OrderItem schema) to CRM `/api/pos/orders` for V2/V3 revalidation at commit | **UNVERIFIED** — V2 Discovery B-3, V3BC Discovery B-1 | **HARD BLOCKER for full V2/V3 commit-time revalidation**; does NOT block POS FE implementation/QA |
| POS BE supports `coupon_type` field omission for V3 BOGO/BXG/Nth | UNVERIFIED — V1B QA-handoff item I-2 (V3 prereq) | V3 prereq, not blocking V1 |
| POS BE generates `loyalty_idempotency_key` (`"order_{id}_loyalty"`) for all flows | UNVERIFIED — G-2 owner decision 2026-05-25 (Option B: POS BE sole owner) | Joint QA item; CRM may log warning but order still persists |
| POS BE template renders `coupon_discount` line on bill print | **PENDING** — V1B QA-handoff item I-3 | T-19 fails until BE template ships; FE payload is correct |
| POS BE `place-order` processes `used_loyalty_point` (prepaid Flow 3) | **CONFIRMED WIRED** by owner (Phase C reconciliation) — prepaid loyalty payload owner-verified with 1052 pts deducted | Backend wired between 2026-05-24 (block flag) and the implementation report (verified) |

---

## 11. QA and Owner-Smoke Status

| Module | Code Built | Static / API QA | Owner-Smoke / Live Capture |
|---|---|---|---|
| Loyalty Phase B | YES | PASS | PASS (2026-05-23) |
| Loyalty Phase C | YES | PASS (40/40 verifiable; 12 deferred to live capture) | PASS — owner-verified payloads on Flow 3 (1052 pts) + Flow 4 (663/1127 pts) (2026-05-24) |
| Loyalty G-1 (`loyalty_discount` ₹ field) | YES (4 flows) | Plan-level only | PENDING |
| Coupon V1A foundation | YES | PASS (transforms only) | N/A |
| Coupon V1B Step 1 | YES | PASS (V1B Implementation Status Verification — 29/29 items) | PENDING (Step 1 QA handoff §5 sign-off criteria not ticked: T-1..T-22, owner ≥10 orders) |
| Coupon V1B Step 2 (UX hotfixes + V1 closure) | YES | Self-asserted build clean | PENDING (same owner-smoke window as Step 1) |
| Coupon V2 | YES | **MISSING — no QA doc; V2 Discovery still says "blocked"** | NOT STARTED |
| Coupon V3-A | YES | Implicit via V1B QA handoff T-9..T-11 | PENDING |
| Coupon V3-B | YES | **MISSING — V3BC Discovery still says "ready for planning"** | NOT STARTED |
| Coupon V3-C | YES | **MISSING — V3BC Discovery still says "ready for planning"** | NOT STARTED |
| QSR coupon | INTENTIONALLY ABSENT | N/A | N/A |
| Room/Hotel coupon (inline mirror) | YES | Implicit via V1B regression matrix | PENDING |
| Auto-print payload fix (P-1, P-3) | YES (4 sites) | Plan-level only | PENDING |

---

## 12. Deferred Items

| # | Item | Reason | Re-evaluate When |
|---|---|---|---|
| D-1 | Coupon reversal / refund (Phase 2) | CRM has no reversal endpoint (handoff §16) | CRM ships reversal API |
| D-2 | Cashier-cancel warning toast (B-1) on post-commit cancel | Closed as "not applicable" in V1B Step 2 §7 — no UI path exists for post-commit cancel in current architecture | Re-evaluate if CRM ships reversal API |
| D-3 | Wallet CRM integration (`walletDebitLive` flip + endpoints) | Separate Wallet CR per Owner Q11 | Wallet CR ticket opened |
| D-4 | Multi-coupon per order | Hard-locked by CRM (handoff §16) | Future product decision |
| D-5 | QSR-native coupon UI (in CartPanel quick-billing) | Owner Q4 = A: route through Full Billing → CollectPaymentPanel instead | Future owner request |
| D-6 | CRM admin UI for V3-B/V3-C coupon creation | CRM-side gap (handoff §16) | CRM admin sprint |
| D-7 | CRM `excluded_item_ids`/`excluded_category_ids` admin UI | CRM-side gap | CRM admin sprint |
| D-8 | Variant/add-on matching in coupon engine | Not supported by CRM coupon engine | CRM engine extension |
| D-9 | POS-side per-line discount allocation display | CRM returns total only (handoff §16) | Future POS UI improvement |
| D-10 | Manual `loyalty_idempotency_key` from POS FE | Owner 2026-05-25 Option B: POS BE owns | Not re-opened |

---

## 13. Superseded / Stale Docs

| # | Doc | Reason superseded |
|---|---|---|
| S-1 | `POS3_0_BUG_108_COUPON_V2_ITEM_CATEGORY_API_CAPABILITY_DISCOVERY_2026_05_25.md` (§1: "blocked_missing_item_data") | V2 is implemented in code; doc is stale |
| S-2 | `POS3_0_BUG_108_COUPON_V3BC_DISCOVERY_AND_API_MAPPING_2026_05_25.md` (§1: "discovery_complete_ready_for_planning") | V3-B + V3-C implemented in code; doc is stale |
| S-3 | `POS3_0_BUG_108_COUPON_V1B_IMPLEMENTATION_STATUS_VERIFICATION_2026_05_25.md` (§6: `couponLive: true`) | V1 closure removed the flag entirely; supersedes (V1B Step 2 report) |
| S-4 | `POS3_0_BUG_108_LOYALTY_PHASE_C_FLOW_DECISION_RECONCILIATION_2026_05_24.md` (§5 Flow 3 BACKEND_BLOCKED) | Owner subsequently confirmed BE was wired; implementation report verified prepaid payload (1052 pts) |
| S-5 | `POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md` (§2.1 "Coming soon" copy) | V1 closure removed the helper; historical only |
| S-6 | `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md` (Phase 1 disabled-shell as terminal state) | Superseded by V1A → V1B → V1 closure |
| S-7 | `PRD.md` Backlog (P1 "V1 Closure pending"; P2 "Coupon V2 blocked"; P2 "Coupon V3 blocked") | V1 Closure done; V2 + V3-A + V3-B + V3-C done in code (V3 CRM admin UI still missing) |
| S-8 | `POS3_0_BUG_108_BILL_PAYLOAD_GAP_FIX_PLAN_2026_05_25.md` (status: "ready_for_implementation") | G-1 implemented in code (all 4 flows emit `loyalty_discount`) |
| S-9 | `POS3_0_BUG_108_PRINT_PAYLOAD_GAP_FIX_PLAN_2026_05_25.md` (status: "ready_for_implementation") | P-1 + P-3 implemented at all 4 auto-print sites |

**No edits made to any of the above.** They are catalogued here as superseded for future readers.

---

## 14. Recommended Next Sprint

### Sprint A — Coupon V2 / V3 End-to-End QA (HIGH)
**Goal:** Convert the present "code complete / QA absent" state into a "QA-PASSED + Owner-Smoke-PASSED" state for V2, V3-A, V3-B, V3-C.

1. Write QA Handoff doc for V2 + V3-A + V3-B + V3-C combined (mirrors V1B QA Handoff structure).
2. Seed CRM test fixtures: ≥1 category-scope coupon (V2 gap), ≥1 outside-window V3-A coupon, plus the already-existing V3-B (BOGO/BXG) + V3-C (Every-Nth) seeds confirmed in V3BC discovery.
3. Execute T-1..T-22 from V1B QA handoff against V1 + V2 + V3-A + V3-B + V3-C using the **same coupon test customer**.
4. Verify `coupon_usage.recorded=true` in CRM dashboard for each coupon type with ≥3 orders each.
5. Owner smoke on preprod: ≥10 orders across cash/UPI/card/split, covering at least one V2 item-scope, one V2 category-scope, one V3-A outside-window (negative), one V3-B BOGO, one V3-C Every-Nth.

### Sprint B — POS Backend Mapper Audit (HIGH)
**Goal:** Close I-1 / I-2 / I-3 + V2 B-3 + V3 B-1 from prior discoveries.

1. POS BE team verifies forwarding of `coupon_code`/`coupon_discount`/`coupon_title`/`coupon_type` unstripped to CRM `/api/pos/orders`.
2. POS BE team verifies forwarding of `items[]` (OrderItem schema) to CRM `/api/pos/orders` for V2/V3 commit-time revalidation.
3. POS BE team adds bill-print template rendering of `coupon_discount` line (item I-3 from V1B QA handoff).
4. POS BE team confirms `coupon_type` field omission for V3 BOGO/BXG/Nth.
5. POS BE team confirms `loyalty_idempotency_key` generation pattern (`"order_{id}_loyalty"`).

### Sprint C — Doc Hygiene Sweep (MEDIUM)
**Goal:** Resolve stale doc status (read-only correctness, no code change).
- Add a single "SUPERSEDED — see FINAL_RECONCILIATION_2026_05_26" header line to S-1..S-9 OR retire them under a folder convention. (NOT done in this run per scope rule; recommended for next agent.)
- Update `/app/memory/PRD.md` backlog: mark "V1 Closure" P1 item as DONE; convert "Coupon V2 blocked" / "Coupon V3 blocked" to "Coupon V2/V3 QA + owner smoke pending"; flag CRM admin UI as the remaining V3 gap.

### Sprint D — Coupon Reversal / Wallet CR (LOW — out-of-sprint)
**Goal:** Track external dependencies.
- Wait for CRM Phase 2 reversal endpoint → then implement POS-side reversal on cancel/unpaid (closes D-1, D-2).
- Open Wallet CR ticket → independent of BUG-108.

### Recommended Sprint Sequencing
A (QA + owner smoke for V2/V3) → B (POS BE mapper audit) can run in parallel → C (doc hygiene) at the end → D awaits external triggers.

---

## 15. Final Verdict

```
SPRINT BUG-108 COUPON + LOYALTY = CODE COMPLETE; QA + OWNER SMOKE PARTIALLY PENDING

* Loyalty Phase B:  COMPLETE (QA + owner smoke pass)
* Loyalty Phase C:  COMPLETE (joint QA pass + owner payload verification, both flows)
* Coupon V1A:       COMPLETE
* Coupon V1B Step1: IMPLEMENTED — owner smoke pending (T-1..T-22 + ≥10 orders)
* Coupon V1B Step2: IMPLEMENTED — same owner-smoke window as Step1
* Coupon V2:        IMPLEMENTED IN CODE — STATUS_CONFLICT_DOCS_VS_CODE; QA absent
* Coupon V3-A:      IMPLEMENTED — owner smoke pending
* Coupon V3-B:      IMPLEMENTED IN CODE — STATUS_CONFLICT_DOCS_VS_CODE; QA absent
* Coupon V3-C:      IMPLEMENTED IN CODE — STATUS_CONFLICT_DOCS_VS_CODE; QA absent
* Wallet:           DEFERRED (separate Wallet CR per Owner Q11)
* QSR coupon:       DEFERRED by Owner decision Q4=A
* Room/Hotel:       IMPLEMENTED via inline mirror
* Coupon reversal:  DEFERRED (CRM_BLOCKED, Phase 2)

Next critical action: Run end-to-end QA + owner smoke for V2 + V3-A + V3-B + V3-C
to convert the present "implemented_no_qa" state into a "qa_passed" state.
Parallel: POS Backend mapper audit (items[] forwarding + coupon_type omission + bill template).
```

---

## 16. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed | ✅ |
| 2 | No frontend changed | ✅ |
| 3 | No backend changed | ✅ |
| 4 | No CRM changed | ✅ |
| 5 | No data mutated | ✅ |
| 6 | No mutating API called | ✅ — only read-only file inspection + `yarn build` |
| 7 | `/app/memory/final/` untouched | ✅ |
| 8 | Baseline docs untouched | ✅ |
| 9 | No `/app/memory/final/*` files updated | ✅ |
| 10 | No earlier BUG-108 docs modified | ✅ |
| 11 | PRD.md untouched | ✅ |
| 12 | Source-of-truth rule applied (code wins over docs) | ✅ |

---

**End of BUG-108 Coupon + Loyalty Final Reconciliation.**
