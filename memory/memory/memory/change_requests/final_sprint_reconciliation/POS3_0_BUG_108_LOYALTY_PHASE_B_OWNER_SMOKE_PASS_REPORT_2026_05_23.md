# POS 3.0 BUG-108 Loyalty Phase B + CustomerModal — Owner Smoke Pass Report

**Date:** 2026-05-23
**Sprint:** POS 3.0 Final Reconciliation
**Live environment:** `jehsnest` (owner@jehsnest.com)
**Owner verdict:** **PASSED**

---

## 1. Final Status

```
bug_108_loyalty_phase_b_customer_pipeline_and_modal_search_owner_smoke_passed
```

This closes the BUG-108 Loyalty Phase B sprint thread end-to-end (Phase B Read-Only Preview → Owner Smoke Defect → Customer Pipeline Fix → CustomerModal Search Parity → Option C Member-ID Hide → Live Owner Smoke).

---

## 2. Live Environment

| Item | Value |
|------|-------|
| Restaurant | `jehsnest` |
| Login | `owner@jehsnest.com` |
| Date / Time of owner smoke | 2026-05-23 (Owner-confirmed) |
| Bundle in test | `main.0424a192.js` (post Option C, 473.41 kB gzip) |
| CRM connectivity | Live (preprod.mygenie.online + mygenie-crm-build-3) |

---

## 3. Scope Passed (verbatim from owner)

| # | Scope item | Owner verdict |
|---|-----------|---------------|
| 1 | Loyalty Phase B read-only preview (tier badge, points, `₹X available`, helper text, disabled checkbox) | PASS |
| 2 | Loyalty customer pipeline fix — Sapna/customer loyalty data no longer stuck at `0 pts` / "Loyalty program unavailable" | PASS |
| 3 | CustomerModal Name search (≥2 chars typeahead → dropdown → pick auto-fills) | PASS |
| 4 | CustomerModal Phone search (≥3 digits typeahead → dropdown → pick auto-fills) | PASS |
| 5 | Customer selection preserves CRM loyalty fields (tier, totalPoints, pointsValue, walletBalance, synthetic loyalty blob) | PASS |
| 6 | Member ID visual behavior accepted (Option C — hidden when auto-derived, visible only on explicit search) | PASS |
| 7 | Loyalty remains preview-only — checkbox/action disabled | PASS |
| 8 | Total / tax / payable unchanged by loyalty preview | PASS |
| 9 | Coupon section unchanged ("Coming soon" / disabled) | PASS |
| 10 | Wallet section unchanged (read-only / disabled) | PASS |

---

## 4. Original Defect Resolution

**Original defect (owner-reported 2026-05-23 ~15:40 IST):**
Sapna `9004020412` (86 points in CRM, Bronze tier) showed `Loyalty (0 pts) / No points / Loyalty program unavailable` on the Collect Bill screen.

**Root cause (per investigation 2026-05-23):**
Three independent customer-entry paths (CartPanel typeahead, OrderEntry order-restore, CartPanel manual blur, CustomerModal save) each independently stripped loyalty fields before they reached CollectPaymentPanel.

**Fix delivered:**
- `customerTransform.js` — `buildSyntheticLoyalty` shared helper; `searchResult` now returns `pointsValue` + synthetic `loyalty` blob; `customerLookup` calls the same helper.
- `CartPanel.jsx` — `handleFieldBlur` merge-preserves loyalty instead of overriding.
- `OrderEntry.jsx` — both order-restore branches (savedCart + orderData) fire-and-forget `lookupCustomer(phone)` and merge loyalty fields into state.
- `CustomerModal.jsx` — added Name/Phone typeahead (CartPanel parity); `handleSave` reads loyalty from a 3-tier source chain (`selectedCRMCustomer` → `initialData` → `existing`); Member ID auto-derived hide (Option C).

**Owner confirmation:** Sapna's loyalty now renders correctly across all entry paths. Defect **CLOSED**.

---

## 5. Loyalty Remains Preview-Only — Confirmed

| Aspect | State |
|--------|-------|
| Loyalty checkbox / redemption action | **Disabled** (`cursor-not-allowed`) |
| `BUG108_FLAGS.loyaltyRatioLive` | `false` (unchanged) |
| `BUG108_FLAGS.loyaltyPreviewLive` | `true` (unchanged) |
| Preview math (`previewAmount`) | Display-only — never enters any payload builder |
| Helper text (data present) | "Redemption will be enabled in a future update." |
| Helper text (no data / disabled / 0 pts) | "Loyalty program unavailable" / "No points" |

## 6. No Redemption Enabled — Confirmed

| Endpoint | State |
|----------|-------|
| `loyalty/redeem` | **NOT WIRED** — no reference in `src/api/` |
| `loyalty/reverse` | **NOT WIRED** — no reference in `src/api/` |
| Place-order / Bill-payment loyalty fields | Force-zero (see §7) |

## 7. Payload Safety — Confirmed

| Field | Value | Guard |
|-------|-------|-------|
| `used_loyalty_point` | `0` | Hardcoded zeros at `orderTransform.js:908, 1026, 1153, 1356`; `loyaltyRatioLive ? … : 0` ternary |
| `loyalty_dicount_amount` | `0` | `loyaltyRatioLive ? … : 0` ternary at `orderTransform.js:1768` |
| `loyaltyDiscount` (math) | `0` | `CollectPaymentPanel.jsx:507` short-circuit |
| Preview value in payload | **NOT SENT** | Lives only in JSX scope |

`orderTransform.js` was **not modified** in any BUG-108 CR (Phase B, Customer Pipeline Fix, Search Parity, Option C). All force-zero guards intact.

## 8. Total / Tax / Payable Unchanged — Confirmed

- Grand total formula in `CollectPaymentPanel.jsx` unchanged.
- Tax / GST / VAT computation unchanged (no edits to relevant files).
- Service charge + delivery charge logic unchanged.
- Manual discount math unchanged (`CollectPaymentPanel.jsx:503-505`).
- Owner confirmed live: bill totals identical with or without loyalty preview populated.

## 9. Coupon Unchanged — Confirmed

- `BUG108_FLAGS.couponLive = false` (unchanged).
- "Coming soon" pill + disabled state intact.
- No coupon API wired.

## 10. Wallet Unchanged — Confirmed

- `BUG108_FLAGS.walletDebitLive = false` (unchanged).
- Wallet section read-only / disabled.
- No wallet debit logic added.

## 11. Confirmations

| # | Confirmation | Status |
|---|--------------|--------|
| 1 | No backend changed across all BUG-108 CRs | Confirmed |
| 2 | No data mutated | Confirmed |
| 3 | No redemption / reverse API invoked | Confirmed |
| 4 | No payment / settlement / print / socket changes | Confirmed |
| 5 | `/app/memory/final/` untouched | Confirmed |
| 6 | Baseline docs untouched | Confirmed |
| 7 | `orderTransform.js` not modified in any BUG-108 CR | Confirmed |
| 8 | `CollectPaymentPanel.jsx` not modified in any BUG-108 CR (only Phase B added loyalty section which was already in place) | Confirmed |
| 9 | Loyalty flags unchanged — `loyaltyPreviewLive=true`, `loyaltyRatioLive=false`, `couponLive=false`, `walletDebitLive=false` | Confirmed |

---

## 12. Remaining BUG-108 Backlog (parked / future CRs)

| Item | Priority | Reason for parking |
|------|----------|---------------------|
| **Loyalty Phase C — real redemption** | P1 (next phase) | Will flip `loyaltyRatioLive` to `true`, wire `loyalty/redeem` + `loyalty/reverse` endpoints, enable checkbox, route `used_loyalty_point` + `loyalty_dicount_amount` through the payload force-zero guards (or remove them). Owner re-approval required before flip. |
| **Coupon API integration** | P1 | Separate CR — `couponLive` flip + `GET /pos/coupons/available` + `POST /pos/coupons/validate` |
| **Wallet integration** | P1 | Separate CR — `walletDebitLive` flip + wallet debit/reverse endpoints |
| **Dead-code cleanup** | P3 | `data/mockCustomers.js` `searchCustomers` mock; `data/index.js` re-export; legacy `customer?.loyaltyPoints` (singular) read at `CollectPaymentPanel.jsx:507`; Member ID field potential rename ("Customer ID"). Parked per owner Q1=A in Customer Pipeline Fix approval. |
| **CustomerModal birthday/anniversary auto-fill from CRM** | P3 | `searchResult` transform does not return these; would require CRM endpoint extension. Owner can edit manually today. |
| **CRM-search restaurant scoping audit** | P3 | Confirm `GET /pos/customers?search=` returns restaurant-scoped totals matching the CRM admin view. Defer until any discrepancy is reported. |

---

## 13. CR Trail (for traceability)

| Phase | Doc |
|-------|-----|
| Phase B Read-Only Preview Implementation | `POS3_0_BUG_108_LOYALTY_PHASE_B_IMPLEMENTATION_REPORT_2026_05_23.md` |
| Phase B QA Handoff | `POS3_0_BUG_108_LOYALTY_PHASE_B_QA_HANDOFF_2026_05_23.md` |
| Phase B Agent Smoke | `POS3_0_BUG_108_LOYALTY_PHASE_B_AGENT_SMOKE_REPORT_2026_05_23.md` |
| Phase B Owner Live Verification Steps | `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_LIVE_VERIFICATION_STEPS_2026_05_23.md` |
| Owner Smoke Defect Investigation (Sapna) | `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_DEFECT_INVESTIGATION_2026_05_23.md` |
| Customer Pipeline Fix Plan | `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_PLAN_2026_05_23.md` |
| Customer Pipeline Fix Owner Approval | `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_OWNER_APPROVAL_2026_05_23.md` |
| Customer Pipeline Fix Implementation | `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_IMPLEMENTATION_REPORT_2026_05_23.md` |
| Customer Pipeline Fix QA Handoff | `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_QA_HANDOFF_2026_05_23.md` |
| Customer Pipeline Fix Agent Re-Smoke | `POS3_0_BUG_108_LOYALTY_CUSTOMER_PIPELINE_FIX_AGENT_RESMOKE_REPORT_2026_05_23.md` |
| CustomerModal Search Parity Plan | `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_PLAN_2026_05_23.md` |
| CustomerModal Search Parity Implementation | `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_IMPLEMENTATION_REPORT_2026_05_23.md` |
| CustomerModal Search Parity QA Handoff | `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_QA_HANDOFF_2026_05_23.md` |
| CustomerModal Search Parity Agent Smoke | `POS3_0_BUG_108_CUSTOMER_MODAL_SEARCH_PARITY_AGENT_SMOKE_REPORT_2026_05_23.md` |
| **This — Owner Smoke Pass closure** | `POS3_0_BUG_108_LOYALTY_PHASE_B_OWNER_SMOKE_PASS_REPORT_2026_05_23.md` |

---

## 14. Files Modified Across All BUG-108 CRs (cumulative summary)

| File | CRs that touched it |
|------|---------------------|
| `src/utils/BUG108_FLAGS.js` | Phase B (added `loyaltyPreviewLive`, `loyaltyPreviewHelper`) |
| `src/api/transforms/customerTransform.js` | Phase B (added synthetic loyalty in `customerLookup`), Customer Pipeline Fix (added `buildSyntheticLoyalty` shared helper + enriched `searchResult`) |
| `src/components/order-entry/CartPanel.jsx` | Phase B (forward loyalty fields in `selectCustomer`), Customer Pipeline Fix (`handleFieldBlur` merge instead of override) |
| `src/components/order-entry/CollectPaymentPanel.jsx` | Phase B (loyalty section display update — read-only preview) |
| `src/components/order-entry/OrderEntry.jsx` | Customer Pipeline Fix (fire-and-forget `lookupCustomer` enrichment in both order-restore branches) |
| `src/components/order-entry/CustomerModal.jsx` | Customer Pipeline Fix (loyalty forwarding in `handleSave`), Search Parity (Name + Phone typeahead), Option C (Member ID auto-derived hide) |

**Files NOT touched (cumulative across all BUG-108 CRs):** `src/api/transforms/orderTransform.js`, backend, coupon files, wallet files, payment/tax/total files, print files, settlement files, socket files.

---

**End of BUG-108 Loyalty Phase B + CustomerModal Owner Smoke Pass Report.**
