import React, { useState, useEffect, useRef } from 'react';
import VideoPanel from './VideoPanel';
import LineTransformPanel from './LineTransformPanel';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import styles from './styles/VideoControlPanelStyles';

const VideoControlPanel = ({
  // Camera related props
  availableCameras = [],
  selectedCamera = '',
  setSelectedCamera,
  isCameraActive = false,
  isCameraSupported = true,
  videoSize = { width: 320, height: 240 },
  showVideoFeed = true,
  setVideoSize,
  cameraResolution = '320x240',
  
  // Line related props
  isLineDrawn = false,
  isDrawingLine = false,
  lineStart = { x: 0, y: 0 },
  lineEnd = { x: 0, y: 0 },
  setLineStart,
  setLineEnd,
  setIsDrawingLine,
  setIsLineDrawn,
  lineColor = 'rgb(255, 255, 0)',
  setLineColor,
  
  // Line transformation props
  lineYOffset = 0,
  lineRotation = 0,
  fineYOffset = 0,
  fineRotation = 0,
  setLineYOffset,
  setLineRotation,
  setFineYOffset,
  setFineRotation,
  originalLineStart = { x: 0, y: 0 },
  originalLineEnd = { x: 0, y: 0 },
  setOriginalLineStart,
  setOriginalLineEnd,
  
  // Functions
  startCamera,
  stopCamera,
  extractLineProfile,
  retryWithPermissionCheck,
  
  // Refs
  videoRef,
  videoContainerRef,
}) => {
  const buttonVariants = useButtonStyles();
  const [showResizeInfo, setShowResizeInfo] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ ...videoSize });
  
  // Handle camera change
  const handleCameraChange = (param, value) => {
    if (param === 'selectedCamera') {
      setSelectedCamera(value);
      
      // If camera is already active, restart with new camera
      if (isCameraActive) {
        stopCamera();
        // Small delay to ensure camera is properly stopped
        setTimeout(() => {
          startCamera();
        }, 100);
      }
    } else if (param === 'videoRef') {
      // Update the videoRef if needed
      videoRef.current = value.current;
    }
  };
  
  // Handle line drawing start
  const handleLineDrawStart = (e, container) => {
    if (!isCameraActive) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain to video bounds
    const boundedX = Math.max(0, Math.min(x, videoSize.width));
    const boundedY = Math.max(0, Math.min(y, videoSize.height));
    
    setLineStart({ x: boundedX, y: boundedY });
    setLineEnd({ x: boundedX, y: boundedY }); // Initially same point
    setIsDrawingLine(true);
    
    console.log(`Line drawing started at coordinates: (${Math.round(boundedX)}, ${Math.round(boundedY)})`);
  };
  
  // Handle line drawing update (during mouse movement)
  const handleLineDrawUpdate = (e, container) => {
    if (!isDrawingLine) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain to video bounds
    const boundedX = Math.max(0, Math.min(x, videoSize.width));
    const boundedY = Math.max(0, Math.min(y, videoSize.height));
    
    setLineEnd({ x: boundedX, y: boundedY });
  };
  
  // Handle line drawing finish
  const handleLineDrawFinish = () => {
    if (isDrawingLine) {
      console.log(`Line drawn from (${lineStart.x}, ${lineStart.y}) to (${lineEnd.x}, ${lineEnd.y})`);
      setIsDrawingLine(false);
      setIsLineDrawn(true);
      
      // Store original line positions for transformations
      setOriginalLineStart({ ...lineStart });
      setOriginalLineEnd({ ...lineEnd });
      
      // Reset transformation values
      setLineYOffset(0);
      setLineRotation(0);
      setFineYOffset(0);
      setFineRotation(0);
      
      // Extract line profile immediately
      setTimeout(() => {
        extractLineProfile();
      }, 100);
    }
  };
  
  // Handle line color change
  const handleLineColorChange = () => {
    // Cycle through colors: yellow -> red -> green -> blue -> yellow
    if (lineColor === 'rgb(255, 255, 0)') setLineColor('rgb(255, 50, 50)');
    else if (lineColor === 'rgb(255, 50, 50)') setLineColor('rgb(50, 255, 50)');
    else if (lineColor === 'rgb(50, 255, 50)') setLineColor('rgb(50, 50, 255)');
    else setLineColor('rgb(255, 255, 0)');
  };
  
  // Handle line clear
  const handleLineClear = () => {
    setIsLineDrawn(false);
  };
  
  // Handle resize start
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...videoSize };
  };
  
  // Set up resize event listeners
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      // Calculate new size based on mouse movement
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;
      
      // Maintain aspect ratio (4:3)
      const aspectRatio = 4 / 3;
      let newWidth = Math.max(160, resizeStartSize.current.width + deltaX);
      let newHeight = Math.max(120, newWidth / aspectRatio);
      
      // Set maximum size
      const maxWidth = 640;
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = newWidth / aspectRatio;
      }
      
      setVideoSize({
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
      
      // Show size info during resize
      setShowResizeInfo(true);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      // Hide size info after resize with a short delay
      setTimeout(() => setShowResizeInfo(false), 1500);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setVideoSize]);
  
  // Handle line transformation changes
  const handleLineYOffsetChange = (e) => {
    const newOffset = parseInt(e.target.value, 10);
    setLineYOffset(newOffset);
    
    // Apply transformations and redraw
    setTimeout(() => {
      applyLineTransformations();
      extractLineProfile();
    }, 10);
  };

  const handleLineRotationChange = (e) => {
    const newRotation = parseInt(e.target.value, 10);
    setLineRotation(newRotation);
    
    // Apply transformations and redraw
    setTimeout(() => {
      applyLineTransformations();
      extractLineProfile();
    }, 10);
  };

  const handleFineYOffsetChange = (e) => {
    const newOffset = parseFloat(e.target.value);
    setFineYOffset(newOffset);
    
    // Apply transformations and redraw
    setTimeout(() => {
      applyLineTransformations();
      extractLineProfile();
    }, 10);
  };

  const handleFineRotationChange = (e) => {
    const newRotation = parseFloat(e.target.value);
    setFineRotation(newRotation);
    
    // Apply transformations and redraw
    setTimeout(() => {
      applyLineTransformations();
      extractLineProfile();
    }, 10);
  };
  
  // Apply the line transformations to the line
  const applyLineTransformations = () => {
    if (!originalLineStart || !originalLineEnd) return;
    
    // Calculate center point
    const centerX = (originalLineStart.x + originalLineEnd.x) / 2;
    const centerY = (originalLineStart.y + originalLineEnd.y) / 2;
    
    // Apply both coarse and fine vertical offsets
    const totalYOffset = lineYOffset + fineYOffset;
    const offsetStart = { ...originalLineStart, y: originalLineStart.y + totalYOffset };
    const offsetEnd = { ...originalLineEnd, y: originalLineEnd.y + totalYOffset };
    
    // Apply both coarse and fine rotation
    const totalRotation = lineRotation + fineRotation;
    // Convert rotation from degrees to radians
    const angle = (totalRotation * Math.PI) / 180;
    
    // Apply rotation around center
    if (totalRotation !== 0) {
      // Calculate rotated start point
      const startDeltaX = offsetStart.x - centerX;
      const startDeltaY = offsetStart.y - centerY;
      const rotatedStartX = centerX + (startDeltaX * Math.cos(angle) - startDeltaY * Math.sin(angle));
      const rotatedStartY = centerY + (startDeltaX * Math.sin(angle) + startDeltaY * Math.cos(angle));
      
      // Calculate rotated end point
      const endDeltaX = offsetEnd.x - centerX;
      const endDeltaY = offsetEnd.y - centerY;
      const rotatedEndX = centerX + (endDeltaX * Math.cos(angle) - endDeltaY * Math.sin(angle));
      const rotatedEndY = centerY + (endDeltaX * Math.sin(angle) + endDeltaY * Math.cos(angle));
      
      // Update line positions
      setLineStart({ x: rotatedStartX, y: rotatedStartY });
      setLineEnd({ x: rotatedEndX, y: rotatedEndY });
    } else {
      // No rotation, just apply offset
      setLineStart(offsetStart);
      setLineEnd(offsetEnd);
    }
  };
  
  // Reset transformations
  const handleResetTransformations = () => {
    setLineYOffset(0);
    setLineRotation(0);
    setFineYOffset(0);
    setFineRotation(0);
    
    // Restore original line position
    setLineStart({ ...originalLineStart });
    setLineEnd({ ...originalLineEnd });
    
    // Redraw
    setTimeout(() => {
      extractLineProfile();
    }, 10);
  };
  
  // Apply transformations when original line positions change
  useEffect(() => {
    if (isLineDrawn && originalLineStart.x !== 0 && originalLineEnd.x !== 0) {
      applyLineTransformations();
    }
  }, [originalLineStart, originalLineEnd]);
  
  return (
    <div style={styles.videoControlPanel}>
      <VideoPanel 
        availableCameras={availableCameras}
        selectedCamera={selectedCamera}
        isCameraActive={isCameraActive}
        isCameraSupported={isCameraSupported}
        videoSize={videoSize}
        showVideoFeed={showVideoFeed}
        isLineDrawn={isLineDrawn}
        isDrawingLine={isDrawingLine}
        lineStart={lineStart}
        lineEnd={lineEnd}
        lineColor={lineColor}
        showResizeInfo={showResizeInfo}
        onCameraChange={handleCameraChange}
        onCameraStart={startCamera}
        onCameraStop={stopCamera}
        onLineDrawStart={handleLineDrawStart}
        onLineDrawUpdate={handleLineDrawUpdate}
        onLineDrawFinish={handleLineDrawFinish}
        onLineClear={handleLineClear}
        onLineColorChange={handleLineColorChange}
        onResizeStart={handleResizeStart}
        retryWithPermissionCheck={retryWithPermissionCheck}
        videoRef={videoRef}
        videoContainerRef={videoContainerRef}
      />
      
      <LineTransformPanel 
        isLineDrawn={isLineDrawn}
        isCameraActive={isCameraActive}
        lineYOffset={lineYOffset}
        lineRotation={lineRotation}
        fineYOffset={fineYOffset}
        fineRotation={fineRotation}
        onLineYOffsetChange={handleLineYOffsetChange}
        onLineRotationChange={handleLineRotationChange}
        onFineYOffsetChange={handleFineYOffsetChange}
        onFineRotationChange={handleFineRotationChange}
        onResetTransformations={handleResetTransformations}
      />
    </div>
  );
};

export default VideoControlPanel; 