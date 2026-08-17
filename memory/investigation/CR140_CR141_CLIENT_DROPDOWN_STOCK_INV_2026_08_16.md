# Investigation Report — CR-140/CR-141: Client Dropdown + Offline Stock Latency

**Date:** 2026-08-16
**Role:** INVESTIGATION
**Steps used:** 9/10
**Triggered by:** Owner screenshot + description — Aggregator menu missing client/branch dropdown; food shows "Offline" after designated enable time

---

## 1. Summary

| # | Finding | Classification | Confidence |
|---|---|---|---|
| F1 | Client filter dropdown missing from Aggregator menu header | FE_BUG — CODE_GAP (feature incomplete) | HIGH |
| F2 | "Main Branch" not in client list (API only returns sub-brands) | DATA_EDGE — FE fix required | HIGH (API confirmed) |
| F3 | Backend `foods-list` does NOT support `client_id` filter param | BACKEND_BEHAVIOR — filtering must be frontend | HIGH (probed) |
| F4 | Stock toggle shows "Offline" after enable — UrbanPiper async latency | BACKEND_LATENCY + FE_GAP (no optimistic update) | HIGH (API confirmed) |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result |
|---|---|---|---|---|
| H1 | No client filter dropdown in panel header | Code trace MenuManagementPanel L141-170 | 1 | ✅ CONFIRMED — no `selectedClient` state, no filter UI |
| H2 | `restaurant-clients` API only returns brands, not Main Branch | API probe: `GET /restaurant-clients` | 2 | ✅ CONFIRMED — 1 client: `{id:109, name:'mallu goan'}` only |
| H3a | `foods-list` supports backend `client_id` filter | API probe with `?client_id=109` and `?client_id=0` | 3 | ❌ ELIMINATED — API ignores param, returns all 7 foods |
| H3b | `clientId` field in food data is correct | API probe `foods-list` without filter | 1 | ✅ CONFIRMED — 5 foods `client_id=0`, 2 foods `client_id=109` |
| H4a | Enable API call succeeds | API probe `POST /aggregator-sync/stock-toggle` `{action:"enable"}` | 1 | ✅ Returns `status:True, urbanpiper_status:'success', items[0].status:1` |
| H4b | `foods-list` still returns `food_stock=0` after enable | API probe after successful enable | 1 | ✅ CONFIRMED — `food_stock=0` for ALL foods, UrbanPiper processing is async |

---

## 3. Data Flow Trace — Client Dropdown Gap

```
API: GET /restaurant-clients → [{id:109, name:'mallu goan'}]
State: MenuManagementPanel.clients = [{id:109, name:'mallu goan'}]
Passed to: ProductList (L265: clients={clients}) → ProductCard (brand selector) ✅
                                                   → BulkEditor (clientId dropdown) ✅
MISSING: selectedClient state + filter dropdown in panel header
MISSING: foods.filter(f => selectedClient === 0 || f.clientId === selectedClient)
UI: ALL aggregator foods shown (main branch + all brands mixed) — no way to view per-brand
```

---

## 4. Finding F1 — Client Dropdown Missing

### Current state
`MenuManagementPanel.jsx` header (L141-170) renders:
```jsx
<h2>Menu Management</h2>
<select value={menuType} onChange={...}>  ← menu type selector only
  ...
</select>
// NO client selector here
```

`clients` state is fetched (L72-76, L114-121) but **only passed to add/edit form brand selectors**. It is never used as a filter.

### Expected behavior (per owner)
When Aggregator mode is selected AND `clients.length > 0`:
- Show a second dropdown: `[All | Main Branch | mallu goan]`
- "Main Branch" → `clientId = 0` (manually prepended — not in API response)
- "mallu goan" → `clientId = 109`
- Selecting filters the displayed foods to only that client's items

### New state needed
```js
const [selectedClientId, setSelectedClientId] = useState(null); // null = All
const clientOptions = [
  { id: null,  label: 'All' },
  { id: 0,     label: 'Main Branch' },  // ← manually added, not from API
  ...clients.map(c => ({ id: c.id, label: c.name }))
];
const filteredFoods = selectedClientId === null
  ? foods
  : foods.filter(f => f.clientId === selectedClientId);
```

### Reset behavior
When `menuType` changes away from Aggregator → reset `selectedClientId` to `null`.

---

## 5. Finding F2 — Main Branch not in API

**API response:** `GET /restaurant-clients` → `{clients_found: 1, clients: [{id:109, name:'mallu goan', ...}]}`

No "Main Branch" entry exists. Foods with `client_id=0` belong to the main brand.

**Fix:** Manually prepend `{id: 0, name: 'Main Branch'}` to `clients` array before using as filter options. Do NOT add it to the state permanently — just prepend when building the dropdown options.

---

## 6. Finding F3 — Backend Does NOT Filter by client_id

**Test:**
- `GET /foods-list?food_for=Aggregator&client_id=109` → returns ALL 7 foods (ignores param)
- `GET /foods-list?food_for=Aggregator&client_id=0` → returns ALL 7 foods (ignores param)

**Conclusion:** Filtering MUST be done entirely on the frontend using the `clientId` field already present in each food row.

**Current food distribution (RID 69):**
| `client_id` | Foods | Branch |
|---|---|---|
| 0 | 69 special, _GOAN_TEST_MAIN_, poi, poi_poi_A, poison | Main Branch |
| 109 | _GOAN_TEST_CLIENT_, test_A | mallu goan |

---

## 7. Finding F4 — Stock Toggle Shows Offline After Enable (Async Latency)

### Sequence traced

```
User clicks "Enable Now"
  → handleEnable() → POST /aggregator-sync/stock-toggle {action:"enable", item_ids:[13303]}
  → API response: {status:True, urbanpiper_status:"success", items:[{status:1, status_text:"Available"}]}
  → onToggleDone() called → fetchFoods() triggered immediately
  → GET /foods-list?food_for=Aggregator
  → Backend returns food_stock=0 (STILL offline!)
  → UI renders "Offline" badge
```

**Root cause:** UrbanPiper processes stock-toggle asynchronously. The API response confirms "Task queued successfully" — it doesn't mean the food is immediately live in UrbanPiper. The MyGenie backend only updates `food_stock=1` after receiving the UrbanPiper webhook callback. Since `fetchFoods` runs immediately after the API call, the backend hasn't received the callback yet.

**For timed disables:**
- User sets food offline for 2h (sets `turn_on_at` timestamp)
- After 2h, UrbanPiper auto-re-enables the food and sends a webhook to MyGenie backend
- MyGenie backend updates `food_stock=1`
- BUT the frontend is NOT polling — it only refreshes on user action
- User still sees "Offline" until they manually navigate away/back or refresh

### Fix options (frontend)
| Option | Approach | Complexity |
|---|---|---|
| A (recommended) | **Optimistic UI**: after successful enable API call, update `food.foodStock = 1` locally before re-fetch | LOW |
| B | Poll `foods-list` every 30s when in Aggregator mode | MEDIUM |
| C | Show "Enabling… (may take a moment)" pending state after enable | LOW |

**Option A detail:** After `aggregatorStockToggle({action:'enable'})` succeeds, update the specific food's `foodStock` to 1 in the local `foods` state before calling `onToggleDone()`/`fetchFoods()`. This gives immediate visual feedback.

---

## 8. Affected Files for Fix (Planning Gate 2 → 3 needed)

| File | Change | Risk |
|---|---|---|
| `components/panels/MenuManagementPanel.jsx` | +`selectedClientId` state + client filter `<select>` in header + filtered foods passed to ProductList/BulkEditor | MEDIUM |
| `components/panels/menu/ProductList.jsx` | Accept `selectedClientId` or `filteredFoods` prop | LOW |
| `components/panels/menu/AggregatorStockToggle.jsx` | Optimistic `foodStock=1` update after enable before re-fetch | LOW |

**Not a planning-skip** — touches 3 files, medium scope.

---

## 9. Evidence Artifacts
- API: `GET /restaurant-clients` → saved token `/app/memory/inv_goan_token.txt`
- API: `GET /foods-list?food_for=Aggregator` → 7 foods, `client_id` distribution confirmed
- API: `GET /foods-list?food_for=Aggregator&client_id=109` → 7 foods returned (no filter)
- API: `POST /aggregator-sync/stock-toggle {action:enable}` → `status:True, urbanpiper_status:success`
- API: `GET /foods-list` after enable → still `food_stock=0`

---
