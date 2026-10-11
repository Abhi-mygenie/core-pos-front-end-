# BUG-501 — Intake

**ID:** BUG-501
**Date:** 2026-10-06
**Source:** AGENT-DISCOVERED (INV-LOGIN-BOOKING-PHASE_2026_10_06 F1 / INV-501 C1)
**Severity:** P3 — LOW
**Risk:** LOW (cosmetic — stale copyright year in footer)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT (C1 from Track A / INV-501 — now formally registered)
**Blast radius:** SMALL (1 file, 1 line)
**Fast Lane eligible:** YES (LOW risk, 1 file, 1 line, no logic change)

---

## Description

The Login page footer shows a hardcoded copyright year:

```
© Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved.
```

`LoginPage.jsx L268` — year is hardcoded as the string `"2025"`.

From 2026 onward this is stale. Should use `{new Date().getFullYear()}` so it always shows the current year.

---

## Owner Decisions

No OD needed. Purely cosmetic, one-line change. Clear fix.

---

## Fix Scope

| # | File | Site | Current | New |
|---|------|------|---------|-----|
| E1 | LoginPage.jsx | L268 | `© Mygenie 2025.` | `© Mygenie {new Date().getFullYear()}.` |

**1 file, 1 line, no logic change.**

---

## Fast Lane Declaration

```
FAST LANE ELIGIBLE
ID: BUG-501
Risk: LOW
File: src/pages/LoginPage.jsx
Lines: 1
No API / state / financial / auth / hotspot change
No conflict in FILE_OWNERSHIP.md
```

Owner approval required to proceed as Fast Lane.

---

## Verification

- Browser: Login page footer shows "© Mygenie 2026." (or current year)

---

## Post-Code Checklist

```
- [ ] registry.json: BUG-501 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: new row added
- [ ] FILE_OWNERSHIP.md: LoginPage.jsx — BUG-501 2026-10-06
- [ ] Code markers: // BUG-501
- [ ] Compile: 0 new warnings
```

---

**Status:** GATE_1_INTAKE → Fast Lane eligible (owner approval needed)
