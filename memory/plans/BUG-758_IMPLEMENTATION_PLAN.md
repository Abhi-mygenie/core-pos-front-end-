# Implementation Plan — BUG-758
## Order View: Item-level Prep/Serve Times Show Raw Hours Instead of Days

**Date:** 2026-11-27
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Based on IA:** `impact/BUG-758_IMPACT_ANALYSIS.md`
**Risk:** LOW
**OD locked:** None required
**Awaiting:** Gate 4 GO

---

## 1. Entry Verification

Anchor verified at HEAD (2026-11-27):

| Edit | File | Lines | Current content | Match? |
|------|------|-------|-----------------|--------|
| E1 | `OrderCard.jsx` | 17–25 | `// CR-099: Format elapsed milliseconds as "Xm" or "Xh Ym"` + full function body | ✅ |

---

## 2. Scope Lock

**Files WILL change:**
- `src/components/cards/OrderCard.jsx` — `formatElapsed` function body (L18-25): add days branch (+4 lines)

**Files WILL NOT touch:**
- `src/components/cards/TableCard.jsx` — reference only, already correct
- Any API, transform, service, context, or provider file
- The 4 call sites at L808/L813/L891/L894 — unchanged; they receive corrected output automatically

---

## 3. The Single Edit

**File:** `src/components/cards/OrderCard.jsx`
**Scope:** Replace `formatElapsed` function body (L17–25)

### CURRENT (broken — 9 lines):
```javascript
// CR-099: Format elapsed milliseconds as "Xm" or "Xh Ym"
const formatElapsed = (ms) => {
  if (!ms || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
```

### NEW (correct — 13 lines):
```javascript
// CR-099: Format elapsed milliseconds as "Xm", "Xh Ym", or "Xd Yh"
// BUG-758: add days branch — mirrors TableCard.formatDuration for consistency
const formatElapsed = (ms) => {
  if (!ms || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const days = Math.floor(h / 24);
  if (days > 0) {
    const remH = h % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
```

### Line-by-line change explanation

| Change | Why |
|--------|-----|
| Comment updated: `"Xm" or "Xh Ym"` → `"Xm", "Xh Ym", or "Xd Yh"` | Accurate documentation |
| Added `// BUG-758` marker | Registry / traceability |
| `const days = Math.floor(h / 24)` | Compute day count |
| `if (days > 0) { ... }` | Days branch — fires when ≥ 24h elapsed |
| `return remH > 0 ? \`${days}d ${remH}h\` : \`${days}d\`` | Show "4d 23h" or "5d" |
| Hours + minutes lines unchanged | Preserves correct output for < 24h |

### Output comparison

| Input (ms) | Old output | New output |
|---|---|---|
| 2,400,000 (40m) | `40m` ✅ | `40m` ✅ |
| 5,400,000 (1h 30m) | `1h 30m` ✅ | `1h 30m` ✅ |
| 86,400,000 (24h exactly) | `24h` ❌ | `1d` ✅ |
| 430,620,000 (119h 47m) | `119h 47m` ❌ | `4d 23h` ✅ |
| 1,584,000,000 (440h) | `440h` ❌ | `18d 8h` ✅ |
| 7,999,560,000 (2222h 26m) | `2222h 26m` ❌ | `92d 14h` ✅ |

---

## 4. All 4 Call Sites — Unchanged, Auto-Fixed

| Line | Context | Before fix | After fix |
|------|---------|-----------|-----------|
| L808 | Preparing item — live prep counter | Correctly shows `Xm` / `Xh Ym` (< 24h in practice) | Unchanged for <24h; days if somehow exceeds |
| L813 | Ready item — prep elapsed + wait time | Same | Same |
| L891 | Served item (kitchen) — `Prep: X · Serve: Y` | Serve shows `119h 47m` ❌ | Serve shows `4d 23h` ✅ |
| L894 | Served item (no-kitchen) — `Total: Y` | Total shows `440h 59m` ❌ | Total shows `18d 8h` ✅ |

---

## 5. Verification Matrix

| # | Edit | Description | How to Verify | Auto? |
|---|------|-------------|---------------|:-----:|
| V1 | E1 | Served items with >24h show days | Dashboard → Order View → expand any long-open served order → Serve/Total column | Manual |
| V2 | E1 | Prep time (< 24h) unchanged | Dashboard → any active preparing item → Prep shows minutes correctly | Manual |
| V3 | E1 | "Serve: 4d 23h" replaces "Serve: 119h 47m" | Screenshot comparison with owner-provided evidence | Manual |
| V4 | E1 | Order-level dots and item-level now consistent | Order card shows "3d" dot; item shows "4d 23h" — both in days range | Manual |
| V5 | compile | Webpack 0 new warnings | `tail -n 5 /var/log/supervisor/frontend.out.log` | Auto |

**Test account:** `owner@palmhouse.com / Qplazm@10` (RID 541) — has long-open served orders visible in Order View

---

## 6. Risk Register

| Risk | Level | Note |
|------|-------|------|
| Preparing/Ready items (< 24h) affected | NONE | Days branch only fires when `days > 0` (≥ 24h); normal <24h path unchanged |
| Print bill output changes | NONE | formatElapsed not used in print pipeline |
| Any external consumer breaks | NONE | formatElapsed is a module-level const, not exported |
| Conflict with open items on OrderCard.jsx | NONE | 0 open items on this file in registry |
| `remH = 0` edge case (exactly 24h, 48h, etc.) | NONE | Returns `${days}d` cleanly (no "0h" appended) |

---

## 7. Execution Sequence

```
1. Verify anchor at L17-25 matches plan exactly (search_replace will fail fast if not)
2. Apply single search_replace: replace formatElapsed function (9 lines → 13 lines)
3. Wait for webpack hot-reload → check "webpack compiled with 1 warning" (pre-existing only)
4. Manual browser test V1–V4 using owner@palmhouse.com on Order View
5. Execute Post-Code Registry Checklist
```

One search_replace call. No staging. No partial edits.

---

## 8. Post-Code Registry Checklist

```
[ ] registry.json: BUG-758 → status: GATE_5A_IMPLEMENTED, sprint_key: dec_sprint
[ ] BUG_TRACKER.md: row added for BUG-758 → GATE_5A_IMPLEMENTED | LOW | dec_sprint | OrderCard.jsx
[ ] FILE_OWNERSHIP.md: OrderCard.jsx entry → BUG-758 + 2026-11-27
[ ] Code marker: // BUG-758 comment in formatElapsed ✓ (already in plan above)
[ ] Webpack: confirm "webpack compiled with 1 warning" (pre-existing allDays only — 0 NEW)
```

---

## 9. Handover to Implementation

```
Plan: BUG-758 — 1 file, 1 search_replace, 9 lines → 13 lines.
File: src/components/cards/OrderCard.jsx
Edit: replace formatElapsed function body (L17–25).
Code Reality: NONE — no days branch at HEAD.
Conflict: NONE.
OD: none required.
Verification: V1–V4 manual (Order View, served items) + V5 webpack auto.
Test account: owner@palmhouse.com / Qplazm@10 (RID 541)
Awaiting Gate 4 GO.
```
