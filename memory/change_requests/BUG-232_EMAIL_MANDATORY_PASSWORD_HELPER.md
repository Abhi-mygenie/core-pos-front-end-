# BUG-232 — Employee: Email Mandatory + Password Helper Text

**ID:** BUG-232
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** LOW
**Module:** Employee Management (EmployeeListView.jsx)
**Duplicate Check:** RELATED to BUG-229 (email = user ID, mandatory). RELATED to BUG-198 (which made email omit-if-empty — now reversed).
**Code Reality:** PARTIAL — password validation EXISTS (L98: `toast.error('Password is required')`), email validation MISSING, password placeholder has hint text but owner says unclear.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

### Sub-A: Email mandatory validation
Add email required validation in `saveAll()` alongside firstName, phone, password, roleId. Email is the user ID — cannot be empty.

Current validation block (L93-98):
```javascript
if (!row.firstName.trim()) { toast.error('First name is required'); return; }
if (!row.phone.trim()) { toast.error('Phone is required'); return; }
if (!row.password.trim()) { toast.error('Password is required'); return; }
if (!row.roleId) { toast.error('Role is required'); return; }
// ← email validation MISSING
```

### Sub-B: Password helper text
Current placeholder: `"Min 8: Aa + symbol (e.g. Test@123)"` (L237)
Owner says instructions unclear. Improve to a visible helper label below the input, not just a placeholder.

---

## Evidence

- Code: `EmployeeListView.jsx:93-98` — no email validation
- Code: `EmployeeListView.jsx:237` — password placeholder exists but disappears on typing
- Password rules: backend likely requires min 8 chars + uppercase + lowercase + symbol

---

## Blast Radius

- 1 file: `EmployeeListView.jsx` (~8 lines: +email validation, +password helper `<p>` tag)
- Scope: SMALL

## Open Questions — NONE

---

## Next
Planning Gate 2 → Gate 3 → Implementation
