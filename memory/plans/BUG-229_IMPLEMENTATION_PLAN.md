# BUG-229 — Implementation Plan: Employee Auto-Populate Email

**ID:** BUG-229
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-22
**Risk:** LOW
**Code Reality:** NONE
**Impact Analysis:** `/app/memory/impact/BUG-229_IMPACT_ANALYSIS.md`

---

## Execution Sequence

### Edit 1: Import useRestaurant
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 3 (after existing imports)
**Current:** No RestaurantContext import
**New:** Add `import { useRestaurant } from '@/contexts/RestaurantContext';`

### Edit 2: Get restaurant name inside component
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 13 (inside component, before existing state)
**Current:** Component starts with `const [employees, setEmployees] = useState([]);`
**New:** Add `const { restaurant } = useRestaurant();` before the state declarations

### Edit 3: Add auto-email helper function
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** After state declarations, before fetchData
**New:**
```javascript
// BUG-229: Auto-generate email as firstname@restaurantname.com
const generateEmail = useCallback((firstName) => {
  if (!firstName?.trim() || !restaurant?.name) return '';
  const fname = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rname = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${fname}@${rname}.com`;
}, [restaurant?.name]);
```

### Edit 4: Modify updateNewRow to auto-gen email on firstName change
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 70-74 (updateNewRow function)
**Current:**
```javascript
const updateNewRow = (tempId, field, value) => {
  setNewRows(prev => prev.map(r =>
    r._tempId === tempId ? { ...r, [field]: value } : r
  ));
};
```
**New:**
```javascript
const updateNewRow = (tempId, field, value) => {
  setNewRows(prev => prev.map(r => {
    if (r._tempId !== tempId) return r;
    const updated = { ...r, [field]: value };
    // BUG-229: auto-generate email when firstName changes (only if email not manually edited)
    if (field === 'firstName' && !r._emailManual) {
      updated.email = generateEmail(value);
    }
    // BUG-230: mark email as manually edited when user types in email field
    if (field === 'email') {
      updated._emailManual = true;
    }
    return updated;
  }));
};
```

### Edit 5: Add _emailManual flag to new row default
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 50 (inside addRow, row object)
**Current:** `email: '',`
**New:** `email: '', _emailManual: false,` — add after email line

### Edit 6: Add email required validation in saveAll
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 96-99 (inside saveAll validation block)
**Current:** Validates firstName, phone, password, roleId only
**New:** Add after roleId check:
```javascript
if (!row.email.trim()) { toast.error('Email (User ID) is required for new employees'); setSaving(false); return; }
```

### Edit 7: Update email input placeholder
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 231 (email Input for new rows)
**Current:** `placeholder="Email"`
**New:** `placeholder="Auto-generated email"`

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1-2 | EmployeeListView.jsx | useRestaurant import + destructure | Compile check — no errors |
| 3 | EmployeeListView.jsx | generateEmail helper | Type firstName "john" with restaurant "The Palm House" → expect john@thepalmhouse.com |
| 4 | EmployeeListView.jsx | Auto-gen on firstName change | Add employee → type firstName → email auto-fills |
| 5 | EmployeeListView.jsx | _emailManual flag | Add employee → manually edit email → change firstName → email NOT overwritten |
| 6 | EmployeeListView.jsx | Email validation | Add employee → leave email empty → Save → toast error |
| 7 | EmployeeListView.jsx | Placeholder | Visual check — "Auto-generated email" placeholder text |

## Post-Code Registry Checklist

- [ ] registry.json: BUG-229 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: EmployeeListView.jsx listed
- [ ] Code markers: // BUG-229 comment in modified file

## Scope Lock

**Files WILL change:** `components/panels/employee/EmployeeListView.jsx`
**Files WILL NOT touch:** employeeService.js, employeeTransform.js, RestaurantContext.jsx, profileTransform.js, roleService.js

---

## Next
Gate 4 GO → Implementation
