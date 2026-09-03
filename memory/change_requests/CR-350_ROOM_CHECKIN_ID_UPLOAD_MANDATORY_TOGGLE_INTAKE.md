# CR-350 — Room Check-In: ID Upload Mandatory/Optional Toggle

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 5)
**Sprint:** POS 5.1 backlog — BACKEND-BLOCKED

---

## Classification

| Field | Value |
|---|---|
| Type | CR (MISSING_FEATURE) |
| Severity | P2 |
| Risk | HIGH |
| Side | Both (FE + Backend) |
| Duplicate check | DISTINCT |
| Code reality | NONE (no settings key + no FE toggle) |
| Blast radius | MEDIUM (settings API + RoomCheckInModal + RestaurantSettingsPage) |
| Fast Lane eligible | NO (BACKEND-BLOCKED + HIGH risk) |
| Status | BACKEND-BLOCKED |

## Scope Update — 2026-08-26 (UNBLOCKED via localStorage pattern)

**Owner decision direction:** Add toggle to Settings dashboard screen (StatusConfigPage), same pattern as CR-051 customer name/phone mandatory toggles.

## Owner Decision — LOCKED 2026-08-26

**Phase 1: Option A — FE-only via StatusConfigPage + localStorage. No backend needed.**

| Field | Decision |
|---|---|
| Toggle location | `StatusConfigPage.jsx` — new "Room" section (same screen as customer name/phone mandatory toggles) |
| Storage | localStorage key: `mygenie_room_id_upload_required` |
| Consumer | `RoomCheckInModal.jsx` reads key at validation time |
| Pattern | Identical to CR-051 (`mygenie_walkin_name_required` etc.) |
| Backend | **None required for Phase 1** |
| Cross-device sync | Per-device (acceptable for Phase 1) |
| Phase 2 (future) | Migrate to RestaurantSettingsPage Step 8 + backend key when backend delivers `id_upload_required` |

**Option A** is fully FE-deliverable immediately. **Option B** retains backend dependency.

## Validation Location — CONFIRMED FE-ONLY

**2026-08-26 trace confirms: ID upload validation is 100% frontend-only.**

`roomService.js:74`: `if (params.frontImage) fd.append('front_image_file', params.frontImage)` — conditionally appended only when present. Backend has no validation, no 422, no rejection for missing document.

**Implication:** The toggle only needs to control the FE guard — no API-level enforcement needed at the backend check-in endpoint regardless of which option is chosen.

## Current FE Behaviour

- `flags.guestDetails` (from `profileTransform.js:238`, api.guest_details) = current only gate — all-or-nothing
- When `true` + `crmDocuments.length === 0` → upload mandatory (post BUG-351 fix)
- No separate `id_upload_required` key exists anywhere

## Proposed FE Change (Option A)

1. Add `mygenie_room_id_upload_required` localStorage key
2. Add toggle to `StatusConfigPage.jsx` under new "Room" section: **"Require ID Document on Check-In"**
3. `RoomCheckInModal.jsx` validation (line 611): replace hard check with `localStorage.getItem('mygenie_room_id_upload_required') === 'true'` — independent of `flags.guestDetails`

**Files:** `StatusConfigPage.jsx` (new Room section) + `RoomCheckInModal.jsx` (read localStorage key)

## Description

Some properties (e.g. Satkar Hotel) want ID upload to be **mandatory** on room check-in; others want it **optional**. Currently, the `flags.guestDetails` toggle controls whether the guest-details section is shown at all, but there is **no toggle to control whether ID photo upload is required vs optional** within that section.

Checking the Settings API confirmed: **no `id_upload_required` key exists** anywhere in the settings response.

## Scope

**Backend needs:**
- New settings key: `id_upload_required` (boolean, default `false`)
- Exposed via `settings-list` API and editable via `update-settings`

**Frontend needs (after backend delivers):**
1. `RestaurantSettingsPage.jsx` — new toggle "Require ID Photo on Check-In"
2. `RoomCheckInModal.jsx:610` — read the new flag + conditionally enforce frontImage validation

## Backend Action Required

Add `id_upload_required: true/false` to the settings schema. File backend brief when implementing.

## Evidence

- File: `src/components/modals/RoomCheckInModal.jsx:609-610`
- Settings probe: no ID-related key found in `settings-list` response
- Confidence: HIGH (absence confirmed)

## Owner Decisions Needed

OD-1: Should `id_upload_required` default to `true` (currently always required) or `false` (optional by default)?
OD-2: Should this be a per-property toggle in Restaurant Settings, or a system-level default?

## Next Gate

Gate 2 (Impact Analysis) — blocked on backend delivering the settings key. File backend brief first.
