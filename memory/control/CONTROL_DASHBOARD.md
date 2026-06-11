# Layer 1 — Control Dashboard

**Status:** POPULATED
**Last Updated:** 2026-06-11 — **POS 4.0 PRE-FREEZE CONSOLIDATION COMPLETE.** Code-validated all sprint items (report: `POS4_0_BASELINE_CONSOLIDATION_REPORT_2026_06_11.md`). Owner rulings R1–R5 captured: CR-021 + CR-023 CLOSED; Toast CR→CR-027, 401 bug→BUG-123, socket bug→BUG-124; CR-026 retro-registered. **Freeze blocked on owner smoke batch S-1…S-9 (`POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md`).**
**Deployment Reconciliation:** 2026-06-11 — branch `main` @ `1f05d05`; preview URL: https://pos-front-pull.preview.emergentagent.com (env restored from ENV_REGISTRY; yarn install fixed incomplete node_modules; webpack compiles clean)

---

## Current Deployment

| Field | Value |
|---|---|
| Branch | `main` @ `1f05d05` (carries 10-june code + full doc archive; supersedes `8-june`) |
| Preview URL | https://pos-front-pull.preview.emergentagent.com |
| Last Deploy | 2026-06-11 (fresh pod — repo pull + env restore + yarn install) |
| Node.js | v20.x |
| Yarn | 1.22.x |
| React | 19.0.0 |
| CRACO | 7.1.0 |
| REACT_APP_SHOW_AUDIT_TAB | true (restored 2026-06-11; Audit tabs visible on S5/S6/S7/S9) |
| Missing env | `REACT_APP_GOOGLE_MAPS_KEY` (Owner Decision Queue E2) |

---

## Active Sprints

| Sprint | Status | Progress | Top Blocker |
|---|---|---|---|
| **POS 4.0 (Consolidated Backlog)** | **ACTIVE** | Bucket B: 9 deferred · Bucket C: 13 blocked · Bucket D: 4 intake | **S5 PARKED** (3-block drift shipped, 15 actionable orders, 42 REVIEW pending). **S6 Gate ⑤ in-flight** — cross-ref badges (Over Taxed / Tax Not Computed / Critical) shipped. 51 Ledger Audit flags, 38 unique orders, 13 Critical. Handovers: `NEXT_AGENT_HANDOVER_2026_06_04_NIGHT_S5_SESSION_CLOSE.md` + `NEXT_AGENT_HANDOVER_2026_06_04_NIGHT_S6_SESSION_CLOSE.md`. |
| POS 3.1 | CLOSED → consolidated into POS 4.0 | 3/3 QSR bugs shipped | — |
| CRM 2.0 | CLOSED → backlog into POS 4.0 | CR-002 CLOSED (T-28/T-29 live PASS); 5 CRs → POS 4.0 | — |
| Audit Report CR | SHIPPED | Complete | None |
| PROD Hotfixes (this session) | SHIPPED | PROD-007 + PROD-008 closed | None |
| Dev Tooling (DEV-DASHBOARD-001) | CLOSED — OWNER VERIFIED | v1.0 + v1.1 delivered, 6/6 artifacts present | None |
| Audit Reconciliation (AUDIT-CLOSURE-DRIFT-001) | CLOSED — OWNER VERIFIED | v1.2 dashboard + 44 bugs reconciled; G-2 owner smoke PASSED 2026-05-31 | None |
| Closure Debt Re-Audit (CLOSURE-DEBT-REAUDIT-001) | CLOSED — OWNER VERIFIED | v2.1 — CRITICAL 17→4; reproducible scanner committed; 108 bugs got artifact_refs | None |
| Intake Backfill + CG Waiver (INTAKE-BACKFILL-001) | CLOSED — OWNER VERIFIED | v2.2 — 38 intake stubs + 10 CG waivers; 9 bugs RESOLVED; WAIVED state in UI/CSV/JSONs | None |
| Dashboard Active-vs-Resolved counter fix (v2.3)   | CLOSED — OWNER VERIFIED | Headline strip + RESOLVED card + "19/28" tab badge + Active-only default filter | None |
| Big Batch Closure 001 (v2.6)                       | CLOSED — OWNER VERIFIED | 26 bugs archived (active 19→18, archived 19→45); 6 G2 reclassified NCN→IMPL→OV; CG Waiver Batch-3 (30 bugs); 24 intake stubs auto-gen | None |
| CR Registry Refs Sync 001 (v2.7)                   | CLOSED — OWNER VERIFIED | 54/54 CRs got artifact_refs + category; +35 CSV rows; CR Registry tab gets Active/Shipped/Tracked headline + clickable categories; row-detail shows linkable artifact panel | None |
| Active CR Compliance 001 (v2.8)                    | CLOSED — OWNER VERIFIED | 16 active-CR Intake stubs + 22 CG Premature waivers; 2 CRs auto-promoted; RESOLVED 49→65 | None |
| Subsumed Backlog Owner Attestation 001 (v2.9 + v2.9.1) | CLOSED — OWNER VERIFIED | v2.9: 8 INTAKE bugs → SUBSUMED. v2.9.1: 4 more bugs subsumed (BUG-018, 104, 106, 108); BUG-106 carries owner-attested CRM Coupon/Loyalty subsumption note. `active_recent_bugs` 25 → 22 | None |
| Subsumed CR + Status Pill Fix (v2.10) | CLOSED — OWNER VERIFIED | SUBSUMED renders green everywhere; CR_STATUS_CATEGORY maps SUBSUMED→SHIPPED; 5 CRs subsumed (CR-003/004/005/008/009); scanner over-match flagged; CR active 26→20 | None |
| Auto-promotion + Active-only register (v2.4)      | CLOSED — OWNER VERIFIED | 23 bugs auto-promoted IMPLEMENTED→OWNER VERIFIED; 9 fully-closed items archived from active register; CSV preserves history | None |
| Smoke Backfill Batch 001 (v2.5)                    | CLOSED — OWNER VERIFIED | 10 more bugs promoted to OWNER VERIFIED (6 smoke-only + 4 mid-effort with intake/CG-waiver); CSV grew 28→38 rows | None |
| **CR-014 Menu Management API Migration** | **CLOSED — OWNER VERIFIED** | **Phase 1: 20 API endpoints wired. Phase 2: Bulk Editor shipped (inline spreadsheet, 33 columns, 4-tier picker, category grouping, batch save). Gate 6 PASSED.** | **None** |
| **CR-015 Settlement Module** | **CLOSED — OWNER VERIFIED** | **Full settlement as dashboard slide-over panel. 5 APIs wired. 5 KPI cards, per-waiter table, 3 modals. QA: 14/14 + 9/9 passed. Owner smoke PASSED 2026-06-09.** | **None** |
| **CR-016 Settlement History (Insights)** | **CLOSED — OWNER VERIFIED** | **7/7 gates complete. Settlement Report under Insights. Active-only days + waiters. KPI strip, drill-down, 365-day range, Excel/PDF export. Owner smoke PASSED 2026-06-09.** | **None** |
| **BUG-120 CR-014 Menu Mgmt Post-Delivery (5 sub-bugs)** | **GATE 2 COMPLETE** | **A: InputField defined inside render — move to module scope (LOW). B: Image uploads to preprod storage — working, document only (ZERO). C: Variation CRUD UI + form section redesign (HIGH). D: 8 new API fields to wire — is_inventory, packed_food, stock_out, is_disable, tax_calc + 3 more (MEDIUM). E: Socket handler exists but needs verification + category ops handling (MEDIUM).** | **Gate 3 (Implementation Plan) next** |
| **BUG-121 Category Count + Post-Save Refresh** | **CLOSED — OWNER VERIFIED** | **A: Category count derived from foods array (categories API has no count field). B: 500ms delay on post-save refresh. Both fixes verified.** | **None** |
| **CR-017 WhatsApp Payment Link** | **Gate 2 COMPLETE** | **P1. All 9 Qs answered. UI mockup approved (OrderCard footer: [KOT][Cancel][WhatsApp]). Impact analysis done. 2 new files + 2 modified files planned. Zero regression risk.** | **Gate 3 (Implementation Plan) next** |
|| **CR-019 Restaurant Settings Wizard** | **Gate 5 COMPLETE (IMPLEMENTED + QA 18/18)** | **P1. 6-step self-onboarding wizard at `/restaurant-settings`. Pre-populates from GET settings-list, saves via POST update-settings (multipart). Steps: Restaurant Identity, Channels & Payments, Charges & Tips, Order & Kitchen, Inventory & Extras, Owner Info. 3 new files + 3 modified. Testing: 18/18 passed.** | **Gate 6 (Owner Smoke) next** |
|| **BUG-122 Post-Delivery Fixes (3 FE fixes from handover)** | **IMPLEMENTED — smoke batch S-7** | **Fix #1: Cancel (X) button added to POS YTC on OrderCard (was ✓ only, now ✗+✓ matching TableCard). Fix #2: Snooze clock gated to web-only on TableCard (`table.isWebOrder === true`). Fix #3: `schedule_at` empty time fix — removed trailing space, strengthened Place Order disable guard to require time component.** | **Awaiting owner smoke** |
|| **CR-020…CR-027 batch (2026-06-10/11)** | **See CR_REGISTRY** | **CR-021 split payments CLOSED · CR-022 food filters CLOSED · CR-023 typing lag CLOSED · CR-024 channel visibility CLOSED · CR-020 P4+B12–B15 awaiting smoke (S-4) · CR-025 discount payload awaiting smoke (S-1, P0) · CR-026 report sweep awaiting smoke (S-9) · CR-027 toast surfacing NOT STARTED (next sprint) · BUG-123 (401 redirect) + BUG-124 (socket payload) open intake** | **Smoke batch: `POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md`** |
|| **PRE-FREEZE GATE (2026-06-11)** | **OPEN** | **Baseline freeze blocked on: 9 smoke items (S-1…S-9) → DEBUG-B11 log removal (post S-4) → cut BASELINE_INDEX entry. Full gap register: `POS4_0_BASELINE_CONSOLIDATION_REPORT_2026_06_11.md` §3. Owner rulings R1–R5 resolved.** | **Owner runs smoke batch** |
|| **CR-028 Item-Level Discount (P1, money)** | **REGISTERED — INTAKE COMPLETE (2026-06-11). NO CODE.** | **Gap 1: per-item `discount_amount` hardcoded '0.00' in payload (orderTransform.js:603). Gap 2: `give_discount='No'` flag never honored — productTransform doesn't map it, discount applies to ALL billable items. 4-phase plan in CR doc; blocked on OD-1…OD-5 (backend asks: menu API field availability + per-item discount_amount storage). Handover: `memory/handover/CR028_HANDOVER_2026_06_11.md`** | **Owner answers OD-1…OD-5, then next agent executes Phase 1** |

---

## Service Health (as of 2026-05-31)

| Service | Status |
|---|---|
| Frontend | RUNNING (webpack compiled with 1 warning — pre-existing ESLint warning in OrderEntry.jsx:1311) |
| Backend (supervisor) | RUNNING (default Emergent — not used by app) |
| Backend API (preprod.mygenie.online) | External — not monitored from pod |
| Socket (presocket.mygenie.online) | External — not monitored from pod |
| CRM | External — endpoint varies per deploy |
| Firebase | External — mygenie-restaurant.firebaseapp.com |
| MongoDB | RUNNING (not used by this frontend-only app) |

---

## Quick Links

| Layer | Doc |
|---|---|
| Baseline | [BASELINE_INDEX.md](./BASELINE_INDEX.md) |
| Handover | [AGENT_HANDOVER_PROTOCOL.md](./AGENT_HANDOVER_PROTOCOL.md) |
| CR Registry | [CR_REGISTRY.md](./CR_REGISTRY.md) |
| Bug Tracker | [BUG_TRACKER.md](./BUG_TRACKER.md) |
| Env & Config | [ENV_REGISTRY.md](./ENV_REGISTRY.md) |
| Sprint Status | [SPRINT_STATUS.md](./SPRINT_STATUS.md) |
| File Ownership | [FILE_OWNERSHIP.md](./FILE_OWNERSHIP.md) |
| Access | [ACCESS_REGISTRY.md](./ACCESS_REGISTRY.md) |
| Open Gaps | [OPEN_GAPS_REGISTER.md](./OPEN_GAPS_REGISTER.md) |
| Agent Prompt | [AGENT_PROMPT_ALPHA.md](./AGENT_PROMPT_ALPHA.md) |
| **Intake Workflow** | [INTAKE_WORKFLOW.md](./INTAKE_WORKFLOW.md) |
| Code Gate Policy | [CODE_GATE_POLICY.md](./CODE_GATE_POLICY.md) |
| **Registration Gate** | [REGISTRATION_GATE_POLICY.md](./REGISTRATION_GATE_POLICY.md) |
| **CR-011 Screen Freeze Protocol** | [CR_011_SCREEN_FREEZE_PROTOCOL.md](./CR_011_SCREEN_FREEZE_PROTOCOL.md) (BINDING — Gate 2.5) |
| **CR-011 Screen Freeze Log** | [CR_011_SCREEN_FREEZE_LOG.md](./CR_011_SCREEN_FREEZE_LOG.md) |
| **CR-011 Loading & Interaction Spec** | [../memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md](../memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md) (Gate 4 Code Gate contract; planning-only during Gate 2.5) |
ng-only during Gate 2.5) |
