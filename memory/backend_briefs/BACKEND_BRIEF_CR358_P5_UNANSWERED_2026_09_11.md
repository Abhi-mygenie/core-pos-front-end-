# BACKEND_BRIEF_CR358_P5_UNANSWERED_2026_09_11
## CR-358-P5 — 3 Questions from 2026-09-08 Brief Still Unanswered

**From:** MyGenie POS frontend team
**To:** Backend / Dev team
**Date:** 2026-09-11 (following up — originally filed 2026-09-08, no reply received)
**Related:** CR-358-P5, BACKEND_BRIEF_CR358_P5_2026_09_08.md

---

## Q1 — restrictions[] Schema (ep12)

Both push-inventory-restrictions and push-rate-restrictions are live and accepting requests. Aiosell rejects when restrictions[] is empty ("Payload Parsing Failed!"). We need to know what goes inside the array.

**Please provide:**
- One example restrictions[] item for push-inventory-restrictions (e.g. stop-sell)
- One example restrictions[] item for push-rate-restrictions (e.g. min-LOS)
- Full list of valid restriction type strings for each endpoint
- Valid values for to_channels[] — is "booking.com" correct? Other valid strings?

**Why blocking:** Restrictions sub-tab (S8-C) in Channel Manager is built with UI. Save/Push action cannot work without the item schema.

---

## Q2 — mark-no-show: State Requirements (ep13)

mark-no-show returns HTTP 422 "Failed to mark noshow" for booking BDC7497606 (booking.com, checkin was yesterday, operational_status=pending).

**Please answer:**
- Q2a: What state must a booking be in for mark-no-show to succeed? Is checkin date required to equal today exactly (not yesterday)?
- Q2b: Does mark-no-show (i) update operational_status to "no_show" on local-reservations? (ii) push inventory release to Aiosell?
- Q2c: Was there something sandbox-specific about BDC7497606 that caused failure?

**Why matters:** FE needs to know when to enable the No-Show button and what status to display after success. CR-363 Night Audit needs confirmed no-show count.

---

## Q3 — Checkout Inventory Release (ep14)

When a guest checks out via POST order/order-bill-payment, does your backend automatically push updated inventory to Aiosell (room becomes available on OTAs)?

**Please answer:**
- Q3a: Is inventory auto-pushed to Aiosell on checkout? YES / NO
- Q3b: If YES — can the push silently fail? Is failure surfaced to the caller?
- Q3c: If NO — should FE call POST aiosell/push-inventory after checkout?

**Why matters:** If FE needs to call push-inventory, we add it to PmsCheckoutDrawer.jsx. Getting this wrong means checked-out rooms stay blocked on OTAs.
