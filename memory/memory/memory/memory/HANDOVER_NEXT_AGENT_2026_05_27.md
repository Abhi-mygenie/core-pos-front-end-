# Handover Note — POS3.1 Session Close (2026-05-27)

**From session:** 2026-05-27
**Status:** BUG-109 + BUG-110 + BUG-111 (Phase 1 + Phase 2) ALL SHIPPED & OWNER-VERIFIED

---

## TL;DR

All 3 POS3.1 QSR bugs are **SHIPPED and OWNER-VERIFIED**:
- **BUG-109:** QSR takeaway/delivery customer validation parity ✅
- **BUG-110:** QSR prepaid lock parity ✅
- **BUG-111 Phase 1:** Grand Total uses server-authoritative `total` prop ✅
- **BUG-111 Phase 2:** Server-driven breakdown (Item Total, Discount, Subtotal, Tax) ✅

**Live test T-DISCOUNT-CLUB PASSED** — Discount ₹999 + Loyalty ₹244 = single aggregated row -₹1,243 in QSR.

---

## Files Changed (POS3.1 total)

| File | BUG | Change |
|---|---|---|
| `CartPanel.jsx` | 109, 110, 111 | QSR validation gates, prepaid lock, server-driven breakdown |
| `OrderEntry.jsx` | 111-P2 | +1 `placedOrderData` prop to CartPanel |
| `orderTransform.js` | — | **UNTOUCHED** |

---

## Key Design Decisions (BUG-111 Phase 2)

1. **No transform changes** — all fields already extracted by `fromAPI.order`
2. **Derived values** — Discount/Tax computed from existing fields, no new field extraction needed
3. **3-state gate:** `subtotalAmount > 0` distinguishes paid (server data available) from unpaid (hidden)
4. **Single aggregated Discount row** per owner directive

---

## ENV Change

- `REACT_APP_CRM_BASE_URL` updated to `https://insights-phase.preview.emergentagent.com/api`

---

## What's Next (priority order)

1. **CRM 2.0 CR-002** — Live Regression QA (T-28/T-29) → Stage 8 POS Handoff
2. **BUG-108 Carryover** — BC-01 (P0) POS BE items[] forwarding unverified
3. **CR-005 Wallet** — Discovery
4. **CR-003 Tab / CR-008 Integrations** — Not started

---

## DO NOT TOUCH
- `/app/memory/final/`
- `/app/memory/crm/crm_1_0/`
- Outbound payload contracts in `orderTransform.js`
