// CR-385 M0 — header: greeting (profile first name, read-only) · business date from meta · sync pill + ↻ · + New Booking (disabled until Phase 2). Never renders the channel-manager wording (ui_naming_rule). No BETA badge, no property name (F9).
import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { fmtDateLong } from './money';

const partOfDay = (serverTime) => {
  const h = Number((serverTime ?? '').split('T')[1]?.slice(0, 2));
  if (Number.isNaN(h)) return 'Hello';
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const agoLabel = (loadedAt, now) => {
  if (!loadedAt) return 'not synced';
  const m = Math.floor((now - loadedAt) / 60000);
  return m < 1 ? 'synced just now' : `synced ${m} min ago`;
};

export const WorkstationHeader = ({ firstName, meta, loadedAt, refreshing, onRefresh, onNewBooking }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { setNow(Date.now()); }, [loadedAt]);

  return (
    <header className="bg-white border-b border-[#E5E5E5] px-6 py-3 flex items-center justify-between gap-4" data-testid="fd-header">
      <div className="min-w-0">
        <h1 className="text-[18px] font-bold text-[#1A1A1A] truncate" style={{ fontFamily: 'Poppins, sans-serif' }} data-testid="fd-header-greeting">
          {partOfDay(meta?.server_time)}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-[12px] text-[#767676] mt-0.5" data-testid="fd-header-date">{fmtDateLong(meta?.business_date)}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" data-testid="fd-refresh-btn" onClick={onRefresh} title={loadedAt ? `Last refresh ${new Date(loadedAt).toLocaleTimeString()}` : 'Refresh'}
          className="fd-btn flex items-center gap-2 px-3 h-9 rounded-full border border-[#E5E5E5] text-[12px] font-medium text-[#1A1A1A] hover:bg-[#F7F7F7]">
          <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-[#F59E0B]' : 'bg-[#329937]'}`} aria-hidden="true" />
          <span data-testid="fd-sync-pill">{refreshing ? 'syncing…' : agoLabel(loadedAt, now)}</span>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button type="button" data-testid="fd-new-booking-btn" disabled={!onNewBooking} onClick={onNewBooking} title={onNewBooking ? undefined : 'Available in Phase 2'}
          className="fd-btn flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#329937' }}>
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>
    </header>
  );
};

export default WorkstationHeader;
