# BUG-231 — Role Form: Hide role_type Field + Add Save Error Toasts

**ID:** BUG-231
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** LOW
**Module:** Employee Management → Roles (RoleFormView.jsx)
**Duplicate Check:** RELATED to BUG-198 (which wired role_type to save payload). BUG-198 is IMPLEMENTED — role_type saves correctly. This bug is about HIDING the UI field entirely + adding missing error toasts.
**Code Reality:** PARTIAL — role_type state + dropdown exist (RoleFormView.jsx:18, :146-150), save payload includes it (L99). Need to REMOVE the UI, keep the payload wiring.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (owner directive: "no role type needed, hide it, backend maps it based on template")

---

## Description

### Sub-A: Hide role_type field
The Role Type dropdown (`RoleFormView.jsx:144-151`) should be **completely hidden**. Backend maps role types automatically based on the selected role template. The field confuses users and "disappears" on edit because catalog data may not match.

**Owner ruling:** "there is no role type needed hide it backend maps it based on template"

### Sub-B: Save error toasts
When role save fails (e.g. duplicate name, missing permissions), no error toast is shown. Need to surface `err.readableMessage` from axios interceptor.

### Current Code

```javascript
// RoleFormView.jsx:18
const [roleTypes, setRoleTypes] = useState(role?.roleTypes || []);
// RoleFormView.jsx:146-150
<select value={roleTypes[0] || ''} onChange={...}>
  <option value="">Select type...</option>
  {catalogRoleTypes.map(rt => (...))}
</select>
```

---

## Evidence

- Code: `RoleFormView.jsx:18` state, `:146-150` dropdown UI, `:99` save payload
- Owner directive: hide entirely, backend handles mapping

---

## Blast Radius

- 1 file: `RoleFormView.jsx` (~15 lines removed/hidden, ~5 lines added for error toast)
- Scope: SMALL

## Open Questions — NONE

---

## Next
Planning Gate 2 → Gate 3 → Implementation
