# BUG-514 — INTAKE DOC

**ID:** BUG-514
**Date:** 2026-10-08
**Status:** GATE_1_INTAKE
**Registered by:** INVESTIGATION → INTAKE agent
**Source:** OWNER-REPORTED (user grp.md API capture) + AGENT-DISCOVERED (code trace)
**Confidence:** CONFIRMED (API capture + code trace)

---

## Title

`user-group-check-in` API receives three wrong fields at check-in time when room discount is applied: `gst_tax=0`, `room_discount` wrong value, and `room_discount_value` wrong value. `CheckInPage.jsx` submit also computes `gstTax` without the near-max BUG-511 correction.

---

## Description

The owner-provided API capture (`user grp.md`) shows what the FE **sent** vs what it **should send** when a room discount is applied at check-in. Three fields are wrong across two service files and two UI flows.

### Sub-issue A — `gst_tax = '0'` hardcoded in `frontDeskService.buildCheckInFormData`

**File:** `src/api/services/frontDeskService.js` L104  
**Flow:** CheckInForm.jsx (front-desk-v2 inline check-in) → `checkIn()` → `buildCheckInFormData()`  

```js
fd.append('gst_tax', '0');   // ← HARDCODED — never sends post-discount GST
```

Comment at L70 explains original intent: "server prices from reservation charge". This was fine before the discount feature, but with room discounts the backend now needs the **post-discount GST** from the FE (the BE additive deploy reads FE `gst_tax` when > 0 + `room_discount > 0`).

`displayGstTotal` is already correctly computed in `CheckInForm.jsx` via the BUG-511 useMemo (uses `computeBase` near-max correction). It is never passed to `buildCheckInFormData`.

**API doc — Sent vs Should Send:**
| Field | Sent | Should Send |
|---|---|---|
| `gst_tax` | `0` | `35` (displayGstTotal — post-discount green box) |

---

### Sub-issue B — `room_discount` and `room_discount_value` sent as `roomDiscountRs` (user-capped value), not `bc − advance`

**Files:** `src/api/services/frontDeskService.js` L109-111 AND `src/api/services/pmsService.js` L293-295  
**Flows:** Both CheckInForm.jsx (via frontDeskService) and CheckInPage.jsx (via pmsService)

```js
// frontDeskService L109:
fd.append('room_discount', String(p.roomDiscount));      // = roomDiscountRs = 5965
fd.append('room_discount_value', String(p.roomDiscountValue ?? p.roomDiscount));  // = 5965

// pmsService L293:
fd.append('room_discount', String(p.roomDiscount));      // same = 5965
fd.append('room_discount_value', String(p.roomDiscountValue ?? p.roomDiscount));  // same = 5965
```

`roomDiscountRs` is capped to `maxFlat = bc − advance − gstOnAdv = 6700 − 700 − 35 = 5965`.

**API doc — Sent vs Should Send:**
| Field | Sent | Should Send |
|---|---|---|
| `room_discount` | `5965` (`roomDiscountRs` = `maxFlat`) | `6000` (= `bc − advance` = `6700 − 700`) |
| `room_discount_value` | `5965` | `6000` |

The doc formula: `room_discount_to_api = bc − advance_payment = maxFlat + gstOnAdvFloor`.

At max discount: `5965 + 35 = 6000`. This is the only case documented.

---

### Sub-issue C — `CheckInPage.jsx handleConfirm` computes `gstTax` without BUG-511 near-max correction

**File:** `src/pages/pms/CheckInPage.jsx` L314  
**Flow:** CheckInPage.jsx → `pmsCheckIn()` (separate from front-desk-v2)

```js
// handleConfirm L314 — SUBMIT path:
const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs); // BUG-496
const { gstTotal: gstTax } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1);
// ← uses raw gstBase = 735 — no near-max correction
```

```js
// DISPLAY path L956-960 — correctly applies BUG-511:
const extraRoom509     = maxFlat - roomDiscountRs;       // BUG-511
const computeBase509   = extraRoom509 < gstOnAdvFloor509 ? gstBase - gstOnAdvFloor509 : gstBase; // BUG-511
// ← computeBase509 = 700 → GST = 35 ✓
```

At max discount: display shows `gstTax = 35` (BUG-511 correct). Submit sends `gstTax = 36.75` (pre-BUG-511 formula). These values diverge at the near-max zone.

---

## Code Reality

**NONE for sub-issue A** — `gst_tax` never wired.  
**PARTIAL for sub-issue B** — `room_discount` IS sent, but with wrong value.  
**PARTIAL for sub-issue C** — `gstTax` IS sent from CheckInPage, but computed without BUG-511 correction.

---

## Duplicate / Related Check

- **RELATED to BUG-511** (computeBase near-max formula) — sub-issue C is the submit-path analogue of BUG-511's display-path fix
- **RELATED to BUG-512/BUG-513** (max discount guard series)
- **DISTINCT** from all prior bugs — no prior bug addressed what fields are sent to the check-in API

---

## Severity & Risk

- **Severity: P0** — financial: wrong GST stored at check-in (gst_tax=335 rack instead of 35 post-discount). Affects checkout balance, tax reporting, settlement
- **Risk: CRITICAL** (R6 — tax/financial, stored to backend, affects billing)
- **Fast Lane: NO** — CRITICAL, multi-file, financial
- **BE deploy status**: additive deploy DONE (owner confirmed). FE side is the remaining blocker.

---

## Evidence

| Type | Detail |
|---|---|
| API capture (owner) | `user grp.md` — multipart form sent + response |
| API doc analysis | Sent: `gst_tax=0, room_discount=5965`. Should send: `gst_tax=35, room_discount=6000` |
| Code trace A | `frontDeskService.js L104`: `fd.append('gst_tax', '0')` hardcoded |
| Code trace B | `frontDeskService.js L109` + `pmsService.js L293`: `room_discount = roomDiscountRs` = `maxFlat` = 5965 |
| Code trace C | `CheckInPage.jsx L314`: `gstBase = orderAmount − roomDiscountRs` (no near-max correction) vs L960: `computeBase509` (BUG-511 applied) |
| Response | Backend stored `gst_tax=335` (rack), should be `35` |

---

## Blast Radius

```bash
grep -rn "buildCheckInFormData\|gst_tax\|room_discount\|handleConfirm" \
  /app/frontend/src/api/services/frontDeskService.js \
  /app/frontend/src/api/services/pmsService.js \
  /app/frontend/src/pages/pms/CheckInPage.jsx \
  --include="*.js" --include="*.jsx"
```

- `frontDeskService.js` — 1 function (`buildCheckInFormData`), ~3 lines
- `pmsService.js` — 1 function (`pmsCheckIn`), ~3 lines
- `CheckInPage.jsx` — 1 function (`handleConfirm`), ~2 lines

**Blast: SMALL** (3 files, ~8 lines, no hotspot files)  
**Hotspot files touched:** NO (neither R5 file list)

---

## Open Questions (Owner Decisions Required)

### OD-514-01 — Sub-issue B partial discount scope
**Question:** The API doc example covers max discount only (`roomDiscountRs = maxFlat`). For partial discounts (`roomDiscountRs < maxFlat`), should `room_discount_to_api` still be `roomDiscountRs` (current, no change), or should the formula `roomDiscountRs + gstOnAdvFloor` always apply?

- **Option a:** Apply adjustment only when `roomDiscountRs = maxFlat` (at max only): `room_discount_to_api = roomDiscountRs + gstOnAdvFloor`. For partial: send as-is.
- **Option b:** Always send `roomDiscountRs + gstOnAdvFloor` regardless of discount level.
- **Option c:** Agent recommended — **Option a** (only at max). At partial discounts, the GST is NOT settled at checkout; only at max does the GST-on-advance separation matter.

### OD-514-02 — Sub-issue B applies to both flows (CheckInForm + CheckInPage)?
**Question:** Should `room_discount` be corrected in **both** `frontDeskService.buildCheckInFormData` AND `pmsService.pmsCheckIn`?

- **Option a:** Yes — both flows hit the same endpoint; both should send consistent values.
- **Option b:** Only fix CheckInForm.jsx path (frontDeskService) for now; CheckInPage separately.

### OD-514-03 — Sub-issue C: apply BUG-511 formula to CheckInPage.jsx handleConfirm gstTax?
**Question:** Should the near-max correction (`computeBase = gstBase − gstOnAdvFloor` when near-max) be applied to the SUBMIT-path `gstTax` in `CheckInPage.jsx handleConfirm`?

- **Option a:** Yes — mirror the display path fix (BUG-511 pattern). At max discount the submit sends 36.75 while display shows 35; this discrepancy should be closed.
- **Option b:** No — `CheckInPage.jsx` is the legacy flow; defer to FU-385-C when both flows are merged.

---

## Correct Fix Direction (preliminary, pending ODs)

### Sub-issue A (clear)
In `CheckInForm.jsx confirm()`, pass `gstTax: displayGstTotal`.  
In `frontDeskService.buildCheckInFormData(p)`, replace:
```js
fd.append('gst_tax', '0');
```
with:
```js
fd.append('gst_tax', String(to2(p.gstTax ?? 0)));
```

### Sub-issue B (pending OD-514-01/02)
If OD-514-01 = Option a and OD-514-02 = Option a:
```js
// Both frontDeskService + pmsService, when roomDiscount > 0:
const roomDiscountToApi = isAtMax ? roomDiscountRs + gstOnAdvFloor : roomDiscountRs;
fd.append('room_discount',       String(roomDiscountToApi));
fd.append('room_discount_value', String(roomDiscountToApi));
```
`isAtMax` = `roomDiscountRs >= maxFlat`.  
But `gstOnAdvFloor` is computed in CheckInForm/CheckInPage — needs to be passed as a new prop to the service functions.

### Sub-issue C (pending OD-514-03)
If OD-514-03 = Option a:
```js
// CheckInPage.jsx handleConfirm: replace gstBase line with computeBase (mirrors display path)
const gstBase     = Math.max(0, Number(form.orderAmount) - roomDiscountRs);
const gstOnAdvFloor_submit = Math.max(0, Number(form.orderAmount) - bookingAdv - maxFlat);
const extraRoom_submit     = maxFlat - roomDiscountRs;
const computeBase_submit   = extraRoom_submit < gstOnAdvFloor_submit ? gstBase - gstOnAdvFloor_submit : gstBase;
const { gstTotal: gstTax } = computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase_submit, formNights, 1);
```

---

## Next

Owner to answer OD-514-01, OD-514-02, OD-514-03 → **Gate 2 GO → PLANNING**

