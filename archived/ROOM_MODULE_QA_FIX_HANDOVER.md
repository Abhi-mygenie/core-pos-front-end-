# Room Module V2 — QA Fix Handover

**For:** Next Bug Fix Agent
**From:** Senior Bug Fix Agent (analysis only; code not applied)
**Date:** 2026-04-24
**Status:** APPROVED FOR IMPLEMENTATION — awaiting execution

---

## Task role (copy-paste for the next agent's brief)

> You are a Senior Bug Fix Agent. Your task is STRICTLY LIMITED to implementing the two fixes below, exactly as specified. Do NOT refactor. Do NOT touch unrelated logic. Do NOT modify architecture. Do NOT introduce new dependencies. Do NOT change API contracts or payload structure. Keep the fix isolated to the single file below.

---

## Input / source of truth

- QA Report: `/app/memory/ROOM_MODULE_QA_REPORT.md`
- V2 requirements: `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md`
- V2 design addendum: `/app/memory/ROOM_MODULE_V2_DESIGN_ADDENDUM.md`
- PRD: `/app/memory/PRD.md`
- Test credentials: `/app/memory/test_credentials.md` (`owner@18march.com` / `Qplazm@10`)

## Scope — exactly these two defects

| ID | Severity | Title |
|---|---|---|
| **D-01** | **P1** | Phone country auto-switches to Iran (+98) when Indian users type a 10-digit mobile number starting with `9` |
| **M-02** | **P3** | Field-level "Required" errors persist visually after the fields have been filled |

Nothing else. If any additional issue is encountered during these two fixes, **document it and stop** — do not expand scope.

---

## File in scope

**Only one file is touched:**

```
/app/frontend/src/components/modals/RoomCheckInModal.jsx
```

No other file — not the service, not the transform, not the tests, not the barrel, not the constants.

---

## D-01 — Root cause and fix

### Root cause

In `RoomCheckInModal.jsx` (search for `<PhoneInput`), the component is currently rendered as:

```jsx
<PhoneInput
  data-testid="checkin-phone"
  international          // ← the culprit
  defaultCountry="IN"
  value={phone}
  onChange={(val) => setPhone(val || '')}
  className="flex-1 rcm-phone-input"
  countrySelectProps={{ 'data-testid': 'checkin-country-code' }}
  numberInputProps={{
    'data-testid': 'checkin-phone-input',
    className: 'outline-none text-sm bg-transparent min-w-0 w-full',
    style: { color: COLORS.darkText },
    placeholder: '98765 43210',
  }}
/>
```

The `international` prop on `react-phone-number-input` tells the library to parse **every keystroke as potentially international** (expecting a `+CC…` prefix). When an Indian user types `9876543210`, the library sees the leading `9` and matches against its country-code table — `98` is Iran's calling code — so it flips the flag from 🇮🇳 to 🇮🇷 and re-formats the value as `+98 76 5432 10`. An inline "Enter a valid phone number" error then appears because Iran has a different expected national-number length.

### Fix (single change)

**Delete the `international` prop** — literally one line. With only `defaultCountry="IN"` remaining, the library parses input as a national-format number against the default country, which is the intended behaviour for the 99% Indian-operator case. The country dropdown still exists for the rare non-Indian guest.

### Exact `search_replace` to apply

**old_str:**
```
                <PhoneInput
                  data-testid="checkin-phone"
                  international
                  defaultCountry="IN"
                  value={phone}
                  onChange={(val) => setPhone(val || '')}
```

**new_str:**
```
                <PhoneInput
                  data-testid="checkin-phone"
                  defaultCountry="IN"
                  value={phone}
                  onChange={(val) => setPhone(val || '')}
```

That is the only D-01 edit.

### Why this is safe

- The `phone` state variable continues to hold the full E.164 string produced by `react-phone-number-input`. For `9876543210` it will now produce `+919876543210` (was producing the malformed `+98765432100` earlier). The payload builder in `roomService.js` reads `params.phone` verbatim — no change in shape.
- `isValidPhoneNumber(phone)` continues to work; a 10-digit Indian mobile will now pass validation.
- If the operator explicitly types `+44…` or selects a different country via the dropdown, `react-phone-number-input` will still switch country — the one legitimate international case is preserved.
- No new props, no prop rename, no new dependency.

---

## M-02 — Root cause and fix

### Root cause

The `errors` state in `RoomCheckInModal.jsx` is mutated **only** inside `validate()` (the function called from the submit click handler). Each individual `onChange` handler writes to its own state variable (e.g., `setName`, `setRoomPrice`) but never touches `errors`. So an error stamped at submit-time stays rendered against the DOM until the next submit click re-runs `validate()`.

### Fix (one new `useEffect`)

Rather than refactor ~15 `onChange` handlers (invasive, touches every field), add a **single `useEffect`** that runs after each render, compares each error key against the current value of its field, and drops the entry when the field is now valid. This is a bolt-on — no existing handler is modified.

### Exact code to add

Insert **this block** in the modal as a new effect, immediately **after** the existing effect that clears GST values when the block is hidden. Search anchor to place it after:

```js
// Clear GST values when block hidden (V2 §10.12)
useEffect(() => {
  if (!gstBlockVisible) {
    if (firmName) setFirmName('');
    if (firmGst) setFirmGst('');
    if (errors.firmGst) setErrors((e) => ({ ...e, firmGst: undefined }));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [gstBlockVisible]);
```

Immediately below that block, add:

```jsx
  // M-02 — Clear field-level errors as soon as the operator fixes the field.
  // Single-effect implementation avoids refactoring every onChange handler.
  useEffect(() => {
    setErrors((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      const drop = (k) => {
        if (next[k] !== undefined) { delete next[k]; changed = true; }
      };

      if (name.trim()) drop('name');
      if (phone && isValidPhoneNumber(phone)) drop('phone');
      if (!email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) drop('email');
      if (roomPrice !== '' && Number(roomPrice) >= 0) drop('roomPrice');
      if (orderAmount !== '' && Number(orderAmount) >= 0) drop('orderAmount');

      const adv = Number(advancePayment) || 0;
      const ord = Number(orderAmount) || 0;
      if (adv >= 0 && (advancePayment === '' || adv <= ord)) drop('advance');

      if (frontImage) drop('front');
      if (firmName.trim()) drop('firmName');
      if (firmGst.trim() && GSTIN_REGEX.test(firmGst.trim())) drop('firmGst');
      if (checkinDate >= yesterdayStr()) drop('checkin');
      if (checkoutDate >= checkinDate) drop('checkout');

      childNames.forEach((c, i) => {
        const t = (c || '').trim();
        if (t && !t.includes(',')) drop(`child${i}`);
      });
      extraAdults.forEach((r, i) => {
        if (r.name && r.name.trim()) drop(`adult${i}_name`);
        if (r.frontImage) drop(`adult${i}_front`);
      });

      return changed ? next : prev;
    });
  }, [name, phone, email, roomPrice, orderAmount, advancePayment,
      frontImage, firmName, firmGst, checkinDate, checkoutDate,
      childNames, extraAdults]);
```

### Why this is safe

- **No infinite render loop**: the effect returns `prev` (same object reference) when nothing changes, so React bails out of the state update. Only when at least one error entry is dropped does `setErrors` produce a new reference, triggering exactly one re-render. That re-render's effect call sees `Object.keys(prev).length === 0` or no further drops, and exits early.
- **No schema change**: the error keys (`name`, `phone`, `email`, `roomPrice`, `orderAmount`, `advance`, `front`, `firmName`, `firmGst`, `checkin`, `checkout`, `child{i}`, `adult{i}_name`, `adult{i}_front`) are exactly the keys already written by `validate()`. We only delete entries, never add new ones.
- **No behaviour regression on submit**: `validate()` still runs on submit and will re-stamp any errors for fields that regressed (e.g., operator empties a field after fixing it).
- **No logic duplication**: the validity checks mirror those in `validate()`. They must stay in sync. If a future requirement changes a validation rule, both places need updating — annotate with a comment.

**Dependencies used inside the effect** (all already imported/defined at the top of the file — no new imports needed):
- `isValidPhoneNumber` — already imported from `libphonenumber-js`
- `GSTIN_REGEX` — already defined as a top-level constant
- `yesterdayStr` — already defined as a top-level helper

---

## Implementation checklist (for the next agent)

1. ☐ `view_file` `/app/frontend/src/components/modals/RoomCheckInModal.jsx` once — confirm the exact surrounding context before editing (do not read twice).
2. ☐ Apply D-01 via `search_replace` (delete the `international` line).
3. ☐ Apply M-02 via `search_replace` — anchor on the final line of the GST-clearing effect (`}, [gstBlockVisible]);`) and append the new effect after it.
4. ☐ `mcp_lint_javascript` on `/app/frontend/src/components/modals/RoomCheckInModal.jsx` — must return clean.
5. ☐ No other file touched (verify with `git diff --stat HEAD`). Allowed diff: exactly one file, one line removed, ~35 lines added.
6. ☐ Hot-reload picks up the changes automatically. No `supervisorctl restart` needed (no `.env` or dependency change).
7. ☐ Run the two-minute verification (next section).

## Verification checklist

Use the existing test credentials (`/app/memory/test_credentials.md`) and the `mcp_screenshot_tool` with Playwright in one combined script. Steps:

1. **Login** as `owner@18march.com`.
2. **Click `[data-testid="group-toggle"]`** (needed to surface the `e3` available-room card).
3. **Click `[data-testid="table-card-6182"]`** → modal opens on `e3`.
4. **D-01 assertion:**
   - `page.locator('.PhoneInputInput').first.fill("9876543210")`
   - Read the value back: `await page.locator('.PhoneInputInput').first.input_value()` — **expect `+91 98765 43210`** (India), NOT `+98 76 5432 10`.
   - Read the flag image/country-code dropdown — expect `IN`, NOT `IR`.
5. **M-02 assertion:**
   - Click `[data-testid="checkin-submit-btn"]` with the form empty → errors stamp (observe red labels under Guest Name, Room Price, Order Amount).
   - Fill `[data-testid="checkin-name"]` with "QA Fix Test" → the "Required" label beneath Guest Name should disappear **without** pressing Submit again.
   - Fill `[data-testid="checkin-room-price"]` with `1500` → "Required" label beneath Room Price disappears.
   - Fill `[data-testid="checkin-amount"]` with `1500` → same.
6. **Regression check — full E2E submit still works** (proves payload is unchanged):
   - Fill valid phone (`9876543210` — should now stay IN), name, valid files (reuse the JPG from prior QA under `/tmp/qa_test_front.jpg`), room price, amount, advance.
   - Click submit → **expect HTTP 200** on `POST /api/v1/vendoremployee/pos/user-group-check-in` and modal auto-close.
   - The room `e3` should appear with the submitted guest on dashboard.

If all 3 assertions pass → fix is verified. If any fail → stop and report; do not iterate.

## Rollback

If anything goes wrong, a single `search_replace` in reverse (re-adding `international` and removing the new `useEffect`) restores the pre-fix behaviour. No other rollback step needed — no dependencies were added, no other files were touched.

## After the fix

- Update `/app/memory/PRD.md` — add a "2026-04-24 Post-QA Patch" section noting D-01 and M-02 fixed, with references to this handover.
- Call `finish` with a 3-line summary (files changed, what was fixed, verification result).

## Out of scope — do not touch

- `M-03` in the QA report — explicitly labelled "no action required"; ignore.
- Any Backend Clarifications (`BC-1` through `BC-7`) — those are for the backend team, not the frontend agent.
- `useBlocker` / React Router migration — documented deferred item in PRD, not in this fix brief.
- Pre-existing test failures (`updateOrderStatus` BUG-107, `StatusConfigPage` barrel) — out of Room Module scope, not in this fix brief.

---

**End of handover. Next agent: apply the two `search_replace` edits above, lint, verify via the 3-step Playwright script, done.**
