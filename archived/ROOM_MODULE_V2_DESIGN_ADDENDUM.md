# ROOM MODULE V2 — DESIGN ADDENDUM

This document specifies the design execution for the 10+ new UI patterns introduced in V2 of the Room Check-In modal.
**Strict Constraints Enforced:**
- 3-column modal layout preserved.
- Only existing `COLORS.*` tokens utilized.
- Only `lucide-react` icons utilized.
- Typography scale and font family preserved.

---

## 1. Country-code selector + phone input
- **Visual Anatomy**: Combined container replacing the standard phone input.
  ```text
  [ 🇮🇳 +91 v ] | [ Phone Number Input ]
  ```
- **Token References**:
  - Container: `border-[COLORS.borderGray] bg-[COLORS.lightBg]`
  - Text: `text-[COLORS.darkText]` (input), `text-[COLORS.grayText]` (placeholder/dropdown)
- **Icon Choices**: `ChevronDown` (lucide) for the dropdown indicator.
- **Interaction States**:
  - Focus: `focus-within:border-[COLORS.primaryOrange] focus-within:ring-1 focus-within:ring-[COLORS.primaryOrange]/20`
  - Error: `border-[COLORS.errorText] text-[COLORS.errorText]`
- **Responsive / Layout**: Matches exact width of the old `Phone` field in Column 1.
- **Test ID**: `data-testid="checkin-phone"` (input), `data-testid="checkin-country-code"` (dropdown).

## 2. Dynamic Add-Row button (Adults)
- **Visual Anatomy**: Outlined auxiliary button below the primary adult inputs.
- **Token References**: 
  - Default: `border-dashed border-[COLORS.borderGray] text-[COLORS.primaryOrange] bg-transparent`
  - Disabled: `opacity-50 text-[COLORS.grayText] border-[COLORS.borderGray] bg-transparent cursor-not-allowed`
- **Icon Choices**: `Plus` (lucide) — size `w-3.5 h-3.5`.
- **Interaction States**:
  - Hover (Active): `hover:bg-[COLORS.primaryOrange]/10 border-[COLORS.primaryOrange]`
- **Accessibility**: 
  - Tooltip on disabled: "Maximum X adults".
- **Test ID**: `data-testid="checkin-add-adult-btn"`.

## 3. Dynamic Add-Row button (Children)
- **Visual Anatomy**: Identical to Adult Add-Row.
- **Test ID**: `data-testid="checkin-add-child-btn"`.

## 4. Additional Adult Row (Repeated)
- **Visual Anatomy**: Compact horizontal grid spanning Columns 1 and 2.
  ```text
  [#2] [Name Input] [ID Type Select] [Front Upload*] [Back Upload] [X]
  ```
- **Token References**:
  - Row Wrapper: `border-t border-[COLORS.borderGray] pt-3 mt-3` or `bg-[COLORS.sectionBg]/50 p-2 rounded-lg`
  - Badge: `bg-[COLORS.borderGray] text-[COLORS.darkText] text-[10px] rounded px-1.5 py-0.5 font-bold`
- **Icon Choices**: `X` (remove), `Camera` (upload).
- **Responsive / Layout**: 
  - Container: `col-span-2` (spans Column 1 & 2). 
  - Internal grid: `grid grid-cols-5 gap-2 items-end`.
- **Test ID**: `data-testid="checkin-adult-row-{index}"`.

## 5. Child Row (Repeated)
- **Visual Anatomy**: Simpler compact row.
  ```text
  [#1] [Name Input] [X]
  ```
- **Layout**: Fits entirely inside Column 1 space (`col-span-1`).
- **Test ID**: `data-testid="checkin-child-row-{index}"`.

## 6. Remove-row `X` button
- **Visual Anatomy**: Small icon-only button at the right edge of a row.
- **Token References**: 
  - Default: `text-[COLORS.grayText] bg-transparent`
  - Hover: `text-[COLORS.errorText] bg-[COLORS.errorBg] rounded-md`
- **Icon Choices**: `X` (lucide) — size `w-4 h-4`.
- **Interaction States**:
  - Visibility: Appears on row hover `group-hover:opacity-100 opacity-0` (desktop), always visible on mobile.
- **Micro-animation**: `transition-opacity duration-150`.
- **Test ID**: `data-testid="checkin-remove-adult-{index}"` / `checkin-remove-child-{index}`.

## 7. 'Edit time' override link
- **Visual Anatomy**: Small text link floated right of the date picker label.
- **Token References**: `text-[10px] text-[COLORS.primaryOrange] font-medium`.
- **Interaction States**: 
  - Hover: `hover:underline cursor-pointer`.
- **Micro-animation**: Opens a shadcn Popover with a smooth fade-in.
- **Test ID**: `data-testid="checkin-edit-time-btn"`.

## 8. Nights helper input
- **Visual Anatomy**: Compact number input (`w-16`) placed inline with Check-out date.
- **Token References**: `text-center border-[COLORS.borderGray]`.
- **Micro-animation**: Changing nights triggers a 300ms `bg-[COLORS.amber]/20` pulse on the auto-calculated Check-out date field to signify the automated change.
- **Test ID**: `data-testid="checkin-nights"`.

## 9. Gated GST / Firm block
- **Visual Anatomy**: Section appearing inside Column 3.
- **Token References**: Inherits standard input/section styles.
- **Micro-animation**: 
  - Wrapper uses `transition-all duration-200 ease-out overflow-hidden`.
  - Hidden state: `max-h-0 opacity-0 mb-0`.
  - Revealed state: `max-h-[200px] opacity-100 mb-2`.
- **Test ID**: `data-testid="checkin-gst-block"`.

## 10. Dirty-form confirmation dialog
- **Visual Anatomy**: Center-aligned modal over the existing sidebar overlay (uses `shadcn/ui` Dialog).
- **Token References**:
  - Overlay: `bg-[COLORS.darkText]/50`
  - Discard Button: `bg-[COLORS.errorText] text-white hover:bg-[COLORS.errorText]/90`
  - Cancel Button: `border border-[COLORS.borderGray] text-[COLORS.grayText] hover:bg-[COLORS.sectionBg]`
- **Test ID**: `data-testid="dirty-dialog-discard"`, `data-testid="dirty-dialog-cancel"`.

## 11. File rejection inline error state
- **Visual Anatomy**: Border of file dropzone turns red, small error text appears below.
- **Token References**:
  - Error Border: `border-[COLORS.errorText] bg-[COLORS.errorBg]/20`
  - Error Text: `text-[COLORS.errorText] text-[10px] mt-0.5`
  - Success State Text: `text-[COLORS.primaryGreen] text-xs truncate`
- **Icon Choices**: `CheckCircle` (lucide) size `w-3.5 h-3.5` for success.
- **Test ID**: `data-testid="checkin-file-error"`.

## 12. 409 Conflict toast + auto-close
- **Visual Anatomy**: Standard Shadcn/Sonner toast.
- **Token References**: `bg-[COLORS.errorText] text-white`.
- **Micro-animation**: Slide in from bottom/top, stays for 4000ms. Modal auto-closes 500ms post-render.

## 13. Radio-button group visual (Booking Type & Booking For)
- **Visual Anatomy**: Pill-shaped segmented control.
  ```text
  ( WalkIn )  ( PreBooked )
  ```
- **Token References**:
  - Selected: `bg-[COLORS.primaryOrange] text-white border-transparent shadow-sm`
  - Unselected: `bg-[COLORS.lightBg] text-[COLORS.grayText] border-[COLORS.borderGray]`
- **Interaction**: `transition-colors duration-150`.
- **Test ID**: `data-testid="checkin-booking-type-walkin"`, etc.

## 14. Read-only Balance Payment field
- **Visual Anatomy**: Grayed-out but highly legible calculated field.
- **Token References**: `bg-[COLORS.sectionBg] text-[COLORS.darkText] font-medium border-transparent cursor-not-allowed`.
- **Test ID**: `data-testid="checkin-balance"`.

## 15. Inline field-level error text style
- **Visual Anatomy**: Micro-copy below inputs.
- **Token References**: `text-[COLORS.errorText] text-[10px] mt-0.5 leading-tight`.

## 16. Mandatory marker styling
- **Visual Anatomy**: Asterisk attached to labels.
- **Token References**: `text-[COLORS.errorText] ml-0.5 font-bold`.

## 17. Image-compression loading indicator
- **Visual Anatomy**: Spinner replacing the Camera icon during compression.
- **Icon Choices**: `Loader2` (lucide) with `animate-spin`.
- **Token References**: `text-[COLORS.primaryOrange] w-3.5 h-3.5`.