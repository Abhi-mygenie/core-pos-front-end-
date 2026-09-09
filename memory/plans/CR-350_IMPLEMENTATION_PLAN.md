# CR-350 — Implementation Plan: Room Check-In ID Upload Toggle (Phase 1 — localStorage)

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/CR-350_IMPACT_ANALYSIS.md`
**Code Reality:** NONE — clean implementation
**Risk:** HIGH — touches RoomCheckInModal.jsx (room billing path)
**Files WILL change:** `StatusConfigPage.jsx` · `RoomCheckInModal.jsx`
**Files will NOT touch:** Any other file

---

## Default Behaviour Decision

**localStorage key absent → `null === 'true'` is `false` → upload NOT required.**
This means by default, ID upload is optional. Toggle must be explicitly turned ON to make it mandatory. **This is a change from post-BUG-351 behaviour** where upload was always required for new guests with `guestDetails=true`.

If the owner wants to preserve "required by default", the hydration line must use `localStorage.getItem(...) !== 'false'` instead of `=== 'true'`. **Confirm with owner before implementing if desired default is mandatory.**

---

## Entry Verification

| # | File | Expected current state |
|---|---|---|
| 1 | `StatusConfigPage.jsx:199` | `const [walkinNameReq, setWalkinNameReq] = useState(false);` |
| 2 | `StatusConfigPage.jsx:339` | `setWalkinNameReq(localStorage.getItem('mygenie_walkin_name_required') === 'true');` |
| 3 | `StatusConfigPage.jsx:537` | `localStorage.setItem('mygenie_walkin_name_required', walkinNameReq ? 'true' : 'false');` |
| 4 | `StatusConfigPage.jsx:405` | `setWalkinNameReq(false);` |
| 5 | `StatusConfigPage.jsx:1049` | `</div>` closing the CR-051 section — new Room section goes here |
| 6 | `RoomCheckInModal.jsx:611` | `if (!frontImage && crmDocuments.length === 0) next.front = 'Front image required';` |
| 7 | `RoomCheckInModal.jsx:614` | `if (!r.frontImage && crmDocuments.length === 0) next[\`adult${i}_front\`] = 'Front image required';` |

---

## Edits

### Edit 1 — `StatusConfigPage.jsx` — Add state (after line 204)

After `const [takeawayNameReq, setTakeawayNameReq] = useState(true);`:
```js
// CR-350: Room check-in ID upload mandatory toggle
const [roomIdUploadReq, setRoomIdUploadReq] = useState(false);
```

---

### Edit 2 — `StatusConfigPage.jsx` — Hydrate on mount (after line 345)

After `setTakeawayNameReq(localStorage.getItem('mygenie_takeaway_name_required') !== 'false');`:
```js
// CR-350: hydrate room ID upload requirement
setRoomIdUploadReq(localStorage.getItem('mygenie_room_id_upload_required') === 'true');
```

---

### Edit 3 — `StatusConfigPage.jsx` — Save (after line 543)

After `localStorage.setItem('mygenie_takeaway_name_required', takeawayNameReq ? 'true' : 'false');`:
```js
// CR-350: persist room ID upload requirement
localStorage.setItem('mygenie_room_id_upload_required', roomIdUploadReq ? 'true' : 'false');
```

---

### Edit 4 — `StatusConfigPage.jsx` — Reset (after line 411)

After `setTakeawayNameReq(true);`:
```js
// CR-350: reset room ID upload (default: not required)
setRoomIdUploadReq(false);
```

---

### Edit 5 — `StatusConfigPage.jsx` — New Room section UI (after line 1049, the closing `</div>` of CR-051 section)

```jsx
{/* ============== CR-350: ROOM CHECK-IN REQUIREMENTS ============== */}
<div className="mt-6 pt-4" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
  <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>
    Room Check-In Requirements
  </h3>
  <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
    Control which documents are mandatory at room check-in. Per-device settings.
  </p>
  <div className="flex items-center justify-between rounded-lg px-3 py-2 border"
    style={{ borderColor: roomIdUploadReq ? COLORS.primaryGreen : COLORS.borderGray, backgroundColor: roomIdUploadReq ? `${COLORS.primaryGreen}05` : '#fff' }}>
    <span className="text-sm" style={{ color: COLORS.darkText }}>ID Document mandatory</span>
    <button
      data-testid="room-id-upload-req-toggle"
      onClick={() => { setRoomIdUploadReq(v => !v); setHasChanges(true); }}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors"
      style={{ backgroundColor: roomIdUploadReq ? COLORS.primaryGreen : COLORS.borderGray }}
      role="switch"
      aria-checked={roomIdUploadReq}
    >
      <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: roomIdUploadReq ? 'translateX(17px)' : 'translateX(2px)', marginTop: '2px' }} />
    </button>
  </div>
</div>
```

---

### Edit 6 — `RoomCheckInModal.jsx:609-615` — Read localStorage, gate both guards

**Current:**
```js
if (flags.guestDetails) {
  // BUG-351: skip upload validation when CRM already has verified docs on file
  if (!frontImage && crmDocuments.length === 0) next.front = 'Front image required';
  extraAdults.forEach((r, i) => {
    if (!r.name.trim()) next[`adult${i}_name`] = 'Name required';
    if (!r.frontImage && crmDocuments.length === 0) next[`adult${i}_front`] = 'Front image required';
  });
```

**New:**
```js
if (flags.guestDetails) {
  // CR-350: ID upload mandatory only when dashboard toggle is ON
  // BUG-351: also skip when CRM already has verified docs on file
  const idUploadRequired = localStorage.getItem('mygenie_room_id_upload_required') === 'true';
  if (!frontImage && crmDocuments.length === 0 && idUploadRequired) next.front = 'Front image required';
  extraAdults.forEach((r, i) => {
    if (!r.name.trim()) next[`adult${i}_name`] = 'Name required';
    if (!r.frontImage && crmDocuments.length === 0 && idUploadRequired) next[`adult${i}_front`] = 'Front image required';
  });
```

---

## Execution Sequence

1. Edit 1 (`StatusConfigPage` state)
2. Edit 2 (`StatusConfigPage` hydrate)
3. Edit 3 (`StatusConfigPage` save)
4. Edit 4 (`StatusConfigPage` reset)
5. Edit 5 (`StatusConfigPage` UI section)
6. Edit 6 (`RoomCheckInModal` validation gate)
7. Compile check → 0 warnings

---

## Verification Matrix

| Edit | File | Test | Manual/Auto |
|---|---|---|---|
| E1–E5 | StatusConfigPage | Open Dashboard Settings → Room Check-In section visible with ID Document toggle | MANUAL |
| E1–E5 | StatusConfigPage | Toggle ON → Save → Reload → toggle still ON (localStorage persisted) | MANUAL |
| E1–E5 | StatusConfigPage | Reset button → toggle returns to OFF | MANUAL |
| E6 (toggle OFF) | RoomCheckInModal | Toggle OFF → check-in without photo → NO error, proceeds | MANUAL |
| E6 (toggle ON, no CRM) | RoomCheckInModal | Toggle ON → no CRM docs → no photo → "Front image required" | MANUAL |
| E6 (toggle ON, CRM docs) | RoomCheckInModal | Toggle ON + CRM docs → no new photo → NO error (CRM guard wins) | MANUAL |
| Regression BUG-351 | RoomCheckInModal | CRM docs present → toggle state irrelevant, upload never required | MANUAL |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: CR-350 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `StatusConfigPage.jsx` + `RoomCheckInModal.jsx` listed with CR-350
- [ ] Code markers: `// CR-350` on every modified block
- [ ] Compile: 0 new warnings
