import React, { useMemo } from 'react';
import {
  X,
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Utensils,
  Plus,
  Clock,
} from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

const STATUS_STYLES = {
  served: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  comp: 'bg-purple-50 text-purple-700',
};
const STATUS_LABELS = {
  served: 'Served',
  cancelled: 'Cancelled',
  comp: 'Comp',
};

/**
 * S3 — Side-sheet Drill Template (CR-011 Phase 1)
 *
 * Renders a 480px right-side drill panel when a row is clicked in the
 * Item Sales table (S2). Uses real API data from `item.drill` when available.
 *
 * Props:
 *   item         — the row object from S2 (with drill: { orderLines, variations, addons, cancels })
 *   onClose      — callback to dismiss the sheet
 *   totalRevenue — total revenue from the current tab for % contribution calc
 */
const ItemDrillSheet = ({ item, onClose, totalRevenue = 0 }) => {
  const contribution = item && totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0.0';

  const drill = item?.drill || {};
  const orderLines = drill.orderLines || [];
  const variations = useMemo(() => drill.variations || [], [drill.variations]);
  const addons = drill.addons || [];
  const cancels = drill.cancels || [];

  const showVariations = variations.length > 0;
  const showAddons = addons.length > 0;
  const showCancels = cancels.length > 0;

  // For variation bar widths
  const totalVarQty = useMemo(
    () => variations.reduce((s, v) => s + v.qty, 0),
    [variations]
  );

  if (!item) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 transition-opacity"
        onClick={onClose}
        data-testid="drill-sheet-overlay"
      />

      {/* Sheet */}
      <div
        className="absolute inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-zinc-200 flex flex-col z-40 animate-slide-in-right"
        data-testid="reports-items-drill-sheet"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-100 bg-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}
                title={item.isVeg ? 'Veg' : 'Non-Veg'}
              />
              <h2
                className="text-lg font-semibold text-zinc-900 truncate"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
                data-testid="drill-sheet-item-name"
              >
                {item.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>{item.category}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span>{item.station}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors -mr-1 -mt-1"
            data-testid="drill-sheet-close-btn"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {/* KPI Strip */}
          <div className="grid grid-cols-3 gap-3 px-6 py-5 border-b border-zinc-100">
            <div className="bg-zinc-50 rounded-xl p-3.5" data-testid="drill-kpi-qty">
              <div className="flex items-center gap-2 mb-1.5">
                <ShoppingBag className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Qty Sold</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-950">{item.qty}</div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3.5" data-testid="drill-kpi-revenue">
              <div className="flex items-center gap-2 mb-1.5">
                <IndianRupee className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Revenue</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-950">{formatCurrency(item.revenue)}</div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3.5" data-testid="drill-kpi-avg">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Price</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-950">{formatCurrency(item.avgPrice)}</div>
            </div>
          </div>

          {/* Order Breakdown Table */}
          {orderLines.length > 0 && (
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Recent Orders
                <span className="text-xs font-normal text-zinc-400">({orderLines.length})</span>
              </h3>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200">
                      <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Order</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Qty</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Amount</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Waiter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orderLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 transition-colors" data-testid="drill-order-row">
                        <td className="px-3 py-2 text-xs font-medium text-zinc-800">{line.orderId}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {line.date ? line.date.slice(5, 16) : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-700 text-right font-medium">{line.qty}</td>
                        <td className="px-3 py-2 text-xs text-zinc-700 text-right">{formatCurrency(line.price)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[line.status] || 'bg-zinc-100 text-zinc-600'}`}>
                            {STATUS_LABELS[line.status] || line.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{line.waiter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[11px] text-zinc-400 text-right">
                Showing {orderLines.length} most recent lines
              </div>
            </div>
          )}

          {/* Variations Breakdown */}
          {showVariations && (
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-zinc-400" />
                Variation Breakdown
              </h3>
              <div className="space-y-2">
                {variations.map((v, idx) => {
                  const pct = totalVarQty > 0 ? ((v.qty / totalVarQty) * 100).toFixed(0) : 0;
                  return (
                    <div key={idx} className="flex items-center gap-3" data-testid="drill-variation-row">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-zinc-800">{v.label}</span>
                          <span className="text-xs text-zinc-500">{v.qty} qty &middot; {formatCurrency(v.revenue)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#F26B33] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-zinc-500 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Addon Attach Rates */}
          {showAddons && (
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-zinc-400" />
                Addon Attach Rate
              </h3>
              <div className="space-y-2.5">
                {addons.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between" data-testid="drill-addon-row">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-800">{a.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {a.rate}% attach
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {a.count} times &middot; {formatCurrency(a.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation Details */}
          {showCancels && (
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Cancellation Breakdown
              </h3>
              <div className="space-y-2">
                {cancels.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 bg-red-50/50 rounded-lg border border-red-100"
                    data-testid="drill-cancel-row"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-800">{c.reason || 'Reason not recorded'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          c.scope === 'order'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {c.scope === 'order' ? 'Order' : 'Item'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {c.type} &middot; by {c.by}
                      </div>
                      {c.notesList && c.notesList.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {c.notesList.map((note, ni) => (
                            <div key={ni} className="text-xs text-zinc-500 italic pl-2 border-l-2 border-zinc-200">
                              {note}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-red-700 shrink-0">
                      {c.count}x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty drill state */}
          {orderLines.length === 0 && !showVariations && !showAddons && !showCancels && (
            <div className="px-6 py-12 text-center text-zinc-400">
              <div className="text-sm">No detailed line data available for this item.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide mb-0.5">Discount</div>
              <div className="text-sm font-semibold text-zinc-900">{formatCurrency(item.discount)}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide mb-0.5">Tax</div>
              <div className="text-sm font-semibold text-zinc-900">{formatCurrency(item.tax)}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide mb-0.5">Contribution</div>
              <div className="text-sm font-semibold text-[#F26B33]">{contribution}%</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemDrillSheet;
