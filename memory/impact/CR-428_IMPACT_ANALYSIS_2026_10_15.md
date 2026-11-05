# CR-428 — Impact Analysis (Gate 2)

**Item:** CR-428 — Area module migration: 18-value list → 13 modules across 866 items
**Date:** 2026-10-15
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Stage:** GATE_2_IMPACT_ANALYSIS

---

## Code Reality

**NONE** — no 13-module values or comprehensive mapping table exist yet.

```bash
grep -c "Printing / Printer Agent\|Reports / Analytics\|PMS / Rooms" \
  /app/memory/reports/sheets_sync.py   # 0
```

---

## Conflict Pre-Check

| Item | Status | Conflict? |
|---|---|---|
| CR-419 (sheets_sync.py parent) | GATE_5A | NONE — this CR patches specific functions |
| CR-420 (BUG-541 post-push fixes) | GATE_5A | NONE — different functions |
| BUG-541 (diff all columns) | GATE_5A | NONE — different constant/function |

---

## 1. Scope — what breaks today and why

### Problem A: POS_AREAS (L59–64) has 18 old names
`normalise_area()` validates against `POS_AREAS`. Any value not in the set → blank in the sheet.
The 13 new module names are NOT in POS_AREAS, so they fail validation and blank out.

### Problem B: normalise_area() aliases table (L218–233) maps to old names
Even if an item has a legacy string like `"PMS > Room Status Board"`, the alias resolves to
`"PMS Check-In"` (old name), which is then validated against POS_AREAS (where it exists)
and written to the sheet — but the sheet now expects 13-module names. Mismatch.

### Problem C: _MONEY_AREAS (L77) uses old names
`compute_money_path()` checks `area in _MONEY_AREAS = {'Payments', 'PMS Folio', 'Smart Purchase'}`.
After migration, area values become `'Payments / Coupons / Credit'`, `'PMS / Rooms'`,
`'Inventory / Stock'` — none of which match `_MONEY_AREAS`. Money path will flip from `YES`
to `no` for all items in those modules unless `_MONEY_AREAS` is updated.

### Problem D: 866 registry items have wrong/blank area
| Category | Count |
|---|---|
| Already have 13-module value | 1 |
| Have old-18 value name | 92 |
| Have custom legacy string (150+ variants) | 237 |
| **Blank** | **536** |
| **Total** | **866** |

---

## 2. Dependencies on SHEET PUSH / DRIFT / PUSH

| System | Dependency | Impact of this CR |
|---|---|---|
| **SHEET PUSH** | `normalise_area()` called for every item on every push | Must update POS_AREAS + normalise_area() first; otherwise next push blanks all new module names |
| **SHEET PUSH** | `compute_money_path()` uses `_MONEY_AREAS` | Must update _MONEY_AREAS or money_path goes wrong for Payments/PMS/Inventory items |
| **SHEET DRIFT** | Area is NOT in `_PHASE1_ACCEPTED` | No dependency — area changes from sheet are not diffed (agent-written column) |
| **All stage tabs** | All 10 tabs have Area column (col I) | After push, all tabs will show new 13-module names |
| **registry.json** | Source of truth for area field | Must be migrated BEFORE push — if left stale, normalise_area() has to map all 150+ strings dynamically on every push |

**Execution order is critical:**
1. Update sheets_sync.py (POS_AREAS + normalise_area() + _MONEY_AREAS)
2. Migrate registry.json area fields (all 866 items)
3. Push to sheet — areas will be correct

---

## 3. Changes to sheets_sync.py

### 3A — POS_AREAS (L59–64) — REPLACE

Old (18 values):
```python
POS_AREAS = {
    'Printing', 'Reports', 'Inventory', 'Menu Management', 'Payments',
    'PMS Check-In', 'PMS Bookings', 'PMS Folio', 'CRM', 'Settings',
    'Auth / Permissions', 'Smart Purchase', 'Sidebar / Nav', 'Sockets',
    'Order Entry', 'Dashboard', 'Expense', 'Tooling',
}
```

New (13 values):
```python
POS_AREAS = {
    'Printing / Printer Agent', 'Reports / Analytics', 'PMS / Rooms',
    'Inventory / Stock', 'Payments / Coupons / Credit',
    'Settings / Configuration', 'Permissions / Security',
    'Menu / Order Entry', 'Aggregator / Sockets', 'Delivery',
    'CRM / Customer Intelligence', 'Tooling / Control Layer', 'Other',
}
```

### 3B — _MONEY_AREAS (L77) — UPDATE

Old: `{'Payments', 'PMS Folio', 'Smart Purchase'}`
New: `{'Payments / Coupons / Credit', 'PMS / Rooms', 'Inventory / Stock'}`

*(Smart Purchase → Inventory / Stock; PMS Folio → PMS / Rooms)*

### 3C — normalise_area() (L208–233) — REWRITE

The new function must handle:
- Valid 13-module values → return as-is
- Old-18 values → map to new name
- 150+ custom legacy strings → map by keyword pattern
- "Old POS" → return '' (not a module — title prefix only)
- Blank / unrecognised → return ''

**Old-18 → New-13 mapping:**
```python
_OLD_TO_NEW = {
    'Printing':          'Printing / Printer Agent',
    'Reports':           'Reports / Analytics',
    'Inventory':         'Inventory / Stock',
    'Menu Management':   'Menu / Order Entry',
    'Payments':          'Payments / Coupons / Credit',
    'PMS Check-In':      'PMS / Rooms',
    'PMS Bookings':      'PMS / Rooms',
    'PMS Folio':         'PMS / Rooms',
    'CRM':               'CRM / Customer Intelligence',
    'Settings':          'Settings / Configuration',
    'Auth / Permissions':'Permissions / Security',
    'Smart Purchase':    'Inventory / Stock',
    'Sidebar / Nav':     'Other',
    'Sockets':           'Aggregator / Sockets',
    'Order Entry':       'Menu / Order Entry',
    'Dashboard':         'Reports / Analytics',
    'Expense':           'Reports / Analytics',
    'Tooling':           'Tooling / Control Layer',
}
```

**Legacy keyword mapping (for 150+ custom strings):**
Keyword-based triage on the lowercased string:

| Keyword triggers | → Module |
|---|---|
| `pms`, `room`, `folio`, `checkin`, `check-in`, `booking`, `housekeep`, `laundry`, `night audit`, `channel manager`, `front desk`, `tape chart` | PMS / Rooms |
| `print`, `printer`, `kot`, `bill print`, `receipt`, `receipt`, `aggregator.*print`, `direct print` | Printing / Printer Agent |
| `report`, `insight`, `settlement`, `audit`, `daily`, `cancellation report`, `pl report`, `wastage report`, `food court`, `order report`, `purchase report`, `analytics`, `stock audit` | Reports / Analytics |
| `inventory`, `stock`, `ingredient`, `recipe`, `purchase`, `smart purchase`, `sub-recipe`, `auto.*shopping` | Inventory / Stock |
| `payment`, `discount`, `coupon`, `credit`, `collect bill`, `collect payment`, `tax`, `billing`, `wallet`, `settlement.*collect`, `razorpay`, `order amount` | Payments / Coupons / Credit |
| `settings`, `config`, `restaurant setup`, `wizard`, `onboarding`, `aggregator setup`, `channels`, `table management` | Settings / Configuration |
| `permission`, `auth`, `login`, `security`, `protected`, `role`, `401` | Permissions / Security |
| `menu`, `order entry`, `cart`, `variation`, `addon`, `product`, `popular`, `category`, `qsr`, `walk.*in`, `order.*kitchen`, `place.*order` | Menu / Order Entry |
| `aggregator`, `socket`, `swiggy`, `zomato`, `scan.*order`, `notif`, `buzzer`, `fcm` | Aggregator / Sockets |
| `delivery` | Delivery |
| `crm`, `customer intel`, `customer note`, `loyalty`, `historical note` | CRM / Customer Intelligence |
| `tooling`, `control layer`, `dev tool`, `documentation`, `testing infra`, `shared.*control`, `agent.*control` | Tooling / Control Layer |
| `sidebar`, `nav`, `navigation`, `loading`, `boot`, `error handling`, `old pos` | Other |

---

## 4. Registry migration scope (866 items)

**For 88 INTAKE items:** Apply Abhishek's CSV with 4 owner-approved overrides (OD-428-03).
**For remaining 778 items:** Apply the normalise_area() keyword mapping above.

The migration runs as a one-time Python script (not search_replace — it's data transformation).
After migration, registry.json will have the canonical 13-module value for each item.
Future items: assigned at Gate 1 per INTAKE_WORKFLOW.md rule.

---

## 5. Verification

| Check | Expected |
|---|---|
| `POS_AREAS` has exactly 13 values | `len(POS_AREAS) == 13` |
| No old-18 name remains in POS_AREAS | `'Printing' not in POS_AREAS` |
| normalise_area('Printing') | `'Printing / Printer Agent'` |
| normalise_area('PMS Check-In') | `'PMS / Rooms'` |
| normalise_area('PMS > Room Status Board') | `'PMS / Rooms'` |
| normalise_area('Old POS') | `''` |
| normalise_area('') | `''` |
| compute_money_path({'area': 'Payments / Coupons / Credit'}) | `'YES'` |
| Registry: zero items with old-18 area value | count = 0 |
| Registry: zero items with 'Old POS' as area | count = 0 |
| Sheet push: UNCLASSIFIED still 0 | `UNCLASSIFIED: 0` |

---

## 6. Files WILL change

```
memory/reports/sheets_sync.py   (3 edits: POS_AREAS, _MONEY_AREAS, normalise_area)
memory/control/registry.json    (one-time migration of area field for all 866 items)
```

## Files WILL NOT touch

```
frontend/src/ · backend/ · AGENT_PROMPT_ALPHA.md · .env
```

---

## 7. Gate Status

| Gate | Status |
|---|---|
| Gate 1 | COMPLETE |
| Gate 2 | **COMPLETE** (this document) |
| Gate 3 | PENDING |
| Gate 4 GO | NOT given |
