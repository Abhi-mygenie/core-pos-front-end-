# SESSION HANDOVER — 2026-11-21 — CR-527 (shipped) + BUG-744/745 (planned) + BUG-680 (next)

**Branch:** main · **App:** MyGenie POS front-end (deployed to `/app`, runs via supervisor `yarn start` from `/app/frontend`)
**Preprod API:** `https://preprod.mygenie.online` · **QA account:** `pms@macha.com` / `Qplazm@10` (rest 69). Alt `owner@cafe103.com`. (`owner@mealbreak.com` → 401, avoid.) See `memory/test_credentials.md`.

This session ran the full Alpha gate pipeline on CR-527 and queued two follow-up bugs. Below is exactly what shipped, what is planned, and where the next agent starts.

---

## A. DONE & SHIPPED — CR-527 (capture phase) → GATE_5A (IMPLEMENTED, QA pending)

**What:** Capture the **diner (who ate)** separately from the **credit holder (who pays)**, persist via `diner_name`/`diner_mobile`, and display on running orders + the (already-shipped) credit detail sheet.

**Decision:** Option A additive — holder mapping UNCHANGED (`cust_*` + TAB `name/mobile` stay the holder); only `diner_name`/`diner_mobile` added. OD-527-D: send raw diner, blank→omit/'' (never echo holder; backend null-collapses diner==holder → "—"). OD-527-D.1: diner field gated behind a valid holder. OD-527-F: detail-sheet row + conditional card chip. OD-527-G: socket not touched (diner via refetch).

**Code shipped (12 edits / 5 files + 1 test, all marked `// CR-527`):**
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — diner state (L564-565), handlers (L742-747), gated "Diner (who ate)" field, `dinerContact` in paymentData (L1311).
- `frontend/src/api/transforms/orderTransform.js` — `placeOrderWithPayment` TAB block emits `diner_name`/`diner_mobile` (place-order `data`); `collectBillExisting` emits them **omit-when-blank** (bill-payment top-level); `fromAPI.order` reads `diner`/`dinerMobile`.
- `frontend/src/api/transforms/reportTransform.js` — `singleOrderNew` reads diner (detail-sheet source).
- `frontend/src/components/reports/OrderDetailSheet.jsx` — diner row (only when ≠ holder).
- `frontend/src/components/cards/OrderCard.jsx` — diner chip (only when distinct).
- `frontend/src/api/transforms/__tests__/orderTransform.cr527.test.js` — 6/6 PASS.

**Verification:** unit 6/6 PASS, webpack compiled clean, app loads (login screenshot OK). EXIT GATE 5/5.
**NOT done (next agent):** (1) **testing_agent browser QA** — see `memory/handover/QA_HANDOVER_CR-527_2026-11-21.md`. (2) **Live write-probe** holder≠diner on preprod rest 69 (place credit order; verify `employee-orders-list` v1+v2 + `get-single-order-new` + `tap-customer-record-list` return the diner; blank/holder==diner → `null`). R11 bare-curl read-probe returned an `errors` envelope (FE supplies params); backend read already live-verified.
**Artifacts:** `impact/CR-527_DINER_CAPTURE_IMPACT_ANALYSIS.md`, `plans/CR-527_DINER_CAPTURE_IMPLEMENTATION_PLAN.md`, `change_requests/CR-527_DINER_CAPTURE_REINTAKE_INTAKE.md`, `handover/QA_HANDOVER_CR-527_2026-11-21.md`, `handover/SESSION_HANDOVER_2026-11-21_CR527_IMPL.md`.

---

## B. PLANNED (GATE_3, ready for IMPL) — BUG-744 + BUG-745

Both found via investigation of owner screenshots on the credit flow. **Files are disjoint → can be built in parallel, no shared-file lock.**

### BUG-744 — order screen shows CRM suggestion without focus (`CartPanel.jsx`, MEDIUM)
- **RC (confirmed):** manual-typed customer never flips `isCustomerSelected` (no auto-select on valid phone), AND dropdown visibility isn't tied to focus (`onBlur` L1180/1225 doesn't close; only outside-mousedown does). Order-LOADED customers are already suppressed (sync effect L972-979) — bug is the manual path.
- **Sibling of BUG-660** (fixed same class in CollectPaymentPanel credit block; CartPanel never touched).
- **Plan (5 edits, 1 file):** add `nameFocused`/`phoneFocused`; gate name effect (L1007-1016) + phone effect (L989-998) `setShow*Suggestions` on the focus flag; `onBlur`→setFocused(false)+150ms `setShow(false)`; `onFocus`→setFocused(true). No payload/`selectCustomer` change. Verify `PhoneInputField` forwards `onFocus`.
- **No owner decision.** `impact/BUG-744_…`, `plans/BUG-744_…`, `bugs/BUG-744_…`.

### BUG-745 — diner should auto-fill with the original order customer (`CollectPaymentPanel.jsx`, MEDIUM)
- **RC (confirmed):** order customer seeds the HOLDER (L557-558); diner starts empty (L564-565) and is never seeded → changing holder to a different payer drops the original customer. Design gap in shipped CR-527 OD-527-D.
- **Owner decisions:** OD-745-01 = auto-fill diner from order customer (Option Q). **OD-745-02 = SHOW pre-filled** (default applied).
- **Plan (1 edit, 1 file):** seed `dinerName`/`dinerPhone` from `customer?.name/phone` at init (L564-565), **seed-only** (no sync effect → preserve manual edits). Browser test matrix in the plan.
- `impact/BUG-745_…`, `plans/BUG-745_…`, `bugs/BUG-745_…`.

**Next agent:** IMPLEMENTATION role (Gate 4 GO) → code both → `testing_agent` browser verification (required per bug-fix rule).

---

## C. NEXT UP — BUG-680 (RE-INTAKE REQUIRED; backend DONE, FE remaining)

**What:** Order-level discount not reflected on the dashboard. **Backend is DONE & live-verified**; this is now FE-only but **HIGH financial risk** (no planning-skip).
- **Backend reply (attached):** `memory/handover/CR-527_BUG-680_BACKEND_HANDOVER.md` — Part B: discount endpoint moved to **`POST /api/v2/vendoremployee/order/order-discount-manage`**; `R` fully clears any-type discount on `discount_amount:0`; **E1 behaviour change** = fixed discount re-spreads pro-rata when items are added (e.g. ₹20 on ₹100 item, add ₹100 item → shares 10/10, total 180); E2 target-wins.
- **Backend verification:** `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`.
- **FE remaining (from IA, not yet planned to Gate 3):**
  1. Switch endpoint v1→v2 in `frontend/src/api/constants.js:259` (`MANAGE`).
  2. Render post-discount `order_amount` + discount line on `OrderCard.jsx` (data already in `orderTransform` L234-247).
  3. Drop the now-unneeded FE clear-discount guardrail; confirm `applyOrderDiscount(discountAmount:0)` reverts.
  4. Validate E1 pro-rata re-spread (test case 10/10/180).
  5. Planning must curl-probe v2 on preprod before coding.
- **Next agent:** INTAKE re-intake → full PLANNING Gate 2 (HIGH financial, no skip).

---

## D. Registry state (as of this handover)

| Item | Gate | Status | Next |
|---|---|---|---|
| CR-527 | GATE_5A | IMPLEMENTED (capture) | testing_agent QA + live write-probe |
| BUG-744 | GATE_3_PLAN_COMPLETE | Planned | IMPL → testing_agent |
| BUG-745 | GATE_3_PLAN_COMPLETE | Planned | IMPL → testing_agent |
| BUG-680 | (RE-INTAKE REQUIRED) | Backend DONE, FE remaining | re-intake → PLANNING Gate 2 |

`control/registry.json` (JSON valid), `control/CR_REGISTRY.md`, `control/BUG_TRACKER.md`, `control/FILE_OWNERSHIP.md` all updated. `memory/test_credentials.md` restored.

---

## E. All referenced reports (attached in this branch)

**Backend reply:** `memory/handover/CR-527_BUG-680_BACKEND_HANDOVER.md`
**Investigations:**
- `memory/investigations/INV-CR-527_CPP_CREDIT_DINER_CAPTURE_2026-11-21.md`
- `memory/investigations/INV-CR-527_DINER_NOT_SHOWING_2026-11-21.md`
- `memory/investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md` (BUG-744/745 RCA)
- `memory/investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`
- `memory/investigations/INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`
- `memory/investigations/INV-BUG-680_DISCOUNT_DASHBOARD_2026-11-21.md`
- `memory/investigations/INV-BUG-680_V2_DISCOUNT_DASHBOARD_FE_READINESS_2026-11-20.md`
**Prior session handovers:** `memory/handover/SESSION_HANDOVER_2026-11-21_BUG743_CR527_BUG680.md`, `…_CR527_IMPL.md`, `…_INVESTIGATION_CR527_BUG680_CANCELNOTES.md`

---

## F. Ops notes
- App deployed into `/app` from `github.com/Abhi-mygenie/core-pos-front-end-` (branch main). Frontend secrets (Firebase/CRM/Maps) in the platform secret store, injected into `/app/frontend/.env`.
- Memory dir is in sync with this branch (pushed).
