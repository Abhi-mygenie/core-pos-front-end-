# BUG-580 — Implementation Plan (Gate 3)
## Discount report — show custom categories + fix Reason/Date columns

**ID:** BUG-580
**Date:** 2026-10-21
**Code Reality:** PARTIAL
**Risk:** LOW — display-only, 1 file
**Files WILL change:** `src/pages/reports-module/DiscountReportMockup.jsx` (1 file)
**Files WILL NOT touch:** insightsService.js, any transform, any other report page

---

## 1. Scope Lock

1 file, 4 edit sites. Display-only — no API, no state management, no financial logic.

---

## 2. Edits

### E-1: Add `byCategory` to analytics memo (L76)

**Current (L76):**
```js
    return { summary: s, daily, byEmployee, ordersTable, total: s.total || 0 };
```

**New (L76):**
```js
    const byCategory = rawData.by_category || []; // BUG-580
    return { summary: s, daily, byEmployee, ordersTable, byCategory, total: s.total || 0 };
```

---

### E-2: Fix Reason column — `discount_category` priority (L157)

**Current (L157):**
```jsx
                          <td className="px-4 py-3 text-sm text-zinc-700">{row.discount_for || '—'}</td>
```

**New (L157):**
```jsx
                          <td className="px-4 py-3 text-sm text-zinc-700">{row.discount_category || row.discount_for || '—'}</td>
```

---

### E-3: Fix Date column — fallback to `collect_bill` (L156)

**Current (L156):**
```jsx
                          <td className="px-4 py-3 text-sm text-zinc-600">{row.order_date || '—'}</td>
```

**New (L156):**
```jsx
                          <td className="px-4 py-3 text-sm text-zinc-600">{row.order_date || (row.collect_bill ? row.collect_bill.split(' ')[0] : '—')}</td>
```

---

### E-4: Add "Discount by Category" section + Excel export (after L130, before daily table)

Insert after the Employee chart section (L130 `</div>)}`) and before the Daily Table section (L131 `{/* Daily Table */}`):

**New section:**
```jsx
              {/* BUG-580: Discount by Category */}
              {analytics.byCategory.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s26-category-table">
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Discount by Category</h2>
                  </div>
                  <table className="w-full">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Manual</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Coupon</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Loyalty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Comp</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.byCategory.map((cat, i) => (
                        <tr key={cat.category_id || i} className="border-t border-zinc-50 hover:bg-zinc-50/50">
                          <td className="px-6 py-3 text-sm font-medium text-zinc-800">{cat.discount_category}</td>
                          <td className="px-4 py-3 text-sm text-right text-zinc-700">{fmtINR(cat.manual || 0)}</td>
                          <td className="px-4 py-3 text-sm text-right text-zinc-600">{cat.coupon > 0 ? fmtINR(cat.coupon) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-right text-zinc-600">{cat.loyalty > 0 ? fmtINR(cat.loyalty) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-right text-zinc-600">{cat.comp > 0 ? fmtINR(cat.comp) : '—'}</td>
                          <td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(cat.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold">CATEGORY TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.byCategory.reduce((s, c) => s + (c.manual || 0), 0))}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.byCategory.reduce((s, c) => s + (c.coupon || 0), 0))}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.byCategory.reduce((s, c) => s + (c.loyalty || 0), 0))}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.byCategory.reduce((s, c) => s + (c.comp || 0), 0))}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-red-600">{fmtINR(analytics.byCategory.reduce((s, c) => s + (c.total || 0), 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
```

Also add `by_category` sheet to Excel export (L85, inside `sheets` array):

**Current (L85 — end of sheets array):**
```js
        { name: 'By Employee', columns: [...], rows: analytics.byEmployee },
      ] };
```

**New (L85):**
```js
        { name: 'By Employee', columns: [...], rows: analytics.byEmployee },
        ...(analytics.byCategory.length > 0 ? [{ name: 'By Category', columns: [{ key: 'discount_category', label: 'Category', format: 'text', align: 'left', width: 150 }, { key: 'manual', label: 'Manual', format: 'inr', align: 'right', width: 100 }, { key: 'coupon', label: 'Coupon', format: 'inr', align: 'right', width: 100 }, { key: 'loyalty', label: 'Loyalty', format: 'inr', align: 'right', width: 100 }, { key: 'comp', label: 'Comp', format: 'inr', align: 'right', width: 100 }, { key: 'total', label: 'Total', format: 'inr', align: 'right', width: 100 }], rows: analytics.byCategory }] : []),
      ] };
```

---

## 3. Execution Sequence

1. E-1 — Add `byCategory` to analytics memo
2. E-2 — Fix Reason column
3. E-3 — Fix Date column
4. E-4 — Add category table section + Excel export sheet
5. Verify webpack compiles

---

## 4. Verification Matrix

| # | Check | How to Verify | Auto? |
|---|-------|---------------|:---:|
| V-1 | `byCategory` in analytics | grep `byCategory` in file | YES |
| V-2 | `discount_category` in Reason column | grep `discount_category` at L157 | YES |
| V-3 | `collect_bill` fallback in Date column | grep `collect_bill` at L156 | YES |
| V-4 | Category table renders | grep `s26-category-table` testid | YES |
| V-5 | `// BUG-580` marker | grep `BUG-580` in file | YES |
| V-6 | Webpack compiles 0 new warnings | Hot reload log | YES |
| V-7 | Palm House: Thrive/Google Review/Complementary visible in Reason column | Browser | NO |
| V-8 | Palm House: Dates show instead of "—" | Browser | NO |
| V-9 | Palm House: Category table shows 3 rows | Browser | NO |
| V-10 | Pav2: Category table hidden (0 categories) | Browser | NO |
| V-11 | Excel export includes "By Category" sheet | Download Excel | NO |

---

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-580 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add DiscountReportMockup.jsx with BUG-580 + date
- [ ] Code markers: // BUG-580 comment
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## 6. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R-1 | `by_category` empty for some restaurants (Pav2) | Entire section gated: `analytics.byCategory.length > 0` |
| R-2 | `discount_category` null on some orders | Falls through to `discount_for`, then to "—" |
| R-3 | `collect_bill` null | Falls through to "—" |
| R-4 | Excel export breaks if no categories | Spread operator `...(length > 0 ? [...] : [])` — sheet omitted when empty |
