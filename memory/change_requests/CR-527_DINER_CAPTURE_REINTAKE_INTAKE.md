# CR-527 (RE-INTAKE, capture phase) — Diner vs Credit-Holder capture in the Collect-Payment credit flow

**Registered:** 2026-11-21 (re-intake)
**Type:** CR (scope expansion of CR-527 — same ID, FE-only remaining)
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE (re-intake)
**Role:** INTAKE (Role 6 boot done: CONTROL_DASHBOARD, CR_REGISTRY, BUG_TRACKER, INTAKE_WORKFLOW read)

---

## 1. Description

Owner wants the **diner** (person who actually ate) captured **separately from the credit holder** (person the credit is booked against) inside the **CollectPaymentPanel credit/TAB flow**, and shown through to the running-order list/detail and the already-shipped credit detail sheet.

The original CR-527 (credit-row filter + Diner column display) is **shipped** (E1-E3, GATE_5A, QA_PASS 2026-11-20). Backend write+read for `diner_name`/`diner_mobile` is **DONE & live-verified** (see §7). What remains is **FE capture + payload threading + running-order display** — registered here.

---

## 2. Owner Business Rule (NEW — OD-527-D, locked this session)

1. **Diner field is only shown/enabled once the credit-customer (holder) fields are filled.** No orphan diner without a holder.
2. **If the diner field is left empty → send the holder's `name` + `mobile` as `diner_name` / `diner_mobile`.** Default diner = holder.
3. A distinct diner is an **explicit opt-in**: the cashier types a different name/phone to record "Abhishek ate → Saurav's credit" (OD-527-A).

**Interaction to confirm (flagged, not silently resolved):**
Backend contract A2 (`CR-527_BUG-680_BACKEND_HANDOVER.md`) stores **both diner fields as `null` when diner == holder** (same mobile, or same name case-insensitive when no mobile), and the detail sheet / `CreditRow` renders **"—"** in that case. So under OD-527-D the common path (empty diner → holder sent as diner) will **display as "—"** (i.e. "same as holder"), and a real diner name appears **only** when a distinct diner is typed.
→ **This is the intended, correct outcome** and is consistent with the owner's rule. Recorded as expected behaviour so Planning/QA do not treat the "—" as a defect.

---

## 3. Classification

- **Type:** CR (scope expansion of CR-527)
- **Priority:** P0 (owner-driven, carried from CR-527)
- **Severity:** P1 — High (credit attribution / customer data; no workaround in the capture flow today)
- **Risk:** **HIGH** — upgraded from MEDIUM. Touches `CollectPaymentPanel` + place/update/bill-payment payloads = customer data + credit attribution in a financial area.
- **Area:** Payments / Coupons / Credit
- **Fast Lane:** NOT eligible. **Planning-skip NOT eligible → full PLANNING Gate 2.**

---

## 4. Duplicate Check

- **Result: RE-INTAKE of CR-527** (same ID). Not a new ID — scope expansion of the existing CR per owner instruction (`SESSION_HANDOVER_2026-11-21_BUG743_CR527_BUG680.md` §3). Display/filter scope already shipped; capture/write/running-order scope registered here.

---

## 5. Remaining FE Scope (for PLANNING — not built here)

1. **Add an explicit "Diner (who ate)" field** (name + optional phone) in `CollectPaymentPanel.jsx` Credit Customer Details section, gated to appear only after holder fields are filled (OD-527-D rule 1).
2. **Stop seeding the holder field from the order customer** so holder/diner don't collapse by accident (`CollectPaymentPanel.jsx:557` `tabName` seed). Seed the new **diner** field from the order customer instead.
3. **Empty-diner default:** when diner left blank, populate `diner_name`/`diner_mobile` from the holder on send (OD-527-D rule 2).
4. **Thread `diner_name`/`diner_mobile` as dedicated fields** on BOTH payload builders — `orderTransform.collectBillExisting` AND `placeOrderWithPayment` — plus place-order / `update-place-order` / `order-bill-payment` payloads, honouring A2 keep/clear semantics (omit = keep, `""`/`null` = clear).
5. **Render diner on the running-order path:** order list card + single-order detail sheet (consume `diner_name`/`diner_mobile` from `employee-orders-list` v1+v2 and `get-single-order-new`).
6. Credit detail-sheet Diner column + filter (already shipped) then lights up for distinct diners.

---

## 6. Code Reality

- **Status: PARTIAL.**
  - DONE: credit-row display — `creditTransform.js`, `CreditCustomerDetailSheet.jsx`, test `creditTransform.cr527.test.js` (E1-E3, GATE_5A, QA_PASS 2026-11-20).
  - REMAINING: `CollectPaymentPanel.jsx` has **no diner field** (single holder identity `tabName`/`tabPhone`); `orderTransform.js` write builders do **not** thread `diner_name`/`diner_mobile`; running-order list/detail (`OrderCard.jsx`, `socketHandlers.js`) do **not** consume diner.

---

## 7. Backend Status (DONE — verified)

- `CR-527_BUG-680_BACKEND_HANDOVER.md` (Gyan) + live verification `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`:
  - Persist `diner_name`/`diner_mobile` on place-order / update-place-order / order-bill-payment and credit-insert (A2); fallback snapshot from order (BB-09.2b); returned on `employee-orders-list` (v1+v2) + `get-single-order-new` + `tap-customer-record-list` (A3).
  - Plain text only — **never creates/links a CRM customer** (A4). No backfill: pre-release rows return `null`.

---

## 8. Evidence

- **Source:** OWNER-REPORTED (2026-11-21, rest 69 macha + prior cafe103 probes)
- **Confidence:** CONFIRMED (FE code-traced; backend live-verified)
- Investigations: `investigations/INV-CR-527_CPP_CREDIT_DINER_CAPTURE_2026-11-21.md` (capture gap H3/H4), `INV-CR-527_DINER_NOT_SHOWING_2026-11-21.md`, `INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`
- Code refs: `CollectPaymentPanel.jsx:557` (holder seed), `:1295` (tabContact), `:3335-3424` (Credit Customer Details section); `orderTransform.js:1412-1418` (prepaid conflation), `:1786-1793` (existing-order two-block identities); `CreditCustomerDetailSheet.jsx:140` (diner hidden when == holder)

---

## 9. Blast Radius

- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (diner capture UI)
- `frontend/src/api/transforms/orderTransform.js` (`collectBillExisting`, `placeOrderWithPayment` payload threading)
- `frontend/src/components/cards/OrderCard.jsx` + running-order detail (diner display)
- (already shipped: `creditTransform.js`, `CreditCustomerDetailSheet.jsx`)
- **Estimated scope:** MEDIUM (3-4 files). Hotspot files touched: YES (`orderTransform.js`, `CollectPaymentPanel.jsx`).

---

## 10. Client + Assignee

- **Client:** ALL (reported on rest 69 macha; applies platform-wide)
- **Assignee:** Abhishek (frontend work, not backend-blocked — backend shipped)
- **Routing reason:** Payments/Credit frontend, not blocked at backend → Abhishek

---

## 11. Next

→ **PLANNING Gate 2** (Impact Analysis). HIGH risk / financial area → full gate, no planning-skip. Planning must curl-probe a live credit write with a **distinct** diner on preprod to confirm backend persists `diner_name ≠ holder` before locking the plan (honesty note from capture investigation §6).
