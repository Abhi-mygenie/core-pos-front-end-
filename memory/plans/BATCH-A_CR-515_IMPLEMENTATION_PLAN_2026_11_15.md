# BATCH-A · CR-515 (Staff rights: payment change / unpaid / pay-later / item cancel) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_PARTIAL — NOT FROZEN**. READY: G1-E9, G2-E7, G2-E8. BLOCKED: G2-B1 (BA-09).
> Source rows: G1 E9 + G2 E7, E8 + G2-B1 (moved unchanged from the G1 and G2 group plans, now superseded).
> Risk: CRITICAL (permissions + payments). Mockup: M7 `#m7`.
> Decisions: OD-515-A (item cancel uses `order_cancel`, phase 1; separate key = BA-10 phase 2) · existing rights `update_payment` / `order_unpaid` · pay-later key waits BA-09 (R13) · reprint right = P1 (out of scope).

## 1. Code reality — rechecked at HEAD `b5d7a42` 2026-11-15 (Code Reality: PARTIAL — AllOrdersReportPage already gated)
| File | Line | Current |
|---|---|---|
| `components/order-entry/OrderEntry.jsx` | L352 | `const canCancelOrder = hasPermission('order_cancel');` |
| same | L353 | `const canCancelItem = hasPermission('food');` (used L378/L383, passed L2947 → CartPanel) |
| `pages/reports-module/OrderReportBetaPage.jsx` | L4-L23 | imports — no `useAuth` (contexts import L10: `useRestaurant, useSettings`) |
| same | L262-L264 | component start; `useRestaurant()` |
| same | L709 | `<PaymentMethodPicker` shown to all users |
| same | L720 | Mark Unpaid `onClick={() => setMarkUnpaidTarget(row)}` shown to all users |
| `pages/AllOrdersReportPage.jsx` | L132, L151-L152 | already uses `hasPermission('update_payment')` / `('order_unpaid')` — reference pattern |
| `components/.../CollectBillPanelDrawer.jsx` | — | Hold-tab Collect button — ungated (B1) |
| Probe RID 644 Owner | — | `update_payment`, `order_unpaid`, `order_cancel`: True |

## 2. Conflict pre-check
| File | Open item(s) | Overlap |
|---|---|---|
| OrderEntry.jsx | BUG-662, BUG-656, CR-512 (GATE_5A) | No overlap at L353 → build after QA |
| OrderReportBetaPage.jsx | none outside Batch A | — |
| CollectBillPanelDrawer.jsx | none | — |

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| OrderEntry.jsx | BUG-674 (E7 L1572), BUG-670 (B1), CR-494 (hooks) | BUG-674 E7 → CR-515 E9 → BUG-670 B1 → CR-494 |
| OrderReportBetaPage.jsx | BUG-674 (B2 cancel reason/note display) | CR-515 E7/E8 → BUG-674 B2 |
| CollectBillPanelDrawer.jsx | CR-492 (R15 note: drawer has no `onSetCompReason`; no edit) | CR-492 first → CR-515 B1 |

## 4. Exact edits — READY
| # | File / line | Current → New |
|---|---|---|
| G1-E9 | OrderEntry L353 | `hasPermission('food')` → `hasPermission('order_cancel')` + marker `// CR-515 R-2` |
| G2-E7 | OrderReportBetaPage L10 + L262 | add `useAuth` to contexts import; `const { hasPermission } = useAuth();` at top of component |
| G2-E8 | OrderReportBetaPage L700-L780 (picker L709, Mark Unpaid L720) | Picker only if `hasPermission('update_payment')`; Mark Unpaid only if `hasPermission('order_unpaid')` (same rule as AllOrdersReportPage) |

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G2-B1 | **BA-09** right key | CollectBillPanelDrawer Hold-tab Collect button gated by the confirmed key (no right → hidden) |

## 6. Scope lock
WILL change: OrderEntry.jsx L353; OrderReportBetaPage.jsx imports + L700-L780; (after BA-09) CollectBillPanelDrawer.jsx Collect button.
Will NOT touch: AllOrdersReportPage, dashboard/ChannelColumn cancel gating (already `order_cancel`), reprint (P1), CartPanel.

## 7. Risks
- R-2: users with `food` but without `order_cancel` lose item cancel (owner approved).
- Orders Beta: users without `update_payment` / `order_unpaid` lose buttons they use today (intended).
- BA-09 server enforcement not yet confirmed → FE hide only.

## 8. Execution order
E9 → E7 + E8 → (after BA-09) B1.

## 9. Verification matrix
| # | Edit | Flow | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | E9 | User with `food`, without `order_cancel` | Item cancel hidden | NO |
| V2 | E9 | User with `order_cancel`, without `food` | Item cancel visible | NO |
| V3 | E8 | Orders Beta without `update_payment` / `order_unpaid` | Picker / Mark Unpaid hidden | NO |
| V4 | E8 | Orders Beta with both | Unchanged | NO |
| V5 | B1 | (after BA-09) user without pay-later right | Collect hidden in Hold tab | NO |
| V6 | all | Build / tests | 0 new errors | YES |

## 10. Post-code registry checklist
- [ ] FILE_OWNERSHIP blocks · [ ] `registry.json` + `CR_REGISTRY.md` CR-515 · [ ] tracker BA-09/BA-10 · [ ] marker `// CR-515`

## 11. Mockup links
M7 → E7, E8, B1. (E9 has no screen change beyond visibility of existing button.)
