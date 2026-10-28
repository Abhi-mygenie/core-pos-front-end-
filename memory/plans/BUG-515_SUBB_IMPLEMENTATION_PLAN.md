# BUG-515 Sub-B — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-515 (Sub-B)
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Based on:** `impact/BUG-515_IMPACT_ANALYSIS_REVISED.md`
**Risk:** CRITICAL (R6)
**ODs locked:** OD-515-01=a · OD-515-02=c · OD-515-03=a (original, unchanged) · OD-515-04=a (both panels)
**Awaiting:** Owner **Gate 4 GO** before any code change

---

## Scope Lock

**Files WILL change:**
- `src/api/services/frontDeskService.js` — E-5 (joinRowBalances +5 discount fields)
- `src/components/pms/frontdesk/InHousePanel.jsx` — E-6 (renderExpansion merge)
- `src/components/pms/frontdesk/DeparturesPanel.jsx` — E-7 (renderExpansion merge, OD-515-04=a)

**Files will NOT touch:**
- `src/api/services/pmsService.js` (enrichment already correct)
- `src/components/pms/frontdesk/GuestTable.jsx` (RowExpansionStub reads already correct)
- `src/pages/pms/FrontDeskWorkstationPage.jsx` (balances passed correctly)
- `src/api/transforms/frontDeskTransform.js`
- `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5) · any other file

**Total: 3 edits across 3 files, ~22 lines changed/added**

---

## Entry Verification (Implementation agent MUST run before writing any code)

```bash
# E-5 anchor — joinRowBalances single-line output at L144
grep -n "room: g\.roomBalance" /app/frontend/src/api/services/frontDeskService.js
# Must: line 144  exact: room: g.roomBalance ?? null, fnb: g.roomOrdersBalance ?? null, transferred: g.transferredFnbBalance ?? null

# E-6 anchor — InHousePanel renderExpansion at L23
grep -n "renderExpansion={(row)" /app/frontend/src/components/pms/frontdesk/InHousePanel.jsx
# Must: line 23  (arrow function prop on GuestTable)

# E-7 anchor — DeparturesPanel renderExpansion at L42
grep -n "const renderExpansion = (row)" /app/frontend/src/components/pms/frontdesk/DeparturesPanel.jsx
# Must: line 42  (variable assignment)
```

If any anchor differs → **STOP. Return to Planning agent.**

---

## Edit E-5 — `frontDeskService.js` L141-146: Extend `joinRowBalances` output

**File:** `src/api/services/frontDeskService.js`
**Lines:** 141-146

**Current:**
```js
export const joinRowBalances = (inHouseRows, { totalRound = true } = {}) =>
  (inHouseRows ?? []).reduce((m, g) => {
    if (!g?.parentOrderId || g.balance == null) return m;
    m[String(g.parentOrderId)] = { ...roundBalance(g.balance, totalRound), room: g.roomBalance ?? null, fnb: g.roomOrdersBalance ?? null, transferred: g.transferredFnbBalance ?? null };
    return m;
  }, {});
```

**New:**
```js
export const joinRowBalances = (inHouseRows, { totalRound = true } = {}) =>
  (inHouseRows ?? []).reduce((m, g) => {
    if (!g?.parentOrderId || g.balance == null) return m;
    m[String(g.parentOrderId)] = { // BUG-515 Sub-B: +5 discount fields to bridge to snap pipeline
      ...roundBalance(g.balance, totalRound),
      room: g.roomBalance ?? null,
      fnb: g.roomOrdersBalance ?? null,
      transferred: g.transferredFnbBalance ?? null,
      roomDiscountAmount:  g.roomDiscountAmount  ?? null, // BUG-515 Sub-B
      effectiveTotal:      g.effectiveTotal      ?? null, // BUG-515 Sub-B
      effectiveBalanceDue: g.effectiveBalanceDue ?? null, // BUG-515 Sub-B
      effectiveSgst:       g.effectiveSgst       ?? null, // BUG-515 Sub-B
      effectiveCgst:       g.effectiveCgst       ?? null, // BUG-515 Sub-B
    };
    return m;
  }, {});
```

**Safety note:** `?? null` means non-discounted rows (or rows where `getInHouseGuests` didn't set the field) emit `null`, not `undefined`. `RowExpansionStub` guard `(row.roomDiscountAmount ?? 0) > 0` — `null ?? 0 = 0 > 0 = false`. Zero behaviour change on non-discounted rows.

---

## Edit E-6 — `InHousePanel.jsx` L23: Merge discount fields in `renderExpansion`

**File:** `src/components/pms/frontdesk/InHousePanel.jsx`
**Line:** 23

`InHousePanel` already receives `balances` as a prop (line 10 signature). No prop change needed.

**Current:**
```jsx
        renderExpansion={(row) => (expandedKind === 'bill' ? <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : expandedKind === 'extend' ? <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />)} /> {/* CR-385 M4 · M6 · BUG-439 */}
```

**New:**
```jsx
        renderExpansion={(row) => { // BUG-515 Sub-B: bridge discount fields from balance pipeline
          if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          const b = balances?.[String(row.orderId)];
          const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
            ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
                effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
            : row;
          return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
        }} /> {/* CR-385 M4 · M6 · BUG-439 · BUG-515 Sub-B */}
```

**Behavioural notes:**
- `balances === undefined` (still loading): `b = undefined` → `enrichedRow = row` → Section 2 not shown while loading. Correct graceful degradation.
- `balances === null` (folio call failed): same → `enrichedRow = row`. Correct.
- No discount (`roomDiscountAmount = null`): `(null ?? 0) > 0 = false` → `enrichedRow = row`. Correct.
- `FolioCheckoutPanel` / `ExtendStayForm` paths: receive raw `row` unchanged. Correct.

---

## Edit E-7 — `DeparturesPanel.jsx` L42: Merge discount fields in `renderExpansion`

**File:** `src/components/pms/frontdesk/DeparturesPanel.jsx`
**Line:** 42

`DeparturesPanel` also receives `balances` as a prop (line 34 signature). No prop change needed.

**Current:**
```jsx
  const renderExpansion = (row) => (expandedKind === 'bill' ? <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : expandedKind === 'extend' ? <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />); // CR-385 M4 · M6
```

**New:**
```jsx
  const renderExpansion = (row) => { // BUG-515 Sub-B: bridge discount fields from balance pipeline
    if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    const b = balances?.[String(row.orderId)];
    const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
      ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
          effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
      : row;
    return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
  }; // CR-385 M4 · M6 · BUG-515 Sub-B
```

---

## Execution Sequence

```
1. Entry verification (3 grep checks — see above)
2. E-5: frontDeskService.js joinRowBalances
3. Compile check after E-5
4. E-6: InHousePanel.jsx renderExpansion
5. E-7: DeparturesPanel.jsx renderExpansion
6. Final compile check — MUST be 0 new warnings
7. EXIT GATE 5-checkbox pass
8. Write QA handover
```

---

## Verification Matrix (Step 4)

| # | Edit | Verification | Steps | Auto? |
|---|---|---|---|---|
| V-1 | E-5 fields | `grep -n "roomDiscountAmount.*null.*BUG-515" frontDeskService.js` → inside joinRowBalances | YES (grep) |
| V-2 | E-5 existing fields intact | `grep -n "room: g\.roomBalance\|fnb: g\.roomOrders\|transferred:" frontDeskService.js` → still present at joinRowBalances | YES (grep) |
| V-3 | E-6 merge in InHousePanel | `grep -n "enrichedRow\|BUG-515 Sub-B" InHousePanel.jsx` | YES (grep) |
| V-4 | E-7 merge in DeparturesPanel | `grep -n "enrichedRow\|BUG-515 Sub-B" DeparturesPanel.jsx` | YES (grep) |
| V-5 | compile | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" 0 new warnings | YES |
| V-6 | bonk row balance column | Browser: In-House tab → bonk row balance = ₹600 (Sub-A; unchanged but re-verify) | NO (browser) |
| V-7 | bonk expanded — Section 1 | Browser: expand bonk → "BOOKING RATE" header + ₹3,150 / ₹75 / ₹75 / Paid ₹1,500 | NO (browser) |
| V-8 | bonk expanded — Section 2 | Browser: "AFTER CHECK-IN DISCOUNT (−₹1,000)" → Effective ₹2,100 / Balance ₹600 / SGST ₹50 / CGST ₹50 | NO (browser) |
| V-9 | no-discount row | Browser: expand any row with no check-in discount → single section, no labels, no Section 2 | NO (browser) |
| V-10 | balance still loading | balances undefined → Section 2 not shown (graceful) — code-traceable | YES (code trace) |
| V-11 | sort key | Click Balance column header → bonk ranks at ₹600 effective, not ₹1,650 rack | NO (browser) |
| V-12 | Departures expanded | Browser: If any departing guest has check-in discount → same two-section layout | NO (browser) |

---

## Post-Code Registry Checklist (Step 5)

```
- [ ] registry.json: BUG-515 → status: GATE_5A_IMPLEMENTED (Sub-B now resolved), sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-515 row updated — note Sub-B pipeline bridge complete
- [ ] FILE_OWNERSHIP.md: frontDeskService.js · InHousePanel.jsx · DeparturesPanel.jsx — BUG-515 Sub-B, 2026-10-xx
- [ ] Code markers: // BUG-515 Sub-B on every modified line/block (E-5 ×5, E-6 ×6, E-7 ×6)
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## Risk Register

| Risk | Probability | Mitigation |
|---|---|---|
| `() => (...)` → `() => { return ... }` JSX syntax change breaks compile | LOW — valid JSX transformation | V-5 compile check |
| `balances[row.orderId]` key mismatch | NONE — same key as `balanceOf(balances)(r)` already uses in production (DeparturesPanel L24); confirmed working for balance column | V-6 balance column still ₹600 |
| Non-discounted rows see `enrichedRow = row` (identity) — no object spread | CONFIRMED SAFE — `(null ?? 0) > 0 = false` shortcircuits | V-9 no-discount row |
| E-5 adds 5 null fields to balance entries that existing code reads — `balanceOf`, `balanceTitle`, other consumers | SAFE — these read only `.display`, `.raw`, `.roundOff`, `.room`, `.fnb`, `.transferred`; the 5 new fields are ignored by existing consumers | V-2 existing fields intact |
| `FolioCheckoutPanel` / `ExtendStayForm` receive raw (un-enriched) row | BY DESIGN — these have their own data-fetch (getFolio); enrichedRow only applies to RowExpansionStub path | E-6/E-7 guard structure |

---

## QA Handover Seed

| TC | Scenario | Expected |
|---|---|---|
| TC-515B-1 | bonk booking expanded (In-House, discount ₹1,000) | Row balance=₹600; Section 1 "BOOKING RATE": ₹3,150/₹75/₹75/Paid ₹1,500; Section 2 "AFTER CHECK-IN DISCOUNT (−₹1,000)": ₹2,100/₹600/₹50/₹50 |
| TC-515B-2 | No-discount in-house row expanded | Single section, no labels, Balance due = charge.balance_due (rack) — same as before fix |
| TC-515B-3 | Sort by Balance column | bonk ranks by ₹600 (effective), not ₹1,650 (rack) |
| TC-515B-4 | balances still loading (undefined) | Expand during load → Section 2 not shown (single section) — no crash |
| TC-515B-5 | Departures tab — guest with discount (OD-515-04=a) | Same two-section layout as In-House |
| TC-515B-REG-1 | In-House Bill button (expandedKind=bill) | FolioCheckoutPanel opens normally — not affected by E-6 |
| TC-515B-REG-2 | In-House Extend button (expandedKind=extend) | ExtendStayForm opens normally — not affected by E-6 |
| TC-515B-REG-3 | Balance column display | Still shows ₹600 (Sub-A) — E-5 additive change must not regress |
