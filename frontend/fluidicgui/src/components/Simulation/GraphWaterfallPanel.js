import React, { useState, useEffect, useRef } from 'react';
import styles from './styles/GraphWaterfallPanelStyles';

const GraphWaterfallPanel = ({
  // Line profile related props
  lineProfileCanvasRef,
  lineProfileWidth = 400,
  lineProfileHeight = 200,
  profileData = null,
  integrationValue = 3,
  setIntegrationValue,
  hasBackgroundProfile = false,
  isBackgroundCorrectionEnabled = false,
  showRedLine = true,
  showGreenLine = true,
  showBlueLine = true,
  showIntensityLine = true,
  normalizeToMax = true,
  
  // Waterfall related props
  waterfallCanvasRef,
  waterfallWidth = 400,
  waterfallHeight = 200,
  isWaterfallEnabled = false,
  setIsWaterfallEnabled,
  waterfallUpdateMode = 'manual',
  setWaterfallUpdateMode,
  waterfallMaxHistory = 50,
  setWaterfallMaxHistory,
  waterfallUpdateInterval = 500,
  setWaterfallUpdateInterval,
  waterfallHistory = [],
  setWaterfallHistory,
  
  // Functions
  handleToggleRedLine,
  handleToggleGreenLine,
  handleToggleBlueLine,
  handleToggleIntensityLine,
  handleIntegrationChange,
  resetIntegration,
  extractLineProfile,
  forceRedrawLineProfile,
  exportIntensityData,
  logLineDetails,
  setAsBackground,
  toggleBackgroundCorrection,
  clearBackground,
  toggleYAxisStabilization,
  handleGraphResizeStart
}) => {
  // Local state for normalization status display
  const [showNormalizationInfo, setShowNormalizationInfo] = useState(false);
  
  // Reference for waterfall interval
  const waterfallIntervalRef = useRef(null);
  
  // Effect to show normalization status temporarily
  useEffect(() => {
    if (showNormalizationInfo) {
      const timer = setTimeout(() => {
        setShowNormalizationInfo(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showNormalizationInfo]);
  
  // Effect to clean up waterfall interval on unmount
  useEffect(() => {
    return () => {
      if (waterfallIntervalRef.current) {
        clearInterval(waterfallIntervalRef.current);
        waterfallIntervalRef.current = null;
      }
    };
  }, []);
  
  // Toggle normalization and show status message
  const toggleNormalization = () => {
    toggleYAxisStabilization();
    setShowNormalizationInfo(true);
  };
  
  // Toggle waterfall display
  const toggleWaterfall = () => {
    const newState = !isWaterfallEnabled;
    setIsWaterfallEnabled(newState);
    console.log(`Waterfall display ${newState ? 'enabled' : 'disabled'}`);
    
    // If enabling, make sure we have a clean history and start updates
    if (newState) {
      if (waterfallHistory.length === 0 && profileData) {
        // Initialize with current data
        setWaterfallHistory([profileData]);
      }
      
      // Start periodic updates if in periodic mode
      if (waterfallUpdateMode === 'auto') {
        startWaterfallPeriodicUpdates();
      }
    } else {
      // Stop periodic updates when disabling
      stopWaterfallPeriodicUpdates();
    }
  };
  
  // Functions to start/stop periodic waterfall updates
  const startWaterfallPeriodicUpdates = () => {
    // Clear any existing interval
    stopWaterfallPeriodicUpdates();
    
    // Only start if waterfall is enabled and we're in auto mode
    if (isWaterfallEnabled && waterfallUpdateMode === 'auto') {
      console.log(`Starting periodic waterfall updates every ${waterfallUpdateInterval}ms`);
      
      waterfallIntervalRef.current = setInterval(() => {
        if (profileData && profileData.length > 0) {
          // Add current data to history
          const newHistory = [...waterfallHistory, profileData];
          
          // Limit history length
          if (newHistory.length > waterfallMaxHistory) {
            newHistory.shift(); // Remove oldest entry
          }
          
          setWaterfallHistory(newHistory);
          
          // Draw waterfall
          drawWaterfallDisplay();
        }
      }, waterfallUpdateInterval);
    }
  };

  const stopWaterfallPeriodicUpdates = () => {
    if (waterfallIntervalRef.current) {
      console.log('Stopping periodic waterfall updates');
      clearInterval(waterfallIntervalRef.current);
      waterfallIntervalRef.current = null;
    }
  };

  // Function to change waterfall update settings
  const handleWaterfallModeChange = (mode, interval, maxHistory) => {
    // Stop any existing periodic updates
    stopWaterfallPeriodicUpdates();
    
    // Update mode if provided
    if (mode !== undefined && mode !== waterfallUpdateMode) {
      console.log(`Changing waterfall update mode from ${waterfallUpdateMode} to ${mode}`);
      setWaterfallUpdateMode(mode);
    }
    
    // Update interval if provided
    if (interval !== undefined && interval !== waterfallUpdateInterval) {
      console.log(`Changing waterfall update interval to ${interval}ms`);
      setWaterfallUpdateInterval(interval);
    }
    
    // Update max history if provided
    if (maxHistory !== undefined && maxHistory !== waterfallMaxHistory) {
      console.log(`Changing waterfall max history to ${maxHistory}`);
      setWaterfallMaxHistory(maxHistory);
    }
    
    // Start periodic updates if in auto mode and waterfall is enabled
    if ((mode === 'auto' || (mode === undefined && waterfallUpdateMode === 'auto')) && isWaterfallEnabled) {
      setTimeout(() => startWaterfallPeriodicUpdates(), 50);
    }
  };
  
  // Function to draw waterfall display
  const drawWaterfallDisplay = () => {
    if (!waterfallCanvasRef.current || waterfallHistory.length === 0) {
      console.warn('Cannot draw waterfall: canvas ref is null or no history');
      return;
    }
    
    const canvas = waterfallCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Calculate row height
    const rowHeight = Math.max(1, Math.floor(height / waterfallMaxHistory));
    
    // Draw each history row
    waterfallHistory.forEach((profileData, historyIndex) => {
      // Calculate y position (newest at bottom)
      const y = height - (historyIndex + 1) * rowHeight;
      
      // Skip if out of bounds
      if (y < 0) return;
      
      // Find max intensity for normalization
      const maxIntensity = Math.max(...profileData.map(p => p.intensity), 1);
      
      // Draw each point in the profile
      profileData.forEach(point => {
        // Calculate x position based on position (0-1)
        const x = Math.floor(point.position * width);
        
        // Skip if out of bounds
        if (x < 0 || x >= width) return;
        
        // Normalize intensity (0-1)
        const normalizedIntensity = point.intensity / maxIntensity;
        
        // Choose color based on selected channel or use heatmap
        let color;
        
        if (isBackgroundCorrectionEnabled) {
          // For background correction, use a special color scheme
          // Blue for < 1 (less than background), white for = 1 (same as background), red for > 1 (more than background)
          if (normalizedIntensity < 0.5) {
            // Blue gradient for values < 1
            const blueValue = Math.floor(255 * (normalizedIntensity * 2));
            color = `rgb(0, 0, ${blueValue})`;
          } else {
            // Red gradient for values > 1
            const redValue = Math.floor(255 * ((normalizedIntensity - 0.5) * 2));
            color = `rgb(${redValue}, 0, 0)`;
          }
        } else {
          // Use a heatmap color scheme (black -> blue -> cyan -> green -> yellow -> red -> white)
          if (normalizedIntensity < 0.2) {
            // Black to Blue
            const blueValue = Math.floor(255 * (normalizedIntensity / 0.2));
            color = `rgb(0, 0, ${blueValue})`;
          } else if (normalizedIntensity < 0.4) {
            // Blue to Cyan
            const greenValue = Math.floor(255 * ((normalizedIntensity - 0.2) / 0.2));
            color = `rgb(0, ${greenValue}, 255)`;
          } else if (normalizedIntensity < 0.6) {
            // Cyan to Green
            const blueValue = Math.floor(255 * (1 - (normalizedIntensity - 0.4) / 0.2));
            color = `rgb(0, 255, ${blueValue})`;
          } else if (normalizedIntensity < 0.8) {
            // Green to Yellow
            const redValue = Math.floor(255 * ((normalizedIntensity - 0.6) / 0.2));
            color = `rgb(${redValue}, 255, 0)`;
          } else {
            // Yellow to Red to White
            const greenValue = Math.floor(255 * (1 - (normalizedIntensity - 0.8) / 0.2));
            const blueValue = Math.floor(255 * ((normalizedIntensity - 0.8) / 0.2));
            color = `rgb(255, ${greenValue}, ${blueValue})`;
          }
        }
        
        // Draw pixel
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, rowHeight);
      });
    });
    
    // Draw time scale on the right
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    
    // Current time at bottom
    ctx.fillText('now', width - 5, height - 2);
    
    // Calculate time scale based on update interval
    const secondsPerRow = waterfallUpdateInterval / 1000;
    const totalSeconds = waterfallMaxHistory * secondsPerRow;
    
    // Draw time markers every few seconds
    const markerInterval = Math.max(1, Math.ceil(totalSeconds / 5));
    for (let i = markerInterval; i < totalSeconds; i += markerInterval) {
      const y = height - (i / secondsPerRow) * rowHeight;
      if (y > 10) {
        ctx.fillText(`-${i}s`, width - 5, y);
      }
    }
  };
  
  // Effect to handle waterfall updates when mode or interval changes
  useEffect(() => {
    if (isWaterfallEnabled && waterfallUpdateMode === 'auto') {
      startWaterfallPeriodicUpdates();
    } else {
      stopWaterfallPeriodicUpdates();
    }
    
    // Clean up when unmounting
    return () => {
      stopWaterfallPeriodicUpdates();
    };
  }, [isWaterfallEnabled, waterfallUpdateMode, waterfallUpdateInterval]);
  
  // Effect to update waterfall display when profile data changes
  useEffect(() => {
    if (isWaterfallEnabled && profileData && waterfallUpdateMode === 'manual') {
      // Add current data to history
      const newHistory = [...waterfallHistory, profileData];
      
      // Limit history length
      if (newHistory.length > waterfallMaxHistory) {
        newHistory.shift(); // Remove oldest entry
      }
      
      setWaterfallHistory(newHistory);
      
      // Draw waterfall
      setTimeout(() => {
        drawWaterfallDisplay();
      }, 20);
    }
  }, [profileData, isWaterfallEnabled, waterfallUpdateMode]);
  
  // Effect to draw waterfall when canvas size changes
  useEffect(() => {
    if (isWaterfallEnabled && waterfallHistory.length > 0) {
      drawWaterfallDisplay();
    }
  }, [waterfallWidth, waterfallHeight]);
  
  return (
    <div style={styles.container}>
      {/* Integration Controls */}
      <div style={styles.integrationControls}>
        <div style={styles.integrationLabel}>
          <span>Integration:</span>
          <input
            type="number"
            min="1"
            max="20"
            value={integrationValue}
            onChange={handleIntegrationChange}
            style={styles.integrationInput}
          />
          <span>px</span>
        </div>
        <button onClick={resetIntegration} style={styles.resetButton}>
          Reset
        </button>
      </div>
      
      {/* Graph Controls */}
      <div style={styles.graphControls}>
        {/* Background Profile Controls */}
        <div>
          <button 
            onClick={setAsBackground} 
            style={styles.backgroundButton}
            disabled={!profileData}
          >
            Set as Bg
          </button>
          
          <button 
            onClick={toggleBackgroundCorrection} 
            style={{
              ...styles.toggleButton,
              backgroundColor: isBackgroundCorrectionEnabled 
                ? 'rgba(0, 150, 100, 0.7)' 
                : 'rgba(100, 100, 100, 0.7)'
            }}
            disabled={!hasBackgroundProfile}
          >
            {isBackgroundCorrectionEnabled ? 'Bg On' : 'Bg Off'}
          </button>
          
          <button 
            onClick={clearBackground} 
            style={styles.clearBgButton}
            disabled={!hasBackgroundProfile}
          >
            Clear Bg
          </button>
        </div>
        
        {/* Y-Axis Stabilization Toggle */}
        <button 
          onClick={toggleYAxisStabilization} 
          style={{
            ...styles.toggleButton,
            backgroundColor: normalizeToMax 
              ? 'rgba(100, 100, 100, 0.7)' 
              : 'rgba(0, 150, 100, 0.7)'
          }}
        >
          {normalizeToMax ? 'Auto Y' : 'Fixed Y'}
        </button>
        
        {/* Waterfall Controls */}
        <button 
          onClick={toggleWaterfall} 
          style={{
            ...styles.toggleButton,
            backgroundColor: isWaterfallEnabled 
              ? 'rgba(0, 150, 100, 0.7)' 
              : 'rgba(100, 100, 100, 0.7)'
          }}
        >
          {isWaterfallEnabled ? 'Waterfall On' : 'Waterfall Off'}
        </button>
        
        {isWaterfallEnabled && (
          <div style={styles.waterfallModeSelector}>
            <div style={styles.waterfallModeLabel}>
              <span>Mode:</span>
              <select 
                value={waterfallUpdateMode}
                onChange={(e) => handleWaterfallModeChange(e.target.value)}
                style={styles.waterfallIntervalSelect}
              >
                <option value="manual">Manual</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            
            {waterfallUpdateMode === 'auto' && (
              <div style={styles.waterfallIntervalControl}>
                <span style={styles.waterfallIntervalLabel}>Interval:</span>
                <select 
                  value={waterfallUpdateInterval}
                  onChange={(e) => handleWaterfallModeChange(waterfallUpdateMode, parseInt(e.target.value))}
                  style={styles.waterfallIntervalSelect}
                >
                  <option value="100">0.1s</option>
                  <option value="250">0.25s</option>
                  <option value="500">0.5s</option>
                  <option value="1000">1s</option>
                  <option value="2000">2s</option>
                  <option value="5000">5s</option>
                </select>
              </div>
            )}
            
            <div style={styles.waterfallHistoryControl}>
              <span style={styles.waterfallHistoryLabel}>History:</span>
              <input 
                type="range" 
                min="10" 
                max="200" 
                value={waterfallMaxHistory}
                onChange={(e) => handleWaterfallModeChange(waterfallUpdateMode, waterfallUpdateInterval, parseInt(e.target.value))}
                style={styles.waterfallHistorySlider}
              />
              <span style={styles.waterfallHistoryValue}>{waterfallMaxHistory}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Line Profile Graph */}
      <div style={styles.lineProfileContainer}>
        <div style={styles.lineProfileHeader}>
          <div style={styles.lineProfileTitleArea}>
            <div style={styles.lineProfileTitle}>Line Profile</div>
            {profileData && (
              <div style={styles.integrationStatus}>
                Integration: {integrationValue}px 
                {hasBackgroundProfile && ` | Bg Correction: ${isBackgroundCorrectionEnabled ? 'On' : 'Off'}`}
              </div>
            )}
          </div>
          
          <div style={styles.lineProfileControls}>
            {/* Info button */}
            <button 
              onClick={logLineDetails} 
              title="Show line details"
              style={styles.infoButton}
            >
              i
            </button>
            
            {/* Export button */}
            <button 
              onClick={exportIntensityData}
              title="Export intensity data"
              style={styles.exportButton}
              disabled={!profileData}
            >
              ↓
            </button>
            
            {/* Normalize button */}
            <button 
              onClick={toggleNormalization}
              title="Toggle Y axis normalization"
              style={styles.normalizeButton}
            >
              Y
            </button>
          </div>
        </div>
        
        {/* Graph size info */}
        <div style={styles.graphSizeInfo}>
          {lineProfileWidth} × {lineProfileHeight}
        </div>
        
        {/* Normalization info */}
        {showNormalizationInfo && (
          <div style={styles.normalizationInfo}>
            Y-axis scaling: {normalizeToMax ? 'Auto (normalized)' : 'Fixed'}
          </div>
        )}
        
        {/* Line color toggles */}
        <div style={styles.lineProfileLegend}>
          {/* RGB toggles grouped horizontally */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={styles.legendItem}>
              <input 
                type="checkbox" 
                checked={showRedLine} 
                onChange={handleToggleRedLine} 
                id="toggleRed"
              />
              <label htmlFor="toggleRed">
                <div style={{
                  ...styles.legendColor,
                  backgroundColor: 'rgba(255, 50, 50, 0.8)'
                }}></div>
                Red
              </label>
            </div>
            
            <div style={styles.legendItem}>
              <input 
                type="checkbox" 
                checked={showGreenLine} 
                onChange={handleToggleGreenLine} 
                id="toggleGreen"
              />
              <label htmlFor="toggleGreen">
                <div style={{
                  ...styles.legendColor,
                  backgroundColor: 'rgba(50, 255, 50, 0.8)'
                }}></div>
                Green
              </label>
            </div>
            
            <div style={styles.legendItem}>
              <input 
                type="checkbox" 
                checked={showBlueLine} 
                onChange={handleToggleBlueLine} 
                id="toggleBlue"
              />
              <label htmlFor="toggleBlue">
                <div style={{
                  ...styles.legendColor,
                  backgroundColor: 'rgba(50, 50, 255, 0.8)'
                }}></div>
                Blue
              </label>
            </div>
          </div>
          
          {/* Intensity toggle separate */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
            <div style={styles.legendItem}>
              <input 
                type="checkbox" 
                checked={showIntensityLine} 
                onChange={handleToggleIntensityLine} 
                id="toggleIntensity"
              />
              <label htmlFor="toggleIntensity">
                <div style={{
                  ...styles.legendColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)'
                }}></div>
                Intensity
              </label>
            </div>
            
            <button 
              onClick={forceRedrawLineProfile}
              style={{
                backgroundColor: 'rgba(80, 80, 80, 0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '10px'
              }}
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Graph with resizable wrapper */}
        <div style={styles.graphWrapper}>
          <canvas
            ref={lineProfileCanvasRef}
            width={lineProfileWidth}
            height={lineProfileHeight}
            style={styles.lineProfileCanvas}
          ></canvas>
          
          {/* Resize handle */}
          <div 
            style={styles.graphResizeHandle}
            onMouseDown={handleGraphResizeStart}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1,9 L9,1 M5,9 L9,5" stroke="white" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Waterfall Display (conditional) */}
      {isWaterfallEnabled && (
        <div style={styles.waterfallContainer}>
          <div style={styles.waterfallHeader}>
            <div style={styles.waterfallTitle}>Waterfall Display</div>
            <div style={styles.waterfallInfo}>
              Mode: {waterfallUpdateMode === 'auto' ? `Auto (${waterfallUpdateInterval}ms)` : 'Manual'} | History: {waterfallMaxHistory}
            </div>
          </div>
          
          <canvas
            ref={waterfallCanvasRef}
            width={lineProfileWidth}
            height={200}
            style={styles.waterfallCanvas}
          ></canvas>
          
          <div style={styles.waterfallLegend}>
            <div style={styles.waterfallLegendGradient}></div>
            <div style={styles.waterfallLegendLabels}>
              <span>Min</span>
              <span>Max</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphWaterfallPanel; 