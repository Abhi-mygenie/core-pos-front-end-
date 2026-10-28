// QSR Mode preferences — browser-local toggles for QSR quick billing.
//
// BUG-099 (May-2026): QSR Quick Billing mode. When ON, the order screen
// shows inline billing/payment after Place Order instead of navigating
// to the full Collect Bill screen. KOT/Bill auto-handled from profile.
//
// Storage scope: browser-global. Same convention as mygenie_order_taking_enabled,
// mygenie_stay_on_order_after_bill, etc.
//
// Read site:  components/order-entry/CartPanel.jsx (QSR billing section)
//             components/order-entry/OrderEntry.jsx (QSR collect bill handler)
// Write site: pages/StatusConfigPage.jsx (UI Elements section)

export const QSR_MODE_KEY = 'mygenie_qsr_mode_enabled';
export const QSR_DISCOUNT_KEY = 'mygenie_qsr_discount_enabled';

export const getQsrModeEnabled = () => {
  try {
    return localStorage.getItem(QSR_MODE_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

export const setQsrModeEnabled = (value) => {
  try {
    localStorage.setItem(QSR_MODE_KEY, value ? 'true' : 'false');
  } catch (_) {}
};

export const getQsrDiscountEnabled = () => {
  try {
    return localStorage.getItem(QSR_DISCOUNT_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

export const setQsrDiscountEnabled = (value) => {
  try {
    localStorage.setItem(QSR_DISCOUNT_KEY, value ? 'true' : 'false');
  } catch (_) {}
};
