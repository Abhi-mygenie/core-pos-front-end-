# CR-077 Phase 1 — Impact Analysis + Implementation Plan

**ID:** CR-077 Phase 1
**Gate:** 2+3 (combined — scope is well-defined, owner rulings locked)
**Date:** 2026-07-19
**Risk:** HIGH (financial — inventory ledger writes)
**Code Reality:** NONE (no receive files exist)
**Conflict Pre-Check:** No conflicts — greenfield module, no other CR touches transfer endpoints

---

## Owner Rulings (locked 2026-07-19)

- R1: Partial receive → **Phase 2** (Phase 1 = Accept All or Reject All)
- R2: Dispute → **Phase 2** (no dispute buttons in Phase 1)
- R3: "From" column → use `from_restaurant_id` + parent name from RestaurantContext
- Phase 1 statuses: `dispatched`, `received`, `rejected` only
- Design: **pixel-match v5 mockup** (`#screen-receive`) — no deviations

---

## Data Flow Trace

```
User opens /inventory-receive (franchise outlet, restaurantTypeFlag = "franchise")
  → ReceiveStockPanel mounts
  → POST /inventory-transfer/pending-queues → { data: { receive_pending: [...], my_requests: [...] } }
  → Render tabs: "Receive Pending (N)" + "My Requests (N)"
  → User clicks row → GET /inventory-transfer/details/{id}
    → { data: { transfer: {header}, lines: [{...meta_json.segments}] } }
  → Drawer opens with line items (read-only qty, batch, expiry)
  → User clicks "Confirm Receive" → POST /inventory-transfer/receive/{id} (empty body = full accept)
    → { status: true, message: "Transfer received successfully", data: { lines: [{received_qty, rejected_qty}] } }
  → Success toast → refresh pending-queues
  
  OR: User clicks "Reject" → POST /inventory-transfer/reject/{id} with { reason: "..." }
    → Success → refresh
```

---

## Scope Lock

**Files WILL create (5):**
1. `pages/InventoryReceivePage.jsx` — page wrapper (~30 lines)
2. `components/inventory/ReceiveStockPanel.jsx` — main panel with tabs + queue table (~200 lines)
3. `components/inventory/ReceiveDrawer.jsx` — transfer detail drawer (~150 lines)
4. `api/services/inventoryTransferService.js` — 4 endpoints for Phase 1 (~30 lines)
5. `api/transforms/inventoryTransferTransform.js` — fromAPI normalizers (~40 lines)

**Files WILL modify (2):**
6. `App.js` — add `/inventory-receive` route (+3 lines)
7. `api/constants.js` — add INVENTORY_TRANSFER_ENDPOINTS (+6 lines)

**Files WILL NOT touch:**
- Sidebar.jsx (receive pill already exists with featureGate)
- RestaurantContext.jsx (restaurantTypeFlag already wired)
- Any existing inventory panels/widgets

---

## Execution Sequence

### Edit 1: `api/constants.js` — Add endpoints

```js
// CR-077: Inventory Transfer
INVENTORY_TRANSFER_ENDPOINTS: {
  PENDING_QUEUES: '/api/v2/vendoremployee/inventory-transfer/pending-queues',
  DETAILS: '/api/v2/vendoremployee/inventory-transfer/details',      // GET /{id}
  RECEIVE: '/api/v2/vendoremployee/inventory-transfer/receive',      // POST /{id}
  REJECT: '/api/v2/vendoremployee/inventory-transfer/reject',        // POST /{id}
},
```

### Edit 2: `api/services/inventoryTransferService.js` — NEW

```js
// CR-077: Inventory Transfer Service (Phase 1 — Receive + Reject)
import api from '../axios';
import { INVENTORY_TRANSFER_ENDPOINTS as EP } from '../constants';
import { fromAPI } from '../transforms/inventoryTransferTransform';

export async function getPendingQueues() {
  const res = await api.post(EP.PENDING_QUEUES);
  return fromAPI.pendingQueues(res.data);
}

export async function getTransferDetails(transferId) {
  const res = await api.get(`${EP.DETAILS}/${transferId}`);
  return fromAPI.transferDetails(res.data);
}

export async function receiveTransfer(transferId) {
  const res = await api.post(`${EP.RECEIVE}/${transferId}`);
  return res.data;
}

export async function rejectTransfer(transferId, reason) {
  const res = await api.post(`${EP.REJECT}/${transferId}`, { reason });
  return res.data;
}
```

### Edit 3: `api/transforms/inventoryTransferTransform.js` — NEW

```js
// CR-077: Inventory Transfer Transform
export const fromAPI = {
  pendingQueues(response) {
    const d = response?.data || response || {};
    const normalize = (list) => (list || []).map(t => ({
      transferId: t.transfer_id,
      referenceCode: t.reference_code,
      type: t.type,
      status: t.status,
      fromRestaurantId: t.from_restaurant_id,
      toRestaurantId: t.to_restaurant_id,
      lineCount: t.line_count || 0,
      itemsCount: t.items_count || 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
    return {
      receivePending: normalize(d.receive_pending),
      myRequests: normalize(d.my_requests),
      disputePending: normalize(d.dispute_pending),
      approvalPending: normalize(d.approval_pending),
    };
  },

  transferDetails(response) {
    const d = response?.data || response || {};
    const t = d.transfer || {};
    const lines = (d.lines || []).map(l => {
      let segments = [];
      try {
        const meta = typeof l.meta_json === 'string' ? JSON.parse(l.meta_json) : l.meta_json;
        segments = meta?.segments || [];
      } catch {}
      return {
        id: l.id,
        lineNo: l.line_no,
        stockTitle: l.source_stock_title,
        categoryId: l.source_category_id,
        requestedQty: l.requested_qty,
        requestedUnit: l.requested_unit,
        displayQty: l.quantity_display,
        displayUnit: l.display_unit,
        status: l.status,
        segments,
      };
    });
    return {
      transfer: {
        id: t.id,
        referenceCode: t.reference_code,
        status: t.status,
        type: t.type,
        fromRestaurantId: t.from_restaurant_id,
        toRestaurantId: t.to_restaurant_id,
        dispatchedBy: t.dispatched_by,
        dispatchedAt: t.dispatched_at,
        receivedAt: t.received_at,
        resolutionType: t.resolution_type,
      },
      lines,
    };
  },
};
```

### Edit 4: `pages/InventoryReceivePage.jsx` — NEW

Follows same pattern as other inventory pages. Include Sidebar + panel.

### Edit 5: `App.js` — Add route

```jsx
<Route path="/inventory-receive" element={<ProtectedRoute><InventoryReceivePage /></ProtectedRoute>} />
```

### Edit 6: `components/inventory/ReceiveStockPanel.jsx` — NEW (~200 lines)

**EXACT mockup design — element by element:**

**Header:**
- Truck icon (lucide `Truck`, orange, w-6 h-6) + "Receive Dispatched Stock" (text-2xl font-bold font-[Poppins])
- Subtitle: "{RestaurantName} (Franchise) · dispatched from parent restaurant #{parentId}"
- Right: info text "This screen only appears when restaurant_type_flag = franchise|master"

**Tabs (Phase 1: 2 active, 2 disabled):**
- Container: `bg-white rounded-t-xl border border-pos-border border-b-0 px-4 pt-3 flex gap-1`
- "Receive Pending" tab: `px-4 py-2 text-sm font-semibold border-b-2 border-brand-orange text-brand-orange` + count badge `text-[10px] bg-brand-orange text-white px-1.5 py-0.5 rounded-full`
- "My Requests" tab: same structure, gray when inactive
- "Dispute Pending" + "Approval Pending": rendered but disabled (Phase 2) — gray with count 0

**Queue Table:**
- Container: `bg-white rounded-b-xl border border-pos-border overflow-hidden mb-4`
- Header: `bg-[#FAFAFA] border-b border-pos-border text-[11px] uppercase text-pos-gray tracking-wider`
- Columns: Reference | From | Dispatched | Lines / Items | Status | Actions
- Row: `hover:bg-gray-50 cursor-pointer`
  - Reference: `font-semibold text-brand-orange font-mono` + `text-[11px] text-pos-gray` ID below
  - From: `font-medium` name + `text-[11px] text-pos-gray` "Restaurant #ID"
  - Dispatched: `text-center text-pos-gray text-xs` formatted date
  - Lines/Items: `font-semibold` count + "lines · items"
  - Status badge: `px-2 py-1 rounded-full text-xs font-semibold` — blue-100/blue-700 for "Dispatched", green-100/green-700 for "Received", red-100/red-700 for "Rejected"
  - Actions: `text-brand-orange text-sm font-semibold hover:underline` "Open Drawer →"

**Empty state:** "No pending transfers" centered italic text

### Edit 7: `components/inventory/ReceiveDrawer.jsx` — NEW (~150 lines)

**EXACT mockup design:**

**Drawer container:** `bg-white rounded-xl border-2 border-brand-orange p-5 mb-4`

**Header:**
- PackageOpen icon (orange) + reference code (font-bold text-lg) + status badge
- Subtitle: "Dispatched by {name} (parent {parentName} · #{parentId}) on {date} · {lineCount} lines"
- Close button (X icon) top-right

**Line Items Table:**
- Header: `text-[11px] uppercase tracking-wider text-pos-gray border-b border-pos-border`
- Columns: Item | Requested | Batch · Expiry | Received Qty (Phase 1: read-only, shows requested) | Line Action (Phase 1: N/A — bulk action only)
- Item cell: `font-medium` name + `text-[11px] text-pos-gray` "Line N · Category: X"
- Requested: `text-right font-medium` "1.00 kg (1000 gm)"
- Batch: `text-xs font-mono` batch code + `text-[11px] text-pos-gray` "exp: Month DD, YYYY"
- Received Qty (Phase 1): Read-only display matching requested qty + `text-[10px] text-pos-gray` "unit: kg · fully received"
- Line Action (Phase 1): Empty or "—" (per-line actions deferred to Phase 2)

**Bulk Actions Footer:**
- Container: `flex items-center justify-between p-3 bg-[#FAFAFA] rounded-lg`
- Left: info text with endpoint reference
- Right: Cancel button (`border border-pos-border rounded-lg text-sm font-medium text-pos-gray`) + "Confirm Receive" button (`bg-brand-orange text-white rounded-lg text-sm font-semibold`) OR "Reject All" button (`bg-white border border-pos-error text-pos-error rounded-lg text-sm font-semibold`)

**Phase 1 simplification vs mockup:**
- No per-line Accept/Dispute/Reject buttons (Phase 2)
- No editable Received Qty input (Phase 2)
- No "Short by X" warnings (Phase 2)
- Only bulk "Confirm Receive" (full accept) + "Reject All" at bottom

---

## Verification Matrix

| # | What | How to Verify |
|---|------|---------------|
| 1 | Route `/inventory-receive` renders ReceiveStockPanel | Browser: navigate to URL |
| 2 | Sidebar "Receive" pill navigates to correct route | Click sidebar Receive → loads page |
| 3 | Receive pill hidden for Kunafa Mahal (normal) | Login as kunafamahal → no Receive in sidebar |
| 4 | Receive pill visible for Palm India (franchise) | Login as palmindia → Receive visible |
| 5 | Pending queues load with real data | Palm India sees receive_pending transfers |
| 6 | Tab counts match API response | Badge numbers match pending-queues data |
| 7 | Queue table renders with correct columns/styling | Visual match to mockup |
| 8 | Click row opens drawer with transfer details | Click → drawer expands with line items |
| 9 | Drawer shows batch + expiry from meta_json.segments | Correct batch codes + dates |
| 10 | "Confirm Receive" calls POST receive/{id} → success | Network tab: POST → 200 |
| 11 | "Reject All" calls POST reject/{id} with reason → success | Network tab: POST → 200 |
| 12 | After receive/reject, queue refreshes (item disappears) | Item removed from list |
| 13 | My Requests tab shows transfer history | Switch tab → see past transfers |
| 14 | Compile check | 0 new warnings |

---

## Post-Code Registry Checklist

- [ ] registry.json: CR-077 → IMPLEMENTED (Phase 1), sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: 5 new files + 2 modified files listed
- [ ] Code markers: // CR-077 in every file
- [ ] constants.js: INVENTORY_TRANSFER_ENDPOINTS added

---

## Estimation

- New files: 5 (~450 lines total)
- Modified files: 2 (~9 lines)
- Total: ~460 lines
- Complexity: MEDIUM (greenfield, well-defined API, no hotspot files)

---

**Next:** Owner Gate 4 GO → Implementation
