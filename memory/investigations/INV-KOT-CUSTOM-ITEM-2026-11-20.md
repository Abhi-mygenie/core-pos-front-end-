# Investigation Report — KOT not printed on first place for custom (out-of-menu) items
**Role:** INVESTIGATION (Role 6) — read-only, no code written
**Date:** 2026-11-20
**Restaurant:** owner@hogwarts.com
**Steps used:** 8 / 10 · **Confidence: HIGH**

---

## 1. Summary

| Field | Value |
|---|---|
| **Classification** | FE_BUG |
| **Root cause** | `customItemFromAPI` (orderTransform.js L2320-2331) does not map `data.station` onto the cart item. `station` is `undefined` → `cartStationsToSet` skips it → `selectAgentsForKot` early-returns `[]` → place-order payload carries `printer_agent: []` and per-item `station: null` → backend cannot route the KOT |
| **Confidence** | HIGH — traced end-to-end through 5 files |
| **Why Reprint works** | After placement the socket response enriches the placed item with `station: detail.station \|\| 'KDS'` (fromAPI.order transform L134); Reprint path uses this enriched station instead of the missing cart-item station |
| **Files involved** | `api/transforms/orderTransform.js` (1 line) |
| **Fix scope** | Planning-skip eligible — 1 file, 1 line, LOW risk |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | `customItemFromAPI` does not set `station` | Code trace `orderTransform.js` L2320-2331 | **CONFIRMED** — no `station` field in returned object | L2320-2331 |
| H2 | `cartStationsToSet` skips items with no station | Code trace `printerAgentSelector.js` L99-108 | **CONFIRMED** — `if (s != null && String(s).trim() !== '')` guard: undefined/null → skipped | L99-108 |
| H3 | `selectAgentsForKot` early-returns when stationSet is empty | Code trace `printerAgentSelector.js` L80 | **CONFIRMED** — `if (!Array.isArray(stationSet) \|\| stationSet.length === 0) return []` | L80 |
| H4 | `buildCartItem` sends station as null in payload | Code trace `orderTransform.js` L772 | **CONFIRMED** — `station: item.station ? item.station.toUpperCase() : null` → null for custom items | L772 |
| H5 | Normal menu items always have station set | Code trace `OrderEntry.jsx` L93 (adaptProduct) | **CONFIRMED** — `station: product.station \|\| 'kitchen'` → always non-empty | L93 |
| H6 | Reprint path uses station from placed item (socket-enriched) | Code trace `fromAPI.order` L134, `RePrintOnlyButton.jsx` | **CONFIRMED** — socket response has `station: detail.station \|\| 'KDS'`; Reprint reads this enriched station | L134, `RePrintOnlyButton.jsx` |

---

## 3. Data Flow Trace

### First placement — KOT MISSING ❌
```
handleAddCustomItem (OrderEntry.jsx L1646-1653)
  → toAPI.addCustomItem(name, categoryId, price, ...) — payload has NO station field
  → POST /add-single-product → backend creates product, assigns station (e.g. 'KDS')
  → customItemFromAPI(response.data.data, qty, notes)
      L2320-2331:
      {
        id, name, price, unitPrice, qty, notes,
        status: 'preparing',
        placed: false,
        isCustomItem: true,
        addedAt: ...,
        // ← station ABSENT  ← ROOT CAUSE
      }
  → setCartItems([..., { ...cartItem, _cartKey }])
      cartItem.station = undefined

User clicks Place Order:
  → toAPI.placeOrder(table, cartItems, ..., { printerAgents, printAllKOT:true })
      L1076: unplacedItems = cartItems.filter(!placed) → includes custom item
      L1077: cart = unplacedItems.map(buildCartItem)
               buildCartItem L772: station: item.station ? ... : null → null ← null in payload
      L1097: cartStationsToSet(unplacedItems)
               for item of unplacedItems:
                 s = item.station = undefined → NOT added to set
               → returns []  ← empty set
      L1096: selectAgentsForKot(printerAgents, [])
               L80: stationSet.length === 0 → return []  ← empty agents
      printerAgentForKot = []
      printerAgentForPlace = [...[], ...billAgents]  ← no KOT agent

  place-order payload:
    print_kot: 'Yes'
    cart[n].station: null          ← backend can't derive KOT station
    printer_agent: []              ← no KOT printer agent listed

  Backend: print_kot='Yes' but station=null in cart + printer_agent=[] for KOT
  → Cannot route KOT to any printer → KOT NOT SENT ❌
```

### Reprint — KOT WORKS ✅
```
Order placed → socket fires 'new_order' / 'update-order-paid' event
  → fromAPI.order (orderTransform.js L134):
      station: detail.station || 'KDS'  ← server-assigned default station
  → cartItems updated: custom item now has placed:true + station:'KDS'

User clicks Re-Print KOT (RePrintOnlyButton.jsx):
  → placedItems = cartItems.filter(placed) → includes custom item with station:'KDS'
  → getStationsFromOrderItems(placedItems, getProductById)
      → product = getProductById(foodId)  ← product now in catalog (backend created it)
      → station = product.station         ← 'KDS' or backend-assigned station
      → stationMap: { 'KDS': [...] }
      → returns [{ station:'KDS', itemCount:1 }]
  → executePrintKot(['KDS'])
      → printOrder(orderId, 'kot', 'KDS', order, 0, {}, printerAgents)
           L162: payload.station_kot = 'KDS'
           L174: stationSet = ['KDS']
           L175: agents = selectAgentsForKot(printerAgents, ['KDS'])
                 → finds agent matching 'KDS' station → agents = [{ station:'KDS', ... }]
           payload.printer_agent = [{ station:'KDS', printer_agent_id:'...' }]
      → POST /order-temp-store → backend routes KOT to 'KDS' printer
  → KOT PRINTED ✅
```

---

## 4. Break Point (single line)

```javascript
// orderTransform.js — customItemFromAPI (L2320-2331):
export const customItemFromAPI = (data, qty, notes) => ({
  id:           data.id,
  name:         data.name,
  price:        parseFloat(data.price) || 0,
  unitPrice:    parseFloat(data.price) || 0,
  qty,
  notes:        notes || '',
  status:       'preparing',
  placed:       false,
  isCustomItem: true,
  addedAt:      new Date().toISOString(),
  // ← station: data.station || null   IS MISSING  ← BREAK POINT
});
```

**Compare — normal menu item (OrderEntry.jsx L93):**
```javascript
station: product.station || 'kitchen',   // ✅ always set
```

**Compare — placed item from socket (orderTransform.js L134):**
```javascript
station: detail.station || 'KDS',        // ✅ always set (server default)
```

**Compare — buildCartItem outbound (orderTransform.js L772):**
```javascript
station: item.station ? item.station.toUpperCase() : null,  // → null for custom items
```

**Comment on L772:** `// null if no station (no KOT)` — this confirms the backend
uses null station as a signal to suppress KOT routing. The bug is that
`customItemFromAPI` leaves station undefined, causing null here.

---

## 5. Evidence Artifacts

| File | Line(s) | Finding |
|---|---|---|
| `api/transforms/orderTransform.js` | L2320-2331 | `customItemFromAPI` — no `station` field |
| `api/transforms/orderTransform.js` | L772 | `buildCartItem`: `station: item.station ? ... : null` → null for custom items |
| `api/transforms/printerAgentSelector.js` | L80 | `selectAgentsForKot`: early return `[]` when `stationSet` is empty |
| `api/transforms/printerAgentSelector.js` | L99-108 | `cartStationsToSet`: skips items with null/undefined station |
| `components/order-entry/OrderEntry.jsx` | L93 | `adaptProduct`: `station: product.station \|\| 'kitchen'` — always set for menu items |
| `api/transforms/orderTransform.js` | L134 | `fromAPI.order` item: `station: detail.station \|\| 'KDS'` — socket path always has station |
| `api/transforms/orderTransform.js` | L1096-1098 | `placeOrder`: `selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))` |
| `components/order-entry/RePrintButton.jsx` | L26-44 | `getStationsFromOrderItems(placedItems, getProductById)` — reprint uses placed items (station set) |
| `api/services/orderService.js` | L173-176 | Reprint: `stationKot` → `selectAgentsForKot(printerAgents, stationSet)` → agents found |

---

## 6. Recommendation

**Classification:** FE_BUG
**Planning skip eligible:** YES (owner approve) — 1 file, 1 line, LOW risk, not hotspot, not financial

**Fix:** Add `station` to `customItemFromAPI` so the cart item carries the backend-assigned station:

```javascript
// orderTransform.js L2320:
export const customItemFromAPI = (data, qty, notes) => ({
  id:           data.id,
  name:         data.name,
  price:        parseFloat(data.price) || 0,
  unitPrice:    parseFloat(data.price) || 0,
  qty,
  notes:        notes || '',
  status:       'preparing',
  placed:       false,
  isCustomItem: true,
  addedAt:      new Date().toISOString(),
  station:      data.station || null,   // ← ADD THIS LINE
});
```

**Why `data.station || null` (not `|| 'KDS'`):** The backend assigns the station when
it creates the product via `add-single-product`. If the backend returns a station,
use it. If not, `null` preserves the existing "no station = no KOT" behaviour
(better than a wrong default). Owner decision: whether to add a station selector
to the custom-item modal, or rely on the backend's category-based station assignment.

**Verification:**
1. Add custom item → place order → verify KOT prints immediately (no reprint needed)
2. Verify KOT routes to the correct station (matches what backend assigns)
3. Regression: normal menu items still route KOT correctly

---

## 7. Retroactive Candidates
None.

---

## Handover to Next

```
Root cause: customItemFromAPI (orderTransform.js L2320) omits station field.
  → cartStationsToSet returns [] → selectAgentsForKot returns [] → printer_agent=[]
  → backend can't route KOT for custom items on first placement.
  → Reprint works because socket-enriched placed items have station:'KDS' (server default).

Confidence: HIGH. Steps: 8/10. No code written.
FE fix: add station:data.station||null to customItemFromAPI. 1 line. 1 file.
Planning skip eligible: YES (owner approve). LOW risk.

Report: /app/memory/investigations/INV-KOT-CUSTOM-ITEM-2026-11-20.md
```
