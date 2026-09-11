# Investigation Report — CR-376 Architecture Revision
## Menu Switch: Per-Order Tab Strip vs Local Station Setting

**Date:** 2026-09-10
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)
**Trigger:** Owner stated: *"ideally it should be local settings — at one time only one menu will be operational, user should be able to choose from local dashboard"*
**Scope:** Is the original OD-376-02 (tab strip per order) the right design? What is the correct architecture?
**Steps used:** 6/10
**Confidence:** HIGH

---

## 1. Summary

| | |
|-|-|
| **Finding** | OD-376-02 (per-order tab strip) does NOT match the owner's operational model. Owner wants a **station-level local setting** that sets the active menu for the whole device/shift — not a per-order switch. |
| **Classification** | OD REVISION REQUIRED — OD-376-02 must be re-opened and re-locked |
| **Architectural verdict** | The new design is cleaner, smaller, and follows an **existing pattern** in the codebase (QSR mode toggle in StatusConfigPage) |
| **Confidence** | HIGH |
| **Steps used** | 6/10 |

---

## 2. Root Cause of Mismatch

The original design assumed a **waiter's perspective**: each order independently selects which menu to use. The owner operates from a **management perspective**: the restaurant shifts to one menu type for an entire service period.

```
Owner's mental model:
"Tonight is a Party banquet" → manager sets Party on the local dashboard
→ every waiter on every table opens Party items automatically
→ no decision needed at order time

Original OD-376-02 mental model:
"Waiter opens order → sees tab strip → chooses Normal or Party for this order"
→ different orders could run different menus simultaneously
→ management has no control at the service-period level
```

---

## 3. Exact Existing Pattern — QSR Mode (the blueprint)

The codebase already has an identical pattern for QSR Mode. CR-376 should follow it exactly:

```
QSR Mode (existing):
StatusConfigPage → toggle "QSR Mode"
  → localStorage.setItem('mygenie_qsr_mode_enabled', 'true')
  → handleSave() persists it (line 540)

OrderEntry.jsx (line 107):
  const qsrMode = useMemo(() => getQsrModeEnabled(), [])
  → entire Order Entry adapts to QSR mode on open
  → no per-order switch — it's a station setting

Active Menu (new — same pattern):
StatusConfigPage → radio/select "Active Menu Type"
  → localStorage.setItem('mygenie_active_menu_type', 'Party')
  → handleSave() persists it

MenuContext.jsx / OrderEntry.jsx:
  const activeMenuType = useMemo(
    () => localStorage.getItem('mygenie_active_menu_type') || 'Normal', []
  )
  → Order Entry opens showing only Party items
  → No tab strip needed
```

`StatusConfigPage` already has ~20 localStorage keys managed via `handleSave()`. Adding one more is zero-risk, zero-architecture-change.

---

## 4. Two Final Design Options

### Design A — Pure Local Setting (Recommended)

```
StatusConfigPage → "Active Menu" section:
  ○ Normal (default)
  ○ Party
  ○ Premium
  → Saved to localStorage on "Save Settings"

Order Entry:
  → Opens with items from active menu only
  → Small passive chip in header: "Party Menu" (orange pill)
  → No tab strip at all
  → Staff see exactly what the manager configured — zero cognitive load
```

**Best for:** Most restaurants — clean, simple, management-driven.

---

### Design B — Local Default + Per-Order Override

```
StatusConfigPage → "Default Menu" → sets the device default
  → OrderEntry opens with default menu active

Order Entry:
  → Small collapsible tab strip (not prominent)
  → Waiter CAN override for one order (doesn't change the station setting)
  → Station default persists across orders
```

**Best for:** Restaurants that sometimes mix menus mid-service.

---

## 5. Impact on Original Owner Decisions

| OD | Original Decision | New Status |
|----|------------------|-----------|
| OD-376-01 | No mixing per order — lock after first item | ✅ STILL VALID — keep |
| **OD-376-02** | Tab strip above item grid | 🔴 **MUST RE-OPEN** — owner wants local setting, not per-order tab |
| OD-376-03 | Reset category on switch | ⚠️ PARTIALLY RELEVANT — if Design B kept, still applies. If Design A, less relevant |
| OD-376-04 | Dynamic labels from DB | ✅ STILL VALID — keep |

---

## 6. Code Impact (New Design vs Original)

| File | Original tab strip | New local setting |
|------|-------------------|------------------|
| `productTransform.js` | 1 line — same | 1 line — same |
| `MenuContext.jsx` | ~15 lines — `selectedMenuType` state + setter | ~8 lines — read localStorage on init, simpler |
| `OrderEntry.jsx` | ~20 lines — tab strip JSX + lock logic | ~5 lines — passive chip indicator only |
| `StatusConfigPage.jsx` | No change needed | ~15 lines — Active Menu section + save |
| `LoadingPage.jsx` | ~5 lines | ~5 lines — same |
| **TOTAL** | ~41 lines | **~34 lines — smaller** |

New design is architecturally simpler AND smaller.

---

## 7. New Owner Decisions Needed

| OD | Question | Agent Recommendation |
|----|----------|---------------------|
| **OD-376-02 (REOPEN)** | Design A (pure local setting, no tab strip) or Design B (local default + optional per-order override tab)? | **Design A** — matches owner's stated model, cleanest for staff |
| **OD-376-05 (NEW)** | Where does the setting live? Option X: StatusConfigPage (same page as QSR/Channel toggles). Option Y: Prominent selector on the Dashboard header/top bar (always visible, quick-change mid-service). | **Option X (StatusConfigPage)** follows existing pattern, but Option Y may be better UX for quick service-period switch |
| **OD-376-06 (NEW)** | Fallback: if active menu has zero items (e.g., Party menu not set up yet), auto-fallback to Normal silently, or show an empty-state message? | Auto-fallback to Normal with a small warning toast |

---

## 8. Retroactive Candidates

None.

---

## 9. Recommendations

1. **Re-open OD-376-02** — present Design A vs Design B to owner. Get decision.
2. **Ask OD-376-05** — StatusConfigPage vs Dashboard header selector.
3. **Ask OD-376-06** — fallback behaviour.
4. Once locked → update Implementation Plan (Gate 3) with revised scope.
5. The change is architecturally smaller than the original — if Design A chosen, OrderEntry barely changes.

---

*Investigation complete. 6/10 steps. HIGH confidence. OD-376-02 must be re-opened before Gate 2 can proceed.*
