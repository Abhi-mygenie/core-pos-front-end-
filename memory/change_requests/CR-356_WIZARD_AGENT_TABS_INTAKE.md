# CR-356 INTAKE — Wizard Step 2: Printer Agent Tabs 2/3/4 (Replace Placeholders)
**Date:** 2026-09-01
**Source:** Owner Option B — deferred scope from CR-352, registered as standalone
**Status:** CLOSED — WONTFIX
**Closed:** 2026-09-01
**Owner decision:** Redirect text is acceptable. Printer Agent is configured via Settings → All Settings → Printers. No wizard embedding needed.
**Related:** CR-352 (parent scope), CR-133 (Printer Agent config screen), CR-353 (Station Mapping)

---

## What & Why

In the Restaurant Settings Wizard (`/restaurant-settings`), Step 2 has 4 tabs:

| Tab | Direct Printer | Printer Agent (current) |
|---|---|---|
| Basic Settings | KOT settings ✅ | KOT settings ✅ |
| Printers | `StationsTab` ✅ | **Placeholder text** ⬜ |
| Bill Content | `BillContentTab` (local) ✅ | **Placeholder text** ⬜ |
| Bill Style | `BillStyleTab` (local) ✅ | **Placeholder text** ⬜ |

Placeholder text for all 3 Agent tabs reads:
> *"[Setting] settings are managed via **Settings → All Settings → Printers**."*

This CR replaces those 3 placeholder divs with real Printer Agent configuration.

---

## Code Reality: NONE

`RestaurantSettingsPage.jsx` imports only local printer tabs (lines 15–17):
```js
import { StationsTab }    from "../components/panels/settings/localPrinter/StationsTab";    // CR-352
import { BillContentTab } from "../components/panels/settings/localPrinter/BillContentTab"; // CR-352
import { BillStyleTab }   from "../components/panels/settings/localPrinter/BillStyleTab";   // CR-352
```

No Printer Agent tab components are imported. The 3 placeholder divs are at lines 524–526, 532–534, 540–542.

---

## Duplicate Check: DISTINCT (RELATED to CR-352)

CR-352 notes explicitly say *"Printer Agent Tabs 2/3/4 deferred (after Direct Printer smoke)"*. That scope was never built — this CR formally registers it as a separate item. Not a duplicate.

---

## Owner Decision Required — OD-1 (MUST resolve before Gate 3)

**How should the Printer Agent wizard tabs behave?**

The Printer Agent config tabs (`PrintersTab`, `AutoPrintTab`, `BillContentTab`, `PrintStyleTab` in `printerConfig/`) all load their data via `getConfig()` + `saveConfig()` from `printerAgentConfigService`, independent of the wizard's step-save flow.

Three options:

| Option | Behaviour | Effort | Notes |
|---|---|---|---|
| **A — Independent load/save** | Each tab loads/saves on its own (same as the full Settings screen). Wizard Save button does NOT include Printer Agent config. | Medium | Two separate save flows — user must save each Agent tab independently + save the wizard. |
| **B — Embed full PrinterAgentConfigView** | Replace all 3 placeholder tabs with a single embedded `PrinterAgentConfigView` block (shows all 6 Agent tabs inside Step 2). | Low | Cleanest — full config available in wizard, no new wiring needed. |
| **C — Keep redirect (as-is)** | Leave placeholders as-is. Wizard just points users to the full Settings screen. | Zero | Acceptable short-term; user does two steps. CR-356 is then closed as WONTFIX. |

**Recommended: Option A** — each tab embeds the matching Agent component and handles its own load/save, consistent with how `PrinterMappingTab` and `StationMappingTab` work inside `PrinterAgentConfigView` (they each own their data).

---

## Blast Radius

| Field | Value |
|---|---|
| Files WILL change | `RestaurantSettingsPage.jsx` (1 file — replace 3 placeholder divs + add imports) |
| Files will NOT touch | All Printer Agent tab components (no changes to them) |
| Scope | SMALL (1 file, 3 substitutions) |
| Hotspot? | `RestaurantSettingsPage.jsx` is a 815-line wizard file — Medium caution. Not in R5 hotspot list. |

---

## Severity Rubric

| | Value |
|---|---|
| Severity | **P2 — MEDIUM** |
| Reason | Feature missing (no Printer Agent config in wizard), but workaround exists (Settings → All Settings → Printers). Not blocking core order/billing flow. |
| Fast Lane eligible? | NO — owner decision needed + 1 import per tab change |

---

## Evidence

| Evidence | Value |
|---|---|
| Source | Owner decision 2026-09-01 — Option B (standalone CR) |
| Code trace | `RestaurantSettingsPage.jsx:522-545` — placeholder divs |
| Related CR | CR-352 registry notes — "Printer Agent Tabs 2/3/4 deferred" |
| Confidence | CONFIRMED — code examined, placeholder lines verified |

---

## Next Gate

Gate 2 (Impact Analysis) — after owner answers **OD-1** above.

**I will not proceed to planning until owner confirms which option (A, B, or C) for the wizard tab behaviour.**
