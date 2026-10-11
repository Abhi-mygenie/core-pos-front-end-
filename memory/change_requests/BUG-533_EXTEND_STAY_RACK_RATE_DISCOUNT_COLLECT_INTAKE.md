# BUG-533 — Intake

## Extend Stay: Current Bill Shows Rack Rate (Discount Ignored) + Discount and Collect Now Fields Must Be Removed

**Date:** 2026-10-10
**Type:** BUG + DESIGN_CHANGE
**Priority:** P1
**Risk:** HIGH
**Area:** PMS / Front Desk Workstation — InHousePanel + DeparturesPanel + ExtendStayForm
**Sprint:** oct_bug_batch
**Registered by:** INTAKE role (from investigation 2026-10-10)
**Related:** BUG-515 (balance enrichment pipeline — enrichedRow not bridged to extend path), BUG-527/529 (same discount-display theme)

---

## Duplicate Check

**DISTINCT.**
- BUG-515: fixed discount enrichment in balance pipeline + RowExpansionStub. Did NOT bridge to ExtendStayForm.
- BUG-527: fixed CPP dashboard path. Unrelated to extend form.
- BUG-529: fixed folio CPP path. Unrelated to extend form.
- BUG-533: new — Extend Stay form has its own three gaps not covered by any prior bug.

---

## Symptom (from owner screenshot + investigation)

When clicking **Extend** on a discounted in-house booking (bonk r4 — check-in discount ₹1,000):

**"Current bill · from the ledger" panel shows:**
```
Total (incl. GST)   ₹7,035   ← WRONG (rack rate, discount ignored)
Paid so far         ₹2,000   ✓
Balance due         ₹5,035   ← WRONG (should be ₹3,985)
```

**Expected (post-discount):**
```
Total (rack rate)   ~~₹7,035~~   ← crossed out
Check-in discount      −₹1,000
Total (incl. GST)      ₹5,985
─────────────────────────────
Paid so far            ₹2,000
Balance due            ₹3,985
```

**Left panel also shows:**
- "Discount · optional" checkbox/field — **must be removed**
- "Collect Now · optional" checkbox/field — **must be removed**

---

## Owner Decisions — ALL LOCKED (from investigation)

| OD | Decision |
|---|---|
| OD-INV-EXTEND-01 | Remove **Discount** field from Extend form entirely |
| OD-INV-EXTEND-01b | Remove **Collect Now** field from Extend form entirely |
| OD-INV-EXTEND-02 | "Current bill" shows **two rows**: rack rate crossed out → check-in discount line → discounted total. Check-in discount does **NOT stretch to extended nights** (new nights priced at rack ₹6,700/night by server) |
| OD-INV-EXTEND-03 | Fix covers **both** InHousePanel + DeparturesPanel |

---

## Code Reality Check

**NONE — fix not applied.**

```
ExtendStayForm.jsx:L23  const [discOpen, setDiscOpen] = useState(false);     ← PRESENT (to remove)
ExtendStayForm.jsx:L25  const [payOpen, setPayOpen] = useState(false);        ← PRESENT (to remove)
ExtendStayForm.jsx:L100 extend-discount-toggle button + discOpen block        ← PRESENT (to remove)
ExtendStayForm.jsx:L108 extend-collect-toggle button + payOpen block          ← PRESENT (to remove)
InHousePanel.jsx:L25    extend path uses raw row (not enrichedRow)            ← PRESENT (to fix)
DeparturesPanel.jsx:L44 extend path uses raw row (not enrichedRow)            ← PRESENT (to fix)
No BUG-533 marker found anywhere.
```

---

## Root Causes (from investigation)

### Root Cause 1 — "Current bill" shows rack rate (Issue A + C)

`InHousePanel.jsx` and `DeparturesPanel.jsx` `renderExpansion` exit early for `'extend'` **before** building `enrichedRow`:

```js
// BOTH panels — identical:
if (expandedKind === 'extend') return <ExtendStayForm row={row} ...>;  // ← raw row exits here
// enrichedRow is only built BELOW this line — never reached for extend
const b = balances?.[String(row.orderId)];
const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0 ? { ...row, ...b_fields } : row;
return <RowExpansionStub row={enrichedRow} ...>;
```

`ExtendStayForm` reads `const c = row.charge ?? {}` → `c.total_with_gst = 7035` (LR snapshot, pre-discount).

The enriched values ARE available in `balances[row.orderId]` but never bridged:
```
balances[orderId].effectiveBalanceDue = 3985   ← correct balance
balances[orderId].effectiveTotal      = 5985   ← correct total incl. GST
balances[orderId].roomDiscountAmount  = 1000
```

### Root Cause 2 — Discount + Collect Now fields present (Issue B)

Both sections rendered in `ExtendStayForm.jsx` by design from CR-385 M4. Owner confirms: **neither field should appear in Extend Stay** — extension is a date/rate change only; payments and discounts are handled at check-in and checkout.

---

## Evidence

- **Source:** OWNER-REPORTED + AGENT-CONFIRMED (investigation 2026-10-10)
- **Screenshot:** shows ₹7,035 / ₹5,035 on bonk r4 extend form
- **Confidence:** HIGH — code traced to exact lines in all 3 files
- **Test data:** bonk r4 · RID 69 · booking_charge ₹6,700 · discount ₹1,000 · paid ₹2,000 · expected balance ₹3,985

---

## Blast Radius

| File | R5? | Changes |
|------|-----|---------|
| `src/components/pms/frontdesk/InHousePanel.jsx` | NO | ~4 lines — move enrichment block before `extend` early return |
| `src/components/pms/frontdesk/DeparturesPanel.jsx` | NO | ~4 lines — same pattern |
| `src/components/pms/frontdesk/ExtendStayForm.jsx` | NO | ~22 lines removed (discount+collectnow state+UI+payload refs) + ~5 lines changed (two-row display in Current bill) |

**Estimated scope:** MEDIUM (3 files, ~31 lines total, 0 R5 files)
**Hotspot files:** NO
**Fast Lane eligible:** NO (3 files)

---

## Open Questions

None — all ODs locked from investigation session.

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: PENDING
- Gate 3: PENDING
- Gate 4 GO: NOT given

---

## Next

Planning agent → Gate 2 Impact Analysis → Gate 3 Implementation Plan.
