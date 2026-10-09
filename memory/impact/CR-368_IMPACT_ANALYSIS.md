# CR-368 — Impact Analysis (Gate 2)

**ID:** CR-368 — Test Suite Triage: Achieve Zero-Failure Baseline
**Date:** 2026-09-08
**Role:** PLANNING (Gate 2 only — Gate 3 deliberately NOT written; see §10)
**Sprint:** pos_audit_1
**Priority / Risk:** P1 / **MEDIUM** (confirmed — test files only; 1 candidate REAL BUG is P3 non-financial; financial-test edits require owner ack under R6 but change no production math)
**Intake:** `change_requests/CR-368_TEST_SUITE_TRIAGE_CLEAN_BASELINE_INTAKE.md`

---

## 0. Header — Code Reality + Conflict Pre-Check

**Code Reality: PARTIAL**
- 48 Jest test files exist (42 in `src/__tests__/` + 6 co-located `**/__tests__/`). Intake counted 42 (missed the 6 co-located files).
- **BUG-382 already executed part of the original owner-approved 4-phase plan:** `bucketReservationOps.test.js` rewritten as a real Jest suite AND axios ESM→CJS `moduleNameMapper` added to `craco.config.js`. Result: the "6 dead-on-arrival suites" phase (Phase 2 of the 2026-09-08 execution plan) is **already DONE** — every one of the 48 files loaded and executed in this run. Phase 2 must be removed from the plan.
- **2 fake node scripts remain** (not 3): `src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` (127 lines) and `src/api/services/__tests__/pmsService.tapeChart.cr358p4.test.js` (188 lines). Both inline copies of production functions and call `process.exit()`.
- Live run 2026-09-08 (this session): **54 failing tests across 11 suites**, not 56/15 as in the intake. Delta is explained by BUG-382 (see §2). No Jest log exists under `evidence/BASELINE-2026-09/` to reconcile the original 56 count against → filed as OG-AUDIT-002.

**Conflict Pre-Check** (registry.json + FILE_OWNERSHIP.md):

| Item | Status | Overlap with CR-368 | Ruling |
|---|---|---|---|
| CR-358-P4 | QA PASS Gate 5b — awaiting Gate 6 | Owns both fake scripts (its V-U1..U8 artefacts) | CR-368 rewrites P4's test artefacts while P4 is un-smoked. Parallel-safe (tests only, production `roomStatusTransform.js` / `pmsService.js` untouched) but P4 QA report references these files → note in P4 closure. |
| CR-372-B | INTAKE — awaiting Gate 4 GO | Will edit `App.js`; `App.routing.test.jsx` + `ProtectedRoute.test.jsx` PASS today | Execution order: CR-368 baseline **before** CR-372-B; CR-372-B QA must re-run the full suite and re-issue the baseline line. |
| BUG-363 | INTAKE — CODE EXISTS (CLOSURE Phase B pending) | Its code (`normalizeStyle` windows/android split) is what breaks 3 of 4 `printerAgentConfigTransform` tests | Retroactive candidate — CR-368 does not close it, only cites it. |
| BUG-253 | INTAKE (registry) but code marker present in `PlatformDropdown.jsx:31` | Its code breaks the PLATFORM_OPTIONS length test | Retroactive candidate (status drift). |
| BUG-147 | INTAKE (registry: AddCustomItemModal) | `BulkEditor.jsx:682` carries `// BUG-147: prefix item name` — different file/feature than the registered BUG-147 | Marker/registry mismatch → OG-AUDIT-003. |
| CR-369 | BLOCKED by CR-368 (D3-b) | Downstream consumer | No overlap; unblocks on CR-368 CLOSED. |

No hotspot file (R5) is touched. No FILE_OWNERSHIP entry exists for any of the 11 failing suites (only `printerAgentConfigTransform.test.js` is registered, under CR-133).

---

## 1. Reproduction (this session)

```
cd /app/frontend && CI=true timeout 900 yarn test --watchAll=false --forceExit
```
- 46 of 48 suites reported PASS/FAIL (35 PASS, 11 FAIL). The 2 fake scripts executed, Jest intercepted `process.exit called with "0"` (logged as an orphan failure inside whichever suite was printing), then **the runner hung with no summary line**; `timeout` killed it after 900 s (EXIT 124). Reproduces F-QA-01 exactly.
- Evidence: `evidence/CR-368/jest_full_run_2026_09_08.log` (1.7 MB, raw), `evidence/CR-368/failures_parsed.json` (structured), `evidence/CR-368/parse_jest_log.py` (parser, re-runnable), `evidence/CR-368/test_triage_2026_09_08.md` (per-test table).
- Because the runner never printed `Tests: N passed`, the **pass count is unknown** — it can only be captured after Phase A removes the hang. Do not seed `REGRESSION_BASELINE.md` from this run.

---

## 2. Failure Inventory — 54 tests / 11 suites

| # | Suite | Fails | Superseding item (code marker found) | Classification | Confidence |
|---|---|---|---|---|---|
| S1 | `__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | 22 | **BUG-122** (CLOSED 2026-06-10) — predicate now `fOrderStatus===7 && !scheduled && isWebOrder`; fixtures use `orderFrom:'web'` without `isWebOrder:true` → component renders `null` → every DOM query fails. + **CR-018** (`!scheduled`). | STALE | HIGH |
| S2 | `__tests__/api/transforms/placeOrderPayload.test.js` | 8 | **CR-130** (QA PASS 2026-08-06, OD-3) — BILL agent now appended unconditionally to `printer_agent` on place / place-with-payment (`orderTransform.js:1046-1052`, `:1312-1318`). Tests assert R-OWNER-8 "BILL never on place-order" and `[]` when `print_kot:'No'`. | STALE | HIGH |
| S3 | `__tests__/integration/POS2_003_REOPEN_A_wire.test.js` | 2 | **CR-130** (same as S2; only the 2 place-order regression cases fail — cancel/update cases still PASS, matching CR-130 scope "cancel/update UNCHANGED"). | STALE | HIGH |
| S4 | `__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` | 3 of 5 | **CR-170** (2026-08-20, owner-confirmed) — conditional round-off: 2353.05 → paise 5 < 10 → floor → **2353**. Tests hard-code BUG-051 always-ceil → 2354. Cases 2.4 / 2.5b / 2.5d. | STALE — **R6 financial, owner ack required** | HIGH |
| S4' | same file | 2 of 5 | **BUG-168 v3** — `buildBillPrintPayload` fallback now `order.subtotalBeforeTax || 0` (backend value only, `orderTransform.js:2045`); tests expect FE recomputation (items + SC + tip + delivery). Bucket-4 "TODAY-style echo" + "Non-delivery fallback". | STALE — **R6 print semantics, owner ack required**. NB BUG-168 tracker row says "v2 — scope disputed"; code marker says v3. | MEDIUM |
| S5 | `api/transforms/__tests__/printerAgentConfigTransform.test.js` | 4 | **BUG-363 / CR-133-GAP G5+G6** — `normalizeStyle` state shape changed from `row.{fontSize58,fontSize80,bold}` to `row.{windows:{…},android:{…}}`; `toAPI` writes flat keys as a mirror of `windows` (fixture flat 12/17 ≠ windows 11/14 → V3 round-trip diff). **BUG-316** — `APPROVED_FONTS` (11) replaces API `available_fonts` (20). V2-style, V2-options, V3 HARD GATE, V4 paid_by. | STALE — V3 "HARD GATE" needs owner confirmation that flat←windows mirroring is intended (§6 OD-CR368-06) | HIGH (V2, V4), MEDIUM (V3) |
| S6 | `__tests__/components/menu/BulkEditor.cr036.test.jsx` | 3 of 4 | **owner-2026-08-21 (CR-145 session)** — `itemUnit` "Sold By (Unit)" moved to tier 2 (hidden by default), `BulkEditor.jsx:36-38`. Tests assert CR-036-FU-02 "visible by default". | STALE | HIGH |
| S6' | same file | 1 of 4 | **RESOLVED 2026-09-08 (probe, OD-CR368-07):** TEST-INFRA, not a code bug. The test waits with a fixed `await new Promise(r => setTimeout(r, 50))` (L286) instead of `waitFor`. In React 19 + jsdom the toast store update scheduled after `handleSave`'s `await setTimeout(0)` is not flushed by a plain sleep (no `act` boundary), so at 50 ms the body still shows the **previous test's** toast text ("Row 1 — Name is required") or no toast at all (`-t` isolation run). A throw-away probe using the same steps + `waitFor` renders `My Special Item — Category is required. +1 more on this row.` — production `BulkEditor.jsx` is correct. The sibling test (L269-275) was already converted to `waitFor` under CR-036-FU-03 with a comment describing exactly this. 6 more tests in the file use the same 50 ms sleep (L300-381) and pass only by luck. | STALE (test-infra) — fix = `waitFor`, same as CR-036-FU-03 pattern | HIGH |
| S7 | `__tests__/components/menu/BulkEditor.cr027p3.test.jsx` | 3 | **"BUG-147" marker** at `BulkEditor.jsx:682` — `_saveError` now prefixed `"${productName}: ${readableMessage}"`; tests expect the bare backend message in tooltip `title` and drawer text. (Registry BUG-147 is a different item — see OG-AUDIT-003.) | STALE (behaviour is deliberate per marker) — but superseding item is **unregistered** | MEDIUM |
| S8 | `__tests__/api/transforms/rawField.test.js` T3 | 1 | **CR-133** — `PrinterAgentConfigView.jsx:57` reads `config._raw` by design (transform retains full GET as POST basis, `printerAgentConfigTransform.js:194`). T3 scans all components/pages for `._raw` — over-broad; the report-`_raw` dev-gating rule it protects is a different `_raw`. | STALE (rule scope) — owner to choose narrow vs retire | HIGH |
| S8' | same file T2 | 1 | `reportService.js` now has **1** dev-gated `_raw` (test expects 2) **and** an **ungated `_raw: o`** at `reportService.js:671` (Rooms-report row seed, "Three rules (locked)" block). The ungated field ships raw row objects in production report state. | **CANDIDATE REAL BUG (P3, non-financial, ~1 line)** — owner decides under OD-CR368-01 | MEDIUM |
| S9 | `__tests__/structure/barrelExports.test.js` T-12/T-14 | 2 | Directory-scan tests. `components/reports/index.js` misses 1 of 13 (`ReportLoadingShield`); `pages/index.js` misses **33 of 42** pages (CR-135 `AggregatorPreviewPage`, all `Screen*ComparisonPage`, Inventory*, Settings*, PMS…). Convention silently abandoned since ~June. | **POLICY DECISION** — enforce (34 production `index.js` lines → separate item) vs retire dir-scan tests vs allow-list | HIGH (facts) |
| S10 | `__tests__/api/transforms/updateOrderPayload.test.js` | 1 | **BUG-270** (QA PASS 2026-07-31) — `updateOrder` now sends `cust_mobile` (`orderTransform.js:1192`). Test asserts NS-3C-9 "cust_name only". | STALE | HIGH |
| S11 | `__tests__/components/layout/PlatformDropdown.test.jsx` | 1 | **BUG-253** — 4th option `aggregator` added (`PlatformDropdown.jsx:31`). Test asserts exactly 3. | STALE (registry drift: BUG-253 still INTAKE) | HIGH |

**Totals:** STALE-HIGH 46 · STALE needing owner ack (R6 / hard-gate / rule-scope) 7 · POLICY 2 · CANDIDATE REAL BUG 1 · UNDETERMINED 1 → **54**. Plus 2 fake scripts (Phase A).

---

## 3. Phase A — the 2 fake scripts (hang root cause)

| File | Lines | What it inlines | Production exports available to import | Template |
|---|---|---|---|---|
| `src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | 127 | `fromRoomStatusBoard`, `fromPatchResponse`, `patchErrorMessage`, `ROOM_MANUAL_STATUSES`, `DISPLAY_STATUSES` (copied), 4 hand-rolled checks (V-U1..U3 + empty), `process.exit()` at L127 | `roomStatusTransform.js:3,4,25,32,42` — all 5 names are `export const` | `src/api/services/__tests__/bucketReservationOps.test.js` (BUG-382 rewrite, 85 lines) |
| `src/api/services/__tests__/pmsService.tapeChart.cr358p4.test.js` | 188 | `addDays`, `dayDiff`, `blockKind`, `buildTapeChart` (copied), V-U4..U8 checks, `process.exit()` at L188 | `pmsService.js:268 export const buildTapeChart` | same |

Mechanism of the hang: Jest's `process.exit` interception logs the call, but the script has no `describe/test` blocks so the worker never signals completion → runner waits forever. Removing `process.exit` alone is insufficient (a file with 0 tests fails with "Your test suite must contain at least one test"); the files must be rewritten with real `test()` blocks importing from `src/`.

Risk: the inlined copies may have drifted from production. Rewriting against real imports may surface **new** failures in CR-358-P4 logic → each would be a REAL BUG intake against P4 (which is un-smoked). Plan must budget for this.

---

## 4. Data-flow / dependency trace (why each group broke)

```
BUG-122 (Jun)   → ScanOrderPopOut predicate needs isWebOrder ─────────────► S1 (22)
CR-130 (Aug-06) → orderTransform place/placeWithPayment printer_agent += BILL ► S2 (8) + S3 (2)
CR-170 (Aug-20) → roundOffUtils conditional floor/ceil replaces BUG-051 ──► S4 (3)
BUG-168 v3      → buildBillPrintPayload fallback = backend subtotal only ─► S4' (2)
BUG-363/CR-133-GAP + BUG-316 → printerAgentConfigTransform state shape/fonts ► S5 (4)
owner-2026-08-21 (CR-145) → BulkEditor itemUnit tier 2 ───────────────────► S6 (3)
"BUG-147" marker → BulkEditor _saveError prefixed with item name ─────────► S7 (3)
CR-133          → PrinterAgentConfigView reads config._raw ───────────────► S8 T3 (1)
Rooms report seed (unregistered) → reportService.js:671 ungated _raw ─────► S8' T2 (1)
CR-135 + ~30 later pages → no barrel export ───────────────────────────────► S9 (2)
BUG-270 (Jul-31)→ updateOrder sends cust_mobile ──────────────────────────► S10 (1)
BUG-253         → PLATFORM_OPTIONS += aggregator ─────────────────────────► S11 (1)
?               → BulkEditor typed name not in rows at save ──────────────► S6' (1)  UNDETERMINED
```
Pattern: **every** classified failure is a test that guarded a rule later changed by an owner-approved item whose QA ran only its own new tests. Confirms the intake thesis (per-feature QA, never suite-wide). No API probing required (R11 n/a — nothing here wires an endpoint).

---

## 5. Downstream consumers / blast radius

- **CR-369** (v0.8 prompt) — hard-blocked until CR-368 CLOSED (D3-b). Gate 5c "regression" section of v0.8 needs `control/REGRESSION_BASELINE.md`, which only this CR can seed.
- **CR-372-B** — will change `App.js`; `App.routing.test.jsx` (PASS today) is the only routing test. Baseline must be re-issued after CR-372-B QA.
- **CR-358-P4 Gate 6** — its unit-test artefacts get rewritten; P4 QA report cites the old files.
- Production `src/`: **zero** files change under CR-368 as scoped. The only production edits proposed anywhere in this analysis are (a) `reportService.js:671` gate (candidate BUG, separate item) and (b) barrel `index.js` exports (policy, separate item if enforced).

---

## 6. Owner Decision Queue (Gate 3 cannot be written until these are answered — R3)

| ID | Question | Options | Planner recommendation |
|---|---|---|---|
| **OD-CR368-02** | STALE handling policy. Intake says "retire with `// RETIRED-<DATE>` + `test.skip`". 46 of the STALE tests are fixable by a 1-line fixture/expectation update that **keeps coverage** (e.g. add `isWebOrder:true` to S1 fixtures, `2354→2353` in S4, `['KDS','BAR','BILL']` in S2). | (a) RETIRE all STALE as per intake · (b) UPDATE expectation to current owner-approved behaviour, cite superseding ID in a `// CR-368: updated for <ID>` marker · (c) HYBRID: UPDATE where the guarded rule still exists in new form; RETIRE where the rule itself is gone | (c) — retiring 22 ScanOrderPopOut tests would drop the only coverage of a customer-facing overlay |
| **OD-CR368-03** | R6: may CR-368 edit the 5 financial assertions in S4/S4' (`order_amount` 2354→2353 ×3; bill-print `order_subtotal` fallback ×2) to match CR-170 / BUG-168 v3? No production math changes. | YES (update) / RETIRE / HOLD until BUG-168 scope dispute is resolved | UPDATE for CR-170 (owner-confirmed rule); for BUG-168 v3 ask owner to confirm v3 is the standing rule since tracker still says "v2 — disputed" |
| **OD-CR368-04** | Barrel-export convention (S9): 34 files unexported. | (a) Enforce → new LOW-risk item adds 34 export lines to two `index.js` (production src, not CR-368) · (b) Retire T-12/T-14 directory-scan tests, keep the explicit allow-list tests · (c) Convert to allow-list of legacy-exported files | — none; pure convention policy |
| **OD-CR368-05** | `_raw` rule (S8/S8'): (i) is `reportService.js:671` ungated `_raw: o` a REAL BUG intake (P3, ~1 line, non-financial)? (ii) T3 rule scope: exclude `components/panels/settings/printerConfig/**` (CR-133 design) or retire T3? | (i) YES/NO · (ii) narrow / retire | (i) YES — register (OD-CR368-01 flow); (ii) narrow |
| **OD-CR368-06** | S5 V3 "HARD GATE: zero data loss": under BUG-363 the flat `font_size_*` keys are rewritten from `windows.*`, so the fixture's flat 12/17 becomes 11/14 after round-trip. Confirm this is intended (flat = compat mirror) so the gate can be re-expressed as "round-trip minus flat mirror keys". | CONFIRM / DENY (→ REAL BUG against BUG-363) | — owner call; this is the item's own design note |
| **OD-CR368-07** | ~~S6' G-Toast UNDETERMINED~~ **RESOLVED 2026-09-08** — owner asked "what is happening in code"; 1 throw-away probe (deleted, `src/` clean) proved production code correct; failure is the test's fixed 50 ms sleep vs React 19 flush. No decision needed; treat as STALE (test-infra) under OD-CR368-02 (c). | — | Fix = `waitFor`, mirroring CR-036-FU-03 L269-275 |

**Decisions received 2026-09-08:**
- OD-CR368-02 → **(c) HYBRID** (update where the guarded rule still exists in new form; retire where the rule itself is gone).
- OD-CR368-03 → **(A)** update the 5 financial test expectations to CR-170 / BUG-168 v3; **zero production edits**. BUG-168 v3 accepted as standing rule via "code is reality".
- OD-CR368-04 → **(c) FREEZE / allow-list** — test only checks the files exported before June; no `index.js` edits. Owner fear ("what will break") is justified: `App.js:4` imports from the `pages` barrel, so option (a) would touch the boot path with circular-import risk.
- OD-CR368-05 (i) → **YES, register `reportService.js:671` as P3 BUG intake only — no fix, no gate-jump.**
- OD-CR368-05 (ii) → **OPEN — delegated to Dev team** (`backend_briefs/BACKEND_BRIEF_CR-368_2026-09-08.md` Q2). Mapping: KEEPS → keep strict rule (and CR-133 `_raw` copy becomes optional clean-up); DELETES → narrow.
- OD-CR368-06 → **OPEN — delegated to Dev team** (`backend_briefs/BACKEND_BRIEF_CR-368_2026-09-08.md` Q1). Mapping: Q1-a NO + Q1-b YES → CONFIRM; Q1-a YES → BUG intake against BUG-363.
- OD-CR368-07 → RESOLVED by probe (test-infra), no decision needed.
- Owner instruction 2026-09-08: **STOP after recording decisions — do NOT write Gate 3 yet.**
| **OD-CR368-01** (from intake) | Confirm each REAL BUG intake before fix. | — | Currently 1 candidate (S8'), possibly +N from Phase A drift |

Also required from owner: acknowledgement that **Phase 2 of the 2026-09-08 approved plan is already done (BUG-382)** and drops out.

---

## 7. Provisional scope lock (to be finalised in Gate 3)

**Files WILL change (test-only):**
- Phase A: `src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js`, `src/api/services/__tests__/pmsService.tapeChart.cr358p4.test.js`
- Phase B: the 11 suites in §2 (edit count depends on OD-CR368-02/03/04/05/06)
- New doc: `control/REGRESSION_BASELINE.md`; triage table `evidence/CR-368/test_triage_2026_09_08.md`

**Files will NOT touch:** anything under `src/` outside the 13 test files above — explicitly not `orderTransform.js`, `ScanOrderPopOut.jsx`, `BulkEditor.jsx`, `printerAgentConfigTransform.js`, `reportService.js`, `PlatformDropdown.jsx`, `components/reports/index.js`, `pages/index.js`, `craco.config.js`, `App.js`.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase A rewrite exposes drift between inlined copies and production P4 functions → new failures | MEDIUM | P4 is awaiting Gate 6; new BUG intakes against P4 | Plan step: run each rewritten file in isolation first; classify per OD-CR368-01 |
| Retiring tests removes only coverage on customer-visible flows (S1) | HIGH if OD-02=(a) | Silent regressions later | Prefer (c) |
| Editing financial expectations without owner ack | — | R6 violation | Blocked on OD-CR368-03 |
| Pass count unknown until hang removed | CERTAIN | Baseline line cannot be seeded yet | Phase A first, then a clean full run |
| `CI=true … --forceExit` full run takes >2 min | CERTAIN | Session tooling limit | Run in background to a log file (as done here) |
| Console noise (`SocketContext.jsx:102 handleOffline` warnings in log) mistaken for failures | LOW | — | Not failures; leave |

---

## 9. Open Gaps filed

- **OG-AUDIT-002** — Intake CR-368 counts (56 failures / 15 suites / 42 files / 3 scripts) do not match code truth (54 / 11 / 48 / 2). No Jest log under `evidence/BASELINE-2026-09/` to reconcile. Code wins (R1).
- **OG-AUDIT-003** — `BulkEditor.jsx:682` code marker `// BUG-147: prefix item name` refers to a behaviour not described by registry BUG-147 (AddCustomItemModal duplicate-item toast, INTAKE). Marker/registry mismatch — Pre-Release Audit §F would flag.
- **OG-AUDIT-004** — Barrel-export convention (`pages/index.js`, `components/reports/index.js`) abandoned: 34 unexported files while T-12/T-14 still enforce it.
- Retroactive/status-drift candidates surfaced: BUG-253 (code exists, registry INTAKE), BUG-363 (already flagged CODE EXISTS), BUG-168 (tracker v2/disputed vs code v3 marker).

---

## 10. Why Gate 3 is NOT written in this session

Owner instruction: "Gate 2 + Gate 3, but stop if any doubt after Gate 2, do not assume anything." Seven owner decisions above (OD-CR368-02…07) determine the edit list, the R6 financial edits, one policy, one candidate REAL BUG and one undetermined failure. Writing exact edits now would require guessing business/policy rules (R3). Planning stops here.

---

## PLANNING HANDOVER (Gate 2)

```
Planning complete: CR-368
Stage: Impact Analysis (Gate 2 only — Gate 3 blocked on owner decisions)
Code reality: PARTIAL (BUG-382 already did Phase 2 + 1 of 3 scripts; 54 fails / 11 suites / 2 fake scripts remain)
Risk: MEDIUM
Files WILL change: 2 fake scripts + up to 11 test suites + control/REGRESSION_BASELINE.md (test/doc only)
Files WILL NOT touch: all production src/, craco.config.js, App.js, index.js barrels
Owner decisions: OD-CR368-02, -03, -04, -05, -06, -07 (+ -01 from intake); ack Phase 2 already done
Docs: impact/CR-368_IMPACT_ANALYSIS.md · evidence/CR-368/* · control/CR_REGISTRY.md · control/registry.json · control/OPEN_GAPS_REGISTER.md · control/CONTROL_DASHBOARD.md · handover/SESSION_HANDOVER_2026_09_08_CR368_GATE2.md
Next: owner answers ODs → PLANNING Gate 3 (Implementation Plan) → Gate 4 GO
```
