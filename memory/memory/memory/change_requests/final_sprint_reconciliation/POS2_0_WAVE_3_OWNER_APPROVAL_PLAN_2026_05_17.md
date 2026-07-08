# POS2.0 Wave 3 Owner Approval Plan — 2026-05-17

## 1. Purpose

This document is created **before implementation** and requires **owner approval** before any code changes are made. It covers the 2 bugs in Wave 3 (Payment / Discount).

---

## 2. Repo / Commit

| Item | Value |
|---|---|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Commit hash | `a9d05fb02dd566dfcb7ae44523d60122e4dab845` |
| Working tree status | Clean |

---

## 3. Inputs Read

| Document | Path |
|---|---|
| Master Implementation Plan | `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md` |
| Master Plan Audit & Correction | `POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md` |
| Wave 1 + Wave 2 Final Smoke Report | `POS2_0_WAVE_1_WAVE_2_FINAL_SMOKE_REPORT_2026_05_17.md` |
| Phase 2 Owner Decision Capture | `POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md` |
| Phase 2 Planning Doc | `POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md` |
| Phase 4 Remaining Blocked Bug Planning | `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md` |
| Phase 4 Owner Decision Capture | `POS2_0_PHASE_4_OWNER_DECISION_CAPTURE_2026_05_17.md` |
| Business Rules Baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Implementation Agent Rules | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` |
| Final Docs Approval Status | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` |
| paymentMethods.js config | `/app/frontend/src/config/paymentMethods.js` |
| CollectPaymentPanel.jsx | `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` |
| orderTransform.js | `/app/frontend/src/api/transforms/orderTransform.js` |
| profileTransform.js | `/app/frontend/src/api/transforms/profileTransform.js` |

---

## 4. Bugs Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-080 | Cashier can select disabled payment modes (cash/card/upi) even when they're turned off in restaurant config | Add UI enforcement: disable/hide payment buttons for disabled modes; filter split payment dropdowns; keep 3-entry payload unchanged | `CollectPaymentPanel.jsx` | LOW-MEDIUM | pending_owner_approval |
| BUG-056 | Preset discount categories are fetched from backend but no dropdown picker is shown to the cashier | Add a dropdown selector for preset discount categories; mutually exclusive with manual discount | `CollectPaymentPanel.jsx` | LOW | pending_owner_approval |

---

## 5. Per-Bug Approval Details

---

### BUG-080 — partial_payments UI Enforcement

#### What is wrong in plain English

The restaurant profile has boolean config flags (`pay_cash`, `pay_upi`, `pay_cc`) that control which payment methods are enabled. Currently, the Collect Bill panel **ignores these flags** — all 3 primary methods (Cash, Card, UPI) are always shown and selectable, even if the restaurant has disabled one or more of them. The same applies to the split payment dropdowns, which are hardcoded to show all 3 options.

#### What I will change

1. **Row 1 payment buttons (L1856-1889):** Add a filter so only payment methods that are enabled in `restaurantPaymentMethods` are rendered. Disabled methods will be hidden (not rendered).

2. **Default payment method (L281-286):** Default to the first *enabled* method instead of hardcoded `'cash'`. If cash is disabled, default to the first enabled method.

3. **Split payment initial state (L300-302):** Initialize with the first two *enabled* methods instead of hardcoded `cash` + `card`.

4. **Split-by-Payment dropdown (L2023-2026):** Filter `<option>` entries by `restaurantPaymentMethods`.

5. **Split-by-Station Bar dropdown (L2099-2102):** Filter by `restaurantPaymentMethods`.

6. **Split-by-Station Kitchen dropdown (L2137-2140):** Filter by `restaurantPaymentMethods`.

7. **Payload builders (orderTransform.js):** NO change — `placeOrderWithPayment` already always sends all 3 entries with disabled modes at zero. `collectBillExisting` sends what cashier selected — since UI now prevents selecting disabled modes, this is correct.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `CollectPaymentPanel.jsx` | (1) Filter Row 1 buttons by `restaurantPaymentMethods`, (2) compute `enabledPrimaryMethods` helper, (3) filter split payment dropdowns, (4) smart default payment method, (5) smart split initial state | Only file with the payment mode selector UI |

#### Code area / function / component

- `CollectPaymentPanel` component
- Lines ~64 (restaurantPaymentMethods already available)
- Lines ~281-302 (state initialization)
- Lines ~1856-1889 (Row 1 buttons)
- Lines ~2023-2026, ~2099-2102, ~2137-2140 (split dropdowns)

#### What I will NOT touch

- `orderTransform.js` — payload builders stay unchanged (always 3 entries per owner decision)
- `paymentMethods.js` — config registry stays unchanged
- `profileTransform.js` — payment method boolean parsing stays unchanged
- Row 2 (Split/Credit/To Room buttons) — unchanged
- Tab/Credit settlement path — unchanged (excluded per owner decision, frozen PAY-008)
- Financial calculations — unchanged

#### Business rule protected

- **Frozen PAY-001, PAY-002, PAY-004, PAY-008** — payment payload contracts preserved
- **Pending PAY-003** — this implementation aligns frontend with the owner-clarified rule: "All 3 primary modes always present in payload; UI prevents selecting disabled modes; disabled modes carry zero amounts."
- Tab settlement path (frozen PAY-008) stays untouched

#### Risk

**LOW-MEDIUM**

- The change is UI-only — no payload shape change, no financial formula change
- Edge case: if ALL 3 methods are disabled, the panel would have no selectable methods. Mitigation: fall back to 'cash' if nothing is enabled (config error).
- The filter uses the same `restaurantPaymentMethods` already available in context

#### QA check after implementation

| Check | Expected Result |
|---|---|
| Cash-only restaurant | Only Cash button in Row 1; split dropdown shows only Cash |
| Cash+UPI restaurant | Cash + UPI buttons; Card hidden; split shows Cash + UPI only |
| All 3 enabled | Same as today — Cash, Card, UPI all visible |
| Default payment method | Defaults to first enabled method (cash if enabled; else UPI; else card) |
| Split payment initial state | First two rows use enabled methods only |
| Payload for cash-only | `partial_payments` still has 3 entries; card + upi at zero |
| Tab NOT in partial_payments | Confirmed: tab excluded from all paths |
| Station split dropdowns | Only enabled methods shown |

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first

---

### BUG-056 — Preset Discount Dropdown

#### What is wrong in plain English

The restaurant profile includes preset discount categories (e.g., "Staff Discount 10%", "Manager Discount 20%") fetched from the backend. The frontend already parses these into `discountTypes` and even has a state variable (`selectedDiscountType`) and calculation logic (`presetDiscount`) — but **no UI dropdown is rendered** for the cashier to select a preset. The cashier can only enter manual percent/flat discounts.

#### What I will change

1. **Add preset discount dropdown (after L907):** A `<select>` dropdown that shows preset discount categories from `discountTypes` (already in the restaurant context).

2. **Mutual exclusivity:** When a preset is selected → clear manual discount state (`setDiscountType(null)`, `setDiscountValue("")`). When manual discount is entered → clear preset selection (`setSelectedDiscountType(null)`).

3. **Display format:** Dropdown shows category name + percentage (e.g., "Staff Discount - 10%"). Selected preset shows the calculated ₹ amount.

4. **No financial formula changes** — the `presetDiscount` computation at L480-481 already works correctly. `totalDiscount` at L503 already includes `presetDiscount`. The payment data at L700 already wires `preset: presetDiscount`.

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `CollectPaymentPanel.jsx` | (1) Add preset discount `<select>` dropdown below manual discount section, (2) Add mutual exclusivity between preset and manual discount, (3) Update manual discount `onChange` to clear preset | Only file with the discount UI |

#### Code area / function / component

- `CollectPaymentPanel` component
- Line ~64: `discountTypes` already imported from `useRestaurant()`
- Line ~475: `selectedDiscountType` state already declared
- Lines ~860-907: Discount section UI (add preset dropdown here)
- Lines ~876, ~889: Manual discount `onChange` handlers (add preset clearing)

#### What I will NOT touch

- `orderTransform.js` — all payload builders already handle `presetDiscount` via `discounts.preset` (L700, L1300)
- `profileTransform.js` — `discountTypes` parsing stays unchanged
- Financial calculations (L480-503) — already correct
- Coupon, Loyalty, Wallet sections — unchanged
- Bill summary display — already shows `totalDiscount` which includes `presetDiscount`

#### Business rule protected

- No frozen business rule conflict — this is a new feature surface
- Existing `orderDiscountType` / `orderDiscountValue` pathway is reused
- `comm_discount` field in `collectBillExisting` (L1300) already maps `discounts.preset`

#### Risk

**LOW**

- Additive UI change — no existing financial formula changes
- `presetDiscount` was already computed but never surfaced
- Mutual exclusivity is the only new behavior — straightforward state clearing
- If `discountTypes` is empty (restaurant has no presets), the dropdown simply doesn't render

#### QA check after implementation

| Check | Expected Result |
|---|---|
| Dropdown visible when restaurant has discount categories | Dropdown renders with category names + percentages |
| Dropdown hidden when no categories | No dropdown shown |
| Select preset → discount applied | `presetDiscount` calculated correctly; shown in bill summary |
| Select preset → clears manual | Manual discount type reverts to "None"; manual value clears |
| Enter manual → clears preset | Preset selection reverts to "None" |
| Preset flows through payload | `comm_discount` in payload has correct value |
| Preset + coupon combo | Both apply (preset replaces manual only, not coupon) |

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first

---

## 6. Recommended Implementation Order

1. **BUG-080** first — payment mode enforcement (UI-only, no financial impact)
2. **BUG-056** second — preset discount dropdown (additive UI, independent of BUG-080)

Rationale: BUG-080 and BUG-056 touch different sections of `CollectPaymentPanel.jsx` (payment selector vs discount section) with no overlap. Order is not critical, but BUG-080 is higher priority per the master plan constraint note.

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-080 | Owner approval for code-diff preview | _pending_ |
| BUG-056 | Owner approval for code-diff preview | _pending_ |

---

## 8. Final Status

`owner_approval_plan_created_pending_approval`

---

*— End of POS2.0 Wave 3 Owner Approval Plan —*
