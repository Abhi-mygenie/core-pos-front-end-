// CR-376: Active Menu Type preference — station-level local setting.
//
// Manager sets the active menu in StatusConfigPage (Local Settings).
// Order Entry reads it once on mount — no per-order switching.
// This is the Phase 3 multi-menu implementation; mirrors qsrModePrefs.js pattern.
//
// Storage scope: browser-local (per device/station).
// Default: 'Normal' — zero behaviour change for Normal-only restaurants.
//
// Write site: pages/StatusConfigPage.jsx (save + reset + hydrate)
// Read sites: contexts/MenuContext.jsx (activeProducts memo)

export const ACTIVE_MENU_TYPE_KEY = 'mygenie_active_menu_type';
export const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';

export const getActiveMenuType = () => {
  try {
    return localStorage.getItem(ACTIVE_MENU_TYPE_KEY) || ACTIVE_MENU_TYPE_DEFAULT;
  } catch (_) {
    return ACTIVE_MENU_TYPE_DEFAULT;
  }
};

export const setActiveMenuType = (value) => {
  try {
    localStorage.setItem(ACTIVE_MENU_TYPE_KEY, value || ACTIVE_MENU_TYPE_DEFAULT);
  } catch (_) {}
};
