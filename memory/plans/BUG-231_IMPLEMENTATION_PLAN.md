# BUG-231 — Implementation Plan: Hide role_type + Fix Error Toasts/Validation

**ID:** BUG-231
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-22
**Risk:** LOW
**Code Reality:** PARTIAL (Sub-A: UI exists needs removal. Sub-B: toast exists but validation insufficient.)
**Impact Analysis:** `/app/memory/impact/BUG-231_IMPACT_ANALYSIS.md`

---

## Execution Sequence

### Sub-A: Hide role_type UI

#### Edit 1: Remove role_type dropdown UI
**File:** `components/panels/employee/RoleFormView.jsx`
**Lines:** 143-153
**Current:**
```jsx
<div>
  <Label className="text-xs text-slate-500">Role Type</Label>
  <select className="mt-1 h-9 w-full text-sm border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white"
    value={roleTypes[0] || ''} onChange={e => setRoleTypes(e.target.value ? [e.target.value] : [])}
    disabled={isReadOnly} data-testid="role-type-select">
    <option value="">Select type...</option>
    {catalogRoleTypes.map(rt => (
      <option key={rt.id} value={rt.value}>{rt.name}</option>
    ))}
  </select>
</div>
```
**New:** Remove entire `<div>` block (lines 143-153). Add comment:
```jsx
{/* BUG-231: role_type UI hidden — backend maps via template. State + payload kept for API compatibility. */}
```

#### Edit 2: Adjust grid layout
**File:** `components/panels/employee/RoleFormView.jsx`
**Line:** 137
**Current:** `grid-cols-1 md:grid-cols-3`
**New:** `grid-cols-1 md:grid-cols-2` — 2 remaining fields: Role Name + Template

### Sub-B: Fix Error Toasts / Add Validation

#### Edit 3: Add FE validation for permissions
**File:** `components/panels/employee/RoleFormView.jsx`
**Line:** 93 (inside handleSave, after name validation)
**Current:** Only validates name
**New:** Add after name check:
```javascript
if (checkedPerms.size === 0) { toast.error('Select at least one permission'); return; }
```

#### Edit 4: Add validation state for visual feedback
**File:** `components/panels/employee/RoleFormView.jsx`
**Line:** 21 (state declarations)
**Current:** No validation error state
**New:** Add:
```javascript
const [errors, setErrors] = useState({});
```

#### Edit 5: Refactor handleSave validation with visual indicators
**File:** `components/panels/employee/RoleFormView.jsx`
**Line:** 92-114 (handleSave function)
**Current:**
```javascript
const handleSave = async () => {
  if (!name.trim()) { toast.error('Role name is required'); return; }
  setSaving(true);
  try {
    ...
  } catch (err) {
    toast.error(err?.readableMessage || 'Failed to save role');
  } finally {
    setSaving(false);
  }
};
```
**New:**
```javascript
const handleSave = async () => {
  // BUG-231: Comprehensive validation with visual feedback
  const newErrors = {};
  if (!name.trim()) newErrors.name = 'Role name is required';
  if (checkedPerms.size === 0) newErrors.permissions = 'Select at least one permission';
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    Object.values(newErrors).forEach(msg => toast.error(msg));
    return;
  }
  setErrors({});
  setSaving(true);
  try {
    const data = {
      name: name.trim(),
      modules: [...checkedPerms],
      roleTypes,
      roleMasterId: null,
    };
    if (isEdit) {
      await roleService.updateRole(role.id, { ...data, active: role.active });
      toast.success(`Role "${name}" updated`);
    } else {
      await roleService.addRole(data);
      toast.success(`Role "${name}" created`);
    }
    onBack?.();
  } catch (err) {
    // BUG-231: Surface specific backend validation errors
    const data = err?.response?.data;
    if (data?.errors && typeof data.errors === 'object') {
      Object.entries(data.errors).forEach(([field, messages]) => {
        const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
        toast.error(`${label}: ${Array.isArray(messages) ? messages.join(', ') : messages}`);
      });
    } else {
      toast.error(err?.readableMessage || 'Failed to save role');
    }
  } finally {
    setSaving(false);
  }
};
```

#### Edit 6: Add visual error indicator on role name input
**File:** `components/panels/employee/RoleFormView.jsx`
**Line:** 140-141 (Role Name Input)
**Current:** `<Input value={name} onChange={e => setName(e.target.value)} ...`
**New:** Add error class:
```jsx
<Input value={name} onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({...p, name: null})); }}
  disabled={isReadOnly} placeholder="e.g. Floor Manager"
  className={`mt-1 ${errors.name ? 'border-red-400 ring-1 ring-red-100' : ''}`}
  data-testid="role-name-input" />
{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
```

#### Edit 7: Add visual error indicator on permissions section
**File:** `components/panels/employee/RoleFormView.jsx`
**Line:** 168-184 (Permissions Header area)
**New:** Add after the permission count badge, when error exists:
```jsx
{errors.permissions && <span className="text-xs text-red-500 ml-2">{errors.permissions}</span>}
```

---

## Verification Matrix

| Edit # | Sub | File | Change | How to Verify |
|---|---|---|---|---|
| 1 | A | RoleFormView.jsx | Remove role_type dropdown | Role form no longer shows "Role Type" select |
| 2 | A | RoleFormView.jsx | Grid 3→2 cols | Layout clean with 2 fields |
| 3-5 | B | RoleFormView.jsx | FE validation + backend error parsing | (1) Clear name → Save → toast "Role name required" + red border. (2) No permissions → Save → toast "Select at least one". (3) Duplicate name → backend 422 → field-level error toasts. |
| 6 | B | RoleFormView.jsx | Name input error highlight | Red border appears on empty name, clears on typing |
| 7 | B | RoleFormView.jsx | Permissions error indicator | Red text appears when 0 permissions selected on save |

## Post-Code Registry Checklist

- [ ] registry.json: BUG-231 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: RoleFormView.jsx listed
- [ ] Code markers: // BUG-231 comment in modified file

## Scope Lock

**Files WILL change:** `components/panels/employee/RoleFormView.jsx`
**Files WILL NOT touch:** roleService.js, roleTransform.js, axios.js, permissionCatalog.js, EmployeeListView.jsx

---

## Next
Gate 4 GO → Implementation
