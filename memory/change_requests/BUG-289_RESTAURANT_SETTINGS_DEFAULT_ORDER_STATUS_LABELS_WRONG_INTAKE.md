# BUG-289 — Restaurant Settings: Default Order Status Dropdown Labels Wrong

**Intake Date:** 2026-07-31  
**Type:** BUG  
**Source:** OWNER-REPORTED  
**Sprint:** pos_5_0  

---

## 1. Symptom

In Restaurant Setup Configuration (Step 4 — Order & Kitchen), the **"Default Order Status"** dropdown shows generic numeric labels (`1 — Placed`, `2 — Confirmed`, `3 — Preparing`, `4 — Ready`, `5 — Served`). These labels do not reflect the actual workflow action buttons used in POS. The owner-requested labels describe what each status means operationally.

## 2. Expected vs Actual

| Value | Current Label (WRONG) | Expected Label (CORRECT) |
|-------|----------------------|--------------------------|
| 1 | `1 — Placed` | `Ready (Send To kitchen)` |
| 2 | `2 — Confirmed` | `Serve (Send to waiter)` |
| 3 | `3 — Preparing` | ~~REMOVE entirely~~ |
| 4 | `4 — Ready` | `Accept (Send to Kot Manager)` |
| 5 | `5 — Served` | `Bill (Send to Cashier)` |

**Note:** Option with value `3` (Preparing) must be removed completely.

## 3. Classification

- **Type:** Bug (wrong/misleading labels cause misconfiguration)  
- **Area:** Settings → Restaurant Setup → Step 4 (Order & Kitchen)  
- **Priority:** P2 — Misleading labels; works but operators may misconfigure  
- **Severity:** P2 — Wrong label, no crash, but causes UX confusion  
- **Risk:** LOW — Static UI text change in a single options array; no API, no transform, no financial logic  
- **Fast Lane eligible:** YES (LOW risk, 1 file, ~1 line, not a hotspot) — requires owner approval

## 4. Duplicate Check

- `DISTINCT` — No prior bug or CR covering Default Order Status option labels  
- Related: **CR-019** (Restaurant Settings Wizard — shipped; `RestaurantSettingsPage.jsx` last modified here)  
- Related: **CR-020** (Restaurant Settings Bug Sweep — did not cover label text)

## 5. Evidence

- **Screenshot:** Not provided  
- **Steps to reproduce:**  
  1. Login → Sidebar → Restaurant Settings  
  2. Navigate to Step 4 "Order & Kitchen"  
  3. Observe "Default Order Status" dropdown — labels show `1 — Placed`, `2 — Confirmed`, etc.  
- **Code location confirmed:** `RestaurantSettingsPage.jsx:510`  
- **Source:** OWNER-REPORTED  
- **Confidence:** CONFIRMED (code verified)

## 6. Exact Code Location

**File:** `/app/frontend/src/pages/RestaurantSettingsPage.jsx`  
**Line:** 510  
**Current:**
```js
options={[
  { value: 1, label: '1 — Placed' },
  { value: 2, label: '2 — Confirmed' },
  { value: 3, label: '3 — Preparing' },
  { value: 4, label: '4 — Ready' },
  { value: 5, label: '5 — Served' }
]}
```

**Expected:**
```js
options={[
  { value: 1, label: 'Ready (Send To kitchen)' },
  { value: 2, label: 'Serve (Send to waiter)' },
  { value: 4, label: 'Accept (Send to Kot Manager)' },
  { value: 5, label: 'Bill (Send to Cashier)' },
]}
```

## 7. Blast Radius

- **Files directly in scope:** 1 file only  
  - `RestaurantSettingsPage.jsx:510` — options array  
- **Files NOT touching:** `restaurantSettingsTransform.js`, `restaurantSettingsService.js`, `App.js` (no API/data change — labels only)  
- **Hotspot files:** NO  
- **Estimated scope:** SMALL (1 file, ~1 line / 7-line options array)

## 8. Open Questions

- OQ-1: Should the `hint` text `"New orders start at this status"` also be updated to reflect the new labels? (e.g., "Select the workflow stage where new orders begin")  
- OQ-2: The default value is `2` (Confirmed / "Serve"). Should that remain as default? No API change implied if yes.

## 9. Owner Decisions Needed

- OD-1: ✅ RESOLVED — spelling is `"Manager"` (not "Manger")  
- OD-2: ✅ RESOLVED — hint text changes to `"Order flow configuration"`

---

*Next: Fast Lane eligible — awaiting owner Gate 4 GO for direct implementation*
