/**
 * riskTier.js — CR-555 shared risk-tier helpers
 * Single source of truth for cancellation duration → risk tier, shared by
 * AuditLogMockup (CR-543) and the Cancellation reports (CR-554/555/556).
 * Thresholds LOCKED at 5 / 15 / 30 min (owner 2026-11-19, Audit consistency).
 */
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

// Minutes between punch (created_at) and cancel (cancel_time_full); null when either is unparseable.
export const durationMins = (createdAt, cancelTimeFull) => {
  const s = Date.parse(createdAt);
  const e = Date.parse(cancelTimeFull);
  return Number.isFinite(s) && Number.isFinite(e) ? Math.max(0, Math.round((e - s) / 60000)) : null;
};

// CR-543: behaviour-identical to the original AuditLogMockup.getRiskTier (returns 'ok' below 5 / for non-finite).
export const getRiskTier = (mins) => {
  if (mins >= 30) return 'high_risk';
  if (mins >= 15) return 'risk';
  if (mins >= 5) return 'doubt';
  return 'ok';
};

export const RISK_TIER_CONFIG = {
  doubt:     { label: 'Doubt',     icon: Clock,         classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  risk:      { label: 'Risk',      icon: AlertTriangle, classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  high_risk: { label: 'High Risk', icon: ShieldAlert,   classes: 'bg-red-50 text-red-700 border-red-200' },
};

// Renders nothing when duration is null (unknown) or tier is 'ok' (< 5 min).
export const RiskBadge = ({ mins }) => {
  if (mins == null) return null;
  const cfg = RISK_TIER_CONFIG[getRiskTier(mins)];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.classes}`}
      data-testid={`risk-badge-${getRiskTier(mins)}`}
    >
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};
