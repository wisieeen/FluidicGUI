import React, { useState, useRef, useEffect } from 'react';
import DraggablePanel from './DraggablePanel';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../styles/backgroundStyles';
import styles from './styles/NewDetectorPanelStyles';

// Import subcomponents
import CameraComponent from './DetectorComponents/CameraComponent';
import GraphComponent from './DetectorComponents/GraphComponent';
import WaterfallComponent from './DetectorComponents/WaterfallComponent';
import SettingsComponent from './DetectorComponents/SettingsComponent';

// Available waterfall color schemes
const waterfallColorSchemeOptions = {
  grayscale: 'Grayscale',
  viridis: 'Viridis',
  plasma: 'Plasma',
  inferno: 'Inferno',
  cividis: 'Cividis',
  turbo: 'Turbo'
};

const NewDetectorPanel = ({ detector, readings = [], onClose, initialPosition = { x: 150, y: 100 }, detectorId, detectorName, isVisible, position, onMove, onResize, detectorStatus }) => {
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
  
  // Data state
  const [lineData, setLineData] = useState(null);
  
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
  
  // Handle camera line data changes
  const handleLineDataChange = (data) => {
    setLineData(data);
    
    // Note: The camera component will continue to send updates even when hidden,
    // as long as the camera is active and a line is drawn
  };
  
  // Render panel content
  if (!detector) return null;
  
  return (
    <DraggablePanel 
      title={`Detector: ${detector.label || detector.id}`}
      initialPosition={initialPosition}
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
          <div style={{ display: showCamera ? 'block' : 'none' }}>
            <CameraComponent 
              ref={cameraRef}
              onResize={handleCameraResize} 
              onLineDataChange={handleLineDataChange}
            />
          </div>
          
          {/* Right column with multiple components */}
          <div style={styles.rightColumn}>
            {/* Graph component */}
            {showGraph && (
              <GraphComponent 
                ref={graphRef}
                onResize={handleGraphResize}
                lineData={lineData}
                // Pass the frame accumulation props up to parent to manage
                onFrameAccumCountChange={handleFrameAccumCountChange}
                onAccumulationToggle={handleAccumulationToggle}
              />
            )}
            
            {/* Waterfall component */}
            {showWaterfall && (
              <WaterfallComponent 
                onResize={handleWaterfallResize}
                lineData={lineData}
                frameAccumCount={frameAccumCount}
                isAccumulating={isAccumulating}
                colorScale={waterfallColorScheme}
                onColorScaleChange={handleWaterfallColorSchemeChange}
              />
            )}
            
            {/* Settings component */}
            {showSettings && (
              <SettingsComponent 
                onSettingChange={(setting, value) => console.log('Setting changed:', setting, value)}
              />
            )}
          </div>
        </div>
        
        <button 
          style={{ ...buttonVariants.secondaryButton, width: '100%' }} 
          onClick={onClose}
        >
          Close
        </button>
        
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

export default NewDetectorPanel; 