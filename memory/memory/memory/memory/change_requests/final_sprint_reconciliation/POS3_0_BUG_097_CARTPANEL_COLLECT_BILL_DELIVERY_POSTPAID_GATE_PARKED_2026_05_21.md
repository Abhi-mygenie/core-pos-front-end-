# POS3.0 BUG-097 — CartPanel Collect Bill Delivery+Postpaid Gate — PARKED Approval Plan — 2026-05-21

> **STATUS:** `parked_awaiting_owner_reconciliation_decision`
> **Reason:** Owner's new rule for CartPanel's `Collect Bill` button **contradicts** the dashboard-card carve-out shipped earlier today. Reconciliation choice (A / B / C / D in §3) must be made before any code change.
> **No code change in this pass. Document only.** Resume from §8 sign-off when ready.

---

## 0. Resume Pointer (read this first when picking the work back up)

To restart:

1. Read §3 (Conflict with Dashboard Card Patch) — pick **A / B / C / D**.
2. If choice ∈ {A, B, C}: fill the §8 sign-off block, then run the implementation per §4 (diff preview) + §7 (file list for the chosen option).
3. If choice = D: pause; open a separate Bucket 5 backend question with the alternative "rider accepts" signal definition.
4. After implementation: `yarn build`, create an implementation report + owner smoke checklist, stop for owner smoke.
5. Do NOT touch out-of-scope surfaces (§9).

---

## 1. Approval Gate — Updated Rule

| Field | Value |
|---|---|
| Request | Disable the green `Collect Bill ₹XX` button on `CartPanel.jsx` (L1255) **only when** the order is **delivery**, **postpaid**, items have been **placed**, and the **rider has not yet accepted** (`riderStatus !== 'dispatched'`). Once the rider accepts (`riderStatus === 'dispatched'`), the button **re-enables**. |
| Scope | Delivery branch only. No change to dine-in, walk-in, takeaway, room. QSR mode: no change (per owner directive). Prepaid orders are already hidden by the existing Layer-A gate, so they're naturally excluded; the new condition adds an explicit `!isPrepaid` guard for clarity. |
| Change Type | local UI guard — 1 boolean prop + 1 entry in the disabled OR-chain |
| Affected Files | `OrderEntry.jsx`, `CartPanel.jsx` (and possibly `OrderCard.jsx` + `TableCard.jsx` depending on §3 choice) |
| Related APIs / Sockets / Transforms / Backend | None |
| Conflict with prior patch | YES — see §3 |
| Open Decisions | §3 reconciliation; §8 Q1 tooltip text |
| Safe Without Clarification | NO — §3 must be resolved before any code touch |

---

## 2. Disabled Window — Exact Rule

A delivery + postpaid order moves through these stages. The new column shows what Collect Bill does **after this patch (if applied)**:

| Stage | `hasPlacedItems` | `isServed` (fOS=5) | `riderStatus` | Existing rules disable? | NEW rule disables? | Final state |
|---|---|---|---|---|---|---|
| Items in cart, none placed | false | false | n/a | rule #2 (validation) | NO (gated on `hasPlacedItems`) | depends on rule #2 |
| Just placed, no rider yet | true | false | `null` | rule #4 (not served) | YES | **DISABLED** |
| Placed, rider assigned (pending pickup) | true | false | `riderAssigned` | rule #4 | YES | **DISABLED** |
| Placed, rider accepted / picked up | true | false | `dispatched` | rule #4 | NO | **DISABLED** (rule #4 still) |
| **fOS=5, no rider yet** | true | true | `null` | none | **YES (NEW)** | **DISABLED ← new behavior** |
| **fOS=5, rider assigned (pending accept)** | true | true | `riderAssigned` | none | **YES (NEW)** | **DISABLED ← new behavior** |
| **fOS=5, rider accepted** | true | true | `dispatched` | none | NO | **ENABLED ← the unlock point** |
| Cart has unplaced items mixed in | any | any | any | rule #3 | n/a | DISABLED (unchanged) |
| Empty cart | true/false | any | any | rule #1 | n/a | DISABLED (unchanged) |
| Prepaid + placed | true | any | any | Layer-A hides button | n/a | not visible (unchanged) |

The new rule fires only in 2 cells (the bold rows above). Everywhere else, behavior is unchanged.

Condition expressed precisely:
```
NEW_DISABLED = (orderType === 'delivery')
            && !isPrepaid
            && hasPlacedItems
            && (riderStatus !== 'dispatched')
```

---

## 3. Conflict with the Dashboard Card Patch (must resolve before implementation)

The dashboard-card patch shipped earlier today on `OrderCard.jsx` / `TableCard.jsx` at fOS=5:

| fOS=5 delivery state | Dashboard card today | This new rule for CartPanel |
|---|---|---|
| no rider (`null`) | ENABLED (Bill / Settle) | DISABLED ← contradicts dashboard |
| `riderAssigned` | ENABLED (Bill / Settle) | DISABLED ← contradicts dashboard |
| `dispatched` | DISABLED ("Rider is on the way" label) | ENABLED ← contradicts dashboard |

Two surfaces will say opposite things. Owner must pick one of:

- **(A)** Apply this new rule to CartPanel **only**. Leave the dashboard card patch as-is. Inconsistent UX. **NOT recommended.**
- **(B)** Apply this new rule to CartPanel **AND revert** the dashboard card carve-out so the dashboard goes back to showing the Bill / Settle button at fOS=5 regardless of rider state. The `"Rider is on the way"` label is removed from the card; the green `Order Accepted` status pill still communicates rider state. Both surfaces unlock at the same moment (rider accepts → `dispatched`). **Recommended.**
- **(C)** Apply this new rule to CartPanel **AND mirror the same rule** onto the dashboard card. Both surfaces:
  - fOS=5 + delivery + postpaid + placed + rider **NOT** accepted → no Bill, show a disabled "Awaiting Rider" / similar passive label.
  - fOS=5 + delivery + rider **accepted** → Bill / Settle enabled.
- **(D)** Owner clarifies — `"rider accepts order"` means something different from `riderStatus === 'dispatched'` (e.g. handover-complete signal). Implementation pauses pending backend.

**Recommendation: (B)** — cleanest reading of latest directive; removes inconsistency between surfaces.

---

## 4. Exact Diff Preview (assumes A or B selected — same CartPanel diff for both; B adds the dashboard revert)

### 4A. `src/components/order-entry/OrderEntry.jsx` (~L668)

```diff
   const isPrepaid = orderPaymentType === 'prepaid';
   const isServed = orderStatus === 'served';
+  // BUG-097 (2026-05-21): rider has accepted the order — gates the CartPanel
+  //   Collect Bill button for postpaid delivery orders.
+  //   'dispatched' covers both rider-pickup (delivery_man_status='Yes') and
+  //   own-delivery manual dispatch (order_dispatch_status='Yes').
+  const riderAccepted = liveOrder?.riderStatus === 'dispatched';
```

```diff
                 isPrepaid={isPrepaid}
                 isServed={isServed}
+                riderAccepted={riderAccepted}
                 hasUnplacedItems={hasUnplacedItems}
```

### 4B. `src/components/order-entry/CartPanel.jsx` props destructure (~L627)

```diff
   isServed = false,
+  riderAccepted = false,
   hasUnplacedItems = false,
```

### 4C. `src/components/order-entry/CartPanel.jsx` Collect Bill disabled array (L1255–1267)

```diff
         {/* Collect Bill — only in non-QSR flow */}
         {canBill && !(isPrepaid && hasPlacedItems) && (
         <button
           data-testid="collect-bill-btn"
           onClick={() => setShowPaymentPanel(true)}
           disabled={
             (!isMarkerOnlyRoom && visibleCartItems.length === 0) ||
             (!hasPlacedItems && hasValidationErrors) ||
             (hasPlacedItems && hasUnplacedItems) ||
-            (hasPlacedItems && !isServed && !isMarkerOnlyRoom)
+            (hasPlacedItems && !isServed && !isMarkerOnlyRoom) ||
+            // BUG-097 (2026-05-21): postpaid delivery — block Collect Bill
+            // from order placement until the rider accepts. After the rider
+            // accepts (riderStatus='dispatched'), the gate releases.
+            // No effect on other order types or QSR mode.
+            (orderType === 'delivery' && !isPrepaid && hasPlacedItems && !riderAccepted)
           }
           className="flex-1 py-3 rounded-lg font-bold text-sm text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
           style={{ backgroundColor: "#2E7D32" }}
         >
```

### 4D. (Only if owner picks option B) Revert dashboard card carve-out

**`src/components/cards/OrderCard.jsx`** — restore the fOS=5 block to the prior form. The pill block stays as-is (still reads "Order Accepted" on `riderStatus === 'dispatched'`).

```diff
            {fOrderStatus === 5 && canBill && (
-              // BUG-097 (2026-05-21): delivery + rider picked up (riderStatus='dispatched')
-              //   ⇒ passive "Rider is on the way" label; no Bill/Settle until handover.
-              isDelivery && order.riderStatus === 'dispatched' ? (
-                <button
-                  data-testid={`rider-on-the-way-btn-${orderId}`}
-                  …
-                  disabled
-                >
-                  Rider is on the way
-                </button>
-              ) : order.paymentType === 'prepaid' ? (
+              order.paymentType === 'prepaid' ? (
```

**`src/components/cards/TableCard.jsx`** — same surgical revert of the outer ternary added at L537.

The rename `'riderReached'` → `'dispatched'` in `orderTransform.js` and the pill `data-testid=rider-status-dispatched-${orderId}` STAY — they are unrelated to the carve-out and the new semantics are still correct.

### 4E. (Only if owner picks option C) Flip dashboard card trigger

Re-purpose the existing fOS=5 carve-out to fire when `riderStatus !== 'dispatched'` instead. Diff will be drafted once C is picked.

---

## 5. Truth Tables (per reconciliation choice)

### After option B (recommended)

| Surface | fOS=5 + delivery + postpaid + placed + rider not accepted | fOS=5 + delivery + postpaid + placed + rider accepted | fOS=5 + non-delivery | fOS<5 |
|---|---|---|---|---|
| Dashboard OrderCard / TableCard | Bill ENABLED (back to old behavior) | Bill ENABLED | Bill ENABLED | n/a |
| CartPanel Collect Bill | **DISABLED (NEW)** | **ENABLED (NEW unlock)** | ENABLED (unchanged) | DISABLED (rule #4) |

### After option A (not recommended — visible inconsistency)

| Surface | rider not accepted | rider accepted (`dispatched`) |
|---|---|---|
| Dashboard OrderCard / TableCard | Bill ENABLED | DISABLED ("Rider is on the way") |
| CartPanel Collect Bill | DISABLED (NEW) | ENABLED (NEW) |

### After option C

| Surface | rider not accepted | rider accepted |
|---|---|---|
| Dashboard card | DISABLED ("Awaiting Rider" / passive label) | Bill ENABLED |
| CartPanel | DISABLED | ENABLED |

---

## 6. Risk Assessment

| Item | Risk | Notes |
|---|---|---|
| OrderEntry derivation `riderAccepted` | LOW | Mirrors `isServed` pattern. Defaults to `false`. |
| CartPanel new disabled rule | LOW | Appended to existing OR chain. Outer guard ensures zero impact outside the targeted slice. |
| Option B revert | LOW | Clean undo — Settle/Bill blocks inside the carve-out were preserved verbatim. |
| QSR | None | Untouched. |
| Translation | N/A | English only. |
| Existing automated tests | LOW | No test asserts this exact combination. |

---

## 7. Files To Change

| Option | Files | Approx changed lines |
|---|---|---|
| A | `OrderEntry.jsx`, `CartPanel.jsx` | ~3 + ~3 |
| **B (recommended)** | `OrderEntry.jsx`, `CartPanel.jsx`, `OrderCard.jsx`, `TableCard.jsx` | ~3 + ~3 + revert ~15 + revert ~15 |
| C | `OrderEntry.jsx`, `CartPanel.jsx`, `OrderCard.jsx`, `TableCard.jsx` | ~3 + ~3 + flip ~10 + flip ~10 |
| D | none | 0 (parked) |

No new files, no deletions, no renames.

---

## 8. Sign-off Block (owner fills before any code touch)

| Decision | Owner choice |
|---|---|
| §3 — Reconciliation with the dashboard "Rider is on the way" carve-out | ⬜ (A) leave inconsistent / ⬜ (B) revert dashboard carve-out (recommended) / ⬜ (C) flip dashboard trigger / ⬜ (D) clarify — "rider accepts" means a different signal |
| Q1 — Tooltip on disabled Collect Bill | ⬜ (a) no tooltip (recommended) / ⬜ (b) add a hint title |
| QSR Collect Bill | ✅ no change (confirmed by owner) |
| Approve overall patch under chosen option | ⬜ Yes / ⬜ No |

---

## 9. Explicit Do-NOT List (re-stated)

- Do NOT touch the top header `Print Bill` button.
- Do NOT touch CartPanel `Re-Print`.
- Do NOT touch the QSR Collect Bill button (`qsr-collect-bill-btn`).
- Do NOT touch any non-delivery branch.
- Do NOT touch `CollectPaymentPanel`.
- Do NOT touch sockets, transforms, services, constants, modals.
- Do NOT touch `DeliveryCard.jsx`, `AssignRiderModal.jsx`.
- Do NOT implement accept/reject sockets, rejected-rider grey-out, or any Bucket 5 work.
- Do NOT update `/app/memory/final/` or baseline docs.

---

## 10. Predecessor & Reference Documents

| Doc | Role |
|---|---|
| `POS3_0_BUG_097_STATUS_RECONCILIATION_2026_05_21.md` | Status snapshot before this gate |
| `POS3_0_BUG_097_FINAL_PLANNING_COMPLETION_2026_05_21.md` | Final planning state for the 3-item patch |
| `POS3_0_BUG_097_3_ITEM_IMPLEMENTATION_REPORT_2026_05_21.md` | Implementation of 3-item patch (CartPanel "Delivered" → "Collect Bill", fOS=2 Reassign branching, pill "Reached" → "Order Accepted") |
| `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_APPROVAL_PLAN_2026_05_21.md` | Approval plan for the fOS=5 dashboard-card carve-out |
| `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_IMPLEMENTATION_REPORT_2026_05_21.md` | Implementation of the fOS=5 carve-out + `'riderReached'` → `'dispatched'` rename |
| `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` | Smoke checklist for the fOS=5 carve-out (still open) |

---

## 11. Park Status

| Field | Value |
|---|---|
| Park state | `parked_awaiting_owner_reconciliation_decision` |
| Reason | §3 conflict between this directive and the dashboard-card patch shipped earlier today |
| Required input to unpark | Owner selection in §8 sign-off block (A / B / C / D) |
| Code changed | NO |
| Build run | NO |
| QA run | NO |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |
| Predecessor patches in code | retained as-is (dashboard fOS=5 carve-out + rename still live) |

*— POS3.0 BUG-097 — CartPanel Collect Bill Delivery+Postpaid Gate PARKED Approval Plan — 2026-05-21 —*
