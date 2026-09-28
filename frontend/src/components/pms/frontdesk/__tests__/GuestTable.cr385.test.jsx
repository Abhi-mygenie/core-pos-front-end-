// CR-385 M0.5 BUG-438 — GuestTable keyboard: ↑↓ move focus between rows, Enter toggles the focused row, Esc closes the open expansion (D57 / M0-10)
import { render, screen, fireEvent } from '@testing-library/react';
import GuestTable from '../GuestTable';

const rows = [{ id: 1, guestName: 'Alpha' }, { id: 2, guestName: 'Bravo' }, { id: 3, guestName: 'Charlie' }];
const columns = [{ key: 'guest', label: 'Guest', sortable: true, render: (r) => r.guestName }];

const setup = (expandedId = null) => {
  const onToggle = jest.fn();
  render(<GuestTable tab="arrivals" rows={rows} columns={columns} sort={{ key: 'guest', dir: 'asc' }} onSort={() => {}}
    expandedId={expandedId} onToggle={onToggle} renderExpansion={(r) => <div data-testid={`exp-${r.id}`}>open {r.id}</div>} />);
  return onToggle;
};

describe('CR-385 M0.5 BUG-438 GuestTable keyboard', () => {
  test('ArrowDown / ArrowUp move focus and clamp at the ends', () => {
    setup();
    const r1 = screen.getByTestId('fd-row-1');
    r1.focus();
    expect(document.activeElement).toBe(r1);
    fireEvent.keyDown(r1, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('fd-row-2'));
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('fd-row-3'));
    fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByTestId('fd-row-2'));
  });

  test('Enter toggles the focused row; click toggles too', () => {
    const onToggle = setup();
    const r2 = screen.getByTestId('fd-row-2');
    r2.focus();
    fireEvent.keyDown(r2, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith('2');
    fireEvent.click(screen.getByTestId('fd-row-3'));
    expect(onToggle).toHaveBeenLastCalledWith('3');
  });

  test('Esc closes an open expansion (onToggle(null)); no-op when nothing is open; one expansion rendered', () => {
    const onToggle = setup(2);
    expect(screen.getByTestId('fd-row-2-expansion')).toBeInTheDocument();
    expect(screen.getByTestId('exp-2')).toBeInTheDocument();
    expect(screen.queryByTestId('fd-row-1-expansion')).toBeNull();
    expect(screen.getByTestId('fd-row-2')).toHaveAttribute('aria-expanded', 'true');
    const r2 = screen.getByTestId('fd-row-2');
    r2.focus();
    fireEvent.keyDown(r2, { key: 'Escape' });
    expect(onToggle).toHaveBeenCalledWith(null);
  });

  test('Esc with nothing open does not call onToggle', () => {
    const onToggle = setup(null);
    const r1 = screen.getByTestId('fd-row-1');
    r1.focus();
    fireEvent.keyDown(r1, { key: 'Escape' });
    expect(onToggle).not.toHaveBeenCalled();
  });
});
