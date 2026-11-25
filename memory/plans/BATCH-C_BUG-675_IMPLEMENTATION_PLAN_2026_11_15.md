# BATCH-C · BUG-675 (Remove "Total sale" subtitle from Cash Collected KPI) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: LOW
> Conflicts: CLEAR — no open items on SettlementPanel or SettlementPage

## 1. What changes
Remove the `sub` prop (subtitle "Total sale: ₹X") from the Cash Collected KPI card in both SettlementPanel.jsx and SettlementPage.jsx. Purely cosmetic — no data, logic, or API change.

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/components/panels/SettlementPanel.jsx` | L250 | Remove `sub={<span data-testid="settlement-panel-total-sale-footnote">{...}</span>}` prop from Cash Collected KpiCard |
| E2 | `src/pages/SettlementPage.jsx` | L224 | Remove `sub={<span data-testid="settlement-total-sale-footnote">{...}</span>}` prop from Cash Collected KpiCard |

## 3. Exact edits

### E1 — SettlementPanel.jsx L249-250
**Before:**
```jsx
            <KpiCard icon={TrendingUp} label="Cash Collected" value={totals.cashCollected} color={COLORS.primaryGreen}
              sub={<span data-testid="settlement-panel-total-sale-footnote">{`Total sale: ${fmt(totals.totalSale)}`}</span>} />
```
**After:**
```jsx
            <KpiCard icon={TrendingUp} label="Cash Collected" value={totals.cashCollected} color={COLORS.primaryGreen} /> {/* BUG-675: subtitle removed */}
```

### E2 — SettlementPage.jsx L223-224
**Before:**
```jsx
              <KpiCard icon={TrendingUp} label="Cash Collected" value={totals.cashCollected} color={COLORS.primaryGreen}
                sub={<span data-testid="settlement-total-sale-footnote">{`Total sale: ${fmt(totals.totalSale)}`}</span>} />
```
**After:**
```jsx
              <KpiCard icon={TrendingUp} label="Cash Collected" value={totals.cashCollected} color={COLORS.primaryGreen} /> {/* BUG-675: subtitle removed */}
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Open Settlement page → look at Cash Collected KPI card | No subtitle, only the amount |
| V2 | Check SettlementPanel (panel view via waiter settlement) | Same — no subtitle |
| V3 | Verify no "Total sale" text anywhere on settlement screen | Gone |
| V4 | Webpack compile | 0 new warnings |

## 5. Rebase note
NONE — no shared files with any other open item.

## 6. Scope lock
**WILL change:** `SettlementPanel.jsx` (L250), `SettlementPage.jsx` (L224)
**WILL NOT touch:** SettlementMockup.jsx (deleted by CR-372-B), KpiCard component, any transforms/APIs
