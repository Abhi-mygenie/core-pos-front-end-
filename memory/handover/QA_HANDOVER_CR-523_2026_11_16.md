# QA Handover — CR-523 (Link Customer to Order via user-check-create) — 2026-11-16

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E1 | api/constants.js L84 | `LINK_CUSTOMER_ORDER` endpoint added | PASS ✅ |
| E2 | OrderEntry.jsx L1103-1126 | `saveCustomerToServer` rewritten — POST to `/pos/user-check-create` with 10-field payload, 3 deps | PASS ✅ |

Compile: 0 new warnings. Call sites (L2945 CartPanel, L3178 CustomerModal) unchanged — both still call `saveCustomerToServer(customerData)`.

## 2. Test Cases

### TC-1: Link customer on placed order (header modal)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Place an order on a table (e.g. C1) without a customer | Order placed, no customer linked |
| 2 | Click customer icon in header → search/select a customer → Save | Toast "Customer saved". Network tab: POST to `/api/v1/vendoremployee/pos/user-check-create` with `order_id`, `phone`, `f_name`, `membership_id` |
| 3 | Navigate away, reopen the order (or open on another device) | Customer is shown — persisted on server |

### TC-2: Change existing customer
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open order with a linked customer | Customer name/phone shown |
| 2 | Click customer icon → search a different customer → Save | Toast "Customer saved". New customer linked, old replaced |

### TC-3: CartPanel inline search
| Step | Action | Expected |
|------|--------|----------|
| 1 | On a placed order, type a phone number in the cart header customer field | CRM search results appear |
| 2 | Select a customer from the dropdown | Toast "Customer saved". Same POST to `user-check-create` |

### TC-4: New (unplaced) order — no server call
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click an empty table → link a customer BEFORE placing | No POST call (orderId is null → early return). Customer saved with place-order |

### TC-5: Locked order — blocked
| Step | Action | Expected |
|------|--------|----------|
| 1 | Restaurant with `orderEditAccess` ON + bill printed + user WITHOUT `order_edit_access` | Customer header button disabled. CartPanel customer field disabled. `isEditLocked` → early return |

### TC-6: Error handling
| Step | Action | Expected |
|------|--------|----------|
| 1 | Simulate failure (e.g. network off) → try to link customer | Error toast "Customer not linked to order. Try again." Local state kept (customer shows in UI) |

### TC-7: Webpack compile
| Step | Action | Expected |
|------|--------|----------|
| 1 | Check compilation | 0 new errors, 0 new warnings |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Place order WITH customer from the start | `placeOrder` payload still sends `cust_name/cust_mobile/cust_membership_id` — unchanged path |
| R2 | Update order (add items) with customer | `updateOrder` payload still sends customer fields — unchanged path |
| R3 | Collect bill with customer | `collectBillExisting` payload still sends customer fields — unchanged path |
| R4 | BUG-656 edit lock still works | `isEditLocked` gate preserved in `saveCustomerToServer` |
| R5 | CRM loyalty/wallet data still shows in Collect Bill | `setCustomer(customerData)` still called before server save — local state intact |

## 4. Registry Sync Confirmation
- Registry synced: YES
- Items: CR-523
- Sprint: nov_cr_batch
- EXIT GATE: 5/5 PASSED
  - [x] REGISTRY SYNC: registry.json CR-523 → GATE_5A_IMPLEMENTED
  - [x] CR_REGISTRY.MD: row updated
  - [x] FILE_OWNERSHIP.MD: 2 files added
  - [x] CODE MARKERS: `// CR-523` in both files (6 markers total)
  - [x] COMPILE CHECK: 0 new warnings

## 5. Credentials + Environment
- Preview URL: https://pull-build-3--2jz687ss.preview.emergentagent.com
- API: https://preprod.mygenie.online
- Test: owner@cafe103.com / Qplazm@10

## 6. Files Changed
| File | Lines | Change |
|------|-------|--------|
| `api/constants.js` | L84 | +1 line: `LINK_CUSTOMER_ORDER` endpoint |
| `components/order-entry/OrderEntry.jsx` | L1103-1126 | `saveCustomerToServer` rewritten: 30-field `update-place-order` → 10-field `user-check-create` |

## 7. What was eliminated
| Previous blocker | Status |
|---|---|
| BD-05 (confirm empty cart-update works) | MOOT — not using `update-place-order` |
| BD-07 (edit count increments) | MOOT — `user-check-create` doesn't touch edit count |
| BD-06 (unlink/remove customer) | Still open — separate feature |
