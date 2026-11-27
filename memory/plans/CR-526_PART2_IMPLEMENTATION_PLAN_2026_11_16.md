# CR-526 Part 2 — Credit Management "Remove from Credit" Button — Implementation Plan (Gate 3) — 2026-11-16

> Status: **GATE_3_PLAN_FROZEN**
> Risk: CRITICAL (credit ledger reversal)
> IA: `impact/CR-526_IMPACT_ANALYSIS.md`
> Design: M3 + M4 approved (Gate 2.5)
> Decisions: OD-526-C (reuse make-order-unpaid), OD-526-D (Open rows only)

---

## 0. Code reality at HEAD

`CreditCustomerDetailSheet.jsx` (727 lines) has:
- `CreditRow` component (L112-153) — renders each credit row with: #, Date, Order ID, Amount, Status badge, View button
- Three buckets: Covered (L571), Partial (L605), Open (L637)
- Each bucket renders `<CreditRow>` via `.map()`
- `CreditRow` props: `{ entry, index, coverage, onViewBill }`
- NO "Remove" action exists anywhere
- `MarkUnpaidConfirmDialog` NOT imported
- `makeOrderUnpaid` (from `paymentMutationService`) NOT imported
- `useAuth` NOT imported (needed for `hasPermission('order_unpaid')`)

---

## 1. Conflict pre-check

| File | Open items | Conflict? |
|---|---|---|
| `CreditCustomerDetailSheet.jsx` | CR-527 (Batch B, diner column) — blocked on backend | ✅ CLEAR for now |

---

## 2. Exact edits

### E1: Imports (L1-15)

Add to existing imports:
```js
import { useAuth } from '../../contexts'; // CR-526
import { makeOrderUnpaid } from '../../api/services/paymentMutationService'; // CR-526
import MarkUnpaidConfirmDialog from '../reports/MarkUnpaidConfirmDialog'; // CR-526
```

Add `Trash2` to lucide import (L14):
```js
// Current L14:
import { Loader2, PlusCircle, AlertTriangle, Info, ChevronDown, ChevronRight, Zap, FileText, Calendar, Users } from 'lucide-react';
// New:
import { Loader2, PlusCircle, AlertTriangle, Info, ChevronDown, ChevronRight, Zap, FileText, Calendar, Users, Trash2 } from 'lucide-react';
```

### E2: CreditRow — Add `onRemove` prop + Remove button (L112-153)

**Change function signature (L112):**
```js
// Current:
function CreditRow({ entry, index, coverage, onViewBill }) {
// New:
function CreditRow({ entry, index, coverage, onViewBill, onRemove, canRemove }) {
```

**Add Remove button after the View button `</td>` (after L149), new column:**
```jsx
      <td className="px-3 py-2 text-right">
        {canRemove && coverage.status === 'open' ? (
          <button
            data-testid={`credit-remove-btn-${c.id}`}
            onClick={() => onRemove(c)}
            className="text-xs font-medium px-2 py-1 rounded border"
            style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
          >
            <Trash2 className="w-3 h-3 inline-block mr-1" />
            Remove
          </button>
        ) : coverage.status === 'partial' ? (
          <span className="text-xs text-zinc-400" title="Part already paid back — cannot remove">—</span>
        ) : null}
      </td>
```

### E3: Table header — Add "Action" column (L157-165)

**Add after the "Detail" `<th>` (L163):**
```jsx
      <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Action</th>
```

### E4: Main component — Add state + handler + permission check (inside `CreditCustomerDetailSheet` function)

**After the `billOrder` state (L185), add:**
```js
  const { hasPermission } = useAuth(); // CR-526
  const canRemoveCredit = hasPermission?.('order_unpaid') ?? false;
  const [removeTarget, setRemoveTarget] = useState(null); // CR-526: order to remove from credit
  const [removePending, setRemovePending] = useState(false);
```

**Add handler after `fetchDetail` (after L250):**
```js
  // CR-526: Remove order from credit
  const handleRemoveConfirm = async () => {
    if (!removeTarget?.orderId) return;
    setRemovePending(true);
    try {
      await makeOrderUnpaid(removeTarget.orderId);
      setRemoveTarget(null);
      fetchDetail(); // refetch to update the list
      if (onPaymentRecorded) onPaymentRecorded(); // refresh parent balance
    } catch (err) {
      console.error('[CR-526] Remove from credit failed:', err);
    } finally {
      setRemovePending(false);
    }
  };
```

### E5: Pass `onRemove` + `canRemove` to CreditRow in Open bucket (L637-647)

**Current (L638-645):**
```jsx
<CreditRow
  key={e.credit.id}
  entry={e.credit}
  index={e.originalIndex}
  coverage={e.coverage}
  onViewBill={setBillOrder}
/>
```

**New:**
```jsx
<CreditRow
  key={e.credit.id}
  entry={e.credit}
  index={e.originalIndex}
  coverage={e.coverage}
  onViewBill={setBillOrder}
  onRemove={(c) => setRemoveTarget({ orderId: c.orderId, restaurantOrderId: c.restaurantOrderId, amount: c.amount })}
  canRemove={canRemoveCredit}
/>
```

**Also update Covered (L572) and Partial (L606) buckets — pass `canRemove={false}`** (Remove not shown on covered/partial):
```jsx
  onRemove={() => {}}
  canRemove={false}
```

### E6: Render MarkUnpaidConfirmDialog (before closing `</Sheet>` at ~L720)

```jsx
      {removeTarget && (
        <MarkUnpaidConfirmDialog
          open={!!removeTarget}
          order={{ id: removeTarget.orderId, orderNumber: removeTarget.restaurantOrderId }}
          isPending={removePending}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
          title={`Remove order #${removeTarget.restaurantOrderId || removeTarget.orderId} from credit?`}
          description={`This will remove ₹${removeTarget.amount?.toLocaleString('en-IN') || '0'} from this customer's credit. The order will become unpaid.`}
          actionLabel="Remove from Credit"
          actionColor="#DC2626"
        />
      )}
```

---

## 3. Files WILL change

| # | File | Edits | Lines |
|---|---|---|---|
| 1 | `components/credit/CreditCustomerDetailSheet.jsx` | E1 (imports), E2 (CreditRow), E3 (header), E4 (state+handler), E5 (props), E6 (dialog) | ~40 lines |

## 4. Files WILL NOT touch

| File | Reason |
|---|---|
| `paymentMutationService.js` | `makeOrderUnpaid` already exists |
| `MarkUnpaidConfirmDialog.jsx` | Reused as-is (supports custom title/description/color) |
| `creditService.js` | Fetch shape unchanged |
| `CreditManagementPage.jsx` | `onPaymentRecorded` callback already triggers parent refresh |

---

## 5. Verification matrix

| # | Test | Expected |
|---|---|---|
| V1 | Open credit row + user with `order_unpaid` permission | "Remove" button visible |
| V2 | Open credit row + user WITHOUT `order_unpaid` | No "Remove" button |
| V3 | Partial credit row | "—" shown (not removable) |
| V4 | Covered credit row | No button at all |
| V5 | Click "Remove" on Open row | Confirmation dialog opens with order # and ₹ amount |
| V6 | Confirm removal | API call succeeds, row disappears from list, parent balance refreshes |
| V7 | Cancel removal | Dialog closes, nothing changes |
| V8 | Multiple rapid clicks | `removePending` locks both buttons |

---

## 6. Risk

| # | Risk | Mitigation |
|---|---|---|
| R1 | Removing a credit order is irreversible (backend reverses ledger) | Confirmation dialog required (MarkUnpaidConfirmDialog) |
| R2 | CR-527 touches same file (diner column) | CR-527 is backend-blocked — no conflict now |
| R3 | Settlement lock not implemented (Part 3) | Ships later when BB-02/03 delivered. No guard now — same as Audit report today. |

---

## 7. Post-code registry checklist

- [ ] registry.json: CR-526 → GATE_5A_IMPLEMENTED (Part 1+2)
- [ ] CR_REGISTRY.md updated
- [ ] FILE_OWNERSHIP.md: CreditCustomerDetailSheet.jsx + CR-526
- [ ] Code markers: // CR-526
- [ ] Compile: 0 new warnings
