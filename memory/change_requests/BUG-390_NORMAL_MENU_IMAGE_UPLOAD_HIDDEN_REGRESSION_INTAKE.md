# Intake — BUG-390
## Normal Menu: Item Image Upload Hidden (Regression from BUG-375)

**Date:** 2026-09-10
**Registered by:** Intake Agent (ALPHA v0.7)
**Source:** OWNER-REPORTED + AGENT-CONFIRMED-IN-CODE
**Sprint:** pos_6_0 (suggested)

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | BUG |
| **Severity** | P1 — HIGH |
| **Risk** | MEDIUM |
| **Area** | Menu Management > ProductForm.jsx |
| **Caused by** | BUG-375 incorrect fix (2026-09-01) |
| **Fast Lane** | YES ELIGIBLE — 1 file, 3 lines, LOW risk, not financial |

**Severity rationale:** Feature broken with no workaround — new normal menu items cannot have images uploaded. Existing item images cannot be updated. Upload button is entirely absent.

**Risk rationale:** UI-only change. No API contract, no state management, no financial logic. Medium because ProductForm.jsx handles both add and edit flows.

---

## Description

In Menu Management (Normal menu type), the image upload field is completely missing from the Add/Edit Product form. It was present before 2026-09-01. The BUG-375 fix incorrectly wrapped the main food `image` upload inside `{menuType === 'Aggregator' && (...)}` and mislabelled it "Zomato Image". As a result:

1. **Normal menu:** Image upload button is hidden — cannot add or change item photos.
2. **Aggregator menu:** Image upload shows but is labelled "Zomato Image" (confusing but functionally correct for Zomato since both use the same `image` field).
3. **No data loss on edit:** `editFood()` sends `if (image) formData.append('image', image)` — omitting the field keeps the existing backend image. However, image can never be CHANGED.
4. **New items added since 2026-09-01:** All normal menu items created after BUG-375 fix have no image.

---

## Root Cause (confirmed in code)

```jsx
// ProductForm.jsx:336-360 — CURRENT (broken)
{/* BUG-375: Zomato image upload — aggregator food only */}
{menuType === 'Aggregator' && (          // ← WRONG GATE
  <div className="py-1.5">
    <label>Zomato Image</label>          // ← WRONG LABEL (should be "Item Image")
    {form.imagePreview && (...)}
    <label data-testid="image-upload-btn">
      <Upload />
      <input type="file" onChange={...sets form.imageFile...} />
    </label>
  </div>
)}
```

**What the investigation found:**
- `form.imageFile` / `form.imagePreview` maps to `api.image` → `productImage` (the main food image, NOT Zomato-specific)
- `addFood(foodInfo, image)` and `addFoodAggregatorMultipart(foodInfo, imageFile, swiggyImageFile)` BOTH send the same `image` field
- There is no separate `zomato_image` API field — Zomato uses the same `image` as normal
- BUG-375 investigator saw "Zomato Image" label in normal menu, added aggregator gate — but the field was NOT Zomato-specific; only the label was wrong
- Correct fix for BUG-375 should have been a label rename only, not a visibility gate

---

## Evidence

- **Source:** Owner-reported (2026-09-10 session) + Agent code analysis
- **Confidence:** CONFIRMED (agent verified in code, owner reproduced visually)
- **Screenshot:** Not provided (owner-observed on preprod)
- **Code evidence:** `ProductForm.jsx:337` — `{menuType === 'Aggregator' && (` wraps main image upload
- **Transform evidence:** `productTransform.js:58` — `productImage: getProductImageUrl(api.image)` maps `api.image` (NOT a Zomato-only field)
- **Service evidence:** `menuManagementService.js:34` — `addFood` sends `formData.append('image', image)` — same field as aggregator

---

## Duplicate Check

| Check | Result |
|-------|--------|
| BUG-375 | **RELATED** — caused this regression via incorrect fix |
| BUG-327 | **RELATED** — established the Swiggy image pattern that BUG-375 incorrectly mirrored |
| Any other image upload bug | DISTINCT — no other open bug about missing image upload in normal menu |

**Verdict: DISTINCT registration. Related: BUG-375 (caused by), BUG-327 (pattern reference)**

---

## Blast Radius

```bash
# Files affected:
ProductForm.jsx:337,339,360 — 3 lines, 1 file
```

| Metric | Value |
|--------|-------|
| Files to change | 1 (ProductForm.jsx) |
| Lines to change | 3 |
| Hotspot files | NO |
| Financial/billing/GST | NO |
| API/transform change | NO |
| State management change | NO |

**Blast radius: SMALL**

---

## Fix Specification (for Planning / Fast Lane)

| # | Line | Current | Change To |
|---|------|---------|----------|
| F1 | 336 | `{/* BUG-375: Zomato image upload — aggregator food only */}` | `{/* Item image upload — all menu types. BUG-390: was incorrectly gated in BUG-375 fix. */}` |
| F2 | 337 | `{menuType === 'Aggregator' && (` | *(remove — no gate needed)* |
| F3 | 339 | `<label>Zomato Image</label>` | `<label>Item Image</label>` |
| F4 | 360 | `)}` (closing aggregator gate) | *(remove)* |

No API, no service, no transform, no state changes. Self-verifiable: image upload block visible for normal menu.

---

## Owner Decisions

**None required.** Fix is unambiguous — restore original behaviour.

**Related enhancement registered separately:** CR-373 — "Use item image for Swiggy/Zomato" option.

---

## Code Reality

- **BUG-390 fix code:** NONE (not yet written)
- **Root cause code (BUG-375 incorrect gate):** CONFIRMED at `ProductForm.jsx:337`

---

## Fast Lane Assessment

| Condition | Status |
|-----------|--------|
| Owner says FAST LANE APPROVED | Pending |
| 1 file only | ✅ YES |
| ≤10 changed lines | ✅ YES (4 lines) |
| No API/transform/state/socket/env | ✅ YES |
| Not a hotspot file | ✅ YES |
| Not financial/order/print/auth | ✅ YES |
| No FILE_OWNERSHIP conflict | ✅ YES |

**FAST LANE ELIGIBLE — needs owner `FAST LANE APPROVED` to skip full gate flow.**

---

*Intake complete. Registry updated. Next: owner approves Fast Lane or → Gate 2 Planning.*
