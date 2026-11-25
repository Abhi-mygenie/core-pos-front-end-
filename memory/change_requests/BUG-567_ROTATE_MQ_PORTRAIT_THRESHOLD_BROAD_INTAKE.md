# BUG-567 — Intake (Gate 1)
## ROTATE_MQ portrait threshold too broad — iPad 11" (and all iPads) blocked from Order Entry in portrait mode

**ID:** BUG-567
**Type:** BUG (design gap introduced by BUG-555 WP-A, OD-555-13=c)
**Date:** 2026-10-15
**Registered by:** INTAKE agent (owner smoke test 2026-10-15)
**Severity:** P1 — HIGH
**Risk:** HIGH (OrderEntry.jsx = R5 hotspot)
**Sprint:** oct_cr_batch
**Area:** Order Entry / Tablet Responsiveness
**Related:** BUG-555 WP-A (introduced ROTATE_MQ), OD-555-13=c (locked the current threshold)
**Fast Lane eligible:** NO — R5 hotspot (OrderEntry.jsx)
**Process:** Full Gate 2-3 required (R5 → full planning + regression checklist + owner Gate 4 GO)
**Duplicate check:** DISTINCT — no prior registration. BUG-555 locked OD-555-13=c intentionally; this bug is a gap in that decision.

---

## 1. Description

BUG-555 WP-A (edit A2) introduced the rotate overlay for Order Entry with this media query:

```js
// OrderEntry.jsx:56
const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)';
```

**Fires if EITHER:**
- **Condition A:** Device is in portrait AND CSS width < 1280px
- **Condition B:** CSS width < 800px (any orientation)

**The problem:** Condition A catches **every portrait device below 1280px** — including large iPads where Order Entry works perfectly fine. On an iPad Pro/Air 11" in portrait (CSS width ≈ 820-834px), the 3-panel OE layout has 236-250px for the middle panel, which is functional. The overlay is unnecessary and blocks these devices from using Order Entry in portrait.

**Owner report:** "In vertical mode even in 11 inch iOS we are getting rotate screen" — iPad Pro 11" in portrait always shows the overlay.

---

## 2. Affected Devices

| Device | Portrait CSS | Middle panel | Layout works? | Overlay shows? | Correct? |
|---|---|---|---|---|---|
| iPhone 14 portrait | 390px | −194px ❌ | NO (broken) | YES | ✅ Correct |
| iPhone 14 landscape | 844px | 260px ✅ | YES | NO | ✅ Correct |
| iPad Mini portrait | 744px | 160px | Tight but yes | YES | ⚠️ Debatable |
| **iPad Air/Pro 11" portrait** | **820-834px** | **236-250px** ✅ | **YES** | **YES** | ❌ **Wrong** |
| **iPad Pro 13" portrait** | **1024px** | **440px** ✅ | **YES** | **YES** | ❌ **Wrong** |

*(Middle panel = CSS width − 56px rail − 144px category − 384px CPP)*

---

## 3. Evidence

- **Screenshot:** Owner smoke test 2026-10-16 (iPad 11" showing "Rotate your tablet" overlay in portrait)
- **Investigation:** `ROTATE_MQ` analysis confirms Condition A fires on iPad 11" portrait (820-834px < 1280px and orientation=portrait)
- **Code:** `OrderEntry.jsx:56` — `const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)'`
- **Confidence:** CONFIRMED — measured CSS viewports, logic traced
- **Source:** OWNER-REPORTED

---

## 4. Root Cause

`OrderEntry.jsx:56` — ROTATE_MQ Condition A: `(orientation: portrait) and (max-width: 1279px)`.

The 1279px portrait threshold was chosen in BUG-555 planning to cover all "tablet" widths. But it is too broad:
- **Intended catch:** Phones in portrait (390-430px) where layout breaks (middle panel negative)
- **Actual catch:** ALL portrait devices including 11-inch and 13-inch iPads where layout works fine

The correct threshold for portrait blocking should only catch devices where the middle panel would be too narrow (< ~140px), which happens at CSS portrait width ≤ ~724px:
- At 724px portrait: 724 − 56 − 144 − 384 = 140px (at the min-w limit)
- At 767px portrait: 767 − 56 − 144 − 384 = 183px (workable)

---

## 5. Blast Radius

- **Files changed:** 1 (`src/components/order-entry/OrderEntry.jsx`)
- **Lines changed:** 1 (L56: ROTATE_MQ constant string)
- **Hotspot R5:** YES — `OrderEntry.jsx` is explicitly listed in R5
- **Financial:** NO
- **Scope:** SMALL code change, HIGH process requirement (R5)
- **Downstream:** All iPad users using OE in portrait — unblocked after fix
- **Regression risk:** Phones in portrait must still be blocked — threshold must not be raised too high

```bash
# Blast radius grep
grep -rn "ROTATE_MQ\|isRotateBlocked" /app/frontend/src/ --include="*.jsx" | grep -v node_modules
# → 3 hits, all in OrderEntry.jsx (L56, L107, L108) — fully self-contained
```

---

**OD-567-01 LOCKED — (a) portrait max-width: 767px**
Owner: 2026-10-15 ("a update docs and decision")

| Option | Decision |
|---|---|
| (a) `portrait AND max-width: 767px` | **LOCKED ✅** |
| (b) `portrait AND max-width: 819px` | Rejected |
| (c) Remove portrait condition | Rejected |

**Effect:**
- iPhone portrait (390-430px): **still blocked** ✅ — layout breaks at this width
- iPad Mini portrait (744px): **still blocked** — tight middle panel (160px), acceptable
- iPad Air/Pro 11" portrait (820-834px): **unblocked** ✅ — middle panel 236-250px works fine
- iPad Pro 13" portrait (1024px): **unblocked** ✅ — middle panel 440px works great

**New ROTATE_MQ after fix:**
```js
const ROTATE_MQ = '(orientation: portrait) and (max-width: 767px), (max-width: 799px)';
//                                                        ^^^
//                                      changed from 1279 → 767
```

---

## Open Owner Decisions

**OD-567-01: LOCKED — (a) `portrait AND max-width: 767px`** — Owner 2026-10-15.

- iPad Mini portrait (744px): **blocked** (still sees overlay — tight middle panel)
- iPad Air/Pro 11"+ portrait (820-1024px): **unblocked** ✅ (middle panel 236-440px)
- Phones portrait (390-430px): **blocked** ✅ (middle panel negative)

**New ROTATE_MQ:** `'(orientation: portrait) and (max-width: 767px), (max-width: 799px)'`

**Open decisions: NONE — all locked.**

---

## 7. Risk Classification

| Attribute | Value |
|---|---|
| Risk | **HIGH** (R5 hotspot) |
| R5 file | YES — `OrderEntry.jsx` |
| Financial | NO |
| Fast Lane | NO (R5 blocks it) |
| Planning skip | NO |
| Process | Full Gate 2-3 + owner Gate 4 GO |

---

## 8. Severity Rubric

- **P1 — HIGH:** Feature broken, no workaround for iPad users in portrait. Restaurant staff using iPad as POS terminal CANNOT use Order Entry at all while holding it upright. Must rotate device (workaround exists but is inconvenient). P1 confirmed.

---

## INTAKE COMPLETE

```
Intake complete: BUG-567
Classification: BUG, Severity: P1, Risk: HIGH
Duplicate check: DISTINCT
Evidence: owner screenshot + investigation analysis confirmed
Blast radius: SMALL (1 file, 1 line) — HIGH process due to R5
OD-567-01: LOCKED = (a) portrait max-width: 767px
Docs updated: registry.json, BUG_TRACKER.md, intake doc
Open decisions: NONE
Next: Planning Gate 2 (impact analysis) → Gate 3 (plan) → Gate 4 GO → Implementation
Gate 4 GO required before implementation (R5 hotspot)
```
