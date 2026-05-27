# BUG-104 — Owner UAT Feedback Capture — 2026-05-22

> **Document Type:** UAT feedback capture only. No code changed. `/app/memory/final/` untouched. Baseline docs untouched.
> **Predecessors:**
> - `POS3_0_BUG_104_UX_FREEZE_AND_IMPLEMENTATION_HANDOFF_2026_05_22.md`
> - `POS3_0_BUG_104_VISUAL_APPROVAL_ADDENDUM_2026_05_22.md`
> - `POS3_0_BUG_104_SCREEN_REVIEW_BEFORE_IMPLEMENTATION_2026_05_22.md`

---

## 1. Status

**`bug_104_owner_uat_feedback_captured_waiting_fix_approval`**

Owner has completed first-pass UAT on the Palm House live data set. Feedback below is captured verbatim and classified. No fix has been started.

---

## 2. UAT Scope

| Item | Value |
|---|---|
| Route tested | `/orders/credit` |
| Navigation tested | Sidebar → Orders → Credit/Tab (current path) |
| Restaurant/account | Palm House — `owner@palmhouse.com` |
| Live data set | 40 credit customers |
| Screens reviewed | SS0 (sidebar nav), SS1 (list), SS2 (detail drawer), SS3 (bill detail), SS4 (record payment) |
| Build state at UAT | `yarn build` clean; 26/27 testing-agent checks pass; SS3 mapping fix already merged and verified live |

---

## 3. Feedback Register

| ID | Screen | Owner Observation | Expected Behavior | Severity | Type | Code change needed | Owner clarification needed |
|---|---|---|---|---|---|---|---|
| F-001 | SS0 | "Instead of order → credit Tab, name of link should be Credit Management like Menu Management." | Replace the nested "Orders → Credit/Tab" entry with a standalone top-level sidebar link **"Credit Management"** (same visual treatment / weight as the existing "Menu Management" entry). | P1 | UI/navigation | YES | No |
| F-002 | SS0 | "Link will come above menu management." | The new "Credit Management" sidebar entry must appear **directly above** the "Menu Management" entry in the order: Dashboard → Order Reports → **Credit Management** → Menu Management → Visibility Settings. | P1 | UI/navigation | YES | No |
| F-003 | SS1 | "It should follow Menu Management style — width etc., should not take full screen." | Constrain the SS1 page width to match the Menu Management screen container (centered / max-width layout, NOT full-bleed). Header bar may remain full-width; the list card and KPIs sit inside the constrained container. | P1 | UI/layout | YES | No |
| F-004 | SS1 | "Email to be hidden for now." | Remove the **Email** column from the SS1 table for Phase 1. Keep email present in the search filter (so search-by-email still works) but do not render it as a column. | P1 | UI/layout | YES | No |
| F-005 | SS1 | "Need to show total credit, paid, outstanding." | Render a 3-tile KPI strip at the top of SS1 (above the search/filter row): **Total Credit**, **Paid**, **Outstanding** — derived from the list payload sums. Outstanding tile uses the same hero treatment as the SS2 outstanding hero. | P1 | UI/layout + data mapping (client-side aggregation; no new API) | YES | Yes — confirm derivation rule: see §4 OPEN-Q-A |
| F-006 | SS2 | "Wording change: first tab → first credit." | Rename the "First Tab" summary tile label to "**First Credit**". Underlying data field (`tap_start_date`) unchanged. | P1 | copy/text | YES | No |
| F-007 | SS2 | "In Last Payment put time in small fonts; don't increase block size." | Display the time portion of `last_tap_debit_date` as a small secondary line under the date in the "Last Payment" tile, without increasing the tile's bounding box. Same treatment for "Last Credit" tile if `last_tap_credit_date` includes a time component (owner mentioned only Last Payment but symmetry is desirable — see §4 OPEN-Q-B). | P2 | UI/layout + copy | YES | Yes — see §4 OPEN-Q-B |
| F-008 | SS2 | "In table below heading Credit add in bracket ( Bill )." | Rename the credits table column heading from "**Credit ₹**" to "**Credit ( Bill )**". Cell values and source data unchanged. | P1 | copy/text | YES | No |
| F-009 | SS3 | "Show like Audit Report side panel — same modal needs to be used, same data mapping." | Replace the current custom `CreditBillDetailSheet.jsx` with the existing **Audit Report `OrderDetailSheet`** component (the one used at `/reports/audit` when drilling into an order). Use the **same data mapping** that screen uses. Trigger remains the SS2 credit row "View" button. | P1 | UX reuse + data mapping (swap component; remove the custom sheet) | YES | Yes — see §4 OPEN-Q-C |
| F-010 | SS4 | "All good." | No changes to SS4 (Record Payment modal). Locked. | — | (approved) | NO | No |

---

## 4. Open Owner Clarifications

These do **not** block the fix plan but the implementing agent should confirm with the owner before coding, or assume the defaults noted below:

- **OPEN-Q-A (F-005 derivation rule):**
  Should the 3 KPIs on SS1 reflect:
  - **(a)** all customers currently in the list (default: snapshot of API 1, all customers), OR
  - **(b)** only customers that pass the current search/filter (live re-computed on every keystroke)?
  **Assumed default:** **(a)** — KPIs are restaurant-wide totals from the unfiltered list. They do not flicker as the cashier types into search.

- **OPEN-Q-B (F-007 symmetry):**
  Should the small-time treatment apply only to **Last Payment** (literal owner request), or **also** to **Last Credit** for visual symmetry?
  **Assumed default:** apply to **both** Last Credit and Last Payment tiles. Owner can ask to revert Last Credit if undesired.

- **OPEN-Q-C (F-009 reuse target):**
  The Audit Report drill-down currently uses `src/components/reports/OrderDetailSheet.jsx` and the data mapping `reportFromAPI.singleOrderNew` via `reportService.getSingleOrderNew()`. Phase 1 SS3 already uses the same service since the iteration_1 fix. F-009 therefore reduces to:
  - swap the **component shell** from `CreditBillDetailSheet.jsx` → `OrderDetailSheet` (so the visual layout matches Audit Report exactly), AND
  - delete `CreditBillDetailSheet.jsx` to avoid divergence going forward.
  **Assumed default:** confirm and proceed exactly as above.

---

## 5. Must-Fix Before Approval (P0 / P1)

| ID | Screen | Fix |
|---|---|---|
| F-001 | SS0 | Rename sidebar entry to "Credit Management" (standalone top-level). |
| F-002 | SS0 | Position it directly above "Menu Management". |
| F-003 | SS1 | Constrain page width to Menu-Management-style container. |
| F-004 | SS1 | Hide Email column (keep search by email). |
| F-005 | SS1 | Add Total Credit / Paid / Outstanding KPI strip. |
| F-006 | SS2 | "First Tab" → "First Credit". |
| F-008 | SS2 | "Credit" column header → "Credit ( Bill )". |
| F-009 | SS3 | Swap to Audit Report `OrderDetailSheet` component; delete `CreditBillDetailSheet.jsx`. |

(F-001 and F-002 must ship in the same change since they jointly touch the same Sidebar block.)

---

## 6. Improvements / Backlog (P2 / P3)

| ID | Screen | Item |
|---|---|---|
| F-007 | SS2 | Add small-font time line under Last Payment date (and likely Last Credit) without enlarging the tile. |

---

## 7. Out-of-Scope Items

| Item | Reason |
|---|---|
| None raised in this UAT batch. | Owner did not request anything from Phase 2 / mobile / settlement / print / PDF / WhatsApp / table-clear / tax recalculation / bulk settle. All P2 backlog items from the original freeze remain Phase 2. |
| Sidebar "Outstanding" counter (previously suggested by main agent) | Not approved by owner during UAT. Stays parked. |

---

## 8. Proposed Fix Plan (grouped for safety)

> **Sequence:** UI-only first → copy-only → data-mapping additions → component swap → final regression. Each step compiles and the app remains shippable between steps.

### 8A. UI-only changes (no data-mapping risk)

| Step | Item | Files |
|---|---|---|
| 1 | F-001 + F-002 — Sidebar restructure | `src/components/layout/Sidebar.jsx` |
| 2 | F-003 — Constrain page width | `src/pages/CreditManagementPage.jsx` |
| 3 | F-004 — Hide Email column | `src/components/credit/CreditCustomerList.jsx` |

### 8B. Copy/text changes (zero data risk)

| Step | Item | Files |
|---|---|---|
| 4 | F-006 — "First Tab" → "First Credit" | `src/components/credit/CreditCustomerDetailSheet.jsx` |
| 5 | F-008 — "Credit" → "Credit ( Bill )" | `src/components/credit/CreditCustomerDetailSheet.jsx` |

### 8C. Data mapping additions (additive, no schema break)

| Step | Item | Files |
|---|---|---|
| 6 | F-005 — Total Credit / Paid / Outstanding KPI tiles | `src/components/credit/CreditCustomerList.jsx` (or a new `CreditListKPIs.jsx`); page wires the aggregated values. **API 1 is sufficient** — `Total Credit = sum(positive credit movements)`, `Outstanding = sum(balances)`, `Paid = Total Credit − Outstanding`. Confirm exact formula via OPEN-Q-A. |
| 7 | F-007 — Small-font time line on Last Payment (and Last Credit) | `src/components/credit/CreditCustomerDetailSheet.jsx`; helper added in `src/api/transforms/creditTransform.js` (`formatDateWithTimeStacked` or similar). |

### 8D. Component reuse / regression-sensitive (do last)

| Step | Item | Files |
|---|---|---|
| 8 | F-009 — Swap SS3 to Audit Report `OrderDetailSheet` | `src/components/credit/CreditCustomerDetailSheet.jsx` (replace import + usage). DELETE `src/components/credit/CreditBillDetailSheet.jsx`. Verify `OrderDetailSheet` accepts the props/shape that the credit flow can provide (orderId only), and that opening it from within the SS2 right-side Sheet does not cause z-index/overlay collisions. |

### 8E. Verification after all fixes

- `yarn build` → 0 errors.
- One smoke screenshot of SS1 (constrained width + 3 KPI tiles + no Email column).
- One smoke screenshot of SS2 (renamed labels + time line on Last Payment + "Credit ( Bill )" header).
- One smoke screenshot of SS3 opened from a credit row — must visually match the Audit Report drill-down sheet.
- Then call `testing_agent_v3_fork` (frontend-only) with the new UAT expectations.

---

## 9. Files Likely Affected (estimate only — no edits made)

| File | Why it will change |
|---|---|
| `src/components/layout/Sidebar.jsx` | F-001, F-002 — restructure sidebar items, add standalone "Credit Management" above Menu Management, remove "Credit/Tab" nested under Orders. |
| `src/pages/CreditManagementPage.jsx` | F-003 — width constraint wrapper; consume new KPI tile data from list. |
| `src/components/credit/CreditCustomerList.jsx` | F-004 (hide Email column), F-005 (KPI strip — possibly extracted to a sibling component). |
| `src/components/credit/CreditCustomerDetailSheet.jsx` | F-006, F-007, F-008, F-009 (replace `CreditBillDetailSheet` import with `OrderDetailSheet`). |
| `src/components/reports/OrderDetailSheet.jsx` | Read-only — verify it can be opened from another Sheet. Possibly minor prop relaxation if it currently assumes report-page context. |
| `src/api/transforms/creditTransform.js` | F-007 — add small helper for date + time stacked display. |
| `src/components/credit/CreditBillDetailSheet.jsx` | F-009 — DELETE after swap. |

**No backend changes. No `/app/memory/final/` changes. No baseline doc changes.**

---

## 10. Confirmations

- **No code was changed** in this UAT pass. Only owner feedback was collected.
- **`/app/memory/final/` was NOT updated.**
- **Baseline docs were NOT updated.**
- **No payment API was invoked** during UAT (per owner restriction).
- **The previously-suggested sidebar Outstanding counter is NOT being added** (no separate owner approval received).
- **All Phase-1 frozen business rules remain locked** — UAT introduced no new business logic; only UI/copy/reuse changes.

---

## 11. Approval Gate

**`WAITING_OWNER_FIX_APPROVAL`**

Implementation of the fix plan in §8 will begin only after the owner:
1. Confirms the §4 OPEN-Q-A / OPEN-Q-B / OPEN-Q-C defaults (or overrides them), AND
2. Replies with explicit go-ahead to proceed with the fixes.

---

*— BUG-104 Credit/Tab Management — Owner UAT Feedback Capture — 2026-05-22 —*
