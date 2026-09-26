# Intake — CR-373
## Aggregator Menu: "Use Item Image for Swiggy" Option

**Date:** 2026-09-10
**Registered by:** Intake Agent (ALPHA v0.7)
**Source:** OWNER-STATED REQUIREMENT (2026-09-10 session)
**Sprint:** pos_6_0 (suggested)

---

## Classification

| Field | Value |
|-------|-------|
| **Type** | CR (Change Request / Enhancement) |
| **Severity** | P2 — MEDIUM |
| **Risk** | MEDIUM |
| **Area** | Menu Management > ProductForm.jsx (Aggregator section) |
| **Related** | BUG-390 (must be fixed first), BUG-327 (Swiggy image foundation) |
| **Fast Lane** | NOT ELIGIBLE — adds new state, ~20 lines, new UI flow |

---

## Owner Requirement (verbatim)

> "We should have an option if same image can be used in Swiggy and Zomato. Only when Swiggy/Zomato is there, we should have an option: we can use the image from the normal one, or we can just upload a new image for Swiggy/Zomato."

---

## Description

In Aggregator menu (ProductForm.jsx, Swiggy Image section), add a two-option selector:

**Option A — Use same as Item Image** (default)
- No separate Swiggy image upload shown
- On save: passes `form.imageFile` for both `image` and `swiggy_image` fields
- If item image not yet set, shows "Set Item Image above first"

**Option B — Upload different Swiggy image**
- Shows existing Swiggy image upload UI (current behaviour)
- User uploads a separate file for Swiggy

For Zomato: no action needed — Zomato already uses the main `image` field (same as item image). Label fix ("Zomato Image" → "Item Image") handles the communication via BUG-390.

---

## Current State

| Channel | Image field | Current behaviour |
|---------|------------|-------------------|
| Normal menu | `image` | ❌ Upload hidden (BUG-390 regression) |
| Zomato (aggregator) | `image` | ✅ Shown as "Zomato Image" (wrong label, but functional) |
| Swiggy (aggregator) | `swiggy_image` | ✅ Separate upload shown — but no "use same as item" option |

---

## Desired State (after BUG-390 + CR-373)

```
── Basic Info (all menus) ──────────────────────────────────────
  Item Image    [ thumbnail ]  [ Upload / Change ]  ← BUG-390 fix

── Aggregator section (aggregator only) ────────────────────────
  Swiggy Image
    ( ) Use same as Item Image          ← CR-373 NEW (default)
    ( ) Upload different image
        [ thumbnail ]  [ Upload / Change ]
```

---

## API / Service Impact

**No new API endpoint needed.**

```js
// On save when "Use same":
addFoodAggregatorMultipart(foodInfo, form.imageFile, form.imageFile);
//                                   ↑ image          ↑ swiggy_image (same file)

// On save when "Upload different" (existing behaviour):
addFoodAggregatorMultipart(foodInfo, form.imageFile, form.swiggyImageFile);
```

**Note:** The backend comment says "Files optional: omit = backend keeps existing file." Passing the same file for both is safe — it will create/update both image columns with the same file.

---

## Duplicate Check

| Check | Result |
|-------|--------|
| BUG-327 | RELATED — established Swiggy image foundation |
| BUG-390 | RELATED — regression that must be fixed first (dependency) |
| Any other "use same image" CR | DISTINCT |

**Verdict: DISTINCT. Dependency: BUG-390 must be resolved before or alongside CR-373.**

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files to change | 1 (ProductForm.jsx) |
| New state fields | 1 (`swiggyUseSame: true`) |
| Lines to add/change | ~20 (toggle UI + conditional render) |
| Hotspot files | NO |
| Financial/billing | NO |
| API/service change | NO — same service call, different args |

**Blast radius: SMALL**

---

## Owner Decisions

| OD | Question | Default |
|----|----------|-------|
| OD-373-01 | Should "Use same as item image" be the DEFAULT? Or should it start unchecked? | YES, default to "Use same" (owner can override) |
| OD-373-02 | For existing aggregator items that already have a separate Swiggy image: should the toggle default to "Use different" (preserve existing) or "Use same" (overwrite on next save)? | Preserve existing = default to "Upload different" when `swiggyImagePreview` already exists |

---

## Code Reality

- **CR-373 implementation:** NONE (not yet started)
- **Foundation (BUG-327 Swiggy image state):** ✅ EXISTS — `swiggyImageFile`, `swiggyImagePreview` state already present

---

## Suggested Implementation Sequence

1. Fix BUG-390 first (3-line Fast Lane fix) → image upload restored
2. Then implement CR-373 (new toggle UI, ~20 lines)
3. Both can be shipped together or separately

---

*Intake complete. Registry updated. Next: owner Gate 4 GO (if Fast Lane for BUG-390) or Gate 2 Planning.*
