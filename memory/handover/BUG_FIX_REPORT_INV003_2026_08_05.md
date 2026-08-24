# Bug Fix Report — INV-003 / BUG-295
**Date:** 2026-08-05
**Role:** BUG FIX agent
**Item:** BUG-295 — Room Check-In: Documents on File not shown on return visit
**Source investigation:** `memory/evidence/INV-003/INV-003_INVESTIGATION_REPORT.md`

---

## Fix Summary

| # | Severity | RCA | Root Cause | Fix | Files | Verified |
|---|---|---|---|---|---|---|
| F1 (RC2) | BLOCKER | CODE_ERROR | `handleSubmit` resolved `customerId` in local var, never called `setCrmCustomerId()` → docs section condition (`crmCustomerId && ...`) always false on manual entry | Added `if (customerId) setCrmCustomerId(customerId)` inside BUG-092 try block | `RoomCheckInModal.jsx` | ✅ |
| F2 (RC1) | BLOCKER | PLAN_GAP | `roomService.checkIn()` sends `front_image_file` to POS backend. `getDocuments()` reads CRM backend. Separate storage — CRM always empty. Phase 2 upload never implemented. | Added `uploadDocument()` to `documentService.js`; called non-blocking after `checkIn()` succeeds | `documentService.js` + `RoomCheckInModal.jsx` | ✅ |

**Root cause pattern: 2 BLOCKER — both required for end-to-end fix. Neither alone is sufficient.**

---

## Fix Detail

### F1 — RC2 (CODE_ERROR): `handleSubmit` missing `setCrmCustomerId`

**File:** `components/modals/RoomCheckInModal.jsx`
**Location:** Inside `handleSubmit` BUG-092 block

```js
// BEFORE:
          if (existing?.registered) {
            customerId = existing.customer_id || existing.id;
          } else {
            ...
            customerId = created?.customer_id || created?.id || null;
          }
        } catch (crmErr) { ... }

// AFTER:
          if (existing?.registered) {
            customerId = existing.customer_id || existing.id;
          } else {
            ...
            customerId = created?.customer_id || created?.id || null;
          }
          // INV-003 RC2: set crmCustomerId so doc viewer triggers on manual entry too
          if (customerId) setCrmCustomerId(customerId);
        } catch (crmErr) { ... }
```

**Effect:** Docs section now triggers whenever `handleSubmit` resolves a CRM customer — regardless of whether user picked from dropdown.

---

### F2 — RC1 (PLAN_GAP): Upload docs to CRM after check-in

**File A:** `api/services/documentService.js` — new `uploadDocument` function

```js
export const uploadDocument = async (customerId, docType, file) => {
  if (!customerId || !file) return null;
  const fd = new FormData();
  fd.append('doc_type', docType || 'other');
  fd.append('file', file);
  const response = await crmApi.post(
    `${API_ENDPOINTS.CUSTOMER_DOCUMENTS}/${customerId}/documents`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data?.data || null;
};
```

Payload confirmed by probe: `doc_type` (string) + `file` (multipart) — both required.

**File B:** `components/modals/RoomCheckInModal.jsx` — call after `roomService.checkIn()` succeeds

```js
// INV-003 RC1: upload docs to CRM after check-in so they appear on next visit
if (customerId && (frontImage || backImage)) {
  const CRM_DOC_TYPE = { 'Aadhar card': 'aadhaar', 'Passport': 'passport',
    'PAN card': 'pan_card', 'License': 'license', 'Voter ID': 'voter_id' };
  const docType = CRM_DOC_TYPE[idType] || 'other';
  if (frontImage) uploadDocument(customerId, docType, frontImage).catch(() => {});
  if (backImage)  uploadDocument(customerId, docType, backImage).catch(() => {});
}
```

**Effect:** On every successful check-in with a CRM customer and uploaded images, docs are sent to CRM. On next visit, `getDocuments()` finds them.

---

## Scope Expansion

None. Both files (`documentService.js`, `RoomCheckInModal.jsx`) were already in CR-129 scope.

---

## Escalated Items

None.

---

## EXIT GATE — ALL 5 PASSED

```
□1 registry.json:    BUG-295 → IMPLEMENTED, gate: 5, sprint_key: pos_5_1  PASS
□2 BUG_TRACKER.md:  BUG-295 row added → IMPLEMENTED                        PASS
□3 FILE_OWNERSHIP.md: INV-003 entries added for both files                  PASS
□4 Code markers:    INV-003 RC1 + RC2 in every modified block               PASS
□5 Compile:         webpack compiled successfully, 0 new warnings            PASS
```

---

## Step 3 — Verify Fix Results

| Test | Expected | Result |
|---|---|---|
| RC2: `setCrmCustomerId` in handleSubmit | Code present at L675-676 | ✅ Verified |
| RC1: `uploadDocument` in documentService | Function at L60 | ✅ Verified |
| RC1: Call after roomService.checkIn | Code at L728-735 | ✅ Verified |
| Import updated | `uploadDocument` in import L12 | ✅ Verified |
| Compile | 0 new warnings | ✅ `Compiled successfully!` |

**Adjacent test V5 (BUG-092 non-blocking preserved):** The `setCrmCustomerId` call is INSIDE the existing try/catch — if CRM lookup fails, `customerId` stays null, `setCrmCustomerId` is not called, and the catch handles it exactly as before. ✅

---

## QA Recommended Next Steps

1. **T1 (Browser):** Open Room Check-In modal → type phone `8956566082` directly (no dropdown pick) → check phone field shows `+91 8956566082` → upload a JPG → click Check-In → next time opening the modal for this customer, green "Documents on File" section appears
2. **T2 (Browser):** Check CRM directly: `GET /pos/customers/a88e326d-2c9e-4a72-8df6-d2ea4305ec73/documents` should now return the uploaded doc
3. **T3:** Verify check-in still succeeds when CRM is down (non-blocking — toast fires, modal closes, upload silently skipped)
