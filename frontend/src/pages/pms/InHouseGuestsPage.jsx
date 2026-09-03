// CR-358-P1: S6 — In-House Guests Page
// Calls pmsService.getInHouseGuests() → wraps existing GET_ROOM_LIST
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // CR-360
import { Search, Loader2, BedDouble, AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { getInHouseGuests } from '@/api/services/pmsService';

export default function InHouseGuestsPage() {
  // BUG-361: persist sidebar state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const navigate              = useNavigate(); // CR-360

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInHouseGuests();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load in-house guests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // CR-360: Derive KPI values from enriched rows (data from BUG-378 local-res join — no extra API call)
  const todayStr     = new Date().toISOString().slice(0, 10);
  const checkoutToday = rows.filter(r => r.checkoutDate?.slice(0, 10) === todayStr).length;
  const totalBalance  = rows.reduce((sum, r) => sum + (r.balance ?? 0), 0);
  const avgNights = (() => {
    const diffs = rows
      .filter(r => r.bookingCheckin && r.checkoutDate)   // CR-360: use booking dates for "nights booked", not physical checked_in_at
      .map(r => Math.round((new Date(r.checkoutDate) - new Date(r.bookingCheckin)) / 86400000));
    return diffs.length ? Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length) : null;
  })();

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(r.guestName  ?? '').toLowerCase().includes(q) ||
      String(r.roomNumber ?? '').toLowerCase().includes(q) || // BUG-378
      String(r.parentOrderId ?? '').toLowerCase().includes(q) // BUG-378
    );
  });

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="in-house-guests-page">
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={(v) => {
          setIsSidebarExpanded(v);
          localStorage.setItem('mygenie_sidebar_expanded', String(v));
        }}
      />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center gap-4">
          <h1 className="text-[18px] font-bold text-[#1A1A1A] flex-1">In-House Guests</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              data-testid="in-house-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guest or room…"
              className="border border-[#E5E5E5] rounded-lg pl-9 pr-3 h-9 text-[13px] w-60 focus:outline-none focus:border-[#329937]"
            />
          </div>
          <button
            data-testid="in-house-refresh-btn"
            onClick={load}
            className="flex items-center gap-2 border border-[#E5E5E5] text-[13px] px-3 h-9 rounded-lg text-[#666] hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="p-6">

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'In-House',           value: loading ? '…' : rows.length },
              { label: 'Checkout Today',      value: loading ? '…' : checkoutToday }, // CR-360
              { label: 'Outstanding Balance', value: loading ? '…' : (totalBalance > 0 ? `₹${totalBalance.toLocaleString('en-IN')}` : '—'), red: true }, // CR-360
              { label: 'Avg Nights',          value: loading ? '…' : (avgNights != null ? `${avgNights}d` : '—') }, // CR-360
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-4 text-center">
                <div className={`text-[22px] font-bold ${k.red ? 'text-[#EF4444]' : 'text-[#1A1A1A]'}`}>
                  {k.value}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#666] mt-1">
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            <table className="w-full text-[13px]" data-testid="in-house-table">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  {['Room', 'Guest', 'Phone', 'Check-In', 'Check-Out', 'Balance', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#666] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                      <p className="text-sm text-red-500">{error}</p>
                      <button onClick={load} className="mt-2 text-sm text-[#329937] hover:underline">Retry</button>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <BedDouble className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        {search ? 'No guests match your search.' : 'No guests currently checked in.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={i} className="border-t border-[#F0F0F0] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-medium">{row.roomNumber ?? '—'}</td> {/* BUG-378 */}
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.guestName ?? '—'}</div>
                        {row.parentOrderId && <div className="text-[11px] text-gray-400">#{row.parentOrderId}</div>} {/* BUG-378 */}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{row.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {row.checkinDate ? String(row.checkinDate).slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {row.checkoutDate ? String(row.checkoutDate).slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#EF4444]">
                        {row.balance != null ? `₹${Number(row.balance).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          data-testid="view-bill-btn"
                          onClick={() => navigate('/reports/room-orders')} // CR-360: Phase 1 — room orders report; full checkout via CollectPaymentPanel is Phase 3 (Departures)
                          className="text-[12px] text-[#329937] hover:underline font-medium"
                        >
                          View Bill
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
