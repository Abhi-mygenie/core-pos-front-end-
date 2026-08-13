# CR-118 — Impact Analysis (v3 Final): Aggregator KOT & Bill Manual Print

**ID:** CR-118  
**Stage:** Impact Analysis (Gate 2)  
**Code Reality:** NONE  
**Risk:** MEDIUM  
**Revised:** 2026-07-31 v3 — all owner inputs incorporated, wrong assumptions corrected

---

## 1. What This CR Does (Plain English)

Aggregator orders (Swiggy/Zomato) come in via UrbanPiper. Staff can accept, mark ready, and dispatch — but currently **cannot manually trigger a KOT or Bill print**. The backend auto-print (driven by `aggregator_auto_kot` setting) works independently, but staff have no override or reprint capability.

CR-118 adds:
1. **KOT + Bill checkboxes on the accept popup** — so staff can override auto-print before accepting
2. **Manual KOT + Bill print buttons on cards** — so staff can reprint at any time (fOS 1 and 2)
3. **Fix the ID displayed on cards** — show the actual Swiggy/Zomato `aggrigator_id`, not the POS `restaurant_order_id`
4. **Fix latent KOT bug** — KOT button on OrderCard currently calls wrong API for aggregator
5. **Label fix** — "Dispatch" → "Ready to Dispatch" (POS doesn't physically dispatch; rider does, and socket clears the card)

---

## 2. ID Correction

**Raw API fields for an aggregator order** (from `/app/memory/evidence/CR-106/aggregator_orders_probe.json`):

| Raw API Field | Example | What It Is | FE Mapping |
|---|---|---|---|
| `id` | `40458` | POS internal DB ID | `orderId` ✅ mapped |
| `restaurant_order_id` | `478/002327` | POS-assigned ref | `orderNumber` ✅ mapped — **WRONGLY displayed on cards** |
| `urban_order_id` | `2698317` | UrbanPiper ID | `urbanOrderId` ✅ mapped |
| **`aggrigator_id`** | **`1783932198`** | **Actual Swiggy/Zomato ID** | **❌ NOT MAPPED** |

**What the screenshot shows:** `#002397  #478/002397` — both derived from `restaurant_order_id`.  
**What owner wants:** Show `aggrigator_id` (e.g., `1783932198`) everywhere on cards.  
**Print API:** Use `aggrigator_id` as the `aggr_order_id` parameter.

---

## 3. Settings Keys (Final — Validated Against Live API)

**Verified from 7 real restaurant profiles** (4 live-probed + 3 from evidence):

| Restaurant | ID | `auto_kot` | `auto_bill` | `auto_bill_stage` |
|---|---|---|---|---|
| Kunafa Mahal | 689 | Yes | No | Ready |
| **Bean Me Up** | **742** | **Yes** | **Yes** | **Acknowledged** |
| RollExpress | 747 | No | No | Ready |
| Fun Food Frenzy | 687 | Yes | No | Ready |
| Palm House | 541 | Yes | No | Ready |
| Palm India | 816 | Yes | No | Ready |
| Cafe 103 | 644 | Yes | No | Ready |

| Setting | Raw API Key | Value Format | FE Key | Status |
|---|---|---|---|---|
| Aggregator Auto KOT | `settings.aggregator_auto_kot` | `"Yes"` / `"No"` | `settings.aggregatorAutoKot` | ✅ Already mapped |
| Aggregator Auto Bill | `settings.aggregator_auto_bill` | `"Yes"` / `"No"` | `settings.aggregatorAutoBill` | ❌ CR-118 adds |
| Aggregator Auto Bill Stage | `settings.aggregator_auto_bill_stage` | **`"Acknowledged"`** / **`"Ready"`** | `settings.aggregatorAutoBillStage` | ❌ CR-118 adds |

**Validated stage values (NOT what was assumed):**
- `"Acknowledged"` = auto-bill fires at accept time (matches API status `'Acknowledged'` used in accept call)
- `"Ready"` = auto-bill fires when order is marked ready
- ~~`"Accept"`~~ — WRONG. Does not exist. The correct value is `"Acknowledged"`.

---

## 3b. Auto vs Manual Print — Separation of Concerns

**Two COMPLETELY INDEPENDENT print systems:**

### AUTO print (backend-only, frontend cannot control)
- Backend fires print internally when aggregator order status changes
- Controlled by restaurant settings:
  - `aggregator_auto_kot = "Yes"` → backend auto-prints KOT at accept
  - `aggregator_auto_bill = "Yes"` + `aggregator_auto_bill_stage = "Acknowledged"` → backend auto-prints Bill at accept
  - `aggregator_auto_bill = "Yes"` + `aggregator_auto_bill_stage = "Ready"` → backend auto-prints Bill at ready
- **Frontend has ZERO control over auto-print. Cannot start it, cannot stop it.**

### MANUAL print (frontend-triggered, explicit staff action)
- Staff clicks button → frontend calls `POST /api/v1/urbanpiper/manually-print-aggregator`
- Payload: `{ aggr_order_id: "<aggrigator_id>", aggr_order_type: "aggr_kot" | "aggr_bill" }`
- `aggr_order_id` = the `aggrigator_id` field (e.g., `"242569355005620"` — Swiggy's ID), NOT POS `id`
- **Endpoint validated live** — returns `{ error: "Failed to send print request" }` for disconnected printer (expected on preprod)

### PopOut Checkboxes = MANUAL print triggers
- Checkbox ticked → frontend fires `manuallyPrintAggregator()` after accept
- Checkbox unticked → frontend does NOT fire manual print
- **Defaults reflect auto settings** so staff sees what backend will auto-do:
  - KOT checkbox default ON if `aggregatorAutoKot` = true
  - Bill checkbox default ON if `aggregatorAutoBill` = true AND `aggregatorAutoBillStage` = `'Acknowledged'` (auto-bill fires at accept = same moment as popup)
  - Bill checkbox default OFF if stage = `'Ready'` (auto-bill fires at ready, not at accept — no point triggering manual bill at accept)
- **Double-print awareness:** If auto is ON and staff leaves checkbox ticked → backend auto-prints + frontend manual-prints = 2 prints. This is by design — staff's explicit choice. Staff who know auto is ON can untick.

---

## 4. Dispatch Flow (Already Wired — Confirmed)

```
Staff clicks "Ready to Dispatch" (currently labeled "Dispatch")
  → AggregatorDispatchModal opens (rider name + phone)
  → Confirm → updateAggregatorOrderStatus({ new_status: 'Dispatched', extra: { rider_name, rider_phone_number } })
  → Socket update → fOrderStatus changes to 5 → card shows "Dispatched" label
  → When rider completes delivery → socket → fOrderStatus = 6 (terminal) → card removed from board
```

This is already fully wired. The only change is the button **label**: "Dispatch" → "Ready to Dispatch".

---

## 5. Print Flow (New)

### A. On Accept (PopOut checkboxes)

```
AggregatorOrderPopOut shows:
  ☑ Print KOT  (default: settings.aggregatorAutoKot)
  ☑ Print Bill  (default: TBD — no aggregator auto bill setting exists)
  [Prep Time pills]
  [Accept] [Reject]

Staff clicks Accept:
  1. updateAggregatorOrderStatus({ new_status: 'Acknowledged', extra: { prep_time_mins } })  ← existing
  2. IF KOT checked → manuallyPrintAggregator(order.aggrId, 'aggr_kot')  ← NEW separate call
  3. IF Bill checked → manuallyPrintAggregator(order.aggrId, 'aggr_bill')  ← NEW separate call
```

The print calls are **separate from the accept call**. The accept endpoint payload stays unchanged. Checkboxes control whether the frontend fires additional print API calls after accept succeeds.

### B. Manual Reprint (Card buttons)

```
Staff clicks KOT/Bill button on OrderCard or TableCard:
  → manuallyPrintAggregator(order.aggrId, 'aggr_kot' or 'aggr_bill')
  → POST /api/v1/urbanpiper/manually-print-aggregator
    → { aggr_order_id: "1783932198", aggr_order_type: "aggr_kot" }
  → Toast success/failure
```

Available at **fOS=1 (Preparing)** and **fOS=2 (Ready)**.

---

## 6. Files Impact

| # | File | What Changes | Est. Lines |
|---|------|-------------|-----------|
| 1 | `api/transforms/aggregatorTransform.js` | +Map `aggrigator_id` → `aggrId`. Change `customer` display label and `orderNumber` to use `aggrId`. | +3, ~3 edit |
| 1b | `api/transforms/profileTransform.js` | +Map `aggregator_auto_bill` → `aggregatorAutoBill` + `aggregator_auto_bill_stage` → `aggregatorAutoBillStage` (2 new settings) | +2 |
| 2 | `api/constants.js` | +`MANUALLY_PRINT` endpoint in `AGGREGATOR_ENDPOINTS` | +1 |
| 3 | `api/services/aggregatorService.js` | +`manuallyPrintAggregator(aggrOrderId, aggrOrderType)` function | +8 |
| 4 | `components/dashboard/AggregatorOrderPopOut.jsx` | +KOT/Bill checkboxes, default from `settings.aggregatorAutoKot` + `settings.aggregatorAutoBill`, fire print calls on accept | +40 |
| 5 | `components/cards/OrderCard.jsx` | Fix KOT handler for aggregator → `manuallyPrintAggregator()`. Add Bill button at fOS 1+2. Fix ID display → `aggrId`. "Dispatch" → "Ready to Dispatch". | +30, ~10 edit |
| 6 | `components/cards/TableCard.jsx` | Add KOT+Bill buttons at fOS 1+2 for aggregator. Fix customer display → `aggrId`. "Dispatch" → "Ready to Dispatch". | +35, ~5 edit |

**Total: 7 files, ~135 net lines**

**Files NOT touched:** `orderTransform.js`, `printerAgentSelector.js`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `RePrintButton.jsx`, `AllOrdersReportPage.jsx` (deferred), `socketHandlers.js`

---

## 7. All Owner Decisions — Resolved

| # | Question | Resolution |
|---|----------|------------|
| OD-1 | Print on AggregatorOrderPopOut? | **YES** — KOT + Bill checkboxes. Defaults from `aggregatorAutoKot` / `aggregatorAutoBill` settings. Staff can override before accept. |
| OD-2 | Which lifecycle states? | **fOS=1 (Preparing) + fOS=2 (Ready)**. Label: "Dispatch" → "Ready to Dispatch". |
| OD-3 | AllOrdersReport print? | **Deferred** to next CR (aggregator reports not built yet). |
| OD-4 | Which ID? | **`aggrigator_id`** from raw API. Display everywhere on cards. Use as `aggr_order_id` in print API. |
| OD-5 | Bill checkbox default? | **`aggregator_auto_bill`** key exists in backend. Owner will provide exact flag during Gate 3. Map in `profileTransform.js`. |

---

## 8. Latent Bug (Fixed by this CR)

**OrderCard.jsx line 992:** KOT button visible for aggregator orders, calls `printOrder()` → `order-temp-store` (wrong endpoint). **Fix:** Intercept `isAggregator` and route to `manuallyPrintAggregator()`.

---

*Impact Analysis v3 complete. All owner decisions resolved. No remaining blockers. Ready for Gate 3 (Implementation Plan) — owner will provide `aggregator_auto_bill` flag details during planning.*
