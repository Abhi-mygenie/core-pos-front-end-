# BUG-743 — Implementation Plan (Gate 3)

**Risk:** LOW · **Files:** 2 · **Scope:** add cancellation-note display + export on both cancellation reports. Read `cancel_item_note` (fallback `notes`), "—" when empty. No backend change.
**Awaiting:** Gate 4 GO.

---

## File 1 — `frontend/src/pages/reports-module/CancellationsMockup.jsx`

### Edit 1 — transform: carry the note (after L282)
Current:
```js
      notes: i.notes || '',
```
New:
```js
      notes: i.notes || '',
      cancelItemNote: i.cancel_item_note || '',   // BUG-743
```

### Edit 2 — render the note in the existing "Reason / Notes" cell (L996–1002)
Current:
```jsx
                                <div className="text-zinc-700 truncate" title={r.reason}>{r.reason || '—'}</div>
                                {r.notes ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5" title={r.notes}>
                                    <MessageSquare className="w-3 h-3 shrink-0" />
                                    <span className="truncate max-w-[160px]">{r.notes}</span>
                                  </span>
                                ) : null}
```
New (prefer `cancelItemNote`, fall back to `notes`):
```jsx
                                <div className="text-zinc-700 truncate" title={r.reason}>{r.reason || '—'}</div>
                                {(r.cancelItemNote || r.notes) ? (  /* BUG-743 */
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-0.5" title={r.cancelItemNote || r.notes}>
                                    <MessageSquare className="w-3 h-3 shrink-0" />
                                    <span className="truncate max-w-[160px]">{r.cancelItemNote || r.notes}</span>
                                  </span>
                                ) : null}
```

### Edit 3 — export: add Note column (after reason col, L418)
Current:
```js
          { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 120 },
```
New:
```js
          { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 120 },
          { key: 'cancelItemNote', label: 'Note', format: 'text', align: 'left', width: 160 },  // BUG-743
```
(Export `rows: cancelledItems` already carry `cancelItemNote` from Edit 1.)

---

## File 2 — `frontend/src/pages/reports-module/CancelDetailMockup.jsx`

### Edit 4 — table header: add Note after Reason (L157)
Current:
```jsx
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
```
New:
```jsx
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Note</th>{/* BUG-743 */}
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
```

### Edit 5 — table cell: add Note after Reason cell (L167)
Current:
```jsx
                          <td className="px-4 py-2.5 align-top text-xs text-zinc-500 max-w-[180px] truncate" title={item.reason}>{item.reason || '—'}</td>
                          <td className="px-3 py-2.5 align-top text-xs text-zinc-500">{item.cancelled_by || '—'}</td>
```
New:
```jsx
                          <td className="px-4 py-2.5 align-top text-xs text-zinc-500 max-w-[180px] truncate" title={item.reason}>{item.reason || '—'}</td>
                          <td className="px-4 py-2.5 align-top text-xs text-zinc-500 max-w-[200px] truncate" title={item.cancel_item_note}>{item.cancel_item_note || '—'}</td>{/* BUG-743 */}
                          <td className="px-3 py-2.5 align-top text-xs text-zinc-500">{item.cancelled_by || '—'}</td>
```

### Edit 6 — export: add Note column after reason (L106)
Current:
```js
        { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 150 }, { key: 'cancelled_by', label: 'By', format: 'text', align: 'left', width: 100 },
```
New:
```js
        { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 150 }, { key: 'cancel_item_note', label: 'Note', format: 'text', align: 'left', width: 180 }, /* BUG-743 */ { key: 'cancelled_by', label: 'By', format: 'text', align: 'left', width: 100 },
```
(Export rows are `{ ...r, punchTime }` so `cancel_item_note` is present.)

### Edit 7 — empty-state colSpan 7 → 8 (L173)
Current: `<tr data-testid="s28-empty-row"><td colSpan={7} ...`
New: `<tr data-testid="s28-empty-row"><td colSpan={8} ...`

### Edit 8 — tfoot: last `colSpan={3}` → `colSpan={4}` (L179)
Table grows from 7 → 8 columns (added Note between Reason and By). The trailing filler cell now spans Reason+Note+By+Timing.
Current: `<td colSpan={3} />`
New: `<td colSpan={4} />`
(The leading `colSpan={3}` over Order+Item+Stage and the Loss cell are unchanged.)

---

## File 3 — `frontend/src/pages/reports-module/OrderNotesMockup.jsx` (added 2026-11-21, scope widened)
- **Edit 9** — analytics (L73): source note from `cancel_item_note`.
  `const withNotes = allItems.map(i => ({ ...i, noteText: (i.cancel_item_note || i.notes || '').trim() })).filter(i => i.noteText);`  // BUG-743
  (Fixes NOTES COVERAGE stuck at 25% — was filtering `i.notes` only.)
- **Edit 10** — export col (L83): key `notes` → `noteText` (label stays "Notes").
- **Edit 11** — render (L130): `{item.notes}` → `{item.noteText}`.
KPIs (Items with Notes / Notes Coverage) auto-recompute from `withNotes`.

## Verification Matrix
| # | File | Change | How to verify | Automated? |
|---|---|---|---|:--:|
| 1 | CancellationsMockup L282 | `cancelItemNote` mapped | note shows in Reason/Notes for poki rows (#000021/#000022) | NO (browser) |
| 2 | CancellationsMockup L997 | render prefers `cancelItemNote` | both scopes show note | NO |
| 3 | CancellationsMockup export | Note column in Excel/PDF | download → Note col present with values | NO |
| 4 | CancelDetail header/cell | Note column renders | `/cancel-detail` shows Note col, "—" when empty | NO |
| 5 | CancelDetail export | Note col in export | download → Note col present | NO |
| 6 | CancelDetail colSpan | table not misaligned (8 cols) | empty filter + TOTAL row align | NO |
| 7 | both | webpack 0 new warnings | compile | YES |

## Post-Code Registry Checklist (Implementation agent runs)
- [ ] registry.json: BUG-743 → status IMPLEMENTED, gate 5A, sprint_key nov_cr_batch
- [ ] BUG_TRACKER.md: row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add both files with `BUG-743` + date
- [ ] Code markers: `// BUG-743` in both files
- [ ] OPEN_GAPS_REGISTER.md: close OG-INV5-002 (resolved by BUG-743)

## Testing (owner standing rule — MANDATORY)
`testing_agent` after fix: create 1 item-level + 1 order-level cancellation each WITH a note; verify the note shows on screen AND in export on BOTH pages, both scopes.
