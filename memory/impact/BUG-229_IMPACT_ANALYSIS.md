# BUG-229 — Impact Analysis: Employee Auto-Populate Email

**ID:** BUG-229
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-22
**Risk:** LOW
**Code Reality:** NONE — no auto-generation logic exists
**Conflict Pre-Check:** EmployeeListView.jsx last touched by BUG-198 (IMPLEMENTED). No active conflicts. Parallel-safe.

---

## 1. Data Flow Trace

```
Add new employee:
  addRow() [L48-62]
    → creates row with email: '' (empty)
    → no auto-generation

User types firstName:
  updateNewRow(tempId, 'firstName', value) [L70-74]
    → updates only firstName field
    → email field unchanged

Save:
  saveAll() [L91-130]
    → validates: firstName, phone, password, roleId [L95-99]
    → does NOT validate email
    → employeeService.addEmployee(row) [L104]
    → employeeTransform.toAPI (sends email if present, omits if empty)

Restaurant name availability:
  profileTransform.restaurant(api) [L106-109]
    → restaurant.name = api.name (e.g. "The Palm House", "Kunafa Mahal")
  useRestaurant() [RestaurantContext.jsx:147]
    → returns { restaurant, ... }
    → restaurant.name is the restaurant's display name
  ⚠ NOT imported in EmployeeListView.jsx — needs adding
```

## 2. Changes Required

### Change 1: Import useRestaurant
```
File: EmployeeListView.jsx (top of file, after existing imports)
Add: import { useRestaurant } from '@/contexts/RestaurantContext';
```

### Change 2: Get restaurant name inside component
```
File: EmployeeListView.jsx (inside component, after existing state declarations)
Add: const { restaurant } = useRestaurant();
```

### Change 3: Auto-generate email on firstName change (new rows)
```
File: EmployeeListView.jsx — modify updateNewRow() [L70-74]
When field === 'firstName':
  → derive email: firstName.trim().toLowerCase() + '@' + restaurant.name.toLowerCase().replace(/\s+/g, '') + '.com'
  → only set email if email is empty OR email matches previous auto-generated pattern (not manually edited)
```

### Change 4: Email required validation in saveAll()
```
File: EmployeeListView.jsx — inside saveAll() validation [L95-99]
Add: if (!row.email.trim()) { toast.error('Email is required for new employees'); return; }
```

### Change 5: Update email placeholder text
```
File: EmployeeListView.jsx [L230-231]
Change placeholder from "Email" to "Auto-generated — edit to override"
```

## 3. Files Affected

| File | Change | Risk |
|---|---|---|
| `components/panels/employee/EmployeeListView.jsx` | +useRestaurant import, +auto-gen on firstName change, +email required validation, +placeholder update | LOW |

**Files WILL NOT touch:** employeeService.js, employeeTransform.js, RoleFormView.jsx, RestaurantContext.jsx, profileTransform.js

## 4. Downstream Consumers

- `employeeTransform.toAPI()`: Already sends email field — no change needed
- `saveAll()` validation: Adding email to required fields — aligns with owner directive (reverses BUG-198 omit-if-empty)
- Search filter (L144-153): Already searches by email — unaffected
- Existing employees: Auto-gen only applies to NEW rows; existing employees keep their current email

## 5. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | Restaurant name contains special chars (e.g. "&", "'") | Strip non-alphanumeric in domain generation |
| R2 | User confusion — auto-populated email looks editable but user doesn't know it will change on name edit | Clear placeholder + visual indicator (BUG-230 handles sync) |
| R3 | Restaurant name not loaded yet when employee form opens | Guard: only auto-gen if `restaurant?.name` truthy |

## 6. Open Questions — NONE

All answered by owner in intake session.

---

## Next

Gate 3 (Implementation Plan) → Gate 4 GO → Implementation
