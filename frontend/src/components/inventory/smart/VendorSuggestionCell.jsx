// CR-078 · Smart Purchase — Vendor Suggestion Cell
// Locked rules: B3 (override warning 5% threshold) · B5 (tie-breaker most recent)
import { AlertTriangle } from 'lucide-react';
import { isMateriallyMoreExpensive } from '@/utils/vendorRanking';

export default function VendorSuggestionCell({ ranking, selectedVendorId, onChange, ingredientId }) {
  const candidates = ranking?.winner ? [ranking.winner, ...(ranking.alternatives || [])] : [];
  const selected = candidates.find(c => String(c.vendor_id) === String(selectedVendorId)) || ranking?.winner;
  const winner = ranking?.winner;
  const warning = winner && selected ? isMateriallyMoreExpensive(winner, selected) : { warn: false, pctAbove: 0, message: '' };

  if (candidates.length === 0) {
    return <span className="text-xs text-slate-400 italic" data-testid={`vendor-cell-${ingredientId}`}>No history</span>;
  }

  return (
    <div className="flex items-center gap-1.5" data-testid={`vendor-cell-${ingredientId}`}>
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
  );
}
