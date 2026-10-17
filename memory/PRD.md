# PRD — MyGenie POS Frontend (Updated 2026-10-16 end of day)

## Project
**Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git · **Branch:** `main`
**App URL:** https://genie-pos-app.preview.emergentagent.com · **Backend:** https://preprod.mygenie.online/
**Type:** Frontend-only React (CRA + CRACO) · connects to preprod

## Process Reference
- Agent roles + gates: `/app/memory/control/AGENT_PROMPT_ALPHA.md`
- Sprint tracker: `registry.json` (891 items total)
- Bug tracker: `BUG_TRACKER.md`

## Credentials
- Primary: owner@cafe103.com / Qplazm@10
- PalmHouse: owner@palmhouse.com / Qplazm@10 (e_invoice=true, whatsapp_message=true)
- 18march: owner@18march.com / Qplazm@10 (Default Order Status=Bill)
- pav2: owner@pav2.com / Qplazm@10

---

## Implemented (nov_cr_batch — Session 2 complete as of 2026-10-17)

### oct_cr_batch ✅ Complete
- BUG-555 WP-C: Header breakpoints lg→xl ✅
- BUG-556: Auto-bill payment mode fix ✅
- BUG-557: Delivery Assign at fOrderStatus=5 ✅
- BUG-568: Sidebar h-[100dvh] + maskImage ✅
- BUG-565/566: Header overflow + filter guard ✅

### nov_cr_batch ✅ Session 2 Complete
- CR-432: Order view column-count masonry ✅ GATE_5B_QA_PASSED
- CR-433: Status-based card borders + item fonts ✅ GATE_5B_QA_PASSED (Gap A open — see below)
- BUG-571: Empty group filter in order view ✅ GATE_5B_QA_PASSED
- BUG-575: Header click opens order ✅ GATE_5B_QA_PASSED
- BUG-581: Item label action words (Ready/Serve) ✅ GATE_5B_QA_PASSED
- CR-431: e-Invoice download link in Orders Beta ✅ GATE_5B_QA_PASSED
- BUG-572: WhatsApp gate in OrderCard + profileTransform mapping ✅ GATE_5B_QA_PASSED
- CR-430 / BUG-574: Served card height, auto-expand localStorage, two-path timers ✅ GATE_5B_QA_PASSED

---

## OPEN P0 — Gap A (CR-433 edge-case)

**Not yet implemented.** When `restaurant.defaultOrderStatus === 'bill'`:
- `fOrderStatus === 5` (served, bill not printed) → should be **ORANGE**
- `fOrderStatus === 6` (bill printed) → GREEN
- Current code shows GREEN for both fOs=5 and fOs=6

Fix: add `effectiveFOs = (fOs === 5 && isDefaultBill) ? 2 : fOs` before `getStatusColor` calls in:
- `OrderCard.jsx` lines 456, 482, 518
- `TableCard.jsx` line 282
Also: remove status text labels (• Preparing / • Ready / • Served) from TableCard lines 437-439.
**Test account:** owner@18march.com / Qplazm@10

---

## OPEN — Invoice / WhatsApp Icon Gaps (investigation complete, no code edit)

- **Invoice missing for palmhouse**: gate is `eInvoice && pdf_url` — either backend `e_invoice` ≠ 'Yes' for palmhouse OR `pdf_url` missing in API response. Backend to investigate.
- **WhatsApp icon showing for pav2**: frontend gate is correct (`whatsappMessage` flag). Backend to set `whatsapp_message: No` for pav2 if icon should be hidden.

---

## Upcoming (P2, not started)
- CR-429: Sort occupied/active tables first in table + channel views
- BUG-576: Room number search — search by `roomNumber` label not DB `_id`

## Backend-Blocked Items
- BUG-573: Variation selected option — backend to confirm API field name
- BUG-577: Cancelled items on print bill — backend to clarify print path
- BUG-578: Room transfer items not printing — backend missing `associated_order_list`
- BUG-579: Cancellation report ₹ values missing
- BUG-580: Discount report types missing

## Persistent Blocker
`preprod.mygenie.online /products` API times out — browser QA always conditional. All code checks pass.
