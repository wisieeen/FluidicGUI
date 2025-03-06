import React, { useState, useRef, useEffect } from 'react';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../styles/backgroundStyles';

// Utility function for deep cloning objects
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// Get parameter range based on node type and parameter name
const getParameterRange = (nodeType, paramName) => {
  const ranges = {
    pump: {
      'Flow Rate': { min: 0.1, max: 10, unit: 'μL/s' },
      'Ratio': { min: 1, max: 100, unit: '%' }
    },
    thermostat: {
      'Temperature': { min: 4, max: 95, unit: '°C' }
    },
    detector: {
      'Integration Time': { min: 0.1, max: 10, unit: 's' }
    }
  };
  
  return ranges[nodeType]?.[paramName] || { min: 0, max: 100, unit: '' };
};

// Function to generate evenly spaced values across a range
const generateInterpolatedValues = (min, max, steps) => {
  if (steps <= 1) return [min];
  
  const values = [];
  const stepSize = (max - min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    // Round to 3 decimal places to avoid floating point issues
    const value = Math.round((min + i * stepSize) * 1000) / 1000;
    values.push(value);
  }
  
  return values;
};

// Add a helper function to check if parameter is a pump ratio
const isPumpRatio = (nodeType, paramName) => {
  return nodeType === 'pump' && (paramName === 'Ratio' || paramName === 'ratio');
};

const InterpolationGenerator = ({ nodes, selectedCarrierPumps, onNext }) => {
  const buttonVariants = useButtonStyles();
  // State variables
  const [availableParameters, setAvailableParameters] = useState([]);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [parameterRange, setParameterRange] = useState({ min: 0, max: 100 });
  const [steps, setSteps] = useState(5);
  const [generatedDroplets, setGeneratedDroplets] = useState([]);
  
  // Add state for pump ratio adjustment strategy
  const [isPumpRatioSelected, setIsPumpRatioSelected] = useState(false);
  const [pumpRatioStrategy, setPumpRatioStrategy] = useState('distribute'); // 'distribute' or 'single'
  const [balancingPumpId, setBalancingPumpId] = useState(null);
  const [availablePumps, setAvailablePumps] = useState([]);
  
  // Initialize available parameters based on nodes
  useEffect(() => {
    const params = [];
    nodes.forEach(node => {
      // Only consider nodes with parameters
      if (node.data && node.data.parameters && node.data.parameters.length > 0) {
        // Skip carrier pumps for parameter selection
        if (node.data.type === 'pump' && selectedCarrierPumps.includes(node.id)) {
          return;
        }
        
        // Use the actual parameters from the node
        node.data.parameters.forEach(param => {
          params.push({
            id: `${node.id}-${param.name}`,
            nodeId: node.id,
            nodeLabel: node.data.label || node.id,
            nodeType: node.data.type,
            name: param.name,
            label: param.label || param.name,
            default: param.default || 0,
            min: param.min !== undefined ? param.min : 0,
            max: param.max !== undefined ? param.max : 100,
            unit: param.unit || ''
          });
        });
      }
    });
    
    setAvailableParameters(params);
    console.log("Available parameters:", params); // Debug log
  }, [nodes, selectedCarrierPumps]);
  
  // Get parameters for a node type - not used anymore since we're using actual node parameters
  const getNodeParameters = (nodeType) => {
    switch (nodeType) {
      case 'pump':
        return ['Flow Rate', 'Ratio'];
      case 'thermostat':
        return ['Temperature'];
      case 'detector':
        return ['Integration Time'];
      default:
        return [];
    }
  };
  
  // Select a parameter
  const selectParameter = (parameterId) => {
    const param = availableParameters.find(p => p.id === parameterId);
    setSelectedParameter(param);
    
    if (param) {
      // Set initial range from the parameter's default range
      setParameterRange({
        min: param.min,
        max: param.max
      });
      
      // Check if selected parameter is a pump ratio
      const isPumpRatio = param.nodeType === 'pump' && (param.name === 'Ratio' || param.name === 'ratio');
      setIsPumpRatioSelected(isPumpRatio);
      
      // If it's a pump ratio, identify other available pumps for balancing
      if (isPumpRatio) {
        const otherPumps = nodes.filter(node => 
          node.data.type === 'pump' && 
          node.id !== param.nodeId &&
          !selectedCarrierPumps.includes(node.id)
        ).map(node => ({
          id: node.id,
          label: node.data.label || node.id
        }));
        
        setAvailablePumps(otherPumps);
        if (otherPumps.length > 0) {
          setBalancingPumpId(otherPumps[0].id);
        }
      }
    }
  };
  
  // Update parameter range
  const updateParameterRange = (type, value) => {
    setParameterRange(prev => ({
      ...prev,
      [type]: Number(value)
    }));
  };
  
  // Update number of steps
  const updateSteps = (value) => {
    const numSteps = Math.max(2, parseInt(value) || 2); // Minimum 2 steps
    setSteps(numSteps);
  };
  
  // Handle strategy change
  const handleStrategyChange = (strategy) => {
    setPumpRatioStrategy(strategy);
  };
  
  // Handle balancing pump change
  const handleBalancingPumpChange = (pumpId) => {
    setBalancingPumpId(pumpId);
  };
  
  // Generate droplets with interpolated parameter values
  const generateDroplets = () => {
    if (!selectedParameter) {
      alert('Please select a parameter first');
      return;
    }
    
    const { min, max } = parameterRange;
    if (min >= max) {
      alert('Minimum value must be less than maximum value');
      return;
    }
    
    // Generate interpolated values for the parameter
    const values = generateInterpolatedValues(min, max, steps);
    
    // Create droplets with the interpolated parameter values
    const droplets = values.map((value, index) => {
      // Initialize a parameters array
      const parameters = [];
      
      // Special handling for pump ratios
      const isPumpRatioParam = isPumpRatio(selectedParameter.nodeType, selectedParameter.name);
      let remainingRatio = 0;
      let otherPumpParameters = [];
      
      // If this is a pump ratio, we need to collect all pump ratio params first
      if (isPumpRatioParam) {
        // Gather all pump ratio parameters
        nodes.forEach(node => {
          // Skip carrier pumps
          if (node.data.type === 'pump' && selectedCarrierPumps.includes(node.id)) {
            return;
          }
          
          // Only include pump nodes with ratio parameters
          if (node.data.type === 'pump' && node.data.parameters && node.data.parameters.length > 0) {
            const ratioParam = node.data.parameters.find(p => 
              p.name === 'Ratio' || p.name === 'ratio'
            );
            
            if (ratioParam) {
              // For the selected pump, use the interpolated value
              if (node.id === selectedParameter.nodeId) {
                parameters.push({
                  nodeId: node.id,
                  nodeName: node.data.label || node.id,
                  name: selectedParameter.name,
                  default: selectedParameter.default,
                  value: value
                });
                
                remainingRatio = 1 - value; // The remaining ratio to distribute
              } else {
                // Save other pump parameters for later adjustment
                otherPumpParameters.push({
                  nodeId: node.id,
                  nodeName: node.data.label || node.id,
                  name: ratioParam.name,
                  default: ratioParam.default !== undefined ? ratioParam.default : 0,
                  originalValue: ratioParam.default !== undefined ? ratioParam.default : 0,
                });
              }
            }
          }
        });
        
        // Apply the balancing strategy
        if (otherPumpParameters.length > 0) {
          if (pumpRatioStrategy === 'single' && balancingPumpId) {
            // Strategy 1: Adjust a single pump
            otherPumpParameters = otherPumpParameters.map(param => {
              if (param.nodeId === balancingPumpId) {
                // This is the balancing pump, adjust its value
                return {
                  ...param,
                  value: Math.max(0, remainingRatio) // Ensure non-negative
                };
              } else {
                // Keep original value for other pumps
                return {
                  ...param,
                  value: param.originalValue
                };
              }
            });
          } else {
            // Strategy 2: Distribute proportionally across all other pumps
            
            // Calculate the sum of original values
            const originalSum = otherPumpParameters.reduce((sum, param) => sum + param.originalValue, 0);
            
            if (originalSum === 0) {
              // If all other pumps are 0, distribute equally
              const equalShare = remainingRatio / otherPumpParameters.length;
              otherPumpParameters = otherPumpParameters.map(param => ({
                ...param,
                value: equalShare
              }));
            } else {
              // Distribute proportionally based on original values
              otherPumpParameters = otherPumpParameters.map(param => ({
                ...param,
                value: (param.originalValue / originalSum) * remainingRatio
              }));
            }
          }
          
          // Add the adjusted pump ratio parameters
          parameters.push(...otherPumpParameters);
        }
        
        // Add all non-ratio parameters from pump nodes
        nodes.forEach(node => {
          // Skip carrier pumps
          if (node.data.type === 'pump' && selectedCarrierPumps.includes(node.id)) {
            return;
          }
          
          if (node.data.type === 'pump' && node.data.parameters && node.data.parameters.length > 0) {
            node.data.parameters.forEach(param => {
              // Skip ratio parameters as they're already handled
              if (param.name === 'Ratio' || param.name === 'ratio') return;
              
              parameters.push({
                nodeId: node.id,
                nodeName: node.data.label || node.id,
                name: param.name,
                default: param.default !== undefined ? param.default : 0,
                value: param.default !== undefined ? param.default : 0
              });
            });
          }
        });
        
        // Add parameters from non-pump nodes
        nodes.forEach(node => {
          // Skip pump nodes (already handled)
          if (node.data.type === 'pump') return;
          
          // Skip carrier pumps
          if (selectedCarrierPumps.includes(node.id)) return;
          
          // Include parameters from other nodes with their default values
          if (node.data && node.data.parameters && node.data.parameters.length > 0) {
            node.data.parameters.forEach(param => {
              parameters.push({
                nodeId: node.id,
                nodeName: node.data.label || node.id,
                name: param.name,
                default: param.default !== undefined ? param.default : 0,
                value: param.default !== undefined ? param.default : 0
              });
            });
          }
        });
      } else {
        // Handle non-pump-ratio parameters (original logic)
        // Add the interpolated parameter
        parameters.push({
          nodeId: selectedParameter.nodeId,
          nodeName: selectedParameter.nodeLabel,
          name: selectedParameter.name,
          default: selectedParameter.default,
          value: value
        });
        
        // Add other node parameters with default values
        nodes.forEach(node => {
          // Skip carrier pumps
          if (node.data.type === 'pump' && selectedCarrierPumps.includes(node.id)) {
            return;
          }
          
          // Skip the parameter we're interpolating
          if (node.id === selectedParameter.nodeId) {
            // Add other parameters from the same node (if any)
            if (node.data && node.data.parameters && node.data.parameters.length > 0) {
              node.data.parameters.forEach(param => {
                // Skip the parameter we're already interpolating
                if (param.name === selectedParameter.name) return;
                
                parameters.push({
                  nodeId: node.id,
                  nodeName: node.data.label || node.id,
                  name: param.name,
                  default: param.default !== undefined ? param.default : 0,
                  value: param.default !== undefined ? param.default : 0
                });
              });
            }
            return;
          }
          
          // Include parameters from other nodes with their default values
          if (node.data && node.data.parameters && node.data.parameters.length > 0) {
            node.data.parameters.forEach(param => {
              parameters.push({
                nodeId: node.id,
                nodeName: node.data.label || node.id,
                name: param.name,
                default: param.default !== undefined ? param.default : 0,
                value: param.default !== undefined ? param.default : 0
              });
            });
          }
        });
      }
      
      return {
        id: `interpolated-${Date.now()}-${index}`,
        parameters: parameters
      };
    });
    
    setGeneratedDroplets(droplets);
    console.log("Generated droplets:", droplets); // Debug log
  };
  
  // Update the table to display correctly with the new format
  const getParameterValue = (droplet, nodeId, paramName) => {
    const param = droplet.parameters.find(p => p.nodeId === nodeId && p.name === paramName);
    return param ? param.value : null;
  };
  
  // Handle proceeding to the next step
  const handleProceed = () => {
    if (generatedDroplets.length === 0) {
      alert('Please generate droplets first');
      return;
    }
    
    onNext(generatedDroplets);
  };
  
  // Styles
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      height: '100%',
      width: '100%',
      maxWidth: '100%',
      ...backgroundVariants.mainBackground
    },
    header: {
      marginBottom: '20px',
      width: '100%'
    },
    content: {
      display: 'flex',
      gap: '20px',
      height: 'calc(100% - 80px)',
      width: '100%',
      overflow: 'hidden'
    },
    leftPanel: {
      flex: '0 0 25%',
      minWidth: '300px',
      maxWidth: '400px',
      display: 'flex',
      flexDirection: 'column',
      ...backgroundVariants.panelBackground,
      padding: '15px',
      borderRadius: '4px',
      overflow: 'auto'
    },
    rightPanel: {
      flex: '1 1 75%',
      maxWidth: '900px',
      display: 'flex',
      flexDirection: 'column',
      ...backgroundVariants.panelBackground,
      padding: '15px',
      borderRadius: '4px',
      overflow: 'auto'
    },
    parameterList: {
      marginTop: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '100%'
    },
    parameterItem: {
      padding: '10px',
      borderRadius: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    selected: {
      background: 'rgba(66, 153, 225, 0.3)',
      border: '1px solid rgba(66, 153, 225, 0.5)'
    },
    rangeControl: {
      marginTop: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '100%'
    },
    inputGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%'
    },
    input: {
      flex: 1,
      padding: '8px',
      borderRadius: '4px',
      border: 'none',
      ...backgroundVariants.inputBackground
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
      width: '100%'
    },
    dropletSection: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%'
    },
    tableContainer: {
      flex: '1 1 auto',
      minWidth: '300px',
      maxWidth: '600px',
      width: '60%'
    },
    nextButtonContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingLeft: '20px',
      paddingTop: '30px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px',
      tableLayout: 'fixed'
    },
    tableHead: {
      backgroundColor: '#444',
      textAlign: 'left'
    },
    tableRow: {
      borderBottom: '1px solid #444'
    },
    tableCell: {
      padding: '8px 12px',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    ratioAdjustment: {
      marginTop: '20px',
      padding: '20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px'
    }
  };
  
  return (
    <div className="screen-wide-component" style={styles.container}>
      <div style={styles.header}>
        <h2>Parameter Interpolation Generator</h2>
        <p>Select a parameter and generate droplets with interpolated values</p>
      </div>
      
      <div style={styles.content}>
        <div style={styles.leftPanel}>
          <h3>Available Parameters</h3>
          <p>Select one parameter to interpolate</p>
          
          <div style={styles.parameterList}>
            {availableParameters.map(param => (
              <div 
                key={param.id}
                style={{
                  ...styles.parameterItem,
                  ...(selectedParameter?.id === param.id ? styles.selected : {})
                }}
                onClick={() => selectParameter(param.id)}
              >
                <div>
                  <strong>{param.nodeLabel}</strong> ({param.nodeType})
                </div>
                <div>{param.label || param.name}</div>
                <div>
                  Range: {param.min} - {param.max} {param.unit}
                </div>
              </div>
            ))}
          </div>
          
          {selectedParameter && (
            <div style={styles.rangeControl}>
              <h3>Parameter Range and Steps</h3>
              
              <div style={styles.inputGroup}>
                <label>Min:</label>
                <input 
                  type="number"
                  value={parameterRange.min}
                  onChange={(e) => updateParameterRange('min', e.target.value)}
                  style={styles.input}
                  step="0.1"
                />
                <span>{selectedParameter.unit}</span>
              </div>
              
              <div style={styles.inputGroup}>
                <label>Max:</label>
                <input 
                  type="number"
                  value={parameterRange.max}
                  onChange={(e) => updateParameterRange('max', e.target.value)}
                  style={styles.input}
                  step="0.1"
                />
                <span>{selectedParameter.unit}</span>
              </div>
              
              <div style={styles.inputGroup}>
                <label>Steps:</label>
                <input 
                  type="number"
                  value={steps}
                  onChange={(e) => updateSteps(e.target.value)}
                  style={styles.input}
                  min="2"
                  max="100"
                />
              </div>
              
              <div style={styles.buttonGroup}>
                <button
                  onClick={generateDroplets}
                  style={buttonVariants.primaryButton}
                >
                  Generate Droplets
                </button>
              </div>
            </div>
          )}
          
          {/* Add UI elements for pump ratio adjustment strategy */}
          {selectedParameter && isPumpRatioSelected && (
            <div style={styles.ratioAdjustment}>
              <h3>Pump Ratio Balancing</h3>
              <p>When changing a pump ratio, other ratios must be adjusted to keep the sum at 1.0</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label>
                    <input
                      type="radio"
                      name="ratioStrategy"
                      value="distribute"
                      checked={pumpRatioStrategy === 'distribute'}
                      onChange={() => handleStrategyChange('distribute')}
                    />
                    Distribute proportionally across all other pumps
                  </label>
                </div>
                
                <div>
                  <label>
                    <input
                      type="radio"
                      name="ratioStrategy"
                      value="single"
                      checked={pumpRatioStrategy === 'single'}
                      onChange={() => handleStrategyChange('single')}
                    />
                    Adjust a single pump to balance
                  </label>
                </div>
                
                {pumpRatioStrategy === 'single' && availablePumps.length > 0 && (
                  <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                    <label>Select pump to adjust: </label>
                    <select
                      value={balancingPumpId}
                      onChange={(e) => handleBalancingPumpChange(e.target.value)}
                      style={styles.input}
                    >
                      {availablePumps.map(pump => (
                        <option key={pump.id} value={pump.id}>
                          {pump.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div style={styles.rightPanel}>
          <h3>Generated Droplets</h3>
          
          {generatedDroplets.length > 0 ? (
            <>
              <p>Generated {generatedDroplets.length} droplets with interpolated values:</p>
              
              <div style={styles.dropletSection}>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead style={styles.tableHead}>
                      <tr>
                        <th style={{...styles.tableCell, width: '30%'}}>Droplet #</th>
                        <th style={{...styles.tableCell, width: '70%'}}>
                          {selectedParameter.label || selectedParameter.name}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedDroplets.map((droplet, index) => (
                        <tr key={droplet.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>Droplet {index + 1}</td>
                          <td style={styles.tableCell}>
                            {getParameterValue(droplet, selectedParameter.nodeId, selectedParameter.name)} {selectedParameter.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={styles.nextButtonContainer}>
                  <button
                    onClick={handleProceed}
                    style={{
                      ...buttonVariants.primaryButton,
                      fontSize: '16px',
                      padding: '10px 20px'
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p>No droplets generated yet. Select a parameter, set range and steps, then click "Generate Droplets".</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterpolationGenerator; 