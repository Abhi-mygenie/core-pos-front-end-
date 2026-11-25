# FCM Reload-Ring Pack — Gate Record & QA Handover (2026-11-24)

**Source of truth on main:** `notification-fix@254d9b6` (authoritative verbatim sync, owner-directed).
**Items:** BUG-749, BUG-747, BUG-751, BUG-752, BUG-750. **Sprint:** nov_cr_batch. **Assignee:** Abhishek.
**Status:** All at **GATE_5A_IMPLEMENTED (gate 4)** — code shipped & build-verified; **Gate-5 QA (device E2E) PENDING**. Safe to push to main as Implemented.

## Gate ladder per item
| Item | G1 Intake | G2 IA | G3 Plan | G4 GO | Impl | Build-verified | Device QA |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| BUG-749 device-token register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ unit 2/2 | ⬜ pending |
| BUG-747 autoplay unlock + tri-state ringer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ compile | ⬜ pending |
| BUG-751 YTC popup after reload (hydrator) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ compile | ⬜ pending |
| BUG-752 stop buzzer on popup actions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ compile | ⬜ pending |
| BUG-750 stop buzzer after Update Order (fos=7) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ compile | ⬜ pending |

Docs: intakes/plans under `memory/change_requests`, `memory/plans/FCM_RELOAD_PHASE3_PACK_IMPLEMENTATION_PLAN.md`, `memory/plans/BUG-749_PHASE2_IMPLEMENTATION_PLAN.md`, IA `memory/impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md`, handover `memory/handover/SESSION_HANDOVER_2026-11-24_FCM_RELOAD_TWO_FE_FIXES.md`.

## Build verification done (in-sandbox)
- webpack: **compiled** (1 pre-existing `react-hooks/exhaustive-deps` warning in branch-authored `OrderEntry.jsx`; non-fatal).
- Jest PASS: `deviceTokenService.bug749` 2/2, `soundManager.bug453` 4/4, `DashboardPage.bug452`, `BUG731_CheckInMarker`, `CR547_SelectiveKOT`.
- ESLint `soundManager.js` clean (branch duplicate `setBlockedHandler` removed → no `no-dupe-class-members`).
- Deviations from verbatim: added required dep `utils/fcmDiagLog.js`; removed duplicate `setBlockedHandler`; dropped superseded scaffold tests.

## QA handover — device E2E to execute (granted-permission Goan Kitchen, rid 69)
1. **BUG-749**: login → reload `/dashboard` → backend shows `has_firebase_token:true` for the employee.
2. **BUG-747 unlock**: reload → order alert while locked → **no ring + red "Tap to enable" banner**; tap (or sidebar) → next order **rings**.
3. **BUG-747 silent**: Sidebar → Silent Mode → order → **no banner**, stays silent (intentional).
4. **BUG-751**: reload → inbound **confirm** FCM → `ScanOrderPopOut` opens (optimistic, then items fill).
5. **BUG-752**: long buzzer ringing → Accept / Reject / cancel-item / reject-new each **stop** it immediately; Snooze still stops.
6. **BUG-750**: web-edit order (fos=7 Not-Confirm lines) → Update Order → buzzer **stops**; order with no remaining Not-Confirm lines → unaffected; **no FE auto-confirm** (BE owns promote+KOT on update-place-order).

## Known caveats (not blockers to push; track for QA)
- **SW reload-gap:** confirm pushes delivered to the service-worker background path during the reload window may not reach `processNotification`, so the FCM→hydrator route can miss (investigated earlier). Socket/running-orders path still populates the popup.
- **Pre-existing (NOT this pack):** `ScanOrderPopOut.test.jsx` 23 fail — fails identically on clean `origin/main` (stale POS2-002 anti-test vs CR-561 `orderService` import). Out of scope; can be refreshed separately.
