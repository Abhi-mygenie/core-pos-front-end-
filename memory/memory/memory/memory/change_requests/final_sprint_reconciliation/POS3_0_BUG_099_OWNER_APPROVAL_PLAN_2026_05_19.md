# POS3.0 BUG-099 QSR Quick Billing — Owner Approval Plan — 2026-05-19

## 1. Purpose

This document is created **before implementation** and requires owner approval before any code changes.

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Repo URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | 18-may-pos3.0 |
| Commit hash | `96759bf` |
| Working tree | Clean (fresh clone) |

---

## 3. Inputs Read

- UX Decision Plan: `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_099_QSR_QUICK_BILLING_UX_DECISION_PLAN_2026_05_19.md`
- CR Master Planning: `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md`
- CR Clearance Addendum: `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_PLANNING_CLEARANCE_ADDENDUM_2026_05_18.md`
- Bug Impact Analysis: `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md` (BUG-099 section)
- Code inspection: `OrderEntry.jsx`, `CartPanel.jsx`, `CollectPaymentPanel.jsx`, `StatusConfigPage.jsx`, `orderTransform.js`, `profileTransform.js`, `paymentMethods.js`, `orderEntryPrefs.js`

---

## 4. Bug Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-099 | QSR/cafe billing is too slow — 3 steps, 2 screens, heavy scrolling | Add QSR mode toggle + inline billing/payment section on Order Screen | 4 files modified + 1 new | MEDIUM | pending_owner_approval |

---

## 5. Per-Bug Approval Detail

### BUG-099 — QSR / Cafe Quick Billing

#### What is wrong in plain English
For QSR/cafe/counter-service, the current billing flow requires 5-7 clicks across 2 screens with heavy scrolling (Place Order → navigate to Collect Bill → scroll → select payment → pay). This is too slow for counter-service speed.

#### What I will change
Add a QSR Quick Billing mode (localStorage toggle in Visibility Settings) that:
1. Hides KOT/Bill checkboxes (auto-handled from profile `autoKot`/`autoBill`)
2. After Place Order, shows an inline billing section on the Order Screen with compact bill summary + Cash/Card/UPI payment pills
3. Collect Bill button calls the **existing** `collectBillExisting` API inline — no navigation to CollectPaymentPanel
4. Profile-driven behavior: SC auto-applies if configured, tip shows if enabled, delivery charge editable, discount if toggle ON
5. "Full Billing →" link opens CollectPaymentPanel for advanced cases

#### Files I expect to modify

| # | File | What will change | Why this file |
|---|---|---|---|
| 1 | **NEW: `src/utils/qsrModePrefs.js`** | localStorage read/write utility for QSR toggles (getQsrModeEnabled, getQsrDiscountEnabled + setters) | Follows `orderEntryPrefs.js` pattern |
| 2 | **`src/pages/StatusConfigPage.jsx`** | Add 2 new toggles in "UI Elements" section: "QSR Quick Billing" + "QSR Discount". State, hydration, save logic. | Existing toggle pattern (Order Taking, Stay on Order) |
| 3 | **`src/components/order-entry/CartPanel.jsx`** | Add conditional QSR billing section after items when QSR ON + hasPlacedItems. Contains: bill calculation, discount input, delivery charge input, tip input, SC auto-apply, tax display, grand total, payment pills, cash input, card TXN ID. | Cart panel is where billing section appears inline |
| 4 | **`src/components/order-entry/OrderEntry.jsx`** | Pass QSR mode flag + callback to CartPanel. Handle QSR collect bill by reusing **existing** Scenario 1 code (L1612-1718): `collectBillExisting` → `api.post(BILL_PAYMENT)` → auto-print → navigate. | OrderEntry owns the collect bill API call |

#### Code area / function / component

| File | Area | What happens |
|---|---|---|
| `qsrModePrefs.js` | New file | `getQsrModeEnabled()`, `setQsrModeEnabled()`, `getQsrDiscountEnabled()`, `setQsrDiscountEnabled()` — localStorage read/write |
| `StatusConfigPage.jsx` | `UI Elements` section (~L650-752) | 2 new toggle cards below "Stay on Order Entry" toggle. Same UI pattern. |
| `StatusConfigPage.jsx` | `saveConfiguration()` (~L430-489) | Persist 2 new localStorage keys |
| `StatusConfigPage.jsx` | `useEffect` mount (~L173-283) | Hydrate 2 new state variables |
| `StatusConfigPage.jsx` | `resetToDefault()` (~L319-336) | Reset 2 new toggles to factory (OFF) |
| `CartPanel.jsx` | New props | `qsrMode`, `qsrDiscountEnabled`, `onQsrCollectBill`, `restaurant` (for SC/tip/discount config) |
| `CartPanel.jsx` | Bottom section (~L844-898) | Conditional: if QSR ON + hasPlacedItems → render QSR billing section instead of normal Place Order + Collect Bill buttons |
| `CartPanel.jsx` | New QSR billing section | Bill calculation (item total, discount, SC, tip, delivery, tax, round-off, grand total) + payment pills + cash input + card TXN ID + Collect Bill CTA + Full Billing link |
| `OrderEntry.jsx` | CartPanel props (~L1917-1979) | Pass `qsrMode`, `qsrDiscountEnabled`, `onQsrCollectBill` callback, `restaurant` |
| `OrderEntry.jsx` | New `handleQsrCollectBill` function | Receives `paymentData` from CartPanel QSR section → reuses **existing** Scenario 1 code: `collectBillExisting` → `api.post(BILL_PAYMENT)` → auto-print → navigate |

#### What I will NOT touch

| Area | Reason |
|---|---|
| `CollectPaymentPanel.jsx` | Owner directive: no changes |
| `orderTransform.js` | `collectBillExisting` already works — no transform changes |
| `orderService.js` | No changes |
| `socketHandlers.js` | No changes |
| `api/constants.js` | Uses existing `BILL_PAYMENT` endpoint |
| `profileTransform.js` | Profile fields already mapped (autoKot, autoBill, SC, tip, discountTypes) |
| `DashboardPage.jsx` | No changes |
| Non-QSR flow (CollectPaymentPanel rendering, payment logic) | Zero regression — QSR is purely additive |
| `/app/memory/final/` | Frozen baseline — not updated |

#### Business rules protected

| Rule | Impact | Protected? |
|---|---|---|
| PAY-004 | QSR uses `collectBillExisting` — same payload shape | YES |
| PAY-007 | PayLater not in QSR — not applicable | N/A |
| PAY-008 | TAB/Credit hidden in QSR — not applicable | N/A |
| TAX-001..008 | Same tax calculation as CollectPaymentPanel | YES |
| SC-001..006 | SC auto-applied from profile when applicable | YES |
| TIP-001/002 | Tip optional, profile-gated | YES |
| ROUND-001/002 | Same round-off logic | YES |
| TOTALS-001/002 | Same totals calculation | YES |
| DEL-004/005 | Delivery charge editable in QSR | YES |

#### Risk
**MEDIUM**

- Bill calculation in CartPanel must produce identical financial results to CollectPaymentPanel for the same inputs
- Payment pills must respect restaurant payment config (pay_cash, pay_upi, pay_cc)
- Collect Bill API call reuses existing code path — low API risk
- Non-QSR flow completely untouched — zero regression

#### QA check after implementation

1. QSR mode OFF: CartPanel renders exactly as before (zero visual change)
2. QSR mode ON + fresh order: KOT/Bill hidden, Place Order full width, Collect Bill hidden
3. QSR mode ON + after Place Order: QSR billing section appears, items compact
4. QSR Cash: Collect Bill calls API, auto-print fires, navigates away
5. QSR Card: Optional TXN ID, Collect Bill works without it
6. QSR UPI: Collect Bill works immediately
7. QSR Discount ON: Discount dropdown + input appears, grand total updates
8. QSR Delivery order: Delivery charge input editable, grand total includes it
9. QSR + profile SC ON: SC auto-applied row visible, included in grand total
10. QSR + profile Tip ON: Tip optional field visible
11. Full Billing link: Opens CollectPaymentPanel normally
12. Financial parity: QSR and full Collect Bill produce same totals for same inputs
13. `yarn build` passes with zero errors

#### Approval needed

Owner approval required before implementation.

**Options:**
- A. Approve this bug for code-diff preview and implementation
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first

---

## 6. Implementation Order

1. Create `qsrModePrefs.js` utility
2. Add toggles to `StatusConfigPage.jsx`
3. Add QSR billing section to `CartPanel.jsx`
4. Wire QSR collect bill in `OrderEntry.jsx`
5. `yarn build` validation

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-099 | YES | pending_owner_approval |

---

## 8. Final Status

`owner_approval_plan_created_pending_approval`

No code was changed. No files were modified.

---

*— End of POS3.0 BUG-099 Owner Approval Plan — 2026-05-19 —*
