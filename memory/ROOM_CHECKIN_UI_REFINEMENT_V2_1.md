# Room Check-In Modal — UI Refinement Spec (V2.1)

**Purpose:** Hand-off document for the implementation agent to apply a small set of UX corrections to the existing Room Check-In modal. Scope is UI + label + layout + one payload-mapping clarification. **No API contract changes. No new dependencies.**

**Source of truth for this doc:** QA walkthrough screenshots dated 2026-04-24 + user feedback in chat.

**Primary file to edit:** `/app/frontend/src/components/modals/RoomCheckInModal.jsx`
**Related (read-only reference):** `/app/frontend/src/api/services/roomService.js` (payload builder)

---

## 0. Summary of changes

| # | Area | Change | Priority |
|---|------|--------|----------|
| 1 | Amount fields | Collapse `Room Price` + `Order Amount` into **one field labeled "Room Price"** that is mapped to the existing backend key `order_amount`. Drop the duplicate. Balance = Room Price − Advance. | P1 |
| 2 | Guest layout | Unify primary guest and additional adults into a **single "Guest Card" row template**. Name + ID docs always adjacent. | P1 |
| 3 | Section order | **Adults section first, Children section after.** (Currently reversed.) | P2 |
| 4 | Additional Adults helper text | Replace the multi-line paragraph with a short inline hint next to the "+ Add Adult" button. | P3 |
| 5 | Time chip on dates | Move the "16:57" time pill out of the date label row into a subtle "at 16:57 · Edit" link **beneath** the date field. | P3 |
| 6 | Balance display | Balance should live-update to `(Room Price − Advance)` the moment Room Price has a value, not wait for Advance input. | P2 |

---

## 1. Amount / payment fields — collapse to ONE source of truth

### 1.1 Current (wrong)
Modal shows TWO required currency fields:
- `Room Price` * → stored in local state `roomPrice`
- `Order Amount` * → stored in local state `orderAmount`
Plus `Advance`, `Balance` (auto = `orderAmount − advance`).

Validation error text references a **third** term, "booking amount", which operators cannot map to either on-screen label.

### 1.2 Correct behavior (per product)
- Backend **only consumes `order_amount`**. There is **no `room_price` key** in the payload.
- In UI, the label shown to the operator is **"Room Price"** (simpler, matches the domain).
- `Room Price` (UI) ⇨ `order_amount` (payload).
- "Booking Amount" and "Order Amount" are the **same concept** as Room Price — stop using those terms anywhere user-facing.

### 1.3 Implementation notes

**State**
- Remove `orderAmount` state variable entirely.
- Keep `roomPrice` state as the single source of truth.

**UI**
- Delete the second `<InputField label="Order Amount">` component (the one with `data-testid="checkin-amount"`).
- Keep the existing `<InputField label="Room Price">` with `data-testid="checkin-room-price"`.
- Balance computation changes to `Number(roomPrice || 0) − Number(advancePayment || 0)` (clamped to ≥ 0 display if already so today).

**Validation (`validate()`)**
- Drop `errors.orderAmount` check.
- Keep `errors.roomPrice = 'Required'` when empty / negative.
- Advance vs price check becomes: `if (adv > Number(roomPrice || 0)) next.advance = 'Advance cannot be greater than Room Price';`
- Error copy **must use the label the user sees ("Room Price")**. Do NOT use "Booking Amount" or "Order Amount" in any error string.

**Payload builder (`roomService.js`)**
- The field that today gets `orderAmount.toFixed(2)` must now receive `roomPrice.toFixed(2)` and continue to be sent under the existing key `order_amount`. Key name on the wire is **unchanged** — only the source field changes.
- If there is a separate `room_price` key being sent today, remove it (not used by backend).

**Testids to preserve / remove**
| testid | Action |
|---|---|
| `checkin-room-price` | **Keep** (this is the kept field) |
| `checkin-amount` | **Remove** (deleted field) |
| `checkin-advance`, `checkin-balance` | Keep, unchanged |

### 1.4 Acceptance criteria
- Modal renders only one currency field above Advance/Balance, labeled "Room Price".
- Typing `8000` in Room Price → Balance instantly shows `₹8000.00` (assuming Advance = 0).
- Typing Advance = `500` → Balance shows `₹7500.00`.
- Typing Advance = `9000` (> Room Price) → inline error "Advance cannot be greater than Room Price".
- Submitting the form → network request still contains `order_amount=8000.00` (multipart form). No `room_price` key in the body.
- Backend response continues to be HTTP 200 with the success envelope (`{"message":"Group check-in completed successfully"}`).

---

## 2. Unified Guest Card layout

### 2.1 Current (wrong)
- Primary guest: Name/Phone/Email in Col 1, ID Type/ID Front/ID Back in Col 2 (separated horizontally).
- Additional Adults (#2, #3, …): a bottom section using a single-row grid `[Badge | Name | ID Type | Front | Back | Remove]`.
- Result: two different layouts for the same entity, causing eye zig-zag between columns for primary and a different row-scan for additional adults.

### 2.2 Target layout (single template for every adult)

```
┌─ GUEST #1 (Primary) ─────────────────────────────────────────────┐
│ Name *        Phone *          Email                             │
│ [ …        ]  [ +91 ……      ]  [ … ]                             │
│                                                                  │
│ ID Type       ID Front *       ID Back                           │
│ [ Aadhaar ▾]  [📎 Choose …]    [📎 Choose …]                     │
└──────────────────────────────────────────────────────────────────┘

┌─ GUEST #2 (Additional Adult)                              [ × ] ┐
│ Name *        ID Type          ID Front *      ID Back           │
│ [ … ]         [ Aadhaar ▾]     [📎 Choose …]   [📎 Choose …]     │
└──────────────────────────────────────────────────────────────────┘

[ + Add Adult ]   (disabled at cap, tooltip "Maximum N adults")
```

### 2.3 Implementation notes
- Keep the outer 3-column modal grid **only for the right-rail "Booking & Payment"** section (Booking Type, Booking For, Dates, Nights, Room Price, Advance, Balance, Special Request, GST block). All guest-related content moves to a single left block that spans the remaining width.
- Extract the adult-card JSX into one render helper that takes `{ index, isPrimary, row }`. Use it for both `#1` and `#2..N` so the template is literally the same component.
- For `isPrimary`: render Phone + Email fields in the top row (required Phone, optional Email). For non-primary: omit Phone/Email, keep Name + ID section only (as today, but styled identically to primary).
- Remove the "Verification" column label; it becomes part of the Guest Card itself.
- Preserve all existing `data-testid` values:
  - Primary: `checkin-name`, `checkin-phone`, `checkin-email`, `checkin-id-type`, `checkin-front-image`, `checkin-back-image`.
  - Additional adult #i (0-indexed extra): `checkin-adult-${i+2}-name`, `checkin-adult-${i+2}-id-type`, `checkin-adult-${i+2}-front`, `checkin-adult-${i+2}-back`, `checkin-remove-adult-${i+2}`.
- Do NOT change how `extraAdults[]` state is shaped. Layout-only refactor.

### 2.4 Acceptance criteria
- Modal shows Guest #1 and any Additional Adults in **visually identical card rows**, stacked vertically.
- Each card has Name on the left and ID docs on the right within the **same card** — no cross-column scanning.
- All original testids still resolve the same elements.
- No behavioral regression: dynamic add/remove, max-adult cap, image compression, validation all unchanged.

---

## 3. Section order: Adults → Children

### 3.1 Current (wrong)
Children appears above the "Additional Adults" section in the guest area.

### 3.2 Target
Render order inside the guest panel:
1. Guest Card #1 (primary)
2. Guest Cards #2..N (additional adults)
3. `+ Add Adult` button
4. Children chip row (names only)
5. `+ Add Child` button

### 3.3 Acceptance criteria
- Visually, Adult rows sit above Children rows.
- Existing guest counts (`totalAdult`, `totalChildren`) and caps remain unchanged.

---

## 4. "Additional Adults" helper text → inline hint

### 4.1 Current
Long helper paragraph under the section heading:
> "Primary guest counts as Adult #1. Add rows for additional adults staying in the room(s)."

### 4.2 Target
Remove the separate helper block. Place a one-line muted hint **next to or just below** the `+ Add Adult` button:
> *Primary guest is Adult #1. Add rows for additional adults.*

Style: 11 px, `COLORS.grayText`, no icon.

---

## 5. Time chip under date fields

### 5.1 Current
Next to the `Check-in Date *` label, a small orange pill shows `🕐 16:57`. Same for Check-out. The pill opens a time popover. The placement crowds the label row.

### 5.2 Target
- In the label row, show only the field name + required asterisk.
- Below the date input, show a subtle affordance: `at 16:57 · Edit` (12 px, grayText for "at", primaryOrange underlined for "Edit"). Clicking "Edit" opens the same existing popover.

### 5.3 Implementation notes
- Keep the existing `EditTimePopover` component; only move its trigger.
- Preserve `data-testid="checkin-edit-time-btn"` and `data-testid="checkout-edit-time-btn"` on the trigger.

---

## 6. Balance live-update

### 6.1 Current
`Balance` appears to render `0.00` until Advance is typed (visual lag for the operator).

### 6.2 Target
Whenever `roomPrice` has any non-empty numeric value, Balance renders `(roomPrice − advancePayment).toFixed(2)` immediately. With Advance empty, Balance = Room Price.

### 6.3 Acceptance criteria
- Type `8000` in Room Price → Balance shows `8000.00` without any other input.
- Type Advance `500` → Balance shows `7500.00`.
- Clear Room Price → Balance shows `0.00`.

---

## 7. Out of scope (explicitly not changing)

- Backend payload key names (`order_amount`, `room_id[0]`, bracket-indexed adult slots, `booking_details`, `firm_name`, `firm_gst`, etc.) remain **exactly** as documented in V2 §8.
- Date format on the wire stays `YYYY-MM-DD HH:mm:ss`.
- GST gating rules (Booking For = Corporate + `show_user_gst=Yes`) remain unchanged.
- 4-adult cap per room, 2-child cap per room unchanged.
- File compression + JPG/PNG/WEBP/PDF rules unchanged.
- Previously shipped fixes remain in place:
  - **D-01** — `<PhoneInput>` no longer uses the `international` prop (Indian mobile numbers starting with `9` stay on IN flag).
  - **M-02** — `clearErr(key)` wired into every field's `onChange` so inline "Required" errors clear as soon as the user types a valid value.

---

## 8. Test plan (manual, for the implementation agent)

Run against preprod tenant `478 "18march"`, account `owner@18march.com`, room `e3`.

1. **Single-amount field**
   - Open modal → only "Room Price" visible (no "Order Amount").
   - Leave empty, submit → inline "Required" under Room Price only (no second Required).
   - Enter 8000 → Balance = 8000.00.
   - Enter Advance 9000 → error "Advance cannot be greater than Room Price".
   - Correct Advance to 500 → error clears (M-02 still works), Balance = 7500.00.
   - Fill remaining required fields and submit → network request body contains `order_amount=8000.00` and **no** `room_price` key. Response 200.

2. **Unified Guest Card**
   - Primary guest's ID Type / Front / Back visually sit **inside the same card** as their Name/Phone/Email.
   - Click "+ Add Adult" → new card #2 matches the primary card's visual style.
   - Remove adult #2 → card disappears.
   - Cap still enforced at `maxAdults`.

3. **Section order**
   - Adult cards appear above the Children chip row. "+ Add Adult" sits between adults and children.

4. **Inline helper + time chip + balance**
   - "+ Add Adult" button has a one-line hint beside it, no paragraph above.
   - Under each date field, "at HH:mm · Edit" opens the time popover.
   - Balance responds to Room Price input immediately.

5. **Regressions to check**
   - Phone: typing `9876543210` keeps India flag (D-01 still green).
   - Dirty-form prompt on Cancel when any field edited.
   - GST block still gates on Corporate + `show_user_gst=Yes`, values cleared when hidden (V2 §10.12).
   - Existing testids from QA automation still resolve (see §2.3 list).

---

## 9. Files expected to change

1. `/app/frontend/src/components/modals/RoomCheckInModal.jsx` — all 6 changes above.
2. `/app/frontend/src/api/services/roomService.js` — only if it currently sends a separate `room_price` key or sources `order_amount` from the removed `orderAmount` state; update to read from `roomPrice` instead. Do not touch any other keys.

No changes expected to:
- `package.json` / dependencies
- Any backend file
- Any route / supervisor / .env

---

## 10. Rollout

- Branch from current `roomv1-` head.
- Implement all 6 items in a single small commit.
- Lint: `mcp_lint_javascript` on the modal file must pass clean.
- Manual verification per §8. No new automated tests required.
- Update `/app/memory/PRD.md` after merge with a one-liner: "Room Check-In modal V2.1 UX pass: single Room Price field, unified Guest Cards, section reorder, inline helpers, live Balance."

---

*End of spec.*
