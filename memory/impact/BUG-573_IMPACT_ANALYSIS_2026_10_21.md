# BUG-573 — Impact Analysis (Gate 2)
## Order card shows variation group name but not the selected option + order-level notes not returned by backend

**ID:** BUG-573
**Date:** 2026-10-21
**Code Reality:** PARTIAL — variant parser exists at OrderCard.jsx:699-711 but missing `values[]` array support
**Conflict Pre-Check:** CLEAN — no open item touches OrderCard variant parsing
**Risk:** LOW (Gap 1 FE) + BACKEND_BLOCKED (Gap 2)

---

## 1. Gap 1 — Variation Selected Option Not Shown (FE BUG)

### The Facts (from live API probe)

Backend sends variation in this shape (confirmed from Palm House order data):

```json
"variation": [
    {
        "name": "Choice Of:",
        "type": "single",
        "values": [
            { "label": "Poached", "optionPrice": "25" }
        ]
    }
]
```

The selected option is inside `values[0].label` — a nested array.

### The Gap

`OrderCard.jsx:708` looks for flat fields only:
```js
const value = v.value || v.option_label || v.label || v.selected_option || '';
```

Never checks `v.values[]`. Result: shows "Choice Of Dip" instead of "Choice Of Dip: Tomato Relish".

### Fix
Add `v.values` array check before flat-field fallback (~4 lines in OrderCard.jsx:699-711).

### Files
- **WILL change:** `OrderCard.jsx` (1 file, ~4 lines)
- **WILL NOT touch:** orderTransform.js, OrderEntry.jsx, any R5 hotspot

---

## 2. Gap 2 — Order-Level Notes Not Returned by Backend (BACKEND BUG)

### The Facts (confirmed from probes)

**Outbound (place-order payload):**
```json
"order_note": "Birthday, Anniversary, VIP Guest, ORDER 123 TEST"   ← FE sends correctly ✅
```

**Inbound (employee-orders-list response for order #018656):**
```json
"order_note": ""                         ← Backend returns empty ❌
"food_level_notes": "No Garlic, Less Spicy"  ← Notes appear at item level instead
```

**Inbound (employee-order-details response for order #018656):**
```json
"order_note": ""                         ← Also empty ❌
"food_level_notes": "No Garlic, Less Spicy"  ← Same — item level
```

### The Chain

| Step | Working? | Evidence |
|------|----------|---------|
| OrderNotesModal saves notes | ✅ | User enters notes, state populated |
| OrderEntry passes to placeOrder | ✅ | `orderNotes` in useCallback deps |
| Transform builds `order_note` | ✅ | `orderNotes.map(n => n.label).join(', ')` |
| Payload sent to backend | ✅ | `"order_note": "Birthday, Anniversary..."` confirmed in network tab |
| Backend stores `order_note` | ❌ | Both `employee-orders-list` and `employee-order-details` return `order_note: ""` |
| Backend puts notes on items instead | ❌ | `food_level_notes: "No Garlic, Less Spicy"` on item level |
| OrderCard renders `order.orderNote` | ✅ | L636-647 would render if value existed |

### Conclusion
**Backend receives `order_note` but does not store/return it.** Instead, notes appear to be pushed down to `food_level_notes` on the item. FE chain is complete and correct — no FE fix needed for this gap.

### Action Required
Backend brief needed — backend must store `order_note` at the order level and return it in `employee-orders-list` + `employee-order-details` responses.

---

## 3. Summary

| # | Issue | Type | Fix By | Status |
|---|-------|------|--------|--------|
| Gap 1 | Variation shows group name instead of selected option | FE bug | FE — add `v.values[].label` mapping | Ready for Gate 3 |
| Gap 2 | Order-level notes sent but not stored/returned | Backend bug | Backend — store + return `order_note` | BACKEND_BLOCKED — brief needed |

---

## 4. Owner Decisions

**None required.** Gap 1 display format follows existing pattern. Gap 2 is a backend storage issue.
