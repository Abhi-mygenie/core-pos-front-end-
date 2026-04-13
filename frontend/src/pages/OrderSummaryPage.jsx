import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, TrendingUp, Banknote, Clock, CreditCard as CreditCardIcon, XCircle,
  Smartphone, Building, ChefHat, Wine
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import DatePicker from "../components/reports/DatePicker";
import { useRestaurant } from "../contexts";
import { getDailySalesReport } from "../api/services/reportService";

/**
 * OrderSummaryPage — Order Summary Report
 * Uses single daily-sales-revenue-report API for all data
 */
const OrderSummaryPage = () => {
  const navigate = useNavigate();
  const { currencySymbol, features, restaurant } = useRestaurant();
  const paymentMethods = restaurant?.paymentMethods || {};
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  
  // Date state
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  // Data state - from single API call
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch summary data from single API
  const fetchSummaryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getDailySalesReport(selectedDate);
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to fetch summary data:', err);
      setError(err.message || 'Failed to load summary');
      setSummaryData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Fetch data when date changes
  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  // Calculate percentages for payment breakdown
  const paymentPercentages = useMemo(() => {
    if (!summaryData?.paymentBreakdown) return { cash: 0, card: 0, upi: 0 };
    const total = summaryData.sales || 1;
    return {
      cash: Math.round((summaryData.paymentBreakdown.cash / total) * 100),
      card: Math.round((summaryData.paymentBreakdown.card / total) * 100),
      upi: Math.round((summaryData.paymentBreakdown.upi / total) * 100),
    };
  }, [summaryData]);

  // Dynamic station entries (only show stations with revenue > 0)
  const stationEntries = useMemo(() => {
    if (!summaryData?.stationRevenue) return [];
    const raw = summaryData.stationRevenue;
    const entries = Object.entries(raw)
      .map(([key, val]) => ({ name: key, amount: parseFloat(val) || 0 }))
      .filter(e => e.amount > 0);
    const total = entries.reduce((s, e) => s + e.amount, 0) || 1;
    return entries.map(e => ({ ...e, pct: Math.round((e.amount / total) * 100) }));
  }, [summaryData]);

  // Station icon/color map
  const stationStyle = {
    KDS:      { icon: ChefHat, bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20', iconClass: 'text-amber-400', barClass: 'bg-amber-500' },
    BAR:      { icon: Wine,    bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/20', iconClass: 'text-violet-400', barClass: 'bg-violet-500' },
  };
  const defaultStationStyle = { icon: ChefHat, bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/20', iconClass: 'text-cyan-400', barClass: 'bg-cyan-500' };

  // Format currency
  const formatCurrency = (amount) => {
    return `${currencySymbol}${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle running orders click -> navigate to dashboard
  const handleRunningOrdersClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex h-screen bg-slate-950" data-testid="order-summary-page">
      {/* Sidebar */}
      <Sidebar 
        isExpanded={isSidebarExpanded} 
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        isOrderEntryOpen={false}
      />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Order Summary</h1>
                <p className="text-sm text-slate-400">Daily revenue overview</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <DatePicker 
                value={selectedDate}
                onChange={setSelectedDate}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : summaryData ? (
            <>
              {/* ROW 1: KEY METRICS - 5 Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 lg:gap-3 mb-4 lg:mb-6" data-testid="summary-cards">
                {/* Sales Card */}
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4" data-testid="sales-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-emerald-300 uppercase">Sales</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(summaryData.sales)}
                  </div>
                  <div className="text-xs text-slate-400">Total revenue</div>
                </div>

                {/* Paid Revenue Card */}
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4" data-testid="paid-revenue-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <Banknote className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-blue-300 uppercase">Paid</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(summaryData.paidRevenue)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {summaryData.deductions?.roundOff ? (() => {
                      const tabAmount = summaryData.orderTAB || 0;
                      const tabSettled = summaryData.tabSettled?.total || 0;
                      const hasTab = paymentMethods.tab && (tabAmount > 0 || tabSettled > 0);
                      const calcSum = hasTab 
                        ? summaryData.sales - tabAmount + tabSettled + summaryData.deductions.roundOff
                        : summaryData.sales + summaryData.deductions.roundOff;
                      const diff = summaryData.paidRevenue - calcSum;
                      const diffAbs = Math.abs(diff);
                      const formula = hasTab
                        ? `${formatCurrency(summaryData.sales)} - ${formatCurrency(tabAmount)} + ${formatCurrency(tabSettled)} + ${formatCurrency(summaryData.deductions.roundOff)} = ${formatCurrency(calcSum)}`
                        : `${formatCurrency(summaryData.sales)} + ${formatCurrency(summaryData.deductions.roundOff)} = ${formatCurrency(calcSum)}`;
                      return (
                        <>
                          {formula}
                          {diffAbs > 0.01 && (
                            <span className={`ml-1 font-medium ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ({diff > 0 ? '+' : ''}{formatCurrency(diff)})
                            </span>
                          )}
                        </>
                      );
                    })() : 'Collected today'}
                  </div>
                </div>

                {/* Running Orders Card - Clickable */}
                <div 
                  className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 cursor-pointer hover:border-amber-400/50 transition-colors"
                  onClick={handleRunningOrdersClick}
                  data-testid="running-orders-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs font-medium text-amber-300 uppercase">Running</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(summaryData.runningOrders)}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    In progress <span className="text-amber-400">→</span>
                  </div>
                </div>

                {/* TAB (Credit) Card - only if restaurant has TAB enabled */}
                {paymentMethods.tab && (
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4" data-testid="tab-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                      <CreditCardIcon className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-purple-300 uppercase">TAB</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(summaryData.orderTAB)}
                  </div>
                  <div className="text-xs text-slate-400">Credit given</div>
                </div>
                )}

                {/* Cancelled Card */}
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-4" data-testid="cancelled-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-500/20 rounded-lg">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-xs font-medium text-red-300 uppercase">Cancelled</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(summaryData.cancelled)}
                  </div>
                  <div className="text-xs text-slate-400">Lost revenue</div>
                </div>
              </div>

              {/* ROW 2: REVENUE BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                {/* Payment Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="payment-breakdown">
                  <h3 className="text-base font-semibold text-white mb-4">Payment Breakdown</h3>
                  <div className="space-y-4">
                    {/* Cash */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Banknote className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">Cash</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(summaryData.paymentBreakdown.cash)}
                            <span className="text-slate-500 text-xs ml-1">({paymentPercentages.cash}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${paymentPercentages.cash}%` }} />
                        </div>
                      </div>
                    </div>
                    {/* Card */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <CreditCardIcon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">Card</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(summaryData.paymentBreakdown.card)}
                            <span className="text-slate-500 text-xs ml-1">({paymentPercentages.card}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${paymentPercentages.card}%` }} />
                        </div>
                      </div>
                    </div>
                    {/* UPI */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">UPI</span>
                          <span className="text-sm text-white font-medium">
                            {formatCurrency(summaryData.paymentBreakdown.upi)}
                            <span className="text-slate-500 text-xs ml-1">({paymentPercentages.upi}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${paymentPercentages.upi}%` }} />
                        </div>
                      </div>
                    </div>
                    {/* Total */}
                    <div className="pt-3 border-t border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400 font-medium">Total</span>
                        <span className="text-sm text-white font-semibold">
                          {(() => {
                            const payTotal = (summaryData.paymentBreakdown.cash || 0) + (summaryData.paymentBreakdown.card || 0) + (summaryData.paymentBreakdown.upi || 0);
                            return formatCurrency(payTotal);
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TAB (Credit) - only if restaurant has TAB enabled */}
                {paymentMethods.tab && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="tab-section">
                  <h3 className="text-base font-semibold text-white mb-4">TAB (Credit)</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">New Today</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(summaryData.orderTAB)}</span>
                      </div>
                      <div className="text-xs text-slate-500">Pending collection</div>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300">Settled</span>
                        <span className="text-lg font-bold text-green-400">{formatCurrency(summaryData.tabSettled.total)}</span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Cash</span>
                          <span>{formatCurrency(summaryData.tabSettled.cash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card</span>
                          <span>{formatCurrency(summaryData.tabSettled.card)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI</span>
                          <span>{formatCurrency(summaryData.tabSettled.upi)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Cancellations */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="cancellations-section">
                  <h3 className="text-base font-semibold text-white mb-4">Cancellations</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div>
                        <span className="text-sm text-slate-300">Pre-Serve</span>
                        <div className="text-xs text-slate-500">Before food ready</div>
                      </div>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.cancellations.preServe)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div>
                        <span className="text-sm text-slate-300">Post-Serve</span>
                        <div className="text-xs text-slate-500">After food served</div>
                      </div>
                      <span className="text-sm text-red-400 font-medium">{formatCurrency(summaryData.cancellations.postServe)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Total Lost</span>
                        <span className="text-sm text-red-400 font-medium">{formatCurrency(summaryData.cancelled)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deductions & Extras */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="deductions-section">
                  <h3 className="text-base font-semibold text-white mb-4">Deductions & Extras</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-300">Discount</span>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.deductions.discount)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-300">Tax Collected</span>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.deductions.tax)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-300">Tips</span>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.deductions.tips)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-300">Service Charge</span>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.deductions.serviceCharge)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-300">Round Off</span>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.deductions.roundOff)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 3: STATION REVENUE (dynamic, horizontal) */}
              {stationEntries.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6" data-testid="station-revenue">
                {stationEntries.map(({ name, amount, pct }) => {
                  const style = stationStyle[name] || defaultStationStyle;
                  const Icon = style.icon;
                  return (
                    <div key={name} className={`${style.bgClass} border ${style.borderClass} rounded-xl p-5`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${style.iconClass}`} />
                        <span className="text-sm font-medium text-slate-300">{name}</span>
                      </div>
                      <div className="text-xl font-bold text-white mb-2">{formatCurrency(amount)}</div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${style.barClass} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{pct}%</div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* ROW 4: OTHER PAYMENT TYPES (Room + future dynamic types) */}
              {features.room && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                {/* Room - only if restaurant has Room enabled */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="room-section">
                  <h3 className="text-base font-semibold text-white mb-4">Room</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">Room Orders</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(summaryData.room.orders)}</span>
                      </div>
                      <div className="text-xs text-slate-500">Pending checkout</div>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300">Settled</span>
                        <span className="text-lg font-bold text-green-400">{formatCurrency(summaryData.room.settledTotal)}</span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Cash</span>
                          <span>{formatCurrency(summaryData.room.settledCash)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card</span>
                          <span>{formatCurrency(summaryData.room.settledCard)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>UPI</span>
                          <span>{formatCurrency(summaryData.room.settledUPI)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* ROW 5: AGGREGATORS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="aggregators-section">
                  <h3 className="text-base font-semibold text-white mb-4">Aggregators</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-slate-300">Zomato</span>
                      </div>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.aggregators.zomato)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-sm text-slate-300">Swiggy</span>
                      </div>
                      <span className="text-sm text-white font-medium">{formatCurrency(summaryData.aggregators.swiggy)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default OrderSummaryPage;
