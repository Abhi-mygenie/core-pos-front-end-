# Implementation Plan — BUG-383
## RoomStatusPage: HK Filter Count Always 0

**ID:** BUG-383
**Gate:** 3 — Implementation Plan
**Written by:** PLANNING agent (ALPHA v0.7)
**Date:** 2026-09-09
**Sprint:** pos_pms_1
**Risk:** MEDIUM
**Impact Analysis:** `memory/impact/BUG-383_IMPACT_ANALYSIS.md` (Gate 2 CLOSED)

---

## 0. Entry Verification (run BEFORE writing any code)

```bash
# E1 anchor
sed -n '28p' /app/frontend/src/api/transforms/roomStatusTransform.js
# Expected: ...rooms.filter(r => r.displayStatus === s).length...

# E2+E3 anchors
sed -n '78p' /app/frontend/src/pages/pms/RoomStatusPage.jsx
# Expected: const hkIds = board.rooms.filter(r => r.displayStatus === 'hk').map(r => r.id);

sed -n '92p' /app/frontend/src/pages/pms/RoomStatusPage.jsx
# Expected: const filtered = board ? (filter === 'all' ? board.rooms : board.rooms.filter(r => r.displayStatus === filter)) : [];

# E4 anchor
sed -n '64p' /app/frontend/src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js
# Expected: b.counts.hk === 1,

# If ANY mismatch → STOP. Return to Planning agent.
```

---

## 1. Execution Sequence

```
Group A — Transform (no UI, safe first)
  E1: roomStatusTransform.js:28      — fix counts.hk
  → Checkpoint: webpack 0 errors

Group B — Page (handler + filter)
  E2: RoomStatusPage.jsx:76-90       — handleBulkClean rewrite
  E3: RoomStatusPage.jsx:92          — filter view special-case
  → Checkpoint: webpack 0 errors

Group C — Test file sync
  E4: roomStatusTransform.cr358p4.test.js:27+64  — fix inline copy + assertion
  → Checkpoint: run test → ALL PASS
```

---

## 2. Edit Specifications

---

### E1 — `src/api/transforms/roomStatusTransform.js` L28

**Action:** Replace the one-liner `counts` computation with a version that counts `hk` by `manualStatus`.

**Current L28:**
```js
  const counts = DISPLAY_STATUSES.reduce((acc, s) => ({ ...acc, [s]: rooms.filter(r => r.displayStatus === s).length }), { all: rooms.length });
```

**Replace with:**
```js
  // BUG-383: counts.hk must count by manualStatus (not displayStatus).
  // Auto-HK sets manual_status:'hk' on occupied rooms; display_status stays 'occupied'.
  const counts = DISPLAY_STATUSES.reduce((acc, s) => ({
    ...acc,
    [s]: s === 'hk'
      ? rooms.filter(r => r.manualStatus === 'hk').length
      : rooms.filter(r => r.displayStatus === s).length,
  }), { all: rooms.length });
```

**Verify E1:**
```bash
grep -n "BUG-383\|manualStatus.*hk\|manualStatus === 'hk'" /app/frontend/src/api/transforms/roomStatusTransform.js
# Expected: 2 hits (BUG-383 comment + manualStatus check)
```

---

### E2 — `src/pages/pms/RoomStatusPage.jsx` L76–90

**Action:** Rewrite `handleBulkClean` to use `manualStatus`, separate occupied-HK rooms, and show warning (OD-383-01).

**Current L76–90:**
```js
  const handleBulkClean = async () => {
    if (!board) return;
    const hkIds = board.rooms.filter(r => r.displayStatus === 'hk').map(r => r.id);
    if (hkIds.length === 0) return;
    setBulkBusy(true);
    const result = await bulkMarkClean(hkIds);
    if (result.failed.length > 0) {
      toast.warning(`${result.ok.length} cleaned, ${result.failed.length} failed — ${result.failed[0].message}`);
    } else {
      toast.success(`${result.ok.length} rooms marked clean`);
    }
    result.warnings.forEach(w => toast.warning(`Inventory sync warning: ${w.message}`));
    await load();
    setBulkBusy(false);
  };
```

**Replace with:**
```js
  const handleBulkClean = async () => {
    if (!board) return;
    // BUG-383: use manualStatus to find ALL rooms needing HK (including occupied ones)
    const hkRooms     = board.rooms.filter(r => r.manualStatus === 'hk');
    if (hkRooms.length === 0) return;
    const occupiedHk  = hkRooms.filter(r => r.displayStatus === 'occupied');
    const cleanableIds = hkRooms.filter(r => r.displayStatus !== 'occupied').map(r => r.id);
    // OD-383-01: warn if occupied rooms will be skipped
    if (occupiedHk.length > 0) {
      const n = occupiedHk.length;
      const m = cleanableIds.length;
      toast.warning(
        `${n} occupied room${n > 1 ? 's' : ''} with HK flag will be skipped — cannot mark clean while occupied.` +
        (m > 0 ? ` Proceeding with ${m} room${m > 1 ? 's' : ''}.` : '')
      );
      if (cleanableIds.length === 0) return;
    }
    setBulkBusy(true);
    const result = await bulkMarkClean(cleanableIds);
    if (result.failed.length > 0) {
      toast.warning(`${result.ok.length} cleaned, ${result.failed.length} failed — ${result.failed[0].message}`);
    } else {
      toast.success(`${result.ok.length} rooms marked clean`);
    }
    result.warnings.forEach(w => toast.warning(`Inventory sync warning: ${w.message}`));
    await load();
    setBulkBusy(false);
  };
```

**Verify E2:**
```bash
grep -n "BUG-383\|occupiedHk\|cleanableIds\|manualStatus" /app/frontend/src/pages/pms/RoomStatusPage.jsx | head -10
# Expected: BUG-383, occupiedHk, cleanableIds, manualStatus all present
```

---

### E3 — `src/pages/pms/RoomStatusPage.jsx` L92

**Action:** Special-case the `hk` filter to use `manualStatus` so clicking the HK chip shows occupied-HK rooms.

**Current L92:**
```js
  const filtered = board ? (filter === 'all' ? board.rooms : board.rooms.filter(r => r.displayStatus === filter)) : [];
```

**Replace with:**
```js
  // BUG-383: HK filter uses manualStatus so occupied-HK rooms appear when HK tab is selected
  const filtered = board ? (
    filter === 'all' ? board.rooms :
    filter === 'hk'  ? board.rooms.filter(r => r.manualStatus === 'hk') :
    board.rooms.filter(r => r.displayStatus === filter)
  ) : [];
```

**Verify E3:**
```bash
grep -n "BUG-383\|filter === 'hk'" /app/frontend/src/pages/pms/RoomStatusPage.jsx
# Expected: BUG-383 comment + filter === 'hk' line
```

---

### E4 — `src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js`

**Action:** Two sub-edits to keep the inline test copy in sync with the source fix.

#### E4a — Fix inline `fromRoomStatusBoard` at test L27

**Current L27 (test inline copy):**
```js
    const counts = DISPLAY_STATUSES.reduce((acc, s) => ({ ...acc, [s]: rooms.filter(r => r.displayStatus === s).length }), { all: rooms.length });
```

**Replace with:**
```js
    // BUG-383: count hk by manualStatus
    const counts = DISPLAY_STATUSES.reduce((acc, s) => ({
      ...acc,
      [s]: s === 'hk' ? rooms.filter(r => r.manualStatus === 'hk').length : rooms.filter(r => r.displayStatus === s).length,
    }), { all: rooms.length });
```

#### E4b — Update assertion at test L64

**Current L64:**
```js
    b.counts.hk === 1,
```

**Replace with:**
```js
    b.counts.hk === 2, // BUG-383: fixture has 2 rooms with manualStatus:'hk' (8526+8528)
```

**Verify E4:**
```bash
# Run the test
node /app/frontend/src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js
# Expected: V-U1 PASS, V-U2 PASS, V-U3 PASS, V-U1b PASS, === ALL PASS ===
```

---

## 3. Scope Lock

```
Files WILL change (3):
  src/api/transforms/roomStatusTransform.js                    E1
  src/pages/pms/RoomStatusPage.jsx                             E2 + E3
  src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js  E4

Files will NOT touch:
  src/api/services/pmsService.js       (bulkMarkClean unchanged)
  src/pages/pms/FrontDeskPage.jsx      (no dependency on counts.hk)
  src/pages/pms/ArrivalsPage.jsx
  src/pages/pms/DeparturesPage.jsx
  src/App.js
  src/components/layout/Sidebar.jsx
  Any other file
```

---

## 4. Verification Matrix

| V# | Feature | File | Verify | Auto? |
|---|---|---|---|---|
| V1 | counts.hk = 2 for fixture with 2 manualStatus:hk rooms | roomStatusTransform.js | node test file: V-U1 PASS | YES |
| V2 | Non-HK counts unchanged (occupied=2, booked=2) | roomStatusTransform.js | node test file: V-U1 sub-checks PASS | YES |
| V3 | HK filter chip shows count > 0 on preprod | RoomStatusPage.jsx | Browser: /pms/room-status, HK chip badge | NO |
| V4 | Clicking HK chip shows occupied-HK rooms in grid | RoomStatusPage.jsx | Browser: click HK chip | NO |
| V5 | Mark All Clean button enabled when HK > 0 | RoomStatusPage.jsx | Browser: button not opacity-40 | NO |
| V6 | Warning toast on occupied-HK rooms in Mark All Clean | RoomStatusPage.jsx | Browser: click Mark All Clean, see toast | NO |
| V7 | Pure-HK rooms still mark clean without warning | RoomStatusPage.jsx | Browser: pure-HK room scenario | NO |

---

## 5. Post-Code Registry Checklist

```
□ registry.json: BUG-383 → status: IMPLEMENTED, gate: 5a, sprint_key: pos_pms_1
□ BUG_TRACKER.md: row updated IMPLEMENTED Gate 5a
□ FILE_OWNERSHIP.md: all 3 files listed with BUG-383 + 2026-09-09
□ Code markers: // BUG-383 in every modified file (E1/E2/E3/E4)
□ webpack: 0 new errors, 0 new warnings
□ Test: node test.js → ALL PASS
```

---

*Gate 3 complete. 4 edits (3 MOD + 1 TEST). 7 verification checks.*
*Entry Verification: 4 anchors.*
*Awaiting Gate 4 GO → Implementation.*
