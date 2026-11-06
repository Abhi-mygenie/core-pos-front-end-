# CR-350 — Impact Analysis: Room Check-In ID Upload Toggle (Phase 1 — localStorage)

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Code Reality:** NONE (no toggle exists anywhere)
**Conflict Pre-Check:** RoomCheckInModal.jsx was modified today (BUG-351 fix at line 611). CR-350 also touches line 611. BUG-351 is fully implemented — no conflict. CR-350 edits the same guard, extending it to read from localStorage. Sequence: BUG-351 DONE → CR-350 safe.
**Risk:** HIGH (room check-in validation)

---

## Data Flow Trace (Phase 1 — localStorage)

```
StatusConfigPage.jsx
  roomIdUploadReq toggle (new state)
        ↓  on Save Configuration
  localStorage.setItem('mygenie_room_id_upload_required', 'true'|'false')

RoomCheckInModal.jsx:611  (at validation time, per-render read)
  if (flags.guestDetails) {
    const idRequired = localStorage.getItem('mygenie_room_id_upload_required') === 'true';
    if (!frontImage && crmDocuments.length === 0 && idRequired)
      next.front = 'Front image required';
  }
```

**Default behaviour (key absent):** `localStorage.getItem(...)` returns `null` → `null === 'true'` is `false` → **upload NOT required by default.** This is a behaviour change from today (currently always required when `guestDetails=true` and no CRM docs). Confirm default with owner before implementing.

---

## Pattern Reference — CR-051

```
StatusConfigPage.jsx:339  localStorage.getItem('mygenie_walkin_name_required') === 'true'
StatusConfigPage.jsx:537  localStorage.setItem('mygenie_walkin_name_required', walkinNameReq ? 'true' : 'false')
CartPanel.jsx:832          localStorage.getItem('mygenie_walkin_name_required') === 'true'
```
CR-350 is structurally identical. Same store → same read pattern.

---

## What Changes

### E1 — `StatusConfigPage.jsx` (new Room section)

**New state:**
```js
// CR-350: Room ID upload mandatory toggle
const [roomIdUploadReq, setRoomIdUploadReq] = useState(false);
```

**Hydrate on mount** (alongside CR-051 block, ~line 339):
```js
setRoomIdUploadReq(localStorage.getItem('mygenie_room_id_upload_required') === 'true');
```

**Save** (alongside CR-051 block, ~line 537):
```js
localStorage.setItem('mygenie_room_id_upload_required', roomIdUploadReq ? 'true' : 'false');
```

**Reset** (alongside CR-051 block, ~line 404):
```js
setRoomIdUploadReq(false); // default: not required
```

**New UI section** — add after the existing CR-051 "Customer Field Requirements" block (~line 986):
```jsx
{/* ===== CR-350: ROOM CHECK-IN REQUIREMENTS ===== */}
<section heading="Room Check-In Requirements">
  <description>Per-device settings for room check-in document upload.</description>
  <Toggle label="ID Document mandatory" checked={roomIdUploadReq} setter={setRoomIdUploadReq} />
</section>
```

### E2 — `RoomCheckInModal.jsx:611` (read localStorage instead of hardcoded)

**Current (post BUG-351):**
```js
if (!frontImage && crmDocuments.length === 0) next.front = 'Front image required';
```

**After CR-350:**
```js
// CR-350: ID upload mandatory only when toggle is ON in dashboard settings
const idUploadRequired = localStorage.getItem('mygenie_room_id_upload_required') === 'true';
if (!frontImage && crmDocuments.length === 0 && idUploadRequired) next.front = 'Front image required';
```

**Same guard for extra adults (line 614):**
```js
if (!r.frontImage && crmDocuments.length === 0 && idUploadRequired) next[`adult${i}_front`] = ...
```
`idUploadRequired` is computed once above the loop — no repeat read.

---

## Open Pre-Implementation Question

**Default behaviour clarification needed before Gate 3:**
With `localStorage` key absent, upload becomes NOT required. Current behaviour (BUG-351 fix) has it required when `guestDetails=true` and no CRM docs. Should default be:
- `false` (optional unless toggled ON) — user must opt in to make it mandatory
- `true` (mandatory unless toggled OFF) — preserves current behaviour, user opts out

Recommend owner confirms before implementation.

---

## Files WILL Change

| File | Edit | Risk |
|---|---|---|
| `pages/StatusConfigPage.jsx` | New state + hydrate + save + reset + UI section | MEDIUM (settings screen, localStorage) |
| `components/modals/RoomCheckInModal.jsx` | Line 611 + 614 — add localStorage read to guard | HIGH (room check-in validation) |

## Files Will NOT Touch

`roomService.js`, `RoomCheckInModal.jsx` image upload logic (lines 730-734), any backend — validation is entirely FE-side.

---

## Verification Matrix

| Edit | File | How to Verify |
|---|---|---|
| E1 | StatusConfigPage | Open dashboard settings → see Room Check-In section → toggle ON → save → reload → toggle is ON |
| E2 (ON) | RoomCheckInModal | Toggle ON → check-in guest with no CRM docs → submit without photo → "Front image required" error |
| E2 (OFF) | RoomCheckInModal | Toggle OFF → check-in guest with no CRM docs → submit without photo → no error, check-in proceeds |
| E2 (CRM docs) | RoomCheckInModal | Toggle ON + CRM docs exist → submit without photo → no error (crmDocuments guard takes priority) |

---

## Post-Code Registry Checklist

- [ ] registry.json: CR-350 → status: IMPLEMENTED, gate: 5
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: StatusConfigPage.jsx + RoomCheckInModal.jsx listed
- [ ] Code markers: `// CR-350` in every modified file
- [ ] Compile: 0 new warnings
