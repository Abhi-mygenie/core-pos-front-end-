# CR-557 — Impact Analysis (Gate 2)

**ID:** CR-557
**Title:** Extract shared `<PopoutItemRow>` so web-EDIT **Mode B** reuses the full item renderer
**Gate:** 2 — Impact Analysis
**Role:** PLANNING (Gate 2 only — Implementation Plan NOT written this gate)
**Date:** 2026-11-19
**Severity:** P0 (owner override 2026-11-19; intrinsic P1)
**Risk:** HIGH (R5 hotspot `ScanOrderPopOut.jsx`; order-accept display path; many feature consumers)
**Code Reality:** PARTIAL — the rich row markup EXISTS inline in Mode A; the shared `<PopoutItemRow>` component does NOT exist. Mode B renders a divergent, stripped-down copy.

> **OD decisions RESOLVED 2026-11-19:** OD-557-01 = YES (APS/Price-TBD in Mode B); OD-557-02 = Option A (shared read-only row for prevItems); OD-557-03 = Keep old labels (`testIdPrefix` prop, no test migration). See §8.
**Conflict Pre-Check:** CLEAN at HEAD (all same-file items already IMPLEMENTED/merged — see §5). This CR is foundational for CR-558, BUG-679(ModeB), BUG-702(ModeB), CR-545(ModeB).

---

## 1. Problem & Scope

`components/dashboard/ScanOrderPopOut.jsx` contains **two independent item renderers**:

| | **Mode A** (normal web order, `!isEditMode`) | **Mode B** (web-edit `newItems`, `isEditMode`) |
|---|---|---|
| Lines | L659–817 (rich) | L552–598 (stripped) |
| Item name + qty | ✅ | ✅ |
| Per-item KOT checkbox (CR-547) | ✅ | ✅ |
| Per-item cancel X (CR-545) | ✅ | ✅ |
| **APS badge + "Price TBD" for ₹1 items (CR-545 / CR-545 OBS-5)** | ✅ | ❌ missing |
| **Cancelled row: strikethrough, grey, "(Cancelled)", price hidden (BUG-679)** | ✅ | ❌ missing |
| **Full per-option variation list with per-option price, multi-line (BUG-702)** | ✅ (rows 2, multi-line) | ⚠️ partial (single inline summary line) |
| **Add-on prices** | ✅ | ❌ names only |
| **Item note (row 4)** | ✅ | ❌ missing |
| `Comp` tag | ✅ | ❌ missing |

**Consequence:** BUG-679, BUG-702 and CR-545 were fixed in Mode A only. The web-EDIT pop-out (Mode B) still shows the old partial rendering → these IDs are **reopened for Mode B**. CR-558 (owner chose **Option B** — remove unwanted items then Accept-all) also needs the Mode-B rows to carry the full renderer + cancel control.

**Scope of CR-557:** Extract the Mode A `<li>` renderer into a single reusable `<PopoutItemRow>` and render it in BOTH the Mode A list AND the Mode B `newItems` list (and, per OD-557-02, the `prevItems` read-only list). Behaviour-preserving refactor — no new business logic.

---

## 2. Data flow (unchanged by this CR)

```
orders (useOrders) → queue filter: isUnconfirmedScanOrder(o) || hasUnconfirmedWebEditItems(o)
   → activeOrder → isEditMode = hasUnconfirmedWebEditItems(activeOrder)
       ├─ Mode A (!isEditMode): activeOrder.items (APS-sorted) .map → RICH <li>   (L659-817)
       └─ Mode B (isEditMode):  newItems .map → STRIPPED <li> (L552-598)
                                 prevItems → greyed <details> list (L599-619)
```

CR-557 changes only the **rendering of a single row**, not the queue, the mode predicate, the selection state, or any handler.

---

## 3. Proposed shared component (design only — not implemented this gate)

New file: `components/dashboard/PopoutItemRow.jsx` (co-located; presentation-only, no service/socket/localStorage imports — inherits ScanOrderPopOut anti-rules).

Suggested props (all data passed down; row owns no state):
```
item               // the order item
idx                // index (for data-testid stability)
currencySymbol
variant            // 'full' (actionable) | 'readonly' (prevItems, greyed, no actions)
showKotCheckbox    // bool  (onPrintKOT present)
isSelected         // bool  (selectedItemIds.has(item.id))
onToggleKot        // (itemId) => void
showCancel         // bool  (onCancelItem present && !isCancelled)
onCancel           // (item) => void
```
Internally derives (moved verbatim from Mode A L665–673): `qty`, `unit`, `lineTotal`, `isComp`, `isCancelled` (BUG-679), `variationOptions` (BUG-702 `flattenVariationOptions`), `addOns`, APS detection (`unit===1 && !isComp`). Keeps every existing `data-testid` (`popout-item-row-${idx}`, `popout-item-aps-tag-${idx}`, `popout-item-cancel-${idx}`, `popout-item-variation-${idx}-${vIdx}`, `popout-item-addon-${idx}-${aIdx}`, `popout-item-note-${idx}`, `popout-kot-check-${idx}`).

Then:
- **Mode A** list (L659–817) → `sortedItems.map(it => <PopoutItemRow variant="full" .../>)`.
- **Mode B** `newItems` (L552–598) → same `<PopoutItemRow variant="full" .../>` (replaces the stripped `<li>`), giving Mode B the APS/cancelled/variation/add-on/note fixes automatically.
- **Mode B** `prevItems` (L599–619) → `<PopoutItemRow variant="readonly" .../>` (greyed, no cancel/KOT) — **pending OD-557-02**.

**`data-testid` collision caution:** Mode B new-item rows currently use `popout-new-item-${idx}` while Mode A uses `popout-item-row-${idx}`. The shared row emits `popout-item-row-${idx}`. QA selectors and the existing `ScanOrderPopOut.test.jsx` / `CR547_SelectiveKOT.test.jsx` reference both — Gate 3 must decide whether to keep a `testIdPrefix` prop to preserve `popout-new-item-*` or migrate tests. Flagged for the plan.

---

## 4. Affected files & lines

| # | File | Change | Lines | Risk |
|---|------|--------|-------|------|
| A | `components/dashboard/PopoutItemRow.jsx` **(NEW)** | Extracted rich row renderer (verbatim logic from Mode A L665–812) + `variant` readonly branch | ~160 new | MEDIUM |
| B | `components/dashboard/ScanOrderPopOut.jsx` | Replace Mode A `<li>` (L674–814) and Mode B `newItems` `<li>` (L562–595) with `<PopoutItemRow>`; replace `prevItems` rows (L605–616) per OD-557-02; add import | ~ −180 / +40 | **HIGH (R5)** |

**No other files.** Selection state (`selectedItemIds`), `toggleKotItem`, mode predicates, action-row footer, KOT/Reject/Accept handlers all stay in `ScanOrderPopOut.jsx` unchanged.

---

## 5. Conflict Pre-Check (FILE_OWNERSHIP + registry)

`ScanOrderPopOut.jsx` is an R5 hotspot. All items that shaped the current row markup are already landed at HEAD, so CR-557 **consumes** their code (executes AFTER them) rather than colliding:

| Item | Status | Row-markup it owns | Conflict |
|------|--------|--------------------|----------|
| CR-545 (+OBS-5) | IMPLEMENTED 2026-11-17 | APS badge, Price-TBD, per-item cancel | NO — refactor must preserve |
| BUG-679 | IMPLEMENTED (reopened for Mode B) | cancelled strikethrough/price-hide | NO — refactor carries into Mode B (this is the point) |
| BUG-702 | GATE_5A_IMPLEMENTED (reopened for Mode B) | variation option+price | NO — carried into Mode B |
| CR-547 | IMPLEMENTED 2026-11-19 | per-item KOT checkbox + select-all | NO — checkbox stays in parent, passed as prop |
| CR-552 | GATE_5A_IMPLEMENTED / PARTIAL | Mode B two-section render | NO — CR-557 reuses its `newItems`/`prevItems` split |

**Open same-file items not yet coded:** CR-533 / CR-534 were noted "Gate 1 pending" in the CR-552 IA. **Gate 3 must re-check FILE_OWNERSHIP before coding**; if either is mid-flight on this file, sequence CR-557 to land first (it is foundational) or coordinate a single batch.
**Result: CLEAN at HEAD.** Downstream dependents (CR-558, BUG-679-ModeB, BUG-702-ModeB) must execute AFTER CR-557.

---

## 6. Downstream consumers / regression surface

- **Every feature in the table in §1** — the refactor must be pixel/behaviour identical in Mode A. Primary regression risk is accidental behaviour drift during extraction.
- **Tests:** `__tests__/components/dashboard/ScanOrderPopOut.test.jsx` and `CR547_SelectiveKOT.test.jsx` assert on row `data-testid`s and KOT selection — must stay green (or be migrated deliberately, see §3 caution).
- **KOT selection payload** (`kotSelectedItems`, CR-547) is derived in the parent from `selectedItemIds`; the row only renders/toggles a checkbox → selection logic untouched.
- **APS sort** (CR-545) happens in the parent `.map` before rows render → untouched.
- No API/socket/transform/localStorage surface touched → no backend brief needed.

---

## 7. Risk classification

**HIGH.** Single-file R5 hotspot on the order-accept display path with six overlapping feature behaviours. Not financial/tax/settlement → not CRITICAL. Behaviour-preserving refactor contains most risk, but the blast radius (every row in both modes) mandates the full gate + regression of Mode A AND Mode B. **Fast Lane NOT eligible.**

---

## 8. Owner Decision Queue (Rule R3 — do not guess)

**RESOLVED 2026-11-19 (owner):**
- **OD-557-01 = YES** — Mode B new-item rows SHOW the APS badge + "Price TBD" on ₹1 items (parity with Mode A).
- **OD-557-02 = Option A** — `prevItems` ("Previously ordered items") uses the shared `<PopoutItemRow>` in a **read-only `variant`** (greyed, no cancel/KOT controls). One renderer to maintain.
- **OD-557-03 = Keep old labels** — `<PopoutItemRow>` takes a `testIdPrefix` prop; Mode B new-item rows keep `popout-new-item-${idx}`, Mode A keeps `popout-item-row-${idx}`. No test migration; `ScanOrderPopOut.test.jsx` + `CR547_SelectiveKOT.test.jsx` stay green.

All three resolved → Gate 3 Implementation Plan can proceed.

### Original options (for reference)

- **OD-557-01 — APS in Mode B:** When a web-edit *new* item is an APS (₹1) item, should Mode B now show the **APS badge + "Price TBD"** (as Mode A does)? *Recommend YES* (that is the intended consistency win), but confirm APS items can occur on web-edits.
- **OD-557-02 — prevItems renderer:** Should the collapsible "Previously ordered items" list use the shared row in a **read-only greyed `variant`** (richer, consistent) or keep the current minimal greyed line? *Recommend read-only shared row* for one renderer to maintain.
- **OD-557-03 — test-id continuity:** Keep Mode B new-item rows emitting `popout-new-item-${idx}` (via a prefix prop) for selector/back-compat, or standardise on `popout-item-row-${idx}` and migrate the two test files? (Decide at Gate 3; affects QA selectors.)

None of these block writing the Implementation Plan; they shape it.

---

## 9. Verification Matrix (seeds QA — Mode A must not regress, Mode B must gain parity)

| # | Check | Method | Expected |
|---|-------|--------|----------|
| V1 | Mode A unchanged: APS badge + Price TBD on ₹1 item | Browser: normal web order w/ ₹1 item | identical to pre-refactor |
| V2 | Mode A unchanged: cancelled row strikethrough + price hidden (BUG-679) | Browser: order w/ cancelled line | identical |
| V3 | Mode A unchanged: full variation options + per-option price (BUG-702) | Browser: item w/ variations | multi-line, each price shown |
| V4 | Mode A unchanged: add-on prices + item note + Comp tag | Browser | all render |
| V5 | **Mode B gains** APS/Price-TBD on ₹1 new item | Browser: web-edit adds ₹1 item | APS badge + Price TBD now show |
| V6 | **Mode B gains** cancelled rendering (BUG-679) | Browser: cancelled new item | strikethrough + price hidden |
| V7 | **Mode B gains** full variation+price (BUG-702) | Browser: new item w/ variations | multi-line options + prices |
| V8 | **Mode B gains** add-on prices + note | Browser | render like Mode A |
| V9 | Per-item cancel (CR-545) works in both modes | Browser: click X in Mode A and Mode B | CancelFoodModal opens both |
| V10 | Per-item KOT checkbox + select-all (CR-547) works both modes; KOT count/payload correct | Browser | unchanged selection behaviour |
| V11 | prevItems read-only (no cancel/KOT) per OD-557-02 | Browser: expand "Previously ordered" | greyed, no action controls |
| V12 | Existing unit tests green | `npx craco test --watchAll=false --testPathPattern="ScanOrderPopOut\|CR547"` | pass (or deliberately migrated) |
| V13 | `// CR-557` markers in both files; webpack 0 new warnings | grep + dev server | present / clean |

---

## 10. Files WILL change / WILL NOT touch

- **WILL change:** `components/dashboard/PopoutItemRow.jsx` (NEW), `components/dashboard/ScanOrderPopOut.jsx`.
- **WILL NOT touch:** `DashboardPage.jsx`, `orderTransform.js`, `reportTransform.js`, `orderService.js`, `aggregatorTransform.js`, `AggregatorOrderPopOut.jsx`, any financial/print/socket file.

---

## 11. Artifacts

| Artifact | Path |
|----------|------|
| Intake (merged) | `change_requests/MERGE_QA_NOV_SPRINT_2026_11_19.md` (CR-557 row) |
| Related IA | `impact/CR-545_IMPACT_ANALYSIS.md`, `impact/CR-552_IMPACT_ANALYSIS.md`, `impact/BUG-702_IMPACT_ANALYSIS.md` |
| Owner decisions (CR-558 etc.) | `control/OWNER_DECISIONS_2026_11_19.md` |
| Impact Analysis (this doc) | `impact/CR-557_IMPACT_ANALYSIS.md` |

---

```
Planning complete: CR-557
Stage: Impact Analysis (Gate 2 only)
Code reality: PARTIAL (rich row exists inline in Mode A; shared component does not exist)
Risk: HIGH (R5 hotspot ScanOrderPopOut.jsx; behaviour-preserving refactor)
Files WILL change: components/dashboard/PopoutItemRow.jsx (NEW), components/dashboard/ScanOrderPopOut.jsx
Files WILL NOT touch: DashboardPage.jsx, orderTransform.js, reportTransform.js, orderService.js, AggregatorOrderPopOut.jsx, any financial/print/socket file
Owner decisions: OD-557-01 (APS in Mode B), OD-557-02 (prevItems renderer), OD-557-03 (test-id continuity) — none block the plan
Dependents (must run AFTER CR-557): CR-558, BUG-679(ModeB), BUG-702(ModeB), CR-545(ModeB)
Docs: impact/CR-557_IMPACT_ANALYSIS.md
Next: Awaiting owner review → Gate 3 (Implementation Plan)
```
