# Session Handover — 2026-11-17 — INVESTIGATION: item-level Not-Confirm on web order edits

**For:** Next agent (resume INVESTIGATION — one leg outstanding)
**From:** Investigation agent (2026-11-17, Role 6, AGENT_PROMPT_ALPHA v0.7)
**Repo:** `main` @ `085681a3` · App `/app/frontend` · Backend `preprod.mygenie.online` (Laravel) · Socket `presocket.mygenie.online`
**Item ID:** `INV-WEB-EDIT-NOTCONFIRM-2026-11-17` — **NOT REGISTERED** (no CR/BUG id yet)
**Risk:** HIGH · **Confidence in root cause:** HIGH · **Steps used:** 15 (budget 10, overrun declared)
**Code changes this session:** **ZERO** in `frontend/src` (verified via `git status --porcelain frontend/src` → 0 lines)

---

## 1. Why this session happened

Owner supplied a backend contract note: `edit_order_confirm_web` moves Not-Confirm from **order level** to **item level**. On a customer web edit the backend now:
- leaves `f_order_status` **unchanged** (order keeps cooking/current status),
- marks only the **new** lines `food_status = 7` (Not-Confirm), existing lines untouched (additive),
- sends the same staff FCM as order placement ("Please confirm this order" + confirm tone),
- on waiter accept flips only the `food_status = 7` lines to `def_ord_status`.

The note asserted **"No FE code change. Backend contract only."** The session tested that claim.

---

## 2. Verdict (do not re-litigate this — it is evidenced)

**The claim is PARTIALLY TRUE.**
- **Write path — TRUE.** `confirmOrder()` (`api/services/orderService.js:70-74`) already PUTs an order-level payload to `waiter-dinein-order-status-update`; the backend performs the item-level flip. No FE change needed, and it is R25-compliant (`api.put`).
- **Read/display path — FALSE.** The note's own requirement *"treat `food_status === 7` on a line as awaiting staff confirm"* is implemented **nowhere** in the FE.

**Root cause:** FE models Not-Confirm only at order level (`f_order_status === 7`), and its sole item-status renderer has no `7` branch:

```
food_status 7 → orderTransform.js:133 mapOrderStatus(7) → F_ORDER_STATUS[7] = 'pending'
              → OrderEntry.jsx:525 (status survives, placed:true)
              → CartPanel.jsx:66 getItemStatusIcon('pending')
              → CartPanel.jsx:43-56 has NO 'pending' case → default: orange CookingPot
              → a Not-Confirm line looks IDENTICAL to a cooking line. Silent failure.
```

**8 break points** are catalogued in the report (§3 + §3b). Headlines: CartPanel icon map · `STATUS_COLUMNS` YTC column · `Header.jsx:25` YTC chip · Confirm-tick conditions in `OrderCard.jsx:336` / `TableCard.jsx:68,458` / `DeliveryCard.jsx:164` · `mapTableStatus` · `getFoodStatusLabel` (prints literal **"Unknown"** for 7) · notification deep-link absent · socket envelope fields ignored.

---

## 3. Live evidence already captured (contract IS live on preprod)

**Specimen:** order `1578831` · bill `000774` · token `0009` · **Table 7** · customer "poly" · restaurant **672** · `order_from = web` · `payment_status = unpaid` (not prepaid → item-level rule applies).

- Grew across the session: 3 items → **5 items**, `order_edit_count` 2 → **4**, with **4 lines at `food_status = 7`** stacked under an order that stayed `f_order_status = 2` (Ready) and `print_kot = Yes`. Contract is stable across repeated edits.
- **Browser (read-only):** order sits under Ready/Preparing, **absent from the YTC filter**, **no Confirm tick, no badge** — staff get the "please confirm" push with no in-POS place to act.
- **Socket (passive capture of room `rest_672`, 19:28:48 UTC):** channel `new_order_672`, 6 args:
  - `args[0] = "update-order"` — **not** `update-food-status`, and **not** the `update-item-status` event the FE already defines (`socketEvents.js:78`)
  - `args[3] = 2` — order status unchanged on the wire ✓ contract
  - `args[4] = { orders:[… full orderDetails, all 5 lines …], newly_added_items:[…] }`
  - `args[5] = "web"` — undocumented 6th arg
  - ★ **`newly_added_items` is an explicit backend-provided "these lines are new" signal that the FE reads NOWHERE** (`grep newly_added_items frontend/src` → 0 hits). FE's documented contract (`socketHandlers.js:231`) only knows 5 args.

---

## 4. ⚠️ WHAT REMAINS — resume here (FCM leg)

Only one observation is outstanding: **the actual staff FCM payload** for a web edit. Everything else is closed.

**What we need:** title, body, `data.type` / `notification_type`, and the sound key, so we can confirm the FE's confirm-tone detection (`contexts/NotificationContext.jsx:39-50`, matches `confirm_order` / `yet_to_confirm` / `ytc`, or `resolvedSound === 'confirm_order'`) actually fires for an *edit* push, not just a *place* push.

**Protocol (owner must be in the loop — needs a live web edit):**
1. Re-arm the passive socket listener (optional but recommended, gives a second wire sample):
   ```bash
   cd /app/memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17
   setsid env PROBE_RID=672 PROBE_SECONDS=2400 python3 socket_listen.py </dev/null >/dev/null 2>&1 & disown
   tail -f socket_capture.log   # expect: joined_restaurant {"room":"rest_672"}
   ```
   It is **passive** — it emits only the room join and engine.io pongs. Launch it with `setsid … & disown`, otherwise the bash tool call blocks and the child is killed.
2. Take the BEFORE snapshot:
   ```bash
   PROBE_EMAIL=… PROBE_PWD=… python3 probe_single_order.py   # creds: see §6
   ```
3. Ask the owner to announce **"placing now"** and then **wait ~90 seconds** before actually adding the item. The browser session needs that lead time to boot and register an FCM token.
4. During those 90s, open a logged-in browser session (frontend testing agent) on the preview URL with **notification permission granted**, console capture on, and keep it open ~2-3 minutes. The app registers its FCM token at login (`authTransform.js:52` sends `fcm_token`; token acquired in `config/firebase.js:99` with `vapidKey`; SW at `public/firebase-messaging-sw.js`).
5. Owner adds **one** item to Table 7 → capture the push, the socket event, and the AFTER snapshot; diff BEFORE/AFTER.

**Known risk:** the push may never reach the sandbox if the backend targets devices/topics registered earlier rather than our fresh token (login response carries `zone_wise_topic`, suggesting topic messaging). If nothing arrives after one attempt, **do not keep retrying** — record the FCM payload shape as a backend question (BACKEND_BRIEF) instead of guessing it.

**Also still unobserved (blocked, low value):** a screenshot of the per-line icons inside the order detail. The automation driver could not open the order detail from the dashboard cards. The code trace in §3 of the report is deterministic, so this is cosmetic confirmation only — do not burn steps on it.

---

## 5. Next role after the FCM leg

1. **INTAKE** — register the item. `edit_order_confirm_web` and "Not-Confirm" appear in **no** memory doc and in **no** registry row; per REGISTRATION_GATE_POLICY it needs an ID before Planning.
2. **PLANNING Gate 2 → 3** — **planning-skip is NOT eligible**: 5+ files, >10 lines, hotspot files (`OrderEntry`, `CartPanel`, `orderTransform`).
3. **Owner decisions to lock first:**
   - **OD-A:** should an order with `food_status = 7` lines appear in the **YTC column/chip**, or stay in its current column with only a **badge**? (Recommended: badge + stay — the contract deliberately keeps the order status unchanged.)
   - **OD-B:** confirm that excluding `7` lines from KDS/station panels until acceptance (`stationService.js:207`) is intended — note the specimen already has `print_kot = Yes`, so the printed kitchen ticket omits the pending items.
   - **OD-C:** signal choice — `food_status === 7` (persists across reload, recommended source of truth) vs `newly_added_items` (socket-only, good for a transient "just added" highlight).

---

## 6. Credentials + environment

- Account alias **OWNER_RUBY** (`***REDACTED***`, role Manager, restaurant 672). **Password is NOT in this file** — it is in `/app/memory/test_credentials.md`, which is **gitignored** (`.gitignore:79`). Never move it into a tracked file, never print it in a report.
- Backend reachable from the pod ✓ · Socket handshake `HTTP 200`, Engine.IO **v4** (EIO=3 rejected) ✓
- `localhost:3000` is **CORS-blocked** by preprod — browser work must use the preview URL, not localhost.
- Frontend env lives in `frontend/.env` (16 keys, panel-entered). Note the repo also ships a committed `frontend/.env`; the running app intentionally uses the local one.

---

## 7. Artifacts

| Path | What |
|---|---|
| `memory/INV-WEB-EDIT-NOTCONFIRM-2026-11-17_INVESTIGATION_REPORT.md` | Full 6-section report (incl. §3b live socket capture) |
| `memory/evidence/INV-WEB-EDIT-NOTCONFIRM-2026-11-17/probe_item_status.py` | Read-only probe: login + order list, status distributions |
| `…/probe_single_order.py` | Read-only single-order probe (specimen) |
| `…/socket_listen.py` | Passive stdlib Socket.IO v4 listener (no new deps) |
| `…/orders_list_raw.json` · `probe_summary.json` | 49-order list + distributions (`item food_status {2:3, 7:2, 5:70, 1:5, 3:2}`) |
| `…/single_order_1578831.json` · `…_BEFORE_edit3.json` · `BEFORE_edit3.txt` | Specimen payloads + pre-edit snapshot |
| `…/socket_capture.log` · `socket_events.jsonl` | Live wire capture incl. the `newly_added_items` envelope |

**Do not:** write code, re-test H1-H5 (all settled), or re-probe the REST contract. The open work is the FCM payload only.
