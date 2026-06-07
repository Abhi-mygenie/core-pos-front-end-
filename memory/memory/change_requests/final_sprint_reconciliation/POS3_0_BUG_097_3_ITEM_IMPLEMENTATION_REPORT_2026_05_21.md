# POS3.0 BUG-097 — 3-Item Implementation Report — 2026-05-21

> **Patch type:** Frontend-only, label/branching, no API/state/socket changes.
> **Scope source:** `POS3_0_BUG_097_FINAL_PLANNING_COMPLETION_2026_05_21.md` §10 + `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md` §7.
> **Status:** IMPLEMENTED — pending owner smoke QA.
> **Build:** PASS (`yarn build` Done in 18.41s, 0 errors, 1 pre-existing unrelated eslint warning).
> **Bundle size:** `main.3a5d4052.js` 452.31 kB (gzipped) — was 441.01 kB → +11.30 kB (label string + branching JSX).
> **/app/memory/final/ updated:** NO.

---

## 1. Scope (exactly the 3 items)

| # | Item | File | Change |
|---|---|---|---|
| 1 | CartPanel label | `src/components/order-entry/CartPanel.jsx` | Delivery branch `"Delivered"` → `"Collect Bill"` |
| 2 | Reassign branching (OrderCard) | `src/components/cards/OrderCard.jsx` | Sub-branch `hasRiderAssigned` on `order.riderStatus` |
| 2 | Reassign branching (TableCard) | `src/components/cards/TableCard.jsx` | Sub-branch `hasRiderAssigned` on `table.order?.riderStatus` |
| 3 | Rider pill rename | `src/components/cards/OrderCard.jsx` | Pill literal `"Reached"` → `"Order Accepted"` (data value `'riderReached'` unchanged) |

No other file was touched.

---

## 2. File-Level Diff Summary

### 2A. `src/components/order-entry/CartPanel.jsx` (L1266 area)

**Before:**
```jsx
<span>{isRoom ? 'Checkout' : orderType === 'delivery' ? 'Delivered' : 'Collect Bill'}</span>
```

**After:**
```jsx
{/* BUG-097 (2026-05-21): delivery orders now use "Collect Bill" (was "Delivered") */}
<span>{isRoom ? 'Checkout' : 'Collect Bill'}</span>
```

- Room order → `Checkout` (unchanged).
- Dine-in / takeaway → `Collect Bill` (unchanged).
- Delivery → now `Collect Bill` (was `Delivered`).

### 2B. `src/components/cards/OrderCard.jsx` (L920–947 area, hasRiderAssigned branch)

**Before:** flat disabled `Waiting for Rider` regardless of `riderStatus`.

**After:** sub-branched on `order.riderStatus`:

```jsx
order.riderStatus === 'riderAssigned' ? (
  <button
    data-testid={`waiting-rider-btn-${orderId}`}
    className="... opacity-50 cursor-default"
    style={{ ...orange theme... }}
    disabled
  >
    Waiting for Rider
  </button>
) : (
  <button
    data-testid={`reassign-rider-btn-${orderId}`}
    className={`... ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
    style={{ ...orange theme... }}
    onClick={() => setShowAssignRider(true)}
    disabled={isActionInProgress}
  >
    Reassign
  </button>
)
```

- `setShowAssignRider` setter and `<AssignRiderModal>` mount already exist (L988–L1005). No new state, no new prop.
- Styling matches the existing Assign Rider button (orange theme).

### 2C. `src/components/cards/TableCard.jsx` (L470–502 area)

**Before:** flat disabled `Waiting..` regardless of `riderStatus`.

**After:** sub-branched on `table.order?.riderStatus`:

```jsx
table.order?.riderStatus === 'riderAssigned' ? (
  <TextButton
    testId={`waiting-rider-btn-${table.id}`}
    backgroundColor="#FFF3E8"
    textColor={COLORS.primaryOrange}
    borderColor={COLORS.primaryOrange}
    className="... opacity-50 cursor-default"
    disabled
  >
    Waiting..
  </TextButton>
) : (
  <TextButton
    onClick={(e) => { e?.stopPropagation?.(); setShowAssignRider(true); }}
    testId={`reassign-rider-btn-${table.id}`}
    backgroundColor="#FFF3E8"
    textColor={COLORS.primaryOrange}
    borderColor={COLORS.primaryOrange}
    className="..."
    disabled={isActionInProgress}
  >
    Reassign
  </TextButton>
)
```

- Uses `table.order?.riderStatus` (optional chaining mirrors the existing `table.order?` pattern).
- Modal already mounted at L594. `setShowAssignRider` setter already exists.
- `e.stopPropagation()` preserved to match the existing Assign button click behavior on the table tile.

### 2D. `src/components/cards/OrderCard.jsx` (L788–796, rider pill)

**Before:**
```jsx
{order.riderStatus === 'riderReached' && (
  <span … data-testid={`rider-status-reached-${orderId}`}>
    Reached
  </span>
)}
```

**After:**
```jsx
{order.riderStatus === 'riderReached' && (
  <span … data-testid={`rider-status-reached-${orderId}`}>
    {/* BUG-097 (2026-05-21): pill label "Reached" → "Order Accepted" (data value unchanged) */}
    Order Accepted
  </span>
)}
```

- Only the displayed string changes.
- The `riderStatus` data value `'riderReached'` and the `data-testid` are unchanged (per planning doc §10 step 4).

---

## 3. What Was NOT Changed (explicit exclusion list)

| Excluded | Status |
|---|---|
| `DeliveryCard.jsx` | UNTOUCHED |
| `src/api/socket/socketHandlers.js` | UNTOUCHED |
| `src/api/socket/socketEvents.js` | UNTOUCHED |
| `src/api/services/deliveryService.js` | UNTOUCHED |
| `src/api/constants.js` | UNTOUCHED |
| `src/api/transforms/orderTransform.js` | UNTOUCHED |
| `src/api/transforms/profileTransform.js` | UNTOUCHED |
| `src/components/modals/AssignRiderModal.jsx` | UNTOUCHED |
| Non-delivery card behavior (Serve / Bill / room Checkout) | UNTOUCHED |
| CartPanel `disabled` rules / totals / validation logic | UNTOUCHED |
| Bucket 5 (rider accept/reject sockets, rejected-rider grey-out, "Rider On The Way", dashboard auto-removal) | NOT IMPLEMENTED — backend-blocked |
| `/app/memory/final/` | NOT UPDATED |
| Baseline docs | NOT UPDATED |
| PROD-BUG-001 / 002 / 003, BUG-099, BUG-104 | NOT TOUCHED |

---

## 4. Build Verification

```
$ cd /app/frontend && CI=false yarn build
$ craco build
Creating an optimized production build...
Compiled with warnings.

[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1259:6:  React Hook useCallback has an unnecessary dependency: 'printOrder'.
                ← pre-existing, unrelated to BUG-097

File sizes after gzip:
  452.31 kB  build/static/js/main.3a5d4052.js
  16.68 kB   build/static/css/main.7689dfef.css

Done in 18.41s.
```

- Build status: **PASS** (0 errors).
- Single warning is in `OrderEntry.jsx` and is pre-existing; not touched by this patch.

---

## 5. Field-Behavior Truth Table (post-patch)

| Surface | `delivery_assign` | `hasRiderAssigned` | `riderStatus` | fOS | Output |
|---|---|---|---|---|---|
| OrderCard | any | false | — | 2, isDelivery, deliveryAssign=true | `Assign Rider` (orange) |
| OrderCard | any | false | — | 2, isDelivery, deliveryAssign=false | `Dispatch` (orange) |
| OrderCard | any | true | `riderAssigned` | 2, isDelivery | **`Waiting for Rider`** (disabled, orange) |
| OrderCard | any | true | other (e.g. `riderReached`) | 2, isDelivery | **`Reassign`** (clickable, orange, opens AssignRiderModal) |
| OrderCard | — | — | — | 2, !isDelivery | `Serve` (green) — unchanged |
| OrderCard | — | — | — | 5 | `Bill` / `Settle` — unchanged |
| OrderCard rider chip | — | true | `riderAssigned` | — | Pill: **`Assigned`** (orange) — unchanged |
| OrderCard rider chip | — | true | `riderReached` | — | Pill: **`Order Accepted`** (green) — was "Reached" |
| TableCard | true | false | — | 2, isDelivery | `Assign` |
| TableCard | false | false | — | 2, isDelivery | `Dispatch` |
| TableCard | any | true | `riderAssigned` | 2, isDelivery | **`Waiting..`** (disabled) |
| TableCard | any | true | other (e.g. `riderReached`) | 2, isDelivery | **`Reassign`** (clickable, opens AssignRiderModal) |
| TableCard | — | — | — | 5 | `Bill` / `C/Out` — unchanged |
| CartPanel | room | — | — | settlement | `Checkout` — unchanged |
| CartPanel | delivery | — | — | settlement | **`Collect Bill`** (was `Delivered`) |
| CartPanel | dine-in / takeaway | — | — | settlement | `Collect Bill` — unchanged |

---

## 6. Risk Assessment (post-implementation)

| Item | Risk | Reasoning |
|---|---|---|
| 1. CartPanel label | LOW | Single ternary collapsed; no logic change. Room and non-delivery branches preserved. |
| 2. Reassign branching | LOW | Branching added inside the existing delivery-only sub-tree. `setShowAssignRider` setter and modal mount already exist on both cards. Non-delivery Serve path unchanged. |
| 3. Pill rename | LOW | Single string change. Data value `'riderReached'` and `data-testid` preserved. |

No new API calls. No new sockets. No new context fields. No new state. No new imports.

---

## 7. Lint / Type-Check

- `yarn build` invokes CRA's webpack + eslint pipeline. Result: 0 errors, 1 pre-existing unrelated warning.
- No new eslint warnings introduced by this patch.

---

## 8. Pending After This Patch

- Owner smoke QA per `POS3_0_BUG_097_3_ITEM_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` (created alongside this report).
- Bucket 5 (still backend-blocked).

---

## 9. Files Changed (final list)

```
src/components/order-entry/CartPanel.jsx                 (1 line + 1 comment line)
src/components/cards/OrderCard.jsx                       (Waiting branch sub-branched; pill string)
src/components/cards/TableCard.jsx                       (Waiting branch sub-branched)
```

3 files. No deletions. No renames. No new files.

---

## Document Metadata

| Field | Value |
|---|---|
| Version | 1.0 |
| Created | 2026-05-21 |
| Build | PASS (`craco build` Done in 18.41s) |
| Implementation type | label/branching, frontend-only |
| Tests added | none (label/branching only — covered by owner smoke checklist) |
| Backend dependency | none |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |
