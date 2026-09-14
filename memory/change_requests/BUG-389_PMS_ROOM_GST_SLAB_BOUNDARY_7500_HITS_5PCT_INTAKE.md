# BUG-389 Intake — PMS Room GST: Slab Boundary ₹7,500 Hits 5% (slab2.min=7500.01)

**ID:** BUG-389
**Date:** 2026-09-09
**Sprint:** pos_pms_1
**Registered by:** INTAKE agent (ALPHA v0.7)

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG (Backend Config) |
| **Severity** | **P1 — HIGH** |
| **Risk** | **CRITICAL** (R6 — GST tax, room billing) |
| **Area** | PMS / Backend Configuration (room_gst slab config) |
| **Source** | AGENT-DISCOVERED (investigation API probe, 2026-09-09) |
| **Confidence** | CONFIRMED (API response confirmed: slab2.min=7500.01) |
| **Duplicate check** | **DISTINCT** — BUG-386 was about '0.00' hardcode; BUG-388 is about advance base. This is a separate backend config data issue |
| **Related** | BUG-386, BUG-388 (same feature area) |
| **Code reality** | **NONE** — no FE code change needed; pure backend config data |
| **Blocked** | BACKEND-BLOCKED — slab config must be updated in backend admin/restaurant settings |
| **Fast Lane** | NOT APPLICABLE (backend-only fix) |

---

## Severity Rationale

> **P1:** Affects rooms at exactly ₹7,500 nightly rate with zero advance (edge case, but valid). P1 because wrong slab → understated GST → financial error. Downgraded from P0 because: (a) BUG-388 fix will handle the common case (advance included pushes most ₹7,500 rooms to ₹7,500+ total), (b) exact ₹7,500 with zero advance is an edge case.

---

## Description

The backend `room_gst` slab config for restaurant 69 (The Goan Kitchen) has:

```json
{
  "slabs": [
    { "min": 0,       "max": 7500,   "gst_percent": 5  },
    { "min": 7500.01, "max": null,   "gst_percent": 18 }
  ]
}
```

`slab2.min = 7500.01` creates a dead-zone: at exactly ₹7,500 nightly unit price:
- Slab1 matches (`7500 <= 7500` — inclusive max) → 5% ← WRONG
- Slab2 doesn't match (`7500 >= 7500.01` is false)

Per Indian GST accommodation rules: rooms at exactly ₹7,500/night SHOULD be taxed at 18% (≥ ₹7,500 → 18%).

**Scope:** May affect other restaurants with same slab config pattern (not investigated — single restaurant probe).

---

## Evidence

- **API endpoint:** `GET https://preprod.mygenie.online/api/v1/vendoremployee/profile`
- **Restaurant:** The Goan Kitchen (RID 69)
- **Raw slab config:** `/app/memory/evidence/BUG-GST-7500/room_gst_slabs.json`
- **FE simulation:** At ₹7,500 → matches slab1 (5%). At ₹7,600 → matches slab2 (18%) ✅

---

## Blast Radius

- **FE blast radius:** NONE — `roomGstCalculator.js` matching logic is correct given the data
- **Backend blast radius:** SMALL (single config field change per affected restaurant)
- **Scope:** Potentially all restaurants using this slab pattern

---

## Backend Fix Required

Change restaurant settings for RID 69 (and sweep other restaurants):

```json
// BEFORE
{ "min": 7500.01, "max": null, "gst_percent": 18 }

// AFTER
{ "min": 7500, "max": null, "gst_percent": 18 }

// Optional: also change slab1.max to avoid boundary overlap
// BEFORE: { "min": 0, "max": 7500, "gst_percent": 5 }
// AFTER:  { "min": 0, "max": 7499.99, "gst_percent": 5 }
```

---

## FE Code Note (optional hardening — separate decision)

`roomGstCalculator.js:29` uses inclusive upper bound (`<= s.max`). Changing to exclusive (`< s.max`) would match Indian GST "at or above" semantics, but:
- This alone does NOT fix the issue with current config (slab2.min=7500.01 gap persists)
- Both changes (backend config + FE exclusive max) are needed together
- Owner decision required before touching R6 financial logic

---

## Owner Decisions Needed

| ID | Question |
|---|---|
| OD-389-01 | Confirm backend team should update slab2.min to 7500.00 for RID 69 (and sweep all restaurants) |
| OD-389-02 | Should FE `roomGstCalculator.js` also change to exclusive max (`< s.max`) as optional hardening? |

---

## Process Required

Backend brief → backend team fix → FE verification probe (no FE code gate needed unless OD-389-02 approved)

---

*Intake complete: BUG-389 | P1 HIGH | BACKEND-BLOCKED | DISTINCT | Next: Backend brief to team + OD-389-01/02*
