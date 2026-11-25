# SESSION HANDOVER — 4-ISSUE FOCUS (Discount Dashboard · POS 4-issues · Custom-item KOT · V2 discount contract)

**Date:** 2026-11-20 · **For:** next agent · **Prepared by:** prior agent (read-only summary; no code written this turn)

> ## SCOPE LOCK — read this first
> This agent works **ONLY** on the items in these 4 files. Do **not** pick up B2/Audit, CR-560, permissions, or any other batch.
> 1. `memory/investigations/INV-BUG-680_V2_DISCOUNT_DASHBOARD_FE_READINESS_2026-11-20.md`
> 2. `memory/investigations/INV-POS-4ISSUES_INVESTIGATION_REPORT_2026-11-20.md`
> 3. `memory/investigations/INV-KOT-CUSTOM-ITEM-2026-11-20.md`
> 4. `memory/handover/V2_ORDER_DISCOUNT_FRONTEND_HANDOFF_2026-11-20.md`
>
> All four investigations are **read-only, HIGH confidence, no code changed yet**. Everything below is already traced to exact files/lines — trust but re-verify line numbers before editing (code is source of truth, R-rule).

---

## The work set = 5 distinct items across the 4 files

| ID | Item | Class | Risk | Registry status | Recommended gate |
|---|---|---|---|---|---|
| **BUG-680** | Show applied order-discount on dashboard (wire V2 endpoint + render) | FE (financial display) | **HIGH / P0** | `GATE_1_INTAKE_COMPLETE — OD LOCKED` (OD-680-01 = Option B) | **Planning (Gate 2)** — NOT planning-skip |
| **POS-1** | APS ₹1 item: price not enterable from Accept pop-up / web-order edit | FE_GAP | **HIGH** | **CR-561** — GATE_1_INTAKE 2026-11-20 | **Planning (Gate 2)** |
| **POS-2** | Pop-up "cancel" reads as item-level, not order-level (wording) | FE_UX | MEDIUM | **BUG-741** — GATE_1_INTAKE 2026-11-20 | Owner decision → implement |
| **POS-3 (BUG-703)** | Aggregator expand in **Table mode** does nothing | FE_BUG | MEDIUM (P0 in tracker) | **BUG-703 REOPENED 2026-11-20** (was IMPLEMENTED) | short Planning → fix |
| **POS-4 / KOT** | Custom (out-of-menu) item KOT not printing on first placement | FE_BUG | LOW (1 file/1 line) | not yet registered | **Planning-skip eligible** (owner approve) |

(V2 discount handoff file = the backend **contract reference** for BUG-680, plus 2 open backend findings — see bottom.)

---

## Preprod test credentials (for live verification)
| Account | Email | Password | Use |
|---|---|---|---|
| Owner (BUG-680 repro) | `owner@mantri.com` | `Qplazm@10` | Table T2 / Order #001447 — discount-not-on-dashboard |
| Staff (aggregator/table) | `poki@macha.com` | `Qplazm@10` | Running-orders list + apply-discount readback; **POS-3** aggregator-in-table repro |
| Owner (KOT repro) | `owner@hogwarts.com` | — | Custom-item KOT first-placement repro |

API base: `https://preprod.mygenie.online`. Use an employee Bearer token for the order's restaurant.

---

## Item-by-item: root cause + next step

### BUG-680 — discount on dashboard  (HIGH / P0)
**Backend is READY (V2).** `POST /api/v2/vendoremployee/order/order-discount-manage` now mutates `order_discount*`, `restaurant_discount_amount`, recalculates item allocations/taxes/totals, publishes `update-order` (KOT flag N), and returns `{order_amount, discount_amount(applied ₹), discount_type Percent/Fixed, discount_value(raw)}`. Full readback via `get-single-order-new`. **This is the Option B BUG-680 was blocked on.**

**Two independent FE gaps (both still open):**
1. **Endpoint version** — `applyOrderDiscount` (`api/services/orderService.js:228`) still calls **v1** (`api/constants.js:258 MANAGE = '/api/v1/vendoremployee/order-discount-manage'`). No v2 wiring exists. → switch to v2 (or confirm backend aliases v1→v2). Until then totals don't recalc.
2. **Display** — `OrderCard.jsx` renders **no discount at all** (grep: 0 matches). The data is already on the transformed order (`orderTransform.js:236 discount` = `restaurant_discount_amount`, `:238 discountValue`, `:239 discountType`). Add a discount line/badge and make the headline amount reflect post-discount `order_amount` (`OrderCard.jsx:526`).

**Parity (optional, if owner wants same everywhere):** `OrderEntry.jsx:1223-1227` (Collect Bill) + `CartPanel.jsx:512` (placed-order total).

**Next step:** progress to **Planning Gate 2** (Option B FE impl). Owner decisions: (a) confirm v1→v2 switch vs backend alias; (b) display scope — OrderCard only, or full parity.
**Verification gap to close FIRST:** confirm the **running-orders list** endpoint (the one feeding the dashboard, not just `get-single-order-new`) returns recalculated `order_amount` + `restaurant_discount_amount` — live call with `poki@macha.com`/`owner@mantri.com` before/with the FE change.

### POS-1 / CR-561 — APS ₹1 price from Accept pop-up  (HIGH)  [REGISTERED 2026-11-20]
"Enter Price" model works only for a **fresh ₹1 tap in Order Entry** (`OrderEntry.jsx:850 → setDynamicPriceItem → modal :3038-3101 → confirmDynamicPriceAndAdd :880-928`). The **Accept pop-up** row is presentation-only and shows a read-only "Price TBD" badge (`PopoutItemRow.jsx:116-118`) — no price entry. Same gap when the web order is opened in Order-Entry **Edit** (line already in cart, ₹1 trigger never fires).
**Next step:** Intake as a **CR** → Planning. Owner decision: where price is entered (pop-up before Accept, or forced in Order-Entry edit) and whether an unpriced APS item may be accepted. Reuse existing `dynamicPriceItem` model.

### POS-2 / BUG-741 — pop-up cancel wording  (MEDIUM)  [REGISTERED 2026-11-20]
Two cancel affordances in the pop-up: **per-item ✕** → `CancelFoodModal` (item-level, title "Cancel <item>", "Cancel Item" — correct per CR-545) and the bottom **"Reject"** button → `CancelOrderModal` (order-level). The per-item modal just *reads* like an order cancel.
**Next step:** UX/wording only (no backend). Owner decision: keep per-item cancel + clearer labels vs make pop-up cancel order-wise → Intake (LOW–MEDIUM).

### POS-3 / BUG-703 — aggregator expand in Table mode  (MEDIUM) — **REOPENED 2026-11-20**
Registry says **IMPLEMENTED**, but the fix was threaded through the **inactive** layout. Live flag `USE_CHANNEL_LAYOUT = true` (`constants/featureFlags.js:20`) → active path is `ChannelColumnsLayout → ChannelColumn → TableCard`, which is **never passed `onAggregatorView`**. BUG-703 wired it only to the old `TableSection.jsx:52` / old grid `TableCard` (`DashboardPage.jsx:2191`, `USE_CHANNEL_LAYOUT===false`). So `TableCard.jsx:317` `onAggregatorView?.(...)` → undefined → **tap is a no-op**. Handler/state/view-mode all exist and are correct (`DashboardPage.jsx:1479 handleAggregatorView`, `:485 state`, `:1950-1958 render`).
**Fix (~3 files, few lines):** thread `onAggregatorView` through `ChannelColumnsLayout` (destructure + forward) and `ChannelColumn` (forward to `TableCard`), and pass `onAggregatorView={handleAggregatorView}` on the `<ChannelColumnsLayout>` at `DashboardPage.jsx:2048`.
**Next step:** **reopen BUG-703** (set status back from IMPLEMENTED → REOPENED/GATE_2), short Planning pass (touches shared dashboard wiring), then fix + browser-verify with `poki@macha.com`.

### POS-4 / KOT — custom item KOT not printing first place  (LOW, 1 line)
`customItemFromAPI` (`orderTransform.js:2320-2331`) omits `station` → `cartStationsToSet` skips it (`printerAgentSelector.js:99-108`) → `selectAgentsForKot` returns `[]` (`:80`) → place-order payload has `printer_agent: []` + per-item `station: null` → backend can't route KOT. Reprint works because the socket response enriches the placed item with `station: detail.station || 'KDS'` (`orderTransform.js:134`).
**Fix (1 line):** add `station: data.station || null,` to `customItemFromAPI`. (`|| null`, not `|| 'KDS'`, to preserve "no station = no KOT" when backend sends none.)
**Next step:** **Planning-skip eligible** (owner approve) → implement → verify: custom item → place → KOT prints immediately to the right station; regression normal menu items.
**Relationship:** same symptom family as POS-1 (APS ₹1 menu path) but a different code path/lines — keep them as separate items.

---

## Suggested order of attack (next agent)
1. **POS-4 / KOT** — fastest win, 1 line, planning-skip; get owner approval and ship + verify.
2. **POS-3 / BUG-703** — reopen + thread the prop through the live layout; browser-verify (data already proven correct).
3. **BUG-680** — close the running-orders-list verification gap (live preprod), then Planning Gate 2 for the v2 switch + OrderCard display. Highest value/visibility but financial → full gate.
4. **POS-1** — Intake→Planning (CR); needs owner decision on where price is entered.
5. **POS-2** — owner decision on intended behaviour, then wording Intake.

## Owner decisions still needed
- **BUG-680:** v1→v2 switch vs backend alias; display scope (OrderCard only vs full parity).
- **POS-1:** price-entry location; allow accepting an unpriced APS item?
- **POS-2:** keep per-item cancel + clearer wording, or make pop-up cancel order-wise?
- **POS-4:** add a station selector to the custom-item modal, or rely on backend category-based station? Approve planning-skip.

## Backend open findings (V2 discount handoff — do NOT block BUG-680 display; flag to backend)
1. **Fixed-discount allocation** not redistributed across lines after adding an item (affects line GST + item-transfer). Repro in handoff §Open finding 1.
2. **Mixed-discount merge policy undecided** — merging a fixed-discount order into a %-discount order makes the destination apply its % across the combined subtotal; source fixed treatment not retained. Repro in handoff §Open finding 2.
Handoff notes full lifecycle is **NOT production-signed-off**; local regression 52 tests/202 assertions passed but don't cover every lifecycle combo.

## Honesty / verification notes
- All FE paths are **code-traced** (HIGH). No live preprod re-run was done for the BUG-680 **list** endpoint recalc — that's the one gap to close before/with the FE change.
- No application code has been changed for any of these 5 items yet.

---
**Source reports:** the 4 files named in SCOPE LOCK above.
