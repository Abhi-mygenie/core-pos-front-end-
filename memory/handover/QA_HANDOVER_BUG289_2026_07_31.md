# QA Handover — BUG-289 — Restaurant Settings Default Order Status Wrong Labels

**Document:** QA_HANDOVER_BUG289_2026_07_31.md
**Implementation Agent Date:** 2026-07-31
**QA Agent:** Pending

---

## 1. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-289
Status: IMPLEMENTED
Gate: 5a
Sprint: pos_5_0
Fix method: Fast Lane (1 file, 1 line, LOW risk)
EXIT GATE checks:
  ✅ registry.json — BUG-289 IMPLEMENTED, gate 5a
  ✅ Code markers — // BUG-289 at RestaurantSettingsPage.jsx L510
  ✅ Compile — webpack compiled with 1 warning (pre-existing, 0 new)
```

---

## 2. File Changed

| File | Line | Change |
|------|------|--------|
| `pages/RestaurantSettingsPage.jsx` | L510-511 | `options` array corrected + hint text updated |

**Before (wrong labels):**
```jsx
options={[
  { value: 1, label: 'Confirmed' },
  { value: 2, label: 'Ready' },
  { value: 3, label: 'Preparing' },
  { value: 4, label: 'Manger' },   ← typo + wrong concept
  { value: 5, label: 'Completed' } ← wrong concept
]}
hint="Select a status for default"
```

**After (correct labels):**
```jsx
options={[
  { value: 1, label: 'Ready (Send To kitchen)' },
  { value: 2, label: 'Serve (Send to waiter)' },
  { value: 4, label: 'Accept (Send to Kot Manager)' },
  { value: 5, label: 'Bill (Send to Cashier)' }
]}
hint="Order flow configuration"
```

**Key changes:** value 3 (Preparing) removed; "Manger" fixed to "Accept (Send to Kot Manager)"; "Completed" fixed to "Bill (Send to Cashier)"; hint updated.

---

## 3. Verification Matrix — Code Checks (QA must confirm)

| Check | Command | Expected |
|-------|---------|---------|
| C1 | `grep -c 'BUG-289' /app/frontend/src/pages/RestaurantSettingsPage.jsx` | 1 |
| C2 | `grep -c 'Manger' /app/frontend/src/pages/RestaurantSettingsPage.jsx` | 0 |
| C3 | `grep -c 'Send To kitchen\|Send to waiter\|Send to Kot Manager\|Send to Cashier' /app/frontend/src/pages/RestaurantSettingsPage.jsx` | 4 |
| C4 | `grep -c 'value: 3' /app/frontend/src/pages/RestaurantSettingsPage.jsx` | 0 (value 3 removed from this dropdown) |
| C5 | `grep -c 'Order flow configuration' /app/frontend/src/pages/RestaurantSettingsPage.jsx` | 1 |

---

## 4. Test Cases

| TC# | Description | Steps | Expected |
|-----|-------------|-------|---------|
| TC-1 | Dropdown shows correct labels | Settings → Restaurant Setup → Step 4 (Order & Kitchen) → "Default Order Status" dropdown → open it | 4 options: "Ready (Send To kitchen)", "Serve (Send to waiter)", "Accept (Send to Kot Manager)", "Bill (Send to Cashier)" |
| TC-2 | "Manger" typo is gone | Same dropdown | No option labelled "Manger" or "Preparing" or "Completed" or "Confirmed" |
| TC-3 | value=3 (Preparing) is absent | Same dropdown | Only 4 options total (values 1, 2, 4, 5) |
| TC-4 | Hint text updated | Same Settings Step 4 area → observe hint below the dropdown | Hint reads "Order flow configuration" |
| TC-5 | Selection saves | Choose any option → save settings → reload → check saved value | Selected value persists |

---

## 5. Regression Tests

| R# | What | Why |
|----|------|-----|
| R1 | Other settings in Step 4 unchanged | Fix is a single `<SelectInput>` options prop + hint — nothing else on the page touched |
| R2 | Existing saved `defOrdStatus` values still valid | Values 1, 2, 4, 5 still present. If a restaurant had value=3 saved, it will render with no matching label — expected (value 3 was removed intentionally). |

---

## 6. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| URL | From `REACT_APP_BACKEND_URL` in `/app/frontend/.env` |
| Route | Settings → Restaurant Setup → Step 4 → Default Order Status |
| Notes | This is a pure UI label fix. Code checks C1–C5 are conclusive. TC-1 is the primary browser verification. |
