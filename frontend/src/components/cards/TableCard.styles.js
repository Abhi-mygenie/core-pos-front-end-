/**
 * Static styles for TableCard component
 * These objects are created once and reused, improving performance
 */
import { COLORS } from '../../constants';

// Static button styles (never change)
export const BUTTON_STYLES = {
  iconError: {
    backgroundColor: COLORS.errorBg,
  },
  iconSuccess: {
    backgroundColor: COLORS.primaryGreen,
  },
  iconNeutral: {
    backgroundColor: COLORS.borderGray,
  },
  textSuccess: {
    backgroundColor: COLORS.primaryGreen,
    color: 'white',
  },
};

// Static icon color styles
export const ICON_STYLES = {
  error: { 
    color: COLORS.errorText 
  },
  success: { 
    color: 'white' 
  },
  neutral: { 
    color: COLORS.darkText 
  },
};

// Base card styles (mostly static)
export const CARD_BASE_STYLE = {
  backgroundColor: COLORS.lightBg,
  overflow: "visible",
};
