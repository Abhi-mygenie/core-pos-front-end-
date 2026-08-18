# Gate 2 — Complete Impact Analysis
# All Open CRs & Bugs: Expense · Inventory · Employee
**Date:** 2026-07-21
**Role:** PLANNING
**Authority:** Owner GO to proceed with Gate 3 plans individually after OQs cleared

---

## MASTER DEPENDENCY MAP

```
EXPENSE
  BUG-201 Ph1 ─────────────── NO BLOCKERS ─── Ready Gate 3
  CR-062 ──────────────────── OQ-1,2,3 open ── Planning only (no FE code)
  NEW-payment-fields ──────── OQ-1..7 open ─── Needs intake registration first

INVENTORY
  CR-086 F5 ────────────────── OQ-1..4 open ── Nearly unblocked
  CR-078 ──────────────────── OQ-1..6 open ─── High complexity
  CR-077 Ph2 ──────────────── OQ-1..6 open ─── Needs master-outlet creds
  CR-076 ──────────────────── BACKEND-BLOCKED ─ Cannot start
  BUG-124 ─────────────────── BACKEND-ONLY ──── FE defended, no FE work

EMPLOYEE
  CR-071 ── needs CR-057 → CR-058 (both INTAKE)
  CR-068 ── needs CR-071 + OQ-1..4 owner answers
```

---

# MODULE 1 — EXPENSE

---

## BUG-201 Phase 1 — Cascade Delete Warning

**Risk:** HIGH | **Files:** 3 | **Lines:** ~55 | **Fast Lane:** NO

### Code Reality
| File | Lines | Current State |
|---|---|---|
| `ExpenseSetupPanel.jsx` | 1,798 | `deleteItem()` at L454 calls `expenseService.deleteExpenseItem(id)` directly after `window.confirm` — no impact check, no transaction count shown |
| `expenseService.js` | 245 | `deleteExpenseItem(id)` = `api.delete(URL/id)` — no body, no `delete_reason` |
| `constants.js` | 452 | `EXPENSE_ENDPOINTS` has no `ITEM_IMPACT` key |

### Data Flow (after fix)
```
User clicks delete icon on item
  → ExpenseSetupPanel.jsx deleteItem()
  → NEW: call getItemImpact(id)  ← GET /expense/item/{id}/impact
  → Response: { transaction_count, total_amount, date_range }
  → Show modal:
      IF transaction_count > 0 → "This item has N transactions worth ₹X (date1 → date2). Delete anyway?"
      IF transaction_count === 0 → "Delete this item? This cannot be undone."
  → On confirm → deleteExpenseItem(id, 'Deleted by owner')
      (delete_reason is optional — confirmed live; FE sends default string silently)
  → Response: { message, deleted_transactions, deleted_transaction_amount }
  → Show success toast: "Item deleted (N transactions removed)"

Category delete (no API call):
  → Count items in that category from local state
  → Show modal: "This category has N items. They will move to Misc."
  → On confirm → deleteExpenseCategory(id)  (existing call, no change)
```

### Files to Change
| File | Change | Risk |
|---|---|---|
| `constants.js` | +1 line: `ITEM_IMPACT: '/api/v2/vendoremployee/expense/item'` in EXPENSE_ENDPOINTS | LOW |
| `expenseService.js` | +`getItemImpact(id)` fn (GET) + update `deleteExpenseItem(id, reason)` to pass `{delete_reason: reason}` body | LOW |
| `ExpenseSetupPanel.jsx` | Replace `window.confirm` + direct delete call (L454-480 area) with: state flag `impactData`, modal component, impact fetch, conditional text, confirm → delete with reason | HIGH — 1798-line hotspot, must entry-verify |

### Open Questions
**NONE — all blockers cleared via live endpoint tests.**

### Gate 3 Pre-conditions
- ☑ Impact endpoint confirmed live
- ☑ `delete_reason` confirmed optional
- ☑ Category: FE-local count confirmed viable
- ☑ DELETE response returns `deleted_transactions` + `deleted_transaction_amount`
- **→ Ready for Gate 3 Implementation Plan immediately**

---

## CR-062 — Expense Report: Backend Aggregation Contract

**Risk:** LOW (planning/documentation only — zero FE code until backend delivers) | **Files:** 0 now

### Code Reality
CR-061 (FE client-side aggregation) is QA PASS. The data shapes are live in `expenseTransform.js` and `ExpenseReportPanel.jsx`. Backend now needs a server-side endpoint to replicate this aggregation for large datasets / server-side pagination.

### What This Is
A **contract document** task. No FE code changes until backend delivers `POST /expense/expense-aggregation`. Pattern follows CR-049.

### Data Flow (future)
```
Current: FE fetches all transactions → client-side groups/sums in expenseTransform.js
Future:  FE sends { date_range, category_ids, payment_methods } 
         → POST /expense/expense-aggregation
         → Backend returns pre-aggregated { daily_totals[], category_totals[], payment_totals[], grand_total }
         → FE renders directly (no client-side compute)
```

### Open Questions ← OWNER MUST ANSWER BEFORE PLANNING
| # | Question | Why it blocks |
|---|---|---|
| **OQ-1** | What breakdown does the report need? Options: (A) Daily totals only, (B) By-category, (C) By-payment-method, (D) All three combined | Determines request/response shape entirely |
| **OQ-2** | Date range — owner-selected or auto last-30-days? Paginated (per-page) or full dataset in one call? | Affects query params and pagination contract |
| **OQ-3** | Should CR-062 replace CR-061's client-side compute or run alongside as a performance upgrade? | Architecture decision — affects how FE switches between modes |

---

## NEW — `payment_made_to` + `payment_ref_id` Optional Fields

**Status:** NOT REGISTERED — needs intake before any Gate 2/3 work
**Risk:** LOW-MEDIUM | **Files:** ~3

### Code Reality
Backend already returns these fields in `expenses-list` AND accepts them in `store-expense-details`:
```json
// expenses-list item response (confirmed live):
{ "payment_made_to": "", "payment_ref_id": "", ... }
```
FE transform (`expenseTransform.js`) sends `payment_method` and `notes` but **NOT** `payment_made_to` or `payment_ref_id`. These 2 fields are silently discarded on create.

### Files to Change
| File | Change |
|---|---|
| `expenseTransform.js` | Add `payment_made_to` + `payment_ref_id` to `toAPI.storeExpenseDetails()` (L251 area) |
| `ExpenseEntryPanel.jsx` | Add 2 form fields in the Add Expense form (1030 lines — active file) |
| `expenseTransform.js` | Add `payment_made_to` + `payment_ref_id` to `fromAPI.expenseTransaction()` for display |

### Open Questions ← ALL MUST BE ANSWERED (do not assume)
| # | Question |
|---|---|
| **OQ-1** | Where in the Add Expense form do these fields appear? After `payment_method`? After `notes`? |
| **OQ-2** | Are they always optional, or required when `payment_method` is "Bank Transfer" / "Cheque"? |
| **OQ-3** | `payment_made_to` — free-text input or vendor dropdown (from vendor list API)? |
| **OQ-4** | Should `payment_ref_id` show in the transaction table and/or expense report columns? |
| **OQ-5** | Should `payment_made_to` show in the transaction table and/or expense report? |
| **OQ-6** | Are both fields needed in the **Edit Transaction** flow too, or Add-only? |
| **OQ-7** | Which CR/BUG ID was this backend delivery originally linked to? (needed for registry) |

---

# MODULE 2 — INVENTORY

---

## CR-086 F5 — Ingredient Import Wiring

**Risk:** LOW-MEDIUM | **Files:** 2 | **Lines:** ~30 | **Fast Lane:** NO (API write)

### Code Reality — Nearly Done
```
inventoryService.js L32: importIngredients(formData) → POST IMPORT_INVENTORY already exists
constants.js L154: IMPORT_INVENTORY: '/api/v2/vendoremployee/inventory/import-inventory'
InventorySetupPanel.jsx: Import button EXISTS but is disabled by design (F5 deferred)
```

### What's Needed
1. Enable the import button (remove `disabled` prop)
2. Wire `<input type="file">` → `importIngredients(formData)` call
3. Handle response: success toast + `onRefresh()`, OR per-row error display if backend returns errors

### Open Questions ← MUST ANSWER BEFORE GATE 3
| # | Question |
|---|---|
| **OQ-1** | Is the backend `POST /import-inventory` endpoint finalized and accepting files? (needs live curl to confirm) |
| **OQ-2** | What file format does it expect — CSV only, XLSX only, or both? |
| **OQ-3** | What does a partial-failure response look like? Does backend return per-row errors, or just pass/fail? |
| **OQ-4** | Should FE show a **Download Template** button so users know the expected column format? If yes, is there a template endpoint? |

---

## CR-078 — Smart Purchase Redesign (Item-First Planner)

**Risk:** HIGH (financial, rewrites core Purchase surface) | **Files:** ~10 | **Lines:** ~500 | **Fast Lane:** NO

### Code Reality
```
PurchaseEntryPanel.jsx (266 lines) — vendor-first free-text form with manual line items
  - vendorName: free-text input (no vendor ID)
  - lines: ingredient + qty + rate (no velocity, no gap calculation)
  - submit → inventoryService.addPurchase() → POST /add-stock

Existing reusable:
  inventoryService.addPurchase() → reuse for submission
  inventoryService.getVendorItems() → already exists (vendor-item-list, 1,145 rows)
  inventoryService.getIngredients() → already exists
```

### Data Flow (new)
```
[1] Owner opens Smart Purchase
  → HorizonPicker: select 7/10/14/custom days
  → purchasePlanner.js: fetchDCR(horizon) + fetchStockInventory()
  → For each ingredient: gap = (daily_avg × horizon) − on_hand
  → Filter: only show rows where gap > 0
  → VendorRankingService: for each ingredient, rank vendors by lowest last rate
    (from vendor-item-list grouped by ingredient_id)

[2] Auto shopping list renders:
  Row = { ingredient, suggested_qty=|gap|, suggested_vendor (lowest rate), 
          suggested_rate (last rate from that vendor), override_qty input,
          override_vendor dropdown }

[3] Owner may:
  - Accept suggested values (one-click)
  - Override qty (manual input)
  - Override vendor → warning banner if new vendor rate > suggested rate by threshold%
  - Add ad-hoc rows (ingredient not in auto-list)

[4] Submit:
  → GroupedVendorPreview: group all lines by vendor
  → Each vendor group: PaymentMethod picker (mandatory)
  → Submit: N sequential POST /add-stock calls
  → On all success: redirect to Current Stock

[5] PurchaseEntryPanel.jsx: kept (or redirected) so deep-links don't break
```

### Files
| File | Status | Estimate |
|---|---|---|
| `pages/InventorySmartPurchasePage.jsx` | NEW | ~40 lines |
| `components/inventory/smart/SmartPurchasePanel.jsx` | NEW | ~180 lines |
| `components/inventory/smart/HorizonPicker.jsx` | NEW | ~30 lines |
| `components/inventory/smart/AutoShoppingList.jsx` | NEW | ~80 lines |
| `components/inventory/smart/VendorSuggestionCell.jsx` | NEW | ~60 lines |
| `components/inventory/smart/GroupedVendorPreview.jsx` | NEW | ~60 lines |
| `utils/purchasePlanner.js` | NEW | ~50 lines |
| `api/services/vendorRankingService.js` | NEW | ~40 lines |
| `api/transforms/inventoryTransform.js` | MODIFY | +15 lines (ad-hoc origin field) |
| `components/layout/Sidebar.jsx` | MODIFY | ~3 lines (rename label) |
| `App.js` | MODIFY | ~3 lines (route rename) |
| `components/inventory/PurchaseEntryPanel.jsx` | REDIRECT or DELETE | — |

### Open Questions ← ALL MUST BE ANSWERED
| # | Question |
|---|---|
| **OQ-1** | Velocity window: which rolling average to compute daily consumption? **7d, 14d, 30d?** Or does the horizon picker itself define it? |
| **OQ-2** | If daily consumption report returns 0 for an ingredient within the horizon — **show row (0 gap) or hide it?** |
| **OQ-3** | Override warning threshold: how much more expensive triggers the warning? **5%? 10%? A custom value?** |
| **OQ-4** | Vendor ranking tie-breaker: if two vendors have the exact same last unit rate, **which wins? Most recent purchase? Highest historical volume?** |
| **OQ-5** | `PurchaseEntryPanel.jsx` after CR-078 ships: **keep it** (redirect to Smart Purchase) or **delete it** entirely? |
| **OQ-6** | Bulk-reset button — allow owner to **clear the entire planner** and start fresh with a new horizon? |

---

## CR-077 Phase 2 — Hierarchy Stock Transfer: Dispatch + Return

**Risk:** HIGH (financial, cross-outlet ledger writes, multi-role) | **Files:** ~6 new + 3 modified | **Lines:** ~400 | **Fast Lane:** NO

### Code Reality — Phase 1 Done
Phase 1 (Receive + My Requests tabs) is QA PASS. The following infrastructure already exists:
```
inventoryTransferService.js — 9 endpoints mapped (receive, reject, pending-queues, details)
inventoryTransferTransform.js — fromAPI/toAPI + meta_json.segments parser
RestaurantContext.jsx — restaurantTypeFlag, isMasterOutlet, isFranchiseOutlet selectors
Sidebar.jsx — Receive nav pill (visible only for franchise/master outlets)
```

### Phase 2 Scope (Dispatch + Return)
```
[DISPATCH — master outlet only]
  Master owner → Dispatch tab
  → Select destination outlet (franchise child list from /profile or new endpoint)
  → Select ingredients + quantities + batch info
  → inventoryTransferService.dispatch() → POST /inventory-transfer/dispatch
  → Transfer appears in receiving outlet's pending queue

[RETURN]
  Any outlet → Transfers list → eligible transfer → Initiate Return
  → inventoryTransferService.returnEligible() → POST /inventory-transfer/return/eligible
  → If eligible → ReturnPanel (select qty, reason)
  → inventoryTransferService.returnInitiate() → POST /inventory-transfer/return/initiate
```

### Open Questions ← NEED MASTER-OUTLET CREDS + OWNER ANSWERS
| # | Question |
|---|---|
| **OQ-1** | Dispatch endpoint payload — what fields does `POST /inventory-transfer/dispatch` accept? **Needs master-outlet creds (Central Kitchen #813) to curl-verify** |
| **OQ-2** | Approval workflow: what triggers `approval_pending` vs `lateral_approval_pending` queue categories? When does a dispatch require approval? |
| **OQ-3** | Return eligibility: what qualifies a transfer for return? Within X days? Batch untouched? Specific status only? |
| **OQ-4** | Role gating: can **Managers** initiate dispatch or only **Owners**? |
| **OQ-5** | Dispute flow (deferred in Ph1): is it included in Phase 2 or still deferred to Phase 3? |
| **OQ-6** | Print receipt after dispatch — required or optional? |

---

## CR-076 — Amazon S3 File Upload

**Risk:** MEDIUM | **Files:** ~4 new + 2 modified | **Fast Lane:** NO

### Code Reality — 0% built
```
No S3 client exists.
No presigned-URL endpoint exists.
No proxy-upload endpoint exists.
Backend has not delivered any upload infrastructure.
```

### Status: HARD BLOCKED — No FE Work Possible
This CR cannot start until backend delivers the upload endpoint. No impact analysis depth is useful beyond recording the blocker.

### Open Questions ← BACKEND MUST ANSWER FIRST
| # | Question |
|---|---|
| **OQ-1** | Upload approach: **(A) presigned-URL** (FE → S3 directly, backend gives a temp URL) or **(B) proxy** (FE → backend → S3)? |
| **OQ-2** | Which screens need upload — just Purchase Entry, or also Room Check-in? |
| **OQ-3** | Allowed file types: PDF only? PDF + JPG/PNG? |
| **OQ-4** | Max file size? |
| **OQ-5** | Has the backend brief been sent? Has backend acknowledged a delivery date? |

---

## BUG-124 — Backend socket `food_update` payload missing fields

**Risk:** LOW (FE already defended) | **FE Files:** 0 | **Fast Lane:** N/A

### Code Reality — FE Defended
```
socketHandlers.js: SOCKET_FOOD_DEFAULTS backfill exists
  → When food_update arrives, FE merges defaults for missing fields:
     status, is_disable, stock_out, food_status, live_web
  → POS does not crash. Menu items show last known values.
  → BUT: live stock-status changes via socket are unreliable
     (FE backfill overwrites the correct value with the default)
```

### This is a Backend Bug — FE Cannot Fix the Root Cause
The only FE action possible: **remove the backfill** once backend fixes the payload (so live values come through). That is a 1-line change.

### Open Questions
| # | Question |
|---|---|
| **OQ-1** | Has the backend brief been acknowledged by the backend team? |
| **OQ-2** | Is there a target date for backend fix? |
| **OQ-3** | Should FE remove the backfill proactively and accept a period of unreliable stock updates, or wait for backend confirmation? |

---

# MODULE 3 — EMPLOYEE

---

## CR-071 — App-Wide Role Gating / Permission Consumer Wiring (Phase 3)

**Risk:** CRITICAL (~30 files, ~80-120 gate insertions, ALL R5 hotspots) | **Fast Lane:** NO

### Code Reality
```
AuthContext.jsx: hasPermission(key) exists (from CR-069)
Backend /profile response: includes roles[] + permissions[]
R5 hotspot files: OrderEntry.jsx (2493L), CollectPaymentPanel.jsx (3050L), CartPanel.jsx, orderTransform.js
```

### Blast Radius
Every protected action across all modules gets a `hasPermission()` gate inserted. ~80-120 insertion points across ~30 files.

### Dependency Chain — CRITICAL PATH
```
CR-057 (Menu "No Tax" — INTAKE, not started)
  └─ must ship first — touches OrderEntry.jsx + CartPanel.jsx (R5)
       └─ CR-058 (Mark Order Complimentary — INTAKE, not started)
            └─ must ship first — touches CollectPaymentPanel.jsx + OrderCard.jsx (R5)
                 └─ CR-071 can start (DEFERRED until above 2 ship)
                      └─ CR-068 can start (depends on CR-071)
```

### Open Questions ← MUST ANSWER BEFORE ANY PLANNING
| # | Question |
|---|---|
| **OQ-1** | CR-057 and CR-058 — when are these prioritised? Are they in the current sprint? Without them CR-071 cannot start. |
| **OQ-2** | Complete permission map needed: what is the **full list of actions** that need role-gating, and which roles (Owner / Manager / Cashier / Kitchen) get access to each? |
| **OQ-3** | Fail behaviour when `hasPermission()` returns false for a user mid-session (e.g. role changed remotely): **block silently** (hide button), **redirect to login**, or **show "Access denied" toast**? |

---

## CR-068 — Cancellation Role-Gating

**Risk:** HIGH (R5 hotspot files: OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx) | **Fast Lane:** NO

### Code Reality
```
No `hasPermission('cancel_order')` or `hasPermission('cancel_item')` calls exist anywhere.
Cancellation buttons are unguarded across OrderEntry, CartPanel, OrderCard.
AuthContext.hasPermission() exists but no cancellation permission key is defined.
```

### Dependency
**FULLY BLOCKED** until CR-071 ships. CR-071 defines the `hasPermission()` call contract and wires all R5 hotspot files first.

### 4 Open Questions — ALL Unanswered ← OWNER MUST ANSWER
| # | Question |
|---|---|
| **OQ-1** | Which roles can cancel? **Owner always yes. Manager?** Cashier? Kitchen? |
| **OQ-2** | Is this **configurable per-restaurant** (Settings toggle) or a **system-wide fixed rule**? Configurable = adds a Settings UI screen (+1 file, bigger scope) |
| **OQ-3** | Item-level cancellation and order-level cancellation — **same permission key or separate?** (Separate = 2 gates on ~6 files instead of 1) |
| **OQ-4** | Does the backend already have a permission field for cancellation in `/profile` roles response, or does a **new backend field need to be added**? (If new → backend brief required before FE work starts) |

---

# GATE 2 CLOSURE STATUS

| Item | Gate 2 | Open Questions | Blocks |
|---|---|---|---|
| **BUG-201 Ph1** | ✅ READY FOR GATE 3 | NONE | — |
| **CR-062** | ⚠ OQ-1,2,3 open | Owner to answer | No FE code until backend delivers |
| **NEW payment fields** | ❌ NOT REGISTERED | OQ-1..7 open | Needs intake registration first |
| **CR-086 F5** | ⚠ OQ-1..4 open | Curl confirm + format | Nearly unblocked |
| **CR-078** | ⚠ OQ-1..6 open | Owner decisions needed | High complexity |
| **CR-077 Ph2** | ⚠ OQ-1..6 open | Master creds + owner answers | — |
| **CR-076** | ❌ BACKEND-BLOCKED | OQ-1..5 open | Cannot start at all |
| **BUG-124** | ❌ BACKEND-ONLY | OQ-1..3 open | No FE work possible |
| **CR-071** | ❌ BLOCKED | OQ-1..3 open | CR-057 + CR-058 must ship first |
| **CR-068** | ❌ BLOCKED | OQ-1..4 open | CR-071 must ship first |

**Only 1 item is Gate-3 ready: BUG-201 Phase 1.**
