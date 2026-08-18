# POS2-007 Phase 1 — QA Report: Confirm-Order Tone FE Override

> **Sprint:** pos2.0
> **CR ID:** POS2-007 (Phase 1)
> **Date:** 2026-05-09
> **Branch:** `9-may`
> **QA scope:** Static code-walk + lint + webpack build verification (no automated test runs in this pass).

---

## 1. Validation matrix

| # | Test | Verification path | Status |
|---|---|---|---|
| **V1** | `mapConfirmOrderTone('silent')` → `'silent'` | `utils/toneMapper.js:30-35` — table lookup | ✅ PASS |
| **V2** | `mapConfirmOrderTone('default')` → `'confirm_order'` | Same | ✅ PASS |
| **V3** | `mapConfirmOrderTone('buzzer')` → `'five_sec_buzzer'` | Same | ✅ PASS |
| **V4** | `mapConfirmOrderTone(null)` → `'confirm_order'` (safe fallback) | `toneMapper.js:32` — falsy guard | ✅ PASS |
| **V5** | `mapConfirmOrderTone(undefined)` → `'confirm_order'` | Same | ✅ PASS |
| **V6** | `mapConfirmOrderTone('Buzzer')` (capitalized) → `'five_sec_buzzer'` | `toneMapper.js:33` — `.trim().toLowerCase()` | ✅ PASS |
| **V7** | `mapConfirmOrderTone('chime')` (unknown value) → `'confirm_order'` | `toneMapper.js:34` — `\|\| 'confirm_order'` fallback | ✅ PASS |
| **V8** | Profile transform pulls `confirm_order_tone` from nested `settings` (per payload restaurant 478, 2026-05-09) | `profileTransform.js:325` — `apiSettings.settings?.confirm_order_tone ?? apiSettings.confirm_order_tone ?? null` | ✅ PASS (matches deliveryChargeGstPct fallback pattern at line 157) |
| **V9** | Profile transform pulls `aggregator_order_tone` (pass-through) | `profileTransform.js:331` — same fallback shape | ✅ PASS |
| **V10** | Profile transform pulls `confirm_order_ringer`, `tone_timing`, `voice_in_kds` (pass-through, root-level) | `profileTransform.js:222-228` | ✅ PASS |
| **V11** | NO consumer reads `confirm_order_ringer` / `tone_timing` / `aggregator_order_tone` / `voice_in_kds` (constraint C4) | `grep -rn "confirmOrderRinger\|toneTiming\|aggregatorOrderTone\|voiceInKds" src --include="*.js" --include="*.jsx" \| grep -v profileTransform \| grep -v __tests__` → 0 results | ✅ PASS |
| **V12** | RestaurantContext writes to bridge on every restaurant state change | `RestaurantContext.jsx:18-21` — `useEffect([restaurant])` calls `setRestaurantRef(restaurant)`; cleanup sets it to null on unmount/logout | ✅ PASS |
| **V13** | NotificationContext reads bridge lazily inside `processNotification` (not at render time) | `NotificationContext.jsx:97` — `getRestaurantRef()` invoked inside the override block, not via `useRestaurant()` (which would fail because Notification mounts before Restaurant) | ✅ PASS |
| **V14** | `isConfirmOrderNotification` matches `data.type === "confirm_order"` | `NotificationContext.jsx:42` — type set + normalisation | ✅ PASS |
| **V15** | `isConfirmOrderNotification` matches `data.type === "yet_to_confirm"` / `"ytc"` | `NotificationContext.jsx:38-40` — set entries `'yet_to_confirm'`, `'yettoconfirm'`, `'ytc'` | ✅ PASS |
| **V16** | `isConfirmOrderNotification` matches case-insensitive + dash/space variants (`"Yet-To-Confirm"`, `"YET TO CONFIRM"`) | `NotificationContext.jsx:43` — `.replace(/[\s-]+/g, '_')` normalises before set lookup | ✅ PASS |
| **V17** | `isConfirmOrderNotification` matches when `resolvedSound === 'confirm_order'` (FCM stamped or content inferred) | `NotificationContext.jsx:46` — fallback predicate | ✅ PASS |
| **V18** | `isConfirmOrderNotification` returns false for new-order / aggregator / settle-bill / etc. | Set membership only matches confirm-order types; resolvedSound check requires exact `'confirm_order'` | ✅ PASS |
| **V19** | When confirm-order detected + profile loaded + tone='default' + FCM sent buzzer: override re-maps to `confirm_order` (THE BUG FIX) | `NotificationContext.jsx:96-105` — gated path replaces `resolvedSound` with `mapConfirmOrderTone('default')` = `'confirm_order'` before `soundManager.play` | ✅ PASS (code-walk) |
| **V20** | When profile NOT yet loaded (`getRestaurantRef()` returns null), override skipped, existing FCM/inference path runs | `NotificationContext.jsx:99` — `restaurant?.settings?.confirmOrderTone` resolves to undefined → `if (profileTone !== undefined)` is false → no override → original `resolvedSound` plays | ✅ PASS |
| **V21** | Sidebar Silent Mode (constraint C2) takes priority over override | `soundManager.js:34-37` — `play()` early-returns when `!this.isEnabled`. Override re-assigns `resolvedSound` BEFORE `soundManager.play(resolvedSound)`; the kill-switch fires regardless of override result. | ✅ PASS |
| **V22** | Aggregator notification (e.g., Swiggy new-order) — override does NOT activate | Type doesn't match `CONFIRM_ORDER_TYPES`; resolvedSound for Swiggy becomes `'swiggy_new_order'` (from inference or FCM), not `'confirm_order'`, so the gate at V17 also fails | ✅ PASS |
| **V23** | Notification banner / list semantics unchanged | `NotificationContext.jsx:113-126` — banner / list construction code unchanged | ✅ PASS |
| **V24** | BUG-034 dedupe still runs FIRST | `NotificationContext.jsx:78-89` — dedupe block precedes the override block | ✅ PASS |
| **V25** | Lint clean on all 5 modified/created files | `mcp_lint_javascript` → "✅ No issues found" | ✅ PASS |
| **V26** | Webpack build succeeds | `/var/log/supervisor/frontend.out.log` → "Compiled successfully! / webpack compiled successfully" through all hot-reloads | ✅ PASS |
| **V27** | No socket / FCM / sound-asset / Sidebar code touched (constraints C5-C7) | Diff inspection: only 5 files touched (toneMapper.js + restaurantRef.js + profileTransform.js + RestaurantContext.jsx + NotificationContext.jsx). Socket handlers, soundManager.js, Sidebar.jsx, firebase.js, service-worker.js — all unchanged. | ✅ PASS |
| **V28** | Phase 2 plan retained (constraint C8) | `change_requests/impact_analysis/POS2_008_PHASE2_BACKEND_OWNED_TONE_DELIVERY_CR_PLANNING_2026_05_09.md` exists | ✅ PASS |

---

## 2. Manual smoke test plan (owner / QA in dev preview)

In `https://insights-phase.preview.emergentagent.com`:

| # | Setup | Trigger | Expected |
|---|---|---|---|
| **M1** | `confirm_order_tone = "default"` in admin | Place YTC scan order | Soft chime (`confirm_order.wav`). **Buzzer regression FIXED.** |
| **M2** | `confirm_order_tone = "silent"` | Place YTC | Silence |
| **M3** | `confirm_order_tone = "buzzer"` | Place YTC | 5-sec buzzer |
| **M4** | `confirm_order_tone` missing/null | Place YTC | Soft chime (safe fallback) |
| **M5** | Sidebar toggle to "Silent Mode" | Place YTC at any tone | Silence (Silent Mode wins) |
| **M6** | Toggle back to "Ringer On" | Place YTC at tone="default" | Soft chime |
| **M7** | Place a Zomato/Swiggy new-order (regression check) | — | Existing aggregator chime — no change |
| **M8** | Reload page; trigger YTC before profile loads (race) | — | Existing FCM/inference path runs — no error, no regression |

---

## 3. Risk re-evaluation

| # | Risk | Mitigation status |
|---|---|---|
| **R-1** | Override scope creep — affects non-confirm notifications | ✅ Tightly gated by `isConfirmOrderNotification` (V14-V18); ONLY confirm-order notifications enter the override branch |
| **R-2** | Sidebar Silent Mode broken | ✅ Untouched; soundManager kill-switch still fires (V21) |
| **R-3** | Profile not loaded → first FCM crashes | ✅ Lazy-read with `?.` chain; null-tolerant; falls back to existing path (V20) |
| **R-4** | Provider-order issue prevents profile read | ✅ Ref bridge sidesteps; verified via V12-V13 |
| **R-5** | Stale-data race — restaurant changes mid-FCM-arrival | ⚪ Acceptable — bridge is updated synchronously after every state change. Worst case: first FCM after a restaurant switch uses stale tone for one notification. |
| **R-6** | Phase 2 backend ships and over-emits a buzzer for `tone="default"` again | ✅ Override remains active until explicitly removed. POS2-008 plan ensures backend ships first → proof of correct emission → THEN FE removes override. |
| **R-7** | Other constraints C4/C5/C6/C7 violated | ✅ Verified via diff inspection (V27) |
| **R-8** | Notification dedupe (BUG-034) regression | ✅ Override placed AFTER dedupe; verified V24 |

---

## 4. Final QA verdict

> ## **`PASS — ready for owner sign-off + manual smoke test`**

All 28 validation items PASS via static code-walk + lint + webpack build. All 8 owner constraints (C1-C8) honored. No regressions detected in BUG-034, Sidebar Silent Mode, aggregator notifications, socket handlers, FCM listener, or sound asset registry.

**Action items before final acceptance:**
1. Owner / QA executes M1-M8 in dev preview.
2. Capture proof: M1 (the bug-fix verification) — owner records that tone="default" plays soft chime, NOT buzzer.
3. Owner signs off → CR moves to "shipped Phase 1; Phase 2 backlog".
4. Phase 2 (POS2-008) opened when backend team has bandwidth to take ownership.

— End of POS2-007 Phase 1 QA Report 2026-05-09 —
