# BUG-588 — Search dropdown displays DB table IDs in orange — should display table/customer label

**ID:** BUG-588
**Type:** BUG
**Registered:** 2026-10-17
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE
**Priority:** P1
**Risk:** LOW
**Area:** Dashboard — Search Dropdown (Header.jsx)

---

## Description

The search dropdown shows raw DB table IDs (e.g. "4563", "4788", "4789") in orange before the table label. These are meaningless internal keys — users should see the display label (table name "10", "C-10") and for walk-in orders, the customer name instead of "wc-1231933".

Also covers Gap 3: walk-in orders show `wc-{orderId}` in orange. Fix is identical — show `item.label` (= customer name or 'Walk-In') instead.

**Owner directive:** DB IDs should never appear anywhere in the search UI.

---

## Root Cause

`Header.jsx` — Tables exact match section (L503) and partial section (L545):
```jsx
<span style={{ color: COLORS.primaryOrange }}>{item.id}</span>
//                                              ^^^^^^^^ DB tableId e.g. "4563"
```

`item.id` = `String(t.tableId)` = internal DB primary key.
`item.label` = display name = "10", "C-10", "Walk-In", customer name.

**Rooms are already correct:** Header.jsx L702 and L739 for rooms sections use `{item.label || item.id}` — rooms already show the room display number.

**Delivery and Takeaway are fine:** `#{item.id}` = `#{orderId}` which IS a meaningful display value (order number with # prefix).

**Fix scope:** Tables sections only — L503 and L545:
```jsx
// BEFORE:
<span style={{ color: COLORS.primaryOrange }}>{item.id}</span>

// AFTER:
<span style={{ color: COLORS.primaryOrange }}>{item.label}</span>
```

This also resolves Gap 3 (wc-1231933): walk-in `item.label` = customer name → customer name displayed instead of `wc-{orderId}`.

---

## Evidence

- **Source:** OWNER-REPORTED screenshots (2026-10-17) — "4788 101", "4789 102", "wc-1231933" visible in orange
- **Confidence:** CONFIRMED — code verified at Header.jsx L503, L545
- **Steps:** Dashboard → type any table number → dropdown shows DB IDs in orange before labels

---

## Blast Radius

- **File:** `src/components/layout/Header.jsx` — L503 + L545 (2 lines, both `{item.id}` → `{item.label}`)
- **Scope:** SMALL — display only, no logic
- **Hotspot:** NO — Header.jsx is not an R5 hotspot
- **Fast Lane eligible:** YES (1 file, 2 lines, display only, no logic/API/state change)

---

## Duplicate Check

- BUG-584: fixed matching to use label — RELATED (same root theme: DB IDs not for users). DISTINCT — BUG-584 fixed search matching; BUG-588 fixes search display.
- **Result: DISTINCT**
