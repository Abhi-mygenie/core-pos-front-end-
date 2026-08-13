# POS2.0 Wave 1 Code Change Preview — 2026-05-17

## Purpose

This document provides exact code-level change previews for each approved Wave 1 bug. **No source files have been modified.** This is the final approval gate before implementation.

---

## BUG-062 — Hide "To Room" Button for Takeaway/Delivery

### 1. Exact file
`frontend/src/components/order-entry/CollectPaymentPanel.jsx`

### 2. Exact component / logic area
`CollectPaymentPanel` component, JSX render — line 1953, the To Room button render gate.

### 3. Current logic summary
```jsx
// Line 1952-1953
{/* To Room Button - only for non-room postpaid orders with rooms available (hidden for prepaid/Place+Pay) */}
{!isRoom && hasRooms && hasPlacedItems && (
```
The gate checks three conditions: not a room order, rooms exist, and order has placed items. It does **not** check `orderType`, so the button renders for takeaway and delivery orders.

### 4. Proposed code change summary
Add `orderType` condition to restrict To Room to dine-in and walk-in only.

### 5. Diff-style preview
```diff
 // Line 1952-1953
-{/* To Room Button - only for non-room postpaid orders with rooms available (hidden for prepaid/Place+Pay) */}
-{!isRoom && hasRooms && hasPlacedItems && (
+{/* To Room Button - only for dine-in/walk-in non-room postpaid orders with rooms available (hidden for prepaid/Place+Pay, takeaway, delivery) */}
+{!isRoom && hasRooms && hasPlacedItems && (orderType === 'dineIn' || orderType === 'walkIn') && (
```

### 6. Isolated or shared logic?
**Isolated.** Single JSX render gate. `orderType` is already a prop of `CollectPaymentPanel` (declared at line 29). No shared logic touched.

### 7. Risk
**LOW.** Single condition addition. No financial, payload, or API changes. `orderType` prop already available in scope.

### 8. QA check
- Takeaway order → To Room button **hidden**
- Delivery order → To Room button **hidden**
- Dine-in order with rooms → To Room button **visible**
- Walk-in order with rooms → To Room button **visible**
- Room order → To Room button already hidden (`!isRoom` existing gate)

---

## BUG-073 — Empty Customization Wrapper Fix

### 1. Exact file
`frontend/src/components/order-entry/CartPanel.jsx`

### 2. Exact component / logic area
`CartPanel` component — two locations:
- **Location A:** Line 65 (unplaced cart items section) — render gate for `item.customizations`
- **Location B:** Line 192 (placed/API items section) — same pattern, no `!isCancelled` guard here

### 3. Current logic summary
```jsx
// Location A — Line 65
{item.customizations && !isCancelled && (
  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
    {item.customizations.size && <span>{item.customizations.size}</span>}
    {item.customizations.variants?.length > 0 && <span>...</span>}
    {item.customizations.addons?.length > 0 && <span>...</span>}
  </div>
)}

// Location B — Line 192
{item.customizations && (
  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
    {item.customizations.size && <span>{item.customizations.size}</span>}
    {item.customizations.variants?.length > 0 && <span>...</span>}
    {item.customizations.addons?.length > 0 && <span>...</span>}
  </div>
)}
```
Both render the outer `<div>` whenever `item.customizations` is truthy, even when all three children (size, variants, addons) are empty/null. This produces an empty green-tinted line.

### 4. Proposed code change summary
Add a content-presence sub-check so the outer `<div>` only renders when there is actual content to display.

### 5. Diff-style preview
```diff
 // Location A — Line 65
-{item.customizations && !isCancelled && (
+{item.customizations && !isCancelled && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (

 // Location B — Line 192
-{item.customizations && (
+{item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
```

### 6. Isolated or shared logic?
**Isolated.** Two render gates in the same component. No shared utilities, no payload impact.

### 7. Risk
**LOW.** Additive condition. The three children (`size`, `variants`, `addons`) are already individually guarded — this just prevents the empty wrapper from rendering.

### 8. QA check
- Item with size "Large" → green line shows "Large"
- Item with variants ["Cheese", "Bacon"] → green line shows "Cheese, Bacon"
- Item with addons ["Fries"] → green line shows "+ Fries"
- Item with empty customizations `{ size: null, variants: [], addons: [] }` → **no empty line**
- Item without customizations property → no line (unchanged)
- Cancelled item → no line (unchanged)

---

## BUG-066 — Food Transfer Exclude Rooms from Destination List

### 1. Exact file
`frontend/src/components/order-entry/TransferFoodModal.jsx`

### 2. Exact component / logic area
`TransferFoodModal` component — `occupiedOrders` useMemo filter at lines 16-22.

### 3. Current logic summary
```jsx
// Lines 16-22
const occupiedOrders = useMemo(() => {
  return orders.filter(
    (o) => o.orderId !== currentTable?.orderId &&
           (o.orderType === 'dineIn' || o.isWalkIn) &&
           o.paymentType !== 'prepaid'
  );
}, [orders, currentTable?.orderId]);
```
The filter allows `orderType === 'dineIn'` which **includes room orders** because rooms have `orderType === 'dineIn'` AND `isRoom === true`. Rooms should not be food transfer destinations.

### 4. Proposed code change summary
Add `&& !o.isRoom` to exclude room orders from the destination list.

### 5. Diff-style preview
```diff
 // Lines 16-22
 const occupiedOrders = useMemo(() => {
   return orders.filter(
     (o) => o.orderId !== currentTable?.orderId &&
            (o.orderType === 'dineIn' || o.isWalkIn) &&
-           o.paymentType !== 'prepaid'
+           o.paymentType !== 'prepaid' &&
+           !o.isRoom
   );
 }, [orders, currentTable?.orderId]);
```

### 6. Isolated or shared logic?
**Isolated.** Single filter in one modal component. `isRoom` is a standard property on order objects (set by `orderTransform.js` during from-API mapping). No payload, financial, or state changes.

### 7. Risk
**LOW.** Single condition addition. The `isRoom` property is already used throughout the codebase (CollectPaymentPanel L23, L73, L140, L148, L162, etc.).

### 8. QA check
- Food transfer modal → room orders **NOT** in destination list
- Food transfer modal → regular dine-in tables **visible**
- Food transfer modal → walk-in orders **visible**
- Food transfer modal → takeaway/delivery **already excluded** (existing `orderType` filter)
- Food transfer modal → prepaid orders **already excluded** (existing filter)

---

## BUG-067 — Station View Toggle Disabled When No Stations

### 1. Exact file
`frontend/src/pages/StatusConfigPage.jsx`

### 2. Exact component / logic area
Two locations:
- **Location A:** `toggleStationViewEnabled` handler at lines 339-345
- **Location B:** Station View toggle button JSX at lines 767-780

### 3. Current logic summary
```jsx
// Location A — Lines 339-345 (handler)
const toggleStationViewEnabled = () => {
  setStationViewConfig(prev => ({
    ...prev,
    enabled: !prev.enabled,
  }));
  setHasChanges(true);
};

// Location B — Lines 767-780 (button)
<button
  data-testid="station-view-toggle"
  onClick={toggleStationViewEnabled}
  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
  style={{
    backgroundColor: stationViewConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
    color: 'white',
  }}
>
  {stationViewConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
  <span className="text-sm font-medium">
    {stationViewConfig.enabled ? 'Enabled' : 'Disabled'}
  </span>
</button>
```
The toggle is always clickable. `availableStations` (from `useStations()` context, line 126) holds the list of stations from bootstrap data. When empty, enabling station view has no effect (no stations to display).

### 4. Proposed code change summary
Add `disabled` prop and `opacity` style to the toggle button when `availableStations.length === 0`. Add a helper text below the subtitle explaining "No stations configured" when disabled. Also add a `title` tooltip on the button.

### 5. Diff-style preview
```diff
 // Location B — Lines 766-780 (button)
+const noStations = availableStations.length === 0;
+
 {/* Enable/Disable Toggle */}
 <button
   data-testid="station-view-toggle"
-  onClick={toggleStationViewEnabled}
-  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
+  onClick={noStations ? undefined : toggleStationViewEnabled}
+  disabled={noStations}
+  title={noStations ? 'No stations available — configure stations in your product catalog first' : ''}
+  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${noStations ? 'opacity-50 cursor-not-allowed' : ''}`}
   style={{
-    backgroundColor: stationViewConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
+    backgroundColor: noStations ? COLORS.borderGray : stationViewConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
     color: 'white',
   }}
 >
-  {stationViewConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
+  {stationViewConfig.enabled && !noStations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
   <span className="text-sm font-medium">
-    {stationViewConfig.enabled ? 'Enabled' : 'Disabled'}
+    {noStations ? 'No Stations' : stationViewConfig.enabled ? 'Enabled' : 'Disabled'}
   </span>
 </button>
```

### 6. Isolated or shared logic?
**Isolated.** UI-only change on StatusConfigPage. `availableStations` is read-only from context. No state mutations, no localStorage changes, no API calls affected.

### 7. Risk
**LOW.** Pure UI disable. If `availableStations` later populates (e.g., products change), the toggle re-enables automatically on next render.

### 8. QA check
- Restaurant with 0 stations → toggle shows "No Stations", disabled, grayed out, tooltip on hover
- Restaurant with stations → toggle works normally (Enabled/Disabled)
- Switch from 0→N stations (product catalog change) → toggle re-enables after page re-render

---

## BUG-079 — Polling Threshold: 1-Miss Removal

### 1. Exact file
`frontend/src/hooks/useOrderPollingReconciliation.js`

### 2. Exact component / logic area
Three locations:
- **Location A:** Comment at line 13 — anti-rule description
- **Location B:** Constant at line 34 — `REMOVAL_MISS_THRESHOLD`
- **Location C:** Comment at line 201 — removal confirmation comment

### 3. Current logic summary
```js
// Location A — Line 13
//   - Two consecutive missing polls required before removal

// Location B — Line 34
export const REMOVAL_MISS_THRESHOLD = 2;          // two consecutive misses

// Location C — Lines 200-201
if (nextMisses >= REMOVAL_MISS_THRESHOLD) {
  // Confirmed orphan after two consecutive missing polls.
```
The reconciliation loop at lines 198-219 increments a per-order miss counter. At threshold 2, the order must be absent from **two** consecutive poll responses (~120s) before removal. At threshold 1, removal happens after the **first** missed poll (~60s).

### 4. Proposed code change summary
Change constant from `2` to `1`. Update three comments to reflect "one miss" instead of "two misses".

### 5. Diff-style preview
```diff
 // Location A — Line 13
-//   - Two consecutive missing polls required before removal
+//   - One missing poll required before removal (owner-approved trade-off: BUG-079)

 // Location B — Line 34
-export const REMOVAL_MISS_THRESHOLD = 2;          // two consecutive misses
+export const REMOVAL_MISS_THRESHOLD = 1;          // one miss (BUG-079: owner accepted faster removal trade-off)

 // Location C — Line 201
-        // Confirmed orphan after two consecutive missing polls.
+        // Confirmed orphan after one missing poll (BUG-079).
```

### 6. Isolated or shared logic?
**Isolated.** Single exported constant + comments. The comparison at line 200 (`nextMisses >= REMOVAL_MISS_THRESHOLD`) is untouched — the logic works identically, just with a lower threshold.

### 7. Risk
**LOW.** Owner has explicitly accepted the trade-off: faster removal (~60s) with slightly higher chance of momentary false-positive if a single poll response is delayed. Socket re-add compensates immediately.

All protections preserved:
- Hold orders (fOrderStatus 9) → still skipped (line 180-188)
- Engaged orders → still skipped (line 190-195)
- POLL-001 (60s interval) → unchanged
- POLL-004 (open-order skip) → unchanged

### 8. QA check
- Remove order server-side → disappears from dashboard after ~60s (one poll cycle)
- Hold order (fOrderStatus 9) → **not** removed by polling
- Order open in Order Entry → **not** removed (engaged-order skip)
- Socket-delivered orders → still appear in real-time
- Two quick poll cycles with transient server lag → order removed on first miss, re-added by socket if still active

---

## BUG-078 — CRM Timeout Error Visibility (Toast)

### 1. Exact file(s)
- **Primary:** `frontend/src/api/services/customerService.js`
- **Secondary (caller):** `frontend/src/components/order-entry/CustomerModal.jsx`

### 2. Exact component / logic area
- `customerService.lookupCustomer` function (lines 40-49) — error handling in catch block
- `CustomerModal` component (line 74) — the caller that invokes `lookupCustomer`

### 3. Current logic summary
```js
// customerService.js — Lines 40-49
export const lookupCustomer = async (phone) => {
  if (!phone?.trim()) return null;
  try {
    const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, { phone: phone.trim() });
    if (!response.data?.success || !response.data?.data?.registered) return null;
    return fromAPI.customerLookup(response.data.data);
  } catch (err) {
    console.warn('[CRM] Customer lookup failed:', err.readableMessage || err.message);
    return null;  // Silently returns null — no distinction between timeout and not-found
  }
};

// CustomerModal.jsx — Line 74 (caller)
const existing = await lookupCustomer(phone.trim());
// If null → treats as "not found" → allows create
```
**Problem:** CRM timeout (15s, configured in `crmAxios.js` L49) returns `null` just like "not found". Cashier gets no feedback that CRM is unreachable — they see "customer not found" behavior even when the customer might exist.

### 4. Proposed code change summary
**In `customerService.js`:** Detect timeout errors in the catch block using `err.code === 'ECONNABORTED'` (Axios timeout code) or `err.code === 'ERR_NETWORK'`. Instead of silently returning `null`, throw a typed error object `{ type: 'CRM_TIMEOUT', message: '...' }` so the caller can distinguish.

**In `CustomerModal.jsx`:** Wrap the `lookupCustomer` call with a try/catch. On `CRM_TIMEOUT` error, show a toast "CRM is not responding. You can proceed with manual entry or try again." and allow the cashier to continue (same as null — create/manual path open). On other errors, preserve current behavior.

### 5. Diff-style preview
```diff
 // customerService.js — Lines 40-49
 export const lookupCustomer = async (phone) => {
   if (!phone?.trim()) return null;
   try {
     const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, { phone: phone.trim() });
     if (!response.data?.success || !response.data?.data?.registered) return null;
     return fromAPI.customerLookup(response.data.data);
   } catch (err) {
-    console.warn('[CRM] Customer lookup failed:', err.readableMessage || err.message);
-    return null;
+    // BUG-078: Distinguish timeout from other failures
+    const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
+    console.warn(`[CRM] Customer lookup ${isTimeout ? 'timed out' : 'failed'}:`, err.readableMessage || err.message);
+    if (isTimeout) {
+      const timeoutErr = new Error('CRM is not responding. You can proceed with manual entry.');
+      timeoutErr.type = 'CRM_TIMEOUT';
+      throw timeoutErr;
+    }
+    return null;
   }
 };
```

```diff
 // CustomerModal.jsx — Around line 73-75 (inside handleSubmit)
-      const existing = await lookupCustomer(phone.trim());
-      if (existing) {
+      let existing = null;
+      try {
+        existing = await lookupCustomer(phone.trim());
+      } catch (lookupErr) {
+        if (lookupErr.type === 'CRM_TIMEOUT') {
+          // BUG-078: Show toast, allow manual proceed
+          toast({
+            title: 'CRM Timeout',
+            description: lookupErr.message,
+            variant: 'destructive',
+            duration: 5000,
+          });
+          // Fall through — existing remains null, allows create/manual path
+        } else {
+          throw lookupErr; // Re-throw unexpected errors
+        }
+      }
+      if (existing) {
```

### 6. Isolated or shared logic?
**Partially shared.** `lookupCustomer` is called from one place only (`CustomerModal.jsx` L74). The `crmAxios.js` interceptor (L66-78) is NOT modified — it already attaches `readableMessage`. The change adds a new throw path in `lookupCustomer` that only the known caller handles.

**Import needed in CustomerModal.jsx:** `useToast` hook — check if already imported.

### 7. Risk
**LOW-MEDIUM.**
- The new `throw` in `lookupCustomer` changes the function's contract: it previously never threw (always returned `null`). Any future callers must handle the throw. Currently there is exactly one caller.
- The toast import in CustomerModal.jsx needs verification (may already be present via parent).
- Network errors (`ERR_NETWORK`) are treated same as timeout — this covers WiFi drops, DNS failures, etc. which is appropriate (same user experience: CRM unreachable).
- "Not found" (HTTP 200 with `registered: false`) still returns `null` silently — **no change** to that path.

### 8. QA check
- CRM timeout (15s network delay) → toast "CRM is not responding..." → cashier can create new customer
- CRM "not found" (valid phone, no match) → **no** toast, null returned, create path works normally
- CRM success (customer found) → customer returned, no toast
- CRM network error (WiFi off) → toast shows, manual entry allowed
- After toast → cashier can still fill in name/phone and save (create new customer)
- No retry button (per owner direction: "toast / no retry / proceed")

---

## BUG-072 — Notes Display on Order Card

### 1. Exact file
`frontend/src/components/cards/OrderCard.jsx`

### 2. Exact component / logic area
`OrderCard` component — header section (L425-436) and item rendering section (L489-533).

### 3. Current logic summary
**Already implemented:**
- **Order note:** L426-436 renders `order.orderNote` in a header row with FileText icon — ✅
- **Item notes:** L490 extracts `item.notes`, L526-530 renders inline with FileText icon — ✅

**Analysis finding:** The order transform (`orderTransform.js`) maps:
- `orderNote` from `api.order_note` (L272) — captures order-level notes
- `item.notes` from `detail.food_level_notes` (L130) — captures item-level notes
- **No** `tableNote` or `roomNote` fields exist in the transform or API schema (confirmed by repo-wide grep: zero matches)

**Master plan audit correction:** "Mirror the existing order-screen note format on the order card. Do not invent backend fields."

**Conclusion:** The current OrderCard already displays all available note data. The order-screen (OrderEntry) shows notes via a button + modal, while the OrderCard shows them inline — but the data content is identical. The only difference is formatting/visual style.

### 4. Proposed code change summary
Since `orderNote` and `item.notes` are already rendered, and `table_note`/`room_note` don't exist in the data model, the change is a **format alignment** to ensure the card note display mirrors the order-screen style:

1. Verify `orderNote` rendering format — already uses FileText icon + text. **No change needed.**
2. Verify `item.notes` rendering — already inline with FileText icon. **No change needed.**
3. Add a subtle visual separator or label to distinguish order-level notes from item-level notes — to match the order-screen's note button pattern. This is purely cosmetic.

**If the current display is satisfactory to the owner, no code change is needed for BUG-072.** The notes are already showing. The "room notes, table notes" mentioned in the bug intake do not exist as separate backend fields — they are all captured in `order_note`.

### 5. Diff-style preview
**Option A: No code change needed** (current implementation already matches available data)

The order card already renders:
```jsx
// Header Row 3 — order note (L426-436)
{order.orderNote && (
  <div className="px-3 pb-2 flex items-start gap-1.5" style={{ backgroundColor: getHeaderBgColor() }}>
    <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
    <span className="text-xs" style={{ color: COLORS.darkText }}>{order.orderNote}</span>
  </div>
)}

// Per-item notes (L526-530)
{itemNote && (
  <div className="flex items-center gap-1 text-[9px] leading-tight">
    <FileText className="w-2 h-2" style={{ color: COLORS.grayText }} />
    <span className="italic" style={{ color: COLORS.grayText }}>{itemNote}</span>
  </div>
)}
```

**Option B: Minor label enhancement** (if owner wants clearer note category labels)
```diff
 // Header Row 3 — order note (L426-436)
 {order.orderNote && (
   <div className="px-3 pb-2 flex items-start gap-1.5" style={{ backgroundColor: getHeaderBgColor() }}>
     <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
-    <span className="text-xs" style={{ color: COLORS.darkText }}>{order.orderNote}</span>
+    <span className="text-xs" style={{ color: COLORS.darkText }}>
+      <span className="font-medium" style={{ color: COLORS.primaryOrange }}>Note: </span>
+      {order.orderNote}
+    </span>
   </div>
 )}
```

### 6. Isolated or shared logic?
**Isolated.** Display-only in `OrderCard.jsx`. No data flow, payload, or state changes.

### 7. Risk
**LOW.** Option A = zero risk (no change). Option B = cosmetic-only label addition.

### 8. QA check
- Order with order note → note visible on card header (with or without "Note:" prefix)
- Order with item notes → notes visible inline per item
- Order with no notes → no extra empty lines
- Note content matches what's shown on order screen (OrderEntry) — same `orderNote` text

---

## Summary

| Bug | Files Changed | Lines Changed | Risk | Isolated? |
|---|---|---|---|---|
| BUG-062 | `CollectPaymentPanel.jsx` | 2 (condition + comment) | LOW | Yes |
| BUG-073 | `CartPanel.jsx` | 2 (two render gates) | LOW | Yes |
| BUG-066 | `TransferFoodModal.jsx` | 1 (filter condition) | LOW | Yes |
| BUG-067 | `StatusConfigPage.jsx` | ~8 (button props + label) | LOW | Yes |
| BUG-079 | `useOrderPollingReconciliation.js` | 3 (constant + comments) | LOW | Yes |
| BUG-078 | `customerService.js` + `CustomerModal.jsx` | ~20 (error detection + toast) | LOW-MED | Partially shared |
| BUG-072 | `OrderCard.jsx` | 0-2 (already implemented or minor label) | LOW | Yes |

**Total files touched:** 6-7
**Total lines changed:** ~36
**Cross-file dependencies:** BUG-078 only (service → modal)
**Financial/payment/print impact:** NONE
**API contract changes:** NONE
**Backend changes required:** NONE

---

## Final Status

`wave_1_code_change_preview_created_pending_final_approval`

- No source files modified
- No `/app/memory/final/` updated
- No pending freeze docs updated
- No deployment
- No bugs marked fixed
