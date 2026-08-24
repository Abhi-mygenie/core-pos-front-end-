# CR-060: Table/Room Management — API Discovery Report

**Date:** 2026-07-06
**Restaurant:** kunafamahal (RID 689, preprod)
**Agent Role:** DISCOVERY

---

## Confirmed Endpoints (8 live — all verified with real CRUD cycle)

### A. Table/Room CRUD

| # | Method | Endpoint | Purpose | Status |
|---|---|---|---|---|
| A1 | GET | `/restaurant-settings/table-config` | List all tables + rooms + QR URLs | ✅ LIVE |
| A2 | POST | `/restaurant-settings/table-config/store` | Create table/room (no `id` in body) | ✅ LIVE |
| A3 | POST | `/restaurant-settings/table-config/store` | Update table/room (`id` in body) | ✅ LIVE (same endpoint) |
| A4 | DELETE | `/restaurant-settings/table-config/{id}` | Delete table/room | ✅ LIVE |

### B. Reference Data

| # | Method | Endpoint | Purpose | Status |
|---|---|---|---|---|
| B1 | GET | `/restaurant-settings/table-config/area-options` | List areas/sections (derived from table `title` field) | ✅ LIVE |
| B2 | GET | `/restaurant-settings/table-config/waiter-list` | List waiters for assignment | ✅ LIVE |

### C. Bulk Import/Export

| # | Method | Endpoint | Purpose | Status |
|---|---|---|---|---|
| C1 | GET | `/restaurant-settings/table-config/export-sample` | Download blank Excel template (returns download_url) | ✅ LIVE |
| C2 | GET | `/restaurant-settings/table-config/export-list` | Export existing tables as Excel | ✅ LIVE |
| C3 | POST | `/restaurant-settings/table-config/import` | Import tables from Excel (multipart) | ✅ LIVE |

---

## Data Model (from API responses)

```
TABLE / ROOM
├── id: int (7702, 7703)
├── restaurant_id: int (689)
├── waiter_id: int (3580 → FK to waiter)
├── title: string|null ("Main Hall", "Garden Area") — THIS IS THE AREA/SECTION
├── table_no: string ("T-PROBE-1", "R-PROBE-1") — table/room number
├── qr_code: string|null — legacy field
├── status: int (1 = active)
├── created_at: datetime
├── updated_at: datetime
├── rtype: string ("TB" = table, "RM" = room)
├── f_name: string (waiter first name, denormalized)
├── l_name: string|null (waiter last name)
└── qr_code_urls: object
    ├── Normal: string (QR URL for normal menu)
    ├── Party: string (QR URL for party menu)
    └── Premium: string (QR URL for premium menu)
```

### Key Insight: `title` = Area/Section

The `title` field is NOT the table name — it's the **area/section** the table belongs to (e.g., "Main Hall", "Garden Area", "Rooftop"). The `table_no` is the actual table/room identifier.

`area-options` endpoint returns unique `title` values from existing tables — it's a derived list, NOT a separate entity.

```
Areas are derived from title:
  - No separate area CRUD
  - Areas appear when tables with that title are created
  - Areas disappear when all tables in that area are deleted
```

---

## Payload Shapes

### Create Table/Room (A2)
```json
POST /restaurant-settings/table-config/store
{
  "title": "Main Hall",         // area/section name (string, nullable)
  "table_no": "T001",           // table/room number (string, required)
  "vendorName": null,            // waiter ID (int|null) — misleading field name!
  "rtype": "TB"                  // "TB" = table, "RM" = room
}
```

### Update Table/Room (A3 — same endpoint, WITH `id`)
```json
POST /restaurant-settings/table-config/store
{
  "title": "Garden Area",
  "table_no": "T001-UPDATED",
  "vendorName": 3581,            // waiter ID
  "rtype": "TB",
  "id": 7702                     // ← presence of ID triggers UPDATE
}
```

### Delete Table/Room (A4)
```
DELETE /restaurant-settings/table-config/{id}
```

---

## Reference Data

### Waiters
```json
[
  {"id": 3580, "name": "Manager"},
  {"id": 3581, "name": "Captain"},
  {"id": 3596, "name": "Meet Singh"},
  {"id": 3597, "name": "Manmeet Singh"},
  {"id": 3598, "name": "laptop"},
  {"id": 3680, "name": "Simarjot Singh"},
  {"id": 3755, "name": "Salman"},
  {"id": 3756, "name": "saurav"},
  {"id": 4106, "name": "Kaynat"}
]
```

### rtype Values
- `"TB"` = Table
- `"RM"` = Room

---

## API Quirks

| # | Quirk | Detail |
|---|-------|--------|
| Q1 | **Same endpoint for create + update** | POST `/store` — presence of `id` in body triggers update |
| Q2 | **`vendorName` is actually waiter ID** | Misleading field name — it's an int FK to waiter, not a string |
| Q3 | **`title` is area, not table name** | `title` = section/area, `table_no` = actual table identifier |
| Q4 | **Areas are derived, not a separate entity** | `area-options` returns unique titles from existing tables |
| Q5 | **Room gets `type=room` in QR URL** | QR URLs auto-switch `type=table` vs `type=room` based on rtype |
| Q6 | **Export sample returns JSON with download_url** | Not a direct file download — returns `{"download_url": "..."}` |
| Q7 | **Waiter auto-assigned** | When `vendorName: null`, backend assigns first waiter (ID 3580 "Manager") |

---

## Mapping to Existing UI (`TableManagementView.jsx`)

| Existing UI Concept | API Field | Match? |
|---|---|---|
| "Sections" (left panel) | `title` (area/section) | ✅ Maps directly |
| "Tables" (right panel grid) | `table_no` + `rtype` | ✅ Maps directly |
| Section count badge | Count of tables with that `title` | ✅ Compute client-side |
| Add Section | Create table with new `title` value | ⚠️ Areas are derived — creating a section = creating a table in it |
| Edit Section | Update all tables' `title` to new name | ⚠️ Requires batch update of all tables in that area |
| Delete Section | Delete all tables in that area | ⚠️ Cascade delete |
| Add Table | POST `/store` with `table_no`, `title`, `rtype` | ✅ Direct |
| Edit Table | POST `/store` with `id` | ✅ Direct |
| Delete Table | DELETE `/{id}` | ✅ Direct |
| Table status | `status` field (1=active) | ✅ Available |
| Waiter assignment | `vendorName` (waiter ID) | ✅ Available but NOT in current UI |
| QR codes | `qr_code_urls` object | ✅ Available but NOT in current UI |
| Table vs Room | `rtype: "TB"/"RM"` | ✅ Available but current UI only shows tables |

---

## Gaps & Suggestions

| # | Gap | Recommendation |
|---|-----|----------------|
| G1 | **Rooms not shown in current UI** — rtype "RM" exists but UI only handles tables | **OWNER CONFIRMED: Add Room/Table type selector in add/edit UI** |
| G2 | **Waiter assignment not in UI** — API supports `vendorName` (waiter ID) but UI doesn't expose it | **OWNER CONFIRMED: Add waiter dropdown in add/edit form** |
| G3 | **QR codes not shown** — rich QR URL data (Normal/Party/Premium) available but unused | **PHASE 2** — QR code display/dialog deferred |
| G4 | **Area management is indirect** — no separate area CRUD, areas derived from table `title` | UI should handle: rename = batch update all tables' title, delete = warn "will delete all tables in area" |
| G5 | **Bulk import/export available** — endpoints exist but not wired | **PHASE 1** — Add Import/Export/Download Sample buttons in toolbar (same pattern as Menu Mgmt & Expense Setup) |
| G6 | **No table capacity/seats field** — API doesn't track how many people a table seats | Future backend enhancement |

## Owner Amendments (2026-07-06)

### AM-1: Room/Table Type Selector (CONFIRMED)
- UI must have a type selector when adding/editing: Table (TB) or Room (RM)
- Visual distinction between tables and rooms in the grid

### AM-2: Waiter Assignment (CONFIRMED)
- Waiter dropdown in add/edit form using waiter-list API

### AM-3: Waiter Table Access Permissions (BUSINESS LOGIC PENDING)
Three waiter access types identified by owner:
- **Type A:** Can take orders only on tables they OPEN (self-opened)
- **Type B:** Can take orders only on ASSIGNED tables (via vendorName)
- **Type C:** Can see and take orders on ALL tables (full access)

**Status:** PENDING business logic discussion. Affects:
- Table Management (how assignment works in setup)
- Order Taking (runtime table visibility per waiter role)
- Possibly backend API changes needed for permission model

**NOTE:** Waiter access permission business logic will be discussed separately. Does NOT block Phase 1 of table CRUD wiring.

---

## Evidence Artifacts

All saved to `/app/memory/evidence/CR-060/`:
- `table_config.json` — initial table list (empty)
- `table_config_after_add.json` — list after adding probe table + room
- `add_table_response.json` — create response
- `add_room_response.json` — create room response
- `area_options.json` — area list (initially empty)
- `area_options_after.json` — area list after adding tables
- `waiter_list.json` — waiter reference data

Probe tables created and cleaned up (IDs 7702, 7703 — deleted).

---

## Next

Discovery complete. Ready for Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan).
