import React, { useState, useEffect } from 'react';
import { useReactFlow } from 'react-flow-renderer';
import defaultProperties from '../../data/defaultProperties.json';
import { backgroundVariants } from '../../styles/backgroundStyles';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { WS_URL } from '../../config';
import FlowchartUploader from './FlowchartUploader';

// For WebSocket connection
const WebSocket = window.WebSocket || window.MozWebSocket;

const SidePanel = ({ onAddNode, onImportFlow, nodes, edges, onProceed, onScanDevices, detectedDevices = [] }) => {
  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState('pump');  // Default to first type
  const [nodeTypes, setNodeTypes] = useState([]);    // State to store node types
  const [localWs, setLocalWs] = useState(null);
  const [localDevices, setLocalDevices] = useState([]);
  const [exportFilename, setExportFilename] = useState('flow');  // Default filename
  const [isDevicesExpanded, setIsDevicesExpanded] = useState(true);
  const [isDataControlExpanded, setIsDataControlExpanded] = useState(true);
  const [isAddNodeExpanded, setIsAddNodeExpanded] = useState(true);
  const { toObject } = useReactFlow();  // Access React Flow instance
  
  // Get dynamic button styles
  const buttonVariants = useButtonStyles();

  // Use either parent-provided devices or local devices
  const effectiveDevices = detectedDevices.length > 0 ? detectedDevices : localDevices;

  // Set up a local WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('SidePanel connected to WebSocket server');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Check if payload is a string that looks like JSON and parse it
        if (data.payload && typeof data.payload === 'string') {
          // Check if the string starts and ends with quotes (already serialized string)
          if (data.payload.startsWith('"') && data.payload.endsWith('"')) {
            // Remove the extra quotes
            data.payload = data.payload.substring(1, data.payload.length - 1);
          }
        }
        
        // Check if this is a device response message
        if (data.topic === 'common/device_response') {
          console.log('Device response received in SidePanel:', data);
          
          // Parse the payload - format is "MQTTname:type"
          const responseData = data.payload.toString();
          const [MQTTname, type] = responseData.split(':');
          
          if (MQTTname && type) {
            setLocalDevices(prev => {
              // Check if device is already in the list
              const exists = prev.some(device => device.MQTTname === MQTTname);
              if (!exists) {
                console.log(`New device detected locally: ${MQTTname} (${type})`);
                
                // Update the global list for CustomNode to use
                window.detectedDevices = [...prev, { MQTTname, type }];
                
                return [...prev, { MQTTname, type }];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message in SidePanel:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('SidePanel WebSocket error:', error);
    };

    setLocalWs(websocket);

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, []);

  // Load node types from the defaultProperties.json on mount
  useEffect(() => {
    const types = Object.keys(defaultProperties).filter(key => key !== 'edges'); // Load node types, ignoring "edges"
    setNodeTypes(types);
    setNodeType(types[0]);  // Set the default node type to the first in the list
  }, []);

  // Direct scan function
  const handleLocalScan = () => {
    console.log('Performing direct scan from SidePanel');
    
    // Reset local device list
    setLocalDevices([]);
    
    // First try the parent's scan function
    if (onScanDevices) {
      console.log('Calling parent scan function');
      onScanDevices();
    }
    
    // As a backup, use our local WebSocket connection
    if (localWs && localWs.readyState === WebSocket.OPEN) {
      console.log('Sending scan request via local WebSocket');
      const scanMessage = {
        topic: "common/device_scan",
        payload: {}
      };
      
      localWs.send(JSON.stringify(scanMessage));
      console.log('Sent device scan message from SidePanel');
    } else {
      console.error('Local WebSocket is not connected');
    }
  };

  // Make the scan function available globally for debugging
  useEffect(() => {
    window.scanForDevices = handleLocalScan;
  }, [localWs]);

  const handleAddNode = () => {
    //const nodeProperties = defaultProperties[nodeType].properties || [];  // Load properties based on nodeType
    const nodeLabel = nodeName || 'Unnamed Node';
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'customNode',  // React Flow type
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label: nodeLabel, // Set node label
        type: nodeType,  // Set node type, e.g., 'pump'
        properties: defaultProperties[nodeType]?.properties || {},  // Include node properties
        parameters: defaultProperties[nodeType]?.parameters || {},
      },
    };
  
    console.log('New Node with Properties:', newNode);  // Log the new node
    onAddNode(newNode);  // Pass the new node to FlowchartEditor
  };

  // Export flow as JSON
  const handleExport = () => {
    const flow = toObject();
    const json = JSON.stringify(flow, null, 2);  // Pretty-print JSON
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Use the user-provided filename or default to 'flow'
    const filename = exportFilename.trim() || 'flow';
    
    // Ensure filename has .json extension
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle flowchart selection from the uploader
  const handleFlowchartSelect = (flowchartData) => {
    if (onImportFlow) {
      onImportFlow(JSON.stringify(flowchartData));
    }
  };

  const handleAddDeviceNode = (device) => {
    // Get available node types from defaultProperties
    const availableNodeTypes = Object.keys(defaultProperties).filter(key => key !== 'edges');
    
    // First try to match the exact device type with available node types
    let matchedNodeType = availableNodeTypes.find(type => type.toLowerCase() === device.type.toLowerCase());
    
    // If no exact match, check common device categories
    if (!matchedNodeType) {
      if (device.type.toLowerCase().includes('pump')) {
        matchedNodeType = 'pump';
      } else if (device.type.toLowerCase().includes('detect')) {
        matchedNodeType = 'detector';
      } else if (device.type.toLowerCase().includes('therm') || device.type.toLowerCase().includes('temp')) {
        matchedNodeType = 'thermostat';
      } else if (device.type.toLowerCase().includes('led') || device.type.toLowerCase().includes('light')) {
        matchedNodeType = 'led';
      } else {
        // Default to the first node type if no match found
        matchedNodeType = availableNodeTypes[0];
        console.warn(`No matching node type found for device type: ${device.type}. Using ${matchedNodeType} as fallback.`);
      }
    }

    // Create a copy of the properties with the MQTTname value set
    let properties = [];
    if (defaultProperties[matchedNodeType]?.properties) {
      properties = JSON.parse(JSON.stringify(defaultProperties[matchedNodeType].properties));
      // Set MQTTname property if it exists
      for (let prop of properties) {
        if (prop.name === 'MQTTname') {
          prop.default = device.MQTTname;
        }
      }
    }

    // Create the new node
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'customNode',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label: device.MQTTname, // Set label to MQTT name
        type: matchedNodeType, // Set node type
        MQTTname: device.MQTTname, // Explicitly set MQTT name in data
        properties: properties,
        parameters: defaultProperties[matchedNodeType]?.parameters || {},
      },
    };

    console.log('New Device Node:', newNode);
    onAddNode(newNode);
  };

  const styles = {
    panel: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '250px',
      height: '100vh',
      padding: '20px',
      paddingBottom: '80px', // Extra padding at bottom to ensure all content is visible
      overflowY: 'auto',     // Main scrollbar for entire panel
      zIndex: 10,
      backgroundColor: '#222',
      color: '#eee',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.5)',
      border: '1px solid #444'
    },
    section: {
      marginBottom: '20px',
    },
    input: {
      display: 'block',
      margin: '10px 0',
      padding: '5px',
      width: '100%',
      backgroundColor: '#333',
      color: '#fff',
      border: '1px solid #555'
    },
    collapsibleSection: {
      marginTop: '20px',
      marginBottom: '20px',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      padding: '8px',
      backgroundColor: '#333',
      borderRadius: '4px 4px 0 0',
      userSelect: 'none',
    },
    sectionContent: isExpanded => ({
      maxHeight: isExpanded ? 'none' : '0',
      overflow: isExpanded ? 'visible' : 'hidden',
      backgroundColor: '#333',
      borderRadius: '0 0 4px 4px',
      display: isExpanded ? 'block' : 'none', // Use display property instead of max-height for animation
    }),
    contentPadding: {
      padding: '10px',
    },
    deviceSection: {
      marginTop: '20px',
      marginBottom: '20px',
    },
    deviceHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      padding: '8px',
      backgroundColor: '#333',
      borderRadius: '4px 4px 0 0',
      userSelect: 'none',
    },
    deviceContent: {
      maxHeight: isDevicesExpanded ? '300px' : '0',
      overflow: 'hidden',
      transition: 'max-height 0.3s ease-in-out',
      backgroundColor: '#333',
      borderRadius: '0 0 4px 4px',
    },
    deviceList: {
      marginTop: '10px',
      marginBottom: '10px',
      backgroundColor: '#333',
      padding: '10px',
      borderRadius: '4px'
    },
    deviceItem: {
      padding: '8px',
      marginBottom: '8px',
      borderBottom: '1px solid #444',
      borderRadius: '4px',
      backgroundColor: '#2a2a2a',
      transition: 'background-color 0.2s ease',
      '&:hover': {
        backgroundColor: '#333'
      }
    },
    chevron: isExpanded => ({
      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.3s ease',
      fontSize: '12px',
    }),
    buttonRow: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px'
    },
    exportSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '15px'
    },
    flowchartItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid #444'
    },
    buttonGroup: {
      display: 'flex',
      gap: '5px'
    }
  };

  return (
    <div style={styles.panel}>
      <h3>Flowchart Editor</h3>
      
      <div style={styles.collapsibleSection}>
        <div 
          style={styles.sectionHeader}
          onClick={() => setIsAddNodeExpanded(!isAddNodeExpanded)}
        >
          <h4 style={{ margin: 0 }}>Add New Element</h4>
          <span style={styles.chevron(isAddNodeExpanded)}>▼</span>
        </div>
        <div style={styles.sectionContent(isAddNodeExpanded)}>
          <div style={styles.contentPadding}>
            <input
              type="text"
              placeholder="Node Name"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              style={styles.input}
            />
            <select value={nodeType} onChange={(e) => setNodeType(e.target.value)} style={styles.input}>
              {nodeTypes.map((type) => (
                <option key={type} value={type}>
                  {defaultProperties[type].label}
                </option>
              ))}
            </select>
            <button onClick={handleAddNode} style={{...buttonVariants.primaryButton, width: '100%', marginTop: '10px'}}>
              Add Node
            </button>
          </div>
        </div>
      </div>

      <div style={styles.collapsibleSection}>
        <div 
          style={styles.sectionHeader}
          onClick={() => setIsDevicesExpanded(!isDevicesExpanded)}
        >
          <h4 style={{ margin: 0 }}>Detected Devices</h4>
          <span style={styles.chevron(isDevicesExpanded)}>▼</span>
        </div>
        <div style={styles.sectionContent(isDevicesExpanded)}>
          <div style={styles.contentPadding}>
            {effectiveDevices.length > 0 ? (
              <div style={styles.deviceList}>
                {effectiveDevices.map((device, index) => (
                  <div key={index} style={{
                    ...styles.deviceItem,
                    ':hover': { backgroundColor: '#333' }
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {device.type.toLowerCase().includes('pump') ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 8H5V10H7V20H17V10H19V8M9 10H15V18H9V10Z" fill="#8c8"/>
                          </svg>
                        ) : device.type.toLowerCase().includes('detect') ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#8cf"/>
                          </svg>
                        ) : device.type.toLowerCase().includes('therm') || device.type.toLowerCase().includes('temp') ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 13V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V13C7.79 14.07 7 15.71 7 17.5C7 20.54 9.46 23 12.5 23C15.54 23 18 20.54 18 17.5C18 15.71 17.21 14.07 16 13M12 7C11.45 7 11 6.55 11 6C11 5.45 11.45 5 12 5C12.55 5 13 5.45 13 6C13 6.55 12.55 7 12 7Z" fill="#f88"/>
                          </svg>
                        ) : device.type.toLowerCase().includes('led') || device.type.toLowerCase().includes('light') ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6C15.31 6 18 8.69 18 12C18 14.97 15.84 17.44 13 17.92V22H11V17.92C8.16 17.44 6 14.97 6 12C6 8.69 8.69 6 12 6M12 4C7.58 4 4 7.58 4 12C4 15.3 6.1 18.1 9 19.24V24H15V19.24C17.9 18.1 20 15.3 20 12C20 7.58 16.42 4 12 4Z" fill="#ff8"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C17.5 2 22 6.5 22 12C22 17.5 17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2ZM12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4ZM12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6ZM12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8Z" fill="#aaa"/>
                          </svg>
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#fff' }}>{device.MQTTname}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{device.type}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddDeviceNode(device)} 
                        style={{...buttonVariants.smallSecondary, fontSize: '11px', margin: '0', display: 'flex', alignItems: 'center', gap: '3px'}}>
                        <span>To Node</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#888', padding: '10px', textAlign: 'center', fontStyle: 'italic' }}>
                No devices detected
              </div>
            )}
            <button 
              onClick={handleLocalScan} 
              style={{...buttonVariants.secondaryButton, width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C17.5 2 22 6.5 22 12C22 12.38 21.97 12.75 21.92 13.13C21.97 13.42 22 13.71 22 14C22 17.31 19.31 20 16 20V18.92C16.61 18.55 17.16 18.05 17.6 17.5C19.17 16.33 20 14.21 20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 14.21 4.83 16.33 6.4 17.5C6.84 18.05 7.39 18.55 8 18.92V20C4.69 20 2 17.31 2 14C2 13.71 2.03 13.42 2.08 13.13C2.03 12.75 2 12.38 2 12C2 6.5 6.5 2 12 2M7 10C7 8.9 7.9 8 9 8C10.1 8 11 8.9 11 10C11 11.1 10.11 12 9 12C7.89 12 7 11.1 7 10M16 8C17.1 8 18 8.9 18 10C18 11.1 17.11 12 16 12C14.89 12 14 11.1 14 10C14 8.9 14.9 8 16 8M12 14C13.75 14 15.29 14.72 16.19 15.81L14.77 17.23C14.32 16.5 13.25 16 12 16C10.75 16 9.68 16.5 9.23 17.23L7.81 15.81C8.71 14.72 10.25 14 12 14Z" fill="currentColor"/>
              </svg>
              Scan Devices
            </button>
          </div>
        </div>
      </div>

      <div style={styles.collapsibleSection}>
        <div 
          style={styles.sectionHeader}
          onClick={() => setIsDataControlExpanded(!isDataControlExpanded)}
        >
          <h4 style={{ margin: 0 }}>Data Control</h4>
          <span style={styles.chevron(isDataControlExpanded)}>▼</span>
        </div>
        <div style={styles.sectionContent(isDataControlExpanded)}>
          <div style={styles.contentPadding}>
            <FlowchartUploader onFlowchartSelect={handleFlowchartSelect} />
            
            <h4 style={{ marginTop: '15px' }}>Export Flow</h4>
            <div style={styles.exportSection}>
              <input
                type="text"
                placeholder="Export Filename"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                style={styles.input}
              />
              <button 
                onClick={handleExport} 
                style={{...buttonVariants.secondaryButton, width: '100%', marginTop: '10px'}}>
                Export Flow
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <button 
        onClick={onProceed} 
        style={{...buttonVariants.primaryButton, width: '100%', marginTop: '15px'}}>
        Next
      </button>
    </div>
  );
};

export default SidePanel;
