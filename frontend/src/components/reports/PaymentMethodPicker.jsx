// PaymentMethodPicker — CR-003 Phase 3.4
//
// Self-contained popover trigger for the Audit Report's Paid-tab
// "Change Payment Method" row action. Renders the blue credit-card
// trigger button and, on click, a small popover offering Cash / Card /
// UPI pills. The current method (if any) is highlighted; selecting the
// same value is treated as a no-op (popover just closes). Selecting a
// different value invokes `onConfirm(newMethodLowercase, order)` so the
// caller can drive the optimistic update + API call.
//
// Visual states:
//   - normal: blue outlined credit-card icon
//   - disabled (outside 2-day window): zinc/grey, tooltip "Only available
//     for today and yesterday"
//   - in-flight: spinner replaces the icon and the button is locked.
//
// IMPORTANT — separation of concerns:
//   - This component does NOT call any API itself. It just emits
//     `onConfirm`. The page owns the network call, optimistic state,
//     toast wiring, and refetch.

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash', accent: 'emerald' },
  { value: 'card', label: 'Card', accent: 'blue' },
  { value: 'upi', label: 'UPI', accent: 'purple' },
];

const accentClasses = (accent, isCurrent) => {
  // Highlighted (current) pill uses the accent's solid tint; non-current
  // pills use a neutral hover so the visual draws the eye to "what would
  // change".
  if (isCurrent) {
    if (accent === 'emerald') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (accent === 'blue') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (accent === 'purple') return 'bg-purple-100 text-purple-800 border-purple-300';
  }
  return 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50';
};

/**
 * @param {Object}   props
 * @param {Object}   props.order              Row data (used for testid + onConfirm payload)
 * @param {string}   props.currentMethod      Lowercased current `paymentMethod`
 * @param {boolean}  props.disabled           True when outside 2-day window or otherwise blocked
 * @param {boolean}  props.isPending          True while a Change-Method API call is in flight
 * @param {string}   props.disabledTitle      Tooltip text shown when disabled
 * @param {(method: string, order: Object) => void} props.onConfirm
 */
const PaymentMethodPicker = ({
  order,
  currentMethod,
  disabled = false,
  isPending = false,
  disabledTitle = 'Only available for today and yesterday',
  onConfirm,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const stop = (e) => {
    e.stopPropagation();
  };

  const handleSelect = (e, method) => {
    stop(e);
    setIsOpen(false);
    if (!order || !onConfirm) return;
    if (method === currentMethod) return; // no-op when same method picked
    onConfirm(method, order);
  };

  const buttonDisabled = disabled || isPending;
  const tooltip = isPending
    ? 'Updating payment method…'
    : disabled
      ? disabledTitle
      : 'Change payment method';

  return (
    <Popover open={isOpen} onOpenChange={(next) => {
      // When already pending, swallow open requests so user can't reopen
      // mid-flight. The trigger button itself is also disabled, but Radix
      // would still allow keyboard re-open without this guard.
      if (buttonDisabled && next) return;
      setIsOpen(next);
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={stop}
          disabled={buttonDisabled}
          title={tooltip}
          data-testid={`row-action-change-method-${order?.id}`}
          className={`
            inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
            ${buttonDisabled
              ? 'border-zinc-200 text-zinc-400 cursor-not-allowed'
              : 'border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer'}
          `}
        >
          {isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <CreditCard className="w-3.5 h-3.5" />}
          <span>Change</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-44 p-2"
        onClick={stop}
        data-testid={`payment-method-picker-${order?.id}`}
      >
        <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Change to
        </div>
        <div className="flex flex-col gap-1">
          {METHOD_OPTIONS.map((opt) => {
            const isCurrent = opt.value === currentMethod;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => handleSelect(e, opt.value)}
                data-testid={`payment-method-option-${opt.value}-${order?.id}`}
                className={`
                  w-full flex items-center justify-between px-2.5 py-1.5 text-sm
                  rounded-sm border transition-colors
                  ${accentClasses(opt.accent, isCurrent)}
                `}
              >
                <span>{opt.label}</span>
                {isCurrent && (
                  <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PaymentMethodPicker;
