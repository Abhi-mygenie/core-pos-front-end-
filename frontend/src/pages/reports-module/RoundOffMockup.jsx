/**
 * RoundOffMockup — CR-011 S22 (Phase 3, Batch I)
 * Round-Off Report: revenue includes round-offs. Shows note about detail in Order Ledger.
 * Data source: insights-sales (no dedicated round_up field — shows aggregate view)
 * Gate ①+④: Mockup with live API data.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsSales } from '../../api/services/insightsService';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Info } from 'lucide-react';

const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RoundOffMockup = () => {
  const navigate = useNavigate();
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [isSilentMode, setIsSilentMode] = useState(false);
  const today = new Date();
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom); const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom); const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('30D');
  const [isLoading, setIsLoading] = useState(false); const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null); const [salesData, setSalesData] = useState(null);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo; const draftValid = fromDate && toDate && fromDate <= toDate; const canApply = draftDirty && draftValid && !isLoading;
  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => { const t = new Date(); let f; if (p === '7D') f = new Date(t.getTime()-6*86400000); else if (p === '30D') f = new Date(t.getTime()-29*86400000); else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else return; const fd = fmtISO(f); const td = fmtISO(t); setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td); };

  const fetchData = useCallback(async () => { if (!appliedFrom || !appliedTo) return; setIsLoading(true); setError(null); try { const r = await fetchInsightsSales(appliedFrom, appliedTo); setSalesData(r.data || r); setHasLoadedOnce(true); } catch (e) { setError(e.message || 'Failed'); } finally { setIsLoading(false); } }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s22-round-off-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden"><main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s22-header">
          <div className="flex items-center gap-4"><button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s22-back-btn" onClick={() => navigate('/reports-module/payments')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button><div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Round-Off Report</h1><p className="text-[11px] text-zinc-500 mt-0.5">Round-off amounts included in revenue{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div></div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s22-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s22-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s22-date-to" /></label></div>
            <button onClick={handleApply} disabled={isLoading||!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s22-apply-btn"><Check className="w-4 h-4" /> Apply</button>
            <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s22-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
          </div>
        </header>
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4" data-testid="s22-info">
                <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Round-Off Data</h3>
                  <p className="text-sm text-blue-800">The <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">round_up</code> field is available per-order in the <strong>Order Ledger</strong>. The aggregated insights endpoint does not separate round-off from total revenue.</p>
                  <p className="text-sm text-blue-700 mt-2">For per-order round-off detail, use:</p>
                  <button onClick={() => navigate('/reports-module/order-ledger')} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors" data-testid="s22-goto-ledger">View Order Ledger →</button>
                </div>
              </div>
              {salesData && (
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s22-summary">
                  <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Revenue Summary (includes round-offs)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-zinc-100 rounded-lg p-4"><div className="text-xs text-zinc-500 uppercase mb-1">Total Revenue</div><div className="text-2xl font-bold text-zinc-950">{fmtINR(salesData.summary?.total_revenue || 0)}</div></div>
                    <div className="border border-zinc-100 rounded-lg p-4"><div className="text-xs text-zinc-500 uppercase mb-1">Total Orders</div><div className="text-2xl font-bold text-zinc-950">{salesData.summary?.total_orders || 0}</div></div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-4">Revenue figures include round-up amounts. Per-order breakdown available in Order Ledger.</p>
                </div>
              )}
            </div>
          </div>
        </ReportLoadingShield>
      </main></div>
    </div>
  );
};
export default RoundOffMockup;
