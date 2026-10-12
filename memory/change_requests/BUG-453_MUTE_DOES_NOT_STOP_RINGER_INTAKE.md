# BUG-453 — Scan & Order pop-out Mute does not stop the ringer (soundManager race) + FCM retries restart sound after Mute — INTAKE 2026-09-23

Source: **OWNER-REPORTED** ("Scan & Order pop-up has a Mute button on the order level. When I click Mute, the ringer is not stopping.") → investigated 2026-09-18 as `INV-MUTE-RINGER-001` (`investigations/INVESTIGATION_2026_09_18_MUTE_RINGER_NOT_STOPPING.md`) → validated + registered 2026-09-23 (INTAKE role, ALPHA v0.7).
Sprint: **`sep_bug_closure`** (owner 2026-09-23). Gate: **1 (INTAKE)**.
**Scope decision (owner 2026-09-23):** Fix A (race) **and** Fix B (post-Mute FCM-retry suppression) are **one bug** — not split into BUG + CR.

## Classification
| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** (realtime failure on core flow; Mute is a no-op; no workaround except Sidebar Silent Mode which mutes everything) |
| Risk | **MEDIUM** — component state + notification pipeline (`soundManager.js`, `NotificationContext.jsx`); not financial, not R5 |
| RCA classification | CODE_ERROR (primary) + PLAN_GAP (secondary — Jan-2026 anti-rule scoped Mute to "current chime only") |
| Confidence | **CONFIRMED** (owner reproduced on preprod) |
| Code reality | **NONE** at HEAD `1be4055` |
| Fast Lane eligible | NO (2 files, notification pipeline) |
| Planning skip eligible | **NO** for the merged scope (Fix A alone would have been eligible: 1 file, 2 lines) |

## Symptom
Ringer for an unconfirmed YTC / Scan & Order order keeps playing after clicking **Mute** in `ScanOrderPopOut`. Even when it stops, it restarts within seconds/minutes as the backend re-sends FCM for the same unconfirmed order.

## RCA (code-read, confirmed against HEAD 2026-09-23)
**Primary — `src/utils/soundManager.js`**
| Line | Code | Verdict |
|---|---|---|
| 69–71 | `ended` → `if (this.currentAudio === audio) this.currentAudio = null` | correct guard |
| 74–77 | `error` → `this.currentAudio = null` | **blind null** |
| 79–83 | `audio.play().catch(() => { this.currentAudio = null })` | **blind null** |
| 89–95 | `stop()` → pauses `this.currentAudio` if non-null | correct, but no-op when ref was wiped |

Race: FCM #1 → `play()` → `audio1` tracked, `play()` pending → FCM #2 within ~100 ms → `play()` → `stop()` pauses `audio1` (AbortError pending) → `audio2` tracked and audible → `audio1.play().catch` fires → **wipes `currentAudio` (= audio2)** → Mute → `stop()` sees `null` → audio2 keeps ringing.

**Secondary — `src/contexts/NotificationContext.jsx`**
| Line | Code | Verdict |
|---|---|---|
| 132–135 | `if (resolvedSound) soundManager.play(resolvedSound)` on every FCM (foreground) | no snooze check |
| 175–181 | SW `BACKGROUND_NOTIFICATION` → same `processNotification` | same |
| 58–65 | BUG-034 dedup window 2000 ms | does not consult `snoozedOrders` |

`snoozedOrders` (`DashboardPage.jsx:459`, `toggleSnooze` :1280–1290) is passed only to `ScanOrderPopOut` / `OrderListSection` (visual) — **never to NotificationContext**. `ScanOrderPopOut.jsx:22–27` anti-rule (Jan-2026, owner override 2026-01-16 for `stop()` only): "NO per-order mute. NO future-sound suppression."

## Evidence
- Screenshot / recording: not provided (owner verbal)
- Steps to reproduce: preprod with ≥ 2 unconfirmed Scan & Order orders (backend retries FCM) → pop-out shows order → click **Mute** → sound continues / restarts on next FCM
- Curl output: not applicable (client-side race)
- Code grep: `evidence/BUG-453/BUG-453_code_grep_2026_09_23.txt`
- Source: OWNER-REPORTED · Confidence: CONFIRMED

## Duplicate check
**RELATED, not duplicate:** BUG-081 (snooze duration 120 000 ms — POS 2.0, CLOSED), BUG-122-POST (TableCard snooze gated web-only — POS 4.0, CLOSED), CR `SNOOZE_SOUND_STOP_AND_DURATION` (Jan-2026, introduced `soundManager.stop()` in pop-out). None address the `currentAudio` race or FCM-retry suppression. Searched `ringer`, `mute`, `snooze`, `soundManager` in registry/tracker/gaps.

## Blast radius
- `soundManager.` references: see evidence · `snoozedOrders` consumers: `DashboardPage.jsx`, `ScanOrderPopOut.jsx`
- Files: `soundManager.js` (2 guard lines) + `NotificationContext.jsx` (snooze check) + wiring of `snoozedOrders` (or a mute registry inside `soundManager`) + `ScanOrderPopOut.jsx` header comment (anti-rule override text) — **MEDIUM (3–4 files)**
- Hotspots: **NO** (DashboardPage may need +1 prop if wiring goes through context — Planning to decide; if so, R5 applies)

## Owner decisions
| # | Decision | Status |
|---|---|---|
| OD-453-01 (was INV OD-1) | Scope: Fix A + Fix B together | **LOCKED 2026-09-23 — merged into one bug (owner)** |
| OD-453-02 (was INV OD-2) | Override the Jan-2026 anti-rule "NO future-sound suppression" in `ScanOrderPopOut.jsx:22–27` | **LOCKED 2026-09-23 — APPROVED** (per-order, manual; header comment to be rewritten as owner override 2026-09-23) |
| OD-453-03 (was INV OD-3) | Fix B approach | **LOCKED 2026-09-23 — PER-ORDER MUTE TOGGLE.** Owner: "mute till we press the mute button again; if he presses, he hears again." Semantics: Mute on order X → current chime stops (Fix A) **and** every later FCM/socket sound for order X is suppressed; pressing the same button again un-mutes → next FCM for X rings. **No timer. No auto-clear on confirm** (harmless — confirmed orders stop being retried). Other orders ring normally. Sidebar Silent Mode still wins. State = existing in-memory `snoozedOrders` (lost on reload — existing behaviour, acceptable). FCM `data.order_id` (`NotificationContext.jsx:86`) is the key. |
| **OD-453-04** (Gate 2) | Muted order: sound-only, or also suppress the banner/toast on FCM retries? | **LOCKED 2026-09-24 — SOUND + TOAST.** Owner: "Sound + toast". A retry for a muted order produces no sound and no `notifications[]` entry (hence no `NotificationBanner` toast). Code fact: `notifications[]` feeds only `NotificationBanner.jsx` — there is no separate bell list, so this is a single early `return` in `processNotification`. |

**GATE 2 CLOSED — 2026-09-24 (owner).** IA `impact/BUG-453_IMPACT_ANALYSIS.md` patched (B1 mute registry in `soundManager`, OD-453-04). Gate 3 NOT started (owner: "do not start gate 3").

## Investigation-doc validation notes (2026-09-23)
All line references verified exact. Doc VALID. Gaps: no evidence dir; status CLOSED while OD-1..3 were open. Doc **not modified** (owner instruction).

## Next
**GATE 1 CLOSED — 2026-09-23 (owner).** Planning Gate 2 — all ODs locked; IA to cover foreground + SW paths, BUG-034 dedup interaction, Sidebar Silent Mode precedence (`setEnabled`), logout `stop()` (:196), and the per-order mute toggle wiring (`snoozedOrders` → NotificationContext or a mute set inside `soundManager`).
