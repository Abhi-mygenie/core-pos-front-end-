# Gate 2 — Impact Analysis: BUG-390
## Normal Menu Image Upload Hidden (Aggregator Gate Regression)

**Date:** 2026-09-11  
**Agent Role:** PLANNING (Role 2 — AGENT_PROMPT_ALPHA v0.7)  
**Stage:** Impact Analysis (Gate 2)  
**Sprint:** pos_7_0  
**Batch:** A (item 1 of 3)

---

## Header

| Field | Value |
|-------|-------|
| **Code Reality** | PARTIAL — gate `{menuType === 'Aggregator' && (...)}` exists at line 337 (wrapping the main image upload). This IS the bug. The image upload code is present but incorrectly gated. |
| **Conflict Pre-Check** | `ProductForm.jsx` last modified: BUG-375 (2026-09-01) — this IS the root cause commit. No other open item targets this block. CR-373 touches adjacent lines (361-387) — execution order: BUG-390 FIRST, then CR-373. |
| **Risk Classification** | **LOW** — removes a conditional guard. No API change, no state change, no business logic change. The image upload code is already written; we are just un-gating it. |

---

## 1. Root Cause Trace

```
ProductForm.jsx:336–360

Line 336: {/* BUG-375: Zomato image upload — aggregator food only */}
Line 337: {menuType === 'Aggregator' && (         ← ⚠️ WRONG GATE — hides for Normal
Line 338:   <div className="py-1.5">
Line 339:     <label>Zomato Image</label>          ← ⚠️ WRONG LABEL — should be "Item Image"
Line 340-358: [image preview + upload button]
Line 360: )}                                        ← closing of the wrong gate
```

**Normal menu flow today:**
1. User opens ProductForm for Normal menu item
2. `menuType === 'Normal'` → `menuType !== 'Aggregator'` → gate at line 337 is FALSE
3. Image upload block is NOT rendered
4. User saves item — `form.imageFile === null` (never set because upload was hidden)
5. Backend receives no image → product saved with no image

**Expected flow:**
- Image upload block shown for ALL menu types
- Label "Item Image" for Normal menu, "Zomato Image" can remain as secondary context (or just rename to "Item Image" universally)

---

## 2. Files Affected

| File | Change | Lines | Type |
|------|--------|:-----:|------|
| `ProductForm.jsx` | Remove conditional gate at line 337; change closing `)}` at line 360; rename label line 339 | 3 | MODIFY |

---

## 3. Edit Spec

| Edit | Line | Current | New |
|------|:----:|---------|-----|
| E1 | 336 | `{/* BUG-375: Zomato image upload — aggregator food only */}` | `{/* BUG-390: Item image upload — shown for all menu types */}` |
| E2 | 337 | `{menuType === 'Aggregator' && (` | _(remove this line entirely)_ |
| E3 | 339 | `<label ... >Zomato Image</label>` | `<label ... >Item Image</label>` |
| E4 | 360 | `)}` (closing of the Aggregator gate) | _(remove this line entirely)_ |

**Net change: remove 2 lines, modify 2 lines = 4 line touches, 1 file.**

---

## 4. Downstream Consumers

| Consumer | Impact |
|---------|--------|
| Save handler `ProductForm.jsx:604` | `form.imageFile` will now be populated from Normal menu (previously always null). `addFood()` and `editFood()` already accept `imageFile` as 2nd param — **no change needed**. |
| `menuManagementService.addFood` | Existing — accepts `imageFile`, handles null gracefully. No change. |
| `menuManagementService.editFood` | Existing — same. No change. |
| `menuManagementTransform.toAPI.foodInfo` | No impact — transform doesn't process the raw file object. |

---

## 5. Blast Radius

| Metric | Value |
|--------|-------|
| Files to modify | 1 |
| Lines changed | 4 |
| New files | 0 |
| API changes | NONE |
| State changes | NONE |
| Risk | LOW |
| Hotspot | NO |
| Financial / Tax | NO |
| Rule R6 | NO |

---

## 6. Verification Matrix

| # | Change | How to Verify | Automated? |
|---|--------|--------------|:---:|
| V1 | Image upload block shows in Normal menu form (Add + Edit) | Open Normal menu → Add Item → image upload visible | NO (screenshot) |
| V2 | Image upload block still shows in Aggregator menu form | Open Aggregator menu → Add Item → image upload visible | NO (screenshot) |
| V3 | Save Normal item with image → image saved to backend | Upload image → Save → reopen item → image persists | NO (manual) |
| V4 | Save Normal item without image → no regression | Add item without image → Save → no error | NO (manual) |
| V5 | Label shows "Item Image" (not "Zomato Image") | Visual check | NO (screenshot) |

---

## 7. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-390 → status: IMPLEMENTED, sprint_key: pos_7_0
- [ ] BUG_TRACKER.md: BUG-390 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: ProductForm.jsx → BUG-390 E1–E4
- [ ] Code marker: // BUG-390 comment on edited lines
```

---

*Gate 2 complete. Code Reality: PARTIAL. Risk: LOW. 1 file, 4 line touches. Awaiting Gate 4 GO.*
