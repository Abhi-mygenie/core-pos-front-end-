# POS2.0 Wave 5 Code Diff Preview — BUG-071 — 2026-05-17

## 1. Purpose

Exact code-change preview for **BUG-071 only** — switch all human-visible order ID surfaces from `order.orderId` (DB id) to `order.orderNumber` (user-facing id). Q5 fallback rule applied: display surface hidden entirely when `orderNumber` is missing.

**No source files modified yet.**

---

## 2. Touch map

| # | File | Insertions | Deletions |
|---|------|-----------:|----------:|
| 1 | `frontend/src/components/cards/OrderCard.jsx` | +6 | -3 |
| 2 | `frontend/src/components/cards/TableCard.jsx` | +3 | -3 |
| 3 | `frontend/src/components/order-entry/OrderEntry.jsx` | +2 | -1 |
| 4 | `frontend/src/components/cards/DeliveryCard.jsx` | +1 | -1 |
| 5 | `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | +1 | -1 |
| 6 | `frontend/src/components/order-entry/RePrintButton.jsx` | +1 | -1 |
| 7 | `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | +1 | -1 |
| 8 | `frontend/src/components/reports/OrderDetailSheet.jsx` | +1 | -1 |
| 9 | `frontend/src/components/reports/OrderTable.jsx` | +1 | -1 |
| 10 | `frontend/src/components/reports/ExportButtons.jsx` | +1 | -1 |
| **Total** | | **+18** | **-14** |

---

## 3. File 1 — `frontend/src/components/cards/OrderCard.jsx`

### Change 3.1 — Add `orderNumber` const (after L74)

**Current (L74):**
```javascript
  const orderId = order.orderId || order.id;
  const fOrderStatus = order.fOrderStatus || 1;
```

**Proposed:**
```javascript
  const orderId = order.orderId || order.id;
  // BUG-071 (Wave 5, May-2026): user-facing order id for ALL display surfaces
  // (chip, toasts, dialogs). DB `orderId` stays for API calls + data-testids
  // + React keys. Q5 rule: no fallback — display hidden when missing.
  const orderNumber = order.orderNumber;
  const fOrderStatus = order.fOrderStatus || 1;
```

### Change 3.2 — Bill print toast (L138)

**Current:**
```javascript
      toast({ title: "Bill request sent", description: `Order #${orderId}` });
```

**Proposed:**
```javascript
      // BUG-071: display user-facing number only
      toast({ title: "Bill request sent", description: orderNumber ? `Order #${orderNumber}` : 'Bill request sent' });
```

### Change 3.3 — Settle prepaid toast (L157)

**Current:**
```javascript
      toast({ title: "Order settled", description: `Order #${orderId}` });
```

**Proposed:**
```javascript
      // BUG-071: display user-facing number only
      toast({ title: "Order settled", description: orderNumber ? `Order #${orderNumber}` : 'Order settled' });
```

### Change 3.4 — Header chip (L312-320)

**Current:**
```javascript
          {orderId && (
            <span
              data-testid={`order-id-chip-${orderId}`}
              className="text-xs flex-shrink-0"
              style={{ color: COLORS.grayText }}
            >
              #{orderId}
            </span>
          )}
```

**Proposed:**
```javascript
          {/* BUG-071 (Wave 5): chip visibility now keyed on `orderNumber`
              (user-facing). `data-testid` stays on DB `orderId` for stable
              test selectors. Pre-engage cards without `orderNumber` render
              no chip — same width-budget shape as today's `!orderId` branch. */}
          {orderNumber && (
            <span
              data-testid={`order-id-chip-${orderId}`}
              className="text-xs flex-shrink-0"
              style={{ color: COLORS.grayText }}
            >
              #{orderNumber}
            </span>
          )}
```

---

## 4. File 2 — `frontend/src/components/cards/TableCard.jsx`

### Change 4.1 — KOT print toast (L130-133)

**Current:**
```javascript
      toast({ 
        title: "KOT request sent", 
        description: stationKot ? `Stations: ${stationKot}` : `Order #${table.orderId}` 
      });
```

**Proposed:**
```javascript
      // BUG-071: display user-facing number only (fall back to plain title if missing)
      toast({ 
        title: "KOT request sent", 
        description: stationKot ? `Stations: ${stationKot}` : (table.orderNumber ? `Order #${table.orderNumber}` : '')
      });
```

### Change 4.2 — Bill print toast (L162)

**Current:**
```javascript
      toast({ title: "Bill request sent", description: `Order #${table.orderId}` });
```

**Proposed:**
```javascript
      toast({ title: "Bill request sent", description: table.orderNumber ? `Order #${table.orderNumber}` : 'Bill request sent' });
```

### Change 4.3 — Settle prepaid toast (L180)

**Current:**
```javascript
      toast({ title: "Order settled", description: `Order #${table.orderId}` });
```

**Proposed:**
```javascript
      toast({ title: "Order settled", description: table.orderNumber ? `Order #${table.orderNumber}` : 'Order settled' });
```

---

## 5. File 3 — `frontend/src/components/order-entry/OrderEntry.jsx`

### Change 5.1 — Header chip (L1117-1124)

**Current:**
```javascript
            {(effectiveTable?.orderId || placedOrderId) && (
              <span
                data-testid={`order-entry-order-id-chip-${effectiveTable?.orderId || placedOrderId}`}
                className="text-sm flex-shrink-0"
                style={{ color: COLORS.grayText }}
              >
                #{effectiveTable?.orderId || placedOrderId}
              </span>
            )}
```

**Proposed:**
```javascript
            {/* BUG-071 (Wave 5): chip visibility + visible text now keyed on
                `orderNumber` (user-facing). `data-testid` stays on DB id for
                stable test selectors. Pre-engage cards render no chip. */}
            {effectiveTable?.orderNumber && (
              <span
                data-testid={`order-entry-order-id-chip-${effectiveTable?.orderId || placedOrderId}`}
                className="text-sm flex-shrink-0"
                style={{ color: COLORS.grayText }}
              >
                #{effectiveTable.orderNumber}
              </span>
            )}
```

---

## 6. File 4 — `frontend/src/components/cards/DeliveryCard.jsx`

### Change 6.1 — Drop `order.id` fallback in `orderNumber` (L9)

**Current:**
```javascript
  const orderId = order.orderId || order.id;
  const orderNumber = order.orderNumber || order.id;
```

**Proposed:**
```javascript
  const orderId = order.orderId || order.id;
  // BUG-071 (Wave 5): drop `|| order.id` fallback — Q5 rule says no DB-id
  // leak when `orderNumber` is missing. Chip render at L43 already guards.
  const orderNumber = order.orderNumber;
```

### Change 6.2 — Chip render guard (L43)

**Current:**
```javascript
          <span className="text-sm font-bold flex-shrink-0" style={{ color: COLORS.darkText }}>#{orderNumber}</span>
```

**Proposed:**
```javascript
          {orderNumber && <span className="text-sm font-bold flex-shrink-0" style={{ color: COLORS.darkText }}>#{orderNumber}</span>}
```

---

## 7. File 5 — `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx`

### Change 7.1 — Order label (L72)

**Current:**
```javascript
  const orderLabel = order ? `#${order.orderId || order.id}` : '';
```

**Proposed:**
```javascript
  // BUG-071 (Wave 5): user-facing number only. Q5 rule — empty when missing.
  const orderLabel = order?.orderNumber ? `#${order.orderNumber}` : '';
```

(`renderedTitle` and `renderedDescription` already handle empty `orderLabel` gracefully.)

---

## 8. File 6 — `frontend/src/components/order-entry/RePrintButton.jsx`

### Change 8.1 — Bill print toast (L116)

**Current:**
```javascript
      toast({ title: "Bill request sent", description: `Order #${orderId}` });
```

**Proposed:**
```javascript
      // BUG-071: display user-facing number only
      toast({ title: "Bill request sent", description: order?.orderNumber ? `Order #${order.orderNumber}` : 'Bill request sent' });
```

(Assumes `order` is in scope at this call site — confirmed by surrounding context using `order` for the same `printOrder` call at L112.)

---

## 9. File 7 — `frontend/src/components/reports/CollectBillPanelDrawer.jsx`

### Change 9.1 — Drawer title (L223)

**Current:**
```javascript
          <div className="text-sm font-semibold text-zinc-900">
            Collect Bill {order?.orderId ? `· #${order.orderId}` : ''}
          </div>
```

**Proposed:**
```javascript
          <div className="text-sm font-semibold text-zinc-900">
            {/* BUG-071 (Wave 5): user-facing number only. Q5 — no chip when missing. */}
            Collect Bill {order?.orderNumber ? `· #${order.orderNumber}` : ''}
          </div>
```

---

## 10. File 8 — `frontend/src/components/reports/OrderDetailSheet.jsx`

### Change 10.1 — Missing-order placeholder copy (L432-435)

**Current:**
```javascript
    <p className="text-sm text-zinc-500">
      Order #{orderId} is missing from records.<br />
      This may indicate a gap in order sequence.
    </p>
```

**Proposed:**
```javascript
    <p className="text-sm text-zinc-500">
      {/* BUG-071 (Wave 5): drop DB id leak. Missing-order placeholder no
          longer surfaces the DB `orderId` per Q5 rule. */}
      This order is missing from records.<br />
      This may indicate a gap in order sequence.
    </p>
```

---

## 11. File 9 — `frontend/src/components/reports/OrderTable.jsx`

### Change 11.1 — `orderId` column fallback chain (L450-454)

**Current:**
```javascript
      return (
        <span className="font-mono text-sm text-zinc-900">
          {order.displayOrderId || order.orderId || `#${order.id}`}
        </span>
      );
```

**Proposed:**
```javascript
      // BUG-071 (Wave 5): drop the `order.orderId` and `#${order.id}` DB-id
      // fallbacks. `displayOrderId` (CR-001 Phase 2 prefixed form "T-002913"
      // / "R-002915") is already user-facing; fall back to raw `orderNumber`
      // when prefix isn't built. Missing rows hit the `_isMissing` branch
      // above and are unaffected.
      return (
        <span className="font-mono text-sm text-zinc-900">
          {order.displayOrderId || order.orderNumber || ''}
        </span>
      );
```

---

## 12. File 10 — `frontend/src/components/reports/ExportButtons.jsx`

### Change 12.1 — Export cell `orderId` fallback chain (L199)

**Current:**
```javascript
              <td style="font-family: monospace;">${order.displayOrderId || order.orderId || order.id}</td>
```

**Proposed:**
```javascript
              <td style="font-family: monospace;">${order.displayOrderId || order.orderNumber || ''}</td>
```

---

## 13. Strict no-touch list

- `data-testid={...orderId}` attributes — kept everywhere for test selector stability
- React `key={...orderId}` props — kept for stable list identity
- API call arg positions — `printOrder(orderId, ...)`, `completePrepaidOrder(orderId, ...)`, etc. — kept on DB id
- Print payload fields — `order_id` / `restaurant_order_id` already correctly handled by `buildBillPrintPayload`
- `order._missingId` placeholder rendering — handled by `_isMissing` branch above the fix

---

## 14. Tests impact

| Test file | Will it break? | Why |
|-----------|---------------|-----|
| All currently passing 498 tests | **No** | No snapshot tests on chip / toast strings. Selectors use `data-testid`, which stay on DB id. |

Expected post-apply: **498/498 passed** (unchanged count).

---

## 15. Validation plan

1. ESLint clean on all 10 files
2. `yarn test --watchAll=false` → 498/498
3. Webpack hot-reload green
4. **Owner smoke** (4 scenarios):
   - Dashboard → place a new order → see chip flip to `#000059` (not `#886544`) once `orderNumber` arrives from backend
   - Bill print from dashboard card → toast description shows `Order #000059`
   - Mark Unpaid dialog on Paid tab → title shows `Mark order #000059 as Unpaid?`
   - Brand-new pre-engage order (no `orderNumber` yet) → no chip / no `#…` in toast — clean fallback per Q5

---

## 16. Approval required

- **A.** Approve this exact diff → apply all 10 file edits (Gate 8), run `yarn test`, owner smoke
- **B.** Modify (tell me what — e.g., a specific fallback text, keep `displayOrderId` priority differently, hold the missing-order placeholder copy)
- **C.** Stop

Reply **A / B / C**.

---

*— End of Wave 5 Code Diff Preview — BUG-071 —*
