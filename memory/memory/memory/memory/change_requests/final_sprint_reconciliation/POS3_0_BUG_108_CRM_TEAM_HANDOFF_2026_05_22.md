# POS 3.0 BUG-108 — CRM Team Handoff: Endpoint Confirmation Request

**Date:** 2026-05-22
**From:** POS 3.0 Frontend Team
**To:** CRM Team (system that hosts `/pos/customers`, `/pos/customer-lookup`, etc.)
**Re:** Endpoints required for BUG-108 (Coupon / Loyalty / Wallet integration — read + validate scope)
**Paired with:**
- `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md` (full plan)
- `POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md` (owner sign-off)

---

## 1. Purpose

Per owner sign-off, BUG-108 frontend work is scoped to **read + validate only** (no redemption / debit / reversal — those are deferred to a separate CR).

To unblock the implementation phase, we need the CRM team to confirm **for each endpoint below**:
- ✅ **Exists today** — provide base URL pattern, request shape, response shape, auth.
- 🟡 **Will be built** — provide ETA + planned shape (we'll align frontend to that).
- ❌ **Won't be built** — tell us so we can propose an alternative (e.g., POS-backend-hosted equivalent).

Please reply inline against each section or in a follow-up email referencing the section numbers.

---

## 2. CRM Auth Context (Already Live)

- All CRM calls flow through `crmApi` axios instance (`src/api/crmAxios.js`).
- Auth header: `X-API-Key: <crm_token>`.
- `crm_token` is sourced from the POS login response (per BUG-098).
- Base URL: `REACT_APP_CRM_BASE_URL` (currently `https://preprod.mygenie.online/` style; CRM team confirms exact host).

**No changes to auth expected for BUG-108.**

---

## 3. Endpoints We Need You to Confirm

### 3.1 [READ] Coupon catalog — POS-backend hosted (Q1=a)

> Per owner Q1: **POS backend owns the coupon catalog**, CRM stores per-customer entitlement only. This endpoint is **POS-backend**, not CRM — listed here only for completeness so the CRM endpoint in §3.2 makes sense.

| Item | Value |
|------|-------|
| Owner team | POS Backend |
| Method + path (proposed) | `GET /api/v1/vendoremployee/coupons` |
| Query params | `?active=true` (default), `?include_expired=false` |
| Response (proposed) | `{ success: true, data: [{ code, title, type: "percent"|"flat", discount, min_order, max_discount, valid_from, valid_to, is_active }] }` |
| **CRM team action** | None — informational only |

### 3.2 [READ] Customer-specific coupon entitlements (Q6=c)

| Item | Value |
|------|-------|
| Owner team | **CRM** |
| Method + path (proposed) | `GET /pos/coupons/available` |
| Query params | `customer_id` (required), `order_total` (required, ₹ value), `restaurant_id` (optional, for outlet-specific entitlement) |
| Auth | `X-API-Key` (existing CRM token) |
| Response shape (proposed) | `{ success: true, data: { coupons: [{ code, title, type: "percent"|"flat", discount, min_order, max_discount, expires_at, source: "global"|"customer-targeted", roi_campaign_id? }] } }` |
| Filter semantics (CRM-side) | Return only coupons where: customer is entitled AND `order_total >= min_order` AND `now() < expires_at` AND `is_active` |
| **CRM team action** | **Confirm: exists / will build / can't build.** If "exists", share actual path + response shape. If "will build", confirm ETA. |
| Used by frontend | `CollectPaymentPanel.jsx` — to populate "Suggested coupons" chips above the coupon input, replacing the hardcoded `generalCoupons` array at `:644-647` |

**Critical sub-question:** Does CRM today maintain any concept of "customer X is entitled to coupon Y"? If not, this endpoint requires a new entitlement table on the CRM side. Please confirm whether this entitlement model exists or needs to be designed.

### 3.3 [VALIDATE] Coupon code validation (Q2=b)

| Item | Value |
|------|-------|
| Owner team | **CRM** (or POS Backend — please confirm which one owns the validate authority) |
| Method + path (proposed) | `POST /pos/coupons/validate` |
| Request body (proposed) | `{ customer_id, coupon_code, order_total, restaurant_id }` |
| Auth | `X-API-Key` |
| Success response (proposed) | `{ success: true, data: { code, title, type, discount, max_discount, computed_discount_amount } }` |
| Failure response (proposed) | `{ success: false, error: { code: "EXPIRED"|"MIN_ORDER_NOT_MET"|"NOT_ENTITLED"|"INVALID_CODE"|"ALREADY_USED", message: "human-readable" } }` |
| **CRM team action** | **Confirm ownership + existence.** If validation lives on POS backend, redirect us to that team. |
| Used by frontend | `handleApplyCoupon` (`CollectPaymentPanel.jsx:639`) and final commit at BILL_PAYMENT / PLACE_ORDER (server-side re-validation) |

**Note:** If validation is POS-backend-side, the frontend will call the POS endpoint instead. Just tell us which team owns it.

### 3.4 [READ] Loyalty tier → ratio mapping (Q3=d)

| Item | Value |
|------|-------|
| Owner team | **CRM** |
| Source of truth | "Loyalty page" — owner has referenced a screenshot showing tier→ratio configuration. **TODO: screenshot not yet attached to BUG-108 docs.** |
| Option A | Embed in existing `customer.loyalty` blob already returned by `GET /pos/customers/{id}` — add fields: `tier`, `ratio_per_point` (e.g., 1.0 / 1.2 / 1.5), `tier_label` |
| Option B | New endpoint `GET /pos/loyalty/config?restaurant_id=…` returning the full tier table: `{ tiers: [{ name: "Bronze", ratio: 1.0 }, { name: "Silver", ratio: 1.2 }, { name: "Gold", ratio: 1.5 }] }` |
| **CRM team action** | **Pick Option A or B (or propose a third).** Confirm whether the `customer.loyalty` blob already contains the ratio today (frontend can inspect once a sample payload is shared). |
| Used by frontend | `loyaltyDiscount` math at `CollectPaymentPanel.jsx:502-503` — replaces hardcoded 1:1 ratio |

**Action for CRM team:** Share a **sample** `customer.loyalty` blob from a real preprod customer so we can see what's already in there.

### 3.5 [NO CHANGE] Customer balances — already live

These endpoints are already wired and working. **No changes needed**, listed here only so the CRM team has the full picture:

| Endpoint | Used for |
|----------|----------|
| `GET /pos/customers?search=` | Customer search (returns `wallet_balance`, `total_points`) |
| `POST /pos/customer-lookup` | Phone-based lookup (returns `wallet_balance`, `total_points`, `tier`) |
| `GET /pos/customers/{id}` | Full detail (returns `total_points`, `wallet_balance`, `loyalty` blob, addresses) |

**Existing CRM team work:** none. We will continue consuming these as-is.

---

## 4. Endpoints Explicitly **NOT** Needed for BUG-108

Per owner Q4 deferral + Q5 (CRM only sees fully-settled orders), the following endpoints are **out of scope** for BUG-108 and will be addressed in a separate CR. Please **do not build them yet** unless the future CR is approved:

| Deferred endpoint | Reason |
|-------------------|--------|
| `POST /pos/wallet/debit` | Q4 deferred to separate CR |
| `POST /pos/wallet/credit` (refund) | Q5 — no reversal because CRM only sees settled orders |
| `POST /pos/loyalty/redeem` | Q4/Q5 deferred |
| `POST /pos/coupons/redeem` | Q4/Q5 deferred |
| `POST /pos/coupons/reverse` + `POST /pos/loyalty/reverse` + `POST /pos/wallet/reverse` | Q5 — not needed |

---

## 5. ROI Tracking (Q6 Note — Separate Ticket)

Owner has requested per-coupon ROI measurement (separate ticket, suggested ID `108-ROI`).

**Question for CRM team:** When the future Coupon-Redeem CR (§4) is built, will it log enough data (coupon code, order amount, discount amount, customer ID, timestamp) for ROI to be computed by querying CRM data alone? Or will POS backend need to push redemption events separately?

This is informational for the future CR — no action needed in BUG-108.

---

## 6. Summary of CRM Team Asks

Please respond with one of (✅ exists / 🟡 will build / ❌ won't build) for each:

| # | Endpoint | CRM Status |
|---|----------|------------|
| 1 | `GET /pos/coupons/available?customer_id=…&order_total=…` (§3.2) | ___ |
| 2 | `POST /pos/coupons/validate` (§3.3) — or redirect us to POS backend | ___ |
| 3 | Loyalty tier→ratio: extend `customer.loyalty` blob (Option A) or new `GET /pos/loyalty/config` (Option B) (§3.4) | ___ |
| 4 | Share sample `customer.loyalty` blob from preprod (§3.4) | ___ |
| 5 | Confirm whether customer-coupon entitlement model exists today on CRM side (§3.2 sub-question) | ___ |

---

## 7. Reply Format

Either:
- Inline edit this file in `/app/memory/change_requests/final_sprint_reconciliation/` and add a "CRM team response" section.
- Email/Slack reply quoting the section numbers (3.2, 3.3, 3.4) with status + sample payloads.

Once we have responses for all five items in §6, the next POS frontend agent can produce the **API contract document + file-level implementation plan** for 108-P1 and 108-P2.

---

**End of CRM Team Handoff.**
