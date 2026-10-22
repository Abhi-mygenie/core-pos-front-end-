# CR-385 Front Desk — Implementation Acceptance Criteria (one page)
Source: QA audit (plans/CR-385_QA_AUDIT_REPORT.md) + decision D44 · Reference build: mockup v2.26 (`/cr385-frontdesk-mockup.html`) · Owner: implementation / impact-analysis track
Rule: the mockup is the visual spec; the criteria below are the behaviour the **real** frontend + backend must satisfy. Each line is testable; IDs map back to the audit.

## A. One source of truth for money
- [ ] **AC-01 (QA-002/003)** Booking charge = (room-type rate + rate-plan supplement) × nights, computed once by the backend and returned on the booking; every screen (Arrivals row, Check-In, Modify, No-Show, Cancel, Room Detail) displays that same value — never recomputed client-side.
- [ ] **AC-02 (QA-001)** Departures / In-House "Balance" = Bill Grand Total for the same guest at the same instant. Grand Total = Room balance + Room orders (F&B) + Transferred orders, all GST-inclusive.
- [ ] **AC-03 (QA-011)** Prepaid / Pay-at-hotel is a booking field (`pah`/`prepaid`), not derived from channel. Same badge on Arrivals, Check-In and Bill.
- [ ] **AC-04 (QA-012/013)** GST always shown as two lines **SGST then CGST** (never merged); currency en-IN, whole rupees when whole, otherwise 2 dp; negatives as `−₹X`.
- [ ] **AC-05 (QA-009, D44-b)** No-Show / Cancel: Refund due = Prepaid − Penalty − GST on penalty. Penalty and its GST come from the backend policy; UI is read-only and shows "Total deducted".

## B. Input validation (server-enforced, mirrored in UI)
- [ ] **AC-06 (QA-004)** Extend Stay: amount collected ≤ total payable; invalid/over amounts block Confirm with an inline reason.
- [ ] **AC-07 (QA-005/006)** Booking & Modify: check-in ≥ today (property timezone), check-out ≥ check-in + 1, adults ≥ 1, advance ≤ total; date pickers carry `min`. **No B2B/GST fields at Booking** — company name + GSTIN are captured at Check-In only (owner D48-c, mockup v2.28).
- [ ] **AC-08 (QA-008, D44-c → D47, v2.27)** Bill settlement: methods Cash · Card · UPI · **Split** · **Credit**. No free-typed "Amount received" — a single method always tenders the grand total; Card/UPI require Txn / UTR no. **Split** = POS parity: one fixed row per method (Cash / Card / UPI), on-blur clamp to remaining, "Remaining ₹X" line, Card row needs Txn ID · last 4; Checkout disabled until rows sum exactly to the grand total (reason "Collect the full amount or select Credit"). **Credit = TAB**: select → Checkout; bills the guest's TAB by the name + phone on the booking (no company field, never a Split leg). Under-payment is impossible; over-tender is clamped.
- [ ] **AC-09** Card / UPI collections require a transaction / UTR reference; Cash does not.
- [ ] **AC-10 (QA-029, D44-d)** Checkout is confirmed (two-step or equivalent) and idempotent — a double submit checks out exactly once.

## C. Business state & counters
- [ ] **AC-11 (QA-007)** No stay may have check-in = check-out; API rejects and UI never renders it.
- [ ] **AC-12 (QA-020)** "Leaving today" = check-out **today**; overdue departures counted separately. KPI strip numbers equal the list counts they link to.
- [ ] **AC-13** Source rule: OTA bookings offer **Mark No-Show only**; non-OTA offer **Cancel only** — enforced at row, kebab, alerts, search, Room Detail and deep links.
- [ ] **AC-14 (QA-030, D44-e)** Late arrival: full booking charged; chip states it.
- [ ] **AC-15 (QA-021)** Bill adjustments, coupon, loyalty, payment method/reference are scoped to one folio; switching guests never carries them over.
- [ ] **AC-16** Turn today = room checking out today with a same-type arrival today; Area grouping uses the board `title` field (shared section), never a floor derived from the room number.

## D. Terminology & components (D44-f/i)
- [ ] **AC-17** Glossary: Check-In (noun) · check in (verb) · Bill · Checkout · In-House · Housekeeping (HK in badges) · Out of order. Dismiss = "✕ Close"; footer secondary = "Close"; "Cancel" only for cancelling a booking.
- [ ] **AC-18** One footer grammar and primary-button size for all confirmations; one pill component for single-select toggles; No-Show/Cancel in danger red everywhere; dates via one formatter (no ISO strings on screen); plurals correct.

## E. Responsive & accessibility
- [ ] **AC-19 (QA-010/022/023)** At 1366×768 the Bill & collection pane needs no internal scroll; primary actions visible without scrolling at 1280–1920; KPI sub-lines ellipsise; search ≥ 200px; row actions single line ≥ 1024.
- [ ] **AC-20 (QA-026)** Text contrast ≥ 4.5:1; visible focus ring on every control; SVG icons (no emoji); hit targets ≥ 32px.
- [ ] **AC-22 (D50 money contract, 2026-09-20)** Every money figure comes from `charge{}` (`rate_per_night`, `upgrade_amount`, `booking_charge`, `sgst`, `cgst`, `total_with_gst`, `advance_payment`, `balance_due`). A stay is **cleared** only when `payment_status === 'paid'` **and** `charge.balance_due === 0`. The FE never reads `balance_payment` (legacy) nor folio `room_payment_summary.remaining_room_balance`. `charge.advance_payment` is cumulative paid → "Advance ₹X" chip only on pending / in-house rows. Upgrade shows as the folio line `Room upgrade: <reason>` in the Bill ROOM block. Check-in sends `booking_for=Individual`; TAB sends `payment_amount = charge.balance_due` via the existing panel body.

## F. Evidence to attach per release
- [ ] Regression suite = QA_TEST_PLAN §6 + audit §H (14 groups) green at 1920×800 and 1366×768; Safari + Edge manual pass; zero console errors.
