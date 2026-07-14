# CRM 2.0 — CR-002 — Customer Notes Not Shown in UI — Investigation Report

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**Type:** Investigation (read-only)
**Issue:** Order Notes "CUSTOMER HISTORY" and Item Notes "CUSTOMER PREFERENCES" show "No customer linked" despite customer 7505242126 (abhishek jain) being attached
**Agent:** Investigation Agent

---

## 1. Final Verdict

**The CRM API DOES return customer_notes** (1 note: "Kids Present, Anniversary" for customer 7505242126). The data pipeline (service → transform → hook) is structurally correct. **The root cause is that `customer.id` (CRM UUID) is not reliably set when the notes modals read `customerIntel`.** The `useCustomerIntel` hook requires a truthy `customer.id` to fire the CRM API call. Without it, `customerIntel` stays `null`, and the modals show "No customer linked."

**This is an architectural gap in the customer attachment flow, NOT a CR-002 implementation bug.** CR-002 correctly wired the data pipeline; the upstream `customer.id` availability issue pre-dates CR-002.

---

## 2. API Verification

### 2.1 Customer Lookup (phone 7505242126)
```
POST /api/pos/customer-lookup → { phone: "7505242126" }
Result: SUCCESS
  customer_id: "1779d4fc-7161-4407-ac8c-cce30beb3e53"
  name: "abhishek jain"
  tier: "Bronze"
  total_visits: 27
```

### 2.2 Order Suggestions (CRM customer UUID)
```
POST /api/pos/customers/order-suggestions → { crm_customer_id: "1779d4fc-..." }
Result: SUCCESS
  customer_notes: 1 entry
    - text: "Kids Present, Anniversary" (used_count=1)
  item_notes_by_id: {} (empty — no item-specific notes seeded)
  cross_sell_items: 3 items (Pista Dream, Nuts Overload, Berry Cocoa Swirl)
  feature_flags: { cross_sell: true }
```

**Conclusion: API data is available and correct. The issue is on the frontend side.**

---

## 3. Data Flow Trace

```
customer.id (CRM UUID)
  ↓
useCustomerIntel(customer?.id, cartItems, orderType)     [OrderEntry.jsx L159-163]
  ↓ (requires truthy customerId — L122-128)
getOrderSuggestions({ customerId })                       [customerIntelService.js L18-34]
  ↓ (POST to CRM /pos/customers/order-suggestions)
transformOrderSuggestions(response)                        [customerIntelTransform.js L46-154]
  ↓ (normalizes customer_notes to customerNotes)
{ intel: customerIntel } ← hook state
  ↓
OrderNotesModal receives customerIntel prop                [OrderEntry.jsx L2298]
  ↓
L11: const hasCustomer = !!customerIntel;                  [OrderNotesModal.jsx]
L12: const customerData = customerIntel?.customerNotes...
  ↓
L178: customerData → shows notes
L200: hasCustomer but no notes → "No order-level notes found"
L212: !hasCustomer → "No customer linked" ← THIS IS WHAT THE USER SEES
```

**The break point is at the TOP: `customer.id` is falsy → hook doesn't fire → `customerIntel` is null.**

---

## 4. Root Cause: `customer.id` Not Reliably Available

### 4.1 How `customer.id` Gets Set (3 paths)

| Path | Trigger | Sets `customer.id`? | Notes |
|---|---|---|---|
| **A. CartPanel CRM dropdown** | User types phone → selects from dropdown → `selectCustomer(c)` | YES — `c.id` = CRM UUID | Immediate; works correctly |
| **B. CartPanel manual typing** | User types name/phone → clicks away → `handleFieldBlur()` | NO — `customer?.id ?? null` | `id` is null if never set from CRM |
| **C. Order restore** | Existing order re-engaged from dashboard → `setCustomer({name, phone})` | DELAYED — async `enrichCustomerLoyaltyFromCRM(phone)` sets `id` after CRM lookup resolves (1.7-2.7s) | `id` is undefined during the async window |

### 4.2 What Happens in Each Path

**Path A (CartPanel CRM dropdown selection):**
1. `customer.id` set immediately from CRM search result
2. `useCustomerIntel` fires → 500ms debounce → 1.7-2.7s API call
3. `customerIntel` populated after ~2-3s
4. **Notes modals work correctly** ✓

**Path B (CartPanel manual typing without CRM selection):**
1. `customer = { id: null, name: "abhishek jain", phone: "7505242126" }`
2. `useCustomerIntel(null, ...)` → hook sees `!customerId` → returns null
3. `customerIntel` is PERMANENTLY null
4. **Notes modals show "No customer linked"** ✗ PERMANENTLY

**Path C (Existing order re-engage):**
1. `customer = { name: "abhishek jain", phone: "7505242126" }` — NO `id`
2. `useCustomerIntel(undefined, ...)` → hook sees `!customerId` → returns null
3. `enrichCustomerLoyaltyFromCRM("7505242126")` fires async
4. After ~1.7-2.7s: `customer.id` = `"1779d4fc-..."` (if CRM responds)
5. Hook re-fires → 500ms debounce → 1.7-2.7s API → `customerIntel` populated
6. **Total delay: ~4-6s** before notes modals show CRM data
7. If user opens modal during this window → sees "No customer linked"
8. After data arrives → modal should update ✓ (React re-renders on prop change)
9. **If CRM fails/times out**: `customer.id` never set → permanently "No customer linked" ✗

### 4.3 Most Likely User Scenario

The user's screenshot shows "No customer linked" with customer "abhishek jain" / "7505242126" visible in the CartPanel. The most likely explanation:

1. **Path B**: Customer was entered manually in CartPanel (typed phone, name auto-filled or typed) without selecting from the CRM search dropdown. The `id` was never set.
2. **Path C with slow CRM**: Order was re-engaged, but the user opened the notes modal before the CRM enrichment completed (~4-6s window).

---

## 5. `item_notes_by_id` Empty Explanation

The API returned `item_notes_by_id: {}` for this customer. This is a **data gap, not a code bug**:
- `item_notes_by_id` is populated ONLY when `current_cart` is provided with item IDs that have notes
- This customer (abhishek jain) has no item-specific notes seeded in the CRM database
- The CRM endpoint correctly returns an empty map

---

## 6. Whether CR-002 Caused This

**NO.** CR-002 correctly implemented the data pipeline:
- `customerIntelService.js` correctly calls the CRM API ✓
- `customerIntelTransform.js` correctly normalizes `customer_notes` → `customerNotes` ✓
- `useCustomerIntel.js` correctly fetches when `customerId` is truthy ✓
- `OrderNotesModal.jsx` correctly reads `customerIntel.customerNotes` ✓
- `ItemNotesModal.jsx` correctly reads `customerIntel.itemNotesByItemId` ✓

The upstream `customer.id` availability issue is a **pre-existing architectural gap** in how customers are attached via CartPanel inline fields and order restore — both paths pre-date CR-002.

---

## 7. Code Evidence

| File | Line | Finding |
|---|---|---|
| `OrderEntry.jsx` | L157 | `customer` state starts as `null` |
| `OrderEntry.jsx` | L159-163 | Hook: `useCustomerIntel(customer?.id, ...)` — requires `customer.id` |
| `OrderEntry.jsx` | L339-346 | Order restore: `setCustomer({name, phone})` — NO `id` |
| `OrderEntry.jsx` | L186-200 | `enrichCustomerLoyaltyFromCRM`: async, sets `id` LATER |
| `useCustomerIntel.js` | L122-128 | `if (!customerId) { setIntel(null); return; }` — guard |
| `CartPanel.jsx` | L774 | `selectCustomer`: sets `id` from CRM dropdown ✓ |
| `CartPanel.jsx` | L810-818 | `handleFieldBlur`: `id: customer?.id ?? null` — preserves but doesn't create |
| `OrderNotesModal.jsx` | L11 | `hasCustomer = !!customerIntel` — null → false → "No customer linked" |
| `OrderNotesModal.jsx` | L212-225 | "No customer linked" branch rendered when `customerIntel` is null |

---

## 8. Minimal Fix Recommendations (DO NOT IMPLEMENT)

### Option A: Trigger CRM lookup on CartPanel phone blur (fills `customer.id`)
When user finishes typing a 10-digit phone in CartPanel and blurs the field, run `lookupCustomer(phone)` and merge the result (including `id`) into the customer object. This ensures `customer.id` is always set when a valid CRM customer exists.

**Risk:** LOW. `lookupCustomer` already exists and is used by `enrichCustomerLoyaltyFromCRM`. Adding it to CartPanel blur covers Path B.

### Option B: Make `useCustomerIntel` accept phone as fallback
Modify the hook to accept `(customerId OR customerPhone)` and use `pos_customer_id` or phone-based lookup as fallback when `customerId` is null.

**Risk:** MEDIUM. Changes the hook's contract; the CRM API supports `pos_customer_id` as an alternative.

### Option C: Make enrichment blocking (not fire-and-forget)
Change `enrichCustomerLoyaltyFromCRM` from fire-and-forget to blocking (await it before rendering). This would delay order restore but guarantee `customer.id` is set.

**Risk:** MEDIUM. Adds 1.7-2.7s delay to order restore. Bad UX.

**Recommended: Option A** — most targeted, lowest risk, covers the primary gap.

---

## 9. QA Checklist for Future Fix Agent

| # | Test | Expected |
|---|---|---|
| 1 | Attach customer via CartPanel CRM dropdown → open Order Notes | "Customer History" shows CRM notes |
| 2 | Type customer phone manually (no dropdown selection) → open Order Notes | "Customer History" still shows CRM notes (fix target) |
| 3 | Re-engage existing order with customer → open Order Notes within 3s | Notes should appear after brief loading |
| 4 | Re-engage existing order → open Order Notes after 5s | Notes visible immediately from cache |
| 5 | Add item to cart → open Item Notes | "Customer Preferences" shows item-specific notes (if seeded) |
| 6 | Walk-in without customer → open Order Notes | "No customer linked" (expected) |
| 7 | CRM offline → attach customer → open Order Notes | Graceful fallback (no crash) |

---

## 10. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | `/app/memory/final/` untouched | CONFIRMED |
| 4 | `/app/memory/crm/crm_1_0/` untouched | CONFIRMED |
| 5 | Investigation only | CONFIRMED |

---

**End of Investigation Report.**
