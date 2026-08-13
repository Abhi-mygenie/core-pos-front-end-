# BUG-198 — CR-069 Employee Management Post-Delivery (4 Issues)

**ID:** BUG-198
**Date:** 2026-07-16
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Classification:** BUG (batch — 4 sub-issues)
**Severity:** P1 (3 core CRUD operations broken)
**Risk:** HIGH (API contract mismatches + missing fields)
**Duplicate Check:** DISTINCT — no prior bugs cover CR-069 post-delivery
**Sprint:** POS 5.0

---

## Summary

CR-069 (Employee Management) passed 23/23 QA tests but **all 4 CRUD operations are broken** at the API level. QA only tested UI rendering, not actual API persistence. Same post-delivery pattern as BUG-197 (CR-072).

---

## Sub-Issues

### A — Employee Update (name/phone/email) fails silently
- **Root Cause:** CONTRACT_MISMATCH — `api.post()` but backend expects `PUT`
- **File:** `api/services/employeeService.js` L19
- **Evidence:** Same Laravel PUT pattern confirmed across recipe update (BUG-197 #5), sub-recipe, addon-recipe — all required PUT
- **Fix:** `api.post()` → `api.put()`

### B — Reset Password fails (3 stacked bugs)
- **Root Cause:**
  1. `api.post()` → should be `api.put()` (same as A)
  2. Sends only `{ password }` — no `f_name`, `phone`, `role_id` (backend validates required fields)
  3. Missing `password_confirmation` — Laravel `confirmed` validation rule
- **File:** `api/services/employeeService.js` L30-34
- **Evidence:** `ResetPasswordDialog.jsx` has `confirmPassword` state (L18) for UI matching but never sends it to API. `handleConfirm()` calls `onConfirm(password)` — single arg only.
- **Fix:** Dedicated reset-password endpoint (curl verify) OR send full employee data + `password` + `password_confirmation`

### C — Eye icon (show/hide password) missing
- **Root Cause:** CODE_GAP — feature never built
- **Files:** `ResetPasswordDialog.jsx` (2 password inputs hardcoded `type="password"`), `EmployeeListView.jsx` (new row password input)
- **Evidence:** Zero references to `showPassword`, `Eye`, `EyeOff` in any employee component. No toggle state, no toggle button.
- **Fix:** Add `showPassword` state + `Eye`/`EyeOff` toggle + dynamic `type` attribute (~20 lines)

### D — Add Employee fails
- **Root Cause:** CONTRACT_MISMATCH — missing required fields in create payload
- **File:** `api/transforms/employeeTransform.js` → `toAPI.createEmployee()`
- **Payload sends:** `f_name, l_name, phone, email, role_id, password, bill_user_view`
- **Missing:** `password_confirmation` (Laravel `confirmed` rule), `status` (backend has status field)
- **Fix:** Add `password_confirmation: fe.password` + `status: 1` to `toAPI.createEmployee()`

---

## Blast Radius

- **Files affected:** 3 (`employeeService.js`, `employeeTransform.js`, `ResetPasswordDialog.jsx`, `EmployeeListView.jsx`)
- **Hotspot files:** NONE
- **Scope:** SMALL (4 files, ~30 lines total)
- **Financial:** NO
- **Downstream:** No other module depends on employee CRUD

## Evidence

- Investigation trace: this session (2026-07-16)
- Code trace: `employeeService.js` L17-34, `employeeTransform.js` L28-49, `ResetPasswordDialog.jsx` L16-34, `EmployeeListView.jsx` L48-61

## Open Questions

- **OQ-1:** Does backend have a dedicated `reset-password` endpoint? (e.g., `/employee/reset-password/{id}`). If yes, use that. If no, send full update payload + password + confirmation.
- **OQ-2:** Does backend require `password_confirmation` on create? (curl verify with fresh token)

## Next

Planning Gate 2 → Impact Analysis + Implementation Plan
