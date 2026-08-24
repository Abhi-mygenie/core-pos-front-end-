# CR-135 — Impact Analysis (Gate 2, Final Clean)
**Date:** 2026-08-09 | **Last updated:** 2026-08-10 (all supplements merged)
**Role:** PLANNING
**Risk:** HIGH (external service — live Zomato/Swiggy platform actions)
**Code Reality:** NONE (aggregator-config/sync). PARTIAL (operational flags — read-only in profileTransform)
**Sprint:** pos_5_1

---

## All Owner Decisions — LOCKED (OD-1 → OD-23)

| OD | Decision | Locked |
|---|---|---|
| OD-1  | Full-page route `/aggregator/setup`, new "AGGREGATOR" top-level sidebar section | ✅ |
| OD-2  | Sidebar: "Aggregator Setup" (active) + "Food Mapping" (comingSoon) | ✅ |
| OD-3  | 2 tabs: Configuration (per-brand) + Operational Settings (restaurant-wide) | ✅ |
| OD-4  | Operational flags are restaurant-wide — brand selector does NOT affect Tab 2 | ✅ |
| OD-5  | Sync/Catalog/Stock/Timings → Menu Management (future CR). Out of CR-135 scope | ✅ |
| OD-6  | ~~Webhook URLs visible~~ — **REMOVED** (see OD-SS2) | ✅ |
| OD-7  | Save Configuration + Push Store are separate buttons | ✅ |
| OD-8  | Confirmation dialog before store-toggle disable/enable | ✅ |
| OD-9  | POST for both create + update on /aggregator-config (R25 exception, confirmed) | ✅ |
| OD-10 | CR-133 amendment: remove Aggregator Orders from AutoPrintTab.jsx **DONE 2026-08-10** | ✅ |
| OD-11 | After Operational save: call getSettings() → setRestaurant() merge | ✅ |
| OD-12 | Role gating deferred to later sprint | ✅ |
| OD-13 | Sync/stock-toggle deferred to Menu Management | ✅ |
| OD-14 | Add New Brand: suggested_store_id auto-fills Store ID | ✅ |
| OD-15 | Bonus Time Brackets editor included in OperationalTab | ✅ |
| OD-16 | `auto_aknowledge` in aggregator-config: skip in Config tab, use `auto_prep_time_ack` from settings only | ✅ |
| OD-17 | `auto_kot_id` out of scope UI — pass-through via `_raw` | ✅ |
| OD-18 | `notification_number` out of scope UI — pass-through via `_raw` | ✅ |
| OD-19 | Add New Brand: `name` + `phone` required; `email` + `address` optional. 2-step flow | ✅ |
| OD-20 | Platform Status: toggle = visual display only (NOT clickable). Button = sole action trigger | ✅ |
| OD-SS2| UrbanPiper Atlas Setup (webhooks) section **REMOVED** from Config tab | ✅ |
| OD-21 | Pass-through fields via `_raw` merge pattern (same as printerAgentConfigTransform) | ✅ |
| OD-22 | `aggregator_auto_bill_stage` hidden when `autoBill = false` — BY DESIGN | ✅ |
| OD-23 | `aggregator_auto_bill_stage` toAPI: capitalize (`'ready'` → `'Ready'`) | ✅ |

---

## Code Reality Check

```bash
grep -rn "aggregator-config\|aggregatorConfig\|urban_key\|urban_token" /app/frontend/src → 0 results
```

**Existing read paths (no write UI):**
- `profileTransform.js` L331–382: reads `aggregatorAutoKot`, `aggregatorAutoBill`, `aggregatorAutoBillStage`, `aggregatorOrderTone`, `defaultPrepTime`, `prepTimeCountMethod`, `autoPrepTimeAck`, `prepTimeBonusConfig` — no write path exists.
- `aggregatorPrepTime.js` (CR-109): reads `prepTimeBonusConfig` to compute dynamic prep time — no write path.

**Reused constants (no new constant needed):**
`RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS` already in constants.js L241 (used by CR-119).

**CR-133 amendment: COMPLETE 2026-08-10**
`AutoPrintTab.jsx` lines 37–47 removed (SectionTitle "Aggregator Orders" + 2 toggles + conditional stage select).

---

## Conflict Pre-Check

| File | Last modifier | Conflict? |
|---|---|---|
| `Sidebar.jsx` | CR-041 | None — additive new section |
| `AutoPrintTab.jsx` | CR-133 IMPL 2026-08-07 → amended 2026-08-10 | ✅ Resolved |
| `api/constants.js` | BUG-301 2026-08-06 | None — additive |
| `App.js` | CR-132 2026-08-09 | None — additive route |

---

## SECTION A — API Contract (all curl-verified)

### Endpoints (CR-135 scope)

| Method | Endpoint | Tab | Purpose |
|---|---|---|---|
| GET | `/api/v2/vendoremployee/restaurant-clients` | Config | List sub-brands (reuse existing constant) |
| POST | `/api/v2/vendoremployee/aggregator-config/restaurant-clients` | Config | Create new sub-brand (Step 1) |
| GET | `/api/v2/vendoremployee/aggregator-config` | Config | Fetch config (+ `?client_id=N` for sub-brand) |
| POST | `/api/v2/vendoremployee/aggregator-config` | Config | Save config — flat body, both create + update |
| POST | `/api/v2/vendoremployee/aggregator-config/push-store` | Config | Register/push store to UrbanPiper |
| POST | `/api/v2/vendoremployee/aggregator-config/store-toggle` | Config | Enable/disable on Zomato/Swiggy |
| POST | `/api/v2/vendoremployee/restaurant-settings/update-settings` | Operational | Save 8 operational flags (multipart: `data=JSON`) |

### GET /aggregator-config — response shape (confirmed from backend)

```json
{
  "status": true,
  "suggested_store_id": "STORE_POS_ID_478",
  "data": {
    "id": 4,
    "restaurant_id": 478,
    "client_id": null,
    "store_id": "STORE_POS_ID_478",
    "parent_store_id": "STORE_POS_ID_478",
    "urban_key": "biz_adm_…",
    "urban_token": "…",
    "city": "…",
    "pincode": "…",
    "tone_timing": 45,
    "auto_aknowledge": "No",
    "auto_kot_id": [2304],
    "zomato_url": "…",
    "zomato_code": "…",
    "zomato_status": "Yes",
    "swiggi_url": "…",
    "swiggi_code": "…",
    "swiggy_status": "Yes",
    "notification_number": "…"
  }
}
```

**Key quirks:**
- ⚠️ Wrapper is `"data"` (NOT `"config"`)
- ⚠️ `suggested_store_id` is at TOP LEVEL (not inside `data`)
- ⚠️ `swiggi_code` / `swiggi_url` = backend typo — preserve exactly
- ⚠️ `swiggy_status` = correct spelling (unlike swiggi_code/url)
- Pass-through fields (not shown in UI): `tone_timing`, `auto_aknowledge`, `auto_kot_id`, `notification_number`, `parent_store_id`

### POST /aggregator-config — flat body (confirmed from curl)

```json
{
  "store_id": "STORE_POS_ID_478",
  "parent_store_id": "STORE_POS_ID_478",
  "urban_key": "biz_adm_…",
  "urban_token": "…",
  "city": "Mumbai",
  "pincode": "560007",
  "tone_timing": 45,
  "auto_aknowledge": "No",
  "auto_kot_id": [2304],
  "zomato_url": "…",
  "zomato_code": "…",
  "zomato_status": "Yes",
  "swiggi_url": "…",
  "swiggi_code": "…",
  "swiggy_status": "Yes",
  "notification_number": "…"
}
```
No wrapper. `$request->all()` on backend.

### GET /restaurant-clients — response (confirmed)

```json
{
  "status": true,
  "clients_found": true,
  "clients": [{ "id": 107, "name": "sub brand", "phone": "9990001234", "email": "…", "address": null, "status": 1 }]
}
```
Empty: `clients_found: false, clients: 0`. `store_id` NOT in clients response.

### POST /restaurant-clients — Add New Brand (confirmed)

```json
{ "name": "sub brand", "phone": "9990001234" }
```
Returns: `data.id` (new client_id) + `suggested_store_id` (top-level or inside data — handle both).
**name + phone required. email + address optional.**

### POST /update-settings — multipart (confirmed from curl)

```
-F 'data={"basic": { ... }, "advanced": { ... }, "vendor": { ... }}'
```
Service already uses `FormData.append('data', JSON.stringify(payload))` — no service change needed.

### Operational fields — confirmed API keys + formats

| Field | API key | Format |
|---|---|---|
| Auto KOT | `aggregator_auto_kot` | `"Yes"/"No"` |
| Auto Bill | `aggregator_auto_bill` | `"Yes"/"No"` |
| Auto Bill Stage | `aggregator_auto_bill_stage` | `"Ready"` / `"Acknowledged"` (capitalized) |
| Auto Prep Ack | `auto_prep_time_ack` | `"Yes"/"No"` |
| Order Tone | `aggregator_order_tone` | `"silent"/"default"/"buzzer"` |
| Prep Time | `default_prep_time` | integer 1–120 |
| Count Method | `prep_time_count_method` | `"quantity"/"distinct"` |
| Bonus Config | `prep_time_bonus_config` | raw array `[{min_items, max_items, bonus_minutes}]` |

### POST /store-toggle payload

```json
{ "action": "disable", "platforms": ["zomato"], "client_id": 107 }
```
Platforms: `"zomato"` or `"swiggy"` (lowercase). `client_id` omitted for main brand.

---

## SECTION B — Transform Design

### `aggregatorConfigTransform.fromAPI.config(response)`

```js
const d = response?.data || {};
return {
  _raw:         deepClone(d),          // full raw — pass-through on POST
  configId:     d.id || null,
  clientId:     d.client_id || null,
  storeId:      d.store_id || '',
  suggestedStoreId: response?.suggested_store_id || d.store_id || '',
  urbanKey:     d.urban_key || '',
  urbanToken:   d.urban_token || '',
  city:         d.city || '',
  pincode:      d.pincode || '',
  zomatoCode:   d.zomato_code || '',
  zomatoUrl:    d.zomato_url || '',
  swiggiCode:   d.swiggi_code || '',   // ⚠️ typo preserved
  swiggiUrl:    d.swiggi_url || '',    // ⚠️ typo preserved
  zomatoStatus: d.zomato_status === 'Yes',
  swiggyStatus: d.swiggy_status === 'Yes', // ⚠️ correct spelling
  // Excluded from UI (OD-16, OD-17, OD-18): auto_aknowledge, auto_kot_id, notification_number
};
```

### `aggregatorConfigTransform.toAPI.config(state)` — _raw merge pattern

```js
{
  ...state._raw,           // preserves: tone_timing, auto_aknowledge, auto_kot_id, notification_number, parent_store_id
  store_id:     state.storeId,
  urban_key:    state.urbanKey,
  urban_token:  state.urbanToken,
  city:         state.city,
  pincode:      state.pincode,
  zomato_code:  state.zomatoCode,
  zomato_url:   state.zomatoUrl,
  swiggi_code:  state.swiggiCode,   // ⚠️ typo preserved
  swiggi_url:   state.swiggiUrl,    // ⚠️ typo preserved
  zomato_status: state.zomatoStatus ? 'Yes' : 'No',
  swiggy_status: state.swiggyStatus ? 'Yes' : 'No', // ⚠️ correct spelling
  ...(state.clientId ? { client_id: state.clientId } : {}),
}
```

### `aggregatorConfigTransform.fromAPI.brands(response)`

```js
// Returns [] if no sub-brands. Main brand always prepended in UI as static option.
response.clients_found ? response.clients.map(c => ({ id, name, phone, email, address, status })) : []
```

### `restaurantSettingsTransform.toAPI.settingsPayload()` — 8 new fields in `basic{}`

```js
// CR-135: Aggregator operational flags
aggregator_auto_kot:        toYesNo(s7.aggregatorAutoKot),
aggregator_auto_bill:       toYesNo(s7.aggregatorAutoBill),
aggregator_auto_bill_stage: (s7.aggregatorAutoBillStage || 'ready')
                              .replace(/^\w/, c => c.toUpperCase()),  // OD-23: capitalize
auto_prep_time_ack:         toYesNo(s7.autoPrepTimeAck),
aggregator_order_tone:      s7.aggregatorOrderTone || 'default',
default_prep_time:          parseInt(s7.defaultPrepTime) || 15,
prep_time_count_method:     s7.prepTimeCountMethod || 'quantity',
prep_time_bonus_config:     Array.isArray(s7.prepTimeBonusConfig) ? s7.prepTimeBonusConfig : [],
```
Note: `s7 = formState.step7`. Service already JSON.stringifies the full payload — raw array passed as-is.

---

## SECTION C — Files Affected

### New files (6)

| File | Purpose |
|---|---|
| `api/services/aggregatorConfigService.js` | getBrands, getConfig, saveConfig, createBrand, pushStore, storeToggle |
| `api/transforms/aggregatorConfigTransform.js` | fromAPI.config, fromAPI.brands, toAPI.config, toAPI.newBrand |
| `components/settings/aggregatorSetup/AggregatorSetupView.jsx` | Container: brand state, tab, dirty, loading |
| `components/settings/aggregatorSetup/ConfigTab.jsx` | 3-state brand setup + 4 view/edit cards + platform status |
| `components/settings/aggregatorSetup/OperationalTab.jsx` | 7 flags + bonus brackets editor |
| `pages/AggregatorSetupPage.jsx` | Full-page wrapper |

### Edited files (4)

| File | Change | Risk |
|---|---|---|
| `api/constants.js` | +`AGGREGATOR_CONFIG_ENDPOINTS` (4 URLs) | LOW |
| `api/transforms/restaurantSettingsTransform.js` | +8 operational fields in `settingsPayload()` basic{} | MEDIUM |
| `components/layout/Sidebar.jsx` | +aggregator section + VISIBLE_SECTIONS | LOW |
| `App.js` | +`/aggregator/setup` protected route + import | LOW |

### Pre-completed (CR-133 amendment — DONE 2026-08-10)

`AutoPrintTab.jsx` — aggregator section (lines 37–47) removed.

### NOT touching

`aggregatorService.js`, `aggregatorTransform.js`, `profileTransform.js`, `RestaurantContext.jsx`,
`SettingsPanel.jsx`, `ListFormViews.jsx`, all R5 hotspot files.

---

## SECTION D — Risk Classification

| Area | Risk | Reason |
|---|---|---|
| Store Toggle (disable Zomato/Swiggy) | **HIGH** | Immediately takes restaurant offline on live platforms |
| Push Store (UrbanPiper registration) | **HIGH** | Triggers external live service action |
| Config save (urban_key/token) | **HIGH** | Wrong values break all UrbanPiper integration |
| Add New Brand (2-step flow) | **HIGH** | Creates live brand entry; Step 2 must follow or brand is incomplete |
| Operational flags save | **MEDIUM** | Affects auto-print + order flow behavior |
| Brand selector / UI navigation | **LOW** | Display only |
| Sidebar addition | **LOW** | Additive |

---

## SECTION E — Scope Lock

**WILL change:** `api/constants.js`, `restaurantSettingsTransform.js`, `Sidebar.jsx`, `App.js`

**New files (no existing file modified):**
`aggregatorConfigService.js`, `aggregatorConfigTransform.js`,
`components/settings/aggregatorSetup/` (3 files), `AggregatorSetupPage.jsx`

**WILL NOT touch:**
`aggregatorService.js`, `aggregatorTransform.js`, `profileTransform.js`,
`RestaurantContext.jsx`, `SettingsPanel.jsx`, `ListFormViews.jsx`,
`OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `DashboardPage.jsx`

---

## SECTION F — Verification Matrix (V1–V26, seeds Gate 5 QA)

| # | Check | File | How | Auto? |
|---|---|---|---|---|
| V1 | `AGGREGATOR_CONFIG_ENDPOINTS` exported | `constants.js` | grep | YES |
| V2 | `fromAPI.config` uses `response.data` (not `response.config`) | transform | unit test | YES |
| V3 | `fromAPI.config` stores `_raw` | transform | unit test | YES |
| V4 | `toAPI.config` spreads `_raw` (pass-through) | transform | unit test | YES |
| V5 | `toAPI.config` uses `swiggi_code` / `swiggi_url` (not swiggy) | transform | unit test | YES |
| V6 | `toAPI.config` uses `swiggy_status` (not swiggi_status) | transform | unit test | YES |
| V7 | `saveConfig` POSTs flat body (no wrapper) | service | unit test | YES |
| V8 | `storeToggle` sends `action + platforms + optional client_id` | service | unit test | YES |
| V9 | `settingsPayload` basic{} has 8 aggregator fields | transform | grep | YES |
| V10 | `aggregator_auto_bill_stage` toAPI capitalizes correctly | transform | unit test | YES |
| V11 | `prep_time_bonus_config` sent as raw array | transform | unit test | YES |
| V12 | State A (no sub-brands): static "Main Brand" label, no dropdown | ConfigTab | browser | NO |
| V13 | State B (sub-brands): dropdown with Main Brand first | ConfigTab | browser | NO |
| V14 | State C (Add New Brand): name+phone required, email+address optional | ConfigTab | browser | NO |
| V15 | Add New Brand Step 1: POST /restaurant-clients with name+phone | ConfigTab | network tab | NO |
| V16 | After create: new brand auto-selected, `suggested_store_id` in Store ID | ConfigTab | browser | NO |
| V17 | Credentials: `urban_key` + `urban_token` masked (••••) in view mode | ConfigTab | browser | NO |
| V18 | Platform toggle (StatusToggle) is NOT clickable | ConfigTab | browser (no response on click) | NO |
| V19 | Disable button → confirmation dialog → POST store-toggle | ConfigTab | browser + network | NO |
| V20 | UrbanPiper Atlas Setup webhooks section NOT rendered | ConfigTab | browser (section absent) | NO |
| V21 | Operational tab: 7 flag fields visible | OperationalTab | browser | NO |
| V22 | Auto Bill Stage hidden when `autoBill = false` | OperationalTab | browser | NO |
| V23 | Bonus brackets: add row / delete row works | OperationalTab | browser | NO |
| V24 | Operational save → POST update-settings as multipart | OperationalTab | network tab | NO |
| V25 | Sidebar: AGGREGATOR section + Food Mapping SOON badge | Sidebar | browser | NO |
| V26 | `/aggregator/setup` route protected, loads page | App.js | browser | NO |

---

## SECTION G — Post-Code Registry Checklist

```
□ registry.json: CR-135 → status: IMPLEMENTED, gate: 5, sprint_key: pos_5_1
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: all 10 files listed with CR-135 + date
□ Code markers: // CR-135 in every modified/new file
□ Webpack: 0 new errors, 0 new warnings vs baseline
```

---

## SECTION H — Known Backend Quirks

| Quirk | Impact |
|---|---|
| `swiggi_code` / `swiggi_url` — backend typo, NOT swiggy | Transform must use exact misspelling. Never fix. |
| `swiggy_status` — correct spelling (unlike swiggi_code/url) | Use `swiggy_status` for status field. |
| GET response wraps in `"data"{}`, POST body is flat | fromAPI uses `response.data`, toAPI spreads `_raw` with overlay |
| `suggested_store_id` is top-level in GET response | Access as `response.suggested_store_id`, not `response.data.suggested_store_id` |
| POST for both create + update (R25 exception) | No PUT endpoint exists. POST idempotent by backend. |
| `aggregator_auto_bill_stage` stored lowercase in profileTransform | toAPI must capitalize before sending |
| `prep_time_bonus_config` — never written by FE before | Send as raw array; service's JSON.stringify handles serialization |
| `auto_aknowledge` typo in backend (missing 'c') | Not in FE scope. Pass-through via `_raw`. |
| update-settings uses multipart form (`-F 'data=JSON'`) | Service already handles this — no change needed |

---

## SECTION I — Design (Gate 3 — Approved Pending Final Review)

### Design mockup
`src/pages/AggregatorPreviewPage.jsx` — route `/aggregator-preview`

### Config tab — all states

| State | Trigger | UI |
|---|---|---|
| A — no sub-brands | `/restaurant-clients` returns `clients_found: false` | "Main Brand" static label, Store ID, + Add New Brand btn |
| B — sub-brands exist | clients array has entries | Dropdown (Main Brand + sub-brands), Store ID, + Add New Brand btn |
| C — adding new brand | click "+ Add New Brand" | Inline form: name* + phone* + email + address + Cancel + Create Brand → |

### Changes from Gate 2 mockup
- ✅ UrbanPiper Atlas Setup (webhooks) section **removed** (OD-SS2)
- ✅ Platform Status toggle = `cursor: 'default'`, non-clickable (OD-20)
- ✅ Add New Brand form (State C) added inline in Brand Setup card (OD-19)
- ✅ `autoBillStage` select added conditionally below Auto Bill toggle (OD-22)
- ✅ Bonus Time Brackets editor added to Prep Time card (OD-15)
- ✅ Order tone options corrected to API values: `silent/default/buzzer`
- ✅ Prep method options corrected to API values: `quantity/distinct`
- ✅ Preview banner updated to "Gate 3"

### Gate 3 exit status
- [x] Impact Analysis clean and complete (all supplements merged)
- [x] All 23 ODs locked
- [x] Implementation Plan written: `plans/CR-135_IMPLEMENTATION_PLAN.md`
- [x] CR-133 amendment done
- [x] Design mockup updated — **OWNER APPROVED + FROZEN 2026-08-10**
- [x] Impact Analysis session CLOSED 2026-08-10 — Gate 4 GO AWAITING

---

## Execution Sequence (for Implementation agent)

```
1. api/constants.js                         (EDIT)
2. api/transforms/restaurantSettingsTransform.js (EDIT)
3. api/services/aggregatorConfigService.js   (NEW)
4. api/transforms/aggregatorConfigTransform.js (NEW)
5. components/settings/aggregatorSetup/AggregatorSetupView.jsx (NEW)
6. components/settings/aggregatorSetup/ConfigTab.jsx (NEW)
7. components/settings/aggregatorSetup/OperationalTab.jsx (NEW)
8. pages/AggregatorSetupPage.jsx             (NEW)
9. components/layout/Sidebar.jsx             (EDIT)
10. App.js                                   (EDIT)
```
