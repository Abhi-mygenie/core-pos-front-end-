# Implementation Plan — CR-146: Aggregator Client/Branch Selector Dropdown

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-16
**Based on:** `memory/impact/CR-146_CLIENT_DROPDOWN_IMPACT_ANALYSIS.md`
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Pre-Plan Verification

| Target | IA Claim | Live Code | Match? |
|---|---|---|---|
| `clients` state at L27 | `const [clients, setClients] = useState([]);` | Confirmed L27 ✅ | ✅ |
| `foods` passed to ProductList at L272 | `foods={foods}` | Confirmed L272 ✅ | ✅ |
| `foods` passed to BulkEditor at L243 | `foods={foods}` | Confirmed L243 ✅ | ✅ |
| `categoriesWithCounts` uses `foods` at L139 | `foods.forEach((f) => {...})` | Confirmed L139 ✅ | ✅ |
| Header `<select>` ends at L183 | `</select>` after `menuTypes.map(...)` | Confirmed L183 ✅ | ✅ |
| `menuType === 'Aggregator'` trigger at L129 | `if (menuType === 'Aggregator') fetchClients()` | Confirmed L129 ✅ | ✅ |

---

## Scope Lock

| File | Change | Touch? |
|---|---|---|
| `components/panels/MenuManagementPanel.jsx` | 5 edits (state + reset + useMemo × 2 + dropdown JSX + prop updates × 2) | ✅ YES |
| All other files | — | ❌ NO |

---

## Execution Order

```
Edit 1 → Add selectedClientId state (after clients state at L27)
Edit 2 → Add reset useEffect (after CR-140 B1 useEffect at L134)
Edit 3 → Add filteredFoods useMemo (after handleStockToggleDone callback)
Edit 4 → Update categoriesWithCounts to use filteredFoods (L139)
Edit 5 → Add client dropdown JSX in header (after menuType <select> closes at L183)
Edit 6 → Update ProductList to receive filteredFoods (L272)
Edit 7 → Update BulkEditor to receive filteredFoods (L243)
```

---

## Edit 1 — Add `selectedClientId` state

**Location:** Line 27, after `const [clients, setClients] = useState([]);`

**Insert after L27:**
```js
  const [selectedClientId, setSelectedClientId] = useState(null); // CR-146: null=All, 0=Main Branch, N=client id
```

---

## Edit 2 — Add reset useEffect

**Location:** After the CR-140 B1 useEffect (L127-134).

**Current anchor (unique):**
```js
  }, [isOpen, menuType, fetchClients]); // CR-140
```

**Insert after:**
```js
  // CR-146: reset client filter when menu type leaves Aggregator
  useEffect(() => {
    if (menuType !== 'Aggregator') setSelectedClientId(null);
  }, [menuType]);
```

---

## Edit 3 — Add `filteredFoods` useMemo

**Location:** After `handleStockToggleDone` callback (which is after `fetchFoods`).

**Current anchor (unique):**
```js
  }, [fetchFoods]);
```
*(This is the closing of `handleStockToggleDone` useCallback)*

**Insert after:**
```js
  // CR-146: filter foods by selected client — frontend-only (API ignores client_id param)
  // null=All, 0=Main Branch (clientId===0), N=specific brand (clientId===N)
  const filteredFoods = useMemo(() => {
    if (menuType !== 'Aggregator' || selectedClientId === null) return foods;
    return foods.filter(f => f.clientId === selectedClientId);
  }, [foods, menuType, selectedClientId]);
```

---

## Edit 4 — `categoriesWithCounts` → use `filteredFoods`

**Current (L137-147):**
```js
  const categoriesWithCounts = useMemo(() => {
    const countMap = {};
    foods.forEach((f) => {
```

**New:**
```js
  const categoriesWithCounts = useMemo(() => {
    const countMap = {};
    filteredFoods.forEach((f) => { // CR-146: count from filtered view
```

---

## Edit 5 — Client dropdown JSX in header

**Location:** In the header `<div className="flex items-center gap-4">`, after the closing `</select>` of the menuType selector (L183) and before `{loading && ...}` (L184).

**Current anchor (unique):**
```jsx
          </select>
          {loading && !bulkEditMode && (
```

**New:**
```jsx
          </select>
          {/* CR-146: Client/branch selector — only when Aggregator + has sub-brands */}
          {menuType === 'Aggregator' && clients.length > 0 && (
            <select
              value={selectedClientId === null ? '' : String(selectedClientId)}
              onChange={(e) => setSelectedClientId(e.target.value === '' ? null : Number(e.target.value))}
              className="px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="client-selector"
            >
              <option value="">All</option>
              <option value="0">Main Branch</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          )}
          {loading && !bulkEditMode && (
```

---

## Edit 6 — ProductList → receive `filteredFoods`

**Current (L271-272):**
```jsx
            <ProductList
              foods={foods}
```

**New:**
```jsx
            <ProductList
              foods={filteredFoods} // CR-146: filtered by client/branch
```

---

## Edit 7 — BulkEditor → receive `filteredFoods`

**Current (L242-243):**
```jsx
          <BulkEditor
            foods={foods}
```

**New:**
```jsx
          <BulkEditor
            foods={filteredFoods} // CR-146: filtered by client/branch
```

---

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `filteredFoods` useMemo depends on `filteredFoods` in categoriesWithCounts | Execution order: Edit 3 (declare filteredFoods) BEFORE Edit 4 (use it). React evaluates useMemo lazily — order in code matters. ✅ |
| R2 | `<select value={selectedClientId === null ? '' : String(selectedClientId)}>` — null handling | Empty string `''` maps to "All" option. `Number('')` would be 0 → prevent this with `e.target.value === ''` check. ✅ |
| R3 | BulkEditor loses unsaved changes when client switches | Same behaviour as switching menu type (existing pattern). Acceptable. |
| R4 | `handleStockToggleDone` anchor — is it unique? | Check: `}, [fetchFoods]);` appears once in the file for this callback. Verify before applying. |

---

## Verification Matrix (seeds QA handover)

| # | Edit | How to Verify | Automated? |
|---|---|---|:---:|
| V1 | Edit 5 — dropdown appears | Aggregator mode, has clients → second `<select>` visible | NO |
| V2 | Edit 5 — dropdown absent | Normal mode → no `<select>` for clients | NO |
| V3 | Edit 3+6 — "All" filter | Select All → all 7 aggregator foods | NO |
| V4 | Edit 3+6 — "Main Branch" filter | Select Main Branch → foods with `clientId=0` only | NO |
| V5 | Edit 3+6 — brand filter | Select mallu goan → foods with `clientId=109` only | NO |
| V6 | Edit 4 — category counts | Select Main Branch → category sidebar counts match | NO |
| V7 | Edit 3+7 — BulkEditor filtered | Open Bulk Edit in Main Branch mode → only main branch rows | NO |
| V8 | Edit 2 — reset on type change | Aggregator → Main Branch → Normal → back to Aggregator → shows "All" | NO |
| V9 | Regression | Normal mode foods unchanged | NO |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-146 → IMPLEMENTED, sprint_key: pos_5_1
□ 2. CR_REGISTRY.md: CR-146 row added
□ 3. FILE_OWNERSHIP.md: MenuManagementPanel.jsx entry updated with CR-146
□ 4. Code markers: // CR-146 on all 7 edits
□ 5. Compile: webpack 0 new warnings
```

---

## Awaiting Gate 4 GO
