# Session Handover — Next Agent Briefing (2026-09-15)

```
Written:         2026-09-15
Session status:  INVESTIGATION + INTAKE complete for this session.
Next agent role: Depends on owner responses (see §Jobs below).
                 Start with §0 (boot), read ALL sections before acting.
Workspace:       /app  (branch 14sep, frontend-only)
Credentials:     /app/memory/test_credentials.md (goankitchen_owner alias)
App URL:         https://react-pos-deploy-4.preview.emergentagent.com
```

---

## §0 — Boot Sequence (ALL ROLES — mandatory first)

```
1. Read this handover IN FULL before doing anything
2. Read /app/memory/control/AGENT_PROMPT_ALPHA.md → confirm your role
3. Read /app/memory/control/CONTROL_DASHBOARD.md
4. Check environment:
   tail -3 /var/log/supervisor/frontend.out.log  → expect "webpack compiled successfully"
5. Confirm test credentials work (see §Credentials at end)
```

---

## §Jobs — Three jobs for next agent (in priority order)

| # | Job | Status | Role needed | Gate |
|---|---|---|---|---|
| **JOB-1** | BUG-401 (BLOCKER — PMS Checkout missing GST) | Intake complete, ODs open | PLANNING → BUG FIX | Gate 2 after ODs answered |
| **JOB-2** | Local Room Types investigation → new CR | Investigation complete, ODs open | INTAKE (after owner answers Q) | Gate 0-1 |
| **JOB-3** | Regression BATCH-10 re-run after BUG-400/401 fixes | Not started | QA (after Bug Fix) | Gate 5b re-test |

Also pending: Gate 6 Owner Smoke for all 86 items advanced to Gate 5b (2026-09-15). Owner to drive that session separately.

---

## §1 — JOB-1: BUG-401 + BUG-400 (Blockers from Regression)

### What happened in this session

Full regression (BATCH-10) was run by QA agent on `15sepqa` branch. Two bugs were found and registered:

---

### BUG-401 — BLOCKER P0 CRITICAL (R6) — PMS Checkout omits room GST

**Plain English:**
When hotel staff check out a guest, the room's GST (accommodation tax) is silently dropped from the payment record. The checkout screen reads the GST value from the wrong place in the data — the API returns GST at `room_info.gst_tax` but the code reads from `room_info.room_payment_summary.gst_tax` which doesn't exist in this response → gets 0 → skips sending `room_gst_tax` in the payment → backend records `room_gst_collected: 0`.

**Impact:**
- Every checkout: `room_gst_tax` absent from POST `/order/order-bill-payment` payload
- Night Audit §B: `room_gst_collected: 0` for all checkouts
- Guest Folio: shows ₹1,000 balance instead of ₹1,050 (room price without GST)
- BUG-386 OD-386-02 fix (inject `room_gst_tax`) is silently ineffective at checkout

**Code location (2 files):**
```
PmsCheckoutDrawer.jsx:L157
  const roomGstTax = detail.roomInfo?.roomPaymentSummary?.gstTax ?? 0;  // reads 0 always
  if (roomGstTax > 0) payload.room_gst_tax = roomGstTax;  // → skipped

orderTransform.js:L432 (R5 hotspot)
  gstTax: parseFloat(api.room_info.room_payment_summary.gst_tax) || 0  // field absent in response
```

**Fix (2 lines total):**
1. `orderTransform.js` — add `gstTax: parseFloat(api.room_info.gst_tax) || 0` to `roomInfo` mapping (reads from top-level `room_info.gst_tax` which IS present — confirmed by probe)
2. `PmsCheckoutDrawer.jsx:L157` — change to `detail.roomInfo?.gstTax ?? 0` (read the new direct field)

**Evidence:** `test_reports/QA_REPORT_BATCH10_2026_09_15.md` §S3-06 + S3-08 — payload captured, endpoint probed

**Intake doc:** `change_requests/BUG-401_PMS_CHECKOUT_OMITS_ROOM_GST_INTAKE.md`

**Open Decisions (owner must answer before Gate 2):**

| OD | Question | Options |
|---|---|---|
| **OD-401-01** | Gate 3 GO for the 2-line fix | **Approve** / **Hold** |
| **OD-401-02** | Guest Folio balance — show ₹1,000 (backend figure) or ₹1,050 (price + GST)? | **A)** ₹1,000 — show backend `remaining_room_balance` as-is (no R6 issue) · **B)** ₹1,050 — FE adds GST to balance display (R6 owner approval required) OR backend must fix `remaining_room_balance` to include GST |
| **OD-401-03** | Night Audit + Revenue Dashboard: missing Sidebar + Back button | **A)** Add Sidebar + Back button to both pages (consistent with all other PMS pages) · **B)** Keep shell-less (like Aggregator Setup) |
| **OD-401-04** | Revenue Dashboard fires 2 API requests on first open | **A)** Fix double-fetch (minor code cleanup) · **B)** Ship as-is (no visible user impact) |

**Next agent action:**
1. Present OD-401-01 to OD-401-04 to owner (plain English — see §Owner Questions below)
2. After owner answers → PLANNING Gate 2 → Gate 3 → BUG FIX → QA

---

### BUG-400 — MAJOR P1 — Add button covered by search input (Fast Lane eligible)

**Plain English:**
On the POS dashboard header, the search bar spills slightly outside its box and lands on top of the "Add" button. Staff tapping "Add" to start a new order actually hit the search bar instead. Workaround: click the very edge of the button or tap a table card.

**Code location (1 file):**
```
Header.jsx:L342 — search container div  →  needs overflow-hidden or min-w-0 on inner input
```

**Fix:** 1–2 lines, 1 file, not financial, not hotspot → **Fast Lane eligible** (owner approval needed)

**Intake doc:** `change_requests/BUG-400_HEADER_ADD_BUTTON_COVERED_BY_SEARCH_INPUT_INTAKE.md`

**Open Decisions:**

| OD | Question | Options |
|---|---|---|
| **OD-400-01** | Which CSS fix? | **A)** `overflow-hidden` on the search container div (L342) · **B)** `min-w-0` on the `<input>` element (L358) — both achieve same result |
| **OD-400-02** | Room Orders Y-axis ticks collide on low values ("₹1k ₹1k ₹0k") | **A)** Fix tick formatter · **B)** Ship as-is |

**Next agent action:** Get OD-400-01 from owner → Fast Lane fix (Gate 4 direct, no impact analysis needed for a 1-line CSS change)

---

## §2 — JOB-2: Local Room Types — New Feature Investigation

### Summary in plain English

The backend has shipped 4 new API endpoints for managing room types for hotels **without** a channel manager. Hotels with Aiosell are completely unaffected — this is additive only.

**What the endpoints do:**
- `GET /room-types` — get all defined room types (e.g. Deluxe ₹3,500 / Suite ₹5,000) + which rooms are assigned to which type
- `PUT /room-types` — create or update room types
- `PUT /room-types/assign` — map physical rooms to types
- `DELETE /room-types/{id}` — delete a type (clears room assignments)

**Current FE state:**
- The endpoint is live and returns 200 on preprod
- The Goan Kitchen has 5 rooms (r1–r5), 0 types created, all rooms unassigned
- FE has zero integration — the endpoint is not even in `API_ENDPOINTS` constants
- Room type currently comes entirely from Aiosell mappings → shows "Room" when null

**What the screenshots show:**
- New Booking: "R-2 (Room)" — `roomType` is null, falls back to "Room". Room Amount = ₹0. This is the exact gap the brief solves.
- Channel Manager (Inventory Restrictions + Room Mapping): Aiosell-based room types (Executive Room, Suite, Road View Room). Unchanged by this feature.

**Full investigation:** `investigations/INV_LOCAL_ROOM_TYPES_2026_09_15.md`
**Evidence:** `evidence/CR-364/probe_room_types_2026_09_15.json`

### What FE would need to build (if approved)

| # | What | Files | Notes |
|---|---|---|---|
| G1 | Add `LOCAL_ROOM_TYPES` to `API_ENDPOINTS` | `constants.js` | +1 line |
| G2 | `getLocalRoomTypes()`, `saveRoomTypes()`, `assignRoomTypes()` | `pmsService.js` | +3 functions |
| G3 | Enrich `getBookableRooms()` + `getTapeChartData()` with local type name + rate | `pmsService.js` | Priority: local type → Aiosell type → null |
| G4 | Room Types settings page — CRUD + room assignment | `pages/pms/RoomTypesPage.jsx` (NEW) | |
| G5 | Check-in: pre-fill Room Amount from `default_sell_rate` (editable) | `CheckInPage.jsx` | NOT a formula — just a default value |
| G6 | New Booking: pre-fill Room Amount | `NewBookingPage.jsx` | Same |
| G7 | Add route `/pms/room-types` | `App.js` | |
| G8 | Sidebar entry (optional — depends on OD-NEW-02) | `Sidebar.jsx` | |

### Open Decisions — owner must answer before CR can be registered

| OD | Plain English question |
|---|---|
| **OD-NEW-01** | Does The Goan Kitchen actually need this? You already have Aiosell which gives you proper room types (Executive Room, Suite, etc.). This feature is designed for hotels **without** Aiosell. Do you want to build it now (for your other hotels or platform clients), or park it? |
| **OD-NEW-02** | Where should the Room Types settings page appear in the sidebar? **A)** Under "Rooms & Reservations" (next to Channel Manager) · **B)** Under "Settings" section |
| **OD-NEW-03** | When a staff member selects a room in New Booking or Check-In, should the Room Amount field automatically fill in the configured default rate (staff can still change it before confirming), or stay blank as it is today? |

### Next agent action
1. **Wait** — present OD-NEW-01/02/03 to owner in plain English (see §Owner Questions)
2. **After owner answers OD-NEW-01 = YES (build it):** → INTAKE role → register new CR → Gate 2
3. **After owner answers OD-NEW-01 = NO (park it):** → Log as parked investigation, no CR

---

## §3 — JOB-3: Regression BATCH-10 Re-run

### Current state

BATCH-10 full regression is in **FAIL** state. 2 bugs found:
- **BUG-401 (BLOCKER)** — must be fixed first
- **BUG-400 (MAJOR)** — must be fixed before Gate 6 owner smoke

**BATCH-10 report:** `test_reports/QA_REPORT_BATCH10_2026_09_15.md`

**Re-test scope after fixes:**
```
S2-01: Header Add button → check pointer click now lands on add-table-btn (BUG-400)
S3-06: Guest Folio balance → check shows room price + GST (BUG-401)
S3-08: Checkout payload → check room_gst_tax present and > 0 (BUG-401)
Plus: adjacent tests S3-07 (drawer render) + S2-02 (OrderEntry renders)
```

**4 MINOR findings from regression — owner to decide ship-or-fix (ODs already captured in BUG-400/401):**
- F-04: Night Audit + Revenue Dashboard missing Sidebar/Back → OD-401-03
- F-05: Room Orders Y-axis ticks → OD-400-02
- F-06: Revenue Dashboard double-fetch → OD-401-04
- F-03 (backend only): `balance_payment` double-count in backend (no UI impact today, backend brief recommended)

---

## §4 — Owner Questions (for next agent to present)

Present these as ONE combined list in plain English. Do NOT start any coding or planning until owner answers:

---

**For BUG-401 (BLOCKER — Room GST at checkout):**

> **1. Can I fix the room GST bug?**
> When staff check out a guest, the GST (accommodation tax) on the room is not being recorded in the payment — it shows as ₹0 in all reports. The fix is 2 lines of code. Can I go ahead?
> **YES / NO / HOLD**

> **2. Guest Folio balance — should it include GST?**
> The Guest Folio page currently shows the balance as ₹1,000 (the number the backend gives us). The actual amount due including GST is ₹1,050. Should the balance on the folio show:
> **A)** ₹1,000 (backend's figure as-is — simpler, no extra code)
> **B)** ₹1,050 (room + GST — requires either a backend fix or our approval to add the two numbers together on the FE)

> **3. Night Audit + Revenue Dashboard pages — should they have a back button?**
> The Night Audit and Revenue Dashboard pages currently have no back button and no sidebar navigation. Every other PMS page (Front Desk, Check-In, In-House, etc.) has both. Should I:
> **A)** Add a sidebar and back button to both pages (consistent)
> **B)** Leave them as they are (like the Channel Manager setup pages)

> **4. Revenue Dashboard loads data twice on first open — fix or ship?**
> When you first open the Revenue Dashboard it makes two identical API calls instead of one. There's no visible impact for staff. Should I:
> **A)** Fix it (small code cleanup)
> **B)** Ship as-is

---

**For BUG-400 (Add button hit-target):**

> **5. Which CSS fix do you prefer for the "Add" button?**
> The search bar on the dashboard is covering the Add button. Both options below fix it in 1–2 lines:
> **A)** Clip the search box (`overflow-hidden`) — recommended
> **B)** Tell the search input to shrink-to-fit (`min-w-0`)

> **6. Room Orders chart — fix axis ticks or ship?**
> On the Room Orders report, the Y-axis numbers sometimes collide on small values (e.g. "₹1k ₹1k ₹0k" repeated). Fix the number formatting, or ship as-is?

---

**For Local Room Types (new feature from backend brief):**

> **7. Do you want to build the Room Types settings page?**
> The backend has added a new feature: you can create room categories (e.g. "Deluxe = ₹3,500/night", "Suite = ₹5,000/night") and assign your rooms to them. This mainly benefits hotels **without** Aiosell — since The Goan Kitchen has Aiosell, your room types already show properly. Do you want this built now (for other hotels on your platform) or park it?
> **BUILD IT NOW / PARK IT**

> **8. (Only if building) Where in the sidebar?**
> **A)** Under "Rooms & Reservations" (next to Channel Manager)
> **B)** Under "Settings"

> **9. (Only if building) Should Room Amount auto-fill when a room is selected?**
> When staff pick a room in New Booking or Check-In, should the Room Amount field automatically show the configured default rate (they can still change it)?
> **YES — auto-fill (editable)** / **NO — keep blank**

---

## §5 — Gate 6 Owner Smoke (separate session)

86 items are now at Gate 5b QA PASS and awaiting Gate 6 owner verification on preprod.

**Items ready for owner smoke:**
- BATCH-01: CR-363 (Night Audit), CR-364 (Guest Folio), CR-366 (Revenue Dashboard)
- BATCH-02: BUG-374, BUG-368, BUG-369, BUG-372, BUG-394
- BATCH-03: BUG-376, BUG-371, BUG-395, CR-372-A
- BATCH-04: BUG-390, BUG-391, BUG-392, CR-373, CR-374
- BATCH-05 through BATCH-09: 69 older backlog items

**Note:** BUG-401 (BLOCKER) must be fixed **before** Gate 6 smoke on BATCH-01 PMS pages — the GST gap would be visible during checkout smoke.

**Smoke batch document:** to be written by next SMOKE FACILITATOR agent after BUG-400/401 are fixed.

---

## §6 — All open decisions consolidated

| OD | Item | Question | Status |
|---|---|---|---|
| OD-401-01 | BUG-401 | Fix approval (Gate 3 GO) | OPEN |
| OD-401-02 | BUG-401 | Folio balance (₹1,000 vs ₹1,050) | OPEN |
| OD-401-03 | BUG-401 | Sidebar/Back on Night Audit + Revenue | OPEN |
| OD-401-04 | BUG-401 | Revenue double-fetch | OPEN |
| OD-400-01 | BUG-400 | CSS fix option (A or B) | OPEN |
| OD-400-02 | BUG-400 | Room Orders axis ticks | OPEN |
| OD-NEW-01 | Room Types | Build now or park? | OPEN |
| OD-NEW-02 | Room Types | Sidebar location | OPEN |
| OD-NEW-03 | Room Types | Auto-fill rate on check-in | OPEN |

**Rule:** Do NOT start Gate 2 or any coding until the relevant ODs are answered.

---

## §7 — Key reference documents

| Doc | Path | Purpose |
|---|---|---|
| Investigation report | `investigations/INV_LOCAL_ROOM_TYPES_2026_09_15.md` | Full data flow trace + gap analysis for local room types |
| BUG-401 intake | `change_requests/BUG-401_PMS_CHECKOUT_OMITS_ROOM_GST_INTAKE.md` | Code location, fix path, ODs |
| BUG-400 intake | `change_requests/BUG-400_HEADER_ADD_BUTTON_COVERED_BY_SEARCH_INPUT_INTAKE.md` | Fix options |
| Regression QA report | `test_reports/QA_REPORT_BATCH10_2026_09_15.md` | All findings F-01 to F-08 |
| Evidence | `evidence/CR-364/probe_room_types_2026_09_15.json` | GET /room-types probe |
| All batch QA reports | `test_reports/QA_REPORT_BATCH01–09_2026_09_15.md` | 86 items passed |

---

## §8 — Credentials + test data

```
Account alias:  goankitchen_owner
Email:          owner@thegoankitchen.com  password: ***
Login:          POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/common-login
Token field:    response.token
App URL:        https://react-pos-deploy-4.preview.emergentagent.com
Night Audit:    /pms/night-audit
Revenue:        /pms/revenue
Folio:          /pms/folio/1232245  (r3 — Test Guest GST, in-house)
Check-in:       /pms/check-in
New Booking:    /pms/new-booking
```

Test orders on preprod:
- **1232245** — r3, Walk-in, in-house (Test Guest GST) — use for BUG-401 folio + checkout test
- **1232382** — r2, Walk-in, checked-out (QA created during BATCH-10) — use for BUG-401 GST capture

---

## §9 — Source code: unchanged since last session

No code was changed in this session. All work was investigation + intake + registry updates.

---

*Handover written 2026-09-15 · Investigation + Intake agent (ALPHA v0.7)*
*Next agent: Read §0 → §Jobs → §Owner Questions → present questions → wait for answers → act*
