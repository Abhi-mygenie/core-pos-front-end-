# CRM 2.0 — CR-002 T-28 / T-29 / OG-06 Live Regression Verification

**Date:** 2026-05-31
**Verifier:** Deployment/QA agent (Path A live capture, owner-attested)
**Tenant:** Kunafa Mahal (restaurant_id 689), Owner login
**Gate closed:** OG-02 (P1, T-28/T-29 commit-payload regression) + OG-06 (zero legacy `/notes/*` GET)
**Result:** ✅ PASS — CR-002 is regression-safe. CR-002 → CLOSED — OWNER VERIFIED.

---

## Scope
After CR-002 (Cross-Sell + Customer Intelligence) landed, verify the order-commit
payload's `order_note` and per-item `food_level_notes` are unchanged from the
BUG-108 baseline, and that the legacy note GET endpoints are not called.

CR-002 files touched (4 new + 4 modified): `customerIntelService.js`,
`customerIntelTransform.js`, `useCustomerIntel.js`, `relativeTime.js`,
`OrderEntry.jsx`, `CustomerModal.jsx`, **`ItemNotesModal.jsx`**, **`OrderNotesModal.jsx`**.
`orderTransform.js` (commit-payload builder) was **NOT** modified.

---

## T-28 — Commit with customer attached (LIVE)
Endpoint: `POST /api/v2/.../order/place-order` (multipart/form-data), prepaid auto-settle.
Customer: `abhishek jain` / `7505242126` / `cust_membership_id=dashboard-reports-4`.

Observed (relevant fields):
- `order_note`: `""` — **present, string** ✓
- `cart[0].food_level_notes`: `""` ✓ · `cart[1].food_level_notes`: `""` ✓
- Customer fields correctly populated (`cust_name`, `cust_mobile`, `cust_membership_id`).
- **No stray CR-002 fields** (no `cross_sell*`, `upsell*`, `suggestion*`, `intel*`) injected.

## T-29 — Walk-in commit, no customer (LIVE)
- `cust_name`/`cust_mobile`/`cust_membership_id`: `""` ✓
- `order_note`: `""` — present, string ✓
- `cart[*].food_level_notes`: `""` ✓
- No stray CR-002 fields injected.

## OG-06 — Legacy note GETs
- Code audit: **zero wiring** to `/notes/items` or `/notes/orders` anywhere in `src`
  (only a stray code comment in `customerIntelTransform.js`).
- CR-002 customer intel uses a single `POST /pos/customers/order-suggestions` (`customerIntelService.js`).
- ✅ PASS — legacy note GETs are gone.

---

## Diff vs BUG-108 baseline
| Field | BUG-108 baseline | T-28 live | T-29 live | Verdict |
|---|---|---|---|---|
| `order_note` | string (label-join) | `""` present | `""` present | Unchanged ✓ |
| `cart[].food_level_notes` | string (label-join) | `""` present | `""` present | Unchanged ✓ |
| Note object shape feeding transform | `{label,...}` | n/a (empty) | n/a (empty) | Code-confirmed `{label}` ✓ |
| Stray CR-002 fields | none | none | none | ✓ |

## Note on the empty-note path
Both live commits carried **no** item/order notes, so the captures confirm field
**presence + structure + correct empty value + absence of stray fields**. The
non-empty label-join path is confirmed at **code level**: CR-002's modified
`ItemNotesModal`/`OrderNotesModal` still emit `{label}`-shaped note objects
(preset `{id,label,...}`, custom `{label}`, customer-intel preference `{label: pref.note}`),
and the unchanged `orderTransform` joins via `notes.map(n => n.label).join(', ')`.
Live + code evidence together = full T-28/T-29 coverage.

## Outcome
- OG-02 → **CLOSED (PASS)**
- OG-06 → **CLOSED (PASS)**
- CR-002 → **CLOSED — OWNER VERIFIED**
- CRM 2.0 active work item cleared (remaining CR-003/004/005/008/009 → POS 4.0 backlog).
