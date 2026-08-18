# Owner Decision Brief — Insights Audit Batch (explanatory version)

**Date:** 2026-06-11 · Expands Category H of `OWNER_DECISION_QUEUE.md`.
**Items:** BUG-125, 127, 128, 129 · CR-029, 030, 031, 032, 033
**Evidence:** live preprod data Mar 1–Jun 10 2026, Palm House (rid 541) + cafe103 (rid 644). All numbers reproducible via `/app/audit_data/analyze.py`.

---

## H1 — BUG-125: How to fix the empty "Order-Level" cancellations tab

**Today:** When a waiter cancels a whole order, the backend writes `payment_method='Cancel'`. The Cancellations screen checks for the word `'cancelled'` — which never occurs. Result: in 4 months and 559 cancelled-order line items across both restaurants, the "Order-Level" tab matched ZERO rows. Everything piles into "Item-Level", so you cannot tell "we cancelled whole orders" apart from "we removed one dish".

**Options:**
- **a. String patch** — also accept the word `'cancel'`. Fixes the tab. Risk: if backend ever introduces a third spelling, it breaks again silently.
- **b. Status-based** — classify by order status code 3 (= cancelled), the same rule the Dashboard and the order-list engine already use. One rule everywhere; immune to spelling changes.

**Consequence either way:** total cancellation loss does NOT change; rows just move from Item-Level to Order-Level (Palm House May: 97 orders' lines move).
**Recommendation: b** — same correctness, removes a future failure mode.

---

## H2 + H3 — BUG-127: The "Unsettled TAB" tile always shows ₹0

**Today:** The Dashboard has a tile meant to show credit (TAB) money not yet collected. Due to a coding error it can mathematically never be non-zero. You had 86 TAB orders worth ₹49,460 in May — tile said ₹0. Worse: the backend marks every TAB order as "paid" at punch time (see BUG-129), so even a corrected version of the current logic would still read ₹0 from this data.

**H2 options:**
- **A. Redefine the tile as "Credit Outstanding (TAB)"** = total value of all TAB orders in the period. This IS computable correctly today. May would show ₹49,460. Matches the "Added to Credit" tab in the Order Ledger, so the two screens corroborate each other.
- **B. Remove the tile.** No misinformation, but you lose any credit visibility on the Dashboard.
- **C. Keep it and wait for the backend fix (BUG-129).** Tile stays ₹0 indefinitely — not recommended.

**H3 (only if A):** should the tile count TAB orders placed in rooms? The Ledger Credit tab excludes rooms; the Dashboard currently includes rooms in everything. If you want the tile to cross-check against the Ledger tab, choose room-excluded.
**Recommendation: H2 = A, H3 = room-excluded** (so tile ≡ Ledger Credit tab; one number, two screens, always equal).

---

## H4 — BUG-128: Dashboard downloads the same data twice

**Today:** Each Dashboard load makes two identical ~40 MB downloads (Palm House month). The second was *intended* to fetch a wider date window so cancellations of older orders get counted, but that was never built — it's a literal duplicate.

**The question:** confirm we ONLY remove the duplicate (Dashboard numbers stay byte-identical, loads ~2× faster), and the genuinely missing behaviour — "count cancellations of orders punched before the selected range" — is handled later under CR-031 where cancellation logic is being rebuilt anyway.

**Why split it:** removing the duplicate is zero-risk; widening the window CHANGES your cancellation numbers and must go through its own review. Bundling them would hide a number-change inside a "performance fix".
**Recommendation: yes** (dedupe now, window change in CR-031).

---

## H5 — BUG-129: Backend marks TAB credit orders as "paid" at punch

**Today:** All 460 TAB orders (both restaurants) carry the "paid" status code from the moment they're punched, before any money arrives. This single backend habit is WHY Sales/Payments/Dashboard show ₹1.71L (Palm House) of uncollected credit as revenue. The backend's own daily report contradicts its own stamp (it calls TAB "unpaid revenue" until settled). Only the backend team can change this.

**The question is sequencing, not whether:**
- **a. I draft a one-page technical brief → you forward to the backend team → frontend work continues meanwhile** using the data as-is (TAB-aware gates can be built on `payment_method='TAB'` which is reliable).
- **b. Freeze all TAB-related frontend work until backend answers.** Safer-sounding but blocks BUG-127, parts of CR-030/CR-032 for an unknown duration.

**Important caution either way:** if backend DOES change the stamp later, every screen that counts "status = paid" will drop TAB from revenue overnight (May: −₹49,460). That change must be coordinated with us, not shipped unilaterally — the brief will say so explicitly.
**Recommendation: a.**

---

## H6–H10 — CR-029: Rooms in some reports, not others (biggest ₹ distortion)

**Today:** You run rooms. Room order revenue (Mar ₹1,78,172) appears in Dashboard and Items & Menu but NOT in Sales, Payments, or the Order Ledger. So Dashboard says March = ₹13.47L while Sales says ₹11.69L, and both are "right" by their own hidden rule. Nothing on screen tells you the rule exists. Card payments look ₹1.4L higher on Dashboard than on Payments for the same month.

**H6 — pick the default scope:**
- **a. Rooms EXCLUDED everywhere** in restaurant Insights. Rooms already have their own dedicated screen (Room Orders Report) — that becomes the one place for room money. After this: Dashboard March drops from ₹13,46,993 to ₹11,68,821 and finally EQUALS Sales. Items & Menu also drops to match. You must be comfortable seeing Dashboard numbers go DOWN — nothing was lost, it moved to the Rooms screen.
- **b. Rooms INCLUDED everywhere.** Sales/Payments/Ledger rise by the room amounts instead. Total-business view per screen, but the restaurant-operations picture (what did the kitchen+floor do) gets blended with hotel folio flows, and Ledger tabs get room rows they were deliberately built to exclude.
- **c. Per-screen toggle.** Most flexible, most work, and risks recreating today's confusion if people forget the toggle position.

**H7 — how to show the rule:** a static badge on each screen header ("Excludes room orders") vs an interactive include/exclude switch. Badge = clarity with zero risk; toggle = power-user feature, more QA.

**H8 — `transferToRoom` orders** (bill moved to a room folio): are they "room money" (exclude with rooms) or restaurant money? Today they're inconsistently BOTH: counted inside Sales revenue, excluded from the Ledger Paid tab. Whatever you choose, both screens will follow it.

**H9 — data edge:** 4 orders have payment method "ROOM" but no room flag. Treat them as room orders? (Recommend yes — payment method is the stronger signal.)

**H10 — if rooms are excluded (H6=a):** the Dashboard "Room" channel slice in the channel-mix donut becomes empty. Remove it and link to the Room Orders Report instead?

**Recommendation: H6=a, H7=badge, H8=room-scope, H9=yes, H10=yes.** Outcome: every restaurant screen agrees with every other; rooms have one authoritative home.

---

## H11–H17 — CR-030: "When is money counted?" (the #1 reason reports don't agree)

**Today:** Insights screens count an order on the day it was PUNCHED. Settlement and the backend Order Summary count it on the day money was COLLECTED. With your real data: Jun 3 — punch view says ₹7,838; collection view says ₹24,892. One real order was punched May 16 and collected Jun 8: Sales put it in May (a closed month), Settlement in June. Neither is a bug taken alone — the module just ships both definitions with no label.

**H11 — the business definition (only you can answer):** when you ask "what did we sell on Tuesday?", do you mean
- **a. what was billed/punched Tuesday** (operations view: what did the kitchen produce) — daily totals are stable forever once the day closes, but won't match the cash drawer/settlement;
- **b. what was collected Tuesday** (cash view: what hit the drawer/bank) — matches settlement, but a slow-paying table can move revenue into a later day/month.
Most restaurant chains keep BOTH but label them; the cash view is what accountants reconcile.

**H12 — how to ship it:** a single canonical basis everywhere (simplest mental model, but you permanently lose the other view), or a labelled toggle "By punch date / By collection date" on each screen (both views, explicit; slightly busier UI). Recommendation: toggle.

**H13 — TAB inside this:** is a TAB (credit) sale revenue when punched, or when the customer finally pays? Backend already says "when paid" (its daily report holds TAB out of paid revenue until settlement). Recommending the same so Insights stops disagreeing with the backend.

**H14 — the 1 a.m. order problem:** your business day runs 06:00→03:00. 42 May orders were punched after midnight. Today the daily table shows them under the NEXT calendar date (a 1 a.m. order from Friday-night service shows under Saturday). Should daily rows follow the business day (Friday) instead? Recommend yes — that's how your staff thinks about "last night".

**H15 — plumbing pre-approval:** two confirmed correctness defects exist in collection-mode fetching (orders punched before the range but paid inside it get dropped; collections between midnight and 03:00 after the range-end are never fetched). Fixing them changes no UI — approve as Phase 1? Recommend yes; without it any "collection" numbers are unreliable.

**H16 — rollout surface:** all 9 report screens at once, or core 5 first (Sales, Payments, Dashboard, Items, Ledger)? Recommend core 5 — Kitchen Ops / Food Court / Rooms / Cancellations have weaker need and bigger edge cases.

**H17 — default position of the toggle:** "punch" keeps every current number identical on day one (zero surprise); "collection" makes screens match settlement immediately (numbers shift on day one). Recommend punch as default, switch later if you prefer.

---

## H18–H23 — CR-031: One truth for cancellation losses

**Today:** Dashboard and the Cancellations report compute "money lost to cancellations" with different formulas, different date rules, and different counting. May: report says ₹82,465, Dashboard says ₹72,012. Both are shown to you as facts.

**H18 — money basis:** value each cancelled line as its real line value (price+tax after discount) — robust; OR use the order's header amount — broken for partial cancellations (real case: header said ₹120 while ₹10,680 of items were cancelled, because backend rewrites the header after cancelling). Recommend line value.

**H19 — the partial-cancel case explicitly:** when half an order is cancelled and the header amount no longer matches, is "loss" the cancelled items' worth (₹10,680) or the header delta (₹120)? Recommend cancelled items' worth, AND we flag the header-rewrite as a backend data bug.

**H20 — counting:** 1 cancelled line with qty 4 = four cancelled dishes (qty) or one cancellation (line)? Dashboard counts lines, report counts qty — pick one. Recommend qty (it's what the kitchen threw away).

**H21 — date + window:** attribute a cancellation to the day it was CANCELLED (`cancel_at`), and also fetch a slightly wider window so cancels of orders punched before the range still count (today the Dashboard silently misses those). Or keep today's punch-day attribution. Recommend cancel-day + wider window — that's "what did we lose this week" as a human means it.

**H22 — freebies:** if a complimentary (free) or 100%-discounted item is cancelled, did you "lose" money? Recommend no (zero net loss) — today they're partially counted.

**H23 — data hygiene question for you:** cafe103 June has ONE cancelled order of ₹1,02,286 (reason "Others") that dominates June's cancellation KPIs. Was that genuine, or test/operator error? Answer changes how June trends read; no code involved.

---

## H24–H28 — CR-032: One payment classifier instead of three

**Today:** Sales, Payments, and Dashboard each classify payment methods with their own rules, so the same month shows different payment mixes. Concrete: March "partial" payments show as ₹2,268 on Sales and ₹9,858 on Dashboard; "cash_on_delivery" lands in Cash only because the word contains "cash"; a new backend value "pending" (13 orders) is unknown to all three.

**H24 — orders whose bill went to a room folio (`transferToRoom`):** show as their own "Room Transfer" bucket (clear), or grouped under TAB/credit (today's Payments behaviour, muddles two concepts)? Recommend own bucket.

**H25 — ₹0 "paid" orders** (100%-discounted; May had 17): they currently count as paid orders, dragging your average-order-value down and padding order counts. Exclude from AOV+counts / keep / just badge them? Recommend exclude (with a footnote count).

**H26 — `pending`:** until backend explains what it means, keep these out of every paid bucket (they're unpaid status-wise)? Recommend yes.

**H27 — `partial`:** backend knows the real split (e.g., ₹7,710 cash + ₹502 UPI) but the list API gives one lump. Show a single "Partial" bucket now (honest, simple), and separately queue a backend ask for the split so Payments can someday match settlement exactly? Recommend yes to both.

**H28 — final bucket list sign-off:** `Cash · Card · UPI · TAB · Room Transfer · Partial · Zomato Gold · Other(+logged)`. Approve or amend.

---

## H29–H31 — CR-033: Settlement says you sold MORE than any screen shows

**Today:** Settlement report's March "total sale" = ₹15,03,418. The most inclusive frontend number (Dashboard, rooms included) = ₹13,46,993. Even adding cancellations and unpaid orders leaves ~₹1.4L unexplained. We cannot see the backend formula; until it's documented, the Settlement screen cannot be cross-checked against anything.

**H29:** I draft an email-ready brief (combined with the BUG-129 TAB question) for you to forward to the backend team? (yes/no)
**H30:** meanwhile, put a small footnote on the Settlement "Total Sale" KPI — "basis under reconciliation" — so staff don't treat it as comparable to Sales? Costs nothing; removes false confidence. (yes/no)
**H31:** do YOU happen to know if settlement "sale" includes room folio/advance money? Any operational knowledge shortcuts the investigation.

---

## H32–H34 — Batch logistics

**H32 — when:** your POS 4.0 freeze is waiting on the smoke batch S-1…S-9. Pull this audit batch into active work NOW (parallel), or queue it AFTER smoke? Two of these fixes are 1-liners; everything else is multi-day. Recommend: the three decision-free fixes now, the rest after smoke.
**H33 — how we'll prove correctness:** approve the replication harness (`/app/audit_data/` — it reproduces every report's number from raw data, both restaurants) as the official acceptance fixture: "fix is done when harness and screen agree". (yes/no — recommend yes)
**H34 — frozen screens:** Sales/Payments/Cancellations screens are formally FROZEN per the control layer. Amending them requires freeze-log entries. Blanket approval for this batch, or you approve each screen's amendment individually? Recommend per-item (keeps the freeze discipline).

---
*Answers will be recorded verbatim into OWNER_DECISION_QUEUE.md Category H with date. Items whose decisions are locked proceed to Gate 3 (implementation plan) → Gate 4 (code gate + your GO).*
