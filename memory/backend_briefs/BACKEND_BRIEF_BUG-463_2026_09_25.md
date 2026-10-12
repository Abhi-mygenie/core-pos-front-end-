# BACKEND_BRIEF_BUG-463_2026_09_25

**Item:** BUG-463 — Duplicate visually-identical "Promotional Menu" pills in Local Settings Active Menu section
**Sprint:** `sep_bug_closure` · **Registry status:** `INTAKE — BACKEND DATA FIX REQUIRED`
**Source report:** CR-376 Gate 5b QA findings (T9 NOTE), 2026-09-25 · Intake: `memory/change_requests/BUG-463_DUPLICATE_PROMOTIONAL_MENU_PILL_BACKEND_DATA_INTAKE.md`
**Template:** ALPHA v0.7 BACKEND HANDOFF TEMPLATE
**Secrets:** credentials masked as `***` (R20)

---

## Summary

- **Issue:** Restaurant **QA_HYATT** (`owner@hyatt.com`) has **two `food_for` values** in its product data that are near-identical: `"Promational Menu"` (typo — missing second `o`) and `"Promotional Menu"` (correct). The POS frontend derives the Active Menu pill list directly from the distinct `food_for` values returned by the products API. Both values are rendered as separate pills. In the browser they appear **visually identical** ("Promotional Menu" × 2) because the typo is subtle and the UI renders names verbatim.
- **Classification:** `DATA_ISSUE` — incorrect `food_for` value in preprod product records for the QA_HYATT restaurant.
- **Frontend impact:** Cashier sees two indistinguishable "Promotional Menu" pills in Local Settings → Active Menu section. Selecting the typo version (`Promational Menu`) activates a menu with a different product set (likely empty or partially populated). Confusing UX; potential for wrong menu being active.
- **Priority/Risk:** **P3 / LOW** — affects only QA_HYATT in preprod. No revenue impact. No code change needed on frontend.

---

## Endpoint

| Method | URL | Role |
|---|---|---|
| GET | `/api/v1/restaurant/products` (or equivalent product list endpoint) | Returns all products with `food_for` field. Frontend derives distinct menu type list from this field via `productTransform.js:109` (`foodFor: api.food_for \|\| 'Normal'`) and `MenuContext.jsx:111` (`availableMenuTypes = [...new Set(products.map(p => p.foodFor))]`). |

- **Auth/context:** restaurant `QA_HYATT`, bearer token `***`, preprod host `preprod.mygenie.online`.

---

## Reproduction

1. Login to POS as `owner@hyatt.com` / `***` on `preprod.mygenie.online`.
2. Navigate to **Local Settings** → **Status Configuration** → scroll to **Active Menu** section.
3. Observe: **two pills** render with the label **"Promotional Menu"** side by side (positions 8 and 9 of 10).
4. Inspect raw pill button text via browser console:
   ```js
   Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.includes('romo'))
   // Returns: ["Promational Menu", "Promotional Menu"]
   ```
   Raw DOM text confirms one pill is `"Promational Menu"` (typo).

---

## Payload / Response

- **What the frontend receives:** products with `food_for` = `"Promational Menu"` (typo) alongside products with `food_for` = `"Promotional Menu"` (correct).
- **Expected:** A single `food_for` value — `"Promotional Menu"` — across all relevant products for QA_HYATT.
- **Actual:** Two distinct `food_for` values: `"Promational Menu"` + `"Promotional Menu"`.

**Frontend evidence (JS pill extraction, 2026-09-25):**
```
['24hrs Menu', 'Bar & Drinks', 'Breakfast', 'FOOD MENU', 'GROK', 'Kids Menu',
 'PET FOOD', 'Promational Menu', 'Promotional Menu', 'Tea, Coffee & Soft Beverages']
```

---

## Evidence

- **Screenshot:** Active Menu section shows 10 pills; two adjacent pills both display as "Promotional Menu" — taken 2026-09-25 during CR-376 Gate 5b QA on QA_HYATT account.
- **JS output:** Raw button text array (above) confirms `"Promational Menu"` at index 7 and `"Promotional Menu"` at index 8.
- **Code trace:** `productTransform.js:109` — `foodFor: api.food_for || 'Normal'` — no normalisation applied. `MenuContext.jsx:111` — `availableMenuTypes = [...new Set(products.map(p => p.foodFor))]` — Set deduplicates identical values but cannot merge near-duplicates with different characters.

---

## Frontend Workaround

- **Available:** NO — frontend renders `food_for` verbatim from API. Adding a normalisation/fuzzy-dedup layer on the frontend would be fragile and incorrect (two legitimately different menus could have similar names).
- **Correct fix:** Backend / data team corrects the preprod product records for QA_HYATT.

---

## Requested Backend Action

**One of the following (backend team to decide):**

| Option | Action |
|---|---|
| **A (preferred)** | Update all products with `food_for = "Promational Menu"` to `food_for = "Promotional Menu"` for the QA_HYATT restaurant in preprod. |
| **B** | If `"Promational Menu"` is intentionally a different menu (unlikely given the typo), rename it to something clearly distinct (e.g. `"Promational Menu (Legacy)"`) so the two pills are visually distinguishable. |

Option A is strongly preferred. The typo (`Promational` vs `Promotional`) is almost certainly an accidental entry.

---

**Registered:** 2026-09-25
**Filed by:** INTAKE agent (ALPHA v0.7) acting as Bug Fix agent
**No frontend code change required. Frontend is working as designed.**
