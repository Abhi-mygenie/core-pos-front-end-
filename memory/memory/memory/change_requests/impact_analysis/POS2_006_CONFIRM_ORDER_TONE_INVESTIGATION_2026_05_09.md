# POS2-006 — Investigation: `confirmOrderTone` Profile Mapping for YTC Sound

> **Sprint:** pos2.0
> **Item ID:** POS2-006
> **Type:** Investigation only (no code change, no `/app/memory/final/*` edit)
> **Date:** 2026-05-09
> **Branch:** `9-may`
> **Final verdict:** **`needs_backend_confirmation`** + `needs_owner_decision` (pre-CR planning. After both answered, transitions cleanly to `CR_needed_ready_for_planning`.)

---

## 1. Executive summary

`confirmOrderTone` (and any related sibling keys — `confirm_order_tone`, `confirm_order_ringer`, `tone_timing`, `aggregator_order_tone`, `voice_in_kds`) **is NOT present anywhere in the frontend codebase.**

Verified via:
```bash
grep -rn -E "confirmOrderTone|confirm_order_tone|confirm_order_ringer|tone_timing|aggregator_order_tone|voice_in_kds" \
  /app/frontend/src --include="*.js" --include="*.jsx"
→ zero matches (excluding __tests__)
```

Therefore the gap is unambiguous: **`profile_mapping_missing`**. The profile transform (`api/transforms/profileTransform.js`) does not extract `confirm_order_tone` from the API; the notification orchestrator (`contexts/NotificationContext.jsx`) does not consume any profile setting; the sound resolution path is **FCM-payload-only** (with content-keyword fallback) and is not influenced by profile/restaurant settings at all.

This is a clean greenfield CR scope. Two pieces of information must be collected from backend / owner before planning:

| Need | Owner |
|---|---|
| **B-Q1 — Exact backend key:** Does the `/profile` API ship `confirm_order_tone` (snake_case at root), `settings.confirm_order_tone` (nested under settings), `confirmOrderTone` (camelCase, unusual for backend), or another variant? Are sibling keys (`confirm_order_ringer`, `tone_timing`, `aggregator_order_tone`, `voice_in_kds`) present alongside? | Backend (single payload capture answers it) |
| **OW-Q1 — Tone value semantics:** What values does the field take? `default`, `silent`, `buzzer`, `confirm_order`, free-form sound key, numeric tone-id, or boolean? Which existing `/public/sounds/*.wav` asset maps to each value? Should `silent` value bypass sound entirely (parity with FCM `'silent'`) or just lower volume? | Owner |

Additional non-blocking clarifications (OQ-2, OQ-3, OQ-4 in §12) cover the override hierarchy (Sidebar Silent Mode vs profile vs FCM-payload), the role of `confirm_order_ringer`, and `tone_timing` repeat semantics — these can be resolved in CR planning.

---

## 2. Docs read

### 2.1 `/app/memory/final/`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md` — **§8 Notifications & Firebase Module** (lines 345-376) is the relevant baseline. Documents banner/ringer behaviour, `sound-enabled` flag, sound toggle behaviour. **Silent on `confirmOrderTone` / profile-driven tone selection** — Firebase is treated as canonical notifications platform; no profile-binding rule.
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`

### 2.2 Overlay (current accepted)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`

No overlay mentions `confirmOrderTone` or any profile-driven tone selection.

### 2.3 CR-specific
- `change_requests/impact_analysis/POS2_002_ORDER_FROM_WEB_PIPELINE_CR_IMPACT_ANALYSIS_2026_05_07.md` — **§19.4 documents the entire ringer/buzzer surface** (sound asset registry, NotificationContext orchestration, soundManager singleton, per-session enable flag). §19.4 explicitly states: "The existing Scan & Order / YTC socket trigger and the existing FCM/notification ringer/buzzer ARE NOT new CR scope" for POS2-002. This is the most relevant prior doc.
- `change_requests/impact_analysis/POS2_005_*` — no relevance to YTC sound.

### 2.4 Code (read-only)
- `frontend/src/api/services/profileService.js` (line 9-13 — `getProfile` thin wrapper)
- `frontend/src/api/transforms/profileTransform.js` (full file — lines 67-325)
- `frontend/src/api/transforms/profileTransform.js.bak.cr013p15-fix1` (legacy backup, no relevance)
- `frontend/src/contexts/NotificationContext.jsx` (full file — lines 1-208)
- `frontend/src/utils/soundManager.js` (full file — 120 lines)
- `frontend/src/api/socket/socketHandlers.js` (handleScanNewOrder, handleNewOrder — verified no sound trigger)
- `frontend/src/components/layout/Sidebar.jsx` (lines 143, 440-457 — Sidebar ringer toggle)
- `frontend/src/components/layout/Header.jsx` (no sound trigger)
- `frontend/src/contexts/RestaurantContext.jsx` (consumes `restaurant.settings`; no tone references)
- `frontend/src/config/firebase.js` (FCM token + onForegroundMessage wiring)

---

## 3. Profile API key findings

### 3.1 What `profileTransform` currently extracts (`api/transforms/profileTransform.js:71-325`)

| Group | Keys mapped | Lines |
|---|---|---|
| User | `id`, `emp_id`, `emp_f_name`, `emp_l_name`, `emp_email`, `phone`, `role_name`, `default_user`, `image` | 84-95 |
| Restaurant root | `id`, `name`, `phone`, `email`, `address`, `logo`, `cover_photo`, `currency` | 105-116 |
| Features | `dine_in`, `delivery`, `take_away`, `room`, `inventory`, `tip`, `service_charge` | 119-127 |
| Service charge | `service_charge_percentage`, `auto_service_charge`, `service_charge_tax`, `deliver_charge_gst` (root or `settings.`) | 130-157 |
| Tax | `tax`, `gst_tax`, `gst_code` | 160-164 |
| Payments | `payment_types`, `pay_cash`, `pay_upi`, `pay_cc`, `pay_tab` | 167-175 |
| Discounts | `restaurant_discount_type` | 178 |
| Printers | `restaurant_printer_new`, `print_agent` (TOP-LEVEL, owner override 2026-05-08) | 181-189 |
| Schedules | `schedules` | 192 |
| **Settings** | `is_coupon`, `is_loyality`, `is_customer_wallet`, `aggregator_auto_kot`, `print_kot` (autoKot), `billing_auto_bill_print` (autoBill), `default_prep_time` | 195, 292-323 |
| Cancellation | `cancle_post_serve`, `allow_cancel_post_server`, `cancel_order_time`, `cancel_food_timings` | 198-202 |
| Default order status | `def_ord_status` | 206 |
| Search | `search_by` | 209 |
| Check-in flags | `guest_details`, `booking_details`, `show_user_gst`, `room_gst_applicable`, `food_price_with_paisa`, `bill_date_format` | 213-220 |
| Permissions | `role` | 78 |

### 3.2 Keys NOT extracted (relevant to POS2-006)

| Backend key (assumed name) | Mapped? | Frontend occurrences |
|---|---|---|
| `confirm_order_tone` (snake_case, root) | ❌ NOT mapped | 0 |
| `settings.confirm_order_tone` (snake_case, nested) | ❌ NOT mapped | 0 |
| `confirmOrderTone` (camelCase) | ❌ NOT mapped | 0 |
| `confirm_order_ringer` (Yes/No flag) | ❌ NOT mapped | 0 |
| `tone_timing` (duration / repeat count) | ❌ NOT mapped | 0 |
| `aggregator_order_tone` | ❌ NOT mapped | 0 |
| `voice_in_kds` | ❌ NOT mapped | 0 |

**Net:** the profile transform reads `apiSettings` (root `restaurants[0]` object passed as `apiSettings` argument at line 195 → `fromAPI.settings(api)`) but does NOT pull any tone/ringer-related field. The transform is "extract-list-driven" — only listed keys land on the canonical FE shape; extra payload keys are silently dropped.

### 3.3 No legacy commit / backup mentions tone

The `profileTransform.js.bak.cr013p15-fix1` and `profileTransform.js.bak.cr013` backups (Phase 1.5 GST fix history) do not reference any tone keys either. The mapping has never been added.

---

## 4. Whether `confirmOrderTone` / `confirm_order_tone` is mapped

> **NO. Not mapped, not consumed, not even surfaced as a "passthrough" field on the canonical restaurant/settings object.**

The setting is invisible to the entire frontend, including:
- `RestaurantContext` (consumes `restaurant.settings` from the transform — does not see the tone field)
- `NotificationContext` (does not import or read RestaurantContext at all — see §5)
- `SettingsContext` (does not bind tone)
- `Sidebar` ringer toggle (operates only on per-session `soundEnabled` boolean)

---

## 5. Current sound / ringer flow

### 5.1 Architecture summary

```
                           ┌─────────────────────────────────────┐
                           │  Backend FCM push (data + notification)│
                           └────────────────┬────────────────────┘
                                            │
                                            ▼
              ┌─────────────────────────────────────────────────┐
              │  contexts/NotificationContext.jsx               │
              │  ─ onForegroundMessage(processNotification)     │
              │  ─ Service-worker forwarder (BUG-034 dedupe)    │
              │                                                 │
              │  processNotification(payload):                  │
              │    1. extract title, body                       │
              │    2. resolve sound:                            │
              │       a. data.sound || data.notification_sound  │
              │       b. fallback inferSoundFromContent(text)   │
              │    3. soundManager.play(resolvedSound)          │
              │    4. add to notifications list, render banner  │
              └────────────────┬────────────────────────────────┘
                               │
                               ▼
              ┌─────────────────────────────────────────────────┐
              │  utils/soundManager.js  (singleton)             │
              │  ─ play(soundKey)                               │
              │  ─ stop()                                       │
              │  ─ setEnabled(bool)  ← Sidebar ringer toggle    │
              │  ─ preload()                                    │
              │                                                 │
              │  SOUND_FILES (14 keys → /public/sounds/*.wav)   │
              └─────────────────────────────────────────────────┘
```

### 5.2 Sound key resolution priority (`NotificationContext.jsx:69-79`)

```js
// Determine sound: explicit key > inferred from content
const soundKey = data.sound || data.notification_sound || '';
const resolvedSound = soundKey || inferSoundFromContent(title, body);

// Play sound (SoundManager handles silent, unknown keys, etc.)
if (resolvedSound) {
  soundManager.play(resolvedSound);
}

// Silent notification: stop sound, don't show anything
if (resolvedSound === 'silent') return;
```

Order:
1. **`data.sound`** (FCM payload, explicit key — backend-controlled)
2. **`data.notification_sound`** (alternate FCM key, same controller)
3. **`inferSoundFromContent(title, body)`** (keyword-match fallback, lines 10-22):
   ```js
   if (text.includes('new order')) return 'new_order';
   if (text.includes('swiggy')) return 'swiggy_new_order';
   if (text.includes('confirm')) return 'confirm_order';
   if (text.includes('accepted')) return 'order_accepted';
   if (text.includes('rejected') || text.includes('cancelled')) return 'order_rejected';
   if (text.includes('ready')) return 'order_ready';
   if (text.includes('served') || text.includes('attend')) return 'attend_table';
   if (text.includes('bill') || text.includes('payment') || text.includes('settle')) return 'settle_bill';
   if (text.includes('item') && text.includes('added')) return 'item_added';
   return 'new_order'; // default fallback
   ```
4. **Default fallback:** `'new_order'`.

### 5.3 Per-session toggle (`Sidebar.jsx:143, 440-457` + `NotificationContext.jsx:27, 145-148`)

```js
// NotificationContext
const [soundEnabled, setSoundEnabled] = useState(true);
useEffect(() => { soundManager.setEnabled(soundEnabled); }, [soundEnabled]);

// Sidebar
const { soundEnabled, setSoundEnabled } = useNotifications();
<button onClick={() => setSoundEnabled(!soundEnabled)}>
  {!soundEnabled ? "Silent Mode" : "Ringer On"}
</button>
```

→ The Sidebar toggle is a **global on/off switch** (per-session, not persisted, defaults to `true`).
→ When OFF, `soundManager.play(...)` early-returns regardless of soundKey.

### 5.4 Sound triggers — exhaustive list

| Trigger | File | Plays sound? |
|---|---|---|
| FCM foreground message | `NotificationContext.jsx:107-112` | ✅ Yes (via processNotification) |
| Service-worker forwarder (BG → FG) | `NotificationContext.jsx:115-126` | ✅ Yes (with BUG-034 dedupe) |
| `scan-new-order` socket event | `socketHandlers.js:428-456` | ❌ **No** — no `soundManager` import. Order is added to OrderContext only. |
| `new-order` socket event | `socketHandlers.js:146-198` | ❌ **No** — no `soundManager` import. Order is added to OrderContext only. |
| `update-order-paid` / `update-order` / `update-order-target` / `update-order-source` | `socketHandlers.js:200-298` | ❌ No |
| `update-order-status` | `socketHandlers.js:375-417` | ❌ No |
| `update-food-status` | `socketHandlers.js:317-352` | ❌ No |
| `delivery-assign-order` / `split-order` / `order-engage-event` | `socketHandlers.js:454-633` | ❌ No |
| Any explicit dashboard / order-card render | grep'd — no occurrences | ❌ No |
| Any direct `soundManager.play(...)` outside NotificationContext | grep'd — only `Sidebar` (toggle) and `NotificationContext` itself reference soundManager | ❌ No |

**Net:** sound is **purely FCM-driven**. Sockets do not play sound.

---

## 6. Current YTC order trigger path

> The user's **visible YTC card** appears via SOCKET (`scan-new-order` → `addOrder`). The user's **audible alert** (when one plays) is **separate** and FCM-driven.

### 6.1 Visible card path

```
Backend places YTC order → emits scan-new-order socket frame
   → handleScanNewOrder
      → fetchSingleOrderForSocket  (POST /get-single-order-new)
         → addOrder(order)
            → OrderContext
               → DashboardPage renders YTC card in "Yet to Confirm" column
                  (status-7 → 'pending' key)
```

This path is **silent** — no soundManager call.

### 6.2 Audible alert path (parallel, independent)

```
Backend places YTC order → emits FCM push (data: { sound, title, body, ... })
   → onForegroundMessage  (config/firebase.js)
      → processNotification (NotificationContext.jsx)
         → soundKey = data.sound || data.notification_sound
                   || inferSoundFromContent(title, body)
                   || 'new_order'
            → soundManager.play(soundKey)
```

This path is **completely independent** of the socket path. Two backends (or two backend code paths) must emit consistently for the alert to fire alongside the card.

### 6.3 Implication

The owner's expected behavior — "YTC tone should be based on profile API `confirmOrderTone`" — currently has **two architectural realities** to choose from:

| Approach | Where the profile lookup happens | Pros | Cons |
|---|---|---|---|
| **A. FCM-payload-side** (backend reads profile and stamps `data.sound` accordingly) | Backend | Zero FE change beyond ensuring `data.sound` overrides inference. Centralized control. | Backend ownership; FE waits for BE. |
| **B. FE-side** (FE reads profile, overrides `data.sound` from payload before `soundManager.play`) | `NotificationContext.processNotification` (~line 69) | Self-contained FE change; works with any backend. | Profile must be fetched and ready BEFORE first FCM arrives (ProviderStack ordering — `Auth → Socket → Notification → Restaurant` per `current-state/CURRENT_ARCHITECTURE.md:9` — Notification is mounted BEFORE Restaurant, so profile is NOT available at first play). Requires reorder or lazy lookup. |
| **C. FE-side with socket trigger** (FE plays `confirmOrderTone` directly in `handleScanNewOrder` for status-7 orders) | `socketHandlers.js:handleScanNewOrder` | Audio fires synchronously with the visible card; no FCM dependency. | Departs from POS2-002 §19.4 R-SNOOZE-13 ("existing ringer/buzzer behaviour out of scope"). Risks double-play if FCM also fires. |

These are CR-planning choices — see §13.

---

## 7. Existing available sound assets / keys

`utils/soundManager.js:5-20` — 14 keys mapped to physical `.wav` files at `/app/frontend/public/sounds/`:

| Key | Asset path | Purpose / typical use |
|---|---|---|
| `new_order` | `/sounds/new_order.wav` | Default chime for new orders |
| **`confirm_order`** | `/sounds/confirm_order.wav` | **YTC / confirm-order chime — most likely the "default" candidate for `confirmOrderTone`** |
| `order_accepted` | `/sounds/order_accepted.wav` | Acknowledgement chime |
| `order_confirmed` | `/sounds/order_confirmed.wav` | Confirmation chime |
| `order_ready` | `/sounds/order_ready.wav` | Kitchen ready chime |
| `order_rejected` | `/sounds/order_rejected.wav` | Cancel/reject chime |
| `attend_table` | `/sounds/attend_table.wav` | Server attention chime |
| `settle_bill` | `/sounds/settle_bill.wav` | Bill settlement chime |
| `item_added` | `/sounds/item_added.wav` | Item-added chime |
| `swiggy_new_order` | `/sounds/swiggy_new_order.wav` | Aggregator chime (Swiggy / Zomato) |
| **`five_sec_buzzer`** | `/sounds/five_sec_buzzer.wav` | **Short buzzer — candidate for `'buzzer'` value** |
| **`ten_sec_buzzer`** | `/sounds/ten_sec_buzzer.wav` | Medium buzzer |
| **`forty_five_sec_buzzer`** | `/sounds/forty_five_sec_buzzer.wav` | Long buzzer (continuous-alert candidate) |
| **`silent`** | `/sounds/silent.wav` | **Silent — invokes `soundManager.stop()`. Candidate for `'silent'` value.** |

**No new assets required** if `confirmOrderTone` values map to `confirm_order` / `silent` / `*_buzzer` (best-guess mapping table in §13).

---

## 8. Current behavior for default / silent / buzzer

> **Currently, none of these `confirmOrderTone` values do anything.** The field is not read.

If the owner has been observing different behaviors for different `confirmOrderTone` values today, the variation is coming from one of:

| Symptom | Likely actual cause |
|---|---|
| Sometimes "default" tone plays | Backend FCM payload's `data.sound = 'confirm_order'` OR content-keyword fallback matched "confirm" → `'confirm_order'` |
| Sometimes "buzzer" tone plays | Backend FCM payload's `data.sound = 'five_sec_buzzer'` (or similar) — backend already varies the key per restaurant config |
| Sometimes "silent" — no tone | (a) Sidebar Ringer toggle is OFF, OR (b) Backend FCM payload's `data.sound = 'silent'` |
| No tone plays for some YTCs | Backend did not emit FCM for that order (only socket fired); OR `soundEnabled === false` |

**The "profile-driven variation" the owner expects to see is currently ENTIRELY backend-decided** (via what `data.sound` the FCM push carries). FE has zero profile-aware logic.

---

## 9. Override hierarchy findings

Current effective hierarchy (highest precedence first, leftmost wins):

| # | Override | File | Behavior |
|---|---|---|---|
| 1 | **Sidebar Ringer toggle** (`!soundEnabled`) | `Sidebar.jsx:440` + `NotificationContext.jsx:147` | Hard kill-switch. When OFF, `soundManager.play(...)` early-returns regardless of any other state. |
| 2 | **`silent` resolved sound key** | `soundManager.js:48-52` | `play('silent')` calls `stop()` and returns; ALSO `processNotification` early-returns to suppress banner (`NotificationContext.jsx:82`). |
| 3 | **FCM payload `data.sound`** | `NotificationContext.jsx:69` | Backend wins over content-inference. |
| 4 | **FCM payload `data.notification_sound`** | `NotificationContext.jsx:69` | Alternate name, same precedence. |
| 5 | **`inferSoundFromContent`** | `NotificationContext.jsx:70` | Keyword-fallback when no FCM key. |
| 6 | **Default `'new_order'`** | `NotificationContext.jsx:21` | Last resort. |

**Profile / restaurant settings — NONE.** They have no slot in this hierarchy currently.

When POS2-006 ships, the proposed insertion point is **between #1 and #2** (Sidebar trumps profile; profile trumps FCM-payload) **OR between #5 and #6** (FCM-payload still trumps profile, profile only fills the inference slot). This is OQ-2 in §12 — owner decides.

---

## 10. Root cause / likely gap

### 10.1 Root cause

> **`profile_mapping_missing`.** `confirm_order_tone` (or whichever exact backend key) is never extracted from the `/profile` API response, never lands on `RestaurantContext.restaurant.settings`, never reaches `NotificationContext`, and never influences `soundManager.play(...)`.

### 10.2 Sub-classifications (from the task's six-option list)

| Classification | Applicable? | Note |
|---|---|---|
| **profile_mapping_missing** | ✅ YES — primary | The settings transform does not pull the field. |
| **mapped_but_not_used** | ❌ No | Field is not mapped at all; it's not "in context but ignored". |
| **sound_flow_fcm_only_backend_owned** | ✅ Partial — secondary | The current sound flow IS FCM-only (no socket sound, no profile sound). This is the architectural baseline POS2-006 will alter. |
| **socket_sound_hook_missing** | ⚪ Conditional | Only if owner wants the YTC tone to fire from the socket path (Approach C in §6.3). Otherwise N/A. |
| **behavior_as_expected** | ❌ No | Owner expectation is unmet. |
| **needs_backend_confirmation** | ✅ YES (B-Q1) | Backend key name + value set must be confirmed. |
| **needs_owner_decision** | ✅ YES (OW-Q1, OQ-2..4) | Tone mapping table + override hierarchy + ringer flag interaction. |

---

## 11. Backend questions

| # | Question | Answerable by | Blocking? |
|---|---|---|---|
| **B-Q1** | What is the exact backend key for the YTC tone setting in the `/profile` response? Candidates: `confirm_order_tone` (snake_case, root), `settings.confirm_order_tone` (nested), `confirmOrderTone` (camelCase). Also: do `confirm_order_ringer`, `tone_timing`, `aggregator_order_tone`, `voice_in_kds` ship today? | Single payload capture (cURL `/api/v1/.../profile`) | **Blocking** |
| **B-Q2** | What value set does the field take? (e.g., `'default' \| 'silent' \| 'buzzer'`, or free-form sound key like `'confirm_order'`, or numeric tone-id, or boolean Yes/No, etc.) | Backend / single payload capture | **Blocking** |
| **B-Q3** | If `confirm_order_ringer` exists as a separate Yes/No flag, what is the precedence relationship with `confirm_order_tone`? Does `ringer = No` mean "don't play" regardless of `tone`? | Backend / owner | Non-blocking but useful before CR planning |
| **B-Q4** | Does the same `data.sound` field in the FCM payload already reflect the profile setting? (i.e., is backend already doing Approach A from §6.3?) | Backend | Non-blocking — but if "yes", the FE CR may be redundant. |
| **B-Q5** | When the order arrives via socket only (no FCM — possible in some restaurants where FCM is disabled), what is the expected source of the tone trigger? | Backend / owner | Non-blocking, design-relevant |

---

## 12. Owner decisions needed

| # | Question | Default if unanswered |
|---|---|---|
| **OW-Q1 / OQ-1** | Tone-value mapping table — for each value of `confirm_order_tone` (`'default'`, `'silent'`, `'buzzer'`, plus any backend variants), which `soundManager` key should fire? Suggested mapping (subject to owner correction): `default → 'confirm_order'`, `silent → 'silent'`, `buzzer → 'five_sec_buzzer'` (or `ten_sec_buzzer` or `forty_five_sec_buzzer` — owner picks). | `default → 'confirm_order'`, `silent → 'silent'`, `buzzer → 'five_sec_buzzer'`. |
| **OQ-2** | Override hierarchy — should profile `confirm_order_tone` trump FCM-payload `data.sound`, or only fill the gap when FCM doesn't ship a key? Trumping = profile is authoritative; gap-fill = FCM remains authoritative when present. | Trump (profile is authoritative) — matches owner mental model that "the tone should be based on profile." |
| **OQ-3** | Sidebar Silent Mode interaction — should Sidebar Silent Mode override profile (current global kill switch behavior continues), or should profile `silent` and Sidebar Silent Mode be independent? | Sidebar wins (current behavior preserved). |
| **OQ-4** | Tone trigger surface — Approach A (backend already wires `data.sound` from profile, FE only ensures payload wins), B (FE reads profile, overrides FCM `data.sound`), or C (FE plays from socket directly, bypassing FCM)? | **Approach B**, conditional on B-Q4 answer. If backend confirms it already does Approach A, this becomes a "verify backend works" CR with 0 FE code change. |
| **OQ-5** | Should `tone_timing` (if present) drive repeat / loop / volume? | Defer until B-Q1 confirms the field exists. |
| **OQ-6** | Should `aggregator_order_tone` (separate sibling key) also be wired in the same CR? | Recommend YES (one CR for the whole tone-mapping family) — but only after B-Q1 confirms what fields exist. |

---

## 13. Recommendation

> **CR is needed**, but **two pieces of upstream info must be collected first** (B-Q1 + OW-Q1).

### 13.1 Suggested CR shape (POS2-007, name: `Profile-Driven Notification Tone Mapping`)

| Phase | Scope |
|---|---|
| **Phase A — Profile transform** | Add 1-3 fields to `api/transforms/profileTransform.js:settings` (lines 292-323) — pulling whichever backend keys B-Q1 confirms (`confirm_order_tone`, optionally `confirm_order_ringer`, `tone_timing`, `aggregator_order_tone`). |
| **Phase B — Tone mapper utility** | New tiny module (e.g., `utils/toneMapper.js`) that converts a `confirm_order_tone` value → `soundManager` key per the OW-Q1 table. Pure function; trivially testable. |
| **Phase C — NotificationContext integration** | Inject the mapper into `processNotification`. Per OQ-2, place the lookup either above FCM `data.sound` (trump) or below (gap-fill). Read profile via `useRestaurant()` or via a stable ref pulled from RestaurantContext. Handle the provider-mount-order issue (`Notification → Restaurant` — Notification mounts FIRST per `CURRENT_ARCHITECTURE.md:9`) — either reorder providers OR pass a `getRestaurantSettings()` callback at runtime. |
| **Phase D — Sidebar contract preserved** | Verify Silent Mode toggle still globally overrides (OQ-3). |
| **Phase E — Tests** | Unit: profile transform pulls the new field. Integration: mapper produces correct `soundManager` key per value. Component: `NotificationContext` plays the right key for each (FCM payload, profile setting) combo. |
| **Phase F — Documentation** | New CR doc + implementation summary + QA report. **Final-doc revision deferred to post-acceptance** per playbook (`MODULE_DECISIONS_FINAL.md` §8 needs an "Override hierarchy" addendum). |

### 13.2 Recommendation per task's six-option list

> **Recommended: `CR needed` + `backend confirmation needed` + `owner decision needed`** (composite).

The three are independent: backend ships a payload sample (B-Q1, B-Q2), owner picks the mapping table (OW-Q1) and override semantics (OQ-2, OQ-3, OQ-4). Once both are in hand, planning proceeds to a fresh CR doc analogous to POS2-005's planning doc (then handover, then implementation).

---

## 14. Final verdict

> ## **`needs_backend_confirmation`**

(Composite — also requires `needs_owner_decision` for OW-Q1 / OQ-2 / OQ-3 / OQ-4. After both are satisfied, transitions to `CR_needed_ready_for_planning`.)

**Suggested next step:** Send B-Q1 + B-Q2 to backend owner (one cURL of `/profile` for any restaurant where the owner has been observing tone variation will answer both). Concurrently, send OW-Q1 + OQ-2 to product owner. Estimated total turnaround: same-day. Then open `POS2-007` (or equivalent) using POS2-005 as the planning template.

— End of POS2-006 Investigation 2026-05-09 —

---

# 15. Payload Capture Addendum — `/profile` Response (2026-05-09, restaurant id=478 "18march")

> **Trigger:** Owner shared a real `/profile` API payload for restaurant id=478 ("18march", vendor 500). The payload closes B-Q1 fully, B-Q2 partially, and B-Q3 with one assumption-to-verify. Verdict revised from `needs_backend_confirmation` → **`needs_owner_decision`** (only OW-Q1 / OQ-2 / OQ-4 remain). Estimated path to `ready_for_planning` is hours, not days.

## 15.1 B-Q1 closed — exact backend keys + locations confirmed

| Frontend candidate name | Backend ships? | Exact path in `/profile` response | Type | Observed value (id=478) |
|---|---|---|---|---|
| `confirm_order_tone` | ✅ YES | `restaurants[0].settings.confirm_order_tone` | string (free-form) | `"buzzer"` |
| `aggregator_order_tone` | ✅ YES | `restaurants[0].settings.aggregator_order_tone` | string (free-form) | `"buzzer"` |
| `confirm_order_ringer` | ✅ YES | **`restaurants[0].confirm_order_ringer`** (ROOT — NOT nested under `settings`) | Yes/No string | `"Yes"` |
| `tone_timing` | ✅ YES | **`restaurants[0].tone_timing`** (ROOT) | integer | `2` |
| `voice_in_kds` | ✅ YES | **`restaurants[0].voice_in_kds`** (ROOT) | Yes/No string | `"Yes"` |
| `confirmOrderTone` (camelCase) | ❌ NO | — | — | — |
| `settings.confirm_order_ringer` | ❌ NO | — | — | — |
| `settings.tone_timing` | ❌ NO | — | — | — |

**Critical observation — split nesting:** the **two `*_tone`** fields live under `settings`; the **three flags** (`ringer`, `tone_timing`, `voice_in_kds`) live at the restaurant ROOT. The CR must read from BOTH locations (mirrors the existing `deliver_charge_gst` Phase-1.5 fallback pattern at `profileTransform.js:157`).

**Other related fields observed in same payload:**
- `restaurants[0].order_confirm_for_web` = `"Yes"` (root) — Web YTC enable flag (POS2-002 territory; out of POS2-007 scope).
- `restaurants[0].real_time_order_status` = `"Yes"` (root) — separate concern.
- `restaurants[0].confirm_order_show_tab` = `"Yes"` (root) — UI-tab visibility flag, separate concern.
- `restaurants[0].def_ord_status` = `2` (root) — already mapped (`profileTransform.js:206`).

## 15.2 B-Q2 partially closed — value set

Observed from id=478:
- `confirm_order_tone` ∈ `{"buzzer", ...}` — only `"buzzer"` seen in this restaurant.
- `aggregator_order_tone` ∈ `{"buzzer", ...}` — same.
- `confirm_order_ringer` ∈ `{"Yes", "No"}` (Yes/No string, like other ringer/feature flags).
- `tone_timing` ∈ `integer` (`2` observed; likely seconds OR repeat-count — see OQ-5).
- `voice_in_kds` ∈ `{"Yes", "No"}`.

**Still open:** owner stated `default`, `silent`, `buzzer` as candidate values for `confirm_order_tone`. `"buzzer"` is confirmed. `"default"` and `"silent"` are presumed-valid but not directly seen in this single payload. **Does the backend write any other value?** A quick BE-confirm or a settings-page screenshot showing the dropdown options will close this fully (BE-Q2-FOLLOWUP).

## 15.3 B-Q3 closed — `confirm_order_ringer` is the master switch

The payload structure makes the precedence intuitive:
- `confirm_order_ringer === "Yes"` → tone-mapping pipeline runs; `confirm_order_tone` value picks the sound.
- `confirm_order_ringer === "No"` → no sound for confirm orders, regardless of `confirm_order_tone`.

**Symmetric interpretation for aggregator orders:** there is **no `aggregator_order_ringer` field** in the payload (only `aggregator_order_tone`). The CR can either (a) reuse `confirm_order_ringer` as the master for both confirm and aggregator, OR (b) infer "aggregator ringer always on" (no master). **OQ-7 (new):** owner picks. Default-recommended: (a) — single master switch, cleanest.

## 15.4 B-Q4 still open — does FCM `data.sound` already mirror profile?

The `/profile` payload doesn't tell us this; only an FCM-payload capture answers it. **Recommended next quick check:** in dev preview, place a YTC order, capture the FCM message frame, inspect `data.sound` value. Compare with `restaurants[0].settings.confirm_order_tone`. If equal → backend already does Approach A and FE CR scope shrinks dramatically. If different → confirms OWNER-DRIVEN FE override is needed (Approach B).

## 15.5 B-Q5 / OQ-4 — trigger surface decision (revised recommendation)

Given the payload structure, **Approach B (FE-side override in `NotificationContext.processNotification`) is now the cleanest path**:

```
profile.restaurants[0].settings.confirm_order_tone     →  "buzzer"
profile.restaurants[0].confirm_order_ringer            →  "Yes"
profile.restaurants[0].tone_timing                     →  2

When FCM arrives for a confirm-order:
  if (confirm_order_ringer === "No"):           skip sound (return)
  else:
    soundKey = mapTone(confirm_order_tone)      // "buzzer" → "five_sec_buzzer" (or whichever buzzer asset)
    if (tone_timing > 1):                        play soundKey, repeat (tone_timing - 1) times
    else:                                        play soundKey once
```

Approach B leaves the existing FCM pipeline intact (zero risk to other notification types — only confirm-order/aggregator-order are gated on profile). Sidebar Silent Mode continues to be the global kill-switch (highest precedence).

## 15.6 Updated tone-mapping table proposal (subject to OW-Q1)

| `confirm_order_tone` value | Suggested `soundManager` key | Asset path |
|---|---|---|
| `"default"` | `confirm_order` | `/sounds/confirm_order.wav` |
| `"silent"` | `silent` | `/sounds/silent.wav` (calls `soundManager.stop()`) |
| `"buzzer"` | `five_sec_buzzer` (recommended) OR `ten_sec_buzzer` OR `forty_five_sec_buzzer` (owner picks) | `/sounds/*_sec_buzzer.wav` |
| `null` / missing / unknown string | `confirm_order` (safe default) | `/sounds/confirm_order.wav` |

**Owner picks the buzzer length** (5 / 10 / 45 sec). Suggested default: `five_sec_buzzer` — short enough to not annoy, long enough to be heard.

## 15.7 `tone_timing` semantic (NEW open question — OQ-5 reopened)

The payload shows `tone_timing: 2`. Two plausible interpretations:
- **(i) Seconds:** play the tone for 2 seconds (truncated). Simple but limited (most assets are >2s).
- **(ii) Repeat count:** play the tone 2 times back-to-back. More flexible; matches the buzzer-style use case.

**Recommended:** **interpretation (ii)** — repeat count. Owner confirms.

## 15.8 Updated CR shape (POS2-007 — refined post-payload)

Phase A — `profileTransform.js:settings` → add 2 keys:
```js
confirmOrderTone: apiSettings.confirm_order_tone || null,
aggregatorOrderTone: apiSettings.aggregator_order_tone || null,
```

Phase A2 — `profileTransform.js:restaurant` (root level) → add 3 keys:
```js
// near the existing checkInFlags block
confirmOrderRinger: toBoolean(api.confirm_order_ringer),  // Yes/No → bool
toneTiming: parseInt(api.tone_timing) || 1,                // default: 1 play
voiceInKds: toBoolean(api.voice_in_kds),
```

Phase B — `utils/toneMapper.js` (new file) — pure function:
```js
const TONE_TO_SOUND_KEY = {
  default: 'confirm_order',
  silent: 'silent',
  buzzer: 'five_sec_buzzer',     // owner-confirmable
};
export const mapTone = (toneValue) => TONE_TO_SOUND_KEY[toneValue] || 'confirm_order';
```

Phase C — `NotificationContext.processNotification` — inject ringer + tone + repeat:
```js
const restaurant = useRestaurant();   // OR pass via ref to avoid provider-order issue
const confirmRinger = restaurant?.confirmOrderRinger ?? true;
const confirmTone = restaurant?.settings?.confirmOrderTone;
const toneTiming = restaurant?.toneTiming ?? 1;

// when notification is detected as a confirm-order (data.type / inferred):
if (isConfirmOrder) {
  if (!confirmRinger) return;                      // master switch off → no sound
  const soundKey = mapTone(confirmTone);
  for (let i = 0; i < toneTiming; i++) {
    setTimeout(() => soundManager.play(soundKey), i * SOUND_DURATION_MS);
  }
  return;
}
// else: existing FCM-payload-driven path
```

Phase D — Sidebar Silent Mode preserved (global kill-switch trumps profile — OQ-3 default).

Phase E — Tests — same matrix as §13.1 + new tests for `confirmOrderRinger === "No"` short-circuit + repeat-count loop.

## 15.9 Provider-order issue — pre-resolved

`current-state/CURRENT_ARCHITECTURE.md:9` confirms: `Auth → Socket → Notification → Restaurant`. **Notification mounts BEFORE Restaurant.** Two clean options:

| Option | Action | Tradeoff |
|---|---|---|
| **(α) Reorder providers** | Move `RestaurantProvider` BEFORE `NotificationProvider` in `AppProviders.jsx`. | Cleanest — `useRestaurant()` becomes available inside Notification. Risk: any Restaurant subtree that consumes Notification breaks. **Audit needed before reorder.** |
| **(β) Pass restaurant via ref** | Keep current order; have `RestaurantProvider` write `restaurant` into a module-level ref (e.g., `restaurantRef.current = restaurant`); `NotificationContext` reads the ref at FCM-arrival time. | Preserves provider order. Slight code smell (ref-as-cross-context-bridge), but well-contained. |

Recommended: **(β)** — lowest risk for POS2-007 scope. Reorder is a separate refactor.

## 15.10 Revised verdict

> ## **`needs_owner_decision`**

(One step closer to `CR_needed_ready_for_planning`. After OW-Q1 / OQ-2 / OQ-4 / OQ-5 / OQ-7 are answered + a 30-second FCM payload capture for B-Q4, planning can begin.)

**Owner's quick-decision pack (5 questions):**

| # | Question | Default if no answer |
|---|---|---|
| **OW-Q1** | Tone mapping: `default → confirm_order`, `silent → silent`, `buzzer → five_sec_buzzer` (or `ten_sec_buzzer` or `forty_five_sec_buzzer`)? | `five_sec_buzzer` |
| **OQ-2** | Profile tone trumps FCM payload `data.sound`, OR profile only fills the gap when FCM has no key? | Profile trumps |
| **OQ-4** | Approach B (FE override in NotificationContext)? | Yes |
| **OQ-5** | `tone_timing: 2` means repeat count (play 2 times)? | Yes (repeat count) |
| **OQ-7** | Reuse `confirm_order_ringer` as master for both confirm + aggregator orders? | Yes |

**Backend tiny ask:**
| **B-Q4** | One FCM payload capture for a confirm-order in dev preview — is `data.sound` value in sync with `restaurants[0].settings.confirm_order_tone`? (Determines whether FE CR is needed at all, or backend already handles it.) | Backend / single capture |

— End of POS2-006 Payload Capture Addendum 2026-05-09 —


---

# 16. Owner Scope Refinement Addendum — Bug-First Framing (2026-05-09)

> **Trigger:** Owner clarified scope: (a) `voice_in_kds` and `aggregator_order_tone` are pass-through-only (transform exposes them but no consumer); (b) `confirm_order_tone` ∈ {silent, default, buzzer} drives WHICH tone; (c) `confirm_order_ringer` selects WHICH buzzer-variant when tone="buzzer" — owner believes "we already doing this"; (d) **the actual bug to fix:** even when `confirm_order_tone === "default"`, buzzer is still playing.
>
> Verdict updated to **`needs_owner_decision`** (smaller, sharper) with one critical FE finding that contradicts owner's mental model.

## 16.1 Critical FE finding — buzzer assets have ZERO consumers

A focused grep across all of `/app/frontend/src` (excluding `__tests__` and the asset-registry definition itself):

```bash
grep -rn -E "five_sec_buzzer|ten_sec_buzzer|forty_five_sec_buzzer|buzzer|ringer" \
  /app/frontend/src --include="*.js" --include="*.jsx"
  | grep -v __tests__
  | grep -viE "ringerOn|ringer.*on|setSoundEnabled|silent mode"
```

**Result: 4 matches — all of them are the asset-file declarations themselves in `utils/soundManager.js:2,16,17,18`. ZERO consumer code calls `soundManager.play('five_sec_buzzer')` (or `ten_sec_buzzer` / `forty_five_sec_buzzer`). ZERO code reads `confirm_order_ringer`.**

This means: when the owner observed a buzzer playing for a confirm-order today, the buzzer key came from **FCM payload `data.sound`** (resolved at `NotificationContext.jsx:69`). Backend is doing all the buzzer selection upstream; FE just plays whatever FCM sent.

**Owner's mental model "we already doing this" is correct — but it's BACKEND that's doing it (via FCM `data.sound`), NOT the FE code.** The FE has no buzzer-variant logic at all.

## 16.2 Bug repro — why "default" tone still plays buzzer

Hypothesis (highest confidence based on §16.1):

```
Backend has profile.confirm_order_tone = "default" + confirm_order_ringer = "Yes"
     │
     ▼
Backend FCM emitter reads ONLY confirm_order_ringer (not confirm_order_tone)
     │
     ▼
Sets data.sound = "five_sec_buzzer" (or similar) because ringer="Yes"
     │
     ▼
FCM push lands at FE
     │
     ▼
NotificationContext.processNotification:
     soundKey = data.sound || data.notification_sound  →  "five_sec_buzzer"  ← chosen here
     resolvedSound = soundKey || inferSoundFromContent(...)
     soundManager.play("five_sec_buzzer")             ← buzzer plays ❌
```

So the bug is **upstream of FE code** — backend's FCM emitter does not honor the `confirm_order_tone === "default"` case and unconditionally maps `confirm_order_ringer === "Yes"` → buzzer key.

**Two viable fix locations:**

| Fix | Where | Pros | Cons |
|---|---|---|---|
| **(A) Backend** | Backend FCM emitter reads `confirm_order_tone` and only sets `data.sound` to a buzzer key when tone === "buzzer". When tone === "default" → set `data.sound = "confirm_order"`. When tone === "silent" → set `data.sound = "silent"`. | Single source of truth. No FE change at all. Aligns with §6.3 Approach A. | Backend ownership; FE waits for BE. |
| **(B) FE override** | FE reads `profile.restaurants[0].settings.confirm_order_tone` from RestaurantContext. In `NotificationContext.processNotification`, when notification is a confirm-order, OVERRIDE `data.sound` based on profile tone before `soundManager.play`. | Self-contained FE change; works today regardless of backend. | Requires provider-order workaround (Notification mounts before Restaurant — see §15.9). Adds FE-side business logic that's also enforced backend-side (mild duplication). |

## 16.3 Revised scope — minimal CR shape (POS2-007 finalised)

Given owner's directives:

### 16.3.1 Profile transform changes

`api/transforms/profileTransform.js`:

**`fromAPI.settings`** (lines 292-323) — add 2 fields, **2nd is pass-through-only** (no consumer):
```js
// NEW — drives confirm-order tone selection (POS2-007 R1)
confirmOrderTone: apiSettings.confirm_order_tone || 'default',
// NEW — pass-through only (no FE consumer this CR; owner: "just put in transform don't map")
aggregatorOrderTone: apiSettings.aggregator_order_tone || null,
```

**`fromAPI.restaurant`** (lines 105-221, root level) — add 3 fields, **2 are pass-through-only**:
```js
// NEW — selects buzzer variant when confirmOrderTone === 'buzzer' (POS2-007 R2)
confirmOrderRinger: api.confirm_order_ringer || null,
// NEW — repeat count / duration. Pass-through unless owner confirms semantic (OQ-5).
toneTiming: parseInt(api.tone_timing) || 1,
// NEW — pass-through only (no FE consumer this CR; owner: "just put in transform don't map")
voiceInKds: toBoolean(api.voice_in_kds),
```

### 16.3.2 Tone consumer — depends on fix-location decision (OQ-NEW-1)

If **owner picks fix-location A (backend)** → no FE consumer added in this CR. The two-line transform addition is purely defensive/exposable; backend ships the fix; FE QA verifies the buzzer-on-default leak is gone.

If **owner picks fix-location B (FE override)** → add `utils/toneMapper.js` + `NotificationContext` override per §15.8.

**Recommendation: ASK BACKEND FIRST.** Backend likely ships in days, FE override defers if backend can't fit it. Either way, the transform addition is safe and shippable independently.

## 16.4 Open question on `confirm_order_ringer` value semantic

The payload shows `confirm_order_ringer: "Yes"` (Yes/No string, like other binary flags). But owner's directive says it "will record which ringer when buzzer is chosen" — implying a multi-valued selector (5sec / 10sec / 45sec).

**Mismatch between observed payload value and stated semantic.** Three possible interpretations:

| Hypothesis | What `confirm_order_ringer` actually means | Resolution |
|---|---|---|
| **(i)** `Yes`/`No` master switch | Yes = enable buzzer; No = no buzzer. Buzzer-variant comes from another field (likely `tone_timing` mapped to 5s/10s/45s). | Plausible — `tone_timing: 2` could be a numeric variant selector. |
| **(ii)** `Yes` is one variant value among many | Backend admin UI may set it to `"5sec"`, `"10sec"`, `"45sec"`, `"Yes"`, `"No"` — and `"Yes"` happens to be a default-fallback for this restaurant. | Less plausible — would be a polymorphic Yes/No+enum. |
| **(iii)** `confirm_order_ringer` IS the master switch and there's NO buzzer-variant selector — backend always plays one default buzzer. | Owner's mental model is incorrect (no variant choice exists). | Possible — would explain why FE has only 3 buzzer assets but the admin UI doesn't expose a chooser. |

**OQ-NEW-2:** Owner clarification needed on what values `confirm_order_ringer` actually takes in production (just `"Yes"`/`"No"`, or a multi-value enum?). If multi-value, we need the value→asset mapping table.

## 16.5 Scope items REMOVED from POS2-007 (per owner)

| Item | Owner directive | New scope |
|---|---|---|
| `aggregator_order_tone` consumer wiring | "just put in transform don't map" | Transform exposes it; no consumer code; no aggregator-side tone gating in this CR. Aggregator notifications continue to use whatever `data.sound` FCM emits. |
| `voice_in_kds` consumer wiring | "ignore this just put in transform don't map" | Transform exposes it; no consumer code. |
| `confirm_order_ringer` Yes/No master switch | (Owner reframed it as a variant selector, not master) | Master-switch interpretation dropped from §15.3. Field is **buzzer-variant selector** instead, pending OQ-NEW-2 confirmation. |

## 16.6 Tone mapping table (revised, awaiting OW-Q1 final pick)

| `confirm_order_tone` value | Action when notification arrives |
|---|---|
| `"silent"` | Play `silent` key (calls `soundManager.stop()`); skip banner. |
| `"default"` | Play `confirm_order` (the standard chime). **THIS IS WHAT'S BROKEN — buzzer plays today instead.** |
| `"buzzer"` | Play a buzzer asset. Variant chosen per `confirm_order_ringer` (or `tone_timing`) — pending OQ-NEW-2. Default: `five_sec_buzzer`. |
| `null` / missing / unknown | Fall back to existing FCM `data.sound` / inference path. |

## 16.7 Updated Final verdict + Owner decision pack

> ## **`needs_owner_decision`**

(After owner answers OQ-NEW-1 + OQ-NEW-2 + OW-Q1, transitions cleanly to `CR_needed_ready_for_planning`.)

**Owner's quick-decision pack — refined to 3 questions:**

| # | Question | Default if no answer |
|---|---|---|
| **OQ-NEW-1** | **Fix location for the "default tone still plays buzzer" bug:** (A) Backend fixes its FCM emitter to read `confirm_order_tone`, OR (B) FE adds an override in `NotificationContext` that re-maps the sound key based on profile tone? | **(A) Backend** — single source of truth, smaller FE blast radius. FE only adds the 5 transform fields (2 mapped, 3 pass-through) for future use. |
| **OQ-NEW-2** | **What values does `confirm_order_ringer` actually take in production admin?** Just `"Yes"`/`"No"` (master switch — but owner described it as variant)? OR a multi-value enum like `"5sec"` / `"10sec"` / `"45sec"`? OR something else? | Need owner to share admin-UI screenshot of the dropdown. |
| **OW-Q1** | **Buzzer variant default** when tone="buzzer": `five_sec_buzzer` (5s) / `ten_sec_buzzer` (10s) / `forty_five_sec_buzzer` (45s)? | `five_sec_buzzer` — least intrusive. |

— End of POS2-006 Owner Scope Refinement Addendum 2026-05-09 —

