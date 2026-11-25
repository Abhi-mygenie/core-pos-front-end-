# CR-552 UNSTICK — Impact Analysis (Gate 2, v2 — repro-confirmed)

**ID:** CR-552 (slice "unstick") · **Stage:** Gate 2 — Impact Analysis · **Date:** 2026-11-24
**Role:** PLANNING (IA only) · **Risk:** HIGH · **Priority:** P1 · **Client:** ALL · **Assignee:** Abhishek
**Intake:** `change_requests/CR-552_WEB_EDIT_UNSTICK_REINTAKE_INTAKE.md` · **Source:** `notification-fix` (`8c80bfe`), per-hunk.

---

## 0. Live repro — owner-confirmed (2026-11-24)
Reproduced by owner on preprod `pms@macha` (restaurant 69), evidence in `memory/evidence/CR-552-UNSTICK/`:
1. `01_banner_scan_order.png` — Scan&Order banner "New Web Order — Awaiting Confirmation" (t1, Dine-In, ₹201, "1× moo duudh" + "Previously ordered items (1)"). **Edit** tooltip = "Edit order in OrderEntry".
2. `02_orderentry_update.png` — OrderEntry after editing: `mko` (248 min ago), `moo d… ×2`, `mkop ×1`, KOT checked → **Update Order (2)**.
3. `03_banner_stuck_after_update.png` — **after Update**, banner **still shows** "Awaiting Confirmation" (t1, ₹400, 4 items): new `1× moo duudh` still listed as an unconfirmed item + "Previously ordered items (3)". **food_status=7 stays, banner stuck.**

**Exact steps:** scan&order arrives → **Edit** from banner → in OrderEntry add new item(s) / increase qty → **Update Order** → appended line stays `food_status=7` → `ScanOrderPopOut` banner remains until a manual **Accept**.

## 1. Root-cause chain (verified in code on `main`)
```
orderTransform.fromAPI item L163:  isNotConfirmed = Number(detail.food_status) === 7
ScanOrderPopOut L65-68:            hasUnconfirmedWebEditItems(order) = order.items.some(isNotConfirmed && status!=='cancelled')
ScanOrderPopOut L207:              queue INCLUDES orders where hasUnconfirmedWebEditItems(order)  → banner shows
OrderEntry Scenario-1 Update (L1340-1388):  updateOrder → await waitForOrderEngaged(placedOrderId) (L1385) → redirect (L1388)
      BREAK POINT: grep confirmOrder|updatePrintStatus in OrderEntry.jsx = NONE
      ⇒ appended fos=7 lines are never confirmed ⇒ hasUnconfirmedWebEditItems stays true ⇒ banner stuck.
```
On the **Accept** path (`DashboardPage.handleConfirmOrder` L1364-1390) `confirmOrder` IS called — which is why manual Accept clears it. The fix = replicate that confirm on the Update-Order path.

## 2. Fix (mirror DashboardPage.handleConfirmOrder; insert after OrderEntry L1387)
Read snapshot `getOrderById(placedOrderId)`; if the web order still has Not-Confirm lines, auto-confirm **only those**.

**Owner direction — baked in:**
- **KOT only for newly-added `food_status=7` items:** `confirmItems = items.filter(it => it.isNotConfirmed && it.status !== 'cancelled')`; KOT stations from `cartStationsToSet(confirmItems)` + BILL only.
- **OD-552-unstick-3 RESOLVED:** if **no fos=7 line remains → do nothing** (no `confirmOrder`, no scan/auto-KOT). Guard = `hasNotConfirm`; auto-KOT additionally gated by `settings.autoKot && settings.scanOrderAutoPrint`.

## 3. Files & edit sites (scope lock) — 1 file `components/order-entry/OrderEntry.jsx`
| # | Site | Change |
|---|---|---|
| E1 | import L18 | add `confirmOrder, updatePrintStatus` to `orderService` import |
| E2 | new import | `selectAgentsForKot, selectAgentsForBill, cartStationsToSet` from `../../api/transforms/printerAgentSelector` |
| E3 | `useRestaurant()` L67 | add `defaultOrderStatus` (hook already provides it — DashboardPage L184) |
| E4 | after L1387 (Scenario-1, before redirect) | guarded auto-confirm block: `snap=getOrderById(Number(placedOrderId))||orderData`; `hasNotConfirm = !!snap?.isWebOrder && items.some(isNotConfirmed && !cancelled)`; if true → build `printerAgent` only when `autoKot && scanOrderAutoPrint` (KOT stations from `confirmItems` only + BILL); `await confirmOrder(placedOrderId, permissions?.[0]||'Manager', defaultOrderStatus, printerAgent)`; if `printerAgent.length` → `await updatePrintStatus(placedOrderId,{kot_print:'Yes',bill_print:'No'})`; `catch` → non-blocking toast. |

**In-scope vars on main (verified):** `placedOrderId` (L189), `getOrderById` (L65), `settings`/`printerAgents` (L67), `permissions` (L68), `orderData` (prop), `toast`; `settings.scanOrderAutoPrint` (profileTransform L381); `isNotConfirmed`/`isWebOrder` item/order flags (CR-552 body). `defaultOrderStatus` via E3 (same `useRestaurant` hook).

**WILL NOT touch:** `ScanOrderPopOut.jsx` (banner/Mode A-B), DashboardPage reject/confirm, `orderTransform`/`reportTransform`, CPP-prop region (~L1935), Scenario-2/New-Order path (L1405+), backend.

## 4. Conflicts / blast radius
- `OrderEntry.jsx` hotspot edits (BUG-746/662/538/567, CR-482/412/413/409) all IMPLEMENTED + **line-disjoint** from the L1340-1388 update path → **CLEAN**.
- **⚠ `git diff origin/notification-fix -- OrderEntry.jsx` = +2/−39** (nf lags main) → **per-hunk port only**, never a file copy.
- Blast radius **SMALL (1 file)**, **HIGH risk** (confirm + KOT dispatch + sockets). Parallel-safe vs CR-527a/CR-527b (different files).

## 5. Risk register + Gate-3 blocker
| Risk | Mitigation |
|---|---|
| Order-level `confirmOrder` on `fOrderStatus=2` re-confirms/alters already-confirmed lines, or double-prints KOT | **OD-552-unstick-2 LIVE WRITE-PROBE (Gate-3 blocker):** on preprod, web-edit a confirmed order → Update → verify backend flips only fos=7 lines & KOT does not reprint confirmed items. (Not run in this IA — would mutate the owner's live order; symptom leg already confirmed via §0.) |
| Double KOT vs later manual Accept | auto-KOT gated by `autoKot && scanOrderAutoPrint`; `updatePrintStatus(kot_print:'Yes')` marks printed — verify in probe |
| Auto-confirm fires with no new items | `hasNotConfirm` guard (OD-552-unstick-3) |
| Confirm/CRM throw blocks redirect | try/catch, non-blocking toast; redirect already done |

## 6. Owner decisions
- OD-552-unstick-1: confirm **P1 / HIGH**.
- OD-552-unstick-2: **live write-probe** (Gate-3) — only fos=7 flipped, no double KOT.
- OD-552-unstick-3: **RESOLVED** — no fos=7 ⇒ no confirm, no auto-KOT; KOT only for newly-added fos=7 items.

---
**Gate status:** GATE_2_IA_COMPLETE (v2, symptom repro-confirmed via live order + 3 screenshots)
**Next:** PLANNING Gate 3 (Implementation Plan) — Gate-3 close gated by the OD-552-unstick-2 write-probe. No code until Gate-4 GO.
