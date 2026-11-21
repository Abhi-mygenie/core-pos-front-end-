# Session Handover — 2026-11-21 → next agent (INTAKE)

**Outgoing role:** INVESTIGATION (Role 6) — read-only + live preprod probes (incl. reversible writes, all cleaned up). **No application code changed.**
**Incoming role:** INTAKE — **re-intake all 3 items below** with the new evidence + decisions captured here, then push to main.
**Env:** preprod `https://preprod.mygenie.online`, restaurant 69. Accounts: `pms@macha.com`, `owner@cafe103.com` / `Qplazm@10`.

## TL;DR — three items, all root-caused with LIVE evidence
| Item | What owner sees | Root cause (verified) | Needs backend? | Status to set at intake |
|---|---|---|---|---|
| **CR-527** diner on credit (Collect-Payment flow) | diner never shows anywhere | FE never captures a distinct diner + backend never persists/exposes it | **YES** (BB-09 Phase 2) | scope-expand CR-527 (or open **CR-527b**) → needs backend + FE |
| **BUG-680** discount → dashboard | tile/order-list shows pre-discount amount | FE still calls v1 apply + OrderCard renders pre-discount | mostly NO (1 bug + 2 edge cases) | FE fix; 1 backend bug ticket |
| **Cancel reports** stage+reason+note | note missing (item & order) | FE reads wrong field; BUG-708 deleted the column | **NO** (backend fulfils contract) | FE-only fix |

---

## 1) CR-527 — Diner (who ate) vs Credit Holder
**Owner's refined ask (this session):** implement it on the **Collect-Payment credit flow**, and the diner must ALSO appear on the running order list (`employee-orders-list?role_name=Manager`).

**New evidence (live):**
- `tap-customer-record-list` returns `diner_name`/`diner_mobile` keys but **null on 100% of rows** (cafe103 0/428; macha 0 credit customers).
- Cross-ref: underlying orders have `cust_name=null`, `user_name`=holder → diner slot itself empty. Backend has nothing to copy.
- `employee-orders-list?role_name=Manager` has **no** diner field at all (only `user/user_name/cust_name/cust_mobile`).

**Decisions / classification:**
- Shipped CR-527 = **detail-sheet display only**; the capture + list-exposure is **NEW scope**. Recommend **widen CR-527 or open CR-527b**.
- Two-layer fix: **FE** adds an explicit editable "Diner (who ate)" field in `CollectPaymentPanel` credit section (`:3335-3424`), stops seeding holder from diner (`:557`), and threads dedicated `diner_name`/`diner_mobile` through BOTH payload builders (`orderTransform.collectBillExisting:1786-1793` and `placeOrderWithPayment:1412`). **Backend** = BB-09 Phase 2 (see brief).
- **Open OD for owner:** does `diner_mobile` create a CRM link or stay plain text? (OD-B-BB09, unresolved.)
- Risk HIGH → PLANNING Gate 2 after intake.

## 2) BUG-680 — Order discount must reflect on dashboard / order list
**New evidence (live, reversible writes, cleaned up):**
- v2 `order-discount-manage` recalcs and **propagates to `employee-orders-list`** for BOTH `role_name=Owner` (#000013: 1717→1546, disc 171.7) and `role_name=Manager` (#000020: 100→85, disc 15); `get-single-order-new` matches. **Backend happy path READY.**
- **NEW backend bug:** `discount_amount:0` only recalcs when `discount_type` matches the applied type. Removing a `percent` discount with `type:"fixed"` cleared the header but left `order_amount` stale (85) and line `discount_on_food`=15. Removing with matching type reverts correctly.

**Decisions / classification:**
- **FE-only for the dashboard** (OD-680-01 = Option B already locked): switch apply call v1→v2 (`constants.js:259`), render post-discount `order_amount` + discount line on `OrderCard` (data already parsed: `order.discount/discountValue/discountType`), verify `OrderEntry.jsx:~1223` + `CartPanel.jsx:~512`.
- **FE guardrail:** when clearing a discount, send the currently-applied `discount_type` (not hardcoded).
- **Backend ticket:** zero-of-any-type must fully recalc (BUG-680.R). Plus 2 pre-existing V2 edge cases (fixed reallocation after add; mixed fixed+% merge policy).
- Risk HIGH (financial) → PLANNING Gate 2, no planning-skip.

## 3) Cancellation reports — Stage + Reason + Note (item AND order)
**New evidence (live, pms@macha.com, 2026-11-21):** `insights-cancellations` returns all 3 facts for BOTH scopes; the **note is in `cancel_item_note` for item AND order rows** (order rows too). No `cancellation_note` key exists. `notes` (kitchen) is empty. → **answers the prior handover's open question.**

**Decisions / classification: FE-only.** Three consumers drop the note:
- `CancellationsMockup.jsx:282` maps only `i.notes` (never `cancel_item_note`); render `:994-1002`; BUG-708 removed the Note column (`:969`). Export columns `:410-422` lack a note column.
- `CancelDetailMockup.jsx:152-169` has the data (`...i`) but no note column; export `:104-108` lacks it.
- `OrderNotesMockup.jsx:73` filters on `notes` only → all rows excluded; no stage column; render `:130`.
- Fix: map + render `cancel_item_note` for both scopes across all 3 screens + exports; OrderNotes filter `notes || cancel_item_note` + add Stage column + fix "food-level notes" subtitle.
- Backend contract caveat (non-blocking): `cancel_item_note` misleadingly also carries the order note — future rename/split is cleaner.
- **Owner standing rule:** `testing_agent` MANDATORY after the fix (create 1 item-level + 1 order-level cancellation each WITH a note; verify all 3 screens + export show Stage+Reason+Note).

---

## Artifacts produced this session (all under /app/memory)
- `investigations/INV-CR-527_DINER_NOT_SHOWING_2026-11-21.md`
- `investigations/INV-CR-527_CPP_CREDIT_DINER_CAPTURE_2026-11-21.md`
- `investigations/INV-BUG-680_DISCOUNT_DASHBOARD_2026-11-21.md`
- `investigations/INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`
- `investigations/INV-CANCEL-REPORTS_STAGE_REASON_NOTE_2026-11-21.md`
- `briefs/BACKEND_BRIEF_CR-527_and_BUG-680_2026-11-21.md` (consolidated, for Gyan)
- `briefs/BACKEND_BRIEF_CR-527_BB-09_PHASE2_2026-11-21.md` (CR-527-only, superseded by consolidated)
- `evidence/CR-527/`, `evidence/BUG-680/`, `evidence/CANCEL-NOTES/cancellations_2026-11-21.json`

## Next agent (INTAKE) — recommended actions
1. Re-intake **CR-527** as a widened scope / **CR-527b**: capture + persist + expose diner; attach backend brief Part A; register OD-B-BB09 (CRM) as owner-decision-pending.
2. Re-intake **BUG-680**: confirm Option B FE plan + raise backend ticket BUG-680.R (remove recalc) and E1/E2 edge cases; attach brief Part B.
3. Re-intake **cancel-reports** (BUG-708 cluster): FE-only, 3 screens + exports; note the `cancel_item_note` dual-purpose caveat; testing_agent mandatory.
4. Update `control/registry.json` + `control/CR_REGISTRY.md` statuses accordingly, then push to main.

**Guardrails carried forward:** no invented FE fallbacks for genuinely-missing data (raise backend brief instead); field names LOCKED (`diner_name`/`diner_mobile`); `testing_agent` mandatory before declaring any fix done (owner standing rule).
