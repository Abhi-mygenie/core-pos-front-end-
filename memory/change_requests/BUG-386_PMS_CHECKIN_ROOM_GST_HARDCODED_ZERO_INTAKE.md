# BUG-386 — Intake Document
## PMS Check-In: Room Accommodation GST Never Computed or Sent (gst_tax Hardcoded '0.00')

**ID:** BUG-386
**Type:** BUG
**Registered:** 2026-09-08
**Sprint:** pos_pms_1
**Area:** PMS — Room Check-In (S4)
**Severity:** P0 — CRITICAL (financial: every PMS check-in under-taxes room stays; GST compliance gap)
**Risk:** CRITICAL (billing, tax, room balance)
**Source:** AGENT-DISCOVERED via investigation INV-PMS-GST-001 (owner-supplied spec: `pms_gst.md`)

---

## Duplicate Check
- **Result: DISTINCT** (with one RELATED item)
- **Related: BUG-338** — "Room GST Applied When roomGstApplicable = false" — that bug guarded F&B/order-level GST on room orders when the flag is OFF. **This bug is the opposite and unrelated:** PMS accommodation GST (from `room_gst` slabs in profile) is never computed or sent during check-in — regardless of whether `roomGstApplicable` is ON or OFF.
- **Related: CR-116** — B2B GST capture in Collect Bill (`firm_gst`). Unrelated — that covers company invoice GST, not accommodation slab tax.
- No other GST-slab-computation or check-in GST bug found in registry.

---

## Problem Description

The PMS check-in endpoint (`POST /api/v1/vendoremployee/pos/user-group-check-in`) expects `gst_tax` computed from the restaurant's accommodation GST slab configuration (`restaurants[].settings.room_gst`). The `room_gst` config defines a rate-based slab — e.g. 5% for rooms ≤ ₹7,500/night, 18% above.

**FE currently sends `gst_tax: '0.00'` unconditionally** on every check-in. GST is never computed. As a result:
- Backend stores `user_id_documents.gst_tax = 0` for every PMS check-in
- `remaining_room_balance` = `room_price + 0 − paid` → understated (GST not included)
- `balance_payment` in the check-in payload is `orderAmount − advance` instead of `orderAmount + gst_tax − advance`
- Receptionist sees no GST on the check-in form — no tax disclosure to guest

---

## Evidence

- **Primary:** `src/api/services/pmsService.js:162` — `gst_tax: '0.00'` hardcoded
- **Primary:** `src/api/services/pmsService.js:159` — `balance_payment: to2dp(orderAmount - advance)` (missing GST)
- **Primary:** `src/api/transforms/profileTransform.js:241` — only `roomGstApplicable` (boolean) extracted; `room_gst` slab object silently dropped
- **Spec:** `pms_gst.md` (owner-supplied) §1–§2 — defines slab computation + payload contract
- **Investigation report:** `memory/evidence/INV-PMS-GST-001/INVESTIGATION_REPORT_PMS_GST_2026_09_08.md`
- **Backend brief:** `memory/backend_briefs/BACKEND_BRIEF_INV-PMS-GST-001_2026_09_08.md` (Q-GST-01: checkout payload contract)
- **Steps to reproduce:** Any check-in via `/pms/check-in` → inspect network payload → `gst_tax` is always `"0.00"`
- **Source:** AGENT-DISCOVERED
- **Confidence:** CONFIRMED (code trace — no ambiguity)

---

## Risk Classification

| Axis | Value |
|---|---|
| Risk level | **CRITICAL** |
| Trigger | Money / tax / billing — every room check-in under-taxes |
| Process required | Full gate flow + owner approval + regression (financial logic) |
| Fast Lane eligible | NO |
| Financial? | YES — GST compliance, outstanding balance display |
| Hotspot files? | YES — `profileTransform.js` (high-traffic transform) |

---

## Blast Radius

| Metric | Value |
|---|---|
| Files to MODIFY | 3 (`pmsService.js`, `profileTransform.js`, `CheckInPage.jsx`) |
| Files to CREATE | 1 (`src/utils/roomGstCalculator.js`) |
| Files to INVESTIGATE | 1 (`PmsCheckoutDrawer.jsx` — pending Q-GST-01) |
| Hotspot files | `profileTransform.js` (many consumers) |
| Estimated scope | **MEDIUM** (4 files, financial) |

---

## Sub-Gaps (from INV-PMS-GST-001)

| Gap | Severity | Description |
|---|---|---|
| GAP-1 | CRITICAL | `gst_tax: '0.00'` hardcoded in `pmsCheckIn` — pmsService.js:162 |
| GAP-2 | CRITICAL | `balance_payment` missing GST component — pmsService.js:159 |
| GAP-3 | HIGH | `room_gst` slab object never parsed from profile — profileTransform.js:241 |
| GAP-4 | HIGH | No GST slab computation utility exists in FE |
| GAP-5 | MEDIUM | CheckInPage shows no GST breakdown to receptionist |
| GAP-6 | MEDIUM | In-House outstanding balance understated (downstream of GAP-1; self-heals for new bookings) |
| GAP-7 | MEDIUM | Checkout drawer GST contract unclear — pending Q-GST-01 backend brief |
| GAP-8 | LOW | No equal-room-rate enforcement for future multi-room check-in |

---

## Owner Decisions — ALL LOCKED (2026-09-08)

| OD | Question | **Decision** | Locked |
|---|---|---|---|
| OD-386-01 | Priority + sprint? | **P0 — this sprint (`pos_pms_1`)** | ✅ 2026-09-08 |
| OD-386-02 | Does `order-bill-payment` checkout need explicit `gst_tax` resent, or does BE derive from check-in? | **Option A — YES, resend explicitly.** FE must read stored `gst_tax` from `room_payment_summary.gst_tax` and include it in the checkout payment payload. | ✅ 2026-09-08 |
| OD-386-03 | Historical bookings with `gst_tax = 0` — flag in UI or fix forward only? | **Fix forward only.** No FE flag for historical. Historical correction is backend/data scope only. | ✅ 2026-09-08 |
| OD-386-D1 | Show CGST/SGST split in GST strip or just total? | **Show CGST + SGST individually** (each = total_gst ÷ 2), then Total GST (CGST + SGST). | ✅ 2026-09-08 |
| OD-386-D2 | Show slab threshold (e.g. ">₹7,500 → 18%") in GST strip UI? | **No — do not show slab threshold in UI.** Internal computation only. Slab badge on strip header sufficient. | ✅ 2026-09-08 |

---

## Proposed Fix Scope — UPDATED after OD lock (Gate 2 input)

OD-386-02 Option A confirmed → `PmsCheckoutDrawer` is now IN scope.

```
NEW:  src/utils/roomGstCalculator.js          — pure slab util (nightly unit basis, per pms_gst.md §1)
MOD:  src/api/transforms/profileTransform.js  — parse room_gst JSON string → roomGstSlabs exposed in context
MOD:  src/api/services/pmsService.js          — replace '0.00' with computed gst_tax; fix balance_payment
MOD:  src/pages/pms/CheckInPage.jsx           — compute + display GST breakdown; pass gst_tax to pmsCheckIn
MOD:  src/components/pms/PmsCheckoutDrawer    — read gst_tax from room_payment_summary; include in checkout payload (OD-386-02 A)
```

---

## Next Steps

Gate 2 — Planning agent writes Impact Analysis + Implementation Plan.
All 3 ODs locked. No blockers remain for Gate 2.
Awaiting owner Gate 2 GO.
