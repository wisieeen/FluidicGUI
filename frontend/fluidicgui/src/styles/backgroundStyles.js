// Common background styles for the entire application
export const backgroundStyles = {
  // Base dark background
  base: {
    backgroundColor: '#111118',
    color: '#88bb88'
  },

  // Panel backgrounds (sidebars, menus)
  panel: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    backdropFilter: 'blur(5px)',
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)'
  },

  // Input backgrounds
  input: {
    backgroundColor: '#0f0d1f',
    color: '#88bb88',
    border: '1px solid #88bb88'
  },

  // Menu backgrounds (context menus, dropdowns)
  menu: {
    backgroundColor: '#333344',
    border: '1px solid #555',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  },

  // Node backgrounds
  node: {
    backgroundColor: '#444444',
    border: '2px solid #777'
  },

  // Edge backgrounds
  edge: {
    backgroundColor: 'rgba(25, 25, 25, 0.5)',
    border: '1px solid #999'
  },

  // Property window backgrounds
  propertyWindow: {
    backgroundColor: 'rgba(44, 55, 55, 0.9)',
    border: '1px solid #ccc'
  },

  // Overlay backgrounds
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
  }
};

// Helper function to combine background styles
export const combineBackgroundStyles = (...styles) => {
  return styles.reduce((acc, style) => ({
    ...acc,
    ...style
  }), {});
};

// Common background style combinations
export const backgroundVariants = {
  mainBackground: combineBackgroundStyles(backgroundStyles.base),
  panelBackground: combineBackgroundStyles(backgroundStyles.base, backgroundStyles.panel),
  menuBackground: combineBackgroundStyles(backgroundStyles.base, backgroundStyles.menu),
  nodeBackground: combineBackgroundStyles(backgroundStyles.base, backgroundStyles.node),
  propertyBackground: combineBackgroundStyles(backgroundStyles.base, backgroundStyles.propertyWindow),
  inputBackground: combineBackgroundStyles(backgroundStyles.base, backgroundStyles.input)
}; 