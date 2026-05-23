# POS 3.0 BUG-108 — Loyalty Contract Verification (2026-05-23)

**Date:** 2026-05-23
**Sprint:** POS 3.0
**Bug / CR:** BUG-108 — Loyalty-First Implementation (per owner direction)
**Status:** `bug_108_loyalty_contract_partially_verified_waiting_api_gaps`
**CRM Handoff:** `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md`

---

## 1. Status

```
bug_108_loyalty_contract_verified_ready_for_frontend_plan
```

**CRM loyalty API contract is complete and GREEN-LIGHT.** Owner answered all 5 questions (Q-L1 through Q-L5) on 2026-05-23. GAP-L1 (API key) was a false alarm — CRM key comes from POS login response per BUG-098, not `.env`. Remaining gaps (GAP-L2 through GAP-L6) are POS frontend code changes to be addressed in the implementation plan. No external blockers remain.

---

## 2. Owner Scope Clarification

Owner has directed:
- **Loyalty FIRST** — this is the immediate implementation target.
- **Coupon is NOT part of this immediate CR** — deferred to CR-001C-C.
- **Wallet is NOT part of this immediate CR** — deferred to CR-001C-W.
- **Redemption (loyalty/coupon/wallet debit/credit/reverse) is deferred** to a future CR.
- The goal is to verify whether loyalty read/display + calculated preview APIs are complete enough for POS frontend planning.

---

## 3. Docs Read

| # | Doc | Path | Read |
|---|-----|------|------|
| 1 | Architecture Decisions Final | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Full read |
| 2 | Implementation Agent Rules | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Full read |
| 3 | Change Request Playbook | `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | Confirmed present |
| 4 | Final Docs Approval Status | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | Confirmed present |
| 5 | Final Docs Summary | `/app/memory/final/FINAL_DOCS_SUMMARY.md` | Confirmed present |
| 6 | Module Decisions Final | `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Confirmed present |
| 7 | Open Questions Final Resolution | `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Confirmed present |
| 8 | BUG-108 CRM API Discovery Plan | `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md` | Full read |
| 9 | BUG-108 API Inventory for CRM | `POS3_0_BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md` | Full read |
| 10 | BUG-108 P1 UI Shell Implementation Report | `POS3_0_BUG_108_P1_UI_SHELL_IMPLEMENTATION_REPORT_2026_05_22.md` | Full read |
| 11 | BUG-108 P1 UI Shell QA Handoff | `POS3_0_BUG_108_P1_UI_SHELL_QA_HANDOFF_2026_05_22.md` | Full read |
| 12 | BUG-108 Final Owner Approvals | `POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md` | Full read |
| 13 | BUG-108 Owner Decisions Addendum Q9-Q11 | `POS3_0_BUG_108_OWNER_DECISIONS_ADDENDUM_Q9_Q11_2026_05_22.md` | Full read |
| 14 | **CRM Loyalty Handoff (NEW)** | `/app/memory/crm/crm_1_0/handoff/CR_001C_LX_POS_BUG_108_LOYALTY_API_HANDOFF_TO_POS.md` | Full read |

---

## 4. Code Areas Inspected (Read-Only)

| File | What was checked |
|------|-----------------|
| `src/utils/BUG108_FLAGS.js` | Feature flags and copy strings |
| `src/components/order-entry/CollectPaymentPanel.jsx` | Loyalty section UI, discount math, state vars, customer field access |
| `src/api/transforms/orderTransform.js` | Payload builders (PLACE_ORDER, BILL_PAYMENT, print) — loyalty fields |
| `src/api/transforms/customerTransform.js` | CRM response → frontend mapping (field names, loyalty blob handling) |
| `src/api/services/customerService.js` | Customer lookup/search/detail service calls |
| `src/components/order-entry/CartPanel.jsx` | Customer selection flow (what data passes upstream via `onCustomerChange`) |
| `src/components/order-entry/OrderEntry.jsx` | `setCustomer` calls — what fields are on the customer object |

---

## 5. Loyalty API / Data Contract Summary

### 5.1 Endpoint 1: `POST /api/pos/customer-lookup`

| Field | Value |
|-------|-------|
| Method | POST |
| Path | `/api/pos/customer-lookup` |
| Auth | `X-API-Key` |
| Request | `{ "phone": "9876543210" }` |
| LX-A Change | `points_value` is now **tier-aware** (uses per-tier `ratio_per_point`) |
| Sample available? | Yes — Bronze (30.0), Silver (620.0), Gold (720.0) |
| Verification status | **Contract verified from handoff doc §4.1** |

**Key response fields (flat, no nested blob):**
- `tier` (string), `total_points` (int), `points_value` (float), `wallet_balance` (float)

### 5.2 Endpoint 2: `GET /api/pos/customers/{customer_id}`

| Field | Value |
|-------|-------|
| Method | GET |
| Path | `/api/pos/customers/{customer_id}` |
| Auth | `X-API-Key` |
| LX-A Change | `loyalty` blob replaced with strict 6-key shape |
| Sample available? | Yes — Bronze, Gold examples |
| Verification status | **Contract verified from handoff doc §4.2** |

**Key response fields:**
- Top-level: `id`, `name`, `phone`, `tier`, `total_points`, `wallet_balance`
- Nested `loyalty` blob: `tier`, `tier_label`, `total_points`, `ratio_per_point`, `points_value`, `loyalty_enabled`

### 5.3 Endpoint 3: `GET /api/pos/customers/{customer_id}/loyalty`

| Field | Value |
|-------|-------|
| Method | GET |
| Path | `/api/pos/customers/{customer_id}/loyalty` |
| Auth | `X-API-Key` |
| LX-A Change | Response `data` is strict 6-key loyalty blob |
| Sample available? | Yes — Gold example |
| Verification status | **Contract verified from handoff doc §4.3** |

---

## 6. Loyalty Field Mapping Table

| CRM Source Field | Type | Example | POS Frontend Currently Reads | POS Payload Field | Required/Optional | Gap? |
|-----------------|------|---------|------------------------------|-------------------|-------------------|------|
| `loyalty.tier` | string | `"Gold"` | Not consumed | — (display only) | Required | **YES — not mapped in customerTransform** |
| `loyalty.tier_label` | string | `"Gold Member"` | Not consumed | — (display only) | Optional | **YES — not mapped** |
| `loyalty.total_points` | int | `480` | `customer?.loyaltyPoints` (WRONG name) | `used_loyalty_point` | Required | **YES — field name mismatch** |
| `loyalty.ratio_per_point` | float | `1.5` | Not consumed (hardcoded 1:1) | — (calculation) | Required | **YES — not mapped** |
| `loyalty.points_value` | float | `720.0` | Not consumed | — (display only) | Required | **YES — not mapped** |
| `loyalty.loyalty_enabled` | bool | `true` | `restaurantSettings?.isLoyalty` only | — (UI gate) | Required | **YES — new gate needed** |
| Top-level `total_points` | int | `480` | `totalPoints` (transform) → but dropped in CartPanel | — | Existing | **YES — data pipeline broken** |
| Top-level `points_value` (lookup) | float | `720.0` | `pointsValue` (transform) → but dropped in CartPanel | — | Existing | **YES — data pipeline broken** |
| Top-level `wallet_balance` | float | `1200.0` | `walletBalance` (transform) → but dropped in CartPanel | `use_wallet_balance` | Out of scope | YES (known, wallet CR) |

### Critical Field Name Mismatches

| Where | Code reads | Should read (from CRM) | Issue |
|-------|-----------|------------------------|-------|
| `CollectPaymentPanel.jsx:507` | `customer?.loyaltyPoints` | `customer?.totalPoints` OR `customer?.loyalty?.total_points` | **Field does not exist on customer object** |
| `CollectPaymentPanel.jsx:1050` | `customer?.loyaltyPoints` | Same | Same — display always shows "0 pts" |
| `CollectPaymentPanel.jsx:508` | `Math.min(customer.loyaltyPoints, ...)` | Should use `points_value` (pre-calculated by CRM) | **Wrong calculation — uses raw points as rupees (1:1)** |

---

## 7. Redemption Calculation Mapping

| Question | Answer |
|----------|--------|
| Who calculates redeemable amount? | **CRM backend** — `points_value = round(total_points * ratio_per_point, 2)` is returned pre-calculated |
| Can frontend derive amount from ratio? | Yes — `total_points * ratio_per_point` = `points_value`. But CRM already provides `points_value`, so frontend should use it directly. |
| Does backend return final allowed amount? | **Yes** — `points_value` is the final rupee value. No `max_usable_points` or `max_usable_amount` cap is documented. |
| Does loyalty apply before tax or after tax? | Current code applies to `itemTotal` (pre-tax). CRM contract does not specify — **needs owner clarification**. |
| Does loyalty combine with manual discount? | **Yes** — current code sums them: `totalDiscount = manualDiscount + presetDiscount + loyaltyDiscount + ...` (line 522). Owner Q9 confirmed combinability. |
| Does loyalty combine with coupon? | **Yes per Q9** — but coupon is out of scope for this CR. |
| Does loyalty combine with wallet? | Wallet deferred — current code sums them but wallet flag is `false`. |
| Is there a min redeemable points threshold? | **Not documented in CRM contract**. |
| Is there a max redeemable amount cap? | **Not documented in CRM contract**. |
| Rounding | CRM rounds `points_value` to 2 decimal places. POS should use this directly. |

### Calculation Flow (proposed for loyalty-live phase)

```
1. CRM returns: loyalty.points_value = 720.0 (pre-calculated)
2. POS displays: "720 pts available" (or "₹720 available")
3. Cashier enables "Use Loyalty" checkbox
4. loyaltyDiscount = Math.min(loyalty.points_value, itemTotal - manualDiscount)
5. used_loyalty_point = round(loyaltyDiscount / loyalty.ratio_per_point)
6. Payload sends: used_loyalty_point, loyalty_dicount_amount = loyaltyDiscount
```

**Key change from current code:** Current code uses `customer.loyaltyPoints` as both the point count AND the rupee value (1:1 ratio). New code must use `points_value` as the rupee cap, and back-calculate `used_loyalty_point` from the ratio.

---

## 8. POS Payload Safety Mapping

### `used_loyalty_point` (integer — points consumed)

| Phase | Value | Source |
|-------|-------|--------|
| P1 (current, flags=false) | `0` | Force-zeroed by `BUG108_FLAGS.loyaltyRatioLive` guard |
| Loyalty read-only display | `0` | No redemption; display only |
| Loyalty calculated preview | `0` | Display preview amount but do NOT send in payload until redemption API exists |
| Loyalty real redemption (future) | `round(loyaltyDiscount / ratio_per_point)` | Only when redemption API (`POST /pos/loyalty/redeem`) is live |

### `loyalty_dicount_amount` (float — rupee discount applied, note: typo is intentional, matches backend field name)

| Phase | Value | Source |
|-------|-------|--------|
| P1 (current, flags=false) | `0` | Force-zeroed |
| Loyalty read-only display | `0` | No redemption |
| Loyalty calculated preview | `0` | Display only — do NOT send in payload |
| Loyalty real redemption (future) | `loyaltyDiscount` (rupee amount) | Only when redemption API is live |

**Typo note:** The field is `loyalty_dicount_amount` (missing 's' in 'discount'). This matches the existing POS backend field name. Do NOT fix the typo — it would break the API contract.

---

## 9. API Gap Register

| Gap ID | Missing Item | Why Needed | Blocks Read-Only Display? | Blocks Redemption? | Priority |
|--------|-------------|------------|---------------------------|--------------------|---------| 
| **GAP-L1** | ~~**CRM API key for test pod**~~ | ~~POS `.env` keys return "Invalid API key"~~ | ~~**YES**~~ | ~~YES~~ | ~~**P0**~~ **RESOLVED** — CRM key comes from POS login response per BUG-098, not `.env`. False alarm. |
| **GAP-L2** | **Customer data pipeline broken** — `CartPanel.selectCustomer()` passes only `{ id, name, phone }` via `onCustomerChange`, dropping `totalPoints`, `walletBalance`, `tier`, `pointsValue`, and entire `loyalty` blob | Loyalty section will always show "0 pts" / "No points" | **YES** | YES | **P0 — BLOCKER** |
| **GAP-L3** | **Field name mismatch** — `CollectPaymentPanel.jsx` reads `customer?.loyaltyPoints` but customer object has `totalPoints` (from transform) or no such field (from CartPanel) | Loyalty display and discount calculation will always be 0 | **YES** | YES | **P0 — BLOCKER** |
| **GAP-L4** | **Loyalty blob fields not consumed** — `customerTransform.js` maps `api.loyalty || null` but does NOT extract `ratio_per_point`, `points_value`, `loyalty_enabled`, `tier_label` from the blob | Per-tier ratio unavailable; `loyalty_enabled` gate missing | **YES** | YES | **P1 — Required for implementation** |
| **GAP-L5** | **Loyalty math uses wrong formula** — Current code does `Math.min(customer.loyaltyPoints, itemTotal - manualDiscount)` treating points as rupees (1:1). New contract provides `points_value` (pre-calculated rupee equivalent). | Discount calculation will be wrong if ratio != 1.0 | No (display only doesn't calculate) | YES | **P1 — Required for calculated preview** |
| **GAP-L6** | **No `loyalty_enabled` gate in UI** — Current code gates on `restaurantSettings?.isLoyalty` but CRM now also returns `loyalty.loyalty_enabled`. Both gates needed. | Loyalty could show as enabled when CRM says disabled for this restaurant | **YES** (could show UI when it shouldn't) | YES | **P1 — Required** |
| **GAP-L7** | **No max usable points/amount cap documented** — CRM contract shows `points_value` but no `max_usable_points` or `max_usable_amount` or percentage cap | Unclear if full `points_value` is always redeemable | No | Partial | **P2 — Clarification needed** |
| **GAP-L8** | **No redemption API** — `POST /pos/loyalty/redeem` is deferred to future CR | Cannot actually debit points | No | **YES — BLOCKER** | **Future CR** |
| **GAP-L9** | **Removed keys from CRM response** — `points_monetary_value`, `redemption_value_per_point`, `next_tier`, etc. removed in LX-A | Must verify no POS code reads these | No (if verified clean) | No | **P1 — Verify before flip** |

---

## 10. Sample Data Coverage

| Customer Type | Available in CRM Handoff? | Sample Source |
|--------------|--------------------------|---------------|
| Customer with no loyalty (no settings) | Partially — doc §5 says `loyalty_enabled=false`, `ratio=0.25` | Contract spec, no JSON sample |
| Customer with Bronze tier (low) | **Yes** — `cust_bronze_001`, 120 pts, ratio 0.25, value ₹30 | Handoff §4.1 + §4.2 |
| Customer with Silver tier (mid) | **Yes** — `cust_silver_002`, 620 pts, ratio 1.0, value ₹620 | Handoff §4.1 |
| Customer with Gold tier (high) | **Yes** — `cust_gold_003`, 480 pts, ratio 1.5, value ₹720 | Handoff §4.1 + §4.2 + §4.3 |
| Customer with Platinum tier | **No sample** — tier name documented but no sample JSON | Gap |
| Customer with zero points | **No sample** — field defaults to `0` per spec | Inferred |
| Customer with points but redemption disabled (`loyalty_enabled=false`) | **No sample** — behavior documented in §5 | Inferred |
| Customer with expiring points | **Not in contract** — no expiry fields documented | Gap — not in BUG-108 scope |
| Customer where max usable cap applies | **Not in contract** — no cap fields documented | Gap (see GAP-L7) |

---

## 11. Phase Recommendation

**Recommended: Phase B — Loyalty read-only + calculated preview**

| Phase | Description | Feasible now? |
|-------|-------------|---------------|
| A. Read-only display only | Show tier, points, points_value. Checkbox disabled. | **YES** — once GAP-L1 through GAP-L4 fixed |
| **B. Read-only + calculated preview** | Show tier, points, points_value. Show "₹X redeemable" preview. Checkbox still disabled (no redemption API). | **YES** — once GAP-L1 through GAP-L6 fixed. **RECOMMENDED.** |
| C. Real redemption | Actually debit points on bill payment. | **NO** — blocked by GAP-L8 (no `POST /pos/loyalty/redeem` API) |
| D. Block until contract complete | Wait for all gaps resolved. | Not needed — contract is sufficient for Phase B. |

**Rationale for Phase B:**
- CRM provides `points_value` pre-calculated — POS can display it as "₹720 redeemable"
- Checkbox stays disabled (no redemption API), but the preview gives cashiers useful info
- Payload fields stay zero (no mutation)
- When redemption API lands (future CR), flip the flag and the math is already in place

---

## 12. Owner / CRM Questions — ANSWERED (2026-05-23)

### Q-L1. Loyalty first phase should be:
**Owner answer: B** — Read-only + "estimated redeemable amount" preview (show "₹720 available", checkbox disabled).

### Q-L2. CRM test pod API key
**Owner answer:** Not applicable — CRM key is NOT sourced from `.env`. Per BUG-098, the CRM API key (`crm_token`) comes from the POS backend login response and is set via `setCrmToken()` in `crmAxios.js`. The `.env` `REACT_APP_CRM_API_KEYS` is legacy/unused. **GAP-L1 was a false alarm — RESOLVED.**

**Code evidence:**
- `src/api/crmAxios.js:4` — "BUG-098: CRM token sourced from login response `crm_token` field."
- `src/api/transforms/authTransform.js:21` — `crmToken: api.crm_token || null`
- `src/api/services/authService.js:24` — `setCrmToken(authData.crmToken)`

### Q-L3. Should `used_loyalty_point` and `loyalty_dicount_amount` remain zero?
**Owner answer: A** — Yes, keep zero until `POST /pos/loyalty/redeem` is live.

### Q-L4. Is there a max usable points/amount cap per order?
**Owner answer: C** — CRM backend enforces cap. Owner noted this should already be in the contract. **Verification:** Current 6-key blob has no separate `max_usable_amount` field. `points_value` is pre-calculated by CRM (`total_points * ratio_per_point`). POS frontend caps at `min(points_value, subtotal_after_discounts)`. If a per-order % cap is needed, CRM adds it in a future iteration.

### Q-L5. Does loyalty discount apply before or after tax?
**Owner answer: A** — Before tax (on item total). Treated as a discount. Already covered in baseline business rules.

---

## 13. Implementation Readiness Verdict

| Dimension | Ready? | Detail |
|-----------|--------|--------|
| CRM API contract documented | **YES** | Handoff doc GREEN-LIGHT, 3 endpoints, 6-key blob, 3-tier samples |
| CRM endpoints live in preview | **YES** | Health check passes, routes registered |
| CRM API key for POS preview | **YES** | GAP-L1 RESOLVED — key comes from POS login response per BUG-098 |
| Owner decisions | **YES** | Q-L1=B, Q-L2=resolved, Q-L3=A, Q-L4=C, Q-L5=A — all answered |
| Customer data pipeline (POS) | **NO — code fix needed** | GAP-L2 — CartPanel drops CRM data; GAP-L3 — field name mismatch |
| Loyalty blob consumption (POS) | **NO — code fix needed** | GAP-L4 — customerTransform doesn't extract blob fields |
| Loyalty math formula (POS) | **NO — code fix needed** | GAP-L5 — hardcoded 1:1 ratio, needs points_value |
| `loyalty_enabled` gate (POS) | **NO — code fix needed** | GAP-L6 — UI doesn't check CRM's loyalty_enabled flag |
| Redemption API | **N/A** | GAP-L8 — deferred to future CR (does NOT block read-only/preview) |

### Verdict

**Frontend planning CAN begin** — the CRM contract is complete, owner decisions are locked, and no external blockers remain.

**Frontend implementation CAN begin** — the remaining gaps (GAP-L2 through GAP-L6, GAP-L9) are all POS frontend code changes that the implementation agent will address in the CR Playbook file-level plan:

1. **GAP-L2** — Fix CartPanel to pass CRM loyalty fields upstream via `onCustomerChange`
2. **GAP-L3** — Reconcile field name (`loyaltyPoints` → use `totalPoints` or loyalty blob fields)
3. **GAP-L4** — Expand `customerTransform.js` to extract 6-key loyalty blob
4. **GAP-L5** — Update loyalty math to use `points_value` / `ratio_per_point`
5. **GAP-L6** — Add `loyalty_enabled` gate alongside existing `restaurantSettings?.isLoyalty`
6. **GAP-L9** — Verify no code reads removed CRM keys before flipping flag

**No owner or CRM team action is needed to begin implementation.**

---

## 14. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend code changed | Confirmed |
| 2 | No backend code changed | Confirmed |
| 3 | No data mutated | Confirmed |
| 4 | No redemption API invoked | Confirmed |
| 5 | No payment API invoked | Confirmed |
| 6 | `/app/memory/final/` untouched | Confirmed |
| 7 | Baseline docs untouched | Confirmed |
| 8 | Only new files created: CRM handoff (local copy) + this verification doc | Confirmed |

---

**End of BUG-108 Loyalty Contract Verification.**
