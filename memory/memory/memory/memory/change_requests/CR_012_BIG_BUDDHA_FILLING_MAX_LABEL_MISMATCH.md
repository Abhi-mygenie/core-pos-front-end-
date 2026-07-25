# CR-012 — Menu Config: Filling Max-Label Inconsistency

**Type:** Menu-config data ticket (NOT a code change)
**Logged:** 2026-05-03
**Source:** Surfaced during CR-006 Phase B / Bucket B1 multi-select implementation.
**Owner direction:** "2 d" — honour data (`max=N`) at runtime; raise label mismatch as separate ticket.
**Linked handover:** `/app/memory/change_requests/implementation_handover/CR_BUCKET_B1_MULTISELECT_VARIATIONS_HANDOVER.md` §8.

---

## Issue
Several Palm House menu items have the maximum-allowed-fillings hint embedded **inside the variation group name** (e.g., `"Choice Of Filling (Max 2)"`), but the underlying numeric `max` configured in the backend does **not match** the label.

After Bucket B1 ships, the POS UI honours the numeric `max` (the truth that controls the cap). This means an operator may legitimately pick **up to 7 fillings** on an item whose group name explicitly says *"Max 2"* — which will confuse cashiers and diners alike.

---

## Affected items (Palm House preprod, 2026-05-02)

| Restaurant ID | Item ID | Item Name | Group Name | Label says | Backend `max` | Match? |
|---|---|---|---|---|---|---|
| 541 | 107738 | Big Buddha Burger (V) | Choice Of Filling (Max 2) | 2 | 7 | ❌ |
| 541 | 107478 | Big Buddha Burger (V) | Choice Of Filling (Max 2) | 2 | 2 | ✅ |
| 541 | 107739 | Zanzibar Burger (V) | Choice Of Filling (Max 2) | 2 | 7 | ❌ |
| 541 | 107479 | Zanzibar Burger (V) | Choice Of Filling (Max 2) | 2 | 2 | ✅ |
| 541 | 107740 | Open Burger (V,GF) | Choice of Filling (Max 3) | 3 | 3 | ✅ |
| 541 | 107480 | Open Burger (V,GF) | Choice of Filling (Max 3) | 3 | 3 | ✅ |
| 541 | 107718 | My Favourite Eggs | Choice of Egg | (no label) | 5 | n/a |

**Pattern:** Two of four "Big Buddha / Zanzibar" entries have a stale `max=7` from an older menu version. The duplicates with `max=2` are the corrected ones — the duplicates with `max=7` should be either retired or re-capped.

---

## Recommended action (for menu-config / restaurant ops team)

1. **Audit duplicates:** items 107738 & 107478 are both "Big Buddha Burger (V)" — only one should exist on the live menu. Same for 107739/107479.
2. **Decide canonical max:** is it 2 or 7? The label suggests 2, but staff intent may have changed.
3. **Either:**
   - Update `max` from 7 to 2 on items 107738 and 107739 (keeps "Max 2" label honest), OR
   - Remove "(Max 2)" from the group name and let the numeric `max=7` speak for itself.
4. **Going forward:** consider not embedding numeric caps in group names — the UI now displays `min N • max M` automatically when constraints are configured, so labels can stay clean.

---

## Why frontend can't fix this

- The group `name` is free-text in menu config; parsing it for `(Max N)` substring is brittle (mixed casing, parentheses style, future variations).
- Truth source is the numeric `max` field — that's what backend uses for any server-side validation, ordering rules, etc.
- A frontend "warning if label disagrees with max" check was considered but rejected: it would alert on every load for known-good items where the label is just descriptive (e.g., `Open Burger (Max 3)` with `max=3`).

---

## Status
**OPEN** — restaurant ops team to action against Palm House menu (and any other tenants with similar patterns once we onboard them).

No frontend / backend code change needed. Closing this ticket = updating the menu config for the affected items.
