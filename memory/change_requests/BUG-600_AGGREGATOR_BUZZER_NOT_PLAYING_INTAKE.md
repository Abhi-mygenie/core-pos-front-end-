# BUG-600 — Intake (Gate 1)
## Aggregator orders play confirm_order sound instead of buzzer

**ID:** BUG-600
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Aggregator / Sockets
**Priority:** P1
**Risk:** MEDIUM — wrong sound for aggregator orders, staff may miss or confuse with POS confirm
**Fast Lane eligible:** NO (touches NotificationContext + new tone mapping)
**Source:** OWNER-REPORTED (Goan Kitchen, RID 69)
**Duplicate check:** DISTINCT

---

## 1. Description
Restaurant has `aggregator_order_tone: "buzzer"` configured in settings. When an aggregator order (Swiggy/Zomato) arrives, it plays the confirm_order sound instead of the five_sec_buzzer. Staff expects a buzzer and gets a different ringer.

## 2. Root Cause (from investigation, HIGH confidence)
`aggregator_order_tone` is mapped in `profileTransform.js:398` and displayed in Settings UI (`OperationalTab.jsx`), but **nobody reads it** when determining notification sound. The `toneMapper.js` only maps `confirm_order_tone` and explicitly excludes `aggregator_order_tone` (comment at L18). No `mapAggregatorOrderTone()` function exists.

**Sound chain:**
1. FCM notification → `NotificationContext.processNotification()`
2. Sound resolved from `data.sound` or `inferSoundFromContent()`
3. `isConfirmOrderNotification()` fires → maps using `confirm_order_tone: "default"` → plays `confirm_order`
4. `aggregator_order_tone: "buzzer"` → **never checked**

## 3. Evidence
- `toneMapper.js:18`: "Do NOT use aggregator_order_tone in this mapping"
- `profileTransform.js:398`: `aggregatorOrderTone` mapped but no consumer
- Restaurant profile: `aggregator_order_tone: "buzzer"`, `confirm_order_tone: "default"`

## 4. Blast Radius
- `NotificationContext.jsx` — add aggregator order detection + tone mapping (~10 lines)
- Possibly `toneMapper.js` — add `mapAggregatorOrderTone()` function
- Scope: SMALL (1-2 files)

## 5. Owner Decisions
- OD-600-01: Mapping: `buzzer` → `five_sec_buzzer`, `default` → `new_order`, `silent` → `silent`. Confirm?

## 6. Next
Planning Gate 2 → Implementation.
