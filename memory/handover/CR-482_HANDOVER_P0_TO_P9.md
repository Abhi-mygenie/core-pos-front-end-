# CR-482 Handover — Keyboard Navigation (Phase A) — P0 to P10 done, P11 next

> **UPDATE (session close, 2026-11-05):** P10 is now IMPLEMENTED (see "P10 update" section at the bottom). The next agent should summarise P0–P10 and ask approval for **P11 (F2 → search)**, not P10. Sections below written before P10 are kept for history.

## Instructions for the next agent (read first)
1. Read this file, then `/app/memory/plans/CR-482_IMPLEMENTATION_PLAN.md` (P10–P26 detail) and `/app/memory/PRD.md` (CR-482 section).
2. Your FIRST reply to the user must:
   - Summarise in plain language what is done (section "What is done") and what is NOT yet tested (section "Test status").
   - Explain P10 in plain language (section "Next phase: P10").
   - Ask for approval: reply "approved P10" to start, or "retest first" to test P6–P9 first.
3. Do NOT write code before the user approves. Do NOT start more than one phase at a time unless the user approves several at once.

## User working rules (must follow)
- Phase-by-phase: explain → user approves → build → test → report. Never skip approval.
- Additive only. Everything gated by the Keyboard Shortcuts switch (default OFF) + physical-keyboard check. Switch OFF must be exactly today's behaviour.
- Reuse existing buttons/handlers (click them or call the same function). No changes to tax, prices, totals, API, print logic, backend.
- Any visible UI change must be shown to the user with a screenshot.
- Be honest about test status. If something could not be tested, say so clearly. The user tests themselves and reports gaps (e.g. they caught the P5 Tab-leak gap).
- When the user asks "check gap, no edits" — investigate and report only, no code changes.
- Use plain, non-technical language with short tables/bullets. The user writes briefly; reply concisely.

## How the switch works
- UI: Status Configuration page (`/visibility/status-config`) → UI Elements → "Keyboard Shortcuts" (between Weight Entry Prompt and Auto-expand Served Items). Press Save.
- Storage: localStorage `mygenie_keyboard_shortcuts_enabled` = 'true'.
- Code gate in `OrderEntry.jsx`: `kbdEnabled = (settings.keyboardShortcuts || localStorage flag) && HAS_POINTER_DEVICE()`.
- Backend per-restaurant setting `keyboard_shortcuts` → brief filed at `/app/memory/backend_briefs/BACKEND_BRIEF_CR-482_SETTINGS_KEY.md`; NOT implemented by backend yet. Missing key = OFF.

## What is done (P0–P9)
| Phase | What it does (Shortcuts ON only) | Files |
|---|---|---|
| P0 | Foundation: key map, keyboard hook, arrow-grid helper, orange focus/highlight CSS, profile setting mapping | `constants/keyboardShortcuts.js`, `hooks/useKeyboardShortcuts.js`, `hooks/useArrowGridNav.js`, `hooks/index.js`, `index.css`, `api/transforms/profileTransform.js` |
| Switch | Keyboard Shortcuts on/off toggle | `pages/StatusConfigPage.jsx` |
| P1 | Cursor goes to search when order screen opens; Tab stays within order screen | `OrderEntry.jsx` |
| P2 | First matching item gets orange ring (exact item code wins) | `OrderEntry.jsx` |
| P3 | Arrow keys move the ring around the item grid | `OrderEntry.jsx` |
| P4 | Enter adds ringed item (customizable → opens popup), search clears | `OrderEntry.jsx` |
| P5 | Customization popup: Esc closes, Ctrl+Enter = Add to Order, cursor moves into popup, Tab/Shift+Tab loop inside popup, "(Ctrl+Enter)" label on button, search refocused after close | `ItemCustomizationModal.jsx`, `OrderEntry.jsx` |
| P6 | Weight popup: Enter in weight box = same checks + Add; Esc closes; search refocused. Weight box is in gm/ml (type 500, not 0.5) | `WeightEntryModal.jsx`, `OrderEntry.jsx` |
| P7 | Enter Price popup (₹1 items): Esc closes; search refocused (Enter-to-add already existed) | `OrderEntry.jsx` |
| P8 | `+` / `-` (and numpad) change qty of LAST ADDED cart line. Only from empty search / grid / body. − never below 1. Skips placed and weighed lines. "Last added" is tracked on all add paths incl. customized | `OrderEntry.jsx` (`lastAddedKeyRef`) |
| P9 | Category list: Shift+Tab from search lands on the active category (roving tabIndex), ↑/↓ move, Enter/Space picks + cursor back to search | `CategoryPanel.jsx`, `OrderEntry.jsx` |

Popup convention used: popup root gets `data-kbd-modal` (only when ON) so order-screen shortcuts pause while a popup is open (`isKbdModalOpen()`).

## Test status (be honest with the user)
| Phase | Status |
|---|---|
| P0–P4 | Agent-tested in preview (screenshots/automation). Not formally user-confirmed |
| P5 | Agent-tested incl. Tab-loop fix; user confirmed "it works for me now" before the Tab fix, then asked for the fix |
| P6 | NOT live-tested: cafe103 test outlet has no weighed items; Goan Kitchen login failed |
| P7, P8, P9 | NOT live-tested: `preprod.mygenie.online` was not responding (curl timeouts, login request aborted). Code compiles |
| Testing agent | Not used for CR-482 so far |

Known open option (not approved yet): `+`/`-` keys inside the customization popup to change its quantity — user was offered it, did not choose it.

## Next phase: P10 — Ctrl+↓ jump into cart rows
Plain-language explanation for the user:
- From the search box, Ctrl+↓ moves the cursor into the cart (right side), starting at the newest item. (BUG-650: confirmed = bottom unsent row)
- ↑ / ↓ move between cart rows (orange ring on the row).
- `+` / `-` on a row change that row's quantity — same as its +/− buttons (− stops at 1; for items already sent to kitchen it can't go below the sent qty — existing rule).
- Delete removes an item NOT yet sent to kitchen (same as its bin button). Delete on sent items does nothing.
- Esc returns the cursor to the search box.
- Files: `CartPanel.jsx` (row tabIndex / data-kbd-cart-row / onKeyDown), `OrderEntry.jsx` (Ctrl+ArrowDown handler, onExitCart).
- Shortcuts OFF: no change.
Plan details: `/app/memory/plans/CR-482_IMPLEMENTATION_PLAN.md` → "### P10".

## Remaining after P10 (P11–P26)
P11 F2 search · P12 F8 Place/Update · P13 F7 Re-print KOT (+station picker) · P14 F4 Print Bill · P15 F9 Collect Bill · P16 Esc chain + "Unsaved items" confirm · P17 Esc on Customer/Custom Item/Notes popups · P18–P22 Dashboard (Tab/Enter cards, type table name, Enter opens, arrows, Esc clears) · P23 Alt+T Takeaway · P24 Alt+D Delivery · P25 full regression · P26 "?" shortcut help card.

## Environment / testing notes
- Preview URL: from `/app/frontend/.env` `REACT_APP_BACKEND_URL`.
- Test login used: `owner@cafe103.com` / `Qplazm@10` (cafe103; 427 items; customizable e.g. "Allfredo Pasta" (spelled with double L), "Akuri & Plain Paratha"; no weighed items found).
- Before testing, check preprod is up: `curl -m 20 https://preprod.mygenie.online/` — it was down at end of last session.
- In automation set `localStorage.setItem('mygenie_keyboard_shortcuts_enabled','true')` before login.
- Frontend has 1 pre-existing ESLint warning in OrderEntry.jsx (`useCallback` missing `isScheduled`, `scheduleAt`) — not ours.
- Never touch `.emergent/`. Bash writes into /app may be blocked by the harness — use file edit tools.
- Registry (`/app/memory/control/registry.json`, `CR_REGISTRY.md`) still shows CR-482 at Gate 3 plan complete; update per-phase smoke evidence there when convenient.
