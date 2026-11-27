# QA Handover — BUG-758
## Order View: Item-level Prep/Serve Times Now Show Days

**Date:** 2026-11-27
**EXIT GATE:** 5/5 PASS
**Push status:** Holding — not pushed to remote (owner direction)

---

## 1. Inherited from Plan (Verification Matrix)

| Edit | File | Change | Self-Test Result |
|------|------|--------|:---:|
| E1 | `OrderCard.jsx` L17-30 | Added days branch to `formatElapsed` | ✅ 10/10 logic cases PASS (Python verification) |
| marker | L18 | `// BUG-758` present | ✅ |
| webpack | — | 0 new warnings | ✅ "webpack compiled with 1 warning" (pre-existing allDays only) |

---

## 2. Manual Test Cases (browser — owner@palmhouse.com / Qplazm@10, RID 541)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Served items >24h show days | Dashboard → Order View → expand any long-open served order | `Serve: 4d 23h` or `Total: 18d 8h` (not raw hours) |
| V2 | Active prep items (<24h) unchanged | Dashboard → any currently Preparing item | `Prep: 4m` / `Prep: 1h 30m` — minutes/hours unchanged |
| V3 | Exactly 1d shows "1d" (no "0h") | — | `1d` not `1d 0h` |
| V4 | Order-level dots consistent with item-level | Order dot shows "3d"; item shows "4d 23h" — both in days range | No more mismatch between dots and item times |
| V5 | Revert check | No `Serve: 119h 47m` or `Total: 440h 59m` visible | ✅ — raw hours gone |

---

## 3. Logic Verification (10/10 PASS — no browser needed)

| Input | Old broken | New correct |
|-------|-----------|-------------|
| 40m | 40m ✅ | 40m ✅ |
| 1h 30m | 1h 30m ✅ | 1h 30m ✅ |
| 24h exactly | 24h ❌ | 1d ✅ |
| 119h 47m | 119h 47m ❌ | 4d 23h ✅ |
| 440h | 440h ❌ | 18d 8h ✅ |
| 2222h 26m | 2222h 26m ❌ | 92d 14h ✅ |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-758 → GATE_5A_IMPLEMENTED 2026-11-27, sprint_key: dec_sprint
EXIT GATE: 5/5 PASS
```

---

## 5. Credentials + Environment

| Item | Value |
|------|-------|
| App URL | https://genie-core-pos-2--0px7nr5e.preview.emergentagent.com |
| Test account | owner@palmhouse.com / Qplazm@10 (RID 541) |
| File changed | `src/components/cards/OrderCard.jsx` L17-30 |
