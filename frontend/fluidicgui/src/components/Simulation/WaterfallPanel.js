import React, { useRef } from 'react';

const WaterfallPanel = ({
  isLineDrawn = false,
  isCameraActive = false,
  showWaterfall = false,
  waterfallUpdateMode = 'integration',
  waterfallUpdateInterval = 1000,
  waterfallMaxHistory = 50,
  onToggleWaterfall,
  onUpdateModeChange,
  onUpdateIntervalChange,
  onMaxHistoryChange
}) => {
  const waterfallCanvasRef = useRef(null);
  
  if (!isLineDrawn || !isCameraActive) {
    return null;
  }
  
  return (
    <div className="waterfall-panel">
      <div style={styles.graphControls}>
        <button
          onClick={onToggleWaterfall}
          style={{
            ...styles.toggleButton,
            backgroundColor: showWaterfall ? 'rgba(100, 100, 180, 0.7)' : 'rgba(80, 80, 80, 0.7)'
          }}
          title={showWaterfall ? "Hide Waterfall Display" : "Show Waterfall Display"}
        >
          {showWaterfall ? "Hide Waterfall" : "Show Waterfall"}
        </button>
        
        {showWaterfall && (
          <>
            <div style={styles.waterfallModeSelector}>
              <label style={styles.waterfallModeLabel}>
                <input
                  type="radio"
                  name="waterfallMode"
                  value="integration"
                  checked={waterfallUpdateMode === 'integration'}
                  onChange={() => onUpdateModeChange('integration')}
                />
                Integration-based
              </label>
              <label style={styles.waterfallModeLabel}>
                <input
                  type="radio"
                  name="waterfallMode"
                  value="periodic"
                  checked={waterfallUpdateMode === 'periodic'}
                  onChange={() => onUpdateModeChange('periodic')}
                />
                Time-based
              </label>
            </div>
            
            {waterfallUpdateMode === 'periodic' && (
              <div style={styles.waterfallIntervalControl}>
                <label style={styles.waterfallIntervalLabel}>
                  Interval:
                  <select
                    value={waterfallUpdateInterval}
                    onChange={(e) => onUpdateIntervalChange(Number(e.target.value))}
                    style={styles.waterfallIntervalSelect}
                  >
                    <option value="200">0.2s</option>
                    <option value="500">0.5s</option>
                    <option value="1000">1s</option>
                    <option value="2000">2s</option>
                    <option value="5000">5s</option>
                  </select>
                </label>
              </div>
            )}
            
            <div style={styles.waterfallHistoryControl}>
              <label style={styles.waterfallHistoryLabel}>
                History:
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={waterfallMaxHistory}
                  onChange={(e) => onMaxHistoryChange(Number(e.target.value))}
                  style={styles.waterfallHistorySlider}
                  title="Waterfall History Length"
                />
                <span style={styles.waterfallHistoryValue}>{waterfallMaxHistory}</span>
              </label>
            </div>
          </>
        )}
      </div>
      
      {/* Waterfall display */}
      {showWaterfall && (
        <div style={styles.waterfallContainer}>
          <canvas
            ref={waterfallCanvasRef}
            width={400}
            height={200}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              backgroundColor: '#111',
              borderRadius: '4px'
            }}
          />
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  graphControls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  toggleButton: {
    border: 'none',
    borderRadius: '3px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'white'
  },
  waterfallModeSelector: {
    display: 'flex',
    gap: '10px'
  },
  waterfallModeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: 'white',
    cursor: 'pointer'
  },
  waterfallIntervalControl: {
    display: 'flex',
    alignItems: 'center'
  },
  waterfallIntervalLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'white'
  },
  waterfallIntervalSelect: {
    backgroundColor: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '2px 4px',
    fontSize: '13px'
  },
  waterfallHistoryControl: {
    display: 'flex',
    alignItems: 'center'
  },
  waterfallHistoryLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'white'
  },
  waterfallHistorySlider: {
    width: '80px'
  },
  waterfallHistoryValue: {
    color: 'white',
    fontSize: '13px',
    minWidth: '20px'
  },
  waterfallContainer: {
    width: '100%',
    height: '200px',
    marginBottom: '10px'
  }
};

export default WaterfallPanel; 