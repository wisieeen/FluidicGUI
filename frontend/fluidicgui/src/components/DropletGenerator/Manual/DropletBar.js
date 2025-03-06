import React from 'react';

/**
 * Rounds a number to the specified number of significant digits
 * @param {number} num - The number to round
 * @param {number} sigDigits - Number of significant digits to keep (default: 2)
 * @returns {number} - Rounded number
 */
const roundToSignificantDigits = (num, sigDigits = 2) => {
  if (num === 0) return 0;
  
  // Get the power of 10 for the first significant digit
  const power = Math.floor(Math.log10(Math.abs(num)));
  
  // Calculate the multiplier
  const multiplier = Math.pow(10, sigDigits - power - 1);
  
  // Round the number
  return Math.round(num * multiplier) / multiplier;
};

/**
 * Calculate perceived brightness of a color (on scale 0-255)
 * Uses the formula: (0.299*R + 0.587*G + 0.114*B)
 * @param {string} color - RGB color in format 'rgb(r, g, b)'
 * @returns {number} - Perceived brightness value
 */
const getColorBrightness = (color) => {
  // Extract RGB values from the color string
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!rgbMatch) return 127; // Default to middle brightness if parsing fails
  
  const r = parseInt(rgbMatch[1], 10);
  const g = parseInt(rgbMatch[2], 10);
  const b = parseInt(rgbMatch[3], 10);
  
  // Calculate perceived brightness (gives more weight to green as human eyes are more sensitive to it)
  return (0.299 * r + 0.587 * g + 0.114 * b);
};

// A bar representing a parameter (composition, treatment intensity, etc.)
const DropletBar = ({ value, range = { min: 0, max: 100 }, colorScheme = 'cividis' }) => {
  // Ensure value is not an object. If it is, convert it to a string.
  let displayValue = typeof value === 'object' ? parseFloat(value.value) : value;
  
  // Round to 2 significant digits for display
  displayValue = roundToSignificantDigits(displayValue);
  
  const color = getColorBasedOnValue(displayValue, range.min, range.max, colorScheme);
  
  // Determine text color based on background brightness
  const brightness = getColorBrightness(color);
  const textColor = brightness > 127 ? 'black' : 'white'; // Use black for bright backgrounds, white for dark backgrounds
  
  return (
    <div style={{
      width: '25px',
      height: '15px',
      backgroundColor: color,
      margin: '1px',
      color: textColor,
      textAlign: 'center',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
    }}>
      {displayValue} {/* Render the rounded displayValue with dynamic text color */}
    </div>
  );
};

// Scientific color schemes based on percentage (0-1)
const scientificColorSchemes = {
  // Viridis - Perceptually uniform blue-green-yellow
  viridis: (percentage) => {
    if (percentage < 0.25) {
      // Dark blue to blue
      return `rgb(68, 1, 84, 1.0)`.replace(
        '1, 84', 
        `${roundToSignificantDigits(1 + percentage * 4 * 31)}, ${roundToSignificantDigits(84 + percentage * 4 * 58)}`
      );
    } else if (percentage < 0.5) {
      // Blue to teal
      return `rgb(59, 82, 139, 1.0)`.replace(
        '59, 82, 139', 
        `${roundToSignificantDigits(59 - (percentage - 0.25) * 4 * 26)}, ${roundToSignificantDigits(82 + (percentage - 0.25) * 4 * 56)}, ${roundToSignificantDigits(139 - (percentage - 0.25) * 4 * 10)}`
      );
    } else if (percentage < 0.75) {
      // Teal to green
      return `rgb(33, 144, 141, 1.0)`.replace(
        '33, 144, 141', 
        `${roundToSignificantDigits(33 + (percentage - 0.5) * 4 * 93)}, ${roundToSignificantDigits(144 + (percentage - 0.5) * 4 * 57)}, ${roundToSignificantDigits(141 - (percentage - 0.5) * 4 * 104)}`
      );
    } else {
      // Green to yellow
      return `rgb(126, 211, 33, 1.0)`.replace(
        '126, 211, 33', 
        `${roundToSignificantDigits(126 + (percentage - 0.75) * 4 * 127)}, ${roundToSignificantDigits(211 + (percentage - 0.75) * 4 * 44)}, ${roundToSignificantDigits(33 + (percentage - 0.75) * 4 * 5)}`
      );
    }
  },
  
  // Plasma - Perceptually uniform purple-red-yellow
  plasma: (percentage) => {
    if (percentage < 0.33) {
      // Dark purple to magenta
      const p = percentage * 3;
      return `rgb(${Math.round(roundToSignificantDigits(13 + p * 143))}, ${Math.round(roundToSignificantDigits(8 + p * 63))}, ${Math.round(roundToSignificantDigits(135 + p * 20))})`;
    } else if (percentage < 0.66) {
      // Magenta to orange
      const p = (percentage - 0.33) * 3;
      return `rgb(${Math.round(roundToSignificantDigits(156 + p * 84))}, ${Math.round(roundToSignificantDigits(71 + p * 118))}, ${Math.round(roundToSignificantDigits(155 - p * 95))})`;
    } else {
      // Orange to yellow
      const p = (percentage - 0.66) * 3;
      return `rgb(${Math.round(roundToSignificantDigits(240 + p * 13))}, ${Math.round(roundToSignificantDigits(189 + p * 56))}, ${Math.round(roundToSignificantDigits(60 + p * 17))})`;
    }
  },
  
  // Inferno - Black to red to yellow
  inferno: (percentage) => {
    if (percentage < 0.33) {
      // Black to purple
      const p = percentage * 3;
      return `rgb(${Math.round(roundToSignificantDigits(0 + p * 120))}, ${Math.round(roundToSignificantDigits(0 + p * 28))}, ${Math.round(roundToSignificantDigits(4 + p * 95))})`;
    } else if (percentage < 0.66) {
      // Purple to red
      const p = (percentage - 0.33) * 3;
      return `rgb(${Math.round(roundToSignificantDigits(120 + p * 100))}, ${Math.round(roundToSignificantDigits(28 + p * 12))}, ${Math.round(roundToSignificantDigits(99 - p * 60))})`;
    } else {
      // Red to yellow
      const p = (percentage - 0.66) * 3;
      return `rgb(${Math.round(roundToSignificantDigits(220 + p * 32))}, ${Math.round(roundToSignificantDigits(40 + p * 210))}, ${Math.round(roundToSignificantDigits(39 + p * 28))})`;
    }
  },
  
  // Cividis - Colorblind-friendly blue to yellow
  cividis: (percentage) => {
    if (percentage < 0.5) {
      // Dark blue to teal
      const p = percentage * 2;
      return `rgb(${Math.round(roundToSignificantDigits(0 + p * 97))}, ${Math.round(roundToSignificantDigits(32 + p * 153))}, ${Math.round(roundToSignificantDigits(77 + p * 67))})`;
    } else {
      // Teal to yellow
      const p = (percentage - 0.5) * 2;
      return `rgb(${Math.round(roundToSignificantDigits(97 + p * 158))}, ${Math.round(roundToSignificantDigits(185 + p * 55))}, ${Math.round(roundToSignificantDigits(144 - p * 114))})`;
    }
  },
  
  // Turbo - Enhanced rainbow (blue-cyan-green-yellow-red)
  turbo: (percentage) => {
    if (percentage < 0.2) {
      // Blue to cyan
      const p = percentage * 5;
      return `rgb(${Math.round(roundToSignificantDigits(48 + p * 0))}, ${Math.round(roundToSignificantDigits(18 + p * 147))}, ${Math.round(roundToSignificantDigits(227 - p * 50))})`;
    } else if (percentage < 0.4) {
      // Cyan to green
      const p = (percentage - 0.2) * 5;
      return `rgb(${Math.round(roundToSignificantDigits(48 + p * 34))}, ${Math.round(roundToSignificantDigits(165 + p * 64))}, ${Math.round(roundToSignificantDigits(177 - p * 131))})`;
    } else if (percentage < 0.6) {
      // Green to yellow
      const p = (percentage - 0.4) * 5;
      return `rgb(${Math.round(roundToSignificantDigits(82 + p * 173))}, ${Math.round(roundToSignificantDigits(229 + p * 10))}, ${Math.round(roundToSignificantDigits(46 - p * 10))})`;
    } else if (percentage < 0.8) {
      // Yellow to orange
      const p = (percentage - 0.6) * 5;
      return `rgb(${Math.round(roundToSignificantDigits(255 - p * 45))}, ${Math.round(roundToSignificantDigits(239 - p * 143))}, ${Math.round(roundToSignificantDigits(36 - p * 5))})`;
    } else {
      // Orange to red
      const p = (percentage - 0.8) * 5;
      return `rgb(${Math.round(roundToSignificantDigits(210 - p * 80))}, ${Math.round(roundToSignificantDigits(96 - p * 77))}, ${Math.round(roundToSignificantDigits(31 + p * 25))})`;
    }
  }
};

// Return different colors based on the parameter value
const getColorBasedOnValue = (value, minValue = 0, maxValue = 100, colorScheme = 'cividis') => {
  const numericValue = parseFloat(value); // Safeguard if value is a string

  // Clamp the numericValue between minValue and maxValue
  const clampedValue = Math.min(Math.max(numericValue, minValue), maxValue);

  // Convert the value to a percentage (0-100)
  const percentage = (clampedValue - minValue) / (maxValue - minValue);

  // Apply color based on selected scheme
  if (scientificColorSchemes[colorScheme]) {
    return scientificColorSchemes[colorScheme](percentage);
  } else {
    // Fallback to cividis if selected scheme is not available
    return scientificColorSchemes.cividis(percentage);
  }
};

export default DropletBar;
