# BUG-515 — REVISED INVESTIGATION REPORT
# In-House expanded row still shows rack data despite BUG-515 implementation

**Date:** 2026-10-08 (Revision — post-implementation failure analysis)
**Agent:** INVESTIGATION
**Trigger:** Implementation (GATE_5A) confirmed applied; bug persists in production
**Previous investigation:** BUG-515_INTAKE + IMPACT_ANALYSIS + IMPLEMENTATION_PLAN (all 2026-10-08)
**Steps used:** 7/10

---

## 1. Summary

**Root cause (HIGH confidence — fully traced):**
The BUG-515 implementation enriches rows in the **balance pipeline** (`getInHouseGuests → pmsService`),
but `RowExpansionStub` reads its `row` prop from the **snap pipeline** (`getSnapshot → fromReservation`).
These are two completely separate data pipelines that never merge.
The enriched fields (`roomDiscountAmount`, `effectiveTotal`, etc.) written in Step 3 of
`getInHouseGuests` are discarded by `joinRowBalances` and never reach the snap row.
Result: `hasDiscount = (row.roomDiscountAmount ?? 0) > 0` is always `false` → old rack layout shown.

**Classification:** FE_BUG — architectural pipeline mismatch (original fix targeted wrong pipeline for Sub-B)
**Confidence:** HIGH — fully reproduced via code trace, confirmed by two-pipeline separation
**Sub-A status:** FIXED — balance column correctly shows ₹600 (balance pipeline works)
**Sub-B status:** BROKEN — expanded row still shows rack layout (snap pipeline never receives enriched fields)

---

## 2. Context: What The Previous Fix Did (and Why It Was Correct for Sub-A Only)

The original BUG-515 fix made 7 edits across 4 files:

| Edit | File | Purpose | Works? |
|---|---|---|---|
| E-1a/b/c | `pmsService.js` | Import `computeRoomGst`; compute `effectiveGst`; enrich `row.*` | Sub-A ✅ Sub-B ❌ |
| E-1d | `pmsService.js` | `getRowBalances` forwards `roomGstSlabs` | ✅ |
| E-2 | `frontDeskService.js` | `getRowBalances` forwards `roomGstSlabs` | ✅ |
| E-3 | `FrontDeskWorkstationPage.jsx` | Passes `roomGstSlabs` to `useRowBalances` | ✅ |
| E-4a | `GuestTable.jsx` | `RowExpansionStub` reads `row.roomDiscountAmount` | ❌ (field never arrives) |
| E-4b | `GuestTable.jsx` | Sort key uses `effectiveBalanceDue` | ❌ (field never arrives) |

**All V-1 through V-9 verification checks PASS.** The code is present and correct in isolation.
The bug is not a coding error — it is a pipeline routing error in the original design.

---

## 3. The Two Pipelines (Root Cause)

### Pipeline 1 — SNAP (feeds RowExpansionStub's `row`)

```
getSnapshot()
  → snap.reservations.map(fromReservation)          [frontDeskTransform.js:29-66]
      charge = x.charge  ← LR booking snapshot (rack values, no discount)
      orderId = line.order_id
      NO roomDiscountAmount, NO effectiveTotal, NO effectiveSgst, etc.
  → inHouse (FrontDeskWorkstationPage.jsx L141-144)  ← just adds roomStatus
  → InHousePanel(rows=inHouse)
  → GuestTable(rows=visible)
  → renderExpansion(row)
  → RowExpansionStub({ row })  ← THIS row has NO discount fields
```

**`fromReservation` (frontDeskTransform.js L29-66)** builds the snap row shape.
It contains: `id, bookingId, guestName, phone, orderId, charge, checkin, checkout, ...`
`charge` = LR booking snapshot (rack values). `room_discount_amount` is `None` in LR (confirmed by live probe).
**There is no path for `roomDiscountAmount`, `effectiveTotal`, etc. to exist on a snap row.**

### Pipeline 2 — BALANCES (feeds balance column display only)

```
useRowBalances(opts)                                 [FrontDeskWorkstationPage.jsx L31-41]
  → getRowBalances({ roomGstApplicable, roomGstSlabs, totalRound })  [frontDeskService.js L147-148]
      → getInHouseGuests({ roomGstApplicable, roomGstSlabs })        [pmsService.js L39+]
          Step 3 folio calls: ri = folio.room_info
          discountRs = 1000 ← CORRECT (from ri.room_discount_amount)
          effectiveGst computed correctly
          row.roomDiscountAmount = 1000   ← ENRICHED ON INTERNAL ROW ✓
          row.effectiveTotal = 2100       ← ENRICHED ON INTERNAL ROW ✓
          row.effectiveBalanceDue = 600   ← ENRICHED ON INTERNAL ROW ✓
          row.balance = 600               ← ENRICHED ON INTERNAL ROW ✓
      → joinRowBalances(inHouseRows)                [frontDeskService.js L141-146]
          EXTRACTS: g.parentOrderId, g.balance, g.roomBalance, g.roomOrdersBalance, g.transferredFnbBalance
          DISCARDS: g.roomDiscountAmount, g.effectiveGst, g.effectiveSgst, g.effectiveCgst,
                    g.effectiveTotal, g.effectiveBalanceDue    ← ALL LOST HERE
          returns: { [orderId]: { display:600, raw:600, roundOff:0, room, fnb, transferred } }
  → balances[orderId].display = 600   ← ONLY THIS SURVIVES

→ balanceOf(balances)(r) = balances[String(r.orderId)]?.display = 600   ← Balance column ✅
```

### Why Sub-A works but Sub-B doesn't

| | Sub-A (balance column) | Sub-B (expanded row) |
|---|---|---|
| Data source | `balances[orderId].display` (balance pipeline) | `row.charge.*` + `row.roomDiscountAmount` (snap pipeline) |
| After fix | `display = 600` ✅ correctly flows through | `row.roomDiscountAmount = undefined` ❌ never set on snap row |
| Result | ₹600 shown correctly | `hasDiscount = false` → old layout → rack data |

---

## 4. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result |
|---|---|---|---|---|
| H1 | Code was not applied (agent died before writing files) | Run V-1 to V-9 verification checks | Step 1 | ELIMINATED — all 9 checks PASS |
| H2 | `computeRoomGst` throws at runtime → fallback to `chargeGst` | Check guard condition + fallback | Step 2 | PARTIALLY — even if fallback, `discountRs > 0` enrichment block still fires → `hasDiscount` would be true. So H2 eliminated as root cause of "no Section 2" |
| H3 | `row.roomDiscountAmount` set in wrong pipeline — snap row vs balance row are separate objects | Trace both pipelines end-to-end | Steps 3-7 | **CONFIRMED — ROOT CAUSE** |

---

## 5. Data Flow Trace — Break Point

```
BREAK POINT: joinRowBalances (frontDeskService.js L141-146)

(inHouseRows ?? []).reduce((m, g) => {
    if (!g?.parentOrderId || g.balance == null) return m;
    m[String(g.parentOrderId)] = {
        ...roundBalance(g.balance, totalRound),  ← g.balance = 600 ✓
        room: g.roomBalance ?? null,
        fnb: g.roomOrdersBalance ?? null,
        transferred: g.transferredFnbBalance ?? null
    };
    // ← g.roomDiscountAmount, g.effectiveTotal, g.effectiveBalanceDue, etc.
    //    are ALL present on g at this point (pmsService enriched them)
    //    but joinRowBalances never includes them in the output map
    return m;
}, {});

RESULT: balances map contains { display, raw, roundOff, room, fnb, transferred }
        ALL discount enrichment fields → DISCARDED
```

`RowExpansionStub` then evaluates:
```js
const hasDiscount = (row.roomDiscountAmount ?? 0) > 0;
//                   (undefined ?? 0) > 0
//                   0 > 0
//                   false  ← ALWAYS FALSE for snap rows
```
→ Section 1 renders without "Booking rate" label
→ Section 2 (`hasDiscount && ...`) never renders
→ `{!hasDiscount && <Balance due>}` renders with `row.charge?.balance_due = 1650` (rack)

---

## 6. Evidence Artifacts

| Artifact | Location |
|---|---|
| pmsService.js enrichment code | `/app/frontend/src/api/services/pmsService.js L165-173` |
| joinRowBalances (discards enrichment) | `/app/frontend/src/api/services/frontDeskService.js L141-146` |
| fromReservation (snap row shape — no discount fields) | `/app/frontend/src/api/transforms/frontDeskTransform.js L29-66` |
| RowExpansionStub hasDiscount check | `/app/frontend/src/components/pms/frontdesk/GuestTable.jsx L160` |
| InHousePanel renderExpansion — row comes from snap | `/app/frontend/src/components/pms/frontdesk/InHousePanel.jsx L23` |
| FrontDeskWorkstationPage inHouse derivation | `/app/frontend/src/pages/pms/FrontDeskWorkstationPage.jsx L141-144` |
| Previous investigation API evidence | `/app/memory/evidence/INV-BONK-BUG515-2026-10-08/` |

---

## 7. Recommendations

**Classification: FE_FIX** — root cause is in frontend data pipeline routing, no backend change needed

**Planning skip: NO** — Multi-file, CRITICAL risk (R6), requires touching `frontDeskService.js` + `InHousePanel.jsx`

### Recommended Fix Approach (for PLANNING agent)

The fix must bridge the two pipelines. Two options:

#### Option A — Extend `joinRowBalances` + merge into snap rows in `InHousePanel` (RECOMMENDED)

**Part 1 — `frontDeskService.js` `joinRowBalances` L144:**
Also capture discount fields from each enriched row:
```js
m[String(g.parentOrderId)] = {
    ...roundBalance(g.balance, totalRound),
    room: g.roomBalance ?? null,
    fnb: g.roomOrdersBalance ?? null,
    transferred: g.transferredFnbBalance ?? null,
    // NEW:
    roomDiscountAmount:  g.roomDiscountAmount  ?? null,
    effectiveTotal:      g.effectiveTotal      ?? null,
    effectiveBalanceDue: g.effectiveBalanceDue ?? null,
    effectiveSgst:       g.effectiveSgst       ?? null,
    effectiveCgst:       g.effectiveCgst       ?? null,
};
```

**Part 2 — `InHousePanel.jsx` or `GuestTable.jsx` `renderExpansion`:**
Merge discount fields from `balances[row.orderId]` into `row` before passing to `RowExpansionStub`:
```jsx
// In InHousePanel renderExpansion, before <RowExpansionStub>:
const b = balances?.[String(row.orderId)];
const enrichedRow = b?.roomDiscountAmount
    ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
        effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
    : row;
// then: <RowExpansionStub row={enrichedRow} .../>
```

**Files touched:** `frontDeskService.js` (1 edit, ~6 lines) + `InHousePanel.jsx` (1 edit, ~4 lines)
**No change needed** to `pmsService.js`, `GuestTable.jsx`, or `FrontDeskWorkstationPage.jsx`

#### Option B — Pass `balances` prop to `RowExpansionStub` directly

Pass `balances` to `RowExpansionStub` and have it look up discount fields by `row.orderId`.
Requires changing `RowExpansionStub` signature (GuestTable.jsx) + InHousePanel call site.
More invasive but keeps merging inside the component.

---

## 8. Retroactive Candidates

NONE — BUG-515 registry status correctly shows GATE_5A_IMPLEMENTED.
Sub-A is genuinely fixed; only Sub-B remains broken.

---

## 9. BUG-515 Status After This Investigation

| Sub-issue | Status | Evidence |
|---|---|---|
| Sub-A — balance column (₹650→₹600) | **FIXED** | `balances[orderId].display = 600` flows correctly through balance pipeline |
| Sub-B — expanded row rack values | **STILL BROKEN** | `row.roomDiscountAmount` never reaches snap row; `hasDiscount=false` always |

The implementation gate for Sub-B (E-4a, E-4b in GuestTable.jsx) is **correctly written code** applied to a **wrong data source**. The GuestTable.jsx changes are correct as-is — only the data bridging between the two pipelines is missing.

---

## Handover to Next

```
Root cause: joinRowBalances discards all discount enrichment fields (roomDiscountAmount, effectiveTotal,
            effectiveBalanceDue, effectiveSgst, effectiveCgst) written by pmsService Step 3.
            RowExpansionStub receives row from snap pipeline (fromReservation) — these fields
            never exist there. hasDiscount = false always → old rack layout shown.

Confidence: HIGH — fully traced, both pipelines confirmed, no speculation.
Sub-A: FIXED (balance column ₹600 correct).
Sub-B: BROKEN — needs 2 small edits (Option A recommended).

FE fix: YES — 2 files, ~10 lines total.
Backend ask: NO — no backend change needed.
Planning skip eligible: YES (owner must approve) — ≤10 lines, 2 files (frontDeskService.js +
  InHousePanel.jsx), neither is a hotspot (R5), not direct financial formula change.
  Note: CRITICAL risk classification (R6) means owner approval is MANDATORY regardless.

Investigation report: /app/memory/investigations/INV-BUG515-REVISED-2026-10-08.md
```
