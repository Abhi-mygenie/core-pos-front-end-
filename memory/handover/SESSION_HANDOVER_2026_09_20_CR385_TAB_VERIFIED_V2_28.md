# CR-385 handover — 2026-09-20 (late): TAB verified · D6 closed · D8 opened · mockup v2.28 · N4 withdrawn

## What happened
1. Backend replied to N6 with the full live FE `order-bill-payment` body (order_id string, payment_mode TAB, payment_status "success", paid_room "yes", zero-filled adjustments, cust_name/cust_mobile). Owner said "settle 1232582 as-is".
2. G1 → 200 "Room payment received via TAB". G2 LR: booking 153 departed, line checked_out/paid, in_house 0. G3 folio: order paid/TAB/delivered; ledger has TAB row 259. G4 board: 8525 hk, unoccupied. Evidence `evidence/CR-385/probes_2026_09_20/g1..g4*.json`, PROBE_REPORT §G.
3. Result: **BQ-385-15 VERIFIED, D6 CLOSED, N6 CLOSED.** New **D8 (P1 money)**: ledger row ₹3,300 for ₹3,490 sent; balance_due / remaining_room_balance not zeroed after departure; advance_payment not updated. **D3+**: folio room_price basis inconsistent (GST-incl. after check-in, pre-GST after extend).
4. N4 re-checked: old board payload already `{auto_hk_on_rm_checkout, rooms}` (probes_2026_09_19/board.json); new adds `meta` only. `fromRoomStatusBoard` run on both payloads → correct. **No hot-fix, no BUG intake, zero src/ changes.** D48-d corrected in DESIGN_DECISIONS.
5. Mockup **v2.28** (D48-c): B2B removed from New Booking (draft keys, toggle, GST inputs, GST progress chip, Bill-to line) → one note `booking-b2b-note`. Check-In untouched. iteration_30 PASS (all flows, no-scroll invariant, 0 JS errors).

## State
- Gate 2.6 OPEN (owner has not said "close Gate 2.6"). Design locks: Checkout v2.10 · Check-In v2.17 · Booking **v2.28** · Extend v2.20 · Modify v2.21 · Room detail v2.25 · Split/Credit v2.27.
- Open backend defects (MASTER §8): D1 upgrade 422 · D2 advance lost at check-in · D3(+) folio GST basis · D4 extend under-charges · D8 TAB ledger amount/balance · BQ-385-16 ₹0 pricing (all money) · D5 empty check-in response · D7 room-move HK. Money surfaces blocked; non-money buildable (counts/business date, Rooms board, No-Show/Cancel, Modify dates, terminology).
- Sandbox-pms: no in-house stay; 8524/8525 in HK.
- Stale figure warning: `?bill=103` grand total = ₹6,152 since v2.26 (older docs say ₹2,677).

## Next
1. Send MASTER v1.4 §8 (D8, D3+) to backend; await fixes for D1–D4, D8, BQ-16 → re-run E2E (book → check-in w/ upgrade → extend → TAB) by curl.
2. Owner: "close Gate 2.6" → Gate 3: D5 spike (CollectPaymentPanel in a 560 px `<td>`), module plan M0–M6.
3. Non-money build can start once 2.6 closes: tab counts + business_date (BQ-385-12), No-Show/Cancel EITHER/OR, Modify dates with preview.
4. B-7: owner/QA smoke of 21 open bugs on shared files; BUG-384 closable (backend: wrong FE body).

## Addendum — build 2 re-check (same day, ~10:30)
- Ran the backend's `reblock_fe.md` plan (§0–§6) via `evidence/CR-385/probes_2026_09_20_gate4/run_gate4.py <cin> <cout> <cout2> <suite_table> <dest_table> <step>`; report in that folder.
- Fixed: BQ-16, D1, D2, D3, D5, D6. Open: D8. New: D9/D10 (upgrade carved out of rate + GST slab drop — P0 money), D11 (plan body 500 + non-atomic), D12 (same-room extend 409 self-conflict — P0), D13 (move 500 regression — P0), N7 (future-dated check-in). D4/D7 unverifiable until D12/D13 fixed.
- Next re-run after build 3: same runner; use the real FE check-in body (already in the script); pick a suite table free for the window; after the extend/move fix verify D4 (`booking_charge = rate × nights + upgrade`), D7 (dest occupied, origin hk), D8 (ledger row = amount sent, `balance_due` 0 after departure).
- Gotchas: token is single-session (each login kills the previous one — re-login before curls after running the script); sandbox is shared; Aiosell has a rate for every date (use an unknown rateplan_code for the 422 case).

## Addendum 2 — build 3: ALL GREEN (same day, ~13:50)
- Re-ran the lifecycle with `probes_2026_09_20_gate4/build3/run_gate4.py` (steps 1,2,3 _febody,4,6) + `build3/d11/` with `OMIT_BOOKING_FOR=1`. Every item passed; see PROBE_REPORT build-3 section. Backend side is done for Phase 1.
- Frozen for coding: D50 money contract. Owner to answer N7/N8/N9 and say "close Gate 2.6"; then Gate 3 = D5 spike + module plan M0–M6.

## Addendum 3 — IA Rev 4 + master checklist (2026-09-20)
- Read first: `impact/CR-385_IMPACT_ANALYSIS_REV4_GATE_2_6_FINAL.md` (§0 alignment, §2 gaps, §4 blockers, §7 verdict) and `/cr385-master-checklist.html` (§O = open owner decisions with defaults).
- Owner rule: never flip a gate; wait for the literal words "close Gate 2.6" / "close Gate 3" / "Gate 4 GO". Present O-1..O-7 as plain yes/no questions, one message.
- After "close Gate 2.6": Gate 3 = P-02 spike → P-03 mechanism → P-04 implementation plan (M0→M6 order; M3–M6 gated by B-7 smoke §S) → owner "close Gate 3".
