# Gate 2 — Impact Analysis: CR-373
## Aggregator: "Use Item Image for Swiggy" Toggle

**Date:** 2026-09-11  
**Agent Role:** PLANNING (Role 2 — AGENT_PROMPT_ALPHA v0.7)  
**Stage:** Impact Analysis (Gate 2)  
**Sprint:** pos_7_0  
**Batch:** A (item 2 of 3)  
**Dependency:** MUST be implemented AFTER BUG-390 (both touch Swiggy image block, ProductForm.jsx lines 361–387)

---

## Header

| Field | Value |
|-------|-------|
| **Code Reality** | NONE — no toggle logic, no `useItemImageForSwiggy` state, no conditional Swiggy UI exists. Swiggy image block (lines 361–387) shows a plain upload field with no toggle. |
| **Conflict Pre-Check** | `ProductForm.jsx` — same file as BUG-390. Execute AFTER BUG-390. No other open item touches lines 361–387. |
| **Risk Classification** | **LOW-MEDIUM** — adds new state field + modifies save path for Aggregator items. Not financial/tax-adjacent. Downstream: `addFoodAggregatorMultipart` and `editFoodAggregator` receive a different file object when toggle is ON. |

---

## 1. Data Flow Trace

### Current flow (Swiggy image):
```
ProductForm state:
  swiggyImageFile: null | File
  swiggyImagePreview: null | url

Save (Aggregator, line 602):
  menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, form.swiggyImageFile)
  menuService.editFoodAggregator(id, foodInfo, form.imageFile, form.swiggyImageFile)
  → swiggyImageFile sent as separate field
```

### Desired flow (with toggle):
```
New state field: useItemImageForSwiggy: boolean
  Default new items: true
  Default existing items: false IF swiggyImagePreview exists, else true

Save (Aggregator):
  const effectiveSwiggyFile = useItemImageForSwiggy ? form.imageFile : form.swiggyImageFile;
  menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, effectiveSwiggyFile)
  menuService.editFoodAggregator(id, foodInfo, form.imageFile, effectiveSwiggyFile)
```

---

## 2. Files Affected

| File | Change | Lines | Type |
|------|--------|:-----:|------|
| `ProductForm.jsx` | Add `useItemImageForSwiggy` state (~4 lines), add default in new/edit init (~3 lines), toggle UI replaces Swiggy upload block (~15 lines), save handler update (~3 lines) | ~25 | MODIFY |

---

## 3. Edit Spec

| Edit | Location | Change |
|------|----------|--------|
| E1 | After `const [saving, setSaving] = useState(false);` (~line 215) | Add `const [useItemImageForSwiggy, setUseItemImageForSwiggy] = useState(true);` |
| E2 | Edit-item init block (~line 255) | Add `setUseItemImageForSwiggy(!product.swiggyImage);` — false if existing Swiggy image, true if not |
| E3 | New-item init block (~line 286) | Already defaults true (E1 useState default). No extra line needed. Reset on product change handled by useEffect. |
| E4 | Lines 361–387 (Swiggy image block) | Replace upload-only block with: two-option radio selector "Use Item Image" / "Upload different image", conditionally show upload only when `!useItemImageForSwiggy` |
| E5 | Save handler lines 602 + 609 | Add `const swiggyFile = useItemImageForSwiggy ? form.imageFile : form.swiggyImageFile;` then use `swiggyFile` in both service calls |

---

## 4. UI Spec (design frozen — owner to confirm label wording)

```
Swiggy Image section (Aggregator menu form):

  ● Use same as Item Image    ○ Upload different image
                                ← hidden when "Use same" selected

  When "Upload different":
  [Swiggy preview thumbnail]  [Upload / Change button]
```

- Radio style: two pill buttons (matching existing platform sync toggle style)
- Default: "Use same as Item Image" for new items
- Default: "Upload different image" when editing an item that already has a Swiggy image

---

## 5. Downstream Consumers

| Consumer | Impact |
|---------|--------|
| `menuManagementService.addFoodAggregatorMultipart` | Receives `form.imageFile` as swiggyFile param when toggle ON — this is the same file object, not a copy. Backend receives the same image bytes twice. **No API contract change.** |
| `menuManagementService.editFoodAggregator` | Same as above. |
| `menuManagementTransform.toAPI.foodInfo` | No impact — doesn't process raw file objects. |
| BUG-390 fix (item image upload) | Dependency: BUG-390 must be fixed first so `form.imageFile` is populated for Normal AND Aggregator menus. If BUG-390 is not done first, toggle ON passes `null` as swiggyFile for Aggregator items where the user hasn't uploaded an item image. |

---

## 6. Open Question (owner confirmation)

| OQ | Question | Default |
|----|----------|---------|
| OQ-373-01 | Label wording: "Use same as Item Image" or "Use Item Image"? | "Use same as Item Image" |
| OQ-373-02 | When toggle is ON and user has NOT uploaded an Item Image yet: should save be blocked (enforce upload) or allowed (backend gets null for both images)? | Allow (same as current behaviour — image is optional) |

> **Agent decision:** If OQ not answered before Gate 4 GO, default wording will be used and save will be allowed. Owner can override.

---

## 7. Blast Radius

| Metric | Value |
|--------|-------|
| Files to modify | 1 |
| Lines changed | ~25 |
| New files | 0 |
| New state | 1 field (`useItemImageForSwiggy`) |
| API changes | NONE |
| Risk | LOW-MEDIUM |
| Hotspot | NO |
| Financial / Tax | NO |
| Rule R6 | NO |

---

## 8. Verification Matrix

| # | Change | How to Verify | Automated? |
|---|--------|--------------|:---:|
| V1 | Toggle appears in Aggregator form (Add + Edit) | Open Aggregator → Add Item → "Use same as Item Image" / "Upload different" visible | NO |
| V2 | New item: default to "Use same as Item Image" | Open Add Item form → toggle pre-selected on "Use same" | NO |
| V3 | Existing item with Swiggy image: default to "Upload different" | Open Edit for item with Swiggy image → toggle on "Upload different" | NO |
| V4 | Save with "Use same": Swiggy image = Item image on backend | Toggle ON, upload item image, save → verify Swiggy image and item image are the same | NO |
| V5 | Save with "Upload different": Swiggy image = separate upload | Toggle OFF, upload different Swiggy image, save → verify images differ | NO |
| V6 | Toggle shows/hides upload control correctly | Click "Upload different" → upload appears; click "Use same" → upload hidden | NO |
| V7 | Normal menu form unchanged (toggle not shown for Normal) | Open Normal menu Add Item → no Swiggy toggle | NO |

---

## 9. Post-Code Registry Checklist

```
- [ ] registry.json: CR-373 → status: IMPLEMENTED, sprint_key: pos_7_0
- [ ] CR_REGISTRY.md: CR-373 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: ProductForm.jsx → CR-373 E1–E5
- [ ] Code marker: // CR-373 comment on edited lines
```

---

*Gate 2 complete. Code Reality: NONE. Risk: LOW-MEDIUM. 1 file, ~25 lines. Dependency: BUG-390 must be implemented first. Awaiting Gate 4 GO.*
