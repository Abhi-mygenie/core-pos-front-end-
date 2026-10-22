# Implementation Plan — BUG-574
## Served item timing: static values → running counters (kitchen/no-kitchen two-path)

**Role:** PLANNING (Gate 3) · **Date:** 2026-10-16
**Based on:** `impact/BUG-574_IMPACT_ANALYSIS_2026_10_16.md` (GATE_2_CLOSED)
**Code Reality:** PARTIAL · Risk: MEDIUM · 1 file (OrderCard.jsx R5)

---

## Scope Lock
**WILL change:** `OrderCard.jsx:L846-852` (served items timing span)
**WILL NOT touch:** preparing/ready timers (L761-768, already correct), any other logic

---

## Step 0 — Entry Verification
```bash
sed -n '846,853p' src/components/cards/OrderCard.jsx
# Expected: {item.readyAt && item.createdAt && ( ... Prep: static ... Serve: static or nothing ...

grep -n "const \[now" src/components/cards/OrderCard.jsx
# Expected: L78 — const [now, setNow] = useState(Date.now())

grep -c "BUG-574" src/components/cards/OrderCard.jsx
# Expected: 0
```

---

## Two-path logic confirmed

| `item.readyAt` | Path | Timer formula |
|---|---|---|
| **set** (not null) | Kitchen config — item went through preparation | `Prep:${readyAt-createdAt}` (static) + `Serve:${now-serveAt}` (running) |
| **null** | No-kitchen config — item directly served | `Total:${now-createdAt}` (running) |

`now` = `useState(Date.now())` with 60s tick at L78-80. ✅
`serveAt` fallback: if null → use `readyAt` (item was ready just before being served).

---

## Edit E-1 — `OrderCard.jsx:L846-852`

```jsx
// BEFORE:
                    {item.readyAt && item.createdAt && (
                      <span className="text-[9px] ml-1" style={{ color: COLORS.grayText }}>
                        Prep: {formatElapsed(new Date(item.readyAt).getTime() - new Date(item.createdAt).getTime())}
                        {item.serveAt ? ` · Serve: ${formatElapsed(new Date(item.serveAt).getTime() - new Date(item.readyAt).getTime())}` : ''}
                      </span>
                    )}

// AFTER:
                    {item.createdAt && ( // BUG-574: two-path running counter — kitchen vs no-kitchen config
                      <span className="text-[9px] ml-1" style={{ color: COLORS.grayText }}>
                        {item.readyAt ? (
                          // Kitchen path: Prep (static: how long it cooked) + Serve (running: how long since served)
                          `Prep: ${formatElapsed(new Date(item.readyAt).getTime() - new Date(item.createdAt).getTime())} · Serve: ${formatElapsed(now - new Date(item.serveAt || item.readyAt).getTime())}`
                        ) : (
                          // No-kitchen path: Total (running: how long since item was punched)
                          `Total: ${formatElapsed(now - new Date(item.createdAt).getTime())}`
                        )}
                      </span>
                    )}
```

**Key changes:**
- Outer condition: `item.readyAt && item.createdAt` → `item.createdAt` (no-kitchen path has no readyAt)
- Kitchen path: `Serve` changes from `serveAt - readyAt` (static, 0m if null) → `now - serveAt` (running, fallback to `readyAt`)
- No-kitchen path: NEW — shows `Total: ${now - createdAt}` running counter

---

## Execution
Execute in **Session 2** (with BUG-572 E-2 + CR-430, all OrderCard.jsx R5 in one session).

---

## Verification Matrix
| # | Check | Expected |
|---|---|---|
| V1 | Kitchen config, served item: `Serve:` increments each minute | Running counter ✅ |
| V2 | Kitchen config, `serveAt` null: `Serve: now - readyAt` | Fallback works, no 0m |
| V3 | No-kitchen config, served item: shows `Total: Xm` | Running counter ✅ |
| V4 | Preparing item timer: `Prep: Xm` unchanged | L761-768 unchanged ✅ |
| V5 | Ready item timer: `Prep: Xm · Wait: Ym` unchanged | L764-768 unchanged ✅ |
| V6 | Compile clean | 0 new warnings |

## R5 Regression Checklist
| # | Test |
|---|---|
| R1 | `item.createdAt` null → no timing span shows (guard in place) |
| R2 | Items with `readyAt` null and NOT served → show only in Preparing timer (L761) |
| R3 | Aggregator items (different status flow) — timing still consistent |

## Post-Code Checklist
```
- [ ] registry.json: BUG-574 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md updated
- [ ] FILE_OWNERSHIP.md: OrderCard.jsx
- [ ] Code markers: BUG-574 at L846
- [ ] Compile: clean
```
