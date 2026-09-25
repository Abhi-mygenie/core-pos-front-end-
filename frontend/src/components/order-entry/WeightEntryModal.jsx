// CR-010: Weight Entry Modal — shown before adding a weight-based item to cart.
// Cashier enters weight in small unit (gm/ml), system converts to base unit (Kg/L).
// Features: +/− buttons (50 step), quick-pick pills, live total preview.

import { useState, useCallback } from "react";
import { X, Minus, Plus, Scale } from "lucide-react";
import { COLORS } from "../../constants";

// Unit family mapping
const UNIT_FAMILIES = {
  Kg: { small: 'gm', base: 'Kg', factor: 1000, step: 50, defaultSmall: 1000 },
  gm: { small: 'gm', base: 'gm', factor: 1, step: 50, defaultSmall: 100 },
  L:  { small: 'ml', base: 'L',  factor: 1000, step: 50, defaultSmall: 1000 },
  ml: { small: 'ml', base: 'ml', factor: 1, step: 50, defaultSmall: 100 },
};

// Quick-pick pills per unit family
const PILLS = {
  Kg: [
    { label: '100 gm', value: 100 },
    { label: '250 gm', value: 250 },
    { label: '500 gm', value: 500 },
    { label: '1 Kg',   value: 1000 },
    { label: '2 Kg',   value: 2000 },
    { label: '5 Kg',   value: 5000 },
  ],
  gm: [
    { label: '50 gm',  value: 50 },
    { label: '100 gm', value: 100 },
    { label: '250 gm', value: 250 },
    { label: '500 gm', value: 500 },
    { label: '750 gm', value: 750 },
    { label: '1000 gm', value: 1000 },
  ],
  L: [
    { label: '100 ml', value: 100 },
    { label: '250 ml', value: 250 },
    { label: '500 ml', value: 500 },
    { label: '1 L',    value: 1000 },
    { label: '2 L',    value: 2000 },
    { label: '5 L',    value: 5000 },
  ],
  ml: [
    { label: '50 ml',  value: 50 },
    { label: '100 ml', value: 100 },
    { label: '250 ml', value: 250 },
    { label: '500 ml', value: 500 },
    { label: '750 ml', value: 750 },
    { label: '1000 ml', value: 1000 },
  ],
};

/**
 * Format weight for display: shows in the most readable unit.
 * e.g., 500 gm stays "500 gm", 1000 gm → "1 Kg", 2500 gm → "2.5 Kg"
 */
const formatWeightDisplay = (smallValue, family) => {
  if (family.factor === 1) return `${smallValue} ${family.small}`;
  if (smallValue >= family.factor) {
    const baseVal = smallValue / family.factor;
    return `${parseFloat(baseVal.toFixed(2))} ${family.base}`;
  }
  return `${smallValue} ${family.small}`;
};

const WeightEntryModal = ({ item, onConfirm, onClose }) => {
  const unit = item?.itemUnit || 'Kg';
  const family = UNIT_FAMILIES[unit] || UNIT_FAMILIES.Kg;
  const pills = PILLS[unit] || PILLS.Kg;
  const unitPrice = item?.itemUnitPrice || 0;

  // State: weight in small unit (gm/ml)
  const [weightSmall, setWeightSmall] = useState(family.defaultSmall);
  const [inputValue, setInputValue] = useState(String(family.defaultSmall));
  const [error, setError] = useState('');

  // Convert small unit to base unit for billing
  const weightBase = weightSmall / family.factor;
  const lineTotal = unitPrice * weightBase;

  const updateWeight = useCallback((newVal) => {
    const clamped = Math.max(family.step, newVal);
    const rounded = Math.round(clamped * 100) / 100;
    setWeightSmall(rounded);
    setInputValue(String(rounded));
    setError('');
  }, [family.step]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      setWeightSmall(Math.round(parsed * 100) / 100);
      setError('');
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid weight');
      setInputValue(String(weightSmall));
    } else {
      updateWeight(parsed);
    }
  };

  const handleConfirm = () => {
    if (weightSmall <= 0) {
      setError('Weight must be greater than 0');
      return;
    }
    onConfirm(parseFloat(weightBase.toFixed(2)));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="weight-entry-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLORS.primaryGreen}15` }}>
                <Scale size={20} style={{ color: COLORS.primaryGreen }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: COLORS.darkText }}>
                  {item?.name}
                </h2>
                <p className="text-sm" style={{ color: COLORS.grayText }}>
                  ₹{unitPrice}/{family.base}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Weight Input */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.darkText }}>
              Enter weight in {family.small}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateWeight(weightSmall - family.step)}
                disabled={weightSmall <= family.step}
                className="w-11 h-11 flex items-center justify-center rounded-xl border-2 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="weight-minus"
              >
                <Minus size={18} style={{ color: COLORS.darkText }} />
              </button>

              <div className="flex-1 relative">
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="w-full h-11 text-center text-lg font-bold rounded-xl border-2 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{
                    borderColor: error ? '#EF4444' : COLORS.primaryGreen,
                    color: COLORS.darkText,
                  }}
                  data-testid="weight-input"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: COLORS.grayText }}>
                  {family.small}
                </span>
              </div>

              <button
                onClick={() => updateWeight(weightSmall + family.step)}
                className="w-11 h-11 flex items-center justify-center rounded-xl border-2 hover:bg-gray-50 transition-colors"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="weight-plus"
              >
                <Plus size={18} style={{ color: COLORS.darkText }} />
              </button>
            </div>
            {error && (
              <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{error}</p>
            )}
          </div>

          {/* Quick-pick pills */}
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Quick select
            </label>
            <div className="flex flex-wrap gap-2">
              {pills.map((pill) => {
                const isActive = weightSmall === pill.value;
                return (
                  <button
                    key={pill.value}
                    onClick={() => updateWeight(pill.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all"
                    style={{
                      backgroundColor: isActive ? `${COLORS.primaryGreen}15` : 'transparent',
                      borderColor: isActive ? COLORS.primaryGreen : COLORS.borderGray,
                      color: isActive ? COLORS.primaryGreen : COLORS.darkText,
                    }}
                    data-testid={`weight-pill-${pill.value}`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live total preview */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: `${COLORS.primaryOrange}08`, border: `1px solid ${COLORS.primaryOrange}30` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm" style={{ color: COLORS.grayText }}>
                  {formatWeightDisplay(weightSmall, family)} × ₹{unitPrice}/{family.base}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold" style={{ color: COLORS.primaryOrange }}>
                  ₹{lineTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={handleConfirm}
            disabled={weightSmall <= 0}
            className="w-full py-3 rounded-xl text-white font-bold text-base transition-opacity disabled:opacity-40"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="weight-confirm"
          >
            Add to Cart — {formatWeightDisplay(weightSmall, family)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeightEntryModal;
