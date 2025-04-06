import React, { useState, useRef, useEffect } from 'react';
import DraggablePanel from './DraggablePanel';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../styles/backgroundStyles';
import styles from './styles/USBSpectrometerStyles';
import { WS_URL } from '../../config'; // Import WS_URL

// Import subcomponents
import MQTTCameraComponent from './SpectrometerMQTT/MQTTCameraComponent';
import MQTTGraphComponent from './SpectrometerMQTT/MQTTGraphComponent';
import MQTTWaterfallComponent from './SpectrometerMQTT/MQTTWaterfallComponent';
import MQTTSettingsComponent from './SpectrometerMQTT/MQTTSettingsComponent';

// Add MQTT-specific styles to complement the existing styles
const mqttStyles = {
  cameraSettings: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px'
  },
  mqttInputs: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px'
  },
  inputLabel: {
    width: '90px',
    color: '#ccc',
    fontSize: '14px'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(60, 60, 60, 0.7)',
    border: '1px solid rgba(100, 100, 100, 0.5)',
    borderRadius: '4px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '14px'
  }
};

// Available waterfall color schemes
const waterfallColorSchemeOptions = {
  grayscale: 'Grayscale',
  viridis: 'Viridis',
  plasma: 'Plasma',
  inferno: 'Inferno',
  cividis: 'Cividis',
  turbo: 'Turbo'
};

const SpectrometerMQTT = ({ detector, readings = [], onClose, initialPosition = { x: 150, y: 100 }, detectorId, detectorName, isVisible, position, onMove, onResize, detectorStatus }) => {
  const buttonVariants = useButtonStyles();
  const [detectorReadings, setDetectorReadings] = useState([]);
  
  // Panel resizing state
  const [panelSize, setPanelSize] = useState({ width: 1100, height: 750 });
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const panelRef = useRef(null);
  
  // Add state for resize feedback
  const [showResizeInfo, setShowResizeInfo] = useState(false);
  
  // Subcomponent visibility toggles
  const [showCamera, setShowCamera] = useState(true);
  const [showGraph, setShowGraph] = useState(true);
  const [showWaterfall, setShowWaterfall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Data state - replace lineData with spectrumData
  const [spectrumData, setSpectrumData] = useState(null); // Data from spectrometer
  const [processedData, setProcessedData] = useState(null); // Data from crop processing

  // Track if we're currently using processed crop data
  const [usingCropData, setUsingCropData] = useState(false);
  
  // Save/load settings state
  const [saveMessage, setSaveMessage] = useState('');
  const [cameraSettings, setCameraSettings] = useState(null);
  const [calibrationSettings, setCalibrationSettings] = useState(null);
  
  // Frame accumulation state (shared between Graph and Waterfall)
  const [frameAccumCount, setFrameAccumCount] = useState(10);
  const [isAccumulating, setIsAccumulating] = useState(true);
  
  // Waterfall color scheme state
  const [waterfallColorScheme, setWaterfallColorScheme] = useState('cividis');
  const [showWaterfallColorMenu, setShowWaterfallColorMenu] = useState(false);
  
  // References to component methods
  const wsRef = useRef(null); // Ref to hold the WebSocket instance
  const mqttTopicRef = useRef('spectrometer_1'); // Ref to hold the current MQTT topic
  const cameraRef = useRef(null);
  const graphRef = useRef(null);
  
  // Handle frame accumulation change
  const handleFrameAccumCountChange = (count) => {
    setFrameAccumCount(count);
  };
  
  // Handle accumulation mode toggle
  const handleAccumulationToggle = (isActive) => {
    setIsAccumulating(isActive);
  };
  
  // Handle waterfall color scheme change
  const handleWaterfallColorSchemeChange = (scheme) => {
    setWaterfallColorScheme(scheme);
    setShowWaterfallColorMenu(false);
  };
  
  // Process readings when they change
  useEffect(() => {
    if (readings && readings.length > 0 && detector?.data?.properties) {
      // Process readings here
      setDetectorReadings(readings);
    }
  }, [readings, detector]);
  
  // Effect for WebSocket connection and message handling
  useEffect(() => {
    if (!detectorId) return; // Need detectorId to form topic

    const mainDataTopic = `${detectorId}/response/data`; // Default data topic
    mqttTopicRef.current = mainDataTopic;

    // Flag to track if the component is still mounted
    let isMounted = true;

    console.log('[SpectrometerMQTT] Connecting WebSocket...', WS_URL);
    const newWs = new WebSocket(WS_URL);
    wsRef.current = newWs;

    newWs.onopen = () => {
      // Check if the component is still mounted and connection wasn't closed
      if (!isMounted || newWs.readyState !== WebSocket.OPEN) {
        console.log('[SpectrometerMQTT] WebSocket connected but component unmounted or connection closed');
        return;
      }

      console.log('[SpectrometerMQTT] WebSocket connected');

      try {
        // Subscribe to the data topic
        const subscribeData = {
          topic: "common/subscribe",
          payload: mainDataTopic
        };
        
        // Make sure WebSocket is still valid before sending
        if (newWs && newWs.readyState === WebSocket.OPEN) {
          newWs.send(JSON.stringify(subscribeData));
          console.log(`[SpectrometerMQTT] Subscribed to: ${mainDataTopic}`);
        } else {
          console.warn('[SpectrometerMQTT] Cannot subscribe: WebSocket not available or not open');
        }
      } catch (err) {
        console.error('[SpectrometerMQTT] Error in onopen handler:', err);
      }
    };

    newWs.onmessage = (event) => {
      if (!isMounted) return;
      
      try {
        const data = JSON.parse(event.data);

        // Check if the message is on the subscribed data topic
        if (data.topic === mqttTopicRef.current) {
          let parsedPayload = null;
          if (data.payload && typeof data.payload === 'string') {
            try {
              parsedPayload = JSON.parse(data.payload);
            } catch (e) { /* Ignore if not JSON */ }
          } else if (data.payload && typeof data.payload === 'object') {
            parsedPayload = data.payload;
          }

          // Check if payload contains spectral data
          if (parsedPayload) {
            // Check if this is processed graph data (from crop)
            if (parsedPayload.red && parsedPayload.green && parsedPayload.blue && parsedPayload.intensities) {
              console.log('[SpectrometerMQTT] Received processed graph data from crop');
              
              // Transform data to expected format for the graph
              const graphData = {
                pixelData: {
                  timestamp: parsedPayload.timestamp,
                  positions: parsedPayload.wavelengths,
                  red: parsedPayload.red,
                  green: parsedPayload.green,
                  blue: parsedPayload.blue,
                  intensity: parsedPayload.intensities,
                  lineLength: parsedPayload.wavelengths.length
                }
              };
              
              setProcessedData(graphData);
              setUsingCropData(true);  // Flag that we're using crop data
            }
            // Check if this is spectral data (wavelengths + intensities)
            else if (parsedPayload.wavelengths && parsedPayload.intensities) {
              console.log('[SpectrometerMQTT] Received spectral data');
              setSpectrumData(parsedPayload);
              
              // Only switch to spectral data if we're not actively using crop data
              if (!usingCropData) {
                // Transform data to expected format for the graph components
                const wavelengthRange = [
                  Math.min(...parsedPayload.wavelengths), 
                  Math.max(...parsedPayload.wavelengths)
                ];
                
                // Normalize positions to 0-1 range
                const positions = parsedPayload.wavelengths.map(w => 
                  (w - wavelengthRange[0]) / (wavelengthRange[1] - wavelengthRange[0])
                );
                
                // Create uniform intensity arrays for RGB
                const intensity = parsedPayload.intensities;
                
                // Create graph data format
                const graphData = {
                  pixelData: {
                    timestamp: parsedPayload.timestamp || Date.now(),
                    positions: positions,
                    red: intensity,
                    green: intensity,
                    blue: intensity,
                    intensity: intensity,
                    lineLength: intensity.length
                  }
                };
                
                setProcessedData(graphData);
              }
            } else if (parsedPayload.error) {
              console.warn(`[SpectrometerMQTT] Received error from backend: ${parsedPayload.error}`);
              // Don't clear data on error - just leave the previous data
            } else {
              console.warn('[SpectrometerMQTT] Received data message with unexpected payload:', parsedPayload);
            }
          }
        }

      } catch (error) {
        console.error('[SpectrometerMQTT] Error processing WebSocket message:', error, 'Raw:', event.data);
      }
    };

    newWs.onerror = (error) => {
      if (!isMounted) return;
      console.error('[SpectrometerMQTT] WebSocket error:', error);
    };

    newWs.onclose = (event) => {
      if (!isMounted) return;
      console.log('[SpectrometerMQTT] WebSocket closed:', event.code, event.reason);
      if (wsRef.current === newWs) {
        wsRef.current = null;
      }
      // Don't clear data on disconnect - just keep the last values
    };

    // Cleanup function
    return () => {
      isMounted = false;
      
      // Store a reference to the current WebSocket
      const ws = wsRef.current;
      
      // Important: Set wsRef.current to null BEFORE closing
      // This prevents race conditions with the onopen callback
      wsRef.current = null;
      
      if (ws) {
        console.log('[SpectrometerMQTT] Closing WebSocket connection...');
        try {
          // Only close if it's still in a state that can be closed
          if (ws.readyState === WebSocket.CONNECTING || 
              ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        } catch (err) {
          console.error('[SpectrometerMQTT] Error closing WebSocket:', err);
        }
      }
    };

  }, [detectorId]); // Reconnect if detectorId changes

  // Handle crop data toggle
  const handleCropDataToggle = (isEnabled) => {
    setUsingCropData(isEnabled);
  };
  
  // Save camera and calibration settings
  const saveSettings = () => {
    try {
      // Get camera settings
      const camSettings = cameraRef.current?.getSettings();
      
      // Get calibration settings from graph component
      const calSettings = graphRef.current?.getCalibrationSettings();
      
      if (!camSettings && !calSettings) {
        console.warn('No settings to save - components may not be mounted');
        setSaveMessage('No settings to save');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      // Create a settings object to save
      const settings = {
        camera: camSettings || null,
        calibration: calSettings || null,
        timestamp: new Date().toISOString(),
        detectorId: detectorId || 'default',
        // Save waterfall settings
        waterfall: {
          colorScheme: waterfallColorScheme
        }
      };
      
      // Save to localStorage
      localStorage.setItem(`detector_settings_${detectorId || 'default'}`, JSON.stringify(settings));
      
      // Set save message for user feedback
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Error saving settings');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  
  // Export settings to JSON file
  const exportSettings = () => {
    try {
      // Get camera settings
      const camSettings = cameraRef.current?.getSettings();
      
      // Get calibration settings from graph component
      const calSettings = graphRef.current?.getCalibrationSettings();
      
      if (!camSettings && !calSettings) {
        console.warn('No settings to export - components may not be mounted');
        setSaveMessage('No settings to export');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      // Create a settings object to export
      const settings = {
        camera: camSettings || null,
        calibration: calSettings || null,
        timestamp: new Date().toISOString(),
        detectorId: detectorId || 'default',
        // Export waterfall settings
        waterfall: {
          colorScheme: waterfallColorScheme
        }
      };
      
      // Create a file name with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '_');
      const fileName = `detector_settings_${detectorId || 'default'}_${timestamp}.json`;
      
      // Create a Blob with the JSON data
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      
      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Append to the document, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Set save message for user feedback
      setSaveMessage('Settings exported to file');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to export settings:', error);
      setSaveMessage('Error exporting settings');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  
  // Load saved camera and calibration settings
  const loadSettings = () => {
    try {
      // Get settings from localStorage
      const savedSettingsStr = localStorage.getItem(`detector_settings_${detectorId || 'default'}`);
      if (!savedSettingsStr) {
        setSaveMessage('No saved settings found');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      // Parse the settings
      const savedSettings = JSON.parse(savedSettingsStr);
      
      // Apply camera settings if available
      if (savedSettings.camera && cameraRef.current) {
        try {
          cameraRef.current.applySettings(savedSettings.camera);
        } catch (err) {
          console.error('Error applying camera settings:', err);
        }
      }
      
      // Apply calibration settings if available
      if (savedSettings.calibration && graphRef.current) {
        try {
          graphRef.current.applyCalibrationSettings(savedSettings.calibration);
        } catch (err) {
          console.error('Error applying calibration settings:', err);
        }
      }
      
      // Apply waterfall settings if available
      if (savedSettings.waterfall?.colorScheme) {
        setWaterfallColorScheme(savedSettings.waterfall.colorScheme);
      }
      
      // Make sure camera is started automatically
      setTimeout(async () => {
        if (cameraRef.current && typeof cameraRef.current.startCamera === 'function') {
          try {
            await cameraRef.current.startCamera();
            console.log('Camera started automatically after loading settings');
          } catch (err) {
            console.error('Failed to auto-start camera:', err);
          }
        }
      }, 500); // Short delay to allow settings to be applied
      
      // Set save message for user feedback
      setSaveMessage('Settings loaded successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSaveMessage('Error loading settings');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  
  // Import settings from a JSON file
  const importSettings = () => {
    try {
      // Create a file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      
      // Handle file selection
      fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            // Parse the file contents
            const importedSettings = JSON.parse(e.target.result);
            
            // Apply camera settings if available
            if (importedSettings.camera && cameraRef.current) {
              try {
                cameraRef.current.applySettings(importedSettings.camera);
              } catch (err) {
                console.error('Error applying imported camera settings:', err);
              }
            }
            
            // Apply calibration settings if available
            if (importedSettings.calibration && graphRef.current) {
              try {
                graphRef.current.applyCalibrationSettings(importedSettings.calibration);
              } catch (err) {
                console.error('Error applying imported calibration settings:', err);
              }
            }
            
            // Apply waterfall settings if available
            if (importedSettings.waterfall?.colorScheme) {
              setWaterfallColorScheme(importedSettings.waterfall.colorScheme);
            }
            
            // Make sure camera is started automatically
            setTimeout(async () => {
              if (cameraRef.current && typeof cameraRef.current.startCamera === 'function') {
                try {
                  await cameraRef.current.startCamera();
                  console.log('Camera started automatically after loading settings');
                } catch (err) {
                  console.error('Failed to auto-start camera:', err);
                }
              }
            }, 500); // Short delay to allow settings to be applied
            
            // Set save message for user feedback
            setSaveMessage('Settings imported successfully');
            setTimeout(() => setSaveMessage(''), 3000);
          } catch (parseError) {
            console.error('Failed to parse imported settings file:', parseError);
            setSaveMessage('Error: Invalid settings file');
            setTimeout(() => setSaveMessage(''), 3000);
          }
        };
        
        reader.onerror = () => {
          setSaveMessage('Error reading file');
          setTimeout(() => setSaveMessage(''), 3000);
        };
        
        // Read the file as text
        reader.readAsText(file);
      };
      
      // Trigger file selection dialog
      fileInput.click();
    } catch (error) {
      console.error('Failed to import settings:', error);
      setSaveMessage('Error importing settings');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
  
  // Handler for panel resizing - completely rewritten for reliability
  const handlePanelResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get initial coordinates and size
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panelRef.current?.offsetWidth || panelSize.width;
    const startHeight = panelRef.current?.offsetHeight || panelSize.height;
    
    // Show resize feedback
    setIsResizingPanel(true);
    setShowResizeInfo(true);
    
    // Define move handler
    function handleMouseMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newWidth = Math.max(400, startWidth + deltaX);
      const newHeight = Math.max(300, startHeight + deltaY);
      
      // Update panel size
      setPanelSize({
        width: newWidth,
        height: newHeight
      });
      
      // Prevent default to avoid text selection during resize
      moveEvent.preventDefault();
    }
    
    // Define up handler
    function handleMouseUp() {
      // Clean up
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      setIsResizingPanel(false);
      setTimeout(() => setShowResizeInfo(false), 800);
    }
    
    // Attach handlers to document to capture events outside component
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Toggle visibility of subcomponents
  const toggleCamera = () => setShowCamera(!showCamera);
  const toggleGraph = () => setShowGraph(!showGraph);
  const toggleWaterfall = () => setShowWaterfall(!showWaterfall);
  const toggleSettings = () => setShowSettings(!showSettings);
  
  // Styles for toggle buttons
  const getToggleButtonStyle = (isActive) => ({
    ...buttonVariants.smallSecondary,
    opacity: isActive ? 1 : 0.5,
    marginRight: '4px',
    marginBottom: '4px'
  });
  
  // Handle subcomponent resize events
  const handleCameraResize = (newSize) => {
    console.log('Camera resized:', newSize);
    // Additional logic if needed
  };
  
  const handleGraphResize = (newSize) => {
    console.log('Graph resized:', newSize);
    // Additional logic if needed
  };
  
  const handleWaterfallResize = (newSize) => {
    console.log('Waterfall resized:', newSize);
    // Additional logic if needed
  };
  
  // Handle settings changes
  const handleSettingsChange = (settings) => {
    console.log('Settings changed:', settings);
    // Update relevant state/behavior based on settings
  };
  
  // Render panel content
  if (!detector) return null;
  
  return (
    <DraggablePanel 
      title={`MQTT Spectrometer: ${detector.label || detector.id}`}
      initialPosition={initialPosition}
      width={panelSize.width}
      height={panelSize.height}
      onClose={onClose}
    >
      <div 
        ref={panelRef}
        style={{
          ...styles.container,
          width: `${panelSize.width}px`,
          height: `${panelSize.height}px`,
          minHeight: '300px',
          position: 'relative',
          border: isResizingPanel ? '1px dashed #4CAF50' : 'none',
          transition: isResizingPanel ? 'none' : 'border 0.3s ease',
        }}
      >
        {/* Top control bar */}
        <div style={styles.controlBar}>
          <div>
            <span style={styles.controlLabel}>Components:</span>
            
            <button 
              onClick={toggleCamera} 
              style={getToggleButtonStyle(showCamera)}
            >
              {showCamera ? '📹 Hide Camera' : '📹 Show Camera'}
            </button>
            
            <button 
              onClick={toggleGraph} 
              style={getToggleButtonStyle(showGraph)}
            >
              {showGraph ? '📊 Hide Graph' : '📊 Show Graph'}
            </button>
            
            <button 
              onClick={toggleWaterfall} 
              style={getToggleButtonStyle(showWaterfall)}
            >
              {showWaterfall ? '🌊 Hide Waterfall' : '🌊 Show Waterfall'}
            </button>
            
            <button 
              onClick={toggleSettings} 
              style={getToggleButtonStyle(showSettings)}
            >
              {showSettings ? '⚙️ Hide Settings' : '⚙️ Show Settings'}
            </button>
            
            <span style={{ marginLeft: '15px', borderLeft: '1px solid rgba(255, 255, 255, 0.2)', paddingLeft: '10px' }}>
              <button 
                onClick={saveSettings} 
                style={{
                  ...buttonVariants.smallPrimary,
                  marginRight: '4px',
                  marginBottom: '4px',
                  backgroundColor: 'rgba(50, 150, 50, 0.7)'
                }}
                title="Save camera and calibration settings to browser storage"
              >
                💾 Save Settings
              </button>
              
              <button 
                onClick={exportSettings} 
                style={{
                  ...buttonVariants.smallPrimary,
                  marginRight: '4px',
                  marginBottom: '4px',
                  backgroundColor: 'rgba(120, 120, 30, 0.7)'
                }}
                title="Export camera and calibration settings to JSON file"
              >
                📤 Export Settings
              </button>
              
              <button 
                onClick={loadSettings} 
                style={{
                  ...buttonVariants.smallPrimary,
                  marginRight: '4px',
                  marginBottom: '4px',
                  backgroundColor: 'rgba(50, 100, 150, 0.7)'
                }}
                title="Load saved camera and calibration settings from browser storage"
              >
                📥 Load Settings
              </button>
              
              <button 
                onClick={importSettings} 
                style={{
                  ...buttonVariants.smallPrimary,
                  marginRight: '4px',
                  marginBottom: '4px',
                  backgroundColor: 'rgba(120, 70, 150, 0.7)'
                }}
                title="Import camera and calibration settings from JSON file"
              >
                📁 Import File
              </button>
              
              {saveMessage && (
                <span style={{
                  fontSize: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  marginLeft: '8px'
                }}>
                  {saveMessage}
                </span>
              )}
            </span>
          </div>
        </div>
        
        {/* Two-column layout container */}
        <div style={styles.columnsContainer}>
          {/* Left column - Camera component */}
          <div style={{ 
            display: showCamera ? 'block' : 'none',
            flex: '1 1 50%',
            minWidth: '320px',
            maxWidth: '650px',
            marginRight: '10px'
          }}>
            <MQTTCameraComponent
              ref={cameraRef}
              onResize={handleCameraResize}
              detectorId={detectorId}
            />
          </div>
          
          {/* Right column with multiple components */}
          <div style={{
            ...styles.rightColumn,
            flex: '1 1 50%'
          }}>
            {/* Graph component */}
            {showGraph && (
              <MQTTGraphComponent 
                ref={graphRef}
                onResize={handleGraphResize}
                lineData={processedData}  // Use processedData instead of spectrumData
                // Pass the frame accumulation props up to parent to manage
                onFrameAccumCountChange={handleFrameAccumCountChange}
                onAccumulationToggle={handleAccumulationToggle}
              />
            )}
            
            {/* Waterfall component */}
            {showWaterfall && (
              <MQTTWaterfallComponent 
                onResize={handleWaterfallResize}
                lineData={processedData}  // Use processedData instead of spectrumData
                frameAccumCount={frameAccumCount}
                isAccumulating={isAccumulating}
                colorScale={waterfallColorScheme}
                onColorScaleChange={handleWaterfallColorSchemeChange}
              />
            )}
            
            {/* Settings component */}
            {showSettings && (
              <MQTTSettingsComponent 
                onSettingChange={(setting, value) => console.log('Setting changed:', setting, value)}
              />
            )}
          </div>
        </div>
        
        {/* Show resize info when active */}
        {showResizeInfo && (
          <div style={{
            position: 'absolute',
            right: '30px',
            bottom: '30px',
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            borderRadius: '3px',
            fontSize: '12px',
            zIndex: 1000
          }}>
            {Math.round(panelSize.width)} x {Math.round(panelSize.height)}
          </div>
        )}
        
        {/* Panel resize handle - make sure this comes last */}
        <div 
          style={styles.resizeHandle}
          onMouseDown={handlePanelResizeStart}
          title="Drag to resize panel"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            style={{ display: 'block' }}
          >
            <rect width="20" height="20" fill="transparent" />
            <path 
              d="M14,6 L6,14 M17,9 L9,17 M17,13 L13,17" 
              stroke="white" 
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default SpectrometerMQTT; 