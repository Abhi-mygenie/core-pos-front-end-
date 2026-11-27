# Session Handover — 2026-11-21 (E1)

**Agent:** E1 (main) · **Env:** preprod backend (`REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`), sandbox-pms restaurant 69
**Repo:** `github.com/Abhi-mygenie/core-pos-front-end-` · **Pushed branch this session:** `20261121-203719` (and this handover → `main`)
**Scope:** Fresh deploy of the frontend repo into `/app`; shipped BUG-744, BUG-745 (+copy), BUG-746; Gate-2 planning; archived backend reply + investigations.

---

## 0. Deployment (done)
- Cloned `main` of `core-pos-front-end-` directly into `/app` (preserved pod `.env`); CRA/craco + yarn; `yarn install --frozen-lockfile`; supervisor runs repo's `yarn start` on `0.0.0.0:3000`. App compiles clean, serves HTTP 200.
- `frontend/.env` written with provided MyGenie values; **secrets collected via secure card** (not chat): `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_VAPID_KEY`, `REACT_APP_CRM_API_KEYS`, `REACT_APP_GOOGLE_MAPS_KEY`, plus `GITHUB_PAT` (for the push; injected to env only, git-ignored, never committed).
- `memory/` is the repo's own governance system and is fully in sync with remote.

---

## 1. What was fixed / shipped this session

### BUG-744 — Order-screen CRM suggestion leaks without focus  ·  Risk MEDIUM  ·  **GATE_4_IMPLEMENTED (QA pending)**
- **Symptom (owner):** a *prefilled/order-loaded* customer (`saurav / 9990004354`) pops the phone suggestion dropdown on the order-entry panel with nothing focused.
- **RC (corrected from the Gate-2 IA):** `CartPanel.jsx` sync effect (L972-979) sets `isCustomerSelected=true` only on the *next* render; the first-render phone `searchCustomers().then` resolves and re-opens the dropdown with **no stale-cancel guard**.
- **Fix:** `CartPanel.jsx` — added `nameFocused`/`phoneFocused` state; gated name effect (L1010) + phone effect (L992) `setShow*Suggestions(focused && …)` + added flags to dep arrays; name field `onFocus/onBlur` (L1180-1181) set flag + 150ms close; phone wrapper `onFocusCapture` (PhoneInputField has no `onFocus` prop) + `onBlur` set flag + 150ms close.
- **Fix (credit block §E6):** `CollectPaymentPanel.jsx` — added `tabNameWasUserTypedRef` guard on the credit **name** effect (L667-686) so a seeded/selected holder name no longer pops; set true in `handleTabNameChange`, reset in `selectTabCustomer` + phone blank-out.
- **Verification:** webpack clean, no compile errors. **NOT yet testing_agent-verified.**
- Docs: `impact/BUG-744_SUGGESTION_WITHOUT_FOCUS_IMPACT_ANALYSIS.md`, `plans/BUG-744_SUGGESTION_WITHOUT_FOCUS_IMPLEMENTATION_PLAN.md`.

### BUG-745 — Diner never auto-fills on the credit block  ·  Risk MEDIUM  ·  **GATE_4_IMPLEMENTED (QA pending)**
- **Fix:** `CollectPaymentPanel.jsx` L564-565 — `dinerName`/`dinerPhone` seeded from the order customer: `useState(customer?.name/phone || "")` (was `""`). Seed-only, **no sync effect** → when the cashier changes the holder to a different payer the diner retains the original customer; manual edits preserved. holder==diner → backend null-collapses → UI "—".
- **Copy fix (owner):** L3435 label `Diner (who ate) — leave blank if same as credit customer` → `… — don't change if same as credit customer` (now that the field is pre-filled).
- **Verification:** webpack clean. **NOT yet testing_agent-verified.**
- Docs: `impact/BUG-745_DINER_AUTOFILL_IMPACT_ANALYSIS.md`, `plans/BUG-745_DINER_AUTOFILL_IMPLEMENTATION_PLAN.md`.
- **Shared-file note:** BUG-744 §E6 and BUG-745 both edit `CollectPaymentPanel.jsx` (line-disjoint). Both shipped together; FILE_OWNERSHIP records both.

### BUG-746 — Enter Price (open/dynamic-price) modal input bleeds past card  ·  Risk LOW  ·  **GATE_5_QA_PASS ✅**
- **RC:** `OrderEntry.jsx` L3088 amount input is `flex-1` with no `min-w-0`; a form control's default `min-width:auto` won't shrink below intrinsic width → overflows the fixed `w-80` card. (box-sizing is border-box globally — not a box-model bug.)
- **Fix:** `flex-1` → `flex-1 min-w-0` (1 line, `// BUG-746`).
- **Verification:** **testing_agent PASS — `test_reports/iteration_15.json`** (100% frontend, retest_needed=false). input.right = card.right−24px at desktop 1920, mobile landscape 844×390, portrait 390×844 (incl. long value + validation error). Functional: Cancel closes, empty→validation, Add to Order adds melo fish @ ₹275/₹99.5, no console errors, no order placed.
- **Test note:** only `melo fish` (price===1) opens the dynamic-price modal for RID 69; `open item` is ₹100 and does not.
- Docs: `change_requests/BUG-746_…INTAKE.md`, `impact/BUG-746_…IMPACT_ANALYSIS.md`.

---

## 2. Registry state (this session's items)
| ID | Gate | QA | Next |
|---|---|---|---|
| BUG-744 | GATE_4_IMPLEMENTED | pending | testing_agent browser QA |
| BUG-745 | GATE_4_IMPLEMENTED | pending | testing_agent browser QA |
| BUG-746 | GATE_5_QA_PASS | ✅ iteration_15 | owner smoke → CLOSURE |
| BUG-680 | (pre-existing) RE-INTAKE REQUIRED | backend done | FE re-intake (INTAKE role) |

---

## 3. Backend reply (archived)
- **`handover/CR-527_BUG-680_BACKEND_HANDOVER.md`** — Backend (Gyan) → FE, 2026-11-21. Locks field names `diner_name` / `diner_mobile` (string|null, plain text, never CRM-linked). CR-527 Part A (diner persist/read/fallback) **done**; BUG-680 Part B: `.R` zero-clears any discount type **fixed**, `.E1` fixed discount now re-spread pro-rata **(behaviour change)**, `.E2` target-wins on merge **unchanged by decision**. Live-verified by `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`.

---

## 4. Investigation reports (archived — read these for context)
- `investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md` — origin RCA for BUG-744 (ISSUE 1) + BUG-745 (ISSUE 2).
- `investigations/INV-CR-527_CPP_CREDIT_DINER_CAPTURE_2026-11-21.md` — credit-block diner capture trace.
- `investigations/INV-CR-527_DINER_NOT_SHOWING_2026-11-21.md` — diner display trace.
- `investigations/INV-BUG-680_DISCOUNT_DASHBOARD_2026-11-21.md` — BUG-680 dashboard/order_amount RCA.
- `investigations/INV-BUG-680_V2_DISCOUNT_DASHBOARD_FE_READINESS_2026-11-20.md` — FE readiness for the v2 discount path.
- `investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md` — live backend verification of the backend reply.
- `investigations/INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md` — remaining FE completion plan + backend gaps.

---

## 5. Next agent — pick up here
1. **QA BUG-744 + BUG-745 (testing_agent, browser, preprod RID 69, `owner@thegoankitchen.com` / `Qplazm@10`):**
   - BUG-744: open an order whose customer is prefilled → order-entry panel shows **no** name/phone dropdown unfocused; typing shows suggestions while focused, blur closes, pick selects. Credit block: seeded holder name → no dropdown; typing works.
   - BUG-745: order with a customer → Collect Payment → Credit: diner pre-filled; change holder to a different payer → diner retains original; clear diner manually → respected; walk-in → blank; label reads "don't change if same as credit customer".
   - Fix any findings, then → GATE_5.
2. **BUG-746:** owner smoke on device → CLOSURE.
3. **BUG-680 (P0, HIGH, financial):** backend shipped & verified. **FE remains → RE-INTAKE from INTAKE role.** FE scope: switch apply v1→v2 `order-discount-manage`; render post-discount `order_amount` + discount line on OrderCard / Collect Bill button / dashboard tile; validate E1 pro-rata. Full Planning Gate 2 (HIGH financial risk). See backend reply §Part B + the two INV-CR527_BUG680 docs.

---

## 6. Git
- Branch `20261121-203719` pushed to origin (SHA `767c0c10`). This handover + registry corrections committed and pushed to **`main`**.
- `.env` files are git-ignored; no secrets committed.

## 7. Credentials
- `memory/test_credentials.md` — `owner@thegoankitchen.com` / `Qplazm@10` (The Goan Kitchen, RID 69; open-price item `melo fish`). Reach dynamic-price modal: login → table (e.g. t1 = `table-card-9244`) → tap `melo fish` (`menu-item-248252`). Mobile portrait shows a rotate overlay (BUG-555) — use landscape or a wide viewport.
