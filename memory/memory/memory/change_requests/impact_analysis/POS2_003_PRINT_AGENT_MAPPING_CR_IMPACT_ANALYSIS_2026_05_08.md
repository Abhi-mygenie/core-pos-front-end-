# POS2-003 — Print Agent Mapping + Printer Payload + Place-Order v1 Endpoint
## CR Impact Analysis — 2026-05-08 (v1)

> **Sprint:** pos2.0
> **CR ID:** POS2-003
> **Type:** CR Analysis Only — NO code, NO `/app/memory/final/` edits, NO implementation, NO QA.
> **Predecessors:** POS2-001 (Bill payload retention) — no overlap. POS2-002 (Web YTC pop-out) — no overlap; that CR is socket/dashboard-side, this CR is print/place-order-side.
> **Owner ask (verbatim):** Profile API now returns `print_agent`. Map each entry into a `printer_agent` array and inject it into (1) `order-temp-store` and (2) `place-order`. Switch place-order endpoint from v2 to v1. No other behavioural change.

---

## 1. Executive Summary

| Item | Verdict |
|---|---|
| **Scope is FE-additive** | The CR adds one new field (`printer_agent`) to two existing payloads and switches one endpoint constant from v2 to v1. No business-logic changes. |
| **Single chokepoint for printing** | All print flows funnel through `api/services/orderService.js:120 printOrder(...)`. Injection of `printer_agent` is a single-site change. |
| **Two chokepoints for place-order** | `OrderEntry.jsx:796-828` (placeOrder) and `OrderEntry.jsx:1394-1414` (placeOrderWithPayment). Payload-builders are centralised in `api/transforms/orderTransform.js:730` and `:895`. Endpoint string is centralised at `api/constants.js:41`. |
| **Profile API DROPS `print_agent` today** | `profileTransform.js:171` maps only `restaurant_printer_new` → `restaurant.printers`. **`print_agent` is not retained anywhere.** A new selector / helper is required. |
| **No `audiofile` in current FE multipart** | A grep of the entire `frontend/src` tree returns ZERO matches for `audiofile` / `audio_file` / `formData.append('audio*')`. Today's `place-order` body is `multipart/form-data` with a single `data` field carrying JSON. v1 endpoint switch must preserve this exact shape. |
| **Baseline silent** | `/app/memory/final/*` does not mention `print_agent`, `printer_agent`, or print-agent mapping. EH-04 (request-shape gates) and FA-05 (endpoint centralisation) are the only governing baseline rules. |
| **v2 → v1 swap is mechanical** | Only `API_ENDPOINTS.PLACE_ORDER` at `api/constants.js:41` needs to change. Both call sites read the constant. **NO call site uses a hardcoded path string for place-order.** |
| **Risk class** | LOW for FE; load-bearing on backend confirmation that the v1 `place-order` endpoint accepts the exact same multipart body + new `printer_agent` field, and that backend templates accept `printer_agent` on `order-temp-store`. |

**Final verdict (preview):** `needs_backend_confirmation + needs_owner_confirmation` — see §14.

---

## 2. Baseline / Overlay Reconciliation

### 2.1 Mandatory reading order followed
1. `/app/memory/final/` — read in earlier sessions (FINAL_DOCS_APPROVAL_STATUS, ARCHITECTURE_DECISIONS_FINAL, MODULE_DECISIONS_FINAL, CHANGE_REQUEST_PLAYBOOK, IMPLEMENTATION_AGENT_RULES, OPEN_QUESTIONS_FINAL_RESOLUTION, FINAL_DOCS_SUMMARY).
2. Overlay — `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`, `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`, `PENDING_TASK_REGISTER_2026_05_04.md`, `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`, `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`.
3. CR-specific — searched `/app/memory/change_requests/` for `print_agent`, `printer_agent`, `restaurant_printer`, `order-temp-store`, `place-order`. **Existing print/CR-013 docs** (`CR_013_GST_CONFIG_CORRECTION.md`, `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md`, `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`, `implementation_plans/CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md`) **cover bill print payload anatomy; none mention `printer_agent`**.
4. Code — see §3.

### 2.2 Baseline coverage (search result)

| Question | Baseline answer | Evidence |
|---|---|---|
| Does baseline mention `print_agent` or `printer_agent`? | **No.** Zero hits in `/app/memory/final/*`. | grep result. |
| Does baseline define which endpoints own print payloads? | **At rule level only.** FA-05 says code is implementation truth; EP-* govern endpoint centralisation; EH-04 governs request-shape gates. | `ARCHITECTURE_DECISIONS_FINAL.md FA-05 / EP-* / EH-04`. |
| Does baseline assign a module owner for the print/KOT flow? | **Yes.** Module 4 (OrderEntry / Cart / Payment) owns the place-order builder. Module 11 (Bill / Collect) owns the bill print flow. Settings module owns printer config UI (which reads `restaurant.printers` already in scope). | `MODULE_DECISIONS_FINAL.md §4, §11`. |
| Does baseline define which API version each endpoint should use? | **No.** Versioning is implementation detail; FA-05 says code is truth. | — |
| Does baseline describe a printer-agent / printer-daemon concept? | **No.** | — |

### 2.3 Overlay coverage

| Doc | Relevance to POS2-003 | Status |
|---|---|---|
| `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | No `printer_agent` row. Does cover CR-008 / D1-Cap / D1-Gate (delivery charge) — out of scope for this CR. | No conflict |
| `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | No `printer_agent` row. | No conflict |
| `PENDING_TASK_REGISTER_2026_05_04.md` | No `printer_agent` task. BE-U (CR-005 web-order attribution) is unrelated. | No conflict |
| `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` | No `print_agent` discussion. | No conflict |
| `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` | Defines bill print payload anatomy (cgst_amount/sgst_amount addition). **Does NOT mention `printer_agent`** — POS2-003 adds an additive top-level field; no key collision. | Compatible |
| `implementation_plans/CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md` | Same as above — bill print runtime details only. | Compatible |
| `qa_reports/A0a_UI_COD_MASK_QA_REPORT.md`, `qa_reports/CR_007_A2_QA_REPORT.md` | Tangential mentions of printing UI; no `print_agent` rule. | No conflict |

**Net:** Baseline + overlay are silent on `print_agent`. POS2-003 establishes a new additive contract. **No baseline rewrite required; nothing to override.**

### 2.4 Pending backend print-agent work

A grep across overlay docs returns **zero pending backend asks** about a `print_agent` field on the profile API. The only known backend field-work in overlay (BE-U / CR-005 Phase A web-order attribution) is unrelated.

→ Owner's claim that profile API now returns `print_agent` is the first time this field appears in any overlay/baseline doc. POS2-003 must verify the field shape against the live profile endpoint before freeze (see §11 backend asks).

### 2.5 Conflict assessment

**No conflict between this CR and approved baseline.** All proposed changes are additive within Module 4 (place-order payload) and Module 11 (bill/KOT print payload). The endpoint version change is a one-line move within the centralised `API_ENDPOINTS` constant (`FA-05` honoured — code is the truth, no rule says v2 is mandatory).

---

## 3. Current Code Flow Map

### 3.1 Profile fetch / storage / consumers

```
LoadingPage.jsx:189  →  profileService.getProfile()
                       └─ api/services/profileService.js:11-14
                            └─ GET API_ENDPOINTS.PROFILE  (= "/api/v2/vendoremployee/vendor-profile/profile")
                            └─ fromAPI.profileResponse(response.data)
                                 └─ api/transforms/profileTransform.js:70
                                      ├─ user
                                      ├─ restaurant   (api.restaurants[0])
                                      └─ permissions  (api.role)

LoadingPage.jsx:201  →  setRestaurant(data.profile.restaurant)
                       └─ contexts/RestaurantContext.jsx:7  (state)
                            ├─ useRestaurant().restaurant       (full object)
                            ├─ useRestaurant().printers         ← restaurant_printer_new (existing)
                            ├─ useRestaurant().settings         ← settings.* (existing)
                            ├─ useRestaurant().paymentTypes
                            └─ ... (no printer_agent / print_agent surfaced today)
```

**Verified via:** `pages/LoadingPage.jsx:28, 189, 201`; `api/services/profileService.js:11-14`; `api/transforms/profileTransform.js:70-204, 233-243`; `contexts/RestaurantContext.jsx:1-126`.

### 3.2 Existing printer-related state

| Key in API response | Mapped to | File:line | Used by |
|---|---|---|---|
| `restaurant_printer_new` | `restaurant.printers[]` (id, name, type, paperSize, categoryIds, isActive) | `profileTransform.js:171, 233-243` | `useRestaurant().printers` — Settings UI / printer-config screens (read-only display). NOT used in `order-temp-store` or `place-order` payloads today. |
| `restaurant_printer_config` | **Not mapped** | — | — |
| `restaurant_printer_windows_config` | **Not mapped** | — | — |
| `print_agent` (NEW per CR) | **Not mapped today; CR proposes adding `restaurant.printerAgents[]`** | — | Will be consumed by `order-temp-store` (`printer_agent` field) and `place-order` (`printer_agent` field) per CR. |

→ **Code-evidenced gap:** Today the FE only reads `restaurant_printer_new`. Even if backend already ships `print_agent`, the FE silently drops it.

### 3.3 Print flow (`order-temp-store`)

```
[Print trigger UI]
  ├─ OrderCard.jsx:109   manual KOT  →  printOrder(orderId, 'kot', stationKot)
  ├─ OrderCard.jsx:134   manual bill →  printOrder(orderId, 'bill', null, order, ...)
  ├─ TableCard.jsx:129   manual KOT  →  printOrder(...)
  ├─ TableCard.jsx:158   manual bill →  printOrder(...)
  ├─ RePrintButton.jsx:50  manual KOT
  ├─ RePrintButton.jsx:110 manual bill
  ├─ OrderEntry.jsx:1233   manual bill (collect-payment path)
  ├─ OrderEntry.jsx:1335   auto bill (after place-order, prepaid one-shot)
  └─ OrderEntry.jsx:1550   auto bill (after collect-bill)

[Single chokepoint]
  api/services/orderService.js:120  printOrder(orderId, printType, stationKot, orderData, scPct, overrides)
       │
       ├─ if printType === 'bill' && orderData
       │     payload = toAPI.buildBillPrintPayload(orderData, scPct, overrides)
       │            (orderTransform.js:1226-1554; full bill object;
       │             contains print_type='bill', station_kot='')
       │
       └─ else
             payload = { order_id, print_type, station_kot }     // KOT path
                                                                  (or bill-without-orderData)

  api.post(API_ENDPOINTS.PRINT_ORDER, payload)        // = POST /api/v1/vendoremployee/order-temp-store
  Content-Type: application/json (default for axios)
```

**Verified via:** `api/services/orderService.js:108-139`; `api/transforms/orderTransform.js:1226-1554`; `api/constants.js:60`; call-site greps above.

→ **Single insertion point:** `printOrder()` at `orderService.js:120-139`. Inject `printer_agent` here based on `printType`, `stationKot`, and the new selector from §3.1.

### 3.4 Place-order flow

```
[Place trigger UI]
  ├─ OrderEntry.jsx:796-828    placeOrder (postpaid, fire-and-forget HTTP)
  └─ OrderEntry.jsx:1394-1414  placeOrderWithPayment (prepaid, awaited HTTP)

[Payload builder]
  ├─ orderTransform.js:730-808   toAPI.placeOrder(table, cartItems, customer, orderType, options)
  │     produces JSON body — keys include: print_kot ('Yes'/'No'), cart[], totals, customer, etc.
  │     (CURRENTLY no printer_agent field)
  └─ orderTransform.js:895-...   toAPI.placeOrderWithPayment(... paymentData ...)
        same shape + payment fields

[Multipart wrapper]
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

[Endpoint constant]
  api/constants.js:41
    PLACE_ORDER: '/api/v2/vendoremployee/order/place-order'   ← TARGET OF v2 → v1 SWAP
```

**Verified via:** `components/order-entry/OrderEntry.jsx:796-828, 1394-1414`; `api/transforms/orderTransform.js:730-808, 895-...`; `api/constants.js:41`.

→ **Insertion points:** `printer_agent` is injected by extending the payload object inside `toAPI.placeOrder` and `toAPI.placeOrderWithPayment`. Endpoint swap is a one-line edit at `api/constants.js:41`.

### 3.5 Multipart shape — `audiofile` check

A grep across `/app/frontend/src/**/*.{js,jsx}` for `audiofile`, `audio_file`, `formData.append('audio*')` returns **zero matches**. The current place-order multipart contains exactly one part: `data`. The v1 endpoint must accept this exact multipart shape (single `data` JSON part, no audio).

→ Recorded as backend ask BE-PA1 in §11.

### 3.6 KOT station-set source today

| Print path | Where stations come from | File:line |
|---|---|---|
| Manual KOT (cards / re-print) | `selectedStations` array from station picker UI, joined with `,` | `OrderCard.jsx:108`, `TableCard.jsx:128`, `RePrintButton.jsx:49` |
| Auto KOT during place-order | NOT carried as a separate field. Each `cart[].station` carries the per-item station. Backend infers stations from cart contents. | `orderTransform.js:730-808` (cart items) + `OrderEntry.jsx:811` (`cartStations` log) |
| `station_kot` field on print payload | Only present on `order-temp-store` calls, not on `place-order`. KOT path = comma-joined string. Bill path = `''`. | `orderService.js:127-132`; `orderTransform.js:1539` |

→ For deriving `printer_agent` station-set on `place-order`, the source is the **distinct set of `cart[].station` values among unplaced items** (`unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled')` per `orderTransform.js:733`). For `order-temp-store` KOT, the source is the **comma-split `stationKot` argument**.

---

## 4. Profile API — Storage / Mapping Findings

### 4.1 Current state (code-anchored)

- Profile fetched once at login bootstrap (`LoadingPage.jsx:189`), transformed via `fromAPI.profileResponse`, written to `RestaurantContext`. **Single source of truth for restaurant-level data.**
- `print_agent` is **not retained**. A future-proof selector must (a) read `restaurant_printer_new` (already there) AND (b) read `print_agent` (new) AND (c) expose a normalised `printerAgents[]` shape for downstream payload builders.

### 4.2 Proposed normalisation surface (analysis-only, not implementation)

| Backend key (per CR) | Normalised JS shape (proposed) | Notes |
|---|---|---|
| `print_agent[]` | `restaurant.printerAgents[]` | Array of normalised entries (one per print_agent row). |
| `mapping.area_name` | `entry.station` | Casing: see §5 OQ-PA-1. |
| `mapping.default_employee_id` | `entry.printerAgentId` | Type: see §5 OQ-PA-3. |
| `printer_data[0].printer_name` | `entry.printerType` | Per CR mapping. |
| `printer_data[0].printer_ip` | `entry.printerIp` | — |
| `printer_data[0].printer_paper_roll` | `entry.printerPaperRoll` | Type: see §5 OQ-PA-3. |
| `printer_data[0].vendor_id` | `entry.vendorId` | Often null (USB printers); see §5 OQ-PA-4. |
| `printer_data[0].product_id` | `entry.productId` | Often null. |
| `printer_data[0].wifi_printer_ip` | `entry.wifiPrinterIp` | Often null. |
| `printer_data[0].wifi_printer_name` | `entry.printerName` | Note: wifi_printer_name maps to outgoing `printer_name`, distinct from the internal `printerType` source field. |

→ Normalisation lives in `profileTransform.js` (new helper `fromAPI.printerAgents()`); `restaurant.printerAgents[]` is read by `printOrder()` and `toAPI.placeOrder/placeOrderWithPayment`.

### 4.3 Downstream wire shape (per CR-frozen mapping)

A single normalised entry serialises back to the wire shape the backend expects on `order-temp-store` and `place-order`:

```json
{
  "station": "KDS",
  "printer_agent_id": "3429",
  "printer_type": "usb",
  "printer_ip": "38:29:E0:8B:E3:2B",
  "printer_paper_roll": "58",
  "vendor_id": null,
  "product_id": null,
  "wifi_printer_ip": null,
  "printer_name": "POS58 Printer(2)"
}
```

### 4.4 Missing / empty handling

| Scenario | Proposed default | Status |
|---|---|---|
| `print_agent` field missing on profile response | `restaurant.printerAgents = []` | **Locked default** (consistent with `printers: []` fallback at `profileTransform.js:171, 234`). |
| `print_agent` is empty array | `restaurant.printerAgents = []` | Locked. |
| A specific entry has `printer_data: []` | Skip that entry (no usable printer data) OR include with all `printer_*` keys = null. | **OQ-PA-5 — owner choice.** Default proposal: skip (cleaner payload, matches "no printer mapped"). |
| A specific entry has multiple `printer_data` entries | Use `printer_data[0]` per CR mapping; flag others for diagnostics only. | **Owner-confirmed in CR brief — locked.** |
| `mapping.area_name` is missing/blank | Skip the entry (cannot match against cart stations). | **OQ-PA-6 — owner choice.** Default: skip. |
| Multiple `print_agent` rows have the same `area_name` | Keep all (backend handles dedup) OR last-wins? | **OQ-PA-7 — owner choice.** Default: keep all (lowest FE intervention). |

---

## 5. `printer_agent` Mapping Spec

### 5.1 Frozen mapping (per CR brief)

| Source path on `print_agent[]` entry | Output key on serialised `printer_agent[]` entry |
|---|---|
| `mapping.area_name` | `station` |
| `mapping.default_employee_id` | `printer_agent_id` |
| `printer_data[0].printer_name` | `printer_type` |
| `printer_data[0].printer_ip` | `printer_ip` |
| `printer_data[0].printer_paper_roll` | `printer_paper_roll` |
| `printer_data[0].vendor_id` | `vendor_id` |
| `printer_data[0].product_id` | `product_id` |
| `printer_data[0].wifi_printer_ip` | `wifi_printer_ip` |
| `printer_data[0].wifi_printer_name` | `printer_name` |

### 5.2 Open mapping questions

| OQ | Question | Owner default proposed | Status |
|---|---|---|---|
| **OQ-PA-1** | Should station matching be **case-insensitive** when filtering for "BILL" / "KDS" / "BAR"? | **Yes — case-insensitive comparison.** | still_open_owner |
| **OQ-PA-2** | Should the outgoing `station` value preserve backend casing or normalise to upper-case? | **Preserve backend casing as received** (avoid mutating the backend's source-of-truth label). | still_open_owner |
| **OQ-PA-3** | Should `printer_agent_id` and `printer_paper_roll` be sent as **string** or **number**? | **String** — matches the example payload in the CR brief (`"3429"`, `"58"`) and matches existing `restaurant.printers[].id` typing pattern. | still_open_owner |
| **OQ-PA-4** | Should `null` values be preserved as JSON `null` or converted to empty string `""`? | **Preserve as `null`** — matches the example payload in the CR brief (`vendor_id: null`). | still_open_owner |
| **OQ-PA-5** | What happens if `printer_data` is empty for a given entry? | **Skip that entry from the outgoing array.** | still_open_owner |
| **OQ-PA-6** | What happens if `mapping.area_name` is blank/null? | **Skip that entry** (cannot station-match). | still_open_owner |
| **OQ-PA-7** | What happens if multiple `print_agent` rows share the same `area_name`? | **Keep all** (no FE dedup; backend decides). | still_open_owner |
| **OQ-PA-8** | `printer_data[0]` only — confirm. CR brief says "use the first entry"; owner has already locked this. | **Use `[0]` only; ignore [1..n].** | **CLOSED per CR brief** |

---

## 6. `order-temp-store` Impact

### 6.1 Single chokepoint = one site to inject `printer_agent`

`api/services/orderService.js:120 printOrder(...)` is the **only** caller of `API_ENDPOINTS.PRINT_ORDER`. All 9 print call sites in §3.3 funnel through it. `printer_agent` injection happens here based on:
- `printType` → BILL vs KOT branch
- `stationKot` (KOT only) → station filter set
- `restaurant.printerAgents[]` from `RestaurantContext` → source

### 6.2 BILL print rules (per CR + analysis)

| Rule | Source | Recommendation |
|---|---|---|
| `print_type: 'bill'` | Existing (orderService.js:131) — unchanged. | — |
| Send only BILL agent ideally | CR brief | Filter `restaurant.printerAgents[]` where `entry.station` matches "BILL" (case-insensitive per OQ-PA-1). |
| If KDS/BAR are also sent, backend can handle it | CR brief — graceful fallback | If no entry matches "BILL", **omit `printer_agent`** OR send the full array; **owner default = omit** to honour "send only BILL agent". |
| BILL print does NOT need any KOT station agents | CR brief | No KDS/BAR agents in BILL payload by default. |

**Locked behaviour:**
- BILL, BILL-agent available → `printer_agent: [bill_entry]`
- BILL, BILL-agent missing → `printer_agent: []` (or omit key — see OQ-PA-9 below)

### 6.3 KOT print rules (per CR + analysis)

| Rule | Source | Recommendation |
|---|---|---|
| `print_type: 'kot'` | Existing (orderService.js:129) — unchanged. | — |
| `station_kot` may contain `"BAR,KDS"` | Existing FE behaviour at `OrderCard.jsx:108`, `TableCard.jsx:128`, `RePrintButton.jsx:49` | Continue sending `station_kot`. Additionally split this string into a station-set and filter `restaurant.printerAgents[]` to the matching subset. |
| Send only required KOT station agents | CR brief | `printer_agent[]` = entries whose `station` matches any token in the comma-split `station_kot` (case-insensitive per OQ-PA-1). |
| Do NOT send BILL agent for KOT | CR brief | Exclude any entry whose `station` matches "BILL" (case-insensitive). |

**Locked behaviour:**
- KOT, `station_kot = "KDS,BAR"`, both agents available → `printer_agent: [KDS_entry, BAR_entry]`
- KOT, only KDS available → `printer_agent: [KDS_entry]`
- KOT, no station agents available → `printer_agent: []`

### 6.4 Auto-print flows are also covered

- **Auto bill print** (`OrderEntry.jsx:1335, 1550`) calls the same `printOrder(...)` with `printType='bill'` → automatically picks up the BILL agent.
- **Manual bill** / **manual KOT** / **re-print** all funnel through the same `printOrder(...)`.
- **Room-order / delivery-order bill print** path (RePrint, OrderCard, TableCard) reaches the same chokepoint — same agent selection rules apply.

→ **Single insertion site, all 9 call paths covered.**

### 6.5 Open `order-temp-store` questions

| OQ | Question | Owner default | Status |
|---|---|---|---|
| **OQ-PA-9** | When the matched-agent set is empty, should FE send `printer_agent: []` (empty array) or **omit the key** entirely? | **Send `printer_agent: []`** — explicit absence is clearer than implicit missing key for backend logging. (Backend should treat both as "no agents", but explicit array is preferred.) | still_open_owner |
| **OQ-PA-10** | Should `print_agent` be injected onto **both** the BILL full-payload (built in `buildBillPrintPayload`) and the KOT minimal payload (built inline in `printOrder`)? | **Yes, both.** | still_open_owner (mechanical default) |
| **OQ-PA-11** | Should the existing `station_kot` field (currently `''` for bill, `"KDS,BAR"` for KOT) remain unchanged after `printer_agent` is added? | **Yes — leave `station_kot` exactly as today** (additive change, no behaviour shift). Backend can still rely on `station_kot` for templating. | still_open_owner (mechanical default) |
| **OQ-PA-12** | Should `printer_agent` ordering match the order in `print_agent` from the API, or be sorted (e.g., BILL first, KOT next)? | **Preserve API order.** No FE sort. | still_open_owner |

---

## 7. `place-order` Endpoint Impact

### 7.1 Endpoint swap

| Today | Proposed | File:line |
|---|---|---|
| `PLACE_ORDER: '/api/v2/vendoremployee/order/place-order'` | `PLACE_ORDER: '/api/v1/vendoremployee/order/place-order'` | `api/constants.js:41` |

Notes:
- The CR brief specifies the new endpoint as `https://preprod.mygenie.online/api/v1/vendoremployee/order/place-order`. The host portion (`https://preprod.mygenie.online`) is provided by `REACT_APP_API_BASE_URL` (already in `frontend/.env`); the path constant should be **path-only** to remain consistent with every other entry in `API_ENDPOINTS` (e.g., `PRINT_ORDER`, `BILL_PAYMENT`). Therefore the constant becomes `/api/v1/vendoremployee/order/place-order`.
- Both call sites (`OrderEntry.jsx:819, 1414`) read `API_ENDPOINTS.PLACE_ORDER` — no other change required.
- `UPDATE_ORDER: '/api/v2/vendoremployee/order/update-place-order'` is **NOT in CR scope**. Out-of-scope per the CR brief (only place-order changes).
- `PREPAID_ORDER`, `BILL_PAYMENT` — also unchanged.

### 7.2 Centralisation verified

- A grep for `place-order` in `frontend/src/**/*.{js,jsx}` confirms only **two runtime call sites** (`OrderEntry.jsx:819, 1414`) and **one constant declaration** (`constants.js:41`). All other matches are comments / test references.
- **No hardcoded path strings exist.** Endpoint swap = one-line edit.

### 7.3 Multipart parity check

| Aspect | Today | After v2 → v1 swap |
|---|---|---|
| HTTP method | POST | Must remain POST (BE-PA2). |
| Content-Type | `multipart/form-data` | Must remain (BE-PA2). |
| Multipart parts | `data` (single part, JSON-stringified payload) | Must remain. **No `audiofile` part exists today.** |
| Response shape | `{ order_id, message, ...}` (multi-shape capture at `OrderEntry.jsx:1420-1424`: `res.data.order_id`, `res.data.data.order_id`, `res.data.new_order_ids[0]`) | Must remain backwards-compatible (BE-PA3). The existing capture handles 3 shapes; v1 must hit at least one. |
| Body field changes | Only the addition of `printer_agent` (no rename / removal of any existing field) | Locked. |

### 7.4 Rules for `printer_agent` on `place-order`

| Rule | Source | Recommendation |
|---|---|---|
| `print_kot: 'Yes'` triggers KOT printing | Existing FE field (`orderTransform.js:764`) | If `print_kot === 'Yes'`, attach `printer_agent` filtered to KOT stations from cart. If `print_kot === 'No'`, **see OQ-PA-13**. |
| Cart-driven station set | Each `cart[].station` from `buildCartItem` carries the per-item station label | KOT station-set = distinct values of `cart[i].station` among unplaced items (matches `unplacedItems` filter at `orderTransform.js:733`). |
| BILL agent is NOT required for place-order | CR brief | Exclude any entry whose `station` matches "BILL" (case-insensitive). |
| Prepaid and postpaid both use the same place-order API | Code-confirmed: both `placeOrder` and `placeOrderWithPayment` POST to the same `API_ENDPOINTS.PLACE_ORDER` | Both builders inject `printer_agent` identically (gated on `print_kot === 'Yes'`). |

### 7.5 Auto-bill side-effect of place-order

After a prepaid `placeOrderWithPayment`, OrderEntry separately fires an auto-bill print (`OrderEntry.jsx:1335`) by calling `printOrder(...)`. **Auto-bill is a distinct `order-temp-store` call**, not a side-effect of place-order. So `printer_agent` for the bill flows through the chokepoint described in §6, not through the place-order builder.

→ This separation is preserved by the CR. No leakage of BILL agent into the place-order payload.

### 7.6 Open `place-order` questions

| OQ | Question | Owner default | Status |
|---|---|---|---|
| **OQ-PA-13** | When `print_kot !== 'Yes'`, should `printer_agent` be **omitted** entirely or sent as `[]`? | **Send `[]`** for parity with `order-temp-store` rule (OQ-PA-9). Both endpoints share the same convention. | still_open_owner |
| **OQ-PA-14** | If the cart contains items whose `station` does not match any `print_agent` entry, should those items contribute to `printer_agent: []` for that station, or be silently ignored? | **Silently ignored.** No phantom entries. Backend prints what's available. | still_open_owner |
| **OQ-PA-15** | Should `printer_agent` selection match against `cart[].station` raw values, or normalised (trimmed, case-folded)? | **Normalised match (trim + lowercase) — outgoing values still preserved as backend casing per OQ-PA-2.** | still_open_owner |
| **OQ-PA-16** | Should `update-place-order` (v1 already) also receive `printer_agent`? | **No — out of CR scope.** CR brief explicitly limits to `order-temp-store` + `place-order`. | **CLOSED per CR brief** |
| **OQ-PA-17** | Should `placeOrderWithPayment` also include `printer_agent` even though some prepaid orders may not auto-print KOT? | **Yes if `print_kot === 'Yes'` (same gate as `placeOrder`).** | still_open_owner |

---

## 8. Station-Selection Rules — Locked Summary

| Endpoint | print_type / mode | Station source | `printer_agent` filter |
|---|---|---|---|
| `order-temp-store` | `print_type: 'bill'` | Implicit "BILL" | Entries with `station` ≈ "BILL" (case-insensitive) |
| `order-temp-store` | `print_type: 'kot'` | `station_kot` argument (comma-split) | Entries whose `station` matches any token (case-insensitive); EXCLUDE entries with `station` ≈ "BILL" |
| `place-order` | `print_kot === 'Yes'` | `cart[i].station` distinct set among unplaced items | Entries whose `station` matches any cart station (case-insensitive); EXCLUDE entries with `station` ≈ "BILL" |
| `place-order` | `print_kot !== 'Yes'` | n/a | `printer_agent: []` (per OQ-PA-13 default) |

→ All four cases share **two pure helpers** that the next planning agent can centralise:
1. `selectAgentsForBill(printerAgents)` — returns BILL-only entries
2. `selectAgentsForKot(printerAgents, stationSet)` — returns KOT-only entries matching `stationSet`, excluding BILL

Both helpers honour OQ-PA-1 / OQ-PA-2 / OQ-PA-15 (case-insensitive match, preserve casing in output).

---

## 9. Missing / Empty / Fallback Behaviour — Locked Summary

| Scenario | Behaviour |
|---|---|
| `restaurant.printerAgents` not yet populated (login race) | Treat as `[]`. Print/place-order proceeds with `printer_agent: []`. Backend handles. |
| BILL print but no BILL agent exists | `printer_agent: []`. Backend may fall back to last-known printer. |
| KOT print but no station agent exists | `printer_agent: []`. |
| Place-order with `print_kot: 'No'` | `printer_agent: []`. |
| `printer_data: []` for an entry | Skip entry (per OQ-PA-5 default). |
| `mapping.area_name` blank | Skip entry (per OQ-PA-6 default). |
| Profile API has no `print_agent` field at all | `restaurant.printerAgents = []`; no payload regression. **Backwards-compatible.** |

→ **No path can crash** if `print_agent` is partly or fully missing. Worst case: `printer_agent: []` in payload. Backend continues with existing behaviour.

---

## 10. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| **R-PA-1** | v1 `place-order` endpoint rejects multipart `data`-only body that v2 accepts (different schema) | **HIGH** if true; **LOW** otherwise. Owner says only the version changes. | BE-PA2 — backend confirms v1 accepts identical multipart body |
| **R-PA-2** | v1 `place-order` response shape differs from v2 (e.g., no `order_id` field) breaking auto-bill at `OrderEntry.jsx:1420-1424` | MEDIUM | BE-PA3 — backend confirms response includes `order_id` (or one of the 3 captured shapes) |
| **R-PA-3** | Backend on `order-temp-store` does not yet accept `printer_agent` as an additive field (silent ignore vs hard 400) | MEDIUM | BE-PA4 — backend confirms additive field is silently accepted today, or explicit deployment timing aligned with FE |
| **R-PA-4** | Backend on v1 `place-order` does not yet accept `printer_agent` | MEDIUM | BE-PA5 — same as BE-PA4 for the place-order endpoint |
| **R-PA-5** | `print_agent` shape from the live profile API differs from owner's example (e.g., `printer_data` is an object, not array; or `mapping` is at top-level) | MEDIUM | BE-PA6 — owner provides a redacted live profile-API JSON snippet OR FE codes defensively (existence checks + Array.isArray) |
| **R-PA-6** | Multiple `print_agent` rows with the same `area_name` produce duplicate-station agents that confuse backend | LOW | OQ-PA-7 default = keep all; backend handles dedup. Else FE dedup is trivial. |
| **R-PA-7** | Case mismatch between `area_name` ("Bill" / "BILL" / "bill") and `cart[].station` ("BILL" / "Bill") leads to no agents matched | MEDIUM | OQ-PA-1 default = case-insensitive match. Implementation must use a single normalisation helper. |
| **R-PA-8** | Test coverage gap: existing `__tests__/api/transforms/updateOrderPayload.test.js` does not assert `printer_agent` shape on place-order | LOW | Add 1 test per builder (`placeOrder`, `placeOrderWithPayment`, `buildBillPrintPayload`) covering the four §8 cases. |
| **R-PA-9** | Switch from v2 to v1 affects retry / circuit-breaker behaviour somewhere | LOW — no retry middleware exists in `api/axios.js` | Code-verify in implementation step |
| **R-PA-10** | Aggregator orders / Swiggy / Zomato silent flow (`aggregatorAutoKot`) is affected | LOW — `profileTransform.js:269-272` notes this flag is intentionally not wired to client-side place-order | No change needed |
| **R-PA-11** | Print-agent list grows large; payload size on place-order increases noticeably | LOW — typical 2–4 entries | None needed for v1 |

---

## 11. Open Questions

### 11.1 Backend asks (load-bearing for freeze)

| ID | Ask | Audience |
|---|---|---|
| **BE-PA1** | Confirm `place-order` v1 accepts `multipart/form-data` with single `data` JSON part (no `audiofile`). | Backend |
| **BE-PA2** | Confirm `place-order` v1 accepts the exact same JSON body as v2 PLUS the additive `printer_agent` field. No other field rename / removal. | Backend |
| **BE-PA3** | Confirm `place-order` v1 response includes `order_id` (or one of: `data.order_id`, `new_order_ids[0]`) so auto-bill capture at `OrderEntry.jsx:1420-1424` continues to work. | Backend |
| **BE-PA4** | Confirm `order-temp-store` accepts the additive `printer_agent` field today (silent if extra) and that any deployment ordering between FE + BE is acceptable. | Backend |
| **BE-PA5** | Confirm `place-order` v1 accepts the additive `printer_agent` field (deployment-aligned). | Backend |
| **BE-PA6** | Provide a redacted live profile-API JSON snippet showing the exact shape of `print_agent[]` (array vs object, key casing, nested vs flat). | Backend / Owner |
| **BE-PA7** | Confirm the canonical station label set for `area_name` ("BILL", "KDS", "BAR" — uppercase? other tokens like "KITCHEN" / "PASTRY"?) so OQ-PA-1 case-insensitive match is sufficient. | Backend |
| **BE-PA8** | Confirm whether `update-place-order` should also receive `printer_agent` in a follow-up CR (not in this CR's scope). | Backend / Owner |

### 11.2 Owner-locked-with-defaults (still owner-confirmable)

OQ-PA-1 .. OQ-PA-15 above. Defaults are listed per item; owner may override.

### 11.3 Already closed

- OQ-PA-8 (`printer_data[0]` only) — closed per CR brief
- OQ-PA-16 (`update-place-order` out of scope) — closed per CR brief

---

## 12. Minimal, Production-Safe Implementation Sequence

> **Not an implementation plan. Sequence-only sketch for the next planning agent.**

### Phase A — Profile mapping (single-file change)
1. Extend `api/transforms/profileTransform.js`:
   - Add `fromAPI.printerAgents(apiPrintAgentArray)` helper that returns `[]` for missing/non-array input and otherwise normalises per §4.2.
   - Add `printerAgents: fromAPI.printerAgents(api.print_agent)` to the `restaurant` object at `profileTransform.js:171` (next line).
2. Surface `printerAgents` from `RestaurantContext` (memoised getter, mirrors existing `printers`).

**Files touched:** 2 (`profileTransform.js`, `RestaurantContext.jsx`).
**Risk:** zero — additive, backwards-compatible.
**Validation:** 1 unit test in `__tests__/api/transforms/profileTransform.test.js` covering: missing field → `[]`; sample-shape input → expected normalised output.

### Phase B — `order-temp-store` injection (single-file change)
3. Extend `api/services/orderService.js:120 printOrder()`:
   - Read `restaurant.printerAgents` via the consumer (caller passes it OR a `useRestaurant()`-style read at the chokepoint).
   - Compute `printer_agent` via `selectAgentsForBill` / `selectAgentsForKot` per §8.
   - Append to `payload.printer_agent`.
4. Add the two pure helpers `selectAgentsForBill` / `selectAgentsForKot` (probably in a new tiny file under `api/transforms/printerAgentSelector.js` or inline inside `orderService.js`).

**Files touched:** 1–2.
**Risk:** LOW — existing payload fields untouched.
**Validation:** add 2 tests covering BILL-only and KOT-with-stations selection.

### Phase C — `place-order` injection + endpoint swap (two-file change)
5. Edit `api/constants.js:41` — change v2 → v1.
6. Extend `api/transforms/orderTransform.js`:
   - In `toAPI.placeOrder` (L730) and `toAPI.placeOrderWithPayment` (L895), accept `printerAgents` via `options`, derive `cartStations` from unplaced items, compute KOT-filtered list, append `printer_agent` to payload (gated on `print_kot === 'Yes'` per OQ-PA-13).
7. Edit both call sites in `OrderEntry.jsx` (L796-808, L1394-1402) to thread `printerAgents: restaurant?.printerAgents || []` into `options`.

**Files touched:** 3.
**Risk:** MEDIUM — endpoint version change is verifiable only end-to-end. Pair with BE-PA1/2/3.
**Validation:** 2 tests in `__tests__/api/transforms/` (`placeOrderPayload.test.js` if missing, plus update of `updateOrderPayload.test.js` for parity check).

### Phase D — Smoke / parity validation (no code change)
8. Run §13 validation checklist end-to-end on preprod (after BE deployment).

**Total file footprint:** 5 files, all under `frontend/src/api/` and `frontend/src/components/order-entry/`.
**No UI change.** No business-logic change. No printing-architecture refactor.

---

## 13. Validation Checklist (for QA / next planning agent)

| # | Scenario | Expected `printer_agent` content |
|---|---|---|
| **V-1** | Manual BILL print, BILL agent available in `print_agent` | `[ {station:"BILL", ...} ]` |
| **V-2** | Manual BILL print, BILL agent missing | `[]` |
| **V-3** | Manual KOT print with `station_kot = "KDS,BAR"`, both agents available | `[ {KDS}, {BAR} ]` (BILL excluded) |
| **V-4** | Manual KOT print with `station_kot = "KDS,BAR"`, only KDS available | `[ {KDS} ]` |
| **V-5** | Place-order, cart has KDS+BAR items, `print_kot: 'Yes'` | `[ {KDS}, {BAR} ]` (BILL excluded) |
| **V-6** | Place-order, `print_kot: 'No'` | `[]` |
| **V-7** | Prepaid place-order (`placeOrderWithPayment`) with `print_kot: 'Yes'` | Same as V-5 |
| **V-8** | Postpaid place-order (`placeOrder`) with `print_kot: 'Yes'` | Same as V-5 |
| **V-9** | Dine-in place-order | Same rule as V-5/V-6 |
| **V-10** | Take-away place-order | Same rule |
| **V-11** | Delivery place-order (with delivery_charge) | Same rule; `delivery_charge` field still populated per CR-008 D1-Cap (untouched) |
| **V-12** | Room place-order | Same rule |
| **V-13** | Existing payload parity — no field other than `printer_agent` should change in `place-order` body | Diff against v2 payload pre-CR shows ONLY the additive `printer_agent` key |
| **V-14** | Existing payload parity — `order-temp-store` BILL payload preserves all 35+ fields from `buildBillPrintPayload` | Diff against pre-CR payload shows ONLY the additive `printer_agent` key |
| **V-15** | Auto-bill print after place-order (prepaid one-shot) — BILL agent attached | `[ {station:"BILL"} ]` |
| **V-16** | Re-print KOT from RePrintButton — same KOT rule | Same as V-3/V-4 |
| **V-17** | Profile API returns no `print_agent` field (graceful) | `printer_agent: []` on every payload; no crash |
| **V-18** | Profile API returns `print_agent` with malformed entry (missing `printer_data`) | Entry skipped per OQ-PA-5; remaining entries unaffected |
| **V-19** | `place-order` endpoint v1: HTTP 200 with `order_id` returned | Auto-bill capture at `OrderEntry.jsx:1420-1424` succeeds |
| **V-20** | `update-place-order` (out of scope) is unchanged | No `printer_agent` field present on update payload |

---

## 14. Final Verdict

```yaml
verdict: needs_backend_confirmation + needs_owner_confirmation
revision: v1 (2026-05-08)
ship_complexity: LOW (5 files, FE-additive, single-chokepoint print, two-chokepoint place-order, one-line endpoint swap)
risk_class: LOW for FE; MEDIUM if v1 place-order behaviour differs from v2 in any way other than additive printer_agent acceptance

unblocking_asks:
  backend_load_bearing:
    - BE-PA1 (multipart shape preserved)
    - BE-PA2 (v1 body parity + additive printer_agent)
    - BE-PA3 (v1 response shape includes order_id)
    - BE-PA4 (order-temp-store accepts additive printer_agent)
    - BE-PA5 (place-order v1 accepts additive printer_agent)
    - BE-PA6 (sample live profile-API print_agent shape)
    - BE-PA7 (canonical station label set)

  owner_quick_decisions (defaults proposed):
    - OQ-PA-1 (case-insensitive station match — recommended yes)
    - OQ-PA-2 (preserve backend casing in output — recommended yes)
    - OQ-PA-3 (string typing for ID + paper roll — recommended yes)
    - OQ-PA-4 (preserve null — recommended yes)
    - OQ-PA-5 (skip entry if printer_data empty — recommended yes)
    - OQ-PA-6 (skip entry if area_name blank — recommended yes)
    - OQ-PA-7 (keep duplicates by area_name — recommended yes)
    - OQ-PA-9 (send [] vs omit on no agents — recommended [])
    - OQ-PA-10 (inject on both BILL + KOT payloads — recommended yes)
    - OQ-PA-11 (leave station_kot field as today — recommended yes)
    - OQ-PA-12 (preserve API order — recommended yes)
    - OQ-PA-13 (place-order with print_kot:'No' → [] — recommended yes)
    - OQ-PA-14 (silently ignore unmatched cart stations — recommended yes)
    - OQ-PA-15 (normalised match — recommended yes)
    - OQ-PA-17 (placeOrderWithPayment same gate — recommended yes)

  closed_by_CR_brief:
    - OQ-PA-8 (printer_data[0] only)
    - OQ-PA-16 (update-place-order out of scope)

freeze_eligibility:
  current: NO — backend confirmations required (BE-PA1..7)
  unblock: ONE backend reply addressing BE-PA1..7 + owner sheet on OQ-PA-1..15
           (most OQs have safe defaults; if owner accepts the defaults verbatim
           the owner reply collapses to a single yes)

next_agent_invocation:
  1. Backend Contract Agent — single email covering BE-PA1..7,
     attaching the owner CR brief verbatim (request + response examples).
  2. Owner Decision Sheet — single set of 13 questions (OQ-PA-1..15
     minus closed OQ-PA-8/16) with the recommended defaults; owner can
     reply "all defaults accepted" to collapse the gate.
  3. CR Planning Agent — once both replies land, author the
     implementation plan along the §12 sequence.

what_NOT_to_change_post_v1:
  - /app/memory/final/* (untouched)
  - any source code (untouched in this analysis pass)
  - billing calculation, GST/SC/DC logic, cart item structure
  - KOT station derivation (we ADD a filter; we do not change cart[].station emission)
  - print_type values, station_kot format
  - prepaid/postpaid behavior, retry flows, scan/order flows,
    room/delivery/takeaway/dine-in handling
  - existing print UI, printing architecture
  - backend API contract beyond:
      a. additive printer_agent on order-temp-store and place-order
      b. place-order endpoint version v2 → v1
  - update-place-order, prepaid-paid-order, order-bill-payment, split-order endpoints
```

---

## 15. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| Baseline reading order followed | ✅ |
| Owner not asked anything already answered by baseline/overlay | ✅ — every OQ is genuinely undefined in baseline/overlay; only mechanical defaults are proposed |
| Print/KOT/place-order code claims anchored to file:line | ✅ — see §3 |
| `audiofile` claim verified by grep (negative match) | ✅ |
| `place-order` centralisation verified by grep | ✅ — only 2 runtime call sites + 1 constant |
| Single chokepoint claim for print verified by grep | ✅ — `printOrder` is the only `PRINT_ORDER` caller |
| `printer_agent` injection sites identified | ✅ — `printOrder()`, `toAPI.placeOrder`, `toAPI.placeOrderWithPayment` |
| No baseline rule conflict found | ✅ — baseline silent; overlay compatible |
| Stop after CR analysis | ✅ |

---

— End of POS2-003 CR Impact Analysis 2026-05-08 (v1) —

---

## 16. Backend + Owner Confirmation Addendum (2026-05-08 v2)

> **Type:** Read-only confirmation capture + verdict promotion. NO `/app/memory/final/` edits, NO code edits, NO implementation, NO QA. Appends to v1 above.
> **Agent:** CR Analysis Only Agent (POS2-003 v2 addendum)
> **Date:** 2026-05-08
> **Trigger:** Backend lead confirmed BE-PA1..9 and owner accepted all v1 defaults with 15 explicit lock rules.

### 16.1 Backend confirmation register (verbatim)

| ID | Ask | Backend reply | Status |
|---|---|---|---|
| **BE-PA1** | `place-order` v1 accepts the same `multipart/form-data` shape as v2 (single `data` JSON part, no `audiofile`). | **Yes** | ✅ confirmed |
| **BE-PA2** | v1 `place-order` response is compatible with current FE response handling (`OrderEntry.jsx:1420-1424` 3-shape capture: `res.data.order_id` / `res.data.data.order_id` / `res.data.new_order_ids[0]`). | **Yes** | ✅ confirmed |
| **BE-PA3** | `printer_agent` is accepted as an **additive** field on `place-order`. | **Yes** | ✅ confirmed |
| **BE-PA4** | `printer_agent` is accepted as an **additive** field on `order-temp-store`. | **Yes** | ✅ confirmed |
| **BE-PA5** | For BILL print, sending only the BILL agent is valid. | **Yes** | ✅ confirmed |
| **BE-PA6** | For KOT print / place-order, sending only KDS / BAR / matching-station agents is valid. | **Yes** | ✅ confirmed |
| **BE-PA7** | If `printer_agent` is missing or empty, backend behaviour remains safe (no error / no regression). | **Yes** | ✅ confirmed |
| **BE-PA8** | Canonical station labels expected: BILL / KDS / BAR / etc. | **Dynamic — labels are tenant-defined; not a fixed enum.** | ✅ confirmed (with **load-bearing implication** — see §16.3) |
| **BE-PA9** | Profile API `print_agent` structure is final and uses `printer_data[0]`. | **Yes** | ✅ confirmed |

### 16.2 Owner decision register (verbatim, mapped to v1 OQ-PA-* IDs)

| Owner rule (verbatim) | Maps to | Locked behaviour |
|---|---|---|
| **R-OWNER-1.** Preserve backend station casing from `mapping.area_name`. | **OQ-PA-2 — CLOSED** | Outgoing `station` field on `printer_agent[]` entries is the verbatim `mapping.area_name` value (no `.toUpperCase()` / `.toLowerCase()`). |
| **R-OWNER-2.** Match stations case-insensitively when selecting agents. | **OQ-PA-1 — CLOSED + OQ-PA-15 — CLOSED** | The match predicate normalises both sides (trim + lower-case) before comparing, but the OUTPUT preserves backend casing per R-OWNER-1. |
| **R-OWNER-3.** Convert `printer_agent_id` and `printer_paper_roll` to string in outgoing payload. | **OQ-PA-3 — CLOSED** | `String(mapping.default_employee_id)` and `String(printer_data[0].printer_paper_roll)` on emit. Empty / null inputs become empty string `""` (not `"null"` / `"undefined"` — verify in unit test). |
| **R-OWNER-4.** Preserve null values as null unless existing payload convention requires empty string. | **OQ-PA-4 — CLOSED with caveat** | Default = preserve `null`. Exception: `printer_agent_id` and `printer_paper_roll` are coerced to string per R-OWNER-3 (so `null` becomes `""` for those two fields only). All other fields keep `null`. |
| **R-OWNER-5.** Use only `printer_data[0]` as per current backend structure. | **OQ-PA-8 — already CLOSED in v1** | Reaffirmed. Indices `[1..n]` ignored (logged for diagnostics if helpful). |
| **R-OWNER-6.** If `print_agent` is missing/empty, do not break order or print flow; omit `printer_agent` OR send empty array as recommended by implementation plan; flag in logs/report. | **OQ-PA-9 — CLOSED + OQ-PA-13 — CLOSED + (NEW) R-LOG-1** | Decision: send `printer_agent: []` (explicit) per v1 default. Additionally: when the array is empty, FE emits a single console diagnostic line tagged `[printer_agent]` so the absence is observable in operator logs. Diagnostic is logged at `console.warn` (not `error`, to avoid Sentry/CRM noise). |
| **R-OWNER-7.** For BILL print, prefer only BILL agent. | **§6.2 + OQ-PA-9 — CLOSED** | `printer_agent[]` on `order-temp-store` with `print_type: 'bill'` = BILL-only filter (§8 row 1). |
| **R-OWNER-8.** For KOT print, send only matching station agents from `station_kot`; exclude BILL. | **§6.3 — CLOSED** | `printer_agent[]` on `order-temp-store` with `print_type: 'kot'` = match against comma-split `station_kot`, exclude BILL (§8 row 2). |
| **R-OWNER-9.** For place-order with `print_kot: 'Yes'`, send only matching KOT station agents from cart stations; exclude BILL. | **§7.4 — CLOSED + OQ-PA-14 — CLOSED + OQ-PA-17 — CLOSED** | `printer_agent[]` on `place-order` (both `placeOrder` and `placeOrderWithPayment`) when `print_kot === 'Yes'` = match against distinct `cart[].station` set among unplaced items, exclude BILL (§8 row 3). |
| **R-OWNER-10.** For place-order with `print_kot: 'No'`, do not send station agents unless backend explicitly requires empty array. | **OQ-PA-13 — CLOSED with refinement** | Backend confirmation BE-PA7 says missing/empty is safe → FE sends `printer_agent: []`. This matches R-OWNER-6 (parity across both endpoints). If a future backend reply mandates omission instead of `[]`, single-line change at the chokepoint. |
| **R-OWNER-11.** No change to billing / GST / service / delivery / cart logic. | §10 R-PA-* — locked | Reaffirmed. |
| **R-OWNER-12.** No change to prepaid/postpaid behavior. | §7.1 — locked | Both `placeOrder` and `placeOrderWithPayment` continue to POST to the same `API_ENDPOINTS.PLACE_ORDER`. Only the constant value swaps v2 → v1. |
| **R-OWNER-13.** No change to print UI. | §12 — locked | No UI / component / button / icon / route change. |
| **R-OWNER-14.** Endpoint change applies only to `place-order` v2 → v1. | §7.1 — locked | Only `API_ENDPOINTS.PLACE_ORDER` changes. `UPDATE_ORDER`, `PREPAID_ORDER`, `BILL_PAYMENT`, `SPLIT_ORDER`, `PRINT_ORDER`, `PROFILE`, `RUNNING_ORDERS`, `SINGLE_ORDER_NEW`, `CONFIRM_ORDER` and all other endpoints remain untouched. |
| **R-OWNER-15.** Planning agent MUST re-read `/app/memory/final/` and overlay docs **fresh**; do not rely on "already in context". | **NEW — §16.4 planning-agent gate** | See §16.4 for the planning-agent reading-order requirement. Failure to re-read = scope-creep risk per CHANGE_REQUEST_PLAYBOOK. |

### 16.3 Critical implication of BE-PA8 = dynamic

> **Backend confirmed canonical station labels are tenant-defined (dynamic), NOT a fixed enum (BILL / KDS / BAR / …).**
>
> **Owner confirmation (2026-05-08, follow-up reply):** *"yes it station name is dynamic"* — explicit owner sign-off on the dynamic-label interpretation below. Both backend (BE-PA8) and owner now agree: NO fixed station-label enum on FE.

This is load-bearing for the implementation contract:

| Implication | Locked rule |
|---|---|
| **No FE-side hard-coded canonical list** | The match predicate must NOT contain a literal allow-list of station names. The only literal token used by FE is the **BILL exclusion sentinel** in R-OWNER-8 / R-OWNER-9. Even there, "BILL" exclusion is a single configurable constant, not a list. |
| **BILL exclusion sentinel** | A single constant (proposed name `BILL_STATION_LABEL = 'BILL'`) used for case-insensitive comparison. If a tenant ever uses a non-`BILL` label for the bill station (e.g., `"Receipt"` / `"Counter"`), this constant would need to be either (a) overridden via profile config, or (b) treated as a future migration. **Phase A scope = literal `'BILL'` per CR brief.** |
| **Station-set source for KOT-on-place-order** | `cart[].station` is the dynamic source; agents are matched against it. No FE hardcoding. |
| **Station-set source for KOT-on-`order-temp-store`** | `stationKot` argument (caller-provided, comma-split) is the dynamic source. No FE hardcoding. |
| **Test fixtures must use varied station labels** | Unit tests must NOT use only "BILL" / "KDS" / "BAR". At least one fixture should use a non-canonical label like `"PASTRY"` or `"GRILL"` to prove the dynamic-label path works. |

→ **OQ-PA-7 (canonical station label set) — now CLOSED-as-dynamic.** No fixed list expected. Implementation must be label-agnostic except for the single BILL exclusion sentinel.

### 16.4 Planning-agent reading-order gate (per R-OWNER-15)

> The next agent (Implementation Planning Agent) MUST treat baseline / overlay context as **stale** and re-read fresh. The CR analysis above is anchored to a 2026-05-08 snapshot; it is NOT a substitute for reading the source-of-truth docs.

| Step | Mandatory action | Why |
|---|---|---|
| **G-1** | Re-read all of `/app/memory/final/*` from disk at the start of the planning session | New decisions may have landed since this analysis was written. CHANGE_REQUEST_PLAYBOOK rule: baseline docs are the source of truth for every CR session. |
| **G-2** | Re-read overlay docs explicitly named in §2.1 (BASELINE_RECONCILIATION_REPORT, FINAL_ACCEPTANCE_AND_DOC_SWEEP, PENDING_TASK_REGISTER, PENDING_WORK_BUCKETING, BACKEND_FIELD_UNPARK_DECISION) | Overlay register may now flag a related parked item. |
| **G-3** | Re-read CR-013 print-payload docs (`phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md`, `implementation_plans/CR_013_PRINT_PAYLOAD_RUNTIME_HANDOVER.md`, `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`) | Confirms no key collision with the additive `printer_agent` field on `buildBillPrintPayload`. |
| **G-4** | Re-grep the live code for `print_agent`, `printer_agent`, `restaurant_printer*`, `order-temp-store`, `place-order`, `audiofile` | Snapshot in §3 is dated 2026-05-08; code may have moved. |
| **G-5** | Verify the §16.1 backend reply is still current (no follow-up backend memo overriding BE-PA1..9) | A backend rollback would invalidate the implementation plan. |
| **G-6** | Verify the §16.2 owner reply is still current (no owner override) | Same reason. |
| **G-7** | If any of G-1..G-6 surfaces a delta, **STOP and update the CR analysis with a v3 addendum before writing implementation code** | Per CHANGE_REQUEST_PLAYBOOK: never silently override baseline / overlay / owner / backend. |

→ This gate is mandatory; reading the existing CR analysis alone is **NOT sufficient**.

### 16.5 Closed open-questions register

| OQ | Status | Resolution source |
|---|---|---|
| **OQ-PA-1** Case-insensitive station match | **CLOSED — yes (R-OWNER-2)** | Owner |
| **OQ-PA-2** Preserve backend casing in output | **CLOSED — yes (R-OWNER-1)** | Owner |
| **OQ-PA-3** String typing for ID + paper roll | **CLOSED — yes (R-OWNER-3)** | Owner |
| **OQ-PA-4** Preserve null | **CLOSED — yes, except R-OWNER-3 string fields (R-OWNER-4)** | Owner |
| **OQ-PA-5** Skip entry if `printer_data` empty | **CLOSED — yes (default accepted via R-OWNER "accept all safe defaults")** | Owner |
| **OQ-PA-6** Skip entry if `area_name` blank | **CLOSED — yes (default accepted)** | Owner |
| **OQ-PA-7** Keep duplicates by `area_name` | **CLOSED — yes (default accepted)** | Owner |
| **OQ-PA-8** `printer_data[0]` only | **CLOSED — yes (CR brief + BE-PA9 + R-OWNER-5)** | Backend + Owner + CR brief |
| **OQ-PA-9** Send `[]` vs omit on no agents | **CLOSED — send `[]` + log warning (R-OWNER-6)** | Owner |
| **OQ-PA-10** Inject on both BILL + KOT payloads | **CLOSED — yes (default accepted)** | Owner |
| **OQ-PA-11** Leave `station_kot` field as today | **CLOSED — yes (R-OWNER-13 print UI / R-OWNER-11 cart logic — additive only)** | Owner |
| **OQ-PA-12** Preserve API order | **CLOSED — yes (default accepted)** | Owner |
| **OQ-PA-13** Place-order with `print_kot:'No'` → `[]` | **CLOSED — yes (R-OWNER-10 + BE-PA7)** | Owner + Backend |
| **OQ-PA-14** Silently ignore unmatched cart stations | **CLOSED — yes (R-OWNER-9)** | Owner |
| **OQ-PA-15** Normalised match | **CLOSED — yes (R-OWNER-2)** | Owner |
| **OQ-PA-16** `update-place-order` out of scope | **CLOSED — out of scope (CR brief + R-OWNER-14)** | Owner + CR brief |
| **OQ-PA-17** `placeOrderWithPayment` same gate | **CLOSED — yes (R-OWNER-9)** | Owner |
| **(NEW) BE-PA8 dynamic-label implication** | **CLOSED — label-agnostic match; only BILL exclusion sentinel hard-coded** | §16.3 |

**All 17 OQs and 9 BE asks are now resolved.** No open question remains for either owner or backend.

### 16.6 Revised final verdict (v2)

```yaml
verdict: ready_for_requirement_freeze
revision: v2 (2026-05-08 — backend + owner confirmation captured)
delta_vs_v1:
  - All 9 BE-PA asks confirmed by backend (BE-PA1..9 = yes / yes / yes / yes / yes / yes / yes / dynamic / yes)
  - All 17 OQ-PA items locked by owner (15 owner rules + 2 already-closed-by-CR-brief)
  - New constraint surfaced: BE-PA8 = dynamic labels → no FE-side canonical
    list; only BILL exclusion sentinel is hard-coded (§16.3)
  - New planning-agent re-reading gate (R-OWNER-15 → §16.4 G-1..G-7)

freeze_eligibility:
  current: YES — POS2-003 is requirement-freeze ready
  blockers: NONE for owner or backend
  remaining_work: implementation planning only (§12 sequence is the
                  starting sketch; planning agent must perform
                  G-1..G-7 fresh re-read before authoring the plan)

ship_path:
  Phase_A: Profile mapping (profileTransform.js helper +
           RestaurantContext.jsx getter) — additive, zero risk
  Phase_B: order-temp-store injection (orderService.js single chokepoint)
           — single insertion site
  Phase_C: place-order injection (orderTransform.js placeOrder +
           placeOrderWithPayment) + endpoint swap (constants.js:41) +
           OrderEntry.jsx options threading (2 call sites)
  Phase_D: Validation per §13 V-1..V-20

label_handling_rules (per BE-PA8 dynamic):
  - station-output: VERBATIM mapping.area_name (R-OWNER-1)
  - station-match:  case-insensitive trim+lower compare (R-OWNER-2)
  - bill-exclusion: single sentinel constant 'BILL' (case-insensitive);
                    parameterised so a future tenant override is
                    a one-line config change
  - test fixtures:  must include at least one non-canonical label
                    (e.g., "PASTRY" / "GRILL") to prove label-agnostic
                    matching

empty-state rules (per R-OWNER-6 + BE-PA7):
  - both endpoints: emit printer_agent: [] (explicit)
  - log:            console.warn('[printer_agent] empty agent set
                    on <endpoint>') once per call site
  - no error / no toast / no UI change

what_NOT_to_change (reaffirmed):
  - /app/memory/final/* (untouched)
  - any source code (untouched in this analysis pass)
  - billing / GST / SC / DC logic (R-OWNER-11)
  - prepaid / postpaid behaviour (R-OWNER-12)
  - print UI (R-OWNER-13)
  - any endpoint other than place-order v2→v1 (R-OWNER-14)
  - cart item structure
  - KOT station derivation (we ADD a filter; cart[].station emission unchanged)
  - print_type values, station_kot format
  - existing socket-first / API-enrichment paths (POS2-002 untouched)
  - CR-008 D1-Gate isPrepaid behaviour
  - CR-013 bill print payload anatomy

next_agent_invocation:
  1. Implementation Planning Agent — invoked AFTER performing G-1..G-7
     re-read gate (§16.4). Output: detailed Phase A/B/C/D plan with
     file:line targets, unit-test fixtures, and rollout sequencing.
  2. Implementation Agent — invoked AFTER planning agent's plan is
     reviewed by owner. Owner sign-off on plan = green light to write
     code. NO code change before that sign-off.
  3. QA Agent — runs §13 V-1..V-20 on preprod after backend deployment
     confirmation.
```

### 16.7 Strict-rules compliance certification (v2 addendum)

| Rule | Status |
|---|---|
| `/app/memory/final/*` untouched | ✅ |
| No source code edited | ✅ |
| No implementation | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite (only this addendum appended) | ✅ |
| Owner + backend replies captured verbatim | ✅ |
| All 17 OQ-PA items resolved with audit trail to owner / backend reply | ✅ §16.5 |
| Dynamic-label backend reply (BE-PA8) → load-bearing implication captured (no FE hardcoded list) | ✅ §16.3 |
| Planning-agent re-reading gate documented (R-OWNER-15) | ✅ §16.4 |
| All v1 risks (R-PA-1..11) re-checked against v2 confirmations | ✅ — R-PA-1..5 mitigated by BE-PA1..7; R-PA-7 mitigated by R-OWNER-2; R-PA-6 mitigated by R-OWNER-7 (keep duplicates default accepted); R-PA-8/9/10/11 unchanged |
| Verdict promoted to `ready_for_requirement_freeze` only after ALL gates passed | ✅ |
| Stop after creating addendum | ✅ |

---

— End of Backend + Owner Confirmation Addendum (POS2-003 v2 · 2026-05-08) —
