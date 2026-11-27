# Session Handover — 2026-11-17 (Session 3) — ScanOrderPopOut Batch: BUG-679 + CR-545 OBS-5 + CR-534 + CR-533

**For:** Next agent
**From:** Investigation + Planning agent (2026-11-17 session 3)
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `deploy-20261117-063656`
**App:** `/app/frontend` (React 19 + CRACO + Tailwind + Radix/shadcn) · backend at `preprod.mygenie.online` (Laravel)

---

## 1. Session Summary

1. **Environment re-deployed** from `origin/main`. Full memory dir synced (3,182 files). 4 secret keys re-collected (Firebase API/VAPID, Google Maps, CRM). GitHub PAT configured. Branch `deploy-20261117-063656` created and pushed.

2. **BUG-677 Socket Telemetry** — Full backend brief written for Gyan (`POST /api/v1/socket-telemetry/log`, 7 event types, DB schema, 8 SQL queries). Filed at `backend_briefs/BACKEND_BRIEF_SOCKET_TELEMETRY_2026_11_17.md`.

3. **BUG-677 PWA vs Browser** — Deep analysis explaining why socket issues hit PWA only (6 root causes traced through code + live probe evidence).

4. **Batch C v2 Contracts** — Investigated 4 backend feedback questions. Wrote updated v2 contracts for CR-543 (tier bounds), CR-544 (re-payment window), CR-546 (replace semantics + discount_type). All synced to `frontend/public/briefs/` + tracker HTML updated.

5. **CR-545 QA Observations** — Investigated 5 owner observations. Result: 2 existing (CR-534, CR-534), 2 new (BUG-679, CR-547), 1 scope gap (CR-545 OBS-5). ODs locked. BUG-679 + CR-547 registered.

6. **PLANNING: BUG-679 + CR-545 OBS-5** — Combined Gate 2+3 plan written. 6 edits, 1 file, ~20 lines. Awaiting Gate 4 GO.

---

## 2. THE FOUR ITEMS — ALL TOUCH ScanOrderPopOut.jsx

These 4 items all modify `ScanOrderPopOut.jsx` (697 lines) and/or its parent wiring in `DashboardPage.jsx` (2,344 lines). They should be **implemented together as one batch** to avoid merge conflicts and redundant QA cycles.

### Item Summary

| ID | Title | Gate | Risk | Lines est. | ODs |
|---|---|---|---|---|---|
| **BUG-679** | Cancelled items: strikethrough + hide cancel button | Gate 3 PLAN READY | LOW | ~15 | ALL LOCKED (Option B) |
| **CR-545 OBS-5** | APS ₹1: replace with "Price TBD" pill | Gate 3 PLAN READY | LOW | ~5 | LOCKED (hide ₹1) |
| **CR-534** | Customer info, phone, delivery address, table+order# labels | Gate 1 INTAKE ONLY | MEDIUM | ~30-40 | 3 ODs OPEN |
| **CR-533** | Minimize popup to YTC tab | Gate 1 INTAKE ONLY | HIGH | ~40-60 | 3 ODs OPEN |

---

## 3. RECOMMENDED CLUBBING STRATEGY

### Batch into 2 phases within one implementation session:

**Phase A (ready NOW — Gate 4 GO needed):** BUG-679 + CR-545 OBS-5
- Plan exists: `impact/BUG-679_CR-545-OBS5_COMBINED_PLAN_2026_11_17.md`
- 6 edits, 1 file, ~20 lines
- ODs ALL LOCKED — no questions remaining
- Can implement immediately after Gate 4 GO

**Phase B (needs IA + OD answers first):** CR-534 + CR-533
- Both at GATE_1_INTAKE — need Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
- CR-534 has 3 open ODs (which fields mandatory, layout preference, data availability)
- CR-533 has 3 open ODs (YTC section location, visual distinction, snooze interaction)
- Estimated: ~70-100 lines across ScanOrderPopOut.jsx + DashboardPage.jsx

### Why club them:

1. **Same file** — all 4 touch ScanOrderPopOut.jsx. Separate PRs = merge conflicts guaranteed.
2. **Same review** — owner can QA the entire popup in one session instead of 4 separate smoke tests.
3. **Shared layout impact** — CR-534 (info density) affects the body where BUG-679 (strikethrough) and OBS-5 (Price TBD) render items. CR-533 (minimize) adds a new button to the footer where CR-545 added KOT. Layout decisions cascade.
4. **One DashboardPage edit** — CR-533 needs new state + handler in DashboardPage.jsx. BUG-679/OBS-5 don't touch DashboardPage. Better to merge once.

### Why NOT club Phase A with Phase B:

Phase A is **ready now** (plan done, ODs locked). Phase B has **6 open owner decisions**. Waiting for Phase B blocks the quick wins. Ship Phase A first, then Phase B builds on top.

---

## 4. PHASE A — IMPLEMENTATION READY

### BUG-679 + CR-545 OBS-5 — 6 Edits in ScanOrderPopOut.jsx

Full plan at: `impact/BUG-679_CR-545-OBS5_COMBINED_PLAN_2026_11_17.md`

| Edit | What | Line Range | Lines |
|---|---|---|---|
| E1 | Add `isCancelled` check: `it?.status === 'cancelled' \|\| Number(it?.foodStatus ?? it?.food_status) === 3` | After L464 | +1 |
| E2 | Cancelled row `<li>`: add `style={{ opacity: isCancelled ? 0.5 : 1 }}` | L471 | modify |
| E3 | Cancelled name: `color: '#9CA3AF'`, `textDecoration: 'line-through'`, append "(Cancelled)" | L477-481 | modify |
| E4 | Hide cancel X button: `{onCancelItem && !isCancelled ? (` | L511 | modify |
| E5+E6 | Combined price display: cancelled → hide; APS → "Price TBD" pill; normal → ₹ amount | L503-509 | replace |

**Anti-rule safe:** No new API calls, no localStorage, no status mutation. Pure display logic.

### Verification Matrix (10 checks)

| # | Check | Expected |
|---|---|---|
| V1 | Cancelled item: strikethrough + grey + "(Cancelled)" | Visible |
| V2 | Cancelled item: no X button | Hidden |
| V3 | Cancelled item: no price | Hidden |
| V4 | APS item: "Price TBD" orange pill instead of ₹1 | Visible |
| V5 | APS badge still present | Visible |
| V6 | Normal items: price in ₹ format | Unchanged |
| V7 | Comp items: unaffected | Unchanged |
| V8 | Active items: cancel X, price, qty | Fully functional |
| V9 | Code markers: `// BUG-679`, `// CR-545 OBS-5` | ≥3 hits |
| V10 | Webpack 0 new warnings | Compiled |

---

## 5. PHASE B — NEEDS IA + OWNER DECISIONS

### CR-534: Customer Info Enhancement

**Current state (ScanOrderPopOut.jsx):**
- L363-376: Shows `customerName` + `phone` ONLY when present. No "Walk-in" fallback.
- L330-332: Shows table number OR order number — NOT both. Source of "7 vs 7874" confusion.
- L339-342: Shows channel label (Dine-In/Delivery) + `formatLocation()` — but address is ONLY in the channel subtitle, not prominently displayed.
- `getAddressLine()` helper exists at L130-132 but is **never called in the body**.
- L428-434: Delivery instructions shown — but only the `delivery_instructions` field, not the full address.

**What needs to happen:**
1. Answer OD-534-01: Which fields mandatory vs shown-when-available?
2. Answer OD-534-02: Is order amount/item list available from socket payload at popup time?
3. Answer OD-534-03: Layout preference — compact rows vs structured card sections?
4. Write IA — trace all data fields available in `activeOrder` object
5. Write implementation plan — exact line edits

**Recommended layout (for IA to validate):**
```
┌─────────────────────────────────────┐
│ [WEB · SCAN & ORDER] New Web Order  │  ← header (existing)
├─────────────────────────────────────┤
│ Table 7 · Order #7874     ₹692.00  │  ← BOTH table + order# (fix OBS-3)
│ Dine-In · 3 items                   │
│                                     │
│ 👤 Customer: Ravi Kumar · 98xxxxx  │  ← always show (or "Walk-in")
│ 📍 123 Main St, City 400001        │  ← delivery only
│ 📝 "Extra spicy, no onion"         │  ← instructions
│                                     │
│ Payment: pending                    │
│ ┌─────────────────────────────────┐ │
│ │ 1× melo fish [APS] Price TBD ⊗ │ │  ← BUG-679 + OBS-5 from Phase A
│ │ 1× Hot Garlic Sauce    ₹299  ⊗ │ │
│ │ 1× Manchurian          ₹299  ⊗ │ │
│ └─────────────────────────────────┘ │
│ ◀ Prev              Next ▶         │
├─────────────────────────────────────┤
│ [Mute] [Edit] [KOT] [Reject] [✓]  │  ← footer (existing)
│           [Minimize ↓]              │  ← CR-533 adds this
└─────────────────────────────────────┘
```

### CR-533: Minimize to YTC Tab

**Current state:**
- ScanOrderPopOut has NO minimize button. Only actions: Mute, Edit, KOT, Reject, Accept.
- YTC tab exists on dashboard — it's the `tableFilter === 'confirm'` filter at L1196.
- Orders with `fOrderStatus === 7` show as cards in the grid. The popup ALSO shows them.
- Snooze (Mute) hides the popup for 2 minutes but doesn't put it in the YTC tab (it's already there as a card — the popup is an OVERLAY on top of the cards).

**What needs to happen:**
1. Answer OD-533-01: Where is the YTC section — tab filter chip or dedicated column?
2. Answer OD-533-02: Should minimized orders have a visual badge ("New - Pending Review")?
3. Answer OD-533-03: Should snoozed orders also appear differently, or only minimized?
4. Write IA — trace popup state management (the `localHideSet` at L174-200, the snooze logic, how queue is computed at L172-192)
5. Write implementation plan — this is the **hardest item** because it touches:
   - New state in ScanOrderPopOut (minimized set)
   - New handler in DashboardPage (onMinimize prop)
   - YTC tab badge/counter update
   - Visual distinction for minimized-but-not-snoozed orders in the grid
   - Footer button layout change (5→6 buttons or replace Mute with Minimize)

**Risk:** HIGH — DashboardPage.jsx is R5 hotspot (2,344 lines, touched by many CRs). CR-533 adds state management that interacts with existing snooze logic.

**Key design decision:** Is "Minimize" just a longer snooze (hide popup, order visible as normal card) or a NEW state that shows a badge on the card? If it's just "hide popup permanently until manually reopened" → it's essentially infinite snooze → simpler. If it's a new visual state → more complex.

---

## 6. FILE OWNERSHIP

| File | Last Modified By | Items Touching It |
|---|---|---|
| `ScanOrderPopOut.jsx` (697 lines) | CR-545 (2026-11-17) | **BUG-679, CR-545 OBS-5, CR-534, CR-533, BUG-676, CR-547** |
| `DashboardPage.jsx` (2,344 lines) — R5 | CR-545 (2026-11-17) | **CR-533** (new minimize state), BUG-677 (socket), plus 20+ other items |

---

## 7. ITEMS NOT TO TOUCH

| Item | Why |
|---|---|
| CR-547 (KOT item selection) | P2 — registered, deferred to next batch |
| BUG-676 (edit order ringer) | INTAKE only — different concern (notification, not display) |
| BUG-677 (socket resilience) | Separate scope — 4 different files, no overlap with popup display |
| CR-543/544/546 (audit events) | Backend-blocked — different page (AuditLogMockup.jsx) |

---

## 8. CREDENTIALS

| Account | Password | RID | Use |
|---|---|---|---|
| `owner@cafe103.com` | `Qplazm@10` | 644 | General testing (autoSC=No) |
| `owner@ruby.com` | `Qplazm@10` | 672 | APS testing, web orders, socket probes |
| Login endpoint | — | — | `POST /api/v1/auth/vendoremployee/login` |
| GitHub PAT | — | — | In secrets (via `emergent-env-exec printenv GITHUB_PAT_TOKEN`) |

**QA pre-req:** Needs a web/scan order with ₹1 APS item + a cancelled item in YTC state to verify Phase A. Use ruby (RID 672) which has APS testing items.

---

## 9. BOOT SEQUENCE FOR NEXT AGENT

| Priority | File | Why |
|---|---|---|
| 1 | `control/AGENT_PROMPT_ALPHA.md` | Role system, gate flow |
| 2 | **This handover** | Current state + what to do |
| 3 | `impact/BUG-679_CR-545-OBS5_COMBINED_PLAN_2026_11_17.md` | Phase A — ready to implement |
| 4 | `change_requests/33_CR-533_SCAN_ORDER_POPUP_MINIMIZE_TO_YTC_TAB_INTAKE.md` | Phase B — CR-533 intake |
| 5 | `change_requests/34_CR-534_SCAN_ORDER_POPUP_MISSING_CUSTOMER_INFO_INTAKE.md` | Phase B — CR-534 intake |
| 6 | `investigations/INV-CR545-QA-OBSERVATIONS-2026-11-17.md` | Context on all 5 observations |
| 7 | `control/FILE_OWNERSHIP.md` | Conflict check before coding |

---

## 10. RECOMMENDED EXECUTION SEQUENCE

```
Step 1: Get Gate 4 GO for Phase A (BUG-679 + OBS-5)
Step 2: IMPLEMENT Phase A — 6 edits, ~20 lines, ScanOrderPopOut.jsx only
Step 3: QA Phase A — 10 verification checks
Step 4: Ask owner 6 ODs for Phase B (CR-534: 3 ODs + CR-533: 3 ODs)
Step 5: Write IA for CR-534 (trace activeOrder fields, layout design)
Step 6: Write IA for CR-533 (trace popup state, snooze interaction, YTC section)
Step 7: Write combined implementation plan for Phase B
Step 8: Get Gate 4 GO for Phase B
Step 9: IMPLEMENT Phase B — est. ~70-100 lines across 2 files
Step 10: QA Phase B — full popup regression
```

**Total estimated:** ~90-120 lines across 2 files (ScanOrderPopOut.jsx + DashboardPage.jsx), all in one coherent batch.

---

## 11. REGISTRY STATUS

| Item | Gate | Status | Next |
|---|---|---|---|
| BUG-679 | 3 | GATE_3_PLAN_COMPLETE | **Gate 4 GO → Implement** |
| CR-545 OBS-5 | 3 | GATE_3_PLAN_COMPLETE (combined with BUG-679) | **Gate 4 GO → Implement** |
| CR-534 | 1 | GATE_1_INTAKE_COMPLETE | **Answer 3 ODs → Gate 2 IA** |
| CR-533 | 1 | GATE_1_INTAKE_COMPLETE | **Answer 3 ODs → Gate 2 IA** |
| CR-547 | 1 | GATE_1_INTAKE_COMPLETE | P2 — deferred |

---

## 12. COMMITS THIS SESSION (11 commits on `deploy-20261117-063656`)

| Commit | Summary |
|---|---|
| `28a2a38` | Deploy POS frontend — env configured, deps installed |
| `ae4df1b` | Backend brief: Socket Telemetry API (7 event types, DB schema) |
| `b88952b` | INV: Batch C backend feedback — 4 contract gaps resolved |
| `0a42c0a` | Batch C v2 contracts (CR-543/544/546 — tier bounds, re-pay, replace) |
| `0b78da6` | Sync tracker: v2 contracts + HTML + tracker rows updated |
| `a643938` | INV: CR-545 QA observations — 5 items traced |
| `c3cf499` | PLANNING: BUG-679 + CR-545 OBS-5 — Gate 2+3 combined plan |
| + 4 more | Supporting commits (finish summaries, zip generation) |

---

*End of handover. Ref: Emergent session 2026-11-17 (session 3).*
