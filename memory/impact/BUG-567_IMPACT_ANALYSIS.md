# BUG-567 — Impact Analysis (Gate 2)

**ID:** BUG-567 · **Date:** 2026-10-15 · **Role:** PLANNING (Gate 2 — Impact Analysis only)
**Code Reality:** NONE — `1279` still in ROTATE_MQ at HEAD (`OrderEntry.jsx:56`)
**Conflict Pre-check:** CLEAN — no open item touches ROTATE_MQ area (L55-L56). BUG-538/CR-409/410/411/412/413 all touch different sections of OrderEntry.jsx; all parallel-safe.
**OD-567-01:** LOCKED = **(a) portrait max-width: 767px** — Owner 2026-10-15
**Risk:** HIGH (OrderEntry.jsx = R5 hotspot)

---

## 1. The Problem

`OrderEntry.jsx:56` — ROTATE_MQ Condition A fires on portrait devices up to 1279px CSS width:

```js
// CURRENT (broken — L56)
const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)';
//                                                        ^^^^
//                                              catches ALL portrait devices < 1280px
//                                              including iPad 11" at 820-834px CSS
```

An iPad Pro/Air 11" in portrait mode has ~820-834px CSS width. The 3-panel OE layout at that width has a **236-250px middle panel** — fully functional. The overlay fires unnecessarily.

---

## 2. Fix

Change `1279` → `767` in ROTATE_MQ (OD-567-01=a):

```js
// AFTER FIX
const ROTATE_MQ = '(orientation: portrait) and (max-width: 767px), (max-width: 799px)';
//                                                        ^^^
//                                              only catches narrow portrait devices < 768px
//                                              (phones: 390-430px, iPad Mini: 744px)
//                                              iPad 11"+ (820px+) now unblocked in portrait
```

---

## 3. Data Flow Trace

ROTATE_MQ is **fully self-contained inside OrderEntry.jsx**. No other file imports or reads it.

```
OrderEntry.jsx:56  const ROTATE_MQ = '...'   ← only definition
                          ↓
OrderEntry.jsx:107 useState(() => window.matchMedia(ROTATE_MQ).matches)  ← initial state
                          ↓
OrderEntry.jsx:108 useEffect → mq.addEventListener('change', h)          ← resize/orient listener
                          ↓
OrderEntry.jsx:3003 {isRotateBlocked && (<div data-testid="order-entry-rotate-overlay">)}
                          ↓
           Overlay SHOWS (dark screen + "Rotate your tablet" message)
           OR
           Overlay HIDDEN (Order Entry 3-panel layout fully visible)
```

No API calls, no state shared outside OrderEntry, no localStorage reads/writes.

---

## 4. Impact of Change

### Devices affected by the change

| Portrait CSS | Device examples | Before (1279) | After (767) | Correct? |
|---|---|---|---|---|
| 390-430px | iPhone 14/15 | Blocked | **Blocked** | ✅ unchanged |
| 744px | iPad Mini | Blocked | **Blocked** | ✅ unchanged |
| 768-819px | between thresholds | Blocked | **Unblocked** | ✅ functional (middle ≥184px) |
| 820-834px | **iPad Air/Pro 11"** | Blocked ❌ | **Unblocked** ✅ | fixed |
| 1024px | **iPad Pro 13"** | Blocked ❌ | **Unblocked** ✅ | fixed |
| Any landscape | all devices | Unblocked | **Unblocked** | ✅ unchanged |

### Middle panel width at portrait 768px (the new lower boundary of "unblocked"):
- 768 − 56 (rail) − 144 (category) − 384 (CPP) = **184px** ✅ (above 140px min-w floor)
- Search bar (min-w-[140px]) fits at 184px. No overflow.

### BUG-555 QA tests — still valid after change?

| BUG-555 matrix row | Test viewport | Condition with new ROTATE_MQ | Still valid? |
|---|---|---|---|
| A4/A5: overlay visible at V3 (portrait) | V3 = 533×893 | 533 < 768 → portrait 533<768 → fires ✅ | **YES — test unchanged** |
| A4/A5: overlay absent at V1 (landscape) | V1 = 893×533 | not portrait → does not fire ✅ | **YES — unchanged** |
| A4/A5: overlay absent at V6 (desktop) | V6 = 1920×1080 | not portrait, not <800 → no fire ✅ | **YES — unchanged** |
| A7: cart round-trip V1↔V3 | resize 893→533 | 533 < 768 portrait → overlay at V3 ✅ | **YES — unchanged** |

All BUG-555 QA tests remain valid. The test viewports are outside the range affected by the change (533×893 portrait still triggers the overlay; landscape viewports are unaffected).

---

## 5. Downstream Consumers

| Consumer | File | Affected? | Why |
|---|---|---|---|
| Rotate overlay render | `OrderEntry.jsx:3003` | YES | `isRotateBlocked` value changes for 768-1279px portrait |
| cart-kept badge | `OrderEntry.jsx:3013` | YES (same block) | Only shown inside the overlay |
| All other OE state (cart, customer, search) | `OrderEntry.jsx` | NO | State untouched — overlay is conditional sibling layer |
| CategoryPanel | `CategoryPanel.jsx` | NO | Not related |
| Sidebar | `Sidebar.jsx` | NO | Not related |
| All report pages | `pages/reports-module/*` | NO | No ROTATE_MQ usage |
| Jest test files | `__tests__/*` | NO | No test references ROTATE_MQ |

---

## 6. Conflict Pre-Check

| Item | File section | Parallel-safe? |
|---|---|---|
| BUG-538 (canDiscount) | OrderEntry.jsx ~L1800s (CPP props) | ✅ SAFE — different section |
| CR-409/411/412/413 (GATE_5A) | OrderEntry.jsx L383-385, L1935-1953 | ✅ SAFE — different sections |
| BUG-555 WP-A (GATE_5B_QA_PASSED) | Introduced L56 ROTATE_MQ — now at Gate 5b+ | ✅ SAFE — this bug is its direct follow-up |

No conflicts.

---

## 7. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phone portrait regression (overlay disappears on phones) | NONE | Phones (390-430px) < 768px → Condition A still fires; Condition B (< 800px) also fires |
| iPad Mini regression (overlay disappears on iPad Mini) | NONE | iPad Mini portrait = 744px < 768 → Condition A still fires |
| OE layout broken on newly unblocked devices (768-1279px portrait) | LOW | Min portrait = 768px → middle panel = 184px (above 140px floor); verified functional |
| BUG-555 QA tests invalidated | NONE | Test viewports (V3=533px portrait) still in blocked range |
| Desktop unchanged | NONE | Desktop portrait not relevant (≥1280px landscape); Condition A doesn't fire for landscape |

**Overall: LOW regression risk. Fully self-contained in 1 constant string.**

---

## 8. Files WILL / WILL NOT Change

| WILL change | WILL NOT touch |
|---|---|
| `src/components/order-entry/OrderEntry.jsx` (L56) | `CategoryPanel.jsx`, `Sidebar.jsx`, all report pages, all tests, all APIs/services/transforms, any CSS/Tailwind config, any `.env` |

---

## 9. Verification Matrix (seeds Gate 3 + QA)

| # | Check | Viewport | Method | Auto? |
|---|---|---|---|---|
| V-1 | iPad 11" portrait (820×1180 or 834×1194): **no overlay** | V-iPad = ~820×1180 | testid `order-entry-rotate-overlay` absent | YES |
| V-2 | Phone portrait (390×844): **overlay still shows** | V-phone = 390×844 | testid present + backdropFilter blur | YES |
| V-3 | iPad Mini portrait (744×1133): **overlay still shows** | V-mini = 744×1133 | testid present | YES |
| V-4 | Portrait 768px: **no overlay** (lower boundary of unblocked) | V = 768×1024 | testid absent | YES |
| V-5 | Portrait 767px: **overlay shows** (upper boundary of blocked) | V = 767×1024 | testid present | YES |
| V-6 | BUG-555 V3 (533×893 portrait): **overlay still shows** | V3 | testid present (BUG-555 regression) | YES |
| V-7 | BUG-555 V1 (893×533 landscape): **overlay absent** | V1 | testid absent (BUG-555 regression) | YES |
| V-8 | BUG-555 cart round-trip: add items → 533 portrait → back to landscape → cart intact | V1↔V3 | resize + assert cart | YES |
| V-9 | Compile: 0 new warnings | — | webpack | YES |

---

## 10. Impact Analysis Summary

**Code Reality:** NONE (1 change at HEAD L56)
**Conflict:** CLEAN
**Scope:** 1 file, 1 line, 1 number (`1279` → `767`)
**Risk classification:** HIGH (R5 hotspot) — but change itself is trivial
**Regression risk:** LOW — phones/iPad Mini still blocked, BUG-555 QA tests still valid
**No financial / API / state / localStorage changes**

**Gate 2 status: COMPLETE. Ready for Gate 3 (Implementation Plan).**
