# QA Handover — CR-122 — Rename 'Smart Purchase' → 'Stock Update' + Vendor Summary to Top

**Document:** QA_HANDOVER_CR122_2026_07_31.md
**Implementation Agent Date:** 2026-07-31
**QA Agent:** Pending

---

## 1. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-122
Status: IMPLEMENTED
Gate: 5a
Sprint: pos_5_0
EXIT GATE checks:
  ✅ registry.json — CR-122 IMPLEMENTED, gate 5a
  ✅ Code markers — // CR-122 in all 4 modified files
  ✅ Compile — webpack compiled with 1 warning (pre-existing, 0 new)
```

---

## 2. Files Changed

| File | Lines | Change |
|------|-------|--------|
| `components/inventory/InventoryTabBar.jsx` | L11 | Tab label: `'Smart Purchase'` → `'Stock Update'` |
| `components/layout/Sidebar.jsx` | L128 | Nav label: `"Smart Purchase"` → `"Stock Update"` |
| `pages/SmartPurchasePage.jsx` | L24, L26 | Heading `Smart Purchase` → `Stock Update`; description updated |
| `components/inventory/SmartPurchasePanel.jsx` | L76, L189, L239, ~L226-234 removed, reorder, L288+ | Error string, notes, loading text, toolbar button removed, GroupedVendorPreview moved above AutoShoppingList, submit button label |

---

## 3. Verification Matrix — Code Checks (QA must confirm)

| Check | Command | Expected |
|-------|---------|---------|
| C1 | `grep -c 'Stock Update' /app/frontend/src/components/inventory/InventoryTabBar.jsx` | 1 |
| C2 | `grep -c "'Smart Purchase'" /app/frontend/src/components/inventory/InventoryTabBar.jsx` | 0 |
| C3 | `grep -c '"Stock Update"' /app/frontend/src/components/layout/Sidebar.jsx` | 1 |
| C4 | `grep -c 'Smart Purchase' /app/frontend/src/pages/SmartPurchasePage.jsx` | 0 (comment only OK) |
| C5 | `grep -c 'Failed to load Stock Update' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` | 1 |
| C6 | `grep -c 'Loading Stock Update' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` | 1 |
| C7 | `grep -c 'Update Stock' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` | ≥1 |
| C8 | `grep -c 'smart-purchase-review-submit\|Review.*Submit' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` | 0 |
| C9 | `grep -n 'GroupedVendorPreview\|AutoShoppingList' /app/frontend/src/components/inventory/SmartPurchasePanel.jsx` \| check order | GroupedVendorPreview line < AutoShoppingList line |

---

## 4. Test Cases

| TC# | Description | Steps | Expected |
|-----|-------------|-------|---------|
| TC-1 | Sidebar nav label | Open app → expand Inventory sidebar section → observe submenu item | Item reads "Stock Update" (not "Smart Purchase") |
| TC-2 | Tab label in Inventory tabbar | Inventory → observe tabs at top | Tab reads "Stock Update" (not "Smart Purchase") |
| TC-3 | Page heading | Click Stock Update tab | Page heading reads "Stock Update" |
| TC-4 | "Review & Submit" toolbar button removed | Navigate to Stock Update page → observe top toolbar | No "Review & Submit" button in toolbar area |
| TC-5 | Vendor Summary at top (above item list) | Navigate to Stock Update → observe page layout | GroupedVendorPreview (vendor summary cards) render above the AutoShoppingList item rows |
| TC-6 | Submit button text correct | Navigate to Stock Update → select any item with vendor+rate → observe floating button | Floating button reads "Update Stock (N vendor/s)" |
| TC-7 | Loading text updated | Navigate to Stock Update → observe loading state | "Loading Stock Update…" (not "Loading Smart Purchase…") |
| TC-8 | URL route unchanged | Click Stock Update in sidebar → check URL | URL is `/inventory-smart-purchase` (route NOT changed) |

---

## 5. Regression Tests

| R# | What | Why |
|----|------|-----|
| R1 | Stock Update page still loads data | Rename is string-only; no logic/API/route change |
| R2 | handleSubmit fires correctly | CR-122 only removed the toolbar duplicate button; main submit logic and bottom button untouched |
| R3 | `data-testid="smart-purchase-panel"` preserved | CR-122 only renamed strings; testid was not changed |
| R4 | CR-123 sticky button still visible | CR-122 and CR-123 both modified SmartPurchasePanel.jsx; verify sticky button still renders correctly |

---

## 6. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| URL | From `REACT_APP_BACKEND_URL` in `/app/frontend/.env` |
| Route | Sidebar → Inventory → Stock Update |
| Notes | TC-4/5/6 require page to render with some item data. If Stock Update API hangs (known QA-env issue), code verification checks C1–C9 are sufficient for gate pass. |
