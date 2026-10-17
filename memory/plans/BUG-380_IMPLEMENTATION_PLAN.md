# Implementation Plan — BUG-380: Occupied Rooms Shown in Booking Picker

**ID:** BUG-380
**Gate:** 3 (Implementation Plan)
**Date:** 2026-09-03
**Code Reality:** NONE (verified — 0 hits for BUG-380 markers)
**IA Verified:** Lines match (pmsService.js L79-84, NewBookingPage.jsx L182-189, CheckInPage.jsx L331-333 — all confirmed current)

---

## §1 Scope Lock

### Files WILL change
| # | File | Lines | Change |
|---|---|---|---|
| F1 | `api/services/pmsService.js` | L79-84 | Modify `getBookableRooms()` — add `getRoomList()` cross-ref |
| F2 | `pages/pms/NewBookingPage.jsx` | L182-189 | Grey out occupied rooms with badge, disable click |
| F3 | `pages/pms/CheckInPage.jsx` | L331-333 | Disable occupied rooms in dropdown, add "(Occupied)" label |

### Files will NOT touch
`aiosellTransform.js`, `aiosellService.js`, `roomListTransform.js`, `roomService.js`, `App.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `InHouseGuestsPage.jsx`, `FrontDeskPage.jsx`, `ArrivalsPage.jsx`, `DeparturesPage.jsx`

---

## §2 Owner Decisions (Locked)

| ID | Decision | Value |
|---|---|---|
| OQ-380-01 | Hide vs grey out | **(b) Greyed out with "Occupied" badge** |

---

## §3 Edits

### Edit 1 — `pmsService.js` L79-84: Add occupancy cross-reference

**Current (L79-84):**
```js
export const getBookableRooms = async () => {
  const raw = await getAiosellRooms();
  const rooms = aiosellTransform.fromAPI.rooms(raw?.data ?? raw);
  const typeById = Object.fromEntries(rooms.mappings.map(m => [m.restaurantTableId, m.aiosellRoomCode]));
  return rooms.localRooms.map(r => ({ id: r.id, tableNo: r.tableNo, roomType: typeById[r.id] ?? null }));
};
```

**New (replace L79-84):**
```js
export const getBookableRooms = async () => {
  const [raw, occupied] = await Promise.all([
    getAiosellRooms(),
    getRoomList().catch(() => []),                           // BUG-380: occupied room IDs
  ]);
  const rooms = aiosellTransform.fromAPI.rooms(raw?.data ?? raw);
  const typeById = Object.fromEntries(rooms.mappings.map(m => [m.restaurantTableId, m.aiosellRoomCode]));
  const occIds = new Set((occupied ?? []).map(r => r?.table?.id).filter(Boolean));  // BUG-380
  return rooms.localRooms.map(r => ({
    id: r.id,
    tableNo: r.tableNo,
    roomType: typeById[r.id] ?? null,
    isOccupied: occIds.has(r.id),                            // BUG-380
  }));
};
```

**Notes:**
- `getRoomList()` already imported at L4 (used by `getInHouseGuests`). No new import needed.
- `.catch(() => [])` — graceful degradation: if GET_ROOM_LIST fails, all rooms appear available (same as before).
- `occupied` returns `[{ table: { id }, order_id, user }]` — only `table.id` used.
- Walk-in occupied rooms are included (GET_ROOM_LIST returns any room with active order_id).

---

### Edit 2 — `NewBookingPage.jsx` L182-189: Grey out occupied rooms

**Current (L182-189):**
```jsx
                  ) : rooms.map(r => (
                    <button key={r.id} data-testid={`nb-room-pill-${r.id}`} onClick={() => setRoomId(r.id)} className={`relative p-3 rounded-xl border-2 text-left transition-all ${roomId === r.id ? 'border-[#329937] bg-[#329937]/5' : 'border-[#E5E5E5] bg-white hover:border-[#329937]/40'}`}>
                      <Home className="w-5 h-5 text-[#329937] mb-1.5" />
                      <div className="font-bold text-[15px] text-[#1A1A1A]">{r.tableNo}</div>
                      <div className="text-[11px] text-[#888] capitalize">{r.roomType ?? 'Room'} · ID {r.id}</div>
                      {roomId === r.id && <div className="absolute top-2 right-2 w-5 h-5 bg-[#329937] rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    </button>
                  ))}
```

**New (replace L182-189):**
```jsx
                  ) : rooms.map(r => (
                    <button key={r.id} data-testid={`nb-room-pill-${r.id}`}
                      onClick={() => !r.isOccupied && setRoomId(r.id)}
                      disabled={r.isOccupied}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                        r.isOccupied
                          ? 'border-[#E5E5E5] bg-[#F7F7F7] opacity-60 cursor-not-allowed'
                          : roomId === r.id
                            ? 'border-[#329937] bg-[#329937]/5'
                            : 'border-[#E5E5E5] bg-white hover:border-[#329937]/40'
                      }`}>
                      <Home className={`w-5 h-5 mb-1.5 ${r.isOccupied ? 'text-[#888]' : 'text-[#329937]'}`} />
                      <div className={`font-bold text-[15px] ${r.isOccupied ? 'text-[#888]' : 'text-[#1A1A1A]'}`}>{r.tableNo}</div>
                      <div className="text-[11px] text-[#888] capitalize">{r.roomType ?? 'Room'} · ID {r.id}</div>
                      {r.isOccupied && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide" style={{ background: '#FEE2E2', color: '#991B1B' }} data-testid={`nb-room-occupied-badge-${r.id}`}>Occupied</div>
                      )}
                      {!r.isOccupied && roomId === r.id && <div className="absolute top-2 right-2 w-5 h-5 bg-[#329937] rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    </button>
                  ))}
```

**Notes:**
- `disabled={r.isOccupied}` prevents form submission with occupied room.
- `onClick` guard: `!r.isOccupied && ...` double-prevents selection.
- Visual: greyed background (#F7F7F7), 60% opacity, "Occupied" red badge top-right.
- Icon color: muted (#888) for occupied, green (#329937) for available.
- Existing selection (green check) only renders for `!r.isOccupied`.

---

### Edit 3 — `CheckInPage.jsx` L331-333: Disable occupied rooms in dropdown

**Current (L331-333):**
```jsx
                      <select data-testid="ci-room" value={form.restaurantTableId ?? ''} onChange={e => setField('restaurantTableId', Number(e.target.value))} className={inputCls}>
                        <option value="" disabled>Select room</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.tableNo} ({r.roomType ?? 'Room'})</option>)}
                      </select>
```

**New (replace L331-333):**
```jsx
                      <select data-testid="ci-room" value={form.restaurantTableId ?? ''} onChange={e => setField('restaurantTableId', Number(e.target.value))} className={inputCls}>
                        <option value="" disabled>Select room</option>
                        {rooms.map(r => <option key={r.id} value={r.id} disabled={r.isOccupied}>{r.tableNo} ({r.roomType ?? 'Room'}){r.isOccupied ? ' — Occupied' : ''}</option>)}
                      </select>
```

**Notes:**
- `disabled={r.isOccupied}` native HTML — browser renders greyed out, not selectable.
- Text suffix ` — Occupied` for clarity (screen readers + visual).
- Minimal change — 1 line modified.

---

## §4 Execution Sequence

1. **Edit 1** → `pmsService.js` → compile check
2. **Edit 2** → `NewBookingPage.jsx` → compile check
3. **Edit 3** → `CheckInPage.jsx` → compile check
4. **Browser verify** → all 3 pages, V1-V8

---

## §5 Verification Matrix

| # | Check | File | Method | Automated? |
|---|---|---|---|:---:|
| V1 | `getBookableRooms()` returns `isOccupied: true` for in-house rooms | pmsService.js | Console / Network tab | NO |
| V2 | Room grid shows occupied rooms greyed out with red "Occupied" badge | NewBookingPage.jsx | Browser screenshot | NO |
| V3 | Clicking occupied room does NOT select it (no green border/check) | NewBookingPage.jsx | Browser click test | NO |
| V4 | Available rooms (not occupied) still selectable, green border + check | NewBookingPage.jsx | Browser click test | NO |
| V5 | Room dropdown shows occupied rooms disabled with "— Occupied" suffix | CheckInPage.jsx | Browser screenshot | NO |
| V6 | Cannot submit form with occupied room selected in dropdown | CheckInPage.jsx | Browser form test | NO |
| V7 | Webpack compiles after all edits | CLI | `tail frontend.out.log` | YES |
| V8 | No forbidden colors (#22C55E, #3B82F6, bg-blue-, bg-slate-) in changed lines | All 3 files | grep | YES |

---

## §6 Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| `getRoomList()` API failure | LOW | `.catch(() => [])` — graceful fallback, all rooms available (pre-fix behavior) |
| Race condition (check-in between load and save) | LOW | Pre-existing issue, not introduced by this fix. Backend should reject double-booking. |
| Walk-in room greyed out correctly | BONUS | `getRoomList()` includes walk-ins — partial BUG-381 mitigation |

---

## §7 Post-Code Registry Checklist

```
- [ ] registry.json: BUG-380 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add pmsService.js (BUG-380), NewBookingPage.jsx (BUG-380), CheckInPage.jsx (BUG-380)
- [ ] Code markers: // BUG-380 comment in every modified file
```

---

*Plan written 2026-09-03. Awaiting owner's explicit **Gate 4 GO**.*
