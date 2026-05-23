# POS3.0 Bucket A — QA Handoff — 2026-05-18

## 1. Scope

| Field | Value |
|---|---|
| Sprint | POS3.0 |
| Wave | Bug Fix Bucket A — FE Quick Wins |
| Branch | `18-may-pos3.0` |
| Bugs | BUG-102 (P0), BUG-089 (P1), BUG-100 (P1), BUG-103 (P2) |
| Build | PASS |
| Files changed | 7 |

---

## 2. Smoke QA Checklist

### BUG-102 — Mark Ready/Served Button Timeout Fix

| # | Test | Expected | Priority |
|---|---|---|---|
| 1 | Click "Mark Ready" on a dine-in order card | Button re-enables within ~1s (not 8s); spinner shows briefly | P0 |
| 2 | Click "Mark Served" on a ready order card | Button re-enables within ~1s (not 8s) | P0 |
| 3 | Click "Accept" on a scan/aggregator order | Button re-enables within ~1s | P0 |
| 4 | Double-click "Mark Ready" rapidly | Only ONE API call fires (check Network tab); second click blocked by `isActionInProgress` | P0 |
| 5 | While Ready is processing, try clicking Print KOT | Button is disabled (cross-disable still works) | P1 |
| 6 | Simulate network delay (throttle to Slow 3G) | Button re-enables at 2s fallback (not 8s) | P1 |
| 7 | Mark Ready on Card A, then immediately Mark Ready on Card B | Both cards operate independently; Card B is not blocked by Card A | P1 |
| 8 | Mark Served on a prepaid order (completePrepaidOrder path) | Button re-enables within ~1s; order disappears from dashboard via socket | P1 |

### BUG-089 — Redundant API Call Elimination

| # | Test | Expected | Priority |
|---|---|---|---|
| 1 | Kitchen marks item ready | Dashboard card updates within ~100ms; **NO** `get-single-order-new` API call in Network tab | P1 |
| 2 | Kitchen marks item served | Same — no redundant API call | P1 |
| 3 | Kitchen cancels item | Same — no redundant API call | P1 |
| 4 | Rapid item status changes (ready → served within 1s) | No double-render; card updates smoothly | P1 |
| 5 | Room transfer (if testable on v1 path) | Legacy handler STILL fires API call (not deduped — room transfer has no v2 counterpart) | P2 |
| 6 | Console log check | Should see `update-food-status: Order X recently updated via v2 payload (Yms ago), skipping redundant API call` for item status events | P2 |

### BUG-103 — Number Input Spinner Arrows Hidden

| # | Test | Expected | Priority |
|---|---|---|---|
| 1 | Collect Payment → Cash Received input | No ▲▼ spinner visible | P2 |
| 2 | Collect Payment → Discount input | No ▲▼ spinner | P2 |
| 3 | Collect Payment → Wallet Amount input | No ▲▼ spinner | P2 |
| 4 | Collect Payment → Tip input | No ▲▼ spinner (was already fixed; global rule doesn't break it) | P2 |
| 5 | Collect Payment → Delivery Charge input | No ▲▼ spinner (was already fixed) | P2 |
| 6 | Collect Payment → Compact Discount input | No ▲▼ spinner | P2 |
| 7 | Collect Payment → Compact Wallet input | No ▲▼ spinner | P2 |
| 8 | Collect Payment → Split Payment Amount input | No ▲▼ spinner | P2 |
| 9 | All number inputs still accept keyboard numeric input | Typing numbers works correctly | P2 |
| 10 | Test on Chrome, Firefox, Safari | Spinners hidden on all browsers | P3 |

### BUG-100 — Duplicate Toast Removal + Toast Position Unification

| # | Test | Expected | Priority |
|---|---|---|---|
| **Toast position** | | | |
| 1 | Trigger any toast (e.g., validation error in OrderEntry) | Toast appears at **top-right** of screen (not bottom-right) | P1 |
| 2 | Trigger an FCM notification while a toast is visible | Both appear in the **same top region** — overlap is clearly visible | P1 |
| 3 | Toast slides in from top (not from bottom) | Animation direction correct | P2 |
| **Removed toasts — verify NO local toast fires** | | | |
| 4 | Print KOT from dashboard card | No local "KOT request sent" toast; **verify FCM notification fires** | P1 |
| 5 | Print Bill from dashboard card | No local "Bill request sent" toast; **verify FCM notification fires** | P1 |
| 6 | Settle prepaid order from dashboard card | No local "Order settled" toast; FCM/socket provides notification | P1 |
| 7 | Transfer order to room from OrderEntry | No local "Transferred to Room" toast; socket provides update | P1 |
| 8 | Place+Pay (prepaid path) | No local "Payment Collected" toast; socket/FCM provides notification | P1 |
| 9 | Collect Bill (postpaid path) | No local "Payment Collected" toast; socket/FCM provides notification | P1 |
| 10 | Re-Print KOT from OrderEntry | No local "KOT request sent" toast | P2 |
| 11 | Print Bill from OrderEntry header (PrintBillButton) | No local "Bill request sent" toast | P2 |
| **Kept toasts — verify they STILL fire** | | | |
| 12 | Transfer food item to another order | "Item Transferred" toast appears (kept) | P1 |
| 13 | Merge tables | "Tables Merged" toast appears (kept) | P1 |
| 14 | Shift table | "Table Shifted" toast appears (kept) | P1 |
| 15 | Cancel item | "Item Cancelled" toast appears (kept) | P1 |
| 16 | Cancel order | "Order Cancelled" toast appears (kept) | P1 |
| 17 | Any error action (e.g., settle fails) | "Failed to settle order" destructive toast appears (kept) | P0 |
| 18 | Validation error (e.g., missing customer name on takeaway) | "Name Required" toast appears (kept) | P1 |
| **FCM coverage check (critical)** | | | |
| 19 | Print KOT → does FCM fire a notification? | **MUST VERIFY** — if no FCM, user gets no feedback for KOT print | P0 |
| 20 | Print Bill → does FCM fire a notification? | **MUST VERIFY** — if no FCM, user gets no feedback for Bill print | P0 |

---

## 3. Notification Source Map (BUG-100 Artifact)

### Actions where success toast was REMOVED (FCM/socket must cover)

| Action | Toast removed | FCM expected? | Socket expected? | Smoke verify |
|---|---|---|---|---|
| Print KOT (OrderCard) | "KOT request sent" | **VERIFY** | No direct socket | **YES — P0** |
| Print KOT (TableCard) | "KOT request sent" | **VERIFY** | No direct socket | **YES — P0** |
| Print KOT (RePrintButton) | "KOT request sent" | **VERIFY** | No direct socket | **YES — P0** |
| Print Bill (OrderCard) | "Bill request sent" | **VERIFY** | No direct socket | **YES — P0** |
| Print Bill (TableCard) | "Bill request sent" | **VERIFY** | No direct socket | **YES — P0** |
| Print Bill (RePrintButton) | "Bill request sent" | **VERIFY** | No direct socket | **YES — P0** |
| Settle Prepaid (OrderCard) | "Order settled" | YES | `update-order-paid` | Yes |
| Settle Prepaid (TableCard) | "Order settled" | YES | `update-order-paid` | Yes |
| Transfer to Room (OrderEntry) | "Transferred to Room" | Partial | `update-order` | Yes |
| Place+Pay (OrderEntry) | "Payment Collected" | YES | `update-order-paid` | Yes |
| Collect Bill (OrderEntry) | "Payment Collected" | YES | `update-order-paid` | Yes |

### Actions where toast was KEPT (no FCM/socket equivalent)

| Action | Toast | Why kept |
|---|---|---|
| Item Transferred | "Item Transferred" | No FCM for food transfer between orders |
| Tables Merged | "Tables Merged" | No FCM for merge |
| Table Shifted | "Table Shifted" | No FCM for table shift |
| Item Cancelled | "Item Cancelled" | Operational — immediate feedback needed |
| Order Cancelled | "Order Cancelled" | Operational — immediate feedback needed |
| Custom Item Added | "Custom Item Added" | Local cart action |
| Bill Split | "Bill Split" / "Bill split successfully" | No FCM for split |
| All error toasts | "Failed to..." | No FCM for errors |
| All validation toasts | "Name Required" etc. | Local validation |
| Login/Loading/Settings/Reports/Room check-in toasts | Various | Admin/setup — no FCM |

### Minor observations

| # | Observation | Severity | Action |
|---|---|---|---|
| 1 | **Update Order** (edit existing) has no explicit success toast; socket/card refresh provides visual confirmation | Minor | No action needed |
| 2 | **KOT Print** and **Bill Print** — must verify at smoke QA that FCM covers these actions. If FCM does NOT fire, the removed toasts should be restored for these specific actions. | Medium | Smoke QA item #19, #20 |

---

## 4. Regression Checklist

| Area | Check | Status |
|---|---|---|
| Dashboard card buttons | Ready/Serve/Accept/Reject all functional; no 8s delay | Verify at smoke |
| Dashboard card cross-disable | All buttons still disable during any action | Verify at smoke |
| Socket order updates | Item status changes update dashboard correctly | Verify at smoke |
| Room transfer via legacy path | Still works (dedup does not block) | Verify at smoke |
| Number inputs in Collect Payment | Accept typed numbers; no spinners | Verify at smoke |
| Error toasts | All "Failed to..." toasts still appear | Verify at smoke |
| Validation toasts | All "Required" toasts still appear | Verify at smoke |
| FCM notification banners | Still appear at top of screen | Verify at smoke |
| Local toasts | Now appear at top-right (unified position) | Verify at smoke |

---

## 5. Exclusions

### Bugs NOT in this wave

- BUG-087, BUG-088 (Wave 2 — ready_with_constraints; not started)
- BUG-090-A, BUG-090-B, BUG-091, BUG-095, BUG-101 (Waves 3-4; not started)
- BUG-092, BUG-093, BUG-094 (deferred from POS3.0 bug-fix sprint)
- BUG-096 through BUG-108 (CRs — out of scope)

### Code NOT touched

- `socketEvents.js` — event definitions stay (BUG-095)
- `useSocketEvents.js` — routing stays (BUG-095)
- `orderService.js` `fetchSingleOrderForSocket` — stays (BUG-095)
- `handleUpdateFoodStatus` full deletion — stays (BUG-095)
- Optimistic clearing block `OrderEntry.jsx` L1469-1483 — stays (BUG-088)
- `/app/memory/final/` — all 7 baseline docs untouched
- `/app/memory/BUG_TEMPLATE.md` — untouched
- No baseline or pending-freeze docs updated

---

## 6. Confirmations

- No blocked bugs were implemented.
- No CRs were implemented.
- `/app/memory/final/` was not updated.
- No baseline docs were updated.
- `BUG_TEMPLATE.md` was not modified.
- `yarn build` passed.
- All 4 bugs followed the full gate process (approval plan → approach approval → diff preview → diff approval → apply → validate).

---

*— End of POS3.0 Bucket A QA Handoff — 2026-05-18 —*
