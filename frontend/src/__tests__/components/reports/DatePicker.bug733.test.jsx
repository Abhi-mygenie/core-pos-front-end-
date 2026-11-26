// BUG-733 — DatePicker empty-value chevron guard
import { render, fireEvent, screen } from '@testing-library/react';
import DatePicker from '../../../components/reports/DatePicker';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('DatePicker BUG-733 empty-value guard', () => {
  test('prev-day is a no-op when value is empty', () => {
    const onChange = jest.fn();
    render(<DatePicker value="" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('date-picker-prev-day'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('next-day is a no-op when value is empty', () => {
    const onChange = jest.fn();
    render(<DatePicker value="" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('date-picker-next-day'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('prev-day shifts back one day when value is set', () => {
    const onChange = jest.fn();
    render(<DatePicker value="2026-11-20" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('date-picker-prev-day'));
    expect(onChange).toHaveBeenCalledWith('2026-11-19');
  });

  test('next-day shifts forward one day for a past date', () => {
    const onChange = jest.fn();
    render(<DatePicker value="2020-01-01" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('date-picker-next-day'));
    expect(onChange).toHaveBeenCalledWith('2020-01-02');
  });

  test('next-day is disabled/no-op on today (no future)', () => {
    const onChange = jest.fn();
    render(<DatePicker value={todayStr()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('date-picker-next-day'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
