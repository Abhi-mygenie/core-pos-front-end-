# CR-011 Screen Freeze Protocol — Binding for All Agents

**Owner:** CR-011 (Complete Reports Module, POS 4.0)
**Effective:** 2026-06-01
**Status:** ACTIVE — supersedes the standard 6-Artifact closure rule for CR-011 until all Screen Freeze Phases are complete.

---

## 0. Why this exists

CR-011 is a multi-screen UI delivery (~37 screens) where the owner has explicitly required:

> *"every screen has to be frozen by owner approval then validated with data API"*

This protocol formalises that requirement so any agent (current or future) picking up CR-011 follows the same gated cadence. No deviations.

---

## 1. The per-screen gate (NON-SKIPPABLE)

For **every** screen listed in `CR_011_SCREEN_FREEZE_LOG.md`, the sequence is:

```
①  Mockup with seed data
       ↓
②  Owner review in chat
       ↓  (revision requested → loop back to ①)
③  OWNER SIGN-OFF in chat — verbatim "lock it" or "freeze it" or equivalent
       ↓
④  Wire to live API on preprod
       ↓
⑤  Owner validates with live API data ("numbers match" or "fix X")
       ↓
⑥  Screen status → FROZEN; downstream screen begins
```

**Rules:**

- An agent **MUST NOT** begin work on screen `S(n+1)` while `S(n)` is not in `FROZEN` state — unless owner explicitly says "park S(n), start S(n+1)" in chat.
- An agent **MUST** update `CR_011_SCREEN_FREEZE_LOG.md` at every gate transition, with the date.
- Mockups go to `/app/frontend/src/pages/reports-module/` (or its subfolders). Filenames are stable — re-edit on revision, do not create new files per round.
- "Seed data" means hardcoded realistic Indian F&B values (₹, item names like Butter Chicken, channels DI/TA/DL/RM). Do not mock with `lorem ipsum`.
- "API wired" means the screen reads from the actual `/api/v2/.../report/order-logs-report` (or whichever) on **preprod** through the FE service layer — not a stub.
- "Validated with data API" means owner has compared the on-screen numbers against a known reference (existing XLSX export, an SQL query they ran, or their gut on a known busy day) and accepted.

---

## 2. Phase exit criteria

| Phase | Screens | Exit triggers |
|---|---|---|
| **Phase 1 — Visual DNA Freeze** | S0–S4 (5 screens) | All 5 in `FROZEN`. Visual DNA from `/app/design_guidelines.json` is now binding for the rest of the CR. |
| **Phase 2 — Section Heroes** | S5–S10 (6 screens) | All 6 in `FROZEN`. Section-level patterns locked. |
| **Phase 3 — Mechanical Applications** | S11–S38 (28 screens) | All 28 in `FROZEN`. Catalog complete with frozen column/filter specs. |
| **Phase 4 — Hardening** | S39–S41 (3 screens) | All 3 in `FROZEN`. Edge cases covered. |

**On Phase 4 exit:** the Implementation Plan (Gate 3 artifact) is **REVISED** to reflect the frozen catalog and sub-CR split before moving to **Gate 4 (Code Gate)**.

---

## 3. Agent responsibilities

### Main agent (E1)
- Drives every gate transition in chat.
- Updates `CR_011_SCREEN_FREEZE_LOG.md` on every transition.
- May call `design_agent_full_stack` to produce or revise mockups.
- Must not invoke `testing_agent_v3` on any CR-011 screen until that screen's "API wired" gate is complete.

### Sub-agents
- `design_agent_full_stack` may only revise the screen it is briefed on; it must not anticipate future screens.
- `testing_agent_v3` is invoked only after Phase 4 exit + Implementation Plan revision + Code Gate, per the standard 6-Artifact rule.
- All other sub-agents follow this protocol if asked to work on CR-011.

### Future agents (anyone picking up CR-011 mid-stream)
- Read `CR_011_SCREEN_FREEZE_LOG.md` first to find the current screen and gate state.
- Read this protocol second.
- Never override an FROZEN row.
- Never skip ahead.

---

## 4. Interactions with the standard 6-Artifact closure rule

Standard POS 4.0 closure (`CODE_GATE_POLICY.md`) for any CR/Bug is:

```
1. Intake
2. Impact Analysis
3. Implementation Plan
4. Code Gate
5. Implementation + QA
6. Owner Smoke Sign-off
```

For **CR-011 only**, the sequence is **interleaved per-Phase** (not "freeze all, then implement"):

```
1. Intake                                                     ✅ done
2. Impact Analysis                                            ✅ done (+ Field-to-Report Atlas + Backend Coord Note rev 2)
2.5. Screen Freeze Phase 1 (S0–S4 mockups + API + owner-validate) 🟡 active
3a. Implementation Plan — Phase 1 sub-CR
4a. Code Gate 1     (primitives + Phase-1 retrofit per Loading Spec §5)
5a. Implementation + QA — Phase 1 sub-CR
6a. Owner Smoke Sign-off — Phase 1 sub-CR
2.5b. Screen Freeze Phase 2 (S5–S10) → 3b → 4b → 5b → 6b
2.5c. Screen Freeze Phase 3 (S11–S38) → 3c → 4c → 5c → 6c
2.5d. Screen Freeze Phase 4 (S39–S41) → 3d → 4d → 5d → 6d
```

Both Gate 2.5 (Screen Freeze per phase) **and** Code Gate (per phase) are **mandatory and non-waivable** for CR-011. Primitives built at Code Gate 1 are reused across Phases 2–4.

---

## 5. Communication discipline

- Every chat response that pertains to a screen MUST reference the screen ID (e.g. "S0", "S5") so the log can be updated unambiguously.
- Owner sign-offs MUST be explicit. "looks good" is acceptable; "ok" / "fine" is NOT (too ambiguous — re-prompt for an explicit lock).
- If owner is reviewing visuals vs. API-data, the agent MUST distinguish in chat which gate (③ visual sign-off vs. ⑤ data validation) they are responding to.

---

## 6. Tracking artifacts (single source of truth)

| Artifact | Purpose | Lives at |
|---|---|---|
| `CR_011_SCREEN_FREEZE_LOG.md` | Current state of all 41 screens | `/app/memory/control/` |
| `CR_011_SCREEN_FREEZE_PROTOCOL.md` | This document — the rules | `/app/memory/control/` |
| `CR_011_FIELD_TO_REPORT_ATLAS_2026_06_01.md` | Field-grounded report catalog | `/app/memory/memory/change_requests/impact_analysis/` |
| `CR_011_BACKEND_COORDINATION_NOTE_2026_06_01.md` | Backend asks (BE-1, BE-3) | Same dir |
| `CR_011_LOADING_AND_INTERACTION_SPEC.md` | Cross-screen loading/disable/cancellation contract (binding at Gate 4 Code Gate) | Same dir |
| `/app/design_guidelines.json` | Locked DNA (from Phase 1 S0 sign-off) | `/app/` |
| `/app/frontend/src/pages/reports-module/` | All mockups + final implementations | — |

---

## 7. Code Gate addendum (loading & interaction)

CR-011 runs a **per-Phase Code Gate** (not a single Gate 4 at the end):

```
Phase 1 (S0–S4) FROZEN  →  Code Gate 1  →  primitives + Phase-1 retrofit + sub-CR ship
Phase 2 (S5–S10) FROZEN →  Code Gate 2  →  Phase-2 retrofit + sub-CR ship
Phase 3 (S11–S38) FROZEN →  Code Gate 3 →  Phase-3 retrofit + sub-CR ship(s)
Phase 4 (S39–S41) FROZEN →  Code Gate 4 →  Phase-4 retrofit + final audit pass
```

At every per-Phase Code Gate, all screens in that phase MUST satisfy the acceptance checklist in
`CR_011_LOADING_AND_INTERACTION_SPEC.md §5`. The shared primitives `<ReportLoadingShield>` and
`useReportFetch` are built at Code Gate 1 and reused unchanged across Phases 2–4 unless the
spec is formally amended by the owner. Ad-hoc loading / useEffect wiring is rejected at every
Code Gate. This addendum is binding and non-waivable.

---

## 8. Escalation

If a sub-agent or testing agent flags an issue that requires breaking a FROZEN screen's design, the main agent MUST:

1. Stop downstream work on the current screen.
2. Re-open the impacted FROZEN screen by changing its status to 🔧.
3. Surface the issue to the owner in chat with the explicit ask: "Do you want to revise S<n>?"
4. Wait for explicit owner direction before any change.

Frozen does not mean "can never change" — it means "any change requires a fresh owner approval, not an agent's judgement call."

---

## §8 — Frontend Business Logic Disclosure Rule (added 2026-06-02 per owner directive)

**Verbatim owner directive (2026-06-02, in context of CR-011-AUDIT-01 registration):**

> *"there should be no front end business logic put until asked from owner and freezed as decision. all front end logic put to be highlighted as part of audit explaining the logic for owners decision"*

### 8.1 What counts as "frontend business logic"

Any computation, threshold, mapping, fallback, or filter that lives in `/app/frontend/src/` and produces a value the owner could later be asked to defend to a customer, auditor, or staff member. Non-exhaustive examples:

- Numeric thresholds (e.g. "Slow Mover = qty ≤ 1", "Top Sellers = top 20")
- Aggregation formulas (e.g. `tax = gst + vat`, `avgPrice = unitPriceSum / lineCount`, `revenueComplementary = menuPrice × qty`)
- Status derivations (e.g. `status = qtySold > 0 ? 'sold' : 'cancelled'`)
- Fallback chains (e.g. `menuPrice = product.price → line.complementary_price → unit_price`)
- Default selections (e.g. "Default tab = All Items", "Default preset = Today")
- Date-window or attribution filters (e.g. cancel-date mode dropping lines outside window)
- Coercion / casting decisions (e.g. `isCancelled = food_status === '3'`)
- Any "if X then Y" branching whose decision affects what the owner reports to anyone external

Pure presentation logic (colours, fonts, sort directions, tooltips, formatting helpers like `formatINR`) is **NOT** in scope.

### 8.2 The rule

1. **No new frontend business logic** ships to `main` (or to any FROZEN screen, or to any screen under construction) **without** an explicit owner approval captured in `SPRINT_STATUS.md` Owner Decision Log AND a manifest entry in `auditManifest.js` with `approved=true` + approval date + source reference.
2. **Existing frontend business logic** that pre-dates this rule (2026-06-02) is grandfathered as `pending_review=true` in the manifest. It surfaces on the Audit tab as 🔵 REVIEW items until the owner explicitly approves or rejects each one.
3. **Approving a REVIEW item** is a chat-message owner action. The approval is logged via Owner Decision Log entry + manifest update. Rejection requires the owner to specify a replacement rule (which itself enters the manifest as `approved=true` with same trace).
4. **Annotation convention** (mandatory for any new FE business logic):
   ```js
   // @audit:rule id="<unique-id>" name="<short name>"
   //   explains="<one-sentence English description>"
   //   approved=<true|false> approvedDate="<YYYY-MM-DD|>" approvedSource="<doc/sprint ref|>"
   ```
   Every annotation must have a matching entry in `auditManifest.js`. The two together form the audit's runtime data source.
5. **The Audit tab is the disclosure UI.** Owner can ask any agent at any time "show me all FE business logic" — answer is "open S5 Audit tab; manifest is `auditManifest.js`".
6. **Export gate.** Excel + PDF exports on Insights screens are blocked while any of the following are non-empty: RED audit flags, AMBER audit flags, or REVIEW (un-approved) FE rules touching the active screen.

### 8.3 Enforcement

- This rule is enforced by **CR-011-AUDIT-01** (registered 2026-06-02 in `CR_REGISTRY.md` Standalone CRs). Implementation plan: `CR_011_S5_AUDIT_TAB_PLAN_2026_06_02.md`.
- It applies retroactively to S5 Item Sales Hybrid (first audit run produces ~14 candidate REVIEW items).
- Future screens (S6 Order Ledger Hybrid → S10 Prep & Serve Time, Phase 3 sub-tabs, Phase 4) MUST honour this rule from inception. Adding the audit tab to those screens is a Phase-2/3 backlog item — for now §8 applies in principle to those screens; physical Audit tabs land per-screen at owner's call.

### 8.4 Re-opening a previously approved FE rule

Same path as §7 screen re-open: status flip in manifest from `approved=true` to `pending_review=true`, owner-directed verbatim, then resolved with a new approval or rejection. All transitions logged.

---

*Last updated 2026-06-02 (§8 added per owner directive). Edits to this protocol require explicit owner instruction.*
