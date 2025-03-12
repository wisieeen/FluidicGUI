import React, { useState, useRef, useEffect } from 'react';
import { useButtonStyles } from '../../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../../styles/backgroundStyles';

// Available waterfall color schemes
const waterfallColorSchemeOptions = {
  thermal: 'Thermal (Black → Red → Yellow → White)',
  rainbow: 'Rainbow (ROYGBIV)',
  grayscale: 'Grayscale',
  viridis: 'Viridis (Perceptually uniform)',
  plasma: 'Plasma',
  inferno: 'Inferno',
  cividis: 'Cividis (Colorblind-friendly)',
  turbo: 'Turbo (Enhanced rainbow)'
};

// Waterfall color scheme preview component
const WaterfallColorPreview = ({ scheme, width = '100%' }) => {
  // Get a gradient preview based on the selected color scale
  const getGradientForScheme = (scale) => {
    if (scale === 'grayscale') {
      return 'linear-gradient(to right, #000000, #ffffff)';
    } else if (scale === 'thermal') {
      return 'linear-gradient(to right, #000000, #ff0000, #ffff00, #ffffff)';
    } else if (scale === 'rainbow') {
      return 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)';
    } else if (scale === 'viridis') {
      return 'linear-gradient(to right, rgb(68, 1, 84), rgb(59, 82, 139), rgb(33, 144, 141), rgb(126, 211, 33), rgb(253, 231, 37))';
    } else if (scale === 'plasma') {
      return 'linear-gradient(to right, rgb(13, 8, 135), rgb(156, 71, 155), rgb(240, 189, 60), rgb(252, 255, 164))';
    } else if (scale === 'inferno') {
      return 'linear-gradient(to right, rgb(0, 0, 4), rgb(120, 28, 99), rgb(220, 40, 39), rgb(252, 250, 67))';
    } else if (scale === 'cividis') {
      return 'linear-gradient(to right, rgb(0, 32, 77), rgb(97, 185, 144), rgb(255, 240, 30))';
    } else if (scale === 'turbo') {
      return 'linear-gradient(to right, rgb(48, 18, 227), rgb(48, 165, 177), rgb(82, 229, 46), rgb(255, 239, 36), rgb(210, 96, 31), rgb(130, 19, 56))';
    }
    return '';
  };
  
  return (
    <div 
      style={{
        background: getGradientForScheme(scheme),
        height: '15px',
        width: width,
        borderRadius: '3px',
        marginTop: '5px'
      }}
      title={`Preview of ${scheme} color scale`}
    ></div>
  );
};

const WaterfallComponent = ({ 
  onResize, 
  lineData, 
  frameAccumCount, 
  isAccumulating,
  colorScale: externalColorScale,
  onColorScaleChange
}) => {
  const buttonVariants = useButtonStyles();
  const [waterfallSize, setWaterfallSize] = useState({ width: '100%', height: 180 });
  const [isResizing, setIsResizing] = useState(false);
  const [showResizeInfo, setShowResizeInfo] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [maxHistoryLength, setMaxHistoryLength] = useState(100);  // Store last 100 frames by default
  const [activeChannel, setActiveChannel] = useState('intensity'); // Options: 'red', 'green', 'blue', 'intensity'
  const [internalColorScale, setInternalColorScale] = useState('thermal'); // Options: 'thermal', 'rainbow', 'grayscale'
  
  // Use external color scale if provided, otherwise use internal state
  const colorScale = externalColorScale !== undefined ? externalColorScale : internalColorScale;
  
  // Accumulation state
  const [accumulatedFrames, setAccumulatedFrames] = useState([]);
  
  // New state for showing color selector
  const [showColorSelector, setShowColorSelector] = useState(false);
  
  const waterfallContainerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Add new line data to history, supporting frame accumulation
  useEffect(() => {
    if (lineData?.pixelData) {
      if (isAccumulating) {
        // Add new frame to accumulation buffer
        setAccumulatedFrames(prev => {
          const newFrames = [...prev, lineData.pixelData];
          
          // If we've reached our target frame count, process the accumulated data
          if (newFrames.length >= frameAccumCount) {
            // Sum the color data across all frames
            const summedData = sumFrameData(newFrames);
            
            // Add summed data to history
            setHistoryData(prev => {
              const newHistory = [...prev, summedData];
              // Trim history if it exceeds maximum length
              if (newHistory.length > maxHistoryLength) {
                return newHistory.slice(newHistory.length - maxHistoryLength);
              }
              return newHistory;
            });
            
            // Reset the accumulation buffer
            return [];
          }
          
          return newFrames;
        });
      } else {
        // When not accumulating, add each frame directly to history
        setHistoryData(prev => {
          const newHistory = [...prev, lineData.pixelData];
          // Trim history if it exceeds maximum length
          if (newHistory.length > maxHistoryLength) {
            return newHistory.slice(newHistory.length - maxHistoryLength);
          }
          return newHistory;
        });
      }
    }
  }, [lineData, maxHistoryLength, isAccumulating, frameAccumCount]);
  
  // Sum pixel data across multiple frames (similar to GraphComponent)
  const sumFrameData = (frames) => {
    if (!frames.length) return null;
    
    // Use the first frame as a template for structure
    const template = frames[0];
    
    // Initialize arrays for summed values
    const summedRed = Array(template.red.length).fill(0);
    const summedGreen = Array(template.green.length).fill(0);
    const summedBlue = Array(template.blue.length).fill(0);
    const summedIntensity = Array(template.intensity.length).fill(0);
    
    // Sum values across all frames
    frames.forEach(frame => {
      frame.red.forEach((val, i) => summedRed[i] += val);
      frame.green.forEach((val, i) => summedGreen[i] += val);
      frame.blue.forEach((val, i) => summedBlue[i] += val);
      frame.intensity.forEach((val, i) => summedIntensity[i] += val);
    });
    
    // Return the summed data structure
    return {
      timestamp: Date.now(),
      positions: template.positions, // Positions remain the same
      red: summedRed,
      green: summedGreen,
      blue: summedBlue,
      intensity: summedIntensity,
      lineLength: template.lineLength,
      frameCount: frames.length // Add count of frames that were summed
    };
  };
  
  // Initialize and resize the canvas when waterfall size changes
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const container = waterfallContainerRef.current;
      
      if (container) {
        // Set canvas size to match container
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Redraw waterfall with new size
        if (historyData.length > 0) {
          drawWaterfall();
        }
      }
    }
  }, [waterfallSize, historyData.length]);
  
  // Draw the waterfall when history or active channel changes
  useEffect(() => {
    if (historyData.length > 0) {
      drawWaterfall();
    }
  }, [historyData, activeChannel, colorScale]);
  
  // Draw the waterfall visualization
  const drawWaterfall = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // If no data, show a message
    if (historyData.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data available for waterfall view', width / 2, height / 2);
      return;
    }
    
    // Calculate the height of each row in the waterfall
    const rowHeight = height / Math.min(historyData.length, maxHistoryLength);
    
    // Find the min and max for this channel across all history for consistent color scaling
    let minVal = Number.MAX_VALUE;
    let maxVal = Number.MIN_VALUE;
    
    historyData.forEach(data => {
      if (data[activeChannel]) {
        const channelData = data[activeChannel];
        const localMin = Math.min(...channelData);
        const localMax = Math.max(...channelData);
        minVal = Math.min(minVal, localMin);
        maxVal = Math.max(maxVal, localMax);
      }
    });
    
    // Ensure we don't have a zero range
    if (maxVal === minVal) maxVal = minVal + 1;
    
    // Draw each row of the waterfall (most recent at the top)
    historyData.forEach((frameData, frameIndex) => {
      // Skip if data doesn't have the selected channel
      if (!frameData[activeChannel]) return;
      
      const values = frameData[activeChannel];
      const positions = frameData.positions;
      
      // Calculate Y position for this row (newest data at top)
      const y = frameIndex * rowHeight;
      
      // Create a row image by coloring each pixel based on its value
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const normalizedValue = (value - minVal) / (maxVal - minVal); // 0 to 1
        const x = Math.floor(positions[i] * width);
        
        // Get color for this value based on selected color scale
        const color = getColorForValue(normalizedValue, colorScale);
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, rowHeight);
      }
    });
    
    // Draw time scale on the right
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(width - 60, 0, 60, height);
    
    // Only draw time labels if we have multiple frames
    if (historyData.length > 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      
      // Draw "Now" at the top
      ctx.fillText('Now', width - 5, 12);
      
      // Draw a few time markers
      const timePoints = [0.25, 0.5, 0.75, 1.0];
      timePoints.forEach(point => {
        const y = height * point;
        // Calculate time difference based on frame positions
        const frameIndex = Math.floor((historyData.length - 1) * point);
        if (frameIndex < historyData.length && historyData[frameIndex]) {
          const timeDiff = (Date.now() - historyData[frameIndex].timestamp) / 1000; // in seconds
          ctx.fillText(`-${timeDiff.toFixed(1)}s`, width - 5, y);
        }
      });
    }
    
    // Draw legend
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Channel: ${activeChannel}`, 5, 12);
    
    // Show scale with 2 decimal places for intensity, integers for other channels
    if (activeChannel === 'intensity') {
      ctx.fillText(`Scale: ${minVal.toFixed(2)}-${maxVal.toFixed(2)}`, 5, 27);
    } else {
      ctx.fillText(`Scale: ${minVal.toFixed(0)}-${maxVal.toFixed(0)}`, 5, 27);
    }
    
    // Show accumulation status
    if (isAccumulating) {
      const statusText = `Accum: ${accumulatedFrames.length}/${frameAccumCount}`;
      ctx.fillText(statusText, 5, 42);
    }
  };
  
  // Get a color for a normalized value (0-1) based on selected color scale
  const getColorForValue = (value, scale) => {
    // Ensure value is between 0 and 1
    value = Math.max(0, Math.min(1, value));
    
    if (scale === 'grayscale') {
      const intensity = Math.floor(value * 255);
      return `rgb(${intensity}, ${intensity}, ${intensity})`;
    } else if (scale === 'thermal') {
      // Thermal scale: black->red->yellow->white
      let r, g, b;
      if (value < 0.33) {
        // Black to red
        r = Math.floor((value / 0.33) * 255);
        g = 0;
        b = 0;
      } else if (value < 0.66) {
        // Red to yellow
        r = 255;
        g = Math.floor(((value - 0.33) / 0.33) * 255);
        b = 0;
      } else {
        // Yellow to white
        r = 255;
        g = 255;
        b = Math.floor(((value - 0.66) / 0.34) * 255);
      }
      return `rgb(${r}, ${g}, ${b})`;
    } else if (scale === 'rainbow') {
      // Rainbow scale (ROYGBIV)
      let r, g, b;
      if (value < 0.2) {
        // Red to orange
        r = 255;
        g = Math.floor((value / 0.2) * 127);
        b = 0;
      } else if (value < 0.4) {
        // Orange to yellow
        r = 255;
        g = 127 + Math.floor(((value - 0.2) / 0.2) * 128);
        b = 0;
      } else if (value < 0.6) {
        // Yellow to green
        r = 255 - Math.floor(((value - 0.4) / 0.2) * 255);
        g = 255;
        b = 0;
      } else if (value < 0.8) {
        // Green to blue
        r = 0;
        g = 255 - Math.floor(((value - 0.6) / 0.2) * 255);
        b = Math.floor(((value - 0.6) / 0.2) * 255);
      } else {
        // Blue to violet
        r = Math.floor(((value - 0.8) / 0.2) * 128);
        g = 0;
        b = 255;
      }
      return `rgb(${r}, ${g}, ${b})`;
    } else if (scale === 'viridis') {
      // Viridis scale implementation
      if (value < 0.25) {
        // Dark purple to blue
        const p = value * 4;
        return `rgb(${Math.round(68 - p * 9)}, ${Math.round(1 + p * 81)}, ${Math.round(84 + p * 55)})`;
      } else if (value < 0.5) {
        // Blue to teal
        const p = (value - 0.25) * 4;
        return `rgb(${Math.round(59 - p * 26)}, ${Math.round(82 + p * 62)}, ${Math.round(139 + p * 2)})`;
      } else if (value < 0.75) {
        // Teal to green
        const p = (value - 0.5) * 4;
        return `rgb(${Math.round(33 + p * 93)}, ${Math.round(144 + p * 67)}, ${Math.round(141 - p * 108)})`;
      } else {
        // Green to yellow
        const p = (value - 0.75) * 4;
        return `rgb(${Math.round(126 + p * 127)}, ${Math.round(211 + p * 20)}, ${Math.round(33 + p * 4)})`;
      }
    } else if (scale === 'plasma') {
      // Plasma scale implementation
      if (value < 0.33) {
        // Deep blue to purple
        const p = value * 3;
        return `rgb(${Math.round(13 + p * 143)}, ${Math.round(8 + p * 63)}, ${Math.round(135 + p * 20)})`;
      } else if (value < 0.66) {
        // Purple to orange
        const p = (value - 0.33) * 3;
        return `rgb(${Math.round(156 + p * 84)}, ${Math.round(71 + p * 118)}, ${Math.round(155 - p * 95)})`;
      } else {
        // Orange to light yellow
        const p = (value - 0.66) * 3;
        return `rgb(${Math.round(240 + p * 12)}, ${Math.round(189 + p * 66)}, ${Math.round(60 + p * 104)})`;
      }
    } else if (scale === 'inferno') {
      // Inferno scale implementation
      if (value < 0.33) {
        // Black to purple
        const p = value * 3;
        return `rgb(${Math.round(0 + p * 120)}, ${Math.round(0 + p * 28)}, ${Math.round(4 + p * 95)})`;
      } else if (value < 0.66) {
        // Purple to red
        const p = (value - 0.33) * 3;
        return `rgb(${Math.round(120 + p * 100)}, ${Math.round(28 + p * 12)}, ${Math.round(99 - p * 60)})`;
      } else {
        // Red to yellow
        const p = (value - 0.66) * 3;
        return `rgb(${Math.round(220 + p * 32)}, ${Math.round(40 + p * 210)}, ${Math.round(39 + p * 28)})`;
      }
    } else if (scale === 'cividis') {
      // Cividis scale implementation
      if (value < 0.5) {
        // Dark blue to teal
        const p = value * 2;
        return `rgb(${Math.round(0 + p * 97)}, ${Math.round(32 + p * 153)}, ${Math.round(77 + p * 67)})`;
      } else {
        // Teal to yellow
        const p = (value - 0.5) * 2;
        return `rgb(${Math.round(97 + p * 158)}, ${Math.round(185 + p * 55)}, ${Math.round(144 - p * 114)})`;
      }
    } else if (scale === 'turbo') {
      // Turbo scale implementation
      if (value < 0.2) {
        // Blue to cyan
        const p = value * 5;
        return `rgb(${Math.round(48)}, ${Math.round(18 + p * 147)}, ${Math.round(227 - p * 50)})`;
      } else if (value < 0.4) {
        // Cyan to green
        const p = (value - 0.2) * 5;
        return `rgb(${Math.round(48 + p * 34)}, ${Math.round(165 + p * 64)}, ${Math.round(177 - p * 131)})`;
      } else if (value < 0.6) {
        // Green to yellow
        const p = (value - 0.4) * 5;
        return `rgb(${Math.round(82 + p * 173)}, ${Math.round(229 + p * 10)}, ${Math.round(46 - p * 10)})`;
      } else if (value < 0.8) {
        // Yellow to orange
        const p = (value - 0.6) * 5;
        return `rgb(${Math.round(255 - p * 45)}, ${Math.round(239 - p * 143)}, ${Math.round(36 - p * 5)})`;
      } else {
        // Orange to red
        const p = (value - 0.8) * 5;
        return `rgb(${Math.round(210 - p * 80)}, ${Math.round(96 - p * 77)}, ${Math.round(31 + p * 25)})`;
      }
    }
    
    // Default to grayscale if unknown scale
    const intensity = Math.floor(value * 255);
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  };
  
  // Toggle between color channels
  const toggleChannel = () => {
    const channels = ['intensity', 'red', 'green', 'blue'];
    const currentIndex = channels.indexOf(activeChannel);
    const nextIndex = (currentIndex + 1) % channels.length;
    setActiveChannel(channels[nextIndex]);
  };
  
  // Handle color scale change from dropdown
  const handleColorScaleChange = (e) => {
    const newColorScale = e.target.value;
    
    // Update internal state
    setInternalColorScale(newColorScale);
    
    // Notify parent if callback exists
    if (onColorScaleChange) {
      onColorScaleChange(newColorScale);
    }
    
    // Hide selector after selection
    setShowColorSelector(false);
  };
  
  // Clear history data
  const clearHistory = () => {
    setHistoryData([]);
    setAccumulatedFrames([]);
  };
  
  // Similar resize functionality as before
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get initial coordinates and size
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = waterfallContainerRef.current?.clientWidth || 400;
    const startHeight = waterfallContainerRef.current?.clientHeight || waterfallSize.height;
    
    // Show resize feedback
    setIsResizing(true);
    setShowResizeInfo(true);
    
    // Define move handler
    function handleMouseMove(moveEvent) {
      const deltaY = moveEvent.clientY - startY;
      
      // Only adjust height, keep width as 100%
      const newHeight = Math.max(100, startHeight + deltaY);
      
      // Update waterfall size
      const newSize = {
        width: '100%',  // Keep width as 100% for responsive behavior
        height: Math.round(newHeight)
      };
      
      setWaterfallSize(newSize);
      
      // Notify parent if needed
      if (onResize) {
        onResize(newSize);
      }
      
      // Prevent default to avoid text selection during resize
      moveEvent.preventDefault();
    }
    
    // Define up handler
    function handleMouseUp() {
      // Clean up
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      setIsResizing(false);
      setTimeout(() => setShowResizeInfo(false), 800);
    }
    
    // Attach handlers to document to capture events outside component
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const styles = {
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '10px',
      borderRadius: '4px',
      position: 'relative',
      border: isResizing ? '1px dashed #4CAF50' : 'none',
    },
    title: {
      margin: '0 0 10px 0',
      fontSize: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    waterfallView: {
      width: waterfallSize.width,
      height: `${waterfallSize.height}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      position: 'relative',
      overflow: 'hidden'
    },
    canvas: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    },
    resizeHandle: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: '20px',
      height: '20px',
      cursor: 'ns-resize', // Only allow vertical resizing
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(60, 60, 60, 0.8)',
      borderTop: '1px solid rgba(180, 180, 180, 0.7)',
      borderLeft: '1px solid rgba(180, 180, 180, 0.7)',
      borderTopLeftRadius: '4px',
    },
    resizeInfo: {
      position: 'absolute',
      right: '25px',
      bottom: '25px',
      padding: '2px 6px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      borderRadius: '3px',
      fontSize: '11px',
      zIndex: 100
    },
    controls: {
      display: 'flex',
      gap: '5px'
    },
    noData: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '12px'
    },
    // Color scheme selector styles
    colorSchemeContainer: {
      position: 'absolute',
      top: '40px',
      right: '10px',
      zIndex: 50,
      backgroundColor: 'rgba(40, 40, 40, 0.9)',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
      display: showColorSelector ? 'block' : 'none'
    },
    colorSchemeSelector: {
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'column',
      gap: '5px'
    },
    select: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: '1px solid #555',
      backgroundColor: '#333',
      color: 'white',
      width: '100%'
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.title}>
        <h3 style={{ margin: 0 }}>Waterfall Display</h3>
        <div style={styles.controls}>
          <button 
            style={buttonVariants.smallIconButton}
            onClick={toggleChannel}
            title={`Current channel: ${activeChannel}`}
          >
            {activeChannel === 'red' ? '🔴' : 
             activeChannel === 'green' ? '🟢' : 
             activeChannel === 'blue' ? '🔵' : '⚪'}
          </button>
          <button 
            style={buttonVariants.smallIconButton}
            onClick={() => setShowColorSelector(!showColorSelector)}
            title={`Color scale: ${colorScale} (click to change)`}
          >
            🎨
          </button>
          <button 
            style={buttonVariants.smallIconButton}
            onClick={clearHistory}
            title="Clear history"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* Color scheme selector dropdown */}
      <div style={styles.colorSchemeContainer}>
        <div style={styles.colorSchemeSelector}>
          <label htmlFor="waterfallColorScheme">Color Scale:</label>
          <select 
            id="waterfallColorScheme" 
            value={colorScale} 
            onChange={handleColorScaleChange}
            style={styles.select}
          >
            {Object.entries(waterfallColorSchemeOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <WaterfallColorPreview scheme={colorScale} width="100%" />
        </div>
      </div>
      
      <div 
        ref={waterfallContainerRef}
        style={styles.waterfallView}
      >
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />
        
        {historyData.length === 0 && (
          <div style={styles.noData}>
            Draw a line on the camera feed to see waterfall data
          </div>
        )}
        
        {/* Resize info overlay */}
        {showResizeInfo && (
          <div style={styles.resizeInfo}>
            Height: {waterfallSize.height}px
          </div>
        )}
        
        {/* Resize handle */}
        <div 
          style={styles.resizeHandle}
          onMouseDown={handleResizeStart}
          title="Resize waterfall height"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path 
              d="M2,6 L10,6 M2,9 L10,9" 
              stroke="white" 
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WaterfallComponent; 