# Investigation Report — Daily Report + PMS Gaps (2026-09-15)

**Date:** 2026-09-15
**Role:** INVESTIGATION (ALPHA v0.7)
**Steps used:** 8/10
**Confidence:** HIGH

---

## §A — Daily Report: 3 Gaps Found

### GAP-DR-01 — Cancel Revenue Keys Mismatch (BUG-405) — FIXED

| Field | Value |
|---|---|
| Root cause | `reportService.js:L465` reads `cancel_revenue['Pre-Serve']` and `['Post-Serve']`. OLD POS API returns `['Preparing']` and `['Serve']` (different naming). FE gets `undefined` → ₹0 for both. |
| Classification | **FE_BUG** — wrong key names |
| Fix applied | `reportService.js` — added fallback: `['Pre-Serve'] ?? ['Preparing']` and `['Post-Serve'] ?? ['Serve']` |
| QA status | ✅ PASS (testing agent verified) |

---

### GAP-DR-02 — Room Orders Not in Running Section (BACKEND GAP)

| Field | Value |
|---|---|
| Observation | `runningOrders: toNum(data.running_order)` — shows ₹0 for room food orders |
| Root cause | `running_order` API field from `DAILY_SALES_REPORT` endpoint likely aggregates only dine-in/takeaway/delivery. Room-attached food orders tracked separately under `orderRoom` (line 444). |
| Classification | **BACKEND_GAP** — `running_order` does not include room food orders |
| FE impact | Running Orders card shows only table orders, not in-room food orders outstanding |
| Recommendation | File backend brief: ask BE to include room food orders in `running_order` sum, OR FE adds `data.orderRoom` to running orders display (with owner approval — business logic decision) |
| Owner decision needed | **Q1**: Should "Running Orders" include in-room food orders that are not yet checked out? |

---

### GAP-DR-03 — Room Food Payment Split Missing (BACKEND GAP)

| Field | Value |
|---|---|
| Observation | `settledCash/Card/UPI` shows only accommodation revenue (`data.room_revenue['Room Cash/Card/UPI']`). `checkinCash/Card/UPI` shows check-in advances. Food items ordered in-room have no Cash/UPI/Card breakdown. |
| Root cause | API response structure: `room_revenue` = accommodation only; `room_checkin_revenue` = advance at check-in; no separate breakdown for food-on-room-tab by payment method |
| Classification | **BACKEND_GAP** — API doesn't expose payment method split for room food orders |
| FE impact | Room section can't show combined total (food + accommodation) broken down by cash/UPI/card |
| Recommendation | File backend brief: request `room_food_revenue: { 'Room Cash', 'Room Card', 'Room UPI' }` field in daily-sales-revenue-report response |
| Owner decision needed | **Q2**: Do you want food + accommodation + check-in all combined in one Cash/UPI/Card split, or separate sections? |

---

## §B — PMS Room Status: 3 Gaps + Answers

### Issue 4 — "Mark All Clean" Button Explained

**What it does:**
- Finds all rooms where `manualStatus === 'hk'` (flagged for housekeeping)
- Skips rooms that are `occupied` or `occupied_hk` (guest inside)
- For remaining HK rooms: calls PATCH `/room-status/{id}` with `{ status: 'available' }` on each → marks them clean/ready
- Shows toast: `"N occupied rooms with HK flag will be skipped — cannot mark clean while occupied."`

**ss2 behavior explained:** Only 1 HK room existed (r3 = occupied_hk). All 1 HK rooms were occupied → skipped → nothing cleaned → warning shown. Now fixed: r3 can be individually marked clean via the new "Mark Clean" button.

---

### Issue 5 — occupied_hk Rooms Had No "Mark Clean" Button (BUG-406) — FIXED

| Field | Value |
|---|---|
| Root cause | `RoomStatusPage.jsx` `occupied_hk` action block had only disabled "HK In Progress" + disabled OOO. No Mark Clean. |
| Fix | Added enabled green "Mark Clean" → `patchRoomStatus(id, 'available')`. Clears HK flag; backend keeps `operational_status='occupied'`. |
| QA status | ✅ PASS — testing agent confirmed Mark Clean button visible on r5 (occupied_hk) |

---

### Issue 6 — Occupied Rooms Could Not Request Housekeeping (BUG-407) — FIXED

| Field | Value |
|---|---|
| Root cause | `occupied` action block: HK button was `disabled` with title="Cannot change while occupied" |
| Fix | Enabled "Request HK" button → `patchRoomStatus(id, 'hk')`. Backend sets `manual_status='hk'` → `display_status` becomes `occupied_hk`. |
| QA status | ✅ PASS — testing agent confirmed Request HK button visible on r1 (occupied) |

---

## §C — Additional PMS Gaps Identified

### GAP-PMS-07 — "Mark All Clean" Skips occupied_hk Permanently (OD NEEDED)

Now that BUG-406 is fixed (individual Mark Clean on occupied_hk works), should "Mark All Clean" also include occupied_hk rooms?

**Current bulk behavior** (line 82): `cleanableIds = hkRooms.filter(r => displayStatus !== 'occupied' && !== 'occupied_hk')` — still skips occupied_hk.
**Proposed**: Owner decision needed.
- **Option A**: Keep skipping occupied_hk in bulk (staff must use individual Mark Clean) — safer
- **Option B**: Include occupied_hk in bulk clean — more convenient but less granular

Owner decision: **OD-407-01** — include occupied_hk in Mark All Clean bulk action? A (skip) / B (include)

---

### GAP-PMS-08 — No "Request HK" Confirmation for Occupied Rooms (MINOR)

When staff clicks "Request HK" on an occupied room, it immediately patches. No confirmation dialog. Low risk (recoverable — can mark clean again). Probably fine but worth noting.

---

## §D — Summary of All Fixes This Session

| Bug | Issue | Status | Files |
|---|---|---|---|
| BUG-402 | Extend Stay ₹0/night | ✅ Code fixed, not QA-able (no live guest to extend) | ExtendStayDialog.jsx, InHouseGuestsPage.jsx |
| BUG-403 | 3-dots dropdown invisible on Arrivals | ✅ PASS (QA verified) | ArrivalsPage.jsx |
| BUG-400 | Add button covered by search | ✅ PASS (QA verified) | Header.jsx |
| BUG-401 | PMS Checkout GST = ₹0 | ✅ Code fixed, not QA-able (needs active checkout) | orderTransform.js, PmsCheckoutDrawer.jsx |
| BUG-404 | Room Amount stays ₹0 on room select | ⏳ NOT IMPLEMENTED — needs CR-382 Gate 2 (OD-382-01 answer first) | NewBookingPage.jsx |
| BUG-405 | Cancel revenue shows ₹0 (key mismatch) | ✅ PASS (QA verified) | reportService.js |
| BUG-406 | occupied_hk no Mark Clean | ✅ PASS (QA verified) | RoomStatusPage.jsx |
| BUG-407 | occupied no Request HK | ✅ PASS (QA verified) | RoomStatusPage.jsx |

## §E — Open Decisions Still Needed from Owner

| OD | Question |
|---|---|
| OD-DR-Q1 | Should Running Orders include in-room food orders (currently separate `orderRoom` field)? |
| OD-DR-Q2 | Room payment split: combined Cash/UPI/Card (food+accommodation+checkin) or keep separate sections? |
| OD-407-01 | Should "Mark All Clean" bulk include occupied_hk rooms? A) Skip (current+safe) B) Include |
| OD-382-01 | CR-382: Build Local Room Types (auto-fill room rate) now or park? |

*Investigation written 2026-09-15 · INVESTIGATION agent (ALPHA v0.7)*
