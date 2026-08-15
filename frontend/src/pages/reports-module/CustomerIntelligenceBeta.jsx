/**
 * CustomerIntelligenceBeta — CR-131
 * CRM-enriched customer intelligence report.
 * Data: GET /api/pos/reports/{summary, top-customers, churn-risk} (CR-078 Phase 1).
 * No date range picker — CRM uses fixed windows (all-time / 30d / 7d).
 * Old screen (CustomersRfmMockup) is NOT touched.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { getSummary, getTopCustomers, getChurnRisk } from '../../api/services/crmReportService';
import { Users, TrendingUp, Star, RotateCcw } from 'lucide-react';

// CR-131: Tier badge styles — Platinum (not VIP), matches CRM contract
const TIER_STYLES = {
  Platinum: 'bg-violet-100 text-violet-700 border border-violet-200',
  Gold:     'bg-yellow-50  text-yellow-700 border border-yellow-200',
  Silver:   'bg-zinc-100   text-zinc-600   border border-zinc-300',
  Bronze:   'bg-amber-50   text-amber-700  border border-amber-200',
};
const tierBadge = (tier) => ( // CR-131
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_STYLES[tier] || TIER_STYLES.Bronze}`}>
    {tier || 'Bronze'}
  </span>
);

// CR-131: Lifecycle stage config — NO day numbers (thresholds are tenant-configurable)
const LC_STYLES = {
  new:     { bar: '#bfdbfe', text: 'text-blue-700',    label: 'New' },
  active:  { bar: '#86efac', text: 'text-emerald-700', label: 'Active' },
  at_risk: { bar: '#fde047', text: 'text-amber-700',   label: 'At Risk' },
  dormant: { bar: '#fca5a5', text: 'text-red-600',     label: 'Dormant' },
  churned: { bar: '#d4d4d8', text: 'text-zinc-500',    label: 'Churned' },
};

const SORT_OPTIONS = [
  { key: 'total_spent',  label: 'By Spend'  },
  { key: 'total_visits', label: 'By Visits' },
  { key: 'total_points', label: 'By Points' },
];

const fmtINR  = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;
// CR-131: last_visit_days_ago is nullable — customer may have never ordered
const fmtDays = (d) => d == null ? '—' : d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`;

const CustomerIntelligenceBeta = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  const [sortBy, setSortBy] = useState('total_spent');
  const [topData, setTopData] = useState(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState(null);

  const [churnBand, setChurnBand] = useState('high');
  const [churnData, setChurnData] = useState({});
  const [churnLoading, setChurnLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null);
    try { setSummary(await getSummary()); setSummaryLoaded(true); }
    catch (e) { setSummaryError(e.message || 'Failed to load'); }
    finally { setSummaryLoading(false); }
  }, []);

  const loadTopCustomers = useCallback(async (sort) => {
    setTopLoading(true); setTopError(null);
    try { setTopData(await getTopCustomers(sort, 20)); }
    catch (e) { setTopError(e.message || 'Failed to load'); }
    finally { setTopLoading(false); }
  }, []);

  const loadChurnRisk = useCallback(async (band) => {
    setChurnLoading(true);
    try {
      const data = await getChurnRisk(band, 50);
      setChurnData(prev => ({ ...prev, [band]: data }));
    } catch (_e) { /* show empty state */ }
    finally { setChurnLoading(false); }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadTopCustomers(sortBy); }, [loadTopCustomers, sortBy]);
  useEffect(() => { loadChurnRisk(churnBand); }, [loadChurnRisk, churnBand]);

  const handleBandChange = (band) => {
    if (band === churnBand) return;
    setChurnBand(band);
    if (!churnData[band]) loadChurnRisk(band);
  };

  const lc = summary?.lifecycle || {};
  const lcTotal = Object.values(lc).reduce((s, v) => s + (v || 0), 0) || 1;
  // CR-131: data.count = full pool before limit — use for badge, not customers.length
  const activeChurn = churnData[churnBand];

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="customer-intel-beta-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => { loadSummary(); loadTopCustomers(sortBy); loadChurnRisk(churnBand); }}
        isRefreshing={summaryLoading} isOrderEntryOpen={false}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shrink-0" data-testid="customer-intel-beta-header">
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors"
              data-testid="customer-intel-beta-back-btn"
              onClick={() => navigate('/reports-module/dashboard')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Customer Intelligence</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200" data-testid="customer-intel-beta-badge">Beta</span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Source: CRM</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Lifecycle · tiers · revenue · top customers · win-back · CR-078 Phase 1</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg" data-testid="customer-intel-beta-window-note">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            CRM uses fixed windows — date filter not applicable
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-5 bg-zinc-50">
          <ReportLoadingShield isLoading={summaryLoading} hasLoadedOnce={summaryLoaded} error={summaryError} onRetry={loadSummary}>
            {summary && (
              <>
                {/* KPI Strip */}
                <div className="grid grid-cols-4 gap-4" data-testid="customer-intel-beta-kpi-strip">
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-4 h-4 text-blue-500" /></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Registered</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-total">{(summary.customers?.total || 0).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 font-mono">customers.total</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-500" /></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active (Last 30d)</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-active-30d">{(summary.customers?.active_30d || 0).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 font-mono">customers.active_30d</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Star className="w-4 h-4 text-amber-500" /></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">New This Week</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-new-7d">{(summary.customers?.new_7d || 0).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 font-mono">customers.new_7d</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Points Outstanding</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-points">{(summary.loyalty?.points_outstanding || 0).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 font-mono">loyalty.points_outstanding</div>
                  </div>
                </div>

                {/* Lifecycle + Tiers + Revenue */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-3 bg-white rounded-xl border border-zinc-200 p-6" data-testid="customer-intel-beta-lifecycle">
                    <div className="flex items-center justify-between mb-5">
                      <div><h2 className="text-sm font-semibold text-zinc-800">Customer Lifecycle</h2><p className="text-xs text-zinc-400 mt-0.5">Stage thresholds set per-restaurant in CRM settings</p></div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.lifecycle</span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(LC_STYLES).map(([key, cfg]) => {
                        const count = lc[key] || 0;
                        const pct = Math.round(count / lcTotal * 100);
                        return (
                          <div key={key} className="flex items-center gap-3" data-testid={`lifecycle-bar-${key}`}>
                            <span className={`w-20 text-[11px] font-bold px-2 py-1 rounded-md text-center bg-white border border-zinc-200 ${cfg.text}`}>{cfg.label}</span>
                            <div className="flex-1 h-8 bg-zinc-100 rounded-lg overflow-hidden">
                              <div className="h-full rounded-lg" style={{ width: `${Math.max(pct, 3)}%`, background: cfg.bar, minWidth: 48 }} />
                            </div>
                            <span className="w-14 text-right text-sm font-bold text-zinc-800">{count.toLocaleString('en-IN')}</span>
                            <span className="w-10 text-right text-xs text-zinc-400">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex-1" data-testid="customer-intel-beta-tiers">
                      <div className="flex items-center justify-between mb-4"><h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tier Distribution</h2><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.tiers</span></div>
                      <div className="space-y-2.5">
                        {[['platinum','bg-violet-500'],['gold','bg-yellow-400'],['silver','bg-zinc-400'],['bronze','bg-amber-400']].map(([t, barColor]) => {
                          const count = summary.tiers?.[t] || 0;
                          const total = Object.values(summary.tiers || {}).reduce((s, v) => s + v, 0) || 1;
                          const pct = Math.round(count / total * 100);
                          return (
                            <div key={t} className="flex items-center justify-between gap-3">
                              {tierBadge(t.charAt(0).toUpperCase() + t.slice(1))}
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(pct, 2)}%` }} /></div>
                                <span className="text-sm font-bold text-zinc-800 w-16 text-right">{count.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="customer-intel-beta-revenue">
                      <div className="flex items-center justify-between mb-3"><h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Revenue</h2><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.revenue</span></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><div className="text-[10px] text-zinc-400 uppercase">All-Time Total</div><div className="text-lg font-extrabold text-zinc-900">{fmtINR(summary.revenue?.total)}</div></div>
                        <div><div className="text-[10px] text-zinc-400 uppercase">Last 30 Days</div><div className="text-lg font-extrabold text-emerald-600">{fmtINR(summary.revenue?.revenue_30d)}</div></div>
                        <div><div className="text-[10px] text-zinc-400 uppercase">All-Time AOV</div><div className="text-lg font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value)}</div></div>
                        <div><div className="text-[10px] text-zinc-400 uppercase">30-Day AOV</div><div className="text-lg font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value_30d)}</div></div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                        <span>Loyalty redemption</span>
                        <span className="font-bold text-emerald-600">{(summary.loyalty?.orders_with_redemption_pct || 0).toFixed(1)}% of orders</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" data-testid="customer-intel-beta-top-customers">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div><h2 className="text-sm font-semibold text-zinc-800">Top Customers</h2><p className="text-xs text-zinc-400 mt-0.5">sort_by: {sortBy} · limit: 20</p></div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-zinc-100 rounded-lg p-1 gap-1" data-testid="top-customers-sort-toggle">
                        {SORT_OPTIONS.map(({ key, label }) => (
                          <button key={key} onClick={() => setSortBy(key)} disabled={topLoading}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${sortBy === key ? 'bg-[#F26B33] text-white' : 'text-zinc-600 hover:bg-zinc-200'}`}
                            data-testid={`sort-btn-${key}`}>{label}</button>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">CRM</span>
                    </div>
                  </div>
                  {topLoading ? <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
                  : topError ? <div className="p-8 text-center text-red-500 text-sm">{topError}</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-zinc-50"><tr>
                          <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase">Tier</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Visits</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Total Spent</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Avg Order</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Last Visit</th>
                        </tr></thead>
                        <tbody>
                          {(topData?.customers || []).map((c, i) => (
                            <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`top-customer-row-${i}`}>
                              <td className="px-5 py-3 text-sm font-bold text-zinc-400">{i + 1}</td>
                              <td className="px-4 py-3"><div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div><div className="text-xs text-zinc-400">{c.phone || '—'}</div></td>
                              <td className="px-4 py-3">{tierBadge(c.tier)}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-700">{c.total_visits}</td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR(c.total_spent)}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-600">{fmtINR(c.avg_order_value)}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-500">{fmtDays(c.last_visit_days_ago)}</td>
                            </tr>
                          ))}
                          {!topData?.customers?.length && <tr><td colSpan={7} className="py-12 text-center text-zinc-400 text-sm">No customers found</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Win-Back */}
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" data-testid="customer-intel-beta-winback">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div><h2 className="text-sm font-semibold text-zinc-800">Win-Back Action List</h2><p className="text-xs text-zinc-400 mt-0.5">data.count = full pool · no cache · fresh on each open</p></div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">CRM — always fresh</span>
                  </div>
                  <div className="flex border-b border-zinc-100">
                    <button onClick={() => handleBandChange('high')} data-testid="winback-band-high"
                      className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${churnBand === 'high' ? 'bg-amber-50 text-amber-800 border-b-2 border-amber-400' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />At Risk
                      {/* CR-131: data.count = full pool, not customers.length */}
                      {churnData.high && <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">{(churnData.high.count || 0).toLocaleString('en-IN')}</span>}
                    </button>
                    <button onClick={() => handleBandChange('medium')} data-testid="winback-band-medium"
                      className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${churnBand === 'medium' ? 'bg-red-50 text-red-700 border-b-2 border-red-400' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Dormant
                      {churnData.medium && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-1">{(churnData.medium.count || 0).toLocaleString('en-IN')}</span>}
                    </button>
                  </div>
                  {churnLoading ? <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div> : (
                    <table className="w-full">
                      <thead className="bg-zinc-50"><tr>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase">Tier</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Days</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Total Spent</th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase">Visits</th>
                        <th className="px-5 py-3 text-center text-[10px] font-semibold text-zinc-400 uppercase">WhatsApp</th>
                      </tr></thead>
                      <tbody>
                        {(activeChurn?.customers || []).map((c, i) => (
                          <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`winback-row-${i}`}>
                            <td className="px-5 py-3"><div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div><div className="text-xs text-zinc-400">{c.phone || '—'}</div></td>
                            <td className="px-4 py-3">{tierBadge(c.tier)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-amber-600">{c.last_visit_days_ago != null ? `${c.last_visit_days_ago}d` : '—'}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(c.total_spent)}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{c.total_visits}</td>
                            <td className="px-5 py-3 text-center">
                              {c.phone && (
                                <button onClick={() => window.open(`https://wa.me/91${c.phone}`, '_blank')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                  style={{ background: '#25D366' }} data-testid={`winback-wa-btn-${i}`}>WA</button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!activeChurn?.customers?.length && !churnLoading && (
                          <tr><td colSpan={6} className="py-12 text-center text-zinc-400 text-sm">No customers in this band</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                  {activeChurn && activeChurn.count > (activeChurn.customers?.length || 0) && (
                    <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-400 flex items-center justify-between">
                      <span>Showing {activeChurn.customers?.length} of {activeChurn.count.toLocaleString('en-IN')} · sorted oldest-visit-first</span>
                      <button onClick={() => loadChurnRisk(churnBand)} className="flex items-center gap-1 text-[#F26B33] font-medium hover:underline" data-testid="winback-refresh-btn">
                        <RotateCcw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default CustomerIntelligenceBeta;
