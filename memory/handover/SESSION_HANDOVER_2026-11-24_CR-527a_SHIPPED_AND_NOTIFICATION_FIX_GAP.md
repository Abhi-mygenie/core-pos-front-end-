# SESSION HANDOVER — 2026-11-24 — Deploy + notification-fix gap + CR-527a shipped

**Author:** E1 session (deploy → investigation → re-intake → CR-527a GATE_5A)
**Branch:** `main` (local HEAD pushed to `origin/main`)
**Pick-up point for next agent:** CR-527a is **IMPLEMENTED (GATE_5A), QA PENDING**. The re-intake cherry-pick queue has 5 more units. See §6.

---

## 1. What happened this session (chronological)

1. **Deployed** the repo `core-pos-front-end-` (branch `main`) into `/app`, installed with yarn, ran under supervisor (frontend compiles, HTTP 200, "MyGenie POS"). Platform `.env` preserved; 4 missing keys (`REACT_APP_FIREBASE_API_KEY`, `_VAPID_KEY`, `REACT_APP_GOOGLE_MAPS_KEY`, `REACT_APP_CRM_API_KEYS`) collected via secure secrets card. Memory dir confirmed in sync with remote at deploy time.

2. **Investigation (gap):** Owner asked to verify the `notification-fix` branch work. Found deployed `main` (`07b8f43`) is **missing the entire `notification-fix` (`8c80bfe`) pack**. Report: `memory/INV-NOTIFICATION-FIX-DEPLOY-GAP-2026-11-24_INVESTIGATION_REPORT.md`. Summary:
   - **Ringer silent after reload** (FCM pack) — absent on main.
   - **Edit→Update leaves food_status=7, banner sticks** (CR-552 unstick) — absent on main.
   - **TAB holder → `cust_*`** (CR-527 Option B) — absent on main (main still customer-first → CUSTOMER=diner).
   - **Credit diner dropdown UX** — absent on main.
   - `web-edit-order-confirm` branch is a separate divergent reports branch, NOT the fos=7 fix.

3. **Decision:** Owner chose **re-intake + cherry-pick per bug/CR** (not a blanket merge), step by step.

4. **CR-527a taken through gates** (INTAKE → IA → PLAN → IMPLEMENTATION):
   - Intake `change_requests/CR-527_CUST_HOLDER_REMAP_REINTAKE_INTAKE.md`
   - IA `impact/CR-527_CUST_HOLDER_REMAP_IMPACT_ANALYSIS.md`
   - Plan v2 `plans/CR-527_CUST_HOLDER_REMAP_IMPLEMENTATION_PLAN.md`
   - QA handover `handover/QA_HANDOVER_CR-527a_2026-11-24.md`

---

## 2. CR-527a — what was FIXED (code, shipped)

**Problem:** On Credit/TAB bills where the diner ≠ holder, the deployed app put the **diner** into `cust_*`; backend derives `orders.user_name` from `cust_name`, so Daily Report CUSTOMER + CRM showed the **diner**, not the holder.

**Owner decisions:** OD-527a-1 = YES (cust_*=holder) · OD-527a-2 = ship FE workaround only · OD-527a-3 = holder-not-CRM-linked → `cust_membership_id` **BLANK, never diner** · OD-527a-4 = **Part A + Part B**.

**Part A — `frontend/src/api/transforms/orderTransform.js`**
- `placeOrderWithPayment` (L1414–1421) and `collectBillExisting` (L1793–1796): `cust_*` now **holder-first when `isTab`** (`tabContact || customer`); supersedes BUG-672 customer-first fallback.
- `cust_membership_id = isTab ? (tabContact?.crmId || '') : (customer?.id || '')` — **BLANK not diner** (deviation from `notification-fix`, which fell back to the diner id).

**Part B — `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (NET-NEW, not on `nf`)**
- `handlePayment` (async): when `isTabPayment && !tabCrmId` and holder name+valid phone, **awaits `lookupCustomer`→`createCustomer`** (same CRM `/pos/customers` flow order-entry uses) → `resolvedTabCrmId`; `tabContact.crmId` (L1341) now uses it. CRM timeout/fail → sonner toast + blank membership (never diner); never hard-blocks the bill. Selected-holder path unchanged (no added latency).

**Part C — `__tests__/orderTransform.cr527.test.js`:** +5 tests (holder-in-`cust_*` ×2, blank-membership edge ×2, + crmId on existing). **Unit 10/10 PASS. Webpack 0 new warnings** (only pre-existing CPP L458 `useCallback` warn).

Code markers: `// CR-527a` (4 in orderTransform.js, 2 in CollectPaymentPanel.jsx).

---

## 3. Registry / docs state (updated "till what I did")
- `memory/control/registry.json` — item **CR-527** status head = `IMPLEMENTED CR-527a 2026-11-24 (GATE_5A)`, next_action = QA; artifact_refs added (intake/impact/plan/QA). JSON valid, 1186 items.
- `memory/control/CR_REGISTRY.md` — CURRENT blocks for Gate 1→2→3→5A prepended.
- `memory/control/FILE_OWNERSHIP.md` — 2 rows added (orderTransform.js cust_* holder; CollectPaymentPanel Part B) + top CURRENT note.
- `memory/test_credentials.md` — created: `pms@macha` / ALL (preprod, rest 69).

---

## 4. Backend reply (ATTACHED — supports CR-527a)
The backend side is **already aligned** with CR-527a:
- **Contract** `memory/contracts/BATCH-B_CR-527_API_CONTRACT_2026_11_15.md` (LOCKED): `diner_name`/`diner_mobile` are new, taken from the order's customer at credit time; "the diner may differ from the credit-holder (OD-527-A)". OD-B-BB09: backend (Gyan) to confirm if `diner_mobile` matching a CRM record creates a CRM link.
- **Backend verification** `memory/investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`: CONFIRMED live on preprod — diner keys persist distinct from holder; and critically the probe shows **`user_name` mirrors `cust_name`** (`place cust_name=VERIFY_HOLDER … single user_name=VERIFY_HOLDER`). ⇒ this is exactly why CR-527a must put the **holder** in `cust_name`. Open per A2: credit-row diner population needs a real **credit settlement** to verify (= our live write-probe).
- **Backend brief / gaps:** `memory/backend_briefs/BACKEND_BRIEF_BATCH-B_2026_11_15.md`, `memory/investigations/INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`, `memory/investigations/INV-BATCH-C-BACKEND-FEEDBACK-2026-11-17.md`.

---

## 5. Investigation reports (ATTACHED — relevant to this thread)
- `memory/INV-NOTIFICATION-FIX-DEPLOY-GAP-2026-11-24_INVESTIGATION_REPORT.md` (this session — the branch gap)
- `memory/investigations/INV-CR-527_CPP_CREDIT_DINER_CAPTURE_2026-11-21.md`
- `memory/investigations/INV-CR-527_DINER_NOT_SHOWING_2026-11-21.md`
- `memory/investigations/INV-CR-527_FOLLOWUPS_SUGGESTION_AND_DINER_AUTOFILL_2026-11-21.md`
- `memory/investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md`
- `memory/investigations/INV-CR527_BUG680_COMPLETION_PLAN_AND_BACKEND_GAPS_2026-11-21.md`
- **On branch `notification-fix` (NOT on main):** `memory/INV-TAB-HOLDER-CREDIT-2026-11-22_INVESTIGATION_REPORT.md` (+ `evidence/INV-TAB-HOLDER-CREDIT-2026-11-22/placeorder_payload_sample.json`) — concluded the true root cause is backend (`user_name`←`cust_name`); Option B is the FE workaround. Pull from `nf` if needed.
- Full investigation corpus lives in `memory/investigations/` and `memory/evidence/`.

---

## 6. WHERE TO PICK UP (next agent)

**Immediate:** QA CR-527a (HIGH risk) per `handover/QA_HANDOVER_CR-527a_2026-11-24.md` — browser on preprod (`pms@macha`, rest 69):
- #6 (core) credit order holder≠diner → request `cust_*`=holder, `diner_*`=diner → Report CUSTOMER + Credit Mgmt = holder.
- #4 new holder created in CRM at submit; #5 CRM-offline → blank membership + bill completes; #7 BUG-672 prepaid move-to-credit regress.

**Remaining re-intake / cherry-pick queue (per gap report):**
1. **CR-527b** — Credit diner-dropdown UX (`CreditCustomerDetailSheet.jsx`: `Popover modal={false}`, `onWheel/onTouchMove stopPropagation`, `dinerMap` name·mobile). Clean, LOW/MED. _(not yet intaken)_
2. **CR-552** — web-edit fos=7 banner unstick (`OrderEntry.jsx` auto-confirm after Update; deps CR-559 already on main). MED/HIGH. _(not yet intaken)_
3. **FCM cluster (BUG-747 + CR-562 + YTC)** — ringer-after-reload + token refresh + YTC popup rehydrate. Coupled (shared `NotificationContext.jsx`/`soundManager.js`); intake as one batch. HIGH. New-to-main (not in registry). _(not yet intaken)_
4. **BUG-748 / BUG-749** — FCM race / device-token-never-registered. IA-only on `nf` (no code) → fresh intake → planning. _(not yet intaken)_

**Source for all cherry-picks:** branch `notification-fix` (`8c80bfe`), a **single squashed commit** → extract per-hunk, NOT `git cherry-pick <sha>`. Verify full-history (unshallow) before any blanket merge (298 deletions in `main..nf` may mean `nf` lags `main` elsewhere).

**Open follow-ups:**
- OD-527a-2 = FE-only; backend durability brief (make `user_name` source robust) is **optional/deferred**.
- Out of scope: Issue-2 (resettle/prepaid shows credit but no Credit-Mgmt ledger row) = separate BACKEND bug — needs own intake.

---

## 7. Commands
- Unit: `cd /app/frontend && CI=true npx craco test --watchAll=false --testPathPattern=orderTransform.cr527` → 10/10.
- Compile: supervisor-managed; `tail /var/log/supervisor/frontend.out.log`.
