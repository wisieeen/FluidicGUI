import React, { useState, useEffect, useContext } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { backgroundVariants } from '../../styles/backgroundStyles';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';

// Import the JSON data for node properties
import defaultProperties from '../../data/defaultProperties.json';

// Create a global event emitter for communication between components
if (!window.customEvents) {
  window.customEvents = {
    openSpectrometer: (node) => {
      console.log('Global openSpectrometer called, but no handler is registered');
    },
    setSpectrometerHandler: (handler) => {
      window.customEvents.openSpectrometer = handler;
      console.log('Spectrometer handler registered');
    },
    openPump: (node) => {
      console.log('Global openPump called, but no handler is registered');
    },
    setPumpHandler: (handler) => {
      window.customEvents.openPump = handler;
      console.log('Pump handler registered');
    }
  };
}

const CustomNode = ({ data, id, selected, onClick }) => {
  const [expanded, setExpanded] = useState(false); // State to manage expansion
  const [nodeProperties, setNodeProperties] = useState([]); // Store the properties from JSON
  const [isCustomMqttInput, setIsCustomMqttInput] = useState(false); // State for MQTT input mode
  const buttonVariants = useButtonStyles();
  
  const handleContextMenu = (event) => {
    event.preventDefault();
    console.log('Right-click detected on node:', id); // Log the right-click
    if (data.onContextMenu) {
      data.onContextMenu(event);  // Pass the event to the parent if a handler is provided
    }
  };

  // Debugging: Check if defaultProperties and data.type are loaded correctly
  useEffect(() => {
    console.log('Default Properties:', defaultProperties); // Check if the JSON is loaded correctly
  
    if (defaultProperties[data.type]) {
      console.log('Node Type Found:', data.type);
      setNodeProperties(defaultProperties[data.type].properties);
    } else {
      console.log('Node Type Not Found:', data.type);
      setNodeProperties([]);
    }
  }, [data.type, data.properties]);

  // Toggle expand/collapse
  const toggleExpand = () => setExpanded(!expanded);

  // Handler for opening USBSpectrometer
  const handleOpenSpectrometer = (event) => {
    event.stopPropagation(); // Prevent node selection
    console.log("Opening spectrometer for node:", data);
    
    // Find MQTTname from properties array if not directly on data object
    let mqttName = data.MQTTname;
    
    // If MQTTname isn't directly on the data object, look for it in properties array
    if (!mqttName && data.properties) {
      const mqttNameProp = data.properties.find(prop => prop.name === 'MQTTname');
      mqttName = mqttNameProp ? (data[mqttNameProp.name] || mqttNameProp.default) : undefined;
    }
    
    // Prepare the node data to send to the global handler
    const spectrometerNodeData = {
      id: id,
      label: data.label,
      type: data.type === 'MQTTSpectrometer' ? 'MQTTSpectrometer' : 'USBSpectrometer',
      MQTTname: mqttName
    };
    
    console.log("Sending spectrometer node data with MQTTname:", mqttName);
    
    // Use the global event system to communicate with App component
    if (window.customEvents && window.customEvents.openSpectrometer) {
      console.log("Calling global openSpectrometer handler");
      window.customEvents.openSpectrometer(spectrometerNodeData);
    } else {
      console.error("Global openSpectrometer handler not found");
    }
  };

  // Handler for opening Pump control panel
  const handleOpenPump = (event) => {
    event.stopPropagation(); // Prevent node selection
    console.log("Opening pump control for node:", data);
    
    // Find MQTTname from properties array if not directly on data object
    let mqttName = data.MQTTname;
    
    // If MQTTname isn't directly on the data object, look for it in properties array
    if (!mqttName && data.properties) {
      const mqttNameProp = data.properties.find(prop => prop.name === 'MQTTname');
      mqttName = mqttNameProp ? (data[mqttNameProp.name] || mqttNameProp.default) : undefined;
    }
    
    // Prepare the node data to send to the global handler
    const pumpNodeData = {
      id: id,
      label: data.label,
      type: 'pump',
      MQTTname: mqttName
    };
    
    console.log("Sending pump node data with MQTTname:", mqttName);
    
    // Use the global event system to communicate with App component
    if (window.customEvents && window.customEvents.openPump) {
      console.log("Calling global openPump handler");
      window.customEvents.openPump(pumpNodeData);
    } else {
      console.error("Global openPump handler not found");
    }
  };

  // Render properties dynamically based on node type from JSON
  const renderProperties = () => {
    if (!data.properties || data.properties.length === 0) {
      return <div>No properties to display</div>;
    }

    return data.properties.map((property) => {
      // Special handling for MQTTname property
      if (property.name === 'MQTTname') {
        // Check if current MQTTname matches any detected device
        const matchingDevice = window.detectedDevices ? 
          window.detectedDevices.find(device => device.MQTTname === data[property.name]) : null;
        
        return (
          <div key={property.name} style={styles.propertyItem}>
            <div style={styles.mqttLabelContainer}>
              <label style={styles.mqttLabel}>
                {property.label}
                {matchingDevice && (
                  <span style={styles.matchedDeviceIndicator}> (Matched: {matchingDevice.type})</span>
                )}
              </label>
              
              {isCustomMqttInput ? (
                // Text input for custom MQTT name
                <div style={{ display: 'flex', width: '100%' }}>
                  <input
                    type="text"
                    value={data[property.name] !== undefined ? data[property.name] : property.default}
                    onChange={(e) => data.onPropertyChange(property.name, e.target.value)}
                    style={{
                      ...styles.propertyInput,
                      ...(matchingDevice ? styles.matchedInput : {}),
                      borderTopRightRadius: '0',
                      borderBottomRightRadius: '0',
                      flex: 1
                    }}
                    placeholder="Enter custom name"
                  />
                  <button
                    onClick={() => setIsCustomMqttInput(false)}
                    style={styles.customInputToggle}
                  >
                    ↓
                  </button>
                </div>
              ) : (
                // Dropdown select for choosing from detected devices
                <div style={{ display: 'flex', width: '100%' }}>
                  <select
                    style={{
                      ...styles.propertyInput,
                      ...(matchingDevice ? styles.matchedInput : {}),
                      borderTopRightRadius: '0',
                      borderBottomRightRadius: '0',
                      flex: 1
                    }}
                    value={data[property.name] !== undefined ? data[property.name] : property.default}
                    onChange={(e) => data.onPropertyChange(property.name, e.target.value)}
                  >
                    {/* Current value */}
                    <option value={data[property.name] !== undefined ? data[property.name] : property.default}>
                      {data[property.name] !== undefined ? data[property.name] : property.default}
                    </option>
                    
                    {/* Detected devices - only show if not already selected */}
                    {window.detectedDevices && window.detectedDevices
                      .filter(device => device.MQTTname !== data[property.name])
                      .map((device, idx) => (
                        <option key={idx} value={device.MQTTname}>
                          {device.MQTTname} ({device.type})
                        </option>
                      ))
                    }
                  </select>
                  <button
                    onClick={() => setIsCustomMqttInput(true)}
                    style={styles.customInputToggle}
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Standard rendering for other properties
      return (
        <div key={property.name} style={styles.propertyItem}>
          {property.type === 'boolean' ? (
            <div style={styles.booleanProperty}>
              <input
                type="checkbox"
                checked={data[property.name] || property.default}
                onChange={(e) => data.onPropertyChange(property.name, e.target.checked)}
                style={styles.propertyCheckbox}
                id={`checkbox-${id}-${property.name}`}
              />
              <label 
                htmlFor={`checkbox-${id}-${property.name}`}
                style={styles.booleanLabel}
              >
                {property.label}
              </label>
            </div>
          ) : (
            <div style={styles.propertyInputContainer}>
              <label style={styles.propertyLabel}>{property.label}</label>
              <input
                type={property.type}
                value={data[property.name] !== undefined ? data[property.name] : property.default}
                onChange={(e) => data.onPropertyChange(property.name, e.target.value)}
                style={styles.propertyInput}
              />
            </div>
          )}
        </div>
      );
    });
  };

//style={styles.node}
  return (
    <div
      onClick={onClick}  // Handle left-click selection
      onContextMenu={handleContextMenu}  // Handle right-click context menu
      style={{
        padding: 10,
        //backgroundColor: data.color || '#777',
        border: selected ? '3px solid blue' : '1px solid #777',  // Highlight selected node
        ...backgroundVariants.nodeBackground
      }}
    >
      
      <Handle
        type="target"
        position={Position.Left}
        style={styles.handle}
      />
      <div style={styles.node}>
        <div>Name: {data.label}</div>  {/* Display node label */}
        <div>Type: {data.type}</div>    {/* Display node type */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={buttonVariants.secondaryButton} onClick={toggleExpand}>
            {expanded ? '▼' : '▶'}
          </button>
          {/* Add spectrometer button for appropriate node types */}
          {(data.type === 'USBSpectrometer' || data.type === 'MQTTSpectrometer') && (
            <button 
              style={{
                ...buttonVariants.secondaryButton,
                backgroundColor: data.type === 'MQTTSpectrometer' ? '#00AAFF' : '#AA00FF',
              }} 
              onClick={handleOpenSpectrometer}
              title={`Open ${data.type} View`}
            >
              📊
            </button>
          )}
          {/* Add pump button for pump node type */}
          {data.type === 'pump' && (
            <button 
              style={{
                ...buttonVariants.secondaryButton,
                backgroundColor: '#4CAF50',
              }} 
              onClick={handleOpenPump}
              title="Open Pump Control"
            >
              💧
            </button>
          )}
        </div>
        {expanded && renderProperties()}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={styles.handle}
      />
    </div>
  );
};

const styles = {
  node: {
    padding: '10px 15px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexDirection: 'column',
    minWidth: '250px',
    fontSize: "33px",
    zIndex: 1001,
    ...backgroundVariants.nodeBackground
  },
  handle: {
    width: 25,
    height: 25,
    backgroundColor: '#557',
    borderRadius: '50%',
  },
  button: {
    marginTop: '0px',
    padding: '10px',
    cursor: 'pointer',
    ...backgroundVariants.menuBackground,
    borderRadius: '10px',
  },
  propertyItem: {
    marginTop: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    color: '#8c8',
    fontSize: "16px"
  },
  propertyInput: {
    ...backgroundVariants.inputBackground,
    padding: '5px',
    width: '100%',
    color: '#fff',
    fontSize: '14px',
    border: '1px solid #555',
    backgroundColor: '#333',
    borderRadius: '4px'
  },
  propertyCheckbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    accentColor: '#3c3'
  },
  mqttSelector: {
    marginTop: '5px',
    padding: '5px',
    backgroundColor: '#222',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    width: '100%',
    ...backgroundVariants.inputBackground
  },
  mqttLabelContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  mqttLabel: {
    marginBottom: '5px',
    color: '#8c8',
    fontWeight: 'bold'
  },
  matchedDeviceIndicator: {
    color: '#0f0',
    fontSize: '0.8em',
    marginLeft: '5px'
  },
  matchedInput: {
    backgroundColor: '#0a3a0a',
    borderColor: '#3c3',
    color: '#fff'
  },
  booleanProperty: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  booleanLabel: {
    color: '#8c8',
    fontWeight: 'bold'
  },
  propertyInputContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  propertyLabel: {
    marginBottom: '5px',
    color: '#8c8',
    fontWeight: 'bold'
  },
  customInputToggle: {
    padding: '5px 8px',
    backgroundColor: '#444',
    color: '#fff',
    border: '1px solid #555',
    borderLeft: 'none',
    borderTopLeftRadius: '0',
    borderBottomLeftRadius: '0',
    borderTopRightRadius: '4px',
    borderBottomRightRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px'
  }
};

export default CustomNode;
