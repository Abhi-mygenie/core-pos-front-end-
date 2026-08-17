# POS 3.0 BUG-108 — Frontend UX Planning & Owner Approval

**Date:** 2026-05-22
**Prepared by:** Senior POS3.0 BUG-108 Frontend UX Planning & Approval Agent
**Scope:** **FRONTEND UI PLANNING + UI APPROVAL PREPARATION ONLY** — no code edits, no API wiring, no data mutation, no `/app/memory/final/` mutation, no baseline-doc edits.

---

## 1. Status

```
bug_108_frontend_ux_planned_waiting_owner_ui_approval_and_crm_apis
```

This document captures the frontend UI/UX plan for BUG-108 (Coupon / Loyalty / Wallet) given that CRM endpoints are still pending. The plan is structured so the owner can approve the UI direction **before** any code is written and **independently** of CRM API readiness. Real wiring is blocked until CRM endpoints arrive; UI shell work can start as soon as Q1-Q8 are signed off.

---

## 2. Docs Read

### 2.1 Mandated baseline reading order (status against this environment)

| # | Document | Status |
|---|----------|--------|
| 1 | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | **Not found** — directory `/app/memory/final/` does not exist in this environment (lost in prior fork) |
| 2 | `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | **Not found** |
| 3 | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | **Not found** |
| 4 | `/app/memory/final/FINAL_DOCS_SUMMARY.md` | **Not found** |
| 5 | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | **Not found** |
| 6 | `/app/memory/final/MODULE_DECISIONS_FINAL.md` | **Not found** |
| 7 | `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | **Not found** |
| 8 | `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | **Not found** in `/app/memory/change_requests/` |
| 9 | `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | **Not found** |
| 10 | `PENDING_TASK_REGISTER_2026_05_04.md` | **Not found** |
| 11 | `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` | **Not found** |
| 12 | `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | **Not found** |
| 13 | `POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` | **Not found** |

Mandate honored: **no `/app/memory/final/` content is read, edited, or assumed** in this document. Where baseline policy would normally inform a decision, the safest interpretation is recommended (see §12) and flagged for owner sign-off.

### 2.2 BUG-108 docs (read this session)

| # | Document | Status |
|---|----------|--------|
| 14 | `POS3_0_BUG_108_COUPON_LOYALTY_WALLET_CRM_API_DISCOVERY_PLAN_2026_05_22.md` | **Read** |
| 15 | `POS3_0_BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md` | **Read** |
| 16 | `POS3_0_BUG_108_OWNER_DECISION_MATRIX_2026_05_22.md` | **Read** |
| 17 | `POS3_0_BUG_108_OWNER_DECISIONS_RECORDED_2026_05_22.md` | **Read** |
| 18 | `POS3_0_BUG_108_CRM_TEAM_HANDOFF_2026_05_22.md` | **Read** |

### 2.3 BUG-108 search sweep (read-only)

Grep targets: `BUG_108`, `COUPON`, `LOYALTY`, `WALLET`, `CRM_API`.

- No additional `/app/memory` docs found beyond those listed in §2.2.

---

## 3. Code Areas Inspected (Read-Only)

### 3.1 Files inspected

| File | What was inspected |
|------|--------------------|
| `src/components/order-entry/CollectPaymentPanel.jsx` | Coupon / Loyalty / Wallet UI sections (lines 240-260 state; 502-517 math; 638-664 apply-coupon handler; 707-754 payment payload; 765-784 print overrides; 969-1069 main UI; 1391-1500 inline mirror for room orders) |
| `src/components/order-entry/CartPanel.jsx` | No coupon/loyalty/wallet UI — only icon usage |
| `src/components/order-entry/OrderEntry.jsx` | Hosts `restaurantSettings` prop pass-through |
| `src/components/order-entry/CustomerModal.jsx` | Customer selection / search UI |
| `src/components/panels/settings/ViewEditViews.jsx` | Settings toggles for `isCoupon` / `isLoyalty` / `isCustomerWallet` |
| `src/api/services/customerService.js` | CRM customer reads (search/lookup/detail) |
| `src/api/crmAxios.js` | CRM axios instance + `X-API-Key` injection |
| `src/api/transforms/customerTransform.js` | Maps `wallet_balance`, `total_points`, `loyalty` blob |
| `src/api/transforms/profileTransform.js` | Maps `is_coupon`, `is_loyality`, `is_customer_wallet` flags |
| `src/api/transforms/orderTransform.js` | Emits `coupon_discount`, `coupon_title`, `coupon_type`, `used_loyalty_point`, `use_wallet_balance` in PLACE_ORDER / BILL_PAYMENT / print payloads |
| `src/api/constants.js` | Endpoint registry — confirms zero coupon/loyalty/wallet CRM endpoints |
| `src/components/credit/CreditClearanceModal.jsx` | Wallet icon used only as payment-method visual (unrelated) |

### 3.2 Search sweep results (read-only)

| Term | Files matched | Notable observation |
|------|---------------|---------------------|
| `FLAT50` / `SAVE10` | `CollectPaymentPanel.jsx` only | Hardcoded mock catalog at lines 644-647 — single source to remove |
| `coupon` | 11 files | All UI usage centralized in `CollectPaymentPanel.jsx`; payload fields in `orderTransform.js` only |
| `loyalty` | 9 files | UI in `CollectPaymentPanel.jsx`; balance via `customerTransform.js`; payload fields in `orderTransform.js` |
| `wallet` | 10 files | UI in `CollectPaymentPanel.jsx`; balance via `customerTransform.js`; `CreditClearanceModal.jsx` uses Wallet icon for UPI button (cosmetic, unrelated) |
| `used_loyalty_point` | `orderTransform.js` (lines 903, 1021, 1148, 1347) | Emitted in 4 payload builders |
| `loyalty_dicount_amount` (legacy misspelling) | `orderTransform.js` line 1756 | Print override only |
| `use_wallet_balance` | `orderTransform.js` (lines 904, 1022, 1149, 1348) | Same 4 payload builders |
| `wallet_used_amount` | `orderTransform.js` line 1757 | Print override only |
| `coupon_discount` / `coupon_title` / `coupon_type` | `orderTransform.js` (lines 898-900, 1013-1015, 1141-1143, 1336-1338) | All 4 payload builders |
| `coupon_code` | `orderTransform.js` line 1755 | Print override only |

**Conclusion:** All BUG-108 frontend touchpoints are concentrated in **one component (`CollectPaymentPanel.jsx`)** and **one transform (`orderTransform.js`)**. Settings flags (`profileTransform.js`) and CRM customer reads (`customerTransform.js`, `customerService.js`) are already live and do not need changes.

---

## 4. Current Mock vs Live State

### 4.1 Coupon — **FULLY MOCKED**

| Aspect | State |
|--------|-------|
| Catalog | Hardcoded `generalCoupons = [FLAT50, SAVE10]` at `CollectPaymentPanel.jsx:644-647` |
| Customer-targeted coupons | Schema slot `customer.coupons` referenced (`:649`) but never populated by `customerTransform.js` |
| Validation | Local string-match in `handleApplyCoupon` (`:639-664`) — no API call |
| Min-order rule | Local check (`foundCoupon.minOrder`) |
| Discount math | Local (`couponDiscount`, `:506-511`) |
| Settings flag | `restaurantSettings.isCoupon` — **live** (round-trips via profile API) |
| Visibility gate | `{customer && restaurantSettings?.isCoupon}` |
| Order payload | `coupon_discount`, `coupon_title`, `coupon_type`, `coupon_code` emitted to PLACE_ORDER / BILL_PAYMENT / print |

### 4.2 Loyalty — **READ LIVE, REDEEM MOCK**

| Aspect | State |
|--------|-------|
| `customer.loyaltyPoints` | **Live** — from CRM `total_points` |
| `customer.loyalty` blob | Mapped but unused by UI today |
| Ratio | **Hardcoded 1:1** in `loyaltyDiscount` (`:502-503`) |
| Redemption UX | Single "use all points" checkbox — no partial input |
| Redemption API | **None** — POS just emits `used_loyalty_point` in payload |
| Settings flag | `restaurantSettings.isLoyalty` — **live** |
| Visibility gate | `{customer && restaurantSettings?.isLoyalty}` |

### 4.3 Wallet — **READ LIVE, DEBIT MOCK**

| Aspect | State |
|--------|-------|
| `customer.walletBalance` | **Live** — from CRM `wallet_balance` |
| Apply UX | Checkbox + amount input (capped at balance) at `:1054-1059` |
| Debit math | Local (`walletDiscount`, `:513-515`) |
| Debit API | **None** — POS only emits `use_wallet_balance` in payload |
| Settings flag | `restaurantSettings.isCustomerWallet` — **live** |
| Visibility gate | `{customer && restaurantSettings?.isCustomerWallet}` |

---

## 5. Affected Screens / Components

| Letter | Screen / Component | Lines (current) | BUG-108 impact |
|--------|--------------------|-----------------|----------------|
| A | `CollectPaymentPanel.jsx` — Standard payment view | 969-1069 | All three sections (Coupon, Loyalty, Wallet) restructured |
| A' | `CollectPaymentPanel.jsx` — Room-service inline mirror | 1391-1500 | Same three sections — must stay in sync with A |
| B | Coupon Section inside A and A' | 970-1004 / 1432-1462 | Replace hardcoded catalog; add available-coupons list; add validation states |
| C | Loyalty Section inside A and A' | 1007-1031 / 1463-1477 | Switch from 1:1 ratio to per-tier ratio (or read-only until CRM ready) |
| D | Wallet Section inside A and A' | 1034-1069 / 1478-1500 | Disable debit input until CRM debit endpoint exists |
| E | `orderTransform.js` — Payload builders | 898-1149 + 1336-1348 + 1755-1757 | Payload safety: prevent mock values from leaking |
| F | `CustomerModal.jsx` | (entire) | **No change** — customer selection unaffected |
| G | `profileTransform.js` settings flags | 314-316 | **No change** — flags already correctly mapped |
| H | `ViewEditViews.jsx` settings panel | 280-290 | **No change** — owner can still toggle the feature on/off |

---

## 6. Proposed Frontend UX Plan

### 6.1 Coupon UI Plan

**Goal:** Replace hardcoded `FLAT50` / `SAVE10` with a CRM-driven, customer-entitled, validated coupon experience. Pre-API: section is **disabled** with clear messaging; **no mock values touch the bill**.

**Pre-CRM-API state (default until endpoints land):**
- Coupon section is **visible but disabled** (per recommended default; owner-confirmable via Q1).
- The "Enter code" input is disabled.
- The "Apply" button is disabled.
- Hardcoded `generalCoupons` array is removed; no codes can be matched locally.
- Helper text: *"Coupons are temporarily unavailable while we connect your CRM."*
- A subtle "info" icon next to the section title opens a tooltip explaining the dependency.

**Post-CRM-API state (after §3.1 and §3.2 of API Inventory ship):**
- On customer selection, frontend calls `GET /pos/coupons/available?customer_id=…&order_total=…`.
- A new **"Available Coupons" row** appears above the input — horizontally scrollable chips (one per coupon). Each chip shows `code` + `title` + a small "Apply" tap target.
- Manual entry input remains for codes not surfaced (e.g., one-time campaign codes). On Apply, frontend calls `POST /pos/coupons/validate`. Owner can choose to remove this manual-entry path via **Q2**.
- Successful validation: existing green confirmation row (`✓ FLAT50 (-₹50)` with Remove) — unchanged from today's UX, just sourced from a real response.
- Failed validation: inline red error using the typed `error.code` → friendly copy mapping (see §8).

**Empty state (CRM responds with `coupons: []`):**
- Available-coupons row is hidden.
- Manual-entry input remains active (if owner picks Q2=A).
- Helper text: *"No coupons available for this customer right now."*

### 6.2 Loyalty UI Plan

**Goal:** Show live points + tier as **read-only context**; redemption stays disabled until ratio API (per-tier, Q3=d in owner decisions) is live.

**Pre-CRM-API (no per-tier ratio yet):**
- Section is **visible**, points balance shown, but the "Use Loyalty" checkbox is **disabled**.
- Tier badge shown next to the points count (data already comes from `customer.tier`).
- Helper text: *"Redemption rate is being synced from your loyalty configuration."*

**Post-CRM-API (Option A — `customer.loyalty` blob carries `ratio_per_point`):**
- Checkbox becomes enabled.
- Computed redemption amount displays using `points * ratio_per_point` (rounded to ₹).
- Optional: small `?` tooltip showing *"{tier} member — ₹{ratio} per point"*.

**Mocked redemption removed:** The 1:1 hardcoded math (`loyaltyDiscount = Math.min(loyaltyPoints, …)` at line 502-503) is the source of the mock. Until CRM ratio is live, `loyaltyDiscount` is forced to `0` regardless of UI state (see §10 payload safety).

### 6.3 Wallet UI Plan

**Goal:** Show live wallet balance as **read-only context**; wallet usage stays disabled until the debit/credit lifecycle CR ships (Q4 deferred).

**Pre-debit-API (current state for BUG-108):**
- Section is **visible**, wallet balance shown read-only.
- "Use Wallet" checkbox is **disabled**.
- Amount input is hidden.
- Helper text: *"Wallet payments will be available after the next update."*

**Post-debit-API (future CR — out of BUG-108 scope):**
- Checkbox enabled; amount input appears with cap-to-balance behavior (same as today).
- Reservation / commit semantics defined by the future CR.

### 6.4 Payload Safety Plan (see §10 for full detail)

Until each CRM endpoint is **live and validated**, the corresponding payload fields are **forced to safe zeros / empty strings** by `orderTransform.js`. UI state changes alone must not be able to leak mock values into PLACE_ORDER / BILL_PAYMENT / print payloads.

---

## 7. Screen-by-Screen Layout Description

### 7.1 Collect Bill / Payment Panel — Standard View (lines 969-1069)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Manual Discount Section            [unchanged]          │
├─────────────────────────────────────────────────────────────┤
│  2. 🎫 Coupon                                  [PLANNED]    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [PRE-API]  Available coupons row: HIDDEN               │ │
│  │            Input: DISABLED                             │ │
│  │            Apply button: DISABLED                      │ │
│  │            Helper: "Coupons temporarily unavailable…"  │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ [POST-API] Available coupons row: [FLAT50] [VIP10] …   │ │
│  │            Input: enabled (if Q2=A or B)               │ │
│  │            Apply → POST /pos/coupons/validate          │ │
│  │            Inline error (red, ~12px) under input       │ │
│  │            Selected coupon: ✓ FLAT50 (-₹50) [Remove]   │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  3. ⭐ Loyalty  (480 pts • Gold)               [PLANNED]    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [PRE-API]  Checkbox: DISABLED                          │ │
│  │            Right column: "₹480 available (rate sync…)" │ │
│  │            Helper (small, gray): "Redemption rate…"    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ [POST-API] Checkbox: enabled                           │ │
│  │            Right column: "-₹720" when checked          │ │
│  │            Tooltip: "Gold member — ₹1.5 per point"     │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  4. 💰 Wallet  (₹1,200)                        [PLANNED]    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [PRE-API]  Checkbox: DISABLED                          │ │
│  │            Amount input: HIDDEN                        │ │
│  │            Helper: "Wallet payments coming soon."      │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ [POST-API] Same as current UX (out of BUG-108 scope)   │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  5. Service Charge / Tip / Round-off    [unchanged]         │
├─────────────────────────────────────────────────────────────┤
│  Grand Total + Pay button               [unchanged]         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Collect Bill / Payment Panel — Room-Service Inline Mirror (lines 1391-1500)

Same three sections (Coupon / Loyalty / Wallet) rendered in a tighter inline layout. **Identical behavior to §7.1** — must update both code paths in lockstep during implementation. (Implementation note: consider extracting these into shared sub-components in 108-P1 to avoid drift.)

### 7.3 What's visible when (decision flowchart)

| Trigger | Coupon Section | Loyalty Section | Wallet Section |
|---------|----------------|-----------------|----------------|
| No customer selected | Hidden | Hidden | Hidden |
| Customer selected, settings flag OFF | Hidden | Hidden | Hidden |
| Customer selected, settings flag ON, CRM unreachable | Visible, all controls disabled, "CRM unavailable" badge | Visible, balance only (cached from last fetch), checkbox disabled | Visible, balance only, checkbox disabled |
| Customer selected, settings flag ON, CRM reachable, BUG-108 not yet shipped | Visible, all controls disabled, "Coming soon" helper | Visible, points/tier, checkbox disabled, helper | Visible, balance, checkbox disabled, helper |
| Customer selected, settings flag ON, BUG-108 P1+P2 shipped, redemption CR not shipped | Available list + manual entry enabled; validation works | Points/tier read-only; checkbox **enabled** if Q3 ratio API is live; **disabled** otherwise | Read-only balance; checkbox disabled (debit CR pending) |
| Customer selected, all CRs shipped | Full functionality | Full functionality | Full functionality |

---

## 8. Tooltip and Copy Table

All copy is cashier-facing, short, neutral, in **English**. No emojis in copy strings (existing 🎫/⭐/💰 in section titles are preserved as section icons, not copy).

| Context | Copy (final, cashier-facing) | Visual |
|---------|-------------------------------|--------|
| Coupon — pre-API (section disabled) | "Coupons are temporarily unavailable. We're connecting your CRM." | Small gray text below input, italic |
| Coupon — info tooltip | "Coupon support is part of the upcoming CRM integration. Available codes will appear here automatically once your CRM is connected." | Tooltip on `?` icon |
| Coupon — no coupons for this customer | "No coupons available for this customer right now." | Gray helper text |
| Coupon — validation pending (in-flight) | "Checking…" | Spinner inline with Apply button |
| Coupon — applied successfully | "Applied: {code} (-₹{amount})" | Existing green confirmation row |
| Coupon error — `INVALID_CODE` | "Invalid coupon code." | Red inline |
| Coupon error — `EXPIRED` | "This coupon has expired." | Red inline |
| Coupon error — `MIN_ORDER_NOT_MET` | "Minimum order of ₹{min} required for this coupon." | Red inline |
| Coupon error — `NOT_ENTITLED` | "This coupon isn't available for this customer." | Red inline |
| Coupon error — `ALREADY_USED` | "This coupon has already been used." | Red inline |
| Coupon error — `INACTIVE` | "This coupon is no longer active." | Red inline |
| Coupon error — generic / network | "Couldn't apply coupon. Please try again." | Red inline |
| Loyalty — points available but redeem disabled (ratio pending) | "Redemption rate is being synced — points will be usable shortly." | Gray helper below the row |
| Loyalty — no points | "No loyalty points available." | Gray text in right column (existing) |
| Loyalty — tooltip on `?` next to tier | "{tier} member — ₹{ratio} per point" | Tooltip |
| Wallet — balance available but usage disabled | "Wallet payments will be available after the next update." | Gray helper |
| Wallet — no balance | (no text — existing behavior) | — |
| CRM unavailable banner (whole section) | "Customer perks unavailable — CRM is offline. Order can still be collected." | Yellow strip at top of Coupon/Loyalty/Wallet block |

---

## 9. CRM API Dependency Table

| UI Action | API Required | Current Status | Frontend Fallback | State |
|-----------|--------------|----------------|-------------------|-------|
| Show available coupons list | `GET /pos/coupons/available` (CRM) | Pending CRM | Hide row; helper text | Disabled |
| Apply coupon (button click) | `POST /pos/coupons/validate` (CRM or POS-BE — owner Q1=a; TBD which team owns validate) | Pending | Disable Apply button; no local matching | Disabled |
| Final-checkout coupon re-validation | Same `POST /pos/coupons/validate` (called by POS backend at PLACE_ORDER) | Pending | POS backend rejects coupons gracefully if its own check fails | N/A (backend) |
| Show loyalty redemption amount | Per-tier ratio via `GET /pos/customers/{id}.loyalty` (Option A) | Pending CRM | Show points + tier read-only; do not compute redemption ₹ | Read-only |
| Redeem loyalty (checkbox toggle commits) | Future redemption CR (out of BUG-108) | Deferred | Checkbox disabled with helper | Disabled |
| Show wallet balance | `POST /pos/customer-lookup` / `GET /pos/customers/{id}` | **LIVE** | — | Read-only |
| Debit wallet (checkbox toggle commits) | `POST /pos/wallet/debit` (future CR) | Deferred | Checkbox disabled with helper | Disabled |
| Reverse wallet / loyalty / coupon on cancel | None (per owner Q5 — CRM only sees settled orders) | N/A | N/A | N/A |
| ROI tracking for coupons | Separate ticket `108-ROI` | Pending | None | Future |

---

## 10. Payload Safety Plan

**Principle:** Until each CRM endpoint is live and verified, the corresponding fields in PLACE_ORDER / BILL_PAYMENT / print payloads must be **forced to safe zeros / empty strings** at the transform layer, regardless of UI state. UI changes alone must not be capable of leaking mock values into payloads.

### 10.1 Coupon fields

| Payload field | Pre-API value | Post-API value |
|---------------|---------------|----------------|
| `coupon_discount` | **`0`** (forced in `orderTransform.js`) | `couponDiscount` from validated apply |
| `coupon_title` | **`""`** | `selectedCoupon.code` |
| `coupon_type` | **`""`** | `selectedCoupon.type` |
| `coupon_code` (print) | **`""`** | `selectedCoupon.code` |

**Rule:** Frontend will not emit a coupon discount unless the validate API returned a success response within the current session. Local matching is removed.

### 10.2 Loyalty fields

| Payload field | Pre-API (per-tier ratio not live) value | Post-API value |
|---------------|------------------------------------------|----------------|
| `used_loyalty_point` | **`0`** (forced) | `loyaltyDiscount` (₹) computed from `points * ratio_per_point` |
| `loyalty_dicount_amount` (legacy misspelling, print only) | **`0`** | Same as above |

**Rule:** Even if the cashier somehow toggles a Loyalty checkbox (e.g., from a stale render), the payload emits `0`. UI must keep the checkbox disabled.

### 10.3 Wallet fields

| Payload field | Pre-API (debit endpoint not live) value | Post-API value |
|---------------|------------------------------------------|----------------|
| `use_wallet_balance` | **`0`** (forced) | `walletDiscount` |
| `wallet_used_amount` (print only) | **`0`** | Same |

**Rule:** Same defense-in-depth as Loyalty. Debit cannot be silently committed via the order payload.

### 10.4 Implementation guard (proposed for P1)

A single module-level feature-flag set (e.g., `BUG108_FLAGS = { couponLive: false, loyaltyRatioLive: false, walletDebitLive: false }`) read by both `CollectPaymentPanel.jsx` and `orderTransform.js`:
- UI uses it to enable/disable controls.
- Transform uses it to short-circuit payload fields to zero/empty when the corresponding flag is `false`.

This is the simplest way to prevent UI / payload drift during the phased rollout. Final placement of the flag set (env var vs. profile-API response vs. hardcoded constants) to be confirmed during P1 — owner can call this out in S2 if a specific source is required.

---

## 11. Owner Questions

Please tick **one** option per question. Notes column is optional.

### Q1. Until CRM coupon APIs are live, coupon UI should be:

- [ ] **(A) Hidden completely** — most defensive; cashier sees no coupon affordance at all
- [ ] **(B) Visible but disabled with tooltip** — keeps muscle memory; signals "coming soon" ← **Recommended**
- [ ] **(C) Visible only in admin/dev mode** — internal beta gating
- [ ] **(D) Keep current fake coupons (FLAT50/SAVE10) temporarily** — **NOT recommended** (silent discounting, no audit, no entitlement check)

Owner notes: _______________________________

### Q2. Manual coupon code entry:

- [ ] **(A) Allow only after validate API exists** ← **Recommended**
- [ ] (B) Allow now but disabled
- [ ] (C) Do not allow manual entry; only show CRM available coupons (list-only UX)
- [ ] (D) Owner decides later

Owner notes: _______________________________

### Q3. Coupon list placement:

- [ ] **(A) Inside Collect Bill payment panel** (current location) ← **Recommended**
- [ ] (B) Separate expandable section inside payment panel
- [ ] (C) Modal opened from "Apply Coupon" button
- [ ] (D) Other (specify): _______________________________

Owner notes: _______________________________

### Q4. Coupon validation errors should show:

- [ ] (A) Inline only
- [ ] (B) Toast only
- [ ] **(C) Inline + toast** — inline for context, toast for missed attention ← **Recommended**
- [ ] (D) Generic error only

Owner notes: _______________________________

### Q5. Loyalty before redemption API exists:

- [ ] (A) Show points/tier read-only only
- [ ] **(B) Show redemption input disabled** (current section visible, checkbox disabled with helper text) ← **Recommended**
- [ ] (C) Hide loyalty section
- [ ] (D) Keep current mocked redemption — **NOT recommended** (silent points "consumption")

Owner notes: _______________________________

### Q6. Wallet before debit API exists:

- [ ] (A) Show balance read-only only
- [ ] **(B) Show use-wallet input disabled** (balance visible, checkbox disabled with helper text) ← **Recommended**
- [ ] (C) Hide wallet section
- [ ] (D) Keep current mocked debit — **NOT recommended** (silent debits, accounting drift)

Owner notes: _______________________________

### Q7. If CRM unavailable (network / 5xx):

- [ ] (A) Hide coupon/loyalty/wallet sections
- [ ] **(B) Show disabled sections with "CRM unavailable" banner** ← **Recommended**
- [ ] (C) Show cached data if available
- [ ] (D) Block collect bill — **NOT recommended** (cash sales must always work)

Owner notes: _______________________________

### Q8. Phase 1 frontend implementation after approval should include:

- [ ] (A) UI cleanup only (remove FLAT50/SAVE10, force payload zeros)
- [ ] (B) UI cleanup + disabled planned sections
- [ ] **(C) UI cleanup + read-only loyalty/wallet display + disabled coupon section + payload safety guards** ← **Recommended**
- [ ] (D) Wait until APIs are live

Owner notes: _______________________________

---

## 12. Recommended Safe Default Bundle

If the owner wants a single, batchable recommendation:

> **Q1=B, Q2=A, Q3=A, Q4=C, Q5=B, Q6=B, Q7=B, Q8=C.**

This bundle:
- Removes the `FLAT50`/`SAVE10` hardcoded catalog (no silent discounts).
- Keeps the three sections visible but with controls disabled (preserves cashier muscle memory and signals "coming soon").
- Forces all coupon/loyalty/wallet payload fields to zero at the transform layer (defense-in-depth).
- Shows loyalty points + tier read-only and wallet balance read-only (live CRM data is already available).
- Builds a UI shell ready to "light up" each control progressively as CRM endpoints arrive, with no further UI work needed for each phase — just flag flips.

---

## 13. Implementation Readiness Verdict

**Frontend UI implementation is NOT ready until the owner approves Q1-Q8 in §11.**

**Real CRM API wiring is BLOCKED until CRM endpoints listed in `POS3_0_BUG_108_API_INVENTORY_FOR_CRM_2026_05_22.md` are live.**

What can start immediately upon owner approval of Q1-Q8 (recommended bundle in §12):
1. Remove hardcoded `generalCoupons` from `CollectPaymentPanel.jsx`.
2. Wire `BUG108_FLAGS` (or equivalent) and disable affected controls in both standard and room-service inline views.
3. Add helper-text copy and tooltips from §8.
4. Force payload-safety zeros in `orderTransform.js` per §10.

What is blocked on CRM endpoints (no frontend work possible yet):
- Real coupon catalog rendering.
- Validate-on-apply call.
- Per-tier loyalty ratio math.

---

## 14. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No frontend code was changed in this session | ✅ Confirmed |
| 2 | No backend code was changed | ✅ Confirmed |
| 3 | No data was mutated | ✅ Confirmed |
| 4 | No APIs were invoked | ✅ Confirmed |
| 5 | `/app/memory/final/` was not edited (the directory does not exist in this environment; see §2.1) | ✅ Confirmed |
| 6 | Baseline overlay docs (`change_requests/BASELINE_*`, `FINAL_ACCEPTANCE_*`, `PENDING_*`, `BACKEND_FIELD_UNPARK_*`) were not edited | ✅ Confirmed (none were found, none were created) |

---

**End of BUG-108 Frontend UX Planning & Owner Approval.**

---

## 15. Owner Answers Captured (2026-05-22, post-baseline-recovery)

Owner has signed off on Q1-Q8. Full, locked answers + final copy strings recorded in companion doc:

📄 **`POS3_0_BUG_108_FINAL_OWNER_APPROVALS_2026_05_22.md`**

Quick summary:

| Q | Owner Answer | Notable deviation from ★ recommendation |
|---|--------------|------------------------------------------|
| Q1 | **B** | Custom copy: **"Coming soon"** |
| Q2 | **A** | — |
| Q3 | **A** | — |
| Q4 | **A** (Inline only) | Owner chose simpler UX over my C (Inline + toast) |
| Q5 | **B** | — |
| Q6 | **B** | — |
| Q7 | **B** | Custom banner copy: **"loyalty program unavailable"** |
| Q8 | **C** | Full ★ scope confirmed |

The Q1-Q8 framing in §11 above remains the authoritative explanation of each option. The "Owner Answers" companion doc captures the chosen letters + locked copy strings for implementation handoff.
