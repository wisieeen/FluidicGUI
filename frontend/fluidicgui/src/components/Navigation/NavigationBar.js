import React, { useState, useRef, useEffect } from 'react';
import { useButtonColorScheme, buttonColorSchemeOptions, ColorSchemePreview } from '../../context/ColorSchemeContext';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';

const NavigationBar = ({ currentStep, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const colorMenuRef = useRef(null);
  const { buttonColorScheme, updateButtonColorScheme } = useButtonColorScheme();
  
  // Get dynamic button styles
  const buttonVariants = useButtonStyles();

  const styles = {
    navbar: {
      display: 'flex',
      backgroundColor: '#333',
      padding: '10px',
      gap: '10px',
      borderBottom: '2px solid #555',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    },
    plusButton: {
      ...buttonVariants.secondaryButton,
      width: '40px',
      fontSize: '16px',
      fontWeight: 'bold',
      position: 'relative'
    },
    colorButton: {
      ...buttonVariants.secondaryButton,
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative'
    },
    contextMenu: {
      position: 'absolute',
      top: '100%',
      left: '0',
      backgroundColor: '#444',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      width: '250px',
      zIndex: 1001,
      display: menuOpen ? 'block' : 'none'
    },
    colorMenu: {
      position: 'absolute',
      top: '100%',
      right: '0',
      backgroundColor: '#444',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      width: '250px',
      zIndex: 1001,
      display: colorMenuOpen ? 'block' : 'none',
      padding: '10px'
    },
    menuItem: {
      padding: '10px 15px',
      cursor: 'pointer',
      borderBottom: '1px solid #555',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#555'
      },
      '&:last-child': {
        borderBottom: 'none'
      }
    },
    colorMenuItem: {
      padding: '10px 8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      borderBottom: '1px solid #555',
      '&:last-child': {
        borderBottom: 'none'
      }
    },
    previewContainer: {
      flex: 1
    },
    colorIcon: {
      width: '20px',
      height: '20px',
      borderRadius: '3px',
      display: 'inline-block'
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target)) {
        setColorMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const buttons = [
    { step: 1, label: 'Flowchart Editor' },
    { step: 3, label: 'Droplet Creator' },
    { step: 7, label: 'Simulation' }
  ];

  const handleMenuItemClick = (menuStep) => {
    onNavigate(menuStep);
    setMenuOpen(false);
  };

  const handleColorSchemeChange = (scheme) => {
    updateButtonColorScheme(scheme);
    setColorMenuOpen(false);
  };

  // Helper to get background color for color icon based on scheme
  const getColorIconStyle = (scheme) => {
    switch(scheme) {
      case 'viridis': return { backgroundColor: 'rgb(33, 144, 141)' };
      case 'plasma': return { backgroundColor: 'rgb(156, 71, 155)' };
      case 'inferno': return { backgroundColor: 'rgb(220, 40, 39)' };
      case 'cividis': return { backgroundColor: 'rgb(97, 185, 144)' };
      case 'turbo': return { backgroundColor: 'rgb(82, 229, 46)' };
      default: return { backgroundColor: 'rgb(97, 185, 144)' };
    }
  };

  return (
    <div style={styles.navbar}>
      {/* First button */}
      <button
        key={buttons[0].step}
        onClick={() => onNavigate(buttons[0].step)}
        style={{
          ...buttonVariants.secondaryButton,
          ...(currentStep === buttons[0].step ? {
            backgroundColor: '#555',
            border: '1px solid #8c8',
            boxShadow: '0 0 5px #8c8'
          } : {})
        }}
        disabled={currentStep === buttons[0].step}
      >
        {buttons[0].label}
      </button>

      {/* Plus button with dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button 
          style={styles.plusButton}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          +
        </button>
        <div style={styles.contextMenu}>
          <div 
            style={styles.menuItem} 
            onClick={() => handleMenuItemClick(4)} // Using step 4 for Response Surface Methodology
          >
            Response surface methodology
          </div>
          <div 
            style={styles.menuItem} 
            onClick={() => handleMenuItemClick(8)} // Using step 8 for Interpolation Generator
          >
            Parameter Interpolation
          </div>
        </div>
      </div>

      {/* Remaining buttons */}
      {buttons.slice(1).map(({ step, label }) => (
        <button
          key={step}
          onClick={() => onNavigate(step)}
          style={{
            ...buttonVariants.secondaryButton,
            ...(currentStep === step ? {
              backgroundColor: '#555',
              border: '1px solid #8c8',
              boxShadow: '0 0 5px #8c8'
            } : {})
          }}
          disabled={currentStep === step}
        >
          {label}
        </button>
      ))}

      {/* Color scheme button with dropdown */}
      <div ref={colorMenuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
        <button 
          style={styles.colorButton}
          onClick={() => setColorMenuOpen(!colorMenuOpen)}
        >
          <span>Button Colors</span>
          <div style={{...styles.colorIcon, ...getColorIconStyle(buttonColorScheme)}}></div>
        </button>
        <div style={styles.colorMenu}>
          <div style={{ fontSize: '14px', marginBottom: '10px', fontWeight: 'bold' }}>
            Select Button Color Scheme
          </div>
          
          {Object.entries(buttonColorSchemeOptions).map(([key, label]) => (
            <div 
              key={key}
              style={{
                ...styles.colorMenuItem,
                backgroundColor: key === buttonColorScheme ? '#555' : 'transparent'
              }}
              onClick={() => handleColorSchemeChange(key)}
            >
              <div style={styles.previewContainer}>
                <div>{label}</div>
                <ColorSchemePreview scheme={key} width="100%" />
              </div>
              {key === buttonColorScheme && (
                <span>✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar; 