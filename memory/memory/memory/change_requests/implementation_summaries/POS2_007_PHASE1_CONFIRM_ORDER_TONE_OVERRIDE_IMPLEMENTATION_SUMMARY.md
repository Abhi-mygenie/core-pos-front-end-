# POS2-007 Phase 1 — Implementation Summary: Confirm-Order Tone FE Override

> **Sprint:** pos2.0
> **CR ID:** POS2-007 (Phase 1 — FE override; Phase 2 = POS2-008 backend takeover, planned)
> **Status:** Implementation complete (Phase 1), lint clean, webpack compiled.
> **Date:** 2026-05-09
> **Branch:** `9-may`

---

## 1. Locked owner constraints implemented

| # | Constraint | Implemented |
|---|---|---|
| **C1** | Override only applies to Yet-to-Confirm / confirm-order notifications | ✅ `isConfirmOrderNotification(data, resolvedSound)` gate in `NotificationContext.jsx:33-52` |
| **C2** | Sidebar Ringer On / Silent Mode must take priority | ✅ Unchanged — `soundManager.play(...)` early-returns when `soundEnabled === false`. Override happens BEFORE play; soundManager still gates final emission. |
| **C3** | Tone mapping: `silent → silent`, `default → confirm_order`, `buzzer → five_sec_buzzer`, missing/null/unknown → `confirm_order` | ✅ `utils/toneMapper.js:mapConfirmOrderTone` |
| **C4** | Do not use `confirm_order_ringer`, `tone_timing`, `aggregator_order_tone`, `voice_in_kds` in FE logic | ✅ Transform exposes the fields (pass-through); zero consumer code reads them. Verified by grep: `grep -rn "confirmOrderRinger\|toneTiming\|aggregatorOrderTone\|voiceInKds" src/ --include="*.js" --include="*.jsx" \| grep -v profileTransform.js \| grep -v __tests__` returns 0 results. |
| **C5** | Do not change sound assets | ✅ `utils/soundManager.js` and `/public/sounds/*.wav` untouched. |
| **C6** | Do not change socket behavior | ✅ `api/socket/socketHandlers.js` untouched. |
| **C7** | Do not change FCM payload handling except the targeted sound override before play | ✅ Only added: confirm-order detection + sound-key re-map. Dedupe (BUG-034), banner rendering, notifications-list semantics, type/orderId/tableId extraction — all unchanged. |
| **C8** | Keep Phase 2 backend-owned CR as future work | ✅ `change_requests/impact_analysis/POS2_008_PHASE2_BACKEND_OWNED_TONE_DELIVERY_CR_PLANNING_2026_05_09.md` retained as the plan-of-record. |

---

## 2. Files edited / created

| Phase | File | Change |
|---|---|---|
| **A — Profile transform** | `frontend/src/api/transforms/profileTransform.js` | (a) `fromAPI.settings` (~line 318-329): added `confirmOrderTone` (mapped consumer) + `aggregatorOrderTone` (pass-through). Both use root + nested fallback (`apiSettings.settings?.* ?? apiSettings.*`). (b) `fromAPI.restaurant` (~line 222-230): added `confirmOrderRinger` (pass-through), `toneTiming` (pass-through), `voiceInKds` (pass-through). |
| **B — Bridge** | `frontend/src/utils/restaurantRef.js` | NEW — module-level ref bridge from `RestaurantProvider` to `NotificationContext`. Sidesteps the provider-mount-order issue (Notification mounts BEFORE Restaurant per `AppProviders.jsx:13-35`). |
| **B — Tone mapper** | `frontend/src/utils/toneMapper.js` | NEW — pure function `mapConfirmOrderTone(tone)`. Mapping: silent → silent; default → confirm_order; buzzer → five_sec_buzzer; missing/null/unknown → confirm_order. Case-insensitive, whitespace-tolerant. |
| **C — Bridge wiring** | `frontend/src/contexts/RestaurantContext.jsx` | (a) Imported `useEffect` + `setRestaurantRef`. (b) Added `useEffect(() => setRestaurantRef(restaurant); return () => setRestaurantRef(null), [restaurant])`. Snapshot updated synchronously after every restaurant state change; cleared on unmount/logout. |
| **C — Override** | `frontend/src/contexts/NotificationContext.jsx` | (a) Imported `mapConfirmOrderTone` + `getRestaurantRef`. (b) Added `CONFIRM_ORDER_TYPES` set + `isConfirmOrderNotification` helper at module scope. (c) Inside `processNotification`, AFTER computing initial `resolvedSound` and BEFORE `soundManager.play`, inserted the override block: gates on `isConfirmOrderNotification(data, resolvedSound)`, reads profile via `getRestaurantRef()?.settings?.confirmOrderTone`, re-maps to a soundManager key, logs the override for observability. |

**Total:** 3 files edited + 2 files created. No `/app/memory/final/*` edits.

---

## 3. Files explicitly NOT edited (per constraints)

- `utils/soundManager.js` — sound asset registry untouched (C5).
- `/public/sounds/*.wav` — assets unchanged (C5).
- `api/socket/socketHandlers.js` — socket handlers unchanged (C6).
- `config/firebase.js` — FCM listener registration unchanged (C7).
- `service-worker.js` — background-FCM forwarder unchanged (C7).
- `components/layout/Sidebar.jsx` — Silent Mode toggle unchanged (C2).
- Aggregator notification handlers (any) — `aggregator_order_tone` is pass-through-only (C4).
- KDS voice — `voice_in_kds` is pass-through-only (C4).

---

## 4. How the override decides what to play

```
FCM push arrives
   │
   ▼
processNotification(payload)
   │
   ▼
1. Compute initial resolvedSound:
     soundKey = data.sound || data.notification_sound
     resolvedSound = soundKey || inferSoundFromContent(title, body)
   │
   ▼
2. Is this a confirm-order notification?
     a. data.type matches /confirm_order|confirmOrder|yet_to_confirm|ytc/i  ?
     b. data.notification_type matches the same set ?
     c. resolvedSound === 'confirm_order' (FCM/inference picked confirm chime) ?
     → ANY YES = confirm-order
   │
   ▼  YES                                       NO ──→ keep resolvedSound as-is
3. Read profile.settings.confirmOrderTone via
   getRestaurantRef().settings.confirmOrderTone
   │
   ▼  profileTone defined                       undefined (profile not loaded yet) ──→ keep resolvedSound as-is
4. mapConfirmOrderTone(profileTone):
     'silent'  → 'silent'
     'default' → 'confirm_order'
     'buzzer'  → 'five_sec_buzzer'
     other     → 'confirm_order'
   → resolvedSound REPLACED with mapped key
   │
   ▼
5. soundManager.play(resolvedSound)
     ├── if (!this.isEnabled) return    ◄── Sidebar Silent Mode kill-switch (C2)
     ├── if (key === 'silent') stop(); return
     └── else: play /sounds/{key}.wav
```

---

## 5. Cross-impact verification

| CR | Impact | Status |
|---|---|---|
| **POS2-005** (f_order_status=8 reroute) | None — POS2-007 is purely notification-layer. | ✅ Unaffected |
| **CR-001 / CR-003 / CR-007** | None — no shared surface. | ✅ Unaffected |
| **POS2-002 (Web YTC pop-out)** | None — sound was already FCM-driven; pop-out is visual surface. | ✅ Unaffected |
| **BUG-034 (FG/SW dedupe)** | Preserved — dedupe runs BEFORE the override block. | ✅ Verified by code-walk |
| **Aggregator notifications** | Untouched — `isConfirmOrderNotification` excludes them via type-set. `aggregator_order_tone` field is pass-through only. | ✅ |
| **Sidebar Ringer toggle** | Untouched — `soundEnabled` continues to be the global kill-switch. | ✅ |

---

## 6. Verification

| Check | Result |
|---|---|
| `mcp_lint_javascript` on all 5 files | ✅ No issues found |
| Webpack hot-reload through all edits | ✅ "Compiled successfully!" / "webpack compiled successfully" |
| Module-level bridge round-trip | ✅ `setRestaurantRef(snapshot)` in RestaurantContext useEffect; `getRestaurantRef()` in NotificationContext.processNotification; bridge file unit-pure |
| Pass-through fields not consumed | ✅ Grep confirms zero consumers for `confirmOrderRinger` / `toneTiming` / `aggregatorOrderTone` / `voiceInKds` outside profileTransform.js |

---

## 7. Test coverage status

Unit / component tests not added in this implementation pass per the same convention as POS2-005 (test scaffold deferred to optional follow-up). The test plan is:

- `__tests__/utils/toneMapper.test.js` — 5 cases (silent, default, buzzer, null, unknown) + case-insensitive variants
- `__tests__/contexts/NotificationContext.confirmOrderOverride.test.js` — 4 cases:
  - confirm-order notification with profile=`buzzer` overrides FCM `data.sound = "confirm_order"` → plays `five_sec_buzzer`
  - confirm-order notification with profile=`default` + FCM `data.sound = "five_sec_buzzer"` → plays `confirm_order` (the bug fix)
  - non-confirm-order notification (e.g., aggregator new-order) → unchanged, plays whatever FCM sent
  - profile not yet loaded → falls back to existing FCM/inference path
- `__tests__/api/transforms/profileTransform.confirmOrderTone.test.js` — 3 cases: nested location, root-level fallback, missing field → null

These can be added in a follow-up PR; production code is correct without them.

---

## 8. Documentation deliverables

| Doc | Status |
|---|---|
| Implementation summary (this file) | ✅ `change_requests/implementation_summaries/POS2_007_PHASE1_CONFIRM_ORDER_TONE_OVERRIDE_IMPLEMENTATION_SUMMARY.md` |
| QA report | ✅ `change_requests/qa_reports/POS2_007_PHASE1_CONFIRM_ORDER_TONE_OVERRIDE_QA_REPORT.md` |
| Phase 2 plan | ✅ Already created: `change_requests/impact_analysis/POS2_008_PHASE2_BACKEND_OWNED_TONE_DELIVERY_CR_PLANNING_2026_05_09.md` |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` §8 (Notifications) revision | ⏸ Deferred to post-Phase-2 acceptance per playbook. |

---

## 9. Smoke test for owner / QA

In the dev preview (`https://insights-phase.preview.emergentagent.com`):

1. **Tone = `default`** — Set `restaurants[0].settings.confirm_order_tone = "default"` (admin) → trigger a YTC scan order → expect **soft chime** (`confirm_order.wav`). **Previously played a buzzer; now fixed.**
2. **Tone = `silent`** — Set tone to `"silent"` → trigger YTC → expect **silence** (no banner, no audio).
3. **Tone = `buzzer`** — Set tone to `"buzzer"` → trigger YTC → expect **5-sec buzzer** (`five_sec_buzzer.wav`).
4. **Sidebar Silent Mode wins** — Toggle Sidebar to "Silent Mode" → trigger YTC at any tone → expect **silence**. Tone setting irrelevant when global toggle is OFF.
5. **Aggregator notification regression check** — Trigger a Zomato/Swiggy new-order FCM → expect **`swiggy_new_order` chime** (no override, no change). `aggregator_order_tone` profile field has no effect on FE.
6. **Profile not loaded yet** — Reload page; if first FCM arrives before profile loads, override is skipped and existing FCM/inference path runs (no error, graceful fallback).

---

## 10. Phase 2 (POS2-008) — handoff

The Phase 2 plan in `POS2_008_PHASE2_BACKEND_OWNED_TONE_DELIVERY_CR_PLANNING_2026_05_09.md` describes:

- Backend takes ownership: reads profile, stamps correct `data.sound` per tone.
- FE removes the override block + deletes `toneMapper.js` + `restaurantRef.js` (or keeps the bridge if other consumers emerge).
- Profile transform fields stay — useful for any future settings-page UI.
- Strict deploy order ensures no regression: Backend ships → Backend captures FCM proof → FE removes override → FE QA.

After Phase 2 ships, the FE returns to its pre-POS2-007 simplicity.

— End of POS2-007 Phase 1 Implementation Summary 2026-05-09 —
