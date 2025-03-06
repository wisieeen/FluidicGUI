import React, { createContext, useState, useContext } from 'react';

// Define available color schemes for buttons
export const buttonColorSchemeOptions = {
  viridis: 'Viridis',
  plasma: 'Plasma',
  inferno: 'Inferno',
  cividis: 'Cividis (Colorblind-friendly)',
  turbo: 'Turbo'
};

// Create the context for button color schemes
const ButtonColorSchemeContext = createContext();

// Create a provider component
export const ButtonColorSchemeProvider = ({ children }) => {
  const [buttonColorScheme, setButtonColorScheme] = useState('plasma'); // Plasma as default

  const updateButtonColorScheme = (newScheme) => {
    if (buttonColorSchemeOptions[newScheme]) {
      setButtonColorScheme(newScheme);
    }
  };

  return (
    <ButtonColorSchemeContext.Provider value={{ buttonColorScheme, updateButtonColorScheme }}>
      {children}
    </ButtonColorSchemeContext.Provider>
  );
};

// Custom hook to use the button color scheme context
export const useButtonColorScheme = () => {
  const context = useContext(ButtonColorSchemeContext);
  if (!context) {
    throw new Error('useButtonColorScheme must be used within a ButtonColorSchemeProvider');
  }
  return context;
};

// Gradient preview component for color schemes
export const ColorSchemePreview = ({ scheme, width = '100%' }) => {
  // Preview gradients for each color scheme
  const getPreviewStyle = (selectedScheme) => {
    let gradient;
    
    switch(selectedScheme) {
      case 'viridis':
        gradient = 'linear-gradient(to right, rgb(68, 1, 84), rgb(59, 82, 139), rgb(33, 144, 141), rgb(126, 211, 33), rgb(253, 231, 37))';
        break;
      case 'plasma':
        gradient = 'linear-gradient(to right, rgb(13, 8, 135), rgb(156, 71, 155), rgb(240, 189, 60), rgb(252, 255, 164))';
        break;
      case 'inferno':
        gradient = 'linear-gradient(to right, rgb(0, 0, 4), rgb(120, 28, 99), rgb(220, 40, 39), rgb(252, 250, 67))';
        break;
      case 'cividis':
        gradient = 'linear-gradient(to right, rgb(0, 32, 77), rgb(97, 185, 144), rgb(255, 240, 30))';
        break;
      case 'turbo':
        gradient = 'linear-gradient(to right, rgb(48, 18, 227), rgb(48, 165, 177), rgb(82, 229, 46), rgb(255, 239, 36), rgb(210, 96, 31), rgb(130, 19, 56))';
        break;
      default:
        // Default to cividis
        gradient = 'linear-gradient(to right, rgb(0, 32, 77), rgb(97, 185, 144), rgb(255, 240, 30))';
    }
    
    return {
      background: gradient,
      height: '15px',
      width: width,
      borderRadius: '3px',
      marginTop: '5px'
    };
  };
  
  return (
    <div style={getPreviewStyle(scheme)}></div>
  );
};

export default ButtonColorSchemeContext; 