# BUG-045 — Pre-Implementation Code Gate

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bug | **BUG-045** (sub-defects 45a–45n) |
| Gate Type | Pre-implementation code gate (planning + pseudo-diff only) |
| Created (UTC) | 2026-05-11 |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `cf36343`) |
| Source Plan | `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` (refreshed BUG-045 section L66–425) |
| Source Analysis | `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` L837–1116 (Base + Addendum 1 + Addendum 2) |
| Code Changes | **NONE** — planning-only |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |

> Purpose: split BUG-045 (14 sub-defects) into surgical implementation buckets that
> can each be applied, tested, and reviewed independently. Each bucket has its
> own risk classification, pseudo-diff, and test plan. **No code is written
> here.** Owner must approve the gate before any bucket is implemented.

---

## 0. Bucket Overview

| Bucket | Sub-defects | Files Touched | Diff Size | Risk |
| --- | --- | --- | --- | --- |
| **A — Suppress + Z-index** | 45a, 45b | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` | ~6 lines net | **Low** |
| **B — Item Row Rewrite** | 45c, 45d, 45e, 45f, 45m + comp-tag | `ScanOrderPopOut.jsx` only | ~50 lines net | **Medium** |
| **C — Header / Sub-header Enrichment** | 45g, 45h, 45i, 45j, 45l, 45n | `ScanOrderPopOut.jsx` only | ~40 lines net | **Medium** |
| **D — Verification-only** | 45k | none (verify-only) | 0 lines | **None** |

Independence: A → B and A → C are independent and can be merged separately.
B and C touch different regions of the same file (items list vs header) and
are merge-safe in either order. D is verification-only.

Recommended implementation sequence: **A → B → C → D-verify**. A first
because it eliminates the visible "no-op" pain immediately and is the lowest
risk; B next because it kills the most visible defect (₹0.00 + missing
qty/variations/add-ons/notes); C last because it is the largest layout
change.

---

## 1. Bucket A — Suppress + Z-index Fix

### Sub-defects
- **45a** — View Order does nothing (popup covers the underlying screen).
- **45b** — Reject does nothing (popup covers the cancel modal).

### Root cause
- Popup backdrop sits at `z-[9999]` (`ScanOrderPopOut.jsx:303`).
- `OrderEntry` overlay opens at `z-50` (`OrderEntry.jsx:1013`).
- `CancelOrderModal` overlay opens at `z-[100]` (`CancelOrderModal.jsx:27`).
- The popup handlers **do** fire — the underlying screens are simply hidden behind the popup's dimmed backdrop.

### Files / Sections to Change

| # | File | Section / Lines | Change |
| --- | --- | --- | --- |
| A1 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Component prop signature, L136–144 | Add optional `suppressed` prop (default `false`). |
| A2 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Early-return block just before existing `if (queue.length === 0) return null;` at L285 | Return `null` when `suppressed === true`. |
| A3 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Backdrop `<div>` className, L303 | Replace `z-[9999]` with `z-30` (defence-in-depth). |
| A4 | `frontend/src/pages/DashboardPage.jsx` | `<ScanOrderPopOut/>` instance, L1463–1471 | Add prop `suppressed={Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)}`. |

### Proposed Pseudo-Diff

**ScanOrderPopOut.jsx — A1 (prop signature)**
```diff
 const ScanOrderPopOut = ({
   orders = [],
   snoozedOrders,
   onToggleSnooze,
   onAccept,
   onReject,
   onEdit,
   currencySymbol = '₹',
+  suppressed = false,
 }) => {
```

**ScanOrderPopOut.jsx — A2 (early-return)**
```diff
-  if (queue.length === 0) return null;
+  if (suppressed) return null;
+  if (queue.length === 0) return null;
```

**ScanOrderPopOut.jsx — A3 (z-index)**
```diff
-      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 lg:p-6"
+      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 lg:p-6"
```

**DashboardPage.jsx — A4 (prop wiring)**
```diff
       <ScanOrderPopOut
         orders={orders}
         snoozedOrders={snoozedOrders}
         onToggleSnooze={toggleSnooze}
         onAccept={handleConfirmOrder}
         onReject={handleCancelOrderFromCard}
         onEdit={handleTableClick}
         currencySymbol={currencySymbol}
+        suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}
       />
```

### Risk: **Low**
- Reason: Adds a single boolean gate before render. No handler change, no logic change, no state change. State variables `orderEntryType` / `cancelOrderEntry` already exist on `DashboardPage` (L411 / L427) and already drive `OrderEntry` / `CancelOrderModal` mounts (L1788, L1818).
- Failure mode if mis-wired: popup either never hides (current behaviour) or stays hidden forever (only when both states stay truthy — they reset on `setOrderEntryType(null)` / `setCancelOrderEntry(null)` which are already correctly wired across the dashboard).
- Z-index lowering to `z-30` is defence-in-depth; even without the `suppressed` gate, `OrderEntry` (`z-50`) and `CancelOrderModal` (`z-[100]`) would now visually stack above the popup. The combination is intentional: `suppressed` removes the dimming backdrop entirely while open modals exist.

### Test Plan (Bucket A)

| # | Scenario | Expected |
| --- | --- | --- |
| A.T1 | Seed a YTC web delivery order; do not open any modal. | Popup renders normally with new `z-30` backdrop. Behaviourally identical to today (minus z-index value). |
| A.T2 | Open popup → click **View Order**. | Popup hides immediately (`suppressed === true` because `orderEntryType` becomes `'delivery'`). `OrderEntry` overlay is the topmost UI. |
| A.T3 | Close `OrderEntry` (e.g., back button / setOrderEntryType(null)). | Popup re-appears if any YTC order still pending; otherwise stays hidden (queue length 0). |
| A.T4 | Open popup → click **Reject**. | Popup hides immediately (`cancelOrderEntry` becomes truthy). `CancelOrderModal` is the topmost UI. |
| A.T5 | Pick a cancel reason and confirm. | Cancel API fires, OrderContext drops the order, popup remains hidden. |
| A.T6 | Cancel the modal (click X / back). | `setCancelOrderEntry(null)` fires; popup re-appears with remaining YTC orders. |
| A.T7 | Open `OrderEntry` for a *non-web* table (existing dashboard click). | Popup remains hidden during entry — acceptable side-effect, no new bug. |
| A.T8 | Seed two YTC web orders → open first → click View → close → second popup auto-appears. | Queue resumes correctly. |
| A.T9 (regression) | Snooze button still works (handler unchanged). | Snooze adds to in-memory hide-set for 5 minutes, popup advances to next queue item. |
| A.T10 (regression) | Prev / Next nav still works. | Queue index advances/retreats unchanged. |
| A.T11 (regression) | Accept button still fires `handleConfirmOrder`. | Handler invoked (BUG-037 itself is outside this bucket). |

---

## 2. Bucket B — Item Row Rewrite

### Sub-defects
- **45c** — Item line shows ₹0.00.
- **45d** — Add-ons not shown.
- **45e** — Variations not shown.
- **45f** — Item notes not shown.
- **45m** — Quantity prefix missing.
- **Comp tag rule** (cross-cutting) — legitimate ₹0.00 must be distinguishable from mapping bug.

### Root cause
- Item `<li>` (L404–417) reads `it.quantity` and `it.total ?? it.amount`; canonical keys per `orderTransform.js:106–148` are `qty`, `unitPrice`, `price`. Variations, add-ons, notes, and comp flags are never read.
- `formatItemCount` (L118–123) has the same `it.quantity` mismatch.

### Files / Sections to Change

| # | File | Section / Lines | Change |
| --- | --- | --- | --- |
| B1 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | `formatItemCount`, L118–123 | Replace `Number(it?.quantity)` with `Number(it?.qty ?? it?.quantity)`. |
| B2 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Item `<li>` body, L404–417 | Replace the existing two-span `<li>` with the multi-row layout (qty prefix + line total + variation sub-list + add-ons sub-list + italic note + Comp tag), keeping the existing `divide-y` parent `<ul>` + `key` strategy. Reuse JSX shape from `OrderDetailSheet.jsx:328–400`. |

### Proposed Pseudo-Diff

**ScanOrderPopOut.jsx — B1 (`formatItemCount`)**
```diff
 const formatItemCount = (order) => {
   const items = Array.isArray(order?.items) ? order.items : [];
-  const qty = items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
+  const qty = items.reduce((sum, it) => sum + (Number(it?.qty ?? it?.quantity) || 0), 0);
   if (qty === 0 && items.length === 0) return '— items';
   return `${qty || items.length} item${(qty || items.length) === 1 ? '' : 's'}`;
 };
```

**ScanOrderPopOut.jsx — B2 (item `<li>` rewrite)**
```diff
                 <ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
-                  {activeOrder.items.map((it, idx) => (
-                    <li
-                      key={`${it?.id ?? it?.foodId ?? idx}-${idx}`}
-                      className="flex items-center justify-between px-3 py-2 text-sm"
-                    >
-                      <span style={{ color: COLORS.darkText }}>
-                        {it?.quantity ? `${it.quantity}× ` : ''}
-                        {it?.name || it?.productName || 'Item'}
-                      </span>
-                      <span style={{ color: COLORS.grayText }}>
-                        {currencySymbol}
-                        {Number(it?.total ?? it?.amount ?? 0).toFixed(2)}
-                      </span>
-                    </li>
-                  ))}
+                  {activeOrder.items.map((it, idx) => {
+                    const qty = Number(it?.qty ?? it?.quantity) || 1;
+                    const unit = Number(it?.unitPrice ?? it?.price) || 0;
+                    const lineTotal = unit * qty;
+                    const isComp = Boolean(it?.isComplementary || it?.isComplementaryRuntime);
+                    const variations = Array.isArray(it?.variation) ? it.variation : [];
+                    const addOns = Array.isArray(it?.addOns) ? it.addOns : [];
+                    return (
+                      <li
+                        key={`${it?.id ?? it?.foodId ?? idx}-${idx}`}
+                        className="px-3 py-2 text-sm"
+                        data-testid={`popout-item-row-${idx}`}
+                      >
+                        {/* row 1: name + line total */}
+                        <div className="flex items-start justify-between gap-2">
+                          <div className="flex items-center gap-2 min-w-0">
+                            <span style={{ color: COLORS.darkText }} className="font-medium truncate">
+                              {qty}× {it?.name || it?.productName || 'Item'}
+                            </span>
+                            {isComp && (
+                              <span
+                                data-testid={`popout-item-comp-tag-${idx}`}
+                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
+                                style={{ backgroundColor: '#F1F5F9', color: COLORS.darkText }}
+                              >
+                                Comp
+                              </span>
+                            )}
+                          </div>
+                          <span style={{ color: COLORS.grayText }} className="font-mono">
+                            {currencySymbol}{lineTotal.toFixed(2)}
+                          </span>
+                        </div>
+                        {/* row 2: variations */}
+                        {variations.length > 0 && (
+                          <div className="mt-1 pl-3 border-l-2" style={{ borderColor: COLORS.borderGray }}>
+                            {variations.map((v, vIdx) => (
+                              <div
+                                key={`var-${vIdx}`}
+                                className="text-xs"
+                                style={{ color: COLORS.grayText }}
+                                data-testid={`popout-item-variation-${idx}-${vIdx}`}
+                              >
+                                {v?.name || v?.label || ''}
+                                {Number(v?.price) > 0 && (
+                                  <span className="ml-1">(+{currencySymbol}{Number(v.price).toFixed(2)})</span>
+                                )}
+                              </div>
+                            ))}
+                          </div>
+                        )}
+                        {/* row 3: add-ons */}
+                        {addOns.length > 0 && (
+                          <div className="mt-1 pl-3 border-l-2" style={{ borderColor: '#FCD9A4' }}>
+                            {addOns.map((a, aIdx) => (
+                              <div
+                                key={`add-${aIdx}`}
+                                className="text-xs"
+                                style={{ color: COLORS.primaryOrange }}
+                                data-testid={`popout-item-addon-${idx}-${aIdx}`}
+                              >
+                                + {a?.name || ''}
+                                {Number(a?.price) > 0 && (
+                                  <span className="ml-1">(+{currencySymbol}{Number(a.price).toFixed(2)})</span>
+                                )}
+                              </div>
+                            ))}
+                          </div>
+                        )}
+                        {/* row 4: item note */}
+                        {it?.notes && (
+                          <div
+                            className="mt-1 text-xs italic px-2 py-1 rounded"
+                            style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}
+                            data-testid={`popout-item-note-${idx}`}
+                          >
+                            "{it.notes}"
+                          </div>
+                        )}
+                      </li>
+                    );
+                  })}
                 </ul>
```

### Risk: **Medium**
- Reason: Largest visible UI change; vertical space per item grows from 1 line to 1–4 lines.
- Failure modes:
  - **Layout overflow on small viewports** — existing `max-h-[28vh]` on items container preserves vertical scroll. Acceptable.
  - **Unexpected variation shape** — `orderTransform.js:128` passes `detail.variation` through as raw array. Some entries may use `label` instead of `name`. Diff handles both via `v?.name || v?.label`.
  - **Unexpected addOns shape** — same, raw passthrough. Diff reads `a?.name` only (matches confirmed shape per Addendum 2 § "Field-Mapping Reference").
  - **Comp tag false-positive** — predicate requires explicit truthy `isComplementary` OR `isComplementaryRuntime`; a real item with `unitPrice: 0` and neither flag will correctly show `₹0.00` without Comp tag (the intended diagnostic).
- Net regression surface: zero outside the popup (file-local change, no shared util touched).

### Test Plan (Bucket B)

| # | Scenario | Expected |
| --- | --- | --- |
| B.T1 | Seed item `{name:'Burger', qty:2, unitPrice:75}`. | Row reads `2× Burger   ₹150.00`. |
| B.T2 | Seed item `{name:'Pizza', qty:1, unitPrice:300, variation:[{name:'Large', price:50}]}`. | Row 1: `1× Pizza   ₹300.00`. Sub-line: `Large (+₹50.00)`. |
| B.T3 | Seed item `{name:'Burger', qty:2, unitPrice:75, addOns:[{name:'Cheese', price:20}]}`. | Sub-line: `+ Cheese (+₹20.00)`. |
| B.T4 | Seed item `{name:'Pasta', qty:1, unitPrice:200, notes:'No garlic'}`. | Italic line: `"No garlic"`. |
| B.T5 | Seed comp item `{name:'Welcome Drink', qty:1, unitPrice:0, isComplementary:true}`. | Row: `1× Welcome Drink [Comp]   ₹0.00`. |
| B.T6 | Seed comp item `{name:'Mint', qty:1, unitPrice:0, isComplementaryRuntime:true}`. | Same as B.T5 — runtime-comp also tagged. |
| B.T7 | Seed item `{name:'Fries', qty:1, unitPrice:60}`. | Row: `1× Fries   ₹60.00`. No Comp tag. |
| B.T8 | Seed item `{name:'Bug', qty:1, unitPrice:0, isComplementary:false, isComplementaryRuntime:false}`. | Row: `1× Bug   ₹0.00` **without** Comp tag — intentional diagnostic signal. |
| B.T9 | Seed item with both variations + add-ons + notes simultaneously. | All three sub-blocks render in order: variations, add-ons, italic note. |
| B.T10 | Seed item with `qty:3` only (no other extras). | Header row reads `3× Item ₹{3*unitPrice}.00`. |
| B.T11 | Seed order with 6 items (long list). | Items container scrolls vertically (`max-h-[28vh]` preserved). |
| B.T12 (regression) | Item count summary at popup header. | Reads total qty correctly (B1 fix to `formatItemCount`). |
| B.T13 (regression) | Empty `items` array. | Item container hidden (existing conditional at L397 preserved). |
| B.T14 (regression) | `OrderDetailSheet.jsx` un-touched: open Reports → Order Details. | Renders identically to pre-change (sanity — only pattern was lifted, source not modified). |

---

## 3. Bucket C — Header / Sub-header Enrichment

### Sub-defects
- **45g** — Order note not shown.
- **45h** — Delivery address shows placeholder.
- **45i** — Delivery charge + payment status missing.
- **45j** — Section + Table for Dine-In QR (already partially correct — graceful degrade verified).
- **45l** — PAID badge missing.
- **45n** — Delivery instructions not shown.

### Root cause
- `formatLocation` (L107–116) hard-codes `'Delivery address on file'` for delivery → 45h.
- Header sub-block (L347–395) does not render PAID badge, payment label, delivery charge, delivery instructions, or order note → 45g, 45i, 45l, 45n.
- Dine-In branch in `formatLocation` already works for the happy path (`tableSectionName + tableNumber`); only the graceful fallback to `—` needs explicit confirmation → 45j (largely already correct).

### Files / Sections to Change

| # | File | Section / Lines | Change |
| --- | --- | --- | --- |
| C1 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | `formatLocation`, L107–116 | Rewrite per-type matrix: Dine-In with graceful `—` fallback; Delivery uses `[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')` (or `—` when address null); Takeaway/Walk-In keep labels; drop `'Delivery address on file'`. |
| C2 | `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Header sub-block, between existing customer block (L395) and items container (L397) | Insert PAID badge + Payment label row + Delivery Charge row + Delivery Instructions italic line + Order Note italic line. Each conditional on data presence. |

### Proposed Pseudo-Diff

**ScanOrderPopOut.jsx — C1 (`formatLocation`)**
```diff
-const formatLocation = (order) => {
-  if (!order) return '';
-  if (order.tableNumber && order.tableSectionName) {
-    return `${order.tableSectionName} · ${order.tableNumber}`;
-  }
-  if (order.tableNumber) return order.tableNumber;
-  if (order.orderType === 'delivery') return 'Delivery address on file';
-  if (order.orderType === 'takeAway') return 'Takeaway';
-  return '—';
-};
+const formatLocation = (order) => {
+  if (!order) return '';
+  if (order.orderType === 'dineIn') {
+    const section = order.tableSectionName || '';
+    const table = order.tableNumber || '';
+    if (section && table) return `${section} · ${table}`;
+    if (section) return section;
+    if (table) return table;
+    return '—';
+  }
+  if (order.orderType === 'delivery') {
+    const addr = order.deliveryAddress || null;
+    if (!addr) return '—';
+    const line = [addr.address, addr.city, addr.pincode].filter(Boolean).join(', ');
+    return line || '—';
+  }
+  if (order.orderType === 'takeAway') return '';
+  if (order.orderType === 'walkIn') return '';
+  if (order.tableNumber) return order.tableNumber;
+  return '—';
+};
```
*(Takeaway / Walk-In return empty string so the header reads just `Takeaway` / `Walk-In` via `formatChannelLabel` without a trailing ` · `.)*

**ScanOrderPopOut.jsx — header join (existing L360–361) — minor adjustment to handle empty location string**
```diff
-                <div className="text-sm mt-1" style={{ color: COLORS.grayText }}>
-                  {formatChannelLabel(activeOrder.orderType)} · {formatLocation(activeOrder)}
-                </div>
+                <div
+                  className="text-sm mt-1"
+                  style={{ color: COLORS.grayText }}
+                  data-testid="scan-order-popout-location"
+                >
+                  {formatChannelLabel(activeOrder.orderType)}
+                  {formatLocation(activeOrder)
+                    ? ` · ${formatLocation(activeOrder)}`
+                    : ''}
+                </div>
```

**ScanOrderPopOut.jsx — C2 (header sub-block: PAID badge + payment + delivery charge + instructions + order note)**

Insert immediately after the existing customer-name block (closes at L395) and before the items `<div>` (opens at L397).

```diff
             {activeOrder.customerName ? (
               <div ...>...</div>
             ) : null}

+            {/* BUG-045 45l: PAID badge — predicate identical to OrderCard.jsx:329 */}
+            {activeOrder.paymentType === 'prepaid' && activeOrder.fOrderStatus !== 8 && (
+              <div>
+                <span
+                  data-testid={`popout-paid-badge-${idStr}`}
+                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
+                  style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}
+                >
+                  PAID
+                </span>
+              </div>
+            )}
+
+            {/* BUG-045 45i: payment label — Prepaid / COD / paymentMethod fallback */}
+            {activeOrder.paymentType || activeOrder.paymentMethod ? (
+              <div
+                className="text-sm"
+                style={{ color: COLORS.grayText }}
+                data-testid={`popout-payment-label-${idStr}`}
+              >
+                <span style={{ color: COLORS.grayText }}>Payment: </span>
+                <span className="font-semibold" style={{ color: COLORS.darkText }}>
+                  {activeOrder.paymentType === 'prepaid'
+                    ? 'Prepaid'
+                    : activeOrder.paymentMethod === 'cash_on_delivery'
+                    ? 'COD'
+                    : (activeOrder.paymentMethod || '—')}
+                </span>
+              </div>
+            ) : null}
+
+            {/* BUG-045 45i: delivery charge — hidden when 0 */}
+            {activeOrder.orderType === 'delivery' && Number(activeOrder.deliveryCharge) > 0 && (
+              <div
+                className="text-sm"
+                style={{ color: COLORS.grayText }}
+                data-testid={`popout-delivery-charge-${idStr}`}
+              >
+                <span style={{ color: COLORS.grayText }}>Delivery Charge: </span>
+                <span className="font-semibold" style={{ color: COLORS.darkText }}>
+                  {currencySymbol}
+                  {Number(activeOrder.deliveryCharge).toFixed(2)}
+                </span>
+              </div>
+            )}
+
+            {/* BUG-045 45n: delivery instructions — italic, hidden when blank */}
+            {activeOrder.orderType === 'delivery' &&
+              activeOrder.deliveryAddress?.delivery_instructions && (
+                <div
+                  className="text-xs italic"
+                  style={{ color: COLORS.grayText }}
+                  data-testid={`popout-delivery-instructions-${idStr}`}
+                >
+                  Instructions: "{activeOrder.deliveryAddress.delivery_instructions}"
+                </div>
+              )}
+
+            {/* BUG-045 45g: order-level note — italic, above items */}
+            {activeOrder.orderNote ? (
+              <div
+                className="text-sm italic px-2 py-1 rounded"
+                style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}
+                data-testid={`popout-order-note-${idStr}`}
+              >
+                Order Note: "{activeOrder.orderNote}"
+              </div>
+            ) : null}

             {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 ? (
               <div ...>
```

### Risk: **Medium**
- Reason: Largest header layout change (5 new conditional rows). Pop-up vertical density grows for delivery + prepaid orders.
- Failure modes:
  - **Panel overflow** — existing `lg:max-h-[85vh]` on the panel + body `overflow-y-auto` (L345) absorbs the extra height. Verify on tablet portrait.
  - **`deliveryAddress` shape unexpected** — `orderTransform.js:279` is a raw passthrough. Confirmed in Addendum 2 the raw object has `address`, `city`, `pincode`, `delivery_instructions`. Defensive null-coalescing in the diff handles missing keys.
  - **Empty location string trailing dot** — `formatChannelLabel(takeAway) · ` would render a dangling separator; the C1 diff returns empty string for takeaway/walk-in and the join is conditional on truthy location.
  - **PAID + HOLD coexistence** — for `fOrderStatus === 8` (HOLD), the existing `OrderCard.jsx:329` predicate (`!== 8`) keeps PAID hidden; pop-up uses same predicate, so no clash.
- Cross-bucket: C2 inserts elements above the items list (Bucket B's region). Merge order safe in either direction.

### Test Plan (Bucket C)

| # | Scenario | Expected |
| --- | --- | --- |
| C.T1 | Seed Dine-In QR with `tableSectionName:'Garden'`, `tableNumber:'T3'`. | Header location reads `Dine-In · Garden · T3`. |
| C.T2 | Seed Dine-In QR with only `tableNumber:'T1'`. | Header reads `Dine-In · T1`. |
| C.T3 | Seed Dine-In QR with neither section nor table. | Header reads `Dine-In · —`. |
| C.T4 | Seed Delivery with `deliveryAddress:{address:'12 Main St', city:'Mumbai', pincode:'400001'}`. | Header reads `Delivery · 12 Main St, Mumbai, 400001`. |
| C.T5 | Seed Delivery with `deliveryAddress:null`. | Header reads `Delivery · —`. No payment/delivery-charge/instructions row. |
| C.T6 | Seed Delivery prepaid `paymentType:'prepaid', fOrderStatus:7`. | Green `PAID` pill visible; `Payment: Prepaid` row visible. |
| C.T7 | Seed Delivery with `paymentMethod:'cash_on_delivery'` (COD). | `Payment: COD` row visible; no PAID pill. |
| C.T8 | Seed Delivery with `deliveryCharge:50`. | `Delivery Charge: ₹50.00` row visible. |
| C.T9 | Seed Delivery with `deliveryCharge:0`. | Delivery Charge row **hidden** (not `₹0.00`). |
| C.T10 | Seed Delivery with `deliveryAddress.delivery_instructions:'Leave at gate'`. | Italic line: `Instructions: "Leave at gate"`. |
| C.T11 | Seed Delivery without delivery_instructions. | No instructions line. |
| C.T12 | Seed any order with `orderNote:'Pack neatly'`. | Italic line `Order Note: "Pack neatly"` directly above items. |
| C.T13 | Seed any order without orderNote. | No order-note line. |
| C.T14 | Seed Takeaway order. | Header reads `Takeaway` (no trailing `· `). |
| C.T15 | Seed Walk-In order. | Header reads `Walk-In` (no trailing `· `). |
| C.T16 (regression) | `OrderCard.jsx` PAID badge on dashboard cards. | Visually identical to pre-change. |
| C.T17 (regression) | `AddressPickerModal.jsx` address rendering. | Visually identical (file untouched). |
| C.T18 (regression) | Tablet portrait viewport (768×1024) with full delivery prepaid order. | Panel scrolls vertically; no horizontal overflow. |
| C.T19 (regression) | `fOrderStatus === 8` (HOLD) on a prepaid delivery order (defensive). | No PAID pill (matches dashboard card behaviour). |

---

## 4. Bucket D — Verification-only

### Sub-defects
- **45k** — Customer + phone for Takeaway should be verified.

### Root cause
- Per code inspection: existing customer block at `ScanOrderPopOut.jsx:381–395` already renders `activeOrder.customerName` + `activeOrder.phone` when present, regardless of `orderType`. Take-away orders shipped by `orderTransform.js:200–203` populate both fields when the user object carries them. **No code change required.**

### Files / Sections to Change
**None.** Verification-only via test scenarios.

### Proposed Pseudo-Diff
**None.**

### Risk: **None**

### Test Plan (Bucket D)

| # | Scenario | Expected |
| --- | --- | --- |
| D.T1 | Seed Takeaway order with `customerName:'Vikram'`, `phone:'+91 9222222222'`. | Customer block reads `Customer: Vikram · +91 9222222222`. |
| D.T2 | Seed Takeaway order with only `customerName:'Anu'` (no phone). | Reads `Customer: Anu`. No trailing ` · `. |
| D.T3 | Seed Takeaway order with neither name nor phone. | Customer block hidden entirely (existing conditional at L381 preserves). |
| D.T4 | Seed Takeaway with extras (notes + items). | Customer block sits between header and items, unchanged. |

If any of D.T1–D.T4 fails on a real take-away order, **promote 45k into Bucket C with a follow-up plan** before implementation; otherwise close 45k as verified.

---

## 5. Cross-Bucket Coordination

- **No file conflicts between buckets.** Bucket A touches `DashboardPage.jsx` (1 line) + the prop signature + early-return + backdrop className in `ScanOrderPopOut.jsx`. Bucket B rewrites the items `<li>`. Bucket C rewrites `formatLocation` + inserts the header sub-block. All three regions are physically separate in `ScanOrderPopOut.jsx`.
- **Order of merge:** A → B → C is recommended. Each can ship in its own commit / PR.
- **Independent rollback:** Any bucket can be reverted without touching the other two.
- **No backend / API / socket / transform changes in any bucket.**
- **`orderTransform.js` is on the hotspot list** (`IMPLEMENTATION_AGENT_RULES.md` §145–158); no change planned — every field listed in the Data Mapping Plan is already emitted today.
- **No new files, no new utility modules, no new components.** All changes are inline within the two listed files.

---

## 6. Aggregate Risk Summary

| Bucket | Risk | Diff Size | Hotspot Touched | Backend? | Net regression surface |
| --- | --- | --- | --- | --- | --- |
| A | **Low** | ~6 lines | `DashboardPage.jsx` (prop wiring only — no logic) | No | Single new render gate; no shared util touched |
| B | **Medium** | ~50 lines | None | No | File-local rewrite of items `<li>`; pattern lifted from `OrderDetailSheet.jsx` (source untouched) |
| C | **Medium** | ~40 lines | None | No | File-local rewrite of `formatLocation` + new header sub-block; pattern lifted from `OrderCard.jsx` / `AddressPickerModal.jsx` (sources untouched) |
| D | **None** | 0 lines | None | No | n/a — verification-only |

Aggregate: ~96 lines net change across **2 files**, no backend, no API, no socket, no transform.

---

## 7. Implementation Guardrails (carried from refreshed plan)

The Implementation Agent must:
- Apply each bucket as an independent diff. Do not bundle buckets that have not been jointly approved.
- Reuse JSX / predicates from `OrderDetailSheet.jsx`, `OrderCard.jsx`, `AddressPickerModal.jsx` verbatim wherever possible. Adapt only the field-key differences captured in §2–§3 above.
- Avoid creating new utility files / helper modules / sub-components. Any helper must stay as inline `const` inside `ScanOrderPopOut.jsx`.
- Avoid backend / API / `orderTransform.js` changes. If any field in §2–§3 turns out to be missing on the live YTC order object during implementation, **stop and escalate** — do not patch by editing the transform.
- Preserve all existing `data-testid` values. Add new test ids using the `popout-*-{orderId}` namespace.
- Preserve POS2-002 Phase 4 invariants: no audio, no notification context, no direct service / API / socket call, no localStorage / sessionStorage / IndexedDB writes, no mutation of `order.status` / `fOrderStatus` / OrderContext.
- Leave Accept (`handleConfirmOrder`) flow unchanged — that is BUG-037, separately blocked.

---

## 8. What Is NOT in Scope for This Gate

- BUG-037 Accept default-config delivered-state bug (separate, backend-dependent).
- BUG-044 free-table residual order cleanup (Bucket 1 plan, unrelated).
- BUG-046 editable delivery-charge total reflow (Bucket 1 plan, unrelated).
- Any refactor / extraction of `OrderDetailSheet.jsx` / `OrderCard.jsx` / `AddressPickerModal.jsx` patterns into shared utilities.
- Any change to the popup's snooze / queue / Prev-Next / Accept logic.
- Any change to dashboard tile rendering, sidebar, header, or sound subsystem.
- Any change to `/app/memory/final/` documents.

---

## 9. Owner Approval Gate

**Implementation is NOT approved yet.**

Owner must explicitly approve one of the following before any code is changed:

- [ ] **Approve all four buckets (A + B + C + D-verify)** — full BUG-045 fix in three sequential commits.
- [ ] **Approve Bucket A only first** — ship the View / Reject unblock, then re-review Buckets B/C.
- [ ] **Approve Buckets A + B** — ship z-index/suppress + item-row rewrite, defer header enrichment.
- [ ] **Approve Buckets A + C** — ship z-index/suppress + header enrichment, defer item-row rewrite.
- [ ] **Reject and request changes** — explain blocking concerns.

> Owner must reply with one of the above (or an equivalent explicit instruction such as "approved" / "start with bucket A" / "ship all four"). Without that, no code will be changed.

---

## 10. Summary

- **No code changed.**
- **`/app/memory/final/` not updated.**
- **`/app/memory/BUG_TEMPLATE.md` not updated.**
- BUG-045 split into **3 implementation buckets** (A / B / C) plus 1 **verification-only bucket** (D).
- All 14 sub-defects (45a–45n) mapped to a bucket; pseudo-diffs, risk classifications, and per-bucket test plans documented above.
- Awaiting owner approval at §9 before implementation begins.

— End of pre-implementation code gate —
