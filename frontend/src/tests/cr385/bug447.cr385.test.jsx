// CR-385 BUG-447 (owner a) — PAH badge AND advance chip both render; prepaid alone; X-10 no duplicate testids on a PAH+advance row.
import { render, screen } from '@testing-library/react';
import { badgesFor, badgeFor } from '@/api/transforms/frontDeskTransform';
import GuestTable, { commonColumns } from '@/components/pms/frontdesk/GuestTable';

const base = { id: 237, guestName: 'QA P3 Suite', bookingId: 'MG-69-A2B7', channel: 'Direct', checkin: '2026-09-22', checkout: '2026-09-23', nights: 1, adults: 1, roomType: 'suite', operationalStatus: 'pending' };
const cols = commonColumns({ amountKey: 'balance_due', amountLabel: 'Balance', actions: () => null, statusOf: () => 'pending' });
const table = (row) => render(<GuestTable rows={[row]} columns={cols} sort={{ key: 'checkin', dir: 'asc' }} onSort={() => {}} expandedId={null} onToggle={() => {}} renderExpansion={() => null} tab="arrivals" />);

test('pah=true + advance 1000 → both PAH badge and Advance ₹1,000 chip', () => {
  const row = { ...base, pah: true, charge: { advance_payment: 1000, balance_due: 36170 } };
  expect(badgesFor(row).map((b) => b.kind)).toEqual(['pah', 'advance']);
  expect(badgeFor(row)).toEqual({ kind: 'pah' });
  table(row);
  expect(screen.getByTestId('fd-row-237-badge')).toHaveTextContent(/pay at hotel/i);
  expect(screen.getByTestId('fd-row-237-badge-advance')).toHaveTextContent('Advance ₹1,000');
  const ids = [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'));
  expect(ids.length).toBe(new Set(ids).size); // X-10
});
test('pah=true + advance 0 → PAH only', () => {
  const row = { ...base, pah: true, charge: { advance_payment: 0, balance_due: 37170 } };
  expect(badgesFor(row).map((b) => b.kind)).toEqual(['pah']);
  table(row);
  expect(screen.getByTestId('fd-row-237-badge')).toHaveTextContent(/pay at hotel/i);
  expect(screen.queryByTestId('fd-row-237-badge-advance')).toBeNull();
});
test('prepaid → prepaid only (even with pah + advance flags)', () => {
  const row = { ...base, pah: true, charge: { prepaid_amount: 37170, advance_payment: 1000, balance_due: 0 } };
  expect(badgesFor(row)).toEqual([{ kind: 'prepaid' }]);
  table(row);
  expect(screen.getByTestId('fd-row-237-badge')).toHaveTextContent(/prepaid/i);
  expect(screen.queryByTestId('fd-row-237-badge-advance')).toBeNull();
});
test('advance only (pah=false) keeps the single primary chip; departed → no advance chip', () => {
  expect(badgesFor({ ...base, pah: false, charge: { advance_payment: 1000 } })).toEqual([{ kind: 'advance', amount: 1000 }]);
  expect(badgesFor({ ...base, pah: false, operationalStatus: 'departed', charge: { advance_payment: 1000 } })).toEqual([]);
});
