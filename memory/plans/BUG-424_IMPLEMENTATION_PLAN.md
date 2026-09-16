# BUG-424 — Impact Analysis + Implementation Plan: Folio Room Orders Section

**Code Reality:** NONE — no room-native orders section in GuestFolioPage. folioTransform maps `raw.associated_order_list` (transferred only). `raw.orderDetails[]` (room-native items) not mapped.
**Conflict Pre-Check:**
- CR-364 (IMPLEMENTED, 2026-09-14): last touched `GuestFolioPage.jsx` and `folioTransform.js`. CLOSED. No conflict — additive.
- BUG-423 (Gate 3): touches `GuestFolioPage.jsx` line 100 only (balance formula). This plan adds a new Card section further down (~L238). Parallel-safe — different lines.
**Risk:** MEDIUM — new display section + transform change. No financial write. No API change.
**Fast Lane:** NOT eligible (new section, 2 files).

---

## Owner Decisions

| ID | Decision |
|----|----------|
| OD-424-01 | Row click → expand inline (no navigation) ✅ confirmed |
| OD-424-02 | GST shows per item if configured; ₹0.00 if not ✅ confirmed |

---

## Gate 2 — Impact Analysis

### Data flow trace

```
GuestFolioPage → getGuestFolio(orderId) → api.post(SINGLE_ORDER_NEW, {order_id})
  → raw (order detail object)
  → folioTransform.fromAPI(raw)
  → folio.associatedOrders  ← ONLY transferred orders (raw.associated_order_list)
  → raw.orderDetails[]       ← room-native food items — NOT MAPPED ← GAP
```

### raw.orderDetails[] item shape (confirmed from orderTransform.js L283–294)

```js
{
  food_details: {
    name: 'jeera rice',        // item name
    tax: 5,                    // GST percentage (0 if no GST)
    tax_type: 'GST',
  },
  quantity: 1,
  unit_price: 100,             // per-unit price
  price: 107,                  // total (unit_price × qty)
  created_at: '2026-09-16 11:30:00',
  food_status: 'placed',       // 'cancelled' for cancelled items
}
```

### Check-in marker detection (same logic as orderTransform L284)
```js
(d.food_details?.name || '').toLowerCase() === 'check in'
```

### Affected files

| File | Change | Risk |
|------|--------|------|
| `src/api/transforms/folioTransform.js` | Add `roomOrders` mapping from `raw.orderDetails[]` | LOW (new field, no change to existing fields) |
| `src/pages/pms/GuestFolioPage.jsx` | Add Room Orders Card section on LHS (~L238, after F&B section) | MEDIUM (new JSX, uses `folio.roomOrders`) |

### Downstream consumers affected
None — `roomOrders` is a new field. Existing `associatedOrders` unchanged.

---

## Gate 3 — Implementation Plan

### Edit E1 — Add `roomOrders` mapping in folioTransform.js

| Field | Value |
|-------|-------|
| File | `src/api/transforms/folioTransform.js` |
| Location | After `associatedOrders` block (~L97), before closing `};` of return |
| Lines added | ~20 |

```js
    // BUG-424: room-native food items (ordered directly at this room's table)
    // Source: raw.orderDetails[] — excludes check-in marker + cancelled items
    // GST is item-level: shows if food_details.tax > 0, zero otherwise (by design)
    roomOrders: (raw.orderDetails || [])
      .filter(d => {
        if ((d.food_details?.name || '').toLowerCase() === 'check in') return false;
        if (d.food_status === 'cancelled') return false;
        return true;
      })
      .map(d => {
        const fd    = d.food_details || {};
        const qty   = Number(d.quantity)  || 1;
        const unit  = parseFloat(d.unit_price) || parseFloat(d.price) / qty || 0;
        const amt   = unit * qty;
        const gstPct= parseFloat(fd.tax)  || 0;
        const gstAmt= Math.round(amt * gstPct / 100 * 100) / 100;
        return {
          name:      fd.name   || 'Item',
          qty,
          unitPrice: unit,
          amount:    amt,
          gstPercent:gstPct,
          gstAmount: gstAmt,
          sgst:      Math.round(gstAmt / 2 * 100) / 100,
          cgst:      Math.round(gstAmt / 2 * 100) / 100,
          orderedAt: d.created_at || null,
        };
      }),
```

---

### Edit E2 — Add Room Orders Card section in GuestFolioPage.jsx

| Field | Value |
|-------|-------|
| File | `src/pages/pms/GuestFolioPage.jsx` |
| Location | After the "F&B Posted to Room" `</Card>` closing (~L277), before `</div>{/* /LEFT */}` |
| Lines added | ~60 |

**Design spec:**
- Section title: "Room Orders" with BellRing icon (same icon as CollectPaymentPanel uses)
- Table columns: Date | Item | Qty | Rate | Amount
- Row click: toggle inline GST breakdown (SGST / CGST rows) — OD-424-01
- Footer: "Room Orders Total: ₹X" (amber, matching F&B section style)
- Empty state: "No room orders for this stay." if `roomOrders.length === 0`

**New component (inline in GuestFolioPage):**
```jsx
{/* BUG-424: Room Orders — items ordered directly at this room's table */}
<Card icon={BellRing} accent="#D97706" title="Room Orders" testId="section-room-orders">
  {(!folio.roomOrders || folio.roomOrders.length === 0) ? (
    <p className="text-[11px] text-[#888] text-center py-3">No room orders for this stay.</p>
  ) : (
    <>
      <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
              {['Date', 'Item', 'Qty', 'Rate', 'Amount'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold text-[#888] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {folio.roomOrders.map((item, i) => (
              <RoomOrderRow key={i} item={item} idx={i} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-[10px] text-[#888]">Tap a row to see GST breakdown</span>
        <span className="text-[11px] font-semibold text-[#D97706]">
          Room Orders Total: {fmtINR(folio.roomOrders.reduce((s, r) => s + r.amount, 0))}
        </span>
      </div>
    </>
  )}
</Card>
```

**`RoomOrderRow` inline component (above `GuestFolioPage` export):**
```jsx
// BUG-424: expandable row for room-native order items
const RoomOrderRow = ({ item, idx }) => {
  const [expanded, setExpanded] = React.useState(false);
  const date = item.orderedAt
    ? new Date(item.orderedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : '—';
  return (
    <>
      <tr
        data-testid={`room-order-row-${idx}`}
        onClick={() => setExpanded(e => !e)}
        className={`border-b border-[#F5F5F5] last:border-0 cursor-pointer
          ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'} hover:bg-[#FFF8F5]`}
      >
        <td className="px-3 py-2 text-[#888]">{date}</td>
        <td className="px-3 py-2 font-medium capitalize">{item.name}</td>
        <td className="px-3 py-2">{item.qty}</td>
        <td className="px-3 py-2">{fmtINR(item.unitPrice)}</td>
        <td className="px-3 py-2 font-semibold text-right">{fmtINR(item.amount)}</td>
      </tr>
      {expanded && item.gstPercent > 0 && (
        <tr className="bg-[#FFFBEB]">
          <td colSpan={5} className="px-4 py-1.5 text-[10px] text-[#888] space-y-0.5">
            <div className="flex justify-between"><span>SGST ({item.gstPercent / 2}%)</span><span>{fmtINR(item.sgst)}</span></div>
            <div className="flex justify-between"><span>CGST ({item.gstPercent / 2}%)</span><span>{fmtINR(item.cgst)}</span></div>
          </td>
        </tr>
      )}
    </>
  );
};
```

**Import needed:** Add `BellRing` to lucide-react imports at top of GuestFolioPage.jsx.

---

## Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Folio with room-native orders: "Room Orders" section appears on LHS | Browser `/pms/folio/:id` |
| 2 | Section shows item name, qty, rate, amount, date per row | Visual |
| 3 | Click row with GST item → SGST + CGST rows expand inline | Click |
| 4 | Click row with 0% GST item → no GST rows shown (or nothing expands) | Click |
| 5 | Room Orders Total = sum of all item amounts | Verify math |
| 6 | Check-in marker item NOT shown | Verify item list |
| 7 | Cancelled items NOT shown | Verify |
| 8 | Guest with no room orders → "No room orders for this stay." empty state | Browser |
| 9 | F&B Posted section (transferred orders) unchanged | Visual |
| 10 | No compile error | webpack |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-424 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `api/transforms/folioTransform.js` + `pages/pms/GuestFolioPage.jsx` + BUG-424
- [ ] Code marker: `// BUG-424` in E1 and E2
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-424
Stage: Impact Analysis + Implementation Plan (Gates 2+3)
Code reality: NONE (new section)
Risk: MEDIUM
Files WILL change: src/api/transforms/folioTransform.js (+20 lines E1)
                   src/pages/pms/GuestFolioPage.jsx (+60 lines E2 + RoomOrderRow component)
Files WILL NOT touch: pmsService.js, PmsCheckoutDrawer.jsx, orderTransform.js, all others
Owner decisions: OD-424-01 + OD-424-02 resolved
Parallel-safe with BUG-423 (different lines in GuestFolioPage)
Next: Gate 4 GO / Implementation
```
