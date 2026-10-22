# CR-385 Impact Analysis — Gate 2
## PMS Front Desk — Unified Tabbed Workstation UX Revamp

```
Role:            PLANNING (ALPHA v0.7) — Stage: Impact Analysis ONLY (owner instruction 2026-09-17)
Date:            2026-09-17
Code Reality:    NONE — grep "FrontDeskTabs|Workstation|FrontDeskPanel" → 0 hits (re-verified)
Conflict check:  ZERO file overlap after OD-385-12 (see §2) — only App.js gains 1 import + 1 route
Risk:            HIGH (navigation architecture, App.js R5 hotspot, ~2,000 lines of new UI, localStorage key added)
Gate status:     GATE 2 CLOSED by owner 2026-09-17 ("yes we can close gate 2"). NEW HARD GATE 2.6 = IA re-validation after final design (Gate 2.5) BEFORE Gate 3. Gate 2.4 next. No code in src/.
Evidence:        /app/memory/evidence/CR-385/ (4 live probes, HTTP 200 each; phone/email redacted)
Inputs:          Intake doc · CR-385_DATA_INVENTORY.md · SESSION_HANDOVER_2026_09_16_CR385_FRONTDESK_INTAKE.md
Rev 2:           2026-09-17 — OWNER DIRECTIVE OD-385-12 applied: NEW PAGE (BETA), NO EXISTING PAGE TOUCHED. §2, §4.5, §5, §6, §7 rewritten.
```

---

## ⚠️ OD-385-12 — OWNER DIRECTIVE (2026-09-17, verbatim intent) — governs everything below

> "We will create a new page. **No existing pages should be touched.** This is an entirely new design, like a **beta**, and then we will disable the old page or whatever you want to do."

Context given by owner: the existing PMS pages (Front Desk, Arrivals, Departures, In-House, Room Status, Check-In) are **untested / still in QA**; only In-House is being modified right now (BUG-402/426). They must stay exactly as they are.

**What this changes in the plan:**
| Before (Rev 1) | Now (Rev 2) |
|---|---|
| Rewrite `FrontDeskPage.jsx` at `/pms/front-desk` | **NEW** `pages/pms/FrontDeskWorkstationPage.jsx` at a **new route** (name → OD-385-13). Old `/pms/front-desk` untouched. |
| *Extract* panels out of the 4 pages (edits them) | **Copy** the needed logic into new panel components. Source pages **unchanged** (0 lines). |
| *Extract* Check-In form body out of `CheckInPage.jsx` (edit) | **Copy** L457–905 + state + handlers into `components/pms/frontdesk/CheckInForm.jsx`. `CheckInPage.jsx` **unchanged**. |
| *Move* `RoomTile` out of `RoomStatusPage.jsx` (edit) | **Copy** into `components/pms/frontdesk/RoomTile.jsx`. `RoomStatusPage.jsx` **unchanged**. |
| Add helpers to `pmsService.js` | **NEW** `api/services/frontDeskService.js` — imports existing `pmsService` exports, adds the shell-load + folio-balance helpers. `pmsService.js` **unchanged**. |
| App.js 0 edits | App.js **+1 import, +1 route** (hotspot, minimal, isolated to `/pms/*` block) |
| Cutover = same URL | Cutover = **separate follow-up FU-385-C** after beta approval: disable/redirect old page + sidebar review (merges with FU-385-A). Not in CR-385 Phase 1. |

**Only existing files that may change:** `App.js` (+2 lines). Entry to the beta → OD-385-14 (sidebar item vs URL only).

**Trade-off accepted knowingly:** ~450 lines of Check-In form + ~150 lines of RoomTile exist **twice** until cutover. Any bug fix landing on `CheckInPage.jsx` / `RoomStatusPage.jsx` during the beta must be **mirrored** into the copies (tracked in §7 R9 + FU-385-C diff step). Reusable **shared** components (`PmsCheckoutDrawer`, `ExtendStay/Modify/Cancel/NoShow` dialogs, `GuestDocsSection`) are **imported, not copied** — importing does not modify them.

---

## 0. Reading guide for the owner (2 minutes)

- **What this doc decides:** which files change, where each panel gets its data, how the 910-line Check-In form moves into the workstation, and what can go wrong.
- **What it does NOT decide:** any UX look (MV-01…MV-09 stay for the Gate 2.5 mockup), any backend change (BQ briefs held until Gate 2 closes per owner).
- **New facts found this session (§4.6):** live probe shows LR rows carry `balance_payment` — but it is **inconsistent** (₹900 vs ₹950 for identical folios) and excludes F&B, so the Q4 "true balance" rule stands (folio call). Board rows now carry `hk_assignee`; KPIs now carry `no_show_count` — both unread by FE today.
- **FU-385-B verified (§4.5):** OTA config page (`ChannelManagerPage.jsx`) already has **"Sync All Now"** (push inventory) + **"Fetch Reservations"** (pull bookings) + last-sync time. The Front Desk card can be removed without losing capability. One nuance: Front Desk "Sync Now" did *pull-then-push* in one click; OTA page has them as two buttons.

---

## 1. Code Reality Check (Step 0)

```bash
grep -rn "FrontDeskTabs\|Workstation\|FrontDeskPanel\|KpiTabStrip\|useFrontDesk" /app/frontend/src --include=*.js --include=*.jsx
# 0 hits
grep -rn "CR-385" /app/frontend/src
# 0 hits
```

**Code Reality: NONE.** Every source page is a standalone full-page component (own `<Sidebar>`, own header, own `load()`, own visibility-refetch). Verified line counts (2026-09-17):

| File | Lines | Own `load()` fetches | Inline actions already present |
|---|---:|---|---|
| `pages/pms/FrontDeskPage.jsx` | 352 | `getReservationOps` + `getFrontDeskKpis` + `getChannelSyncStatus` (Promise.allSettled) | Check-Out drawer (departures preview), Sync Now |
| `pages/pms/ArrivalsPage.jsx` | 372 | `getReservationOps` + `getCancelledReservations` | No-Show, Modify, Cancel dialogs; kebab menu (`ArrKebabMenu` L333–372) |
| `pages/pms/DeparturesPage.jsx` | 311 | `getReservationOps` | Check-Out drawer, Extend Stay |
| `pages/pms/InHouseGuestsPage.jsx` | 214 | `getInHouseGuests({roomGstApplicable})` | Extend Stay; View Bill → `/pms/folio/:id` |
| `pages/pms/RoomStatusPage.jsx` | 344 | `getRoomStatusBoard` | PATCH hk/ooo/available, bulk Mark All Clean; `RoomTile` L198–344 |
| `pages/pms/CheckInPage.jsx` | 910 | `getPmsReservations` + `getBookableRooms` | full form; `navigate('/pms/in-house')` on success L341 |
| `components/pms/PmsCheckoutDrawer.jsx` | 305 | own order fetch | reusable as-is |
| `components/pms/{ExtendStay,ModifyBooking,CancelBooking,NoShow}Dialog.jsx` | 147/140/103/127 | — | reusable as-is (`target/onClose/onSuccess` API) |
| `App.js` | 281 | — | 12 `/pms/*` routes L259–270 |

---

## 2. Conflict Pre-Check (Step 1) — Rev 2 (OD-385-12: nothing existing is edited)

Because CR-385 now creates **only new files** (+2 lines in `App.js`), file-level conflicts collapse to one:

| Item | Status | Shared file | Verdict |
|---|---|---|---|
| CR-052 / CR-117 / CR-355 / CR-365 | various open | `App.js` | CR-385 adds 1 import (after L109) + 1 route (after L270) inside the `/pms/*` block → **parallel-safe**. Entry verification at Gate 4 re-checks those two anchor lines only. |
| BUG-411 / BUG-402 / BUG-426 / CR-384 / BUG-413 | QA / blocked | `CheckInPage.jsx`, `InHouseGuestsPage.jsx`, `pmsService.js`, `ArrivalsPage.jsx` | **NO conflict — CR-385 does not edit these files.** But they are the *source* of the copied logic → see §7 R9 (mirror rule): any fix that lands on them during the beta must be re-applied to the copy before cutover. |
| CR-365 (HK workflow) | UNBLOCKED, Gate 2 pending | `RoomStatusPage.jsx` | No conflict now. CR-365 may still target the old page; at cutover (FU-385-C) its HK UI must also exist in `RoomsPanel`. Flag at CR-365 Gate 2. |
| CR-381 (Laundry) | INTAKE | — | If OD-381-01 = "sub-tab", host = the new workstation page. |

FILE_OWNERSHIP: no existing PMS row changes. New rows will be added at Gate 5a for the `components/pms/frontdesk/*` files + `App.js` (+2).

---

## 3. Risk Classification

| Field | Value |
|---|---|
| **Risk** | **HIGH** (confirmed, not upgraded) |
| Triggers | `App.js` hotspot (R5, +2 lines) · navigation architecture · new `localStorage` key (R8 — *adding* is allowed, renaming is not) · ~2,000 lines of new UI · Check-In form (money: advance payment, GST) *copied* but not *changed* |
| Financial logic touched? | **NO change.** `handleConfirm` (advance, GST base, `balance_payment`) and `PmsCheckoutDrawer`/`CollectPaymentPanel` are copied/imported unchanged. R6 regression checklist still required because the money path now runs from a second location. |
| Not CRITICAL because | No formula, tax, payment or print semantics change. If any Gate 3 edit touches a formula → upgrade to CRITICAL and stop for owner approval. |
| Fast Lane | NO |

---

## 4. Data Flow Trace (API → transform → component → UI)

### 4.1 Workstation shell (one load, shared by all panels)

```
GET /aiosell/local-reservations?start_date=T-60&end_date=T+30   → aiosellTransform.fromReservationOps → pmsService.bucketReservationOps
GET /aiosell/dashboard-kpis?start_date=T&end_date=T             → aiosellTransform.fromDashboardKpis
GET /aiosell/room-status-board                                  → roomStatusTransform.fromRoomStatusBoard
GET /aiosell/status                                             → aiosellTransform.fromStatus   (header dot only)
```
- Today `FrontDeskPage` fires calls 1+2+4; `RoomStatusPage` fires 3; `InHouseGuestsPage` fires its own 3-step chain (§4.4). **Workstation = 4 parallel calls on mount** (`Promise.allSettled`, same failure policy as today: ops failure = page error, others = "—").
- Probe 2026-09-17 (RID 69 sandbox): all four **HTTP 200**. LR = 46 reservations (11 pending · 3 in_house · 32 departed). Board = 5 rooms, `auto_hk_on_rm_checkout: true`. KPIs include `no_show_count` (new, unread).
- **Refresh policy (Q10 locked provisional):** one `load()` at shell level; `visibilitychange` listener moves from 4 pages to the shell (1 listener instead of 4); every action `onSuccess` → `load()`; Refresh button in header. Panel switch does **not** refetch (data already in memory) — big UX win vs today.

### 4.2 KPI-tab strip (OD-01+07)

| Tile | Big number source | Sub-line source | Panel |
|---|---|---|---|
| Arrivals *(default)* | `kpis.arrivalsCount` (server) — fallback `ops.arrivalsToday.length` | `ops.arrivalsLate.length` late · `ops.arrivalsUpcoming.length` upcoming | Arrivals |
| Departures | `kpis.departuresCount` — fallback `ops.depDueToday.length` | `ops.depOverdue.length` overdue (red) | Departures |
| In-House | `kpis.inHouseCount` | Outstanding ₹ needs In-House rows (§4.4) — **shown only after In-House data loads**; MV-05 decides | In-House |
| Rooms | MV-06: `kpis.occupancyPct` / `board.counts.available` / `board.counts.occupied+occupied_hk` | `board.counts.hk` HK · `board.counts.ooo` OOO · `occupied of totalRooms` | Rooms |

Note: today's `Arrivals Today` tile sub-line mixes `checkedInToday` into arrivals; per R5-std-1 checked-in guests leave Arrivals → sub-line changes to late/upcoming. **No backend change**; pure re-labelling.

### 4.3 Arrivals & Departures panels

- Source: `ops` buckets already in memory. Panel chips = existing tab arrays (`ArrivalsPage` L84–90, `DeparturesPage` L87–92) minus `checkedIn` (→ In-House) and `checkedOut` (→ footer link to reports).
- **Cancelled (MV-03):** `getCancelledReservations()` is a 5th call today (`ArrivalsPage` L74). Note `bucketReservationOps` already returns a `cancelled` bucket from the same LR payload (L314) — Gate 3 should verify whether the separate call is redundant (probe: does LR window include cancelled rows? Probe showed 0 cancelled in 46 → **undetermined**, keep the call until proven).
- Row actions (all exist, move verbatim): Check-In → **in-panel form (§4.5)**; No-Show / Modify / Cancel → existing dialogs; Check-Out → `PmsCheckoutDrawer`; Extend → `ExtendStayDialog`; Folio → `navigate('/pms/folio/:orderId')` (**this navigation stays** — folio is a dedicated page, scope-locked in intake).
- **Departures true balance (R5-Q4):** see §4.6 — requires per-row folio call (N). Reuse the exact BUG-421/426 Step-3 logic in `getInHouseGuests`; Gate 3 should extract it into a shared `enrichWithFolioBalance(rows)` helper in `pmsService.js` so In-House and Departures share one code path (and one Phase-2 replacement point).

### 4.4 In-House panel

- Source: `getInHouseGuests({ roomGstApplicable })` — 3-step chain: `GET_ROOM_LIST` → LR enrichment → **N parallel folio calls** (`SINGLE_ORDER_NEW`). Unchanged.
- **New in CR-385:** Request HK / Mark Clean buttons on rows (R5-std-3). HK state comes from `board.rooms[].manualStatus` joined **client-side by `roomNumber` ↔ `tableNo`** (both strings like `r3`). Action = `patchRoomStatus(tableId,'hk'|'available')` → same handler as Rooms panel → `load()`. `tableId` = `board.rooms[].id` from the same join.
- Guard: OOO never offered on occupied rows (server also guards — OD-P4-03).
- Chips `All · Arrived today · Leaving today · Stayover` derive from `checkinDate`/`checkoutDate` vs today — client-side, no new data.

### 4.5 Check-In inside the workstation (OD-03) — the hard part

`CheckInPage.jsx` anatomy (verified line refs):

| Lines | What | Fate |
|---|---|---|
| 1–60 | imports, ~25 `useState`, `useSearchParams`/`useLocation`/`useNavigate` | state **copied** into new `CheckInForm`; router hooks not copied (host passes props) |
| 61–99 | `today`, GST slabs from `useRestaurant`, payment methods, `load()` (`getPmsReservations` + `getBookableRooms`) | `getBookableRooms()` **must still be called** when the panel opens (rooms list + occupied/OOO state for room picker). `getPmsReservations` becomes unnecessary — arrival row is passed as prop |
| 101–122 | auto-select effect: `location.state.walkin` / `?booking_id` / first today arrival | page shell keeps it; workstation passes `initialArrival` or `walkinPrefill` prop instead |
| 168–226 | `selectArrival(a, rooms)` / `selectWalkin(prefill, rooms)` | move into `CheckInForm` — called once on mount from props |
| 263–347 | `handleConfirm` (CRM create, GST, `pmsCheckIn` FormData, doc upload) | **copy verbatim**; in the copy L341 `navigate('/pms/in-house')` → `onSuccess?.()` **(only logic delta vs source)** |
| 364–456 | page shell: Sidebar, header, KPI strip, walk-in banner, arrivals card list | **not copied** — `CheckInPage.jsx` stays 100% as-is (route `/pms/check-in` + its 5 deep-link callers untouched) |
| 457–905 | right panel = **form body** (CRM badge, Who/Stay/Room/GST/Adults+IDs/Advance/Note, Confirm) | **copied** → `components/pms/frontdesk/CheckInForm.jsx` (~480 lines incl. state/handlers). Source unchanged. |

Extraction contract (for Gate 3):
```
<CheckInForm
  mode="arrival" | "walkin"
  arrival={opsRow | null}          // from Arrivals panel row (fromReservationOps shape)
  walkinPrefill={obj | null}       // from NewBookingPage state (page-shell path only)
  rooms={bookableRooms}            // fetched by host on open
  onSuccess={() => ...}            // replaces navigate('/pms/in-house')
  onCancel={() => ...}
/>
```
⚠️ Shape difference: `CheckInPage` arrivals use `aiosellTransform.fromPendingArrival`; workstation rows use `fromReservationOps` (which spreads `fromPendingArrival` — L197 `...base`). **Superset → compatible.** Gate 3 verification item: `selectArrival` reads only base fields (`bookingType,bookingId,guestName,phone,email,restaurantTableId,roomCode,checkin,checkout,amount,adults,children,specialRequests`) — all in base. ✔

Width: MV-02 (720 px side panel vs overlay) is a mockup decision; the extraction is the same either way.

### 4.6 Balance-due reality (probe 2026-09-17) — corrects DATA_INVENTORY gap #2

LR rows **do** carry `advance_payment` and `balance_payment` (unread by `fromReservationOps`). Compared against folio for the 3 in-house orders:

| order | LR `balance_payment` | folio `room_price+gst−advance−received` | assoc. F&B orders |
|---|---:|---:|---:|
| 1232408 | 950 | 950 | 3 (not in LR figure) |
| 1232470 | **900** | 950 | 1 |
| 1232479 | 950 | 950 | 1 |

→ LR `balance_payment` is **not reliable** (one row off by ₹50 with identical inputs) and **excludes transferred F&B / room orders** (BUG-426 scope). Conclusion: **Q4 stays folio-based.** Add to BQ-385-02 when brief is written: "make `balance_payment` on LR rows authoritative (room + GST + F&B − payments) so FE can drop N folio calls." Evidence: `evidence/CR-385/CR-385_balance_compare.json`.

### 4.7 Rooms panel

- Source: `board` from shell load. `RoomTile` (L198–344) **copied** to `frontdesk/RoomTile.jsx` as the **Comfortable** density; **Compact** tile + RS-A/B/C layouts are new components decided at MV-08/MV-09.
- Actions unchanged: `patchRoomStatus` (PATCH — R25 compliant ✔), `bulkMarkClean` (sequential N PATCH — Phase 2 candidate). `View Folio` on tiles currently goes to `/reports/rooms` (L279/L295) — **inconsistent with In-House/Departures which go to `/pms/folio/:id`**. In the **copied** tile Gate 3 should point to `/pms/folio/${room.guest.orderId}` (SC-385-01); the old page keeps `/reports/rooms` (untouched).
- Density toggle persisted in `localStorage['mygenie_fd_room_density']` (new key; default `comfortable`).
- Grouping by room type uses `room.roomType` (`aiosell_room_code`) — available ✔. Floor grouping impossible (no field) ✔ confirmed by probe (`room keys` list in evidence).

### 4.9 Folio + Checkout on ONE screen (owner directive OD-385-15, 2026-09-17)

Owner: *"On the folio page there is a lot of space, and when we click Checkout again a checkout pop-up opens. We don't want that. It should be a single screen where everything is visible, and from there checkout can happen and the bill can be printed by Bill Print or Print Folio."*

**Verified facts:**
- `GuestFolioPage.jsx` (457 L): 1 call `getGuestFolio(orderId)`, 5 read-only cards, right column mostly empty; **Check Out opens `PmsCheckoutDrawer`** (second surface — the pop-up the owner rejects). Print Folio disabled; Record Payment parked.
- `PmsCheckoutDrawer.jsx` (305 L): 480 px slider whose *only job* is to host **`CollectPaymentPanel`** (R5 hotspot, ~3,050 L, NOT to be modified). Host logic = load order (`SINGLE_ORDER_NEW` → `orderFromAPI.order`, L77–111), `handlePrintBill` (`printOrder(orderId,'bill',…)`, L114–125), `handlePaymentComplete` (`orderToAPI.collectBillExisting` + BUG-386 `room_gst_tax` + `BILL_PAYMENT`, L128–172), BUG-425 `remainingRoomBalance` override (L274–285). **`CollectPaymentPanel` is a plain component — it renders wherever it is placed; the drawer is just a frame.**
- Bill Print already exists inside `CollectPaymentPanel` ("Print Bill" → `onPrintBill` → `printOrder`). ✔
- **Print Folio = CR-364-PRINT — BACKEND-BLOCKED** (6 open questions, `backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md`). Button will be present but disabled with tooltip until that CR ships. Dependency, not a blocker for CR-385.

**Design → `FolioCheckoutPanel` (NEW, replaces both `FolioSidePanel` idea and any drawer use on the new page):**
```
┌ KPI-tab strip stays visible ─────────────────────────────────────────────────────┐
│ ← Back to <tab>   Folio · Room 101 · Guest Name · BK-2031 · Direct · PAH          │
│ ┌ LEFT (folio, ~55%) ─────────────────────┐ ┌ RIGHT (checkout, 480px) ──────────┐ │
│ │ Guest & Stay · Room Charges (GST, adv.) │ │ CollectPaymentPanel (as-is)        │ │
│ │ Payments · F&B posted · Room Orders     │ │  method / split / tip …            │ │
│ │ Balance due ₹X (sticky)                 │ │  [Print Bill]   [Collect & Check Out]│ │
│ └─────────────────────────────────────────┘ └────────────────────────────────────┘ │
│ footer: [Print Folio — disabled until CR-364-PRINT]  [Extend Stay]                  │
└────────────────────────────────────────────────────────────────────────────────────┘
```
- Opens **full-width in the panel area** (list replaced, KPI-tab strip stays) — the composite needs ~1,040 px, so it is not a side panel. Layout variants → MV-01 (below).
- Entry points: every **Check Out** and **View Folio / Folio** button (Departures, In-House, checked-in Arrivals, occupied room tiles) → `openPanel({type:'folio', orderId})`. **No drawer, no pop-up, no navigation.**
- Data: 2 calls on open — `getGuestFolio(orderId)` (folio cards) + `SINGLE_ORDER_NEW`→`orderFromAPI.order` (checkout host). Both hit the same endpoint → Gate 3 to fetch **once** and feed both transforms (`folioTransform` + `orderTransform`).
- Payment success → toast · panel closes · `load()` (replaces drawer `onClose` + folio `navigate(-1)`).
- Departed guest (`folio.isCheckedOut`) → right column hidden, folio read-only + Print buttons (matches OD-364-C3).
- **Money path is COPIED, not changed:** `handlePaymentComplete`, BUG-386 `room_gst_tax`, BUG-425 balance override, `handlePrintBill` are copied verbatim from `PmsCheckoutDrawer.jsx` into the new panel (source untouched — OD-385-12). Gate 3 verification matrix must inherit CR-358-P3 checkout tests + BUG-386/425 checks; any deviation from the copied formulas → CRITICAL, stop.
- `PmsCheckoutDrawer` is therefore **not used** on the new page (old pages keep it). At FU-385-C the old folio page + drawer become retire candidates.

### 4.8 Live updates (Q10) — FE fact for the backend brief

`api/socket/socketEvents.js` channels: `new_order_*`, `update_table_*`, `aggregator_order_*`, `order-engage_*`, `food_update_*`. **No PMS channel.** Confirms BQ-385-01. Brief held until Gate 2 closes (owner).

---

## 5. Affected Files (scope lock for Gate 3) — Rev 2

### WILL create (all NEW — nothing existing edited)
| # | File | Source copied from (read-only) | Content | Est. lines |
|---|---|---|---|---:|
| 1 | `pages/pms/FrontDeskWorkstationPage.jsx` | `FrontDeskPage.jsx` (header/greeting/load policy) | Beta host: own `<Sidebar>`, header (greeting · date · property · sync dot · Refresh · New Booking · **BETA** badge), shell load (4 calls), KPI-tab strip, alert bar slot, active panel, side-panel slot. No Channel Sync card, no Departures widget. | ~320 |
| 2 | `components/pms/frontdesk/KpiTabStrip.jsx` | — | 4 tiles as tabs (`role="tablist"`, arrow keys) | ~90 |
| 3 | `components/pms/frontdesk/AlertBar.jsx` | — | MV-07 (urgent set / click / dismiss per mockup freeze) | ~80 |
| 4 | `components/pms/frontdesk/ArrivalsPanel.jsx` | `ArrivalsPage.jsx` L84–100, L200–372 (table, kebab) | chips Late/Today/Upcoming; Check-In → `CheckInForm` in side panel; imports existing dialogs | ~260 |
| 5 | `components/pms/frontdesk/DeparturesPanel.jsx` | `DeparturesPage.jsx` L87–101, L180–290 | chips Overdue/Today/Upcoming; true-balance column; Check-Out + Folio → `FolioCheckoutPanel` (no drawer) / Extend | ~220 |
| 6 | `components/pms/frontdesk/InHousePanel.jsx` | `InHouseGuestsPage.jsx` L40–59, L115–202 (incl. BUG-402 nights fallback) | chips, Outstanding ₹, HK badge (board join), Request HK / Mark Clean / Check-Out / Extend / Folio | ~230 |
| 7 | `components/pms/frontdesk/RoomsPanel.jsx` | `RoomStatusPage.jsx` L11–29, L63–111, L143–190 | toolbar chips, Mark All Clean, Auto-HK pill, density toggle, grouping switch; RS-A/B/C per mockup | ~220 |
| 8 | `components/pms/frontdesk/RoomTile.jsx` | `RoomStatusPage.jsx` L198–344 | copy of `RoomTile` (+ SC-385-01 folio link) | ~150 |
| 9 | `components/pms/frontdesk/RoomTileCompact.jsx` | — | MV-08 compact density | ~80 |
| 10 | `components/pms/frontdesk/CheckInForm.jsx` | `CheckInPage.jsx` L1–60 (state), L130–347 (handlers), L457–905 (JSX) | copy; `onSuccess` replaces navigate; props per §4.5 contract | ~480 |
| 11 | `components/pms/frontdesk/FolioCheckoutPanel.jsx` | `GuestFolioPage.jsx` L241–412 (5 cards) + `PmsCheckoutDrawer.jsx` L77–172, L260–290 (CollectPaymentPanel host, print, pay, BUG-386/425) | §4.9 — folio + inline `CollectPaymentPanel` on one full-width panel; Print Bill (live) · Print Folio (disabled → CR-364-PRINT) · Extend; also serves MV-01 guest row click | ~420 |
| 12 | `api/services/frontDeskService.js` | `pmsService.js` L76–110 (BUG-421 Step 3 pattern) | `getFrontDeskSnapshot()` (4 parallel calls + allSettled policy), `enrichWithFolioBalance(rows)`, `joinBoardToRows(rows, board)` — **imports** `pmsService` exports, does not modify them | ~120 |
| 13 | `api/services/__tests__/frontDeskService.cr385.test.js` | — | buckets→tile counts, board join, folio-balance helper, allSettled policy | ~140 |
| 14 | `App.js` | — | **+1 import, +1 route** `<Route path="/pms/front-desk-v2" element={<ProtectedRoute><FrontDeskWorkstationPage/></ProtectedRoute>} />` | +2 |
| 15 | `components/layout/Sidebar.jsx` | — | **OD-385-14 (a) LOCKED**: +1 line `{ id: 'pms-front-desk-v2', label: 'Front Desk (Beta)', path: '/pms/front-desk-v2' }` after L236 | +1 |

Total new code ≈ 2,600 lines · existing code edited: **3 lines (App.js +2, Sidebar.jsx +1)**. `CollectPaymentPanel`, `orderTransform`, `folioTransform`, dialogs, `GuestDocsSection` are **imported unchanged**.

### WILL NOT touch (hard lock — OD-385-12)
`pages/pms/FrontDeskPage.jsx` · `ArrivalsPage.jsx` · `DeparturesPage.jsx` · `InHouseGuestsPage.jsx` · `RoomStatusPage.jsx` · `CheckInPage.jsx` · `GuestFolioPage.jsx` · `ReservationsPage.jsx` · `NewBookingPage.jsx` · `ChannelManagerPage.jsx` · `api/services/pmsService.js` · `aiosellTransform.js` · `roomStatusTransform.js` · `PmsCheckoutDrawer.jsx` · the 4 dialogs · `GuestDocsSection.jsx` · `CollectPaymentPanel.jsx` · `orderTransform.js` · `AppProviders.jsx` · `/app/memory/final/*`. (`Sidebar.jsx`: only the +1 beta item line — OD-385-14.)

**Hotspot count: 1 (`App.js`, +2 lines).** Below the 3-hotspot approval threshold.

### Cutover (NOT in CR-385 Phase 1) → **FU-385-C**
After owner approves the beta: (1) diff source pages vs copies, re-mirror any fixes; (2) re-point `/pms/front-desk` to the new page **or** redirect; (3) sidebar review (merges FU-385-A); (4) retire duplicates (`CheckInPage` form body → import `CheckInForm`, `RoomStatusPage` → import `RoomTile`). Each step is its own owner-approved edit to an existing page — outside this CR.

---

## 6. Owner Decisions

### Locked (from intake — no re-ask)
OD-01+07 · OD-02→FU-385-A · OD-03 (no navigation) · OD-04 · OD-05 (hybrid density) · OD-06 · D-R2-02 · D-R2-03 · D-R4-01 · R5-std-1/2/3 · R5-Q4 · R5-Q7 · Q10 provisional · Q11 (40 rooms) · MV-01…MV-09 → mockup switches.

### Directive locked this session
| ID | Decision |
|---|---|
| **OD-385-12** | **NEW page (beta). No existing page touched.** Old pages disabled/re-pointed later via FU-385-C. |

### New, surfaced by this IA (answer at Gate 2 close or defer to Gate 3 — none block the mockup)
| ID | Question | Options | Agent ★ |
|---|---|---|---|
| **OD-385-13** | Route for the beta page | **LOCKED (c) `/pms/front-desk-v2`** — owner 2026-09-17 | at cutover (FU-385-C) `/pms/front-desk` re-points/redirects here |
| **OD-385-14** | How staff reach the beta during testing | **LOCKED (a) +1 sidebar item "Front Desk (Beta)" → `/pms/front-desk-v2`** — owner 2026-09-17 | `Sidebar.jsx` +1 line after L236 (`pms-front-desk`). Existing-file edits total: App.js +2, Sidebar.jsx +1. Item removed at FU-385-C |
| **OD-385-10** | Deep-link into a tab (`?tab=departures`) | **LOCKED (a) yes** — owner 2026-09-17 | `?tab=arrivals|departures|inhouse|rooms`; absent/invalid → Arrivals (OD-06) |
| ~~SC-385-01~~ → **OD-385-15** | Folio + checkout | **LOCKED (owner 2026-09-17): single screen — folio details + checkout + Print Bill / Print Folio, no second pop-up.** Agent: feasible → §4.9 `FolioCheckoutPanel` (folio cards left, `CollectPaymentPanel` inline right). Print Folio disabled until CR-364-PRINT (backend-blocked). **MV-01 now = layout of this panel** (see below) | — |
| **MV-01 (revised)** | How the Folio+Checkout panel appears | (a) **full-width in panel area**, KPI-tab strip stays, ← Back returns to the list ★ · (b) wide overlay (~1,100 px) over the list with dimmed backdrop · (c) folio cards collapse to a summary strip so checkout gets more width | ★ (a) — most space, zero overlap, matches "everything visible" |
| **OD-385-11** | Rooms tab when `room-status-board` fails but LR succeeds | **LOCKED (a) degrade only the Rooms tab** — owner 2026-09-17 | Rooms tile "—", HK badges hidden, Rooms panel shows "Room status unavailable — Retry"; other tabs fully usable. Reservations failure = whole page error + Retry (unchanged policy) |
| ~~OD-385-09~~ | old pages after ship | **SUPERSEDED by OD-385-12 → FU-385-C** | — |

---

## 7. Risks & Mitigations (register for Gate 3)

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | Check-In form regression while **copying** 480 lines (BUG-388/396/411/419/420, CR-379/380 all live in this block) | HIGH | Copy verbatim; Gate 3 verification matrix inherits **all** V-checks from CR-379/CR-380/BUG-396/BUG-411 QA handovers; diff copy vs source must show exactly 1 logic delta (navigate→onSuccess) + import path changes |
| R2 | `App.js` anchor lines drift before Gate 4 | LOW | Entry verification re-checks the 2 anchor lines only |
| R3 | 4-call shell load slower than today's 3 | LOW | `allSettled` parallel; board ~2 KB; In-House N folio calls lazy (first open of In-House tab) |
| R4 | Board↔In-House join misses when `roomNumber` ≠ `tableNo` format | MED | Unit test on join; fall back to no HK badge (never wrong action) |
| R5 | `getCancelledReservations` duplicates `ops.cancelled` | LOW | Probe at Gate 3 with a cancelled booking in window |
| R6 | New localStorage key collides / R8 | LOW | Namespaced `mygenie_fd_room_density`; never rename existing keys |
| R7 | CR-365 (HK tasks) ships UI on old `RoomStatusPage.jsx` only | MED | Flag at CR-365 Gate 2; FU-385-C checklist includes "HK task UI present in RoomsPanel" |
| R8 | "Channel Manager" string leaks into new UI | LOW | Grep-guard: `grep -rn "Channel Manager" components/pms/frontdesk pages/pms/FrontDeskWorkstationPage.jsx` → 0 |
| **R9** | **Duplicate drift** — fixes land on `CheckInPage.jsx` / `RoomStatusPage.jsx` / panels' source pages during beta but not on copies | **HIGH** | Each copied file carries header `// CR-385 COPY-OF <source> @ <git sha> — mirror fixes until FU-385-C`; FILE_OWNERSHIP rows for source pages get a "MIRROR → frontdesk/*" note; FU-385-C step 1 = diff |
| R10 | Beta page reachable but not discoverable (OD-385-14 b) | LOW | Owner shares URL with testers; BETA badge in header |
| R11 | Two Front Desk entries confuse staff (OD-385-14 a) | LOW | Label "(Beta)"; remove at cutover |
| **R12** | **Money path copied** from `PmsCheckoutDrawer` into `FolioCheckoutPanel` (pay payload, BUG-386 `room_gst_tax`, BUG-425 balance override, print) | **HIGH** | Copy verbatim with `// CR-385 COPY-OF PmsCheckoutDrawer.jsx L128–172` markers; Gate 3 verification inherits CR-358-P3 V-checks + BUG-386/425 tests; QA does 1 end-to-end room checkout with GST + advance + F&B; any formula change → upgrade to CRITICAL |
| R13 | `CollectPaymentPanel` assumes drawer width/scroll context | MED | Host in a 480 px column (same width as today's drawer); check at 1024 px in mockup (Q11) |
| R14 | Print Folio expectation vs CR-364-PRINT backend block | MED | Button visible-disabled with tooltip "Print folio — pending backend"; flag dependency in Gate 3 plan and in the backend brief |

---

## 8. Stale-doc flags (R1 — code is truth)

| Doc | Claim | Reality | Action |
|---|---|---|---|
| `impact/CR-385_DATA_INVENTORY.md` §A | "Not available on the row: outstanding balance" | LR rows *have* `balance_payment`, but unreliable (§4.6) | Amend wording: "present but not authoritative" |
| `change_requests/BUG-385_*` | `no_show_count` missing from `dashboard-kpis` | Probe: `today.no_show_count: 0` present | OPEN_GAPS entry OG-PMS-017 — BUG-385 may be backend-resolved; re-verify at CR-363 |
| `roomStatusTransform.js` | — | board rows carry `hk_assignee` (unread) | Note for CR-365 (not CR-385) |
| Intake §Blast Radius | 6 existing pages edited, `App.js` re-point | OD-385-12: **no existing page edited**; `App.js` +2 lines (new route) | Corrected here (Rev 2) |

---

## 9. Phase 2 (backend aggregation) — inventory carried forward (brief on Gate 2 close)

| Spot | Calls today | Ask |
|---|---|---|
| Shell load | 4 parallel | `front-desk-snapshot` |
| In-House + Departures balance | N folio calls each | authoritative `balance_due` on LR rows (§4.6 evidence attached) |
| Mark All Clean | N sequential PATCH | bulk PATCH |
| HK state of occupied rooms | client join board↔rows | `room_display_status` on LR room lines |
| Live updates | none | BQ-385-01 PMS socket events |

---

## 10. Gate sequence (owner-locked 2026-09-17 — each needs explicit owner close)

| Gate | Deliverable | Status |
|---|---|---|
| 1 Intake | intake doc | CLOSED 2026-09-16 |
| **2 Impact Analysis** | this doc (Rev 2.2) + backend brief | **CLOSED 2026-09-17** · brief: `backend_briefs/BACKEND_BRIEF_CR-385_2026-09-17.md` |
| 2.4 UX flow | low-fi boxes-and-arrows, click paths, what stays visible per tab | NEXT |
| 2.5 Design freeze | `public/cr385-frontdesk-mockup.html`, 40 rooms, MV-01…MV-09 switches, 1440 + 1024 | after 2.4 |
| **2.6 IA re-validation (HARD GATE — owner 2026-09-17)** | re-open this IA against the frozen design: file list, line refs, risks, copied-code inventory, R12 money path; owner must explicitly close before any planning | after 2.5 |
| 3 Implementation plan | edit-by-edit, verification matrix | after 2.6 |
| 4 GO → 5a code → 5b QA → 6 smoke | — | — |

---
*Planning complete (Impact Analysis, Rev 2.2). GATE 2 CLOSED 2026-09-17. Code reality NONE. Risk HIGH. Files: 13 NEW + App.js (+2) + Sidebar.jsx (+1). Existing pages edited: 0. Locked: OD-385-12/13/14/10/11/15. Open for mockup: MV-01 (revised) … MV-09. Hard gate 2.6 (IA re-validation) added before Gate 3.*
