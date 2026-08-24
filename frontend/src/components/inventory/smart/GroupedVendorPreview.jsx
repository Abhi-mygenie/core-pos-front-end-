// CR-100: GroupedVendorPreview — Paid / Partial / Unpaid split payment UI
// Locked rules: B1 (payment type mandatory) · B2 (rate > 0 mandatory)
// Split sum must equal vendor subtotal before submit (validated in SmartPurchasePanel.validate())
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

const PAYMENT_TYPES = [
  { key: 'paid',    label: 'Paid' },
  { key: 'partial', label: 'Partial' },
  { key: 'unpaid',  label: 'Unpaid' },
];

export default function GroupedVendorPreview({ groupedByVendor, paymentMethodsList, pmByVendor, onPmChange, vendorNamesById }) {
  const vendorIds = Object.keys(groupedByVendor);
  if (vendorIds.length === 0) return null;

  // CR-100: switching to unpaid clears splits; switching to paid/partial seeds 1 row at subtotal
  const handleTypeChange = (vid, type, subtotal) => {
    if (type === 'unpaid') {
      onPmChange(vid, { type: 'unpaid', splits: [] });
    } else {
      const current = pmByVendor?.[vid];
      const hasSplits = current?.splits?.length > 0 && current.type !== 'unpaid';
      const splits = hasSplits ? current.splits : [{ method: '', amount: subtotal, refId: '' }];
      onPmChange(vid, { type, splits });
    }
  };

  const handleSplitChange = (vid, idx, field, value) => {
    const pm = pmByVendor?.[vid] || { type: 'paid', splits: [] };
    const splits = pm.splits.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onPmChange(vid, { ...pm, splits });
  };

  const handleAddSplit = (vid) => {
    const pm = pmByVendor?.[vid] || { type: 'partial', splits: [] };
    onPmChange(vid, { ...pm, splits: [...pm.splits, { method: '', amount: 0, refId: '' }] });
  };

  const handleRemoveSplit = (vid, idx) => {
    const pm = pmByVendor?.[vid];
    if (!pm || pm.splits.length <= 1) return;
    onPmChange(vid, { ...pm, splits: pm.splits.filter((_, i) => i !== idx) });
  };

  return (
    <div className="mt-6 space-y-3" data-testid="grouped-vendor-preview">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Will submit as {vendorIds.length} vendor PO{vendorIds.length > 1 ? 's' : ''}
      </h3>
      {vendorIds.map(vid => {
        const rows = groupedByVendor[vid];
        const vendorName = vendorNamesById?.[vid] || (vid === 'null' ? '(unassigned)' : `Vendor #${vid}`);
        const subtotal = rows.reduce((s, r) => s + (Number(r.qty || r.suggest_qty || 0) * Number(r.rate || 0)), 0);
        const pm = pmByVendor?.[vid];
        const pmType = pm?.type;
        const splits = pm?.splits || [];
        const splitTotal = splits.reduce((s, sp) => s + Number(sp.amount || 0), 0);
        const splitBalanced = pmType === 'unpaid' || (splits.length > 0 && Math.abs(splitTotal - subtotal) < 0.01);
        const pmMissing = !pmType;

        return (
          <div
            key={vid}
            className={`rounded-lg border p-3 ${pmMissing ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-white'}`}
            data-testid={`vendor-group-${vid}`}
          >
            {/* Vendor name + item count */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-slate-900">{vendorName}</span>
                <span className="text-xs text-slate-400 ml-2">{rows.length} item{rows.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Item lines + subtotal */}
            <div className="text-xs text-slate-500 space-y-0.5 pl-2 mb-3">
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

            {/* CR-100: Payment type tabs */}
            <div className="flex items-center gap-1 mb-2" data-testid={`pm-type-selector-${vid}`}>
              <span className="text-xs text-slate-500 mr-1">Payment:</span>
              {PAYMENT_TYPES.map(({ key, label }) => {
                const isActive = pmType === key;
                let cls = 'px-2.5 py-1 text-xs rounded-md border transition-colors ';
                if (isActive) {
                  if (key === 'unpaid')  cls += 'bg-red-50 border-red-400 text-red-700 font-medium';
                  else if (key === 'partial') cls += 'bg-amber-50 border-amber-400 text-amber-700 font-medium';
                  else                   cls += 'bg-green-50 border-green-400 text-green-700 font-medium';
                } else {
                  cls += 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white';
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTypeChange(vid, key, subtotal)}
                    className={cls}
                    data-testid={`pm-type-${key}-${vid}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Unpaid: outstanding credit notice */}
            {pmType === 'unpaid' && (
              <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 flex items-center gap-1.5" data-testid={`unpaid-notice-${vid}`}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                ₹{subtotal.toFixed(2)} will be recorded as outstanding credit
              </div>
            )}

            {/* Paid / Partial: split rows */}
            {(pmType === 'paid' || pmType === 'partial') && (
              <div className="space-y-1.5" data-testid={`splits-${vid}`}>
                {splits.map((sp, idx) => (
                  <div key={idx} className="flex items-center gap-2" data-testid={`split-row-${vid}-${idx}`}>
                    <select
                      value={sp.method}
                      onChange={e => handleSplitChange(vid, idx, 'method', e.target.value)}
                      className="h-7 text-xs border border-slate-200 rounded px-1.5 bg-white focus:border-orange-400 outline-none min-w-[90px]"
                      data-testid={`split-method-${vid}-${idx}`}
                    >
                      <option value="">Method…</option>
                      {(paymentMethodsList || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        value={sp.amount}
                        onChange={e => handleSplitChange(vid, idx, 'amount', Number(e.target.value) || 0)}
                        className="h-7 text-xs border border-slate-200 rounded pl-5 pr-1.5 bg-white focus:border-orange-400 outline-none w-[80px]"
                        min="0"
                        data-testid={`split-amount-${vid}-${idx}`}
                      />
                    </div>
                    <input
                      type="text"
                      value={sp.refId}
                      onChange={e => handleSplitChange(vid, idx, 'refId', e.target.value)}
                      placeholder="Ref ID (optional)"
                      className="h-7 text-xs border border-slate-200 rounded px-1.5 bg-white focus:border-orange-400 outline-none flex-1"
                      data-testid={`split-ref-${vid}-${idx}`}
                    />
                    {splits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(vid, idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                        data-testid={`split-remove-${vid}-${idx}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add row — Partial only */}
                {pmType === 'partial' && (
                  <button
                    type="button"
                    onClick={() => handleAddSplit(vid)}
                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 transition-colors mt-1"
                    data-testid={`add-split-${vid}`}
                  >
                    <Plus className="w-3 h-3" />
                    Add payment row
                  </button>
                )}

                {/* Live sum indicator */}
                {splits.length > 0 && (
                  <div
                    className={`text-xs pt-1 flex items-center gap-1 ${splitBalanced ? 'text-green-600' : 'text-amber-600'}`}
                    data-testid={`split-sum-${vid}`}
                  >
                    {splitBalanced ? '✓' : '⚠'} Total: ₹{splitTotal.toFixed(2)}
                    {!splitBalanced && ` (needs ₹${subtotal.toFixed(2)})`}
                  </div>
                )}
              </div>
            )}

            {/* No type selected yet */}
            {pmMissing && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-600" data-testid={`pm-error-${vid}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                Select a payment type
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
