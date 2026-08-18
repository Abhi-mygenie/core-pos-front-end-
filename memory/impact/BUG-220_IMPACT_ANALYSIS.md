# BUG-220 — Ingredient Category: No Duplicate Alert — IMPACT ANALYSIS (Gate 2)

**Date:** 2026-07-23 (Session C — Batch 8)
**Role:** PLANNING (Gate 2 only)
**Intake:** `/app/memory/change_requests/BUG-220_INGREDIENT_CATEGORY_NO_DUPLICATE_ALERT_INTAKE.md`
**Severity:** P2 | **Risk:** MEDIUM → **LOW proposed (needs owner approval to downgrade)** — backend already enforces duplicates robustly; remaining fix is a pre-call UX check only

| Header | Result |
|---|---|
| Code Reality | **PARTIAL — intake claim outdated.** Backend rejects duplicates (409) and the FE toast ALREADY shows "Category name already exists." via `axios.js` readableMessage chain (`error.response.data.message`, line 86). The gap is only: an avoidable API round-trip + reliance on backend wording. |
| Conflict Pre-Check | `InventorySetupPanel.jsx` shared with BUG-218 (approved — deleteIngredient :86-95) and BUG-219 (form rows/labels) — **different functions, parallel-safe**. Recommend implementing 218/219/220 in one session to avoid churn. Edit/Delete controls remain scoped to CR-090 (DEFERRED). |

---

## 1. Curl Verification (2026-07-23) — evidence `/app/memory/evidence/BUG-220/`

Endpoint: `POST /api/v2/vendoremployee/inventory/stock-item-categories/store` `{category_name, type:'inventory'}`

| Probe | Result |
|---|---|
| New name `ZZ_TEST_BUG220` | **HTTP 201** `{success:true, data:{id:1719,...}}` |
| Exact duplicate | **HTTP 409** `{"success":false,"message":"Category name already exists."}` |
| Case variant `zz_test_bug220` | **HTTP 409** — dup check is case-INsensitive |
| Trailing space variant | **HTTP 409** — trimmed (Laravel TrimStrings) |
| Cleanup | `DELETE /stock-item-categories/delete/1719` → **HTTP 200** deleted ✅ |

**No 2xx-with-errors trap here** (unlike expense module BUG-164/165) — clean 409 + message. NOT the expected trap; simpler than feared.

## 2. Data Flow Trace
```
addCategory (InventorySetupPanel.jsx:74-84) → storeCategory → 409
→ axios.js:86 readableMessage = 'Category name already exists.' → toast.error shows it ALREADY
GAP: no pre-call check → duplicate attempt still costs a round-trip; message wording owned by backend
```

## 3. Affected Files (proposed scope — final at Gate 3)

| File | Lines | Change |
|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | 74-77 | Pre-call guard in `addCategory`: `categories.some(c => c.name.trim().toLowerCase() === newCatName.trim().toLowerCase())` → `toast.error('Category "<name>" already exists')`, no API call |

1 file, ~5 lines. Not a hotspot. Keep 409 handling as backend safety net (already works).

## 4. CR-090 Intel (bonus finding, no action under BUG-220)
- Category **delete endpoint EXISTS**: `DELETE /inventory/stock-item-categories/delete/{id}` → 200 (curl-proven). CR-090 (Edit & Delete UI) can wire it directly; rename endpoint still unverified.

## 5. Owner Decisions Needed
1. Approve risk downgrade MEDIUM → LOW (rationale: backend enforcement verified robust; FE change is cosmetic pre-check). Requires owner rationale per R21.
2. FE pre-check message wording: mirror backend ("Category name already exists.") or friendlier ("Category \"Dairy\" already exists")?

## 6. Verification Seed (Gate 3 matrix)
- Add category with existing name (any case/spacing) → instant toast, Network tab shows NO API call.
- Add genuinely new name → 201, appears in sidebar.
- Direct-API duplicate (bypass FE) → 409 message still surfaces (regression of existing behavior).

---
*Gate 2 complete. **OWNER APPROVED 2026-07-23** — pre-call check + risk downgrade MEDIUM→LOW approved (rationale: backend enforcement curl-verified robust). → Gate 3.*
