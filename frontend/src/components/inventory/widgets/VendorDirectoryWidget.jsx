// CR-078 · CR-079 · Widget: Vendor Directory — distinct vendors + lifetime spend + last purchase
import { Truck, ChevronRight } from 'lucide-react';

export default function VendorDirectoryWidget({ vil }) {
  const byVendor = new Map();
  (vil || []).forEach(r => {
    if (!r.vendor_id) return;
    const key = String(r.vendor_id);
    if (!byVendor.has(key)) byVendor.set(key, { name: r.Vendor_Name || `Vendor #${r.vendor_id}`, spend: 0, last: '' });
    const entry = byVendor.get(key);
    entry.spend += Number(r.line_total || r.Amount) || 0;
    if (String(r.Purchase_Date) > String(entry.last)) entry.last = r.Purchase_Date;
  });
  const rows = Array.from(byVendor.values()).sort((a, b) => b.spend - a.spend).slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="widget-vendor-directory">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900">Vendor Directory</h3>
        </div>
        <a className="text-xs text-slate-400 hover:text-orange-500 flex items-center gap-0.5" data-testid="widget-details-vendor-directory">View details <ChevronRight className="w-3 h-3" /></a>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4">No vendors on record yet.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs" data-testid={`vendor-dir-${i}`}>
              <span className="text-slate-700 truncate flex-1">{r.name}</span>
              <div className="flex items-center gap-3 text-slate-500 text-[10px]">
                <span>₹{r.spend.toFixed(0)}</span>
                <span>{r.last || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-2">{byVendor.size} unique vendor{byVendor.size === 1 ? '' : 's'} on record</p>
    </div>
  );
}
