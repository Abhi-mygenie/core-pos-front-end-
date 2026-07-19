// CR-078 · Smart Purchase — Auto Shopping List
// Locked rules: B2 (hide 0-gap rows · already filtered upstream) · B6 (ad-hoc rate pre-fill from history)
// G15 · ad-hoc restricted to EXISTING ingredients (typeahead against ingredient master)
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VendorSuggestionCell from './VendorSuggestionCell';

export default function AutoShoppingList({ rows, rankingByIngredient, ingredientsMaster, vendorItemList, onRowChange, onRowRemove, onAddAdHoc }) {
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [typeaheadQuery, setTypeaheadQuery] = useState('');

  const filteredMaster = typeaheadQuery.length >= 1
    ? (ingredientsMaster || []).filter(i =>
        i.name.toLowerCase().includes(typeaheadQuery.toLowerCase()) &&
        !rows.some(r => String(r.ingredient_id) === String(i.id))
      ).slice(0, 8)
    : [];

  const handleAdHocPick = (ingredient) => {
    // B6 · pre-fill rate from most recent vendor-item-list entry for this ingredient
    const recentRow = (vendorItemList || []).find(v => String(v.ingredient_id) === String(ingredient.id));
    onAddAdHoc({
      ingredient_id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.smallUnit || ingredient.unit || '',
      display_unit: ingredient.displayUnit || ingredient.unit || '',
      on_hand: 0,
      velocity_per_day: 0,
      projected_need: 0,
      gap: 0,
      suggest_qty: 0,
      qty: '',
      rate: recentRow?.unit_price || '',
      origin: 'ad_hoc',
    });
    setTypeaheadQuery('');
    setShowTypeahead(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="auto-shopping-list">
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="bg-slate-50/80">
              {['Ingredient', 'On-hand', 'Vel/day', 'Need', 'Gap', 'Buy', 'Rate', 'Batch', 'Expiry', 'Vendor', ''].map((h, i) => (
                <th key={i} className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="py-12 text-center text-sm text-slate-400" data-testid="empty-state">
                You&apos;re covered — no items need to be purchased for this horizon.
              </td></tr>
            ) : rows.map((r, ix) => (
              <tr key={`${r.ingredient_id}-${ix}`} className="border-b border-slate-50 hover:bg-slate-50/40" data-testid={`plan-row-${r.ingredient_id}`}>
                <td className="py-2 px-3">
                  <div className="text-sm font-medium text-slate-900">{r.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{r.origin === 'ad_hoc' ? 'AD-HOC' : ''}</div>
                </td>
                <td className="py-2 px-3 text-sm text-slate-600">{r.on_hand} <span className="text-xs text-slate-400">{r.unit}</span></td>
                <td className="py-2 px-3 text-sm text-slate-600">{r.velocity_per_day}</td>
                <td className="py-2 px-3 text-sm text-slate-600">{r.projected_need}</td>
                <td className="py-2 px-3 text-sm font-medium text-red-600">{r.gap}</td>
                <td className="py-2 px-3">
                  <Input type="number" step="0.001" min="0" value={r.qty ?? r.suggest_qty}
                    onChange={e => onRowChange(ix, { qty: e.target.value })}
                    className="h-8 text-sm w-24" data-testid={`row-qty-${r.ingredient_id}`} />
                </td>
                <td className="py-2 px-3">
                  <Input type="number" step="0.01" min="0" value={r.rate ?? ''}
                    onChange={e => onRowChange(ix, { rate: e.target.value })}
                    placeholder="₹" className="h-8 text-sm w-20" data-testid={`row-rate-${r.ingredient_id}`} />
                </td>
                <td className="py-2 px-3">
                  <Input value={r.batch ?? ''}
                    onChange={e => onRowChange(ix, { batch: e.target.value })}
                    placeholder="—" className="h-8 text-sm w-20" data-testid={`row-batch-${r.ingredient_id}`} />
                </td>
                <td className="py-2 px-3">
                  <Input type="date" value={r.expiry ?? ''}
                    onChange={e => onRowChange(ix, { expiry: e.target.value })}
                    className="h-8 text-sm w-32" data-testid={`row-expiry-${r.ingredient_id}`} />
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
                  <button type="button" onClick={() => onRowRemove(ix)}
                    className="text-slate-400 hover:text-red-500" data-testid={`row-remove-${r.ingredient_id}`}>
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ad-hoc typeahead — G15: existing ingredients only */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        {!showTypeahead ? (
          <Button variant="ghost" size="sm" onClick={() => setShowTypeahead(true)}
            className="text-xs text-orange-600 hover:text-orange-700 gap-1" data-testid="add-adhoc-row">
            <Plus className="w-3.5 h-3.5" />
            Add ad-hoc row
          </Button>
        ) : (
          <div className="relative max-w-md">
            <Input autoFocus value={typeaheadQuery}
              onChange={e => setTypeaheadQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowTypeahead(false), 200)}
              placeholder="Type ingredient name…" className="h-8 text-sm" data-testid="adhoc-typeahead-input" />
            {filteredMaster.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-y-auto" data-testid="adhoc-typeahead-dropdown">
                {filteredMaster.map(ing => (
                  <button key={ing.id} type="button" onMouseDown={() => handleAdHocPick(ing)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50" data-testid={`adhoc-option-${ing.id}`}>
                    {ing.name} <span className="text-xs text-slate-400">· {ing.displayUnit || ing.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {typeaheadQuery.length >= 1 && filteredMaster.length === 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-xs text-slate-400">
                No matching ingredient. Add new ingredients from Ingredients &amp; Setup.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
