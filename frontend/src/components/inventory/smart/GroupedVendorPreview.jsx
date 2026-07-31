// CR-078 · Smart Purchase — Grouped Vendor Preview (before submit)
// Locked rules: B1 (PM per vendor mandatory) · B2 (rate > 0 mandatory)
import { AlertCircle } from 'lucide-react';

export default function GroupedVendorPreview({ groupedByVendor, paymentMethodsList, pmByVendor, onPmChange, vendorNamesById }) {
  const vendorIds = Object.keys(groupedByVendor);

  if (vendorIds.length === 0) return null;

  return (
    <div className="mt-6 space-y-3" data-testid="grouped-vendor-preview">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Will submit as {vendorIds.length} vendor PO{vendorIds.length > 1 ? 's' : ''}</h3>
      {vendorIds.map(vid => {
        const rows = groupedByVendor[vid];
        const vendorName = vendorNamesById?.[vid] || (vid === 'null' ? '(unassigned)' : `Vendor #${vid}`);
        const pmMissing = !pmByVendor?.[vid];
        const subtotal = rows.reduce((s, r) => s + (Number(r.qty || r.suggest_qty || 0) * Number(r.rate || 0)), 0);
        return (
          <div key={vid} className={`rounded-lg border p-3 ${pmMissing ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white'}`} data-testid={`vendor-group-${vid}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-slate-900">{vendorName}</span>
                <span className="text-xs text-slate-400 ml-2">{rows.length} item{rows.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Payment:</label>
                <select
                  value={pmByVendor?.[vid] || ''}
                  onChange={e => onPmChange(vid, e.target.value)}
                  className={`h-8 text-xs border rounded-md px-2 outline-none bg-white ${pmMissing ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200 focus:border-orange-400'}`}
                  data-testid={`pm-select-${vid}`}
                >
                  <option value="">Select…</option>
                  {(paymentMethodsList || []).map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 pl-2">
              {rows.map((r, i) => (
                <div key={i} className="flex justify-between">
                  <span>{r.name} · {r.qty || r.suggest_qty} {r.unit}</span>
                  <span>@ ₹{r.rate || 0} = ₹{((Number(r.qty || r.suggest_qty || 0) * Number(r.rate || 0)) || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-slate-700 pt-1 border-t border-slate-100 mt-1">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>
            {pmMissing && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-600" data-testid={`pm-error-${vid}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                Payment method required
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
