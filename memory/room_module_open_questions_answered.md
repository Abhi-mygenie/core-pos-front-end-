# Room Module — Open Questions: Answered

> Source: `/app/memory/room_module_open_questions.md`
> Captured via clarification session with Product Owner.
> Questions marked **Parked** require follow-up before implementation of the related sub-section.

---

## A. Configuration-level

### Q1: What are the other two values of `restaurants[].configuration`?
**Answer:** `restaurants[].configuration` only ever has the value `"Simple"`. There are no 2nd or 3rd enum values. All layout and field variations are driven by the Profile flags (`guest_details`, `booking_details`, `room_price`) — not by `configuration`.

### Q2: What is the name and full field list for Configuration 3?
**Answer:** Not applicable. Per Q1, `configuration` only ever has the value `"Simple"` — there is no Configuration 2 or 3.

### Q3: Does `configuration` alone drive layout, or combine with Profile booleans?
**Answer:** Layout is driven **100% by the Profile flags**. `configuration` has no role in layout.

Flag-to-field mapping:
- **`booking_details: "Yes"`** → shows Booking Type (Online / Walk-In), Check-in & Check-out datetime, GST fields (when Individual/Corporate selected).
- **`guest_details: "Yes"`** → shows No. of guests, No. of children, dynamic document upload fields (Aadhaar, PAN, etc.) per guest.
- **`room_price: "Yes"`** → Room Price field shown **only when both `booking_details: "Yes"` AND `room_price: "Yes"`**.

---

## B. Adults / Children dynamic block

### Q4: Maximum number of adult slots?
**Answer:** Cap scales linearly with rooms selected:
- **Adults cap = 4 × number of rooms selected**
- **Children cap = 4 × number of rooms selected** (independent)
- UI must allow dynamic add-row up to the cap.
- Example: 3 rooms → max 12 adults, 12 children.

### Q5: Exact form-field keys for document images of additional adults (#2, #3, #4)?
**Answer: PARKED — pending backend alignment.**
Guiding principle: each adult/guest row carries **three fields** — `document_type`, `front_image`, `back_image` (document type is not in the current cURL and must be added). Exact key naming (indexed suffix vs. array vs. nested JSON) to be finalised with backend.

### Q6: Are ID images mandatory or optional for adults #2, #3, #4?
**Answer:** ID document required for **all adults** (primary + #2, #3, #4):
- **Front image:** Mandatory for every adult.
- **Back image:** Optional for every adult.

### Q7: For children — single free-text or one row per child?
**Answer:** One row per child (dynamic add-row, same as adults). Each child row has:
- **Name** — mandatory
- No DOB / age field
- No document upload (documents not mandatory for children, not captured)

### Q8: When `total_children > 0`, is `children_name` required?
**Answer:** Yes. If `total_children > 0`, that many child-name rows must be filled. Submit blocked otherwise.

---

## C. Enum values

### Q9: Final list of allowed `booking_type` values?
**Answer:**
| UI Label | Backend Value |
|----------|---------------|
| Walk-in  | `WalkIn`      |
| Online   | `PreBooked`   |

### Q10: Final list of allowed `booking_for` values?
**Answer: PARKED — pending backend confirmation.**
- **UI labels:** "Personal" and "Corporate"
- **Backend values:** `Individual` is confirmed for "Personal" (from cURL). Backend string for "Corporate" is TBD.

### Q11: Final list of allowed `id_type` values?
**Answer: PARKED — pending backend confirmation.** Whether `License` replaces `DrivingLicense` and the final canonical list will be aligned with backend.

### Q12: Payment Mode — all `prepaid=1` payment types, or subset?
**Answer:** Subset. Payment Mode dropdown (used for the **Advance Payment** field) is populated dynamically from `payment_types[]`, filtered to only **Cash, Card, and UPI**. Other types (TAB, ROOM, Pay Later, etc.) are excluded.

---

## D. Pricing / calculation logic

### Q13: Is `order_amount` auto-calculated or operator-entered?
**Answer:** Operator-entered manually. No auto-calculation from `room_price × nights`.

### Q14: When multiple rooms are selected, is `room_price` per-room or total?
**Answer:** Single total for all selected rooms. Operator enters one combined price (e.g., 3 rooms for ₹6000 total). Backend handles per-room splitting (e.g., ₹2000 per room).

### Q15: Night-count rule on same-day check-in + check-out?
**Answer:** Minimum 1 night. Same-day check-in/out allowed (counts as 1 night).
**UX detail:** Check-in date defaults to today. Operator enters **number of nights**; check-out date auto-calculated from check-in + nights.

### Q16: Is `advance_payment > order_amount` allowed?
**Answer:** Not allowed. Show an **inline error** under the advance payment field; keep submit button disabled until corrected.

### Q17: When `food_price_with_paisa === "No"`, payload format for amounts?
**Answer: PARKED — pending backend confirmation.** Whether to send `"50000.00"` (2 decimals) or `"50000"` (integer) when the flag is `"No"` is TBD.

---

## E. Dates & time

### Q18: Date-only vs. date+time picker?
**Answer:** Date-only picker with overridable time.
- Operator picks a date; time auto-fills with current time at selection; operator can override via an "Edit time" link/button.
- Applies to **check-in only**.
- Check-out time is governed by Q20.

### Q19: Is back-dating check-in allowed?
**Answer:** Allowed with a limit — **up to 24 hours in the past**. Date picker defaults to today.

### Q20: Default check-in and check-out times?
**Answer (final, supersedes part of Q18):**
- **Check-in:** Date only (defaults to today; back-date up to 24h per Q19). **Check-in time is not captured / not used.**
- **Check-out date:** Auto-calculated from nights (per Q15) as default, but **operator can manually edit**.
- **Check-out time:** Defaults to **12:00 noon**, but operator can manually edit.

---

## F. GST / Firm block

### Q21: Gating of GST / Firm block?
**Answer:** Show GST/Firm block **only when both**: `show_user_gst = "Yes"` **AND** `booking_for = Corporate` (Business). No additional flag.

### Q22: GSTIN validation regex for `firm_gst`?
**Answer:** Standard Indian GSTIN format (15 chars):
```
^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$
```

### Q23: When `room_gst_applicable = "No"`, send `gst_tax="0.00"` or omit?
**Answer:** The `gst_tax` field is **not used at all** by this product. UI should never send `gst_tax` in the payload, regardless of `room_gst_applicable` value.

---

## G. OTP flow

### Q24: OTP request and verify endpoints?
**Answer:** Not used. OTP is not applicable to room check-in.

### Q25: OTP channel?
**Answer:** Not used for room check-in.

### Q26: OTP UX placement?
**Answer:** Not used in room check-in.

---

## H. Backend contract & response

### Q27: Success response body schema?
**Answer: PARKED — will share later.** Schema (whether it returns `order_id`, `booking_id`, `group_id`, etc.) will be provided after backend alignment.

### Q28: Auto-trigger KOT / bill print on successful check-in?
**Answer:** Not used for rooms. Auto-print is not applicable.

### Q29: Error envelope shape?
**Answer: PARKED — will check at runtime.** Exact shape (`{errors:[{message}]}`, `{message}`, `{error}`, or mix) determined from actual backend responses during implementation.

---

## I. Validation

### Q30: Phone number rule?
**Answer:** International support. Separate **country-code selector** alongside the phone input. **Default: India (+91).** Number validated per chosen country (libphonenumber-style).

### Q31: Is email required?
**Answer:** Always optional in every configuration.

### Q32: File upload limits?
**Answer:**
- **Max stored size:** 5 MB per file.
- **Allowed MIME types:** `jpg, jpeg, png, webp, pdf`.
- **Compression:** Client-side only, via a **small JS library** (e.g., `browser-image-compression`) — **no external API**.
- **Images:** Compressed in-browser before upload to stay within 5 MB cap.
- **PDFs:** Accepted up to 5 MB as-is; rejected inline if larger.

---

## J. Platform integration

### Q33: Role token gating Room Check-In?
**Answer: PARKED — pending backend confirmation.**

### Q34: Dashboard auto-refresh vs. socket push?
**Answer: PARKED — pending decision.**

### Q35: On Cancel/Close with dirty form, prompt or close silently?
**Answer:** Show a confirmation prompt ("You have unsaved changes. Discard?") whenever the form is dirty.

### Q36: `X-localization` header — always or only when multi-language enabled?
**Answer:** Never send (maintain current behaviour). **Also parked** for later clarification if multi-language support becomes a requirement.

---

## K. Edge cases

### Q37: Two operators clicking the same available room — backend guard or frontend lock?
**Answer:** Backend guards. Backend rejects the second submit (e.g., 409 Conflict). Frontend does not lock/disable room cards during submit.

### Q38: If backend returns 409 (room taken), what UX?
**Answer:** Show a toast — *"This room was just taken by another operator. Please pick another room."* — and auto-close the check-in form.

### Q39: Draft check-in on navigation away?
**Answer:** Prompt before navigation (e.g., "You have unsaved changes. Leave without saving?"). Covers back button, tab close, route switch, accidental reload.

### Q40: Reopen / edit check-in after submit?
**Answer:** Read-only after submit for v1. No edit flow currently. Corrections require cancellation + new check-in.
> **Note:** Edit flow will be needed in a future iteration; to be discussed with the next agent. Out of scope for initial implementation.

---

## Summary of Parked Items (require follow-up before related sub-section is built)

| # | Question | Section | Priority |
|---|----------|---------|----------|
| Q5 | Form-field keys for additional adults' documents | B | Blocker |
| Q10 | Backend value mapping for "Corporate" in `booking_for` | C | High |
| Q11 | Final `id_type` enum values | C | High |
| Q17 | Payload format for amounts when `food_price_with_paisa="No"` | D | Medium |
| Q27 | Success response body schema | H | Blocker |
| Q29 | Error envelope shape | H | Medium |
| Q33 | Role token gating Room Check-In | J | High |
| Q34 | Dashboard refresh strategy (API vs. socket) | J | High |
| Q36 | `X-localization` header | J | Medium |
| Q40 | Post-submit edit flow | K | High (deferred to v2) |

**Total parked:** 10 of 40.
