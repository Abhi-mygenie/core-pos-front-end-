// CR-078 · Smart Purchase — Vendor Suggestion Cell
// CR-081 Screen 3: +vendor reasoning text (Cheapest, Stable, Only vendor, Override warning)
import { AlertTriangle } from 'lucide-react';
import { isMateriallyMoreExpensive } from '@/utils/vendorRanking';

// CR-081: Generate vendor reasoning text
const getReason = (ranking, selected, winner) => {
  if (!winner || !selected) return '';
  if (String(selected.vendor_id) !== String(winner.vendor_id)) {
    const pct = winner.unit_price > 0 ? ((selected.unit_price - winner.unit_price) / winner.unit_price * 100).toFixed(0) : 0;
    return `Override · ${pct}% costlier`;
  }
  const alts = ranking?.alternatives || [];
  if (alts.length === 0) return 'Only vendor with history';
  // Check if cheapest
  const allPrices = [winner, ...alts].map(c => c.unit_price).filter(p => p > 0);
  const minPrice = Math.min(...allPrices);
  if (winner.unit_price <= minPrice * 1.02) {
    // Check stability (same rate in multiple purchases)
    if (ranking?.purchaseCount >= 3) return `Cheapest · stable × ${ranking.purchaseCount}`;
    const pctBelow = alts.length > 0 ? ((alts[0].unit_price - winner.unit_price) / alts[0].unit_price * 100).toFixed(0) : 0;
    return `Cheapest${pctBelow > 0 ? ` · ${pctBelow}% below ${alts[0].vendor_name?.split(' ')[0] || 'alt'}` : ''}`;
  }
  return 'Suggested';
};

export default function VendorSuggestionCell({ ranking, selectedVendorId, onChange, ingredientId }) {
  const candidates = ranking?.winner ? [ranking.winner, ...(ranking.alternatives || [])] : [];
  const selected = candidates.find(c => String(c.vendor_id) === String(selectedVendorId)) || ranking?.winner;
  const winner = ranking?.winner;
  const warning = winner && selected ? isMateriallyMoreExpensive(winner, selected) : { warn: false, pctAbove: 0, message: '' };
  const reason = getReason(ranking, selected, winner);

  if (candidates.length === 0) {
    return <span className="text-xs text-slate-400 italic" data-testid={`vendor-cell-${ingredientId}`}>No history</span>;
  }

  return (
    <div data-testid={`vendor-cell-${ingredientId}`}>
      <div className="flex items-center gap-1.5">
        <select
          value={selectedVendorId || ''}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-xs border border-slate-200 rounded-md px-2 outline-none focus:border-orange-400 bg-white max-w-[180px] truncate"
          data-testid={`vendor-select-${ingredientId}`}
        >
          {candidates.map(c => (
            <option key={c.vendor_id} value={c.vendor_id}>
              {c.vendor_name || '(unnamed)'} · ₹{c.unit_price}
            </option>
          ))}
        </select>
        {warning.warn && (
          <span title={warning.message} data-testid={`vendor-warn-${ingredientId}`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </span>
        )}
      </div>
      {/* CR-081: Vendor reasoning text */}
      {reason && (
        <div className={`text-[10px] mt-0.5 font-medium ${warning.warn ? 'text-amber-600' : 'text-green-600'}`}
             data-testid={`vendor-reason-${ingredientId}`}>
          {reason}
        </div>
      )}
    </div>
  );
}
