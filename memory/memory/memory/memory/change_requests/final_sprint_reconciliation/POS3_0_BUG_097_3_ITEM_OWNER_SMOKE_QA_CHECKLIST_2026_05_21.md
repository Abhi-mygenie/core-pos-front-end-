# POS3.0 BUG-097 — 3-Item Owner Smoke QA Checklist — 2026-05-21

> **Patch under test:** `POS3_0_BUG_097_3_ITEM_IMPLEMENTATION_REPORT_2026_05_21.md`
> **Build:** PASS — `main.3a5d4052.js` 452.31 kB
> **Preprod URL:** `https://insights-phase.preview.emergentagent.com/` (BUG-097 deployment)
> **Backend:** `https://preprod.mygenie.online/`
> **Status when owner starts:** `ready_for_owner_smoke_QA`

---

## 1. Purpose

Owner-driven smoke checklist for the 3 frontend-only label/branching items applied per the Final Planning Completion doc. After all rows pass, BUG-097 advances to `bug_097_implemented_owner_smoke_passed_bucket_5_blocked`.

---

## 2. Preconditions

- Two test tenants ready (or two delivery orders on a single tenant):
  - **Tenant A** — `delivery_assign = Yes` (profile flag) — used for Assign Rider / Reassign / Waiting / Pill scenarios.
  - **Tenant B** — `delivery_assign = No` (profile flag) — used for Dispatch regression check.
- One delivery order at fOrderStatus 2 with **no rider yet**.
- One delivery order at fOrderStatus 2 with **rider assigned, pending accept** (`riderStatus = 'riderAssigned'`).
- One delivery order at fOrderStatus 2 with **rider accepted** (`riderStatus = 'riderReached'`). If a backend-driven accept is not reproducible (Bucket 5 is blocked), use a mocked riderStatus override via console or wait for backend simulation.
- One delivery order at fOrderStatus 5 (post-bill).
- One dine-in order, one takeaway order, one room order — all reachable to settlement screen.

---

## 3. Smoke Rows

| # | Test | Pre-state | Action | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| 1 | `yarn build` | branch `22-may` checked out | `cd /app/frontend && CI=false yarn build` | 0 errors. Bundle ~452 kB. | | Done at patch time — PASS. |
| 2 | Assign Rider regression | Tenant A, delivery, fOS=2, no rider | Open OrderCard | `Assign Rider` button (orange) visible. `data-testid=assign-rider-btn-*`. | | |
| 3 | Dispatch regression | Tenant B, delivery, fOS=2, no rider | Open OrderCard | `Dispatch` button (orange) visible. `data-testid=dispatch-btn-*`. | | First-time smoke for `delivery_assign=No`. |
| 4 | Waiting state | Tenant A, delivery, fOS=2, `riderStatus='riderAssigned'` | Observe card | `Waiting for Rider` button — disabled, orange, low opacity. `data-testid=waiting-rider-btn-*`. | | |
| 5 | Reassign state (new) | Tenant A, delivery, fOS=2, `riderStatus='riderReached'` | Observe card | `Reassign` button — clickable, orange. `data-testid=reassign-rider-btn-*`. | | New branching path. |
| 6 | Reassign opens modal | From row 5 | Click `Reassign` | `AssignRiderModal` opens with current rider preselected. | | |
| 7 | TableCard parity — Waiting | Tenant A, delivery on a seated table, fOS=2, `riderStatus='riderAssigned'` | Observe table tile | Short label `Waiting..` — disabled, orange. `data-testid=waiting-rider-btn-*`. | | |
| 8 | TableCard parity — Reassign | Tenant A, delivery on seated table, fOS=2, `riderStatus='riderReached'` | Observe table tile | Short label `Reassign` — clickable, orange. `data-testid=reassign-rider-btn-*`. | | |
| 9 | TableCard Reassign opens modal | From row 8 | Click `Reassign` (stopPropagation should not select the table) | Modal opens; table not "selected" / no navigation. | | |
| 10 | Rider pill — Assigned | `riderStatus='riderAssigned'` | Observe rider chip | Pill reads **`Assigned`** (orange) — unchanged. | | Regression. |
| 11 | Rider pill — Order Accepted (new) | `riderStatus='riderReached'` | Observe rider chip | Pill reads **`Order Accepted`** (green). NOT `Reached`. `data-testid=rider-status-reached-*` still present. | | New label. |
| 12 | CartPanel — delivery | Delivery order, all items placed + served, open Order Entry | Observe bottom button | Reads **`Collect Bill ₹XX`**. NOT `Delivered`. `data-testid=collect-bill-btn`. | | Item 1 verification. |
| 13 | CartPanel — dine-in | Dine-in order, ready to settle | Observe bottom button | Reads `Collect Bill ₹XX` — unchanged. | | Regression. |
| 14 | CartPanel — takeaway | Takeaway order, ready to settle | Observe bottom button | Reads `Collect Bill ₹XX` — unchanged. | | Regression. |
| 15 | CartPanel — room | Room order, ready to settle | Observe bottom button | Reads `Checkout ₹XX` — unchanged. | | Regression. |
| 16 | Card fOS=5 — delivery | Delivery, fOS=5 | Observe card | Right button reads `Bill` (or `Settle` if prepaid + auto-settle path). | | Regression — should already be the case from 2026-05-21 revert. |
| 17 | Card fOS=5 — dine-in/takeaway | Non-delivery, fOS=5 | Observe card | Right button reads `Bill`. | | Regression. |
| 18 | Card fOS=5 — room | Room, fOS=5 | Observe TableCard | Right button reads `C/Out`. | | Regression. |
| 19 | KOT hidden — delivery fOS=2 | Delivery, fOS=2 (any rider state) | Observe TableCard | No print/KOT icon. | | Regression. |
| 20 | KOT hidden — delivery fOS=5 | Delivery, fOS=5 | Observe TableCard | No print/KOT icon. | | Regression. |
| 21 | Console after assign | Tenant A, click Assign Rider, pick a rider, confirm | Watch dev console | Log: `delivery-assign-order: Transformed order ... from socket payload`. No `Fetching order` GET log. | | Gap 1 regression (already confirmed in QA v5). |
| 22 | Optimistic update | From row 21 | Watch card immediately after Assign API resolves | Card flips to `Waiting for Rider` instantly (no flicker back to Assign Rider, no Serve). | | Gap 2 regression. |
| 23 | Non-delivery cards full regression | Dine-in / takeaway / room at fOS=1, 2, 5 | Observe | `Ready` / `Serve` / `Bill` (or `C/Out` room) — all unchanged. | | |
| 24 | Bundle delivered | After deploy | Check that `main.3a5d4052.js` is served | Hash matches build output. | | Deployment-only check. |

---

## 4. Pass / Fail Criteria

- **All 24 rows must pass** to declare the 3-item patch owner-confirmed.
- Rows 4, 5, 7, 8, 11, 12 are the **net-new behaviors** introduced by this patch and have priority.
- Rows 2, 3, 13–20, 23 are **regression guards** — failure of any indicates a side-effect to revert.
- Row 5 / Row 8 / Row 11 each require a delivery order in `riderStatus='riderReached'` state. If backend simulation is not available, owner may temporarily flip the field via React DevTools to verify the UI branch — this is acceptable for the smoke pass.

---

## 5. After Smoke Pass

If all rows pass:
- Mark BUG-097 status: `bug_097_implemented_owner_smoke_passed_bucket_5_blocked`.
- Update `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md` → v6 (or create a new dated report) reflecting this run's results.
- Do NOT proceed to Bucket 5 — backend dependencies remain (BQ-097-2 / 3 / 4 / 5).
- Do NOT update `/app/memory/final/`.

If any row fails:
- Stop. Open a corrective approval gate. Do NOT mix unrelated fixes.
- Capture the failing row's screenshot + dev console log + `data-testid` resolved value.
- Defer to owner for prioritisation before retouching code.

---

## 6. Do-Not List During Smoke

- Do not test rider accept / reject sockets (Bucket 5).
- Do not test rejected-rider grey-out (Bucket 5).
- Do not test "Rider On The Way" pill (Bucket 5).
- Do not exercise BUG-099, BUG-104, PROD-BUG-001/2/3 in this run.
- Do not update `/app/memory/final/` or baseline docs.

---

## Document Metadata

| Field | Value |
|---|---|
| Version | 1.0 |
| Created | 2026-05-21 |
| Target patch | `POS3_0_BUG_097_3_ITEM_IMPLEMENTATION_REPORT_2026_05_21.md` |
| Owner sign-off pending | YES |
| Build verified | YES — 452.31 kB, 0 errors |

*— POS3.0 BUG-097 — 3-Item Owner Smoke QA Checklist — 2026-05-21 —*
