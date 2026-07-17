// Auto Settle preferences — browser-local toggle for auto-settling prepaid orders.
//
// PROD-BUG-001 (2026-05-20): When ON, prepaid (non-PayLater) orders at
// fOrderStatus=5 are automatically settled without requiring a manual
// Settle button click. PayLater orders are explicitly excluded.
//
// Storage scope: browser-global. Same convention as mygenie_qsr_mode_enabled,
// mygenie_order_taking_enabled, etc.
//
// Read site:  pages/DashboardPage.jsx (auto-settle useEffect)
//             components/cards/OrderCard.jsx (hide Settle button)
//             components/cards/TableCard.jsx (hide Settle button)
// Write site: pages/StatusConfigPage.jsx (UI Elements section)

export const AUTO_SETTLE_KEY = 'mygenie_auto_settle_enabled';

export const getAutoSettleEnabled = () => {
  try {
    return localStorage.getItem(AUTO_SETTLE_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

export const setAutoSettleEnabled = (value) => {
  try {
    localStorage.setItem(AUTO_SETTLE_KEY, value ? 'true' : 'false');
  } catch (_) {}
};
