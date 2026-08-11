# POS2.0 Wave 1 QA Handoff — 2026-05-17

## 1. Scope

Approved and implemented Wave 1 bugs ready for QA:

| Bug | Title | Status |
|---|---|---|
| BUG-062 | Hide To Room for takeaway/delivery | implemented_ready_for_qa |
| BUG-073 | Empty customization wrapper fix | implemented_ready_for_qa |
| BUG-066 | Food transfer exclude rooms | implemented_ready_for_qa |
| BUG-067 | Station toggle disabled when no stations | implemented_ready_for_qa |
| BUG-079 | Polling threshold 1-miss | implemented_ready_for_qa |
| BUG-078 | CRM timeout toast | implemented_ready_for_qa |
| BUG-072 | Notes on order card | already_implemented_qa_verification_only |

---

## 2. Build / Environment

| Field | Value |
|---|---|
| Repo | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `17-may-planner` |
| Base commit (pre-implementation) | `bc16bc3` |
| Build validation | `yarn build` — SUCCESS |
| Test validation | `yarn test` — 28/34 suites pass; 6 pre-existing failures (not Wave 1) |
| Setup notes | `yarn install --frozen-lockfile` then `yarn build`. Requires `.env` with `REACT_APP_API_BASE_URL`, `REACT_APP_CRM_BASE_URL`, `REACT_APP_CRM_API_KEYS`. |

---

## 3. QA Checklist By Bug

---

### BUG-062 — To Room Hidden for Takeaway/Delivery

**Test flow:** Open Collect Payment for different order types and check To Room button visibility.

**Preconditions:**
- Restaurant has at least one occupied room (so `hasRooms` is true)
- Order has at least one placed item (so `hasPlacedItems` is true)

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Create a **takeaway** order with placed items → open Collect Payment | To Room button is **NOT visible** |
| 2 | Create a **delivery** order with placed items → open Collect Payment | To Room button is **NOT visible** |
| 3 | Create a **dine-in** order with placed items → open Collect Payment (rooms available) | To Room button **IS visible** |
| 4 | Create a **walk-in** order with placed items → open Collect Payment (rooms available) | To Room button **IS visible** |
| 5 | Open Collect Payment for a **room** order | To Room button is **NOT visible** (pre-existing `!isRoom` gate) |
| 6 | Open Collect Payment for a **prepaid** order | To Room button area hidden entirely (pre-existing prepaid gate on Row 2) |

**Evidence required:** Screenshot or DOM inspection showing button presence/absence for each order type.

**Regression areas:** Other payment method buttons (Cash, Card, UPI, Split, Credit/Tab) must remain unaffected. Payment execution flow unchanged.

---

### BUG-073 — Empty Customization Wrapper Fix

**Test flow:** Add items with various customization states to the cart and check for empty lines.

**Preconditions:**
- Menu has customizable items (with optional size, variants, addons)

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Add item with **size "Large"** selected | Green line shows "Large" below item name |
| 2 | Add item with **2 variants selected** (e.g., "Cheese, Bacon") | Green line shows "Cheese, Bacon" |
| 3 | Add item with **1 addon** (e.g., "Fries") | Green line shows "+ Fries" |
| 4 | Add item with **size + variants + addons** | Green line shows all three |
| 5 | Add customizable item with **NO selection** (skip modal or all optional) | **No empty green line** — only item name shows |
| 6 | Check **placed items section** (after Place Order) — same test with empty customizations | **No empty green line** in placed items |
| 7 | Cancel an item → verify no customization line appears | No line (pre-existing `!isCancelled` gate) |

**Evidence required:** Screenshot showing cart with mix of items — no empty green lines.

**Regression areas:** Items with actual customization data must still render correctly. Fallback path (L73-99, API orders with `variation`/`addOns`) is untouched.

---

### BUG-066 — Food Transfer Exclude Rooms

**Test flow:** Open food transfer modal and verify room orders are not in the destination list.

**Preconditions:**
- Restaurant has rooms with active room orders
- Restaurant has regular dine-in tables with active orders
- Restaurant has at least one walk-in order

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Open a dine-in order → click food transfer on an item | Transfer modal opens |
| 2 | Check destination list | Room orders **NOT in list** |
| 3 | Check destination list | Regular dine-in tables **ARE in list** |
| 4 | Check destination list | Walk-in orders **ARE in list** |
| 5 | Check destination list | Takeaway/delivery orders **NOT in list** (pre-existing) |
| 6 | Check destination list | Prepaid orders **NOT in list** (pre-existing) |
| 7 | Select a regular dine-in table → execute transfer | Transfer succeeds (execution path unchanged) |

**Evidence required:** Screenshot of transfer modal showing destination list — rooms absent, tables present.

**Regression areas:** Transfer execution flow unchanged. ShiftTableModal and MergeTableModal are separate components — untouched.

---

### BUG-067 — Station Toggle Disabled When No Stations

**Test flow:** Visit Status Config page with restaurants that have and don't have stations.

**Preconditions:**
- Access to a restaurant with 0 configured stations
- Access to a restaurant with 1+ configured stations

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Log in as restaurant with **0 stations** → go to Status Config | Station View toggle shows **"No Stations"**, is **grayed out (opacity-50)**, **not clickable** |
| 2 | Hover over the disabled toggle | Tooltip: "No stations available — configure stations in your product catalog first" |
| 3 | Try clicking the disabled toggle | Nothing happens (button is disabled) |
| 4 | Log in as restaurant with **stations** → go to Status Config | Station View toggle shows "Enabled" or "Disabled", is **fully clickable** |
| 5 | Click toggle → Enable → Save → go to Dashboard | Station panel appears on dashboard (existing behavior) |
| 6 | Click toggle → Disable → Save → go to Dashboard | Station panel hidden (existing behavior) |

**Evidence required:** Screenshots of toggle in disabled state (no stations) and enabled state (with stations).

**Regression areas:** Other StatusConfigPage sections (statuses, channels, layout, view mode, order taking) must remain unaffected. Save Configuration flow unchanged.

---

### BUG-079 — Polling 1-Miss Removal

**Test flow:** Verify order removal timing after server-side changes.

**Preconditions:**
- Running order visible on dashboard
- Access to backend to change order status or remove order

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Create and place an order → verify it appears on dashboard | Order card visible |
| 2 | On the backend, mark the order as paid/cancelled (remove from running) | — |
| 3 | Wait ~60 seconds (one poll cycle) | Order **disappears from dashboard** within ~60-70s |
| 4 | (Previously: order would stay for ~120s before disappearing) | Faster removal confirmed |
| 5 | Create a **Hold order** (fOrderStatus 9) | — |
| 6 | Wait 2+ poll cycles | Hold order **remains on Hold tab** — NOT removed by polling |
| 7 | Open an order in Order Entry (engaged) | — |
| 8 | Wait 2+ poll cycles | Engaged order **remains** — NOT removed by polling |

**Evidence required:** Timestamp evidence showing order removal within ~60s of server-side status change.

**Regression areas:** Hold orders must never be removed by polling. Engaged orders must never be removed. Socket-delivered updates must still work in real-time. 60s poll interval unchanged.

---

### BUG-078 — CRM Timeout Toast

**Test flow:** Trigger CRM timeout during customer save and verify toast + proceed behavior.

**Preconditions:**
- CRM service configured (REACT_APP_CRM_BASE_URL set)
- One of: CRM unreachable, or network slow enough to trigger 15s timeout

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Open Order Entry → click Customer → enter a **new** phone number | Customer modal opens with phone entered |
| 2 | **Simulate CRM timeout:** disconnect CRM service or block network to CRM URL | — |
| 3 | Click Save | Toast appears: **"CRM Timeout — CRM is not responding. You can proceed with manual entry."** (red/destructive variant, 5s auto-dismiss) |
| 4 | Verify modal behavior | Customer is **created as new** (since lookup returned null). Modal closes. Customer data saved to order. |
| 5 | **Restore CRM connectivity** | — |
| 6 | Enter a phone that **exists in CRM** → Save | Customer found, details populated — **no toast** (normal flow) |
| 7 | Enter a phone that **does not exist** in CRM → Save | Customer created as new — **no toast** (this is "not found", not timeout) |
| 8 | Enter an **existing CRM customer** (known ID) → Save | Update succeeds — `lookupCustomer` not called for existing customers |

**Evidence required:** Screenshot of toast message on timeout. Screenshot of normal flow (no toast) on success and "not found".

**Regression areas:** Existing customer update flow (L64-71) untouched. Create flow (L84-98) unchanged — only the lookup before create has new error handling. Search typeahead (L20-31) unchanged. No retry button per owner direction.

---

### BUG-072 — Notes on Order Card (QA Verification Only)

**Test flow:** Verify that existing note types are visible on the dashboard order card.

**Preconditions:**
- Order with order-level note
- Order with item-level notes
- Order with no notes

**Steps:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Create order → add order note (via Notes button) → place order | Dashboard card shows order note in header with orange FileText icon |
| 2 | Create order → add item note → place order | Dashboard card shows item note inline with gray FileText icon and italic text |
| 3 | Create order → add BOTH order note and item notes | Both visible — order note in header, item notes per item |
| 4 | Create order with **no notes** | No note area shows — no empty space |
| 5 | Compare note display on order card with note display in Order Entry | Format should be consistent (both show the same text content) |

**Evidence required:** Screenshots showing notes on order card matching notes in Order Entry.

**Regression areas:** None — no code changed. This is verification-only.

---

## 4. Cross-Bug Regression Tests

| Test | Bugs Affected | Expected Result |
|---|---|---|
| **Order entry / cart render** | BUG-073 | Cart items render correctly with and without customizations |
| **Transfer flow** | BUG-066 | Food transfer works for valid destinations; rooms excluded |
| **Room destination exclusion** | BUG-062, BUG-066 | To Room hidden for takeaway/delivery; rooms excluded from food transfer |
| **Station view toggle** | BUG-067 | Disabled when no stations; enabled when stations exist |
| **Polling 1-miss removal** | BUG-079 | Orders removed after ~60s; Hold + engaged protected |
| **CRM timeout visible error** | BUG-078 | Toast on timeout; no toast on success or "not found" |
| **Notes display on order card** | BUG-072 | orderNote + item notes visible when present |
| **Payment flow end-to-end** | ALL | Place Order, Place+Pay, Collect Bill, Split all still work (none touched by Wave 1) |
| **Print flow** | ALL | Print Bill from any entry point works (not touched by Wave 1) |
| **Room check-in / checkout** | BUG-062, BUG-066 | Room workflows unaffected |

---

## 5. Business Rule Assertions

| Rule | Source | Wave 1 Impact | Assertion |
|---|---|---|---|
| POLL-001 (60s poll) | Frozen baseline | BUG-079 — threshold only | Verify poll interval is still 60s |
| POLL-004 (open-order skip) | Frozen baseline | BUG-079 — threshold only | Verify engaged orders not removed |
| DASH-001 (Hold on Hold tab) | Frozen baseline | BUG-079 — threshold only | Verify fOrderStatus 9 not removed by polling |
| SC-001 (SC order types) | Frozen baseline | BUG-062 — render gate only | SC calculation unaffected |
| PAY-001/002/004 (payment payloads) | Frozen baseline | Not touched | Payloads unchanged |
| ROOM-001 (room totals) | Frozen baseline | BUG-066 — filter only | Room report totals unaffected |
| BOOT-002 (station progress) | Frozen baseline | BUG-067 — UI gate only | Station bootstrap unaffected |
| Pending TIP-003 (tip order types) | Pending freeze | Not in Wave 1 | Tip behavior unchanged |
| Pending POLL-002 (threshold) | Pending freeze | BUG-079 aligns with pending rule | 1-miss threshold implemented |
| Pending PAY-009 (CRM timeout) | Pending freeze | BUG-078 aligns with pending rule | Toast on timeout, proceed allowed |

---

## 6. Known Caveats

| Caveat | Bug | Impact |
|---|---|---|
| `lookupCustomer` now throws on timeout (previously never threw) | BUG-078 | Single caller handles it. Future callers must also handle `CRM_TIMEOUT` type. |
| `REMOVAL_MISS_THRESHOLD = 1` means faster removal on poll delay | BUG-079 | Owner accepted trade-off. Socket re-add compensates. |
| `table_note` / `room_note` don't exist in data model | BUG-072 | If backend adds these fields later, frontend follow-up needed. |
| 6 pre-existing test failures (env var + socket drift) | N/A | Not caused by Wave 1. Not fixed in this implementation. |

---

## 7. QA Result Template

| Bug | Pass/Fail | Evidence | Notes |
|---|---|---|---|
| BUG-062 | | | |
| BUG-073 | | | |
| BUG-066 | | | |
| BUG-067 | | | |
| BUG-079 | | | |
| BUG-078 | | | |
| BUG-072 | | | |
