# POS3.0 BUG-097 — "Rider is on the way" fOS=5 + Rename Owner Smoke QA Checklist — 2026-05-21

> **Patch under test:** `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_IMPLEMENTATION_REPORT_2026_05_21.md`
> **Build hash:** `main.f749afc8.js` (452.25 kB)
> **Preprod URL:** `https://insights-phase.preview.emergentagent.com/`
> **Backend:** `https://preprod.mygenie.online/`
> **Status when owner starts:** `ready_for_owner_smoke_QA`
> **Supersedes:** `POS3_0_BUG_097_3_ITEM_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` row 11 + 16 (which referenced the retired `'riderReached'` token).

---

## 1. Purpose

Owner-driven smoke checklist for the fOS=5 carve-out + `'riderReached'` → `'dispatched'` rename. After all rows pass, BUG-097 advances to `bug_097_implemented_owner_smoke_passed_bucket_5_blocked`.

---

## 2. What Changed In This Patch (recap for the smoker)

| Concept | Before | After |
|---|---|---|
| Internal `riderStatus` value when rider has picked up the order | `'riderReached'` | **`'dispatched'`** |
| Pill text on OrderCard rider chip (when rider picked up) | `Order Accepted` (already correct) | `Order Accepted` (unchanged) |
| Pill `data-testid` | `rider-status-reached-${orderId}` | `rider-status-dispatched-${orderId}` |
| OrderCard at fOS=5 + delivery + rider picked up | Right button = **`Bill`** (wrong) | **`Rider is on the way`** (disabled, orange) |
| TableCard at fOS=5 + delivery + rider picked up | Right button = **`Bill`** (wrong) | **`On the way..`** (disabled, orange) |
| OrderCard fOS=2 "Reassign" branch trigger | `riderStatus !== 'riderAssigned'` | unchanged (now correctly matches `'dispatched'`) |
| Backend payload semantics | Unchanged | Unchanged — same `delivery_man_status` Yes/No, no new event |

---

## 3. Preconditions

- Two test data sets (or two delivery orders sequenced through the lifecycle):
  - **Set A** — `delivery_assign = Yes` tenant — used for Assign / Reassign / Waiting / Pill / On-the-way scenarios.
  - **Set B** — `delivery_assign = No` tenant — used for Dispatch regression.
- For "rider picked up" rows (1, 5, 6, 7, 8, 9, 11), need a delivery order where the assigned rider has flipped `delivery_man_status` to `"Yes"`. If a live rider device is not available, owner may temporarily set `delivery_man_status = "Yes"` via backend admin / DB to drive the state.
- Two roles for the `canBill` regression check:
  - **Cashier role** — `canBill = true`
  - **Non-billing role** (e.g., waiter / order-taker) — `canBill = false`

---

## 4. Smoke Rows

### 4A. Net-new behaviors (priority — these are what this patch ships)

| # | Test | Pre-state | Action | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 1 | OrderCard at fOS=5, rider picked up | Set A, delivery, fOS=5, `delivery_man_status="Yes"` | Open dashboard, find this card | Right action button shows **`Rider is on the way`** (orange, disabled, low opacity). `data-testid=rider-on-the-way-btn-*`. **NO `Bill` visible.** | | The headline fix. |
| 2 | OrderCard pill — Order Accepted (rename) | Same as row 1 | Observe rider chip | Pill text **`Order Accepted`** (green). `data-testid=rider-status-dispatched-*` (renamed; old `rider-status-reached-*` no longer present). | | Pill text intentionally unchanged. |
| 3 | TableCard at fOS=5, rider picked up | Same delivery order shown on a seated table | Observe tile | Right tile button shows **`On the way..`** (orange, disabled). `data-testid=rider-on-the-way-btn-*`. **NO `Bill` visible.** | | Short label fits the tile. |
| 4 | Cannot click "Rider is on the way" | From row 1 or 3 | Try clicking the orange button | No-op. `disabled` attribute prevents click; cursor is `cursor-default`. | | Cashier cannot accidentally bill. |

### 4B. fOS=2 regressions (after rename, must still work)

| # | Test | Pre-state | Action | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 5 | OrderCard fOS=2 — Waiting still works | Set A, delivery, fOS=2, `delivery_man_status="No"` (rider assigned, not picked up) | Open card | **`Waiting for Rider`** disabled, orange. `data-testid=waiting-rider-btn-*`. | | Regression. |
| 6 | OrderCard fOS=2 — Reassign on picked-up rider | Set A, delivery, fOS=2, `delivery_man_status="Yes"` (edge case — rider picked up before card progressed to fOS=5; if not reproducible, skip) | Open card | **`Reassign`** clickable, orange. `data-testid=reassign-rider-btn-*`. Click → AssignRiderModal opens. | | After rename, the else-arm now matches `'dispatched'` (was `'riderReached'`). Behavior identical. |
| 7 | TableCard fOS=2 — Waiting still works | Set A, delivery on seated table, fOS=2, `delivery_man_status="No"` | Observe tile | **`Waiting..`** disabled, orange. | | Regression. |
| 8 | TableCard fOS=2 — Reassign on picked-up rider | Set A, delivery on seated table, fOS=2, `delivery_man_status="Yes"` (same edge) | Observe tile | **`Reassign`** clickable, orange. Click → modal opens. | | Same as row 6 for tile. |
| 9 | OrderCard fOS=2 — Assign Rider regression | Set A, delivery, fOS=2, **no rider yet** | Observe card | **`Assign Rider`** clickable, orange. | | Regression. |
| 10 | OrderCard fOS=2 — Dispatch regression | Set B, delivery, fOS=2, no rider | Observe card | **`Dispatch`** clickable. Click → PUT order-status-update. | | First-time smoke of `delivery_assign=No` was still pending in QA v5. |

### 4C. CartPanel + non-delivery regressions

| # | Test | Pre-state | Action | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 11 | CartPanel — delivery, rider picked up | Set A, delivery, fOS=5, rider picked up | Click into the order from dashboard | Bottom button still reads **`Collect Bill ₹XX`** — **unchanged** per Q2=(a). | | CartPanel intentionally not gated. |
| 12 | CartPanel — delivery (no rider) | Delivery, fOS=5, no rider | Settlement screen | `Collect Bill ₹XX` — unchanged. | | Regression. |
| 13 | CartPanel — dine-in | Dine-in, fOS=5 | Settlement screen | `Collect Bill ₹XX` — unchanged. | | Regression. |
| 14 | CartPanel — room | Room, settlement | Settlement screen | `Checkout ₹XX` — unchanged. | | Regression. |
| 15 | Non-delivery fOS=5 — dine-in card right button | Dine-in, fOS=5 | Observe card | `Bill` (or `Settle` if prepaid + auto-settle). | | Regression. |
| 16 | Non-delivery fOS=5 — room TableCard | Room, fOS=5 | Observe tile | `C/Out`. | | Regression. |
| 17 | Non-delivery fOS=2 — dine-in Serve | Dine-in, fOS=2 | Observe card | `Serve` (green). | | Regression. |

### 4D. KOT-hide + permission regressions

| # | Test | Pre-state | Action | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 18 | KOT hidden for delivery fOS=2 | Set A, delivery, fOS=2 (any rider state) | Observe tile | No print/KOT icon. | | Regression. |
| 19 | KOT hidden for delivery fOS=5 | Set A, delivery, fOS=5 (any rider state) | Observe tile | No print/KOT icon. | | Regression. |
| 20 | `canBill=false` non-billing user — delivery fOS=5 + rider picked up | Login as non-billing role, view card from row 1 | Observe card right side | **No action button** at all (right-side action area is empty). Q3=(a) honoured — `canBill` guard keeps the new label hidden too. | | Confirms guard. |
| 21 | `canBill=false` non-billing user — non-delivery fOS=5 | Same role, view dine-in fOS=5 | Observe card | No `Bill` button. Same as today. | | Regression. |

### 4E. Optimistic update + socket regressions

| # | Test | Pre-state | Action | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 22 | Optimistic update after Assign | Set A, fOS=2, no rider | Click Assign Rider → pick rider → confirm | Card immediately flips to **`Waiting for Rider`** (with `riderStatus='riderAssigned'`). No flicker through Assign / Serve. | | Gap 2 regression. |
| 23 | Socket payload handling | From row 22, watch dev console | After ~500 ms when `delivery-assign-order` socket arrives | Log: `delivery-assign-order: Transformed order ... from socket payload`. No `Fetching order` GET log. | | Gap 1 regression. |
| 24 | Live transition: assigned → picked up | From row 22 | Backend / rider device flips `delivery_man_status` from `"No"` to `"Yes"` | Card progresses **`Waiting for Rider`** → (depending on fOS) either `Reassign` (fOS=2) or `Rider is on the way` (fOS=5). Pill text changes from **`Assigned`** to **`Order Accepted`**. | | End-to-end. |

### 4F. Build

| # | Test | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| 25 | `yarn build` | `cd /app/frontend && CI=false yarn build` | 0 errors. Bundle `~452 kB`. Hash `main.f749afc8.js`. | Already PASS at patch time. |

---

## 5. Pass / Fail Criteria

- **Rows 1–4 are the headline net-new behaviors** — at least these must pass to declare the patch successful.
- **Rows 5–24 are regression guards** — any failure indicates a side-effect from the rename and must block sign-off.
- Row 25 verified at patch creation time.

If all 25 rows pass:
- Update BUG-097 status: `bug_097_implemented_owner_smoke_passed_bucket_5_blocked`.
- Create or version a final QA report.
- Open the optional hygiene CR to retire residual `'riderReached'` references in `mockOrders.js` and `statusHelpers.js`.
- Do **NOT** open Bucket 5 — backend dependencies (BQ-097-2 / 3 / 4 / 5) remain.

If any row fails:
- Stop. Open a corrective approval gate. Do not bundle unrelated fixes.
- Capture failing row's screenshot + dev console + resolved `data-testid` value.

---

## 6. Do-Not List During Smoke

- Do not test rider accept / reject sockets (Bucket 5, backend-blocked).
- Do not test rejected-rider grey-out (Bucket 5, backend-blocked).
- Do not test customer-received / handover-complete exit transition (Bucket 5, backend-blocked).
- Do not test `mockOrders.js` / `statusHelpers.js` `'riderReached'` residuals — these are flagged as a follow-up hygiene CR, not part of this smoke.
- Do not exercise BUG-099, BUG-104, PROD-BUG-001/2/3 in this run.
- Do not update `/app/memory/final/` or baseline docs.

---

## 7. Open Backend Question (still parked — informational)

Once the smoke passes, the **only** genuinely remaining open behavior is the exit signal from `dispatched` (rider on the way) → **customer has received** the order, so the cashier can print Bill / order auto-removes from dashboard. The backend has not yet stated whether this is signalled by:

- (i) `f_order_status` advancing past 5, OR
- (ii) `delivery_man_status` going to a new value (e.g., `"Delivered"`), OR
- (iii) a new socket event entirely.

This question is owned by Bucket 5 (BQ-097-2 / 3 family). Until answered, the cashier UI will sit in the "Rider is on the way" state indefinitely; the next CR will define the exit path.

---

## Document Metadata

| Field | Value |
|---|---|
| Version | 1.0 |
| Created | 2026-05-21 |
| Target patch | `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_IMPLEMENTATION_REPORT_2026_05_21.md` |
| Owner sign-off pending | YES |
| Build verified | YES — `main.f749afc8.js` 452.25 kB, 0 errors |

*— POS3.0 BUG-097 — "Rider is on the way" fOS=5 + Rename Owner Smoke QA Checklist — 2026-05-21 —*
