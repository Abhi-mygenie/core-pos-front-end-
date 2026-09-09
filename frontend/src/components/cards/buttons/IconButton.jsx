import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { COLORS } from '../../../constants';

/**
 * IconButton - Reusable icon button component for table cards
 * Automatically handles stopPropagation for click events
 */
const IconButton = ({ 
  icon: Icon, 
  onClick, 
  backgroundColor, 
  iconColor = COLORS.darkText,
  testId, 
  title, 
  ariaLabel,
  className = "",
  disabled = false,
  isLoading = false,
  LoadingIcon = null,
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onClick?.(e);
  };

  // Memoize button style to prevent recreation on every render
  const buttonStyle = useMemo(() => ({ 
    backgroundColor 
  }), [backgroundColor]);

  // Memoize icon style
  const iconStyle = useMemo(() => ({ 
    color: iconColor 
  }), [iconColor]);

  return (
    <button
      data-testid={testId}
      onClick={handleClick}
      disabled={disabled}
      className={`p-3 rounded-lg transition-colors hover:opacity-80 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={buttonStyle}
      title={title}
      aria-label={ariaLabel}
    >
      {isLoading && LoadingIcon ? <LoadingIcon className="w-5 h-5 animate-spin" style={iconStyle} /> : <Icon className="w-5 h-5" style={iconStyle} />}
    </button>
  );
};

IconButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  onClick: PropTypes.func,
  backgroundColor: PropTypes.string.isRequired,
  iconColor: PropTypes.string,
  testId: PropTypes.string,
  title: PropTypes.string,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  LoadingIcon: PropTypes.elementType,
};

IconButton.defaultProps = {
  onClick: null,
  iconColor: COLORS.darkText,
  testId: undefined,
  title: undefined,
  ariaLabel: undefined,
  className: "",
  disabled: false,
  isLoading: false,
  LoadingIcon: null,
};

export default IconButton;
