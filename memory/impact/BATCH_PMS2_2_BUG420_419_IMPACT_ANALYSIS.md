# Impact Analysis — BATCH-PMS2-2
## BUG-420 + BUG-419

**Gate:** 2 — Impact Analysis
**Date:** 2026-09-16
**Role:** PLANNING
**Code Reality:** BUG-420 = PARTIAL (CR-129 shipped, gap in image rendering). BUG-419 = FULL code present, wrong position.

---

## Conflict Pre-Check

| File | Other open items | Risk |
|---|---|---|
| `RoomCheckInModal.jsx` | **BUG-422 (BATCH-1)** — impl must complete FIRST | CONFLICT — sequenced |
| `CheckInPage.jsx` | CR-379/CR-380 (GATE_5B_QA_PASS — shipped, closed) | SAFE |

**Execution sequence:**
`BUG-422 (Batch 1) → BUG-423 → BUG-418 → **BUG-420 (this batch)** → BUG-419`

---

## §1 — BUG-420: Returning Guest Docs Not Visible in Old Check-In Modal (CR-129 Gap)

### Code Reality: PARTIAL
CR-129 (GATE_5B_QA_PASS, 2026-08-05) was implemented. Code exists. Gap is in image rendering.

### Data Flow Trace

**Step 1 — How crmCustomerId is set (trigger for doc fetch):**
```
User types name (≥2 chars) or phone (≥3 digits)
→ useEffect (L396-420): searchCustomers() → shows dropdown suggestions
→ User MUST click a suggestion → selectCrmCustomer(c) (L485-503)
→ setCrmCustomerId(c.id)   ← ONLY path that sets crmCustomerId
→ useEffect (L469-480): getDocuments(crmCustomerId)
→ setCrmDocuments([{ doc_type, file_url, id, ... }])
```

**Critical gap A — no auto-lookup on full phone:**
Unlike `CheckInPage.jsx` (new flow, CR-379 L137), the old modal has NO auto-trigger on 10-digit phone entry. `crmCustomerId` is only set when staff explicitly selects from the dropdown. If no suggestion appears (e.g. guest was registered on a different RID), docs never load.

**Step 2 — Rendering (L994-1058):**
```jsx
{crmCustomerId && (crmDocsLoading || crmDocuments.length > 0) && (
  <div>
    {crmDocuments.slice(0, 3).map((doc) => (
      <a href={doc.file_url || doc.url} ...>
        <img
          src={doc.file_url || doc.url}   ← if null/invalid → onError fires
          onError={(e) => { e.currentTarget.style.display = 'none'; }}  ← image silently hidden
        />
        <div ...>  ← overlay with doc_type text + "✓ Verified" badge
          <div>{doc.doc_type}</div>
          <span>✓ Verified</span>
        </div>
      </a>
    ))}
  </div>
)}
```

**Critical gap B — image silent failure:**
If `doc.file_url` is `null`, empty, or a URL inaccessible from the browser (e.g., S3 presigned URL expired, CORS blocked), `onError` fires and hides the `<img>` tag completely. The outer overlay div (doc type + "✓ Verified") remains, making it look like the section rendered but has no image. Staff cannot see the actual document.

**Step 3 — Upload row guard (L1061):**
```jsx
{flags.guestDetails && crmDocuments.length === 0 ? (
  // show upload inputs
) : (
  !flags.guestDetails && ( ... )
)}
```
When docs exist (`crmDocuments.length > 0`), upload fields are HIDDEN. This is correct per OD-420-02 (upload optional when docs on file).

### Two Root Causes

| # | Root Cause | Evidence |
|---|---|---|
| **RC-A** | `crmCustomerId` only set when staff selects from dropdown — no auto-trigger on phone entry | `handlePhoneChange` (L518-527): no CRM lookup call; new CheckInPage has it (CR-379 L137) |
| **RC-B** | `doc.file_url` may be null/expired/CORS-blocked → `onError` hides image silently | `RoomCheckInModal.jsx` L1037: `onError={(e) => { e.currentTarget.style.display = 'none'; }}` |

### Fix Approach

**E1 — Add auto-CRM-lookup on 10-digit phone (RC-A fix):**
In `handlePhoneChange` (L518-527), after setting phone, if digits === 10 and not already selected: trigger `searchCustomers()` and auto-select if exactly 1 match. Mirrors `CheckInPage.jsx` `handleCrmLookup` pattern (CR-379 L137-166).

OR simpler: just trigger `getDocuments` directly on 10-digit phone via a `useEffect` — no dropdown interaction needed if we already have the phone-to-customer ID mapping.

**E2 — Add fallback display when image fails (RC-B fix):**
Replace silent `onError` hide with a fallback UI — e.g. a file icon + doc type label + date + link to open. This way even if the image can't render, the staff can still see the document exists and tap to open it.

Proposed onError:
```jsx
onError={(e) => {
  e.currentTarget.style.display = 'none';
  // show sibling fallback div
  const fb = e.currentTarget.nextSibling;
  if (fb) fb.style.display = 'flex';
}}
```
Add a sibling fallback div (hidden by default) showing doc type icon + "tap to open" link.

### Unknown — Needs Probe Before Gate 3
**Q-420-01: What does `doc.file_url` contain from CRM API?**
- Is it a full URL? A relative path? A presigned S3 URL? Null?
- Must probe `GET /pos/customers/{id}/documents` with a real returning guest's CRM ID to see actual response fields.
- **This is the most important unknown.** If `file_url` is always null → the image will always fail → RC-B is the confirmed root cause, not RC-A.
- Evidence path: `evidence/BUG-420/`

### Owner Decisions Needed
- **OD-420-01** (deferred from intake): Is the "Documents on File" section NOT appearing at all (green badge missing), or does it appear but shows no images? *(Distinguishes RC-A vs RC-B)*
- **OD-420-02** (deferred from intake): For displaying existing docs — is showing doc type + date + a "View" link (opens doc in new tab) sufficient? Or is an inline image thumbnail required?
- **OD-420-03** (NEW from IA): Should the old modal auto-trigger CRM lookup when staff enters a 10-digit phone number (same as new page), or is manual dropdown selection acceptable?

### Risk Classification: HIGH (customer data, CRM, ID documents)
### Scope: SMALL–MEDIUM (1 file, 2–3 edits, pending probe)
### Files WILL change: `RoomCheckInModal.jsx`
### Files WILL NOT touch: `documentService.js`, `GuestDocsSection.jsx`, `CheckInPage.jsx`
### Probe required before Gate 3: YES — Q-420-01

---

## §2 — BUG-419: Corp/B2B Billing Field in Wrong Position (CheckInPage.jsx)

### Code Reality: FULL — code exists, in wrong position

### Data Flow Trace
No data flow issue. Pure JSX layout order.

```
CheckInPage.jsx form layout (right panel, line ~584-880):

  L585-597  — Name + Phone grid              ← Owner wants Corp/B2B HERE
  L599-613  — Room Assignment
  L616-629  — Check-in / Nights / Check-out
  L631-728  — Occupancy & Guest Register (Adults/Children/Extra Adults)
  L731-763  — Corporate/B2B toggle           ← CURRENT POSITION (wrong)
  L766-778  — GuestDocsSection (ID Document)
  L780-789  — Room Amount + Advance Payment
  L791-818  — Advance Payment Method
  L820-865  — GST strip
  L867-880  — Note + Confirm button
```

Corporate/B2B (lines 731–763) is a self-contained JSX block with no dependencies on any state defined below it. State variables (`isCorpBooking`, `firmName`, `firmGst`) are defined at the top of the component (L53-55) — no ordering constraint.

**Move:** cut the entire block (L731–763) and insert it immediately after the Name+Phone grid closes (after L597, before Room Assignment at L599).

### Fix — 1 edit, 1 file

**E1 — `CheckInPage.jsx` L731-763 → move to after L597**

This is a pure JSX block move. No logic change. No state change. No new imports.

**Fast Lane eligible** — owner approval counts as Gate 4 GO:
- 1 file ✅
- ≤10 lines moved (33 lines, slightly over) → standard gate still faster
- No API / state / localStorage / financial logic ✅
- Not a hotspot file ✅

Owner confirmed in intake: "below name" = after Name/Phone, before Room Assignment.

### Owner Decision
- **OD-419-01** (confirm position): Corp/B2B immediately after Name+Phone row, before Room Assignment dropdown — YES?

### Risk Classification: LOW (UI layout, no logic change)
### Scope: SMALL — 1 file, 1 JSX block moved
### Files WILL change: `CheckInPage.jsx` (L731-763 moved to after L597)
### Files WILL NOT touch: `pmsService.js`, any API, any state logic

---

## §3 — Consolidated Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| BUG-420 E1 | `RoomCheckInModal.jsx` | Auto CRM lookup on 10-digit phone | Type full phone of returning guest → docs load without selecting dropdown |
| BUG-420 E2 | `RoomCheckInModal.jsx` | Fallback display when file_url fails | Returning guest with doc: section shows doc type + link even if image CORS-fails |
| BUG-419 E1 | `CheckInPage.jsx` | Corp/B2B moved above Room Assignment | Open check-in form → Corp/B2B appears immediately below Name/Phone, before Room dropdown |

---

## §4 — Post-Code Registry Checklist (for Implementation agent)
```
- [ ] registry.json: BUG-420, BUG-419 → status: IMPLEMENTED, sprint_key: pos_pms_2
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: RoomCheckInModal.jsx (BUG-420), CheckInPage.jsx (BUG-419)
- [ ] Code markers: // BUG-420, // BUG-419 in each modified file
```
