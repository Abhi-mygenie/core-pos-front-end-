// CR-385 M6 — regression guard (M6-09): frontdesk.css hides the panel's three room-mode toggles by testid, scoped to .frontdesk-bill.
// If CollectPaymentPanel ever renames a testid the rows would silently reappear inside the Front Desk bill → this test fails loudly.
// Also proves the CSS scope does not leak to /dashboard: every rule that touches a checkout-* toggle is prefixed with .frontdesk-bill.
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const TOGGLES = ['checkout-room-booking-toggle', 'checkout-transferred-toggle', 'checkout-room-service-toggle', 'tab-customer-section', 'payment-split-btn']; // + BUG-448 / OD-385-21 + D88 split

describe('CR-385 M6 — hideSectionRows guard', () => {
  const panelSrc = read('../../components/order-entry/CollectPaymentPanel.jsx');
  const css = read('../../components/pms/frontdesk/frontdesk.css');

  test.each(TOGGLES)('CollectPaymentPanel still renders data-testid="%s"', (id) => {
    expect(panelSrc).toContain(`data-testid="${id}"`);
  });

  test('frontdesk.css hides the three toggles ONLY under .frontdesk-bill (no bare selector → /dashboard unaffected)', () => {
    const lines = css.split('\n').filter((l) => l.includes('checkout-'));
    expect(lines.length).toBe(3);
    lines.forEach((l) => expect(l.trim().startsWith('.frontdesk-bill [data-testid="checkout-')).toBe(true));
    expect(css).toMatch(/\.frontdesk-bill \{ width: 440px; height: 560px; overflow: hidden; \}/);
    expect(css).toMatch(/\.fd-bill-grid \{ display: grid; grid-template-columns: 1fr 440px; height: 560px; \}/);
    expect(css).toContain('.frontdesk-bill.fd-bill-tab-prefilled [data-testid="tab-customer-section"] { display: none; }'); // BUG-448: scoped to the prefilled state only
    // D88 / Phase 4.5b: Split hidden only under .frontdesk-bill — the only rule that mentions the split testid is the scoped one
    const splitLines = css.split('\n').filter((l) => l.includes('payment-split-btn'));
    expect(splitLines).toEqual(['.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }']);
  });

  test('host component does no money arithmetic (round-off lives in the shared helper inside the panel / M5 only)', () => {
    const host = read('../../components/pms/frontdesk/FolioCheckoutPanel.jsx');
    expect(host).not.toMatch(/Math\.round|toFixed|\* 0\.\d|\/ 100|applyGrandTotalRoundOff/);
    expect(host).not.toMatch(/balance_payment|remaining_room_balance|amount_after_tax|rate_per_night|new_room_price/);
  });
});
