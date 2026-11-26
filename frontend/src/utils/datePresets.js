// BUG-640 + CR-481: Shared date preset utility for all Insights report pages
// BUG-640: fmtISO uses local timezone (was toISOString which converts to UTC — off by 1 day in IST)
// CR-481: Standard preset set + computePresetRange for all pages

// BUG-640 fix: local timezone date formatting
export const fmtISO = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// CR-481: Standard preset set for all Insights pages
export const DATE_PRESETS = ['Today', '7D', 'LM', '30D', 'MTD', 'FY'];

// CR-481: Compute FROM/TO for a given preset
export const computePresetRange = (preset) => {
  const now = new Date();
  const today = fmtISO(now);
  let f, t = today;

  switch (preset) {
    case 'Today':
      f = today;
      break;
    case 'Yesterday': {
      const y = fmtISO(new Date(now.getTime() - 86400000));
      return { from: y, to: y };
    }
    case '7D':
      f = fmtISO(new Date(now.getTime() - 6 * 86400000));
      break;
    case 'LM': {
      const lf = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lt = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmtISO(lf), to: fmtISO(lt) };
    }
    case '30D':
      f = fmtISO(new Date(now.getTime() - 29 * 86400000));
      break;
    case '90D':
      f = fmtISO(new Date(now.getTime() - 89 * 86400000));
      break;
    case '365D':
      f = fmtISO(new Date(now.getTime() - 364 * 86400000));
      break;
    case 'MTD':
      f = fmtISO(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    case 'YTD':
      f = fmtISO(new Date(now.getFullYear(), 0, 1));
      break;
    case 'FY': {
      const fyEndYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: fmtISO(new Date(fyEndYear - 1, 3, 1)), to: fmtISO(new Date(fyEndYear, 2, 31)) };
    }
    case '1Y':
      f = fmtISO(new Date(now.getTime() - 364 * 86400000));
      break;
    default:
      return null;
  }
  return { from: f, to: t };
};

// BUG-723: shared preset reconciler (was local to AuditLogMockup — BUG-697).
// Maps an applied {from,to} back to its preset label, or '' when the range is custom.
export const matchPreset = (from, to) => {
  if (!from || !to) return '';
  const t = new Date();
  const td = fmtISO(t);
  const now = new Date();
  const cands = {
    Today: { from: fmtISO(t), to: td },
    '7D': { from: fmtISO(new Date(t.getTime() - 6 * 86400000)), to: td },
    '30D': { from: fmtISO(new Date(t.getTime() - 29 * 86400000)), to: td },
    MTD: { from: fmtISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: td },
    LM: { from: fmtISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmtISO(new Date(now.getFullYear(), now.getMonth(), 0)) },
  };
  const fy = computePresetRange('FY');
  if (fy) cands.FY = fy;
  for (const [label, r] of Object.entries(cands)) {
    if (r.from === from && r.to === to) return label;
  }
  return '';
};
