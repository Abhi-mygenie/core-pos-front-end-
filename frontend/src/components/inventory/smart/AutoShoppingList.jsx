// CR-078 · Smart Purchase — Auto Shopping List
// CR-081 Screen 3: Design polish — stock badges, ON-HAND colors, column renames, suggest hint, row bg tints, override warning
import { useState, useCallback, Fragment } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VendorSuggestionCell from './VendorSuggestionCell';

// BUG-247: Extracted typeahead into isolated component. Its state (query text)
// no longer triggers re-render of the parent table + 50 VendorSuggestionCells.
function AdHocTypeahead({ ingredientsMaster, vendorItemList, rows, onAddAdHoc, onClose }) {
  const [query, setQuery] = useState('');

  const filtered = query.length >= 1
    ? (ingredientsMaster || []).filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) &&
        !i.isSubRecipe &&                                         // CR-139 Phase B2: sub-recipes are not purchasable
        // CR-105: Only exclude items already added as ad_hoc (not in_stock/planner/alert rows)
        !rows.some(r => r.origin === 'ad_hoc' && String(r.ingredient_id) === String(i.id))
      ).slice(0, 8)
    : [];

  const handlePick = (ingredient) => {
    const recentRow = (vendorItemList || []).find(v => String(v.ingredient_id) === String(ingredient.id));
    onAddAdHoc({
      ingredient_id: ingredient.id, name: ingredient.name,
      unit: ingredient.smallUnit || ingredient.unit || '',
      display_unit: ingredient.displayUnit || ingredient.unit || '',
      on_hand: 0, velocity_per_day: 0, projected_need: 0, gap: 0, suggest_qty: 0,
      qty: '', rate: recentRow?.unit_price ? String((recentRow.unit_price * (ingredient.suggest_qty || 1)).toFixed(0)) : '', origin: 'ad_hoc', // CR-348: pre-fill total
    });
    onClose();
  };

  return (
    <div className="border-b border-slate-200 p-3 bg-blue-50/30">
      <div className="relative max-w-md">
        <Input autoFocus value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search ingredient to add..." className="h-8 text-sm" data-testid="adhoc-typeahead-input" />
        {query.length >= 1 && filtered.length === 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm text-slate-400"> {/* BUG-236 */}
            No matching ingredients
          </div>
        )}
        {filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown"> {/* BUG-236 */}
            {filtered.map(ing => (
              <button key={ing.id} type="button" onMouseDown={() => handlePick(ing)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50" data-testid={`adhoc-option-${ing.id}`}>
                {ing.name} <span className="text-xs text-slate-400">· {ing.displayUnit || ing.unit}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onClose}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs" data-testid="adhoc-close">
          ✕
        </button>
      </div>
    </div>
  );
}

// CR-081: Stock status badge
const StockBadge = ({ onHand, daysLeft }) => {
  if (onHand <= 0) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Out of stock</span>;
  if (daysLeft <= 3) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Low · {Math.round(daysLeft)}d</span>;
  if (daysLeft <= 7) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Low · {Math.round(daysLeft)}d left</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{Math.round(daysLeft)}d left</span>;
};

// CR-081: ON-HAND color
const onHandColor = (onHand, daysLeft) => {
  if (onHand <= 0) return '#EF4444';
  if (daysLeft <= 3) return '#EF4444';
  if (daysLeft <= 7) return '#F59E0B';
  return '#22C55E';
};

// CR-081: Row background tint
const rowBg = (row) => {
  if (row.origin === 'ad_hoc') return 'bg-blue-50/40';
  if (row.origin === 'in_stock') return 'bg-green-50/30'; // CR-105 Sub-A
  if (row.on_hand <= 0) return 'bg-red-50/30';
  const daysLeft = row.velocity_per_day > 0 ? row.on_hand / row.velocity_per_day : Infinity;
  if (daysLeft <= 3) return 'bg-red-50/20';
  if (daysLeft <= 7) return 'bg-amber-50/30';
  return '';
};

export default function AutoShoppingList({ rows, rankingByIngredient, ingredientsMaster, vendorItemList, onRowChange, onRowRemove, onAddAdHoc, horizonDays, selectedRows, onToggleRow, onToggleAll, onBulkRemove, showAll, onToggleShowAll, selectedForPurchase, onAddToPurchase, onRemoveFromPurchase, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, allCategories }) {
  const [showTypeahead, setShowTypeahead] = useState(false);

  // BUG-247: handleAdHocPick moved into AdHocTypeahead component

  // CR-081: Format quantity with unit conversion
  const fmtQty = (q, unit) => {
    if (unit === 'gm' && q >= 1000) return `${(q / 1000).toFixed(1)} kg`;
    if (unit === 'ml' && q >= 1000) return `${(q / 1000).toFixed(1)} ltr`;
    return `${Number(q).toFixed(q < 10 ? 2 : 0)} ${unit}`;
  };

  // CR-114: Split rows into purchase list and available
  const purchaseRows = rows.map((r, ix) => ({ ...r, _ix: ix })).filter(r => selectedForPurchase && selectedForPurchase.has(r.ingredient_id));
  const availableRows = rows.map((r, ix) => ({ ...r, _ix: ix })).filter(r => !selectedForPurchase || !selectedForPurchase.has(r.ingredient_id))
    .filter(r => {
      // CR-115: Apply search filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.name.toLowerCase().includes(q)) return false;
      }
      // CR-115: Apply category filter
      if (categoryFilter && r.categoryName !== categoryFilter) return false;
      return true;
    });

  // CR-115: Group available rows by category for headers
  const groupedAvailable = {};
  availableRows.forEach(r => {
    const cat = r.categoryName || 'Uncategorized';
    if (!groupedAvailable[cat]) groupedAvailable[cat] = [];
    groupedAvailable[cat].push(r);
  });
  const sortedGroups = Object.entries(groupedAvailable).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4" data-testid="auto-shopping-list">
      {/* ─── SECTION 1: Purchase List (CR-114) ─── */}
      {/* BUG-236: overflow-hidden removed — was clipping AdHocTypeahead absolute dropdown */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-green-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">Purchase List</span>
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full" data-testid="purchase-count">
              {purchaseRows.length} items
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* CR-103 Sub-C: Bulk remove */}
            {selectedRows && selectedRows.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-red-700" data-testid="bulk-count">{selectedRows.size} selected</span>
                <Button size="sm" variant="destructive" onClick={onBulkRemove} className="h-7 text-xs" data-testid="bulk-remove-btn">
                  Remove Selected
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* CR-105: Add Item typeahead */}
        {showTypeahead && (
          <AdHocTypeahead ingredientsMaster={ingredientsMaster} vendorItemList={vendorItemList} rows={rows} onAddAdHoc={onAddAdHoc} onClose={() => setShowTypeahead(false)} />
        )}

        {purchaseRows.length === 0 ? (
          <div className="py-10 text-center" data-testid="purchase-empty">
            <p className="text-sm text-slate-400">No items in your purchase list yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click <span className="font-semibold text-orange-600">+ Add</span> on items below to start building your order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 1140 }}>
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="py-2.5 px-3 border-b border-slate-200 w-10">
                    <input type="checkbox" checked={rows.length > 0 && selectedRows && selectedRows.size === rows.length}
                      onChange={onToggleAll} className="w-4 h-4 rounded border-slate-300 accent-red-500 cursor-pointer" data-testid="select-all-checkbox" />
                  </th>
                  {['Ingredient', 'On-Hand', 'Status', 'Projected Need', 'Gap', 'Qty to Buy *', 'Total Price', 'Vendor * (suggested)', ''].map((h, i) => (// CR-348
                    <th key={i} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseRows.map((r) => {
                  const ix = r._ix;
                  const daysLeft = r.velocity_per_day > 0 ? r.on_hand / r.velocity_per_day : Infinity;
                  return (
                    <tr key={`${r.ingredient_id}-${ix}`} className={`border-b border-slate-50 hover:bg-slate-50/40 ${rowBg(r)}`} data-testid={`plan-row-${r.ingredient_id}`}>
                      <td className="py-2 px-3">
                        <input type="checkbox" checked={selectedRows ? selectedRows.has(ix) : false}
                          onChange={() => onToggleRow(ix)} className="w-4 h-4 rounded border-slate-300 accent-red-500 cursor-pointer" data-testid={`row-select-${r.ingredient_id}`} />
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-sm font-medium text-slate-900">{r.name}</div>
                        {r.origin === 'ad_hoc' && <div className="text-[9px] font-bold text-blue-500 uppercase">Ad-hoc</div>}
                        {r.origin === 'stock_alert' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700" data-testid={`low-stock-badge-${r.ingredient_id}`}>Low stock</span>}
                        {r.origin === 'in_stock' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700" data-testid={`in-stock-badge-${r.ingredient_id}`}>In stock</span>}
                      </td>
                      <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                        {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                      </td>
                      <td className="py-2 px-3"><StockBadge onHand={r.on_hand} daysLeft={daysLeft} /></td>
                      <td className="py-2 px-3 text-sm text-slate-600">{r.projected_need} {r.unit}</td>
                      <td className="py-2 px-3 text-sm font-medium text-red-600">{r.gap}</td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.001" min="0" value={r.qty ?? r.suggest_qty}
                          onChange={e => onRowChange(ix, { qty: e.target.value })}
                          className="h-8 text-sm w-24" data-testid={`row-qty-${r.ingredient_id}`} />
                        {r.suggest_qty > 0 && <div className="text-[10px] text-orange-500 font-medium mt-0.5">suggest: {r.suggest_qty}</div>}
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.01" min="0" value={r.rate ?? ''}
                          onChange={e => onRowChange(ix, { rate: e.target.value })}
                          placeholder={r.suggestedRate ? `₹${(r.suggestedRate * (Number(r.qty || r.suggest_qty) || 1)).toFixed(0)}` : '₹'}
                          className="h-8 text-sm w-20" data-testid={`row-rate-${r.ingredient_id}`} />
                        {r.suggestedRate && !r.rate && <div className="text-[10px] text-blue-500 font-medium mt-0.5">last total: ₹{(r.suggestedRate * (Number(r.qty || r.suggest_qty) || 1)).toFixed(0)}</div>}{/* CR-348 */}
                      </td>
                      <td className="py-2 px-3">
                        <VendorSuggestionCell ranking={rankingByIngredient?.get(String(r.ingredient_id))} selectedVendorId={r.vendor_id}
                          onChange={vid => onRowChange(ix, { vendor_id: vid })} ingredientId={r.ingredient_id} />
                      </td>
                      <td className="py-2 px-3">
                        <button type="button" onClick={() => { onRemoveFromPurchase(r.ingredient_id); }}
                          className="p-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" data-testid={`row-remove-${r.ingredient_id}`}>
                          <X className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── SECTION 2: All Ingredients (CR-114 + CR-115) ─── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">All Ingredients · {horizonDays ? `${horizonDays}-Day Horizon` : ''}</span>
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full" data-testid="available-count">
              {availableRows.length} items
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer" data-testid="show-all-toggle">
              <span className="text-xs font-medium text-slate-500">Show all</span>
              <button type="button" onClick={onToggleShowAll}
                className={`relative w-8 h-[18px] rounded-full transition-colors ${showAll ? 'bg-green-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${showAll ? 'translate-x-[14px]' : ''}`} />
              </button>
            </label>
            <button type="button" onClick={() => setShowTypeahead(true)}
              className="text-xs font-semibold text-orange-600 hover:underline border border-dashed border-orange-300 px-2 py-1 rounded" data-testid="add-item-btn">
              + Add Item
            </button>
          </div>
        </div>

        {/* CR-115: Search + Category filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white" data-testid="purchase-filter-bar">
          <div className="relative flex-1 max-w-xs">
            <input type="text" value={searchQuery || ''} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ingredients..." className="h-8 text-sm w-full border border-slate-200 rounded-md pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-orange-300"
              data-testid="purchase-search-input" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
          </div>
          <select value={categoryFilter || ''} onChange={e => setCategoryFilter(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white min-w-[140px]" data-testid="purchase-category-filter">
            <option value="">All Categories</option>
            {(allCategories || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[10px] text-slate-400">{availableRows.length} of {rows.length - purchaseRows.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-slate-50/80">
                {['Ingredient', 'Category', 'On-Hand', 'Status', 'Velocity', 'Projected Need', 'Suggested Qty', ''].map((h, i) => (
                  <th key={i} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availableRows.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400" data-testid="available-empty">
                  {searchQuery || categoryFilter ? 'No matching items — try adjusting your filters.' : 'All items have been added to your purchase list.'}
                </td></tr>
              ) : sortedGroups.map(([cat, items]) => (
                <Fragment key={cat}>
                  {/* CR-115: Category header row */}
                  <tr className="bg-slate-50/60">
                    <td colSpan={8} className="py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wide border-b border-slate-100" data-testid={`cat-header-${cat.toLowerCase().replace(/\s+/g,'-')}`}>
                      {cat} <span className="font-normal text-slate-400">({items.length})</span>
                    </td>
                  </tr>
                  {items.map((r) => {
                    const daysLeft = r.velocity_per_day > 0 ? r.on_hand / r.velocity_per_day : Infinity;
                    return (
                      <tr key={`avail-${r.ingredient_id}`} className={`border-b border-slate-50 hover:bg-slate-50/40 ${rowBg(r)}`} data-testid={`avail-row-${r.ingredient_id}`}>
                        <td className="py-2 px-3">
                          <div className="text-sm font-medium text-slate-900">{r.name}</div>
                          {r.origin === 'stock_alert' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Low stock</span>}
                          {r.origin === 'in_stock' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">In stock</span>}
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-500">{r.categoryName || '—'}</td>
                        <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                          {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                        </td>
                        <td className="py-2 px-3"><StockBadge onHand={r.on_hand} daysLeft={daysLeft} /></td>
                        <td className="py-2 px-3 text-xs text-slate-600">{r.velocity_per_day > 0 ? `${r.velocity_per_day.toFixed(1)}/day` : '—'}</td>
                        <td className="py-2 px-3 text-xs text-slate-600">{r.projected_need > 0 ? `${r.projected_need} ${r.unit}` : '—'}</td>
                        <td className="py-2 px-3 text-xs text-slate-600">{r.suggest_qty > 0 ? r.suggest_qty : '—'}</td>
                        <td className="py-2 px-3">
                          <button type="button" onClick={() => onAddToPurchase(r.ingredient_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                            data-testid={`add-to-purchase-${r.ingredient_id}`}>
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
