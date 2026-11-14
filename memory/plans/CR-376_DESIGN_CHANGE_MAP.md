# CR-376 — Design Change Map (pre-Gate 4 owner review)
**Date:** 2026-09-25 · **Role:** PLANNING · **Status:** Gate 3 revalidated, Gate 4 NOT given · **Zero code**
Companion to `plans/CR-376_IMPLEMENTATION_PLAN.md`. This doc only answers "where will I see it?".

---

## 0. Backend — NO CHANGES

| Question | Answer |
|---|---|
| New/changed API endpoints? | **None.** The products endpoint already returns `food_for` per item (`Normal` / `Party` / `Premium` / `Aggregator`). We only stop throwing away the non-Normal rows on the frontend (`productTransform.js:47`). |
| Order payload changes? | **None.** `orderTransform.js` / `orderService.js` never send `food_for`; orders carry food IDs + qty as today. Backend cannot tell which menu a station had active — same as today. |
| Database / Laravel / socket changes? | **None.** `food_update` / `delete-food` socket events already flow into `MenuContext.products`; the new memos recompute automatically. |
| Where does the "active menu" live? | **Browser localStorage on the station device** (`mygenie_active_menu_type`), same pattern as QSR mode. Not synced to server, not per-restaurant — **per device**. |

---

## 1. Frontend — 4 visible places + 3 invisible plumbing files

### 1.1 VISIBLE — Local Settings page (`/visibility/status-config`) · `StatusConfigPage.jsx`

**Where:** inside the first card **"Order Taking / UI Elements"**, directly *below* the "Weight Entry Prompt" toggle and *above* the "Customer Field Requirements" block (L995-997).

**Only rendered when the restaurant has 2+ menus with live items** (`availableMenuTypes.length > 1`). A Normal-only restaurant sees **nothing new** on this page.

```
┌─ Order Taking ───────────────────────────────────────────────┐
│  … existing toggles (Order Taking, Stay on order, QSR, …)     │
│  Weight Entry Prompt                              [ toggle ]  │
│ ─────────────────────────────────────────────────────────────  │
│  Active Menu                                          ← NEW   │
│  Select which menu is active for order taking on this         │
│  station. Only menus with configured items are shown.         │
│  Per-device setting.                                          │
│                                                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│   │ ● Normal │  │  Party   │  │ Premium  │   ← pill buttons   │
│   └──────────┘  └──────────┘  └──────────┘                    │
│   (selected = green border + light-green fill,               │
│    unselected = grey border, grey text)                       │
│ ─────────────────────────────────────────────────────────────  │
│  Customer Field Requirements  (existing CR-051)               │
└───────────────────────────────────────────────────────────────┘
```
- Labels are **whatever the DB returns** in `food_for` (OD-376-04) — no hard-coded "Party"/"Premium".
- Clicking a pill marks the page dirty → existing **Save** button persists it; existing **Reset to factory** puts it back to `Normal`.
- `data-testid="active-menu-option-<type>"`.

---

### 1.2 VISIBLE — Order Entry header chip · `OrderEntry.jsx` L1712-1722

**Where:** the compact header row above the item grid: `[Search items…] [#OrderNo] [NEW CHIP] … [+][👤][📝][⇄][⧉]`.

**Only rendered when active menu ≠ Normal.** Normal stations see the header exactly as today.

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 Search items…      #1043   ╭──────────────╮      + 👤 📝 ⇄ ⧉ │
│                              │  Party Menu  │  ← NEW (read-only)│
│                              ╰──────────────╯                    │
└──────────────────────────────────────────────────────────────────┘
```
- Orange text/border on pale-orange fill (`#FFF3E0` / `COLORS.primaryOrange`), pill shape, `text-xs`.
- **Passive** — not clickable. Waiter cannot switch menus here (OD-376-02/05: one place, one truth = Local Settings).
- `data-testid="active-menu-type-chip"`.

---

### 1.3 VISIBLE — Order Entry item grid · `OrderEntry.jsx` L553-562 (logic) + L1786-1789 (render)

**Where:** the pill grid of menu items in the middle panel, and the left category column counts.

**Behaviour change:**
| Station setting | Item grid shows | Category counts (left panel) | Popular tab |
|---|---|---|---|
| Normal (default / today) | Normal items — **identical to today** | identical to today | identical |
| Party | Party items only | counts of Party items per category | unchanged (`popularProducts` is a separate boot array) |
| Premium | Premium items only | counts of Premium items | unchanged |

**Empty-state (OD-376-06)** — only when active menu ≠ Normal **and** that menu has 0 live items. Replaces the pill grid inside the same scroll area (search box, categories, cart all remain):

```
┌──────────────────── middle panel ────────────────────┐
│                                                      │
│          Party menu has no items configured.         │  ← orange, semibold
│            Please update in Local Settings.          │  ← grey, small
│                                                      │
└──────────────────────────────────────────────────────┘
```
- Waiter cannot add items until a manager fixes Local Settings (no silent fallback to Normal).
- `data-testid="active-menu-empty-state"`.

---

### 1.4 VISIBLE (conditional on OD-376-07) — Customer modal suggestions · `OrderEntry.jsx` L2844

**Where:** Customer modal (👤 icon) → "Favourites" and "Smart Suggestions" rows for an existing CRM customer.

| OD-376-07 | What owner sees on a Party/Premium station |
|---|---|
| **(a) scope — recommended** | Rows still listed; tapping an item that is **not** on the active menu does nothing (silently skipped). Tapping a Party item adds it. **No visual change** to the modal itself. |
| (b) leave as-is | Tapping a Normal-menu favourite adds a Normal item into a Party order (mixing). |
| (c) park | Same as (b) for now. |

Normal-only restaurants: no change under any option.

---

### 1.5 INVISIBLE — plumbing (no UI)

| File | What changes | Why owner won't see it |
|---|---|---|
| `api/transforms/productTransform.js` L47 | `=== 'Normal'` → `!== 'Aggregator'` | Data layer only. Aggregator items still excluded exactly as today. |
| `utils/activeMenuPrefs.js` **(new)** | localStorage getter/setter for `mygenie_active_menu_type` | Storage helper, mirrors `qsrModePrefs.js`. |
| `contexts/MenuContext.jsx` | 3 new memos: `activeMenuType`, `activeMenuProducts`, `availableMenuTypes` | Context state; consumed by 1.1–1.4. |
| `pages/LoadingPage.jsx` L589 · `hooks/useRefreshAllData.js` L34 | category counts computed from active-menu items | Makes the left-panel numbers in 1.3 correct on boot and on manual refresh. |

---

## 2. What does NOT change (explicit)

- Cart panel, Collect Payment, discounts, tax, KOT/bill printing, settlement, reports — **untouched** (`CartPanel.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` not in scope lock).
- Add Custom Item modal — still sees the full product list (used only for category/GST lookup).
- Dashboard header, sidebar, table cards, station view — no menu selector anywhere else (OD-376-05).
- Aggregator (Swiggy/Zomato) flow — unchanged.
- **Switching takes effect on next Order Entry open**, not live inside an already-open order (Design A: read once on mount). Worth a smoke step.

---

## 3. Owner smoke preview (what Gate 6 will look like)

1. Normal-only restaurant → Local Settings: **no** "Active Menu" block · Order Entry: **no** chip · grid/counts identical. *(regression)*
2. Multi-menu restaurant → Local Settings shows pills → pick **Party** → Save → open a table → chip "Party Menu" · grid = Party items · counts = Party.
3. Pick a menu with 0 items → Save → open a table → empty-state text; cart still usable for existing items.
4. Reset to factory → Normal → chip gone.
5. Customer modal favourites on Party station → behaviour per OD-376-07.

---

**Live annotated screenshots:** not possible this session — `memory/test_credentials.md` is absent (wiped on re-sync), so protected routes (`/dashboard`, `/visibility/status-config`) cannot be opened. If the owner re-supplies the QA account alias, PLANNING can capture "before" screenshots of the three locations with the insertion points marked, still without writing code.
