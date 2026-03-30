// DatePicker - Date selector for reports
// Phase 4A: Order Reports - Step 3

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Format date for display
 */
const formatDisplayDate = (date) => {
  if (!date) return 'Select date';
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if today
  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  // Check if yesterday
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  // Format as "Mar 17, 2026"
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Format date for API (YYYY-MM-DD)
 */
const formatApiDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Get today's date in YYYY-MM-DD format
 */
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * DatePicker Component
 * Flat input style per design guidelines
 * 
 * @param {string} value - Selected date (YYYY-MM-DD format)
 * @param {function} onChange - Callback when date changes (receives YYYY-MM-DD string)
 */
const DatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(value || getToday()));
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick select options
  const quickSelects = [
    { label: 'Today', getValue: () => getToday() },
    { label: 'Yesterday', getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatApiDate(d);
    }},
    { label: '7 days ago', getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return formatApiDate(d);
    }},
  ];

  // Calendar helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(formatApiDate(selected));
    setIsOpen(false);
  };

  const handleQuickSelect = (getValue) => {
    onChange(getValue());
    setIsOpen(false);
  };

  // Render calendar grid
  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = getToday();
    const selectedDate = value;

    const days = [];
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatApiDate(new Date(year, month, day));
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`
            w-8 h-8 text-sm rounded-sm transition-colors font-mono
            ${isSelected 
              ? 'bg-zinc-950 text-white' 
              : isToday 
                ? 'bg-zinc-100 text-zinc-950 font-semibold' 
                : 'text-zinc-700 hover:bg-zinc-100'
            }
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="date-picker-trigger"
        className={`
          flex items-center gap-2 px-3 py-2 
          border border-zinc-200 bg-white rounded-sm text-sm
          hover:border-zinc-400 transition-colors
          ${isOpen ? 'border-zinc-950 ring-1 ring-zinc-950' : ''}
        `}
      >
        <Calendar className="w-4 h-4 text-zinc-500" />
        <span className="font-medium text-zinc-900">
          {formatDisplayDate(value)}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-sm shadow-lg p-4 w-72"
          data-testid="date-picker-dropdown"
        >
          {/* Quick Selects */}
          <div className="flex gap-2 mb-4">
            {quickSelects.map((qs) => (
              <button
                key={qs.label}
                onClick={() => handleQuickSelect(qs.getValue)}
                className={`
                  px-2 py-1 text-xs rounded-sm transition-colors
                  ${value === qs.getValue() 
                    ? 'bg-zinc-950 text-white' 
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }
                `}
              >
                {qs.label}
              </button>
            ))}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zinc-100 rounded-sm transition-colors"
              data-testid="date-picker-prev-month"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600" />
            </button>
            <span className="text-sm font-semibold text-zinc-900">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-zinc-100 rounded-sm transition-colors"
              data-testid="date-picker-next-month"
            >
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div 
                key={d} 
                className="w-8 h-6 flex items-center justify-center text-xs font-semibold text-zinc-400 uppercase"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Selected Date Display */}
          <div className="mt-3 pt-3 border-t border-zinc-100 text-center">
            <span className="text-xs text-zinc-500">Selected: </span>
            <span className="text-xs font-mono text-zinc-900">{value || 'None'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
