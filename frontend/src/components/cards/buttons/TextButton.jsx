import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { COLORS } from '../../../constants';

/**
 * TextButton - Reusable text button component for table cards
 * Automatically handles stopPropagation for click events
 * Supports both full-width and flex-1 layouts
 */
const TextButton = ({ 
  children, 
  onClick, 
  backgroundColor = COLORS.primaryGreen,
  textColor = "white",
  testId, 
  ariaLabel,
  fullWidth = false,
  className = "" 
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const baseClass = fullWidth ? "w-full" : "flex-1";

  // Memoize button style to prevent recreation on every render
  const buttonStyle = useMemo(() => ({ 
    backgroundColor, 
    color: textColor 
  }), [backgroundColor, textColor]);

  return (
    <button
      data-testid={testId}
      onClick={handleClick}
      className={`${baseClass} px-6 py-3 text-sm font-medium rounded-lg transition-colors hover:opacity-90 ${className}`}
      style={buttonStyle}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

TextButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  backgroundColor: PropTypes.string,
  textColor: PropTypes.string,
  testId: PropTypes.string,
  ariaLabel: PropTypes.string,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};

TextButton.defaultProps = {
  onClick: null,
  backgroundColor: COLORS.primaryGreen,
  textColor: "white",
  testId: undefined,
  ariaLabel: undefined,
  fullWidth: false,
  className: "",
};

export default TextButton;
