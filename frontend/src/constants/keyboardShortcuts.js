// CR-482: single action-to-key map (Phase B will make this configurable)
// Every keyboard shortcut in POS reads from this file.
// To change a key binding, change it here — all phases inherit automatically.

export const KBD = {
  FOCUS_SEARCH:  'F2',
  PRINT_BILL:    'F4',
  REPRINT_KOT:   'F7',
  PLACE_ORDER:   'F8',
  COLLECT_BILL:  'F9',
  BACK:          'Escape',
  CONFIRM:       'Enter',
  QTY_UP:        '+',
  QTY_DOWN:      '-',
  TAKEAWAY:      { key: 't', alt: true },
  DELIVERY:      { key: 'd', alt: true },
  TO_CART:       { key: 'ArrowDown', ctrl: true },
  MODAL_ADD:     { key: 'Enter', ctrl: true },
};

// CR-482: data-testid selectors for the existing buttons that F-keys will click
export const KBD_TARGET_TESTIDS = {
  PRINT_BILL_PREFIX: 'order-entry-print-bill-btn-',
  REPRINT_KOT:       'reprint-kot-btn',
  PLACE_ORDER:       'place-order-btn',
  COLLECT_BILL:      'collect-bill-btn',
  QSR_COLLECT_BILL:  'qsr-collect-bill-btn',
};

// CR-482 OD-482-A8: typed-table chip clears after this many ms without a key
export const TABLE_JUMP_TIMEOUT_MS = 2000;

// CR-482 G4: physical keyboard detection — matches desktop/laptop, not tablet/phone
// (hover: hover)   = device has a hover-capable pointer (mouse/trackpad)
// (pointer: fine)   = pointer can target small areas (mouse, not finger)
// Together they exclude touch-only tablets/phones where auto-focus would pop up on-screen keyboard.
export const HAS_POINTER_DEVICE = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;
