# SESSION HANDOVER — 2026-09-25 — BUG-459 + CR-387 SHIPPED (QA PASS) · BUG-460 registered (Gate 1) · NEXT: present intake → complete → planning

**Respond to the owner in ENGLISH only.** Strict gate protocol governs everything: `/app/memory/control/AGENT_PROMPT_ALPHA.md`. **No feature code without the owner's verbatim "Gate 4 GO".**

---

## 0. NEXT AGENT — DO THIS FIRST (Role 1 INTAKE → then PLANNING)
The owner wants to review the newly-registered **BUG-460** and answer its open questions, then move it to planning.

1. **Present the intake to the owner** — summarise `change_requests/BUG-460_SUGGESTED_QTY_ROUND_TO_DISPLAY_UNIT_INTAKE.md` (classification P2 / Risk HIGH / RELATED CR-387 / route = PLANNING).
2. **Ask the 3 open questions** (verbatim below). Do NOT invent the answers (R3).
   1. Confirm **ceil / round-up** to a whole display unit (vs round-to-nearest)?
   2. Apply the same rounding to **alert / top-up** rows too? (recommend yes)
   3. Keep **Projected Need + Gap** as partial breakdown / informational? (recommend yes — owner only flagged Suggested Qty)
3. **Complete the intake** — record the owner's answers into the intake doc's "Open questions" section + a registry `status_history` event for BUG-460. If the owner adds scope, re-check severity/risk.
4. **Ask permission to proceed to PLANNING** (Role 2, Gate 2 Impact Analysis + Gate 3 Implementation Plan). Then STOP and wait for owner **"Gate 4 GO"** before any code.

---

## 1. BUG-460 — full details (the item to work next)
- **ID / status:** BUG-460 · `GATE_1_INTAKE` · sprint `sep_bug_closure` · Type BUG · **Severity P2** · **Risk HIGH** (financial-adjacent) · fast_lane_eligible = false.
- **Problem:** Smart Purchase ("Stock Update") → **"Suggested Qty"** shows an un-purchasable fraction of a display unit, e.g. **"641 bottle 330 ml"**. Since stock is bought in whole **bottles**, it must round **UP to the next whole display unit → "642 bottle"**. Same for all converted rows: "688 tin 665 ml"→"689 tin", "7 box 4 piece"→"8 box", "10 pkt 4 piece"→"11 pkt", "745 bottle 120 ml"→"746 bottle". No-conversion rows (piece/kg) already whole → unchanged.
- **Root cause (HIGH confidence, reproduced + traced):** `src/utils/purchasePlanner.js`
  - L126 velocity: `const suggest = gap < 0 ? Math.ceil(-gap) : 0;` — `gap` is in the **BASE unit** (ml/gm/piece) → ceils to whole **base** unit, not whole **display** unit.
  - L173 alert/top-up: `suggest_qty: Math.ceil(threshold - onHand)` — same base-unit ceil.
  - Display added by CR-387: `AutoShoppingList.jsx` L344 (Table 2 Suggested Qty) `fmtBreak(r.suggest_qty, r)`, L235 ("suggest:" hint), and `SmartPurchasePanel.jsx` L66 (two-box seed) all derive from that base `suggest_qty` → render the leftover partial.
  - **Break point:** rounding granularity = base unit; should be display unit for `has_conversion` rows.
- **Recommended fix (for the PLAN — NOT to implement yet):** round up to whole display unit **at the planner** for `has_conversion` rows: `suggestBase = hasConv ? Math.ceil((-gap)/factor)*factor : Math.ceil(-gap)` (and analogous for alert rows). Consider a shared `ceilToDisplayUnit(base, factor)` helper in `quantityBreakdown.js`. This keeps the Suggested column, the "suggest:" hint, the two-box seed, and the rate hint all consistent. Leave **Projected Need + Gap** unchanged (informational). No-conversion rows unchanged.
- **Scope estimate:** SMALL — `purchasePlanner.js` (2 sites) [+ optional helper in `quantityBreakdown.js`]; display + seed inherit; extend `src/__tests__/utils/purchasePlanner.cr387.test.js` (or a new bug460 test). No hotspot file (R5). Not backend.
- **Route recommendation (owner asked BugFix vs Planning): PLANNING route.** Reasons: (a) Bug Fix (Role 5) needs a prior QA failure against an existing plan — none exists; (b) financial-adjacent → planning-skip / Fast Lane ineligible + Owner Approval Matrix requires sign-off; (c) open policy decisions (R3).
- **Artifacts:** intake `change_requests/BUG-460_SUGGESTED_QTY_ROUND_TO_DISPLAY_UNIT_INTAKE.md` · investigation `investigations/BUG-460_SUGGESTED_QTY_ROUND_TO_DISPLAY_UNIT_INVESTIGATION_2026_09_25.md` · registry entry `control/registry.json` (720 items) · tracker `control/BUG_TRACKER.md` (top line).

---

## 2. What happened this session (complete summary)

### 2a. OD-UNIFY-01/02 — Point 1: Mockups (Role 2 PLANNING, design-only)
- Owner freeze: on **Stock Audit** + **Smart Purchase** the breakdown appears **once per cell** (new two-box / breakdown UI is the single source); BUG-455 muted parenthetical **suppressed** on those two screens, **kept** on Current Stock + Sub-Recipe Stock.
- Deliverables: design blueprint `/app/design_guidelines.json` (via design agent) + 4 annotated before→after mock frames persisted at `/app/memory/mockups/` (`stock_audit_after.html`, `smart_purchase_after.html`, `current_substock_unchanged.html`, `OD-UNIFY-01_MOCKUP_REVIEW_2026-09-25.md`). Grounded on real live screens.

### 2b. Point 2: Plan rewrites (Role 2 PLANNING, Gate 3)
- Rewrote in place `plans/BUG-459_IMPLEMENTATION_PLAN.md` + `plans/CR-387_IMPLEMENTATION_PLAN.md` to FINAL: reversed BUG-455 "untouched" → **suppress via screen-level flag** (BUG-459 **E4m** on StockAuditPanel L176–178; CR-387 **E-A10/E-A11** on AutoShoppingList L194/L307); combined QA wave (OD-UNIFY-02, impl order **BUG-459 → CR-387**); added verification checks V8/V8b, V12/V12b.

### 2c. Point 3: Owner gave verbatim "Gate 4 GO" → Implementation (Role 3, Gate 5a)
- **BUG-459 (Stock Audit) SHIPPED:** NEW `src/utils/quantityBreakdown.js` (toBreakdown/fromBreakdown/normalizeBreakdown/hasConversion/minorDp) + test (14/14). `inventoryTransform.js` +`displayQtyParts` (ingredients + stockItems). `StockAuditPanel.jsx`: two-box display-unit converter, base-unit `getDrift` rendered as breakdown badge, display-unit save payload, wastage toast, **E4m** BUG-455 paren suppressed via `SHOW_BUG455_PARENTHETICAL=false` flag, column widths.
- **CR-387 (Smart Purchase) SHIPPED:** `rowQuantity()` helper in the same util + test (8/8). `purchasePlanner.js` +conversion metadata (`small_unit`/`conversion_factor`/`has_conversion`/`display_qty_parts`) on velocity + alert rows (math untouched). `AutoShoppingList.jsx`: `fmtBreak` on Projected Need/Gap/Suggested (both tables), two-box "Qty to Buy", rate hint via `rowQuantity`, **E-A10/E-A11** BUG-455 on-hand paren suppressed. `SmartPurchasePanel.jsx`: two-box seed + `rowQuantity` submit — `unit` = display unit when converted, `quantity` in display units, `rate` per display unit, **`amount` unchanged**. `GroupedVendorPreview.jsx`: breakdown text.
- **Boundary intact:** CurrentStockPanel + SubRecipeStockPanel untouched (BUG-455 kept).
- **EXIT GATE 5/5:** registry BUG-459 & CR-387 → `GATE_5A_IMPLEMENTED` with owner "Gate 4 GO" in `status_history`; BUG_TRACKER/CR_REGISTRY/FILE_OWNERSHIP synced; code markers `// BUG-459` / `// CR-387` in every file; webpack compiles (only pre-existing warnings).
- **Combined QA wave (testing_agent → `/app/test_reports/iteration_1.json`): 100% frontend PASS, zero bugs**, no console errors. Live smoke matches the approved mockups. QA handover: `handover/QA_HANDOVER_2026-09-25_BUG459_CR387_COMBINED.md`.
- **Known MINOR (out of scope, pre-existing):** StockBadge shows "Infinityd left" when velocity = 0 — NOT touched (would be unregistered scope creep). Candidate P3 if owner wants it.

### 2d. BUG-460 — Investigation + Intake (this is the next work)
- Owner spotted the Suggested Qty rounding issue → Investigation (Role 6) then INTAKE (Role 1) → registered BUG-460. See §1.

---

## 3. Registry / gate state (sprint `sep_bug_closure`)
- **BUG-459:** `GATE_5A_IMPLEMENTED` (QA passed; awaits Gate 6 owner smoke — live save not yet run).
- **CR-387:** `GATE_5A_IMPLEMENTED` (QA passed; awaits Gate 6 owner smoke — live submit not yet run).
- **BUG-455:** `GATE_5A_IMPLEMENTED` (QA folded into the combined wave per OD-UNIFY-02 — Stock Audit/Smart Purchase suppression verified; its own T455 cases still to be folded in if not yet done).
- **BUG-460:** `GATE_1_INTAKE` (next).

## 4. LIVE-ONLY steps still pending (owner-authorized, mutate preprod RID 835 — never run automatically)
- BUG-459 Gate 6: one real **Save Adjustments** → verify `add-stock` payload (`unit`=display unit, `physical_qty`=major+minor/factor) + `cal_quantity` read-back + wastage toast.
- CR-387 Gate 6: one real **Update Stock** → verify `add-purchase` (`Unit`=display unit, quantity in display units, rate per display unit, `Amount` unchanged) + report row.

## 5. Guardrails / environment
- **Credentials:** `QA_INV` alias in `/app/memory/test_credentials.md` (owner@yabyum.com / preprod RID 835). Never print secrets in reports (R20). **Preprod is LIVE — never click Save Adjustments / Update Stock in automated tests.**
- Preview URL from `/app/frontend/.env` `REACT_APP_BACKEND_URL`. Frontend only (React CRA+craco). Yarn only (R10). Code markers mandatory (R18). Registry sync gate on any code (R17).
- Do NOT overwrite the ESM webpack fixes (`frontend/craco.config.js`, `frontend/webpack-shims/`). Do NOT touch `/app/memory/final/*` (R2).
- The two-box suppression flags are `SHOW_BUG455_PARENTHETICAL = false` in `StockAuditPanel.jsx` (L11) and `AutoShoppingList.jsx` (L10) — keep BUG-455 live on the other two panels.

## 6. Last owner messages (context)
1. "Gate 4 GO" (verbatim) → triggered BUG-459 + CR-387 implementation (done, QA passed).
2. Owner flagged Suggested Qty rounding ("641 bottle 330 ml" → should be "642 bottle") — **investigation only** (done).
3. "choose intake role to register this bug and suggest if bug fix route or planning route" → BUG-460 registered; route = PLANNING (done).
4. This handover request.
