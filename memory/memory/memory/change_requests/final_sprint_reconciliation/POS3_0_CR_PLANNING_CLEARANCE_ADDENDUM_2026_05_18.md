# POS3.0 CR Planning Clearance Addendum — 2026-05-18

## 1. Purpose

This document clears CR planning questions from the POS3.0 CR Master Planning document before implementation planning. Owner answers were captured CR-by-CR to unblock ready items and classify deferred items.

No code was changed. No QA was run. No `/app/memory/final/` was updated. No baseline docs were updated.

---

## 2. Source Docs Read

1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md`
2. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md`
3. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md`
4. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md`

---

## 3. CR Review Summary

| CR | Previous Status | Owner Answered? | Backend/API Needed? | CRM Docs Needed? | Updated Status |
|---|---|---|---|---|---|
| BUG-099 | ready_for_cr_planning | Yes — 3/3 questions answered | No | No | **ready_for_implementation_planning** |
| BUG-098 | backend_docs_needed | Yes — 3/3 questions answered (owner knows backend contract) | No (cleared) | No | **ready_for_implementation_planning** |
| BUG-106 | crm_api_docs_needed | Yes — 3/3 questions answered | No | No (notes in existing customer response) | **ready_with_constraints** |
| BUG-107 | crm_api_docs_needed | Partial — data confirmed available | No | Yes — CRM team must provide endpoint | **crm_api_docs_needed** |
| BUG-108 | crm_api_docs_needed | Parked by owner | No | Deferred | **defer_p2** |
| BUG-096 | backend_docs_needed | Parked by owner | Yes — backend to provide socket event names | No | **defer_p2** |
| BUG-097 | backend_docs_needed | Parked by owner | Yes — backend to provide API docs | No | **defer_p2** |
| BUG-104 | xl_module_scope_session_needed | Parked by owner | Deferred | No | **defer_p2** |
| BUG-105 | xl_module_scope_session_needed | Parked by owner | Deferred | No | **defer_p2** |

---

## 4. Owner Answers Captured

| Question ID | CR | Owner Answer | Planning Impact |
|---|---|---|---|
| OQ-CR-01 | BUG-099 | **A — Restaurant-profile toggle** (admin enables "QSR mode" per restaurant) | QSR mode gated by profile flag. Backend must add boolean to profile. |
| OQ-CR-02 | BUG-099 | **Billing completes at order screen itself.** No loyalty/special discounts in QSR mode. UX details to be finalized later. Screenshot provided showing current "Place Order" + "Collect Bill ₹863" side-by-side layout. | In QSR mode, "Collect Bill" button pays directly at order screen — no navigation to full CollectPaymentPanel. Loyalty/coupon/wallet/special discounts stripped in QSR mode. |
| OQ-CR-03 | BUG-099 | **Use Collect Bill API** — "Collect Bill actually pays bill instead of moving to next screen." | Flow: Place Order → then "Collect Bill" calls the collect bill API inline with payment method selection — does NOT open the full CollectPaymentPanel. Existing `collectBillExisting` transform is the payload builder. |
| BQ-CR-09 | BUG-098 | **A — Yes, CRM key is in the LOGIN response** (not profile API). | CRM token available immediately after login. `crmAxios.js` can be initialized from login response, not profile bootstrap. |
| BQ-CR-10 | BUG-098 | **Field name: `crm_token`** | FE reads `crm_token` from login API response. |
| BQ-CR-11 | BUG-098 | **No fallback — clean code.** Remove env-based CRM key mapping entirely. | Delete `REACT_APP_CRM_API_KEYS` env usage, `CRM_API_KEYS` parsing, and restaurant-key map lookup from `crmAxios.js`. Replace with single `crm_token` from login. |
| CQ-CR-01 | BUG-106 | **B — Notes included in existing customer detail/lookup response.** Validate keys at runtime. | No new CRM endpoint needed. FE reads note fields from existing customer object. Defensive key checking required. |
| CQ-CR-02 | BUG-106 | **A — Read-only from POS.** | Display only — no write-back to CRM. Simpler implementation. |
| CQ-CR-06-UI | BUG-106 | **Order notes in order modal, item notes in item modal.** Suggestion/insights UX to discuss later. | Notes displayed in their respective modals — not a separate panel. |
| CQ-CR-03 | BUG-107 | **CRM team will provide endpoint.** Not yet available. | Remains blocked on CRM team. |
| CQ-CR-04 | BUG-107 | **All data points available** (favorites, last order, last visit, frequency, avg order value). CRM team can expose as needed. | Data confirmed available — just needs API exposure. |
| CQ-CR-107-UX | BUG-107 | **One-tap add-to-cart: decide later** after UX discussion. | UX deferred. |
| — | BUG-108 | **Parked — P2 priority.** Take after other CRs are done. | Entire CR deferred. No questions asked. |
| — | BUG-096 | **Parked — P2 priority.** Backend to provide socket event names. | Entire CR deferred. Questions forwarded to backend team. |
| — | BUG-097 | **Parked — P2 priority.** Backend to provide API docs. | Entire CR deferred. Questions forwarded to backend team. |
| — | BUG-104 | **Parked — P2 priority.** | Entire CR deferred. Scope session later. |
| — | BUG-105 | **Parked — P2 priority.** | Entire CR deferred. Scope session later. |

---

## 5. Backend/API Questions Still Open

| Question ID | CR | Question | Required Evidence | Blocks |
|---|---|---|---|---|
| BQ-CR-01 | BUG-096 (P2 parked) | What are the socket event names for menu item add/update? | Socket event catalog | BUG-096 (when un-parked) |
| BQ-CR-02 | BUG-096 (P2 parked) | What is the payload shape for menu update events? | Event payload example | BUG-096 (when un-parked) |
| BQ-CR-03 | BUG-096 (P2 parked) | Are hold/unpaid orders covered by existing order socket events? | Socket event mapping | BUG-096 (when un-parked) |
| BQ-CR-04 | BUG-097 (P2 parked) | What is the dispatch API endpoint and payload? | API docs | BUG-097 (when un-parked) |
| BQ-CR-05 | BUG-097 (P2 parked) | What is the list-assignable-users API endpoint? | API docs | BUG-097 (when un-parked) |
| BQ-CR-06 | BUG-097 (P2 parked) | What is the assign-delivery-boy API endpoint and payload? | API docs | BUG-097 (when un-parked) |
| BQ-CR-07 | BUG-097 (P2 parked) | What payload does each delivery API expect? | Payload schema | BUG-097 (when un-parked) |
| BQ-CR-08 | BUG-097 (P2 parked) | What response/socket event confirms dispatch/assignment success? | API response shape | BUG-097 (when un-parked) |
| BQ-CR-12 | BUG-104 (P2 parked) | What backend APIs exist or need to be built for credit management? | API catalog | BUG-104 (when un-parked) |
| BQ-CR-13 | BUG-105 (P2 parked) | What backend APIs exist or need to be built for settlement? | API catalog | BUG-105 (when un-parked) |

**Note:** BQ-CR-09/10/11 (BUG-098) are now **CLEARED** — owner provided all answers.

---

## 6. CRM Questions Still Open

| Question ID | CR | Question | Required Evidence | Blocks |
|---|---|---|---|---|
| CQ-CR-03 | BUG-107 | What CRM API endpoints provide customer behavior data (favorites, history, frequency)? | Endpoint paths + response shapes | BUG-107 implementation |
| CQ-CR-04 | BUG-107 | Which specific data points to expose in the endpoint? | Data catalog + field names | BUG-107 scope |
| CQ-CR-05 to CQ-CR-13 | BUG-108 (P2 parked) | All coupon/loyalty/wallet API questions | Full endpoint documentation | BUG-108 (when un-parked) |

**Note:** CQ-CR-01/02 (BUG-106) are now **CLEARED** — notes are in existing customer response.

---

## 7. Missing Docs Still Needed

| CR | Missing Doc | Why Needed | Blocks |
|---|---|---|---|
| BUG-107 | CRM Customer Insights API endpoint documentation | FE needs endpoint path and response shape to build insights panel | BUG-107 implementation |
| BUG-096 (P2) | Backend socket event catalog for menu updates | Deferred — needed when CR is un-parked | BUG-096 |
| BUG-097 (P2) | Delivery dispatch + assign API documentation | Deferred — needed when CR is un-parked | BUG-097 |
| BUG-108 (P2) | CRM Coupon/Loyalty/Wallet API documentation | Deferred — needed when CR is un-parked | BUG-108 |
| BUG-104 (P2) | Credit/Tab Management module scope document | Deferred — needed when CR is un-parked | BUG-104 |
| BUG-105 (P2) | Settlement module scope document | Deferred — needed when CR is un-parked | BUG-105 |

**Cleared (no longer missing):**
- ~~BUG-098: Restaurant profile CRM key~~ → Owner confirmed: `crm_token` in login response
- ~~BUG-106: CRM Notes API~~ → Owner confirmed: notes in existing customer detail response

---

## 8. Updated CR Readiness

| CR | Updated Status | Notes |
|---|---|---|
| **BUG-099** | **ready_for_implementation_planning** | All owner questions answered. QSR profile toggle + Collect Bill API inline + no loyalty/discounts in QSR mode. UX details to be finalized during implementation. |
| **BUG-098** | **ready_for_implementation_planning** | All questions answered. `crm_token` from login response. Clean removal of env-based keys. |
| **BUG-106** | **ready_with_constraints** | Notes in existing customer response — validate keys at runtime. Read-only. Display in respective modals. Constraint: actual field names in customer object need runtime validation. |
| **BUG-107** | **crm_api_docs_needed** | Data confirmed available in CRM. Blocked on CRM team providing endpoint. |
| **BUG-108** | **defer_p2** | Parked by owner. P2 priority — after other CRs. |
| **BUG-096** | **defer_p2** | Parked by owner. P2 priority — backend to provide socket docs. |
| **BUG-097** | **defer_p2** | Parked by owner. P2 priority — backend to provide API docs. |
| **BUG-104** | **defer_p2** | Parked by owner. P2 priority — scope session later. |
| **BUG-105** | **defer_p2** | Parked by owner. P2 priority — scope session later. |

---

## 9. Recommended Next CR Waves (Updated)

### Wave 1 — Start Now (P1, all questions cleared)

| CR | Title | Size | Status |
|---|---|---|---|
| **BUG-099** | QSR / Cafe Quick Billing UX Optimization | Large | ready_for_implementation_planning |
| **BUG-098** | Use Login Response `crm_token` Instead of Env Keys | Small | ready_for_implementation_planning |
| **BUG-106** | CRM Notes Display (Read-Only, from existing customer data) | Medium | ready_with_constraints |

**Recommended implementation order within Wave 1:**
1. BUG-098 (Small, foundational — changes CRM key sourcing that BUG-106 depends on)
2. BUG-106 (Medium, builds on CRM layer after BUG-098)
3. BUG-099 (Large, independent — can run parallel with BUG-098/106)

### Wave 2 — Blocked on CRM Team

| CR | Title | Blocker |
|---|---|---|
| BUG-107 | CRM Cross-Sell / Upsell Insights | CRM team must provide endpoint |

### Wave 3 — Parked P2 (Owner will prioritize later)

| CR | Title | Blocker |
|---|---|---|
| BUG-096 | Realtime Menu + Hold/Unpaid Socket Updates | Backend socket event docs |
| BUG-097 | Delivery Dispatch + Assign Delivery Boy | Backend API docs |
| BUG-108 | CRM Coupon / Loyalty / Wallet Integration | CRM API docs + owner decisions |
| BUG-104 | Credit / Tab Management Module (XL) | Owner scope session |
| BUG-105 | Settlement Module (XL) | Owner scope session |

---

## 10. Key Architectural Decisions Captured

### BUG-099 QSR Flow (New)
- **QSR mode:** Restaurant-profile toggle (`qsr_mode: true/false` or similar in profile)
- **Billing at order screen:** In QSR mode, "Collect Bill" button calls the collect bill API **inline** — no navigation to full CollectPaymentPanel
- **Stripped features in QSR:** No loyalty, no special discounts, no coupon, no wallet
- **API:** Uses existing Collect Bill API path (`collectBillExisting` transform), NOT `placeOrderWithPayment`
- **Flow:** Add items → Place Order (creates unpaid order) → "Collect Bill" button shows inline payment method picker → select payment method → calls Collect Bill API → order settled
- **Full flow preserved:** Dine-in/room/split/tab/complex payments still use full CollectPaymentPanel

### BUG-098 CRM Key (New)
- **Source:** Login API response, NOT restaurant profile
- **Field name:** `crm_token`
- **Timing:** Available immediately after login (before profile bootstrap)
- **Migration:** Clean removal — no env fallback. Delete `REACT_APP_CRM_API_KEYS` usage entirely.
- **Impact:** `crmAxios.js` simplified — single token from login instead of JSON map lookup

### BUG-106 CRM Notes (New)
- **Source:** Existing customer detail/lookup response (no new endpoint)
- **Access:** Read-only from POS
- **Display:** Order notes in order modal, item notes in item modal
- **Implementation:** Validate note field keys at runtime (defensive coding)

---

## 11. Final Status

**pos3_cr_clearance_complete_ready_items_identified**

| Metric | Value |
|---|---|
| CRs reviewed | 9 |
| Owner questions answered | 9 (across BUG-099, BUG-098, BUG-106) |
| Owner-parked CRs | 5 (BUG-096, BUG-097, BUG-104, BUG-105, BUG-108) |
| CRs ready for implementation planning | **3** (BUG-099, BUG-098, BUG-106) |
| CRs blocked on CRM team | 1 (BUG-107) |
| CRs deferred P2 | 5 (BUG-096, BUG-097, BUG-104, BUG-105, BUG-108) |
| Backend/API questions still open | 10 (all P2 parked) |
| CRM questions still open | 2 active (BUG-107) + 9 parked (BUG-108) |
| Missing docs still needed | 6 (1 active for BUG-107, 5 parked) |
| Code changed | **NO** |
| `/app/memory/final/` updated | **NO** |

---

*— POS3.0 CR Planning Clearance Addendum — 2026-05-18 —*
