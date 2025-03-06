import React from 'react';

/**
 * SvgDefs component for defining reusable SVG elements
 * This component creates SVG definitions that can be referenced throughout the application
 */
const SvgDefs = () => {
  return (
    <defs>
      {/* Arrow marker definition for flow direction */}
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#fff" />
      </marker>
      
      {/* Droplet gradient */}
      <linearGradient id="dropletGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#2d78c9" stopOpacity="0.9" />
      </linearGradient>
      
      {/* Fluid path gradient */}
      <linearGradient id="fluidPathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#333" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#555" stopOpacity="0.6" />
      </linearGradient>
    </defs>
  );
};

export default SvgDefs; 