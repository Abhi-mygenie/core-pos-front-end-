# Menu Management — Frontend Gaps Triage & Validation Playbook

**Created:** 2026-06-10
**Status:** TRIAGE — pending preprod validation. None of these are registered CRs/bugs yet.
**Owner:** Abhi
**Source:** First-read code analysis by main agent (no preprod testing performed).
**Promotion path:** Findings that pass preprod validation get registered into a new `CR_022_MENU_MANAGEMENT_*` CR (or rolled into an existing CR if directly related). (Note: CR-021 is allocated to the Collect Bill split-payment defects.)

---

## 0. Purpose

This doc lists **10 fragility flags** spotted in the Menu Management module during initial code review. Each is a *hypothesis*, not a confirmed bug. The doc gives:
1. A first-pass classification (🟢 FE-confirmed / 🟡 needs preprod / 🔴 likely intentional or out-of-scope).
2. A precise validation recipe for each flag.
3. A reporting template for the QA tester / implementation agent.
4. The promotion path (when a finding becomes a registered bug).

**Why this doc exists:** The owner asked for analysis BEFORE registration. We don't want to bloat the CR tracker with theoretical concerns; only field-validated bugs get registered.

---

## 1. Scope (files reviewed)

| File | Lines | Role |
|------|-------|------|
| `components/panels/MenuManagementPanel.jsx` | 216 | Container / orchestrator |
| `components/panels/menu/CategoryList.jsx` | 274 | Left 30% — categories CRUD |
| `components/panels/menu/ProductList.jsx` | 280 | Right 70% — products list + filters + DnD |
| `components/panels/menu/ProductCard.jsx` | 381 | Product row + Quick Edit inline form |
| `components/panels/menu/ProductForm.jsx` | 546 | Full create/edit form |
| `components/panels/menu/BulkEditor.jsx` | 752 | (Not read in detail yet — read on demand if any bug points here) |
| `api/transforms/menuManagementTransform.js` | 273 | API ⇄ UI mapping |
| `api/services/menuManagementService.js` | 141 | HTTP layer |

---

## 2. Classification matrix

🟢 = confirmed at frontend level from code (proven irrespective of backend) · 🟡 = needs preprod validation to determine severity · 🔴 = intentional, by design, or forward-compat only

| # | Flag | FE verdict | Severity if confirmed | Validation status |
|---|------|------------|------------------------|---------------------|
| 1 | Quick Edit drops variations / addons / image from payload | 🟢🟡 | P0 if backend wipes-on-missing-key; P2 if backend leaves-alone | PENDING |
| 2 | `itemUnit` silently normalises unknown values to `null` | 🔴 | P3 (UX gap if owner needs more units) | OWNER Q ONLY |
| 3 | Empty `addon_ids: []` sent on Full Edit Save | 🟡 | Collapses into #1 (same code path issue) | SKIP — covered by #1 |
| 4 | `category_id: 0` sent when `form.categoryId` is `""` | 🟢 | P2 edge case (orphan products only) | PENDING |
| 5 | `item_unit_price` always overwrites to `basePrice` | 🔴 | Intentional per CR-010; possible feature gap | OWNER Q ONLY |
| 6 | DnD reorder saves only filtered subset's positions | 🟢 | P1 if backend treats positions as absolute | PENDING |
| 7 | Discount type case-mismatch on round-trip | 🟡 | P2 if backend rejects lowercase | PENDING |
| 8 | `giveDiscount` OFF doesn't clear `discount` value in payload | 🟢🟡 | P0 if discount still applies at checkout; P2 if backend gates it | PENDING |
| 9 | Tax `None` may not round-trip | 🟡 | P1 (tax compliance risk) | PENDING |
| 10 | `item_type` 4+ falls to Non-Veg silently | 🔴 | Forward-compat only; not actionable today | NOT TESTABLE |

**Headline:** 7 of the 10 are testable now. 4 are bolded as high-value (#1, #6, #8, #9) — money or data-loss risk. The other 3 testable ones (#2, #4, #7) are lower priority. 3 (#3, #5, #10) need no preprod work — either collapsed, owner-Q, or future-compat.

---

## 3. Shared preprod setup

- **Login:** `preprod.mygenie.online` as `cafe103` owner (creds in `/app/memory/test_credentials.md`).
- **DevTools:** Network tab → filter `Fetch/XHR`. Keep recording across all tests.
- **Test product:** Create a disposable item `QA-MENU-{date}` with:
  - 2 variations (e.g. Size = Small + Large)
  - 2 addons attached
  - 1 image uploaded
  - Tax type = GST 5%, Tax Calc = Exclusive
  - Allow Discount = ON, Discount = 10, Discount Type = Percent
  - Category set, Sold By = Piece (default)
- **For every test:** capture (a) the outgoing request payload from Network, and (b) the state of the product after a **fresh page reload** (to read from backend, not local React state).

---

## 4. Validation recipes

### #1 — Quick Edit drops variations / addons / image

**Severity if confirmed:** P0 data loss.

**Steps**
1. Confirm `QA-MENU-{date}` has all variations/addons/image in Full Edit. Close.
2. Click **Quick Edit** (lightning bolt icon) on that product.
3. Change just the name (add a space). Click Save.
4. In Network → `POST /foods/{id}` → Payload tab. Search for `variations` and `addon_ids` keys.
5. Hard-reload the menu panel. Open Full Edit on the product.

**Outcomes**
- Payload has NO `variations` and NO `addon_ids` keys (expected from code review). On reload:
  - Variations/addons **still present** → 🟡 backend leaves missing fields alone. **Register P2** (hygiene — Quick Edit should still send a complete payload).
  - Variations/addons **gone** → 🟢 **P0**. **Register, ship behind a hot-fix flag.**
- Image: same logic — check `productImage` URL survives reload.

---

### #2 — `itemUnit` silently normalises to `null`

**Severity if confirmed:** P3.

**Steps**
1. In Network, find the `GET /foods-list` response (after panel opens or menuType changes).
2. Scan the Response body for any food whose `item_unit` is NOT in `["Kg","gm","L","ml"]`. Common candidates: `"0"`, `""`, `"kg"` (lowercase), `"pc"`, `"piece"`.
3. If found, open that product in Full Edit and look at "Sold By (Unit)" — should show "Piece (default)".

**Outcomes**
- API returns only the 4 canonical values (or empty) → 🔴 not a bug. Close.
- API returns legacy strings (e.g. `"kg"` lowercase) and they get normalised away → 🟢 FE confirmed. **Owner Q:** do we need to support those strings? If yes → register P3.

**Time:** 2 min (inspection only).

---

### #3 — Empty `addon_ids: []` may detach all addons

**Note:** Analysis showed this collapses into #1 (same code path — Quick Edit's truncated payload). If #1 is fixed (don't send the key in Quick Edit), #3 disappears.

**Skip standalone validation. Roll into #1 fix verification.**

---

### #4 — `category_id: 0` on orphan product

**Severity if confirmed:** P2 edge case.

**Steps**
1. Search the foods-list response for any product with `category: null` or `category.id: null/0`. (Orphan products from migration.)
2. If found, open it in Full Edit. The Category select will pick some default. Capture the payload from a Save.
3. If no orphan exists in preprod, this flag is theoretical — skip. Force-trigger via DevTools (open Full Edit, edit DOM/React state to make Category select value = `""`, save) only if you really want proof.

**Outcomes**
- Payload sends `category_id: 0` and:
  - Backend errors → 🟡 protected. Register P3.
  - Backend accepts, reload shows wrong category / "Uncategorized" → 🟢 **P2**. Register.
- Payload sends `category_id: null` → 🔴 my hypothesis wrong. Report back.

---

### #5 — `item_unit_price` overwrites to `basePrice`

**Owner Q only — no preprod test needed.**

> Q: Do you ever need to charge a different rate for unit-billing than the list price?
> (e.g. ₹500 list price on a 1Kg item, but bill at ₹0.50/gm when sold by weight.)

- YES → register as **feature gap** (not a bug). New CR.
- NO → 🔴 close. Document the decision here:

**Decision (to be filled by owner):** `_____________`

---

### #6 — DnD reorder saves only filtered subset

**Severity if confirmed:** P1.

**Steps**
1. Reset all filters in Product List (Status = All, Food Type = All, Search empty).
2. Screenshot first 15 products in canonical order → **Baseline A**.
3. Apply filter: Food Type = **Veg** only.
4. Drag the first Veg item to filtered position 3. Wait for "Reordered" toast.
5. In Network → capture `POST /quick-reorder` payload.
6. **Count items in the `items` array of the payload.** If it ≈ veg-count rather than total-product-count → 🟢 FE bug confirmed.
7. Remove all filters. Hard-reload page.
8. Screenshot first 15 products → **Baseline C**.

**Outcomes (compare A vs C)**
- C ≈ A with just the moved Veg item in its new spot, Non-Veg unchanged → 🔴 backend handles relative positions. FE-only cosmetic issue, no action.
- C shows Non-Veg items shuffled or alphabetic fallback → 🟢 **P1**. Register.
- C drops items or duplicates them → 🟢 **P0**. Register and prioritise.

---

### #7 — Discount type case round-trip

**Severity if confirmed:** P2.

**Steps**
1. Full Edit `QA-MENU-{date}`. Set Discount = 10, Type = **Percent**. Save.
2. Capture payload → `discount_type` value.
3. Inspect raw foods-list API response on next refresh → same product's `discount_type`. Note exact casing.
4. Switch Type to **Amount**. Save. Repeat capture.

**Outcomes**
- Payload sends `"percent"/"amount"` lowercase, API stores lowercase, reload shows correct type → 🔴 not a bug.
- Payload sends lowercase, API returns capitalised, reload still works → 🔴 backend normalises both sides.
- Payload sends lowercase, API returns capitalised, reload shows wrong default → 🟢 P2. Register.
- Backend rejects lowercase → 🟢 P1. Register.

---

### #8 — `giveDiscount` OFF + non-zero `discount` in payload

**Severity if confirmed at checkout:** P0 (silent discount leak).

**Steps**
1. Full Edit `QA-MENU-{date}`. Allow Discount = ON, Discount = 50, Type = Percent. Save.
2. Capture payload — confirm `give_discount: "Yes", discount: 50, discount_type: "percent"`.
3. Reload. Re-open. Toggle Allow Discount = **OFF**. (Discount input disappears.) **Don't clear anything.** Save.
4. Capture payload — should show `give_discount: "No"` with `discount: 50` still set.
5. Reload. Re-open. Toggle Allow Discount back to ON. Note the Discount field value.
6. **End-to-end:** Add this item to a fresh order (1 qty). Open Collect Bill. Does a 50% discount apply to the line?

**Outcomes**
- Step 6 shows discount applied even though gate was OFF → 🟢 **P0 confirmed.** Backend doesn't gate. Register and ship fast.
- Step 6 shows no discount applied → 🟡 backend gates correctly; FE leak is data-hygiene only. Register **P2**.
- Step 5 shows Discount = 0 after save+reload → 🟡 backend zeroes on save. Register **P3** or close.

---

### #9 — Tax `None` round-trip

**Severity if confirmed:** P1 (tax compliance).

**Steps**
1. Full Edit `QA-MENU-{date}`. Set Tax Type = **None**, Tax % = 0. Save.
2. Capture payload — what's `tax_type`?
3. Reload. Re-open. What does Tax Type field show?
4. **End-to-end:** Add this item to a fresh order, open Collect Bill, check if any GST line appears for it.

**Outcomes**
- Step 3 shows "None", step 4 shows no GST → 🔴 not a bug.
- Step 3 shows "GST" → 🟢 **P1**. Register. Compliance risk: owner picks an exemption, FE silently flips it back to GST on reload, next save re-applies tax.
- Step 4 shows GST applied despite "None" set in catalog → 🟢 **P0**. Register and prioritise.

---

### #10 — `item_type` 4+ → silent Non-Veg fallback

**Severity:** 🔴 forward-compat only. Not testable today.

**Action:** Note in this doc; revisit if/when backend adds a new `item_type` value (Vegan = 4, Halal = 5, etc.).

---

## 5. Quick-reference matrix (testing order)

| # | Test product needed | Action | What to capture | Time |
|---|---|---|---|---|
| **#1** | QA-MENU-{date} (variations + addons + image) | Quick Edit → name tweak → Save → reload | Payload (missing keys?); state after reload | 5 min |
| #2 | Inspection only | Browse foods-list response | Non-standard `item_unit` values | 2 min |
| #3 | — | Covered by #1 | — | 0 |
| #4 | Orphan product (or DevTools force) | Save → capture payload | `category_id` value | 3 min |
| #5 | Owner Q | "Do you need separate unit price?" | Decision recorded | 1 min |
| **#6** | Filter Veg + drag | Capture reorder payload + A/C screenshots | Payload item count; reload order | 5 min |
| #7 | QA-MENU-{date} | Switch discount types | Payload + reload casing | 3 min |
| **#8** | QA-MENU-{date} | Toggle Allow-Discount OFF with value 50 → place order | Payload + bill at checkout | 8 min |
| **#9** | QA-MENU-{date} | Tax = None → save → reload → place order | Payload + reload + bill | 6 min |
| #10 | — | Not testable | — | 0 |

**Bolded rows (#1, #6, #8, #9)** are the high-value tests. Run those first.

**Total realistic time:** ~30 min for all 7 testable; ~25 min for the 4 bolded.

---

## 6. Reporting template (paste back to main agent)

For each flag tested, report back in this format:

```
Flag #__:
- Payload captured: [paste relevant fields, or screenshot]
- Reload state: [paste / screenshot]
- End-to-end check (if applicable): [paste / screenshot]
- My verdict: [GREEN-bug / YELLOW-needs-decision / RED-not-a-bug]
- Notes: [anything weird]
```

Main agent will then:
- Classify each finding 🟢/🟡/🔴 with code-level evidence.
- Recommend register / close / owner-decision.
- On owner "register", promote into the matching CR.

---

## 7. Promotion path

Findings that get registered will be added to one of:

| Finding category | Promotion target |
|---|---|
| Quick Edit data-loss (#1, #3) | New CR-022 (Menu Management — Quick Edit hardening) |
| DnD reorder (#6) | New CR-022 § DnD-reorder section, OR separate if scope grows |
| Discount/Tax flow (#7, #8, #9) | New CR-022 § Payload-hygiene section |
| Edge cases (#2, #4) | CR-022 backlog (P3) or close |
| Feature gaps (#5, #10) | Separate feature CR(s) or backlog |

**No CR exists yet.** It is created the moment the first finding flips from 🟡 to 🟢 with owner go-ahead.

---

## 8. Status log

| Date | Event | By |
|------|-------|-----|
| 2026-06-10 | Triage doc created from first-read code analysis. 10 flags listed; awaiting preprod validation. | main agent |
| | | |
