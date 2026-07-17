# CR-014 — Menu Management API Migration

**Status:** REGISTERED
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner

---

## 1. Problem Statement (Owner Verbatim)

> Currently in the menu management, to manage the menu, we have wired it to the Product API. But Product API only needs to be used in the product while take ordering and all. There's a different API which is used to manage — like edit the menu and all those things, drag and drop, whatever functionalities we have built. But the API needs to be changed, and it might be an entirely different structure. So keeping the UI same, we have to make a new file and wire an entirely new API.

---

## 2. Summary

| Aspect | Detail |
|---|---|
| **Current state** | Menu management screens (edit item, reorder, categories, drag-and-drop) are wired to the **Product API** |
| **Problem** | Product API is meant for order-taking/product display only, not for menu CRUD operations |
| **Target** | Wire menu management to the correct **Menu Management API** (separate endpoints, potentially different data structure) |
| **UI change** | **None** — keep existing UI exactly as-is |
| **Code change** | New service file + new transform layer to map new API structure to existing UI data shape |

---

## 3. Scope

### In Scope
- Create a **new service file** (e.g., `menuManagementService.js`) for the Menu Management API
- Create a **new transform file** (e.g., `menuManagementTransform.js`) to map between new API structure and existing UI component props
- Wire all menu management screens to the new service (edit item, add item, delete item, reorder/drag-and-drop, category management, availability toggle)
- **Keep Product API** for order-taking flows only (menu display during ordering, cart, search)

### Out of Scope
- UI changes (layout, components, UX flow stay the same)
- Order-taking product display (continues using Product API)

---

## 4. Architecture

```
BEFORE:
  Menu Management UI ──→ Product API (shared with order-taking)
  Order-Taking UI    ──→ Product API

AFTER:
  Menu Management UI ──→ Menu Management API (NEW service file)
  Order-Taking UI    ──→ Product API (unchanged)
```

---

## 5. Open Questions

| # | Question |
|---|---|
| Q-014-1 | What is the base URL / endpoint for the Menu Management API? |
| Q-014-2 | API documentation or Postman collection available? |
| Q-014-3 | What is the response structure? (need sample payload to build transform) |
| Q-014-4 | Authentication — same auth token as Product API, or different? |
| Q-014-5 | Which specific menu management actions need rewiring? (edit, add, delete, reorder, category CRUD, availability toggle — all of them?) |
| Q-014-6 | Is the Menu Management API already deployed on preprod? |

---

## 6. Likely Affected Files

| File | Change |
|---|---|
| **NEW** `menuManagementService.js` | New service — all Menu Management API calls |
| **NEW** `menuManagementTransform.js` | New transform — map API ↔ UI data shapes |
| Existing menu management components | Swap import from product service → menu management service |
| Existing product service | Remove menu management methods (keep only order-taking) |

---

## 7. Dependencies

- Backend: Menu Management API must be deployed and accessible on preprod
- API documentation or sample payloads needed before implementation
- Related: **CR-012** (Menu API migration P1) — may be the same or overlapping scope

---

## 8. Next Steps

1. Owner provides API documentation / endpoints / sample payloads
2. Discovery: map current Product API calls used by menu management
3. Build new service + transform
4. Swap wiring in components
5. Test all menu management flows
6. Verify order-taking flows still work on Product API
