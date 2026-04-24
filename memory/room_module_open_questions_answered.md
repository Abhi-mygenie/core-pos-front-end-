# Room Module — Open Questions: FINAL (Session 2 close)

> Source: `/app/memory/room_module_open_questions.md`
> Session 1: 40 original questions answered.
> Session 2: revised cURL resolved 4 parked items + raised 8 new open items; PO resolved 12 of those 16 open items in this pass.

---

## Reference cURL (from PO — session 2)

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
`configuration` is not used — not in payload, not in layout logic. Layout is driven by **2 Profile flags only**: `guest_details` and `booking_details`.

### Q2: Configuration 3 details?
N/A — see Q1.

### Q3: Layout driver?
100% Profile flags. `room_price` flag is **not used**. Only `guest_details` and `booking_details` matter.
- Baseline: minimum fields (Name, Phone, etc.).
- `booking_details: "Yes"` → adds Booking Type, Check-in/Check-out dates, Room Price, GST fields (when Corporate).
- `guest_details: "Yes"` → adds No. of guests, No. of children, dynamic document upload per guest.

---

## B. Adults / Children dynamic block

### Q4: Max adult slots?
Cap = 4 × rooms selected for adults AND 4 × rooms selected for children (independent). Dynamic add-row.

### Q5: Form-field keys for additional adults' documents?
Indexed-suffix (primary unsuffixed): `name`/`id_type`/`front_image_file`/`back_image_file`, then `name2`/`id_type2`/`front_image_file2`/`back_image_file2`, … up to 4.

### Q6: ID image requirements?
Front = mandatory for all adults; Back = optional.

### Q7: Children capture?
**UI:** one row per child, Name mandatory, no DOB, no docs.
**Payload (from cURL):** UI joins all names into single comma-separated string `children_name="a,b,c"`.

### Q8: When `total_children > 0`, `children_name` required?
Yes — submit blocked until all name rows filled.

---

## C. Enum values

### Q9: `booking_type` values?
**Final (source = cURL):** UI "Walk-in" → `WalkIn`; UI "Online" → `Online`. (Supersedes earlier "PreBooked" — cURL is source of truth.)

### Q10: `booking_for` values?
UI "Personal" → `Individual`; UI "Corporate" → `Corporate`.

### Q11: `id_type` values?
`Aadhar card`, `Passport`, `PAN card`, `License`, **Voter ID** (confirmed). Exact `Voter ID` backend string to be taken from cURL/runtime.

### Q12: Payment Mode?
**Deferred to Phase 2.** Not in v1 payload.

---

## D. Pricing / calculation

### Q13: `order_amount`?
Operator-entered manually.

### Q14: Multi-room `room_price`?
Single combined total; backend splits per-room.

### Q15: Same-day night count?
Minimum 1 night; check-in defaults today, operator enters nights, check-out auto-calculated.

### Q16: `advance_payment > order_amount`?
Not allowed — inline error + submit disabled.

### Q17: Amount format (`food_price_with_paisa`)?
Flag **not used**. Follow cURL formats as-is (no transformation).

---

## E. Dates & time

### Q18: Date-only or date+time picker?
Date-only picker (check-in time not captured in UI but sent in payload — see Q20 + O6).

### Q19: Back-dating?
Allowed up to 24 hours in the past; default = today.

### Q20: Default times?
- Check-in: date only (time in payload = current time at submission; user can override via Edit-time link — see O6).
- Check-out date: auto-calc from nights; manually editable.
- Check-out time: payload sends **current time at submission**; UI default display = 12:00 noon but operator can manually edit.

---

## F. GST / Firm block

### Q21: Gating?
`show_user_gst="Yes"` **AND** `booking_for=Corporate` (both required).

### Q22: GSTIN regex?
`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`

### Q23: `gst_tax`?
Not used — UI never sends it.

---

## G. OTP flow

### Q24, Q25, Q26
Not used for room check-in.

---

## H. Backend contract & response

### Q27: Success response?
Minimal — `{"message": "Group check-in completed successfully"}`. UI shows as success toast.

### Q28: Auto KOT/bill print?
Not used for rooms.

### Q29: Error envelope?
**To observe at runtime** — no sample provided.

---

## I. Validation

### Q30: Phone rule?
International with country-code selector; default India (+91).

### Q31: Email?
Always optional.

### Q32: File upload?
Max 5 MB per file; MIME `jpg, jpeg, png, webp, pdf`; client-side compression via small JS library (e.g., `browser-image-compression`) — no external API.

---

## J. Platform integration

### Q33: Role token?
**No role gating** — available to all authenticated users.

### Q34: Dashboard refresh?
**No change from current behaviour** — maintain existing refresh pattern.

### Q35: Dirty-form Cancel/Close?
Show confirmation prompt.

### Q36: `X-localization`?
Never send; parked for future multi-language revisit.

---

## K. Edge cases

### Q37: Two-operator race?
Backend guards (409). No frontend locking.

### Q38: 409 UX?
Toast + auto-close form.

### Q39: Draft on browser navigation?
Prompt before navigation.

### Q40: Reopen/edit after submit?
Read-only in v1. **Edit flow deferred to v2.**

---

## Resolved from Session 2 Open Items

| Ref | Item | Resolution |
|-----|------|------------|
| O1 | `booking_type` mismatch | cURL is source → `Online` (not `PreBooked`) |
| O2 | Children payload shape | UI per-row → joined comma-separated string for payload |
| O3 | Voter ID in `id_type` | Included |
| O4 | Payment Mode | Deferred to Phase 2 |
| O5 | Amount format | `food_price_with_paisa` flag not used; follow cURL |
| O6 | Check-in time payload | Send current time; user can override |
| O8 | `booking_details=""` field purpose | Check at runtime |
| O9 | `order_note` field | UI field = "Special Request" |
| O10 | `balance_payment` | Auto-calculated (`order − advance`) |
| O11 | `room_id[]` array | Bracket notation used when more than one room selected |
| O12 | Error envelope | Observe at runtime |
| O13 | Role token | No gating — available to all authenticated users |
| O14 | Dashboard refresh | No change from current behaviour |
| O15 | `X-localization` | Do not send; revisit when multi-language is enabled |
| O16 | Post-submit Edit flow | Deferred to v2 |

---

## ✅ All Open Items Resolved

| Ref | Resolution |
|-----|-----------|
| O7 | Check-out time in payload = **current time at submission**. UI still displays 12:00 noon as default but payload carries current timestamp; user can override via time edit. |

---

## Session Summary

- **40/40** original questions finalised.
- **16/16** Session-2 open items resolved.
- **0** remaining open items.
- **Clarification session closed.** Document ready for the Implementation Agent.
