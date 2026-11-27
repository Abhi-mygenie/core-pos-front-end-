# Investigation — CR-527 + BUG-680 Backend Verification (preprod)

**Role:** INVESTIGATION (Role 6) — read-only + reversible live probes, all cleaned up. **No application code changed.**
**Date:** 2026-11-21
**Env:** preprod `https://preprod.mygenie.online`, restaurant **69** (macha). Account `pms@macha.com` (login_type=employee, role Owner). Token held in `/tmp/tok`, never printed, cleared after.
**Trigger:** Backend handover `CR-527_BUG-680_BACKEND_HANDOVER.md` (Gyan) claims BB-09 Phase 2 (diner) + BUG-680 discount fixes are shipped. This session verifies those claims live before FE planning.

---

## 1. Summary
Backend handover is **CONFIRMED on preprod**. Both the prior session's blockers are resolved server-side:
- **CR-527:** `diner_name` / `diner_mobile` are now persisted on place-order and exposed, **distinct from the holder**, on the running order list (v1 + v2) and on `get-single-order-new`.
- **BUG-680:** order discount recalculates and propagates to the order list + single-order read; **zero-of-any-type removal now fully reverts** (the exact `.R` fix), verified with a deliberately mismatched `discount_type`.

Confidence: **HIGH** (reproduced with a live reversible write cycle).

## 2. Hypotheses Tested
| # | Hypothesis | Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Diner keys now on list reads | GET v1/v2 employee-orders-list | **CONFIRMED** keys present | below |
| H2 | Diner keys on single-order read | get-single-order-new | **CONFIRMED** (null on pre-release orders — no backfill, per A4) | `get_single_1579043.json` |
| H3 | place-order persists + exposes diner distinct from holder | place → list → single | **CONFIRMED** | `w1_place.json`, `w2_find.json` |
| H4 | Discount applies + propagates | order-discount-manage percent 15 | **CONFIRMED** 100→85 on list + single | `w3_discount_apply.json` |
| H5 | BUG-680.R: zero of mismatched type fully clears | remove with `fixed` after `percent` | **CONFIRMED** fully reverts 85→100, type→null | `w4_discount_remove.json` |

## 3. Evidence (read contract)
- `GET /api/v1/.../employee-orders-list` (no role) → **403** (expected, needs `role_name`).
- `GET /api/v1/.../employee-orders-list?role_name=Manager` → 200, `diner_name`/`diner_mobile` keys **present**.
- `GET /api/v2/.../employee-orders-list?role_name=Owner|Manager` → 200, keys **present**.
- `POST /api/v2/.../get-single-order-new` (#000013 / 1579043) → keys present; values null (pre-release order, A4 no-backfill); order carries BUG-680 fields `restaurant_discount_amount`, `order_discount`, `discount_value`, `order_discount_type`, `discount_type`.

## 4. Evidence (reversible write cycle — order 1579069 / #000023, macha 69, cancelled after)
```
place    cust_name=VERIFY_HOLDER  diner_name=VERIFY_DINER/9800000002  order_amount=100
list     diner=VERIFY_DINER/9800000002  holder=VERIFY_HOLDER        (distinct ✅)
single   diner_name=VERIFY_DINER diner_mobile=9800000002 user_name=VERIFY_HOLDER amt=100
apply%15 -> order_amount=85 discount_amount=15 type=Percent  (list=85, single=85 ✅)
remove(type=fixed, amt=0) -> order_amount=100 discount_amount=0 discount_type=null ✅ (BUG-680.R cross-type)
cancel   -> status=cancelled, removed from active list (cleanup ✅)
```
Artifacts in `/app/memory/evidence/CR527-BUG680-VERIFY-2026-11-21/` (`probe.py`, `w1..w5`, `get_single_*`, `ctx_*`).

## 4b. Cancel-notes (handover item #3) — backend contract VERIFIED live
Gyan's backend handover does **not** mention cancel-notes because it is **FE-only** — backend already fulfils the contract. Confirmed live today via `POST /api/v2/vendoremployee/report/insights-cancellations` (macha 69, 2026-11-01..21):
- 43 rows (28 `scope=item`, 15 `scope=order`). Every row carries **`stage`**, **`reason`**, **`notes`** and **`cancel_item_note`**.
- `notes` = `""` on **100%** of rows (kitchen note empty) → FE filtering/rendering on `notes` drops everything.
- The real note lives in **`cancel_item_note`** for BOTH scopes (e.g. order rows = "waiter got slapped"). No `cancellation_note` key exists anywhere.
- Evidence: `cancel_insights_live.json`, prior `evidence/CANCEL-NOTES/cancellations_2026-11-21.json`.

**FE root cause re-confirmed in current code (FE-only fix):**
- `CancellationsMockup.jsx:282` maps `notes: i.notes || ''` (never `cancel_item_note`); BUG-708 removed the Note column (`:969/:994`); export cols (`:396-432`) have Stage but no note column.
- `OrderNotesMockup.jsx:73` filters `i.notes && i.notes.trim()` → all rows excluded; renders `item.notes` (`:130`); export key `notes` (`:83`); no Stage column; subtitle still says "food-level notes".
- `CancelDetailMockup.jsx:80` spreads `...i` (has `cancel_item_note`+`stage`) but no note column rendered/exported.
- Fix: read/render `cancel_item_note` across all 3 screens + exports; OrderNotes filter `notes || cancel_item_note` + add Stage column. Backend caveat (non-blocking): `cancel_item_note` doubles as the order note — future rename/split is cleaner.
- **`testing_agent` MANDATORY after the fix** (owner standing rule): create 1 item-level + 1 order-level cancellation each WITH a note; verify all 3 screens + export show Stage+Reason+Note.

## 5. Not covered this session (recommended before closing)
- **Credit-row diner population (A2):** `tap-customer-record-list` schema keys exist, but populating a credit row needs a **credit settlement** (bill-payment with TAB). Not exercised (checked customer 1796 = cafe103 → 0 rows on macha). Verify during FE QA by settling an order-with-diner to credit and reading the credit row.
- **update-place-order diner semantics** (omit key = keep, `""` = clear) — not exercised.
- **BUG-680.E1** (fixed re-spread pro-rata after add-item) and **E2** (merge/transfer) — not exercised; E1 is a behaviour change FE should validate.
- `order-bill-payment` diner passthrough.

## 6. Recommendations / Next step
Backend is **GO** for both items. Hand to **INTAKE → PLANNING** as the prior handover already directed; backend is no longer a blocker for the happy path:
- **CR-527 (widen or CR-527b):** FE work only now — add editable "Diner (who ate)" field in `CollectPaymentPanel` credit section, stop seeding holder from diner, thread `diner_name`/`diner_mobile` through both payload builders (`orderTransform.collectBillExisting`, `placeOrderWithPayment`) and the place/update/bill-payment payloads, and render diner on the running order list + detail sheet. Field names LOCKED: `diner_name`/`diner_mobile`. OD-B-BB09 resolved by backend: diner is **plain text, no CRM link** — close that open decision.
- **BUG-680 (FE Option B):** switch apply call v1→v2, render post-discount `order_amount` + discount line on `OrderCard`; FE guardrail for clear-discount is **no longer required** (backend clears regardless of type) but harmless. Validate E1 pro-rata re-spread in FE.
- Risk **HIGH (financial for BUG-680)** → full PLANNING Gate 2, no planning-skip. `testing_agent` mandatory after FE fixes (owner standing rule), including the cancel-notes cluster from the prior handover.
