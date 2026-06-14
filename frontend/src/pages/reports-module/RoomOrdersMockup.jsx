/**
 * RoomOrdersMockup — CR-011-ROOM (S-ROOM) · Gate ⑤
 *
 * PMS + POS historic room revenue report for the Insights module.
 * Inherits S5/S7 pattern: From-To date range header, ReportLoadingShield,
 * useReportFetch, KPI strip, visual charts, tabs, expandable rows, export.
 *
 * Gate ⑤ fixes (from Gate ④ handover):
 *   ISSUE 1 — Header matches S7 (Cabinet Grotesk, bordered date container,
 *             green Apply, grouped presets, outlined Download + chevron)
 *   ISSUE 2 — ReportLoadingShield wired correctly (isLoading, hasLoadedOnce,
 *             error, onRetry=refetch)
 *   ISSUE 3 — Single-call: all data pre-populated from service, no per-row
 *             API calls, no detailCache
 *
 * Owner-locked KPI pill rule (Gate ②):
 *   KPI pills = room-only revenue (Σ roomPrice). Food excluded from headline
 *   KPIs because food revenue is already counted in S6/S7 once orders are paid.
 *   Charts/table/export keep full folio (roomPrice + food) for operational view.
 */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant, useTables } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getRoomOrdersForRange } from '../../api/services/roomOrdersService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Download, FileSpreadsheet, FileDown, BedDouble,
  ChevronDown, ChevronRight, Check,
  CalendarIcon, TrendingUp, IndianRupee, AlertCircle, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtCur = (v) => { if (!v && v !== 0) return ''; const hasDecimals = v % 1 !== 0; return `\u20B9${v.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`; };
const fmtDate = (d) => {
  if (!d) return '\u2014';
  const dt = new Date(typeof d === 'string' ? d.replace(' ', 'T') : d);
  if (isNaN(dt.getTime())) return '\u2014';
  const day = String(dt.getDate()).padStart(2, '0');
  const mon = dt.toLocaleString('en-US', { month: 'short' });
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${day}-${mon} ${hh}:${mm}`;
};
const fmtISO = (d) => { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const MAX_RANGE_DAYS = 60;
const PIE_COLORS = ['#16a34a', '#ef4444'];
const BAR_COLORS = ['#6366f1', '#f97316'];
const TOP_ROOM_COLORS = ['#16a34a', '#f97316', '#ef4444', '#6366f1', '#06b6d4', '#eab308'];

// ── Compute financials from pre-populated row ───────────────────────────────
const computeFinancials = (row) => {
  if (!row || !row.roomInfo) return null;
  const ri = row.roomInfo;
  const isSettled = row.fOrderStatus === 6;
  const roomOrderAmount = parseFloat(row.amount) || 0;
  const associatedOrders = row.associatedOrders || [];
  const associatedTotal = associatedOrders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
  const rent = parseFloat(ri.roomPrice) || 0;
  const advance = parseFloat(ri.advancePayment) || 0;
  const balance = parseFloat(ri.balancePayment) || 0;
  const receiveBalance = parseFloat(ri.receiveBalance) || 0;
  const explicitDiscount = parseFloat(ri.discountAmount) || 0;

  const roomService = isSettled ? Math.max(0, roomOrderAmount - balance - associatedTotal) : roomOrderAmount;
  const food = associatedTotal + roomService;
  const total = rent + food;
  const paid = isSettled ? Math.min(advance + roomOrderAmount, total) : advance + receiveBalance;
  const outstanding = Math.max(0, total - paid);

  // KPI-only: room-only revenue
  const roomPaid = isSettled ? Math.min(advance + receiveBalance + balance, rent) : Math.min(advance + receiveBalance, rent);
  const roomOutstanding = Math.max(0, rent - roomPaid);

  return {
    rent, food, total, paid, outstanding,
    discount: explicitDiscount,
    associatedTotal, roomService, associatedOrders,
    guestName: ri.guestName || null,
    checkInDate: ri.checkInDate || null,
    checkOutDate: ri.checkOutDate || null,
    advance, balance, receiveBalance,
    roomPaid, roomOutstanding,
  };
};

// ── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, subtext, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-lg border p-5 ${colorMap[color]}`} data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-60" />
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono tabular-nums">{value}</div>
      {subtext && <div className="text-xs mt-1 opacity-60">{subtext}</div>}
    </div>
  );
};

// ── Expandable Room Row (no per-row fetch — data pre-populated) ─────────────
const RoomRow = ({ row, getTableById }) => {
  const [expanded, setExpanded] = useState(false);

  const roomNumber = useMemo(() => {
    if (row.roomInfo?.roomNo) return row.roomInfo.roomNo;
    if (row.tableId && getTableById) {
      const tbl = getTableById(row.tableId);
      return tbl?.tableNumber || tbl?.displayName || '\u2014';
    }
    return '\u2014';
  }, [row.roomInfo?.roomNo, row.tableId, getTableById]);

  const numbers = useMemo(() => computeFinancials(row), [row]);
  const guestName = numbers?.guestName || row.guestName || 'Guest';
  const checkIn = numbers?.checkInDate || row.checkInDateTime;
  const hasOutstanding = numbers ? numbers.outstanding > 0 : false;
  const hasData = numbers !== null;

  return (
    <div className="border border-zinc-200 rounded-lg bg-white" data-testid={`room-row-${row.parentOrderId}`}>
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-50 transition-colors"
        onClick={() => hasData && setExpanded(!expanded)}
      >
        <div className="w-5 text-zinc-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="w-16 font-bold text-zinc-900">{roomNumber}</div>
        <div className="flex-1 min-w-0 text-sm text-zinc-700 truncate">{guestName}</div>
        <div className="w-32 text-sm text-zinc-500">{fmtDate(checkIn)}</div>
        <div className="w-28 text-sm text-zinc-500">
          {numbers
            ? (numbers.associatedOrders.length > 0
              ? <span>{numbers.associatedOrders.length} transferred</span>
              : <span className="text-zinc-300">0 transferred</span>)
            : '\u2014'
          }
        </div>
        <div className="w-24 text-right text-sm font-mono font-semibold text-zinc-900">
          {numbers ? fmtCur(numbers.total) : '\u2014'}
        </div>
        <div className="w-24 text-right text-sm font-mono text-zinc-700">
          {numbers ? fmtCur(numbers.paid) : '\u2014'}
        </div>
        <div className="w-20 text-right text-sm font-mono text-zinc-400">
          {numbers && numbers.discount > 0 ? fmtCur(numbers.discount) : '\u2014'}
        </div>
        <div className={`w-24 text-right text-sm font-mono font-semibold ${hasOutstanding ? 'text-red-600' : 'text-emerald-600'}`}>
          {numbers ? fmtCur(numbers.outstanding) : '\u2014'}
        </div>
      </div>

      {expanded && numbers && (
        <div className="px-5 pb-5 pt-1 flex gap-4 border-t border-zinc-100">
          {/* Room Billing Card */}
          <div className="w-64 bg-zinc-50 border border-zinc-200 rounded-lg p-4" data-testid="room-billing-card">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">Room Billing</div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Total</span>
                <span className="font-mono tabular-nums text-zinc-900">{fmtCur(numbers.rent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Advance</span>
                <span className="font-mono tabular-nums text-zinc-900">{fmtCur(numbers.advance)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2">
                <span className="text-zinc-600">Balance</span>
                <span className={`font-mono tabular-nums font-semibold ${numbers.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {fmtCur(numbers.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Associated Orders */}
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg p-4" data-testid="associated-orders">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">Associated Orders</div>
            {numbers.roomService > 0 && numbers.associatedOrders.length === 0 && (
              <div className="flex justify-between text-sm py-2">
                <span className="text-zinc-600">Room service items <span className="text-zinc-400">(on this room)</span></span>
                <span className="font-mono tabular-nums text-zinc-900">{fmtCur(numbers.roomService)}</span>
              </div>
            )}
            {numbers.associatedOrders.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase">
                    <th className="text-left py-1 font-medium">Order</th>
                    <th className="text-left py-1 font-medium">Transferred</th>
                    <th className="text-right py-1 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.associatedOrders.map((ao) => (
                    <tr key={ao.orderId || ao.id} className="border-t border-zinc-100">
                      <td className="py-2 text-zinc-700">#{ao.orderNumber || ao.orderId}</td>
                      <td className="py-2 text-zinc-500">{fmtDate(ao.transferredAt)}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-zinc-900">{fmtCur(parseFloat(ao.amount) || 0)}</td>
                    </tr>
                  ))}
                  {numbers.roomService > 0 && (
                    <tr className="border-t border-zinc-100">
                      <td className="py-2 text-zinc-600" colSpan={2}>Room service items <span className="text-zinc-400">(on this room)</span></td>
                      <td className="py-2 text-right font-mono tabular-nums text-zinc-900">{fmtCur(numbers.roomService)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {numbers.associatedOrders.length === 0 && numbers.roomService === 0 && (
              <div className="text-sm text-zinc-400 py-2">No food orders on this room</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const RoomOrdersMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const { getTableById } = useTables();
  const schedules = useMemo(() => restaurant?.schedules || [], [restaurant?.schedules]);
  const downloadRef = useRef(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // Date range — default last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');
  const [activeTab, setActiveTab] = useState('all');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Validation
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const draftRangeExceeded = draftValid && daysBetween(fromDate, toDate) > MAX_RANGE_DAYS;
  const canApply = draftDirty && draftValid && !draftRangeExceeded;
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;

  // Fetch — single call, all data pre-populated
  const fetchFn = useCallback(
    () => datesValid ? getRoomOrdersForRange(appliedFrom, appliedTo, schedules) : Promise.resolve({ rows: [], anomalyCount: 0 }),
    [appliedFrom, appliedTo, schedules, datesValid]
  );
  const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(fetchFn, [appliedFrom, appliedTo, schedules]);

  const allRows = data?.rows || [];
  const anomalyCount = data?.anomalyCount || 0;

  // Tab filter
  const filtered = useMemo(() => {
    if (activeTab === 'paid') return allRows.filter((r) => r.fOrderStatus === 6);
    if (activeTab === 'unpaid') return allRows.filter((r) => r.fOrderStatus !== 6);
    return allRows;
  }, [allRows, activeTab]);

  const tabCounts = useMemo(() => ({
    all: allRows.length,
    paid: allRows.filter((r) => r.fOrderStatus === 6).length,
    unpaid: allRows.filter((r) => r.fOrderStatus !== 6).length,
  }), [allRows]);

  // KPI totals — room-only revenue (owner-locked Gate ②)
  const kpis = useMemo(() => {
    let totalRooms = filtered.length;
    let totalRoomRevenue = 0;
    let totalRoomCollected = 0;
    let totalRoomOutstanding = 0;
    let resolvedCount = 0;
    let folioTotal = 0;
    let folioPaid = 0;
    let folioOutstanding = 0;
    let folioTransfers = 0;
    let folioDiscount = 0;

    filtered.forEach((row) => {
      const nums = computeFinancials(row);
      if (!nums) return;
      resolvedCount += 1;
      totalRoomRevenue += nums.rent;
      totalRoomCollected += nums.roomPaid;
      totalRoomOutstanding += nums.roomOutstanding;
      folioTotal += nums.total;
      folioPaid += nums.paid;
      folioOutstanding += nums.outstanding;
      folioTransfers += nums.associatedOrders.length;
      folioDiscount += nums.discount;
    });

    return {
      totalRooms, totalRoomRevenue, totalRoomCollected, totalRoomOutstanding,
      folioTotal, folioPaid, folioOutstanding, folioTransfers, folioDiscount,
      resolvedCount,
    };
  }, [filtered]);

  // Chart data
  const chartData = useMemo(() => {
    const dailyMap = new Map();
    const roomRevMap = new Map();

    filtered.forEach((row) => {
      const nums = computeFinancials(row);
      if (!nums) return;
      const dateStr = (nums.checkInDate || row.checkInDateTime || '').substring(0, 10);
      if (dateStr) {
        const existing = dailyMap.get(dateStr) || { date: dateStr, lodging: 0, food: 0, rooms: 0 };
        existing.lodging += nums.rent;
        existing.food += nums.food;
        existing.rooms += 1;
        dailyMap.set(dateStr, existing);
      }
      const rn = row.tableId ? (getTableById?.(row.tableId)?.tableNumber || row.tableId) : 'Unknown';
      const roomLabel = `Room ${rn}`;
      roomRevMap.set(roomLabel, (roomRevMap.get(roomLabel) || 0) + nums.total);
    });

    const dailyArr = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    const dailyFormatted = dailyArr.map((d) => {
      const dt = new Date(d.date + 'T00:00:00');
      const day = String(dt.getDate()).padStart(2, '0');
      const mon = dt.toLocaleString('en-US', { month: 'short' });
      return { ...d, date: `${day} ${mon}` };
    });

    const topRooms = [...roomRevMap.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { daily: dailyFormatted, topRooms };
  }, [filtered, getTableById]);

  // Heatmap data — room × day-of-week occupancy + revenue
  const heatmapData = useMemo(() => {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // grid[roomLabel][dayIndex] = { checkins, revenue }
    const grid = new Map();
    let maxCheckins = 0;

    filtered.forEach((row) => {
      const nums = computeFinancials(row);
      if (!nums) return;
      const dateStr = (nums.checkInDate || row.checkInDateTime || '').substring(0, 10);
      if (!dateStr) return;
      const dt = new Date(dateStr + 'T00:00:00');
      if (isNaN(dt.getTime())) return;
      const dayIdx = (dt.getDay() + 6) % 7; // Mon=0 … Sun=6
      const rn = row.roomInfo?.roomNo || (row.tableId ? (getTableById?.(row.tableId)?.tableNumber || row.tableId) : null);
      if (!rn) return;
      const roomLabel = `${rn}`;

      if (!grid.has(roomLabel)) grid.set(roomLabel, Array.from({ length: 7 }, () => ({ checkins: 0, revenue: 0 })));
      const cell = grid.get(roomLabel)[dayIdx];
      cell.checkins += 1;
      cell.revenue += nums.total;
      if (cell.checkins > maxCheckins) maxCheckins = cell.checkins;
    });

    // Sort rooms naturally (numeric sort)
    const rooms = [...grid.keys()].sort((a, b) => {
      const na = parseInt(a, 10); const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    return { DAYS, grid, rooms, maxCheckins };
  }, [filtered, getTableById]);

  const pieData = useMemo(() => [
    { name: 'Collected', value: kpis.totalRoomCollected },
    { name: 'Outstanding', value: kpis.totalRoomOutstanding },
  ], [kpis.totalRoomCollected, kpis.totalRoomOutstanding]);

  // Preset handler
  const handlePreset = (p) => {
    setActivePreset(p);
    const now = new Date();
    let f = new Date(now); let t = new Date(now);
    if (p === 'Today') { /* same day */ }
    else if (p === '7D') f = new Date(now.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(now.getTime() - 29 * 86400000);
    else if (p === 'MTD') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(fmtISO(f)); setToDate(fmtISO(t));
    setAppliedFrom(fmtISO(f)); setAppliedTo(fmtISO(t));
  };
  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
  };

  // Export
  const handleExportExcel = () => {
    const rows = [];
    filtered.forEach((row) => {
      const nums = computeFinancials(row);
      const rn = row.tableId ? (getTableById?.(row.tableId)?.tableNumber || '') : '';
      rows.push({
        'Room': rn,
        'Guest': nums?.guestName || row.guestName || '',
        'Check-in': nums?.checkInDate || row.checkInDateTime || '',
        'Check-out': nums?.checkOutDate || '',
        'Room Price': nums?.rent || 0,
        'Food': nums?.food || 0,
        'Total': nums?.total || 0,
        'Paid': nums?.paid || 0,
        'Discount': nums?.discount || 0,
        'Outstanding': nums?.outstanding || 0,
        'Transfers': nums?.associatedOrders?.length || 0,
      });
    });
    exportReportAsExcel({
      title: 'Room Orders Report',
      dateRange: `${appliedFrom} to ${appliedTo}`,
      sheets: [
        { name: 'Room Details', columns: Object.keys(rows[0] || {}), rows },
      ],
      summary: {
        'Total Rooms': kpis.totalRooms,
        'Room Revenue': kpis.totalRoomRevenue,
        'Room Collected': kpis.totalRoomCollected,
        'Room Outstanding': kpis.totalRoomOutstanding,
      },
    }, `Room_Orders_${appliedFrom}_${appliedTo}`);
    setShowDownloadMenu(false);
  };

  const handleExportPDF = () => {
    const win = openReportWindow();
    const rows = [];
    filtered.forEach((row) => {
      const nums = computeFinancials(row);
      const rn = row.tableId ? (getTableById?.(row.tableId)?.tableNumber || '') : '';
      rows.push([rn, nums?.guestName || row.guestName || '', fmtDate(nums?.checkInDate || row.checkInDateTime), fmtCur(nums?.rent || 0), fmtCur(nums?.food || 0), fmtCur(nums?.total || 0), fmtCur(nums?.paid || 0), fmtCur(nums?.outstanding || 0)]);
    });
    exportReportAsPDF(win, {
      title: 'Room Orders Report',
      dateRange: `${appliedFrom} to ${appliedTo}`,
      headers: ['Room', 'Guest', 'Check-in', 'Room Price', 'Food', 'Total', 'Paid', 'Outstanding'],
      rows,
      summary: `Rooms: ${kpis.totalRooms} | Room Revenue: ${fmtCur(kpis.totalRoomRevenue)} | Collected: ${fmtCur(kpis.totalRoomCollected)} | Outstanding: ${fmtCur(kpis.totalRoomOutstanding)}`,
    });
    setShowDownloadMenu(false);
  };

  const TABS = [
    { id: 'all', label: 'All Rooms', count: tabCounts.all },
    { id: 'paid', label: 'Settled', count: tabCounts.paid },
    { id: 'unpaid', label: 'In-House / Unpaid', count: tabCounts.unpaid },
  ];

  return (
    <div className="flex h-screen bg-white" data-testid="room-orders-insights-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        {/* ── Header (S7 pattern) ─────────────────────────────────── */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="room-orders-header">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="back-to-dashboard" onClick={() => navigate('/reports-module/dashboard')}>
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Room Orders
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range — bordered container with FROM/TO labels */}
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="room-daterange">
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setActivePreset(''); }} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="date-from" />
              </label>
              <span className="text-zinc-300">&mdash;</span>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setActivePreset(''); }} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="date-to" />
              </label>
              {draftRangeExceeded && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 60 days</span>}
            </div>

            {/* Apply — green, always visible, disabled when clean */}
            <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="apply-dates">
              <Check className="w-4 h-4" /> Apply
            </button>

            {/* Presets — grouped in bg-zinc-100, white active + shadow */}
            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="room-presets">
              {['Today', '7D', '30D', 'MTD'].map((p) => (
                <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`} data-testid={`preset-${p}`} onClick={() => handlePreset(p)}>
                  {p}
                </button>
              ))}
            </div>

            {/* Download — outlined orange + chevron */}
            <div className="relative" ref={downloadRef}>
              <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || allRows.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || allRows.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="download-button">
                <Download className="w-4 h-4" /> Download <ChevronDown className="w-3 h-3" />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                  <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="download-excel">
                    <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
                  </button>
                  <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="download-pdf">
                    <FileDown className="w-4 h-4" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content — ISSUE 2 FIX: correct ReportLoadingShield props ── */}
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
          <div className="flex-1 overflow-auto p-8 space-y-6">

            {/* KPI Strip — ROOM-ONLY revenue (owner-locked Gate ②) */}
            <div className="grid grid-cols-4 gap-4" data-testid="kpi-strip">
              <KPICard icon={BedDouble} label="Total Rooms" value={kpis.totalRooms} subtext="check-ins in period" color="blue" />
              <KPICard icon={IndianRupee} label="Room Revenue" value={kpis.resolvedCount > 0 ? fmtCur(kpis.totalRoomRevenue) : '\u2014'} subtext="room charges only" color="emerald" />
              <KPICard icon={TrendingUp} label="Room Collected" value={kpis.resolvedCount > 0 ? fmtCur(kpis.totalRoomCollected) : '\u2014'} subtext="advance + room settlements" color="emerald" />
              <KPICard icon={AlertCircle} label="Room Outstanding"
                value={kpis.resolvedCount > 0 ? fmtCur(kpis.totalRoomOutstanding) : '\u2014'}
                subtext="pending collection"
                color={kpis.totalRoomOutstanding > 0 ? 'red' : 'emerald'} />
            </div>

            {/* Charts */}
            {kpis.resolvedCount > 0 && (
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-7 bg-white border border-zinc-200 rounded-lg p-5" data-testid="chart-daily-revenue">
                  <h3 className="text-sm font-semibold text-zinc-800 mb-4">Daily Room Revenue</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData.daily} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={(v) => `\u20B9${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v, name) => [`\u20B9${v.toLocaleString('en-IN')}`, name]} contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="lodging" stackId="a" fill={BAR_COLORS[0]} name="Lodging" />
                      <Bar dataKey="food" stackId="a" fill={BAR_COLORS[1]} name="Food" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="col-span-5 flex flex-col gap-4">
                  <div className="bg-white border border-zinc-200 rounded-lg p-5" data-testid="chart-collection-status">
                    <h3 className="text-sm font-semibold text-zinc-800 mb-3">Collection Status</h3>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke="#fff">
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `\u20B9${v.toLocaleString('en-IN')}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-zinc-600">Collected</span>
                          <span className="font-mono font-semibold text-zinc-900 ml-auto">{fmtCur(kpis.totalRoomCollected)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-zinc-600">Outstanding</span>
                          <span className="font-mono font-semibold text-zinc-900 ml-auto">{fmtCur(kpis.totalRoomOutstanding)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-lg p-5 flex-1" data-testid="chart-top-rooms">
                    <h3 className="text-sm font-semibold text-zinc-800 mb-3">Top Rooms by Revenue</h3>
                    <div className="flex flex-col gap-2">
                      {chartData.topRooms.map((r, i) => {
                        const maxRev = chartData.topRooms[0]?.revenue || 1;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-20 text-xs font-medium text-zinc-700 truncate">{r.name}</div>
                            <div className="flex-1 bg-zinc-100 rounded-full h-5 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(r.revenue / maxRev) * 100}%`, backgroundColor: TOP_ROOM_COLORS[i % TOP_ROOM_COLORS.length] }} />
                            </div>
                            <div className="w-20 text-right text-xs font-mono font-semibold text-zinc-800">{fmtCur(r.revenue)}</div>
                          </div>
                        );
                      })}
                      {chartData.topRooms.length === 0 && <div className="text-sm text-zinc-400">No data available</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Occupancy Heatmap — room × day-of-week */}
            {kpis.resolvedCount > 0 && heatmapData.rooms.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg p-5" data-testid="chart-occupancy-heatmap">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-800">Room Occupancy Heatmap</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Check-in density across rooms by day of week</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span>Low</span>
                    <div className="flex gap-px">
                      {[0.05, 0.25, 0.5, 0.75, 1].map((t, i) => (
                        <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: `rgba(22, 163, 74, ${t})` }} />
                      ))}
                    </div>
                    <span>High</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide pb-2 pr-3 w-20">Room</th>
                        {heatmapData.DAYS.map((d) => (
                          <th key={d} className="text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wide pb-2 px-1 min-w-[52px]">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.rooms.map((room) => {
                        const cells = heatmapData.grid.get(room);
                        return (
                          <tr key={room}>
                            <td className="text-xs font-medium text-zinc-700 py-1 pr-3">{room}</td>
                            {cells.map((cell, di) => {
                              const intensity = heatmapData.maxCheckins > 0 ? cell.checkins / heatmapData.maxCheckins : 0;
                              return (
                                <td key={di} className="py-1 px-1">
                                  <div
                                    className="relative group rounded-md h-9 flex items-center justify-center cursor-default transition-transform hover:scale-110"
                                    style={{
                                      backgroundColor: cell.checkins === 0
                                        ? '#f4f4f5'
                                        : `rgba(22, 163, 74, ${Math.max(0.1, intensity)})`,
                                    }}
                                    data-testid={`heatmap-cell-${room}-${heatmapData.DAYS[di]}`}
                                  >
                                    {cell.checkins > 0 && (
                                      <span className={`text-[11px] font-bold tabular-nums ${intensity > 0.5 ? 'text-white' : 'text-emerald-800'}`}>
                                        {cell.checkins}
                                      </span>
                                    )}
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                                      <div className="bg-zinc-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                                        <div className="font-semibold">Room {room} · {heatmapData.DAYS[di]}</div>
                                        <div className="mt-0.5">{cell.checkins} check-in{cell.checkins !== 1 ? 's' : ''}</div>
                                        {cell.revenue > 0 && <div className="text-zinc-400">{fmtCur(cell.revenue)} revenue</div>}
                                      </div>
                                      <div className="w-2 h-2 bg-zinc-900 rotate-45 mx-auto -mt-1" />
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Anomaly notice */}
            {anomalyCount > 0 && (
              <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800" data-testid="anomaly-notice">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {anomalyCount} room{anomalyCount === 1 ? '' : 's'} with unexpected status (cancelled/merged) were skipped.
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-zinc-200" data-testid="room-tabs">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                  data-testid={`tab-${tab.id}`}>
                  {tab.label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{tab.count}</span>
                </button>
              ))}
              <div className="ml-auto flex items-center gap-4 text-xs text-zinc-500 pr-2" data-testid="tab-summary">
                <span>Rooms <span className="font-mono font-semibold text-zinc-900">{filtered.length}</span></span>
                <span className="h-3 w-px bg-zinc-300" />
                <span>Total <span className="font-mono font-semibold text-zinc-900">{kpis.resolvedCount > 0 ? fmtCur(kpis.folioTotal) : '\u2014'}</span></span>
                <span className="h-3 w-px bg-zinc-300" />
                <span>Paid <span className="font-mono font-semibold text-zinc-900">{kpis.resolvedCount > 0 ? fmtCur(kpis.folioPaid) : '\u2014'}</span></span>
                <span className="h-3 w-px bg-zinc-300" />
                <span>Outstanding <span className="font-mono font-bold text-zinc-900">{kpis.resolvedCount > 0 ? fmtCur(kpis.folioOutstanding) : '\u2014'}</span></span>
              </div>
            </div>

            {/* Table header */}
            <div className="flex items-center gap-4 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500" data-testid="table-header">
              <div className="w-5" />
              <div className="w-16">Room</div>
              <div className="flex-1 min-w-0">Guest</div>
              <div className="w-32">Check-in</div>
              <div className="w-28">Transferred</div>
              <div className="w-24 text-right">Total</div>
              <div className="w-24 text-right">Paid</div>
              <div className="w-20 text-right">Discount</div>
              <div className="w-24 text-right">Outstanding</div>
            </div>

            {/* Room rows */}
            {filtered.length === 0 && !isLoading && (
              <div className="bg-white border border-zinc-200 rounded-lg py-20 text-center" data-testid="empty-state">
                <BedDouble className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
                <h3 className="text-base font-medium text-zinc-900 mb-1">No room orders found</h3>
                <p className="text-sm text-zinc-500">Try changing the date range or switching the filter tab.</p>
              </div>
            )}

            <div className="flex flex-col gap-2" data-testid="room-rows-list">
              {filtered.map((row) => (
                <RoomRow
                  key={row.parentOrderId}
                  row={row}
                  getTableById={getTableById}
                />
              ))}
            </div>

            {/* Total footer */}
            {filtered.length > 0 && kpis.resolvedCount > 0 && (
              <div className="flex items-center gap-4 px-5 py-3 bg-zinc-100 border border-zinc-200 rounded-lg font-semibold text-sm" data-testid="total-footer">
                <div className="w-5" />
                <div className="w-16 text-zinc-900">TOTAL</div>
                <div className="flex-1 min-w-0 text-zinc-500">{filtered.length} rooms</div>
                <div className="w-32" />
                <div className="w-28 text-zinc-500">{kpis.folioTransfers} transferred</div>
                <div className="w-24 text-right font-mono text-zinc-900">{fmtCur(kpis.folioTotal)}</div>
                <div className="w-24 text-right font-mono text-zinc-700">{fmtCur(kpis.folioPaid)}</div>
                <div className="w-20 text-right font-mono text-zinc-400">{fmtCur(kpis.folioDiscount)}</div>
                <div className={`w-24 text-right font-mono font-bold ${kpis.folioOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {fmtCur(kpis.folioOutstanding)}
                </div>
              </div>
            )}

          </div>
        </ReportLoadingShield>
      </main>
    </div>
  );
};

export default RoomOrdersMockup;
