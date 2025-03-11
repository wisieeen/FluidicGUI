import React, { useState, useEffect, useRef } from 'react';
import DraggablePanel from './DraggablePanel';
import VideoControlPanel from './VideoControlPanel';
import GraphWaterfallPanel from './GraphWaterfallPanel';
import { convertDetectorReading, analyzeDetectorData, analyzeVideoFrame } from '../../utils/detectorCalculations';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../styles/backgroundStyles';
import styles from './styles/DetectorPanelStyles';

const DetectorPanel = ({ detector, onClose, readings = [], initialPosition = { x: 20, y: 80 } }) => {
  const buttonVariants = useButtonStyles();
  const [detectorReadings, setDetectorReadings] = useState([]);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);
  const [analysisType, setAnalysisType] = useState('color');
  const [videoAnalysisResults, setVideoAnalysisResults] = useState(null);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const [videoSize, setVideoSize] = useState({ width: 320, height: 240 });
  const [isResizing, setIsResizing] = useState(false);
  const [showResizeInfo, setShowResizeInfo] = useState(false);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStart, setLineStart] = useState({ x: 0, y: 0 });
  const [lineEnd, setLineEnd] = useState({ x: 0, y: 0 });
  const [lineProfileData, setLineProfileData] = useState(null);
  const [isLineDrawn, setIsLineDrawn] = useState(false);
  const [lineColor, setLineColor] = useState('rgb(255, 255, 0)');
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 320, height: 240 });
  const videoContainerRef = useRef(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  
  const lineOverlayRef = useRef(null);
  const lineProfileCanvasRef = useRef(null);
  
  const [normalizeAllChannels, setNormalizeAllChannels] = useState(true);
  const [integrationCount, setIntegrationCount] = useState(1);
  const [sampleHistory, setSampleHistory] = useState([]);
  const [backgroundData, setBackgroundData] = useState(null);
  const [useBackgroundCorrection, setUseBackgroundCorrection] = useState(false);
  
  // Camera settings
  const [cameraResolution, setCameraResolution] = useState('320x240');
  const [cameraShutterSpeed, setCameraShutterSpeed] = useState(0); // Auto
  const [cameraGain, setCameraGain] = useState(0); // Auto
  
  // UI visibility settings
  const [showManagementMenu, setShowManagementMenu] = useState(false);
  const [showRedLine, setShowRedLine] = useState(true);
  const [showGreenLine, setShowGreenLine] = useState(true);
  const [showBlueLine, setShowBlueLine] = useState(true);
  const [showIntensityLine, setShowIntensityLine] = useState(true);
  const [showVideoFeed, setShowVideoFeed] = useState(true);
  
  // Add state for stable y-axis scaling
  const [yAxisMax, setYAxisMax] = useState(255); // Default max value for RGB
  const [stabilizeYAxis, setStabilizeYAxis] = useState(true); // Default to stable y-axis
  
  // Add state for panel size
  const [panelSize, setPanelSize] = useState({ width: 800, height: 600 });
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const panelRef = useRef(null);
  
  // Add state for graph size
  const [graphSize, setGraphSize] = useState({ width: videoSize.width, height: 100 });
  const [isResizingGraph, setIsResizingGraph] = useState(false);
  const graphContainerRef = useRef(null);
  
  // Add state for waterfall display
  const [showWaterfall, setShowWaterfall] = useState(false);
  const [waterfallHistory, setWaterfallHistory] = useState([]);
  const [waterfallMaxHistory, setWaterfallMaxHistory] = useState(50); // Number of history lines to keep
  const waterfallCanvasRef = useRef(null);
  
  // Add state for waterfall update settings
  const [waterfallUpdateMode, setWaterfallUpdateMode] = useState('integration'); // 'integration', 'periodic'
  const [waterfallUpdateInterval, setWaterfallUpdateInterval] = useState(1000); // ms
  const waterfallIntervalRef = useRef(null);
  
  // Add state for line positioning and rotation
  const [lineYOffset, setLineYOffset] = useState(0);
  const [lineRotation, setLineRotation] = useState(0); // in degrees
  const [originalLineStart, setOriginalLineStart] = useState({ x: 0, y: 0 });
  const [originalLineEnd, setOriginalLineEnd] = useState({ x: 0, y: 0 });
  
  // Add state for fine tuning
  const [fineYOffset, setFineYOffset] = useState(0);
  const [fineRotation, setFineRotation] = useState(0);
  
  useEffect(() => {
    // Process readings when they change
    if (readings && readings.length > 0 && detector?.data?.properties) {
      const processedReadings = readings.map(reading => 
        convertDetectorReading(reading, detector.data.properties)
      );
      setDetectorReadings(processedReadings);
    }
  }, [readings, detector]);
  
  // Get available cameras on component mount
  useEffect(() => {
    const getAvailableCameras = async () => {
      console.log('Attempting to get available cameras...');
      
      // Check if we're in a secure context (needed for camera access in some browsers)
      if (window.isSecureContext === false) {
        console.error('Not in a secure context, camera API may not be available');
        alert('This page must be accessed via HTTPS for camera functionality to work. Please use a secure connection.');
        setIsCameraSupported(false);
        return;
      }
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API is not supported in this browser');
        setIsCameraSupported(false);
        alert('Camera access is not supported in this browser. Please try using a modern browser like Chrome, Firefox, or Edge.');
        return;
      }
      
      try {
        // Request permission to camera first - this is necessary to get device labels
        console.log('Requesting camera permission...');
        await navigator.mediaDevices.getUserMedia({ video: true })
          .then(tempStream => {
            console.log('Camera permission granted, stopping temporary stream');
            // Stop the temporary stream immediately
            tempStream.getTracks().forEach(track => track.stop());
            
            // Now enumerate devices after getting permission
            console.log('Enumerating devices...');
            return navigator.mediaDevices.enumerateDevices();
          })
          .then(devices => {
            console.log('All devices:', devices);
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            console.log('Found video devices:', videoDevices);
            
            if (videoDevices.length === 0) {
              console.warn('No video devices found');
            }
            
            setAvailableCameras(videoDevices);
            
            // Select first camera by default if available
            if (videoDevices.length > 0) {
              setSelectedCamera(videoDevices[0].deviceId);
            }
          });
      } catch (error) {
        console.error('Error accessing camera devices:', error);
        // Show a meaningful message to the user
        if (error.name === 'NotAllowedError') {
          alert('Camera access was denied. Please allow camera access to use this feature.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera found on your device.');
        } else {
          alert(`Error accessing camera: ${error.message}`);
        }
      }
    };
    
    getAvailableCameras();
    
    // Cleanup function to stop video stream when component unmounts
    return () => {
      stopCamera();
    };
  }, []);
  
  // Fix canvas initialization
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoSize.width;
      canvas.height = videoSize.height;
      canvasRef.current = canvas;
    } else {
      // Update canvas size when video size changes
      canvasRef.current.width = videoSize.width;
      canvasRef.current.height = videoSize.height;
    }
    
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [videoSize.width, videoSize.height]);
  
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
      
      // Update canvas size if analysis is active
      if (canvasRef.current) {
        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;
      }
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
  }, [isResizing]);
  
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...videoSize };
  };
  
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
      
      console.log('Starting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Explicitly start playing the video
        await videoRef.current.play();
        console.log('Video playback started');
      }
      
      setIsCameraActive(true);
      
      // Get actual resolution from video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('Actual camera settings:', settings);
        if (settings.width && settings.height) {
          setCameraResolution(`${settings.width}x${settings.height}`);
          setVideoSize({ width: settings.width, height: settings.height });
        }
      }
      
      // Force an initial extraction if a line is already drawn
      if (isLineDrawn) {
        setTimeout(() => {
          console.log('Initial extraction after camera start');
          extractLineProfile();
        }, 200);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      setIsCameraActive(false);
      
      // Provide useful error messages
      if (error.name === 'NotFoundError') {
        alert('The selected camera could not be found. It may have been disconnected.');
        
        // Refresh the camera list
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        } else {
          setSelectedCamera('');
        }
      } else if (error.name === 'NotAllowedError') {
        alert('Camera access was denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotReadableError') {
        alert('The camera is in use by another application. Please close other applications that might be using the camera.');
      } else {
        alert(`Error starting camera: ${error.message}`);
      }
    }
  };
  
  const stopCamera = () => {
    stopVideoAnalysis();
    
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
  
  const startVideoAnalysis = () => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) return;
    
    // Stop any existing analysis
    stopVideoAnalysis();
    
    // Start new analysis interval
    analysisIntervalRef.current = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Draw current video frame to canvas
        ctx.drawImage(
          videoRef.current, 
          0, 0, 
          canvas.width, 
          canvas.height
        );
        
        // Analyze the frame
        const results = analyzeVideoFrame(canvas, { analysisType });
        setVideoAnalysisResults(results);
      }
    }, 500); // Analyze every 500ms
    
    setIsAnalysisActive(true);
  };
  
  const stopVideoAnalysis = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    setIsAnalysisActive(false);
  };
  
  const handleCameraChange = (e) => {
    const newCameraId = e.target.value;
    setSelectedCamera(newCameraId);
    
    // If camera is already active, restart with new camera
    if (isCameraActive) {
      stopCamera();
      // Small delay to ensure camera is properly stopped
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };
  
  const handleAnalysisTypeChange = (e) => {
    const newType = e.target.value;
    setAnalysisType(newType);
    
    // Restart analysis if it's active
    if (isAnalysisActive) {
      stopVideoAnalysis();
      setTimeout(() => {
        startVideoAnalysis();
      }, 100);
    }
  };
  
  const renderVideoAnalysisResults = () => {
    if (!videoAnalysisResults) return <div style={styles.noAnalysis}>No analysis data</div>;
    
    if (videoAnalysisResults.type === 'color') {
      const { avgRed, avgGreen, avgBlue, brightness } = videoAnalysisResults;
      return (
        <div style={styles.analysisResults}>
          <div style={styles.colorBox}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: `rgb(${Math.round(avgRed)}, ${Math.round(avgGreen)}, ${Math.round(avgBlue)})`,
              border: '1px solid #666'
            }}></div>
          </div>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>R:</span>
            <span style={styles.propertyValue}>{Math.round(avgRed)}</span>
          </div>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>G:</span>
            <span style={styles.propertyValue}>{Math.round(avgGreen)}</span>
          </div>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>B:</span>
            <span style={styles.propertyValue}>{Math.round(avgBlue)}</span>
          </div>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>Brightness:</span>
            <span style={styles.propertyValue}>{Math.round(brightness * 100)}%</span>
          </div>
        </div>
      );
    } else if (videoAnalysisResults.type === 'motion') {
      return (
        <div style={styles.analysisResults}>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>Motion:</span>
            <span style={styles.propertyValue}>
              {videoAnalysisResults.motionDetected ? 'Detected' : 'None'}
            </span>
          </div>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>Level:</span>
            <span style={styles.propertyValue}>
              {Math.round(videoAnalysisResults.motionLevel * 100)}%
            </span>
          </div>
        </div>
      );
    } else if (videoAnalysisResults.type === 'particle') {
      return (
        <div style={styles.analysisResults}>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>Particles:</span>
            <span style={styles.propertyValue}>
              {videoAnalysisResults.particleCount}
            </span>
          </div>
        </div>
      );
    }
    
    return <div style={styles.noAnalysis}>Unknown analysis type</div>;
  };
  
  // Function to check camera permissions status
  const checkCameraPermissions = async () => {
    try {
      // Try to query permission status if the API is available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' });
        console.log('Camera permission status:', result.state);
        
        if (result.state === 'denied') {
          alert('Camera access is blocked. Please update your browser settings to allow camera access.');
          return false;
        } else if (result.state === 'prompt') {
          alert('You will be prompted for camera permission.');
        }
        return result.state === 'granted';
      } else {
        // Fallback to requesting access directly
        console.log('Permissions API not available, attempting direct access');
        return true;
      }
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  };

  // Add a retry button that does a more thorough check
  const retryWithPermissionCheck = async () => {
    // First check permissions
    const hasPermission = await checkCameraPermissions();
    
    // If permission is available or we can't determine, try to access cameras
    if (hasPermission !== false) {
      try {
        console.log('Requesting camera access...');
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('Camera access granted, stopping temporary stream');
        tempStream.getTracks().forEach(track => track.stop());
        
        console.log('Enumerating devices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('All devices:', devices);
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Found video devices:', videoDevices);
        
        setAvailableCameras(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
          return true;
        } else {
          console.warn('No video devices found after permission granted');
          alert('No cameras detected on your device, even after permission was granted.');
          return false;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        
        if (error.name === 'NotAllowedError') {
          alert('Camera access was denied. Please allow camera access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera was found on your device.');
        } else if (error.name === 'NotReadableError') {
          alert('The camera is in use by another application. Please close other applications that might be using the camera.');
        } else {
          alert(`Camera access error: ${error.message}`);
        }
        return false;
      }
    }
    return false;
  };
  
  // Update the startLineDrawing function to log initial coordinates
  const startLineDrawing = (e) => {
    if (!isCameraActive || !videoRef.current) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
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
  
  // Update the updateLineDrawing function to log coordinates during drag
  const updateLineDrawing = (e) => {
    if (!isDrawingLine) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain to video bounds
    const boundedX = Math.max(0, Math.min(x, videoSize.width));
    const boundedY = Math.max(0, Math.min(y, videoSize.height));
    
    setLineEnd({ x: boundedX, y: boundedY });
    
    // Uncomment this to log every movement (can be very verbose)
    // console.log(`Line current end: (${Math.round(boundedX)}, ${Math.round(boundedY)})`);
  };
  
  // Update the finishLineDrawing function to log final coordinates
  const finishLineDrawing = () => {
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
  
  // Cancel line drawing on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawingLine) {
        setIsDrawingLine(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawingLine]);
  
  // Modify extractLineProfile to handle integration of multiple samples
  const extractLineProfile = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.warn('Cannot extract line profile: video or canvas ref is null');
      return;
    }
    
    if (!videoRef.current.readyState || videoRef.current.readyState < 2) {
      console.log('Video not ready for capture yet, readyState:', videoRef.current.readyState);
      return;
    }
    
    console.log(`Extracting line profile data | Video visible: ${showVideoFeed} | Camera active: ${isCameraActive}`);
    
    console.log(`Extracting line profile data for line: (${Math.round(lineStart.x)}, ${Math.round(lineStart.y)}) to (${Math.round(lineEnd.x)}, ${Math.round(lineEnd.y)})`);
    console.log(`Integration count: ${integrationCount}`);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    try {
      // Draw current video frame to canvas
      ctx.drawImage(
        videoRef.current, 
        0, 0, 
        canvas.width, 
        canvas.height
      );
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate points along the line (Bresenham's algorithm)
      const points = getPointsOnLine(
        Math.round(lineStart.x), 
        Math.round(lineStart.y), 
        Math.round(lineEnd.x), 
        Math.round(lineEnd.y)
      );
      
      if (points.length === 0) {
        console.warn('No points generated for line');
        return;
      }
      
      console.log(`Generated ${points.length} points along line`);
      
      // Extract RGB values for each point
      const currentSample = points.map((point, index) => {
        // Make sure point is within canvas bounds
        if (point.x < 0 || point.x >= canvas.width || point.y < 0 || point.y >= canvas.height) {
          return {
            position: point.distance,
            r: 0, g: 0, b: 0,
            intensity: 0
          };
        }
        
        const pixelIndex = (point.y * imageData.width + point.x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const intensity = r + g + b;
        
        return {
          position: point.distance, // Distance from start
          r, g, b,
          intensity
        };
      });
      
      // Add current sample to history, maintaining max history length
      const newHistory = [...sampleHistory, currentSample];
      if (newHistory.length > integrationCount) {
        newHistory.splice(0, newHistory.length - integrationCount);
      }
      setSampleHistory(newHistory);
      
      // Integrate samples based on history
      let profileData;
      if (newHistory.length > 1) {
        // Create integrated profile by averaging across samples
        profileData = currentSample.map((_, pointIndex) => {
          // Extract all samples for this point position
          const samples = newHistory
            .map(sample => sample[pointIndex])
            .filter(sample => sample); // Filter out any undefined samples
          
          if (samples.length === 0) return null;
          
          // Calculate average values across samples
          const sumR = samples.reduce((sum, s) => sum + s.r, 0);
          const sumG = samples.reduce((sum, s) => sum + s.g, 0);
          const sumB = samples.reduce((sum, s) => sum + s.b, 0);
          const sumIntensity = samples.reduce((sum, s) => sum + s.intensity, 0);
          
          // Use position from current sample
          return {
            position: currentSample[pointIndex].position,
            r: sumR / samples.length,
            g: sumG / samples.length,
            b: sumB / samples.length,
            intensity: sumIntensity / samples.length
          };
        }).filter(p => p !== null); // Remove any null entries
        
        console.log(`Integrated ${newHistory.length} samples (max: ${integrationCount})`);
        console.log('Note: Using sum of RGB for intensity calculation');
      } else {
        // Just use current sample if no history yet
        profileData = currentSample;
        console.log('Using single sample (no history yet)');
        console.log('Note: Using sum of RGB for intensity calculation');
      }
      
      // Apply background correction if enabled and background data exists
      let displayData = profileData;
      if (useBackgroundCorrection && backgroundData) {
        // Create new array with corrected values (Ic = Ip/Ib)
        displayData = profileData.map((point, index) => {
          // Find matching background point by position
          const bgPoint = backgroundData.find(bg => 
            Math.abs(bg.position - point.position) < 0.01
          );
          
          if (!bgPoint) {
            return point; // No matching background point, use original
          }
          
          // Calculate ratios (protect against division by zero)
          const rRatio = bgPoint.r > 0 ? point.r / bgPoint.r : point.r;
          const gRatio = bgPoint.g > 0 ? point.g / bgPoint.g : point.g;
          const bRatio = bgPoint.b > 0 ? point.b / bgPoint.b : point.b;
          const intensityRatio = bgPoint.intensity > 0 ? 
            point.intensity / bgPoint.intensity : point.intensity;
          
          return {
            position: point.position,
            r: rRatio,
            g: gRatio,
            b: bRatio,
            intensity: intensityRatio,
            // Keep original values for reference
            originalR: point.r,
            originalG: point.g,
            originalB: point.b,
            originalIntensity: point.intensity
          };
        });
        
        console.log('Applied background correction (using sum of RGB for intensity)');
      }
      
      // Create table data for console with conditional formatting
      const tableData = displayData.map((data, index) => {
        const point = points[index];
        return {
          point: index + 1,
          position: data.position.toFixed(3), 
          x: Math.round(point.x),
          y: Math.round(point.y),
          R: data.r.toFixed(3),
          G: data.g.toFixed(3),
          B: data.b.toFixed(3),
          Intensity: data.intensity.toFixed(3),
          // Show original values if background correction is enabled
          ...(useBackgroundCorrection && {
            OrigR: data.originalR?.toFixed(1),
            OrigG: data.originalG?.toFixed(1),
            OrigB: data.originalB?.toFixed(1),
            OrigI: data.originalIntensity?.toFixed(1)
          })
        };
      });
      
      // Log as table for better readability
      console.table(tableData);
      
      // Use the displayData for rendering
      setLineProfileData(displayData);
      
      // Draw the graph with the display data
      if (lineProfileCanvasRef.current) {
        console.log('Drawing line profile graph');
        setTimeout(() => {
          drawLineProfileGraph(displayData);
        }, 10);
      } else {
        console.warn('Line profile canvas ref is null');
      }
      
      // After setting lineProfileData, update waterfall history if enabled
      if (showWaterfall && displayData && displayData.length > 0 && waterfallUpdateMode === 'integration') {
        // Add current data to history
        const newHistory = [...waterfallHistory, displayData];
        
        // Limit history length
        if (newHistory.length > waterfallMaxHistory) {
          newHistory.shift(); // Remove oldest entry
        }
        
        setWaterfallHistory(newHistory);
        
        // Note: The waterfall drawing is now handled in GraphWaterfallPanel
      }
    } catch (error) {
      console.error('Error extracting line profile:', error);
    }
  };
  
  // Get points that lie on the line using Bresenham's algorithm
  const getPointsOnLine = (x0, y0, x1, y1) => {
    const points = [];
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    // Calculate line length for normalization
    const lineLength = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
    
    console.log(`Line length: ${lineLength} pixels`);
    if (lineLength === 0) {
      console.warn('Zero-length line detected, adding small offset');
      return [{ x: x0, y: y0, distance: 0 }, { x: x0+1, y: y0+1, distance: 1 }];
    }
    
    let totalDistance = 0;
    
    let x = x0;
    let y = y0;
    
    while (true) {
      // Calculate distance from start (normalized 0-1)
      const distance = totalDistance / lineLength;
      
      points.push({ 
        x, 
        y,
        distance: distance 
      });
      
      if (x === x1 && y === y1) break;
      
      const e2 = 2 * err;
      
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
      
      // Update total distance - calculate Euclidean distance from start
      totalDistance = Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2));
    }
    
    // Ensure we have at least some points
    if (points.length === 0) {
      console.warn('No points generated in getPointsOnLine');
      return [{ x: x0, y: y0, distance: 0 }, { x: x1, y: y1, distance: 1 }];
    }
    
    // Double-check that distances are normalized properly
    // Last point should always have distance of 1
    if (points.length > 1 && Math.abs(points[points.length-1].distance - 1) > 0.01) {
      console.warn('Last point distance is not 1, normalizing manually');
      // Re-normalize all distances
      const lastDist = points[points.length-1].distance;
      points.forEach(p => {
        p.distance = p.distance / lastDist;
      });
    }
    
    return points;
  };
  
  // Modify the drawLineProfileGraph function to properly respect visibility settings
  const drawLineProfileGraph = (profileData) => {
    const visibilitySettings = {
      red: showRedLine,
      green: showGreenLine, 
      blue: showBlueLine,
      intensity: showIntensityLine
    };
    
    // Use our helper function to do the actual drawing
    drawLineProfileGraphWithSettings(profileData, visibilitySettings);
  };
  
  // Add a helper function that draws with explicit visibility settings
  const drawLineProfileGraphWithSettings = (profileData, visibilitySettings) => {
    if (!lineProfileCanvasRef.current || !profileData || profileData.length === 0) {
      console.warn('Cannot draw graph: missing canvas or data');
      return;
    }
    
    console.log(`Drawing graph with ${profileData.length} data points`);
    console.log('Using explicit visibility settings:', visibilitySettings);
    
    const canvas = lineProfileCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up graph dimensions
    const graphHeight = canvas.height - 20; // Leave space for labels
    const graphWidth = canvas.width - 20; // Leave space for y-axis
    
    // Find max values for each channel
    const maxRed = Math.max(...profileData.map(p => p.r), 1); // Avoid division by zero
    const maxGreen = Math.max(...profileData.map(p => p.g), 1);
    const maxBlue = Math.max(...profileData.map(p => p.b), 1);
    const maxIntensity = Math.max(...profileData.map(p => p.intensity), 1);
    
    // Calculate the current frame's max value
    const currentFrameMax = Math.max(maxRed, maxGreen, maxBlue, maxIntensity);
    
    // If background correction is active, use different normalization
    let absoluteMax;
    
    if (useBackgroundCorrection) {
      // FIXED: Always use 2.0 as the max value when background correction is on
      absoluteMax = 2.0;
      console.log('Using fixed background-corrected max: 2.0');
    } else {
      // For regular mode, use stable scaling if enabled
      if (stabilizeYAxis) {
        // If current max is significantly higher than our stored max, update it
        // but don't decrease it too quickly to avoid rapid changes
        if (currentFrameMax > yAxisMax * 1.1) {
          // Increase max value with some headroom
          const newMax = Math.ceil(currentFrameMax * 1.2);
          console.log(`Increasing y-axis max from ${yAxisMax} to ${newMax}`);
          setYAxisMax(newMax);
          absoluteMax = newMax;
        } else if (currentFrameMax < yAxisMax * 0.5 && yAxisMax > 50) {
          // Gradually decrease max if values are much lower
          // but don't go below a reasonable minimum
          const newMax = Math.max(Math.ceil(yAxisMax * 0.9), 50);
          console.log(`Gradually decreasing y-axis max from ${yAxisMax} to ${newMax}`);
          setYAxisMax(newMax);
          absoluteMax = newMax;
        } else {
          // Use the stored stable max
          absoluteMax = yAxisMax;
          console.log(`Using stable y-axis max: ${absoluteMax}`);
        }
      } else {
        // Dynamic scaling mode - use current frame max with a minimum threshold
        absoluteMax = Math.max(currentFrameMax, 10);
        console.log(`Using dynamic y-axis max: ${absoluteMax}`);
      }
    }
    
    // Draw background and grid
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw a grid for better readability
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Draw horizontal grid lines (25%, 50%, 75%, 100%)
    for (let i = 1; i <= 4; i++) {
      const y = graphHeight + 5 - (i * 0.25 * graphHeight);
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(10 + graphWidth, y);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(10, graphHeight + 5);
    ctx.lineTo(10 + graphWidth, graphHeight + 5);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(10, graphHeight + 5);
    ctx.stroke();
    
    // Create datasets with the correct property name for position
    const redData = profileData.map(p => ({ position: p.position, value: p.r }));
    const greenData = profileData.map(p => ({ position: p.position, value: p.g }));
    const blueData = profileData.map(p => ({ position: p.position, value: p.b }));
    const intensityData = profileData.map(p => ({ position: p.position, value: p.intensity }));
    
    // Draw RGB lines function
    const drawLine = (data, color, normalizeToMax = true) => {
      if (data.length < 2) {
        console.warn(`Not enough data points to draw line: ${data.length}`);
        return;
      }
      
      // Determine the max value for this specific line
      const maxValue = normalizeToMax ? absoluteMax : Math.max(...data.map(p => p.value), 1);
      
      console.log(`Drawing line: color=${color}, points=${data.length}, maxValue=${maxValue}`);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      // Draw each point, including first
      let firstPointDrawn = false;
      
      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        
        // Skip points with undefined position
        if (point.position === undefined) {
          console.warn(`Point at index ${i} has undefined position:`, point);
          continue;
        }
        
        // Calculate x and y coordinates
        const x = 10 + (point.position * graphWidth);
        const normalizedValue = point.value / maxValue;
        const y = graphHeight + 5 - (normalizedValue * graphHeight);
        
        // Additional validation
        if (isNaN(x) || isNaN(y)) {
          console.warn(`Invalid coordinates at index ${i}: (${x}, ${y}), position=${point.position}, value=${point.value}`);
          continue;
        }
        
        if (!firstPointDrawn) {
          ctx.moveTo(x, y);
          firstPointDrawn = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Only stroke if we actually drew something
      if (firstPointDrawn) {
        ctx.stroke();
      } else {
        console.error(`No valid points were drawn for ${color} line`);
      }
    };
    
    // Draw all lines based on visibility settings
    console.log('Drawing lines with explicit visibility settings:', visibilitySettings);
    
    if (visibilitySettings.red) {
      drawLine(redData, 'rgba(255, 80, 80, 0.8)', normalizeAllChannels);
    } else {
      console.log('Skipping red line - visibility off');
    }
    
    if (visibilitySettings.green) {
      drawLine(greenData, 'rgba(80, 255, 80, 0.8)', normalizeAllChannels);
    } else {
      console.log('Skipping green line - visibility off');
    }
    
    if (visibilitySettings.blue) {
      drawLine(blueData, 'rgba(80, 80, 255, 0.8)', normalizeAllChannels);
    } else {
      console.log('Skipping blue line - visibility off');
    }
    
    if (visibilitySettings.intensity) {
      drawLine(intensityData, 'rgba(255, 255, 255, 1)', normalizeAllChannels);
    } else {
      console.log('Skipping intensity line - visibility off');
    }
    
    // Draw labels
    ctx.fillStyle = 'white';
    ctx.font = '10px sans-serif';
    
    // X-axis labels
    ctx.fillText('0', 8, graphHeight + 15);
    ctx.fillText('1', graphWidth + 5, graphHeight + 15);
    
    // Y-axis labels
    if (useBackgroundCorrection) {
      // Fixed labels for background correction mode
      ctx.fillText('0', 5, graphHeight + 5);
      ctx.fillText('0.5', 5, graphHeight * 0.75 + 5);
      ctx.fillText('1.0', 5, graphHeight * 0.5 + 5);
      ctx.fillText('1.5', 5, graphHeight * 0.25 + 5);
      ctx.fillText('2.0', 5, 10);
      
      // Add reference line at y=1.0 (no change from background)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(10, graphHeight * 0.5 + 5);
      ctx.lineTo(10 + graphWidth, graphHeight * 0.5 + 5);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Dynamic labels for normal mode
      ctx.fillText('0', 5, graphHeight + 5);
      ctx.fillText(Math.round(absoluteMax / 2).toString(), 5, graphHeight / 2 + 5);
      ctx.fillText(Math.round(absoluteMax).toString(), 5, 10);
    }
    
    // Add scale indicator
    if (useBackgroundCorrection) {
      ctx.fillStyle = 'rgba(255, 200, 100, 0.7)';
      ctx.fillText('Fixed Scale (0-2)', canvas.width - 80, 15);
    } else if (stabilizeYAxis) {
      ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
      ctx.fillText('Fixed Scale', canvas.width - 60, 15);
    }
  };
  
  // Add a function to handle integration count changes
  const handleIntegrationChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 50) {
      setIntegrationCount(value);
      // If reducing count, trim history
      if (value < sampleHistory.length) {
        setSampleHistory(prevHistory => 
          prevHistory.slice(prevHistory.length - value)
        );
      }
    }
  };

  // Add a function to reset integration (clear history)
  const resetIntegration = () => {
    setSampleHistory([]);
    console.log('Integration history cleared');
  };
  
  // Reset line when camera or video size changes
  useEffect(() => {
    setIsLineDrawn(false);
    setLineProfileData(null);
  }, [isCameraActive, videoSize.width, videoSize.height]);
  
  // Clear line function
  const clearLine = () => {
    setIsLineDrawn(false);
    setLineProfileData(null);
  };
  
  // Change line color
  const changeLineColor = () => {
    // Cycle through colors: yellow -> red -> green -> blue -> yellow
    if (lineColor === 'rgb(255, 255, 0)') setLineColor('rgb(255, 50, 50)');
    else if (lineColor === 'rgb(255, 50, 50)') setLineColor('rgb(50, 255, 50)');
    else if (lineColor === 'rgb(50, 255, 50)') setLineColor('rgb(50, 50, 255)');
    else setLineColor('rgb(255, 255, 0)');
  };
  
  // Add a useEffect to ensure the canvas is properly initialized when the component mounts
  useEffect(() => {
    // Initialize line profile canvas when it becomes visible
    if (isLineDrawn && isCameraActive && lineProfileCanvasRef.current) {
      console.log('Initializing line profile canvas');
      const canvas = lineProfileCanvasRef.current;
      
      // Set explicit dimensions
      canvas.width = videoSize.width;
      canvas.height = 100;
      
      // Force an initial extraction and draw
      setTimeout(() => {
        if (lineProfileData && lineProfileData.length > 0) {
          console.log('Drawing initial graph with existing data');
          drawLineProfileGraph(lineProfileData);
        } else {
          console.log('No profile data yet, extracting new profile');
          extractLineProfile();
        }
      }, 100);
    }
  }, [isLineDrawn, isCameraActive, videoSize.width]);
  
  // Add a function to force redraw with a clean canvas
  const forceRedrawLineProfile = () => {
    if (lineProfileData && lineProfileData.length > 0) {
      console.log('Force redrawing line profile with current visibility settings:', {
        red: showRedLine,
        green: showGreenLine,
        blue: showBlueLine,
        intensity: showIntensityLine
      });
      
      // Ensure canvas is properly sized
      if (lineProfileCanvasRef.current) {
        lineProfileCanvasRef.current.width = graphSize.width;
        lineProfileCanvasRef.current.height = graphSize.height;
      }
      
      // Use explicit settings to avoid race conditions with React state updates
      const visibilitySettings = {
        red: showRedLine,
        green: showGreenLine,
        blue: showBlueLine,
        intensity: showIntensityLine
      };
      
      // Redraw with a slight delay to ensure canvas is ready
      setTimeout(() => {
        drawLineProfileGraphWithSettings(lineProfileData, visibilitySettings);
      }, 50);
    }
  };
  
  // Add a helper function to log line details
  const logLineDetails = () => {
    if (!isLineDrawn) {
      console.log('No line is currently drawn');
      return;
    }
    
    console.log('Current Line Details:');
    console.log(`Start point: (${Math.round(lineStart.x)}, ${Math.round(lineStart.y)})`);
    console.log(`End point: (${Math.round(lineEnd.x)}, ${Math.round(lineEnd.y)})`);
    console.log(`Length: ${Math.round(Math.sqrt(Math.pow(lineEnd.x - lineStart.x, 2) + Math.pow(lineEnd.y - lineStart.y, 2)))} pixels`);
    
    // Calculate angle in degrees
    const angle = Math.atan2(lineEnd.y - lineStart.y, lineEnd.x - lineStart.x) * 180 / Math.PI;
    console.log(`Angle: ${Math.round(angle)} degrees`);
    
    // Log number of data points
    if (lineProfileData) {
      console.log(`Data points: ${lineProfileData.length}`);
    }
  };
  
  // Add a function to export the intensity data
  const exportIntensityData = () => {
    if (!lineProfileData || lineProfileData.length === 0) {
      console.warn('No profile data to export');
      return;
    }
    
    // Create a CSV string
    let csv = 'Position,X,Y,R,G,B,Intensity\n';
    
    // Get points again to access x,y coordinates
    const points = getPointsOnLine(
      Math.round(lineStart.x), 
      Math.round(lineStart.y), 
      Math.round(lineEnd.x), 
      Math.round(lineEnd.y)
    );
    
    lineProfileData.forEach((data, index) => {
      const point = points[index];
      csv += `${data.position.toFixed(4)},${Math.round(point.x)},${Math.round(point.y)},${data.r},${data.g},${data.b},${Math.round(data.intensity)}\n`;
    });
    
    // Log the data
    console.log('Intensity data as CSV:');
    console.log(csv);
    
    // Create a downloadable link for CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'line_intensity_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Update the useEffect dependency array to include visibility toggles
  useEffect(() => {
    let profileInterval = null;
    
    if (isLineDrawn && isCameraActive) {
      console.log('Setting up profile update interval | Video visible:', showVideoFeed);
      
      // Extract initially
      extractLineProfile();
      
      // Then set up interval
      profileInterval = setInterval(() => {
        if (videoRef.current) {
          console.log(`Profile interval check | Video readyState: ${videoRef.current.readyState} | Visible: ${showVideoFeed}`);
          if (videoRef.current.readyState >= 2) {
            extractLineProfile();
          } else {
            console.log('Video not ready for capture');
            // Try to play the video if it's paused
            if (videoRef.current.paused) {
              console.log('Video paused, attempting to play');
              videoRef.current.play().catch(err => {
                console.error('Failed to play video:', err);
              });
            }
          }
        }
      }, 200); // Update 5 times per second
    }
    
    return () => {
      if (profileInterval) {
        console.log('Cleaning up profile update interval');
        clearInterval(profileInterval);
      }
    };
  }, [
    isLineDrawn, 
    isCameraActive, 
    lineStart.x, 
    lineStart.y, 
    lineEnd.x, 
    lineEnd.y, 
    integrationCount, 
    useBackgroundCorrection, 
    backgroundData,
    showVideoFeed // Add showVideoFeed to dependencies to update interval when visibility changes
  ]);

  // Update the setAsBackground function to force an immediate profile update
  const setAsBackground = () => {
    // Save current profile data as background
    if (lineProfileData && lineProfileData.length > 0) {
      // Make a deep copy to avoid reference issues
      const bgData = lineProfileData.map(point => ({...point}));
      
      setBackgroundData(bgData);
      setUseBackgroundCorrection(true);
      
      console.log('Background set with', bgData.length, 'points');
      
      // Force an immediate update to apply background correction
      setTimeout(() => {
        console.log('Forcing profile update after background set');
        extractLineProfile();
      }, 50);
    } else {
      console.warn('No profile data available to set as background');
    }
  };

  // Also update the toggleBackgroundCorrection function to force an update
  const toggleBackgroundCorrection = () => {
    // Only toggle if background data exists
    if (backgroundData) {
      const newValue = !useBackgroundCorrection;
      setUseBackgroundCorrection(newValue);
      
      // Force an immediate update
      setTimeout(() => {
        console.log(`Forcing profile update after background correction ${newValue ? 'enabled' : 'disabled'}`);
        extractLineProfile();
      }, 50);
    } else {
      console.warn('No background data available');
      // Maybe prompt user to set background first
      alert('Please set a background first using the "Set as Background" button');
    }
  };

  // And update clearBackground to force an update
  const clearBackground = () => {
    setBackgroundData(null);
    setUseBackgroundCorrection(false);
    console.log('Background data cleared');
    
    // Force an immediate update
    setTimeout(() => {
      console.log('Forcing profile update after background cleared');
      extractLineProfile();
    }, 50);
  };

  // Function to toggle management menu
  const toggleManagementMenu = () => {
    setShowManagementMenu(!showManagementMenu);
  };
  
  // Function to apply camera settings
  const applyCameraSettings = async () => {
    if (!isCameraActive || !streamRef.current) {
      console.warn('Cannot apply settings: camera not active');
      return;
    }
    
    try {
      // Parse resolution
      const [width, height] = cameraResolution.split('x').map(Number);
      
      // Get current track
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) {
        console.warn('No video track found');
        return;
      }
      
      // Get capabilities
      const capabilities = videoTrack.getCapabilities();
      console.log('Camera capabilities:', capabilities);
      
      // Prepare constraints
      const constraints = {};
      
      // Apply resolution if supported
      if (capabilities.width && capabilities.height) {
        constraints.width = { exact: width };
        constraints.height = { exact: height };
      }
      
      // Apply advanced settings if supported
      const advanced = [];
      
      // Shutter speed (exposureTime in microseconds)
      if (capabilities.exposureTime && cameraShutterSpeed > 0) {
        advanced.push({ exposureTime: cameraShutterSpeed * 1000 }); // Convert to microseconds
      }
      
      // Gain
      if (capabilities.exposureCompensation && cameraGain !== 0) {
        advanced.push({ exposureCompensation: cameraGain });
      }
      
      if (advanced.length > 0) {
        constraints.advanced = advanced;
      }
      
      // Apply constraints
      console.log('Applying constraints:', constraints);
      await videoTrack.applyConstraints(constraints);
      console.log('Camera settings applied successfully');
      
      // Force canvas size update
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
      
      // Update video size state to match
      setVideoSize({ width, height });
      
    } catch (error) {
      console.error('Error applying camera settings:', error);
      alert(`Failed to apply camera settings: ${error.message}`);
    }
  };
  
  // Add the management menu UI
  const renderManagementMenu = () => {
    if (!showManagementMenu) return null;
    
    return (
      <div style={styles.managementMenu}>
        <div style={styles.managementMenuHeader}>
          <h4 style={styles.managementMenuTitle}>Camera & Display Settings</h4>
          <button 
            onClick={toggleManagementMenu}
            style={{ ...buttonVariants.secondaryButton, backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '16px', padding: '0px' }}
          >
            ×
          </button>
        </div>
        
        <div style={styles.managementMenuSection}>
          <h5 style={styles.managementMenuSectionTitle}>Camera Settings</h5>
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>Resolution:</label>
            <select 
              value={cameraResolution} 
              onChange={(e) => setCameraResolution(e.target.value)}
              style={styles.settingInput}
              disabled={isCameraActive}
            >
              <option value="640x480">640x480</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="1920x1080">1920x1080 (Full HD)</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>Shutter Speed:</label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={cameraShutterSpeed}
              onChange={(e) => setCameraShutterSpeed(Number(e.target.value))}
              style={styles.settingSlider}
              disabled={!isCameraActive}
            />
            <span style={styles.settingValue}>{cameraShutterSpeed}</span>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>Gain:</label>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={cameraGain}
              onChange={(e) => setCameraGain(Number(e.target.value))}
              style={styles.settingSlider}
              disabled={!isCameraActive}
            />
            <span style={styles.settingValue}>{cameraGain}</span>
          </div>
          
          <button 
            onClick={applyCameraSettings}
            style={{ ...buttonVariants.primaryButton, width: '100%', marginTop: '5px' }}
            disabled={!isCameraActive}
          >
            Apply Camera Settings
          </button>
        </div>
        
        <div style={styles.managementMenuSection}>
          <h5 style={styles.managementMenuSectionTitle}>Display Settings</h5>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>
              <input 
                type="checkbox" 
                checked={showVideoFeed}
                onChange={handleToggleVideoFeed}
              />
              Show Video Feed
            </label>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>
              <input 
                type="checkbox" 
                checked={showRedLine}
                onChange={handleToggleRedLine}
              />
              Show Red Channel
            </label>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>
              <input 
                type="checkbox" 
                checked={showGreenLine}
                onChange={handleToggleGreenLine}
              />
              Show Green Channel
            </label>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>
              <input 
                type="checkbox" 
                checked={showBlueLine}
                onChange={handleToggleBlueLine}
              />
              Show Blue Channel
            </label>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>
              <input 
                type="checkbox" 
                checked={showIntensityLine}
                onChange={handleToggleIntensityLine}
              />
              Show Intensity Line
            </label>
          </div>
          
          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>
              <input 
                type="checkbox" 
                checked={stabilizeYAxis}
                onChange={toggleYAxisStabilization}
              />
              Stabilize Y-Axis Scale
            </label>
          </div>
        </div>
      </div>
    );
  };
  
  // Fix the line visibility toggle handlers to ensure immediate redraw
  // The key issue is that we need to ensure state is updated before redrawing

  // Update the handleToggleRedLine function to properly handle state update and redraw
  const handleToggleRedLine = (e) => {
    const newValue = e.target.checked;
    console.log(`Setting red line visibility to: ${newValue}`);
    
    // Update the state first
    setShowRedLine(newValue);
    
    // Use the new value directly in a complete redraw rather than relying on state update
    if (lineProfileData && lineProfileData.length > 0) {
      console.log('Forcing complete redraw with updated red visibility');
      
      // Small delay to let React process the state update
      setTimeout(() => {
        // Create a new draw function that uses the latest visibility settings
        const drawWithCurrentSettings = () => {
          if (lineProfileCanvasRef.current) {
            const profileData = lineProfileData;
            
            // Access current state for other colors
            const visibilitySettings = {
              red: newValue, // Use the new value directly
              green: showGreenLine,
              blue: showBlueLine,
              intensity: showIntensityLine
            };
            
            console.log('Drawing with explicit visibility settings:', visibilitySettings);
            
            // Draw the graph with explicit visibility settings
            drawLineProfileGraphWithSettings(profileData, visibilitySettings);
          }
        };
        
        // Execute the draw function
        drawWithCurrentSettings();
      }, 20);
    }
  };

  // Similar updates for other color toggle handlers
  const handleToggleGreenLine = (e) => {
    const newValue = e.target.checked;
    console.log(`Setting green line visibility to: ${newValue}`);
    
    setShowGreenLine(newValue);
    
    if (lineProfileData && lineProfileData.length > 0) {
      console.log('Forcing complete redraw with updated green visibility');
      
      setTimeout(() => {
        if (lineProfileCanvasRef.current) {
          const visibilitySettings = {
            red: showRedLine,
            green: newValue, // Use the new value directly
            blue: showBlueLine,
            intensity: showIntensityLine
          };
          
          console.log('Drawing with explicit visibility settings:', visibilitySettings);
          drawLineProfileGraphWithSettings(lineProfileData, visibilitySettings);
        }
      }, 20);
    }
  };

  const handleToggleBlueLine = (e) => {
    const newValue = e.target.checked;
    console.log(`Setting blue line visibility to: ${newValue}`);
    
    setShowBlueLine(newValue);
    
    if (lineProfileData && lineProfileData.length > 0) {
      console.log('Forcing complete redraw with updated blue visibility');
      
      setTimeout(() => {
        if (lineProfileCanvasRef.current) {
          const visibilitySettings = {
            red: showRedLine,
            green: showGreenLine,
            blue: newValue, // Use the new value directly
            intensity: showIntensityLine
          };
          
          console.log('Drawing with explicit visibility settings:', visibilitySettings);
          drawLineProfileGraphWithSettings(lineProfileData, visibilitySettings);
        }
      }, 20);
    }
  };

  const handleToggleIntensityLine = (e) => {
    const newValue = e.target.checked;
    console.log(`Setting intensity line visibility to: ${newValue}`);
    
    setShowIntensityLine(newValue);
    
    if (lineProfileData && lineProfileData.length > 0) {
      console.log('Forcing complete redraw with updated intensity visibility');
      
      setTimeout(() => {
        if (lineProfileCanvasRef.current) {
          const visibilitySettings = {
            red: showRedLine,
            green: showGreenLine,
            blue: showBlueLine,
            intensity: newValue // Use the new value directly
          };
          
          console.log('Drawing with explicit visibility settings:', visibilitySettings);
          drawLineProfileGraphWithSettings(lineProfileData, visibilitySettings);
        }
      }, 20);
    }
  };

  const handleToggleVideoFeed = (e) => {
    const newVisibility = e.target.checked;
    console.log(`Toggling video visibility to: ${newVisibility}`);
    
    setShowVideoFeed(newVisibility);
    
    // Make sure the video element is still active
    // This is crucial - we need to keep the video stream going even when hidden
    if (videoRef.current && videoRef.current.paused && isCameraActive) {
      console.log('Resuming video playback');
      videoRef.current.play().catch(err => {
        console.error('Failed to resume video playback:', err);
      });
    }
    
    // Force a profile update immediately
    setTimeout(() => {
      if (isLineDrawn && isCameraActive) {
        console.log('Forcing profile update after visibility toggle');
        extractLineProfile();
      }
    }, 100);
  };
  
  // Add a toggle function for y-axis stabilization
  const toggleYAxisStabilization = () => {
    setStabilizeYAxis(!stabilizeYAxis);
    console.log(`Y-axis stabilization ${!stabilizeYAxis ? 'enabled' : 'disabled'}`);
    setTimeout(() => forceRedrawLineProfile(), 10);
  };
  
  // Add handlers for panel resizing
  const handlePanelResizeStart = (e) => {
    e.preventDefault();
    setIsResizingPanel(true);
    
    // Store initial mouse position and panel size
    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialWidth = panelRef.current?.offsetWidth || panelSize.width;
    const initialHeight = panelRef.current?.offsetHeight || panelSize.height;
    
    const handleMouseMove = (moveEvent) => {
      if (isResizingPanel) {
        // Calculate new dimensions
        const deltaX = moveEvent.clientX - initialX;
        const deltaY = moveEvent.clientY - initialY;
        
        const newWidth = Math.max(400, initialWidth + deltaX);
        const newHeight = Math.max(300, initialHeight + deltaY);
        
        setPanelSize({ width: newWidth, height: newHeight });
      }
    };
    
    const handleMouseUp = () => {
      setIsResizingPanel(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Add handler for graph resizing
  const handleGraphResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent panel resize from triggering
    setIsResizingGraph(true);
    
    // Store initial mouse position and graph size
    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialWidth = graphContainerRef.current?.offsetWidth || graphSize.width;
    const initialHeight = graphContainerRef.current?.offsetHeight || graphSize.height;
    
    const handleMouseMove = (moveEvent) => {
      if (isResizingGraph) {
        // Calculate new dimensions
        const deltaX = moveEvent.clientX - initialX;
        const deltaY = moveEvent.clientY - initialY;
        
        const newWidth = Math.max(200, initialWidth + deltaX);
        const newHeight = Math.max(80, initialHeight + deltaY);
        
        setGraphSize({ width: newWidth, height: newHeight });
        
        // Update canvas size
        if (lineProfileCanvasRef.current) {
          lineProfileCanvasRef.current.width = newWidth;
          lineProfileCanvasRef.current.height = newHeight;
          
          // Redraw graph with new dimensions
          setTimeout(() => forceRedrawLineProfile(), 10);
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsResizingGraph(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Add function to change waterfall update mode
  const changeWaterfallSettings = (mode) => {
    // This function has been moved to GraphWaterfallPanel component
    // We should rely on the GraphWaterfallPanel to handle this functionality
    console.log(`Waterfall settings change request: ${mode}`);
    setWaterfallUpdateMode(mode);
  };
  
  if (!detector) return null;

  return (
    <DraggablePanel 
      title={
        <div style={styles.panelHeader}>
          <span>{`Detector: ${detector.label || detector.id}`}</span>
          <button 
            onClick={toggleManagementMenu}
            style={{ ...buttonVariants.infoButton, backgroundColor: 'transparent', border: 'none', fontSize: '16px', padding: '0 4px' }}
            title="Camera and Display Settings"
          >
            ⚙️
          </button>
        </div>
      } 
      initialPosition={initialPosition}
    >
      <div 
        ref={panelRef}
        style={{
          ...styles.container,
          width: `${panelSize.width}px`,
          height: `${panelSize.height}px`,
          position: 'relative'
        }}
      >
        {/* Show the management menu if enabled */}
        {renderManagementMenu()}
        
        <div style={styles.detectorInfo}>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>Type:</span>
            <span style={styles.propertyValue}>{detector.data?.subtype || 'Standard'}</span>
          </div>
          <div style={styles.detectorProperty}>
            <span style={styles.propertyLabel}>Status:</span>
            <span style={styles.propertyValue}>
              {detectorReadings.length > 0 ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        {/* Two-column layout container */}
        <div style={styles.columnsContainer}>
          {/* Left column - Camera controls and video feed */}
          <div style={styles.leftColumn}>
            {/* Replace camera controls and video feed with VideoControlPanel */}
            <VideoControlPanel
              // Camera related props
              availableCameras={availableCameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              isCameraActive={isCameraActive}
              isCameraSupported={isCameraSupported}
              videoSize={videoSize}
              showVideoFeed={showVideoFeed}
              setVideoSize={setVideoSize}
              cameraResolution={cameraResolution}
              
              // Line related props
              isLineDrawn={isLineDrawn}
              isDrawingLine={isDrawingLine}
              lineStart={lineStart}
              lineEnd={lineEnd}
              setLineStart={setLineStart}
              setLineEnd={setLineEnd}
              setIsDrawingLine={setIsDrawingLine}
              setIsLineDrawn={setIsLineDrawn}
              lineColor={lineColor}
              setLineColor={setLineColor}
              
              // Line transformation props
              lineYOffset={lineYOffset}
              lineRotation={lineRotation}
              fineYOffset={fineYOffset}
              fineRotation={fineRotation}
              setLineYOffset={setLineYOffset}
              setLineRotation={setLineRotation}
              setFineYOffset={setFineYOffset}
              setFineRotation={setFineRotation}
              originalLineStart={originalLineStart}
              originalLineEnd={originalLineEnd}
              setOriginalLineStart={setOriginalLineStart}
              setOriginalLineEnd={setOriginalLineEnd}
              
              // Functions
              startCamera={startCamera}
              stopCamera={stopCamera}
              extractLineProfile={extractLineProfile}
              retryWithPermissionCheck={retryWithPermissionCheck}
              
              // Refs
              videoRef={videoRef}
              videoContainerRef={videoContainerRef}
            />
          </div>
          
          {/* Right column - Line profile graph and controls */}
          <div style={styles.rightColumn}>
            {/* Replace with GraphWaterfallPanel component */}
            {isLineDrawn && isCameraActive && (
              <GraphWaterfallPanel
                // Line profile related props
                lineProfileCanvasRef={lineProfileCanvasRef}
                lineProfileWidth={graphSize.width}
                lineProfileHeight={graphSize.height}
                profileData={lineProfileData}
                integrationValue={integrationCount}
                setIntegrationValue={setIntegrationCount}
                hasBackgroundProfile={backgroundData !== null}
                isBackgroundCorrectionEnabled={useBackgroundCorrection}
                showRedLine={showRedLine}
                showGreenLine={showGreenLine}
                showBlueLine={showBlueLine}
                showIntensityLine={showIntensityLine}
                normalizeToMax={normalizeAllChannels}
                
                // Waterfall related props
                waterfallCanvasRef={waterfallCanvasRef}
                waterfallWidth={graphSize.width}
                waterfallHeight={200}
                isWaterfallEnabled={showWaterfall}
                setIsWaterfallEnabled={setShowWaterfall}
                waterfallUpdateMode={waterfallUpdateMode}
                setWaterfallUpdateMode={setWaterfallUpdateMode}
                waterfallMaxHistory={waterfallMaxHistory}
                setWaterfallMaxHistory={setWaterfallMaxHistory}
                waterfallUpdateInterval={waterfallUpdateInterval}
                setWaterfallUpdateInterval={setWaterfallUpdateInterval}
                waterfallHistory={waterfallHistory}
                setWaterfallHistory={setWaterfallHistory}
                
                // Functions
                handleToggleRedLine={() => setShowRedLine(!showRedLine)}
                handleToggleGreenLine={() => setShowGreenLine(!showGreenLine)}
                handleToggleBlueLine={() => setShowBlueLine(!showBlueLine)}
                handleToggleIntensityLine={() => setShowIntensityLine(!showIntensityLine)}
                handleIntegrationChange={handleIntegrationChange}
                resetIntegration={resetIntegration}
                extractLineProfile={extractLineProfile}
                forceRedrawLineProfile={forceRedrawLineProfile}
                exportIntensityData={exportIntensityData}
                logLineDetails={logLineDetails}
                setAsBackground={setAsBackground}
                toggleBackgroundCorrection={() => setUseBackgroundCorrection(!useBackgroundCorrection)}
                clearBackground={clearBackground}
                toggleYAxisStabilization={() => setNormalizeAllChannels(!normalizeAllChannels)}
                handleGraphResizeStart={handleGraphResizeStart}
              />
            )}
                    </div>
        </div>
        
        <button style={{ ...buttonVariants.secondaryButton, width: '100%' }} onClick={onClose}>
          Close
        </button>
        
        {/* Panel resize handle */}
        <div 
          style={styles.panelResizeHandle}
          onMouseDown={handlePanelResizeStart}
          title="Drag to resize panel"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            style={{ display: 'block' }}
          >
            <path 
              d="M14,2 L2,14 M10,2 L2,10 M14,6 L6,14" 
              stroke="white" 
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default DetectorPanel; 