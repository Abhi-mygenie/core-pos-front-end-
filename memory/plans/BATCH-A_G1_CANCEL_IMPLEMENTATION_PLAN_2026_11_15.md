# BATCH-A · G1 Cancel (BUG-674, BUG-670, CR-493 + item-cancel right) — Implementation Plan (Gate 3) — 2026-11-15

> **SUPERSEDED 2026-11-15 by per-CR plans** — `BATCH-A_BUG-674_…`, `BATCH-A_CR-493_…`, `BATCH-A_BUG-670_…`, `BATCH-A_CR-515_…` (E9) `_IMPLEMENTATION_PLAN_2026_11_15.md`. Kept for history; do not build from this file.

> Status: **GATE_3_PLAN_PARTIAL** — FE-only edits READY; backend-dependent edits listed as BLOCKED (owner R13: plan only backend-free parts now).
> Build only after Gate 4 GO **and** QA pass of open items on the same files (see §2).
> Mockups: M1 `#m1` (order cancel), M2 `#m2` (item cancel), M3 `#m3` (no reasons), M6 `#m6` (reports — BLOCKED).
> Probes (read-only, 2026-11-15): `evidence/BATCH-A-G3/` (reasons list Order 5 / Food 6; cancel-order-list 11-02/11-09/11-11; insights Nov 1–14).

## 1. Code reality (verified at HEAD 2026-11-15)
| File | Line | Current |
|---|---|---|
| `components/order-entry/CancelOrderModal.jsx` | L66 | label `Cancellation Reason` (no `*`) |
| same | L103-L118 | Notes textarea shown **only** `isRefund`; label `Refund Note`; placeholder `Add a note for the refund (optional)`; testid `cancel-order-refund-note` |
| same | L84 | `reasons.map(...)` — empty list renders an empty dropdown; button stays disabled (no message) |
| same | L22 | `onCancel(selectedReason, cancellationNote)` |
| `components/order-entry/CancelFoodModal.jsx` | L158 | label `Cancellation Reason` (no `*`) |
| same | L201-L215 | `Additional Notes (Optional)` textarea — value `additionalNotes` |
| same | L35 | `onCancel({ item, reason, cancelQuantity, remainingQuantity })` — **note is dropped** (BUG-670 FE half) |
| same | L182 | `reasons.map(...)` — same empty-list behaviour |
| `api/transforms/orderTransform.js` | L1028 | `cancellation_note: reason.reasonNote \|\| reason.reasonText` (BUG-674: reason text duplicated into note) |
| `components/order-entry/OrderEntry.jsx` | L1572 | `orderToAPI.cancelOrder(orderId, role, reason, {...})` — note not passed (only used for Razorpay L1594) |
| `pages/DashboardPage.jsx` | L1383 | `orderToAPI.cancelOrder(order.orderId, role, reason)` — note not passed (only Razorpay L1395) |
| `components/order-entry/OrderEntry.jsx` | L353 | `const canCancelItem = hasPermission('food');` |
| Reports refund-cancel (`AllOrdersReportPage.jsx` L899, `OrderReportBetaPage.jsx` L323) | — | call only `cancelAndRefund(..., note)` — note already sent as `cancellation_note` on the Razorpay endpoint. Not touched. |

## 2. Conflict pre-check
| File | Open item(s) not yet QA'd | Overlap |
|---|---|---|
| OrderEntry.jsx | BUG-662, BUG-656, CR-512 (GATE_5A) | No line overlap (L353, L1572) → build after QA, recheck lines |
| DashboardPage.jsx | CR-533 (Gate 1 only) | None |
| orderTransform.js | BUG-664/665/666 (GATE_5A), BUG-639 (Gate 3) | No overlap with L1028 |
| CancelOrderModal / CancelFoodModal | none | — |

## 3. Exact edits — READY (no backend needed)
| # | Item | File / line | Current → New |
|---|---|---|---|
| G1-E1 | CR-493 | CancelOrderModal L66 | `Cancellation Reason` → `Cancellation Reason *` (M1) |
| G1-E2 | BUG-674 / M1 | CancelOrderModal L103-L118 | Notes box shown in **every** mode. Cancel mode: label `Notes (Optional)`, placeholder `Type here…`, testid `cancel-order-note`. Refund mode: keep label `Refund Note` + testid `cancel-order-refund-note` (one box, owner R14-Q1). Update header comment L1-L3. |
| G1-E3 | CR-493 / M3 | CancelOrderModal L63-L101 | If `reasons.length === 0`: hide dropdown, show M3 message (red box) testid `cancel-order-no-reasons`; button stays disabled. |
| G1-E4 | CR-493 | CancelFoodModal L158 | `Cancellation Reason` → `Cancellation Reason *` (M2) |
| G1-E5 | CR-493 / M3 | CancelFoodModal L155-L199 | Same no-reasons block, testid `cancel-food-no-reasons`. |
| G1-E6 | BUG-674 (OD-674-A) | orderTransform L1028 | `reason.reasonNote \|\| reason.reasonText` → `reason.reasonNote \|\| ''` (blank note stays blank). |
| G1-E7 | BUG-674 | OrderEntry L1572 | pass `{ ...reason, reasonNote: note.trim() }` instead of `reason`. Razorpay call L1594 unchanged (same note → refund, owner R14-Q1). |
| G1-E8 | BUG-674 | DashboardPage L1383 | same as E7. L1395 unchanged. |
| G1-E9 | CR-515 R9 (R-2) | OrderEntry L353 | `hasPermission('food')` → `hasPermission('order_cancel')` + marker. |
| G1-T1 | tests | `__tests__/api/transforms/cancelAndUpdatePayload.test.js` | Add: reason without `reasonNote` → `cancellation_note: ''`. Existing tests pass a `reasonNote` → unchanged. |

## 4. BLOCKED edits (do NOT build until backend reply)
| # | Item | Needs | What will change |
|---|---|---|---|
| G1-B1 | BUG-670 | **BA-01** field name | CancelFoodModal L35 add `note`; OrderEntry `handleCancelFood` forward; orderTransform `cancelItem` (L981-L1010) send note under BA-01 key. Built as one unit (no dead plumbing). |
| G1-B2 | BUG-674 / M6 | **BA-01, BA-02** | Cancellation report Notes column = cancel note; Order Beta reason + note on cancelled rows. |
| G1-B3 | BUG-674 | **BA-03** | Backend only — FE verifies line `reason` no longer overwritten. |
| G1-B4 | BUG-674 | **BA-04** | Backend saves empty note when blank — FE side is G1-E6. Verify after reply. |
| G1-B5 | CR-493 | **BA-05** key | Notes mandatory/optional setting → `*` on Notes + button disabled while empty. |
| G1-B6 | CR-493 | **BA-23 (new)** | "No reason provided" in Insights — backend auto-cancel (see §8). |
| G1-B7 | BUG-674 | **BA-24 (new)** | Owner rechecks with backend that `cancellation_note` on order-status-update is the right key for the refund-cancel note too. E7/E8 already send it; if backend wants another key → small follow-up. |

## 5. Scope lock
Only the files/lines above. NOT touched: refund logic (`razorpayRefundService`), reports refund flow, reason list loading (`SettingsContext`), cancel timing rules, delivery/aggregator cancel paths, any reason text printed on KOT.

## 6. Risks
- R-2: users with `food` but without `order_cancel` lose item cancel (owner approved).
- Empty-reasons block: restaurants with no reasons configured cannot cancel at all until reasons are added (owner OD-493-B). Release note to support.
- Reasons are loaded at boot (`SettingsContext.isLoaded`); a modal opened before load shows the M3 block — acceptable (boot finishes before dashboard).

## 7. Execution order
E6 + T1 → E7 + E8 → E1 + E2 + E3 → E4 + E5 → E9.

## 8. Probe finding — "No reason provided" (OD-493-A, answered)
Orders 021028 (11-02), 021319 (11-09), 021432 (11-11): every item cancelled one by one via cancel-food-item **with** a reason (`reason_type` 332/337/333, `cancel_by` 3092). Backend then auto-cancels the order with `cancellation_reason = null`, `canceled_by = null`. Insights counts these 5 lines again as **order** cancels "No reason provided" (₹1,360). Not an FE bug → **BA-23** added to Gyan's brief. Also seen: 021421 `cancel_state: Merge` (merge cancel, no reason) — same ask.

## 9. Verification matrix
| # | Flow | Expected |
|---|---|---|
| V1 | Cancel order (dashboard + order screen), reason picked, note blank | Payload `cancellation_reason`=reason, `cancellation_note`='' |
| V2 | Same with note "Guest left" | `cancellation_note`='Guest left' |
| V3 | Razorpay order cancel with Refund Note "x" | order-status-update `cancellation_note`='x' AND refund call note 'x' |
| V4 | Label shows `Cancellation Reason *` (order + item) | ✔ |
| V5 | Reasons list empty (mock) | Block message, no dropdown, button disabled (both modals) |
| V6 | User with `food`, without `order_cancel` | Item cancel hidden |
| V7 | User with `order_cancel`, without `food` | Item cancel visible |
| V8 | `yarn test` cancel payload tests | All pass + new T1 |

## 10. Registry checklist (Gate 5A)
FILE_OWNERSHIP block per file · CR_REGISTRY + registry.json statuses (BUG-674, CR-493 partial; BUG-670 blocked) · backend tracker BA-23/BA-24.

## 11. Mockup links
M1 order cancel (E1/E2) · M2 item cancel (E4) · M3 no reasons (E3/E5) · M6 reports (B2, blocked).
