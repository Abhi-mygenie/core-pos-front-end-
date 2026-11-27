# BATCH-A · CR-494 (Per-action PIN + ₹ thresholds + daily limits) — Implementation Plan (Gate 3) — SKELETON — 2026-11-15

> Status: **GATE_3_SKELETON — NOT FROZEN**. Fill once Gyan replies to **BA-11..BA-15**. No exact edits yet.
> Risk: CRITICAL. Mockups: M4 `#m4` (PIN popup), M1/M2 hooks, M5 (PIN on comp/discount).
> Decisions (locked): separate PIN per action (cancel before serve, cancel after serve, cancel after bill, order edit after bill, discount, complimentary) · OD-494-A threshold ₹ incl. tax · OD-494-B discount threshold = ₹ of discount · OD-494-C counters server-side, per business day · OD-494-D edit-after-bill PIN for everyone · ≤ threshold no PIN, > PIN, 0 = always · over daily limit → allowed with PIN · whole-order comp (CR-445) = right only, no PIN.

## 1. Code reality — HEAD `b5d7a42` 2026-11-15 (Code Reality: NONE)
| Action | Entry point (IA 2026-11-14 — recheck when filling) |
|---|---|
| Cancel item (before/after serve) | OrderEntry.jsx `handleCancelFood` (~L1534) + CancelFoodModal |
| Cancel order | OrderEntry.jsx ~L1565, DashboardPage.jsx ~L1375 |
| Cancel after bill | same, condition `billPrinted` |
| Order edit after bill | OrderCard / TableCard `isEditLocked` (CR-489, `order_edit_access`) |
| Discount | CollectPaymentPanel.jsx L390-L423 + preset select ~L1494 |
| Complimentary | CPP L2499-L2515, MarkCompModal, OrderEntry L1068-L1097 |
| Serve stage | server-derived (`cancel_type`), FE uses `item.status` (orderTransform ~L1003) |
| PIN UI | none; `components/ui/input-otp.jsx` exists, unused |

## 2. Conflict pre-check
To do when filling (CPP BUG-660/665/666, OrderEntry BUG-662/656/CR-512, OrderCard/TableCard CR-489 area).

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| CancelOrderModal.jsx / CancelFoodModal.jsx | BUG-674, CR-493, BUG-670 | after all three |
| OrderEntry.jsx | BUG-674, CR-515, BUG-670 | last |
| DashboardPage.jsx | BUG-674 | after BUG-674 |
| CollectPaymentPanel.jsx | CR-492 (before), CR-495 (after) | CR-492 → CR-494 → CR-495 |
| orderTransform.js | BUG-674, BUG-670 | after both |

## 4. Exact edits
TBD — needs BA-11..15. Planned shape (no code): new shared PIN dialog per M4; amount calc per action; call verify API; pass PIN token on protected calls.

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G3-B1 | **BA-11** | PIN per action exists in backend admin (no FE admin screen in phase 1) |
| G3-B2 | **BA-12** | Threshold keys per action → when to show M4 |
| G3-B3 | **BA-13** | Edit-after-bill PIN for everyone → OrderCard/TableCard hook |
| G3-B4 | **BA-14** | Daily usage counters → M4 daily usage line + over-limit PIN |
| G3-B5 | **BA-15** | Read config / verify PIN / read counters / server rejection contract |

## 6. Scope lock · 7. Risks · 8. Execution order · 9. Verification matrix · 10. Registry checklist
TBD after BA-11..15. Known risk: cancel stage is backend-derived → PIN choice must use backend stage.

## 11. Mockup links
M4 (PIN popup) · M1/M2 (cancel hooks) · M5 (comp/discount PIN). Any screen not covered → back to Gate 2.5.
