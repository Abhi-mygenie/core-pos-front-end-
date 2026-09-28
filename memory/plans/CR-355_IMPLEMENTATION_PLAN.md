# CR-355 IMPLEMENTATION PLAN — Sidebar Printers Shortcut (Fast Lane)
**Date:** 2026-08-31
**Stage:** Gate 3 — Implementation Plan (Fast Lane)
**Risk:** LOW | **Files:** 1 | **Lines changed:** 1
**Execution Order:** #1 — First (instant win, no risk)

---

## Step 0 — Entry Verification (MANDATORY)
Plan says: `Sidebar.jsx:115` reads `{ id: "printers", label: "Printers", comingSoon: true }`
→ **VERIFIED** — matches current file (viewed 2026-08-31)

---

## Edit 1 — Sidebar.jsx:115 — Remove comingSoon, add path

| Field | Value |
|---|---|
| File | `src/components/layout/Sidebar.jsx` |
| Line | 115 |
| Current | `{ id: "printers", label: "Printers", comingSoon: true },` |
| New | `{ id: "printers", label: "Printers", path: "/settings" }, // CR-355` |

**Why:** `comingSoon: true` makes Sidebar.jsx:381 show "Coming Soon" toast and return before navigating. Removing it + adding `path: "/settings"` causes `navigate(child.path)` at line 387 to execute, taking the user to the Settings page where the Printers tile is accessible.

---

## Verification Matrix

| # | How to Verify | Expected |
|---|---|---|
| V1 | Click Sidebar → Settings → Printers | Navigates to /settings (no toast) |
| V2 | URL check after click | URL = /settings |
| V3 | Other comingSoon items unaffected | Operating Hours / Cancellation Reasons still show Coming Soon toast |

---

## Post-Code Registry Checklist
- [ ] registry.json: CR-355 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: `Sidebar.jsx` listed under CR-355
- [ ] Code marker: `// CR-355` in modified line
- [ ] Compile check: webpack 0 new warnings
