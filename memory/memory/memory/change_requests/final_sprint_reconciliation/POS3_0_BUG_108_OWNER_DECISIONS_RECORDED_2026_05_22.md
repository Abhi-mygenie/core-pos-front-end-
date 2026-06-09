# POS 3.0 BUG-108 — Owner Decisions Recorded

**Date:** 2026-05-22
**Decided by:** Owner
**Recorded by:** Senior POS3.0 BUG-108 CRM Planning Agent
**Paired with:**
- `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md`
- `POS3_0_BUG_108_OWNER_DECISION_MATRIX_2026_05_22.md`

---

## 1. Status

```
bug_108_owner_decisions_recorded_ready_for_implementation_planning
```

This document captures the owner's answers to Q1-Q6 and the cross-cutting sign-offs S1-S3 from the Decision Matrix. These answers are the **authoritative input** for the next phase (API contract + implementation plan).

---

## 2. Decisions

### Q1. Coupon master ownership → **(a) POS backend owns catalog; CRM stores per-customer entitlement only**

**Owner intent:** Catalog creation/editing lives in POS settings; CRM is used only to tie specific customers to specific coupon codes.

**Implications for implementation:**
- POS backend must expose CRUD endpoints for the coupon catalog (admin-side). Not in BUG-108 scope, but called out as a prerequisite for replacing the hardcoded `generalCoupons` list.
- A new POS endpoint (e.g., `GET /api/v1/vendoremployee/coupons`) is needed to fetch the active catalog at order time.
- CRM endpoint for entitlement (per-customer assignment) — owner answered this under Q6 (bulk endpoint with order_total filter), so CRM exposes `GET /pos/coupons/available?customer_id=…&order_total=…` returning **only the codes the customer is entitled to use**, derived from CRM-side entitlement records.

---

### Q2. Coupon validation timing → **(b) Apply-time + final commit at PLACE_ORDER / BILL_PAYMENT**

**Owner intent:** Validate twice — once when cashier hits "Apply" (UX feedback), and once at final commit (correctness guard).

**Implications:**
- Frontend `handleApplyCoupon` (`CollectPaymentPanel.jsx:639`) calls a CRM/POS validate endpoint instead of doing local lookup.
- BILL_PAYMENT / PLACE_ORDER payloads continue carrying `coupon_discount` / `coupon_title` / `coupon_type` — POS backend re-validates server-side and rejects with an error if the coupon expired between apply and checkout.

---

### Q3. Loyalty redemption ratio → **(d) Dynamic per-tier**

**Owner intent:** Loyalty redemption ratio varies by customer tier (Bronze / Silver / Gold / etc.). The tier→ratio mapping is **already defined in the Loyalty page screen** (owner referenced a screenshot — **TODO: screenshot not attached to this session; needs to be added before implementation**).

**Implications:**
- Source of truth for the ratio table = Loyalty page (likely a CRM admin screen).
- CRM must expose the tier→ratio mapping (likely in the existing `customer.loyalty` blob already returned by `/pos/customers/{id}`, or via a new `GET /pos/loyalty/config` endpoint).
- Frontend `loyaltyDiscount` math at `CollectPaymentPanel.jsx:502-503` will switch from `Math.min(loyaltyPoints, …)` (assumes 1:1) to `Math.min(loyaltyPoints * ratio, …)` where `ratio` is fetched per customer per their tier.
- **Action item before implementation:** owner to share the Loyalty page screenshot or paste the tier→ratio table directly.

---

### Q4. Wallet debit timing → **DEFERRED to separate Change Request (CR)**

**Owner intent:** Wallet timing and the broader coupon-CR concerns will be addressed in a dedicated CR, not in BUG-108. This means:
- BUG-108 will **not** add a wallet-debit API call from POS to CRM.
- BUG-108 will **not** add a coupon-redeem API call from POS to CRM.
- Frontend continues emitting `use_wallet_balance` and `coupon_discount` / `coupon_title` in the existing PLACE_ORDER / BILL_PAYMENT payloads. The downstream behavior (whether POS backend forwards to CRM) remains as today, and is deferred to the future CR.

**Implications:**
- BUG-108 implementation scope is **narrowed** to:
  - **Reading** real coupon entitlements (Q1+Q6).
  - **Validating** coupon codes (Q2).
  - **Reading** real loyalty ratio per tier (Q3).
  - **Read** parity for the existing wallet/loyalty balances (already in place).
  - **Suggested-coupons UX** (Q6).
- The actual "money movement" (debit wallet, redeem points, redeem coupons) is **out of scope** for BUG-108 and will be tracked in a new CR.

---

### Q5. Reversal handling → **(a) No reversal — only after final settlement, the order comes to CRM**

**Owner clarification:** CRM only receives orders that have been **finally settled**. Pre-settlement events (cancel-item, cancel-order, make-unpaid, change-payment-method) never touch CRM, so there is nothing to reverse on the CRM side.

**Implications:**
- No reversal endpoints are needed from CRM for BUG-108.
- POS backend (not CRM) is responsible for handling pre-settlement state changes.
- Combined with Q4 deferral, this means **the entire commit-and-reverse lifecycle is out of BUG-108 scope** — BUG-108 is now strictly a **read + validate** sprint.
- The POS-backend → CRM hand-off at final settlement is the responsibility of the POS backend team (out of frontend scope).

---

### Q6. Customer-specific coupon entitlements → **(c) Bulk `GET /pos/coupons/available?customer_id=…&order_total=…`**

**Owner intent:** Server pre-filters by customer entitlement, min-order, validity. Frontend just consumes a curated list.

**Additional owner directive — ROI measurement:**
> Each coupon usage ROI extra need to be measured. Make note: may need a different QR for measuring ROI.

**Implications:**
- Beyond the read endpoint, the system must **log each coupon redemption with enough context to compute ROI** (revenue from order minus discount, attributed to the specific coupon code/campaign).
- A separate report ("QR" likely = Quick Report or Quarterly Report) is needed to surface per-coupon ROI to the owner.
- This is a **separate workstream** (likely a backend + reporting concern, not a frontend BUG-108 task), but the **frontend payload fields** (`coupon_title`, `coupon_code`, `coupon_discount`) must carry enough information to support ROI attribution — they already do.
- **Action item:** track the ROI report as a separate ticket (suggested ID: **BUG-108-ROI** or a new **REPORT-XXX**).

---

### S1. Phase ordering → **OK as proposed**

Sequence stands: **108-P0 (decisions, this doc) → P1 (read parity) → P2 (validate)**. P3-P5 are now **out of BUG-108 scope** per Q4+Q5 deferrals.

**Revised BUG-108 phase plan:**
| Phase | Scope | Status |
|-------|-------|--------|
| 108-P0 | Owner decisions (Q1-Q6 + S1-S3) | **DONE — this doc** |
| 108-P1 | Read parity — replace hardcoded coupon catalog with POS endpoint + CRM customer-entitlement filter | Pending |
| 108-P2 | Validate — wire CRM/POS `validate` calls into Apply Coupon UX; rejection messaging | Pending |
| 108-P3 | Commit / debit | **DEFERRED to separate CR** |
| 108-P4 | Reverse | **OUT OF SCOPE per Q5** |
| 108-P5 | Polish: suggested-coupons chips (Q6=c), per-tier loyalty ratio display (Q3=d) | Pending |
| 108-ROI | Per-coupon ROI report | **NEW workstream — separate ticket** |

---

### S2. Field-name lock-in → **OK — keep existing field names**

No renames in BUG-108. `loyalty_dicount_amount` (legacy misspelling) and all other payload fields stay as-is.

---

### S3. Multi-terminal safety → **Accept the risk for now; defer to P5**

With Q4 deferred, multi-terminal contention concerns are also deferred to the future CR.

---

## 3. Open Items / Action Items

| # | Action | Owner | Blocker for |
|---|--------|-------|-------------|
| 1 | **Attach the Loyalty-page screenshot** (referenced in Q3) showing the tier→ratio mapping | Owner | 108-P1 implementation kickoff |
| 2 | Confirm POS backend coupon-catalog admin UI exists (or scope its creation) | POS backend team | 108-P1 read-parity endpoint |
| 3 | Confirm CRM exposes (or will expose) `GET /pos/coupons/available?customer_id=…&order_total=…` | CRM team | 108-P1 |
| 4 | Confirm CRM exposes (or will expose) per-customer loyalty tier+ratio (in `customer.loyalty` blob or new endpoint) | CRM team | 108-P1 |
| 5 | Confirm CRM exposes (or will expose) `POST /pos/coupons/validate` (apply-time check) | CRM team | 108-P2 |
| 6 | Create a separate CR ticket for wallet debit + coupon redeem + loyalty redeem (Q4 deferral) | Owner / PM | 108-P3 (deferred) |
| 7 | Create a separate ticket for per-coupon ROI report (Q6 ROI note) | Owner / PM | 108-ROI |

---

## 4. What Changes in the Plan Document

The original Discovery Plan listed phases P0-P5. After these owner decisions, the actual BUG-108 work is **narrower**:

**In scope for BUG-108:**
- Read real coupon catalog (Q1=a + Q6=c bulk endpoint).
- Read real per-tier loyalty ratio (Q3=d).
- Validate coupons at apply-time and at commit-time (Q2=b).
- UX polish — suggested-coupons chips above the coupon input (Q6=c).

**Out of scope for BUG-108 (moved to separate CR / ticket):**
- Wallet debit API call (Q4 deferred).
- Coupon redeem API call (Q4 deferred).
- Loyalty redeem API call (implied by Q5=a + Q4 deferral).
- Reversal endpoints (Q5=a — not needed; CRM only sees settled orders).
- Multi-terminal locking (S3 deferred).
- ROI reporting (separate ticket per Q6 note).

---

## 5. Next Step

Once the **Loyalty-page screenshot (Action #1)** is provided and CRM team confirms which endpoints they will expose (Actions #2-#5), the next agent should produce:

1. **API contract document** — request/response shapes for the in-scope endpoints only (coupon catalog read, customer-entitlement read, validate, loyalty-ratio read).
2. **Implementation plan** — file-level diffs covering `CollectPaymentPanel.jsx`, `customerTransform.js`, `constants.js`, and a new `couponService.js` / `loyaltyService.js`.
3. **QA checklist** — analogous to BUG-104 Phase 2A QA Handoff.

**Until Action #1 (screenshot) is provided, 108-P1 cannot kick off.**

---

**End of BUG-108 Owner Decisions Record.**
