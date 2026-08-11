# BUG-229 — Employee: Auto-Populate Email (User ID) as firstname@restaurantname.com

**ID:** BUG-229
**Type:** CR (feature enhancement)
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Employee Management (EmployeeListView.jsx)
**Duplicate Check:** DISTINCT — no existing item covers auto-email generation. BUG-198 made email "omit-if-empty" (opposite direction — now reversed by owner).
**Code Reality:** NONE — email field starts empty, no auto-generation logic exists
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)
**Related:** BUG-230 (name change → email sync) — bundled here

---

## Description

Email is the **login user ID** for employees. When adding a new employee, the email field should auto-populate as:

```
firstname@restaurantname.com
```

- `firstname` = lowercase, trimmed first name field value
- `restaurantname` = lowercase, spaces removed, from `restaurant.name` (RestaurantContext)
- User CAN edit the auto-generated value before saving
- Email is **MANDATORY** for new employees (reverses BUG-198 "omit-if-empty")

### BUG-230 (bundled): Name Change → Email Sync
- If employee name changes AND email was auto-generated (not manually edited), re-generate email
- If user manually edited the email, name change should NOT overwrite

### Current Code State

- `EmployeeListView.jsx:55` — `email: ''` (empty default for new row)
- `EmployeeListView.jsx:230` — plain `<Input>` for email, no auto-generation
- `restaurant.name` available via `useRestaurant()` (confirmed in `profileTransform.js:109`)
- Email not validated as required in `saveAll()` (only firstName, phone, password, roleId validated at L93-98)

---

## Evidence

- Code: L55 `email: ''`, L230 manual input, L93-98 no email validation
- Restaurant name: `profileTransform.js:109` → `restaurant.name` (e.g. "cafe103")

---

## Blast Radius

- 1 file: `EmployeeListView.jsx` (~20 lines: auto-gen on firstName change, email required validation, `useRestaurant` import)
- Scope: SMALL

## Open Questions — NONE (all answered by owner)

---

## Next
Planning Gate 2 → Gate 3 → Implementation
