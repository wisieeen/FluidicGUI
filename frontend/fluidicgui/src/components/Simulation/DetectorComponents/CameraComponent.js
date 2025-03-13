import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useButtonStyles } from '../../../styles/ButtonStyleProvider';

const CameraComponent = React.forwardRef((props, ref) => {
  const { onResize, onLineDataChange } = props;
  const buttonVariants = useButtonStyles();
  
  // Camera view state
  const [cameraSize, setCameraSize] = useState({ width: 640, height: 480 });
  const [isResizing, setIsResizing] = useState(false);
  const [showResizeInfo, setShowResizeInfo] = useState(false);
  
  // Camera operation state
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showCameraSettings, setShowCameraSettings] = useState(false);
  const [showAdvancedCapabilities, setShowAdvancedCapabilities] = useState(false);
  const [cameraCapabilities, setCameraCapabilities] = useState(null);
  const [exposureMode, setExposureMode] = useState('continuous');
  
  // Line drawing state
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStart, setLineStart] = useState({ x: 0, y: 0 });
  const [lineEnd, setLineEnd] = useState({ x: 0, y: 0 });
  const [isLineDrawn, setIsLineDrawn] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  
  // Line adjustment state
  const [lineYOffset, setLineYOffset] = useState(0);
  const [lineXOffset, setLineXOffset] = useState(0);
  const [originalLineStart, setOriginalLineStart] = useState({ x: 0, y: 0 });
  const [originalLineEnd, setOriginalLineEnd] = useState({ x: 0, y: 0 });
  
  // Camera settings
  const [cameraResolution, setCameraResolution] = useState('640x480');
  const [cameraExposureTime, setCameraExposureTime] = useState(null); // Exposure time in milliseconds
  const [cameraBrightness, setCameraBrightness] = useState(null); // Brightness value
  const [cameraGain, setCameraGain] = useState(null);
  
  // Refs
  const cameraContainerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRequestRef = useRef(null);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // Get current camera settings
    getSettings: () => {
      return {
        cameraId: selectedCamera,
        resolution: cameraResolution,
        exposureTime: cameraExposureTime,
        brightness: cameraBrightness,
        gain: cameraGain,
        exposureMode: exposureMode,
        // Line drawing settings
        isLineDrawn: isLineDrawn,
        lineStart: originalLineStart,
        lineEnd: originalLineEnd,
        lineYOffset: lineYOffset,
        lineXOffset: lineXOffset
      };
    },
    
    // Expose startCamera method to parent
    startCamera: async () => {
      if (!isCameraActive && selectedCamera) {
        return startCamera();
      }
      return Promise.resolve(false);
    },
    
    // Apply saved camera settings
    applySettings: async (settings) => {
      if (!settings) return false;
      
      try {
        // Apply camera ID and start camera if needed
        if (settings.cameraId) {
          const cameraExists = availableCameras.some(camera => camera.deviceId === settings.cameraId);
          if (cameraExists) {
            setSelectedCamera(settings.cameraId);
            
            // If camera is not active, start it
            if (!isCameraActive) {
              // Short delay to allow state update
              setTimeout(() => startCamera(), 100);
              
              // Wait for camera to start before continuing
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // Apply resolution
        if (settings.resolution) {
          setCameraResolution(settings.resolution);
        }
        
        // Apply exposure time
        if (settings.exposureTime !== null && settings.exposureTime !== undefined) {
          setCameraExposureTime(settings.exposureTime);
        }
        
        // Apply brightness
        if (settings.brightness !== null && settings.brightness !== undefined) {
          setCameraBrightness(settings.brightness);
        }
        
        // Apply gain
        if (settings.gain !== null && settings.gain !== undefined) {
          setCameraGain(settings.gain);
        }
        
        // Apply exposure mode
        if (settings.exposureMode) {
          setExposureMode(settings.exposureMode);
        }
        
        // Apply settings to camera
        await applyCameraSettings();
        
        // After camera settings are applied, handle line drawing settings
        if (settings.isLineDrawn && settings.lineStart && settings.lineEnd) {
          // Set original line points
          setOriginalLineStart(settings.lineStart);
          setOriginalLineEnd(settings.lineEnd);
          
          // Set current line points (will be adjusted by offset/rotation later)
          setLineStart(settings.lineStart);
          setLineEnd(settings.lineEnd);
          
          // Mark line as drawn
          setIsLineDrawn(true);
          
          // Apply line adjustments
          if (settings.lineYOffset !== undefined) {
            setLineYOffset(settings.lineYOffset);
          }
          
          if (settings.lineXOffset !== undefined) {
            setLineXOffset(settings.lineXOffset);
          }
          
          // Calculate transformed line with adjustments
          calculateTransformedLinePosition();
          
          // Start extraction if needed
          setIsExtracting(true);
        }
        
        return true;
      } catch (error) {
        console.error('Error applying camera settings:', error);
        return false;
      }
    }
  }));
  
  // Get available cameras on component mount
  useEffect(() => {
    getAvailableCameras();
    
    // Cleanup function to stop video stream when component unmounts
    return () => {
      stopCamera();
    };
  }, []);
  
  // Initialize canvas size when video size changes
  useEffect(() => {
    if (canvasRef.current) {
      console.log('Setting canvas dimensions to:', cameraSize.width, cameraSize.height);
      canvasRef.current.width = cameraSize.width;
      canvasRef.current.height = cameraSize.height;
      
      // If line is drawn, redraw it when canvas size changes
      if (isLineDrawn) {
        console.log('Redrawing line due to canvas size change');
        
        // Ensure the redraw happens after the canvas size is updated
        // by using a small timeout
        setTimeout(() => {
          drawLine();
          
          // Double-check with another redraw after a slight delay
          setTimeout(() => drawLine(), 100);
        }, 0);
      }
    }
  }, [cameraSize.width, cameraSize.height, isLineDrawn]);
  
  // Add a new effect for continuous redrawing of the line
  useEffect(() => {
    let animationId;
    
    // Function to continuously redraw the line
    const redrawLine = () => {
      if (isLineDrawn && canvasRef.current) {
        drawLine();
      }
      animationId = requestAnimationFrame(redrawLine);
    };
    
    // Start animation if line is drawn
    if (isLineDrawn) {
      console.log('Starting continuous line redraw');
      animationId = requestAnimationFrame(redrawLine);
    }
    
    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isLineDrawn, isExtracting, lineYOffset, lineXOffset]);
  
  // Extract line data effect - runs continuously when line is drawn
  useEffect(() => {
    // Function to extract pixel data and process it
    const extractLineData = () => {
      if (isLineDrawn && videoRef.current && canvasRef.current && isCameraActive) {
        const transformedLine = calculateTransformedLinePosition();
        const lineData = getPixelsUnderLine(transformedLine.start, transformedLine.end);
        
        // Set extracted data state
        setExtractedData(lineData);
        
        // Send data to parent component if callback exists
        if (onLineDataChange) {
          onLineDataChange({
            start: transformedLine.start,
            end: transformedLine.end,
            yOffset: lineYOffset,
            xOffset: lineXOffset,
            pixelData: lineData
          });
        }
        
        // Make sure the line remains visible during extraction
        // This ensures data is extracted but line stays visible
        if (isLineDrawn) {
          requestAnimationFrame(() => drawLine());
        }
      }
      
      // Continue extraction loop if still extracting
      if (isExtracting) {
        animationRequestRef.current = requestAnimationFrame(extractLineData);
      }
    };
    
    // Start extraction if conditions are met
    if (isLineDrawn && isCameraActive && isExtracting) {
      animationRequestRef.current = requestAnimationFrame(extractLineData);
    }
    
    // Clean up animation frame on unmount or when dependencies change
    return () => {
      if (animationRequestRef.current) {
        cancelAnimationFrame(animationRequestRef.current);
        animationRequestRef.current = null;
      }
    };
  }, [isLineDrawn, isCameraActive, isExtracting, lineYOffset, lineXOffset]);
  
  // Add a separate dedicated effect for line drawing that runs regardless of extraction state
  useEffect(() => {
    if (!isLineDrawn || !isCameraActive) return;
    
    console.log('Setting up dedicated line drawing effect');
    
    const drawLineFrame = () => {
      if (canvasRef.current && isLineDrawn) {
        drawLine();
      }
      requestAnimationFrame(drawLineFrame);
    };
    
    const animationId = requestAnimationFrame(drawLineFrame);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isLineDrawn, isCameraActive]);
  
  // Add an effect to draw the line every time the video frame updates
  useEffect(() => {
    if (!videoRef.current || !isCameraActive || !isLineDrawn) return;

    const video = videoRef.current;
    
    // Function to handle video frames and redraw the line
    const handleVideoFrame = () => {
      if (isLineDrawn) {
        console.log('Redrawing line on video frame update');
        drawLine();
      }
    };

    // Add event listeners to ensure line is drawn when video updates
    video.addEventListener('play', handleVideoFrame);
    video.addEventListener('timeupdate', handleVideoFrame);
    
    // Draw immediately
    drawLine();
    
    // Cleanup
    return () => {
      video.removeEventListener('play', handleVideoFrame);
      video.removeEventListener('timeupdate', handleVideoFrame);
    };
  }, [videoRef.current, isCameraActive, isLineDrawn, lineYOffset, lineXOffset]);
  
  // Function to get available cameras
  const getAvailableCameras = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API is not supported in this browser');
        return;
      }
      
      // Request permission to camera first
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
      
      // Now enumerate devices after getting permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setAvailableCameras(videoDevices);
      
      // Select first camera by default if available
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error accessing camera devices:', error);
    }
  };
  
  // Start camera stream
  const startCamera = async () => {
    try {
      if (!selectedCamera) return;
      
      // Stop any existing stream
      stopCamera();
      
      // Parse resolution
      const [width, height] = cameraResolution.split('x').map(Number);
      
      // Start new stream with selected camera and resolution
      const constraints = {
        video: { 
          deviceId: { exact: selectedCamera },
          width: { ideal: width },
          height: { ideal: height }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Start playing the video
        await videoRef.current.play();
      }
      
      setIsCameraActive(true);
      
      // Get actual resolution from video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.width && settings.height) {
          setCameraSize({ width: settings.width, height: settings.height });
        }
        
        // Get camera capabilities
        const capabilities = videoTrack.getCapabilities();
        setCameraCapabilities(capabilities);
        console.log('Camera capabilities:', capabilities);
        console.log('Current camera settings:', settings);
        
        // Initialize settings based on capabilities
        if (capabilities.exposureTime) {
          // ExposureTime is in microseconds from the API, convert to milliseconds for UI
          const currentExposure = settings.exposureTime || Math.round((capabilities.exposureTime.max + capabilities.exposureTime.min) / 2);
          console.log('Current exposure time (μs):', currentExposure);
          setCameraExposureTime(currentExposure / 1000); // Convert from μs to ms for UI
          console.log('Set exposure time state (ms):', currentExposure / 1000);
          
          // Set current exposure mode
          if (settings.exposureMode) {
            setExposureMode(settings.exposureMode);
            console.log('Current exposure mode:', settings.exposureMode);
          }
        } else {
          setCameraExposureTime(null);
          console.log('Camera does not support exposureTime');
        }
        
        if (capabilities.brightness) {
          const defaultValue = settings.brightness || (capabilities.brightness.min + capabilities.brightness.max) / 2;
          setCameraBrightness(defaultValue);
        } else {
          setCameraBrightness(null);
        }
        
        if (capabilities.exposureCompensation) {
          const defaultValue = settings.exposureCompensation || (capabilities.exposureCompensation.min + capabilities.exposureCompensation.max) / 2;
          setCameraGain(defaultValue);
        } else {
          setCameraGain(null);
        }
      }
      
      // If a line was previously drawn, redraw it after a short delay to allow video to initialize
      if (isLineDrawn) {
        console.log('Redrawing line after camera start');
        setTimeout(() => {
          drawLine();
        }, 500);
      }
      
      return true;
    } catch (error) {
      console.error('Error starting camera:', error);
      setIsCameraActive(false);
      return false;
    }
  };
  
  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  };
  
  // Apply camera settings
  const applyCameraSettings = async () => {
    if (!isCameraActive || !streamRef.current) return;
    
    try {
      // Get current track
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;
      
      // Get capabilities
      const capabilities = videoTrack.getCapabilities();
      
      // Create constraints in proper structure for browser compatibility
      const constraints = { advanced: [] };
      
      // Apply resolution if supported (this often requires stopping and restarting the stream)
      if (cameraResolution && isCameraActive) {
        const [width, height] = cameraResolution.split('x').map(Number);
        console.log('Applying resolution:', width, height);
        
        // For resolution changes, we'll stop and restart the camera with new constraints
        stopCamera();
        
        // Start a new stream with the new resolution
        const newConstraints = {
          video: { 
            deviceId: { exact: selectedCamera },
            width: { ideal: width },
            height: { ideal: height }
          }
        };
        
        // Short delay to ensure the previous stream is properly stopped
        setTimeout(async () => {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
            streamRef.current = newStream;
            
            if (videoRef.current) {
              videoRef.current.srcObject = newStream;
              await videoRef.current.play();
            }
            
            // Get actual resolution and update state
            const newVideoTrack = newStream.getVideoTracks()[0];
            if (newVideoTrack) {
              const settings = newVideoTrack.getSettings();
              if (settings.width && settings.height) {
                setCameraSize({ width: settings.width, height: settings.height });
              }
              
              // After restart, apply the other settings as well
              applyNonResolutionSettings(newVideoTrack);
            }
          } catch (error) {
            console.error('Error restarting camera with new resolution:', error);
          }
        }, 100);
        
        return; // Exit early since we're restarting the camera
      }
      
      // If we're not changing resolution, apply other settings directly
      applyNonResolutionSettings(videoTrack);
      
    } catch (error) {
      console.error('Error applying camera settings:', error);
    }
  };
  
  // Handle exposure time change
  const handleExposureTimeChange = (e) => {
    if (!cameraCapabilities?.exposureTime) return;
    
    const value = parseFloat(e.target.value);
    const { step = 1 } = cameraCapabilities.exposureTime;
    
    // Ensure the value is divisible by the step size
    const roundedValue = Math.round(value / step) * step;
    // Round to 2 decimal places to avoid floating point issues
    const finalValue = parseFloat(roundedValue.toFixed(2));
    setCameraExposureTime(finalValue);
    
    // Set exposure mode to manual when user adjusts exposure time
    setExposureMode('manual');
    console.log('Changed exposure mode to manual because user adjusted exposure time');
  };
  
  // Handle brightness change
  const handleBrightnessChange = (e) => {
    if (!cameraCapabilities?.brightness) return;
    
    const value = parseFloat(e.target.value);
    const { step = 1 } = cameraCapabilities.brightness;
    
    // Ensure the value is divisible by the step size
    const roundedValue = Math.round(value / step) * step;
    // Round to 2 decimal places to avoid floating point issues
    const finalValue = parseFloat(roundedValue.toFixed(2));
    setCameraBrightness(finalValue);
  };
  
  // Handle gain change
  const handleGainChange = (e) => {
    if (!cameraCapabilities?.exposureCompensation) return;
    
    const value = parseFloat(e.target.value);
    const { step = 1 } = cameraCapabilities.exposureCompensation;
    
    // Ensure the value is divisible by the step size
    const roundedValue = Math.round(value / step) * step;
    // Round to 2 decimal places to avoid floating point issues
    const finalValue = parseFloat(roundedValue.toFixed(2));
    setCameraGain(finalValue);
  };
  
  // Helper function to apply non-resolution settings to a video track
  const applyNonResolutionSettings = async (videoTrack) => {
    if (!videoTrack) return;
    
    try {
      // Object to collect constraints
      const advancedConstraints = {};
      
      // Apply exposure time if available - ensure step size is respected
      if (cameraCapabilities?.exposureTime && cameraExposureTime !== null) {
        const { step = 1, min, max } = cameraCapabilities.exposureTime;
        
        // Convert from milliseconds (UI) to microseconds (API)
        const microseconds = cameraExposureTime * 1000; 
        
        // Ensure the value is within valid range and respects step size
        const adjustedValue = Math.max(min, Math.min(max, 
          Math.round(microseconds / step) * step));
        
        advancedConstraints.exposureTime = adjustedValue;
        console.log(`Attempting to set exposureTime: ${adjustedValue}μs (from ${cameraExposureTime}ms)`);
        
        // Set exposure mode to manual when applying exposure time
        if (exposureMode === 'manual' && cameraCapabilities.exposureMode?.includes('manual')) {
          advancedConstraints.exposureMode = 'manual';
          console.log('Setting exposure mode to manual');
        }
      }
      
      // Apply brightness if available - ensure step size is respected
      if (cameraCapabilities?.brightness && cameraBrightness !== null) {
        const { step = 1, min, max } = cameraCapabilities.brightness;
        // Ensure value is divisible by step size and within range
        const adjustedValue = Math.max(min, Math.min(max, 
          Math.round(cameraBrightness / step) * step));
        advancedConstraints.brightness = adjustedValue;
        console.log(`Attempting to set brightness: ${adjustedValue}`);
      }
      
      // Apply gain if available - ensure step size is respected
      if (cameraCapabilities?.exposureCompensation && cameraGain !== null) {
        const { step = 1, min, max } = cameraCapabilities.exposureCompensation;
        // Ensure value is divisible by step size and within range
        const adjustedValue = Math.max(min, Math.min(max, 
          Math.round(cameraGain / step) * step));
        advancedConstraints.exposureCompensation = adjustedValue;
        console.log(`Attempting to set exposureCompensation: ${adjustedValue}`);
      }
      
      // Log what we're trying to apply
      console.log('Applying camera constraints:', advancedConstraints);
      
      // Apply all constraints at once first (this is what most browsers prefer)
      try {
        const allConstraints = { advanced: [{ ...advancedConstraints }] };
        await videoTrack.applyConstraints(allConstraints);
        console.log('Successfully applied all constraints at once');
      } catch (err) {
        console.warn('Failed to apply all constraints at once, trying individually:', err);
        
        // Try applying constraints one by one as fallback
        for (const [constraint, value] of Object.entries(advancedConstraints)) {
          try {
            // Create a constraint object with just this property
            const singleConstraint = {};
            singleConstraint[constraint] = value;
            
            // Some browsers work better with the 'advanced' structure
            await videoTrack.applyConstraints({ advanced: [singleConstraint] });
            console.log(`Successfully applied ${constraint}:`, value);
          } catch (err) {
            // Try direct constraint as a last resort (for some older browsers)
            try {
              const directConstraint = {};
              directConstraint[constraint] = value;
              await videoTrack.applyConstraints(directConstraint);
              console.log(`Applied ${constraint} directly:`, value);
            } catch (directErr) {
              console.warn(`Failed to apply ${constraint}:`, directErr);
            }
          }
        }
      }
      
      // Get updated settings and log them
      const newSettings = videoTrack.getSettings();
      console.log('New camera settings:', newSettings);
      
      // Update our state based on actual applied settings
      if (newSettings.exposureTime !== undefined) {
        const newExposureMs = newSettings.exposureTime / 1000;
        console.log(`Updating exposureTime state to ${newExposureMs}ms (${newSettings.exposureTime}μs)`);
        setCameraExposureTime(newExposureMs);
      }
      
      if (newSettings.exposureMode !== undefined) {
        setExposureMode(newSettings.exposureMode);
        console.log(`Updating exposureMode to ${newSettings.exposureMode}`);
      }
      
      if (newSettings.brightness !== undefined) {
        setCameraBrightness(newSettings.brightness);
      }
      
      if (newSettings.exposureCompensation !== undefined) {
        setCameraGain(newSettings.exposureCompensation);
      }
      
    } catch (error) {
      console.error('Error applying non-resolution settings:', error);
    }
  };
  
  // Handle camera selection change
  const handleCameraChange = (e) => {
    const newCameraId = e.target.value;
    setSelectedCamera(newCameraId);
    
    // If camera is already active, restart with new camera
    if (isCameraActive) {
      stopCamera();
      // Small delay to ensure camera is properly stopped
      setTimeout(() => startCamera(), 100);
    }
  };
  
  // Reusable resize functionality adapted from parent component
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get initial coordinates and size
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = cameraContainerRef.current?.offsetWidth || cameraSize.width;
    const startHeight = cameraContainerRef.current?.offsetHeight || cameraSize.height;
    
    // Show resize feedback
    setIsResizing(true);
    setShowResizeInfo(true);
    
    // Define move handler
    function handleMouseMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Maintain aspect ratio (4:3)
      const aspectRatio = 4 / 3;
      let newWidth = Math.max(200, startWidth + deltaX);
      let newHeight = Math.max(150, newWidth / aspectRatio);
      
      // Update camera size
      const newSize = {
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      };
      
      setCameraSize(newSize);
      
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
  
  // Start drawing a line on the video
  const startLineDrawing = (e) => {
    if (!isCameraActive) return;
    
    const rect = cameraContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Mouse down at:', x, y, 'Rectangle:', rect.width, rect.height);
    console.log('Camera size:', cameraSize.width, cameraSize.height);
    
    // Calculate scale factors if the displayed size differs from the canvas size
    const scaleX = cameraSize.width / rect.width;
    const scaleY = cameraSize.height / rect.height;
    
    // Apply scaling
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    
    console.log('Scaled position:', scaledX, scaledY);
    
    // Constrain to video bounds
    const boundedX = Math.max(0, Math.min(scaledX, cameraSize.width));
    const boundedY = Math.max(0, Math.min(scaledY, cameraSize.height));
    
    console.log('Setting line start to:', boundedX, boundedY);
    setLineStart({ x: boundedX, y: boundedY });
    setLineEnd({ x: boundedX, y: boundedY }); // Initially same point
    setIsDrawingLine(true);
  };
  
  // Update line end position while dragging
  const updateLineDrawing = (e) => {
    if (!isDrawingLine) return;
    
    const rect = cameraContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // We ignore the y position from the mouse
    
    // Calculate scale factors if the displayed size differs from the canvas size
    const scaleX = cameraSize.width / rect.width;
    const scaleY = cameraSize.height / rect.height;
    
    // Apply scaling
    const scaledX = x * scaleX;
    // Use the y-coordinate from the start point
    const scaledY = lineStart.y;
    
    // Constrain to video bounds
    const boundedX = Math.max(0, Math.min(scaledX, cameraSize.width));
    
    setLineEnd({ x: boundedX, y: scaledY });
    
    // Draw the line in real-time while dragging
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(boundedX, scaledY);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'; // Bright red during drawing
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  
  // Complete line drawing
  const finishLineDrawing = () => {
    if (!isDrawingLine) return;
    
    console.log('Finishing line drawing. Line:', lineStart, lineEnd);
    
    // First store original line positions for transformations
    // Do this before changing isDrawingLine to avoid race conditions
    const originalStart = { ...lineStart };
    const originalEnd = { ...lineEnd };
    
    setOriginalLineStart(originalStart);
    setOriginalLineEnd(originalEnd);
    
    // Draw the line immediately
    if (canvasRef.current) {
      console.log('Drawing final line immediately');
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw a plain line immediately to ensure it's visible
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(lineEnd.x, lineEnd.y);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw some debug text to see if canvas is responsive
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText('Line drawn!', 50, 50);
    }
    
    // Then update state
    setIsDrawingLine(false);
    setIsLineDrawn(true);
    setIsExtracting(true); // Start extraction when line is drawn
    
    // Reset transformation values
    setLineYOffset(0);
    setLineXOffset(0);
    
    // Notify parent about line data
    if (onLineDataChange) {
      onLineDataChange({
        start: originalStart,
        end: originalEnd,
        yOffset: 0, // Reset on new line
        xOffset: 0
      });
    }
  };
  
  // Clear the drawn line
  const clearLine = () => {
    console.log('Clearing line');
    setIsLineDrawn(false);
    setIsExtracting(false); // Stop extraction when line is cleared
    
    // Reset all line adjustments
    setLineYOffset(0);
    setLineXOffset(0);
    
    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Notify parent about line clearing
    if (onLineDataChange) {
      onLineDataChange(null);
    }
  };
  
  // Draw the line on the canvas with current transformations
  const drawLine = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isLineDrawn) {
      console.log('Cannot draw line - canvas not ready or line not drawn');
      return;
    }
    
    // Log the current state
    console.log('DrawLine called, isLineDrawn:', isLineDrawn, 'isDrawingLine:', isDrawingLine);
    console.log('Canvas size:', canvas.width, canvas.height);
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate transformed line positions
    const transformedLine = calculateTransformedLinePosition();
    
    console.log('Drawing line from', transformedLine.start, 'to', transformedLine.end);
    
    // Set line style for maximum visibility
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    
    // Draw the line with a glow effect for better visibility
    // First draw a wider, blurred line for the glow
    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(transformedLine.start.x, transformedLine.start.y);
    ctx.lineTo(transformedLine.end.x, transformedLine.end.y);
    ctx.stroke();
    
    // Then draw the main line on top
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.beginPath();
    ctx.moveTo(transformedLine.start.x, transformedLine.start.y);
    ctx.lineTo(transformedLine.end.x, transformedLine.end.y);
    ctx.stroke();
    
    // Make endpoints more visible with larger circles
    // First draw a halo/glow effect
    ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(transformedLine.start.x, transformedLine.start.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(transformedLine.end.x, transformedLine.end.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Then draw the actual points
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
    ctx.beginPath();
    ctx.arc(transformedLine.start.x, transformedLine.start.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(transformedLine.end.x, transformedLine.end.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Add outline to circles for better visibility
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(transformedLine.start.x, transformedLine.start.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(transformedLine.end.x, transformedLine.end.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add labels for start/end points
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw "S" for start with stroke for visibility
    ctx.strokeText('S', transformedLine.start.x, transformedLine.start.y);
    ctx.fillText('S', transformedLine.start.x, transformedLine.start.y);
    
    // Draw "E" for end with stroke for visibility
    ctx.strokeText('E', transformedLine.end.x, transformedLine.end.y);
    ctx.fillText('E', transformedLine.end.x, transformedLine.end.y);
    
    // Calculate and draw perpendicular indicator (small line in the middle perpendicular to main line)
    const midX = (transformedLine.start.x + transformedLine.end.x) / 2;
    const midY = (transformedLine.start.y + transformedLine.end.y) / 2;
    
    // Calculate the perpendicular direction
    const dx = transformedLine.end.x - transformedLine.start.x;
    const dy = transformedLine.end.y - transformedLine.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0) {
      // Normalize and rotate 90 degrees
      const perpX = -dy / length * 20; // Increased length to 20px
      const perpY = dx / length * 20;
      
      // Draw perpendicular line with increased visibility
      ctx.beginPath();
      ctx.moveTo(midX - perpX, midY - perpY);
      ctx.lineTo(midX + perpX, midY + perpY);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)'; // Brighter cyan with higher opacity
      ctx.lineWidth = 3; // Increase width
      ctx.stroke();
    }
  };
  
  // Calculate transformed line position based on sliders
  const calculateTransformedLinePosition = () => {
    if (!isLineDrawn) {
      console.log('Not calculating transformed position - line not drawn');
      return { start: lineStart, end: lineEnd };
    }
    
    console.log('Calculating transformed line position');
    console.log('Original start:', originalLineStart, 'Original end:', originalLineEnd);
    console.log('Offsets:', lineXOffset, lineYOffset);

    // Calculate the line center
    const centerX = (originalLineStart.x + originalLineEnd.x) / 2;
    const centerY = (originalLineStart.y + originalLineEnd.y) / 2;
    
    // No longer need rotation calculations
    // Apply offsets directly to the original coordinates
    const transformedStart = {
      x: originalLineStart.x + lineXOffset,
      y: originalLineStart.y + lineYOffset
    };
    
    const transformedEnd = {
      x: originalLineEnd.x + lineXOffset,
      y: originalLineEnd.y + lineYOffset
    };
    
    const result = {
      start: transformedStart,
      end: transformedEnd
    };
    
    console.log('Transformed result:', result);
    return result;
  };
  
  // Handle line Y-offset adjustment
  const handleLineYOffsetChange = (e) => {
    const newOffset = parseInt(e.target.value);
    setLineYOffset(newOffset);
    drawLine();
    
    // Notify parent about line data change
    if (onLineDataChange && isLineDrawn) {
      onLineDataChange({
        start: lineStart,
        end: lineEnd,
        yOffset: newOffset,
        xOffset: lineXOffset
      });
    }
  };
  
  // Handle line X-offset adjustment
  const handleLineXOffsetChange = (e) => {
    const newOffset = parseInt(e.target.value);
    setLineXOffset(newOffset);
    drawLine();
    
    // Notify parent about line data change
    if (onLineDataChange && isLineDrawn) {
      onLineDataChange({
        start: lineStart,
        end: lineEnd,
        yOffset: lineYOffset,
        xOffset: newOffset
      });
    }
  };
  
  // Add effect to redraw line when parameters change
  useEffect(() => {
    if (isLineDrawn) {
      drawLine();
    }
  }, [isLineDrawn, lineYOffset, lineXOffset]);
  
  // Helper to update parent component with line data
  const updateParentLineData = () => {
    if (onLineDataChange && isLineDrawn) {
      onLineDataChange({
        start: lineStart,
        end: lineEnd,
        yOffset: lineYOffset,
        xOffset: lineXOffset
      });
    }
  };
  
  // Function to get pixels under the drawn line
  const getPixelsUnderLine = (start, end) => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Create a temporary hidden canvas to avoid disturbing the main display
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    // Draw the current video frame to the temp canvas (but don't display it)
    tempCtx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Calculate line points to sample
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const samples = Math.max(Math.ceil(distance), 1); // At least 1 sample
    
    // Initialize arrays for color data
    const redValues = [];
    const greenValues = [];
    const blueValues = [];
    const intensityValues = [];
    const positions = [];
    
    try {
      // Sample points along the line
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = Math.round(start.x + dx * t);
        const y = Math.round(start.y + dy * t);
        
        // Constrain to canvas boundaries
        const boundedX = Math.max(0, Math.min(x, tempCanvas.width - 1));
        const boundedY = Math.max(0, Math.min(y, tempCanvas.height - 1));
        
        // Get pixel data at this position from the temp canvas
        const pixelData = tempCtx.getImageData(boundedX, boundedY, 1, 1).data;
        const [r, g, b] = pixelData;
        
        // Calculate intensity as simple float average (not weighted)
        const intensity = parseFloat((r + g + b) / 3);
        
        // Store values
        redValues.push(r);
        greenValues.push(g);
        blueValues.push(b);
        intensityValues.push(intensity);
        positions.push(i / samples); // Normalized position along line (0-1)
      }
      
      // Clean up temporary canvas
      tempCanvas.remove();
      
      // Return structured data
      return {
        timestamp: Date.now(),
        positions,
        red: redValues,
        green: greenValues,
        blue: blueValues,
        intensity: intensityValues,
        lineLength: distance
      };
    } catch (error) {
      console.error('Error extracting pixel data:', error);
      tempCanvas.remove();
      return null;
    }
  };
  
  // Create a slider for a capability
  const renderCapabilitySlider = (capability, value, onChange, label, unit = '') => {
    if (!cameraCapabilities || !cameraCapabilities[capability] || value === null) {
      return null;
    }
    
    const capabilityInfo = cameraCapabilities[capability];
    // Ensure we get the step from capabilities or default to 1
    const { min, max, step = 1 } = capabilityInfo;
    
    // For exposure time, show the current mode
    const showModeIndicator = capability === 'exposureTime';
    
    // Use step attribute directly from capabilities
    return (
      <div style={styles.controlRow}>
        <label style={styles.controlLabel}>
          {label}:
          {showModeIndicator && (
            <span style={{
              fontSize: '9px',
              display: 'block',
              color: exposureMode === 'manual' ? '#ff9800' : '#4CAF50'
            }}>
              {exposureMode === 'manual' ? 'MANUAL' : 'AUTO'}
            </span>
          )}
        </label>
        <input 
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          style={{
            ...styles.slider,
            accentColor: exposureMode === 'manual' && capability === 'exposureTime' ? '#ff9800' : undefined
          }}
          disabled={!isCameraActive}
        />
        <span style={styles.value}>
          {typeof value === 'number' ? 
            step >= 1 ? value.toFixed(0) : value.toFixed(2) : value}
          {unit}
        </span>
        {showModeIndicator && cameraCapabilities.exposureMode?.includes('continuous') && (
          <button
            style={{
              ...buttonVariants.smallIconButton,
              padding: '2px 4px',
              fontSize: '10px',
              backgroundColor: exposureMode === 'manual' ? 'rgba(255, 152, 0, 0.5)' : 'rgba(76, 175, 80, 0.5)'
            }}
            onClick={() => {
              const newMode = exposureMode === 'manual' ? 'continuous' : 'manual';
              setExposureMode(newMode);
              console.log(`Toggled exposure mode to: ${newMode}`);
            }}
            title={`Click to switch to ${exposureMode === 'manual' ? 'auto' : 'manual'} exposure`}
          >
            {exposureMode === 'manual' ? 'AUTO' : 'MANUAL'}
          </button>
        )}
      </div>
    );
  };
  
  // Format capability value for display
  const formatCapabilityValue = (value) => {
    if (value === undefined || value === null) return 'N/A';
    
    if (typeof value === 'object') {
      if (value.min !== undefined && value.max !== undefined) {
        return `${value.min} to ${value.max}${value.step ? ` (step: ${value.step})` : ''}`;
      }
      return JSON.stringify(value);
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return value.toString();
  };
  
  // Render a table of camera capabilities
  const renderCapabilitiesTable = () => {
    if (!cameraCapabilities) {
      return <div>No capabilities information available</div>;
    }
    
    // Filter out common capabilities that are already exposed in the UI
    const commonCapabilities = ['width', 'height', 'deviceId', 'groupId'];
    const advancedCapabilities = Object.keys(cameraCapabilities)
      .filter(key => !commonCapabilities.includes(key))
      .sort();
    
    if (advancedCapabilities.length === 0) {
      return <div>No advanced capabilities exposed by this camera</div>;
    }
    
    return (
      <div style={styles.capabilitiesTable}>
        <h4 style={styles.capabilitiesTitle}>Camera Capabilities</h4>
        <div style={styles.scrollContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Parameter</th>
                <th style={styles.th}>Supported Values</th>
              </tr>
            </thead>
            <tbody>
              {advancedCapabilities.map(key => (
                <tr key={key} style={styles.tr}>
                  <td style={styles.td}>{key}</td>
                  <td style={styles.td}>{formatCapabilityValue(cameraCapabilities[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Add a dedicated useEffect for periodic forced redraw to ensure line visibility
  useEffect(() => {
    if (!isLineDrawn || !isCameraActive) return;
    
    console.log('Setting up periodic redraw interval');
    
    // Force redraw every 500ms as a backup to ensure line remains visible
    const intervalId = setInterval(() => {
      if (isLineDrawn && canvasRef.current) {
        console.log('Forced periodic redraw');
        drawLine();
      }
    }, 500);
    
    return () => {
      console.log('Clearing periodic redraw interval');
      clearInterval(intervalId);
    };
  }, [isLineDrawn, isCameraActive]);
  
  const styles = {
    container: {
      flex: '0 0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '10px',
      borderRadius: '4px',
      position: 'relative',
      border: isResizing ? '1px dashed #4CAF50' : 'none',
    },
    title: {
      margin: '0 0 10px 0',
      fontSize: '14px'
    },
    cameraSelect: {
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    selectLabel: {
      fontSize: '12px',
      minWidth: '60px'
    },
    select: {
      flex: 1,
      backgroundColor: 'rgba(30, 30, 30, 0.8)',
      color: 'white',
      border: '1px solid rgba(80, 80, 80, 0.5)',
      borderRadius: '3px',
      padding: '4px 8px',
      fontSize: '12px'
    },
    cameraView: {
      width: `${cameraSize.width}px`,
      height: `${cameraSize.height}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      position: 'absolute',
      top: 0,
      left: 0
    },
    canvas: {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none', // Allow clicks to pass through to video
      zIndex: 10
    },
    buttonRow: {
      marginTop: '5px',
      display: 'flex',
      gap: '5px',
      flexWrap: 'wrap'
    },
    lineControls: {
      marginTop: '10px',
      padding: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '4px',
      display: isLineDrawn ? 'block' : 'none'
    },
    controlRow: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '8px',
      gap: '8px'
    },
    controlLabel: {
      fontSize: '12px',
      minWidth: '60px'
    },
    slider: {
      flex: 1
    },
    value: {
      fontSize: '12px',
      minWidth: '30px',
      textAlign: 'right'
    },
    settingsButton: {
      marginLeft: 'auto'
    },
    cameraSettings: {
      marginTop: '10px',
      padding: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '4px',
      display: showCameraSettings ? 'block' : 'none'
    },
    resizeHandle: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: '20px',
      height: '20px',
      cursor: 'nwse-resize',
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
    capabilitiesTable: {
      marginTop: '10px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      paddingTop: '10px'
    },
    capabilitiesTitle: {
      fontSize: '13px',
      margin: '0 0 8px 0'
    },
    scrollContainer: {
      maxHeight: '200px',
      overflowY: 'auto',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '3px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '11px'
    },
    th: {
      padding: '4px 8px',
      textAlign: 'left',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      backgroundColor: 'rgba(20, 20, 20, 0.8)'
    },
    tr: {
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    },
    td: {
      padding: '4px 8px',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    advancedToggle: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '12px',
      padding: '6px 0',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      userSelect: 'none'
    },
    toggleIcon: {
      marginRight: '6px',
      transform: showAdvancedCapabilities ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }
  };
  
  // Fix the function that handles the Extract button state change
  const handleExtractToggle = () => {
    setIsExtracting(!isExtracting);
    
    // Force redraw the line immediately after toggling extraction
    // to ensure it remains visible
    if (isLineDrawn) {
      setTimeout(() => {
        console.log('Redrawing line after extraction toggle');
        drawLine();
      }, 0);
    }
  };

  // Camera controls section
  const renderCameraControls = () => {
    return (
      <div style={styles.buttonRow}>
        {!isCameraActive ? (
          <button 
            style={buttonVariants.smallPrimary}
            onClick={startCamera}
            disabled={!selectedCamera}
          >
            Start Camera
          </button>
        ) : (
          <button 
            style={buttonVariants.smallSecondary}
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        )}
        
        {isCameraActive && (
          <>
            {isLineDrawn ? (
              <>
                <button 
                  style={buttonVariants.smallSecondary}
                  onClick={clearLine}
                >
                  Clear Line
                </button>
                <button 
                  style={{
                    ...buttonVariants.smallSecondary,
                    backgroundColor: isExtracting ? 'rgba(255, 0, 0, 0.5)' : undefined
                  }}
                  onClick={handleExtractToggle} // Use new handler function
                  title={isExtracting ? "Stop extracting data" : "Start extracting data"}
                >
                  {isExtracting ? "Stop Extract" : "Start Extract"}
                </button>
              </>
            ) : (
              <button 
                style={buttonVariants.smallSecondary}
                disabled={isDrawingLine}
                title="Click and drag on video to draw a line"
              >
                Draw Line
              </button>
            )}
            
            <button 
              style={{
                ...buttonVariants.smallSecondary,
                ...styles.settingsButton,
                backgroundColor: showCameraSettings ? 'rgba(0, 150, 150, 0.7)' : undefined
              }}
              onClick={() => setShowCameraSettings(!showCameraSettings)}
            >
              ⚙️ Camera Settings
            </button>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Camera Feed</h3>
      
      {/* Camera selection */}
      <div style={styles.cameraSelect}>
        <label style={styles.selectLabel}>Camera:</label>
        <select 
          value={selectedCamera}
          onChange={handleCameraChange}
          style={styles.select}
          disabled={isCameraActive}
        >
          {availableCameras.length === 0 && (
            <option value="">No cameras found</option>
          )}
          {availableCameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId.slice(0, 5)}...`}
            </option>
          ))}
        </select>
      </div>
      
      {/* Camera view with line drawing capability */}
      <div 
        ref={cameraContainerRef}
        style={styles.cameraView}
        onMouseDown={isCameraActive ? startLineDrawing : undefined}
        onMouseMove={isCameraActive ? updateLineDrawing : undefined}
        onMouseUp={isCameraActive ? finishLineDrawing : undefined}
        onMouseLeave={isCameraActive ? finishLineDrawing : undefined}
      >
        {!isCameraActive && (
          <div>Camera feed will appear here</div>
        )}
        
        <video 
          ref={videoRef}
          style={{
            ...styles.video,
            display: isCameraActive ? 'block' : 'none'
          }}
          playsInline
          muted
        />
        
        <canvas 
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 30, // Increase z-index further
            pointerEvents: 'none' // Allow clicks to pass through
          }}
          width={cameraSize.width}
          height={cameraSize.height}
        />
        
        {/* Drawing mode indicator */}
        {isCameraActive && !isLineDrawn && !isDrawingLine && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 25,
            pointerEvents: 'none'
          }}>
            Click and drag to draw a line
          </div>
        )}
        
        {/* Line drawing indicator */}
        {isDrawingLine && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 255, 0, 0.8)',
            color: 'black',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 25,
            pointerEvents: 'none'
          }}>
            Drawing line...
          </div>
        )}
        
        {/* Resize info overlay */}
        {showResizeInfo && (
          <div style={styles.resizeInfo}>
            {cameraSize.width} × {cameraSize.height}
          </div>
        )}
        
        {/* Resize handle */}
        <div 
          style={styles.resizeHandle}
          onMouseDown={handleResizeStart}
          title="Resize camera view"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path 
              d="M9,3 L3,9 M11,5 L5,11 M11,8 L8,11" 
              stroke="white" 
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      
      {/* Camera controls */}
      {renderCameraControls()}
      
      {/* Line adjustment controls */}
      {isLineDrawn && (
        <div style={styles.lineControls}>
          <div style={styles.controlRow}>
            <label style={styles.controlLabel}>Y Offset:</label>
            <input 
              type="range"
              min="-50"
              max="50"
              value={lineYOffset}
              onChange={handleLineYOffsetChange}
              style={styles.slider}
            />
            <span style={styles.value}>{lineYOffset}px</span>
          </div>
          
          <div style={styles.controlRow}>
            <label style={styles.controlLabel}>X Offset:</label>
            <input 
              type="range"
              min="-50"
              max="50"
              value={lineXOffset}
              onChange={handleLineXOffsetChange}
              style={styles.slider}
            />
            <span style={styles.value}>{lineXOffset}px</span>
          </div>
        </div>
      )}
      
      {/* Camera settings */}
      <div style={styles.cameraSettings}>
        <div style={styles.controlRow}>
          <label style={styles.controlLabel}>Resolution:</label>
          <select 
            value={cameraResolution}
            onChange={(e) => setCameraResolution(e.target.value)}
            style={styles.select}
            disabled={isCameraActive}
          >
            <option value="320x240">320x240</option>
            <option value="640x480">640x480</option>
            <option value="1280x720">1280x720 (HD)</option>
            <option value="1920x1080">1920x1080 (Full HD)</option>
          </select>
        </div>
        
        {/* Dynamic sliders based on camera capabilities */}
        {renderCapabilitySlider(
          'exposureTime', 
          cameraExposureTime, 
          handleExposureTimeChange, 
          'Exposure', 
          'ms'
        )}
        
        {renderCapabilitySlider(
          'brightness', 
          cameraBrightness, 
          handleBrightnessChange, 
          'Brightness'
        )}
        
        {renderCapabilitySlider(
          'exposureCompensation', 
          cameraGain, 
          handleGainChange, 
          'Gain'
        )}
        
        {/* Add a message if no adjustable settings are available */}
        {isCameraActive && 
         !cameraCapabilities?.exposureTime && 
         !cameraCapabilities?.brightness && 
         !cameraCapabilities?.exposureCompensation && (
          <div style={{ textAlign: 'center', padding: '10px', opacity: 0.7 }}>
            No adjustable camera parameters available
          </div>
        )}
        
        <button 
          style={{ ...buttonVariants.smallPrimary, width: '100%', marginTop: '8px' }}
          onClick={applyCameraSettings}
          disabled={!isCameraActive}
        >
          Apply Settings
        </button>
        
        {isCameraActive && cameraCapabilities && (
          <div 
            style={styles.advancedToggle}
            onClick={() => setShowAdvancedCapabilities(!showAdvancedCapabilities)}
          >
            <span style={styles.toggleIcon}>▶</span>
            <span>{showAdvancedCapabilities ? "Hide Camera Capabilities" : "Show Camera Capabilities"}</span>
          </div>
        )}
        
        {isCameraActive && showAdvancedCapabilities && renderCapabilitiesTable()}
      </div>
    </div>
  );
});

// Add display name for debugging
CameraComponent.displayName = 'CameraComponent';

export default CameraComponent; 