# BUG-563 — Impact Analysis (Gate 2)

**ID:** BUG-563 · **Date:** 2026-10-15 · **Role:** PLANNING (Gate 2)
**Code Reality:** PARTIAL — `w-32 xl:w-44` exists (BUG-555 A8). `title` attr exists (BUG-555 A9) — hover only. No w-36, no touch affordance.
**Conflict Pre-check:** NONE — last modifier BUG-555 WP-A (CLOSED 2026-10-15). CR-376-FU-B also CLOSED. No active item touches CategoryPanel.jsx.
**OD-563-01:** LOCKED = **(a)** `w-32` → `w-36` (144px). Owner 2026-10-15.
**Risk:** LOW

---

## 1. Root cause trace

```
Touch device (<1280px viewport) opens Order Entry
  → CategoryPanel renders at w-32 (128px) — set by BUG-555 A8
  → inner text area = 128 - px-3×2 = 104px
  → at text-sm (14px), ~8 chars before <span className="truncate"> fires
  → "Indo-Fusion Menu" → "Indo-Fusio..." — truncated
  → browser title tooltip requires hover — touch devices have no hover
  → user CANNOT read full category name
```

**BUG-555 A9 gap:** `title` attr was added as a mitigation but only works via mouse hover. On touch/tap, `title` never fires. The mitigation is desktop-only.

---

## 2. Fix: w-32 → w-36 (OD-563-01=a)

`w-36` = 9rem = **144px** at tablet (<1280px). `xl:w-44` (176px) at ≥1280px stays **unchanged**.

**Text area after fix:**
- 144px − px-3×2 (24px) = **120px** for text (was 104px, gain +16px)
- At 14px font: ~11-12 chars before truncation (was ~8)
- "Indo-Fusion Menu" → "Indo-Fusion M..." (was "Indo-Fusio...")
- "subject one (test)" → "subject one (t..." (was "subject one (...")
- Short names (Popular, All, Break) → unchanged, fully visible

**Width budget after change (OD-555-12=a: CPP fixed at w-96 = 384px):**

| Viewport | Rail | Cat (NEW 144px) | CPP | Middle | Min needed | Status |
|---|---|---|---|---|---|---|
| 800px | 56px | 144px | 384px | **216px** | 140px (search min-w) | ✅ |
| 893px | 56px | 144px | 384px | **309px** | 140px | ✅ |
| 1006px | 56px | 144px | 384px | **422px** | 140px | ✅ |
| 1024px | 56px | 144px | 384px | **440px** | 140px | ✅ |
| ≥1280px | 280px (full) | 176px (xl:w-44, unchanged) | 384px | 1000px+ | — | ✅ unchanged |

No overflow at any supported viewport. Middle panel loses 16px at all tablet widths — still comfortably above the 140px search bar floor.

---

## 3. Files affected

| File | Change | Type |
|---|---|---|
| `src/components/order-entry/CategoryPanel.jsx` | L32: `w-32` → `w-36` | 1 char (Tailwind class) |

**Files NOT touched:** OrderEntry.jsx, Sidebar.jsx, any report page, any API/service/transform, any test file.

---

## 4. Downstream consumers

- `CategoryPanel` is imported only by `OrderEntry.jsx` (L23: `import CategoryPanel from "./CategoryPanel"`)
- Width change is CSS-only — no prop, no state, no API impact
- Test `__tests__/CategoryPanel.cr376fub.test.jsx` tests data/count logic, NOT width classes — unaffected

---

## 5. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Middle panel too narrow | NONE — verified at 800px: 216px remains | Width budget table above |
| Desktop layout changed | NONE — xl:w-44 (176px) unchanged | `xl:w-44` stays in place |
| CPP clipping | NONE — OD-555-12=a CPP at 384px untouched | — |
| Test regressions | NONE — only CSS class, no logic change | — |

---

## 6. Open Owner Decisions

None. OD-563-01 = (a) LOCKED.

---

## Summary

**Code Reality:** PARTIAL (target line exists, fix is 1 char change)
**Scope:** 1 file, 1 line, 1 char (`w-32` → `w-36`)
**Risk:** LOW — layout-only, no logic, no API, no financial
**Fast Lane eligible:** YES — all criteria met
