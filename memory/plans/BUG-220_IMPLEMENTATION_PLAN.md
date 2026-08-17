# BUG-220 — Category Pre-Call Duplicate Guard — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session D)
**Impact Analysis:** `/app/memory/impact/BUG-220_IMPACT_ANALYSIS.md` (OWNER APPROVED — risk LOW, downgrade owner-approved)
**Risk:** LOW | **Entry verification:** PASS 2026-07-23 — `addCategory` lines 74-84 match

## Dependencies
None blocking. Shares `InventorySetupPanel.jsx` with BUG-218 (deleteIngredient) and BUG-219 (form rows) — **different functions, parallel-safe**; implement in the same session as 218/219 to minimize churn. Backend 409 safety net stays untouched (already surfaced by axios readableMessage).

## Scope Lock
- WILL change: `frontend/src/components/inventory/InventorySetupPanel.jsx` — `addCategory` only
- WILL NOT touch: category sidebar JSX, edit/delete (CR-090 DEFERRED), `inventoryService.storeCategory`, axios

## Edit (exact)

### Edit 1 — pre-call duplicate guard
File: `InventorySetupPanel.jsx` lines 74-76.
Current:
```js
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
```
New:
```js
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    // BUG-220: pre-call duplicate check (backend 409 remains as safety net)
    const dupName = newCatName.trim().toLowerCase();
    if (categories.some(c => (c.name || '').trim().toLowerCase() === dupName)) {
      toast.error(`Category "${newCatName.trim()}" already exists`);
      return;
    }
    try {
```

Total: 1 file, 1 edit, ~6 lines. Case-insensitive + trimmed — mirrors curl-verified backend semantics (409 on case/space variants).

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| 1 | InventorySetupPanel.jsx:76 | dup guard | Browser: type existing category name (try case variant + trailing space) → instant toast, Network tab shows NO POST | NO |
| R1 | — | Regression: new name | Genuinely new name → 201, appears in sidebar (delete after via `DELETE /stock-item-categories/delete/{id}` if test-named) | NO |
| R2 | — | Regression: backend net | Direct-API duplicate (curl) → 409 message still surfaces in UI path (unchanged code) | NO |

## Risk Register
- Read-only check against loaded `categories` state — no API/state-shape change. If two operators add simultaneously, backend 409 still catches it (verified).

## Post-Code Registry Checklist
- [ ] registry.json: BUG-220 → IMPLEMENTED, sprint_key pos_5_0
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: InventorySetupPanel.jsx + BUG-220 + date
- [ ] Code marker `// BUG-220`
- [ ] Compile: webpack 0 new warnings

*Gate 3 complete. Awaiting Gate 4 GO.*
