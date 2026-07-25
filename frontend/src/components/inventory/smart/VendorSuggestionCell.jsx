// CR-078 · Smart Purchase — Vendor Suggestion Cell
// BUG-227: Searchable combobox replaces plain select. Master vendors + System Vendor shown.
// CR-081 Screen 3: +vendor reasoning text (Cheapest, Stable, Only vendor, Override warning)
import { useState, useMemo } from 'react';
import { AlertTriangle, ChevronsUpDown, Check } from 'lucide-react';
import { isMateriallyMoreExpensive } from '@/utils/vendorRanking';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

// CR-081: Generate vendor reasoning text
const getReason = (ranking, selected, winner) => {
  if (!winner || !selected) return '';
  // BUG-227: skip percentage calc when either price is null
  if (selected.unit_price === null || winner.unit_price === null) return '';
  if (String(selected.vendor_id) !== String(winner.vendor_id)) {
    const pct = winner.unit_price > 0 ? ((selected.unit_price - winner.unit_price) / winner.unit_price * 100).toFixed(0) : 0;
    return `Override · ${pct}% costlier`;
  }
  const alts = (ranking?.alternatives || []).filter(a => a.unit_price !== null);
  if (alts.length === 0) return 'Only vendor with history';
  const allPrices = [winner, ...alts].map(c => c.unit_price).filter(p => p > 0);
  const minPrice = Math.min(...allPrices);
  if (winner.unit_price <= minPrice * 1.02) {
    if (ranking?.purchaseCount >= 3) return `Cheapest · stable × ${ranking.purchaseCount}`;
    const pctBelow = alts.length > 0 && alts[0].unit_price > 0 ? ((alts[0].unit_price - winner.unit_price) / alts[0].unit_price * 100).toFixed(0) : 0;
    return `Cheapest${pctBelow > 0 ? ` · ${pctBelow}% below ${alts[0].vendor_name?.split(' ')[0] || 'alt'}` : ''}`;
  }
  return 'Suggested';
};

// BUG-247: reverted memo — using extracted typeahead component instead
export default function VendorSuggestionCell({ ranking, selectedVendorId, onChange, ingredientId }) {
  const [open, setOpen] = useState(false);
  const winner = ranking?.winner;
  const allCandidates = useMemo(() => {
    // BUG-227: ordered list — winner first, priced alternatives, System Vendor, master-only
    const list = [];
    if (winner) list.push({ ...winner, _isWinner: true });
    (ranking?.alternatives || []).forEach(c => {
      if (String(c.vendor_id) !== String(winner?.vendor_id)) {
        list.push(c);
      }
    });
    return list;
  }, [ranking, winner]);

  const selected = allCandidates.find(c => String(c.vendor_id) === String(selectedVendorId)) || winner;
  // BUG-227: guard isMateriallyMoreExpensive for null-price selections
  const warning = winner && selected && winner.unit_price !== null && selected.unit_price !== null
    ? isMateriallyMoreExpensive(winner, selected)
    : { warn: false, pctAbove: 0, message: '' };
  const reason = getReason(ranking, selected, winner);

  // BUG-227: format display label
  const displayLabel = (c) => {
    if (!c) return 'Select vendor…';
    const price = c.unit_price !== null ? ` · ₹${c.unit_price}` : '';
    return `${c.vendor_name || '(unnamed)'}${price}`;
  };

  return (
    <div data-testid={`vendor-cell-${ingredientId}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between gap-1 h-8 text-xs border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white max-w-[220px] w-full text-left truncate"
            data-testid={`vendor-combobox-${ingredientId}`}
          >
            <span className="truncate">{displayLabel(selected)}</span>
            <ChevronsUpDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search vendor…" className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No vendor found.</CommandEmpty>
              <CommandGroup>
                {allCandidates.map(c => (
                  <CommandItem
                    key={c.vendor_id}
                    value={`${c.vendor_name || ''} ${c.vendor_id}`}
                    onSelect={() => { onChange(c.vendor_id); setOpen(false); }}
                    className="text-xs flex items-center justify-between gap-2"
                    data-testid={`vendor-option-${c.vendor_id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {c.vendor_name || '(unnamed)'}
                        {c._isWinner && <span className="ml-1 text-[9px] text-green-600 font-bold">Recommended</span>}
                        {c.fromMaster && <span className="ml-1 text-[9px] text-slate-400">(no history)</span>}
                        {String(c.vendor_id) === 'system' && <span className="ml-1 text-[9px] text-blue-500">(system)</span>}
                      </span>
                      {c.unit_price !== null && <span className="text-[10px] text-slate-500">₹{c.unit_price}</span>}
                    </div>
                    {String(selectedVendorId) === String(c.vendor_id) && <Check className="w-3 h-3 text-green-600" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-1 mt-0.5">
        {warning.warn && (
          <span title={warning.message} data-testid={`vendor-warn-${ingredientId}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </span>
        )}
        {/* CR-081: Vendor reasoning text */}
        {reason && (
          <span className={`text-[10px] font-medium ${warning.warn ? 'text-amber-600' : 'text-green-600'}`}
                data-testid={`vendor-reason-${ingredientId}`}>
            {reason}
          </span>
        )}
      </div>
    </div>
  );
}
