# BUG-230 — Implementation Plan: Employee Name Change → Email Sync

**ID:** BUG-230
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-22
**Risk:** LOW
**Code Reality:** NONE
**Dependency:** BUG-229 MUST be implemented first
**Impact Analysis:** `/app/memory/impact/BUG-230_IMPACT_ANALYSIS.md`

---

## Execution Sequence

**Note:** Edits 4 and 5 from BUG-229 already include the `_emailManual` flag and the sync-on-firstName-change logic for NEW rows. BUG-230 adds the sync logic for EXISTING employees.

### Edit 1: Modify updateExisting to sync email on firstName change
**File:** `components/panels/employee/EmployeeListView.jsx`
**Line:** 77-83 (updateExisting function)
**Current:**
```javascript
const updateExisting = (id, field, value) => {
  setEditBuffer(prev => ({
    ...prev,
    [id]: { ...(prev[id] || {}), [field]: value },
  }));
  setDirtyIds(prev => new Set(prev).add(id));
};
```
**New:**
```javascript
const updateExisting = (id, field, value) => {
  setEditBuffer(prev => {
    const buf = { ...(prev[id] || {}), [field]: value };
    // BUG-230: sync email when firstName changes (only if email was auto-generated)
    if (field === 'firstName' && !buf._emailManual) {
      const emp = employees.find(e => e.id === id);
      const currentEmail = buf.email ?? emp?.email ?? '';
      const expectedAutoEmail = generateEmail(emp?.firstName || '');
      // Only sync if current email matches the auto-gen pattern (or is empty)
      if (!currentEmail || currentEmail === expectedAutoEmail) {
        buf.email = generateEmail(value);
      } else {
        buf._emailManual = true; // email doesn't match pattern — treat as manual
      }
    }
    // BUG-230: mark email as manually edited
    if (field === 'email') {
      buf._emailManual = true;
    }
    return { ...prev, [id]: buf };
  });
  setDirtyIds(prev => new Set(prev).add(id));
};
```

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | EmployeeListView.jsx | Sync email for existing employees | Edit existing employee firstName → if email matches auto-gen pattern → email updates. If email is custom → no change. |

## Post-Code Registry Checklist

- [ ] registry.json: BUG-230 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: EmployeeListView.jsx listed
- [ ] Code markers: // BUG-230 comment in modified file

## Scope Lock

**Files WILL change:** `components/panels/employee/EmployeeListView.jsx` (same file as BUG-229 — sequential execution)
**Files WILL NOT touch:** same as BUG-229

---

## Next
BUG-229 implemented → then BUG-230 Gate 4 GO → Implementation
