// CR-078 · Smart Purchase — Auto Shopping List
// CR-081 Screen 3: Design polish — stock badges, ON-HAND colors, column renames, suggest hint, row bg tints, override warning
import { useState, useCallback } from 'react';
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
        !rows.some(r => String(r.ingredient_id) === String(i.id))
      ).slice(0, 8)
    : [];

  const handlePick = (ingredient) => {
    const recentRow = (vendorItemList || []).find(v => String(v.ingredient_id) === String(ingredient.id));
    onAddAdHoc({
      ingredient_id: ingredient.id, name: ingredient.name,
      unit: ingredient.smallUnit || ingredient.unit || '',
      display_unit: ingredient.displayUnit || ingredient.unit || '',
      on_hand: 0, velocity_per_day: 0, projected_need: 0, gap: 0, suggest_qty: 0,
      qty: '', rate: recentRow?.unit_price || '', origin: 'ad_hoc',
    });
    onClose();
  };

  return (
    <div className="border-t border-slate-100 p-3 bg-slate-50/50">
      <div className="relative max-w-md">
        <Input autoFocus value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={() => setTimeout(onClose, 200)}
          placeholder="Type ingredient name…" className="h-8 text-sm" data-testid="adhoc-typeahead-input" />
        {filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown">
            {filtered.map(ing => (
              <button key={ing.id} type="button" onMouseDown={() => handlePick(ing)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50" data-testid={`adhoc-option-${ing.id}`}>
                {ing.name} <span className="text-xs text-slate-400">· {ing.displayUnit || ing.unit}</span>
              </button>
            ))}
          </div>
        )}
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

export default function AutoShoppingList({ rows, rankingByIngredient, ingredientsMaster, vendorItemList, onRowChange, onRowRemove, onAddAdHoc, horizonDays, selectedRows, onToggleRow, onToggleAll, onBulkRemove, showAll, onToggleShowAll }) {
  const [showTypeahead, setShowTypeahead] = useState(false);

  // BUG-247: handleAdHocPick moved into AdHocTypeahead component

  // CR-081: Format quantity with unit conversion
  const fmtQty = (q, unit) => {
    if (unit === 'gm' && q >= 1000) return `${(q / 1000).toFixed(1)} kg`;
    if (unit === 'ml' && q >= 1000) return `${(q / 1000).toFixed(1)} ltr`;
    return `${Number(q).toFixed(q < 10 ? 2 : 0)} ${unit}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="auto-shopping-list">
      {/* CR-081: Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Auto Shopping List · {horizonDays ? `${horizonDays}-Day Horizon` : ''}</span>
          {rows.length > 0 && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {rows.length} items suggested
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* CR-105 Sub-A: Show All toggle */}
          <label className="flex items-center gap-2 cursor-pointer" data-testid="show-all-toggle">
            <span className="text-xs font-medium text-slate-500">Show all</span>
            <button type="button" onClick={onToggleShowAll}
              className={`relative w-8 h-[18px] rounded-full transition-colors ${showAll ? 'bg-green-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${showAll ? 'translate-x-[14px]' : ''}`} />
            </button>
          </label>
          {/* CR-105 Sub-B: Add Item from master list */}
          <button type="button" onClick={() => setShowTypeahead(true)}
            className="text-xs font-semibold text-orange-600 hover:underline border border-dashed border-orange-300 px-2 py-1 rounded" data-testid="add-item-btn">
            + Add Item
          </button>
        </div>
      </div>

      {/* CR-103 Sub-C: Bulk remove toolbar */}
      {selectedRows && selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border-b border-red-100">
          <span className="text-sm font-semibold text-red-700" data-testid="bulk-count">{selectedRows.size} selected</span>
          <Button size="sm" variant="destructive" onClick={onBulkRemove} className="h-7 text-xs"
            data-testid="bulk-remove-btn">
            Remove Selected
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 1140 }}>
          <thead>
            <tr className="bg-slate-50/80">
              {/* CR-103 Sub-C: Select All checkbox */}
              <th className="py-2.5 px-3 border-b border-slate-200 w-10">
                <input type="checkbox" checked={rows.length > 0 && selectedRows && selectedRows.size === rows.length}
                  onChange={onToggleAll} className="w-4 h-4 rounded border-slate-300 accent-red-500 cursor-pointer"
                  data-testid="select-all-checkbox" />
              </th>
              {/* CR-081: Renamed columns per mockup */}
              {['Ingredient', 'On-Hand', 'Status', 'Projected Need · 7D', 'Gap', 'Qty to Buy *', 'Rate', 'Vendor * (suggested)', ''].map((h, i) => (
                <th key={i} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-400" data-testid="empty-state">
                You&apos;re covered — no items need to be purchased for this horizon.
              </td></tr>
            ) : rows.map((r, ix) => {
              const daysLeft = r.velocity_per_day > 0 ? r.on_hand / r.velocity_per_day : Infinity;
              return (
                <tr key={`${r.ingredient_id}-${ix}`} className={`border-b border-slate-50 hover:bg-slate-50/40 ${rowBg(r)}`} data-testid={`plan-row-${r.ingredient_id}`}>
                  {/* CR-103 Sub-C: Row checkbox */}
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={selectedRows ? selectedRows.has(ix) : false}
                      onChange={() => onToggleRow(ix)} className="w-4 h-4 rounded border-slate-300 accent-red-500 cursor-pointer"
                      data-testid={`row-select-${r.ingredient_id}`} />
                  </td>
                  <td className="py-2 px-3">
                    <div className="text-sm font-medium text-slate-900">{r.name}</div>
                    {r.origin === 'ad_hoc' && <div className="text-[9px] font-bold text-blue-500 uppercase">Ad-hoc</div>}
                    {/* BUG-224: Low stock badge for stock_alert origin rows */}
                    {r.origin === 'stock_alert' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700" data-testid={`low-stock-badge-${r.ingredient_id}`}>Low stock</span>}
                    {r.origin === 'in_stock' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700" data-testid={`in-stock-badge-${r.ingredient_id}`}>In stock</span>}
                  </td>
                  {/* CR-081: ON-HAND with color coding */}
                  <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                    {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                  </td>
                  {/* CR-081: Status badge */}
                  <td className="py-2 px-3">
                    <StockBadge onHand={r.on_hand} daysLeft={daysLeft} />
                  </td>
                  <td className="py-2 px-3 text-sm text-slate-600">{r.projected_need} {r.unit}</td>
                  <td className="py-2 px-3 text-sm font-medium text-red-600">{r.gap}</td>
                  <td className="py-2 px-3">
                    <Input type="number" step="0.001" min="0" value={r.qty ?? r.suggest_qty}
                      onChange={e => onRowChange(ix, { qty: e.target.value })}
                      className="h-8 text-sm w-24" data-testid={`row-qty-${r.ingredient_id}`} />
                    {/* CR-081: suggest hint */}
                    {r.suggest_qty > 0 && (
                      <div className="text-[10px] text-orange-500 font-medium mt-0.5">suggest: {r.suggest_qty}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <Input type="number" step="0.01" min="0" value={r.rate ?? ''}
                      onChange={e => onRowChange(ix, { rate: e.target.value })}
                      placeholder={r.suggestedRate ? `₹${r.suggestedRate}` : '₹'}
                      className="h-8 text-sm w-20" data-testid={`row-rate-${r.ingredient_id}`} />
                    {/* BUG-241: Show last purchase rate as suggestion hint */}
                    {r.suggestedRate && !r.rate && (
                      <div className="text-[10px] text-blue-500 font-medium mt-0.5">last: ₹{r.suggestedRate}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <VendorSuggestionCell
                      ranking={rankingByIngredient?.get(String(r.ingredient_id))}
                      selectedVendorId={r.vendor_id}
                      onChange={vid => onRowChange(ix, { vendor_id: vid })}
                      ingredientId={r.ingredient_id}
                    />
                  </td>
                  <td className="py-2 px-3">
                    {/* CR-103 Sub-B: Prominent cross button */}
                    <button type="button" onClick={() => onRowRemove(ix)}
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

      {/* BUG-247: Extracted typeahead — its state is isolated, no table re-render on keystrokes */}
      {showTypeahead && (
        <AdHocTypeahead
          ingredientsMaster={ingredientsMaster}
          vendorItemList={vendorItemList}
          rows={rows}
          onAddAdHoc={onAddAdHoc}
          onClose={() => setShowTypeahead(false)}
        />
      )}
    </div>
  );
}
