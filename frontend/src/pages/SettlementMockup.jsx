import React, { useState, useMemo } from "react";
import {
  Calendar, ChevronDown, ChevronRight, RefreshCw, CheckCircle2,
  Wallet, TrendingUp, ArrowDownToLine, AlertTriangle, DollarSign,
  Edit3, X, Banknote, CreditCard, Smartphone, Building, ArrowRightLeft
} from "lucide-react";
import { COLORS } from "../constants";
import Sidebar from "../components/layout/Sidebar";

// ─── Seed Data (from real API shape — cafe103 June 3) ──────────────
const SEED_TOTALS = {
  total_opening_balance: 1500,
  total_today_collection: 10220,
  total_today_delivery_charge: 350,
  total_today_service_charge: 1200,
  total_today_tips: 380,
  total_today_settlement: 6500,
  total_pilferage: 0,
  total_sale: 46217,
  total_paid: 10220,
  total_unpaid: 0,
  total_total_funds: 11720,
  total_today_given: 1500,
  total_balance_to_settle: 5220,
  last_day_pending: 0,
};

const SEED_WAITERS = [
  {
    waiter_id: 3081, full_name: "Counter",
    opening_balance: "500.00", last_day_pending: "0.00", today_given: "500.00",
    today_collection: "8420.00", today_delivery_charge: "200.00", today_tips: "150.00",
    today_service_charge: "800.00", total_sale: "32400.00", total_paid: "8420.00",
    total_unpaid: "0.00", total_funds: "8920.00", cash_draw: "9100.00",
    today_settlement: "5000.00", pilferage: "0.00", balance_to_settle: "3920.00",
    tips_by_mode: { cash: "50.00", card: "0.00", upi: "100.00", TAB: "0.00", ROOM: "0.00", Other: "0.00" },
  },
  {
    waiter_id: 3087, full_name: "Jitender",
    opening_balance: "300.00", last_day_pending: "0.00", today_given: "300.00",
    today_collection: "1200.00", today_delivery_charge: "150.00", today_tips: "80.00",
    today_service_charge: "200.00", total_sale: "8500.00", total_paid: "1200.00",
    total_unpaid: "0.00", total_funds: "1500.00", cash_draw: "1480.00",
    today_settlement: "1500.00", pilferage: "0.00", balance_to_settle: "0.00",
    tips_by_mode: { cash: "30.00", card: "50.00", upi: "0.00", TAB: "0.00", ROOM: "0.00", Other: "0.00" },
  },
  {
    waiter_id: 3088, full_name: "Vijay",
    opening_balance: "200.00", last_day_pending: "0.00", today_given: "200.00",
    today_collection: "350.00", today_delivery_charge: "0.00", today_tips: "50.00",
    today_service_charge: "100.00", total_sale: "3200.00", total_paid: "350.00",
    total_unpaid: "0.00", total_funds: "550.00", cash_draw: "520.00",
    today_settlement: "0.00", pilferage: "0.00", balance_to_settle: "550.00",
    tips_by_mode: { cash: "20.00", card: "0.00", upi: "30.00", TAB: "0.00", ROOM: "0.00", Other: "0.00" },
  },
  {
    waiter_id: 3061, full_name: "Manager",
    opening_balance: "500.00", last_day_pending: "0.00", today_given: "500.00",
    today_collection: "250.00", today_delivery_charge: "0.00", today_tips: "100.00",
    today_service_charge: "100.00", total_sale: "2117.00", total_paid: "250.00",
    total_unpaid: "0.00", total_funds: "750.00", cash_draw: "750.00",
    today_settlement: "0.00", pilferage: "0.00", balance_to_settle: "750.00",
    tips_by_mode: { cash: "0.00", card: "0.00", upi: "100.00", TAB: "0.00", ROOM: "0.00", Other: "0.00" },
  },
  {
    waiter_id: 3063, full_name: "Owner",
    opening_balance: "0.00", last_day_pending: "0.00", today_given: "0.00",
    today_collection: "0.00", today_delivery_charge: "0.00", today_tips: "0.00",
    today_service_charge: "0.00", total_sale: "0.00", total_paid: "0.00",
    total_unpaid: "0.00", total_funds: "0.00", cash_draw: "0.00",
    today_settlement: "0.00", pilferage: "0.00", balance_to_settle: "0.00",
    tips_by_mode: { cash: "0.00", card: "0.00", upi: "0.00", TAB: "0.00", ROOM: "0.00", Other: "0.00" },
  },
  {
    waiter_id: 3089, full_name: "Pankaj",
    opening_balance: "0.00", last_day_pending: "0.00", today_given: "0.00",
    today_collection: "0.00", today_delivery_charge: "0.00", today_tips: "0.00",
    today_service_charge: "0.00", total_sale: "0.00", total_paid: "0.00",
    total_unpaid: "0.00", total_funds: "0.00", cash_draw: "0.00",
    today_settlement: "0.00", pilferage: "0.00", balance_to_settle: "0.00",
    tips_by_mode: { cash: "0.00", card: "0.00", upi: "0.00", TAB: "0.00", ROOM: "0.00", Other: "0.00" },
  },
];

const fmt = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

// ─── KPI Card ──────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="flex-1 rounded-lg p-3 border" style={{ borderColor: COLORS.borderGray, background: "#fff" }}>
    <div className="flex items-center gap-1.5 mb-0.5">
      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>{label}</span>
    </div>
    <div className="text-lg font-bold" style={{ color: parseFloat(value) < 0 ? "#EF4444" : COLORS.darkText }}>
      {fmt(value)}
    </div>
    {sub && <div className="text-[10px]" style={{ color: COLORS.grayText }}>{sub}</div>}
  </div>
);

// ─── Settlement Page Mockup ────────────────────────────────────────
const SettlementMockup = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [settleModal, setSettleModal] = useState(null);
  const [openingModal, setOpeningModal] = useState(false);
  const [transferModal, setTransferModal] = useState(null);
  const [actualBalances, setActualBalances] = useState({});
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const totals = SEED_TOTALS;
  const waiters = SEED_WAITERS;

  const activeWaiters = useMemo(() => waiters.filter(w => parseFloat(w.today_collection) > 0 || parseFloat(w.opening_balance) > 0), [waiters]);
  const inactiveWaiters = useMemo(() => waiters.filter(w => parseFloat(w.today_collection) === 0 && parseFloat(w.opening_balance) === 0), [waiters]);

  const getStatus = (w) => {
    const bal = parseFloat(w.balance_to_settle);
    const settled = parseFloat(w.today_settlement);
    if (bal === 0 && settled > 0) return "settled";
    if (bal > 0) return "pending";
    return "idle";
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar — same pattern as Audit Report */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={false}
        setIsSilentMode={() => {}}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onOpenCredit={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        isOrderEntryOpen={false}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: COLORS.sectionBg }}>
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
          <h1 className="text-xl font-bold" style={{ color: COLORS.darkText }}>Settlement</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}>
            <Calendar className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
            Today, Jun 9, 2026
            <ChevronDown className="w-3 h-3" style={{ color: COLORS.grayText }} />
          </button>
          <button className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: COLORS.borderGray }}>
            <RefreshCw className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ background: COLORS.primaryGreen }}>
            <CheckCircle2 className="w-4 h-4" />
            Close Day
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-4">
        {/* KPI Strip */}
        <div className="flex gap-2 mb-4">
          <KpiCard icon={Banknote} label="Opening Balance" value={totals.total_opening_balance} color={COLORS.primaryOrange} sub="Cash float given" />
          <KpiCard icon={TrendingUp} label="Cash Collected" value={totals.total_today_collection} color={COLORS.primaryGreen}
            sub={<span title="total_sale formula pending backend confirmation (CR-033). Derived & validated: paid revenue − TAB settled + TAB punched." data-testid="settlement-mockup-total-sale-footnote">{`Total sale: ${fmt(totals.total_sale)}`} <span style={{ fontStyle: "italic" }}>· definition pending ⓘ</span></span>} />
          <KpiCard icon={ArrowDownToLine} label="Settled" value={totals.total_today_settlement} color="#3B82F6"
                   sub={`${Math.round(totals.total_today_settlement / (totals.total_total_funds || 1) * 100)}% of funds`} />
          <KpiCard icon={Wallet} label="Remaining" value={totals.total_balance_to_settle} color={COLORS.amber}
                   sub="To be settled" />
          <KpiCard icon={AlertTriangle} label="Pilferage" value={totals.total_pilferage}
                   color={parseFloat(totals.total_pilferage) > 0 ? "#EF4444" : COLORS.primaryGreen}
                   sub={parseFloat(totals.total_pilferage) === 0 ? "All clear" : "Discrepancy found"} />
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpeningModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-orange-50 transition-colors"
              style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}>
              <Edit3 className="w-4 h-4" />
              Set Opening Balance
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-blue-50 transition-colors"
                  style={{ borderColor: "#3B82F6", color: "#3B82F6" }}>
            <DollarSign className="w-4 h-4" />
            Self-Settle
          </button>
        </div>

        {/* Waiter Table */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
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
              {/* Active Waiters */}
              {activeWaiters.map((w) => {
                const status = getStatus(w);
                const bal = parseFloat(w.balance_to_settle);
                const expected = parseFloat(w.total_funds) - parseFloat(w.today_settlement);
                const actual = actualBalances[w.waiter_id];
                const pilf = actual !== undefined ? expected - actual : parseFloat(w.pilferage);
                const isExpanded = expandedRow === w.waiter_id;

                return (
                  <React.Fragment key={w.waiter_id}>
                    <tr className={`border-b transition-colors cursor-pointer ${
                      status === "settled" ? "bg-green-50/50" : bal > 0 ? "hover:bg-orange-50/30" : "hover:bg-gray-50"
                    }`} style={{ borderColor: COLORS.borderGray }}
                      onClick={() => setExpandedRow(isExpanded ? null : w.waiter_id)}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <ChevronRight className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} style={{ color: COLORS.grayText }} />
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "settled" ? "bg-green-500" : bal > 0 ? "bg-amber-400" : "bg-gray-300"}`} />
                          <span className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{w.full_name}</span>
                          {status === "settled" && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">Settled</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: COLORS.darkText }}>{fmt(w.opening_balance)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-medium" style={{ color: COLORS.primaryGreen }}>{fmt(w.today_collection)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: COLORS.darkText }}>{fmt(w.total_funds)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: parseFloat(w.today_settlement) > 0 ? "#3B82F6" : COLORS.grayText }}>{fmt(w.today_settlement)}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(expected)}</td>
                      <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                        {bal > 0 ? (
                          <input type="number" placeholder={String(Math.round(expected))}
                            value={actual ?? ""} onChange={e => setActualBalances(prev => ({ ...prev, [w.waiter_id]: Number(e.target.value) }))}
                            className="w-full max-w-[100px] mx-auto px-2 py-1 text-sm text-right font-mono rounded border outline-none focus:ring-1 focus:ring-orange-200"
                            style={{ borderColor: COLORS.amber, color: COLORS.darkText }} />
                        ) : (
                          <span className="text-sm" style={{ color: COLORS.grayText }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono" style={{ color: pilf > 0 ? "#EF4444" : pilf < 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                        {actual !== undefined ? fmt(pilf) : fmt(w.pilferage)}
                      </td>
                      <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                        {bal > 0 ? (
                          <>
                            <button onClick={() => setSettleModal(w)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md text-white hover:opacity-90"
                              style={{ background: COLORS.primaryOrange }}>Settle</button>
                            <button onClick={() => setTransferModal(w)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border hover:bg-purple-50 transition-colors"
                              style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }}>Transfer</button>
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
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Total Sale</span><span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(w.total_sale)}</span></div>
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Cash Paid</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.total_paid)}</span></div>
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Del. Charges</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.today_delivery_charge)}</span></div>
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Service Chg</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.today_service_charge)}</span></div>
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Unpaid</span><span className="font-mono" style={{ color: parseFloat(w.total_unpaid) > 0 ? "#EF4444" : COLORS.grayText }}>{fmt(w.total_unpaid)}</span></div>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Tips</span>
                              <div className="mt-1.5 space-y-0.5">
                                {Object.entries(w.tips_by_mode).filter(([, v]) => parseFloat(v) > 0).map(([mode, val]) => (
                                  <div key={mode} className="flex items-center justify-between gap-6">
                                    <span style={{ color: COLORS.grayText }} className="capitalize">{mode}</span>
                                    <span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(val)}</span>
                                  </div>
                                ))}
                                {Object.values(w.tips_by_mode).every(v => parseFloat(v) === 0) && (
                                  <span style={{ color: COLORS.grayText }}>No tips</span>
                                )}
                                <div className="border-t pt-0.5 mt-0.5 flex justify-between gap-6" style={{ borderColor: COLORS.borderGray }}>
                                  <span className="font-medium" style={{ color: COLORS.darkText }}>Total</span>
                                  <span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(w.today_tips)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className="font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Cash Drawer</span>
                              <div className="mt-1.5 space-y-0.5">
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Yesterday</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.last_day_pending)}</span></div>
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>Given Today</span><span className="font-mono" style={{ color: COLORS.darkText }}>{fmt(w.today_given)}</span></div>
                                <div className="flex justify-between gap-6"><span style={{ color: COLORS.grayText }}>In Drawer</span><span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(w.cash_draw)}</span></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Inactive Waiters */}
              {inactiveWaiters.length > 0 && (
                <tr style={{ background: "#F9FAFB" }}>
                  <td colSpan={9} className="px-3 py-2 text-xs border-b" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                    <span className="font-medium">{inactiveWaiters.length} inactive waiters</span>
                    <span className="ml-2">({inactiveWaiters.map(w => w.full_name).join(", ")})</span>
                  </td>
                </tr>
              )}

              {/* Totals Row */}
              <tr style={{ background: "#F0F0F0" }}>
                <td className="px-3 py-2 text-sm font-bold" style={{ color: COLORS.darkText }}>TOTAL</td>
                <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.darkText }}>{fmt(totals.total_opening_balance)}</td>
                <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.primaryGreen }}>{fmt(totals.total_today_collection)}</td>
                <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.darkText }}>{fmt(totals.total_total_funds)}</td>
                <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: "#3B82F6" }}>{fmt(totals.total_today_settlement)}</td>
                <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: COLORS.darkText }}>{fmt(totals.total_balance_to_settle + totals.total_today_settlement)}</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right text-sm font-mono font-bold" style={{ color: parseFloat(totals.total_pilferage) > 0 ? "#EF4444" : COLORS.grayText }}>{fmt(totals.total_pilferage)}</td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>
      </main>

      {/* ── Settle Modal ── */}
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-[420px] shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Settle — {settleModal.full_name}</h3>
                <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>Balance to settle: {fmt(settleModal.balance_to_settle)}</p>
              </div>
              <button onClick={() => setSettleModal(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Settlement Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
                  <input type="number" defaultValue={Math.round(parseFloat(settleModal.balance_to_settle))}
                    className="w-full pl-7 pr-4 py-2.5 text-lg font-mono rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Settlement Type</label>
                <div className="flex gap-2 mt-1">
                  <button className="flex-1 py-2 text-sm font-medium rounded-lg text-white" style={{ background: COLORS.primaryOrange }}>Full</button>
                  <button className="flex-1 py-2 text-sm font-medium rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Partial</button>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: COLORS.sectionBg }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: COLORS.grayText }}>Expected Balance</span>
                  <span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{fmt(parseFloat(settleModal.total_funds) - parseFloat(settleModal.today_settlement))}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: COLORS.grayText }}>Auto-calculated Pilferage</span>
                  <span className="font-mono font-medium" style={{ color: COLORS.grayText }}>₹0</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setSettleModal(null)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button className="px-6 py-2 text-sm font-medium rounded-lg text-white" style={{ background: COLORS.primaryOrange }}>Confirm Settlement</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Opening Balance Modal ── */}
      {openingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-[480px] shadow-xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Set Opening Balance</h3>
                <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>Assign cash float for today</p>
              </div>
              <button onClick={() => setOpeningModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
              {waiters.map(w => (
                <div key={w.waiter_id} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{w.full_name}</div>
                  <div className="flex-1 text-xs text-right" style={{ color: COLORS.grayText }}>
                    Yesterday: {fmt(w.last_day_pending)}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
                    <input type="number" placeholder="0"
                      className="w-28 pl-7 pr-3 py-2 text-sm font-mono rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                      style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setOpeningModal(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button className="px-6 py-2 text-sm font-medium rounded-lg text-white" style={{ background: COLORS.primaryOrange }}>Save Opening Balance</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Modal (Backend-Blocked — UI Placeholder) ── */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-[440px] shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
              <div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Transfer Cash</h3>
                </div>
                <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>From: {transferModal.full_name} · Available: {fmt(transferModal.balance_to_settle)}</p>
              </div>
              <button onClick={() => setTransferModal(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Backend blocked banner */}
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                <div className="text-xs" style={{ color: "#92400E" }}>
                  <span className="font-semibold">Awaiting backend API.</span> Transfer endpoint (<code className="px-1 py-0.5 rounded text-[10px]" style={{ background: "#FDE68A" }}>/waiter/cash-transfer</code>) is not yet available. This feature will be enabled once the backend team ships it.
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Transfer To</label>
                <select className="w-full mt-1 px-3 py-2.5 text-sm rounded-lg border outline-none" style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} disabled>
                  <option value="">Select waiter...</option>
                  {waiters.filter(w => w.waiter_id !== transferModal.waiter_id).map(w => (
                    <option key={w.waiter_id} value={w.waiter_id}>{w.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
                  <input type="number" placeholder="0" disabled
                    className="w-full pl-7 pr-4 py-2.5 text-lg font-mono rounded-lg border outline-none opacity-60"
                    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} />
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: COLORS.sectionBg }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: COLORS.grayText }}>From</span>
                  <span className="font-mono font-medium" style={{ color: COLORS.darkText }}>{transferModal.full_name}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: COLORS.grayText }}>To</span>
                  <span className="font-mono" style={{ color: COLORS.grayText }}>Not selected</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: COLORS.grayText }}>Amount</span>
                  <span className="font-mono" style={{ color: COLORS.grayText }}>₹0</span>
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

export default SettlementMockup;
