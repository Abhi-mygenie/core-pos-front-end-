# BATCH-A · BUG-674 (Order-cancel notes) — Implementation Plan (Gate 3) — 2026-11-15

> Status: **GATE_3_PLAN_PARTIAL — NOT FROZEN**. READY: E2, E6, E7, E8, T1. BLOCKED: B2 (BA-01/02), B7 (BA-24). QA checks (R16, not blockers): B3 (BA-03), B4 (BA-04).
> Source rows: G1 E2, E6, E7, E8, T1 + B2, B3, B4, B7 (moved unchanged from `plans/BATCH-A_G1_CANCEL_IMPLEMENTATION_PLAN_2026_11_15.md`, now superseded).
> Risk: HIGH (order flow + reports). Mockups: M1 `#m1` (order cancel), M6 `#m6` (reports — blocked).
> Decisions: OD-674-A (blank note saved EMPTY) · R14-Q1 (Refund Note = order cancel note, same box).
> Build only after Gate 4 GO **and** QA pass: BUG-662/656/CR-512 (OrderEntry), BUG-664/665/666 (orderTransform).

## 1. Code reality — rechecked at HEAD `b5d7a42` 2026-11-15 (Code Reality: NONE)
| File | Line | Current |
|---|---|---|
| `components/order-entry/CancelOrderModal.jsx` | L104-L118 | Notes textarea shown **only** `isRefund`; label `Refund Note` (L107); testid `cancel-order-refund-note` |
| same | L22 | `onCancel(selectedReason, cancellationNote)` |
| `api/transforms/orderTransform.js` | L1028 | `cancellation_note: reason.reasonNote \|\| reason.reasonText` (reason text duplicated into note) |
| `components/order-entry/OrderEntry.jsx` | L1572 | `orderToAPI.cancelOrder(orderId, role, reason, {...})` — note not passed (only Razorpay L1594) |
| `pages/DashboardPage.jsx` | L1383 | `orderToAPI.cancelOrder(order.orderId, role, reason)` — note not passed (only Razorpay L1395) |
| Reports refund-cancel (`pages/AllOrdersReportPage.jsx` L899, `pages/reports-module/OrderReportBetaPage.jsx` L323) | — | call `cancelAndRefund(..., note)` only — not touched |
| `__tests__/api/transforms/cancelAndUpdatePayload.test.js` | — | exists; tests pass a `reasonNote` |

## 2. Conflict pre-check
| File | Open item(s) | Overlap |
|---|---|---|
| OrderEntry.jsx | BUG-662, BUG-656, CR-512 (GATE_5A) | No line overlap → build after QA, recheck |
| DashboardPage.jsx | CR-533 (Gate 1) | None |
| orderTransform.js | BUG-664/665/666 (GATE_5A), BUG-639 (Gate 3) | No overlap with L1028 |
| CancelOrderModal.jsx | none outside Batch A | — |

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| CancelOrderModal.jsx | CR-493 (E1, E3), CR-494 (PIN hook, TBD) | BUG-674 E2 with CR-493 E1+E3 in one modal pass (E2 first) → CR-494 later |
| orderTransform.js | BUG-670 (B1 `cancelItem`), CR-494 (TBD) | BUG-674 E6 first → BUG-670 B1 → CR-494 |
| OrderEntry.jsx | CR-515 (E9 L353), BUG-670 (B1), CR-494 (hooks) | BUG-674 E7 → CR-515 E9 → BUG-670 B1 → CR-494 |
| DashboardPage.jsx | CR-494 (order-cancel PIN hook) | BUG-674 E8 → CR-494 |
| OrderReportBetaPage.jsx (B2) | CR-515 (E7, E8) | CR-515 E7/E8 → BUG-674 B2 |

## 4. Exact edits — READY
| # | File / line | Current → New |
|---|---|---|
| G1-E6 | orderTransform L1028 | `reason.reasonNote \|\| reason.reasonText` → `reason.reasonNote \|\| ''` (OD-674-A) |
| G1-T1 | `__tests__/api/transforms/cancelAndUpdatePayload.test.js` | Add: reason without `reasonNote` → `cancellation_note: ''`. Existing tests unchanged |
| G1-E7 | OrderEntry L1572 | pass `{ ...reason, reasonNote: note.trim() }` instead of `reason`. Razorpay call L1594 unchanged (R14-Q1) |
| G1-E8 | DashboardPage L1383 | same as E7. L1395 unchanged |
| G1-E2 | CancelOrderModal L104-L118 (M1) | Notes box in **every** mode. Cancel mode: label `Notes (Optional)`, placeholder `Type here…`, testid `cancel-order-note`. Refund mode: keep `Refund Note` + testid `cancel-order-refund-note` (one box). Update header comment L1-L3 |

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G1-B2 | **BA-01, BA-02** | Cancellation report Notes column = cancel note (`reportTransform.js` ~L789, `insightsService.js` ~L301-305); Order Beta reason + note on cancelled rows (M6) |
| G1-B3 | **BA-03** | **QA check (R16)** — backend only; QA verifies line `reason` no longer overwritten by order note |
| G1-B4 | **BA-04** | **QA check (R16)** — backend saves empty note when blank; FE side is E6 |
| G1-B7 | **BA-24** | Confirm `cancellation_note` on order-status-update is right for refund-cancel note; if another key → small follow-up to E7/E8 |

## 6. Scope lock
WILL change: CancelOrderModal.jsx, orderTransform.js L1028, OrderEntry.jsx L1572, DashboardPage.jsx L1383, cancel payload test. (B2 later: reportTransform.js, insightsService.js, OrderReportBetaPage.jsx.)
Will NOT touch: refund logic (`razorpayRefundService`), reports refund flow, reason list loading (`SettingsContext`), cancel timing rules, delivery/aggregator cancel paths, KOT text.

## 7. Risks
- E6 changes payload for every order cancel: blank note was reason text, now ''. Reports that show "note" will show empty until users type one (intended, OD-674-A).
- B7: if backend wants a different refund-note key, refund-cancel note won't land until follow-up.

## 8. Execution order
E6 + T1 → E7 + E8 → E2 (with CR-493 E1 + E3) → (after reply) B2, verify B3/B4/B7.

## 9. Verification matrix
| # | Edit | Flow | Expected | Automated? |
|---|---|---|---|:---:|
| V1 | E6/E7/E8 | Cancel order (dashboard + order screen), reason picked, note blank | `cancellation_reason`=reason, `cancellation_note`='' | NO (Network) |
| V2 | E2/E7/E8 | Same with note "Guest left" | `cancellation_note`='Guest left' | NO |
| V3 | E2 | Razorpay order cancel with Refund Note "x" | order-status-update `cancellation_note`='x' AND refund call note 'x' | NO |
| V4 | E2 | Notes box visible in normal cancel mode (M1) | ✔ | NO |
| V5 | T1 | `yarn test` cancel payload tests | All pass + new T1 | YES |
| V6 | B2 | (after BA-01/02) report + Order Beta show note | ✔ | NO |
| V7 | B3 (QA) | Full-order cancel with note, read back lines | Line `reason` unchanged | NO |
| V8 | B4 (QA) | Blank note, read back order | Note stored empty | NO |

## 10. Post-code registry checklist
- [ ] FILE_OWNERSHIP block per file · [ ] `registry.json` + `CR_REGISTRY.md` BUG-674 · [ ] tracker BA-02/03/04/24 · [ ] marker `// BUG-674` in each modified file

## 11. Mockup links
M1 → E2 · M6 → B2 (blocked).
