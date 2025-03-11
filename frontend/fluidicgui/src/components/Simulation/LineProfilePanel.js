import React, { useRef, useEffect } from 'react';

const LineProfilePanel = ({
  isLineDrawn = false,
  isCameraActive = false,
  lineProfileData = null,
  integrationCount = 1,
  sampleHistory = [],
  backgroundData = null,
  useBackgroundCorrection = false,
  showRedLine = true,
  showGreenLine = true,
  showBlueLine = true,
  showIntensityLine = true,
  stabilizeYAxis = true,
  graphSize = { width: 320, height: 100 },
  onIntegrationChange,
  onResetIntegration,
  onSetBackground,
  onToggleBackgroundCorrection,
  onClearBackground,
  onToggleRedLine,
  onToggleGreenLine,
  onToggleBlueLine,
  onToggleIntensityLine,
  onToggleYAxisStabilization,
  onExportData,
  onGraphResizeStart,
  onLogLineDetails
}) => {
  const lineProfileCanvasRef = useRef(null);
  const graphContainerRef = useRef(null);

  // Log when the canvas ref is set
  useEffect(() => {
    if (lineProfileCanvasRef.current) {
      console.log('LineProfilePanel: Canvas ref is set', lineProfileCanvasRef.current);
    }
  }, [lineProfileCanvasRef.current]);
  
  // Log when data changes
  useEffect(() => {
    console.log('LineProfilePanel: lineProfileData changed', lineProfileData?.length);
  }, [lineProfileData]);

  // Update canvas size when graphSize changes
  useEffect(() => {
    if (lineProfileCanvasRef.current) {
      lineProfileCanvasRef.current.width = graphSize.width;
      lineProfileCanvasRef.current.height = graphSize.height;
      console.log('Canvas resized to', graphSize.width, 'x', graphSize.height);
    }
  }, [graphSize.width, graphSize.height]);

  return (
    <div className="line-profile-panel">
      {/* Only show when a line is drawn and camera is active */}
      {isLineDrawn && isCameraActive && (
        <>
          {/* Integration controls */}
          <div style={styles.integrationControls}>
            <label style={styles.integrationLabel}>
              Integration:
              <input
                type="number"
                min="1"
                max="50"
                value={integrationCount}
                onChange={onIntegrationChange}
                style={styles.integrationInput}
                title="Number of samples to average (higher = better sensitivity)"
              />
            </label>
            <button
              onClick={onResetIntegration}
              style={styles.resetButton}
              title="Reset integration (clear sample history)"
            >
              Reset
            </button>
          </div>
          
          {/* Line profile container */}
          <div 
            ref={graphContainerRef}
            style={styles.lineProfileContainer}
          >
            <div style={styles.lineProfileHeader}>
              <div style={styles.lineProfileTitleArea}>
                <span style={styles.lineProfileTitle}>
                  {useBackgroundCorrection ? 'Background-Corrected Intensity' : 'Intensity Profile'}
                </span>
                <span style={styles.integrationStatus}>
                  Samples: {sampleHistory.length}/{integrationCount}
                  {backgroundData && 
                    ` | Background: ${useBackgroundCorrection ? 'Active' : 'Available'}`}
                </span>
              </div>
              <div style={styles.lineProfileControls}>
                <button
                  onClick={onLogLineDetails}
                  style={styles.infoButton}
                  title="Log Line Coordinates"
                >
                  📊
                </button>
                <button
                  onClick={onExportData}
                  style={styles.exportButton}
                  title="Export Intensity Data"
                >
                  💾
                </button>
                <button
                  onClick={onSetBackground}
                  style={styles.backgroundButton}
                  title="Set current profile as background reference"
                >
                  Set BG
                </button>
                {/* Debugging: Add refresh button */}
                <button
                  onClick={() => {
                    console.log('Manual refresh requested');
                    // Request parent component to redraw
                    window.setTimeout(() => {
                      if (lineProfileData) {
                        console.log('Forcing redraw of line profile graph');
                        const event = new CustomEvent('redrawLineProfile');
                        window.dispatchEvent(event);
                      }
                    }, 0);
                  }}
                  style={styles.refreshButton}
                  title="Refresh Graph (Debug)"
                >
                  ↻
                </button>
                {backgroundData && (
                  <>
                    <button
                      onClick={onToggleBackgroundCorrection}
                      style={{
                        ...styles.toggleButton,
                        backgroundColor: useBackgroundCorrection ? 'rgba(120, 200, 120, 0.7)' : 'rgba(80, 80, 80, 0.7)'
                      }}
                      title={`${useBackgroundCorrection ? 'Disable' : 'Enable'} background correction`}
                    >
                      {useBackgroundCorrection ? 'BG Active' : 'BG Off'}
                    </button>
                    <button
                      onClick={onClearBackground}
                      style={styles.clearButton}
                      title="Clear background reference"
                    >
                      Clear BG
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Line profile graph canvas */}
            <div style={{
              position: 'relative',
              height: `${graphSize.height}px`,
              width: `${graphSize.width}px`,
              backgroundColor: '#111',
              overflow: 'hidden',
              borderRadius: '4px'
            }}>
              <canvas
                ref={lineProfileCanvasRef}
                width={graphSize.width}
                height={graphSize.height}
                style={{
                  display: 'block',
                  width: `${graphSize.width}px`,
                  height: `${graphSize.height}px`
                }}
              />
              {/* Resize handle for graph */}
              <div 
                style={styles.graphResizeHandle}
                onMouseDown={onGraphResizeStart}
                title="Resize graph"
              >
                <svg 
                  width="10" 
                  height="10" 
                  viewBox="0 0 10 10" 
                  style={{ display: 'block' }}
                >
                  <path 
                    d="M8,2 L2,8 M5,2 L2,5 M8,5 L5,8" 
                    stroke="white" 
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
            
            {/* Line visibility controls */}
            <div style={styles.visibilityControls}>
              <label style={styles.visibilityLabel}>
                <input 
                  type="checkbox" 
                  checked={showRedLine}
                  onChange={onToggleRedLine}
                />
                <span style={{...styles.channelIndicator, backgroundColor: 'rgba(255, 80, 80, 0.8)'}}>Red</span>
              </label>
              <label style={styles.visibilityLabel}>
                <input 
                  type="checkbox" 
                  checked={showGreenLine}
                  onChange={onToggleGreenLine}
                />
                <span style={{...styles.channelIndicator, backgroundColor: 'rgba(80, 255, 80, 0.8)'}}>Green</span>
              </label>
              <label style={styles.visibilityLabel}>
                <input 
                  type="checkbox" 
                  checked={showBlueLine}
                  onChange={onToggleBlueLine}
                />
                <span style={{...styles.channelIndicator, backgroundColor: 'rgba(80, 80, 255, 0.8)'}}>Blue</span>
              </label>
              <label style={styles.visibilityLabel}>
                <input 
                  type="checkbox" 
                  checked={showIntensityLine}
                  onChange={onToggleIntensityLine}
                />
                <span style={{...styles.channelIndicator, backgroundColor: 'white'}}>Intensity</span>
              </label>
              <label style={styles.visibilityLabel}>
                <input 
                  type="checkbox" 
                  checked={stabilizeYAxis}
                  onChange={onToggleYAxisStabilization}
                />
                <span>Fixed Y-scale</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Styles
const styles = {
  integrationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  integrationLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: 'white'
  },
  integrationInput: {
    width: '40px',
    backgroundColor: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '3px',
    fontSize: '14px',
    textAlign: 'center'
  },
  resetButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  lineProfileContainer: {
    backgroundColor: '#222',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '10px'
  },
  lineProfileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  lineProfileTitleArea: {
    display: 'flex',
    flexDirection: 'column'
  },
  lineProfileTitle: {
    fontSize: '15px',
    color: 'white',
    fontWeight: 'bold'
  },
  integrationStatus: {
    fontSize: '12px',
    color: '#aaa'
  },
  lineProfileControls: {
    display: 'flex',
    gap: '6px'
  },
  infoButton: {
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  exportButton: {
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  backgroundButton: {
    backgroundColor: '#b94',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  toggleButton: {
    border: 'none',
    borderRadius: '3px',
    padding: '3px 6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'white'
  },
  clearButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  graphResizeHandle: {
    position: 'absolute',
    right: '2px',
    bottom: '2px',
    width: '14px',
    height: '14px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '2px',
    cursor: 'nwse-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  },
  visibilityControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '8px'
  },
  visibilityLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: 'white',
    cursor: 'pointer'
  },
  channelIndicator: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginRight: '3px'
  },
  refreshButton: {
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 6px',
    cursor: 'pointer',
    fontSize: '13px'
  }
};

export default LineProfilePanel; 