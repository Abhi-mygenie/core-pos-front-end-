# Investigation Report — INV-003

**Date:** 2026-08-05
**Reported by:** Owner (palmhouse)
**Symptom:** Uploaded ID documents during first check-in, completed checkout. On second visit for same guest, "Documents on File" section does not appear.
**Steps used:** 10 / 10
**Evidence:** `/app/memory/evidence/INV-003/probe_results.json`

---

## 1. Summary

| | |
|---|---|
| **Root cause 1** | Documents uploaded during check-in go to **POS backend**, not CRM. The viewer queries **CRM** only. Two separate storage backends — viewer can never see POS uploads. |
| **Root cause 2** | `crmCustomerId` state is only set when the receptionist **picks from the CRM suggestion dropdown**. If they type name/phone directly, `crmCustomerId` stays `null` and the docs section is hidden regardless of what CRM holds. |
| **Classification** | RC1: DESIGN_GAP (Phase 2 deferred). RC2: CODE_ERROR (missing hook in `handleSubmit`). |
| **Confidence** | HIGH — both confirmed by curl probes + code trace |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Docs uploaded to POS, not CRM — CRM empty | Curl `GET /pos/customers/{id}/documents` | 1 login + 1 probe | **CONFIRMED** | `data.documents = {}` for LOUISE MADAM |
| H2 | `crmCustomerId` stays null if no dropdown pick | Code trace — `setCrmCustomerId` locations | Code grep | **CONFIRMED** | Only called in `selectCrmCustomer` (L493) |
| H3 | CRM doesn't find this customer | Curl CRM search | Search probe | **ELIMINATED** | Customer found: `a88e326d-2c9e-4a72-8df6-d2ea4305ec73` |
| H4 | Normaliser fails | Code + probe | Code read | **ELIMINATED** | Normaliser handles `{}` correctly → returns `[]` |

---

## 3. Data Flow Trace — The Two-Backend Gap (RC1)

```
FIRST CHECK-IN (upload):
  RoomCheckInModal.handleSubmit()
    → roomService.checkIn({ frontImage: <File>, backImage: <File> })
      → import api from '../axios'          ← POS backend
      → POST /api/v1/vendoremployee/pos/user-group-check-in
      → fd.append('front_image_file', file) ← stored in POS DB

SECOND CHECK-IN (viewer):
  crmCustomerId set (IF user picked from dropdown)
    → getDocuments(crmCustomerId)
      → import crmApi from '../crmAxios'    ← CRM backend (crm.mygenie.online)
      → GET /pos/customers/{id}/documents
      → returns: data.documents = {}        ← EMPTY (docs live in POS, not CRM)

BREAK POINT: Two separate storage backends. Upload writes POS.
             Viewer reads CRM. The twain never meet.
```

**Probe confirmation:**
```
curl GET https://crm.mygenie.online/api/pos/customers/a88e326d-2c9e-4a72-8df6-d2ea4305ec73/documents
→ {"success": true, "message": "Documents retrieved", "data": {"documents": {}}}
```
CRM has **zero documents** for this customer. The first check-in's `front_image_file` and `back_image_file` were sent to POS, not CRM.

---

## 4. Code Flow Trace — crmCustomerId Never Set on Manual Entry (RC2)

```
selectCrmCustomer(c)      ← called ONLY when user picks from suggestion dropdown
  setCrmCustomerId(c.id)  ← L493: the ONLY place crmCustomerId is set to non-null

handleSubmit()            ← called on "Check In" button
  let customerId = null   ← L662: LOCAL variable, completely separate
  → lookupCustomer(phone10) → customerId = existing.id  ← sets LOCAL var only
  → roomService.checkIn({ customerId })
  ← crmCustomerId STATE is NEVER updated here

Docs section condition (L972):
  {crmCustomerId && (crmDocsLoading || crmDocuments.length > 0) && (...)}
   ↑ null if user typed manually → section invisible regardless of CRM content
```

**This means:** Even if Phase 2 uploaded docs to CRM, they still wouldn't appear if the receptionist typed the phone without selecting from the dropdown first.

---

## 5. Evidence Artifacts

| Artifact | Path |
|---|---|
| Probe results JSON | `/app/memory/evidence/INV-003/probe_results.json` |
| CRM customer ID | `a88e326d-2c9e-4a72-8df6-d2ea4305ec73` (Louise Madam, 8956566082) |
| CRM doc probe | `documents: {}` — CONFIRMED empty |
| Login endpoint | `POST /api/v1/auth/vendoremployee/login` |
| CRM token source | `crm_token` field in login response |

---

## 6. Recommendations

### RC2 Fix — Set `crmCustomerId` from `handleSubmit` CRM lookup (CODE_ERROR)

**Scope:** ~3 lines in `RoomCheckInModal.jsx` `handleSubmit` BUG-092 block (L661–678)

**Fix:** When `lookupCustomer` finds an existing customer, also set `setCrmCustomerId`:

```js
// In handleSubmit BUG-092 block:
const existing = await lookupCustomer(phone10);
if (existing?.registered) {
  customerId = existing.customer_id || existing.id;
  setCrmCustomerId(customerId); // INV-003 fix: trigger doc fetch even without dropdown pick
} else {
  const created = await createCustomer(...);
  customerId = created?.customer_id || created?.id || null;
  if (customerId) setCrmCustomerId(customerId); // INV-003 fix
}
```

**Risk:** MEDIUM — touches `handleSubmit` in hotspot modal (RoomCheckInModal.jsx). Requires full planning gate.

**Effect:** Docs section will appear automatically any time the customer's phone matches a CRM customer — regardless of whether they picked from the dropdown.

---

### RC1 Fix — Upload docs to CRM after check-in (DESIGN_GAP — Phase 2)

**Scope:** Phase 2 of CR-129 (previously deferred)

**What's needed:**
1. `documentService.uploadDocument(customerId, docType, file)` → `POST /pos/customers/{id}/documents`
2. In `handleSubmit`, after `roomService.checkIn()` succeeds: upload `frontImage` + `backImage` to CRM using the resolved `customerId`
3. Map `idType` → CRM `doc_type` enum (already specced in `impact/CR-129_IMPACT_ANALYSIS.md §4 Phase 2`)

**Risk:** HIGH — adds CRM API call inside `handleSubmit` (hotspot). Non-blocking (same pattern as BUG-092). Requires full planning gate.

---

## 7. Retroactive Candidates

None — all relevant items are already registered.

---

## Summary

```
Root cause: TWO confirmed root causes. Confidence: HIGH. Steps: 10/10.

RC1 — DESIGN_GAP:
  Upload path: POS backend (roomService → fd.append → front_image_file)
  Viewer path: CRM backend (getDocuments → crm.mygenie.online)
  Probe: CRM documents = {} for Louise Madam — confirmed empty
  Fix: Phase 2 of CR-129 — upload to CRM after check-in (full planning gate)

RC2 — CODE_ERROR:
  crmCustomerId only set via selectCrmCustomer (dropdown pick)
  handleSubmit has separate local customerId — never updates state
  Fix: Add setCrmCustomerId in handleSubmit BUG-092 block (~3 lines)
  Risk: MEDIUM (hotspot) — full planning gate required

Planning skip eligible:
  RC2: NO — touches hotspot RoomCheckInModal (R5 list)
  RC1: NO — new API call + new function (Phase 2, already flagged HIGH)

Recommendation: Register both as new items → Planning Gate 2-3
Investigation report: memory/evidence/INV-003/INV-003_INVESTIGATION_REPORT.md
```
