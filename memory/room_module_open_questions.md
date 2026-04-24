# Room Module — Open Questions for Product Owner

> Consolidated list of all open items blocking the Implementation Agent.
> Source docs: `room_checkin_requirements.md` + `room_module_implementation_requirements.md`.
> Each question states **why it matters** so the answer can be given with context.
> Status column to be updated by PO: `Open` → `Answered` (include the answer inline).

---

## Legend
- **Blocker**: Implementation cannot start/progress without this.
- **High**: Implementation can start but this section will be parked.
- **Medium**: Affects UX polish / edge cases.
- **Low**: Nice to have; can ship with a reasonable default.

---

## A. Configuration-level

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q1 | What are the other two values of `restaurants[].configuration`? (Sample shows `"Simple"` — need the 2nd and 3rd enum values.) | **Blocker** | Drives which of Basic / Document / 3rd layout renders. | Open |
| Q2 | What is the name and full field list for Configuration 3 (the one you mentioned but did not describe)? | **Blocker** | Blocks layout + payload design for that mode. | Open |
| Q3 | Does `configuration` alone drive layout, or does it combine with the Profile booleans (`guest_details`, `booking_details`, `room_price`)? | **Blocker** | Needed to know whether flags override or are independent of `configuration`. | Open |

## B. Adults / Children dynamic block

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q4 | Maximum number of adult slots? cURL shows `name2/3/4` → hard cap of 4. Confirm or change. | **Blocker** | UI cannot render dynamic rows without a cap. | Open |
| Q5 | Exact form-field keys for document images of additional adults (#2, #3, #4)? cURL only shows `front_image_file`/`back_image_file` for primary guest. | **Blocker** | Without this, UI cannot upload adult #2+ documents. | Open |
| Q6 | Are ID images (front/back) mandatory or optional for adults #2, #3, #4 when Document config is active? | High | Drives validation + submit enable logic. | Open |
| Q7 | For children, capture as (a) single free-text `children_name` (as in cURL), OR (b) one row per child (Name + maybe DOB + ID)? | **Blocker** | Different UI and payload shapes. | Open |
| Q8 | When `total_children > 0`, is `children_name` required? | Medium | Validation rule. | Open |

## C. Enum values (replacing hard-coded options)

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q9 | Final list of allowed `booking_type` values. cURL uses `WalkIn`; current UI also has `PreBooked`. Is `PreBooked` still valid? | High | Dropdown options. | Open |
| Q10 | Final list of allowed `booking_for` values. cURL uses `Individual`; old UI uses `personal`/`business`. New canonical set? | High | Dropdown options + GST gating (Business). | Open |
| Q11 | Final list of allowed `id_type` values. cURL uses `License`; old UI uses `Aadhaar/Passport/DrivingLicense/VoterID/PAN`. Is `License` replacing `DrivingLicense`? | High | Dropdown options. | Open |
| Q12 | Should Payment Mode show all `payment_types[]` where `prepaid=1` (Cash, Card, UPI, TAB, ROOM, Pay Later), or a subset specific to room check-in? | High | Dropdown options. | Open |

## D. Pricing / calculation logic

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q13 | Is `order_amount` auto-calculated as `room_price × nights`, operator-entered, or auto-with-manual-override? | **Blocker** | Entire payment column logic depends on this. | Open |
| Q14 | When multiple rooms are selected, is `room_price` per-room or total for all rooms? How does the calculation scale? | **Blocker** | Multi-room pricing math. | Open |
| Q15 | Night-count rule on same-day check-in + check-out — minimum 1 night, or 0, or blocked? | High | Edge case for walk-ins. | Open |
| Q16 | Is `advance_payment > order_amount` allowed? If not, how should we surface it — inline error, toast, or block submit? | Medium | Validation UX. | Open |
| Q17 | When `food_price_with_paisa === "No"`, should payload carry 2 decimals (`"50000.00"`) or integers (`"50000"`)? | Medium | Payload format. | Open |

## E. Dates & time

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q18 | New cURL sends `YYYY-MM-DD HH:mm:ss`. Should UI pick date + time (datetime-local) or date only (server pads time)? | **Blocker** | Input component selection. | Open |
| Q19 | Is back-dating check-in allowed? (e.g., walk-in that started hours/days ago.) | High | Date validation. | Open |
| Q20 | Default check-in time and default check-out time — same-hour? Next-day 12:00? Policy? | Medium | Default values for pickers. | Open |

## F. GST / Firm block

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q21 | Is GST/Firm block gated purely by `show_user_gst=Yes` AND `booking_for=Business`, or is there another flag? | High | Section visibility. | Open |
| Q22 | GSTIN validation regex for `firm_gst`? | Medium | Field validation. | Open |
| Q23 | When `room_gst_applicable=No`, should `gst_tax` be sent as `"0.00"` (as cURL shows) or omitted entirely? | Medium | Payload shape. | Open |

## G. OTP flow (when `room_otp_require=Yes`)

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q24 | When OTP is required, what is the OTP request and verify endpoint? | High | Needed to implement OTP step. | Open |
| Q25 | Channel — SMS to guest phone, email, WhatsApp, other? | High | Copy + messaging. | Open |
| Q26 | Where does the OTP step sit in the UX — modal step before Submit, or drawer after Submit? | High | Flow design. | Open |

## H. Backend contract & response

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q27 | Success response body schema? Returns `order_id`, `booking_id`, `group_id`, or anything UI should capture (for print/receipt/deep-link)? | **Blocker** | Success path + post-actions. | Open |
| Q28 | Should UI auto-trigger KOT / bill print on successful check-in (especially when advance is paid)? | High | Post-submit side effect. | Open |
| Q29 | Confirm the exact error envelope — `{errors:[{message}]}`, `{message}`, `{error}`, or all three possible? | Medium | Error-toast extraction. | Open |

## I. Validation (phone, email, files)

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q30 | Phone number rule — India-only (exactly 10 digits, starts 6–9) or international (+country code)? | High | Field validation. | Open |
| Q31 | Should email be required in any configuration, or always optional? | Medium | Validation rule. | Open |
| Q32 | File upload limits — max MB per file, allowed MIME types (jpg/png/webp/pdf?), server-side compression? | High | Client-side guards. | Open |

## J. Platform integration

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q33 | Which role token from `role[]` gates access to the Room Check-In action? Sample has `room_report`, `table_management` — no explicit `room_checkin`. | High | Permission gate. | Open |
| Q34 | Should the dashboard auto-refresh (TABLES + RUNNING_ORDERS) on successful check-in, or is realtime push (socket) responsible for the state transition? | High | Post-submit refresh strategy. | Open |
| Q35 | On Cancel/Close with dirty form, should we prompt for confirmation ("You have unsaved changes…") or close silently? | Low | UX polish. | Open |
| Q36 | Does Room Check-In need to send `X-localization` header always, or only when multi-language is enabled? (Current app doesn't send it.) | Medium | Request header. | Open |

## K. Edge cases

| # | Question | Priority | Why it matters | Status / Answer |
|---|----------|----------|----------------|-----------------|
| Q37 | Two operators click the same available room simultaneously — does the backend guard against double check-in, or should the frontend lock/disable the room card during submit? | Medium | Race-condition handling. | Open |
| Q38 | If backend returns 409 (conflict — room taken between open and submit), what message/UX should we show? | Medium | Error UX. | Open |
| Q39 | What happens to a draft check-in if the user navigates away (intentional or accidental) — auto-save, discard, or prompt? | Low | UX policy. | Open |
| Q40 | Should we support reopening / editing a check-in after submit (e.g., correct phone or add an adult), or is it read-only once confirmed? | High | Determines whether an Edit flow is in scope. | Open |

---

## Summary counts

| Priority | Count |
|----------|-------|
| Blocker | 9  (Q1, Q2, Q3, Q4, Q5, Q7, Q13, Q14, Q18, Q27) |
| High | 16 |
| Medium | 11 |
| Low | 3 |
| **Total** | **40** |

> Note: Blocker count shown as 9 rounded (Q27 is also Blocker). Actual Blocker items: Q1, Q2, Q3, Q4, Q5, Q7, Q13, Q14, Q18, Q27 = **10**.

## Next steps
1. Product Owner fills in answers inline in the `Status / Answer` column (or replies in chat referencing the Q-number).
2. Once all **Blocker** items are answered, the Implementation Agent can start work on the Column 3 rework and config-type resolver (per §9.12 of `room_module_implementation_requirements.md`).
3. **High** items should be answered before the relevant sub-section's code is written.
4. **Medium / Low** items can be resolved during QA with default behaviour noted.
