// Common button styles for the entire application
export const buttonStyles = {
  // Base button style
  base: {
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    margin: '5px',
    color: '#eee',
    backgroundColor: '#444',
    '&:hover': {
      backgroundColor: '#555'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },

  // Primary action buttons (e.g., Start, Save, Confirm)
  primary: {
    backgroundColor: '#4CAF50',
    '&:hover': {
      backgroundColor: '#45a049'
    }
  },

  // Secondary action buttons (e.g., Cancel, Back)
  secondary: {
    backgroundColor: '#2196F3',
    '&:hover': {
      backgroundColor: '#1976D2'
    }
  },

  // Danger buttons (e.g., Delete, Stop)
  danger: {
    backgroundColor: '#f44336',
    '&:hover': {
      backgroundColor: '#d32f2f'
    }
  },

  // Warning buttons (e.g., Caution actions)
  warning: {
    backgroundColor: '#ff9800',
    '&:hover': {
      backgroundColor: '#f57c00'
    }
  },

  // Info buttons (e.g., Help, Details)
  info: {
    backgroundColor: '#00bcd4',
    '&:hover': {
      backgroundColor: '#00acc1'
    }
  },

  // Small size variant
  small: {
    padding: '4px 8px',
    fontSize: '12px'
  },

  // Large size variant
  large: {
    padding: '12px 24px',
    fontSize: '16px'
  }
};

// Helper function to combine button styles
export const combineStyles = (...styles) => {
  return styles.reduce((acc, style) => ({
    ...acc,
    ...style,
    '&:hover': {
      ...acc['&:hover'],
      ...style['&:hover']
    },
    '&:disabled': {
      ...acc['&:disabled'],
      ...style['&:disabled']
    }
  }), {});
};

/**
 * Determines if a color is dark by comparing it to a threshold
 * @param {string} color - CSS color string (hex, rgb, or rgba)
 * @returns {boolean} true if the color is dark, false otherwise
 */
export const isDarkColor = (color) => {
  // Default to false if color is not provided
  if (!color) return false;
  
  // Extract RGB values from different color formats
  let r, g, b;
  
  // For hex values
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    // Handle both 3-digit and 6-digit hex
    const expandedHex = hex.length === 3 
      ? hex.split('').map(c => c + c).join('')
      : hex;
      
    r = parseInt(expandedHex.substring(0, 2), 16);
    g = parseInt(expandedHex.substring(2, 4), 16);
    b = parseInt(expandedHex.substring(4, 6), 16);
  } 
  // For rgb/rgba values
  else if (color.startsWith('rgb')) {
    const rgbValues = color.match(/\d+/g).map(Number);
    [r, g, b] = rgbValues;
  }
  // Default values if format is not recognized
  else {
    return false;
  }
  
  // Compare to threshold (127,127,127)
  // Check if the color is darker than the threshold
  return (r < 127 || g < 127 || b < 127);
};

/**
 * Determines the appropriate text color based on background color
 * @param {string} backgroundColor - The background color value
 * @returns {string} White for dark backgrounds, black for light backgrounds
 */
export const getContrastTextColor = (backgroundColor) => {
  return isDarkColor(backgroundColor) ? '#FFFFFF' : '#000000';
};

// Common button style combinations
export const buttonVariants = {
  primaryButton: combineStyles(buttonStyles.base, buttonStyles.primary),
  secondaryButton: combineStyles(buttonStyles.base, buttonStyles.secondary),
  dangerButton: combineStyles(buttonStyles.base, buttonStyles.danger),
  warningButton: combineStyles(buttonStyles.base, buttonStyles.warning),
  infoButton: combineStyles(buttonStyles.base, buttonStyles.info),
  smallPrimary: combineStyles(buttonStyles.base, buttonStyles.primary, buttonStyles.small),
  smallSecondary: combineStyles(buttonStyles.base, buttonStyles.secondary, buttonStyles.small),
  largePrimary: combineStyles(buttonStyles.base, buttonStyles.primary, buttonStyles.large),
  largeSecondary: combineStyles(buttonStyles.base, buttonStyles.secondary, buttonStyles.large)
};

// Function to create dynamic button styles based on the current color scheme
export const createDynamicButtonStyles = (colors) => {
  const dynamicButtonStyles = {
    primary: {
      backgroundColor: colors.primary.base,
      color: getContrastTextColor(colors.primary.base),
      '&:hover': {
        backgroundColor: colors.primary.hover,
        color: getContrastTextColor(colors.primary.hover)
      }
    },
    secondary: {
      backgroundColor: colors.secondary.base,
      color: getContrastTextColor(colors.secondary.base),
      '&:hover': {
        backgroundColor: colors.secondary.hover,
        color: getContrastTextColor(colors.secondary.hover)
      }
    },
    danger: {
      backgroundColor: colors.danger.base,
      color: getContrastTextColor(colors.danger.base),
      '&:hover': {
        backgroundColor: colors.danger.hover,
        color: getContrastTextColor(colors.danger.hover)
      }
    },
    warning: {
      backgroundColor: colors.warning.base,
      color: getContrastTextColor(colors.warning.base),
      '&:hover': {
        backgroundColor: colors.warning.hover,
        color: getContrastTextColor(colors.warning.hover)
      }
    },
    info: {
      backgroundColor: colors.info.base,
      color: getContrastTextColor(colors.info.base),
      '&:hover': {
        backgroundColor: colors.info.hover,
        color: getContrastTextColor(colors.info.hover)
      }
    }
  };

  return {
    primaryButton: combineStyles(buttonStyles.base, dynamicButtonStyles.primary),
    secondaryButton: combineStyles(buttonStyles.base, dynamicButtonStyles.secondary),
    dangerButton: combineStyles(buttonStyles.base, dynamicButtonStyles.danger),
    warningButton: combineStyles(buttonStyles.base, dynamicButtonStyles.warning),
    infoButton: combineStyles(buttonStyles.base, dynamicButtonStyles.info),
    smallPrimary: combineStyles(buttonStyles.base, dynamicButtonStyles.primary, buttonStyles.small),
    smallSecondary: combineStyles(buttonStyles.base, dynamicButtonStyles.secondary, buttonStyles.small),
    largePrimary: combineStyles(buttonStyles.base, dynamicButtonStyles.primary, buttonStyles.large),
    largeSecondary: combineStyles(buttonStyles.base, dynamicButtonStyles.secondary, buttonStyles.large)
  };
}; 