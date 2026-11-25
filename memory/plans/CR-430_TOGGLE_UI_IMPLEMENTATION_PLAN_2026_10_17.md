# CR-430 — Implementation Plan (Gate 3)
## Auto-expand Served Items toggle UI — StatusConfigPage.jsx

**ID:** CR-430 (gap: toggle write-side missing)
**Stage:** Gate 3 | **Date:** 2026-10-17
**Risk:** LOW | **Role:** PLANNING Agent
**IA doc:** `/app/memory/impact/CR-430_TOGGLE_UI_IMPACT_ANALYSIS_2026_10_17.md`

---

## Code Reality: PARTIAL
Read side done — `OrderCard.jsx` L87: `localStorage.getItem('mygenie_served_auto_expand') !== 'false'`.
Write side (this plan) — NOT started.

## Conflict Pre-Check: NONE
`StatusConfigPage.jsx` not touched by any open item.

---

## Scope Lock
**WILL change:** `src/pages/StatusConfigPage.jsx` ONLY
**WILL NOT touch:** `OrderCard.jsx` · `DashboardPage.jsx` · `SettingsPanel.jsx` · any other file

---

## Exact Edits

### E-1 — Constants (after line 72)
After `const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';`
```javascript
// CR-430: Served Items Auto-expand toggle
const SERVED_AUTO_EXPAND_KEY = 'mygenie_served_auto_expand';
const SERVED_AUTO_EXPAND_FACTORY = true; // default ON
```

### E-2 — State (after line 203)
After `const [weightPromptEnabled, setWeightPromptEnabled] = useState(true);`
```javascript
  const [servedAutoExpand, setServedAutoExpand] = useState(SERVED_AUTO_EXPAND_FACTORY); // CR-430
```

### E-3 — Hydrate on mount (after line 354, end of CR-010 catch block)
```javascript
    // CR-430: hydrate Served Items Auto-expand preference
    try {
      const storedServed = localStorage.getItem(SERVED_AUTO_EXPAND_KEY);
      setServedAutoExpand(storedServed !== 'false'); // default ON
    } catch (e) {
      console.error('Failed to read served auto-expand flag:', e);
    }
```

### E-4 — Persist on Save (after line 558)
After `localStorage.setItem('mygenie_weight_prompt_enabled', ...);`
```javascript
    localStorage.setItem(SERVED_AUTO_EXPAND_KEY, servedAutoExpand ? 'true' : 'false'); // CR-430
```

### E-5 — Reset (after line 435)
After `setActiveMenuTypeSetting(ACTIVE_MENU_TYPE_DEFAULT); // CR-376`
```javascript
    setServedAutoExpand(SERVED_AUTO_EXPAND_FACTORY); // CR-430
```

### E-6 — Toggle card JSX (after line 1012, before CR-376 section)
```jsx
            {/* CR-430: Served Items Auto-expand toggle */}
            <div
              className="rounded-lg p-4 border-2 flex items-start justify-between gap-4 mt-3"
              style={{
                backgroundColor: servedAutoExpand ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                borderColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.borderGray,
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ color: COLORS.darkText }}>
                    Auto-expand Served Items
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.borderGray, color: '#fff' }}
                  >
                    {servedAutoExpand ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: COLORS.grayText }}>
                  When ON, served items automatically expand on an order card once all items are served.
                  Turn OFF to keep served items collapsed by default. Per-device setting.
                </p>
              </div>
              <button
                data-testid="served-auto-expand-toggle"
                onClick={() => { setServedAutoExpand(v => !v); setHasChanges(true); }}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
                style={{ backgroundColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.borderGray }}
                role="switch"
                aria-checked={servedAutoExpand}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: servedAutoExpand ? 'translateX(22px)' : 'translateX(2px)', marginTop: '2px' }}
                />
              </button>
            </div>
```

---

## Execution Sequence
1. E-1 → E-2 → E-3 → E-4 → E-5 → E-6
2. Compile check after E-6

---

## Risk Register
| Risk | Likelihood | Mitigation |
|---|---|---|
| localStorage key mismatch with OrderCard | CERTAIN | Key `'mygenie_served_auto_expand'` — verified identical |
| Default-ON logic mismatch | VERIFIED | Both use `!== 'false'` guard |
| JSX indentation break | LOW | Matched to 14-space Weight Prompt card indent |
| Factory reset only resets state (not localStorage) | ADDRESSED | Same pattern as all other toggles — localStorage written on next Save |

---

## Verification Matrix
| # | Test | Expected |
|---|---|---|
| V1 | Status Config page — toggle visible | Present after Weight Entry Prompt |
| V2 | First visit — toggle ON by default | Green border, "ON" pill |
| V3 | Toggle OFF → Save → reload | Stays OFF after reload |
| V4 | Toggle OFF → order with all items served | Served section stays collapsed |
| V5 | Toggle ON → order with all items served | Auto-expands |
| V6 | Factory Reset → toggle | Returns to ON |

---

## Post-Code Registry Checklist
```
□ registry.json: CR-430 → GATE_5A_IMPLEMENTED (gap closed)
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: StatusConfigPage.jsx + CR-430 + date
□ Code markers: // CR-430 on every new line
□ Compile: 0 new warnings
```

*Gate 3 complete — 2026-10-17. Awaiting Gate 4 GO.*
