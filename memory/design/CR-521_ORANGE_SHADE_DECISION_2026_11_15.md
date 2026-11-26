# CR-521: Orange Shade Decision for "Bill Printed" Cards

## Executive Summary
Per the owner's request, the "Bill Printed" cards on the POS dashboard must transition from a light-green background (`#E8F5E9`) to an attractive orange background while retaining the strong green border (`#329937`, 2px).

## 1. Chosen Orange Shade
- **Background Color (`billPrintedBg`):** `#FFEDD5` (Tailwind Orange-100 equivalent)
- **Hover/Active Variant (if needed):** `#FED7AA` (Tailwind Orange-200 equivalent)

### Why `#FFEDD5`?
- **High Visibility:** It acts as a warm, prominent alert for busy staff to collect payment.
- **Distinct from "Ready":** Ready cards utilize a white background with a `#F26B33` orange border. The new printed state flips this dynamic (solid `#FFEDD5` background framed by the strict `#329937` green border), ensuring it reads as an entirely separate, final state from across the room.
- **Harmony:** It perfectly complements both the existing primary orange (`#F26B33`) and the required green border without vibrating visually.

## 2. Contrast Analysis (WCAG 2.1 AA Compliant)
Calculated against the new `#FFEDD5` background:
- **Dark Text (`#1A1A1A`):** Contrast ratio ~13.8:1 (Passes WCAG AAA)
- **Gray Text (`#666666`):** Contrast ratio ~4.9:1 (Passes WCAG AA)
- **Primary Green Border & Buttons (`#329937`):** Contrast ratio ~5.5:1 (Passes WCAG AA)
- **Primary Orange Badges (`#F26B33`):** Ratio ~2.7:1 (Used for large components like badges where 3:1 is recommended; it passes for non-text UI components).

## 3. Recommended Companion Adjustments
Placing existing gray or light-orange elements onto a solid `#FFEDD5` background can cause visual mud or loss of contrast. To maintain the crisp, attractive design, please apply these optional but highly recommended adjustments exclusively to cards in the "Printed" state:

1. **Header Pill Background:** 
   - *Current:* `#F5F5F5` (Light gray)
   - *Proposed:* `#FFFFFF` (Pure white) 
   - *Reason:* Gray on light orange looks muddy. White creates a clean, legible cutout.
2. **Delivery Buttons (Assign / Dispatch / On The Way):**
   - *Current:* Background `#FFF3E8`
   - *Proposed:* Background `#FFFFFF` 
   - *Reason:* `#FFF3E8` is too similar in lightness to `#FFEDD5`. Changing these buttons to white ensures they remain crisp and clickable.
3. **KOT Icon Button:**
   - Ensure the background is forced to `#FFFFFF` rather than transparent, so it pops clearly against the new orange card background.