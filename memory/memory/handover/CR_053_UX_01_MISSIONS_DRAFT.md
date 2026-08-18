# CR-053-UX-01 — Read-and-Explore Tour: Missions Draft v2 (for owner review)

**Date:** 2026-06-18
**Author:** Planning Agent
**Status:** DRAFT v2 — supersedes v1 (Observation-only). Awaiting final owner GO before encoding into `seed_menu_management.py`.
**Scope:** Menu Management course — 13 missions (M1-M12 + optional M11+)
**Model:** "Read-and-Explore Tour" — safe UI actions allowed, data-writing actions never required.

---

## Why v2 (model change from v1)

v1 was a pure "Observation Tour" where the user never clicked anything. Owner correctly identified that v1 needed static screenshots to show form internals, but static screenshots are:
- Generic (show someone else's items, not the user's real menu)
- Stale-prone (become outdated when POS UI changes)
- Disconnected (the user is looking at a picture, not their real interface)

v2 resolves this by adopting a clear safety rule:

> **The tour CAN ask the user to do safe UI actions (open forms, navigate, view things). The tour MUST NEVER ask them to do data-writing actions (Save, Confirm Delete, Toggle).**

Opening a form is a UI state change, not a data write — completely safe. The user sees their REAL POS UI with their REAL data; the tour highlights live elements inside the open form. Data-writing buttons are explained but never clicked during the tour.

This closes OG-CR053-SCREENSHOTS-FORM-SAMPLES (no longer needed).

---

## Authoring rules (apply to every mission)

1. **Every step is one of three types:**
   - 🔦 **Highlight** — spotlight on already-visible element, auto-advance (4-6s)
   - 👆 **Explore** — user clicks a SAFE element (open form, navigate, filter); spotlight waits for the click
   - 📖 **For-real** — read-only description for save/delete/toggle moments; auto-advance (5-7s), user does NOT click
2. **Safety rule:** No 👆 Explore step may trigger a backend write. Reviewer must verify every 👆 step in code before encoding.
3. **End-of-mission wrap-up:** missions that opened a form end with a 🔦 Highlight on the back arrow + text reminding user how to close. The tour itself does NOT force the close.
4. **Plain English** — no `data-testid`, no jargon. Voice: friendly + short.
5. **Persistent banner** throughout: 🎓 *Tutorial — for learning only. Nothing here saves to your menu.*
6. **"Now try it" checklist** at end of every mission. Dismissable (saved in localStorage).
7. **Mission ordering** enforced for first pass (M1 → M2 → ... → M12). M11+ is optional. Completed missions are re-viewable any time.
8. **Brand:** Poppins font, `#329937` green, `#F26B33` orange, `#F4A11A` amber.
9. **Language:** English-only for v1.

---

## M1 — Navigate to Menu Management *(3 steps · ~1 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 👆 Explore | Sidebar Menu icon | "Click the Menu icon to open Menu Management." |
| 2 | 🔦 Highlight | Whole Menu Mgmt page | "You're now on the Menu Management page. The left side shows your **categories**, the right side shows the **items** in the selected category." |
| 3 | 🔦 Highlight | Category list (left) | "Categories group related items together — Starters, Main Course, Beverages, etc. The next mission will show you how to browse them." |

**Now try it:** ☐ Open Menu Management once · ☐ Count your existing categories

---

## M2 — Browse Categories *(4 steps · ~2 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | Category search box | "When you have many categories, use this search to find one quickly." |
| 2 | 👆 Explore | A category row | "Click any category to see its items on the right." |
| 3 | 🔦 Highlight | Items panel | "Each card shows the item name, price, and a colour-coded food type." |
| 4 | 👆 Explore | "All Items" tab | "Click 'All Items' to see every item across every category at once — handy when searching." |

**Now try it:** ☐ Browse 3 different categories · ☐ Use the category search · ☐ Try the 'All Items' view

---

## M3 — View Menu Items *(3 steps · ~2 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | An item card | "Each card shows the item name, price, and a colour dot — green = vegetarian, red = non-vegetarian, yellow = egg." |
| 2 | 🔦 Highlight | Normal / Bulk view toggle | "You can switch between Normal view (one item at a time) and Bulk Edit (spreadsheet style)." |
| 3 | 🔦 Highlight | Bulk Edit button | "We'll explore the Bulk Editor in Missions 11 and 11+. For now, just know it's here." |

**Now try it:** ☐ Read 3 item cards · ☐ Notice the colour dots and their meaning

---

## M4 — Add a New Menu Item *(7 steps · ~4 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | Category list | "Before adding an item, pick the category it belongs to so it lands in the right place." |
| 2 | 👆 Explore | + Add Item button | "Click + Add Item — this opens an empty form on the right. Nothing is saved yet; you can close it any time." |
| 3 | 🔦 Highlight | Name field (inside the now-open form) | "Every item needs a name. This is what appears on your POS and receipts." |
| 4 | 🔦 Highlight | Pricing & Tax section | "Set the selling price here. Tax can be left as default if you're not sure." |
| 5 | 🔦 Highlight | Classification section | "Mark the item Veg, Non-Veg, or Egg — the colour dot you saw on item cards comes from here." |
| 6 | 📖 For-real | Save button (at form bottom) | "When you have a real item to save, this button creates it. Don't click it now — your form is empty so it would error anyway." |
| 7 | 🔦 Highlight | Back arrow (top-left of form) | "Tour complete! When you're done exploring, click this back arrow to return to the items list. Nothing was saved." |

**Now try it:** ☐ Pick one new item to add · ☐ Choose its category · ☐ Open the form via + Add Item · ☐ Fill in name + price + food type · ☐ Save

---

## M5 — Edit an Existing Item *(6 steps · ~3 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | An item card with action icons | "Each card has small action icons in its corner — edit, quick edit, delete." |
| 2 | 👆 Explore | Pencil (full edit) icon | "Click the pencil on any item to open its full edit form." |
| 3 | 🔦 Highlight | Edit form (with item's data pre-filled) | "The form opens with the current values. The title at top says 'Edit: <item name>'." |
| 4 | 🔦 Highlight | Form sections | "All the same sections you saw in M4 are here — Name, Pricing, Classification, etc. Change only what you need." |
| 5 | 📖 For-real | Save button | "Save updates the existing item. For now, just look around — don't save." |
| 6 | 🔦 Highlight | Back arrow | "Tour complete! Click the back arrow to close without saving." |

**Now try it:** ☐ Open one item with the pencil · ☐ Look at every section · ☐ Close with the back arrow

---

## M6 — Quick Edit (Price & Name) *(4 steps · ~2 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | Quick-edit icon on a card | "Quick Edit is the fastest way to change just price or name — no full form." |
| 2 | 👆 Explore | The quick-edit icon | "Try it now — click Quick Edit. The card will flip into edit mode." |
| 3 | 🔦 Highlight | Inline Name + Price fields + buttons | "Two fields appear. Type your change, then click Save to apply or Cancel to discard." |
| 4 | 📖 For-real | Save (inline) button | "Save here updates the price/name immediately. Click Cancel for now — we don't want to change anything." |

**Now try it:** ☐ Quick-edit one item's price on your real menu · ☐ Quick-edit one item's name

---

## M7 — Set Food Type (Veg / Non-Veg / Egg) *(5 steps · ~2 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | Item card colour dot | "Every item has a food type dot — green / red / yellow." |
| 2 | 👆 Explore | Pencil icon | "To change the food type, open the full edit form via the pencil icon." |
| 3 | 🔦 Highlight | Classification section | "Inside the form, find the Classification section — that's where the food type lives." |
| 4 | 🔦 Highlight | Veg / Non-Veg / Egg buttons | "Three buttons. The colour shows on order screens, receipts, and reports." |
| 5 | 📖 For-real | Save button | "Save updates the colour everywhere. For now, click the back arrow to close without saving." |

**Now try it:** ☐ Spot-check 5 items — is the food type correct? · ☐ Fix any that are wrong

---

## M8 — Toggle Item Availability *(3 steps · ~1 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | Status toggle on a card | "Every card has a toggle. ON = in stock, OFF = out of stock and hidden from the order screen." |
| 2 | 📖 For-real | The toggle | "When you're ready to mark something sold-out, just click this toggle. Don't click now — we don't want to change live availability." |
| 3 | 🔦 Highlight | A greyed-out card (if visible — else describe) | "Out-of-stock items appear greyed and stop showing on the customer-facing order screen. Toggle them back any time." |

**Now try it:** ☐ Toggle one slow-moving item off · ☐ Toggle it back on

---

## M9 — Delete a Menu Item *(5 steps · ~2 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | Trash icon on a card | "The trash icon permanently removes an item from your menu." |
| 2 | 📖 For-real | The trash icon | "Don't click during the tour — let's just understand what happens." |
| 3 | 🔦 Highlight | (Concept) — deletion reason field | "When you click delete for real, you'll be asked WHY — discontinued, replaced, mistake, etc. This helps audit menu changes." |
| 4 | 🔦 Highlight | (Concept) — Confirm Delete button | "Confirm deletes permanently. Old orders for the item stay in your reports, but the item is gone from the menu." |
| 5 | 🔦 Highlight | (Guidance) | "Delete only for items you'll never serve again. For temporary out-of-stock, use the toggle (Mission 8)." |

**Note:** M9 is mostly read-only/concept because opening the delete-confirmation modal is psychologically loaded — better to talk through it than click it.

**Now try it:** ☐ Identify 2 items you'd never delete · ☐ Identify when delete vs toggle is right

---

## M10 — Add Item Variations *(6 steps · ~4 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | An item card | "Variations let one item have multiple sizes or options with different prices — like Small / Medium / Large." |
| 2 | 👆 Explore | Pencil (edit) icon | "Open any item's edit form to see where variations live." |
| 3 | 🔦 Highlight | Food Variations section in the form | "Scroll down to Food Variations. This is where size or option choices go." |
| 4 | 🔦 Highlight | + Add Variation button | "Click + Add Variation. Each variation gets its own name and price." |
| 5 | 📖 For-real | Save button | "When you save, the variations stick to this item. On the order screen, staff or customer picks one. Don't save now — click back when done viewing." |
| 6 | 🔦 Highlight | (Examples / guidance) | "Use variations for: pizzas (small/medium/large), coffee (regular/large), pasta (half/full), juice sizes." |

**Now try it:** ☐ Pick one item that should have sizes · ☐ Open it and add 2 variations · ☐ Save and see how it shows on the order screen

---

## M11 — Bulk Edit Intro *(4 steps · ~3 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 👆 Explore | Bulk Edit toggle | "Click Bulk Edit to switch the items view into a spreadsheet." |
| 2 | 🔦 Highlight | Grid layout | "Rows = items, columns = name, price, type, GST, etc. Click any cell to edit it inline." |
| 3 | 🔦 Highlight | Category filter at top | "Filter by category to focus on one section at a time." |
| 4 | 📖 For-real | Save All button | "Bulk Edit holds your changes until you click Save All. Then everything saves in one go. Don't click Save All now — switch back to Normal view when done exploring." |

**Now try it:** ☐ Open Bulk Edit · ☐ Filter to one category · ☐ Notice every editable field · ☐ Switch back to Normal view

---

## M11+ — Bulk Editor Deep Dive *(4 steps · ~4 min · OPTIONAL)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 👆 Explore | Bulk Edit toggle (open if closed) | "Open Bulk Edit again so we can look at the import/export tools." |
| 2 | 🔦 Highlight | Export to Excel button | "Export your whole menu (or filtered subset) to Excel. Useful for big price overhauls offline." |
| 3 | 🔦 Highlight | Import from Excel button | "Re-import an edited file. The system matches items by ID and updates only what changed." |
| 4 | 📖 For-real | (Guidance) | "Use Bulk Edit for: annual price updates, GST changes across the menu, bulk renaming. Always click Save All before leaving the page." |

**Optional:** does NOT count toward course completion. Course is 100% after M1-M10 + M11 + M12.

**Now try it:** ☐ Export your menu to Excel · ☐ Edit 2 prices in Excel · ☐ Re-import and confirm changes saved

---

## M12 — Create a New Category *(5 steps · ~2 min)*

| # | Type | Spotlight | Tooltip |
|:--:|:--:|---|---|
| 1 | 🔦 Highlight | + Add Category button (bottom of category list) | "Look for + Add Category at the bottom of the category list." |
| 2 | 👆 Explore | Click + Add Category | "Click it to open the new category form." |
| 3 | 🔦 Highlight | Category name field | "Give it a clear name — 'Lunch Specials', 'Bar Menu', 'Kids Menu'." |
| 4 | 🔦 Highlight | Kitchen station selector | "Pick which kitchen station (or KDS screen) prepares items in this category." |
| 5 | 📖 For-real | Save button | "Save creates the category. For the tour, click Cancel to close without creating one." |

**Now try it:** ☐ Plan a new category your restaurant could use · ☐ Open the Add Category form · ☐ Either save or cancel

---

## Course-Complete screen (after M12)

```
🎉 Course Complete — Menu Management

You've toured everything you need to manage your menu confidently.

What you can do now:
 • Add new items with categories, prices, and food types
 • Edit, quick-edit, or toggle items in seconds
 • Bulk-update many items at once
 • Create new categories and variations

Optional next: try Mission 11+ (Bulk Editor Deep Dive)
or wait for your next course — Order Entry (coming soon).

Tip: come back any time to re-tour any mission — the 🎓 button is 
always in the bottom-right corner.
```

---

## Locked decisions

| # | Decision |
|---|---|
| 1 | Tone: **friendly + short** |
| 2 | Brand: Poppins font, `#329937` green, `#F26B33` orange, `#F4A11A` amber |
| 3 | Language: **English only for v1** |
| 4 | "Now try it" checklists: **dismissable** (preference saved in localStorage) |
| 5 | M11 split: **M11 (required) + M11+ (optional)**. Course mission count: 13. Optional missions don't gate completion. |
| 6 | Static screenshots: **NOT NEEDED** — tour opens real forms via safe Explore clicks |
| 7 | Mission ordering: **enforced for first pass**. Completed missions always re-viewable. |

---

## Safety guarantee — Explore-step audit

Every 👆 Explore step listed below has been verified to perform NO backend writes:

| Mission · Step | Click target | What it does | Backend write? |
|---|---|---|:--:|
| M1 · s1 | Sidebar Menu icon | Navigates to `/menu` | ❌ None |
| M2 · s2 | A category row | Filters items panel | ❌ None |
| M2 · s4 | "All Items" tab | Filters items panel | ❌ None |
| M4 · s2 | + Add Item button | Opens empty form (UI state only) | ❌ None |
| M5 · s2 | Pencil icon | Fetches item details (GET only), opens form | ✅ GET only — safe |
| M6 · s2 | Quick-edit icon | Flips card into inline mode | ❌ None |
| M7 · s2 | Pencil icon | Same as M5 · s2 | ✅ GET only — safe |
| M10 · s2 | Pencil icon | Same | ✅ GET only — safe |
| M11 · s1 | Bulk Edit toggle | Switches view + fetches full list | ✅ GET only — safe |
| M11+ · s1 | Bulk Edit toggle | Same | ✅ GET only — safe |
| M12 · s2 | + Add Category | Opens empty form (UI state only) | ❌ None |

Every 📖 For-real step is read-only — user never clicks during the tour.

---

## What this draft closes / opens in OPEN_GAPS_REGISTER

**Closes** (no longer relevant):
- `OG-CR053-SCREENSHOTS-FORM-SAMPLES` (was P2 — static screenshots were a workaround; the Read-and-Explore model removes the need)

**Stays open:**
- `OG-CR053-SUPERVISOR-WRAP` (P2)
- `OG-CR053-SEED-IDEMPOTENCY` (P3)
- `OG-CR053-NO-TRAINING-CONFIG-SEED` (P3)
- `OG-CR053-FIX-PERSISTENCE-AUDIT` (P1)
- `OG-CR053-PHASE2-SANDBOX` (P2 — Phase 2 work)
- `OG-CR053-MULTILINGUAL` (P3 — deferred to future CR)

**New gaps to open after implementation:**
- `OG-CR053-BACK-ARROW-SELECTOR` (P3) — closing the form requires targeting the back arrow which has no `data-testid`. Use structural selectors (e.g. `[data-testid='product-form'] > div:first-child > button`); brittle if POS markup changes.

---

## Next step

Owner reviews this v2 draft inline (via chat or by editing this file directly). On final GO, Planning Agent hands off to Implementation Agent for:
1. Encode all 13 missions into `seed_menu_management.py`
2. SDK changes: stuck-detector, "I'm stuck" button, dismissable checklist, tutorial banner, explicit mission picker (replaces silent auto-chain), completion screen with checklist
3. Rebuild SDK bundle → copy to `frontend/public/training/training-sdk.js`
4. Reseed MongoDB
5. Browser verification matrix (V1-V8)
6. Update PRD.md, write fresh session handover, close OG-CR053-SCREENSHOTS-FORM-SAMPLES, open OG-CR053-BACK-ARROW-SELECTOR
