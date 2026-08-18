# BUG-297 — Implementation Plan (Gate 3)

**ID:** BUG-297  
**Title:** Category Created from Web POS — `restaurant_printer_id` NULL  
**Date:** 2026-08-05  
**Role:** PLANNING AGENT (Gate 3)  
**Risk:** MEDIUM  
**Scope lock:** 1 file only — `CategoryList.jsx`

---

## Entry Verification ✅

| Plan says | Actual (verified) |
|---|---|
| L16: `formStation` state, no `formPrinterId` | CONFIRMED — L16 is `formStation` state, no printer state exists |
| L47: `handleAdd()` omits printerId | CONFIRMED — `menuService.addCategory({ name, stationName, catOrder })` |
| L61–65: `handleEdit()` sets only formName + formStation | CONFIRMED |
| L72: `handleSaveEdit()` omits printerId | CONFIRMED |
| `stations` prop available in component | CONFIRMED — `stationOptions` from props |

---

## Owner Decisions Applied

| OD | Decision | Applied as |
|---|---|---|
| OD-2 | Pre-fill printer on Edit? | **YES** — `setFormPrinterId(cat.printerId \|\| stationOptions[0]?.printerId \|\| '')` |
| OD-3 | Default printer on Add? | **First stationOption's printerId** (auto-selected) |

_Both are agent recommendations. Owner to confirm at Gate 4 GO._

---

## Scope Lock

**Files WILL change:** `components/panels/menu/CategoryList.jsx`  
**Files will NOT touch:** `MenuManagementPanel.jsx`, `menuManagementService.js`, `menuManagementTransform.js`, any R5 hotspot

---

## Exact Edits

### Edit 1 — Add `formPrinterId` state (after L16)

**File:** `CategoryList.jsx`  
**Location:** After line 16 (`const [formStation, setFormStation] = useState("KDS");`)

**Current:**
```jsx
const [formStation, setFormStation] = useState("KDS");
```

**New (insert after):**
```jsx
const [formPrinterId, setFormPrinterId] = useState('');
```

---

### Edit 2 — `handleAdd()`: wire printerId + reset on success

**File:** `CategoryList.jsx`  
**Current L47:**
```js
await menuService.addCategory({ name: formName.trim(), stationName: formStation, catOrder: cats.length });
```
```js
setFormStation("KDS");
```

**New:**
```js
await menuService.addCategory({ name: formName.trim(), stationName: formStation, printerId: formPrinterId, catOrder: cats.length });
```
```js
setFormStation("KDS");
setFormPrinterId(stationOptions[0]?.printerId || '');
```

---

### Edit 3 — `handleEdit()`: seed formPrinterId from existing category

**File:** `CategoryList.jsx`  
**Current L61–65:**
```js
const handleEdit = (cat) => {
  setEditingId(cat.categoryId);
  setFormName(cat.categoryName);
  setFormStation(cat.stationName || "KDS");
};
```

**New:**
```js
const handleEdit = (cat) => {
  setEditingId(cat.categoryId);
  setFormName(cat.categoryName);
  setFormStation(cat.stationName || "KDS");
  setFormPrinterId(cat.printerId || stationOptions[0]?.printerId || ''); // BUG-297
};
```

---

### Edit 4 — `handleSaveEdit()`: wire printerId to editCategory

**File:** `CategoryList.jsx`  
**Current L72:**
```js
await menuService.editCategory(editingId, { name: formName.trim(), stationName: formStation, catOrder: cat?.catOrder || 0 });
```

**New:**
```js
await menuService.editCategory(editingId, { name: formName.trim(), stationName: formStation, printerId: formPrinterId, catOrder: cat?.catOrder || 0 }); // BUG-297
```

---

### Edit 5 — Add form JSX: printer dropdown after station select

**File:** `CategoryList.jsx`  
**Location:** After the station `<select>` (data-testid="new-category-station"), before the buttons row  
**Current (after station select):**
```jsx
<div className="flex gap-1 justify-end">
  <button onClick={() => { setAddingCategory(false); setFormName(""); }}...>Cancel</button>
```

**New (insert printer select between station select and buttons):**
```jsx
<select
  value={formPrinterId}
  onChange={(e) => setFormPrinterId(e.target.value)}
  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-white mb-2"
  style={{ borderColor: COLORS.borderGray }}
  data-testid="new-category-printer"
>
  {stationOptions.map((s) => (
    <option key={s.id || s.name} value={s.printerId || ''}>{s.name} (Printer)</option>
  ))}
</select>
<div className="flex gap-1 justify-end">
  <button onClick={() => { setAddingCategory(false); setFormName(""); }}...>Cancel</button>
```

---

### Edit 6 — Edit form JSX: printer dropdown after station select

**File:** `CategoryList.jsx`  
**Location:** Inside the `isEditing` block (around L145–167), after the station `<select>` and before the Save/Cancel buttons  
**Pattern:** Same as Edit 5 but for the edit form

```jsx
<select
  value={formPrinterId}
  onChange={(e) => setFormPrinterId(e.target.value)}
  className="w-full px-2 py-1.5 text-xs rounded border outline-none bg-white mb-1"
  style={{ borderColor: COLORS.borderGray }}
  data-testid="edit-category-printer"
>
  {stationOptions.map((s) => (
    <option key={s.id || s.name} value={s.printerId || ''}>{s.name} (Printer)</option>
  ))}
</select>
```

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | CategoryList.jsx | formPrinterId state added | Code grep for `formPrinterId` | YES |
| 2 | CategoryList.jsx | printerId in addCategory call | Network tab: POST add-categories → `restaurant_printer_id` has value | NO |
| 3 | CategoryList.jsx | Edit pre-fills printer | Click Edit on existing category → printer dropdown shows correct value | NO |
| 4 | CategoryList.jsx | printerId in editCategory call | Network tab: POST update-categories → `restaurant_printer_id` has value | NO |
| 5 | CategoryList.jsx | Printer dropdown in Add form | Open Add Category → printer dropdown visible after station | NO |
| 6 | CategoryList.jsx | Printer dropdown in Edit form | Click Edit on category → printer dropdown visible | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-297 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: BUG-297 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CategoryList.jsx → BUG-297 + 2026-08-05
- [ ] Code marker: // BUG-297 comment on Edits 3, 4
- [ ] Compile: webpack 0 new warnings
```

---

## Awaiting Gate 4 GO

> OD-2 and OD-3 applied as agent recommendations. Confirm at Gate 4.
