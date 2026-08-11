# BUG-202 Backend Validation (2026-07-17)

**Endpoint delivered:** `PUT /api/v2/vendoremployee/expense/expenses/{item_id}`
**Owner shared curl payload:** `{stock_title, category_id}` body form.

---

## Test 1 — Item rename + category move (happy path)
Setup: created item 4596 in category 42 (grocery).
```
PUT /expenses/4596
{"stock_title":"QA_BE_VALIDATE_RENAMED","category_id":148}
→ 200 OK
{"message":"Update successful.","updated_expense":{"id":4596,"stock_title":"QA_BE_VALIDATE_RENAMED","category_id":148,"category_name":"Fish"}}
```
Verified in expenses-list: item genuinely renamed and moved. ✅ PASS

## Test 2 — Unit-price preservation across category move
- Created item + set unit_price=1.80
- Moved category via PUT
- Refetched: unit_price row STILL LINKED to same item_id, amount preserved. ✅ PASS

## Test 3 — Inline `unit_price` on PUT (§3.4 optional check)
```
PUT /expenses/4596 {"stock_title":"...","category_id":42,"unit_price":15.75}
→ 200 OK, response echoes name+cat but NOT unit_price
Verified /stock-unit-prices: NO price for item 4596
```
❌ Backend does NOT honor inline `unit_price` on PUT (or on POST /store_expense).

## Test 4 — Duplicate name in target category
```
PUT twice with same {stock_title, category_id}
→ 200 OK both times, no 409
```
⚠ Backend does NOT enforce duplicate check. **FE must pre-flight check.**

## Test 5 — Non-existent item id
```
PUT /expenses/99999999 {...}
→ HTTP 201 with body {"errors":[{"code":"not_found","message":"Expense item not found."}]}
```
⚠ Wrong status code (should be 404). **FE parses `errors[0].code` from body.**

---

## Summary Table

| Aspect | Spec | Delivered | FE handling |
|---|---|---|---|
| Route | `PUT /expense/stock-items/{id}` | `PUT /expense/expenses/{id}` | Constants: `STOCK_ITEM_UPDATE = '/api/v2/vendoremployee/expense/expenses'` |
| Payload key for name | `title` | `stock_title` | Service wrapper uses `stock_title` |
| Payload key for category | `category_id` | `category_id` | ✅ match |
| Success | 200 with echo | 200 with `updated_expense: {id, stock_title, category_id, category_name}` | Use `updated_expense` in transform |
| Duplicate name | 409 | 200 (no check) | FE pre-flight check within target category |
| Item not found | 404 | HTTP **201** + `errors[0].code=not_found` | Parse body, not status |
| Validation error | 422 | Not tested | Assume similar body pattern |
| Unit price echo | Optional | Not delivered | Keep CR-064 two-call sequence |
| Unit price survives update | Required (implicit) | ✅ Yes | No workaround needed |

---

## Impact on CR-074-B Plan (applied to `/app/memory/plans/CR-074-B_IMPLEMENTATION_PLAN.md`)

1. Feature flag `EXPENSE_INLINE_EDIT_ENABLED` DROPPED — inline edit ships enabled.
2. Bulk `[Move to Category ▼]` RESTORED to Phases 4 + 5 selection banners; `bulk-move-deferred-note` removed.
3. OQ-1 (rename) + OQ-2 (priced-item move) defensive guards REMOVED from Phase 5 BulkEditor rework.
4. `handleDragEnd` in Phase 2 REWRITTEN — single PUT replaces DELETE+POST workaround.
5. FE pre-flight duplicate-name check ADDED to Phases 3 and 5.
6. Malformed 404-as-201 handler ADDED to Phases 3 and 5.
7. **Mockups 03 & 06 restored 2026-07-17** — `[Move to Category ▼]` button back (outline orange with chevron-down, testid `bulk-move-category-btn`), deferred-note removed. Design + plan now fully aligned.
