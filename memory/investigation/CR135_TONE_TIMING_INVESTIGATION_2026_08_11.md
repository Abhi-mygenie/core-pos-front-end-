# Investigation Report — CR-135 `tone_timing` Not Mapped in Aggregator Setup UI
**Date:** 2026-08-11
**Investigator:** INVESTIGATION Agent (Role 6)
**Steps used:** 7/10
**Confidence:** HIGH — code confirmed, design gap identified
**Item:** CR-135 (Aggregator Setup — implemented, Gate 5b QA PASS)

---

## 1. Summary

`tone_timing` is a field returned by `GET /aggregator-config/` and sent in `POST /aggregator-config/`. It has **no UI control** in the Aggregator Setup screen (ConfigTab or OperationalTab). It is silently passed through `_raw` with its existing value (or `null` for new/unset configs). Users cannot read or configure it from the UI.

**Classification:** FE_GAP (CR-135 implementation gap — not an explicit OD exclusion)
**Confidence:** HIGH
**FE fix eligible:** YES — 3 files, MEDIUM scope

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 | `tone_timing` is explicitly excluded by an OD decision | Read CR-135 impact analysis OD list | **ELIMINATED** — OD-16/17/18 cover `auto_aknowledge`, `auto_kot_id`, `notification_number`. `tone_timing` has NO OD — was silently lumped into pass-through list |
| H2 | `tone_timing` is passed through via `_raw` and can be preserved | Code trace of `aggregatorConfigTransform.toAPI.config` | **CONFIRMED** — `...(state._raw || {})` spreads `tone_timing` into POST. Non-null values ARE preserved correctly |
| H3 | `tone_timing` needs a UI control | Code inspection + API shape from impact analysis sample | **CONFIRMED** — `tone_timing: 45` was in the sample curl, meaning it CAN have a meaningful integer value. No UI exists to set it |

---

## 3. Data Flow Trace

```
GET /aggregator-config/
  → response.data.tone_timing = null (18march — no value set)
                               = 45   (sample from impact analysis — e.g. 45s buzzer)

aggregatorConfigTransform.fromAPI.config():
  _raw: deepClone(d)           ← tone_timing stored here (null or 45)
  — NO named key for toneTiming in returned state object —
  
  ⚠️ BREAK POINT 1: tone_timing is NOT exposed as a React state variable
  → User cannot see the current value in ConfigTab/OperationalTab
  → User cannot change it from the UI

aggregatorConfigTransform.toAPI.config():
  ...(state._raw || {}),       ← tone_timing: null (or 45) spread from _raw
  store_id: state.storeId,
  ...

  ⚠️ BREAK POINT 2: tone_timing is always the _raw value (never user-modified)
  → For restaurants where backend has tone_timing=null → POST sends null ✓ (correct)
  → For restaurants where backend has tone_timing=45  → POST sends 45  ✓ (preserved correctly)
  → For restaurants that WANT to set/change tone_timing → NO PATH to do it
```

---

## 4. What `tone_timing` Is

From CR-135 impact analysis sample curl:
```json
"tone_timing": 45
```

From `profileTransform.js:252`:
```javascript
toneTiming: parseInt(api.tone_timing) || null,
```

From `toneMapper.js:18`:
```
// Do NOT use confirm_order_ringer, tone_timing, aggregator_order_tone, or
// voice_in_kds in FE logic
```

**`tone_timing` = integer (seconds)** — duration for how long the aggregator order notification tone plays. For example, `45` = play for 45 seconds.

It is different from `aggregatorOrderTone` (type: silent/default/buzzer) — `tone_timing` is the DURATION, `aggregatorOrderTone` is the SOUND TYPE.

The `toneMapper.js` note says not to use it in the FE tone-mapping logic (it's handled by a native sound player on the device), but it still needs to be CONFIGURABLE from the UI.

---

## 5. Why It Wasn't Mapped (Root Cause)

The CR-135 impact analysis explicitly listed pass-through fields:
```
Pass-through fields (not shown in UI): tone_timing, auto_aknowledge, auto_kot_id,
                                       notification_number, parent_store_id
```

OD-16, OD-17, OD-18 covered `auto_aknowledge`, `auto_kot_id`, `notification_number` with explicit owner decisions. **`tone_timing` had NO OD** — it was implicitly lumped into the pass-through list without a deliberate exclusion decision.

---

## 6. Evidence Artifacts

- `/app/memory/evidence/CR-135-TONE-TIMING/` — API probe artifacts
- Code: `aggregatorConfigTransform.js` — `_raw` pass-through comment + toAPI spread
- Code: `profileTransform.js:252` — `toneTiming` mapping confirms integer type
- Impact analysis: `/app/memory/impact/CR-135_IMPACT_ANALYSIS.md` — OD list + sample curl showing `tone_timing: 45`

---

## 7. Recommendations

### Classification: FE_GAP — missing UI field for `tone_timing` in ConfigTab

### Fix scope: 3 files

**File 1 — `aggregatorConfigTransform.js`:**
- `fromAPI.config`: Add `toneTiming: parseInt(d.tone_timing) || null` as an explicit named key
- `toAPI.config`: Add `tone_timing: state.toneTiming` (explicit override on top of `_raw` spread — `_raw` will still provide it as fallback, but explicit key takes precedence)

**File 2 — `ConfigTab.jsx`:**
- Add a `toneTiming` field to the form state (initialized from `configState.toneTiming`)
- Add a number input "Notification Duration (seconds)" with hint explaining what it controls
- Pass `toneTiming` up via `setConfigState`

**File 3 — `AggregatorSetupView.jsx` (or wherever configState is managed):**
- Ensure `toneTiming` is included when building the POST payload

### Planning skip eligible?
- ≤10 lines? YES per file
- 1 file? NO — 3 files
- **NOT eligible for fast lane** — affects 3 files including transform (API contract)
- **→ Full Gate 2-3 required**

---

## 8. Owner Decisions Needed (for Planning Gate 2)

| OQ | Question |
|---|---|
| OQ-1 | Is `tone_timing` an integer in seconds? What is the valid range (e.g. 0–120)? |
| OQ-2 | Should the field be in ConfigTab (per-brand) or OperationalTab (restaurant-wide)? Based on the endpoint (`/aggregator-config/`), it is per-brand → ConfigTab |
| OQ-3 | What label and hint should the UI show? Suggested: "Tone Duration (seconds)" / "How long the order notification plays" |
| OQ-4 | Should `null` be allowed (no timeout — plays indefinitely), or should a default value be enforced? |

---

## 9. Next Steps

```
Root cause: FE_GAP — tone_timing has no UI mapping. Pass-through preserves
            existing values but users cannot read/set it from the Aggregator Setup screen.
Classification: FE_GAP (CR-135 implementation gap, no explicit OD exclusion)
Confidence: HIGH
Steps: 7/10
FE fix: YES — 3 files (aggregatorConfigTransform.js, ConfigTab.jsx, possibly AggregatorSetupView.jsx)
Backend ask: NO — field already exists in API
Planning skip eligible: NO — 3 files, API contract change
Recommended: INTAKE → PLANNING Gate 2-3 → Gate 4 GO → Implementation
```
