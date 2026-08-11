# POS 3.0 BUG-108 — Coupon + Loyalty Open Gaps Register

**Date:** 2026-05-26
**Persona:** Senior POS3.0 BUG-108 Coupon + Loyalty Final Reconciliation Agent
**Pairs with:** `POS3_0_BUG_108_COUPON_LOYALTY_FINAL_RECONCILIATION_2026_05_26.md`
**Scope:** Read-only — gaps register only.

---

## Register Conventions

- **Priority:** P0 = blocks production / data correctness; P1 = blocks QA pass; P2 = quality / hygiene; P3 = backlog.
- **Status uses the canonical labels:** `COMPLETE` / `IMPLEMENTED_WAITING_QA` / `QA_PASSED` / `OWNER_SMOKE_PENDING` / `DEFERRED` / `BACKEND_BLOCKED` / `CRM_BLOCKED` / `NOT_IMPLEMENTED` / `STATUS_CONFLICT_DOCS_VS_CODE`.

---

## Open Gaps Register

| Gap ID | Area | Gap | Current Status | Owner | Next Action | Priority |
|---|---|---|---|---|---|---|
| G-01 | Coupon V1B Step 1 — Owner Smoke | T-1..T-22 functional smoke matrix + ≥10 cash/UPI/card/split orders + CRM `coupon_usage.recorded=true` verification not yet executed | OWNER_SMOKE_PENDING | Owner + QA | Run V1B QA Handoff §2 + §5 sign-off; capture CRM dashboard evidence | P1 |
| G-02 | Coupon V1B Step 2 — QA | 3 UX hotfixes (dropdown close, debounce race, reactive loyalty filter) + V1 closure are self-asserted; no separate QA report | IMPLEMENTED_WAITING_QA | QA | Combine into G-01 owner smoke window | P1 |
| G-03 | Coupon V2 (item / category scope) | Code is fully implemented (posCartItem mapper, items[] in /validate, categoryId in fromAPI.orderItem, 5 V2 error codes, cart filter for `food_ids`/`category_names`) — but V2 Discovery doc still says "blocked_missing_item_data" and **no QA pass document exists** | STATUS_CONFLICT_DOCS_VS_CODE / IMPLEMENTED_WAITING_QA | QA | Write QA Handoff for V2; seed CRM category-scope test coupon (V2 Discovery B-4); execute T-matrix for item-scope + category-scope; owner smoke | P1 |
| G-04 | Coupon V3-A (time-window) | Code is implemented (`withinWindowNow`, `nextWindowStart`, outside-window UI, `OUTSIDE_TIME_WINDOW` error). QA implicitly covered by V1B handoff T-9..T-11 but **no dedicated V3-A QA pass report exists** | IMPLEMENTED_WAITING_QA | QA | Include in V2+V3 combined QA pass (Sprint A) | P1 |
| G-05 | Coupon V3-B (BOGO / BXG) | Code is fully implemented (7 metadata fields in availableCoupons + 5 in validateCoupon, `hint.kind === 'bogo'/'bxg'` cart filter, 7 V3-B error codes, benefit_items UI block). V3BC Discovery doc still says "ready for planning" — **no QA doc exists** | STATUS_CONFLICT_DOCS_VS_CODE / IMPLEMENTED_WAITING_QA | QA | Include in V2+V3 combined QA pass; verify CRM `coupon_usage.recorded=true` for BOGO + BXG orders | P1 |
| G-06 | Coupon V3-C (Every-Nth) | Code is fully implemented (`nth_item_number/nth_discount_type/nth_discount_value` mapped, `hint.kind === 'nth_item'` cart filter, 5 V3-C error codes, benefit_items UI). V3BC Discovery doc still says "ready for planning" — **no QA doc exists** | STATUS_CONFLICT_DOCS_VS_CODE / IMPLEMENTED_WAITING_QA | QA | Include in V2+V3 combined QA pass | P1 |
| G-07 | POS Backend mapper — coupon-field forwarding | POS BE forwarding of `coupon_code` / `coupon_discount` / `coupon_title` / `coupon_type` to CRM `/api/pos/orders` UNVERIFIED end-to-end (V1B QA-handoff I-1) | BACKEND_BLOCKED (audit) | POS BE team | Smoke with `coupon_code='TEST_DRY'`, `coupon_discount=0.01`; check CRM logs for unstripped forwarding | P1 |
| G-08 | POS Backend mapper — `items[]` forwarding at commit | POS BE forwarding of `items[]` (OrderItem schema) to CRM `/api/pos/orders` UNVERIFIED. **HARD BLOCKER for full V2/V3 commit-time revalidation** (V2 Discovery B-3, V3BC Discovery B-1) | BACKEND_BLOCKED | POS BE team | Audit POS BE mapper; confirm OrderItem conversion (pos_food_id→food_id, item_category→item_category, item_qty→quantity, item_price→unit_price) per CRM handoff §7.1 | P0 |
| G-09 | POS Backend mapper — `coupon_type` omission for V3 | POS BE must support omitting `coupon_type` when V3 BOGO/BXG/Nth (V1B QA-handoff I-2) | BACKEND_BLOCKED | POS BE team | Confirm BE accepts both present + omitted `coupon_type`; CRM handoff §3.3 expects omission for V3 types | P1 |
| G-10 | POS Backend — bill print template `coupon_discount` line | BE template must render "Coupon <CODE> −₹X" line; FE payload `coupon_discount` is correct (V1B QA-handoff I-3) | BACKEND_BLOCKED | POS BE template | Update bill template; T-19 from V1B QA handoff will pass when template ships | P1 |
| G-11 | POS Backend — `loyalty_idempotency_key` generation | POS BE owns generation of `"order_{id}_loyalty"` for all flows per Owner 2026-05-25 Option B (G-2 of Bill Payload Gap Fix Plan). UNVERIFIED end-to-end | BACKEND_BLOCKED | POS BE team | Inject key into outbound CRM payload for Flow 3 + Flow 4; joint QA verifies via CRM logs | P1 |
| G-12 | Loyalty G-1 (`loyalty_discount` ₹ field) — verification | Code emits `loyalty_discount` in all 4 flows. Live capture verification pending | OWNER_SMOKE_PENDING | Owner + QA | Capture Flow 3 + Flow 4 payloads showing non-zero `loyalty_discount` when loyalty applied | P2 |
| G-13 | Loyalty Phase C — Live UI for `LOYALTY_DISABLED` / `SETTINGS_MISSING` | 12 DEFERRED items in Phase C Joint QA — cannot toggle restaurant config without admin intervention | DEFERRED (needs CRM/admin) | CRM admin / Owner | Toggle a restaurant's loyalty config in CRM admin; verify POS hides loyalty section | P2 |
| G-14 | Auto-print payload P-1 / P-3 (coupon code + discount in 4 OrderEntry override blocks) | Code is implemented (L1208/9, L1271/2, L1659/60, L1883/4). Live capture verification pending | OWNER_SMOKE_PENDING | Owner + QA | Verify printed receipt shows coupon code (not title) + −₹X discount line for all 4 auto-print paths | P2 |
| G-15 | V3-B / V3-C — CRM admin UI for coupon creation | Per CRM handoff §16: admin UI not implemented for V3 types; coupons must be seeded via DB/API | CRM_BLOCKED (admin) | CRM team | CRM admin sprint to add BOGO/BXG/Nth UI to `CouponsPage.jsx`. Out of POS scope. | P2 |
| G-16 | V2 — Category-scope test coupon | Existing CRM seeds cover V1 (FLAT100TEST), V2-item (KUNAFA20), V3-B (SEED_V3B_BOGO/BXGY_FREE), V3-C (SEED_V3C_EVERY3_FREE). **Missing: V2 category-scope test coupon** (V2 Discovery B-4) | NOT_IMPLEMENTED (test data) | CRM admin | Create one category-scope coupon for restaurant 689 | P1 |
| G-17 | Coupon reversal / refund (Phase 2) | CRM has no reversal endpoint; cancel/refund of committed coupon usage not possible (CRM handoff §16) | DEFERRED (CRM_BLOCKED) | CRM Phase 2 | Wait for CRM reversal API; then POS implements cancel-coupon flow | P3 |
| G-18 | Cashier-cancel warning toast (B-1) on post-commit cancel with applied coupon | Closed as "not applicable" in V1B Step 2 §7 — no UI path exists for post-commit cancel in current architecture | DEFERRED (spec-only) | Architecture | Re-evaluate if CRM ships reversal API (depends on G-17) | P3 |
| G-19 | Wallet CRM integration (`walletDebitLive`, debit/credit endpoints) | Wallet UI is disabled with helper; payload force-zeroed. Wallet is a separate CR per Owner Q11 | DEFERRED (separate CR) | Wallet CR owner | Open Wallet CR ticket; out of BUG-108 scope | P3 |
| G-20 | QSR separate coupon UI (CartPanel quick-billing) | Owner Q4=A: route QSR through Full Billing → CollectPaymentPanel. QSR `CartPanel.handleCollectBill` emits coupon zeros only (no UI) | DEFERRED (owner decision) | Owner / Product | Re-open only if owner requests one-step QSR coupon. No FE work pending. | P3 |
| G-21 | Room / Hotel coupon — live coverage | Inline-mirror in CollectPaymentPanel mirrors all V1/V2/V3 behavior. Owner smoke for room-service path pending | IMPLEMENTED_WAITING_QA | QA / Owner | Include room-service coupon scenarios in V1B + V2/V3 owner smoke | P2 |
| G-22 | Coupon `transferToRoom` (Flow 6) | Per V1B QA handoff §2.3: transferToRoom Flow 6 stays coupon-free (V1 scope decision). Code does not emit coupon fields | DEFERRED (V1 scope) | Owner / Product | Re-open if owner requests coupon on Flow 6 | P3 |
| G-23 | Variant / Add-on coupon matching | CRM coupon engine does not consider variants or add-ons for eligibility (CRM handoff §16). POS must send base `food_id` only | DEFERRED (CRM engine limit) | CRM engine extension | Future CRM sprint | P3 |
| G-24 | Multi-coupon per order | Hard-locked at 1 coupon per order (CRM handoff §16) | NOT_IMPLEMENTED (product) | Product | Future product decision | P3 |
| G-25 | CRM `excluded_item_ids` / `excluded_category_ids` admin UI | Backend-only today; no admin UI to configure exclusions (CRM handoff §16) | CRM_BLOCKED (admin) | CRM team | CRM admin sprint | P3 |
| G-26 | Per-line discount allocation display on POS bill | CRM returns total discount only; POS must decide UI per-line allocation (CRM handoff §16) | NOT_IMPLEMENTED (UI design) | POS UI / Product | Future improvement — display benefit_items per-line OR top-line "Coupon −₹X" | P3 |
| G-27 | CRM `/pos/max-redeemable` slowness on staging-15 (~17s) | N+1 fix planned on CRM. POS has 30s timeout workaround | CRM_BLOCKED (perf) | CRM team | CRM N+1 fix lands → re-bench POS UX latency | P3 |
| G-28 | Doc hygiene — superseded sprint docs | 9 stale/superseded docs catalogued in FINAL_RECONCILIATION §13 (S-1..S-9). No header annotation added | NOT_IMPLEMENTED (hygiene) | Next doc agent | Add SUPERSEDED header or retire under folder convention | P2 |
| G-29 | `PRD.md` backlog out of date | Lists V1 closure as pending P1; V2 + V3 as P2 "blocked" | NOT_IMPLEMENTED (hygiene) | Doc maintainer | Update PRD backlog (NOT done in this run per scope) | P2 |
| G-30 | Live restaurant validation for V2 + V3 coupons | CRM is QA'd with synthetic fixtures; real restaurant testing requires POS integration end-to-end (CRM handoff §16) | OWNER_SMOKE_PENDING | Owner + CRM admin | Tied to G-03..G-06 owner smoke | P1 |

---

## Summary Counts

| Bucket | Count |
|---|---:|
| Open gaps total | **30** |
| P0 (blocks production / data correctness) | 1 |
| P1 (blocks QA pass) | 12 |
| P2 (quality / hygiene) | 7 |
| P3 (backlog / external) | 10 |
| `STATUS_CONFLICT_DOCS_VS_CODE` | 4 (G-03, G-05, G-06; plus implicitly G-04) |
| `BACKEND_BLOCKED` (POS BE audit pending) | 5 (G-07..G-11) |
| `CRM_BLOCKED` | 5 (G-15, G-17, G-23, G-25, G-27) |
| `DEFERRED` | 5 (G-17..G-22) |
| `OWNER_SMOKE_PENDING` | 5 (G-01, G-12, G-13, G-14, G-30) |
| `IMPLEMENTED_WAITING_QA` | 5 (G-02, G-04, G-05, G-06, G-21) |

---

## Highest-Priority Action Sequence

1. **(P0)** Close G-08 (POS BE forwards `items[]` to CRM `/api/pos/orders`) — without this, CRM cannot revalidate V2/V3 coupons at commit time.
2. **(P1)** Run V2 + V3-A + V3-B + V3-C QA Handoff + owner smoke (G-03, G-04, G-05, G-06, G-30) — convert code-complete into QA-passed.
3. **(P1)** Close G-01 / G-02 — V1B Step 1 + Step 2 owner smoke (≥10 orders).
4. **(P1)** Close G-07, G-09, G-10, G-11 — POS BE mapper audit + bill template + loyalty idempotency key.
5. **(P1)** Close G-16 — seed V2 category-scope test coupon.
6. **(P2)** Close G-12 / G-14 — live capture for G-1 loyalty_discount + auto-print payload P-1/P-3.

---

## Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed | ✅ |
| 2 | No frontend changed | ✅ |
| 3 | No backend changed | ✅ |
| 4 | No CRM changed | ✅ |
| 5 | No data mutated | ✅ |
| 6 | No mutating API called | ✅ |
| 7 | `/app/memory/final/` untouched | ✅ |
| 8 | Baseline docs untouched | ✅ |
| 9 | PRD.md untouched | ✅ |

---

**End of BUG-108 Coupon + Loyalty Open Gaps Register.**
