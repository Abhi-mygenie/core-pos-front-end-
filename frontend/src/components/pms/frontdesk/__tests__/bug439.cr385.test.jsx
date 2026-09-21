// BUG-439 — unique data-testid with a guest row expanded: drawer copies of the row actions carry the `-exp-` suffix (D73); row ids unchanged
import { render } from '@testing-library/react';
import lrFixture from '../../../../__fixtures__/cr385/local_reservations_view_all.json';
import { fromFrontDeskSnapshot } from '@/api/transforms/frontDeskTransform';
import ArrivalsPanel from '../ArrivalsPanel';
import DeparturesPanel from '../DeparturesPanel';
import InHousePanel from '../InHousePanel';

const snap = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'rejected', reason: new Error('500') }, kpis: { status: 'rejected', reason: new Error('500') } });
const pending = snap.reservations.filter((r) => r.operationalStatus === 'pending');
const inHouse = snap.reservations.filter((r) => r.operationalStatus === 'in_house');
const noop = () => {};

const allTestIds = () => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'));
const duplicates = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);
const count = (id) => document.querySelectorAll(`[data-testid="${id}"]`).length;

const panels = [
  { name: 'Arrivals', rows: pending, action: 'checkin-btn', render: (expandedId) => <ArrivalsPanel rows={pending} meta={snap.meta} kpis={null} expandedId={expandedId} onToggle={noop} chip={null} onChip={noop} /> },
  { name: 'Departures', rows: inHouse, action: 'bill-btn', render: (expandedId) => <DeparturesPanel rows={inHouse} meta={snap.meta} expandedId={expandedId} onToggle={noop} chip={null} onChip={noop} /> },
  { name: 'In-House', rows: inHouse, action: 'bill-btn', render: (expandedId) => <InHousePanel rows={inHouse} meta={snap.meta} expandedId={expandedId} onToggle={noop} chip="all" onChip={noop} /> },
];

describe.each(panels)('BUG-439 $name panel', ({ rows, action, render: renderPanel }) => {
  test('collapsed: no duplicate testids and no -exp- ids', () => {
    render(renderPanel(null));
    expect(duplicates(allTestIds())).toEqual([]);
    expect(allTestIds().filter((id) => id.includes('-exp-'))).toEqual([]);
  });

  test('expanded: no duplicate testids; row id once; drawer copy carries -exp-; both stay phase-gated', () => {
    const collapsed = render(renderPanel(null));
    const first = collapsed.container.querySelector('tr[data-testid^="fd-row-"][tabindex="0"]');
    const id = first.getAttribute('data-testid').replace('fd-row-', '');
    collapsed.unmount();
    expect(rows.some((r) => String(r.id) === id)).toBe(true);
    render(renderPanel(id));
    expect(duplicates(allTestIds())).toEqual([]);
    expect(count(`fd-row-${id}-${action}`)).toBe(1);
    expect(count(`fd-row-${id}-exp-${action}`)).toBe(1);
    expect(document.querySelector(`[data-testid="fd-row-${id}-expansion"]`)).not.toBeNull();
    const rowBtn = document.querySelector(`[data-testid="fd-row-${id}-${action}"]`);
    const drawerBtn = document.querySelector(`[data-testid="fd-row-${id}-exp-${action}"]`);
    expect(rowBtn).toBeDisabled();
    expect(drawerBtn).toBeDisabled();
    expect(drawerBtn.getAttribute('title')).toMatch(/Available in Phase \d/);
    expect(drawerBtn.textContent).toBe(rowBtn.textContent);
  });
});
