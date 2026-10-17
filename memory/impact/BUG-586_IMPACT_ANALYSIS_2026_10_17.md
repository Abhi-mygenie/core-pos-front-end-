# BUG-586 — Impact Analysis (Gate 2)
## Phone search off by default + rooms missing phone field

**ID:** BUG-586  **Stage:** Gate 2  **Date:** 2026-10-17  **Risk:** LOW  **Priority:** P2

---

## Code Reality: NONE
No fix exists. `grep -rn "BUG-586"` → 0 matches in `src/`.

---

## Conflict Pre-Check

| Open item | File conflict | Lines | Conflict? |
|---|---|---|---|
| CR-431 | profileTransform.js | L421-422 (eInvoice, whatsappMessage) | NO — different lines from L236 |
| BUG-576 | DashboardPage.jsx L1259 rooms | **OVERLAP on L1259** | YES — must batch |
| BUG-584 | DashboardPage.jsx L1258-1259 | **OVERLAP on L1259** | YES — must batch |

**Resolution:** BUG-586 L1259 edit MUST be done in same batch as BUG-576 + BUG-584. Combined edit on L1257-1261 (rooms search block) — all three bugs resolved in one change.

---

## Data Flow Trace

### Gap A — Phone off by default

```
GET /api/v1/restaurant/profile
  → profileTransform.js L236:
      searchOptions: api.search_by || ['order id', 'table no', 'user id']
                                      //  ↑ 'phone no' missing from default
  → RestaurantContext.defaultSearchOptions = ['order id', 'table no', 'user id']
  → DashboardPage search: opts = ['order id', 'table no', 'user id']
  → opts.includes('phone no') → FALSE
  → phone fields filtered out of all[] → phone never searched for any bucket
```

### Gap B — Rooms missing phone field

```
Even if restaurant has search_by: ['phone no'] configured:
  → enrichedRooms = allRoomsList.map(room => ({ ...room, guest: ... }))
  → allRoomsList items: phone field NOT populated (not set in allRoomsList memo)
  → rooms all[]: [item.id, guestName] — no phone entry at all
  → guest phone search on rooms → always returns nothing
```

**Phone field availability check:**
`allRoomsList` items are built from `roomOrders.map(order => ({ ...order fields... }))`. The `order` object from `orderItemsByTableId` comes from `orderTransform.js` which includes `phone: orderData.phone`. So `room.phone` (via order spread) may be available. **Needs implementation-time verification** — if unavailable, phone must be sourced from `room.order?.phone`.

---

## Exact Edits Required

### Edit E-1 — Add 'phone no' to default searchOptions (profileTransform.js L236)
```javascript
// BEFORE:
searchOptions: api.search_by || ['order id', 'table no', 'user id'],

// AFTER:
searchOptions: api.search_by || ['order id', 'table no', 'phone no', 'user id'], // BUG-586
```

### Edit E-2 — Add phone to rooms search all[] (DashboardPage.jsx L1259)
This edit is COMBINED with BUG-576 (label fix) + BUG-584 (remove DB ID):
```javascript
// BEFORE (L1257-1261):
results.rooms = searchItems(enrichedRooms, query, item => ({
  id: item.id,
  all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName || item.guest || '')].filter(Boolean) // BUG-332
}));

// AFTER (combined BUG-576 + BUG-584 + BUG-586):
results.rooms = searchItems(enrichedRooms, query, item => ({
  id: item.label,                                                                       // BUG-584+BUG-576: display label for exact match
  all: [
    opts.includes('table no') && item.label,                                            // BUG-576+BUG-584: room display number
    opts.includes('user id') && (item.guestName || item.guest || ''),                   // BUG-332: guest name
    opts.includes('phone no') && (item.phone || item.order?.phone || ''),              // BUG-586: guest phone
  ].filter(Boolean)
}));
```

---

## Verification Matrix

| # | Test | How |
|---|---|---|
| V1 | Search by guest phone → table result appears | Browser: type a guest phone number |
| V2 | Search by guest phone → room result appears | Browser: type a room guest phone |
| V3 | Customer name search still works (no regression) | Browser: type partial guest name |
| V4 | Phone search works even when not explicitly configured (default now includes phone) | Browser: any account |

---

## Scope Lock
**WILL change:**
- `src/api/transforms/profileTransform.js` — L236 only (add 'phone no' to array)
- `src/pages/DashboardPage.jsx` — L1257-1261 rooms block (combined with BUG-576 + BUG-584)

**WILL NOT touch:** Header.jsx · tableTransform.js · any other file

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-586 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: profileTransform.js + DashboardPage.jsx with BUG-586 + date
- [ ] Code markers: // BUG-586 on each edited line
- [ ] Compile: 0 new warnings
```
*Gate 2 complete 2026-10-17. Ready Gate 3 on owner GO.*
