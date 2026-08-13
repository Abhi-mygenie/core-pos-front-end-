import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, ChevronDown, ChevronRight, RefreshCw, CheckCircle2,
  Wallet, TrendingUp, ArrowDownToLine, AlertTriangle, DollarSign,
  Edit3, X, Banknote, CreditCard, Smartphone, Building, ArrowRightLeft,
  ArrowLeft, Loader2
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import { COLORS } from "../constants";
import { useToast } from "../hooks/use-toast";
import * as settlementService from "../api/services/settlementService";
import { fromAPI, formatDateForAPI, formatDateISO } from "../api/transforms/settlementTransform";

const fmt = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

const formatDisplayDate = (d) => d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const isToday = (d) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); };

// ─── KPI Card ──────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="flex-1 rounded-lg p-3 border" style={{ borderColor: COLORS.borderGray, background: "#fff" }} data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center gap-1.5 mb-0.5">
      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>{label}</span>
    </div>
    <div className="text-lg font-bold" style={{ color: parseFloat(value) < 0 ? "#EF4444" : COLORS.darkText }}>{fmt(value)}</div>
    {sub && <div className="text-[10px]" style={{ color: COLORS.grayText }}>{sub}</div>}
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────
const SettlementPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [date, setDate] = useState(new Date());
  const [report, setReport] = useState(null);
  const [waiterList, setWaiterList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expandedRow, setExpandedRow] = useState(null);
  const [settleModal, setSettleModal] = useState(null);
  const [openingModal, setOpeningModal] = useState(false);
  const [transferModal, setTransferModal] = useState(null);
  const [actualBalances, setActualBalances] = useState({});

  // Settle modal state
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleType, setSettleType] = useState("full");

  // Opening balance state
  const [openingInputs, setOpeningInputs] = useState({});

  // ─── Fetch ────────────────────────────────────────────────────────
  const fetchReport = useCallback(async (d) => {
    setLoading(true);
    try {
      const dateStr = formatDateForAPI(d);
      const res = await settlementService.getSettlementReport(dateStr, dateStr);
      const parsed = fromAPI.settlementReport(res);
      setReport(parsed);
      setActualBalances({});
    } catch (err) {
      console.error("[Settlement] Failed to fetch report:", err);
      toast({ title: "Error", description: "Failed to load settlement report.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchWaiterList = useCallback(async () => {
    try {
      const res = await settlementService.getWaiterList();
      setWaiterList(fromAPI.waiterList(res));
    } catch (err) {
      console.error("[Settlement] Failed to fetch waiter list:", err);
    }
  }, []);

  useEffect(() => {
    fetchReport(date);
    fetchWaiterList();
  }, [fetchReport, fetchWaiterList, date]);

  // ─── Derived ──────────────────────────────────────────────────────
  const totals = report?.totals || {};
  const waiters = report?.waiters || [];
  const activeWaiters = useMemo(() => waiters.filter(w => w.cashCollected > 0 || w.openingBalance > 0 || w.balanceToSettle !== 0), [waiters]);
  const inactiveWaiters = useMemo(() => waiters.filter(w => w.cashCollected === 0 && w.openingBalance === 0 && w.balanceToSettle === 0), [waiters]);

  const getStatus = (w) => {
    if (w.balanceToSettle === 0 && w.settled > 0) return "settled";
    if (w.balanceToSettle !== 0) return "pending";
    return "idle";
  };

  // ─── Actions ──────────────────────────────────────────────────────
  const handleSettle = async () => {
    if (!settleModal) return;
    setSaving(true);
    try {
      const w = settleModal;
      const expected = w.totalFunds - w.settled;
      const actual = actualBalances[w.waiterId];
      const pilf = actual !== undefined ? expected - actual : 0;
      await settlementService.settleWaiter(formatDateISO(date), w.waiterId, settleAmount, settleType, pilf);
      toast({ title: "Settled", description: `${w.name} settled ${fmt(settleAmount)}` });
      setSettleModal(null);
      fetchReport(date);
    } catch (err) {
      console.error("[Settlement] Settle failed:", err);
      toast({ title: "Error", description: err.readableMessage || "Settlement failed.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleOpeningBalance = async () => {
    const entries = Object.entries(openingInputs)
      .filter(([, amount]) => amount > 0)
      .map(([waiterId, amount]) => {
        const w = waiters.find(wt => wt.waiterId === Number(waiterId));
        return { waiterId: Number(waiterId), amount, lastDayPending: w?.lastDayPending || 0 };
      });
    if (entries.length === 0) { toast({ title: "No changes", description: "Enter at least one amount." }); return; }
    setSaving(true);
    try {
      const payload = entries.map(e => ({
        waiter_id: e.waiterId,
        date: formatDateISO(date),
        last_day_pending: e.lastDayPending,
        today_given: e.amount,
      }));
      await settlementService.setOpeningBalance(payload);
      toast({ title: "Saved", description: `Opening balance set for ${entries.length} waiter(s).` });
      setOpeningModal(false);
      setOpeningInputs({});
      fetchReport(date);
    } catch (err) {
      console.error("[Settlement] Opening balance failed:", err);
      toast({ title: "Error", description: err.readableMessage || "Failed to set opening balance.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSelfSettle = async () => {
    setSaving(true);
    try {
      await settlementService.selfSettle(formatDateISO(date));
      toast({ title: "Self-Settled", description: "Your cash has been settled." });
      fetchReport(date);
    } catch (err) {
      console.error("[Settlement] Self-settle failed:", err);
      toast({ title: "Error", description: err.readableMessage || "Self-settlement failed.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openSettleModal = (w) => {
    setSettleAmount(Math.abs(Math.round(w.balanceToSettle)));
    setSettleType("full");
    setSettleModal(w);
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white" data-testid="settlement-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={false} setIsSilentMode={() => {}}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false}
      />

      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: COLORS.sectionBg }}>
        {/* Header */}
        <header className="bg-white border-b px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderColor: COLORS.borderGray }} data-testid="settlement-header">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="settlement-back-btn">
              <ArrowLeft className="w-4 h-4" style={{ color: COLORS.grayText }} />
            </button>
            <Wallet className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
            <h1 className="text-lg font-bold" style={{ color: COLORS.darkText }}>Settlement</h1>
            {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.primaryOrange }} />}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
              <input type="date" value={formatDateISO(date)}
                onChange={e => { const d = new Date(e.target.value + "T00:00:00"); if (!isNaN(d)) setDate(d); }}
                className="bg-transparent outline-none text-sm" style={{ color: COLORS.darkText }}
                data-testid="settlement-date-picker" />
            </div>
            <button onClick={() => fetchReport(date)} className="p-1.5 rounded-lg border hover:bg-gray-50" style={{ borderColor: COLORS.borderGray }} data-testid="settlement-refresh">
              <RefreshCw className="w-4 h-4" style={{ color: COLORS.grayText }} />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                    style={{ background: COLORS.primaryGreen }} data-testid="close-day-btn">
              <CheckCircle2 className="w-3.5 h-3.5" /> Close Day
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="px-5 py-4">
            {/* KPI Strip */}
            <div className="flex gap-2 mb-4">
              <KpiCard icon={Banknote} label="Opening Balance" value={totals.openingBalance} color={COLORS.primaryOrange} sub="Cash float given" />
              <KpiCard icon={TrendingUp} label="Cash Collected" value={totals.cashCollected} color={COLORS.primaryGreen}
                sub={<span title="total_sale formula pending backend confirmation (CR-033). Derived & validated: paid revenue − TAB settled + TAB punched." data-testid="settlement-total-sale-footnote">{`Total sale: ${fmt(totals.totalSale)}`} <span style={{ fontStyle: "italic" }}>· definition pending ⓘ</span></span>} />
              <KpiCard icon={ArrowDownToLine} label="Settled" value={totals.settled} color="#3B82F6" sub={totals.totalFunds ? `${Math.round(totals.settled / totals.totalFunds * 100)}% of funds` : ""} />
              <KpiCard icon={Wallet} label="Remaining" value={totals.remaining} color={COLORS.amber} sub="To be settled" />
              <KpiCard icon={AlertTriangle} label="Pilferage" value={totals.pilferage} color={totals.pilferage > 0 ? "#EF4444" : COLORS.primaryGreen} sub={totals.pilferage === 0 ? "All clear" : "Discrepancy"} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setOpeningModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-orange-50"
                style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }} data-testid="set-opening-btn">
                <Edit3 className="w-3.5 h-3.5" /> Set Opening Balance
              </button>
              <button onClick={handleSelfSettle} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                style={{ borderColor: "#3B82F6", color: "#3B82F6" }} data-testid="self-settle-btn">
                <DollarSign className="w-3.5 h-3.5" /> Self-Settle
              </button>
            </div>

            {/* Waiter Table */}
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: COLORS.borderGray }} data-testid="settlement-table">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "18%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Waiter</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Opening</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Cash Coll.</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Total Funds</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Settled</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Expected</th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Actual Bal.</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Pilferage</th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.grayText }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWaiters.map((w) => {
                    const status = getStatus(w);
                    const bal = w.balanceToSettle;
                    const expected = w.totalFunds - w.settled;
                    const actual = actualBalances[w.waiterId];
                    const pilf = actual !== undefined ? expected - actual : w.pilferage;
                    const isExpanded = expandedRow === w.waiterId;

                    return (
                      <React.Fragment key={w.waiterId}>
                        <tr className={`border-b transition-colors cursor-pointer ${
                          status === "settled" ? "bg-green-50/50" : bal !== 0 ? "hover:bg-orange-50/30" : "hover:bg-gray-50"
                        }`} style={{ borderColor: COLORS.borderGray }}
                          onClick={() => setExpandedRow(isExpanded ? null : w.waiterId)} data-testid={`waiter-row-${w.waiterId}`}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <ChevronRight className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} style={{ color: COLORS.grayText }} />
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "settled" ? "bg-green-500" : bal !== 0 ? "bg-amber-400" : "bg-gray-300"}`} />
                              <span className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{w.name}</span>
                              {status === "settled" && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">Settled</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: COLORS.darkText }}>{fmt(w.openingBalance)}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-medium" style={{ color: COLORS.primaryGreen }}>{fmt(w.cashCollected)}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: COLORS.darkText }}>{fmt(w.totalFunds)}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: w.settled > 0 ? "#3B82F6" : COLORS.grayText }}>{fmt(w.settled)}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(expected)}</td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            {bal !== 0 ? (
                              <input type="number" placeholder={String(Math.round(expected))}
                                value={actual ?? ""} onChange={e => setActualBalances(prev => ({ ...prev, [w.waiterId]: Number(e.target.value) }))}
                                className="w-full max-w-[100px] mx-auto px-2 py-1 text-sm text-right font-mono rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                style={{ borderColor: COLORS.amber, color: COLORS.darkText }}
                                data-testid={`actual-bal-${w.waiterId}`} />
                            ) : (
                              <span className="text-sm" style={{ color: COLORS.grayText }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: pilf > 0 ? "#EF4444" : pilf < 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                            {fmt(pilf)}
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {bal !== 0 ? (
                                <>
                                  <button onClick={() => openSettleModal(w)}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md text-white hover:opacity-90"
                                    style={{ background: COLORS.primaryOrange }} data-testid={`settle-btn-${w.waiterId}`}>Settle</button>
                                  <button onClick={() => setTransferModal(w)}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md border hover:bg-purple-50"
                                    style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }} data-testid={`transfer-btn-${w.waiterId}`}>Transfer</button>
                                </>
                              ) : status === "settled" ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <span className="text-xs" style={{ color: COLORS.grayText }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: "#FAFAFA" }}>
                            <td colSpan={9} className="px-5 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
                              <div className="flex gap-10 text-xs">
                                <div>
                                  <span className="font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Revenue</span>
                                  <div className="mt-1.5 space-y-0.5">
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Total Sale</span><span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(w.totalSale)}</span></div>
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Cash Paid</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.totalPaid)}</span></div>
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Del. Charges</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.deliveryCharge)}</span></div>
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Service Chg</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.serviceCharge)}</span></div>
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Unpaid</span><span className="font-mono" style={{ color: w.totalUnpaid > 0 ? "#EF4444" : COLORS.grayText }}>{fmt(w.totalUnpaid)}</span></div>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Tips</span>
                                  <div className="mt-1.5 space-y-0.5">
                                    {Object.entries(w.tipsByMode).filter(([, v]) => v > 0).map(([mode, val]) => (
                                      <div key={mode} className="flex items-center justify-between gap-6">
                                        <span style={{ color: COLORS.grayText }} className="capitalize">{mode}</span>
                                        <span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(val)}</span>
                                      </div>
                                    ))}
                                    {Object.values(w.tipsByMode).every(v => v === 0) && <span style={{ color: COLORS.grayText }}>No tips</span>}
                                    <div className="border-t pt-0.5 mt-0.5 flex justify-between gap-6" style={{ borderColor: COLORS.borderGray }}>
                                      <span className="font-medium" style={{ color: COLORS.darkText }}>Total</span>
                                      <span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(w.tips)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Cash Drawer</span>
                                  <div className="mt-1.5 space-y-0.5">
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Yesterday</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.lastDayPending)}</span></div>
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Given Today</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.todayGiven)}</span></div>
                                    <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>In Drawer</span><span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(w.cashDraw)}</span></div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {activeWaiters.length === 0 && !loading && (
                    <tr><td colSpan={9} className="px-5 py-8 text-center text-sm" style={{ color: COLORS.grayText }}>
                      No settlement data for {isToday(date) ? "today" : formatDisplayDate(date)}.
                    </td></tr>
                  )}

                  {inactiveWaiters.length > 0 && (
                    <tr style={{ background: "#F9FAFB" }}>
                      <td colSpan={9} className="px-3 py-2 text-xs border-b" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                        <span className="font-medium">{inactiveWaiters.length} inactive waiters</span>
                        <span className="ml-2">({inactiveWaiters.map(w => w.name).join(", ")})</span>
                      </td>
                    </tr>
                  )}

                  {waiters.length > 0 && (
                    <tr style={{ background: "#F0F0F0" }}>
                      <td className="px-3 py-2 text-sm font-bold" style={{ color: COLORS.darkText }}>TOTAL</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.darkText }}>{fmt(totals.openingBalance)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.primaryGreen }}>{fmt(totals.cashCollected)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.darkText }}>{fmt(totals.totalFunds)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: "#3B82F6" }}>{fmt(totals.settled)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.darkText }}>{fmt((totals.remaining || 0) + (totals.settled || 0))}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: totals.pilferage > 0 ? "#EF4444" : COLORS.grayText }}>{fmt(totals.pilferage)}</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── Settle Modal ── */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="settle-modal">
          <div className="bg-white rounded-2xl w-[420px] shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Settle — {settleModal.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>Balance to settle: {fmt(settleModal.balanceToSettle)}</p>
              </div>
              <button onClick={() => setSettleModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" style={{ color: COLORS.grayText }} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Settlement Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
                  <input type="number" value={settleAmount} onChange={e => setSettleAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2.5 text-lg font-mono rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} data-testid="settle-amount-input" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Settlement Type</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => { setSettleType("full"); setSettleAmount(Math.abs(Math.round(settleModal.balanceToSettle))); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg ${settleType === "full" ? "text-white" : "border"}`}
                    style={settleType === "full" ? { background: COLORS.primaryOrange } : { borderColor: COLORS.borderGray, color: COLORS.grayText }}
                    data-testid="settle-type-full">Full</button>
                  <button onClick={() => setSettleType("partial")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg ${settleType === "partial" ? "text-white" : "border"}`}
                    style={settleType === "partial" ? { background: COLORS.primaryOrange } : { borderColor: COLORS.borderGray, color: COLORS.grayText }}
                    data-testid="settle-type-partial">Partial</button>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: COLORS.sectionBg }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: COLORS.grayText }}>Expected Balance</span>
                  <span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(settleModal.totalFunds - settleModal.settled)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: COLORS.grayText }}>Auto-calculated Pilferage</span>
                  <span className="font-mono font-medium" style={{ color: COLORS.grayText }}>
                    {actualBalances[settleModal.waiterId] !== undefined
                      ? fmt((settleModal.totalFunds - settleModal.settled) - actualBalances[settleModal.waiterId])
                      : "₹0"}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setSettleModal(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={handleSettle} disabled={saving || settleAmount <= 0}
                className="px-6 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
                style={{ background: COLORS.primaryOrange }} data-testid="confirm-settle-btn">
                {saving ? "Settling..." : "Confirm Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Opening Balance Modal ── */}
      {openingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="opening-balance-modal">
          <div className="bg-white rounded-2xl w-[480px] shadow-xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Set Opening Balance</h3>
                <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>Assign cash float for {isToday(date) ? "today" : formatDisplayDate(date)}</p>
              </div>
              <button onClick={() => setOpeningModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" style={{ color: COLORS.grayText }} /></button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
              {(waiterList.length > 0 ? waiterList : waiters).map(w => {
                const wId = w.id || w.waiterId;
                const wName = w.name || w.full_name;
                const waiterData = waiters.find(wt => wt.waiterId === wId);
                return (
                  <div key={wId} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{wName}</div>
                    <div className="flex-1 text-xs text-right" style={{ color: COLORS.grayText }}>
                      Yesterday: {fmt(waiterData?.lastDayPending || 0)}
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: COLORS.grayText }}>₹</span>
                      <input type="number" placeholder={String(waiterData?.todayGiven || 0)}
                        value={openingInputs[wId] ?? ""}
                        onChange={e => setOpeningInputs(prev => ({ ...prev, [wId]: Number(e.target.value) }))}
                        className="w-24 pl-6 pr-2 py-1.5 text-sm font-mono rounded-lg border outline-none focus:ring-1 focus:ring-orange-200"
                        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                        data-testid={`opening-input-${wId}`} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setOpeningModal(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={handleOpeningBalance} disabled={saving}
                className="px-6 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
                style={{ background: COLORS.primaryOrange }} data-testid="save-opening-btn">
                {saving ? "Saving..." : "Save Opening Balance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Modal (Backend-Blocked) ── */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="transfer-modal">
          <div className="bg-white rounded-2xl w-[440px] shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
              <div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Transfer Cash</h3>
                </div>
                <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>From: {transferModal.name} · Available: {fmt(transferModal.balanceToSettle)}</p>
              </div>
              <button onClick={() => setTransferModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" style={{ color: COLORS.grayText }} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                <div className="text-xs" style={{ color: "#92400E" }}>
                  <span className="font-semibold">Awaiting backend API.</span> Transfer endpoint (<code className="px-1 py-0.5 rounded text-[10px]" style={{ background: "#FDE68A" }}>/waiter/cash-transfer</code>) not yet available.
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Transfer To</label>
                <select className="w-full mt-1 px-3 py-2.5 text-sm rounded-lg border outline-none opacity-60" style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} disabled>
                  <option value="">Select waiter...</option>
                  {(waiterList.length > 0 ? waiterList : waiters).filter(w => (w.id || w.waiterId) !== transferModal.waiterId).map(w => (
                    <option key={w.id || w.waiterId} value={w.id || w.waiterId}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
                  <input type="number" placeholder="0" disabled className="w-full pl-7 pr-4 py-2.5 text-lg font-mono rounded-lg border outline-none opacity-60"
                    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setTransferModal(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button disabled className="px-6 py-2 text-sm font-medium rounded-lg text-white opacity-50 cursor-not-allowed" style={{ background: "#8B5CF6" }}>Transfer (API Pending)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementPage;
