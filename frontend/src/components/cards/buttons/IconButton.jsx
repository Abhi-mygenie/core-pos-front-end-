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
  className = "" 
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
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
      className={`p-3 rounded-lg transition-colors hover:opacity-80 ${className}`}
      style={buttonStyle}
      title={title}
      aria-label={ariaLabel}
    >
      <Icon className="w-5 h-5" style={iconStyle} />
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
};

IconButton.defaultProps = {
  onClick: null,
  iconColor: COLORS.darkText,
  testId: undefined,
  title: undefined,
  ariaLabel: undefined,
  className: "",
};

export default IconButton;
