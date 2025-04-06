import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { useButtonStyles } from '../../../styles/ButtonStyleProvider';
import { WS_URL } from '../../../config';
import { floatingComponentStyles } from '../../../styles/FloatingComponentStyles';

// Constants for settings
const SETTINGS_STORAGE_KEY = 'fluidicgui_settings';
const MIN_LINE_LENGTH = 10; // Minimum length in pixels for a valid line
const MIN_CROP_SIZE = 1; // Minimum crop rectangle size

// Helper function to get settings from localStorage
const getSettingsFromStorage = () => {
  try {
    const settings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return settings ? JSON.parse(settings) : {
      mqttBroker: 'localhost',
      port: '1883'
    };
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    return {
      mqttBroker: 'localhost',
      port: '1883'
    };
  }
};

const MQTTCameraComponent = React.forwardRef((props, ref) => {
  const { onResize, detectorId } = props;
  const buttonVariants = useButtonStyles();
  
  // Camera view state
  const [cameraSize, setCameraSize] = useState({ width: 640, height: 480 });
  const [isResizing, setIsResizing] = useState(false);
  const [showResizeInfo, setShowResizeInfo] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(640/480);
  
  // MQTT connection state
  const [mqttTopic, setMqttTopic] = useState(detectorId || 'spectrometer_1');
  const [mqttClient, setMqttClient] = useState(null);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [lastMqttResponse, setLastMqttResponse] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(500);
  const intervalRef = useRef(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isWaitingForCropResponse, setIsWaitingForCropResponse] = useState(false);
  
  // Camera operation state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showAdvancedCapabilities, setShowAdvancedCapabilities] = useState(false);
  const [cameraCapabilities, setCameraCapabilities] = useState(null);
  const [exposureMode, setExposureMode] = useState('continuous');
  
  // Line drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [isLineDrawn, setIsLineDrawn] = useState(false);
  
  // Line adjustment state
  const [lineYOffset, setLineYOffset] = useState(0);
  const [lineXOffset, setLineXOffset] = useState(0);
  const [originalLineStart, setOriginalLineStart] = useState({ x: 0, y: 0 });
  const [originalLineEnd, setOriginalLineEnd] = useState({ x: 0, y: 0 });
  
  // Crop frame state
  const [isCropMode, setIsCropMode] = useState(false);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);
  const [cropRange, setCropRange] = useState([0, 0, 0, 0]); // [x_min, y_min, x_max, y_max]
  const [cropInterval, setCropInterval] = useState(0);
  const [isCropStreaming, setIsCropStreaming] = useState(false);
  const [cropPreviewImage, setCropPreviewImage] = useState(null);
  const cropIntervalRef = useRef(null);
  
  // Camera settings
  const [cameraResolution, setCameraResolution] = useState('640x480');
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [cameraConfig, setCameraConfig] = useState({
    camera: { exposure_time: null, exposure_mode: 'auto', iso: null },
    processing: { roi: [0, 0, 1280, 720] }
  });
  const [pendingConfig, setPendingConfig] = useState(null);
  
  // Refs
  const cameraContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const animationRequestRef = useRef(null);
  const lastLineUpdateTimeRef = useRef(0);

  // MQTT settings
  const [mqttSettings, setMqttSettings] = useState(() => {
    const savedSettings = getSettingsFromStorage();
    return {
      host: savedSettings.mqttBroker || 'localhost',
      port: savedSettings.port || 1883,
      protocol: 'ws',
      clientId: `fluidic_gui_${Math.random().toString(16).substr(2, 8)}`
    };
  });
  
  // Effects to reload settings if they change in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSettings = getSettingsFromStorage();
      setMqttSettings(prev => ({
        ...prev,
        host: savedSettings.mqttBroker || prev.host,
        port: savedSettings.port || prev.port
      }));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const [availableResolutions, setAvailableResolutions] = useState(['640x480', '800x600', '1024x768', '1280x960']);
  const [lastPublishedMessage, setLastPublishedMessage] = useState(null);
  const [lastReceivedMessage, setLastReceivedMessage] = useState(null);
  const [debugMode, setDebugMode] = useState(true);
  
  // Debug log for detectorId
  console.log('[MQTTCameraComponent] Initialized with detectorId:', detectorId);
  
  // Debug log when mqttTopic changes
  useEffect(() => {
    console.log('[MQTTCameraComponent] MQTT topic set to:', mqttTopic);
  }, [mqttTopic]);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    // Get current camera settings
    getSettings: () => {
      return {
        mqttTopic: mqttTopic,
        pollingInterval: pollingInterval,
        mqttBroker: mqttSettings,
        resolution: cameraResolution,
        // Line drawing settings
        isLineDrawn: isLineDrawn,
        lineStart: originalLineStart,
        lineEnd: originalLineEnd,
        lineYOffset: lineYOffset,
        lineXOffset: lineXOffset,
        // Crop settings
        cropRange: cropRange,
        cropInterval: cropInterval
      };
    },
    
    // Expose startCamera method to parent
    startCamera: async () => {
      if (!isCameraActive) {
        return connectToMqttAndStartStreaming();
      }
      return Promise.resolve(false);
    },
    
    // Apply saved camera settings
    applySettings: async (settings) => {
      if (!settings) return false;
      
      // Disconnect and reconnect if topic changes
      let shouldReconnect = false;
      if (settings.mqttTopic && settings.mqttTopic !== mqttTopic) {
          setMqttTopic(settings.mqttTopic);
        shouldReconnect = true;
        }
        
      try {
        // Apply MQTT settings if provided
        if (settings.pollingInterval) {
          setPollingInterval(settings.pollingInterval);
        }
        
        // Apply resolution
        if (settings.resolution) {
          setCameraResolution(settings.resolution);
          
          // Parse the resolution into width and height
          const [width, height] = settings.resolution.split('x').map(Number);
          
          // Update camera size based on resolution
          setCameraSize({ width, height });
          
          // Update aspect ratio
          if (width && height) {
            setImageAspectRatio(width / height);
          }
        }
        
        // If camera is not active OR if topic changed, start/restart connection
        if (!isCameraActive || shouldReconnect) {
          if (isCameraActive) {
            disconnectFromMqtt(); // Disconnect first if topic changed
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for disconnect
          }
          // Short delay to allow state update
          setTimeout(() => connectToMqttAndStartStreaming(), 100);
          
          // Wait for camera to start before continuing
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // After camera settings are applied, handle line drawing settings
        if (settings.isLineDrawn && settings.lineStart && settings.lineEnd) {
          // Set original line points
          setOriginalLineStart(settings.lineStart);
          setOriginalLineEnd(settings.lineEnd);
          
          // Set current line points (will be adjusted by offset/rotation later)
          setCurrentLine(settings);
          
          // Mark line as drawn
          setIsLineDrawn(true);
          
          // Apply line adjustments
          if (settings.lineYOffset !== undefined) {
            setLineYOffset(settings.lineYOffset);
          }
          
          if (settings.lineXOffset !== undefined) {
            setLineXOffset(settings.lineXOffset);
          }
          
          // Send the loaded line to the backend immediately
          // Use a timeout to ensure connection is established after potential restart
          setTimeout(() => {
            const finalLine = calculateTransformedLinePosition(settings.lineStart, settings.lineEnd, settings.lineYOffset, settings.lineXOffset);
            sendLineUpdate(finalLine);
            redrawCanvas(); // Redraw with the loaded line
          }, 1500); // Increased delay to ensure connection
        }
        
        return true;
      } catch (error) {
        console.error('Error applying camera settings:', error);
        return false;
      }
    }
  }));
  
  // Connect to MQTT broker and start streaming
  const connectToMqttAndStartStreaming = async () => {
    try {
      // Use the WS_URL from config instead of trying to connect directly to MQTT broker
      console.log('Connecting to WebSocket server at:', WS_URL);
      
      // Create WebSocket connection using WS_URL
      const websocket = new WebSocket(WS_URL);
      
      websocket.onopen = () => {
        console.log('Connected to WebSocket server successfully');
        setIsMqttConnected(true);
        
        // Explicitly subscribe to the response topic via WebSocket
        const subscribeMessage = {
          topic: "common/subscribe",
          payload: `${mqttTopic}/response/full_frame`
        };
        
        websocket.send(JSON.stringify(subscribeMessage));
        
        // Subscribe to config response topic
        const subscribeConfig = {
          topic: "common/subscribe",
          payload: `${mqttTopic}/response/config`
        };
        websocket.send(JSON.stringify(subscribeConfig));

        // Subscribe to cropped frame response topic
        const subscribeCroppedFrame = {
          topic: "common/subscribe",
          payload: `${mqttTopic}/response/crop_frame`
        };
        console.log(`[MQTTCamera] Subscribing to cropped frame topic: ${subscribeCroppedFrame.payload}`);
        websocket.send(JSON.stringify(subscribeCroppedFrame));

        // Request current config
        const requestConfigMessage = {
          topic: `${mqttTopic}/request/config`,
          payload: { timestamp: Date.now() }
        };
        websocket.send(JSON.stringify(requestConfigMessage));
        setLastPublishedMessage(requestConfigMessage);
        
        // Add a diagnostic function to verify and re-subscribe if needed
        const diagnosticCheckCallback = () => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            console.log("[MQTTCamera] Running subscription diagnostic check");
            
            // Re-subscribe to crop_frame topic to ensure it's active
            const resubCroppedFrame = {
              topic: "common/subscribe",
              payload: `${mqttTopic}/response/crop_frame`
            };
            websocket.send(JSON.stringify(resubCroppedFrame));
            console.log(`[MQTTCamera] Re-subscribed to cropped frame topic: ${resubCroppedFrame.payload}`);
            
            // Request subscription status if supported by server
            const statusRequest = {
              topic: "common/subscription_status",
              payload: { client_id: mqttSettings.clientId }
            };
            websocket.send(JSON.stringify(statusRequest));
          }
        };
        
        // Run diagnostic check after a delay
        setTimeout(diagnosticCheckCallback, 3000);
        
        // Start streaming right away
        startStreaming(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const rawData = event.data;
          console.debug('[MQTTCamera] Raw WS Message:', rawData);
          const data = JSON.parse(rawData);
          
          // Handle cropped frame response
          if (data.topic === `${mqttTopic}/response/crop_frame`) {
            try {
              console.log("[MQTTCamera] Received cropped frame response:", data);
              let imageData = null;
              
              // Handle payload based on its type
              if (data.payload) {
                if (typeof data.payload === 'string') {
                  try {
                    console.log("[MQTTCamera] Parsing string payload:", data.payload.substring(0, 100) + "...");
                    const parsedPayload = JSON.parse(data.payload);
                    if (parsedPayload.image) {
                      imageData = parsedPayload.image;
                      console.log("[MQTTCamera] Found image in parsed payload, length:", imageData.length);
                    }
                  } catch (e) {
                    console.warn("[MQTTCamera] Error parsing payload:", e);
                    // Silent catch - not valid JSON
                  }
                } else if (typeof data.payload === 'object' && data.payload.image) {
                  imageData = data.payload.image;
                  console.log("[MQTTCamera] Found image in object payload, length:", imageData.length);
                }
              }
              
              if (imageData) {
                updateCropPreviewWithBase64Image(imageData);
                console.log("[MQTTCamera] Updated crop preview with image data");
              } else {
                console.warn('⚠️ Cropped frame response has no image data');
              }

              // Mark that we've received a crop response and can send another request
              setIsWaitingForCropResponse(false);
            } catch (err) {
              console.error('Error processing cropped frame response:', err);
              setIsWaitingForCropResponse(false); // Reset flag even on error
            }
            return; // Exit after handling cropped frame
          }
          
          // Handle Config Response
          if (data.topic === `${mqttTopic}/response/config`) {
            try {
              let configData = null;
              console.debug('[MQTTCamera] Received config response, Payload type:', typeof data.payload, 'Payload:', data.payload);
              if (data.payload) {
                if (typeof data.payload === 'string') {
                  // Attempt to parse if it looks like JSON
                  try {
                  configData = JSON.parse(data.payload);
                    console.debug('[MQTTCamera] Parsed string payload to config object:', configData);
                  } catch (e) {
                    console.warn('[MQTTCamera] Config payload is a string but not valid JSON:', data.payload, 'Error:', e);
                    // Keep configData null
                  }
                } else { // Payload is already an object
                  configData = data.payload;
                  console.debug('[MQTTCamera] Config payload is already an object:', configData);
                }
              }
              
              if (configData) {
                console.log("[MQTTCamera] Processing received config:", configData);
                // Validate received config structure slightly
                if (configData.camera && configData.processing && configData.processing.roi) {
                  setCameraConfig(configData);
                  setPendingConfig(JSON.parse(JSON.stringify(configData))); // Update pending config too
                  // Update relevant states based on config if needed (e.g., ROI might affect cameraSize view)
                  const [w, h] = configData.camera.resolution || [640, 480]; // Fallback resolution
                  if (w && h) {
                  setCameraSize({ width: w, height: h });
                  setImageAspectRatio(w / h);
                  }
                } else {
                  console.warn("Received invalid config structure", configData);
                }
              } else {
                console.warn("Received empty or non-parsable config response payload");
                // Maybe add error state here?
              }
            } catch (err) {
              console.error('Error processing config response:', err, 'Data:', data.payload);
            }
            return; // Processed config, exit
          }
          
          // DIRECTLY CHECK for the specific response topic first
          if (data.topic === `${mqttTopic}/response/full_frame`) {
            try {
              let imageData = null;
              
              // Handle payload based on its type
              let resolution = null;
              if (data.payload) {
                if (typeof data.payload === 'string') {
                  try {
                    const parsedPayload = JSON.parse(data.payload);
                    if (parsedPayload.image) {
                      imageData = parsedPayload.image;
                    }
                    if (parsedPayload.resolution) {
                      resolution = parsedPayload.resolution;
                    }
                  } catch (e) {
                    // Silently continue
                  }
                }
                else if (typeof data.payload === 'object' && data.payload.image) {
                  imageData = data.payload.image;
                  if (data.payload.resolution) {
                    resolution = data.payload.resolution;
                  }
                }
              }
              
              if (imageData) {
                // If resolution was sent with the image, update aspect ratio based on it
                if (resolution && Array.isArray(resolution) && resolution.length === 2) {
                  const [imgW, imgH] = resolution;
                  if (imgW > 0 && imgH > 0) {
                    updateAspectRatioAndResolutions(imgW, imgH);
                  }
                }
                setLastMqttResponse(data.payload);
                updateVideoWithBase64Image(imageData);
              } else {
                console.warn('⚠️ Response has correct topic but no image data found');
              }

              // Mark that we've received a response and can send another request
              setIsWaitingForResponse(false);
            } catch (err) {
              console.error('Error processing response:', err);
              setIsWaitingForResponse(false); // Reset flag even on error
            }
            
            // Return after handling the main topic to avoid redundant processing
            return;
          }
          
          // Log unhandled message topics for debugging
          if (data.topic && data.topic.includes(mqttTopic) && 
              data.topic !== `${mqttTopic}/response/full_frame` && 
              data.topic !== `${mqttTopic}/response/crop_frame` && 
              data.topic !== `${mqttTopic}/response/config`) {
            console.log(`[MQTTCamera] Unhandled topic received: ${data.topic}`, data);
          }
          
          // Fallback: Check for common/device_response which might contain our response
          if (data.topic === 'common/device_response') {
            // Process common/device_response
            if (data.payload && typeof data.payload === 'string') {
              if (data.payload.includes(mqttTopic)) {
                try {
                  if (data.payload.includes('image')) {
                    const responseData = JSON.parse(data.payload);
                    if (responseData.image) {
                      updateVideoWithBase64Image(responseData.image);
                      setLastMqttResponse(responseData);
                    }
                  }
                } catch (err) {
                  console.error('Error parsing device response:', err);
                }
              }
            }
          }
          
          // Final fallback: Look for anything that might contain image data
          const fullEventData = JSON.stringify(data).toLowerCase();
          if (
            fullEventData.includes('image') || 
            fullEventData.includes('frame') || 
            fullEventData.includes('response')
          ) {
            tryExtractAndShowImage(data);
          }
          
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error, 'Raw data:', event.data);
          // Reset waiting flags in case of error
          setIsWaitingForResponse(false);
          setIsWaitingForCropResponse(false);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsMqttConnected(false);
        setIsCameraActive(false);
      };

      setMqttClient(websocket);
      setIsCameraActive(true);
      
      return true;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return false;
    }
  };
  
  // Disconnect from MQTT broker
  const disconnectFromMqtt = () => {
    // Stop streaming first
    stopStreaming();
    
    // Unsubscribe from the response topic before closing the connection
    if (mqttClient && mqttClient.readyState === WebSocket.OPEN) {
      // Send unsubscribe message
      const unsubscribeMessage = {
        topic: "common/unsubscribe", 
        payload: `${mqttTopic}/response/full_frame`
      };
      
      mqttClient.send(JSON.stringify(unsubscribeMessage));
      
      // Add a small delay before closing to ensure the unsubscribe is processed
      setTimeout(() => {
        mqttClient.close();
      }, 100);
    }
    
    setIsMqttConnected(false);
    setIsCameraActive(false);
    setMqttClient(null);
  };
  
  // Start streaming frames
  const startStreaming = (websocket) => {
    if (!websocket) return;
    
    setIsStreaming(true);
    
    // Send first frame request immediately
    requestFullFrame(websocket);
    
    // Set up interval to check if we should request a new frame
    intervalRef.current = setInterval(() => {
      // Only send a new request if:
      // 1. We're not in crop mode
      // 2. We're not already waiting for a response
      // 3. WebSocket is connected
      if (!isCropMode && !isWaitingForResponse && websocket && websocket.readyState === WebSocket.OPEN) {
        requestFullFrame(websocket);
      }
    }, pollingInterval);
  };
  
  // Request a single full frame
  const requestFullFrame = (websocket) => {
    // Format the message according to the system's expected format
    const message = {
      topic: `${mqttTopic}/request/full_frame`,
      payload: { timestamp: Date.now() }
    };
    
    setLastPublishedMessage(message);
    setIsWaitingForResponse(true);
    
    websocket.send(JSON.stringify(message));
  };
  
  // Stop streaming frames
  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsStreaming(false);
    }
  };
  
  // Update aspect ratio and available resolutions when we receive an image
  const updateAspectRatioAndResolutions = (width, height) => {
    const newAspectRatio = width / height;
    if (Math.abs(newAspectRatio - imageAspectRatio) > 0.01) { // Small threshold to avoid unnecessary updates
      setImageAspectRatio(newAspectRatio);
      
      // Generate resolution options that match this aspect ratio
      const baseWidths = [640, 800, 1024, 1280, 1600, 1920];
      const newResolutions = baseWidths.map(w => {
        const h = Math.round(w / newAspectRatio);
        return `${w}x${h}`;
      });
      
      setAvailableResolutions(newResolutions);
      
      // Set cameraResolution to match actual camera resolution
      setCameraResolution(`${width}x${height}`);
      
      // Adjust current camera size to match aspect ratio
      setCameraSize(prev => ({
        width: prev.width,
        height: Math.round(prev.width / newAspectRatio)
      }));
    }
  };

  // Update video with base64 encoded image data
  const updateVideoWithBase64Image = (base64Data) => {
    if (!base64Data) {
      console.error('Cannot update image: missing base64 data');
      return;
    }
    
    if (!canvasRef.current) {
      console.error('Cannot update image: canvas reference is null');
      return;
    }

    // Validate that the base64 string looks correct
    if (!base64Data.match(/^[A-Za-z0-9+/=]+$/)) {
      console.error('Invalid base64 data format. Data does not appear to be valid base64.');
      return;
    }

    // Create an image element to load the data
    const img = new Image();
    
    // Add load event listener before setting src
    img.onload = () => {
      // Store the image reference for later use
      imageRef.current = img;
      
      // Update aspect ratio and available resolutions
      updateAspectRatioAndResolutions(img.width, img.height);
      
      // Call redrawCanvas instead of drawing directly here
      redrawCanvas(); 
    };
    
    img.onerror = (error) => {
      console.error('Failed to load image:', error);
      console.error('Image load failed. This usually means the base64 data is invalid or incomplete.');
    };
    
    // Set the image source to the base64 data
    try {
      img.src = `data:image/jpeg;base64,${base64Data}`;
    } catch (e) {
      console.error('Error setting image source:', e);
    }
  };
  
  // Update preview with base64 encoded cropped image data
  const updateCropPreviewWithBase64Image = (base64Data) => {
    if (!base64Data) {
      console.error('Cannot update crop preview: missing base64 data');
      return;
    }

    // Set the preview image data
    setCropPreviewImage(`data:image/jpeg;base64,${base64Data}`);
  };
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      stopCropStreaming();
      disconnectFromMqtt();
    };
  }, []);
  
  // Initialize canvas size when video size changes
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = cameraSize.width;
      canvasRef.current.height = cameraSize.height;
      
      // If line is drawn, redraw it when canvas size changes
      if (isLineDrawn) {
        // Ensure the redraw happens after the canvas size is updated
        // by using a small timeout
        setTimeout(() => {
          redrawCanvas(); // Use redrawCanvas which handles coordinates
          
          // Double-check with another redraw after a slight delay
          setTimeout(() => redrawCanvas(), 100);
        }, 0);
      }
    }
  }, [cameraSize.width, cameraSize.height, isLineDrawn]);
  
  // Effect for continuous redrawing of the canvas (image + line)
  useEffect(() => {
    let animationId;

    // Function to continuously redraw the canvas (image + line)
    const redrawLoop = () => {
      if (canvasRef.current) {
        redrawCanvas();
      }
      animationId = requestAnimationFrame(redrawLoop);
    };

    // Start animation loop if camera is active
    if (isCameraActive || isLineDrawn) {
      animationId = requestAnimationFrame(redrawLoop);
      console.debug("[Animation] Starting redraw loop");
    }

    // Cleanup function
    return () => {
      if (animationId) {
        console.debug("[Animation] Stopping redraw loop");
        cancelAnimationFrame(animationId);
      }
    };
  }, [isCameraActive, isLineDrawn]); // Re-run when camera activity or line drawing state changes

  // Start camera stream (now connects to MQTT)
  const startCamera = async () => {
    return connectToMqttAndStartStreaming();
  };
  
  // Stop camera stream (now disconnects from MQTT)
  const stopCamera = () => {
    disconnectFromMqtt();
  };
  
  // Function to send the line update to the backend
  const sendLineUpdate = (line) => {
    if (mqttClient && mqttClient.readyState === WebSocket.OPEN && line) {
      // Ensure we have valid coordinates
      if (!line.start || !line.end) {
        console.warn('Invalid line coordinates:', line);
        return;
      }

      // Send integer coordinates
      const payload = {
        start_x: Math.round(line.start.x),
        end_x: Math.round(line.end.x),
        y: Math.round(line.start.y) // Y is the same for start and end since line is horizontal
      };

      const message = {
        topic: `${mqttTopic}/request/set_line`,
        payload: payload
      };

      console.log("Sending line update:", message);
      mqttClient.send(JSON.stringify(message));
      setLastPublishedMessage(message);
    } else {
      console.warn('Cannot send line update: WebSocket not connected or line not defined.', {
        wsState: mqttClient?.readyState,
        line: line
      });
    }
  };
  
  // Calculate the current line position with offsets applied
  const calculateTransformedLinePosition = () => {
    if (!originalLineStart || !originalLineEnd) return null;

    // Return the original line coordinates with any offsets applied
    return {
      start: {
        x: originalLineStart.x,
        y: originalLineStart.y
      },
      end: {
        x: originalLineEnd.x,
        y: originalLineEnd.y
      }
    };
  };
  
  // Handle line Y-offset adjustment
  const handleLineYOffsetChange = (e) => {
    const newOffset = parseInt(e.target.value);
    setLineYOffset(newOffset);
    // Send update only on adjustment, not during initial draw
    if (isLineDrawn && originalLineStart && originalLineEnd) { 
        const newLine = calculateTransformedLinePosition(originalLineStart, originalLineEnd, newOffset, lineXOffset);
        // Force redraw immediately to improve responsiveness
        redrawCanvas();
        sendLineUpdate(newLine);
    }
  };
  
  // Handle line X-offset adjustment
  const handleLineXOffsetChange = (e) => {
    const newOffset = parseInt(e.target.value);
    setLineXOffset(newOffset);
    // Send update only on adjustment, not during initial draw
    if (isLineDrawn && originalLineStart && originalLineEnd) {
        const newLine = calculateTransformedLinePosition(originalLineStart, originalLineEnd, lineYOffset, newOffset);
        // Force redraw immediately to improve responsiveness  
        redrawCanvas();
        sendLineUpdate(newLine);
    }
  };
  
  // Convert canvas coordinates to relative image coordinates
  const getRelativeImageCoordinates = (event) => {
    if (!canvasRef.current || !imageRef.current) return null;

    const canvas = canvasRef.current;
    const image = imageRef.current;
    const rect = canvas.getBoundingClientRect();

    // Get click coordinates relative to canvas
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Calculate scale factors
    const scaleX = image.naturalWidth / rect.width;
    const scaleY = image.naturalHeight / rect.height;
    const imageX = Math.round(canvasX * scaleX);
    const imageY = Math.round(canvasY * scaleY);

    // Add 2px margin to boundaries
    const margin = 2;
    if (imageX < margin || imageX > image.naturalWidth - margin ||
        imageY < margin || imageY > image.naturalHeight - margin) {
      console.warn('Click outside image boundaries');
      return null;
    }

    return {
      x: Math.round(imageX),
      y: Math.round(imageY)
    };
  };

  // Render camera controls
  const renderCameraControls = () => {
    return (
      <div style={floatingComponentStyles.controls}>
        {/* Camera/MQTT connection controls */}
        {!isCameraActive ? (
          <button 
            style={buttonVariants.primaryButton}
            onClick={startCamera}
          >
            Connect to Device
          </button>
        ) : (
          <>
            <button 
              style={{
                ...buttonVariants.primaryButton,
                backgroundColor: 'rgba(255, 50, 50, 0.7)',
              }}
              onClick={stopCamera}
            >
              Disconnect
            </button>
            
            {isLineDrawn ? (
              <>
                <button 
                  style={buttonVariants.smallSecondary}
                  onClick={clearLine}
                >
                  Clear Line
                </button>
                <button 
                  style={buttonVariants.smallSecondary} 
                  disabled={true} // Disable extraction button as it's now handled by backend
                  title="Data extraction handled by backend"
                >
                  Extract (Backend)
                </button>
              </>
            ) : (
              <button 
                style={buttonVariants.smallSecondary}
                disabled={isDrawing}
                title="Click and drag on video to draw a line"
              >
                Draw Line
              </button>
            )}
          </>
        )}
      </div>
    );
  };
  
  // Clear the drawn line
  const clearLine = () => {
    setIsLineDrawn(false);
    setIsDrawing(false);
    setCurrentLine(null);
    
    // Send message to backend to clear the line (optional, or send invalid coords)
    sendLineUpdate({ start: { x: -1, y: -1 }, end: { x: -1, y: -1 } }); // Send dummy coords
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      // Need to redraw the image after clearing
      if (imageRef.current) {
          redrawCanvas();
      }
    }
  };

  // Start line drawing on mouse down
  const startLineDrawing = (event) => {
    if (!canvasRef.current || !imageRef.current) return;

    const coords = getRelativeImageCoordinates(event);
    if (!coords) {
      console.warn('Invalid start coordinates');
      return;
    }

    setIsDrawing(true);
    setCurrentLine({
      start: coords,
      end: coords
    });
    console.log('Started line at:', coords);
  };

  // Update line drawing on mouse move
  const updateLineDrawing = (event) => {
    if (!isDrawing || !canvasRef.current || !imageRef.current) return;

    const coords = getRelativeImageCoordinates(event);
    if (!coords) {
      console.warn('Invalid move coordinates');
      return;
    }

    // Force horizontal line by keeping Y coordinate the same as start
    coords.y = currentLine.start.y;

    setCurrentLine(prev => ({
      ...prev,
      end: coords
    }));

    redrawCanvas();
  };

  // Finish line drawing on mouse up
  const finishLineDrawing = (event) => {
    if (!isDrawing || !canvasRef.current || !imageRef.current) return;

    const coords = getRelativeImageCoordinates(event);
    if (!coords) {
      console.warn('Invalid end coordinates');
      setIsDrawing(false);
      setCurrentLine(null);
      return;
    }

    // Force horizontal line
    coords.y = currentLine.start.y;

    const finalLine = {
      start: currentLine.start,
      end: coords
    };

    // Calculate distance
    const distance = Math.abs(finalLine.end.x - finalLine.start.x);
    console.log('Line distance:', distance, 'px');

    if (distance < MIN_LINE_LENGTH) {
      console.warn(`Line too short (distance: ${distance}px). Clearing.`);
      setIsDrawing(false);
      setCurrentLine(null);
      redrawCanvas();
      return;
    }

    // Ensure start_x is always less than end_x
    if (finalLine.start.x > finalLine.end.x) {
      const temp = finalLine.start;
      finalLine.start = finalLine.end;
      finalLine.end = temp;
    }

    console.log('Finished line:', finalLine);
    setIsDrawing(false);
    setCurrentLine(finalLine);
    sendLineUpdate(finalLine);
    redrawCanvas();
  };
  
  // Handle resize start
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = cameraSize.width;
    const startHeight = cameraSize.height;
    
    setIsResizing(true);
    setShowResizeInfo(true);
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      
      // Calculate new width, constrained to minimum of 320px
      const newWidth = Math.max(320, startWidth + deltaX);
      
      // Calculate height based on aspect ratio
      const newHeight = Math.round(newWidth / imageAspectRatio);
      
      setCameraSize({
        width: newWidth,
        height: newHeight
      });
      
      // Notify parent if onResize callback is provided
      if (onResize) {
        onResize({ width: newWidth, height: newHeight });
      }
      
      moveEvent.preventDefault();
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      setIsResizing(false);
      setTimeout(() => setShowResizeInfo(false), 1000);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Helper function to try extracting and displaying image data from various message formats
  const tryExtractAndShowImage = (data) => {
    try {
      // Check multiple potential payload locations
      let imageData = null;
      let imagePayload = null;
      
      // Case 1: data.payload is an object with image property
      if (data.payload && typeof data.payload === 'object' && data.payload.image) {
        imageData = data.payload.image;
        imagePayload = data.payload;
      }
      // Case 2: data.payload is a string that might be JSON
      else if (data.payload && typeof data.payload === 'string') {
        try {
          const parsedPayload = JSON.parse(data.payload);
          if (parsedPayload && parsedPayload.image) {
            imageData = parsedPayload.image;
            imagePayload = parsedPayload;
          }
        } catch (e) {
          // Silent catch - not valid JSON
        }
      }
      // Case 3: data itself has an image property
      else if (data.image) {
        imageData = data.image;
        imagePayload = data;
      }
      
      if (imageData) {
        setLastMqttResponse(imagePayload);
        updateVideoWithBase64Image(imageData);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error trying to extract image data:', err);
      return false;
    }
  };

  // State variables for camera settings
  const [cropToGraph, setCropToGraph] = useState(false);
  const [streamCropImage, setStreamCropImage] = useState(true); // Default to true for backward compatibility

  // Start crop frame streaming
  const startCropStreaming = () => {
    if (!mqttClient || mqttClient.readyState !== WebSocket.OPEN) {
      console.error('Cannot start crop streaming: WebSocket not connected');
      return;
    }
    
    if (!cropRange || cropRange.every(val => val === 0)) {
      console.error('Cannot start crop streaming: No crop region defined');
      return;
    }
    
    // Stop any existing crop interval
    stopCropStreaming();
    
    // If we're starting crop streaming, stop full frame streaming
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Send crop request with interval in the payload - server will handle streaming
    const message = {
      topic: `${mqttTopic}/request/crop_frame`,
      payload: {
        interval: cropInterval, // Pass actual interval to server
        crop_range: cropRange,
        to_graph: cropToGraph, // Add flag to indicate if the crop should be processed for graph
        stream_image: streamCropImage // Add flag to indicate if the image should be sent
      }
    };
    
    console.log(`Starting crop streaming with interval ${cropInterval}ms`, message);
    mqttClient.send(JSON.stringify(message));
    setLastPublishedMessage(message);
    
    // Set streaming state if interval > 0 and we want to stream images
    if (cropInterval > 0 && (streamCropImage || cropToGraph)) {
      setIsCropStreaming(true);
      setIsWaitingForCropResponse(true);
    } else {
      // Single frame request
      setIsWaitingForCropResponse(true);
    }
  };
  
  // Stop crop frame streaming
  const stopCropStreaming = () => {
    if (cropIntervalRef.current) {
      clearInterval(cropIntervalRef.current);
      cropIntervalRef.current = null;
    }
    
    if (mqttClient && mqttClient.readyState === WebSocket.OPEN) {
      // Send message to stop streaming (interval=0)
      const message = {
        topic: `${mqttTopic}/request/crop_frame`,
        payload: {
          interval: 0,
          crop_range: cropRange
        }
      };
      
      mqttClient.send(JSON.stringify(message));
      setLastPublishedMessage(message);
    }
    
    setIsCropStreaming(false);
    setIsWaitingForCropResponse(false); // Reset waiting state when stopping
  };
  
  // Convert crop points to crop range
  const pointsToCropRange = (start, end) => {
    if (!start || !end) return [0, 0, 0, 0];
    
    // Ensure start is top-left and end is bottom-right
    const x_min = Math.min(start.x, end.x);
    const y_min = Math.min(start.y, end.y);
    const x_max = Math.max(start.x, end.x);
    const y_max = Math.max(start.y, end.y);
    
    return [x_min, y_min, x_max, y_max];
  };
  
  // Handle crop start (mousedown)
  const startCropDrawing = (event) => {
    if (!isCropMode || !canvasRef.current || !imageRef.current) return;
    
    event.preventDefault();
    
    const coords = getRelativeImageCoordinates(event);
    if (!coords) return;
    
    setIsDrawingCrop(true);
    setCropStart(coords);
    setCropEnd(coords);
  };
  
  // Handle crop update (mousemove)
  const updateCropDrawing = (event) => {
    if (!isDrawingCrop || !isCropMode) return;
    
    event.preventDefault();
    
    const coords = getRelativeImageCoordinates(event);
    if (!coords) return;
    
    setCropEnd(coords);
    
    // Update the crop range during drawing
    setCropRange(pointsToCropRange(cropStart, coords));
    
    // Redraw canvas to show current crop rectangle
    redrawCanvas();
  };
  
  // Handle crop end (mouseup)
  const finishCropDrawing = (event) => {
    if (!isDrawingCrop || !isCropMode) return;
    
    event.preventDefault();
    
    const coords = getRelativeImageCoordinates(event);
    if (!coords) {
      setIsDrawingCrop(false);
      return;
    }
    
    setCropEnd(coords);
    
    // Calculate final crop range
    const newCropRange = pointsToCropRange(cropStart, coords);
    
    // Check if crop size is valid
    const width = newCropRange[2] - newCropRange[0];
    const height = newCropRange[3] - newCropRange[1];
    
    if (width < MIN_CROP_SIZE || height < MIN_CROP_SIZE) {
      console.warn(`Crop rectangle too small (${width}x${height}px). Minimum size is ${MIN_CROP_SIZE}x${MIN_CROP_SIZE}px.`);
      setIsDrawingCrop(false);
      // Reset crop
      setCropStart(null);
      setCropEnd(null);
      setCropRange([0, 0, 0, 0]);
      redrawCanvas();
      return;
    }
    
    // Set the final crop range
    setCropRange(newCropRange);
    setIsDrawingCrop(false);
    
    // Request a single cropped frame to preview
    requestCroppedFrame(newCropRange);
    
    // Redraw to show the final crop rectangle
    redrawCanvas();
  };
  
  // Request a single cropped frame
  const requestCroppedFrame = (range) => {
    if (!mqttClient || mqttClient.readyState !== WebSocket.OPEN) return;
    
    const message = {
      topic: `${mqttTopic}/request/crop_frame`,
      payload: {
        interval: 0, // Single frame
        crop_range: range,
        to_graph: cropToGraph, // Add flag to indicate if the crop should be processed for graph
        stream_image: streamCropImage // Add flag to indicate if the image should be sent
      }
    };
    
    mqttClient.send(JSON.stringify(message));
    setLastPublishedMessage(message);
    setIsWaitingForCropResponse(true);
  };

  // Handle manual crop range input change
  const handleCropRangeChange = (index, value) => {
    const newCropRange = [...cropRange];
    newCropRange[index] = parseInt(value) || 0;
    
    // Ensure min <= max
    if (index === 0 && newCropRange[0] > newCropRange[2]) {
      newCropRange[2] = newCropRange[0];
    }
    if (index === 1 && newCropRange[1] > newCropRange[3]) {
      newCropRange[3] = newCropRange[1];
    }
    if (index === 2 && newCropRange[2] < newCropRange[0]) {
      newCropRange[0] = newCropRange[2];
    }
    if (index === 3 && newCropRange[3] < newCropRange[1]) {
      newCropRange[1] = newCropRange[3];
    }
    
    setCropRange(newCropRange);
    redrawCanvas();
  };

  // Toggle crop mode
  const toggleCropMode = () => {
    const newCropMode = !isCropMode;
    setIsCropMode(newCropMode);
    
    if (!newCropMode) {
      // Exiting crop mode, clean up and restart full frame streaming
      setIsDrawingCrop(false);
      stopCropStreaming();
      
      // Restart full frame streaming if camera is active
      if (isCameraActive && mqttClient && mqttClient.readyState === WebSocket.OPEN) {
        startStreaming(mqttClient);
      }
    } else {
      // Entering crop mode, stop full frame streaming
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Stop line drawing if active
      setIsDrawing(false);
    }
    
    redrawCanvas();
  };

  // Reset crop
  const resetCrop = () => {
    setCropStart(null);
    setCropEnd(null);
    setCropRange([0, 0, 0, 0]);
    setCropPreviewImage(null);
    stopCropStreaming();
    redrawCanvas();
  };

  // Render crop controls
  const renderCropControls = () => {
    return (
      <div style={floatingComponentStyles.cropControls}>
        <h4 style={floatingComponentStyles.cropTitle}>Crop Frame Settings</h4>
        
        <div style={floatingComponentStyles.cropInputGroup}>
          <label style={floatingComponentStyles.cropLabel}>X Min:</label>
          <input 
            type="number" 
            value={cropRange[0]} 
            onChange={(e) => handleCropRangeChange(0, e.target.value)}
            style={floatingComponentStyles.cropInput}
            disabled={!isCameraActive}
          />
          
          <label style={floatingComponentStyles.cropLabel}>Y Min:</label>
          <input 
            type="number" 
            value={cropRange[1]} 
            onChange={(e) => handleCropRangeChange(1, e.target.value)}
            style={floatingComponentStyles.cropInput}
            disabled={!isCameraActive}
          />
        </div>
        
        <div style={floatingComponentStyles.cropInputGroup}>
          <label style={floatingComponentStyles.cropLabel}>X Max:</label>
          <input 
            type="number" 
            value={cropRange[2]} 
            onChange={(e) => handleCropRangeChange(2, e.target.value)}
            style={floatingComponentStyles.cropInput}
            disabled={!isCameraActive}
          />
          
          <label style={floatingComponentStyles.cropLabel}>Y Max:</label>
          <input 
            type="number" 
            value={cropRange[3]} 
            onChange={(e) => handleCropRangeChange(3, e.target.value)}
            style={floatingComponentStyles.cropInput}
            disabled={!isCameraActive}
          />
        </div>
        
        <div style={floatingComponentStyles.cropInputGroup}>
          <label style={floatingComponentStyles.cropLabel}>Interval (ms):</label>
          <input 
            type="number" 
            value={cropInterval} 
            onChange={(e) => setCropInterval(parseInt(e.target.value) || 0)}
            style={floatingComponentStyles.cropInput}
            min="0"
            step="100"
            disabled={!isCameraActive}
          />
          <div style={floatingComponentStyles.cropHint}>
            0 = single capture
          </div>
        </div>
        
        <div style={floatingComponentStyles.cropButtonGroup}>
          <button
            style={buttonVariants.smallSecondary}
            onClick={toggleCropMode}
            disabled={!isCameraActive}
          >
            {isCropMode ? 'Exit Crop Mode' : 'Enter Crop Mode'}
          </button>
          
          <button
            style={buttonVariants.smallSecondary}
            onClick={resetCrop}
            disabled={!isCameraActive || cropRange.every(val => val === 0)}
          >
            Reset Crop
          </button>
        </div>
        
        <div style={floatingComponentStyles.checkboxGroup}>
          <label style={floatingComponentStyles.checkboxLabel}>
            <input
              type="checkbox"
              checked={streamCropImage}
              onChange={(e) => setStreamCropImage(e.target.checked)}
              style={floatingComponentStyles.checkbox}
              disabled={!isCameraActive}
            />
            Stream Image
          </label>
          
          <label style={floatingComponentStyles.checkboxLabel}>
            <input
              type="checkbox"
              checked={cropToGraph}
              onChange={(e) => setCropToGraph(e.target.checked)}
              style={floatingComponentStyles.checkbox}
              disabled={!isCameraActive}
            />
            To Graph
          </label>
        </div>
        
        <div style={floatingComponentStyles.cropButtonGroup}>
          {!isCropStreaming ? (
            <button
              style={buttonVariants.smallPrimary}
              onClick={startCropStreaming}
              disabled={!isCameraActive || cropRange.every(val => val === 0) || (!streamCropImage && !cropToGraph)}
            >
              {cropInterval > 0 ? 'Start Streaming' : 'Capture Frame'}
            </button>
          ) : (
            <button
              style={{...buttonVariants.smallPrimary, backgroundColor: 'rgba(255, 50, 50, 0.7)'}}
              onClick={stopCropStreaming}
            >
              Stop Streaming
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render crop preview
  const renderCropPreview = () => {
    return (
      <div style={floatingComponentStyles.cropPreviewContainer}>
        <h4 style={floatingComponentStyles.cropTitle}>Crop Preview</h4>
        {cropPreviewImage ? (
          <img 
            src={cropPreviewImage}
            alt="Cropped preview"
            style={floatingComponentStyles.cropPreviewImage}
          />
        ) : (
          <div style={floatingComponentStyles.cropPreviewPlaceholder}>
            No crop preview available
          </div>
        )}
      </div>
    );
  };

  // Function to render the configuration menu
  const renderConfigMenu = () => {
    // Handler for input changes within the config menu
    const handleConfigChange = (section, key, value) => {
      setPendingConfig(prev => {
        const newConfig = JSON.parse(JSON.stringify(prev)); // Deep copy
        if (section === 'roi') {
          // ROI is an array [x, y, w, h]
          const roiIndex = {'x': 0, 'y': 1, 'w': 2, 'h': 3}[key];
          newConfig.processing.roi[roiIndex] = parseInt(value) || 0;
        } else {
          newConfig[section][key] = value;
        }
        
        // Trigger redraw immediately after ROI change
        if (section === 'roi') {
          requestAnimationFrame(redrawCanvas);
        }
        return newConfig;
      });
    };
    
    // Handler to send config update
    const applyConfigChanges = () => {
      if (pendingConfig) {
        sendCameraConfigUpdate(pendingConfig);
      }
    };

    if (!pendingConfig) {
      return <div>Loading configuration...</div>; // Or some loading indicator
    }
    
    const roi = pendingConfig.processing.roi || [0, 0, 0, 0];
    
    return (
      <div style={floatingComponentStyles.configMenuContainer}>
        <h4>Camera Configuration</h4>
        
        {/* Exposure Settings */}
        <div style={floatingComponentStyles.configRow}>
          <label style={floatingComponentStyles.configLabel}>Exposure Time (μs):</label>
          <input 
            type="number"
            value={pendingConfig.camera.exposure_time || ''}
            onChange={(e) => handleConfigChange('camera', 'exposure_time', e.target.value)}
            style={floatingComponentStyles.configInput}
            disabled={pendingConfig.camera.exposure_mode !== 'manual'}
          />
        </div>
        <div style={floatingComponentStyles.configRow}>
          <label style={floatingComponentStyles.configLabel}>Exposure Mode:</label>
          <select
            value={pendingConfig.camera.exposure_mode || 'auto'}
            onChange={(e) => handleConfigChange('camera', 'exposure_mode', e.target.value)}
            style={floatingComponentStyles.configInput}
          >
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        
        {/* ISO Setting */}
        <div style={floatingComponentStyles.configRow}>
          <label style={floatingComponentStyles.configLabel}>ISO:</label>
          <input 
            type="number"
            value={pendingConfig.camera.iso || ''} // Handle null case
            onChange={(e) => handleConfigChange('camera', 'iso', e.target.value ? parseInt(e.target.value) : null)} // Send null if empty
            style={floatingComponentStyles.configInput}
            min="100" // Example range, adjust as needed
            max="1600"
            step="100"
          />
        </div>
        
        <button 
          style={{...buttonVariants.smallPrimary, marginTop: '10px'}}
          onClick={applyConfigChanges}
        >
          Apply Configuration
        </button>
      </div>
    );
  };
  
  // Function to send camera configuration update via MQTT
  const sendCameraConfigUpdate = (configToSend) => {
    if (mqttClient && mqttClient.readyState === WebSocket.OPEN) {
      const message = {
        topic: `${mqttTopic}/request/set_config`, // Assuming this is the topic the backend listens on
        payload: configToSend
      };
      console.log("Sending config update:", message);
      mqttClient.send(JSON.stringify(message));
      setLastPublishedMessage(message);
      // Optional: Maybe reset pendingConfig or wait for confirmation?
    } else {
      console.error('Cannot send config: WebSocket not connected');
    }
  };

  // Centralized drawing function
  const redrawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = imageRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw line if we have valid coordinates
    if (currentLine && currentLine.start && currentLine.end) {
      ctx.beginPath();
      ctx.moveTo(currentLine.start.x, currentLine.start.y);
      ctx.lineTo(currentLine.end.x, currentLine.end.y);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw crop rectangle if in crop mode and we have valid coordinates
    if (isCropMode && cropRange && cropRange.some(val => val !== 0)) {
      const [x_min, y_min, x_max, y_max] = cropRange;
      
      // Draw rectangle
      ctx.beginPath();
      ctx.rect(x_min, y_min, x_max - x_min, y_max - y_min);
      
      // Use green while drawing, yellow when set
      if (isDrawingCrop) {
        ctx.strokeStyle = 'green';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      } else {
        ctx.strokeStyle = 'yellow';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
      }
      
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Semi-transparent fill
      ctx.fill();
      
      // Draw corner markers
      const markerSize = 5;
      ctx.fillStyle = isDrawingCrop ? 'green' : 'yellow';
      
      // Top-left
      ctx.fillRect(x_min - markerSize, y_min - markerSize, markerSize * 2, markerSize * 2);
      // Top-right
      ctx.fillRect(x_max - markerSize, y_min - markerSize, markerSize * 2, markerSize * 2);
      // Bottom-left
      ctx.fillRect(x_min - markerSize, y_max - markerSize, markerSize * 2, markerSize * 2);
      // Bottom-right
      ctx.fillRect(x_max - markerSize, y_max - markerSize, markerSize * 2, markerSize * 2);
    }
  };

  return (
    <div style={floatingComponentStyles.container}>
      <h3 style={floatingComponentStyles.title}>Spectrometer Feed</h3>
      
      {/* MQTT Topic input */}
      <div style={floatingComponentStyles.mqttInputs}>
        <label style={floatingComponentStyles.inputLabel}>MQTT Topic:</label>
        <input 
          type="text"
          value={mqttTopic}
          onChange={(e) => setMqttTopic(e.target.value)}
          style={floatingComponentStyles.input}
          disabled={isCameraActive}
          placeholder="e.g. spectrometer_1"
        />
      </div>
      
      {/* Polling interval */}
      <div style={floatingComponentStyles.mqttInputs}>
        <label style={floatingComponentStyles.inputLabel}>Poll Rate:</label>
        <input 
          type="range"
          min="100"
          max="2000"
          step="100"
          value={pollingInterval}
          onChange={(e) => setPollingInterval(parseInt(e.target.value))}
          style={floatingComponentStyles.slider}
          disabled={!isCameraActive}
        />
        <span style={floatingComponentStyles.value}>{pollingInterval}ms</span>
      </div>
      
      {/* Camera view with line drawing capability */}
      <div 
        ref={cameraContainerRef}
        style={floatingComponentStyles.cameraView}
        onMouseDown={isCameraActive ? (isCropMode ? startCropDrawing : startLineDrawing) : undefined}
        onMouseMove={isCameraActive ? (isCropMode ? updateCropDrawing : updateLineDrawing) : undefined}
        onMouseUp={isCameraActive ? (isCropMode ? finishCropDrawing : finishLineDrawing) : undefined}
        onMouseLeave={isCameraActive ? (isCropMode ? finishCropDrawing : finishLineDrawing) : undefined}
      >
        {!isCameraActive && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#999' }}>
            Device feed will appear here when connected
          </div>
        )}
        
        <canvas 
          ref={canvasRef}
          style={{
            ...floatingComponentStyles.canvas,
            aspectRatio: `${cameraSize.width} / ${cameraSize.height}`,
            cursor: isCameraActive ? (isCropMode ? 'crosshair' : 'crosshair') : 'default'
          }}
          width={cameraSize.width}
          height={cameraSize.height}
        />
        
        {/* Drawing mode indicators */}
        {isCameraActive && !isLineDrawn && !isDrawing && !isCropMode && (
          <div style={floatingComponentStyles.overlayText}>
            Click and drag to draw a line
          </div>
        )}
        
        {isCameraActive && isCropMode && !isDrawingCrop && (
          <div style={floatingComponentStyles.overlayText}>
            Click and drag to define crop region
          </div>
        )}
        
        {/* Drawing indicators */}
        {isDrawing && (
          <div style={floatingComponentStyles.overlayText}>
            Drawing line...
          </div>
        )}
        
        {isDrawingCrop && (
          <div style={floatingComponentStyles.overlayText}>
            Drawing crop region...
          </div>
        )}
        
        {/* Connection status indicator */}
        <div style={floatingComponentStyles.connectionStatusOverlay}>
          <div style={{...floatingComponentStyles.statusIndicator, backgroundColor: isMqttConnected ? '#0f0' : '#f00' }}></div>
          {isMqttConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        {/* Resize info overlay */}
        {showResizeInfo && (
          <div style={floatingComponentStyles.resizeInfo}>
            {cameraSize.width} × {cameraSize.height}
          </div>
        )}
        
        {/* Resize handle */}
        <div 
          style={floatingComponentStyles.resizeHandle}
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
      
      {/* Add button to toggle config menu */}
      <button 
        style={{...buttonVariants.smallSecondary, marginTop: '8px'}}
        onClick={() => {
          // Initialize default config if none exists
          if (!pendingConfig) {
            setPendingConfig({
              camera: { 
                exposure_time: 10000, 
                exposure_mode: 'auto', 
                iso: 100,
                resolution: [cameraSize.width, cameraSize.height]
              },
              processing: { 
                roi: [0, 0, cameraSize.width, cameraSize.height] 
              }
            });
          }
          setShowConfigMenu(!showConfigMenu);
        }}
      >
        {showConfigMenu ? 'Hide Config' : 'Show Config'}
      </button>

      {/* Configuration Menu (conditional rendering) */}
      {showConfigMenu && renderConfigMenu()}
      
      {/* Line adjustment controls */}
      {isLineDrawn && (
        <div style={floatingComponentStyles.lineControls}>
          <div style={floatingComponentStyles.controlRow}>
            <label style={floatingComponentStyles.controlLabel}>Y Offset:</label>
            <input 
              type="range"
              min="-50"
              max="50"
              value={lineYOffset}
              onChange={handleLineYOffsetChange}
              style={floatingComponentStyles.slider}
            />
            <span style={floatingComponentStyles.value}>{lineYOffset}px</span>
          </div>
          
          <div style={floatingComponentStyles.controlRow}>
            <label style={floatingComponentStyles.controlLabel}>X Offset:</label>
            <input 
              type="range"
              min="-50"
              max="50"
              value={lineXOffset}
              onChange={handleLineXOffsetChange}
              style={floatingComponentStyles.slider}
            />
            <span style={floatingComponentStyles.value}>{lineXOffset}px</span>
          </div>
        </div>
      )}
      
      {/* Crop controls and preview */}
      <div style={floatingComponentStyles.cropSection}>
        {renderCropControls()}
        {renderCropPreview()}
      </div>
      
      {/* Debug panel */}
      {debugMode && (
        <div style={floatingComponentStyles.debugPanel}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
            <strong>MQTT Debug:</strong>
            <button 
              onClick={() => setDebugMode(false)}
              style={floatingComponentStyles.debugHideButton}
            >
              Hide
            </button>
          </div>
          <div style={{margin: '4px 0'}}>Status: {isMqttConnected ? '✅ Connected' : '❌ Disconnected'}</div>
          <div style={{margin: '4px 0'}}>Topic ID: <span style={{color: '#4CAF50'}}>{mqttTopic}</span></div>
          <div style={{margin: '4px 0'}}>WebSocket Connection: <span style={{color: '#4CAF50'}}>{WS_URL}</span></div>
          <div style={{margin: '4px 0'}}>MQTT Broker: {mqttSettings.protocol}://{mqttSettings.host}:{mqttSettings.port} (via WebSocket server)</div>
          
          {/* Display request waiting state */}
          <div style={{margin: '4px 0'}}>
            Waiting for full frame: <span style={{color: isWaitingForResponse ? '#f44336' : '#4CAF50'}}>
              {isWaitingForResponse ? 'Yes' : 'No'}
            </span>
          </div>
          <div style={{margin: '4px 0'}}>
            Waiting for crop frame: <span style={{color: isWaitingForCropResponse ? '#f44336' : '#4CAF50'}}>
              {isWaitingForCropResponse ? 'Yes' : 'No'}
            </span>
          </div>
          
          {/* Display aspect ratio and resolution information */}
          <div style={floatingComponentStyles.debugInfoRow}>
            <div>
              <strong>Display:</strong> {cameraSize.width}x{cameraSize.height}
            </div>
            <div>
              <strong>Aspect Ratio:</strong> {imageAspectRatio.toFixed(2)}
            </div>
            <div>
              <strong>Resolution:</strong> {cameraResolution}
            </div>
          </div>
          
          <div style={floatingComponentStyles.debugMessageBlock}>
            <div><strong>Last published:</strong></div>
            <pre style={floatingComponentStyles.debugPre}>
              {lastPublishedMessage ? JSON.stringify(lastPublishedMessage, null, 2) : 'None'}
            </pre>
          </div>
          <div style={floatingComponentStyles.debugMessageBlock}>
            <div><strong>Last received:</strong></div>
            <pre style={floatingComponentStyles.debugPre}>
              {lastReceivedMessage ? 
                (lastReceivedMessage.payload && typeof lastReceivedMessage.payload === 'object' && lastReceivedMessage.payload.image ? 
                  `${JSON.stringify({...lastReceivedMessage, payload: {...lastReceivedMessage.payload, image: '[Image data truncated]'}}, null, 2)}` : 
                  JSON.stringify(lastReceivedMessage, null, 2)
                ) : 'None'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});

// Add custom styles for crop features to floating component styles
const cropStyles = {
  cropSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: '15px',
    gap: '15px',
  },
  cropControls: {
    flex: '1',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '5px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  cropPreviewContainer: {
    flex: '1',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '5px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cropTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  cropInputGroup: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  cropLabel: {
    width: '60px',
    fontSize: '12px',
  },
  cropInput: {
    width: '60px',
    padding: '4px',
    marginRight: '10px',
    border: '1px solid #ccc',
    borderRadius: '3px',
  },
  cropButtonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
    gap: '8px',
  },
  cropHint: {
    fontSize: '11px',
    color: '#666',
    marginLeft: '5px',
  },
  cropPreviewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '3px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
  },
  cropPreviewPlaceholder: {
    width: '100%',
    height: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '12px',
    border: '1px dashed #ccc',
    borderRadius: '3px',
  },
  toGraphLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#fff',
    marginLeft: '8px'
  },
  toGraphCheckbox: {
    margin: 0
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#fff',
    cursor: 'pointer'
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer'
  },
};

// Add the crop styles to the floatingComponentStyles object
Object.assign(floatingComponentStyles, cropStyles);

// Add display name for debugging
MQTTCameraComponent.displayName = 'MQTTCameraComponent';

export default MQTTCameraComponent; 