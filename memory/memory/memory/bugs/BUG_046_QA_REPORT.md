# BUG-046 — QA Report

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bug | **BUG-046** — Editable delivery charge not reflected in order total |
| Task Type | QA Validation (no implementation) |
| QA Date / Time (UTC) | 2026-05-12 |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` |
| QA HEAD at validation | `430dfb8` (implementation auto-commit) |
| Implementation Summary Doc | `/app/memory/bugs/BUG_046_IMPLEMENTATION_SUMMARY.md` |
| Pre-Implementation Gate Doc | `/app/memory/bugs/BUG_046_PRE_IMPLEMENTATION_CODE_GATE.md` |
| Status Pull Doc | `/app/memory/bugs/BUG_046_STATUS_PULL.md` |
| Owner Approval | Granted 2026-05-12; Edit B option locked as **B-2 (live-wins-only-when-edited)** |
| Other Bugs Touched | **NONE** (BUG-045 sealed; BUG-044 parked) |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |

---

## 1. Docs Read (in mandatory order)

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md` — CR-008 / CR-013 anchors, hotspot register.
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md` — QA gate format, hotspot rules.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — confirmed no overlap with BUG-046.

### Accepted Overlay Docs (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### BUG-046-specific Docs
- `/app/memory/BUG_TEMPLATE.md` — BUG-046 intake @ L3781–3845.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` — analysis @ L1120–1229.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` — plan @ L518–569.
- `/app/memory/bugs/BUG_046_STATUS_PULL.md` — screenshot evidence + Business Logic Safety Rules + Regression Validation Required.
- `/app/memory/bugs/BUG_046_PRE_IMPLEMENTATION_CODE_GATE.md` — locked formulas + owner approval matrix.
- `/app/memory/bugs/BUG_046_IMPLEMENTATION_SUMMARY.md` — applied edits + self-validation.

### Implementation Diff Inspected
- `git log -1 --stat` on commit `430dfb8` — exact applied diff.

---

## 2. Files Changed

`git log -1 --stat` on the implementation auto-commit `430dfb8`:

```
 frontend/src/components/order-entry/OrderEntry.jsx |  41 ++-
 memory/bugs/BUG_046_IMPLEMENTATION_SUMMARY.md      | 325 +++++++++++++++++++++
 2 files changed, 364 insertions(+), 2 deletions(-)
```

| File | Type | Status |
| --- | --- | --- |
| `frontend/src/components/order-entry/OrderEntry.jsx` | Source code | ✅ **+39 / −2 lines** — both approved edits present |
| `memory/bugs/BUG_046_IMPLEMENTATION_SUMMARY.md` | New doc | ✅ Created as expected output of implementation task |

**Both edits visually located in file at QA time:**

```
grep -n "BUG-046" /app/frontend/src/components/order-entry/OrderEntry.jsx
696:  // BUG-046 (May-2026, owner-approved 2026-05-12 — gate doc:
1241:              // BUG-046 (May-2026, owner-approved 2026-05-12, Option B-2 —
```

- **Edit A** at L696 (placed-branch delta) ✅
- **Edit B (B-2)** at L1241 (initialDeliveryCharge live-wins-when-edited) ✅

---

## 3. Validation Scenarios and Results

Validation was performed at two levels:

- **L1 — Static code-logic validation** via JavaScript test harness that mirrors the exact formulas applied to `OrderEntry.jsx` L695–717 (Edit A) and L1254–1258 (Edit B). 11 scenarios exercised.
- **L2 — Live-browser smoke** via Playwright screenshot capture against `https://insights-phase.preview.emergentagent.com`. Confirms app loads cleanly with no console errors; does **not** exercise the cashier flow because the preprod backend is in "Frontend Preview Only" mode and real cashier credentials with a seeded placed delivery order are not available to the QA session.

### Static Logic Harness Results (mirrors applied formulas)

| # | Scenario | Inputs (`live`, `echo`, `orderType`, `hasPlacedItems`) | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| 1a | Placed delivery, first open (no edit) | live=10, echo=10, delivery, placed | total=115, initDC=10 | total=115 (delta=0), initDC=10 | ✅ PASS |
| 1b | **Screenshot scenario — cashier edits 10→30** | live=30, echo=10, delivery, placed | total=135, initDC=30 | total=135 (delta=+20), initDC=30 | ✅ **PASS** |
| 2 | Negative edit 50→0 | live=0, echo=50, delivery, placed | total=105, initDC=0 | total=105 (delta=−50), initDC=0 | ✅ PASS |
| 3 | Same-value re-typed 25→25 | live=25, echo=25, delivery, placed | total=130, initDC=25 | total=130 (delta=0), initDC=25 | ✅ PASS |
| 4 | Walk-in placed (live=30 typed) | live=30, echo=0, walkIn, placed | total=100 (unchanged), initDC=30 (irrelevant) | total=100 (delta=0), initDC=30 | ✅ PASS — gate `orderType !== 'delivery'` zeroes delta |
| 5 | Dine-in placed | live=0, echo=0, dineIn, placed | total=200, initDC=0 | total=200 (delta=0), initDC=0 | ✅ PASS |
| 6 | Take-away placed | live=0, echo=0, takeAway, placed | total=150, initDC=0 | total=150 (delta=0), initDC=0 | ✅ PASS |
| 7 | Pre-place fresh delivery, live=40 | live=40, echo=0, delivery, **!placed** | total=140 (=100 item + 40 delivery via deliveryAddOn), initDC=40 | total=140, initDC=40 | ✅ PASS *(see note below)* |
| 8 | Re-engage delivery (live resynced to echo) | live=10, echo=10, delivery, placed | total=115, initDC=10 | total=115 (delta=0), initDC=10 | ✅ PASS |
| 9 | Mixed: 1 placed + 1 unplaced, cashier edits 10→30 | live=30, echo=10, delivery, placed, unplacedSubtotal=50 | total=115+55+20=190, initDC=30 | total=190 (delta=+20), initDC=30 | ✅ PASS |
| 10 | Room flow (`orderType='room'`) | live=0, echo=0, room, placed | total=300, initDC=0 | total=300 (delta=0), initDC=0 | ✅ PASS |

**Note on Scenario 7:** Initial test fixture incorrectly set `rawLocalTotal = 140` (including delivery), which produced total=180. After correcting the fixture to `rawLocalTotal = 100` (the actual derivation: `localSubtotal + localTax`, items+tax only, delivery added separately via `deliveryAddOn` per CR-008 Sub-CR #1 Round-3), result is 140 as expected. **Code is correct;** initial mismatch was test-harness fixture bug, not a code bug. Re-run shown:

```
$ node -e "...corrected fixture..."
Pre-place fresh delivery, item ₹100 + cashier types ₹40 delivery: total=140 (expect 140)
```

### Scenario coverage vs sprint-task §"Must validate"

| Sprint-task validation item | Coverage |
| --- | --- |
| 1. Screenshot scenario (₹100 item, ₹10 echo, edit to ₹30) | ✅ Scenario 1b — total ₹135, panel initDC ₹30 |
| 2. First open / re-engage with no edit | ✅ Scenarios 1a, 8 — total unchanged from today, initDC = echo |
| 3. Negative edit (₹50 → ₹0) | ✅ Scenario 2 — total drops by ₹50 |
| 4. Same-value edit (₹10 → ₹10) | ✅ Scenario 3 — no double adjustment |
| 5. Non-delivery orders unchanged (walk-in / dine-in / take-away / room) | ✅ Scenarios 4, 5, 6, 10 — all delta=0 |
| 6. Pre-place / new order branch unchanged | ✅ Scenario 7 — uses pre-place ternary arm verbatim from before |
| 7. Web delivery-lock unchanged | ✅ Static — `CollectPaymentPanel.jsx` L938 untouched (predicate runs on the new seeded value; `isWebOrder && initialDeliveryCharge > 0` branch intact) |
| 8. Prepaid readOnly unchanged | ✅ Static — `isPrepaid` branch of same predicate, untouched |
| 9. CollectPaymentPanel.jsx unchanged | ✅ `git diff` empty for that file |
| 10. Payment API payload shape unchanged | ✅ No `frontend/src/api/` file modified; `orderTransform.toAPI.collectBillExisting` untouched |
| 11. No backend write / no auto-PATCH | ✅ Diff contains no new `axios`/`fetch` call, no new `updateOrder` invocation, no new `useEffect`. Pure render-scope computation. |
| 12. Item subtotal / GST / SC / tip / discount / coupon / round-off unchanged | ✅ None of these symbols appear in the diff |
| 13. `orderFinancials.amount` source-of-truth | ✅ Never overwritten; only **added to** via `placedDeliveryDelta` |

### Live-Browser Smoke (L2)

| Probe | Result |
| --- | --- |
| `curl -sI http://localhost:3000` | ✅ HTTP/1.1 200 OK |
| `curl -sI https://insights-phase.preview.emergentagent.com` | ✅ HTTP/2 200 (previously verified) |
| Playwright `page.goto` + `domcontentloaded` | ✅ SUCCESS, page title = "Loading..." then resolves |
| Login page rendering | ✅ Mygenie logo, tagline ("Streamlined Hospitality. Exceptional Experience."), Email + Password inputs, "LOG IN" button, "© Mygenie 2025" footer — all rendered correctly |
| Browser console at landing | ✅ No errors / warnings tied to the BUG-046 diff |
| Frontend supervisor service | ✅ RUNNING, no restart, hot reload only |

**Cashier flow (placed order → edit delivery charge → verify Cart button → open Collect Payment → verify panel field → pay)** was **NOT** exercised live in this QA session because:
1. Preview shows the banner _"Frontend Preview Only. Please wake servers to enable backend functionality."_ The preprod backend at `preprod.mygenie.online` is currently dormant.
2. QA session has no real cashier credentials seeded with a placed delivery order containing a known backend `delivery_charge` value.

These are owner-smoke prerequisites (wake servers + use a known test merchant + reproduce the screenshot scenario in a real session). This is the standard hand-off boundary; the QA verdict reflects that.

---

## 4. Business Logic Safety Checklist (20 hard locks from gate §9)

| # | Locked surface | QA Verification | Result |
| --- | --- | --- | --- |
| 1 | Item subtotal (`localSubtotal`, `unplacedSubtotal`, `rawLocalTotal`, `rawUnplacedTotal`) | Diff contains zero references to these symbols (other than passing existing values through). `git grep -E "localSubtotal\|unplacedSubtotal" <diff>` empty. | ✅ |
| 2 | GST / tax (`localTax`, `unplacedTax`) | Same — no references in diff. | ✅ |
| 3 | Service charge | No references in diff. | ✅ |
| 4 | Tip | No references in diff. | ✅ |
| 5 | Discount | No references in diff. | ✅ |
| 6 | Coupon / loyalty | No references in diff. | ✅ |
| 7 | Round-off (`applyRoundOff`, `rawFinalTotal`) | `applyRoundOff` still called in same positions as before; not modified. | ✅ |
| 8 | Paid / prepaid logic | No references in diff. | ✅ |
| 9 | `CollectPaymentPanel.jsx` business formulas | `git diff --quiet CollectPaymentPanel.jsx` → clean. Entire file untouched. | ✅ |
| 10 | Payment / settlement API payload structure | No `frontend/src/api/` file modified (`git diff --name-only frontend/src/api/` empty). | ✅ |
| 11 | Backend write / update behavior | No new `axios`/`fetch`/`updateOrder`/`placeOrder` call in diff. | ✅ |
| 12 | Auto-PATCH | No new `useEffect` / setState trigger / async call in diff. Inline edits are render-time only. | ✅ |
| 13 | `orderFinancials.amount` source-of-truth | Diff reads from it; never assigns to it. Only adds delta on top. | ✅ |
| 14 | `data-testid` attributes | Diff adds no `data-testid`, removes none, renames none. `cart-delivery-charge-input`, `delivery-charge-section`, Collect Bill button id, Pay button id all preserved. | ✅ |
| 15 | Web delivery-lock | `CollectPaymentPanel.jsx` L938 predicate untouched; runs on new seeded value (still `> 0` for web orders). | ✅ |
| 16 | Prepaid readOnly | `isPrepaid` branch of same predicate untouched. | ✅ |
| 17 | Pre-place branch behavior | `: applyRoundOff(rawLocalTotal) + deliveryAddOn` arm unchanged. Logic Scenario 7 confirms numeric equivalence. | ✅ |
| 18 | Walk-in / dine-in / take-away / room | `orderType === 'delivery'` gate forces `placedDeliveryDelta = 0`. Logic Scenarios 4, 5, 6, 10 confirm. | ✅ |
| 19 | `CartPanel.jsx` | `git diff --quiet CartPanel.jsx` → clean. Untouched. | ✅ |
| 20 | `orderTransform.toAPI.collectBillExisting` | `git diff --quiet orderTransform.js` → clean. Untouched. | ✅ |

**20/20 locks held.** No business logic surface compromised.

---

## 5. Forbidden Files Check

Per gate §10 H / I / J + §12 row 7:

| File / Path | Expected | `git diff --quiet` Result | Verdict |
| --- | --- | --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Unchanged | Clean (exit 0) | ✅ |
| `frontend/src/components/order-entry/CartPanel.jsx` | Unchanged | Clean (exit 0) | ✅ |
| `frontend/src/api/transforms/orderTransform.js` | Unchanged | Clean (exit 0) | ✅ |
| `frontend/src/api/services/orderService.js` | Unchanged | Clean (exit 0) | ✅ |
| `frontend/src/api/` (entire folder) | Unchanged | `git diff --name-only -- frontend/src/api/` → empty | ✅ |
| `frontend/src/hooks/` | Unchanged | empty | ✅ |
| `frontend/src/utils/` | Unchanged | empty | ✅ |
| `/app/memory/final/` | Unchanged | empty | ✅ |
| `/app/memory/BUG_TEMPLATE.md` | Unchanged | empty | ✅ |
| BUG-044 surfaces (`socketHandlers.js`, `OrderContext.jsx`) | Unchanged | empty | ✅ |
| BUG-045 surfaces (`ScanOrderPopOut.jsx`, `DashboardPage.jsx`) | Unchanged | empty | ✅ |

**No forbidden files modified. Diff scope is exactly one source file (`OrderEntry.jsx`) + one new doc.**

---

## 6. Tests / Build Run

| Tool | Target | Command / Notes | Result |
| --- | --- | --- | --- |
| ESLint | `OrderEntry.jsx` | `mcp_lint_javascript path_pattern=...OrderEntry.jsx` | ✅ **No issues found** |
| Webpack | dev compile | `tail /var/log/supervisor/frontend.out.log` post-edit | ✅ **"Compiled successfully!" + "webpack compiled successfully"** (hot reload re-compiled after both edits; no errors / warnings tied to the diff) |
| Supervisor | `frontend` service | `supervisorctl status frontend` | ✅ RUNNING (no restart needed; hot reload only) |
| Static logic harness | Edit A + Edit B formulas | `node /tmp/bug046_logic.js` | ✅ **10/11 PASS** (1 fixture bug confirmed → re-ran with corrected fixture → ✅ PASS, total 11/11) |
| Live HTTP probe (local) | `http://localhost:3000` | `curl -sI` | ✅ HTTP/1.1 200 OK |
| Live HTTP probe (public) | `https://insights-phase.preview.emergentagent.com` | Playwright `page.goto` | ✅ HTTP/2 200; page renders; no console errors |
| Frontend test suite (Jest / RTL) | `frontend/src/` test files | `find . -name "*.test.*"` | ⚠ **No test suite present** in `core-pos-front-end-` repo; no Jest / RTL / Cypress test files exist for this codebase. Same status as prior bug closures (BUG-045 QA report did not run a test suite either, for the same reason — repo is non-test-suite-bearing). |
| Production build | `yarn build` | NOT run | ⚠ Skipped — dev server already compiled successfully, no `package.json`-level change, no dependency change. Production build would only be informative; not blocking for QA. Recommended for the final preprod release pipeline. |

**Build/lint/compile: all green.**

---

## 7. Issues Found

### Code defects: **NONE**

All 11 static logic scenarios pass (1 self-corrected fixture). Lint clean. Webpack compiled clean. Frontend serves 200. Forbidden-files check clean. All 20 Business Logic Safety locks held. All 13 sprint-task validation items satisfied at the code level.

### Implementation-summary corroboration

The implementation summary's self-assessment (`implementation_complete_ready_for_QA`) is **verified** by this QA report. All checklist items in §6 (gate §10) and §7 (gate §9) of the implementation summary independently re-validated here.

### Live-browser cashier-flow validation: **deferred to owner smoke**

Could not be performed in this QA session because:
- Preprod backend at `preprod.mygenie.online` is dormant ("Frontend Preview Only. Please wake servers to enable backend functionality." banner shown by the preview wrapper).
- No real cashier credentials with a placed delivery order seeded with backend `delivery_charge` available to QA.

This is the standard QA → owner-smoke handoff boundary and matches the pattern used at BUG-045 closure (BUG_045_QA_REPORT followed by BUG_045_SMOKE_SIGNOFF with the human owner exercising the live cashier flow).

### Annotation drift carryover (informational only)

Two annotation drifts were noted in the pre-impl gate (not blockers):
- "L687–698" cited in original Bucket-1 plan vs actual "L695–698" current — the implementation respected the actual line ranges; no impact.
- `CollectPaymentPanel.jsx` `readOnly` predicate evolution from BUG-019 to CR-008 D1-Gate is reflected in the in-file comments at L23–45 — confirmed untouched.

Neither affects QA verdict.

---

## 8. Final Verdict

### `qa_pass_with_manual_smoke_pending`

**Reasoning:**
- ✅ All 13 sprint-task validation items pass at the code-logic level (Scenarios 1a–10 of the static harness + diff inspection of items 7–13).
- ✅ All 20 Business Logic Safety Rules held (every one independently re-verified, not just trusted from the implementation summary).
- ✅ Lint clean, webpack compile clean, supervisor RUNNING, HTTP 200 OK, public URL renders without console errors.
- ✅ Forbidden-files check clean: only one source file changed (`OrderEntry.jsx`), exactly as approved. `CollectPaymentPanel.jsx`, `CartPanel.jsx`, payload builders, API/socket/transforms, BUG-044 / BUG-045 surfaces, `/app/memory/final/`, `BUG_TEMPLATE.md` — all untouched.
- ✅ Code logic correctly implements both Edit A (placed-branch delta) and Edit B (B-2 live-wins-only-when-edited) verbatim per the owner-approved gate, with the screenshot scenario (₹100 item, ₹10 echo, edit ₹30 → button ₹135 + panel-field ₹30) reproduced numerically.
- ⚠ **Live-browser cashier-flow validation (steps 1–13 of the implementation summary's §10 live QA action list) is deferred** to owner smoke, because the preprod backend is dormant and no cashier credentials are available to QA in this session.

**Verdict explicitly NOT `qa_pass_ready_for_owner_smoke`:** that verdict would imply nothing remains for the owner to smoke. In reality, the cashier-flow live walkthrough is **the** thing the owner needs to do. The "_with_manual_smoke_pending_" wording is more honest.

**Verdict explicitly NOT `qa_failed_needs_fix`:** no code defect found in any of the 11 logic scenarios or 20 safety locks or forbidden-file checks. The one initial scenario-7 failure was a QA-harness fixture bug (my test setup mis-specified `rawLocalTotal`), not a code bug; re-run with corrected fixture passes immediately.

**Verdict explicitly NOT `blocked`:** no missing dependency, no merge conflict, no compile error, no missing owner decision.

---

## 9. Recommended Next Action

1. **Wake the preprod backend** (`preprod.mygenie.online`) via the preview wrapper's "Wake up servers" button.
2. **Execute the 13-step live QA action list** from `BUG_046_IMPLEMENTATION_SUMMARY.md` §10, in order, using a real cashier session against a seeded test restaurant:
   - Place delivery order ₹100 item + ₹10 delivery → button ₹115.
   - Reopen, edit delivery to ₹30 → button **₹135**.
   - Click Collect Bill → panel input pre-fills **₹30**.
   - Pay → BILL_PAYMENT payload `delivery_charge: 30`.
   - Negative-edit, walk-in/dine-in/take-away regression, scan/web regression, prepaid regression, pre-place regression, console-error sweep.
3. **Capture screenshots** of the corrected cart button and corrected panel field, in the same format as the owner's bug-report screenshots, for the sign-off doc.
4. **Produce sign-off doc** `BUG_046_SMOKE_SIGNOFF.md` (matching `BUG_045_SMOKE_SIGNOFF.md` format) once all 13 live steps pass.

---

## End Of QA Report

- **No code changed in this task.**
- **`/app/memory/final/` not modified.**
- **`/app/memory/BUG_TEMPLATE.md` not modified.**
- **`/app/memory/bugs/BUG_046_IMPLEMENTATION_SUMMARY.md`, `BUG_046_PRE_IMPLEMENTATION_CODE_GATE.md`, `BUG_046_STATUS_PULL.md` — all consumed as input, not modified.**
- This QA report lives at `/app/memory/bugs/BUG_046_QA_REPORT.md`.
- BUG-045 sealed and untouched. BUG-044 parked and untouched.
- Forbidden files (`CollectPaymentPanel.jsx`, `CartPanel.jsx`, `orderTransform.js`, `orderService.js`, all of `frontend/src/api/`, hooks, utils) all untouched.
