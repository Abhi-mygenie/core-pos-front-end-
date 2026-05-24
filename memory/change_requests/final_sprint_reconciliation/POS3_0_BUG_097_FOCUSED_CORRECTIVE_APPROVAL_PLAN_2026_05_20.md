# POS3.0 BUG-097 Focused Corrective Approval Plan — 2026-05-20

> **Purpose**: Exact diff preview for the 3-file corrective patch (Collect Bill label + Reassign button branching).
> **Status**: AWAITING_OWNER_APPROVAL
> **Scope**: 3 files, ~25 lines total

---

## 1. Issue

Two remaining frontend-only fixes from owner-approved plan:

| # | Issue | Current | Expected |
|---|-------|---------|----------|
| A | CartPanel "Delivered" label | Delivery orders show "Delivered ₹XX" | Should show "Collect Bill ₹XX" (same as non-delivery) |
| B | Footer button after rider assigned | Always shows "Waiting.." regardless of riderStatus | `riderAssigned` → "Waiting..", any other riderStatus → "Reassign" (clickable) |

---

## 2. Exact Changes

### CHANGE 1: `CartPanel.jsx` L1266

**Current**:
```jsx
<span>{isRoom ? 'Checkout' : orderType === 'delivery' ? 'Delivered' : 'Collect Bill'}</span>
```

**Proposed**:
```jsx
<span>{isRoom ? 'Checkout' : 'Collect Bill'}</span>
```

1 file, 1 line. Removes delivery-specific ternary. Button onClick/disabled/styling untouched.

---

### CHANGE 2: `OrderCard.jsx` L917-926

**Current** (hasRiderAssigned branch — always "Waiting for Rider"):
```jsx
// BUG-097 Bucket 4.5: Rider assigned, waiting — passive label, no action
<button
  data-testid={`waiting-rider-btn-${orderId}`}
  className="min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
  style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
  disabled
>
  Waiting for Rider
</button>
```

**Proposed** (split on riderStatus):
```jsx
// BUG-097: Rider assigned — branch on riderStatus
order.riderStatus === 'riderAssigned' ? (
  // Pending accept — passive label, no action
  <button
    data-testid={`waiting-rider-btn-${orderId}`}
    className="min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
    style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
    disabled
  >
    Waiting for Rider
  </button>
) : (
  // Rider accepted/rejected/other — Reassign (clickable)
  <button
    data-testid={`reassign-rider-btn-${orderId}`}
    className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
    style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
    onClick={() => setShowAssignRider(true)}
    disabled={isActionInProgress}
  >
    Reassign
  </button>
)
```

---

### CHANGE 3: `TableCard.jsx` L470-482

**Current** (hasRiderAssigned branch — always "Waiting.."):
```jsx
// Bucket 4.5: Rider assigned, waiting — passive label, no action
<TextButton
  backgroundColor="#FFF3E8"
  textColor={COLORS.primaryOrange}
  borderColor={COLORS.primaryOrange}
  testId={`waiting-rider-btn-${table.id}`}
  ariaLabel={`Waiting for rider for table ${table.id}`}
  fullWidth={false}
  className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
  disabled
>
  Waiting..
</TextButton>
```

**Proposed** (split on riderStatus):
```jsx
// BUG-097: Rider assigned — branch on riderStatus
table.order?.riderStatus === 'riderAssigned' ? (
  // Pending accept — passive label
  <TextButton
    backgroundColor="#FFF3E8"
    textColor={COLORS.primaryOrange}
    borderColor={COLORS.primaryOrange}
    testId={`waiting-rider-btn-${table.id}`}
    ariaLabel={`Waiting for rider for table ${table.id}`}
    fullWidth={false}
    className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
    disabled
  >
    Waiting..
  </TextButton>
) : (
  // Rider accepted/rejected/other — Reassign (clickable)
  <TextButton
    onClick={(e) => { e?.stopPropagation?.(); setShowAssignRider(true); }}
    backgroundColor="#FFF3E8"
    textColor={COLORS.primaryOrange}
    borderColor={COLORS.primaryOrange}
    testId={`reassign-rider-btn-${table.id}`}
    ariaLabel={`Reassign rider for table ${table.id}`}
    fullWidth={false}
    className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
    disabled={isActionInProgress}
  >
    Reassign
  </TextButton>
)
```

---

## 3. State Machine After Patch

| fOrderStatus 2 + isDelivery | Condition | Button |
|-----|-----------|--------|
| No rider assigned | `!hasRiderAssigned` | "Assign Rider" / "Dispatch" (unchanged) |
| Rider assigned, pending accept | `hasRiderAssigned` + `riderStatus === 'riderAssigned'` | "Waiting for Rider" / "Waiting.." (disabled) |
| Rider accepted | `hasRiderAssigned` + `riderStatus === 'riderReached'` | **"Reassign"** (clickable) |
| Rider rejected (backend clears data) | `!hasRiderAssigned` (delivery_man null) | "Assign Rider" (reverts to assign flow) |
| Rider status ambiguous/other | `hasRiderAssigned` + riderStatus other | **"Reassign"** (clickable) |

---

## 4. Explicit Non-Changes

| Item | Status |
|------|--------|
| Cancel (X) button | NOT CHANGED |
| Rider section (name, phone, badges, "Change" link) | NOT CHANGED |
| AssignRiderModal | NOT CHANGED |
| Socket handling | NOT CHANGED |
| API calls | NOT CHANGED |
| DeliveryCard.jsx | NOT CHANGED |
| Non-delivery order behavior | NOT CHANGED |
| Dispatch flow | NOT CHANGED |
| Handover flow (fOrderStatus 5) | NOT CHANGED |
| `/app/memory/final/` | NOT UPDATED |
| Baseline docs | NOT UPDATED |

## 5. Validation

1. `yarn build` — 0 errors
2. Delivery order with assigned rider + `riderStatus='riderAssigned'` → "Waiting for Rider" / "Waiting.."
3. Delivery order with accepted rider + `riderStatus='riderReached'` → "Reassign"
4. Delivery order with no rider → "Assign Rider" / "Dispatch"
5. CartPanel delivery order → "Collect Bill" (not "Delivered")
6. Non-delivery unchanged

## 6. Approval Request

Owner: approve to implement these exact 3 changes?
- **A.** Approve — implement
- **B.** Modify scope
- **C.** Stop

---

## Document Metadata

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-05-20 |
| Status | AWAITING_OWNER_APPROVAL |
| Files | 3 (`CartPanel.jsx`, `OrderCard.jsx`, `TableCard.jsx`) |
| Lines | ~25 |
