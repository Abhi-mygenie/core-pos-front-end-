# CR-385 — Design Decisions (Gate 2.5 FREEZE)

```
Frozen:   2026-09-18 — owner: "more or less I am okay with the design … close this gate, start impact analysis"
Amended:  2026-06 — Gate 2.6 §D (D1–D8) after owner answers Q1–Q6 + D-1/D-2; mockup v2.7 (= final D1)
Mockup:   frontend/public/cr385-frontdesk-mockup.html (v2.6)  ·  Checklist: plans/CR-385_DESIGN_GAP_CHECKLIST.md
Rule:     Any change to this list after freeze = re-open Gate 2.5 + re-run Gate 2.6.
```

## A. Fixed behaviour (owner-decided, not switches)
| # | Decision |
|---|---|
| F1 | **One interaction pattern: expand in place** below the row / tile. One open at a time. Sticky header (title · ✕). Footer with actions. `Esc` closes. |
| F2 | ~~**Check Out = Folio.** One `Check Out` button → statement … Footer `[Print] [Extend Stay] [Collect ₹X & Check Out]`; ₹0 → `[Check Out]`. One Print. No "Folio" button anywhere.~~ → **superseded by D1 (Gate 2.6)** |
| F3 | **Common guest row** (Arrivals / Departures / In-House): Room · Guest (name · booking · masked phone · SR ● · CRM ✔) · Source · Check-in (+relative) · Check-out (+nights) · Guests · ₹ · Status · Action. |
| F4 | **Row actions**: Arrivals `Check In` + ⋮ (Modify / No-Show / Cancel); expired-stay row → `Mark No-Show` (disabled + tooltip for non-OTA until BQ-385-04) + `Cancel`. Departures & In-House: ~~`Check Out`~~ **`Bill` (D1)** `· Request HK/Mark Clean · Extend` (3 buttons, both widths). |
| F5 | **Tab strip 60 px**, two lines, Rooms 2× wide, sub-line items are links → tab + chip; red left edge when late/overdue/OOO > 0; `N free` always visible; no "upcoming"/"outstanding" on tiles; ~~Rooms trend hint `yesterday X%` (hidden 1024)~~ **→ D4: hidden in v1 (Phase 2 / BQ-385-02)**. |
| F6 | **Chips**: Arrivals Late · Today · Tomorrow · Upcoming; Departures Overdue · Today · Tomorrow · Upcoming; In-House All · Arrived today · Leaving today · Stayover; Rooms All · Available · Occupied · Booked · HK · OOO. |
| F7 | **Alert bar**: only non-tile items (expired late stays, overdue ≥ 1 day, HK > 2 h, OOO ≥ 1 day), max 3 + "+N"; click → tab + chip + row expanded; no dismiss. |
| F8 | **Global header search** (380 px, centred): room / guest / phone (last digits) / booking; grouped In-house · Arriving · Departing · Rooms · Recent; select → tab + chip + row expanded; tables filter while typing; `/` focuses, `Esc`/✕ clears; "Search past guests in Reservations ↗" footer. |
| F9 | **Header**: `Good <part of day>, <first name>` + date ~~· shift since~~ **(D3: dropped)**; user menu (role · handover note · switch user · sign out); one button `● synced X min ago ↻` (tooltip last refresh); `+ New Booking`. No property name, no BETA badge. |
| F10 | **New Booking in place** (scope added 2026-09-18): header → top of current tab; `Book Room` tile → under tile, room preselected. 3 columns Guest · Stay · Room & amount (picker filtered by type + dates; HK greyed with duration; reserved struck-through; rate hint, GST, total). `Save booking` → Arrivals; `Save & Check in now` → morphs into Check-In. Walk-in button removed. |
| F11 | **Check-In expansion**: Who · Stay · Room & amount (clean-rooms picker) · Guest IDs **per adult** (front/back capture) · Advance & note; late multi-night shows remaining nights; footer `[Cancel] [Collect ₹adv & Confirm Check-In]`. |
| F12 | **Rooms tab**: Comfortable/Compact density (persisted) · group by number/type · tile expands to state-specific detail (available: ready since / rate / next arrival / last guest; booked; occupied; HK duration + assignee; OOO days + reason) with actions; `Mark All Clean` expands a confirmation listing clean / skipped rooms; Auto-HK pill. |
| F13 | **No redirection** for any action inside a tab (incl. Rooms tile Check Out / Check In / Book Room). Intentional "go to": tile links, alert items, search results. Accepted page navigations (review FU-385-D): reports link, "view ↗" cancelled/no-shows, "past guests". |
| F14 | **States**: reservations fail → whole page error + Retry; board fails → Rooms tile "—", HK badges hidden, Rooms panel retry, other tabs work; first load → skeleton rows. |
| F15 | **Post-checkout toast** `Checked out · Room N · [Print bill]` ~~`[Undo 10 s]`~~ **(D1: Undo dropped — no backend un-checkout)**; footers `Cancelled today · No-shows today` (Arrivals), `Checked out today → reports` (Departures). |
| F16 | Column headers **sortable** (▲▼), **sticky**; keyboard `↑↓ Enter` on rows. |

## B. Switch values frozen (★ defaults kept unless noted)
| Switch | Frozen |
|---|---|
| MV-02 Check-In pattern | **expand in place** (side/overlay were compare-only) |
| MV-04 HK indicator | badge on row + HK chip on Rooms |
| MV-05 mini KPI rows | dropped |
| MV-06 Rooms tile number | occupancy % (backend `occupancy_percent_physical`) |
| MV-07 alert dismiss | none |
| MV-08 board layout | RS-A tiles (RS-B rows kept as density-like option? → **No**: frozen RS-A; RS-B dropped) |
| MV-09 grouping | room number default, type toggle available |
| Width | 1440 primary, 1024 supported (two-column Check Out preserved; Rooms 4/8 cols) |
| Density default | Comfortable |

## C. Parked (not in CR-385)
FU-385-A sidebar re-point · FU-385-C cutover/retire old pages · FU-385-D review all other screens · FU-385-E guest notes · FU-385-F bulk-select rooms · FU-385-G late checkout by hours · FU-385-H date navigation · Phase 2 aggregation (BQ-385-02) · sockets (BQ-385-01).

## D. Amendments (Gate 2.6 — owner answers to IA Rev 3 Q1–Q5, 2026-06)
Mockup bumped to **v2.6** (`frontend/public/cr385-frontdesk-mockup.html`). Frozen rows above are struck, not rewritten.

| # | Replaces | Amendment | Why |
|---|---|---|---|
| D1 | F2, F4, F15 | **Bill expansion = Layout B (owner-approved 2026-06, final).** Row button `Bill` (Departures / In-House / Rooms tile) opens the expansion; it does **not** check out. Both columns share a fixed 560 px height (viewport-clamped). **LEFT — statement, own scroll:** Guest & stay · **ROOM** card: booking amount (nights × rate) → **Room discount** control (same pattern as F&B: `None ▾ / % / ₹ flat / preset categories` + value box + optional reason; **backend has no room-discount field → BQ-385-07 raised; control ships DISABLED with tooltip until the API accepts it**) → lodging GST (recalculated on the discounted base) → room total → advance paid → other room payments → **room balance** · **TRANSFERRED ORDERS** card: order ids + amounts (incl. GST) → **transferred balance**; no items (feature being retired). No "Balance due" card on the left. **RIGHT — `CollectPaymentPanel` (room mode) embedded, existing structure, top-to-bottom:** header `🍽 F&B BILL · Room orders (n)` + `Print Bill` → *(scrolls)* **🎛 ADJUSTMENTS**: 🏷 Discount `None / % / ₹ / presets` + value + reason · 🎟 Coupon + Apply · ☐ Loyalty (tier · pts · ₹ discount · earn line) · ☐ Wallet (disabled when ₹0) → **📋 BILL SUMMARY (computed, read-only)**: items · Item total · − Discount · − Coupon · − Loyalty · Subtotal · TAXES (CGST · SGST · Round off) · Room orders total → *(pinned, never scrolls)* **SETTLE**: `Room orders (F&B) + Room balance + Transferred = GRAND TOTAL (incl. GST)` · payment tiles Cash / Card / UPI / Credit (one payment for everything) · Received · Reference · **`Checkout ₹X`** always visible. The panel's 3 collapsible section rows (Room / Transferred / Room Orders) are **hidden** (Q6 → see IA §7). **No Split Bill** (`onOpenSplitBill={null}`, as today). Shown even at ₹0. No footer, no Extend inside the expansion. **Undo dropped**; toast `Checked out · Room N · [Print bill]`. Cashier rule: **left = explain; right = adjust → verify → collect.** | Owner iterated 4 rounds (2026-06): real bill breakup not placeholder → no repetition → left scroll / right fixed → F&B bill on the right with adjustments (flat/%/custom discount, coupon, **loyalty**) exactly like the restaurant panel, room + transferred on the left, single payment. Backend has no un-checkout API (R16). |
| D2 | F1 (scope note), OD-385-12 | **Extend / Modify / Cancel / No-Show reuse the 4 existing dialogs via a new `inline` prop** (`ExtendStayDialog`, `ModifyBookingDialog`, `CancelBookingDialog`, `NoShowDialog`). `inline` omitted → today's overlay, old pages unchanged; `inline` → same body rendered without the overlay inside the expanded row. **OD-385-12 exception (owner-approved):** these 4 files may receive a wrapper-only edit (~5 L each, no logic lines). No copied form bodies. | Owner: "we need clean code". Removes 4×110 L duplicates and the R17/R21 drift risk. |
| D3 | F9 | `shift since` **dropped** from header and user menu. | Login time is not stored anywhere; owner chose (c). |
| D4 | F5 | Rooms tile trend hint `yesterday X%` **hidden in v1**; add with BQ-385-02. | Would need a second `dashboard-kpis` call per refresh. |
| D5 | — | **Gate 3 spike approved (½ day, throw-away):** scratch route with a dummy `GuestTable`, one `ExpandableRow`, real `CollectPaymentPanel` in a 560 px box; verify collapse / inner scroll / Checkout visible / sticky `<th>` / `↑↓ Enter`. Evidence → `memory/evidence/CR-385/spike/`; scratch code deleted, nothing stays in `src/`. | R15 / R19 — prove the container before writing the Implementation Plan. |
| D6 | — (code reality) | **Adjustments visibility kept as today (owner D-1 = a).** `CollectPaymentPanel` L1330 hides the whole Adjustments block in room mode when the room has **any transferred order** or **no room-order items**. Accepted: transferred orders are being retired, so this resolves itself; until then no F&B discount / coupon / loyalty at checkout for a guest with a transferred order. **No edit** to the panel for this. | Owner: "d1 a". |
| D7 | — (dependency) | **Loyalty requires a CRM customer (owner D-2 = ok).** Panel looks up points by the guest phone already passed in room mode (`buildCustomer`); guests not in CRM see no loyalty row. Accepted. | Owner: "d2 ok". |
| D8 | mockup | **Mockup updated to v2.7 = final D1** (owner approved 2026-06: "go ahead and modify design"). Layout A/C removed; right = 🎛 Adjustments (Discount None/%/₹/Staff-10% + value + reason · Coupon + Apply · ☐ Loyalty Bronze 168 pts ₹110 · ☐ Wallet disabled) → 📋 Bill summary (items · item total · −discount · −coupon · −loyalty · subtotal · CGST · SGST · round off · room orders total) → pinned Settle; left ROOM discount control rendered disabled + tooltip "needs BQ-385-07". Verified by testing agent (`test_reports/iteration_4.json`). | Owner instruction 2026-06. |
