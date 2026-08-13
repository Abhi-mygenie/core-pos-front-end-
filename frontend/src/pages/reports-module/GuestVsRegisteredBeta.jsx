/**
 * GuestVsRegisteredBeta — CR-131
 * Customer lifecycle + win-back action screen — CRM-enriched.
 * Data: GET /api/pos/reports/summary + /churn-risk (both bands).
 * No date range picker — CRM uses fixed windows.
 * Old screen (CustomersMixMockup) is NOT touched.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { getSummary, getChurnRisk } from '../../api/services/crmReportService';

// CR-131: Tier badge — Platinum (not VIP)
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

// CR-131: lifecycle config — NO day numbers (tenant-configurable thresholds)
const LC = [
  { key: 'new',     label: 'New',     bg: '#dbeafe', color: '#1d4ed8', desc: 'First-timers & recent sign-ups' },
  { key: 'active',  label: 'Active',  bg: '#dcfce7', color: '#15803d', desc: 'Engaged, returning regulars' },
  { key: 'at_risk', label: 'At Risk', bg: '#fef9c3', color: '#854d0e', desc: 'Win-back window open — act now',    action: true },
  { key: 'dormant', label: 'Dormant', bg: '#fee2e2', color: '#b91c1c', desc: 'Going cold — last chance',         action: true },
  { key: 'churned', label: 'Churned', bg: '#f4f4f5', color: '#52525b', desc: 'Unlikely to return without campaign' },
];

const fmtINR = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const GuestVsRegisteredBeta = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // CR-131: load both bands upfront for side-by-side display
  const [churnHigh, setChurnHigh] = useState(null);
  const [churnMedium, setChurnMedium] = useState(null);
  const [churnLoading, setChurnLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null); setChurnLoading(true);
    try {
      const [s, ch, cm] = await Promise.all([
        getSummary(),
        getChurnRisk('high', 50),
        getChurnRisk('medium', 50),
      ]);
      setSummary(s); setSummaryLoaded(true);
      setChurnHigh(ch); setChurnMedium(cm);
    } catch (e) { setSummaryError(e.message || 'Failed to load'); }
    finally { setSummaryLoading(false); setChurnLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const lc = summary?.lifecycle || {};
  const lcTotal = Object.values(lc).reduce((s, v) => s + (v || 0), 0) || 1;

  const WaButton = ({ phone, testId }) => !phone ? null : (
    <button onClick={() => window.open(`https://wa.me/91${phone}`, '_blank')}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-white"
      style={{ background: '#25D366' }} data-testid={testId}>WA</button>
  );

  const ChurnTable = ({ data, loading, band }) => {
    if (loading) return <div className="p-6 text-center text-zinc-400 text-xs">Loading...</div>;
    return (
      <table className="w-full">
        <thead className="bg-zinc-50"><tr>
          <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">Customer</th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">Tier</th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-400 uppercase">Days</th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-400 uppercase">Spent</th>
          <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-400 uppercase">WA</th>
        </tr></thead>
        <tbody>
          {(data?.customers || []).map((c, i) => (
            <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`gvr-${band}-row-${i}`}>
              <td className="px-4 py-2.5"><div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div><div className="text-xs text-zinc-400">{c.phone || '—'}</div></td>
              <td className="px-3 py-2.5">{tierBadge(c.tier)}</td>
              {/* CR-131: last_visit_days_ago is nullable */}
              <td className="px-3 py-2.5 text-xs text-right font-bold text-amber-600">{c.last_visit_days_ago != null ? `${c.last_visit_days_ago}d` : '—'}</td>
              <td className="px-3 py-2.5 text-xs text-right font-semibold">{fmtINR(c.total_spent)}</td>
              <td className="px-3 py-2.5 text-center"><WaButton phone={c.phone} testId={`gvr-${band}-wa-${i}`} /></td>
            </tr>
          ))}
          {!data?.customers?.length && <tr><td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">No customers in this band</td></tr>}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="gvr-beta-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={loadAll} isRefreshing={summaryLoading} isOrderEntryOpen={false}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shrink-0" data-testid="gvr-beta-header">
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors"
              data-testid="gvr-beta-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Guest vs Registered</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200" data-testid="gvr-beta-badge">Beta</span>
                <span className="text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">POS + CRM</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Lifecycle stages · engagement depth · win-back bands</p>
            </div>
          </div>
          <div className="text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg" data-testid="gvr-beta-window-note">
            CRM uses fixed windows — date filter not applicable
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-5 bg-zinc-50">
          <ReportLoadingShield isLoading={summaryLoading} hasLoadedOnce={summaryLoaded} error={summaryError} onRetry={loadAll}>
            {summary && (
              <>
                {/* Hero: Lifecycle funnel */}
                <div className="bg-white rounded-xl border border-zinc-200 p-7" data-testid="gvr-beta-lifecycle-funnel">
                  <div className="flex items-center justify-between mb-7">
                    <div>
                      <h2 className="text-base font-bold text-zinc-900">Customer Journey — Where Are Your Registered Customers?</h2>
                      <p className="text-xs text-zinc-400 mt-1">summary.lifecycle · stage thresholds in CRM tenant settings · never hardcoded</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.lifecycle</span>
                  </div>
                  <div className="space-y-2">
                    {LC.map(({ key, label, bg, color, desc, action }) => {
                      const count = lc[key] || 0;
                      const pct = Math.round(count / lcTotal * 100);
                      return (
                        <div key={key}>
                          <div className="flex items-stretch gap-5">
                            <div className="w-28 shrink-0 flex flex-col justify-center">
                              <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</div>
                              <div className="text-[9px] text-zinc-400 mt-0.5 font-mono">lifecycle.{key}</div>
                            </div>
                            <div className="flex-1 flex items-center">
                              <div className="h-14 rounded-xl flex items-center justify-between px-5 w-full" style={{ background: bg }}>
                                <span className="text-2xl font-extrabold" style={{ color }} data-testid={`lc-count-${key}`}>{count.toLocaleString('en-IN')}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold" style={{ color }}>{pct}% of base</span>
                                  <span className="text-[10px] bg-white/70 font-semibold px-2.5 py-1 rounded-full" style={{ color }}>{desc}</span>
                                  {action && <span className="text-[10px] font-bold text-white px-3 py-1 rounded-lg" style={{ background: '#F26B33' }}>See Win-Back ↓</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          {key !== 'churned' && (
                            <div className="ml-28 pl-5 text-[10px] text-zinc-300 flex items-center gap-1 py-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                              {key === 'new' && 'Customers who return become Active'}
                              {key === 'active' && "Haven't visited recently → slip to At Risk"}
                              {key === 'at_risk' && 'Going cold — last chance before permanent churn'}
                              {key === 'dormant' && 'Exceeded churn threshold — very hard to recover'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center gap-8 text-xs text-zinc-400">
                    <span>Total: <strong className="text-zinc-700">{(summary.customers?.total || 0).toLocaleString('en-IN')}</strong></span>
                    <span>Healthy: <strong className="text-emerald-600">{((lc.new || 0) + (lc.active || 0)).toLocaleString('en-IN')}</strong></span>
                    <span>Win-back opportunity: <strong className="text-amber-600">{((lc.at_risk || 0) + (lc.dormant || 0)).toLocaleString('en-IN')}</strong></span>
                    <span className="ml-auto text-[10px] italic text-zinc-300">Stage labels stable · day thresholds vary per tenant</span>
                  </div>
                </div>

                {/* Insight cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="gvr-beta-aov">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Order Value Trend</h2><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.revenue</span></div>
                    <div className="space-y-4">
                      <div><div className="text-[10px] text-zinc-400 uppercase mb-1">All-Time AOV</div><div className="text-3xl font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value)}</div><div className="text-xs text-zinc-400">{(summary.revenue?.total_orders || 0).toLocaleString('en-IN')} total orders</div></div>
                      <div className="w-full h-px bg-zinc-100" />
                      <div><div className="text-[10px] text-zinc-400 uppercase mb-1">30-Day AOV</div><div className="text-3xl font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value_30d)}</div></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="gvr-beta-redemption">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Loyalty Engagement</h2><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.loyalty</span></div>
                    <div className="flex flex-col items-center justify-center h-28">
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f4f4f5" strokeWidth="4"/>
                          <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#329937" strokeWidth="4"
                            strokeDasharray={`${Math.min(summary.loyalty?.orders_with_redemption_pct || 0, 100)} ${100 - Math.min(summary.loyalty?.orders_with_redemption_pct || 0, 100)}`} strokeDashoffset="0"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-extrabold text-zinc-900" data-testid="gvr-redemption-pct">{(summary.loyalty?.orders_with_redemption_pct || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 mt-2 text-center">of orders use loyalty redemption</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="gvr-beta-points">
                    <div className="flex items-center justify-between mb-4"><h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Points Outstanding</h2><span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.loyalty</span></div>
                    <div className="text-4xl font-extrabold text-zinc-900" data-testid="gvr-points-outstanding">{(summary.loyalty?.points_outstanding || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-400 mt-1">points held across all members</div>
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="text-xs text-amber-700 font-semibold">Liability (at ₹0.10/pt)</div>
                      <div className="text-lg font-bold text-amber-800">{fmtINR((summary.loyalty?.points_outstanding || 0) * 0.10)}</div>
                    </div>
                  </div>
                </div>

                {/* Win-back: both bands side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden" data-testid="gvr-beta-winback-high">
                    <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        <span className="text-sm font-bold text-amber-800">At Risk</span>
                        {/* CR-131: data.count = full pool before limit */}
                        {churnHigh && <span className="text-xs font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{(churnHigh.count || 0).toLocaleString('en-IN')} total</span>}
                      </div>
                      <span className="text-[10px] text-amber-500 font-mono">band=high</span>
                    </div>
                    <ChurnTable data={churnHigh} loading={churnLoading} band="high" />
                  </div>
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden" data-testid="gvr-beta-winback-medium">
                    <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                        <span className="text-sm font-bold text-red-700">Dormant</span>
                        {/* CR-131: data.count = full pool before limit */}
                        {churnMedium && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{(churnMedium.count || 0).toLocaleString('en-IN')} total</span>}
                      </div>
                      <span className="text-[10px] text-red-400 font-mono">band=medium</span>
                    </div>
                    <ChurnTable data={churnMedium} loading={churnLoading} band="medium" />
                  </div>
                </div>
              </>
            )}
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default GuestVsRegisteredBeta;
