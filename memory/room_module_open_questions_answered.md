# Room Module — Open Questions: Answered & Updated

> Source: `/app/memory/room_module_open_questions.md`
> Captured via clarification session with Product Owner.
> Updated with revised cURL + PO notes (session 2).

---

## Reference cURL (revised — session 2)

```
POST https://preprod.mygenie.online/api/v1/vendoremployee/pos/user-group-check-in
Authorization: Bearer ...

Form fields:
  name=harsh
  phone=9714176033
  email=ab@gmail.com
  advance_payment=500
  balance_payment=1500.0
  checkin_date=2026-04-24 09:32:00
  checkout_date=2026-04-27 09:32:00
  booking_details=
  booking_type=Online
  room_price=2000
  order_amount=2000
  order_note=provide extra bed sheet
  id_type=Aadhar card
  total_adult=4
  total_children=2
  name2=gyan          id_type2=Passport
  name3=test e        id_type3=PAN card
  name4=abhi          id_type4=License
  children_name=piyush,parth
  gst_tax=0.00
  firm_name=mygenie
  firm_gst=GST123456
  booking_for=Corporate
  room_id[0]=3245
  room_id[1]=3244
  front_image_file=@file
  back_image_file=@file
  front_image_file2=@file  back_image_file2=@file
  front_image_file3=@file  back_image_file3=@file
  front_image_file4=@file  back_image_file4=@file

Response:
  { "message": "Group check-in completed successfully" }
```

---

## A. Configuration-level

### Q1: Values of `restaurants[].configuration`?
**Answer (final):** `restaurants[].configuration` is **not used at all** — neither for layout nor in the payload. Layout is driven by only 2 Profile flags: `guest_details` and `booking_details`.

### Q2: Configuration 3 details?
**Answer:** N/A — see Q1.

### Q3: Does `configuration` alone drive layout?
**Answer (final, supersedes earlier):** Layout is driven by only **2 Profile flags**: `guest_details` and `booking_details`. The `room_price` Profile flag is **not used**.
- Baseline (both flags = "No"): UI shows minimum fields only — Name, Phone, etc.
- `booking_details: "Yes"` → adds Booking Type, Check-in/Check-out dates, Room Price, GST fields (when Corporate).
- `guest_details: "Yes"` → adds No. of guests, No. of children, dynamic document upload per guest.
- `configuration` not passed in payload.

---

## B. Adults / Children dynamic block

### Q4: Max adult slots?
**Answer:** Cap = **4 × rooms selected** for adults AND **4 × rooms selected** for children (independent caps). Dynamic add-row.

### Q5: Form-field keys for additional adults' documents? (UNPARKED)
**Answer (from cURL):** Indexed-suffix pattern (primary unsuffixed):
- Primary: `name`, `id_type`, `front_image_file`, `back_image_file`
- Adult #2: `name2`, `id_type2`, `front_image_file2`, `back_image_file2`
- Adult #3: `name3`, `id_type3`, `front_image_file3`, `back_image_file3`
- Adult #4: `name4`, `id_type4`, `front_image_file4`, `back_image_file4`

### Q6: ID images mandatory/optional for adults #2–#4?
**Answer:** Front = mandatory for all adults; Back = optional for all adults.

### Q7: Children — single free-text or one row per child? ⚠ OPEN
**Answer:** UI captures one row per child with mandatory Name. But cURL payload sends `children_name="piyush,parth"` (comma-separated). **See open item O2** — confirm UI→payload transformation.

### Q8: When `total_children > 0`, is `children_name` required?
**Answer:** Yes. All child-name rows must be filled; submit blocked otherwise.

---

## C. Enum values

### Q9: `booking_type` values? ⚠ OPEN
**Earlier answer:** UI "Walk-in" → `WalkIn`; UI "Online" → `PreBooked`.
**New cURL contradicts:** `booking_type="Online"` (not `PreBooked`).
**See open item O1.**

### Q10: `booking_for` values? (UNPARKED)
**Answer (from cURL):** UI "Personal" → `Individual`; UI "Corporate" → `Corporate`.

### Q11: `id_type` values? (PARTIALLY UNPARKED)
**Answer (from cURL):** `Aadhar card`, `Passport`, `PAN card`, `License`. (Note: with spaces where shown.)
**See open item O3** — confirm whether Voter ID remains in the set.

### Q12: Payment Mode values? (STILL PARKED)
Currently not in payload. Revised payload with payment-mode field to be shared.

---

## D. Pricing / calculation

### Q13: `order_amount` auto or manual?
**Answer:** Operator-entered manually.

### Q14: Multi-room `room_price`?
**Answer:** Single total for all rooms (backend splits per-room).

### Q15: Same-day check-in/out night count?
**Answer:** Minimum 1 night. UX: check-in defaults to today; operator enters nights; check-out auto-calculated.

### Q16: `advance_payment > order_amount` allowed?
**Answer:** Not allowed. Inline error + submit disabled.

### Q17: Amount payload format when `food_price_with_paisa="No"`? ⚠ OPEN
**See open item O5** — cURL shows mixed formats.

---

## E. Dates & time

### Q18: Date-only vs. date+time picker?
**Answer:** Date-only picker (check-in time not captured per Q20).

### Q19: Back-dating allowed?
**Answer:** Up to 24 hours in the past; default = today.

### Q20: Default times?
**Answer (final):**
- Check-in: date only; **time not captured**.
- Check-out date: auto-calc from nights, manually editable.
- Check-out time: defaults 12:00 noon, manually editable.
**See open items O6 and O7** — payload time-value rules.

---

## F. GST / Firm block

### Q21: GST/Firm block gating?
**Answer:** Only when **`show_user_gst="Yes"` AND `booking_for=Corporate`**. No additional flag.

### Q22: GSTIN regex?
**Answer:** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` (standard Indian 15-char GSTIN).

### Q23: `gst_tax` when `room_gst_applicable="No"`?
**Answer:** `gst_tax` is not used by this product. UI should never send it.

---

## G. OTP flow

### Q24, Q25, Q26
**Answer:** Not used for room check-in. OTP feature out of scope.

---

## H. Backend contract & response

### Q27: Success response schema? (UNPARKED)
**Answer (from cURL):** Minimal response — `{"message": "Group check-in completed successfully"}`. No IDs returned. UI only needs the success message for toast/confirmation.

### Q28: Auto-trigger KOT / bill print?
**Answer:** Not used for rooms.

### Q29: Error envelope shape? (STILL PARKED)
To be observed at runtime — no error sample yet.

---

## I. Validation

### Q30: Phone rule?
**Answer:** International with country-code selector; default India (+91).

### Q31: Email required?
**Answer:** Always optional.

### Q32: File upload limits?
**Answer:** Max 5 MB per file; allowed `jpg, jpeg, png, webp, pdf`; client-side compression via a small JS library (e.g., `browser-image-compression`) — no external API.

---

## J. Platform integration

### Q33: Role token? (STILL PARKED)

### Q34: Dashboard refresh strategy? (STILL PARKED)

### Q35: Dirty-form Cancel/Close?
**Answer:** Show confirmation prompt.

### Q36: `X-localization` header?
**Answer:** Never send (current behaviour); parked for later revisit.

---

## K. Edge cases

### Q37: Two-operator race?
**Answer:** Backend guards (returns 409). No frontend locking.

### Q38: 409 UX?
**Answer:** Toast — *"This room was just taken by another operator. Please pick another room."* — and auto-close form.

### Q39: Draft on browser navigation?
**Answer:** Prompt before navigation.

### Q40: Reopen/edit after submit?
**Answer:** Read-only in v1. Edit flow deferred to future iteration.

---

# Open Items — to be resolved before/during implementation

| # | Item | Priority | Why open |
|---|------|----------|----------|
| **O1** | `booking_type` value mismatch — cURL sends `Online`, earlier answer said `PreBooked`. Confirm final backend string for "Online booking". | **Blocker** | Dropdown backend mapping. |
| **O2** | Q7 — UI = per-child rows, payload = comma-joined single `children_name` string. Confirm transformation. | **Blocker** | Payload shape. |
| **O3** | Q11 — is `Voter ID` in the `id_type` enum, and exact string? | High | Dropdown options. |
| **O4** | Q12 — Payment Mode field name + values. Awaiting revised cURL. | High | Dropdown + payload. |
| **O5** | Q17 — amount format inconsistency in cURL (`"2000"` vs `"1500.0"` vs `"0.00"`). Canonical rule? | Medium | Payload format. |
| **O6** | When operator only picks date (check-in), what time should UI send in payload? Current time? `00:00:00`? | Medium | Payload value. |
| **O7** | Check-out time in payload — cURL shows `09:32:00`, but Q20 says default is 12:00 noon. Which is correct? | Medium | Payload value. |
| **O8** | `booking_details=""` payload form field — is it a free-text "booking notes" field, or just echoing the Profile flag? | Medium | Payload contract. |
| **O9** | `order_note` field — UI input? Mandatory? Max length? | Low | New field. |
| **O10** | `balance_payment` — auto-calculated (`order − advance`) or operator-entered? | Medium | Payload + UI logic. |
| **O11** | `room_id[0]`, `room_id[1]` — confirm bracket-indexed array notation is expected. | Low | Payload format. |
| **O12** | Q29 — error envelope shape. To observe at runtime. | Medium | Error handling. |
| **O13** | Q33 — role token gating Room Check-In. | High | Permission gate. |
| **O14** | Q34 — dashboard refresh strategy (API re-fetch vs. socket). | High | Post-submit UX. |
| **O15** | Q36 — `X-localization` header (parked; revisit when multi-language needed). | Medium | Request header. |
| **O16** | Q40 — post-submit Edit flow (deferred to v2). | High (v2) | Scope for future. |

**Total open items:** 16.

---

# Session Summary

- 30 of 40 original questions **finalised**.
- 4 unparked via session-2 cURL + updates: **Q5, Q10, Q11 (partial), Q27**.
- 8 new open items raised from cURL inspection: **O1, O2, O6, O7, O8, O9, O10, O11**.
- 8 previously-parked items still open: **O3 (was Q11 partial), O4 (Q12), O5 (Q17), O12 (Q29), O13 (Q33), O14 (Q34), O15 (Q36), O16 (Q40)**.
