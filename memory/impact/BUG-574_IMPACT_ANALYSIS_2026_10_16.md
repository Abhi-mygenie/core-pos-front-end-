# Impact Analysis — BUG-574
## Served item timing: static historical values → running counters; two-path logic for kitchen/no-kitchen config

**Role:** PLANNING (Gate 2) · **Date:** 2026-10-16 · **Code Reality:** PARTIAL
**Conflict:** CR-430 (L857) · CR-433 (L728/747) — CLEAN (different lines) · BUG-574 at L846-851
**Files:** `OrderCard.jsx` (R5 only)

---

## OD-574-01 — LOCKED (2026-10-16, NOT backend blocked)
Discriminator: `item.readyAt` presence determines which path was used.

**Two configurations:**

| Config | Kitchen? | item.readyAt | Timer formula |
|---|---|---|---|
| Default=Ready (cooking) | Yes → food_status: 1→2→5 | SET | Kitchen path |
| Default=Serve/Bill | No → direct serve | NULL | No-kitchen path |

**Kitchen path (readyAt exists):**
- `Prep: static ${readyAt - createdAt}` — historical, how long it cooked (OK to keep static)
- `Serve: running ${now - serveAt}` — how long since it was served (RUNNING COUNTER) ← fix
- If `serveAt` is null: fallback `now - readyAt`

**No-kitchen path (readyAt null):**
- `Total: running ${now - createdAt}` — how long since item was punched (RUNNING COUNTER)

`now` = `useState(Date.now())` with 60s interval tick at `OrderCard.jsx:L78` ✅

---

## Current code (L846-851) — WRONG: static historical
```js
{item.readyAt && item.createdAt && (
  <span>
    Prep: {formatElapsed(readyAt - createdAt)}      // static — how long it TOOK to cook
    {item.serveAt ? ` · Serve: ${formatElapsed(serveAt - readyAt)}` : ''}  // static — 0m if serveAt null
  </span>
)}
```

## Fix (1 file, L846-851)
```jsx
{item.createdAt && (
  <span className="text-[9px] ml-1" style={{ color: COLORS.grayText }}>
    {item.readyAt ? ( // BUG-574: kitchen path — Prep (static) + Serve (running since served)
      <>
        Prep: {formatElapsed(new Date(item.readyAt).getTime() - new Date(item.createdAt).getTime())}
        {' · '}Serve: {formatElapsed(now - new Date(item.serveAt || item.readyAt).getTime())}
      </>
    ) : ( // BUG-574: no-kitchen path — total time from punch (running)
      <>Total: {formatElapsed(now - new Date(item.createdAt).getTime())}</>
    )}
  </span>
)}
```

**Changes:**
- Served (kitchen): `Serve` changes from `serveAt - readyAt` (static) → `now - serveAt` (running)
- Served (no-kitchen): NEW branch: shows `Total: ${now - createdAt}`
- `serveAt` fallback to `readyAt` handles null `serveAt` gracefully

## Risk: MEDIUM · R5 · 1 file · ~8 lines
## Verification
- V1: Kitchen config — served item shows running "Serve: Xm" (increments each minute) ✅
- V2: No-kitchen config — served item shows running "Total: Xm" ✅
- V3: `serveAt` null → shows `now - readyAt` fallback (no 0m) ✅
- V4: Preparing + Ready timers unchanged ✅
