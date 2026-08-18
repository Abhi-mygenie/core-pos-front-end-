# BUG-325 — Implementation Plan (Gate 3)

**Date:** 2026-08-17
**Role:** PLANNING (Gate 3)
**Risk:** LOW
**Planning skip:** ELIGIBLE — 1 file, ~10 lines added, no API/state/financial/hotspot change

---

## Scope Lock

**Files WILL change:**
- `src/components/settings/aggregatorSetup/VariationStockTab.jsx`

**Files will NOT touch:**
- `aggregatorConfigService.js` — no change
- `AggregatorSetupView.jsx` — no change
- Any other file

---

## Edit 1 — Add `val.available` status badge inside the values map

**File:** `src/components/settings/aggregatorSetup/VariationStockTab.jsx`
**Lines:** 124–138 (the `<div key={valIdx}>` pill block inside values map)

**Current (lines 124–138):**
```jsx
return (
  <div key={valIdx} style={{ display: 'flex', alignItems: 'center', gap: 6,
                              background: '#f8fafc', border: `1px solid ${COLORS.borderGray}`,
                              borderRadius: 7, padding: '5px 10px' }}>
    <span style={{ fontSize: 12, color: '#374151' }}>
      {val.label}
      {val.optionPrice > 0 && <span style={{ color: COLORS.grayText }}> · ₹{val.optionPrice}</span>}
    </span>
    <button onClick={() => handleToggle(food.id, varIdx, valIdx, 'enable', val.label)}
      disabled={opLoading[enableKey]}
      style={btnStyle('#16a34a')}>En</button>
    <button onClick={() => handleToggle(food.id, varIdx, valIdx, 'disable', val.label)}
      disabled={opLoading[disableKey]}
      style={btnStyle('#dc2626')}>Dis</button>
  </div>
);
```

**New (BUG-325 — insert badge between label span and En button):**
```jsx
return (
  <div key={valIdx} style={{ display: 'flex', alignItems: 'center', gap: 6,
                              background: '#f8fafc', border: `1px solid ${COLORS.borderGray}`,
                              borderRadius: 7, padding: '5px 10px' }}>
    <span style={{ fontSize: 12, color: '#374151' }}>
      {val.label}
      {val.optionPrice > 0 && <span style={{ color: COLORS.grayText }}> · ₹{val.optionPrice}</span>}
    </span>
    {/* BUG-325: show current available status — additive only, En/Dis buttons kept */}
    <span style={{
      fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
      background: val.available ? '#dcfce7' : '#fee2e2',
      color:      val.available ? '#16a34a' : '#dc2626',
      border:     `1px solid ${val.available ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {val.available ? 'Active' : 'Inactive'}
    </span>
    <button onClick={() => handleToggle(food.id, varIdx, valIdx, 'enable', val.label)}
      disabled={opLoading[enableKey]}
      style={btnStyle('#16a34a')}>En</button>
    <button onClick={() => handleToggle(food.id, varIdx, valIdx, 'disable', val.label)}
      disabled={opLoading[disableKey]}
      style={btnStyle('#dc2626')}>Dis</button>
  </div>
);
```

**What changed:** 1 `<span>` block added between the label `<span>` and the `En` button. Nothing removed. Both buttons intact. Badge is inline flex, no layout disruption.

---

## Verification Matrix

| Edit | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | `VariationStockTab.jsx` L124 | `<span>` badge for `val.available` | Browser: Variation Stock tab — each value chip shows red "Inactive" or green "Active" badge | NO — browser |
| V3 | Same | En button still present | Browser: click En on "salsa" → toast fires | NO |
| V4 | Same | Dis button still present | Browser: click Dis on "gogo" → toast fires | NO |
| V5 | Same | Layout intact | Browser: no overflow, chips wrap normally | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-325 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: VariationStockTab.jsx — BUG-325 2026-08-17
- [ ] Code marker: // BUG-325 comment in modified block
```

---

## Awaiting Gate 4 GO
