// CR-100: GroupedVendorPreview — payment section
// BUG-350: Expense-model payment (method dropdown + amount + Split button)
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

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
        // CR-348: r.rate is now total-price (not per-unit); subtotal = sum of totals
        const subtotal = rows.reduce((s, r) => s + Number(r.rate || 0), 0);
        const pm = pmByVendor?.[vid];
        // BUG-350: expense model — method + amount + splitPayments
        const pmMethod = pm?.method || '';
        const pmAmount = pm?.amount ?? '';
        const pmRefId  = pm?.refId || '';
        const splitPayments = pm?.splitPayments ?? null;
        const splitSum = splitPayments ? splitPayments.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0) : 0;
        const lineTotal = parseFloat(pmAmount) || 0;
        const splitBalanced = splitPayments ? Math.abs(splitSum - lineTotal) < 0.01 : true;
        const pmMissing = !pmMethod;

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
                  <span>₹{Number(r.rate || 0).toFixed(2)} for {r.qty || r.suggest_qty} {r.unit}</span>{/* CR-348: total-price display */}
                </div>
              ))}
              <div className="flex justify-between font-semibold text-slate-700 pt-1 border-t border-slate-100 mt-1">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* BUG-350: Expense-model payment — method dropdown + amount + Split button */}
            <div className="space-y-2">

              {/* Single payment row (not in split mode) */}
              {!splitPayments && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={pmMethod}
                    onChange={e => onPmChange(vid, { ...pm, method: e.target.value, splitPayments: null })}
                    className="h-7 text-xs border border-slate-200 rounded px-1.5 bg-white focus:border-orange-400 outline-none min-w-[100px]"
                    data-testid={`pm-method-${vid}`}
                  >
                    <option value="">Payment method…</option>
                    <option value="Unpaid">Unpaid (credit)</option>
                    {(paymentMethodsList || []).filter(m => m !== 'partial').map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {pmMethod !== 'Unpaid' && pmMethod !== '' && (
                    <>
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number" min="0" value={pmAmount}
                          onChange={e => onPmChange(vid, { ...pm, amount: e.target.value })}
                          className="h-7 text-xs border border-slate-200 rounded pl-5 pr-1.5 bg-white focus:border-orange-400 outline-none w-[90px]"
                          data-testid={`pm-amount-${vid}`}
                        />
                      </div>
                      <input
                        type="text" value={pmRefId} placeholder="Ref ID (optional)"
                        onChange={e => onPmChange(vid, { ...pm, refId: e.target.value })}
                        className="h-7 text-xs border border-slate-200 rounded px-1.5 bg-white focus:border-orange-400 outline-none w-[120px]"
                        data-testid={`pm-refid-${vid}`}
                      />
                      {parseFloat(pmAmount) > 0 && (
                        <button
                          type="button"
                          onClick={() => onPmChange(vid, { ...pm, splitPayments: [{ method: pmMethod, amount: pmAmount }, { method: '', amount: '' }] })}
                          className="text-xs text-orange-600 hover:text-orange-700 underline transition-colors"
                          data-testid={`pm-split-btn-${vid}`}
                        >Split</button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Unpaid credit notice */}
              {pmMethod === 'Unpaid' && (
                <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 flex items-center gap-1.5" data-testid={`unpaid-notice-${vid}`}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  ₹{subtotal.toFixed(2)} will be recorded as outstanding credit
                </div>
              )}

              {/* Split rows */}
              {splitPayments && (
                <div className="space-y-1.5" data-testid={`splits-${vid}`}>
                  {splitPayments.map((sp, si) => (
                    <div key={si} className="flex items-center gap-2" data-testid={`split-row-${vid}-${si}`}>
                      <select
                        value={sp.method}
                        onChange={e => { const next = splitPayments.map((x, i) => i === si ? { ...x, method: e.target.value } : x); onPmChange(vid, { ...pm, splitPayments: next }); }}
                        className="h-7 text-xs border border-slate-200 rounded px-1.5 bg-white focus:border-orange-400 outline-none min-w-[90px]"
                        data-testid={`split-method-${vid}-${si}`}
                      >
                        <option value="">Method…</option>
                        <option value="Unpaid">Unpaid (credit)</option>
                        {(paymentMethodsList || []).filter(m => m !== 'partial').map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number" min="0" value={sp.amount}
                          onChange={e => { const next = splitPayments.map((x, i) => i === si ? { ...x, amount: e.target.value } : x); onPmChange(vid, { ...pm, splitPayments: next }); }}
                          className="h-7 text-xs border border-slate-200 rounded pl-5 pr-1.5 bg-white focus:border-orange-400 outline-none w-[80px]"
                          data-testid={`split-amount-${vid}-${si}`}
                        />
                      </div>
                      {splitPayments.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onPmChange(vid, { ...pm, splitPayments: splitPayments.filter((_, i) => i !== si) })}
                          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                          data-testid={`split-remove-${vid}-${si}`}
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => onPmChange(vid, { ...pm, splitPayments: [...splitPayments, { method: '', amount: '' }] })}
                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 transition-colors"
                    data-testid={`split-add-${vid}`}
                  ><Plus className="w-3 h-3" /> Add row</button>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className={splitBalanced ? 'text-green-600' : 'text-amber-600'} data-testid={`split-sum-${vid}`}>
                      {splitBalanced ? '✓' : '⚠'} ₹{splitSum.toFixed(2)} / ₹{lineTotal.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPmChange(vid, { ...pm, splitPayments: null })}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                      data-testid={`split-cancel-${vid}`}
                    >Cancel split</button>
                  </div>
                </div>
              )}

              {/* No method selected yet */}
              {pmMissing && (
                <div className="mt-1 flex items-center gap-1 text-xs text-red-600" data-testid={`pm-error-${vid}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Select a payment method
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
