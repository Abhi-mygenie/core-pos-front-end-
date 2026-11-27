# INV-WEB-EDIT-NOTCONFIRM — Investigation Report

**ID:** INV-WEB-EDIT-NOTCONFIRM-2026-11-17 (NOT YET REGISTERED — needs INTAKE)
**Date:** 2026-11-17
**Role:** INVESTIGATION (Role 6, AGENT_PROMPT_ALPHA v0.7)
**Trigger:** Owner FE note — `edit_order_confirm_web` moved from **order-level** to **item-level** Not-Confirm. Note asserts *"No FE code change. Backend contract only."*
**Repo:** `main` @ `085681a3` · App `/app/frontend` · Backend `preprod.mygenie.online`
**Risk:** **HIGH** (order capture + API contract + staff action path; no money mutation)
**Steps used:** 13/10 — budget exceeded by 3 (declared). Extension spent on the live probe pair + browser confirmation after root cause was already traced; all 3 extra steps were evidence capture, not hypothesis search.

---

## 1. Summary

**Root cause (one sentence):** The frontend models "Not-Confirm" **exclusively at order level** (`f_order_status === 7`), and its only item-level status renderer has no `7` branch — so when the backend keeps `f_order_status` unchanged and marks only the new lines `food_status = 7`, the POS surfaces **zero** indication that anything awaits confirmation, and renders the pending lines with the normal orange "cooking" icon.

**Classification:** `FE_BUG` (contract-readiness gap). The backend side behaves exactly as the note specifies — verified live.
**Confidence:** **HIGH** — reproduced on live preprod data + traced end-to-end in code.
**Verdict on the note's claim:** **PARTIALLY TRUE.** It is correct for the **write path** (waiter accept needs no FE change — see H3). It is **incorrect for the read/display path**: the note's own requirement *"Treat `food_status === 7` on a line as awaiting staff confirm"* is **not implemented anywhere in the FE today**.

**Live specimen (contract is ALREADY live on preprod):**

| Field | Value |
|---|---|
| Order | `1578831` · bill `000774` · token `0009` · Table **7** · customer "poly" · restaurant 672 |
| `order_from` | `web` |
| `f_order_status` | **2** (Ready) — i.e. order-level NOT 7 ✓ matches new contract |
| `payment_status` | `unpaid` (not prepaid → item-level rule applies) |
| `order_edit_count` | **2** (two customer edits) |
| `print_kot` | `Yes` |
| Item `3969363` Manchurian | `food_status = 2`, `ready_at` set |
| Item `3969364` Hot Garlic Sauce | **`food_status = 7`**, created `00:04:15`, no `ready_at`/`serve_at` |
| Item `3969365` Hot Garlic Sauce | **`food_status = 7`**, created `00:13:05`, no `ready_at`/`serve_at` |

Additive-only behaviour confirmed: existing line untouched, each edit appended a new line. No `item_added` / `confirm` flag exists on the `7` lines — `food_status` is the **only** discriminator available to the FE.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | FE derives "Not-Confirm" only from order-level `f_order_status === 7`, so an item-level-only edit is invisible | grep + code trace (`constants.js`, `Header.jsx`, `OrderCard`, `TableCard`, `DeliveryCard`) + live UI check | 4 | **CONFIRMED** | `constants.js:400` STATUS_COLUMNS id 7 "Yet to Confirm"; `Header.jsx:25` YTC chip `fOrderStatus: 7`; `OrderCard.jsx:336`; `TableCard.jsx:68`; browser: order sat under Ready/Preparing, **absent from YTC**, **no green tick, no badge** |
| H2 | FE already renders item-level `food_status = 7` somewhere (partial support) | grep all 33 `food_status` sites + read every status map | 3 | **ELIMINATED** | Item-level `food_status` is consumed only for `3` (cancelled) and `1/2/5` (station, prep-serve). No `7` branch exists in any map |
| H3 | Waiter accept call would break under the item-level contract | code trace of confirm path | 1 | **ELIMINATED** (no FE change needed) | `orderService.js:70-74` `confirmOrder()` sends an **order-level** payload via `api.put` to `waiter-dinein-order-status-update` (R25-compliant); the backend performs the item-level flip, so the existing call is contract-correct |
| H4 | Pending lines leak into KOT/KDS before confirmation | code trace `stationService.js` | 1 | **ELIMINATED** (behaves correctly, needs owner sign-off) | `stationService.js:207` skips any line with `food_status !== 1` → `7` lines are excluded from station panels until confirmed |
| H5 | The socket path differs from the REST path (dedicated item event, or no payload → refetch) | passive live capture of room `rest_672` during an owner-triggered web edit | 2 | **ELIMINATED + NEW FINDING** | Backend emits plain `update-order` with `args[3] = 2` and full `orderDetails`; envelope also carries an unread `newly_added_items` array — see §3b |

---

## 3. Data Flow Trace

```
API  get-single-order-new / employee-orders-list
       orderDetails[].food_status = 7
  ↓
TRANSFORM  api/transforms/orderTransform.js:133
       status: mapOrderStatus(detail.food_status)
       → F_ORDER_STATUS[7] === 'pending'      (constants.js:366 — an ORDER-level map reused for items)
  ↓
STATE  components/order-entry/OrderEntry.jsx:525
       status: item.status || 'preparing'      ('pending' survives, placed: true)
  ↓
COMPONENT  components/order-entry/CartPanel.jsx:66
       getItemStatusIcon('pending')
  ↓
UI  CartPanel.jsx:43-56 — switch has cases for preparing / ready / served / cancelled ONLY
       → default: { Icon: CookingPot, color: primaryOrange }
       → renders IDENTICALLY to a confirmed "Preparing" line

★ BREAK POINT 1 (primary): CartPanel.jsx:43-56 — no 'pending' case. A Not-Confirm line is
  visually indistinguishable from a cooking line. Silent failure, no error, no console warning.
```

**Parallel break points (same root cause, different surfaces):**

| # | Surface | File / line | Behaviour with the new contract |
|---|---|---|---|
| 2 | Dashboard "Yet to Confirm" column | `constants.js:399-411` (`STATUS_COLUMNS` keyed on `fOrderStatus`) | Order never enters the YTC column — **verified live** |
| 3 | Header "YTC" filter chip | `Header.jsx:25` (`fOrderStatus: 7`) | Order absent from YTC filter; chip count unaffected — **verified live** |
| 4 | Confirm tick (green) + YTC styling | `OrderCard.jsx:336`, `TableCard.jsx:68,458`, `DeliveryCard.jsx:164` — all `order.status === 'yetToConfirm' \| 'pending'` | **No Confirm affordance rendered** → waiter has no in-POS control to accept the added items — **verified live** |
| 5 | Table grid status | `orderTransform.js:63-66` `mapTableStatus` → `ORDER_TO_TABLE_STATUS` (`constants.js:415`) | Table stays `occupied`/`billReady`, never `yetToConfirm` |
| 6 | Reports item status label | `reportTransform.js:57-66` `getFoodStatusLabel` — map `{1,2,3,5,6}` | `food_status 7` → literal **"Unknown"** in All Orders / Order Report Beta item rows |
| 7 | Staff push ("Please confirm this order") | `NotificationContext.jsx:39-50` | Confirm-tone detection works (type/sound based, order-status agnostic) ✓ — **but** there is no click-through/deep-link handler, so staff land on a dashboard where the order carries no marker |
| 8 | Socket refresh | `socketHandlers.js:231-250` (`update-order` → `handleOrderDataEvent` → `updateOrder()`) | Order + all lines (incl. `food_status 7`) reach FE state, then render as cooking (break point 1). See §3b — captured live |

### 3b. LIVE SOCKET CAPTURE (owner-triggered web edit, 2026-11-17 19:28:48 UTC / 00:58:48 IST)

Captured passively from room `rest_672` (same room the POS joins) while the owner added an item from the customer web app to Table 7.

**Wire payload — channel `new_order_672`, 6 positional args:**

| Position | Value | FE reads it? |
|---|---|---|
| `args[0]` | `"update-order"` (inner event name) | YES → `handleOrderDataEvent` |
| `args[1]` | `1578831` (order id) | YES |
| `args[2]` | `672` (restaurant id) | YES |
| `args[3]` | **`2`** — order-level `f_order_status`, i.e. **unchanged, not 7** | YES (used for keep/remove decisions) |
| `args[4]` | `{ orders: [...], newly_added_items: [...] }` | **PARTIALLY** — `orders` yes, **`newly_added_items` NO** |
| `args[5]` | `"web"` (order source) | **NO** — undocumented 6th arg |

**Findings from the capture:**
1. On a customer web edit the backend emits **`update-order`** — not `update-food-status`, and **not** the `update-item-status` event the FE already defines (`socketEvents.js:78`). The FE's documented contract (`socketHandlers.js:231`) describes only 5 args and is unaware of positions 4b/5.
2. `args[3] = 2` confirms the order-level status is untouched on the wire, exactly per the new contract. Every FE keep/remove/status decision downstream therefore sees a plain "Ready" order.
3. `args[4].orders[0].orderDetails` carries **all 5 lines** (`Manchurian=2`, 4 × `Hot Garlic Sauce=7`), so the FE does **not** need a refetch — the pending lines enter state directly and hit break point 1.
4. ★ **The backend already hands the FE an explicit discriminator: `newly_added_items`** — an array of the just-added line objects (here line `3969367` with full `food_details`). **`grep` proves the FE reads it nowhere** (`newly_added_items` / `newlyAddedItems` → 0 hits in `frontend/src`). A ready-made "these lines are new" signal is being discarded.
5. Repeated edits accumulate: the specimen reached `order_edit_count = 4` with **4 pending lines** stacked under an order still showing `f_order_status = 2` and `print_kot = Yes`. The order status never flipped across any of the 4 edits — contract is stable and consistent.

---

## 4. Evidence Artifacts

All persisted under `/app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/` (no `/tmp/`, per data-persistence rule):

| File | Contents |
|---|---|
| `probe_item_status.py` | Read-only probe: login + `employee-orders-list`, status distributions |
| `orders_list_raw.json` | Raw 49-order list from preprod |
| `probe_summary.json` | `f_order_status` distribution `{2:3, 5:41, 1:5}`; item `food_status` distribution `{2:3, 7:2, 5:70, 1:5, 3:2}`; 3 web orders; 1 order carrying `food_status=7` lines |
| `probe_single_order.py` | Read-only single-order probe (specimen 1578831) |
| `single_order_1578831.json` | Full specimen payload (order + 3 items + all line fields) |
| `socket_listen.py` | Dependency-free, passive Socket.IO v4 listener (joins `rest_672`, emits only join + engine pongs) |
| `socket_capture.log` | Timestamped capture incl. `joined_restaurant {"room":"rest_672"}` ACK and the live `update-order` event |
| `socket_events.jsonl` | Machine-readable captured events, incl. the full `new_order_672` payload with `newly_added_items` |
| `single_order_1578831_BEFORE_edit3.json` · `BEFORE_edit3.txt` | Pre-edit snapshot used to diff the owner-triggered edit (3 items → 5 items, `order_edit_count` 2 → 4) |

Browser evidence (read-only session, no write actions performed on the live order): order located as Table 7 / "poly" / ₹1,037; **absent from YTC**; **no Confirm tick**; **no unconfirmed-items badge**. Item-level icon capture was blocked (dashboard cards did not open a detail view for the automation driver) — superseded by the deterministic code trace in §3.

**Credentials:** stored only in `/app/memory/test_credentials.md` (gitignored, `.gitignore:79`). Never committed, never printed in this report.

---

## 5. Recommendations

**Classification: `FE_FIX` (primary) + `OWNER_DECISION` (2 points) — no backend ask.**

The backend contract is implemented and correct. The FE needs a read-path change to honour it.

**Planning-skip eligibility: NO.** Fails all three tests — touches 5+ files (`CartPanel.jsx`, `constants.js` or a new item-status map, `reportTransform.js`, `OrderCard.jsx`/`TableCard.jsx`/`DeliveryCard.jsx`), well over 10 lines, and `OrderEntry`/`CartPanel`/`orderTransform` are hotspot files. → **Full Planning gate cycle (Gate 2 → Gate 3).**

**Proposed scope for Planning (no code written in this session):**

1. **Decouple item status from the order-status map.** `orderTransform.js:133` currently reuses `F_ORDER_STATUS` for lines. A dedicated item-status map with an explicit `7 → 'notConfirmed'` key removes the whole class of silent `default:` fallbacks.
2. **CartPanel line treatment (break point 1, highest priority).** Give `7` its own icon/colour + a visible "Awaiting confirm" treatment so the waiter can tell the two Hot Garlic Sauce lines from the Manchurian line.
3. **Order-level roll-up for discovery.** Decide how an order containing `food_status = 7` lines becomes findable: badge/dot on `OrderCard`/`TableCard`, and/or inclusion in the YTC column & chip while `f_order_status` stays unchanged.
4. **Confirm affordance.** Surface the existing `confirmOrder()` action (no payload change needed) for orders carrying `7` lines — otherwise the FCM "Please confirm this order" push has no in-POS destination.
5. **`getFoodStatusLabel`** (`reportTransform.js:57`): add `7` so reports stop printing "Unknown".
6. **Prepaid / `edit_order_confirm_web = No` parity.** The FE reads neither the `edit_order_confirm_web` setting nor a prepaid branch today (grep: the key appears in **no** `frontend/src` file, only in a stored profile payload at `evidence/CR-493-B5/profile_response.json`). Planning must confirm whether the FE needs to read this setting at all, or whether `food_status` alone is sufficient.
7. **Decide the signal: `food_status === 7` vs `newly_added_items`.** Recommended: `food_status === 7` is the source of truth because it **persists across reload/refetch**, while `newly_added_items` exists only on the socket envelope. Use `newly_added_items` (and `args[5] = "web"`) only as an optional transient "just added" highlight or toast. Either way the FE's socket message contract (`socketHandlers.js:231`) should be updated to document args 4b and 5.

**OWNER DECISIONS NEEDED (OD candidates):**
- **OD-A:** Should an order with `food_status = 7` lines appear in the **YTC column/chip** (discovery via the existing surface), or stay in its current column with only a **badge** (preserves "order is still cooking" semantics)? Recommended: badge + stay, since the contract deliberately keeps the order status unchanged.
- **OD-B:** Confirm that excluding `7` lines from KDS/station panels until acceptance (`stationService.js:207`) is the intended behaviour — note the specimen order already has `print_kot = Yes`, so the kitchen has a ticket that does not list the two pending items.

**Registration gap:** this item carries **no CR/BUG ID** — `edit_order_confirm_web` and "Not-Confirm" appear nowhere in `memory/` or the registry. **INTAKE role is required** to register it before Planning (per REGISTRATION_GATE_POLICY).

---

## 6. Retroactive Candidates

**NONE.** No FE code implementing item-level Not-Confirm exists, so there is no registered-but-shipped item to close retroactively. The related registered work (CR-551 "edit variations after place", BUG-680, CR-509 lifecycle) is distinct and unaffected by this finding.
