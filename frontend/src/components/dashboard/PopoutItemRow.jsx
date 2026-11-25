// PopoutItemRow — CR-557
// Shared item-row renderer for ScanOrderPopOut (Mode A normal, Mode B new items,
// and read-only "previously ordered" items). Presentation-only: no service/socket/
// localStorage/NotificationContext. All data + callbacks arrive via props.
//
// Carries, in ALL variants:
//   - APS badge + "Price TBD" for ₹1 non-comp items (CR-545 / OBS-5)   [OD-557-01]
//   - cancelled row: strikethrough + grey + "(Cancelled)" + price hidden (BUG-679)
//   - full per-option variation list with per-option price (BUG-702)
//   - add-on prices, item note, Comp tag
//
// variant: 'full'     → Mode A rows   (test-id family popout-item-*, popout-kot-check-*)
//          'new'       → Mode B new items (family popout-new-item-*, popout-kot-check-new-*)
//          'readonly'  → Mode B previously-ordered items (greyed, no KOT/cancel)   [OD-557-02]
import React from 'react';
import { XCircle } from 'lucide-react';
import { COLORS } from '../../constants';

const TID = (variant, idx) => ({
  full: {
    row: `popout-item-row-${idx}`,
    kot: `popout-kot-check-${idx}`,
    cancel: `popout-item-cancel-${idx}`,
    comp: `popout-item-comp-tag-${idx}`,
    aps: `popout-item-aps-tag-${idx}`,
    varPfx: `popout-item-variation-${idx}`,
    addonPfx: `popout-item-addon-${idx}`,
    note: `popout-item-note-${idx}`,
  },
  new: {
    row: `popout-new-item-${idx}`,
    kot: `popout-kot-check-new-${idx}`,
    cancel: `popout-cancel-new-item-${idx}`,
    comp: `popout-new-item-comp-tag-${idx}`,
    aps: `popout-new-item-aps-tag-${idx}`,
    varPfx: `popout-new-item-variation-${idx}`,
    addonPfx: `popout-new-item-addon-${idx}`,
    note: `popout-new-item-note-${idx}`,
  },
  readonly: {
    row: `popout-prev-item-${idx}`,
    kot: '',
    cancel: '',
    comp: `popout-prev-item-comp-tag-${idx}`,
    aps: `popout-prev-item-aps-tag-${idx}`,
    varPfx: `popout-prev-item-variation-${idx}`,
    addonPfx: `popout-prev-item-addon-${idx}`,
    note: `popout-prev-item-note-${idx}`,
  },
}[variant] || {});

const PopoutItemRow = ({
  item,
  idx,
  variant = 'full',
  currencySymbol = '₹',
  variationOptions = [],       // precomputed by parent via flattenVariationOptions()
  showKot = false,
  isSelected = false,
  onToggleKot,                 // (itemId) => void
  showCancel = false,
  onCancel,                    // (item) => void
  onPriceChange,               // CR-561: (itemId, unitPrice) => void — set TBD/APS line price (batched by parent)
}) => {
  const it = item || {};
  const tid = TID(variant, idx);
  const isReadonly = variant === 'readonly';
  const [priceDraft, setPriceDraft] = React.useState(''); // CR-561

  const qty = Number(it?.qty ?? it?.quantity) || 1;
  const unit = Number(it?.unitPrice ?? it?.price) || 0;
  const lineTotal = unit * qty;
  const isComp = Boolean(it?.isComplementary || it?.isComplementaryRuntime);
  const isCancelled = it?.status === 'cancelled' || Number(it?.foodStatus ?? it?.food_status) === 3; // BUG-679
  const isAps = unit === 1 && !isComp; // CR-545
  const addOns = Array.isArray(it?.addOns) ? it.addOns : [];

  const canKot = showKot && !isReadonly && !isCancelled;
  const canCancel = showCancel && !isReadonly && !isCancelled;

  const nameColor = isCancelled ? '#9CA3AF' : (isReadonly ? COLORS.grayText : COLORS.darkText);

  return (
    <li
      className="px-3 py-2 text-sm flex items-start gap-2"
      style={{ opacity: isReadonly ? 0.6 : (isCancelled ? 0.5 : 1) }}
      data-testid={tid.row}
    >
      {canKot && (
        <input
          type="checkbox"
          className="mt-1 flex-shrink-0 accent-[#2E7D32]"
          checked={isSelected}
          onChange={() => onToggleKot?.(it.id)}
          data-testid={tid.kot}
        />
      )}
      <div className="flex-1 min-w-0">
        {/* row 1: qty + name + comp/aps tags + price + cancel */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ color: nameColor, textDecoration: isCancelled ? 'line-through' : 'none' }}
              className="font-medium truncate"
            >
              {qty}× {it?.name || it?.productName || it?.foodName || 'Item'}
              {isCancelled ? <span className="ml-1 text-xs font-normal" style={{ textDecoration: 'none' }}>(Cancelled)</span> : null}
            </span>
            {isComp ? (
              <span data-testid={tid.comp} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: '#F1F5F9', color: COLORS.darkText }}>Comp</span>
            ) : null}
            {isAps ? (
              <span data-testid={tid.aps} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>APS</span>
            ) : null}
          </div>
          {isCancelled ? null : isAps ? (
            (!isReadonly && typeof onPriceChange === 'function') ? (
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Price"
                value={priceDraft}
                data-testid={`popout-item-price-input-${it.id ?? idx}`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = e.target.value;
                  setPriceDraft(v);
                  const n = parseFloat(v);
                  onPriceChange(it.id, (v !== '' && !isNaN(n) && n > 0) ? n : null);
                }}
                className="w-20 text-[12px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded border text-right"
                style={{ borderColor: '#E65100', color: '#E65100' }}
              />
            ) : (
              <span className="text-[11px] font-semibold flex-shrink-0 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>Price TBD</span>
            )
          ) : (
            <span style={{ color: COLORS.grayText }} className="font-mono flex-shrink-0">
              {currencySymbol}{lineTotal.toFixed(2)}
            </span>
          )}
          {canCancel ? (
            <button
              data-testid={tid.cancel}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-100"
              style={{ backgroundColor: COLORS.sectionBg }}
              onClick={(e) => { e.stopPropagation(); onCancel?.(it); }}
              title="Cancel this item"
            >
              <XCircle className="w-4 h-4" style={{ color: COLORS.grayText }} />
            </button>
          ) : null}
        </div>
        {/* row 2: variations (BUG-702) */}
        {variationOptions.length > 0 ? (
          <div className="mt-1 pl-3 border-l-2" style={{ borderColor: COLORS.borderGray }}>
            {variationOptions.map((o, vIdx) => (
              <div key={`var-${vIdx}`} className="text-xs" style={{ color: COLORS.grayText }}
                data-testid={`${tid.varPfx}-${vIdx}`}>
                {o.label}{o.price > 0 ? <span className="ml-1">(+{currencySymbol}{o.price.toFixed(2)})</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {/* row 3: add-ons */}
        {addOns.length > 0 ? (
          <div className="mt-1 pl-3 border-l-2" style={{ borderColor: '#FCD9A4' }}>
            {addOns.map((a, aIdx) => (
              <div key={`add-${aIdx}`} className="text-xs" style={{ color: COLORS.primaryOrange }}
                data-testid={`${tid.addonPfx}-${aIdx}`}>
                + {a?.name || ''}{Number(a?.price) > 0 ? <span className="ml-1">(+{currencySymbol}{Number(a.price).toFixed(2)})</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {/* row 4: item note */}
        {it?.notes ? (
          <div className="mt-1 text-xs italic px-2 py-1 rounded"
            style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }} data-testid={tid.note}>
            &quot;{it.notes}&quot;
          </div>
        ) : null}
      </div>
    </li>
  );
};

export default PopoutItemRow;
