// Order Entry preferences — browser-local toggles that affect Order Entry
// behavior without backend involvement.
//
// CR-008 #4 Phase A / Bucket D1 (May-2026): "Stay on Order Entry After
// Collect Bill" — when ON, the cashier stays on the OrderEntry screen
// (cart cleared, walk-in mode) after a successful Collect Bill instead of
// being redirected to the dashboard. Default OFF preserves today's flow.
//
// Storage scope: browser-global. Same convention as `mygenie_default_pos_view`,
// `mygenie_view_mode_*`, etc. (see DashboardPage.jsx::resolveInitialView).
//
// Read site:  components/order-entry/OrderEntry.jsx (post-Collect-Bill success)
// Write site: components/panels/settings/ViewEditViews.jsx (GeneralSettingsView)

export const STAY_ON_ORDER_AFTER_BILL_KEY = 'mygenie_stay_on_order_after_bill';

/**
 * Read the "stay on order after bill" preference.
 * Strict: returns true ONLY when the stored string is exactly 'true'.
 * Anything else (missing key, 'false', JSON garbage, null, exception) → false.
 *
 * @returns {boolean}
 */
export const getStayOnOrderAfterBill = () => {
  try {
    return localStorage.getItem(STAY_ON_ORDER_AFTER_BILL_KEY) === 'true';
  } catch (_) {
    // Private browsing / disabled storage → safe fallback to today's behavior.
    return false;
  }
};

/**
 * Persist the "stay on order after bill" preference.
 * Stored as the string 'true' or 'false'.
 *
 * @param {boolean} value
 */
export const setStayOnOrderAfterBill = (value) => {
  try {
    localStorage.setItem(STAY_ON_ORDER_AFTER_BILL_KEY, value ? 'true' : 'false');
  } catch (_) {
    // No-op — caller's UI state is the source of truth for this session.
  }
};
