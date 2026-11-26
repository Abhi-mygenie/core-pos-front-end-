# CR-428 — Implementation Plan (Gate 3)

**Item:** CR-428 — Area module migration: 18-value list → 13 modules
**Date:** 2026-10-15
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Stage:** GATE_3_PLAN_COMPLETE
**Depends on:** `impact/CR-428_IMPACT_ANALYSIS_2026_10_15.md`

---

## Scope Lock

### Files WILL change
```
memory/reports/sheets_sync.py       (3 targeted edits)
memory/control/registry.json        (one-time data migration script)
```

### Files WILL NOT touch
```
frontend/src/ · backend/ · AGENT_PROMPT_ALPHA.md · .env
```

---

## Entry Verification

```bash
python3 -c "
import sys; sys.path.insert(0,'/app/memory/reports')
from sheets_sync import POS_AREAS, _MONEY_AREAS, normalise_area
assert 'Printing' in POS_AREAS,         'old value still in POS_AREAS'
assert 'Printing / Printer Agent' not in POS_AREAS, 'already migrated'
assert 'Payments' in _MONEY_AREAS,      'old value still in _MONEY_AREAS'
print('Entry verification PASS — safe to implement')
"
# NONE guard
grep -c 'Printing / Printer Agent\|PMS / Rooms\|_OLD_TO_NEW' \
  /app/memory/reports/sheets_sync.py
# Expected: 0
```

---

## Edit E1 — Replace POS_AREAS with 13 modules (L59–64)

**search_replace old_str:**
```
POS_AREAS = {
    'Printing', 'Reports', 'Inventory', 'Menu Management', 'Payments',
    'PMS Check-In', 'PMS Bookings', 'PMS Folio', 'CRM', 'Settings',
    'Auth / Permissions', 'Smart Purchase', 'Sidebar / Nav', 'Sockets',
    'Order Entry', 'Dashboard', 'Expense', 'Tooling',
}
```

**search_replace new_str:**
```
# CR-428: 13-module taxonomy (replaces 18-value list)
POS_AREAS = {
    'Printing / Printer Agent', 'Reports / Analytics', 'PMS / Rooms',
    'Inventory / Stock',        'Payments / Coupons / Credit',
    'Settings / Configuration', 'Permissions / Security',
    'Menu / Order Entry',       'Aggregator / Sockets', 'Delivery',
    'CRM / Customer Intelligence', 'Tooling / Control Layer', 'Other',
}
```

---

## Edit E2 — Update _MONEY_AREAS (L77)

**search_replace old_str:**
```
_MONEY_AREAS = {'Payments', 'PMS Folio', 'Smart Purchase'}
```

**search_replace new_str:**
```
_MONEY_AREAS = {  # CR-428: updated to 13-module names
    'Payments / Coupons / Credit',
    'PMS / Rooms',
    'Inventory / Stock',
}
```

---

## Edit E3 — Rewrite normalise_area() (L208–233)

**search_replace old_str:**
```
def normalise_area(raw):
    if not raw:
        return ''
    r = str(raw).strip()
    if r in POS_AREAS:
        return r
    rl = r.lower()
    for area in POS_AREAS:
        if area.lower() == rl:
            return area
    _aliases = {
        'order entry': 'Order Entry', 'order-entry': 'Order Entry',
        'dashboard': 'Dashboard', 'pms': 'PMS Check-In',
        'pms folio': 'PMS Folio', 'pms checkin': 'PMS Check-In',
        'pms bookings': 'PMS Bookings', 'pms check in': 'PMS Check-In',
        'auth': 'Auth / Permissions', 'permissions': 'Auth / Permissions',
        'auth/permissions': 'Auth / Permissions',
        'sidebar': 'Sidebar / Nav', 'nav': 'Sidebar / Nav',
        'menu': 'Menu Management', 'menu management': 'Menu Management',
        'smart purchase': 'Smart Purchase', 'inventory': 'Inventory',
        'reports': 'Reports', 'printing': 'Printing', 'print': 'Printing',
        'sockets': 'Sockets', 'socket': 'Sockets',
        'settings': 'Settings', 'crm': 'CRM', 'expense': 'Expense',
        'tooling': 'Tooling', 'payments': 'Payments', 'payment': 'Payments',
    }
    return _aliases.get(rl, '')
```

**search_replace new_str:**
```
# CR-428: old-18 → new-13 mapping
_OLD_TO_NEW = {
    'Printing':           'Printing / Printer Agent',
    'Reports':            'Reports / Analytics',
    'Inventory':          'Inventory / Stock',
    'Menu Management':    'Menu / Order Entry',
    'Payments':           'Payments / Coupons / Credit',
    'PMS Check-In':       'PMS / Rooms',
    'PMS Bookings':       'PMS / Rooms',
    'PMS Folio':          'PMS / Rooms',
    'CRM':                'CRM / Customer Intelligence',
    'Settings':           'Settings / Configuration',
    'Auth / Permissions': 'Permissions / Security',
    'Smart Purchase':     'Inventory / Stock',
    'Sidebar / Nav':      'Other',
    'Sockets':            'Aggregator / Sockets',
    'Order Entry':        'Menu / Order Entry',
    'Dashboard':          'Reports / Analytics',
    'Expense':            'Reports / Analytics',
    'Tooling':            'Tooling / Control Layer',
    'Old POS':            '',   # title prefix only — not a module
}


def normalise_area(raw):  # CR-428: 13-module normalisation
    if not raw:
        return ''
    r = str(raw).strip()
    # 1. Already a valid 13-module value
    if r in POS_AREAS:
        return r
    # 2. Old-18 exact match
    if r in _OLD_TO_NEW:
        return _OLD_TO_NEW[r]
    rl = r.lower()
    # 3. Case-insensitive old-18 match
    for old, new in _OLD_TO_NEW.items():
        if old.lower() == rl:
            return new
    # 4. Keyword triage for legacy custom strings
    if any(k in rl for k in ['pms', 'room module', 'folio', 'checkin', 'check-in',
                               'booking', 'housekeep', 'laundry', 'night audit',
                               'channel manager', 'front desk', 'tape chart',
                               'guest folio', 'checkout drawer']):
        return 'PMS / Rooms'
    if any(k in rl for k in ['print', 'printer', 'kot', 'bill print', 'receipt',
                               'aggregator.*print', 'direct print', 'print style',
                               'bill content', 'bill/kot', 'auto print']):
        return 'Printing / Printer Agent'
    if any(k in rl for k in ['report', 'insight', 'daily summary', 'cancellation report',
                               'pl report', 'wastage report', 'food court report',
                               'order report', 'purchase report', 'analytics',
                               'stock audit', 'settlement', 'expense report',
                               'reports /', '/reports', 'insights /']):
        return 'Reports / Analytics'
    if any(k in rl for k in ['inventory', 'stock', 'ingredient', 'recipe',
                               'smart purchase', 'sub-recipe', 'auto.*shopping',
                               'stock update', 'purchase entry']):
        return 'Inventory / Stock'
    if any(k in rl for k in ['payment', 'discount', 'coupon', 'credit',
                               'collect bill', 'collect payment', 'tax',
                               'wallet', 'razorpay', 'billing', 'qsr.*payment',
                               'collect.*pay', 'order.*amount']):
        return 'Payments / Coupons / Credit'
    if any(k in rl for k in ['settings', 'config', 'restaurant setup', 'wizard',
                               'onboarding', 'aggregator setup', 'channels',
                               'table management', 'restaurant settings', 'statusconfig',
                               'restaurant type', 'order.*kitchen', 'setup.*step']):
        return 'Settings / Configuration'
    if any(k in rl for k in ['permission', 'auth', 'login', 'security',
                               'protected', 'role', '401']):
        return 'Permissions / Security'
    if any(k in rl for k in ['menu', 'order entry', 'order-entry', 'cart',
                               'variation', 'addon', 'product', 'popular',
                               'category', 'qsr', 'walk.*in', 'place.*order',
                               'cancel.*item', 'schedule.*toggle', 'bulk editor',
                               'product.*form', 'order.*card', 'table.*card']):
        return 'Menu / Order Entry'
    if any(k in rl for k in ['aggregator', 'socket', 'swiggy', 'zomato',
                               'scan.*order', 'notif', 'buzzer', 'fcm',
                               'sound.*manager', 'scan.*pop']):
        return 'Aggregator / Sockets'
    if 'delivery' in rl:
        return 'Delivery'
    if any(k in rl for k in ['crm', 'customer intel', 'customer note',
                               'loyalty', 'historical note']):
        return 'CRM / Customer Intelligence'
    if any(k in rl for k in ['tooling', 'control layer', 'dev tool',
                               'documentation', 'testing infra',
                               'shared.*control', 'agent.*control', 'control.*layer']):
        return 'Tooling / Control Layer'
    # 5. Unrecognised → blank (better than wrong module)
    return ''
```

---

## Edit E4 (registry migration) — Python script run AFTER E1–E3

This is NOT a search_replace — it's a data migration script.
Implementation agent runs this script to update all 866 registry items.

```python
# CR-428: registry area migration — run once after E1-E3 applied
import json, sys
sys.path.insert(0, '/app/memory/reports')

# Must import AFTER E1-E3 are applied so normalise_area uses new 13-module mapping
from sheets_sync import normalise_area, to_contract_row, to_contract_status

with open('/app/memory/control/registry.json') as f:
    d = json.load(f)

# Abhishek's CSV overrides + 4 owner-approved changes (OD-428-03)
INTAKE_OVERRIDES = {
    # Old POS items: title prefix kept, real module assigned
    'CR-398':  'Menu / Order Entry',          # food timing = menu/order
    'BUG-542': 'Reports / Analytics',         # Old POS report graphs
    'BUG-548': 'Reports / Analytics',         # Old POS summary graphs
    'BUG-553': 'Aggregator / Sockets',        # Old POS Android ringer
    'BUG-558': 'Aggregator / Sockets',        # Old POS Swiggy/Zomato toggle
    'BUG-559': 'Payments / Coupons / Credit', # Old POS Loyalty/Coupon
    # Owner-approved overrides (OD-428-03)
    'CR-395':  'Printing / Printer Agent',    # KOT = print, not menu
    'CR-091':  'Payments / Coupons / Credit', # bank transfer ID = payment record
    'CR-394':  'Payments / Coupons / Credit', # backward GST = billing/tax
    'BUG-555': 'Other',                       # cross-cutting tablet layout
}

updated = 0
blanked = 0
unchanged = 0

for item in d['items']:
    cid  = item['id']
    old  = (item.get('area', '') or '').strip()

    # Apply explicit override first
    if cid in INTAKE_OVERRIDES:
        new = INTAKE_OVERRIDES[cid]
    else:
        # normalise_area handles old-18 + legacy + blank
        new = normalise_area(old) if old else ''

    if not new:
        blanked += 1
        # For blank-after-normalise: try to derive from title
        title = (item.get('title', '') or '').lower()
        new = normalise_area(title)  # use title as fallback input
        if not new:
            new = 'Other'   # last resort — never leave blank
            blanked += 1
        else:
            blanked -= 1

    if new != old:
        item['area'] = new
        updated += 1
    else:
        unchanged += 1

with open('/app/memory/control/registry.json', 'w') as f:
    json.dump(d, f, indent=2)

print(f'Updated:   {updated}')
print(f'Unchanged: {unchanged}')
print(f'Total:     {len(d["items"])}')
```

---

## Execution Sequence

1. Run Entry Verification (NONE guard passes)
2. Apply **E1** — POS_AREAS (13 values)
3. Apply **E2** — _MONEY_AREAS (3 new names)
4. Apply **E3** — normalise_area() full rewrite
5. `python3 -m py_compile /app/memory/reports/sheets_sync.py` → must exit 0
6. Run **E4** — registry migration script
7. Run Self-Verification (V1–V6)
8. Execute EXIT GATE
9. `cd /app && python3 memory/reports/sheets_sync.py --push`

---

## Verification Matrix

| # | Check | Command | Expected |
|---|---|---|---|
| V1 | POS_AREAS has 13 values | `python3 -c "from sheets_sync import POS_AREAS; print(len(POS_AREAS))"` | `13` |
| V2 | normalise_area old-18 names | `normalise_area('Printing')` | `'Printing / Printer Agent'` |
| V3 | normalise_area legacy string | `normalise_area('PMS > Room Status Board')` | `'PMS / Rooms'` |
| V4 | normalise_area Old POS | `normalise_area('Old POS')` | `''` |
| V5 | compute_money_path with new area | `compute_money_path({'area':'Payments / Coupons / Credit','title':'x','files':'','id':'t'})` | `'YES'` |
| V6 | Registry: no old-18 values remain | `grep -c '"area": "Printing"' registry.json` | `0` |
| V7 | Registry: no blank area | python count | `0` |
| V8 | Dry-run UNCLASSIFIED | `--push --dry-run` | `0` |

---

## EXIT GATE

```
□ 1. COMPILE: python3 -m py_compile sheets_sync.py
□ 2. V1-V8 all PASS
□ 3. REGISTRY SYNC: CR-428 → GATE_5A_IMPLEMENTED
□ 4. CR_REGISTRY.md + FILE_OWNERSHIP.md updated
□ 5. Push + confirm no ⚠ Write failed + UNCLASSIFIED = 0
```

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-428 → GATE_5A_IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: sheets_sync.py CR-428 row added
- [ ] Code markers: # CR-428 in E1, E2, E3
```
