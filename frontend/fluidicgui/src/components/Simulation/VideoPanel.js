import React, { useEffect, useRef, useState } from 'react';

const VideoPanel = ({
  availableCameras = [],
  selectedCamera = '',
  isCameraActive = false,
  isCameraSupported = true,
  videoSize = { width: 320, height: 240 },
  showVideoFeed = true,
  cropActive = false,
  cropMode = false,
  cropStart = { x: 0, y: 0 },
  cropEnd = { x: 0, y: 0 },
  isCropSelecting = false,
  isLineDrawn = false,
  isDrawingLine = false,
  lineStart = { x: 0, y: 0 },
  lineEnd = { x: 0, y: 0 },
  lineColor = 'rgb(255, 255, 0)',
  showResizeInfo = false,
  onCameraChange,
  onCameraStart,
  onCameraStop,
  onLineDrawStart,
  onLineDrawUpdate,
  onLineDrawFinish,
  onResizeStart,
  onCropModeToggle,
  onCropStart,
  onCropUpdate,
  onCropFinish,
  onCropClear,
  onLineClear,
  onLineColorChange,
  retryWithPermissionCheck
}) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const lineOverlayRef = useRef(null);
  const cropOverlayRef = useRef(null);
  
  // Pass the video ref up to parent component when it's set
  useEffect(() => {
    if (videoRef.current) {
      onCameraChange && onCameraChange('videoRef', videoRef);
    }
  }, [videoRef.current, onCameraChange]);

  // Add an effect to log line drawing state changes
  useEffect(() => {
    console.log('Line drawing state in VideoPanel:', {
      isDrawingLine, 
      isLineDrawn,
      lineStart,
      lineEnd
    });
  }, [isDrawingLine, isLineDrawn, lineStart.x, lineStart.y, lineEnd.x, lineEnd.y]);

  return (
    <div className="video-panel">
      {/* Camera controls */}
      <div style={styles.cameraControls}>
        <select 
          value={selectedCamera} 
          onChange={(e) => onCameraChange && onCameraChange('selectedCamera', e.target.value)}
          style={styles.cameraSelect}
          disabled={isCameraActive}
        >
          <option value="">Select Camera</option>
          {availableCameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
            </option>
          ))}
        </select>
        
        <button 
          onClick={isCameraActive ? onCameraStop : onCameraStart}
          style={isCameraActive ? styles.stopButton : styles.startButton}
        >
          {isCameraActive ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
      
      {/* Video feed container - always keep in DOM but control visibility */}
      <div 
        ref={videoContainerRef}
        style={{
          ...styles.videoContainer,
          width: `${videoSize.width}px`,
          height: `${videoSize.height}px`,
          position: 'relative',
          visibility: showVideoFeed ? 'visible' : 'hidden',
          ...(showVideoFeed ? {} : { position: 'absolute', left: '-9999px' }),
          ...(cropActive && {
            overflow: 'hidden',
            transformStyle: 'preserve-3d' // Helps with video stretching
          })
        }}
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent text selection
          console.log("Mouse down on video container");
          if (cropMode) {
            onCropStart && onCropStart(e, videoContainerRef.current);
          } else if (isCameraActive) {
            console.log("Calling line draw start with container:", videoContainerRef.current);
            onLineDrawStart && onLineDrawStart(e, videoContainerRef.current);
          }
        }}
        onMouseMove={(e) => {
          // Always call this during mouse movement when camera is active
          if (isCameraActive && !cropMode) {
            onLineDrawUpdate && onLineDrawUpdate(e, videoContainerRef.current);
          } else if (cropMode) {
            onCropUpdate && onCropUpdate(e, videoContainerRef.current);
          }
        }}
        onMouseUp={(e) => {
          e.preventDefault();
          console.log("Mouse up on video container");
          if (cropMode) {
            onCropFinish && onCropFinish(e);
          } else if (isCameraActive) {
            console.log("Calling line draw finish");
            onLineDrawFinish && onLineDrawFinish();
          }
        }}
        onMouseLeave={(e) => {
          console.log("Mouse leave on video container");
          if (cropMode) {
            onCropFinish && onCropFinish(e);
          } else if (isCameraActive && isDrawingLine) {
            console.log("Calling line draw finish on mouse leave");
            onLineDrawFinish && onLineDrawFinish();
          }
        }}
      >
        {!isCameraSupported ? (
          <div style={styles.noCamera}>
            <p>Camera API not supported in this browser</p>
            <p>Please use a modern browser like Chrome, Firefox, or Edge.</p>
          </div>
        ) : availableCameras.length === 0 ? (
          <div style={styles.noCamera}>
            <p>No cameras detected</p>
            <button 
              onClick={retryWithPermissionCheck}
              style={styles.retryButton}
            >
              Retry Camera Detection
            </button>
          </div>
        ) : !selectedCamera ? (
          <div style={styles.noCamera}>Select a camera</div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{
                ...styles.video,
                width: '100%',
                height: '100%',
                ...(cropActive && {
                  position: 'absolute',
                  top: `-${cropStart.y}px`,
                  left: `-${cropStart.x}px`,
                  width: `${videoSize.width * (videoSize.width / (cropEnd.x - cropStart.x))}px`,
                  height: `${videoSize.height * (videoSize.height / (cropEnd.y - cropStart.y))}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `scale(${(cropEnd.x - cropStart.x) / videoSize.width * 100}%, ${(cropEnd.y - cropStart.y) / videoSize.height * 100}%)`,
                  transformOrigin: `${cropStart.x}px ${cropStart.y}px`
                })
              }}
            />
            
            {/* Crop selection overlay */}
            {isCameraActive && cropMode && (
              <div 
                ref={cropOverlayRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              >
                {isCropSelecting && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(cropStart.x, cropEnd.x)}px`,
                      top: `${Math.min(cropStart.y, cropEnd.y)}px`,
                      width: `${Math.abs(cropEnd.x - cropStart.x)}px`,
                      height: `${Math.abs(cropEnd.y - cropStart.y)}px`,
                      border: '2px dashed yellow',
                      backgroundColor: 'rgba(255, 255, 0, 0.1)'
                    }}
                  />
                )}
              </div>
            )}
            
            {/* Crop indicator when crop is active */}
            {isCameraActive && cropActive && (
              <div style={styles.cropIndicator}>
                Cropped: {Math.round(cropEnd.x - cropStart.x)}×{Math.round(cropEnd.y - cropStart.y)} 
                ({(videoSize.width / (cropEnd.x - cropStart.x)).toFixed(1)}x zoom)
              </div>
            )}
            
            {/* Size indicator and resize handle should always be visible when camera is active */}
            {isCameraActive && (
              <>
                {/* Size indicator overlay */}
                {showResizeInfo && (
                  <div style={styles.sizeIndicator}>
                    {videoSize.width} × {videoSize.height}
                  </div>
                )}
                
                {/* Enhanced resize handle with icon */}
                <div 
                  style={styles.resizeHandle}
                  onMouseDown={(e) => onResizeStart && onResizeStart(e)}
                  title="Drag to resize"
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
                
                {/* Line overlay */}
                <div 
                  ref={lineOverlayRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // Let mouse events pass through
                    zIndex: 5
                  }}
                >
                  {/* Draw the line */}
                  {(isDrawingLine || isLineDrawn) && (
                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <line
                        x1={lineStart.x}
                        y1={lineStart.y}
                        x2={isDrawingLine ? lineEnd.x : lineEnd.x}
                        y2={isDrawingLine ? lineEnd.y : lineEnd.y}
                        stroke={lineColor}
                        strokeWidth="2"
                        strokeDasharray={isDrawingLine ? "4" : "none"}
                      />
                      {/* Start point circle */}
                      <circle
                        cx={lineStart.x}
                        cy={lineStart.y}
                        r="3"
                        fill={lineColor}
                      />
                      {/* End point circle */}
                      <circle
                        cx={lineEnd.x}
                        cy={lineEnd.y}
                        r="3"
                        fill={lineColor}
                      />
                    </svg>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Line controls */}
      {isCameraActive && (
        <div style={styles.lineControls}>
          <div style={styles.lineControlsInfo}>
            {isLineDrawn ? (
              <span>Line profile active</span>
            ) : (
              <span>Click and drag to draw a line for intensity profile</span>
            )}
          </div>
          <div style={styles.lineControlsButtons}>
            <button 
              onClick={onLineClear}
              style={{
                ...styles.lineButton,
                opacity: isLineDrawn ? 1 : 0.5,
                cursor: isLineDrawn ? 'pointer' : 'default'
              }}
              disabled={!isLineDrawn}
            >
              Clear
            </button>
            <button 
              onClick={onLineColorChange}
              style={{
                ...styles.lineButton,
                backgroundColor: lineColor
              }}
            >
              Color
            </button>
          </div>
        </div>
      )}
      
      {/* Crop controls */}
      {isCameraActive && (
        <div style={styles.cropControls}>
          <button
            onClick={onCropModeToggle}
            style={{
              ...styles.cropButton,
              backgroundColor: cropMode ? 'rgba(255, 200, 0, 0.7)' : 'rgba(80, 80, 80, 0.7)'
            }}
            title={cropMode ? "Cancel crop selection" : "Crop video to area of interest"}
          >
            {cropMode ? "Cancel Crop" : "Crop Video"}
          </button>
          
          {cropActive && (
            <button
              onClick={onCropClear}
              style={styles.cropButton}
              title="Clear crop and show full video"
            >
              Reset Crop
            </button>
          )}
          
          {cropMode && (
            <span style={styles.cropInstructions}>
              Draw a box on the video to select crop area
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  videoContainer: {
    border: '1px solid #444',
    backgroundColor: '#222',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '8px',
    borderRadius: '4px'
  },
  video: {
    objectFit: 'fill',
  },
  noCamera: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#aaa',
    textAlign: 'center',
    padding: '10px'
  },
  cameraControls: {
    display: 'flex',
    marginBottom: '8px',
    gap: '8px'
  },
  cameraSelect: {
    flex: 1,
    backgroundColor: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '6px',
    fontSize: '14px'
  },
  startButton: {
    backgroundColor: '#2a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  stopButton: {
    backgroundColor: '#d44',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  retryButton: {
    backgroundColor: '#46b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    margin: '10px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  resizeHandle: {
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
  sizeIndicator: {
    position: 'absolute',
    bottom: '5px',
    left: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 15
  },
  cropIndicator: {
    position: 'absolute',
    top: '5px',
    left: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 15
  },
  lineControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    borderRadius: '4px',
    fontSize: '14px'
  },
  lineControlsInfo: {
    color: '#ccc',
    fontSize: '13px'
  },
  lineControlsButtons: {
    display: 'flex',
    gap: '8px'
  },
  lineButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '3px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px'
  },
  cropControls: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '8px'
  },
  cropButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '3px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px'
  },
  cropInstructions: {
    color: '#ffe066',
    fontSize: '13px',
    fontStyle: 'italic'
  }
};

export default VideoPanel; 