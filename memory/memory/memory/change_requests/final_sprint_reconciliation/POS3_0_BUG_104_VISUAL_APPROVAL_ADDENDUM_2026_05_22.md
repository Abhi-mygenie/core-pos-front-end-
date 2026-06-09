# BUG-104 — Visual Approval Addendum — 2026-05-22

> **Status:** `bug_104_phase_1_visual_approved_ready_for_implementation`
> **Supersedes pending VQs in:** `POS3_0_BUG_104_SCREEN_REVIEW_BEFORE_IMPLEMENTATION_2026_05_22.md`

## Owner Decisions Locked

| # | Decision | Applied Behavior |
|---|---|---|
| VQ-01 | **A — Approved as shown** | SS1 column order: Name → Mobile → Email → Balance → Action. Search top-left, Filter top-right. Page title + subtitle. |
| VQ-02 | **C — Drawer instead of modal** | SS2 is a right-side `Sheet` (drawer). NOT a modal. NOT in-page replace. Aligned with existing `OrderDetailSheet` POS pattern. |
| VQ-03 | **A — Separate sections** | SS2 renders Credits (tabs opened) and Payments (debits) as two distinct tables, in that order. No combined timeline. No tab switcher. |
| VQ-04 | **C — Separate modal from drawer** | SS4 (Record Payment) is a separate centered `Dialog` modal opened FROM the SS2 drawer. The SS2 drawer remains mounted underneath; on success the modal closes and the drawer re-fetches. |
| VQ-05 | **D — Both inline and toast** | Form validation errors render inline below the amount input. API success and API failure render as toasts. |

## Reaffirmed Constraints (no change)

- Desktop/web POS only. Mobile out of scope for Phase 1.
- Phase 2 icons/actions hidden completely.
- No print, no settlement, no table-clear, no order-status update, no tax recalculation in credit UI.
- No mutation of local balance before API success.
- Standalone module — zero edits to hotspot files (CollectPaymentPanel, OrderEntry, DashboardPage, socketHandlers, orderTransform, autoSettle, LoadingPage, etc.).

## Implementation Mapping

| Screen | Surface | Component | Library Component |
|---|---|---|---|
| SS1 | Full page | `CreditManagementPage` + `CreditCustomerList` | table + input + select |
| SS2 | Right drawer | `CreditCustomerDetail` | `Sheet` (`side="right"`) |
| SS3 | Right drawer (nested over SS2) | `CreditBillDetail` | `Sheet` (`side="right"`) |
| SS4 | Centered modal opened from SS2 | `CreditClearanceModal` | `Dialog` |

## Gate

**`READY_FOR_IMPLEMENTATION`**
