# BUG-759..763 — Gate 3 Implementation Plan (Pack)
## Ringer / YTC UX Pack (Accept flash · Mute color · Banner · Sidebar · Mute grey)

**IDs:** BUG-759, BUG-760, BUG-761, BUG-762, BUG-763  
**Date:** 2026-11-28  
**Role:** PLANNING — Gate 3 (Implementation Plan)  
**Based on IA:** `impact/BUG-759_763_RINGER_YTC_PACK_IMPACT_ANALYSIS.md`  
**Code Reality:** FULL — **retroactive plan** (edits already in commit `784aedf0` on `ultimate-fix`, base `430edce9`)  
**Risk:** MEDIUM · **Sprint:** `dec_sprint` · **Client:** ALL · **Assignee:** Abhishek  
**Awaiting:** Owner Gate 4 GO / waive → registry `GATE_5A_IMPLEMENTED` + push + QA smoke  

**No redesign.** This document locks as-shipped edits, verification, and post-code checklist.

---

## 1. Entry Verification (IA anchors vs tree @ `1d6884f7` / code from `784aedf0`)

| Edit | File | Lines | Marker / content | Match? |
|------|------|-------|------------------|--------|
| E1 | `YtcFcmHydrator.jsx` | 41–46 | Accept flash guard + early return | YES |
| E2 | `NotificationContext.jsx` | 20–22, 189–194 | tightened yet-to-confirm / `confirm_order` | YES |
| E3 | `NotificationContext.jsx` | 222–227 | `mygenie:order-alert-played` on play | YES |
| E4 | `DashboardPage.jsx` | 519–544, 1341–1357 | listener + instance `toggleSnooze` | YES |
| E5 | `SoundUnlockBanner.jsx` | full file | Turn on ringer + Keep it silent | YES |
| E6 | `Sidebar.jsx` | 818–832 | leave Silent → enable + unlock | YES |
| E7 | `ScanOrderPopOut.jsx` + Dashboard | 204, 748–772; Dash 205, 1982 | `soundEnabled` Mute grey | YES |

IA Gate 2 still accurate — no line drift requiring re-IA.

---

## 2. Scope Lock

### Files WILL change (already changed in `784aedf0`)

| File | Bugs |
|------|------|
| `frontend/src/components/notifications/YtcFcmHydrator.jsx` | 759 |
| `frontend/src/contexts/NotificationContext.jsx` | 759, 760 |
| `frontend/src/pages/DashboardPage.jsx` | 760, 763 |
| `frontend/src/components/notifications/SoundUnlockBanner.jsx` | 761 |
| `frontend/src/components/layout/Sidebar.jsx` | 762 |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | 763 |
| `frontend/src/__tests__/components/dashboard/ScanOrderPopOut.test.jsx` | 763 |

### Files WILL NOT touch

- `config/firebase.js`, `firebase-messaging-sw.js`
- `utils/soundManager.js` (except existing `stop()` from Mute — no play/mute-registry changes)
- `OrderEntry.jsx`, transforms, sockets, BE APIs
- Multi-browser FCM token overwrite (out of scope)

---

## 3. Edits (as-shipped — already applied)

### E1 — BUG-759 · `YtcFcmHydrator.jsx` L41–46

**Before:** After existing YTC-eligible short-circuit, hydrate always continued → could `addOrder(minimal fos=7)` for already-accepted orders.

**After (shipped):**
```javascript
      // Accept flash guard: never re-inject fos=7 for an order that is already
      // known and no longer YTC / web-edit eligible (e.g. just accepted).
      if (existing && !isUnconfirmedScanOrder(existing) && !hasUnconfirmedWebEditItems(existing)) {
        removeYtcFcm(orderId);
        return;
      }
```

**Why:** Accept ACK FCM re-queued YTC hydrate; without guard, popup flashed.

---

### E2 — BUG-759 · `NotificationContext.jsx` L20–22 + L189–194

**Before:** `text.includes('confirm')` / `/confirm/i` treated Accept “confirmed” as YTC.

**After (shipped):**
```javascript
  if (/\byet\s*to\s*confirm\b|\bto confirm\b|confirm[_\s-]?order/.test(text)) return 'confirm_order';
  if (text.includes('accepted') || text.includes('confirmed')) return 'order_accepted';
```
```javascript
    const looksLikeYtcConfirm =
      isConfirmOrderNotification(data, resolvedSound) ||
      /\byet\s*to\s*confirm\b|\bto confirm\b|confirm[_\s-]?order/i.test(ytcText);
```

**Why:** Stop false YTC enqueue after Accept.

---

### E3 — BUG-760 · `NotificationContext.jsx` L222–227

**After successful `soundManager.play`:**
```javascript
        try {
          window.dispatchEvent(new CustomEvent('mygenie:order-alert-played', {
            detail: { orderId: diagOrderId || null },
          }));
        } catch { /* ignore */ }
```

**Why:** Signal Dashboard to reset Mute UI color when a new alert actually rings.

---

### E4 — BUG-760 · `DashboardPage.jsx` L519–544 + L1341–1357

**Listener:** clear / trim `snoozedOrders` on `mygenie:order-alert-played`.  
**toggleSnooze:** instance-only `soundManager.stop()` + string-normalized Set; **no** `toggleOrderMute`.

**Why:** Mute orange stuck while next order rang; keep BUG-453 instance-mute contract.

---

### E5 — BUG-761 · `SoundUnlockBanner.jsx`

Replace large single-button pill with compact bar:

- **Turn on ringer** → `unlockAudioNow()`
- **Keep it silent** → `setSoundEnabled(false)`
- Hide when `!audioBlockedAt || audioUnlocked || !soundEnabled`

**Why:** Owner UX — smaller banner + intentional Silent without sidebar first.

---

### E6 — BUG-762 · `Sidebar.jsx` L818–832

```javascript
            if (!soundEnabled) {
              setSoundEnabled(true);
              if (!audioUnlocked) unlockAudioNow();
              return;
            }
            if (!audioUnlocked) {
              unlockAudioNow();
              return;
            }
            setSoundEnabled(false);
```

**Why:** After Keep it silent, one click restores Ringer On (enable + unlock).

---

### E7 — BUG-763 · `ScanOrderPopOut.jsx` + Dashboard + tests

- Prop `soundEnabled = true` (read-only visual)
- Mute styles grey + BellOff when `!soundEnabled`
- Dashboard: `const { soundEnabled } = useNotifications()` → pass to `<ScanOrderPopOut … soundEnabled={soundEnabled} />`
- Tests: `isWebOrder: true` fixtures; A-1/A-2 comments allow prop-only / CR-561 `updateFoodItemPrice`

**Why:** Mute looks grey in Silent Mode; anti-tests stay green.

---

## 4. Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| E1 | YtcFcmHydrator.jsx | Accept flash guard | Accept YTC → popup must not flash reopen | NO |
| E2 | NotificationContext.jsx | Tight YTC detect | Accept ACK FCM must not enqueue YTC | NO |
| E3–E4 | NotificationContext + Dashboard | Mute color reset | Mute → next order rings → Mute not orange | NO |
| E5 | SoundUnlockBanner.jsx | Compact 2-button | Locked + alert → see Turn on ringer / Keep it silent | NO |
| E6 | Sidebar.jsx | One-click leave Silent | Keep it silent → one sidebar click → Ringer On | NO |
| E7 | ScanOrderPopOut + Dashboard | Mute grey | Silent on → Mute grey/BellOff | NO |
| E7 tests | ScanOrderPopOut.test.jsx | Fixtures / anti-tests | `yarn test --testPathPattern=ScanOrderPopOut` | YES |

**Automated result (already run):** ScanOrderPopOut **29/29 PASS**.

---

## 5. Post-Code Registry Checklist (after Gate 4 GO / waive)

Implementation / Closure agent MUST:

```
- [ ] registry.json: BUG-759..763 → status: GATE_5A_IMPLEMENTED 2026-11-28, sprint_key: dec_sprint
- [ ] BUG_TRACKER.md: CURRENT line — pack shipped on ultimate-fix @ 784aedf0 (+ intake/IA/plan commits)
- [ ] FILE_OWNERSHIP.md: note BUG-759..763 on the 7 files listed in Scope Lock
- [ ] Code markers: // BUG-759 … // BUG-763 comments at edit sites if not already present
- [ ] Push ultimate-fix (auth required)
- [ ] Owner smoke: five rows in Verification Matrix (manual)
```

---

## 6. Risk Register

| Risk | Mitigation |
|------|------------|
| Odd YTC wording no longer opens pop | Still match yet-to-confirm / to confirm / confirm_order + type set |
| order-alert-played clears Mute too early | Dispatch only on actual play path |
| Keep it silent vs CR-440 | Uses `soundEnabled`, not `notificationsEnabled` |
| Regression on BUG-747 tri-state | Sidebar still handles Tap-to-enable when already `soundEnabled` |

Fast Lane: **NO**.

---

## 7. Execution Sequence

| Step | Status |
|------|--------|
| 1. Apply E1–E7 | **DONE** — `784aedf0` |
| 2. Unit tests | **DONE** — 29/29 |
| 3. Intake + Gate 2 IA | **DONE** — `49db3885`, `1d6884f7` |
| 4. Gate 3 plan (this doc) | **THIS COMMIT** |
| 5. Gate 4 GO / waive → GATE_5A + push + QA | **PENDING owner** |

---

## 8. Gate 3 Exit

```
Implementation Plan complete for BUG-759..763 (pack).
Plan: memory/plans/BUG-759_763_RINGER_YTC_PACK_IMPLEMENTATION_PLAN.md
Code Reality: FULL — edits already in 784aedf0.
Scope: 7 files WILL (shipped) / firebase·soundManager play·OrderEntry·BE WILL NOT.
Verification matrix: 7 checks (1 automated PASS, 6 manual pending).
Owner decisions: none.
Awaiting Gate 4 GO (or waive) → GATE_5A_IMPLEMENTED + push + smoke.
```
