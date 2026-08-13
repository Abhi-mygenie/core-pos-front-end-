# CR-011 — Owner Feedback Log (Insights Smoke — Session 2026-06-17)

**Role:** SMOKE FACILITATOR (note-taking only; no code, no edits)
**Owner:** Owner (Owner) #644
**Account used for screenshots:** preprod, restaurant-pos-app-6.preview.emergentagent.com
**Date range mostly seen on screen:** 01-05-2026 → 31-05-2026 (May) — Item Ledger / Hourly using 01-05 → 17-06-2026

**Status of this log:** CLOSED — all 10 feedback items have owner decisions. Ready for planning phase.

---

## F-1 — Variation Sales Breakdown shows `[]` as a label
**Screen:** S15 — *Variation Sales* tab inside Item Ledger / `/reports-module/items` (S5 Hybrid) → Variations sub-tab
**Status before feedback:** ✅ FROZEN 2026-06-16 (Batch B). This feedback **re-opens** it.

**Observation (verbatim):** *"variations reports [] ? its not clear this array"*

**What's on screen:**
| VARIATION | ITEMS | QTY SOLD | REVENUE |
|---|---:|---:|---:|
| `[]` | 157 | 2,409 | ₹9,49,783.61 |
| `single` | 41 | 614 | ₹1,86,921.15 |
| `multi` | 1 | 25 | ₹15,757.35 |
| **TOTAL** | **199** | **3,048** | **₹11,52,462.11** |

**Issue:** The first row shows `[]` (literal empty-array string) as the variation label.

**Suspected cause (to confirm in investigation):** Backend `variations` field is returning `[]` (empty array) for items that don't carry variations; FE is stringifying it directly instead of treating "no variation" as the "Default" / "Base" / blank bucket. 157 items contributing ₹9.49 L (~82% of revenue) sit in this bucket — too significant to display as a literal `[]`.

**Proposed FE labels for the no-variation case (ask owner which one):**
- "Default" / "Base"
- "—" (em dash)
- "No Variation"
- "Standard"

**Effort estimate:** Trivial FE-only — 1 line in the bucket assignment in `ItemSalesHybridMockup.jsx` Variations tab.

---

## F-2 — Add a BREAKFAST time bucket (08:00–11:00) to Hourly Sales KPIs
**Screen:** S12 — *Hourly Sales Curve* → `/reports-module/hourly-sales`
**Status before feedback:** 🟠 Awaiting owner Gate ② (built, not signed off). **Within scope** of the Gate ② review.

**Observation (verbatim):** *"can we have breakfast added 8 to 11"*

**What's on screen:**
- KPI cards: PEAK HOUR · LUNCH (11–15) · DINNER (18–23) · ACTIVE HOURS · AVG / ACTIVE HOUR
- Lunch bucket is 11–15 → 4 hours · 27.8% share
- Dinner bucket is 18–23 → 6 hours · 49.7% share
- No "Breakfast" bucket today

**Owner ask:** Add a BREAKFAST KPI showing revenue and % share for hours **08:00–11:00** (3 hours), alongside Lunch and Dinner.

**Open questions to confirm before implementation:**
- Time-bucket boundaries final = `breakfast: 08–11`, `lunch: 11–15`, `dinner: 18–23`? — owner to confirm
- Should the "11" boundary belong to Breakfast or Lunch (it's currently Lunch's start)? Recommend `[08, 11)` for Breakfast and `[11, 15)` for Lunch — no overlap.
- Any owner preference for a 4th bucket (e.g., "AFTERNOON 15–18", "LATE NIGHT 23–02")? Currently 15–18 and 23–08 sit in "Other".

**Effort estimate:** Small — add 1 KPI card + 1 derived sum in the same component. No backend change (the data per hour is already in `insights-sales.hourly[]`).

---

## F-3 — "Showing zero revenue / 68 percent" — NEEDS CLARIFICATION
**Suspected screen:** S14 — *Channel & Payment Analysis* → `/reports-module/channel-pivot`
**Status before feedback:** 🟠 Awaiting owner Gate ②

**Observation (verbatim):** *"showing zero revenue /68 percent"*

**What I can see on screen 3:**
- *Revenue by Channel* donut: Dine-In 96% (orange), Delivery + Takeaway tiny slivers
- *Revenue by Payment Method* donut: UPI 51%, Cash 29%, Card 16%, plus Partial / Credit / Zomato Gold slivers
- Tooltip visible: `₹0 · 684 orders · 28.7% of total` — this is the **Partial** segment

**Reading 1 — most likely:** "Zero revenue but 28.7% of orders" → that's the **Partial Payment** segment showing 684 orders (28.7% by count) but **₹0 revenue** — which is the **BE-1 partial-payment-leg gap** I flagged earlier in the investigation report. Backend does not currently split partial payments into cash/card/UPI legs, so the FE shows them as a single bucket with ₹0 revenue (or sometimes the full amount on a single random bucket). Cannot be fully fixed FE-only until backend BE-1 ships.

**Reading 2:** "68 percent" might be 96% (Dine-In channel share, I misread the typo) — if so, owner is OK with it / asking why so dominant — informational, not a defect.

**Reading 3:** Some other 68% figure on a screen not visible in the screenshots.

**Action:** **Ask owner to confirm** which they meant. If Reading 1 → register backend brief / cross-reference BUG-tracker for BE-1 (already open). If Reading 2/3 → ask for screen URL and exact tooltip.

---

## F-4 — Explain complete logic of "Prep & Serve Time" (Kitchen Ops)
**Screen:** S10 — *Prep & Serve Time* → `/reports-module/kitchen-ops`
**Status before feedback:** ✅ FROZEN 2026-06-07 (Phase 2). This is a **logic walkthrough request**, possibly also a defect on Takeaway "0 min HANDOVER" (owner circled it in blue).

**Observation (verbatim):** *"need to understand complete logic of screen shot 4"*

**What's on screen (Performance by Channel section):**

| Card | Status | PREP | SERVE / DISPATCH / HANDOVER | TOTAL | Orders |
|---|---|---:|---:|---:|---:|
| **POS** | 🔴 Critical | 35 min | 23 min (Serve) | 40 min | 1,870 |
| **Delivery** | 🔴 Critical | 39 min | 17 min (Dispatch) | 29 min | 34 |
| **Takeaway** | 🟠 Needs Attention | 18 min | **0 min (Handover)** ← owner circled | 18 min | 29 |

Plus footer cards: SLOWEST HOUR 11:00 · FASTEST HOUR 22:00 · SLOWEST DAY 19/05/2026 · BEST DAY 15/05/2026.

**Likely questions inside "explain the complete logic":**
1. **Stage definitions:** What exactly is PREP vs SERVE vs DISPATCH vs HANDOVER?
2. **Status thresholds:** What triggers `Critical` vs `Needs Attention` vs (good)? Currently per the freeze log it's *"timestamp-based classification"* — but the exact min-threshold is not surfaced in the UI.
3. **Takeaway HANDOVER = 0 min** — defect or by-design? Two hypotheses:
   - **By design:** For takeaway there's no "dispatch", and "handover" is the moment the customer picks up = `ready_at` → `served_at` delta which may genuinely be ~0 if the cashier marks both at once.
   - **Defect:** `served_at` not being captured for takeaway and FE is computing `0` instead of "—" / "N/A".
4. **TOTAL = PREP + SERVE?** For POS 35 + 23 = 58, but TOTAL shows 40 → so it's clearly NOT a simple sum. Likely it's `created_at → completed_at` end-to-end, while PREP/SERVE are component p50s computed independently.
5. **Outlier cap:** Per the freeze log we cap at 120 min. Owner may want this surfaced as a tooltip.

**Action:** Write a short *"how this report computes"* explainer (FE-only, info tooltip + Definitions panel) — the data semantics live in `PrepServeTimeMockup.jsx` and the freeze-log notes. Once written, send to owner for verification, then add the explainer to `ReportDefinitionsMockup.jsx`.

**Possible spawned bug:** If Takeaway HANDOVER=0 is a defect, file a separate BUG (independent of explainer).

---

## F-5 — Remove "By Station (Sold)" block from Item Ledger
**Screen:** S5 — *Item Ledger* (Hybrid) → `/reports-module/items` → All Items tab
**Status before feedback:** ✅ FROZEN 2026-06-05. This feedback **re-opens** the All Items tab (or at least its sections).

**Observation (verbatim):** *"in item ledger by station is not needed"*

**What's on screen (between KPI strip and the item table):**
- A "BY STATION (SOLD)" table summarising BAR (69 items, ₹2.46 L), BEVRAGE (6, ₹4,420), KDS (109, ₹8.94 L), Unknown (15, ₹7,056).

**Owner ask:** Remove the BY STATION block from the All Items tab.

**Rationale (mine, to confirm):** This is now redundant with the dedicated S18 *By Station* sub-tab (also under Item Ledger) which was frozen on 2026-06-16. Owner doesn't want both.

**Effort estimate:** Trivial FE-only — delete the JSX section in `ItemSalesHybridMockup.jsx` (likely ~20-30 lines in the All Items tab block).

**Open question:** Remove **only** from the All Items tab, or **also** hide it from any other tab that shows a similar summary (Sold tab uses a similar table at the top — confirm)?

---

## Cross-cutting observations
- Owner is currently doing **Gate ② Review** for the Insights screens. So far this is the smoke session triggering revisions for at least 3 screens (S15 — was frozen, S12 — never signed, S5/All-Items — was frozen, S10 — was frozen).
- 2 already-frozen screens are now being asked to revise — that's allowed per the protocol, but each re-open needs an owner-attested re-freeze entry in `/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md` when we're done.
- The Partial-payment / BE-1 issue may surface again on S19 (Cashier Settlement), S20 (Gateway Recon), and S33 (Cashier Activity) — pre-flagged.

---

## Items pending owner reply (before any planning) — ✅ ALL RESOLVED 2026-06-17
1. **F-1:** ✅ Proceed with contract amendment + backend fix + FE defensive remap
2. **F-2:** ✅ Breakfast = **06:00–10:00** (4 integer hours: 06, 07, 08, 09)
3. **F-3:** ✅ Confirmed: Partial Payment segment ₹0 / 684 orders / 28.7% on S14 donut → BE-1 backend gap
4. **F-4:** ✅ DEFERRED — owner: "let it be as it is, will take this later"
5. **F-5:** ✅ Remove BY STATION from **ALL tabs** in Item Ledger

---

## Tracking matrix (will fill as feedback continues)

| # | Screen | Status before | Action type | Re-opens freeze? | Open Q | Priority |
|---|---|---|---|:---:|---|---|
| F-1 | S15 Variation tab | ✅ FROZEN | Display fix (FE-only) | YES | 1 | P2 |
| F-2 | S12 Hourly | 🟠 unsigned | Feature add (FE-only) | NO (Gate ② not done yet) | 2 | P2 |
| F-3 | S14 Channel/Payment (TBC) | 🟠 unsigned | TBD pending clarification | TBD | 3 | TBD |
| F-4 | S10 Kitchen Ops | ✅ FROZEN | Doc + possible defect | YES if defect | 4 | P2 (P1 if defect) |
| F-5 | S5 All Items | ✅ FROZEN | UI removal | YES | 5 | P2 |

---

**Next:** Awaiting more owner feedback. Will append below this section as it comes in.

---

# Batch 2 — Owner feedback received 2026-06-17 (after first 5 items)

## F-6 — Payments page is empty
**Screen:** S8 — *Payments Overview* → `/reports-module/payments`
**Status before feedback:** ✅ FROZEN 2026-06-05 (Phase 2). Owner is questioning whether it's truly working.

**Observation (verbatim):** *"this pays shows emoty"* → Payments page shows empty.

**What's on screen:**
- Title: **Payments** · "Revenue by collection date · incl. room food · credit counted on settlement"
- Date range: **19-05-2026 → 17-06-2026** (30D selected)
- KPI strip is **clipped at top of screenshot** (only edges of 2 KPI cards visible — content not readable)
- "DAILY PAYMENT TRENDS" chart area is **entirely blank** — no lines/bars rendered, only x-axis labels reading `2026-` `2026-` `2026-` (truncated dates) at the bottom
- Legend shows Cash / Card / UPI (3 series expected)

**Suspected causes (to investigate):**
1. **Date range issue:** `19-05-2026 → 17-06-2026` straddles two months. If the API expects same-month range OR the FE chart binding expects ≤30 day ISO buckets, the series may be coming back empty.
2. **Data really is empty for this account in that window:** Possible but unlikely given 30D for an active restaurant.
3. **Series mapping bug:** API returns daily array but FE expects nested `{cash, card, upi}` and gets it as flat (or vice versa) → silent empty.
4. **X-axis truncation as a side-symptom:** "2026-" repeated 15 times suggests dates ARE coming through but values are all `0`/`null` → chart treats as no data.

**Action proposed (read-only investigation):**
- Curl `insights-payments-overview` with same date window for this account → see if backend returns empty.
- If backend has data → FE bug. If backend empty → either real (rare) or backend filter bug.

**Effort estimate:** Diagnostic first (no edit). Fix size depends on root cause — 1 line if mapping, larger if backend filter.

**Open question to owner:** Did Payments work on other date ranges (Today, 7D, MTD)? Have you tried switching to 7D / MTD on the same account?

---

## F-7 — "CHAMPIONS" (and other RFM segments) — logic unclear
**Screen:** S36 — *Customer Intelligence* → `/reports-module/customers-rfm`
**Status before feedback:** 🟠 Awaiting owner Gate ②. **Within scope** of the review.

**Observation (verbatim):** *"where is this champoins etc coming from whats the logic"*

**What's on screen:**
- A KPI card titled **CHAMPIONS** (crown icon, orange) showing the number **7**.
- This is one of multiple RFM segment cards. Other segments not visible in this crop but expected: *Loyal Customers · Potential Loyalists · New Customers · Promising · At Risk · Can't Lose Them · Hibernating · Lost*.

**Logic (RFM — Recency, Frequency, Monetary):**

| Dimension | What it scores |
|---|---|
| **R (Recency)** | How many days since last visit. Lower = better. |
| **F (Frequency)** | How many visits in the period. Higher = better. |
| **M (Monetary)** | Total spend in the period. Higher = better. |

Each customer is scored 1–5 on each axis (quintile-binned). The segment label is then derived from the (R, F, M) triple:

| Segment | Rough rule | Heuristic |
|---|---|---|
| **Champions** | R=4-5, F=4-5, M=4-5 | Recent + frequent + big spenders. The top tier. |
| **Loyal Customers** | F=4-5, any R, M=3-5 | Visit often, may not be the highest spenders. |
| **Potential Loyalists** | R=4-5, F=2-3 | Recent visitors not yet frequent. Cultivate them. |
| **New Customers** | R=5, F=1 | Single visit, very recent. |
| **Promising** | R=3-4, F=1-2, M=1-2 | Recent but low engagement. |
| **At Risk** | R=2, F=3-5, M=3-5 | Used to be valuable, slipping. |
| **Can't Lose Them** | R=1, F=4-5, M=4-5 | High-value customers gone silent — win-back. |
| **Hibernating** | R=1-2, F=1-2, M=1-2 | Old, low-engagement. |
| **Lost** | R=1, F=1 | Long gone, low-value. |

**For palmhouse / current restaurant in May 2026:**
- "CHAMPIONS = 7" means **7 unique customers** scored top quintile on all three RFM axes. Given the date range is 01-05-2026 → 31-05-2026 (single month), F=5 means they visited several times in that month, M=5 means top-quintile spend, R=5 means visited very recently in that month.

**The phrasing on screen does NOT explain this** — owner has every right to ask. The fix is a small "How RFM works" info panel + the exact bin boundaries shown when you hover/click on each segment card.

**Action proposed:**
1. Add info-tooltip on each segment card showing its rule (R/F/M conditions).
2. Add a "How segments are computed" link in the page header (next to *Definitions*) opening a side-panel.
3. Surface the actual quintile thresholds used (e.g., "M=5 means spend ≥ ₹X for this period") — these are dynamic per period, so showing them removes ambiguity.

**Open question to owner:** Want me to also surface the **R/F/M quintile cutoffs for the selected period** (e.g., "in May, M5 = ≥ ₹X, F5 = ≥ Y visits, R5 = last visit ≤ Z days")? This makes the segments fully audit-able by the owner.

---

## F-8 — Top Customers PHONE column is always "—"
**Screen:** S36 — *Customer Intelligence* (same screen as F-7) → Top Customers (25) table
**Status before feedback:** 🟠 Awaiting owner Gate ②

**Observation (verbatim):** *"ph number missing"* — entire PHONE column shown as `—` for every row (owner circled the whole column in blue).

**What's on screen (TOP CUSTOMERS table):**

| NAME | PHONE | VISITS | TOTAL SPEND | LAST VISIT | AVG ORDER |
|---|---|---:|---:|---|---:|
| HPASCS OFFICE | — | 3 | ₹1,66,544 | 2026-05-30 | ₹55,515 |
| Hotel Firhill | — | 43 | ₹34,656 | 2026-05-31 | ₹806 |
| Mr. Manjeet Sharma | — | 2 | ₹33,214 | 2026-05-27 | ₹16,607 |
| THE OBEROI CECIL SHIMLA | — | 2 | ₹22,349 | 2026-05-09 | ₹11,175 |
| Mr. Dogra lodge | — | 30 | ₹20,594 | 2026-05-30 | ₹686 |
| Mr. | — | 1 | ₹15,337 | 2026-05-31 | ₹15,337 |
| MR. SUMMER SINGH | — | 1 | ₹14,043 | 2026-05-07 | ₹14,043 |

**Suspected causes (to investigate via curl on the API):**
1. **Field-mapping bug:** Backend returns `customer_phone` / `mobile` / `phone_number` but FE reads `phone` (or vice-versa) → always falls to "—".
2. **Backend doesn't aggregate phone with the rest:** The customer summary API may give name + spend metrics but never the phone (would need a join).
3. **PII gating:** Some restaurants have phone PII masking enabled — phones returned as `null` to avoid leakage. Less likely given owner is asking why missing.
4. **Genuinely missing data:** Customers like "Mr." and "HPASCS OFFICE" are clearly not properly captured at the POS (no real name even). Many room-tied orders may not have a phone captured at all. But "Hotel Firhill" with 43 visits should have one.

**Action proposed:**
- Curl the `insights-customer-rfm` (or whatever endpoint S36 uses) for palmhouse → inspect the actual JSON: see if `phone` exists for any row and under what key.
- If backend returns it under a different key → 1-line FE mapping fix.
- If backend never returns it → needs backend brief (BE follow-up).
- Side observation: many rows look like room-tied B2B / hotel partners (HPASCS OFFICE, Hotel Firhill, Hotel Dogra, Oberoi Cecil) — these often don't have a personal phone, they have a partner GST / contact. Consider showing a 2nd column like *PARTNER TYPE* (Room Guest / B2B / Walk-in) so the empty phone is contextually understandable.

**Effort estimate:** Diagnostic first. Fix likely 1-5 lines FE if mapping; 0 FE + backend brief if data simply not there.

---

## F-9 — Room Transfer Trail: "FROM ROOM = 0" rows
**Screen:** S31 — *Room Transfer Trail* → `/reports-module/locations-transfers`
**Status before feedback:** 🟠 Awaiting owner Gate ②

**Observation (verbatim):** *"from room shows 0"*

**What's on screen (Transfer Log of 61 rows, first 6 visible — owner circled FROM ROOM = 0 on row 1):**

| ORDER | FROM ROOM | TO ROOM | ITEMS | DATE | TIME |
|---|---:|---:|---:|---|---|
| #011588 | **0** | 5518 | 0 | 2026-05-20 | 17:59 |
| #011599 | 5535 (partially obscured) | 5527 | 0 | 2026-05-20 | 21:26 |
| #011615 | **0** | 5519 | 0 | 2026-05-21 | 14:36 |
| #011620 | **0** | 5518 | 0 | 2026-05-21 | 15:29 |
| #011689 | **0** | 5529 | 0 | 2026-05-22 | 19:56 |
| #011844 | 5521 | 5522 | 0 | 2026-05-24 | 13:41 |

Also note **ITEMS column = 0** for all visible rows — separate concern, possibly the same underlying mapping issue.

**Suspected causes:**
1. **Backend stores `from_room_id = 0` when an order was originally not on any room and was later moved to a room** (i.e., it's not a transfer between rooms; it's an *assignment* from a no-room state). Showing "0" is technically correct but misleading — should render as "Unassigned" / "Walk-in" / "—".
2. **FE coerces `null` / `undefined` to `0`** — if so it's an FE bug. Easy fix.
3. **Backend partial-data row:** an order that genuinely has no source. The display should still not be a literal `0`.

**Action proposed:**
- Curl `insights-room-transfers` for palmhouse to confirm whether the API returns `from_room: 0`, `null`, `""`, or missing for these rows.
- Either FE re-render `0`/`null` as "—" / "(no source)" / "Walk-in", OR push to backend to deliver a semantic value (`source_type: 'unassigned'`).

**Note:** Also worth confirming with owner whether they want these rows shown at all — see F-10 below.

---

## F-10 — "Cafe 103 doesn't have rooms — what is this report showing?"
**Screen:** S31 — *Room Transfer Trail* (same as F-9)
**Status before feedback:** Pre-existing 🟠 Awaiting Gate ② — but this is now a **scope question**, not a display fix.

**Observation (verbatim):** *"cafe 103 doesnt have rooms , what are these reports coming in room transfer"*

**Critical clarification needed:** I had been investigating with the **palmhouse** account (owner@palmhouse.com) per your earlier instruction. The screenshots above show data from **/reports-module/locations-transfers** on `restaurant-pos-app-6.preview.emergentagent.com`. The screenshots look like real palmhouse-style data (61 transfers, 18 transfers, room IDs in 5xxx range — these look like hotel room numbers).

→ **Cafe 103 vs palmhouse:** Which account were you logged in as when taking these screenshots? If palmhouse, then rooms exist there (Palmhouse is a hotel restaurant) and the data is plausible. If you're now testing on a different account (Cafe 103) and seeing palmhouse-style data, that's a **session-bleed / wrong-tenant** bug which is a CRITICAL severity issue and must be investigated immediately.

**Two scenarios:**

**Scenario A — You ARE on palmhouse, but pointing out a design issue:**
Even on a hotel restaurant, the Room Transfer Trail should:
- Hide itself entirely (sidebar + route) when the restaurant has no `room` feature enabled.
- Currently the sidebar entry shows for every restaurant — leading to the question.

**Fix:** Gate the *Room Transfer Trail* sidebar entry + route by `features.room` (same gating pattern we just fixed in BUG-130). Cafe 103 with `features.room = false` would never see this menu item.

**Scenario B — You are on Cafe 103 and seeing palmhouse data (BAD):**
This is a tenant-isolation defect. Open a **CRITICAL** BUG immediately. Cancel all other feedback work — this is a release-blocker.

**Action proposed:** Confirm which scenario. If A, this is a P1 hardening item. If B, raise a separate `BUG-CRITICAL-XXX` immediately.

**Open question to owner:** Which account were you logged in as when taking the Room Transfer screenshot?

Also, on the same screen: **ITEMS column always shows 0** even for transfers — likely a sibling data-mapping issue. Worth bundling with F-9.

---

## Updated tracking matrix

| # | Screen | Status before | Action type | Re-opens freeze? | Open Q | Priority |
|---|---|---|---|:---:|---|---|
| F-1 | S15 Variation tab | ✅ FROZEN | Display fix (FE-only) | YES | 1 | P2 |
| F-2 | S12 Hourly | 🟠 unsigned | Feature add (FE-only) | NO | 2 | P2 |
| F-3 | S14 Channel/Payment (TBC) | 🟠 unsigned | TBD pending clarification | TBD | 3 | TBD |
| F-4 | S10 Kitchen Ops | ✅ FROZEN | Doc + possible defect | YES if defect | 4 | P2 (P1 if defect) |
| F-5 | S5 All Items | ✅ FROZEN | UI removal | YES | 5 | P2 |
| **F-6** | **S8 Payments** | **✅ FROZEN** | **Defect — empty chart** | **YES (defect)** | **6** | **P1** |
| **F-7** | **S36 Customers RFM** | **🟠 unsigned** | **Doc / explainer** | NO | **7** | **P2** |
| **F-8** | **S36 Customers RFM** | **🟠 unsigned** | **Defect or BE-brief** | NO | **8** | **P1** (PII column always blank) |
| **F-9** | **S31 Room Transfers** | **🟠 unsigned** | **Display fix** | NO | **9** | **P2** |
| **F-10** | **S31 Room Transfers** | **🟠 unsigned** | **Scope + possible CRITICAL** | TBD | **10** | **TBD (P0 if scenario B)** |

## Open questions added (continuing from before)
6. **F-6:** Have you tried Payments on 7D / MTD / Today on this account? Was it ever populated, or has it always been empty?
7. **F-7:** Want me to surface the R/F/M quintile cutoffs for the selected period alongside each segment?
8. **F-8:** Should I assume B2B / room-guest rows legitimately have no phone, or do you expect a phone for at least the personal-name rows (Mr. Manjeet, Mr. Summer Singh)?
9. **F-9:** When FROM ROOM is `0` / unknown, render as "—" or as a literal label like "Walk-in" or "(unassigned)"?
10. **F-10:** Which account did you log in as for the Room Transfer screenshot — palmhouse or cafe103? **This is the most important question right now — it determines whether F-10 is a P2 menu-hiding task or a P0 tenant-isolation incident.**

---

# Batch 3 — Owner decisions received 2026-06-17 (ALL questions resolved)

**Session:** Owner provided final answers to all 6 remaining open questions. All 10 feedback items now have clear disposition.

---

## Owner Answers Received

| # | Question | Owner Answer | Date |
|---|---------|-------------|------|
| F-1 | Label for empty variation | ✅ Proceed with contract amendment + backend fix + FE defensive remap | 2026-06-17 |
| F-2 | Breakfast bucket boundaries | ✅ **06:00 to 10:00** (changed from original 08:00-10:30). Bucket = `[06, 10)` — 4 integer hours: 06, 07, 08, 09. No backend change needed. | 2026-06-17 |
| F-3 | "Zero revenue / 68%" clarification | ✅ **Confirmed: Partial Payment segment** on S14 Revenue by Payment Method donut. Tooltip: `₹0 · 684 orders · 28.7% of total`. This is the known **BE-1 partial-payment-leg gap** — backend doesn't split partial payments into cash/card/UPI legs. **Backend fix required.** | 2026-06-17 |
| F-4 | Takeaway HANDOVER = 0 min | ✅ **DEFERRED** — owner says "let it be as it is, will take this later." No action now. | 2026-06-17 |
| F-5 | Remove By Station scope | ✅ **ALL tabs** — remove By Station block from all tabs in Item Ledger, not just All Items. | 2026-06-17 |
| F-6 | Payments empty chart fate | ✅ **Option A — remove chart.** Delete DAILY PAYMENT TRENDS chart. Keep period-total donut + by-method table only. FE-only fix. | 2026-06-17 |
| F-7 | RFM cutoffs | ✅ Proceed with contract amendment + backend brief | 2026-06-17 |
| F-9 | Room vs Table identification | ✅ **Contract amendment.** Owner confirmed backend already has `type: "tb"/"rm"` discriminator internally. Backend just needs to expose it in the `room_transfers[]` response. Simplifies fix from "split arrays" to "add 1 field." | 2026-06-17 |

---

## F-3 — RESOLVED: Partial Payment ₹0 Revenue (BE-1 gap)

**Screen:** S14 — *Revenue by Payment Method* donut on Channel & Payment Analysis (`/reports-module/channel-pivot`)

**Confirmed by owner screenshot (2026-06-17):**
- Donut segments: UPI 51% (blue), Cash 29% (orange), Card 16% (green), plus small slivers
- Tooltip on hovering a segment: **₹0 · 684 orders · 28.7% of total**
- This is the **Partial Payment** segment — 684 orders paid via partial (split cash+card, etc.) but backend returns the whole bucket as ₹0 revenue because it doesn't decompose partial payments into individual method legs

**Root cause:** Backend BE-1 gap — partial payments are not split into their constituent legs (cash portion, card portion, UPI portion). The FE receives `method: "Partial", revenue: 0, orders: 684` and renders it faithfully. The ₹0 is what the API returns.

**Fix path:**
- **Backend (P1):** Decompose partial payments into legs. Each partial order's revenue should be distributed across the actual methods used (e.g., ₹500 cash + ₹300 UPI = ₹500 to Cash bucket + ₹300 to UPI bucket). The "Partial" bucket then shows ₹0 orders / 0% (because all revenue is redistributed) — or is removed entirely.
- **FE (optional P2):** Once backend ships, remove or re-label the "Partial" segment. If backend keeps the "Partial" category for order-count tracking, show order count but suppress the ₹0 revenue display (or show "See individual methods" tooltip).

**Backend brief:** B-130-1 updated — now covers both the daily-per-method chart (F-6, moot since chart removed) AND the partial-payment-leg decomposition (F-3, the real issue).

---

## FINAL TRACKING MATRIX (ALL RESOLVED)

| # | Screen | Owner Decision | Action Type | Who | Priority | Status |
|---|---|---|---|---|---|---|
| **F-1** | S15 Variation tab | Contract amend + proceed | BE 1-line fix + FE defensive remap + contract amend | BE + FE | P2 | 🟢 READY FOR PLANNING |
| **F-2** | S12 Hourly | Breakfast 06:00–10:00 | FE-only: add BREAKFAST KPI `[06, 10)` | FE | P2 | 🟢 READY FOR PLANNING |
| **F-3** | S14 Channel/Payment | Confirmed: BE-1 partial payment gap | BE: decompose partial legs. FE: optional relabel after | BE (P1) + FE (P2) | P1 | 🟢 READY FOR BACKEND BRIEF |
| **F-4** | S10 Kitchen Ops | DEFERRED | No action now | — | — | ⏸️ PARKED |
| **F-5** | S5 Item Ledger | Remove from ALL tabs | FE-only: delete By Station block from all tabs | FE | P2 | 🟢 READY FOR PLANNING |
| **F-6** | S8 Payments | Option A — remove chart | FE-only: delete DAILY PAYMENT TRENDS chart | FE | P1 | 🟢 READY FOR PLANNING |
| **F-7** | S36 Customers RFM | Contract amendment | BE brief: publish band rules + contract amend | BE | P2 | 🟢 READY FOR BACKEND BRIEF |
| **F-8** | S36 Customers RFM | Out of CR-011 | Separate CR: CRM wiring for S36 | — | P1 | 🔵 SPAWNED → CR-011.C |
| **F-9** | S31 Room Transfers | Contract amend — add `type: tb/rm` | BE: expose `type` field in response + contract amend | BE | P1 | 🟢 READY FOR BACKEND BRIEF |
| **F-9b** | S31 Room Transfers | Proceed | BE: fix `items_count` = 0 | BE | P2 | 🟢 READY FOR BACKEND BRIEF |
| **F-10** | S31 Room Transfers | Proceed | FE: gate sidebar by `features.room` | FE | P2 | 🟢 READY FOR PLANNING |

## Open Questions: NONE — ALL RESOLVED

**Log status: CLOSED — all owner decisions captured. Ready for planning phase.**

---

