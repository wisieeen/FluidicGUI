import React, { useState, useEffect, useRef, useCallback } from 'react';

const ParameterAdjustment = ({ selectedDroplets, onParameterChange, onVisibilityChange, parameterRanges = {}, onRangeChange, selectedCarrierPumps = [] }) => {
  // Initialize visibility state for each parameter (all visible by default)
  const [visibilityState, setVisibilityState] = useState({});
  const inputRefs = useRef({});

  const handleWheel = useCallback((e) => {
    if (e.target.disabled) return;  // Skip if input is disabled
    e.preventDefault(); // Prevent page scrolling
    const input = e.target;
    const param = JSON.parse(input.dataset.param);
    
    const range = parameterRanges[param.name] || { min: 0, max: 100 };
    const rangeSize = range.max - range.min;
    const step = rangeSize * 0.05; // 5% of range
    const direction = e.deltaY > 0 ? -1 : 1; // Invert direction for more intuitive scrolling
    
    const currentValue = param.value !== undefined && param.value !== null ? param.value : param.default;
    let newValue = currentValue + (direction * step);
    
    // Clamp the value between min and max
    newValue = Math.min(Math.max(newValue, range.min), range.max);
    // Round to 2 decimal places to avoid floating point issues
    newValue = Math.round(newValue * 100) / 100;
    
    onParameterChange(param.nodeId, param.name, newValue);
  }, [parameterRanges, onParameterChange]);

  useEffect(() => {
    // Add non-passive wheel event listeners to all parameter inputs
    Object.values(inputRefs.current).forEach(input => {
      if (input && !input.disabled) {  // Only add listeners to non-disabled inputs
        input.addEventListener('wheel', handleWheel, { passive: false });
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      Object.values(inputRefs.current).forEach(input => {
        if (input) {
          input.removeEventListener('wheel', handleWheel);
        }
      });
    };
  }, [selectedDroplets, handleWheel]); // Add handleWheel to dependencies

  if (!selectedDroplets.length || !selectedDroplets[0]?.parameters) {
    return <div>No parameters to adjust</div>;
  }

  // Use the first droplet's parameters as a template for display
  const parametersToDisplay = selectedDroplets[0].parameters;

  const handleVisibilityChange = (nodeId, paramName, isVisible) => {
    const key = `${nodeId}-${paramName}`;
    setVisibilityState(prev => ({
      ...prev,
      [key]: isVisible
    }));
    onVisibilityChange?.(nodeId, paramName, isVisible);
  };

  const handleRangeChange = (paramName, type, value) => {
    onRangeChange?.(paramName, type, parseFloat(value));
  };

  return (
    <div>
      <h3>Adjust Parameters for Selected Droplets</h3>
      {parametersToDisplay.map((param) => {
        const visibilityKey = `${param.nodeId}-${param.name}`;
        const isCarrierPump = selectedCarrierPumps.includes(param.nodeId);
        return (
          <div key={visibilityKey} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={visibilityState[visibilityKey] !== false}
              onChange={(e) => handleVisibilityChange(param.nodeId, param.name, e.target.checked)}
            />
            <label style={{ minWidth: '150px' }}>{param.nodeName || 'N/A'}:   {param.name}:</label>
            <input
              type="number"
              ref={el => inputRefs.current[visibilityKey] = el}
              data-param={JSON.stringify(param)}
              value={param.value !== undefined && param.value !== null ? param.value : param.default}
              onChange={(e) => onParameterChange(param.nodeId, param.name, e.target.value)}
              disabled={isCarrierPump}
              style={{ 
                width: '80px', 
                cursor: isCarrierPump ? 'not-allowed' : 'ns-resize',
                backgroundColor: isCarrierPump ? '#f0f0f0' : '#112',
                color: isCarrierPump ? '#666' : '#afa',
                border: '1px solid #afa',
                padding: '4px',
                borderRadius: '4px'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              
              <label>Range:</label>
              <input
                type="number"
                value={parameterRanges[param.name]?.min ?? 0}
                onChange={(e) => handleRangeChange(param.name, 'min', e.target.value)}
                placeholder="Min"
                style={{ width: '40px' }}
              />
              <span>-</span>
              <input
                type="number"
                value={parameterRanges[param.name]?.max ?? 100}
                onChange={(e) => handleRangeChange(param.name, 'max', e.target.value)}
                placeholder="Max"
                style={{ width: '40px' }}
              />
              <span style={{ 
                color: '#666', 
                fontSize: '0.9em',
                marginLeft: '10px'
              }}>
                {parameterRanges[param.name]?.description || ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParameterAdjustment;
 