// CR-078 · Smart Purchase — Horizon Picker (chip row for 3d/7d/10d/14d)
import { useState } from 'react';

const PRESETS = [3, 7, 10, 14];

export default function HorizonPicker({ value, onChange }) {
  const [customValue, setCustomValue] = useState('');
  const isPreset = PRESETS.includes(value);

  return (
    <div className="flex items-center gap-1.5" data-testid="horizon-picker">
      <div className="flex flex-col mr-2">
        <span className="text-xs font-semibold text-slate-700">Purchase for</span>
        <span className="text-[10px] text-slate-400">How many days of stock to buy</span>
      </div>
      {PRESETS.map(days => (
        <button
          key={days}
          type="button"
          onClick={() => { onChange(days); setCustomValue(''); }}
          className={`px-3 h-8 rounded-full text-xs font-medium transition-colors ${
            value === days
              ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
          data-testid={`horizon-chip-${days}`}
        >
          {days}d
        </button>
      ))}
      <div className={`flex items-center gap-1 px-2 h-8 rounded-full border transition-colors ${
        !isPreset && value ? 'bg-orange-100 border-orange-300' : 'bg-white border-slate-200'
      }`}>
        <span className="text-xs text-slate-500">Custom:</span>
        <input
          type="number"
          min="1"
          max="90"
          value={customValue}
          onChange={e => { setCustomValue(e.target.value); const n = parseInt(e.target.value, 10); if (n > 0) onChange(n); }}
          placeholder="days"
          className="w-14 text-xs bg-transparent outline-none"
          data-testid="horizon-chip-custom"
        />
      </div>
    </div>
  );
}
