# SESSION HANDOVER — 2026-09-16 (CR-364 Intake continuation)

**Prev handover:** `SESSION_HANDOVER_2026_09_14_CR380.md`
**Roles used this session:** INVESTIGATION, INTAKE (Alpha v0.7)
**Owner:** partial intake close — OD-01/02 frozen, OD-03/04/05 deferred to next session.

---

## 1. One-line summary
Continued CR-364 intake: proved it is distinct from CIB (CR-131) and complementary to CR-363/366; wrote a comprehensive folio-print backend brief (9 blocks · ~60 keys · 15 questions); froze OD-01 and OD-02; synced registry/intake/PRD; owner asked to walk through the remaining unblocked CR/BUG items next session.

---

## 2. What was done this session

### 2.1 Investigations (no code changes)
- **CIB (CR-131) vs CR-364** → `/app/memory/CR-364_INVESTIGATION_CIB_COMPARISON.md`
  - Owner concern: is Customer Insights (Beta) already doing what CR-364 wants?
  - Verdict: **DISTINCT features. Not a duplicate.** CIB is CRM-fed restaurant-wide aggregate (per customer_id, post-paid, no room/stay context, read-only, WhatsApp win-back). CR-364 is per-stay operational folio (per orderId, live, room/stay context, money-mutating actions, works for walk-ins without CRM profile).
- **CR-363 Night Audit + CR-366 Revenue Dashboard vs CR-364** gap analysis
  - Verdict: aggregate reports **cannot substitute** the per-guest operational surface. CR-364 uniquely provides: drill-down to one stay, actions (Check Out / Record Payment / Print Folio), real-time balance, guest context, itemised F&B posted to *this* room, works for walk-ins with no CRM profile, and fixes CR-360 / CR-358-P4 placeholder links.
- **A4 print field sweep** (`buildBillPrintPayload` in `orderTransform.js` L1797–L2268)
  - Today: `roomAdvancePay`, `roomRemainingPay`, `associated_orders[]`, `rtype='RM'` all pass.
  - Missing: room#, check-in/out dates, meal plan, channel, booking id, per-night lines, dated payment ledger, special requests, pax, ID proof, extras.
  - Coverage of missing fields: **~60% already in FE transform** (`roomInfo` + `roomPaymentSummary.payments[]`) → just wire into payload; **~30%** in backend on `room_info`/`reservation_ops` → surface on `get-single-order-new`; **~10%** genuinely new (per-night expansion, reprint counter, UPI QR, actual check-in/out timestamps, folio_no).

### 2.2 Backend brief authored
- `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — 9 blocks / ~60 keys / **15 questions Q-364P-01…15**.
- Mirrored on the review UI:
  - `/app/frontend/public/backend-briefs.html`
  - `/app/memory/backend_briefs/index.html`
- Smoke-tested with the screenshot tool — card expands correctly, no visual regressions to CR-363 above or Printing section below.

### 2.3 Owner decisions frozen
| OD | Decision (2026-09-16) |
|---|---|
| **OD-364-01** | **V1 = totals only** — dated payment history endpoint (B-364-01) is optional post-v1. |
| **OD-364-02** | **PMS-specific Guest Folio layout** via `rtype='RM'` template branch on the existing print pipeline. FE will pass every field the backend accepts; whatever is not passed simply won't print. **R6 owner sign-off is required before the template goes live.** |

### 2.4 Registry / doc sync
- `/app/memory/change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md` — ODs table updated with decisions + evidence refs; investigation section added; gate status line refreshed.
- `/app/memory/control/registry.json` — CR-364 status text updated to "INTAKE OPEN — UNBLOCKED. OD-01/02 FROZEN 2026-09-16. Backend brief filed. Awaiting OD-03/04/05 next session before Gate 2." Two `artifact_refs` added (investigation + backend brief). `status_history` entry appended.
- `/app/memory/control/CR_REGISTRY.md` — CR-364 row rewritten to reflect ODs frozen + artifacts.
- `/app/memory/PRD.md` — dated 2026-09-16 CR-364 section appended.

### 2.5 Files created / touched
| Path | Action |
|---|---|
| `/app/memory/CR-364_INVESTIGATION_CIB_COMPARISON.md` | created |
| `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` | created |
| `/app/frontend/public/backend-briefs.html` | new CR-364 card inserted (after CR-363, before Printing section) |
| `/app/memory/backend_briefs/index.html` | mirrored |
| `/app/memory/change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md` | ODs table + investigation section updated |
| `/app/memory/control/registry.json` | CR-364 entry updated |
| `/app/memory/control/CR_REGISTRY.md` | CR-364 row updated |
| `/app/memory/PRD.md` | dated CR-364 entry appended |

**No application source code changed.**

---

## 3. What's due next session

### 3.1 Finish CR-364 intake (priority 1)
Ask the owner one by one — plain English:
- **Q3 → OD-364-03** — When the front desk clicks "View Bill" / "Folio" / Departures "Check Out" today, should those links now open the new `/pms/folio/:orderId` page (re-point), or should the folio be added as an extra action while current targets stay?
  - `re-point` — cleaner UX; touches 3 files (InHouseGuestsPage, DeparturesPage, ReservationsPage tape popover)
  - `add` — safer; touches 0 existing files
- **Q4 → OD-364-04** — For F&B posted to the room, show every food line inline on the folio, or show one row per order with a "view details" drill to `OrderDetailSheet`?
  - `inline` — full transparency, longer folio
  - `drill` — cleaner folio, one click to see items
- **Q5 → OD-364-05** — How far back should staff be able to open a departed guest's folio by order id?
  - `60d` — matches the Local Reservations window
  - `unlimited` — any order id, any time

Once all three answered: close intake fully, register decisions in `registry.json` + `CR_REGISTRY.md` + PRD, hand to PLANNING for Gate 2 Impact Analysis (still gated on backend answering Q-364P-01…15 before code work can start).

### 3.2 Walk-through of remaining unblocked CR/BUG items
Owner asked for a walkthrough of items **not** backend-blocked so they can pick what to progress next. Candidates (surface these first, filter by priority + gate):

**a) Items at Gate 6 — awaiting owner smoke (large backlog):** ~90 items showing "QA PASS — AWAITING OWNER SMOKE". These are ready to demonstrate on preprod. Suggest grouping by module (Expense / Inventory / PMS / Reports / Employee) and doing one focused smoke session per module.
   - PMS-relevant: `BUG-092` (phone format at check-in), `BUG-096` (realtime FE updates), `BUG-097` (delivery dispatch), `BUG-ROOM-PAIDROOM`, `BUG-VQTY`, `BUG-130`.
   - Money-touching P0/P1: `BUG-138` (discount payload), `BUG-158/159` (silent-fail category/item add), `BUG-168` (bill print omits addons), `BUG-VQTY` (variation qty), `BUG-186` (partial-mode settle).

**b) Items in INTAKE / GATE 0–1 that are NOT backend-blocked (need owner decisions to progress):**
   - `CR-012` — Menu Management API migration (open intake)
   - `CR-050` — Insights Quarterly Comparison (future sprint intake)
   - `CR-053` — MyGenie Training Academy (implementation in progress: Phase 1 Missions 1–3 done)
   - `CR-054` — Training Sandbox Mode (10 open questions; placeholder intake)
   - `CR-068` — Cancellation role-gating (intake)
   - `CR-091` — Purchase transaction ID for Bank Transfer (intake, backend covered by CR-100)
   - `BUG-040` / `BUG-041` — Audit Report Excel/CSV/PDF format (intake)
   - `BUG-058` — Prepaid Pending Payment from Hold/Audit (carry-forward)
   - `BUG-118` — Nth-item / BOGO coupon (intake)
   - `BUG-123` — Place-order on 401 silent redirect (Gate 2 done, needs Q-123-1..4 owner decisions)
   - `BUG-189` — Delivery Accept-order missing for rider login (investigation, intake)
   - `BUG-192` — Prep & Serve Time = 0 (investigation, intake)
   - `BUG-193` — Room Transfer Trail wrong (investigation, intake)
   - `BUG-267` — Inventory Setup category not selecting (investigation NEEDS_MORE_DATA)

**c) Items in progress:**
   - `CR-011` Phase 3 — Complete Reports Module (28/28 built + verified; awaiting Gate ② review + sidebar wiring)
   - `CR-053` — Training Academy Phase 1 (Checkpoints 1–2 done)
   - `CR-077` — Hierarchy Stock Transfer Phase 2 (deferred)

**d) Recent QA-PASS items awaiting Gate 6 (large batch, not enumerated here):** owner should decide whether to run one big Gate 6 smoke sweep across the QA-PASS backlog or continue module-by-module.

### 3.3 Also open (backlog reminders — not for this walkthrough unless owner asks)
- **CR-362 / BUG-397** — QA-pass but the pass was static code-trace; needs a live owner Gate 6 smoke on preprod.
- **CR-357 OD-7** — still open. Backend-blocked until owner answers OD-7 (does `balance_payment` include food?).
- **CR-363 Night Audit** — BACKEND-BLOCKED on `aiosell/night-audit` + revenue-summary going live on preprod.
- **CR-366 Revenue Dashboard** — BACKEND-BLOCKED same as above; joint Gate 2 impact analysis with CR-363 pending.
- **CR-365 Housekeeping** — UNBLOCKED, Gate 2 ready, awaits OD-365-NEW-01 (laundry scope).
- **CR-381 Laundry** — UNBLOCKED, tracker fix applied.

---

## 4. Governing constraints for next agent
- Alpha v0.7. Read `/app/memory/control/AGENT_PROMPT_ALPHA.md` before role selection.
- Preferred role next session: **INTAKE** (finish CR-364 OD-03/04/05), then either **INTAKE** or **PLANNING** depending on which item the owner picks from the walkthrough.
- No environment check required until an item moves past Gate 3.
- `test_credentials.md` — do not modify unless auth credentials are created/changed.
- All URLs / secrets — env-driven; never printed in briefs.
- Backend briefs land in `/app/memory/backend_briefs/` and must be mirrored on `frontend/public/backend-briefs.html` + `memory/backend_briefs/index.html`.

---

## 5. Open questions for owner (queued)
- **OD-364-03, OD-364-04, OD-364-05** (see §3.1).
- Which module to start the Gate 6 walkthrough with (§3.2a).
- Whether any of the intake-open items in §3.2b should be prioritised now vs. deferred.

---

## 6. Dead-ends / do-not-retry
- Do not attempt to close CR-364 as a duplicate of CR-131 / CIB — proven distinct this session.
- Do not implement CR-364 folio print entirely FE-side — the folio-layout branch is a backend template change (R6 approval).
- Do not assume all fields on the folio must be new backend work — ~60% is already in `orderTransform.roomInfo` and just needs wiring into `buildBillPrintPayload`.
- Do not treat "QA PASS — AWAITING OWNER SMOKE" items as closed. Owner Gate 6 is still required.

---

## 7. Final response summary (Alpha format)

```
Intake session continued (partial close): CR-364
Classification: CR, Severity: P1, Risk: HIGH
Duplicate check: DISTINCT (vs CR-131 CIB, CR-363 Night Audit, CR-366 Revenue Dashboard)
Evidence: 3 investigation traces, 1 backend brief, 4 registry files synced
Blast radius: MEDIUM (unchanged)
Docs updated: intake, registry.json, CR_REGISTRY.md, PRD.md, 2× backend-briefs HTML mirror
Decisions frozen: OD-364-01 (v1 totals only), OD-364-02 (rtype='RM' template branch, R6)
Pending: OD-364-03/04/05 next session; walkthrough of unblocked CR/BUG items
Next: INTAKE (finish CR-364 ODs) → PLANNING (Gate 2 Impact Analysis, still gated on backend Q-364P-01..15)
```
