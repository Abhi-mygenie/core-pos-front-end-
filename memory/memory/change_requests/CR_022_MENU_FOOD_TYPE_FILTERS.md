# CR-022: Menu Management — Food Type Filters Not Working
## Intake + Discovery + Impact Analysis
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P1
**Status:** CLOSED — Owner QA passed 2026-06-10
**Owner:** Abhi
**Reporter:** Owner (chat, 2026-06-10)
**Module:** Menu Management

---

## 1. INTAKE

### 1.1 Reporter-stated symptom
Food type filters (Veg, Non-Veg, Egg, Jain) in Menu Management are not working properly. Logic is not bound correctly.

### 1.2 Background
The API uses a **single integer enum** `item_type` for food classification:

| `item_type` | Meaning |
|-------------|---------|
| 0 | Non-Veg |
| 1 | Veg |
| 2 | Egg |
| 3 | Jain |

The frontend transform (`menuManagementTransform.js:55–59`) decomposes this into **three independent booleans**:

```js
isVeg:  api.item_type === 1,   // true only for Veg
hasEgg: api.item_type === 2,   // true only for Egg
isJain: api.item_type === 3,   // true only for Jain
itemType: api.item_type ?? 0,  // raw enum (available but unused by filter)
```

These booleans are **mutually exclusive** (only one can be true for any given item), but the filter logic in `ProductList.jsx` treats them as combinable flags.

---

## 2. DISCOVERY — Code-level evidence

### 2.1 Files in the food-type filter rail

| File | Role | Key lines |
|------|------|-----------|
| `components/panels/menu/ProductList.jsx` | **Filter logic + UI pills** | 18–24 (FOOD_FILTERS), 56–63 (filter function) |
| `api/transforms/menuManagementTransform.js` | **API → Frontend mapping** | 55–59 (item_type → booleans + raw enum) |
| `components/panels/menu/ProductCard.jsx` | **Display dot + Quick Edit reverse-map** | 5–9 (getFoodDot), 31 (foodType derivation) |
| `components/panels/menu/ProductForm.jsx` | **Full Edit reverse-map** | 222 (foodType derivation), 265 (default for new) |
| `components/panels/menu/BulkEditor.jsx` | **Bulk Edit (uses raw itemType correctly)** | 56–61 (ITEM_TYPE_OPTIONS), 81 (buildRow), 144 (toAPI), 713–720 (dropdown) |
| `components/order-entry/OrderEntry.jsx` | **Order Entry item adapter** | 70 (type derivation), 73 (jain flag) |

### 2.2 Bug B1 — Non-Veg filter catches Jain items

**Where:** `ProductList.jsx` lines 56–63

**Current filter logic:**
```js
if (foodFilter === "veg")    return p.isVeg && !p.hasEgg;
if (foodFilter === "nonveg") return !p.isVeg && !p.hasEgg;
if (foodFilter === "egg")    return p.hasEgg;
if (foodFilter === "jain")   return p.isJain;
```

**Truth table (what each filter matches):**

| `item_type` | Type | `isVeg` | `hasEgg` | `isJain` | Matches Veg? | Matches Non-Veg? | Matches Egg? | Matches Jain? |
|-------------|------|---------|----------|----------|--------------|-------------------|--------------|---------------|
| 0 | Non-Veg | false | false | false | ✗ | ✅ | ✗ | ✗ |
| 1 | Veg | true | false | false | ✅ | ✗ | ✗ | ✗ |
| 2 | Egg | false | true | false | ✗ | ✗ | ✅ | ✗ |
| 3 | **Jain** | false | false | true | ✗ | **✅ BUG** | ✗ | ✅ |

**Root cause:** Non-Veg filter uses `!p.isVeg && !p.hasEgg`. Jain items (`item_type=3`) have `isVeg=false` AND `hasEgg=false`, so they pass the Non-Veg filter. Jain items appear in **both** Non-Veg and Jain results.

### 2.3 Redundant guards in Veg filter

The Veg filter uses `p.isVeg && !p.hasEgg`. The `!p.hasEgg` guard is logically redundant because `isVeg` and `hasEgg` are mutually exclusive (a product can only have one `item_type`). Not a bug — just unnecessary complexity that makes the code harder to reason about.

### 2.4 BulkEditor is correct (for reference)

`BulkEditor.jsx` uses the raw `itemType` integer throughout — dropdown options map directly to 0/1/2/3, dirty detection compares integers, toAPI sends `Number(row.itemType)`. No boolean decomposition, no filter bug. This is the **correct pattern**.

### 2.5 Secondary concern — reverse-mapping fragility

Three files reverse-map booleans back to a `foodType` string for edit forms:

| File | Line | Logic |
|------|------|-------|
| `ProductCard.jsx` (QuickEdit) | 31 | `product.hasEgg ? "egg" : product.isJain ? "jain" : product.isVeg ? "veg" : "nonveg"` |
| `ProductForm.jsx` (FullEdit) | 222 | Same as above |
| `ProductCard.jsx` (display dot) | 5–9 | `if (hasEgg) → Egg; if (isJain) → Jain; if (isVeg) → Veg; else → Non-Veg` |

These happen to work correctly because the check order is `hasEgg → isJain → isVeg → default(nonveg)`, and the booleans are mutually exclusive. But they're unnecessarily fragile — if the transform ever leaked a state where two booleans were true, the cascade would silently pick the first match.

---

## 3. IMPACT ANALYSIS

### 3.1 Scope of the bug

| Surface | Affected? | Why |
|---------|-----------|-----|
| **ProductList filter pills** (Card View) | **YES — B1** | Non-Veg filter shows Jain items |
| **ProductCard display dot** | No | Cascade order is correct for mutually exclusive booleans |
| **ProductCard QuickEdit form** | No | Reverse-map cascade is correct |
| **ProductForm FullEdit form** | No | Reverse-map cascade is correct |
| **BulkEditor** (Table View) | No | Uses raw `itemType` integer — no booleans |
| **OrderEntry adaptProduct** | No | Maps to `type` string for cart display; not a filter |
| **toAPI (save/edit)** | No | `form.foodType` string → `item_type` integer; correct |

**Only 1 location is broken:** `ProductList.jsx` lines 56–63.

### 3.2 Fix approach

**Recommended:** Replace boolean-based filter with raw `itemType` enum (already available on every product object since `menuManagementTransform.js:59`):

```js
if (foodFilter === "veg")    return p.itemType === 1;
if (foodFilter === "nonveg") return p.itemType === 0;
if (foodFilter === "egg")    return p.itemType === 2;
if (foodFilter === "jain")   return p.itemType === 3;
```

**Alternative (minimal change):** Add `&& !p.isJain` to the Non-Veg filter:
```js
if (foodFilter === "nonveg") return !p.isVeg && !p.hasEgg && !p.isJain;
```
This is fragile — if a 5th food type is ever added, it'll break again. Enum-based is safer.

### 3.3 Risk assessment

| Aspect | Risk |
|--------|------|
| Fix scope | **ZERO** — 4 lines in 1 file, isolated `useMemo` filter |
| Regression | **ZERO** — no other file reads `foodFilter` state; filter is local to `ProductList` |
| Backend | **ZERO** — no API changes, no payload changes |
| BulkEditor | Unaffected — already uses raw `itemType` |
| Edit forms | Unaffected — `foodType` string derivation is in a separate code path |

### 3.4 Cross-refs

- `menuManagementTransform.js:59` — `itemType` already exposed, just unused by filter
- `BulkEditor.jsx:56–61` — same enum as `ITEM_TYPE_OPTIONS`, proves the integer pattern works
- No related historical bugs in this code path

---

## 4. FILES TO EDIT

| File | Change | Lines |
|------|--------|-------|
| `src/components/panels/menu/ProductList.jsx` | Replace boolean filter with `itemType` enum | 56–63 (4 lines) |

**Total impact:** 4 lines in 1 file. No new files. No dependency changes.

---

## 5. TESTING PLAN (for after implementation)

### Smoke Tests
- [ ] Filter Veg → only `item_type=1` items shown
- [ ] Filter Non-Veg → only `item_type=0` items shown (NO Jain leakage)
- [ ] Filter Egg → only `item_type=2` items shown
- [ ] Filter Jain → only `item_type=3` items shown
- [ ] Filter All → all items shown

### Regression
- [ ] BulkEditor food type dropdown still works (unaffected)
- [ ] QuickEdit food type radio buttons still pre-select correctly
- [ ] FullEdit food type radio buttons still pre-select correctly
- [ ] ProductCard dot color matches food type
- [ ] Add new product with each food type → filter correctly catches it

---

## 6. OWNER DECISION QUEUE

| ID | Decision needed | Recommendation |
|----|-----------------|----------------|
| **OD-022-1** | Fix style: enum-based (`itemType === 0`) vs boolean patch (`!isJain` guard) | **Enum-based (Option A)** — owner confirmed 2026-06-10 |

---

## 7. ARTIFACT TRACKER

| # | Artifact | Status |
|---|----------|--------|
| 1 | Intake | DONE |
| 2 | Discovery | DONE |
| 3 | Impact Analysis | DONE |
| 4 | Owner Decision | DONE — Option A (enum-based) locked 2026-06-10 |
| 5 | Code Implementation | DONE |
| 6 | QA Report | DONE — Owner QA passed 2026-06-10 |
| 7 | Owner Smoke / Signoff | DONE — 2026-06-10 |
