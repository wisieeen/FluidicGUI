import React from 'react';

const LineTransformPanel = ({
  isLineDrawn = false,
  isCameraActive = false,
  lineYOffset = 0,
  lineRotation = 0,
  fineYOffset = 0,
  fineRotation = 0,
  onLineYOffsetChange,
  onLineRotationChange,
  onFineYOffsetChange,
  onFineRotationChange,
  onResetTransformations
}) => {
  if (!isLineDrawn || !isCameraActive) {
    return null;
  }
  
  const totalYOffset = lineYOffset + fineYOffset;
  const totalRotation = lineRotation + fineRotation;
  
  return (
    <div style={styles.lineTransformControls}>
      <div style={styles.transformTitle}>Line Position Controls</div>
      
      {/* Coarse Y Position control */}
      <div style={styles.transformControl}>
        <label style={styles.transformLabel}>
          Y Position:
          <input
            type="range"
            min="-100"
            max="100"
            value={lineYOffset}
            onChange={onLineYOffsetChange}
            style={styles.transformSlider}
            title="Adjust vertical position"
          />
          <span style={styles.transformValue}>{lineYOffset}px</span>
        </label>
      </div>
      
      {/* Fine Y Position control */}
      <div style={styles.transformControl}>
        <label style={styles.transformLabel}>
          <span style={styles.fineTuneLabel}>Fine Y:</span>
          <input
            type="range"
            min="-10"
            max="10"
            step="0.1"
            value={fineYOffset}
            onChange={onFineYOffsetChange}
            style={styles.fineSlider}
            title="Fine-tune vertical position"
          />
          <span style={styles.transformValue}>{fineYOffset.toFixed(1)}px</span>
        </label>
      </div>
      
      {/* Coarse Rotation control */}
      <div style={styles.transformControl}>
        <label style={styles.transformLabel}>
          Rotation:
          <input
            type="range"
            min="-90"
            max="90"
            value={lineRotation}
            onChange={onLineRotationChange}
            style={styles.transformSlider}
            title="Rotate line around its center"
          />
          <span style={styles.transformValue}>{lineRotation}°</span>
        </label>
      </div>
      
      {/* Fine Rotation control */}
      <div style={styles.transformControl}>
        <label style={styles.transformLabel}>
          <span style={styles.fineTuneLabel}>Fine Angle:</span>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.05"
            value={fineRotation}
            onChange={onFineRotationChange}
            style={styles.fineSlider}
            title="Fine-tune rotation angle"
          />
          <span style={styles.transformValue}>{fineRotation.toFixed(2)}°</span>
        </label>
      </div>
      
      {/* Position info display */}
      <div style={styles.positionInfo}>
        Total Y: {totalYOffset.toFixed(1)}px | 
        Total Angle: {totalRotation.toFixed(2)}°
      </div>
      
      <button
        onClick={onResetTransformations}
        style={styles.resetTransformButton}
        title="Reset position and rotation"
      >
        Reset
      </button>
    </div>
  );
};

// Styles
const styles = {
  lineTransformControls: {
    backgroundColor: '#222',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '10px'
  },
  transformTitle: {
    fontSize: '15px',
    color: 'white',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  transformControl: {
    marginBottom: '8px'
  },
  transformLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'white'
  },
  fineTuneLabel: {
    display: 'inline-block',
    width: '60px',
    color: '#aaa'
  },
  transformSlider: {
    flex: 1
  },
  fineSlider: {
    flex: 1
  },
  transformValue: {
    width: '50px',
    textAlign: 'right',
    color: '#ccc'
  },
  positionInfo: {
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '8px',
    textAlign: 'center'
  },
  resetTransformButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'block',
    margin: '0 auto'
  }
};

export default LineTransformPanel; 