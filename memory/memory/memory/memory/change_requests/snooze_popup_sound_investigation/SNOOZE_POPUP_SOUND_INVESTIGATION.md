# Snooze Popup and Sound Investigation

> **Type:** Investigation + retrieval only. No code changes. No commits. No backend / payload / sound-system change.
> **Date:** 2026-01-16
> **Sister doc:** `/app/memory/change_requests/web_order_snooze_investigation/WEB_ORDER_SNOOZE_INVESTIGATION.md` (snooze flow exhaustively analysed). This report supplements it with the **sound-system** angle.

---

## 1. Summary

The Snooze button on the **Web / Scan & Order — Awaiting Confirmation** pop-out (`ScanOrderPopOut.jsx`) is wired exactly as specified in the **owner-locked Phase 4 contract (handover 2026-05-10)**:

- It **hides** the current order from the pop-out queue for 5 min via an in-memory `Map<orderId, expiryMs>` (`popOutSnoozeHideSet`).
- It **also calls** the shared dashboard `toggleSnooze` so the underlying YTC card dims.
- It **never** writes to localStorage / sessionStorage / backend; it **never** mutates `fOrderStatus`; it **never** changes order state in `OrderContext`.

Crucially, per the **locked anti-rule at `ScanOrderPopOut.jsx` line 23** (and re-affirmed in handover row C-2):

> *"NO soundManager import. NO NotificationContext import. Pop-out is a silent layer; existing FCM-driven audio path remains untouched."*

> *Handover C-2: "Pop-out emits NO audio. … No new sound asset. **No sound suppression**. No sound duplication."*

Therefore Snooze:
- ✅ Hides the popup as designed.
- ✅ Dims the underlying card via the shared snoozed-set.
- ❌ Does **NOT** stop the chime that played when the FCM notification arrived (because the chime is driven by `NotificationContext.processNotification()` → `soundManager.play(...)`, which is invoked from the FCM push pipeline — completely upstream of the pop-out and independent of the queue / hide-set).
- ❌ Does **NOT** mute future chimes for the snoozed order (no mute / suppress hook exists).

This is the **intended-and-shipped behaviour** per the 2026-05-10 owner contract. The FCM sound is **one-shot** (not a loop — `soundManager.play()` registers a single `'ended'` listener and stops itself). So the actual cashier experience is: chime plays once for ≈1-3 s when the FCM arrives, then naturally ends; the popup opens; Snooze hides the popup but the chime has already finished. The "sound never stops" concern only arises if a fresh chime is triggered AFTER Snooze (e.g. a polling reconcile or another `scan-new-order` event re-firing the FCM-driven notification).

---

## 2. Related CR / Bug Docs Found

| Doc | What it says about Snooze and/or Sound |
|---|---|
| `/app/memory/change_requests/web_order_snooze_investigation/WEB_ORDER_SNOOZE_INVESTIGATION.md` | **The exhaustive Snooze investigation.** §1-§9 cover predicate, button flow, expected vs actual, root causes (in-memory volatility, transient-refresh race, `toggleSnooze`-vs-`addSnooze` semantics, `snoozedOrders` Set never auto-clears, `setTimeout` throttling, no cross-tab persistence). Does **not** discuss the sound path — sound was explicitly excluded from Phase 4 scope. |
| `/app/memory/change_requests/implementation_handover/POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md` | **Authoritative shipped contract.** Row C-2: *"Pop-out emits NO audio. Existing FCM → NotificationContext → soundManager chain stays untouched. No new sound asset. **No sound suppression**. No sound duplication."* Row C-3 locks Snooze = "presentation-only 5-min auto-clear, no backend, no status mutation, no persistence". §3.4 lists Snooze as a UI button "icon, 5 min auto-clear" — no sound interaction. |
| `/app/memory/change_requests/implementation_summaries/POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_SUMMARY_2026_05_10.md` | Ships the locked behaviour described above. Cites tests T-8 / T-9 / T-10 / A-3 / A-4 in `ScanOrderPopOut.test.jsx`. |
| `/app/memory/change_requests/qa_reports/POS2_002_PHASE_4_WEB_YTC_POPOUT_QA_REPORT_2026_05_10.md` + addendum | QA passed against the locked contract: snooze hides queue entry for 5 min; status-flip auto-removes; no sound interaction tested because none is expected. |
| `/app/memory/change_requests/impact_analysis/POS2_006_CONFIRM_ORDER_TONE_INVESTIGATION_2026_05_09.md` | **Separate** investigation into the FCM **tone-override** path (the confirm-order tone profile setting). This is the sound-source side: FCM payload `data.sound` resolves via `NotificationContext.processNotification()` → `soundManager.play(soundKey)`. Confirms the chime is one-shot and FCM-driven. Does not mention Snooze. |
| `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md`, `POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md`, BUG-045 docs | Mention snooze + sound in passing only — sound here refers to a separate cashier-facing tone bug, not snooze-mute. No snooze-stops-sound work item. |
| `/app/memory/change_requests/manual_validation/POS2_0_FULL_MANUAL_VALIDATION_TASK_TRACKER_2026_05_11.md` | Has line items for "Web order popup → Accept / Reject / View / Snooze". Snooze rows reference the same 5-min hide contract. No sound expectation. |

**No prior doc requests Snooze to stop sound or mute future sounds.** This is the first such ask.

---

## 3. Current Popup Qualification Rule

Locked at `ScanOrderPopOut.jsx:43-44`:

```js
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.orderFrom === 'web' && order.fOrderStatus === 7;
```

| Field | Source |
|---|---|
| `orderFrom === 'web'` | Either set by backend, or patched in by `socketHandlers.handleScanNewOrder` (L508-511), or patched in by `useOrderPollingReconciliation.reconcile()` (`WEB_ORIGIN_RE = /web\|scan/i` fallback against `orderIn`). |
| `fOrderStatus === 7` | "Yet to Confirm" status. The order is in YTC bucket and has not been accepted/rejected. |

Suppression gates (popup returns `null`):
- `suppressed = Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)` — popup hidden when OrderEntry or CancelOrderModal is open.
- `queue.length === 0` — natural drain.

---

## 4. Current Snooze Flow

### 4.1 Owner

`ScanOrderPopOut.jsx` owns the Snooze button. Component is mounted by `DashboardPage.jsx:1463-1472`.

### 4.2 State

| State | Owner | Lifetime | Persistence |
|---|---|---|---|
| `popOutSnoozeHideSet` (`Map<idStr, expiryEpochMs>`) | `ScanOrderPopOut` instance | Component lifetime — cleared by unmount, route change, hard refresh, hot reload | **None** (in-memory React state) |
| `timerRefs` (`Map<idStr, timeoutHandle>`) | `ScanOrderPopOut` instance | Same | None |
| `snoozedOrders` (`Set<idStr>`) | `DashboardPage` (line 417) | Dashboard lifetime | None |

### 4.3 Click handler — `handleSnoozeClick(orderId)` (`ScanOrderPopOut.jsx:225-254`)

Steps, in order:

1. `idStr = String(orderId)`.
2. `onToggleSnooze(idStr)` → calls `DashboardPage.toggleSnooze` (L1172-1182). This **toggles** membership of `snoozedOrders`: if already there, removes; else, adds.
3. `popOutSnoozeHideSet.set(idStr, Date.now() + POPOUT_SNOOZE_MS)` with `POPOUT_SNOOZE_MS = 5 * 60 * 1000` (5 minutes).
4. `clearTimeout` any prior timer for `idStr`; then `setTimeout(() => { popOutSnoozeHideSet.delete(idStr); timerRefs.delete(idStr); }, 5*60*1000)`.

**No call to** any sound function. **No call to** `soundManager`. **No call to** `NotificationContext`.

### 4.4 Effect on UI

- The derived `queue` memo (depends on `[orders, popOutSnoozeHideSet]`) recomputes and excludes the snoozed `idStr`.
- If queue empties, popup unmounts its visible body (`if (queue.length === 0) return null;`).
- Underlying YTC card dims (`opacity-60` from `snoozedOrders.has(idStr)`).
- The dashboard `snoozedOrders` Set is **never auto-cleared** — only the popout-local hide-set has a 5-min timer.

### 4.5 Duration / Scope

- **Duration:** Exactly 5 minutes (`POPOUT_SNOOZE_MS`), drift-prone under tab-throttling.
- **Per-order:** Yes — each order keeps its own entry in the Map; multiple orders can be snoozed independently.
- **Global mute:** No. There is no "snooze all" option.
- **Reload-safe:** No.
- **Tab-switch-safe:** No (mount/unmount destroys the hide-set; setTimeout is throttled when backgrounded).
- **Cross-device / cross-tab:** No.

---

## 5. Current Sound / Notification Flow

Sound originates **upstream of the pop-out**, in the FCM push pipeline.

### 5.1 Pipeline diagram

```
Backend creates web YTC order → emits FCM push (data: { sound: 'new_order' | ... })
                                            │
                                            ▼
              firebase-messaging-sw.js → forwards to NotificationContext
                                            │
                                            ▼
            NotificationContext.processNotification(data)
              ├── infer sound key from title/body if not stamped
              ├── apply confirm-order tone profile override (POS2-006)
              └── soundManager.play(resolvedSound)   ← AUDIO HAPPENS HERE
                       │
                       ▼
              Audio element preloaded from /public/sounds/{key}.wav
              ONE-SHOT playback (~1-3 seconds, no loop attribute)

In parallel (independent path):
            socket 'scan-new-order' event → socketHandlers.handleScanNewOrder
                                            │
                                            ▼
              fetchOrderWithRetry → addOrder(order) into OrderContext
                                            │
                                            ▼
              OrderContext.orders updates → ScanOrderPopOut re-derives queue
                                            │
                                            ▼
              Popup renders (NO sound here — the popout is silent)
```

### 5.2 Code citations

| File | Line | What |
|---|---|---|
| `src/contexts/NotificationContext.jsx` | 1, 5 | `// Manages incoming notifications, sound playback, and toast display` + `import soundManager from '../utils/soundManager';` |
| `src/contexts/NotificationContext.jsx` | 95-134 | `processNotification(data)` → resolves `soundKey` → `soundManager.play(resolvedSound);` |
| `src/contexts/NotificationContext.jsx` | 138 | `if (resolvedSound === 'silent') return;` — only "silent" notifications skip the toast/list; non-silent always play sound. |
| `src/utils/soundManager.js` | 22-95 | Singleton `SoundManager`. `play(key)` calls `audio.play()` with `audio.addEventListener('ended', …)` — one-shot. `stop()` exists but is **only called** from inside the class: by `play()` itself (to stop the previous sound before starting a new one), by the `'silent'` key handler (L49-52), and by `setEnabled(false)` (L101-104). |
| `src/components/dashboard/ScanOrderPopOut.jsx` | 23 | `// NO soundManager import. NO NotificationContext import.` — locked anti-rule. |

Verified by grep:
- `grep -n "soundManager\|playSound\|new Audio" src/components/dashboard/ScanOrderPopOut.jsx` → 1 hit, the negative comment at line 23.
- `grep -n "stopSound\|soundManager.stop\|setEnabled(false)" src/components/dashboard/` → 0 hits.

### 5.3 Sound type

- **One-shot.** No `audio.loop = true` anywhere in `soundManager.js`. The `'ended'` event listener fires once and clears `currentAudio`.
- **Re-triggerable.** Each new FCM push re-invokes `play(soundKey)`, which calls `stop()` on any in-progress chime and starts a new one (so back-to-back orders chime back-to-back).
- **Global mute toggle:** `soundManager.setEnabled(false)` — wired to a Sidebar Silent Mode toggle (per the `NotificationContext.jsx` L104 comment). Not wired to Snooze.

---

## 6. Does Snooze Stop Sound?

**Answer: NO — by design, and the pop-out is structurally incapable of stopping it.**

### 6.1 Evidence

| Evidence | Source |
|---|---|
| Locked anti-rule `// NO soundManager import. NO NotificationContext import.` | `ScanOrderPopOut.jsx:23` |
| Locked owner contract C-2: "Pop-out emits NO audio. Existing FCM → NotificationContext → soundManager chain stays untouched. **No sound suppression.**" | `POS2_002_PHASE_4_WEB_YTC_POPOUT_IMPLEMENTATION_HANDOVER_2026_05_10.md` row C-2 |
| `handleSnoozeClick` body does NOT call any sound stop / mute / suppress function. Its only side-effects are `onToggleSnooze(idStr)`, `popOutSnoozeHideSet.set(...)`, and `setTimeout(...)`. | `ScanOrderPopOut.jsx:225-254` |
| `grep "soundManager\|stopSound\|setEnabled" src/components/dashboard/ScanOrderPopOut.jsx` returns only the negative comment line | grep run during this investigation |

### 6.2 Caveat — why operators may still perceive "snooze didn't stop sound"

The FCM chime is one-shot, so in normal operation it plays for ≈1-3 s when the push arrives and ends naturally before the cashier clicks Snooze. However, the perceived "sound keeps playing after snooze" can arise from:

| Cause | Why it sounds like Snooze didn't mute |
|---|---|
| Multiple web YTC orders arriving back-to-back | Each FCM push re-fires `soundManager.play(...)`. Snooze on order #1 has no effect on the chime for order #2 because the chime is keyed to FCM payload, not to the pop-out queue. |
| Tone-override config (POS2-006 confirm-order tone) | Plays the longer chime variant if backend stamps `sound: 'confirm_order'`. Still one-shot, but longer perceived duration. |
| Hot reload / dev mode | Multiple `Audio` instances may overlap if `play()` is called concurrently before `stop()` resolves. Production unaffected. |
| Browser autoplay-block recovery | If autoplay was previously blocked, the cached audio may queue and play late after a user gesture (like clicking Snooze itself). This makes Snooze feel like it "starts" the sound. |

None of the above are caused by Snooze; they reflect the FCM pipeline being independent of the pop-out.

---

## 7. Polling / Socket Interaction With Snoozed Orders

### 7.1 Socket path

- `scan-new-order` event arrives → `handleScanNewOrder` → fetches order → `addOrder(order)` into `OrderContext`.
- Pop-out re-derives `queue`. If the `orderId` is in `popOutSnoozeHideSet`, it is filtered out → popup stays hidden.
- **However:** FCM and socket are independent. If the FCM also fires (same backend event), `NotificationContext.processNotification` plays the chime regardless of whether the pop-out filtered the order. Snooze does not gate this.

### 7.2 Polling path (`useOrderPollingReconciliation`, CR-008 follow-up)

- Polling every 60 s fetches `getRunningOrders`. New POS rows → `addOrder`. New Web/Scan rows (orderIn web/scan fallback) → also `addOrder` with `orderFrom='web'` patched in.
- Same `OrderContext` write surface as socket. Same downstream behaviour.
- **No FCM sound triggered by polling** — polling is silent. So a snoozed order that reappears via polling will not chime again (but the pop-out's hide-set filters it out anyway until 5 min expire).

### 7.3 Critical edge case from sister investigation

**Transient-refresh race (§7 of `WEB_ORDER_SNOOZE_INVESTIGATION.md` root cause #2):** Housekeeping `useEffect` at `ScanOrderPopOut.jsx:202-223` removes `popOutSnoozeHideSet[orderId]` if the order is missing from the current `orders` list. A single momentary absence (network race, partial refresh) clears the snooze. If the order is later re-added in YTC, the popup re-pops well before 5 minutes — and if FCM fires again, the chime plays again. Snooze provides no defence against this loop.

---

## 8. Current Behavior vs Expected Behavior

| # | Behavior | Expected (per shipped contract) | Actual (per code) | Status |
|---|---|---|---|---|
| B-1 | Click Snooze → popup hides | Yes | Yes | ✅ expected-and-working |
| B-2 | Snooze duration = 5 min | Yes | Yes (subject to throttling) | ✅ expected-and-working |
| B-3 | Order reappears in popup after 5 min if still YTC | Yes | Yes | ✅ expected-and-working |
| B-4 | Order removed from popup if status changes during snooze | Yes (T-10) | Yes | ✅ expected-and-working |
| B-5 | Underlying dashboard card stays visible & dimmed | Yes | Yes | ✅ expected-and-working |
| B-6 | Dashboard `snoozedOrders` Set auto-clears after 5 min | Not specified in contract | **No** — Set never auto-clears | 🟡 minor visual inconsistency, by-design per locked contract |
| B-7 | Snooze survives page reload | No (locked: in-memory only, test A-3) | No | ✅ expected-and-working (by-design) |
| B-8 | Snooze survives route change away from /dashboard | Not explicit in contract, but follows from in-memory state | No (cleanup useEffect clears timers) | ✅ expected-and-working (by-design) |
| B-9 | Snooze persists in tab-switch / backgrounded tab | Not specified | Drifts — setTimeout throttled to ≥ 1s/min | 🟡 by-design platform behaviour |
| B-10 | **Click Snooze → in-progress chime stops** | **No (per C-2)** — pop-out is silent layer | **No** — Snooze does not touch soundManager | ✅ expected-and-working (by-design) — **but contradicts new owner ask** |
| B-11 | **Click Snooze → future chimes for that order muted during 5 min** | Not in any prior doc | **No** — no mute mechanism, FCM chimes any time | ⏳ not-implemented; not in any prior CR |
| B-12 | **Click Snooze → ALL web-order chimes muted during 5 min** | Not in any prior doc | **No** | ⏳ not-implemented; not in any prior CR |
| B-13 | `toggleSnooze` toggles dashboard Set (asymmetric with popout-local add) | Side-effect of reusing existing handler | Yes (root cause #3 of sister investigation) | 🟡 by-design but causes UI inconsistency |
| B-14 | Polling-driven re-add of snoozed order does NOT reopen popup | Implicit: popout-local hide-set filters by orderId | Yes — hide-set filter is by orderId, polling re-add does not reset the timer | ✅ expected-and-working |
| B-15 | Transient-refresh race clears snooze if order momentarily absent | Not specified in contract | Yes — housekeeping useEffect deletes hide entry | 🟡 latent bug per sister investigation §7 root cause #2 |

---

## 9. Root Cause / Gap

**Snooze does not stop sound because Snooze was never wired to the sound system. This is explicit, locked, owner-approved behaviour from 2026-05-10.**

The mechanism gap:

| Layer | What it does | Does Snooze touch it? |
|---|---|---|
| FCM push reception (firebase-messaging) | Receives push, fires onMessage | No |
| `NotificationContext.processNotification` | Resolves `soundKey`, calls `soundManager.play()` | No |
| `soundManager.play()` | Stops any prior chime, plays one-shot chime | No |
| `soundManager.stop()` | Pauses + resets the current chime | Not called by Snooze |
| `soundManager.setEnabled(false)` | Mutes all future chimes globally | Not called by Snooze (only the Sidebar Silent Mode toggle calls this) |
| `ScanOrderPopOut.handleSnoozeClick` | Hides queue entry, dims card | Yes — but only at the queue/visual layer |

**For Snooze to stop sound, the helper would need to call one of:**
1. `soundManager.stop()` — immediately silences the current chime only.
2. `soundManager.setEnabled(false)` — global mute (probably too aggressive — would also mute new POS orders, takeaway orders, etc.).
3. A new per-order mute mechanism (does not exist; would require a new `mutedOrderIds` Set inside `soundManager` and a `NotificationContext` pre-play check against the FCM `data.orderId`).

Option 1 is trivial. Options 2 and 3 are new design surface and **explicitly out of scope** per the locked contract row C-2 ("No sound suppression"). Owner must overrule C-2 for any of these to ship.

---

## 10. Recommended Fix / Next Step

> **Planning only. No code.** Three legitimate paths; owner decides which one (or none).

### Path A — Leave as-is (no change)

**Rationale:** Sound is one-shot (≈1-3 s) and chimes naturally end before the cashier finishes reading the popup body. The locked contract already covers this case. If the cashier perception is "sound is annoying", the remedy is the existing Sidebar Silent Mode toggle, not Snooze.

**Effort:** Zero. **Footprint:** Zero. **Risk:** Zero.

### Path B — Snooze stops only the in-progress chime (minimal opt-in)

**Shape:** In `ScanOrderPopOut.handleSnoozeClick`, add a single `import` of `soundManager` and call `soundManager.stop()` after the existing snooze logic. Owner must explicitly overrule the locked anti-rule at `ScanOrderPopOut.jsx:23` and contract row C-2.

**Effort:** ~5 lines of code, 1 import. **Footprint:** `ScanOrderPopOut.jsx` only. **Risk:** Low — `soundManager.stop()` is already a stable API, used internally by `play()` and by Silent Mode.

**Limitation:** A new chime arriving 30 s later for an unrelated order still plays. Does not address "mute future chimes for the snoozed order".

### Path C — Per-order mute for the 5-min snooze window

**Shape:** Add a `mutedOrderIds: Set<idStr>` to `soundManager` (or expose a `mute(orderId)` / `unmute(orderId)` pair). In `NotificationContext.processNotification`, before calling `soundManager.play(...)`, check the FCM payload's `data.orderId` against the muted set; if present, skip play. Snooze adds to and timer-removes from the muted set in parallel with the existing pop-out hide-set.

**Effort:** ~30 lines across 3 files (`soundManager.js`, `NotificationContext.jsx`, `ScanOrderPopOut.jsx`). **Risk:** Medium — touches the FCM tone pipeline that POS2-006 already locked.

**Limitation:** Requires backend FCM payload to consistently include `data.orderId`. If a chime is fired by a non-order notification (e.g. attend-table), this would not affect it (correct behaviour, but needs verification).

### Path D — Snooze ALL web-order chimes during 5 min

**Shape:** Either (a) add a `muteWebOrders: boolean` flag that `NotificationContext` checks before calling `play()` on web-order sound keys, or (b) treat Snooze as a global Silent Mode toggle for 5 min. Both are large semantic changes.

**Effort:** ~50 lines + tests. **Risk:** High — interaction with Silent Mode + POS2-006 tone-override is non-trivial.

### Recommended next step (planning-only opinion)

**Step 1: Owner answers OQ-1 (§13).** If owner says "Snooze should NOT stop sound" → confirm Path A and close. Otherwise:

**Step 2: If owner picks Path B (stop in-progress only),** file a small CR titled "Snooze stops in-progress chime" amending the locked Phase 4 contract row C-2. Reference this report + the sister investigation. ~1-file CR, ~5 LoC.

**Step 3: If owner picks Path C (per-order mute for 5 min),** file as a follow-on CR with explicit changes to `soundManager.js` (add mute set), `NotificationContext.jsx` (consult mute set before play), and `ScanOrderPopOut.handleSnoozeClick` (add+timer-remove). Add tests T-11 / T-12 to `ScanOrderPopOut.test.jsx` mirroring T-8 / T-9 for sound.

**Step 4: If owner picks Path D**, escalate to a design review — this changes the Snooze semantic from "presentation hide" to "workflow mute" and conflicts with how `toggleSnooze` is reused by `OrderCard` / `DineInCard`.

**Step 5 (independent of Path):** Owner separately may want to fix the latent bugs already documented in the sister investigation (§7 #2 transient-refresh race; §7 #3 `toggleSnooze`-vs-`addSnooze`; §7 #4 dashboard set never clears). These are separate work items.

---

## 11. Regression Risks

| # | Risk | Severity | Notes |
|---|---|---|---|
| R-1 | Duplicate popup after snooze expiry | 🟢 LOW | popout-local hide-set is per-order; expiry deletes only that entry. Other orders unaffected. |
| R-2 | Hidden order forgotten if status flips during snooze | 🟢 LOW | Housekeeping useEffect at L202-223 cleans up. Status-flip removes from queue regardless. |
| R-3 | Sound never stops | 🟡 MEDIUM (perception only) | Sound is one-shot (~1-3 s). Stops naturally. Only persists across multiple back-to-back FCM events. |
| R-4 | Sound stops for wrong orders (if Path B/C/D adopted) | 🟡 MEDIUM | Mitigation: scope `soundManager.stop()` to FCM payload's `data.orderId`. Path C is the safest scoping option. |
| R-5 | Snoozed order never returns | 🟢 LOW | Two timers in place: popout-local 5-min, plus housekeeping. Cannot leak indefinitely. |
| R-6 | Polling re-add reopens snoozed order | 🟢 LOW | Filter is by orderId, not by source. Polling re-add cannot bypass hide-set unless the order also leaves and re-enters `orders` array (transient race — sister investigation root cause #2). |
| R-7 | Cashier misses urgent web order | 🟡 MEDIUM | Snooze is by-design 5 min. The chime plays once on arrival; subsequent reminders only come on the next FCM event. Cashier reliance on the dashboard card + queue badge is required. |
| R-8 | Sidebar Silent Mode and snooze-mute (Path C/D) interact incorrectly | 🟡 MEDIUM | `soundManager.isEnabled` short-circuits at the top of `play()`. Order of checks must be: Silent Mode → per-order mute → play. Easy to get wrong. |
| R-9 | Changing Snooze semantics breaks OrderCard / DineInCard / TableCard reuse of `toggleSnooze` | 🟢 LOW | Card snooze is purely visual dimming; no audio expectation today. |
| R-10 | POS2-006 confirm-order tone override conflict | 🟡 MEDIUM (Path C/D only) | Per-order mute must be checked AFTER tone resolution but BEFORE play. The override path runs inside `NotificationContext.processNotification` between L115-126; insert mute check at L130-132. |

---

## 12. QA Checklist

To run after any future Path B/C/D implementation. Today's Path-A QA simply confirms the locked contract still holds.

### 12.A Locked Phase 4 contract (run today regardless)

| # | Scenario | Expected |
|---|---|---|
| QA-1 | Web YTC order arrives via FCM/socket | Popup opens with the order |
| QA-2 | Click Snooze | Popup hides; underlying card dims |
| QA-3 | Wait 5 minutes | Same order's popup re-opens (if still YTC) |
| QA-4 | Order status flips to 1/2/... during snooze | Order removed from queue; popup does not reopen for it |
| QA-5 | Polling adds same order while snoozed | Popup stays hidden (hide-set filters by orderId) |
| QA-6 | Accept / Reject / View buttons | Unchanged behaviour vs Phase 4 QA report |
| QA-7 | Sound on order arrival | Plays once, ≈1-3 s; ends naturally |

### 12.B Sound behaviour (current Path-A)

| # | Scenario | Expected |
|---|---|---|
| QA-8 | Click Snooze while chime is still playing | Chime continues to natural end (~1-3 s) — by-design per C-2 |
| QA-9 | Click Snooze AFTER chime has ended | No sound (no chime to stop) |
| QA-10 | Second web order arrives 10 s after Snooze | New chime plays for the second order; first order remains snoozed |
| QA-11 | Sidebar Silent Mode = ON | No chimes for any order (existing behaviour, Snooze irrelevant) |

### 12.C Future paths (only if owner adopts B/C/D)

| Path | Test |
|---|---|
| B | Snooze stops the in-progress chime within 100 ms of click; no overlap |
| C | Snooze + new chime arrives within 5 min for the **same** orderId → no sound; for a different orderId → sound plays normally |
| C | Snooze expires after 5 min → next chime for that orderId plays normally again |
| D | Snooze suppresses all web-order chimes for 5 min; POS / takeaway / kitchen chimes unaffected |

---

## 13. Owner Questions

True blockers — answer needed before any change can be designed.

| # | Question | Why it blocks |
|---|---|---|
| **OQ-1** | **Should clicking Snooze stop the in-progress chime?** This is the literal owner ask paraphrased. If "no, leave as-is" → confirm Path A and close. If "yes" → choose Path B / C / D. | Determines whether to amend locked contract row C-2 at all. |
| **OQ-2** | **If yes to OQ-1: should Snooze mute future chimes for the same order during the 5-min snooze window?** | Distinguishes Path B (stop-only) from Path C (per-order mute). |
| **OQ-3** | **If yes to OQ-2: should Snooze mute ALL web-order chimes during the 5-min window, or only the specific snoozed orderId?** | Distinguishes Path C (per-order) from Path D (channel-wide). |
| **OQ-4** | **Should Snooze be per-order (today's behaviour) or have a global "snooze all web orders" mode?** | Distinguishes today's per-order design from a future "snooze all" feature. |
| **OQ-5** | **Should snooze survive a page reload?** Today: no (in-memory only, locked by test A-3 and contract L14-L17). | Determines whether to introduce localStorage / sessionStorage persistence — would require amending the locked anti-rule. |
| **OQ-6** | **Should snooze duration remain 5 minutes, become configurable, or change?** | Today fixed at `POPOUT_SNOOZE_MS = 5 * 60 * 1000`. Owner may want 1 min / 10 min / restaurant-setting-driven. |
| **OQ-7** | **Should the existing latent bugs from the sister investigation §7 be addressed in the same CR, or separately?** Specifically: (a) `toggleSnooze`-vs-`addSnooze` asymmetry, (b) dashboard `snoozedOrders` Set never auto-clears, (c) transient-refresh race deleting snooze entry. | Scope-bundles this CR with already-documented snooze defects. |

---

— End of Investigation Report —
