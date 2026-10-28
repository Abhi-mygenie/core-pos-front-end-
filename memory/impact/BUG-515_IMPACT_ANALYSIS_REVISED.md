# BUG-515 Sub-B — IMPACT ANALYSIS (Gate 2 REVISED)
# Expanded row still shows rack data — pipeline bridging gap

**ID:** BUG-515 (Sub-B)
**Date:** 2026-10-08 (Revised — post-implementation failure analysis)
**Agent:** PLANNING (Gate 2)
**Triggered by:** INV-BUG515-REVISED-2026-10-08 (INVESTIGATION role confirmed root cause with HIGH confidence)
**Code Reality:** PARTIAL — `GuestTable.jsx` E-4a/E-4b are correctly written and present; the pipeline bridging between balance rows and snap rows is ABSENT (not in code anywhere)
**Risk:** CRITICAL (R6 — financial display; Balance due shown to staff at check-out)
**ODs locked from original IA:** OD-515-01=a · OD-515-02=c · OD-515-03=a (all remain valid — no change needed to those edits)
**New OD this session:** OD-515-04 (scope: InHousePanel only vs also DeparturesPanel — see §7)

---

## Conflict Pre-Check

| File | Last modifier | Last date | Open items (excl. BUG-515) | Conflict? |
|---|---|---|---|---|
| `frontDeskService.js` | BUG-515 L147-148 (2026-10-08) | 2026-10-08 | BUG-514 L104 (same file, different line) | NONE — BUG-514 edits L104; this edit is at L144. Parallel-safe. |
| `InHousePanel.jsx` | BUG-439 L20 (2026-09-21) | 2026-09-21 | None | NONE |
| `DeparturesPanel.jsx` (scope OD) | BUG-439 L42 (2026-09-21) | 2026-09-21 | None | NONE — parallel-safe if added to scope (OD-515-04) |

---

## 1. Problem Statement

BUG-515 Sub-B implementation (E-4a `RowExpansionStub` rewrite) is correctly in code but has zero effect because the five enriched fields it reads (`row.roomDiscountAmount`, `row.effectiveTotal`, `row.effectiveBalanceDue`, `row.effectiveSgst`, `row.effectiveCgst`) are NEVER present on the snap rows that `RowExpansionStub` receives.

The root cause has two components:

**Break Point 1 — `joinRowBalances` drops the enrichment (frontDeskService.js L144):**
```js
// CURRENT — only 4 fields extracted from each enriched row:
m[String(g.parentOrderId)] = {
    ...roundBalance(g.balance, totalRound),   // display, raw, roundOff
    room: g.roomBalance ?? null,
    fnb: g.roomOrdersBalance ?? null,
    transferred: g.transferredFnbBalance ?? null
    // g.roomDiscountAmount, g.effectiveTotal, g.effectiveBalanceDue,
    // g.effectiveSgst, g.effectiveCgst  ← ALL DROPPED HERE
};
```

`getInHouseGuests` correctly writes these fields onto its internal row objects. `joinRowBalances` simply never reads them out.

**Break Point 2 — `InHousePanel` passes the raw snap row to `RowExpansionStub` (InHousePanel.jsx L23):**
```jsx
// CURRENT — snap row passed directly; balances lookup not merged:
renderExpansion={(row) => (
  expandedKind === 'bill'   ? <FolioCheckoutPanel row={row} .../> :
  expandedKind === 'extend' ? <ExtendStayForm row={row} .../> :
  <RowExpansionStub row={row} .../>   // ← row is snap row; has no discount fields
)}
```

`InHousePanel` already receives `balances` as a prop (L10), but the `renderExpansion` callback never uses it to merge discount data onto the row before handing it to `RowExpansionStub`.

**Result:** `hasDiscount = (row.roomDiscountAmount ?? 0) > 0` → `(undefined ?? 0) > 0` → `false` always → Section 2 never renders → rack data shown.

---

## 2. Data Flow Trace

```
CURRENT (broken):

pmsService.getInHouseGuests()
  → row.roomDiscountAmount = 1000   ✓ enriched
  → row.effectiveTotal     = 2100   ✓ enriched
  → ...
  → joinRowBalances()               ← BREAK POINT 1
      extracts only: balance/room/fnb/transferred
      DROPS: roomDiscountAmount, effectiveTotal, effectiveBalanceDue, effectiveSgst, effectiveCgst
  → balances[orderId] = { display:600, raw:600, roundOff:0, room, fnb, transferred }
                                    ← no discount fields survive

snap.reservations.map(fromReservation) → inHouse[row]
  row.charge = LR booking snapshot (rack, no discount)
  row.roomDiscountAmount = undefined ← never set

InHousePanel.renderExpansion(row)  ← snap row → RowExpansionStub
  hasDiscount = (undefined ?? 0) > 0 = false
  → old single-section layout with rack values
  
FIXED (target):

joinRowBalances()                  ← FIX 1: also capture discount fields
  → balances[orderId] = { display:600, ..., roomDiscountAmount:1000,
      effectiveTotal:2100, effectiveBalanceDue:600, effectiveSgst:50, effectiveCgst:50 }

InHousePanel.renderExpansion(row)  ← FIX 2: merge before RowExpansionStub
  const b = balances?.[String(row.orderId)];
  const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
      ? { ...row, roomDiscountAmount: b.roomDiscountAmount,
          effectiveTotal: b.effectiveTotal, effectiveBalanceDue: b.effectiveBalanceDue,
          effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
      : row;
  → RowExpansionStub({ row: enrichedRow })
  hasDiscount = (1000 ?? 0) > 0 = true ✓
  → Section 1 "BOOKING RATE" shows rack values
  → Section 2 "AFTER CHECK-IN DISCOUNT (−₹1,000)" shows effective values ✓
```

---

## 3. Affected Files and Edit Description

| Edit | File | Lines affected | Change | Sub-issue |
|---|---|---|---|---|
| E-5 | `src/api/services/frontDeskService.js` | L144 (expand to ~6 lines) | `joinRowBalances`: add 5 discount fields to output map alongside existing `room/fnb/transferred` | B |
| E-6 | `src/components/pms/frontdesk/InHousePanel.jsx` | L23 (expand renderExpansion by ~8 lines) | `renderExpansion` in `RowExpansionStub` path: look up `balances[row.orderId]`, merge discount fields onto row when present | B |
| E-7 (OD-515-04) | `src/components/pms/frontdesk/DeparturesPanel.jsx` | L42 (expand renderExpansion by ~8 lines) | Same pattern as E-6 — owner must approve scope (see §7) | B (scope OD) |

**Files WILL change (confirmed):** `frontDeskService.js` · `InHousePanel.jsx`
**Files will NOT touch:** `pmsService.js` (enrichment correct — no change needed) · `GuestTable.jsx` (RowExpansionStub reads correct — no change needed) · `FrontDeskWorkstationPage.jsx` (balances passed correctly — no change needed) · `frontDeskTransform.js` · any R5 hotspot · `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5)

---

## 4. Precise Edit Specifications

### E-5 — `frontDeskService.js` L141-146: Extend `joinRowBalances` output

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

**New (add 5 discount fields — additive only, no existing field changed):**
```js
export const joinRowBalances = (inHouseRows, { totalRound = true } = {}) =>
  (inHouseRows ?? []).reduce((m, g) => {
    if (!g?.parentOrderId || g.balance == null) return m;
    m[String(g.parentOrderId)] = {
      ...roundBalance(g.balance, totalRound),
      room: g.roomBalance ?? null,
      fnb: g.roomOrdersBalance ?? null,
      transferred: g.transferredFnbBalance ?? null,
      // BUG-515 Sub-B: bridge discount enrichment fields to snap pipeline
      roomDiscountAmount:  g.roomDiscountAmount  ?? null,
      effectiveTotal:      g.effectiveTotal      ?? null,
      effectiveBalanceDue: g.effectiveBalanceDue ?? null,
      effectiveSgst:       g.effectiveSgst       ?? null,
      effectiveCgst:       g.effectiveCgst       ?? null,
    };
    return m;
  }, {});
```

**Safety:** `?? null` guards mean: if `getInHouseGuests` didn't set them (no discount, or roomGstSlabs absent), the fields are `null` not `undefined`. `RowExpansionStub` checks `(row.roomDiscountAmount ?? 0) > 0` — `null` correctly resolves to `false`. **Zero risk to non-discounted rows.**

---

### E-6 — `InHousePanel.jsx` L23: Merge discount fields before `RowExpansionStub`

**File:** `src/components/pms/frontdesk/InHousePanel.jsx`
**Lines:** 23 (renderExpansion lambda)

`InHousePanel` already receives `balances` as a prop (L10). No new prop needed.

**Current:**
```jsx
renderExpansion={(row) => (expandedKind === 'bill' ? <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : expandedKind === 'extend' ? <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />)} />
```

**New (same logic, RowExpansionStub path merges discount fields from balances):**
```jsx
renderExpansion={(row) => {
  if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
  if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
  // BUG-515 Sub-B: merge discount fields from balance pipeline into snap row
  const b = balances?.[String(row.orderId)];
  const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
    ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
        effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
    : row;
  return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
}} />
```

**Notes:**
- Arrow function body converts `() => (...)` to `() => { ... }` — valid JSX; compile-safe
- `balances === undefined` (still loading): `b = undefined`, `b?.roomDiscountAmount = undefined`, `0 > 0 = false` → passes raw row. Loading state is graceful.
- `balances === null` (folio unavailable): same as undefined path → raw row passed, Section 2 not shown. Graceful degradation.
- `row.orderId` is the same key used by `balanceOf(balances)(r)` (DeparturesPanel L24), confirmed matching `g.parentOrderId` (pmsService joinRowBalances key). No new key lookup introduced.
- `FolioCheckoutPanel` and `ExtendStayForm` paths: UNTOUCHED. These receive the raw snap `row` which is correct for those forms (they have their own data-fetching).

---

### E-7 — `DeparturesPanel.jsx` L42 (OD-515-04 scope decision required)

**Same pattern as E-6** — `DeparturesPanel` also receives `balances` prop and also passes a raw snap row to `RowExpansionStub` for the `detail` expansion kind. If a guest with a check-in discount appears in the Departures tab (same-day departure), their expanded row would also show rack data.

**Identical fix pattern:**
```jsx
const renderExpansion = (row) => {
  if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} .../>;
  if (expandedKind === 'extend') return <ExtendStayForm row={row} .../>;
  // BUG-515 Sub-B
  const b = balances?.[String(row.orderId)];
  const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
    ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
        effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
    : row;
  return <RowExpansionStub row={enrichedRow} .../>;
};
```

**Awaiting OD-515-04.**

---

## 5. Risk Classification

- **Risk: CRITICAL** (R6 — financial display; Balance due shown to staff directly affects how much to collect)
- **Hotspot files touched:** NONE (none of the 2–3 files are in the R5 list)
- **Financial formula change:** NONE — no amounts computed here; only routing already-computed values to the right place
- **Planning skip:** NO — CRITICAL risk + R6 requires full gate cycle even though the edit is small
- **Fast Lane:** NO — owner approval still mandatory for CRITICAL risk per approval matrix

---

## 6. Downstream Consumers

| Consumer | Impact |
|---|---|
| `GuestTable.jsx` `RowExpansionStub` | Reads `row.roomDiscountAmount` and display fields — UNCHANGED. Will now receive these fields correctly. |
| `GuestTable.jsx` `sortRows case 'amount'` | Reads `r.effectiveBalanceDue` (E-4b, already implemented). Will now receive this field correctly when discount > 0. Sort column will work as intended for the first time. |
| `balanceOf(balances)(r)` in `DeparturesPanel.jsx` / `InHousePanel.jsx` | Reads `balances[orderId].display` only — UNCHANGED. The 5 new fields are additive; `display` still present. |
| No-discount rows (`roomDiscountAmount = null`) | `enrichedRow = row` (identity) — byte-identical behaviour to today. |
| `balances === undefined` (still loading) | `b = undefined` → raw row passed → `hasDiscount = false` → Section 1 only shown while balances load. Same as today, correct graceful degradation. |

---

## 7. Open Owner Decision

### OD-515-04 — Scope: InHousePanel only, or also DeparturesPanel?

The `DeparturesPanel` has an identical `RowExpansionStub` call for the `detail` kind. A guest with a check-in discount who is in the Departures tab (checking out today) would show the same rack-only expansion unless E-7 is included.

| Option | Scope | Files changed | Lines |
|---|---|---|---|
| **Option a (recommended):** | Both InHousePanel + DeparturesPanel | 3 files | ~20 lines total |
| Option b: | InHousePanel only | 2 files | ~14 lines total |

**Recommended: Option a** — parity. Both tabs show the same guest data; discrepancy between tabs would be confusing. The extra edit is identical pattern.

---

## 8. Verification Matrix (seeds Gate 3 plan)

| # | Edit | How to verify | Automated? |
|---|---|---|---|
| V-E5-1 | E-5 discount fields in output | `grep -n "roomDiscountAmount\|effectiveTotal\|effectiveBalanceDue" frontDeskService.js` → in `joinRowBalances` | YES (grep) |
| V-E5-2 | existing fields unchanged | `grep -n "room:\|fnb:\|transferred:" frontDeskService.js` → still present | YES (grep) |
| V-E6-1 | E-6 merge in InHousePanel | `grep -n "enrichedRow\|BUG-515" InHousePanel.jsx` | YES (grep) |
| V-E6-2 | balances loading path | balances=undefined: `b?.roomDiscountAmount` = undefined → `0 > 0 = false` → raw row | YES (unit test) |
| V-E6-3 | non-discount path | row with no discount: `enrichedRow === row` (identity) | YES (unit test) |
| V-E7 | E-7 (if OD-515-04=a) | `grep -n "enrichedRow\|BUG-515" DeparturesPanel.jsx` | YES (grep) |
| V-compile | webpack 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" | YES |
| V-browser-1 | bonk row (discount=₹1,000) expanded | Section 1 "BOOKING RATE": ₹3,150 / ₹75 / ₹75. Section 2 "AFTER CHECK-IN DISCOUNT (−₹1,000)": Effective ₹2,100, Balance ₹600, SGST ₹50, CGST ₹50 | NO (browser) |
| V-browser-2 | no-discount row expanded | Single section, no "Booking rate" label, no Section 2 — same as before fix | NO (browser) |
| V-browser-3 | balance column | Still shows ₹600 (Sub-A unaffected) | NO (browser) |
| V-browser-4 | sort key | Click Balance header → bonk ranks at ₹600 not ₹1,650 (E-4b now receives data) | NO (browser) |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-515 → status: GATE_5A_IMPLEMENTED (update note to reflect Sub-B now fixed), sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-515 row updated
- [ ] FILE_OWNERSHIP.md: frontDeskService.js · InHousePanel.jsx (+ DeparturesPanel.jsx if OD-515-04=a) listed — BUG-515, 2026-10-08
- [ ] Code markers: // BUG-515 Sub-B on every modified line/block
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## 10. What Was Already Correct (do NOT re-implement)

These edits from the original BUG-515 implementation are correctly in code and MUST NOT be touched:

| Edit | File | Status |
|---|---|---|
| E-1a import computeRoomGst | `pmsService.js` | ✅ Correct — keep |
| E-1b +roomGstSlabs signature | `pmsService.js` | ✅ Correct — keep |
| E-1c formula + enrichment | `pmsService.js` | ✅ Correct — enriches balance-pipeline rows correctly |
| E-2 getRowBalances +roomGstSlabs | `frontDeskService.js` L147-148 | ✅ Correct — keep |
| E-3 FrontDeskWorkstationPage | `FrontDeskWorkstationPage.jsx` | ✅ Correct — keep |
| E-4a RowExpansionStub rewrite | `GuestTable.jsx` | ✅ Correct — keep (will work once data bridges correctly) |
| E-4b sort key | `GuestTable.jsx` | ✅ Correct — keep (will work once data bridges correctly) |

---

**Gate 2 Impact Analysis complete. Gate 3 NOT started.**
**Awaiting owner answer on OD-515-04 → "Gate 3 GO"**
