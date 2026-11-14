# BUG-420 — Implementation Plan: Walk-In Docs Show Text Labels, Not Clickable Images

**Code Reality:** PARTIAL — CRM docs section EXISTS in CheckInPage (L549–569) but renders text-only labels. Old modal (RoomCheckInModal CR-129) renders image thumbnails correctly.
**Conflict Pre-Check:** CR-380 (IMPLEMENTED) owns CheckInPage GuestDocsSection (upload flow). This plan touches the docs-on-file DISPLAY block (DD-4) which is distinct from CR-380's upload section. No conflict.
**Risk:** MEDIUM — UI change on CRM data display path. No API, state logic, or financial change.
**Fast Lane:** NOT eligible (>10 lines, component rewrite).

---

## Owner Decisions Resolved

| ID | Question | Answer |
|----|----------|--------|
| OD-420-01 | Show as image thumbnails or just a badge? | **Image thumbnails, inline + click to open (same as dashboard check-in old modal)** |
| OD-420-02 | Is re-uploading optional when docs are on file? | **Yes — already implemented (CR-380 upload gate)** |

---

## Impact Analysis

### Root gap
`CheckInPage.jsx` L549–569 renders crmDocs as text-pill badges:
```jsx
// CURRENT — text only, no image
<div className="flex items-center gap-1.5 text-[10px] bg-white border ...">
  <FileText className="w-3 h-3 text-[#329937]" />
  <span className="font-medium capitalize">{doc.doc_type}</span>
</div>
```

`RoomCheckInModal.jsx` L1022–1055 (CR-129) renders image thumbnails with click-to-open:
```jsx
// EXISTING (old modal) — correct pattern
<a href={doc.file_url || doc.url} target="_blank" rel="noopener noreferrer">
  <img src={doc.file_url || doc.url} className="w-full h-full object-cover" />
  <div /* gradient overlay: doc-type label + Verified badge */ />
</a>
```

### Data availability
`crmDocs` is populated by `getDocuments(customerId)` — same service as old modal. Each doc object has: `id`, `doc_type`, `file_url` / `url`, `uploaded_at`. **All fields needed for image tiles are present.** No new API call needed.

### Trigger path (auto-lookup — Q2 confirmed)
`handlePhoneChange` (L231–241) already calls `handleCrmLookup(digits)` on 10-digit entry, which sets `crmDocs`. Auto-load IS already working. The bug is display-only (text vs image).

### Scope
- File: `src/pages/pms/CheckInPage.jsx`
- Lines: L549–569 (inner content of `crmDocs.length > 0` block)
- ~30 lines changed (inner rewrite, outer condition unchanged)
- No new imports required

---

## Implementation Plan

### Edit E1 — Replace text badges with image tiles in CheckInPage CRM docs section

| Field | Value |
|-------|-------|
| File | `src/pages/pms/CheckInPage.jsx` |
| Lines | L549–569 |
| Action | Replace inner content of `{crmDocs.length > 0 && (` block with 3-column image grid matching old modal pattern |

**New render (replaces L550–569 inner content):**
```jsx
{crmDocs.length > 0 && (
  <div className="mt-2 pt-2 border-t border-[#BBF7D0]">
    {/* BUG-420: replaced text badges with clickable image tiles (matches RoomCheckInModal CR-129) */}
    <div className="text-[10px] text-[#888] font-semibold uppercase tracking-wide mb-1.5">
      Documents on File
    </div>
    <div className="grid grid-cols-3 gap-1.5">
      {crmDocs.slice(0, 3).map((doc, i) => (
        <a
          key={doc.id || doc.doc_type || i}
          href={doc.file_url || doc.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block rounded-md overflow-hidden"
          style={{ border: '1px solid #BBF7D0', aspectRatio: '1.58' }}
          data-testid={`ci-crm-doc-thumb-${doc.doc_type}`}
        >
          <img
            src={doc.file_url || doc.url}
            alt={doc.doc_type || 'Document'}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-1"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }}>
            <span className="text-white text-[8px] font-semibold capitalize mb-0.5">
              {(doc.doc_type || 'doc').replace(/_/g, ' ')}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold
              px-1 py-0.5 rounded-full text-white"
              style={{ background: '#22C55E', width: 'fit-content' }}>
              ✓ Verified
            </span>
          </div>
        </a>
      ))}
    </div>
    <div className="text-[10px] mt-1.5" style={{ color: '#059669' }}>
      Docs on file — no need to re-upload unless expired
    </div>
  </div>
)}
```

The `onError` hides broken images gracefully (same pattern as old modal L1037). Gradient overlay + Verified badge matches old modal styling.

---

## Verification Matrix

| # | Check | Method |
|---|-------|--------|
| 1 | Walk-in: type 10-digit phone of returning guest → CRM badge appears | Browser `/pms/check-in` |
| 2 | Green docs section shows image tiles (not text labels) | Visual |
| 3 | Each tile shows doc-type label + Verified badge in overlay | Visual |
| 4 | Clicking a tile opens document image in new tab | Click test |
| 5 | Broken image URL: tile hides img gracefully | DevTools: block image URL |
| 6 | Dashboard check-in (old modal) docs still display correctly | Open RoomCheckInModal |
| 7 | No compile error | webpack 0 warnings |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-420 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `pages/pms/CheckInPage.jsx` + BUG-420
- [ ] Code marker: `// BUG-420` in replaced block
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-420
Stage: Impact Analysis + Implementation Plan
Code reality: PARTIAL (section exists, wrong render — text vs image)
Risk: MEDIUM
Files WILL change: src/pages/pms/CheckInPage.jsx (~30 lines, L549-569 rewrite)
Files WILL NOT touch: RoomCheckInModal.jsx, documentService.js, all others
Owner decisions: OD-420-01 and OD-420-02 resolved
Next: Gate 4 GO / Implementation
```
