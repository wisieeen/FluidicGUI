import React, { useState, useEffect } from 'react';
import { useReactFlow } from 'react-flow-renderer';
import defaultProperties from '../../data/defaultProperties.json';
import { backgroundVariants } from '../../styles/backgroundStyles';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';

// For WebSocket connection
const WebSocket = window.WebSocket || window.MozWebSocket;

const SidePanel = ({ onAddNode, onImportFlow, nodes, edges, onProceed, onScanDevices, detectedDevices = [] }) => {
  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState('pump');  // Default to first type
  const [nodeTypes, setNodeTypes] = useState([]);    // State to store node types
  const [localWs, setLocalWs] = useState(null);
  const [localDevices, setLocalDevices] = useState([]);
  const { toObject } = useReactFlow();  // Access React Flow instance
  
  // Get dynamic button styles
  const buttonVariants = useButtonStyles();

  // Use either parent-provided devices or local devices
  const effectiveDevices = detectedDevices.length > 0 ? detectedDevices : localDevices;

  // Set up a local WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:4000');
    
    websocket.onopen = () => {
      console.log('SidePanel connected to WebSocket server');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
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

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flow.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import flow from JSON
  const handleImport = (event) => {
    const fileReader = new FileReader();
    
    fileReader.onload = (e) => {
      const importedFlow = e.target.result;  // This is the raw file content
      if (onImportFlow) {
        onImportFlow(importedFlow);  // Pass the imported data to the function
      }
    };
    
    fileReader.readAsText(event.target.files[0]);  // Ensure the file is read as text
  };

  const styles = {
    panel: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '250px',
      height: 'auto',
      minHeight: '0vh',
      maxHeight: '90vh',
      padding: '20px',
      paddingBottom: '30px',
      overflowY: 'auto',
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
    deviceList: {
      marginTop: '20px',
      marginBottom: '20px',
      backgroundColor: '#333',
      padding: '10px',
      borderRadius: '4px'
    },
    deviceItem: {
      padding: '5px 0',
      borderBottom: '1px solid #444'
    }
  };

  return (
    <div style={styles.panel}>
      <h3>Add New Element</h3>
      <div style={styles.section}>
        <h4>Add Node</h4>
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
              {defaultProperties[type].label} {/* Load label from JSON */}
            </option>
          ))}
        </select>
        <button onClick={handleAddNode} style={buttonVariants.primaryButton}>
          Add Node
        </button>
      </div>

      {effectiveDevices.length > 0 && (
        <div style={styles.section}>
          <h4>Detected Devices</h4>
          <div style={styles.deviceList}>
            {effectiveDevices.map((device, index) => (
              <div key={index} style={styles.deviceItem}>
                <strong>{device.MQTTname}</strong>: {device.type}
              </div>
            ))}
          </div>
        </div>
      )}

      <h3>Data Control</h3>
      <div>
        <button onClick={handleExport} style={buttonVariants.secondaryButton}>
          Export Flow (JSON)
        </button>
        <input
          type="file"
          accept=".json"
          onChange={handleImport}
          style={styles.input}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={handleLocalScan} 
            style={buttonVariants.secondaryButton}>
            Scan for Devices
          </button>
          <button onClick={onProceed} style={buttonVariants.primaryButton}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
