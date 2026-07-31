# POS2-007-Phase 2 — CR Planning: Backend-Owned Confirm-Order Tone Delivery

> **Sprint:** pos2.0 (Phase 2 follow-up to POS2-007 Phase 1 FE override)
> **CR ID:** POS2-008 (proposed) — `Backend-Owned Confirm-Order Tone Delivery`
> **Type:** CR planning / architecture proposal (read-only — no code changed, no `/app/memory/final/*` edited)
> **Date:** 2026-05-09
> **Branch:** `9-may`
> **Predecessor:** POS2-006 investigation + POS2-007 Phase 1 (FE override) — once Phase 1 ships
> **Final verdict:** **`needs_backend_confirmation`** (FE plan is documented; backend owns Phase 2 implementation; FE plan is to **REMOVE** the Phase 1 override after backend ships)

---

## 1. Executive summary

POS2-007 Phase 1 (FE override in `NotificationContext.processNotification`) fixes the "default tone plays buzzer" bug **today**, without backend changes. It introduces business logic in two places (FE override + backend FCM emitter) and creates duplicated authority over the sound key — an acceptable tactical compromise to ship the bug fix fast.

Phase 2 (this CR) **moves authority back to the backend** so the FE returns to its original "play whatever `data.sound` says" simplicity. Backend reads `confirm_order_tone` + `confirm_order_ringer` at FCM-emit time and stamps the correct `data.sound` value. FE removes the `toneMapper` override.

**Result after Phase 2:**
- Single source of truth: backend.
- FE has zero confirm-order-specific business logic.
- Profile transform still exposes the 5 fields (`confirmOrderTone`, `aggregatorOrderTone`, `confirmOrderRinger`, `toneTiming`, `voiceInKds`) for any future settings-page UI use, but no notification-pipeline consumer.
- Behaviour is identical to Phase 1 from the operator's perspective.

---

## 2. Phase 1 vs Phase 2 — visual

### Phase 1 (POS2-007) — FE override (current choice, ships now)

```
                          ┌────────────────────────────┐
                          │ Backend FCM emitter        │
                          │ (BUGGY — always buzzer)    │
                          │ data.sound = "buzzer-key"  │
                          └─────────────┬──────────────┘
                                        │ FCM push
                                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Frontend NotificationContext.processNotification            │
   │                                                             │
   │   1. Read profile.confirm_order_tone (NEW — Phase 1)        │
   │   2. mapTone("default") → "confirm_order"                   │
   │   3. OVERRIDE data.sound with "confirm_order"  ◄──── FIX    │
   │   4. soundManager.play("confirm_order") ✅                  │
   └─────────────────────────────────────────────────────────────┘
```

→ Two places enforce the rule (BE FCM emitter + FE override). FE wins.
→ Bug fixed; FE has profile-aware logic.

### Phase 2 (POS2-008) — backend-owned (target architecture)

```
                          ┌────────────────────────────┐
                          │ Backend FCM emitter        │
                          │ (FIXED — Phase 2)          │
                          │                            │
                          │ Reads profile:             │
                          │   confirm_order_tone       │
                          │   confirm_order_ringer     │
                          │                            │
                          │ Computes data.sound:       │
                          │   ringer="No" → skip FCM   │
                          │   tone="silent" → "silent" │
                          │   tone="default"→"confirm_order"│
                          │   tone="buzzer" → "five_sec_buzzer"│
                          └─────────────┬──────────────┘
                                        │ FCM push (correct data.sound)
                                        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Frontend NotificationContext.processNotification            │
   │                                                             │
   │   1. Read data.sound (no override — Phase 1 code REMOVED)   │
   │   2. soundManager.play(data.sound) ✅                       │
   │                                                             │
   │   ※ Profile fields still in transform for settings-page UI, │
   │     but no notification-pipeline consumer.                  │
   └─────────────────────────────────────────────────────────────┘
```

→ Single source of truth (backend).
→ FE returns to its pre-POS2-007 simplicity.
→ Identical operator-visible behaviour as Phase 1.

---

## 3. Backend contract for Phase 2

The backend FCM emitter must implement this decision tree at notification-emit time, per restaurant:

```python
# Pseudocode — backend owns this
def emit_confirm_order_fcm(restaurant, order):
    ringer = restaurant.confirm_order_ringer  # "Yes" / "No"
    tone   = restaurant.settings.confirm_order_tone  # "default" / "silent" / "buzzer"

    # Master switch: ringer = "No" → silent (or skip FCM entirely; either acceptable)
    if ringer == "No":
        data_sound = "silent"
    elif tone == "silent":
        data_sound = "silent"
    elif tone == "default":
        data_sound = "confirm_order"
    elif tone == "buzzer":
        data_sound = "five_sec_buzzer"  # any buzzer asset; FE has 3, all sound the same
    else:
        # Unknown / null tone — safe default
        data_sound = "confirm_order"

    fcm.send({
        "data": { "sound": data_sound, "title": ..., "body": ..., "type": "confirm_order", ... }
    })
```

**Notes:**
- The exact buzzer asset name (`five_sec_buzzer` vs `ten_sec_buzzer` vs `forty_five_sec_buzzer`) is owner's call — all three are interchangeable per owner ("its sound same with that length"). Recommended: `five_sec_buzzer` (shortest).
- `confirm_order_ringer = "No"` should result in either `data.sound = "silent"` OR no FCM push at all — both produce identical FE behaviour. Backend picks whichever is cleaner for their codebase.

---

## 4. Frontend changes for Phase 2

> **Net:** ONE file edit (revert) + delete one new file. Tiny.

### 4.1 Files to revert / delete

| File | Phase 1 added | Phase 2 action |
|---|---|---|
| `utils/toneMapper.js` | NEW — pure mapping function | **DELETE** |
| `contexts/NotificationContext.jsx` | Added `useRestaurant()` (or ref-based read), profile-tone override block at `processNotification` | **REVERT** to pre-POS2-007 state (the override block is removed; rest of file unchanged) |
| `api/transforms/profileTransform.js` | Added 5 fields | **KEEP** — fields stay in transform for any future settings-page UI consumer. No revert. |
| `__tests__/utils/toneMapper.test.js` | NEW unit tests | **DELETE** |
| `__tests__/contexts/NotificationContext.toneOverride.test.js` | NEW component tests | **DELETE** |

### 4.2 What stays after Phase 2 cleanup

| Surface | State |
|---|---|
| `restaurant.settings.confirmOrderTone` available in `RestaurantContext` | ✅ Kept (transform unchanged) |
| `restaurant.confirmOrderRinger`, `restaurant.toneTiming`, `restaurant.voiceInKds`, `restaurant.settings.aggregatorOrderTone` available in context | ✅ Kept |
| `NotificationContext` reads profile to pick sound | ❌ Removed (back to pre-POS2-007) |
| `toneMapper` utility | ❌ Removed |
| Backend FCM emitter writes correct `data.sound` per profile | ✅ NEW — backend's job |

---

## 5. Migration sequence (safe order)

> Phase 2 must NOT regress Phase 1's bug fix. The handoff sequence is critical.

### 5.1 Recommended deploy order

| Step | Who | Action | Why this order |
|---|---|---|---|
| **1** | Backend | Ship the FCM emitter fix (§3 contract). | Backend now writes correct `data.sound` per profile. **At this point, BOTH backend AND FE are setting the right sound — they happen to agree, so no behaviour change.** |
| **2** | Backend | (Optional) Capture FCM payload from prod for one confirm-order at each tone value (default / silent / buzzer) and share with FE. | QA evidence: confirms backend now emits the right key per tone. |
| **3** | FE | Remove the override block + delete `toneMapper.js` + tests. Single PR. | Backend already writes correct key; FE override is now redundant. After this, only backend authoritative. |
| **4** | FE | QA — manually trigger one YTC at each tone value, verify correct sound plays. | Confirms Phase 2 baseline matches Phase 1 behaviour. |
| **5** | Documentation | Update `MODULE_DECISIONS_FINAL.md` §8 (Notifications) — record final-state authority = backend. | Per playbook, post-acceptance. |

### 5.2 Rollback plan (if Phase 2 reveals a backend bug)

If Step 3 reveals the backend isn't emitting the right key:
- Restore `toneMapper.js` from git.
- Restore the override block in `NotificationContext.jsx`.
- File a backend bug ticket.
- FE goes back to Phase 1 state until backend is fixed.

This rollback is **trivial** because the changes are localised and reversible.

---

## 6. Cross-impact with other CRs

| CR | Phase 2 effect |
|---|---|
| **POS2-002 Web YTC pop-out** | None — sound was always FCM-driven; pop-out is a separate visual surface. |
| **POS2-005 f_order_status=8 reroute** | None — no overlap. |
| **POS2-007 Phase 1** | Phase 2 IS the cleanup of Phase 1. Phase 1 must ship + bake before Phase 2 starts. |
| **CR-008 Delivery audit/dispatch** | None. |
| **Aggregator notifications (Zomato/Swiggy)** | `aggregator_order_tone` was a pass-through-only field per owner directive. If owner later wants aggregator-tone driven by profile, it follows the SAME backend-owned pattern: backend reads `aggregator_order_tone`, writes `data.sound`. **A future Phase 3** can fold this in if needed. |

---

## 7. Risks

| # | Risk | Mitigation |
|---|---|---|
| **R-1** | Backend deploys Phase 2 fix; FE is still on Phase 1; both override the sound key, FE wins, behaviour is correct anyway. | Acceptable — by design. Step 1 is intentionally idempotent with Phase 1. |
| **R-2** | FE removes override before backend fix is fully deployed across regions. Buzzer regression on `tone="default"`. | Strict deploy order (§5.1): backend Step 1 + 2 must complete BEFORE FE Step 3. CI/CD gate or owner sign-off between steps. |
| **R-3** | Backend FCM emitter has bug for one of the three tone values (e.g., "silent" emits "confirm_order"). | Step 2 payload capture catches this before FE removes the override. |
| **R-4** | Operators with cached service worker continue receiving old FCM payloads for several minutes after backend deploy. | Existing dedupe (`BUG-034`) and short-window cache (~2s) handle stale frames. Stale-frame override is brief and self-resolves. |
| **R-5** | New tone value added in admin (e.g., `"chime"`, `"bell"`) without FE asset support. | Backend's emit logic should default unknown tones to `"confirm_order"` (safe fallback). FE always plays a known key from `SOUND_FILES` — unknown keys log a warning and don't break. |

---

## 8. Test plan for Phase 2

### 8.1 Backend tests (backend team owns)

- Unit: `emit_confirm_order_fcm` produces correct `data.sound` for each (ringer × tone) combination (3 × 3 = 9 cases minimum).
- Integration: real FCM payload capture for each combination; assert `data.sound` value matches expected.

### 8.2 FE tests (after override removal)

- V1 — Trigger FCM with `data.sound = "confirm_order"` → soft chime plays.
- V2 — Trigger FCM with `data.sound = "five_sec_buzzer"` → buzzer plays.
- V3 — Trigger FCM with `data.sound = "silent"` → silence (no banner, no audio).
- V4 — Trigger FCM with `data.sound` missing → fallback to `inferSoundFromContent` (existing behaviour) → eventually `confirm_order` for "confirm" keyword.
- V5 — Sidebar Silent Mode toggle OFF → no sound regardless of `data.sound` value.

These are existing tests; the override-removal PR doesn't add new FE behaviour, so the test deltas are **deletions only** (the Phase 1 override-specific tests).

### 8.3 E2E (owner / QA)

- Set `confirm_order_tone = "default"` in admin. Place YTC. Soft chime plays. ✅
- Set `confirm_order_tone = "silent"`. Place YTC. Silence. ✅
- Set `confirm_order_tone = "buzzer"`. Place YTC. Buzzer plays. ✅
- Set `confirm_order_ringer = "No"`. Place YTC. Silence. ✅

---

## 9. Documentation deliverables (Phase 2)

| Doc | When |
|---|---|
| Backend impl summary (BE team) | After Step 1 |
| FE impl summary `change_requests/implementation_summaries/POS2_008_FE_TONE_OVERRIDE_REMOVAL_*.md` | After Step 3 |
| QA report `change_requests/qa_reports/POS2_008_*.md` | After Step 4 |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` §8 revision — record "FCM `data.sound` is single source of truth; backend reads profile and stamps it" | Step 5 (post-acceptance, separate task per playbook) |

---

## 10. Open questions for Phase 2

| # | Question | Asked of | Blocking? |
|---|---|---|---|
| **BE-Q1** | Will backend take ownership? Estimated timeline? | Backend team | **Blocking** Phase 2 start |
| **BE-Q2** | When `confirm_order_ringer = "No"`, prefer (a) emit FCM with `data.sound = "silent"`, OR (b) skip FCM entirely? | Backend / owner | Non-blocking — both produce identical FE behaviour. Backend's call. |
| **BE-Q3** | Buzzer asset choice: `five_sec_buzzer` / `ten_sec_buzzer` / `forty_five_sec_buzzer`? Owner stated all three sound the same; pick one and stick with it. | Owner | Default `five_sec_buzzer`. Non-blocking. |
| **BE-Q4** | If profile has `aggregator_order_tone` set, should backend ALSO honor it for Zomato/Swiggy FCM? Or out of Phase 2 scope? | Owner | Non-blocking — defer to Phase 3 if owner wants aggregator parity. |

---

## 11. Final verdict

> ## **`needs_backend_confirmation`**

(Phase 2 cannot start until backend confirms ownership + timeline. FE plan is documented and trivial: revert the override + delete the mapper. After backend ships, FE work is ~30 minutes including QA.)

**Suggested next steps:**
1. **Now:** Owner approves POS2-007 Phase 1 FE override (the override I'm building today). Phase 1 ships, bug fixed.
2. **After Phase 1 bakes for ~1 sprint:** Owner asks backend to plan Phase 2 (this CR). Backend confirms BE-Q1 timeline.
3. **Phase 2 deploy:** Backend Step 1 → backend Step 2 (payload capture proof) → FE Step 3 (revert override) → FE Step 4 (QA) → Step 5 (final-doc revision).

— End of POS2-008 / POS2-007 Phase 2 CR Planning 2026-05-09 —
