# CR-135 — Aggregator Setup — New Settings Screen

**ID:** CR-135
**Type:** CR
**Priority:** P1 — HIGH
**Risk:** HIGH (external service integration, live Zomato/Swiggy platform actions)
**Status:** INTAKE
**Gate:** 1
**Sprint:** pos_5_1
**Registered:** 2026-08-09
**Source:** OWNER-DIRECTED

---

## Owner Direction (2026-08-09)

- CR-132 Screen 7 (Aggregator wizard screen) → **moved into this CR** as a separate section
- New `aggregator-config` + `aggregator-sync` backend APIs → **all in scope here**
- Placement: Settings → new top-level navigation item **"Aggregator Setup"**
- Single unified module/screen — not a wizard step, a standalone settings page
- Evidence: `samplecurl.md` shared by backend (artifact: csahzzuj)

---

## Description

A new **"Aggregator Setup"** page in the Settings navigation, covering:

1. **UrbanPiper configuration** — API keys, store IDs, Zomato/Swiggy codes, brand management
2. **Operational flags** — moved from CR-132 Screen 7 (aggregator tone, auto-print, prep time)
3. **Category timings** — when each menu category is available on aggregator platforms
4. **Sync & Catalog** — push/clear full menu catalog to UrbanPiper
5. **Stock control** — enable/disable items with timed auto-re-enable

Multi-brand architecture: every operation has an optional `client_id` (omit = main brand, pass = branch).

---

## API Contract (curl-verified against preprod, restaurant 478)

### Base
```
Base: https://preprod.mygenie.online
Auth: VendorEmployee Bearer token
```

### Aggregator Config Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v2/vendoremployee/aggregator-config` | Fetch config (main or ?client_id=N) |
| POST | `/api/v2/vendoremployee/aggregator-config` | Save config |
| GET | `/api/v2/vendoremployee/restaurant-clients` | List all brands |
| POST | `/api/v2/vendoremployee/aggregator-config/restaurant-clients` | Create branch brand |
| POST | `/api/v2/vendoremployee/aggregator-config/push-store` | Register store with UrbanPiper |
| POST | `/api/v2/vendoremployee/aggregator-config/store-toggle` | Enable/disable on Zomato/Swiggy |

### Aggregator Sync Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v2/vendoremployee/aggregator-sync/category-timings` | List timing groups |
| POST | `/api/v2/vendoremployee/aggregator-sync/category-timings` | Upsert + push to UP |
| POST | `/api/v2/vendoremployee/aggregator-sync/category-timings/push` | Push existing DB rows only |
| POST | `/api/v2/vendoremployee/aggregator-sync/stock-toggle` | Item enable/disable with timer |
| POST | `/api/v2/vendoremployee/aggregator-sync/sync-catalog` | Two-phase full menu sync |
| POST | `/api/v2/vendoremployee/aggregator-sync/clear-catalog` | Clear catalog |
| POST | `/api/v2/vendoremployee/aggregator-sync/clear-modifiers` | Clear modifiers (store-scoped) |

### UrbanPiper Webhook URLs (incoming — FE displays these for copy, backend receives)

| Event | URL |
|---|---|
| Add/Update Stores | `POST /api/v2/urbanpiper/store-callback` |
| Store Toggle | `POST /api/v2/urbanpiper/store-toggle-callback` |
| Item Stock In/Out | `POST /api/v2/urbanpiper/menu-stock-toggle` |

### Operational Flags (from `settings-list` — moved from CR-132 Screen 7)

| Field | API key | Source |
|---|---|---|
| Aggregator Order Tone | `aggregator_order_tone` | settings-list basic{} |
| Aggregator Auto KOT | `aggregator_auto_kot` | settings-list basic{} |
| Aggregator Auto Bill | `aggregator_auto_bill` | settings-list basic{} |
| Aggregator Auto Bill Stage | `aggregator_auto_bill_stage` | settings-list basic{} |
| Default Prep Time | `default_prep_time` | settings-list basic{} |
| Prep Time Count Method | `prep_time_count_method` | settings-list basic{} |
| Auto Acknowledge Prep Time | `auto_prep_time_ack` | settings-list basic{} |

---

## Evidence

- `samplecurl.md` — 14 curl-verified endpoints, multi-brand examples, stock-toggle timing modes
- Artifact URL: `https://customer-assets-eiarnc6j.emergentagent.net/job_pos-front-app/artifacts/csahzzuj_samplecurl.md`
- Source: OWNER-PROVIDED (backend sample curls)
- Confidence: CONFIRMED (backend provided + curl-verified against preprod 478)
- Existing profile read: `profileTransform.js` lines 331–382 reads `aggregator_auto_kot`, `aggregatorAutoBill`, `aggregatorOrderTone`, `defaultPrepTime`, `prepTimeCountMethod` from login-time profile — read path exists, write path is new

---

## Key Technical Notes

### Multi-brand
Every endpoint is multi-brand. UI must show a **brand selector** as a top-level control. All tabs change context based on selected brand.

### Stock-toggle timing modes (3 modes)
| Mode | API | UI |
|---|---|---|
| Indefinite | no timing fields | Toggle off, stays off |
| Relative | `turn_on_preset: "30m"/"1h"/"6h"/"12h"/"1d"/"7d"` | Preset picker (max 7 days) |
| Custom | `turn_on_at: <epoch ms>` | Datetime picker (max 90 days) |
After disable: `aggregator_food.turn_on_at` → UI shows countdown. Auto re-enable via UrbanPiper webhook (no FE polling needed).

### Two-phase catalog sync
`sync-catalog` and `clear-catalog` with `full_master_reset: true` are intentionally async:
- API returns after master pass with `store_pending: true`
- Store pass fires via `afterResponse()` (6s delay, after HTTP response)
- UI must handle: show status message, don't expect synchronous completion
- Prefer `full_master_reset: false` for routine use
- Warn before `full_master_reset: true` — wipes shared master for ALL brands

### R25 compliance (Laravel PUT rule)
- `POST /aggregator-config` → backend uses POST for save (confirmed via samplecurl) — this is a known exception, document in KNOWN BACKEND QUIRKS
- All other mutations → verify verb before wiring (R11)

---

## Duplicate Check

| ID | Relation | Notes |
|---|---|---|
| CR-106 | DISTINCT | Order flow (accept/reject/PopOut). Different concern. |
| CR-108 | RELATED — absorbs | Auto-KOT on aggregator accept. Flag `aggregator_auto_kot` ownership moves to CR-135. CR-108 should be reviewed for merge or dependency. |
| CR-119 | RELATED | Food mapping (POS ↔ platform ref_ids). Same module family. Could be a tab here eventually — not in Phase 1 scope. |
| CR-133 Amendment D5-D7 | RESOLVES | `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage` — no longer need to go to printer-agent-config. CR-135 owns these via settings-list write path. |
| CR-134 | RELATED | Settings Tiles Mirror — will need a new tile for Aggregator Setup. |

---

## Blast Radius

**New files:**
- `api/constants.js` — +AGGREGATOR_CONFIG, +AGGREGATOR_SYNC endpoint keys
- `api/services/aggregatorConfigService.js` — NEW
- `api/services/aggregatorSyncService.js` — NEW
- `api/transforms/aggregatorConfigTransform.js` — NEW (fromAPI/toAPI for config + operational flags)
- `components/panels/settings/aggregatorSetup/AggregatorSetupView.jsx` — NEW (container, brand selector, 4 tabs)
- `components/panels/settings/aggregatorSetup/ConfigTab.jsx` — NEW
- `components/panels/settings/aggregatorSetup/OperationalTab.jsx` — NEW (moved from CR-132 Screen 7)
- `components/panels/settings/aggregatorSetup/CategoryTimingsTab.jsx` — NEW
- `components/panels/settings/aggregatorSetup/SyncCatalogTab.jsx` — NEW (includes stock control)
- `components/panels/settings/ListFormViews.jsx` — EDIT (thin re-export, same pattern as CR-133)

**NOT touching:**
- `aggregatorService.js` — order operations, untouched
- `aggregatorTransform.js` — order transforms, untouched
- `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `DashboardPage.jsx` — R5 hotspots, not needed
- `profileTransform.js` — read path already exists, no change needed

**Estimated scope:** LARGE — 10 new/edited files, ~600–800 lines new code

---

## Risk Classification

| Risk | Fields | Reason |
|---|---|---|
| **HIGH** | All aggregator-config endpoints, store-toggle, sync-catalog, stock-toggle | External service (UrbanPiper). Store toggle affects live Zomato/Swiggy order acceptance. `full_master_reset: true` wipes all brands from UP. |
| **MEDIUM** | Operational flags (aggregator_auto_kot, etc.) | Affect auto-print and order flow behavior |
| **LOW** | Read-only display (webhook URLs, store IDs) | Display only, no mutations |

**Fast Lane eligible:** NO — HIGH risk, multi-file, external API

---

## Impact on Other CRs

### CR-132 — Screen 7 removed
- Remove from CR-132 wizard: Screen 7 (Aggregator) entirely
- Remove from `restaurantSettingsTransform.js` scope: `aggregator_order_tone`, `aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage`, `default_prep_time`, `prep_time_count_method`, `auto_prep_time_ack` (7 fields)
- CR-132 wizard: 9 screens → 8 screens (Screen 7 removed, Screens 8+9 renumber to 7+8)
- CR-132 IA field count: 49 → 42 new fields
- CR-132 Impact Analysis updated: see `impact/CR-132_IMPACT_ANALYSIS.md` §K

### CR-133 Amendment
- OD-CR133-D5..D7 (`aggregator_auto_kot`, `aggregator_auto_bill`, `aggregator_auto_bill_stage`) — NO LONGER a CR-133 concern
- CR-135 owns these via `settings-list` update endpoint
- CR-133 amendment simplifies: only D1-D4 (no_of_bill, no_of_kot, billing_auto_bill_print, print_kot) remain open

---

## Proposed Tab Structure (to be finalised in Gate 2 IA)

```
Settings → Aggregator Setup

┌─ Brand Selector ─────────────────────────────────────────┐
│  [Main Brand ▼]  [+ Add Branch Brand]                     │
└──────────────────────────────────────────────────────────┘

[ Configuration ] [ Operational Settings ] [ Category Timings ] [ Sync & Stock ]

Tab 1 — Configuration
  store_id (read-only), urban_key (masked), urban_token (masked)
  city, pincode, zomato_code + URL, swiggy_code + URL
  [Push Store to UrbanPiper] | Platform toggles: [Zomato ON/OFF] [Swiggy ON/OFF]
  Webhook URLs section (read-only, 3 copyable URLs for UrbanPiper Atlas setup)

Tab 2 — Operational Settings (moved from CR-132 Screen 7)
  aggregator_order_tone (select)
  aggregator_auto_kot (toggle)
  aggregator_auto_bill (toggle) → aggregator_auto_bill_stage (select, conditional)
  default_prep_time (number, min)
  prep_time_count_method (select: quantity/time)
  auto_prep_time_ack (toggle)

Tab 3 — Category Timings
  List of timing groups (title, categories, day-slot grid)
  Add/edit timing groups
  [Save & Push to UrbanPiper] | [Push Existing Only]

Tab 4 — Sync & Stock
  Catalog section: [Sync Full Menu (store-only)] [Full Reset ⚠️] [Clear Catalog] [Clear Modifiers]
  Async status: "Store pass queued" banner
  Stock section: item list, enable/disable toggles, timed disable picker (30m/1h/6h/12h/1d/7d/custom)
  Countdown timer on disabled items
```

---

## Open Owner Decisions (Gate 2 will resolve)

| # | Question | Suggested |
|---|---|---|
| OD-1 | Should Stock Control be Tab 4 combined with Sync, or a separate Tab 5? | Combined (less overwhelming) |
| OD-2 | Webhook URL panel — show to owner for self-service Atlas setup? | YES — read-only with copy buttons |
| OD-3 | Brand selector: show always or only when >1 brand exists? | Always — encourages multi-brand awareness |
| OD-4 | Should CR-119 (Food Mapping tab in RecipeManagementPanel) eventually move here as Tab 5? | Future CR, not Phase 1 |
| OD-5 | CR-108 (auto-KOT on accept) — absorb into CR-135 OperationalTab or keep separate? | Absorb — flag is now in Tab 2 |

---

## Next Step

Gate 2 — Impact Analysis
- Curl-probe all 13 endpoints against restaurant 478 (live verification per R11)
- Verify GET /aggregator-config response shape for field-by-field fromAPI mapping
- Verify GET /restaurant-clients response shape
- Confirm stock-toggle response shape (turn_on_at epoch field)
- Resolve OD-1 through OD-5
- Design tab UI (call design agent)
- Write full impact analysis at `impact/CR-135_IMPACT_ANALYSIS.md`
