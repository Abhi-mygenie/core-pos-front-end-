# CR-527a (RE-INTAKE) — TAB holder → `cust_*` (Option B re-map)

**ID:** CR-527 (same ID, scope-expansion slice "a")
**Type:** CR (re-intake / scope expansion of CR-527)
**Registered:** 2026-11-24 (INTAKE role, Gate 1)
**Classification:** CR — payment/credit customer-attribution correctness
**Severity/Priority:** **P1**
**Risk:** **HIGH** (CRITICAL-adjacent — drives `orders.user_name`, Daily Report CUSTOMER, CRM sync on every TAB/credit bill)
**Area:** Payments / Coupons / Credit
**Client:** ALL
**Assignee:** Abhishek (frontend, not backend-blocked — auto-route confirmed by owner)
**Fast Lane:** NOT eligible (financial/customer-data area)
**Duplicate check:** **RELATED** — extension of CR-527. NOT a duplicate: capture-phase (diner_* threading) already shipped GATE_5A; this slice is the previously-**deferred** holder re-map.

---

## 1. Problem

On a Credit/TAB bill where an outer diner differs from the tab holder, the deployed app writes the **diner** into `cust_*` (because `cust_*` is **customer-first**). Backend writes `orders.user_name`/`user_id` from `cust_*`, so Daily Report **CUSTOMER** and CRM sync show the **diner** (e.g. oele/patz) instead of the **tab holder** (e.g. koji).

## 2. Why this is a re-intake (decision history)

- CR-527 Gate-2 IA flagged the crux **OD-527-E**: FE `cust_*` mapping is inverted vs backend A1 (`cust_*` = holder). Two options were offered:
  - **Option A (additive):** add `diner_*` only, leave `cust_*`/holder mapping unchanged — **chosen then** (lower risk).
  - **Option B (re-map):** make `cust_*` = holder when TAB — **deferred as HIGH risk**.
- The capture phase shipped Option A (diner_* threading, chips, detail rows). The **holder re-map (Option B) was never done on `main`.**
- The `notification-fix` branch agent has now implemented **Option B**. This intake brings that deferred slice back into the pipeline on `main`.

## 3. Evidence

- **Deployed `main` (`07b8f43`)** — `frontend/src/api/transforms/orderTransform.js`:
  - `collectBillExisting` L1415–1421: `cust_name: customer?.name || (isTab ? tabContact?.name : '')` → **customer-first** (diner wins).
- **`notification-fix` (`8c80bfe`)** — same spots become **holder-first** when `isTab`:
  - `cust_name: isTab ? (tabContact?.name || customer?.name || '') : (customer?.name || '')` (collectBillExisting ~L1415 and placeOrderWithPayment ~L1802).
  - `orderTransform.cr527.test.js` +46 asserts holder lands in `cust_*`, diner stays in `diner_*`.
- Branch handover: `SESSION_HANDOVER_2026-11-24_CREDIT_TAB_CUSTOMER_AND_DINER_UX.md` §1.
- Prior branch investigation: `memory/INV-TAB-HOLDER-CREDIT-2026-11-22_INVESTIGATION_REPORT.md` (+ payload sample) — present on `notification-fix`.
- Gap investigation (this session): `memory/INV-NOTIFICATION-FIX-DEPLOY-GAP-2026-11-24_INVESTIGATION_REPORT.md`.

## 4. Scope / Blast radius

- **Files (cherry-pick target):** `frontend/src/api/transforms/orderTransform.js` (2 spots), `frontend/src/api/transforms/__tests__/orderTransform.cr527.test.js`.
- **Separable:** ✅ clean — no shared-file coupling with the FCM pack or the credit-UX slice.
- **Scope lock:** touches `cust_*` precedence inside the TAB/credit (`isTab`) branch only. Cash/Card/UPI/PayLater and unpaid `place-order` **unchanged**. Backend `OrderController` unchanged (no promote-from-`name`).
- Estimated scope: SMALL (2 files).

## 5. Open questions / owner decisions

- **OD-527a-1:** Confirm Option B supersedes OD-527-E Option A for the TAB leg (holder in `cust_*`). Owner suggested re-intake → treated as YES, to be reconfirmed at Gate 2.
- Needs a **live write-probe** (place a credit order with holder ≠ diner) to verify `orders.user_name` = holder on preprod before Gate-5 close.

## 6. Source commit for cherry-pick

- Branch `notification-fix` (`8c80bfe`, single squashed commit). Extract the `orderTransform.js` + `orderTransform.cr527.test.js` hunks only (per-hunk; not `git cherry-pick <sha>`).

## 7. Credentials / environment

- Test account: see `/app/memory/test_credentials.md` (alias: `pms@macha` / client ALL). Password not printed here (masked per control-doc security rule).

---

**Gate status:** GATE_1_INTAKE_COMPLETE
**Next:** PLANNING Gate 2 (Impact Analysis) for the Option-B `cust_*` re-map — no code/cherry-pick until owner Gate-4 GO.
