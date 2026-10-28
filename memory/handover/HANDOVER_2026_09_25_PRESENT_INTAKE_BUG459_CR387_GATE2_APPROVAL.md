# HANDOVER — 2026-09-25 — PRESENT INTAKE BUG-459 + CR-387 TO OWNER → OBTAIN "GATE 2 GO"

**For:** next agent (Role: INTAKE close-out → PLANNING entry). **Owner drives; nothing is implemented; no code may be written.**
**Companion docs:** `handover/SESSION_HANDOVER_2026_09_25_INV_UNIT_CONTRACT_INTAKE_BUG459_CR387.md` (what was done) · this file (what to say next).

---

## 0. Your session in one line
Walk the owner through the two registered items in plain English, confirm scope (what is IN / OUT), collect answers to the open owner decisions (ODs), then get the verbatim word **"Gate 2 GO"** (for BUG-459 alone, or BUG-459 + CR-387 together). Then hand to PLANNING (Gate 2 Impact Analysis). Do **not** start Gate 2 without the word.

Boot (5 min): read `control/AGENT_PROMPT_ALPHA.md` STEP -1 → pick INTAKE (close-out) / PLANNING (only after GO). Read the two intake docs:
- `change_requests/BUG-459_STOCK_AUDIT_PHYSICAL_QTY_UNIT_MISMATCH_INFLATION_INTAKE.md`
- `change_requests/CR-387_SMART_PURCHASE_UNIT_BREAKDOWN_DISPLAY_UNIT_PAYLOAD_INTAKE.md`
Skim `evidence/INV-UNIT-CONTRACT/probes_2026_09_25/PROBE_REPORT.md` §4 (contract conclusions) — that is the proof the owner may ask about.

---

## 1. Plain-English script for the owner (present in this order)

### 1a. The problem we found (BUG-459 — P0)
> "When staff do a Stock Audit on an item that has a conversion (e.g. 1 pkt = 500 gm), the screen shows the system quantity in **packets** (9.4 pkt), but the Physical Qty box hints the **gram** number (4700). Staff type 4700. The app sends that 4700 to the backend **labelled 'pkt'**. The backend trusts the label and stores 4700 packets = 2,350,000 gm. Every audit save on such an item multiplies stock by the conversion factor. This is not theoretical — on preprod ANGARA GREAVY was sitting at 2.3 million gm (we repaired it to 9.4 pkt during the probe) and UAT BIRYANI MASALA is still at 250,000 gm."

> "The drift badge has the same confusion: it subtracts grams but prints 'pkt', so a 100 gm difference shows as '-100.00 pkt'."

> "We proved the backend behaviour live (owner-approved probe): the backend converts whatever number we send using the unit we send. Sending the display unit + display quantity works perfectly (9.5 pkt → 7600 gm). Sending the base unit (gm) is *accepted* but has a side effect — it flips the item's display unit to kg — so the fix must send the **display unit**."

### 1b. What the fix will look like (BUG-459 scope — IN)
1. Physical Qty becomes a **two-box converter**: `[ 15 ] tin  [ 305 ] gm` — whole display units + base-unit remainder; unit labels locked.
2. The app sends `unit = display unit`, `physical_qty = major + minor ÷ factor` (backend-accepted).
3. Drift preview computed correctly (in base units) and shown as a breakdown, e.g. **"-1 pkt 200 gm"**, never a gram number with a pkt label.
4. The API already returns a ready breakdown (`display_qty_parts`) — the app will start reading it.
5. New small shared helper (`utils/quantityBreakdown.js`) used by BUG-459 and CR-387.

**OUT of BUG-459 (say it explicitly):** Smart Purchase screen (that is CR-387) · sub-recipe stock panel (no conversion items on RID 835; unchanged) · any backend change · the data repair of #20329 (separate owner action, OD-459-01).

### 1c. The companion change (CR-387 — P1)
> "The Stock Update (Smart Purchase) page shows On-Hand as '8 bottle 319 ml' but Projected Need / Gap / Suggested / Qty to Buy in raw ml, some without a unit. You asked for the same breakdown everywhere and a two-box Qty-to-Buy, and for the purchase to be sent in the display unit. We verified the backend accepts that (1 pkt → +800 gm; 1.5 pkt → +1200 gm). Today's Smart Purchase does **not** corrupt data — it is a display/consistency problem plus your requested contract change."

**IN:** breakdown on all qty columns (top list; bottom table = OD-387-03) · two-box Qty to Buy · payload `Unit: display_unit` + display qty · CR-348 rate divisor re-based (OD-387-02).
**OUT:** vendor ranking, payment split UI, manual Purchase Entry panel (already sends the purchase unit), backend.

### 1d. Why two items, and the order
BUG-459 is P0 (data corruption) and must not wait for a UX redesign; CR-387 depends on the helper defined by BUG-459. Recommend: **Gate 2 for both in one Impact Analysis session, BUG-459 first.**

### 1e. Sequencing warning to state
BUG-455 (display_qty_text, Gate 5A — QA still pending) already edited the same four files (`StockAuditPanel.jsx`, `inventoryTransform.js`, `purchasePlanner.js`, `AutoShoppingList.jsx`). Planning will use post-BUG-455 line numbers and must not regress BUG-455's cells. Ask the owner whether BUG-455 QA (Gate 5b) should close first or run in parallel.

---

## 2. Owner decisions to collect (ask as lettered options; record answers in the intake docs + registry `owner_decisions`)

| ID | Question to owner | Recommendation |
|---|---|---|
| **OD-459-01** | UAT BIRYANI MASALA #20329 is at 250,000 gm (500 pkt). What is the true on-hand? (We will recount it via `unit:"pkt"` — a data action, not code.) | Ask for the number; if unknown, leave and flag on Stock Audit screen |
| OD-459-02 | Items without conversion: single box, send `item.unit`? | YES |
| OD-459-03 | Minor box ≥ factor (e.g. 1700 gm at 1600/tin): (a) auto-normalise into major on blur · (b) block with error | (a) |
| OD-459-04 | Drift render: sign + breakdown, 0 → "No drift", minor rounded 0 dp for gm/ml/piece | YES |
| OD-459-05 | Post-save toast echoes backend `wastage` ("Loss 0.75 pkt")? | YES |
| **OD-387-01** | Payload basis: (a) keep base unit (works, zero contract change) · (b) display unit + display qty (owner's stated preference, backend-accepted) | (b) — owner already said "send both in display unit and quantity" on 2026-09-25; get it locked verbatim |
| OD-387-02 | After (b): `rate` = price per **display unit** (CR-348 divisor re-based) | YES |
| OD-387-03 | Apply to bottom "all ingredients" table too | YES |
| OD-387-04 | GroupedVendorPreview quantities in breakdown | YES (small) |
| OD-387-05 | Minor remainder rounding: 0 dp gm/ml/piece, 2 dp otherwise | YES |

If the owner defers any OD, write "DEFERRED to Gate 2" — Planning can carry open ODs into the Impact Analysis.

---

## 3. Approval you must obtain (verbatim)
- **"Gate 2 GO"** (or "Gate 2 GO for BUG-459 only"). Anything else = not approved. Quote the owner's exact words in the registry `status_history` and in the next handover.
- If the owner also says "planning skip" for BUG-459: **refuse** — Risk CRITICAL / P0 / API contract → full gate flow per Owner Approval Matrix. Reply with the `OWNER APPROVAL REQUIRED` block.

---

## 4. After "Gate 2 GO" — what PLANNING does (do NOT start before the word)
1. Registry: `BUG-459.status` → `GATE_2_IMPACT_ANALYSIS`, add `status_history` event with owner's words; same for CR-387 if included.
2. Write `impact/BUG-459_IMPACT_ANALYSIS.md` (then `impact/CR-387_IMPACT_ANALYSIS.md`): file/line map on **current HEAD** (re-grep; BUG-455 moved lines), helper API shape (`toBreakdown`, `fromBreakdown`), payload before/after, R11 live-contract reference (PROBE_REPORT §4 — no new probe needed unless the contract is doubted), regression list (BUG-379 422 fix, BUG-223 badge, BUG-455 text cell, BUG-321 sub-recipe path, CR-348 rate, CR-100 splits).
3. Update BUG_TRACKER / CR_REGISTRY / CONTROL_DASHBOARD top lines, dashboard JSON (see §6), handover.

---

## 5. Facts you can quote (all live-verified 2026-09-25, preprod RID 835)
- `add-stock` recount body: `{quantity:0, unit, physicalqty_master:true, physical_qty, waste_reason, wastage_reason_id, notes}` → 200, response includes `wastage {type, current_stock, physical_count, difference, unit}`.
- Accepted `unit`: purchase unit or consumption unit, case-insensitive; `""` → 422 "unit required"; `"xyz"` → 422 `PURCHASE_UNIT_NOT_COMPATIBLE`; without `physicalqty_master` → 422 vendor_id required.
- `9.75 pkt` (=current) → no-op; `9 pkt` → 7200 gm; `9.5 pkt` → 7600 gm; `gm 7800` → cal 7800 but `display_unit` → kg, `quantity` → 7.800 (unsafe).
- `add-purchase` `Unit:"pkt", quantity:1` → +800 gm; `Unit:"gm", quantity:100` → +100 gm; `1.5 pkt` → +1200 gm; `"xyz"` → 422.
- `stock-inventory` rows carry `display_qty_text` ("9 pkt 600 gm") and `display_qty_parts {major:9, major_unit:"pkt", minor:600, minor_unit:"gm", sign:""}`.
- Residual probe artefacts on preprod: 4 purchase rows ₹103.50 (ids 7965/7966/7967/7969); recount rows PUR-835-20260925-7959…7971; #20326 restored to 7800 gm; #20320 repaired to 4700 gm.

---

## 6. Housekeeping the next agent should know
- Credentials: alias `QA_INV` in gitignored `memory/test_credentials.md` (never print). Login `POST /api/v1/auth/vendoremployee/common-login`.
- `frontend/scripts/gen_dashboard_sync.py` still writes to the pre-CR-372 path `frontend/public/__dev/data` (does not exist). Run a copy with `ROOT="/app"` and output `memory/dev-dashboard/data/` — or register a P3 to fix the script. Script not modified.
- `create_intake.py` (INTAKE_WORKFLOW §6) does not exist — intake docs are written manually in the BUG-455/456/457 format.
- Static proposal mockups from the investigation: `frontend/public/inv-unit-proposal-mockup.html`, `inv-real-data-proposal.html`, `inv-final-proposal.html`, `inv-proposal-inv2-inv3.html` — illustrative values only; useful when explaining the two-box UX to the owner. Screenshot tool cannot scroll/anchor long pages (use them one at a time).
- Do not invoke automated browser/testing agents in INTAKE/PLANNING; no code edits until Gate 4 GO.

---

## 7. Final response format for your session (from AGENT_PROMPT_ALPHA)
```
Intake presented: BUG-459 (P0/CRITICAL) + CR-387 (P1/HIGH)
Owner decisions locked: <list IDs + answers> · deferred: <list>
Gate 2: <"GO" verbatim date | NOT APPROVED — reason>
Next: PLANNING Impact Analysis BUG-459 → CR-387 | waiting on owner
```
