# CR-437 — New Settings Keys Including Menu Master

**Registered:** 2026-10-18
**Type:** CR
**Priority:** P2
**Risk:** MEDIUM
**Area:** Settings / Profile / Menu Management
**Sprint:** backlog
**Status:** GATE_1_INTAKE

---

## Description

All new settings keys from the backend — including the Menu Master key — need to be mapped in the frontend so they are available to relevant screens. Currently new keys added on the backend may not be read by the FE profile/settings transform, causing features gated by these keys to not activate.

---

## Duplicate Check

**DISTINCT** — existing settings CRs are feature-specific. This is an audit/mapping CR to bring all current and new backend settings keys into the FE transform.

---

## Open Decisions

- **OD-437-01:** Full list of new backend settings keys to be provided by backend team (including exact JSON key names and expected values/types)
- **OD-437-02:** Which screens consume each new key?
- **OD-437-03:** What is "Menu Master"? Is it a separate API endpoint or a field in the restaurant profile settings?

---

## Blast Radius (estimate)

- `src/api/transforms/restaurantSettingsTransform.js` — primary mapping file
- Screens that consume the new keys (TBD after OD-437-01 answered)
- Estimated scope: SMALL–MEDIUM (1–3 files)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: Blocked on OD-437-01 (settings key list from backend)
