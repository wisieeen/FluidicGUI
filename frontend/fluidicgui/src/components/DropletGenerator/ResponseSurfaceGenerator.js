import React, { useState, useEffect } from 'react';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../styles/backgroundStyles';
import defaultProperties from '../../data/defaultProperties.json';

// Utility function to deep clone an object
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// Helper function to get parameter range and description from defaultProperties
const getParameterRange = (nodeType, paramName) => {
  const nodeConfig = defaultProperties[nodeType];
  if (!nodeConfig?.parameters) return { min: 0, max: 100, description: '' };
  
  const parameter = nodeConfig.parameters.find(p => p.name === paramName);
  if (!parameter) return { min: 0, max: 100, description: '' };
  
  return {
    min: parameter.min ?? 0,
    max: parameter.max ?? 100,
    description: parameter.description || ''
  };
};

// Generate a Box-Behnken design for response surface methodology
const generateBoxBehnkenDesign = (factors, levels) => {
  // For simplicity, using a straightforward approach with -1, 0, 1 levels
  if (factors.length < 2) return []; // Need at least 2 factors

  const centerPoint = factors.map(() => 0);
  let design = [centerPoint]; // Center point

  // Generate combinations with one factor at center (0) and others at extremes (-1, 1)
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      // Keep all factors at center (0) except i and j
      // Generate the 4 combinations for these two factors: (-1,-1), (-1,1), (1,-1), (1,1)
      const combinations = [
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];

      for (const [level_i, level_j] of combinations) {
        const point = [...centerPoint];
        point[i] = level_i;
        point[j] = level_j;
        design.push(point);
      }
    }
  }

  // Add replicate center points (typically 3-5)
  for (let i = 0; i < 3; i++) {
    design.push([...centerPoint]);
  }

  return design;
};

// Map design levels (-1, 0, 1) to actual parameter values
const mapDesignToValues = (design, parameterConfigs) => {
  return design.map(point => {
    const mappedPoint = {};
    parameterConfigs.forEach((config, index) => {
      const level = point[index];
      const { min, max } = config;
      const midpoint = (max + min) / 2;
      
      // Map -1 -> min, 0 -> midpoint, 1 -> max
      const value = level === -1 ? min : (level === 1 ? max : midpoint);
      mappedPoint[config.id] = value;
    });
    return mappedPoint;
  });
};

// Add new function to check if parameter is a pump ratio
const isPumpRatio = (nodeType, paramName) => {
  return nodeType === 'pump' && (paramName === 'Ratio' || paramName === 'ratio');
};

// Normalize pump ratios to ensure they sum to 1, using the selected strategy
const normalizePumpRatios = (design, parameterConfigs, strategy = 'distribute', balancingPumpId = null) => {
  // Group pump ratio parameters
  const pumpRatioParams = parameterConfigs.filter(param => 
    isPumpRatio(param.nodeType, param.name)
  );
  
  if (pumpRatioParams.length <= 1) {
    return design; // No need to normalize if there's 0 or 1 pump ratio
  }
  
  // For each experimental run, normalize the pump ratios
  return design.map(run => {
    const newRun = { ...run };
    const pumpRatioIds = pumpRatioParams.map(p => p.id);
    
    // Calculate sum of pump ratios for this run
    let sum = 0;
    pumpRatioIds.forEach(id => {
      sum += newRun[id] || 0;
    });
    
    // Skip normalization if sum is 0
    if (sum === 0) return newRun;
    
    if (strategy === 'single' && balancingPumpId) {
      // Strategy 1: Use a single pump to balance
      const balancingPumpParamId = pumpRatioParams.find(p => 
        p.nodeId === balancingPumpId
      )?.id;
      
      if (balancingPumpParamId) {
        // Save original values and calculate what needs to be adjusted
        const originalValues = {};
        let nonBalancingSum = 0;
        
        pumpRatioIds.forEach(id => {
          originalValues[id] = newRun[id] || 0;
          // Skip balancing pump when calculating the sum of others
          if (id !== balancingPumpParamId) {
            nonBalancingSum += originalValues[id];
          }
        });
        
        // Normalize non-balancing pumps to their proportion of 1 (max)
        pumpRatioIds.forEach(id => {
          if (id === balancingPumpParamId) {
            // Calculate what's left for the balancing pump
            newRun[id] = Math.max(0, 1 - nonBalancingSum);
          } else {
            // Keep non-balancing pumps at their original values
            newRun[id] = originalValues[id];
          }
        });
      }
    } else {
      // Strategy 2: Distribute proportionally (default)
      pumpRatioIds.forEach(id => {
        newRun[id] = (newRun[id] || 0) / sum;
      });
    }
    
    return newRun;
  });
};

const ResponseSurfaceGenerator = ({ nodes, selectedCarrierPumps, onNext }) => {
  const buttonVariants = useButtonStyles();
  const [availableParameters, setAvailableParameters] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [numLevels, setNumLevels] = useState(3);
  const [dropletDesign, setDropletDesign] = useState([]);
  const [generatedDroplets, setGeneratedDroplets] = useState([]);
  const [currentPumpRatioSum, setCurrentPumpRatioSum] = useState(0);
  
  // Add states for pump ratio normalization strategy
  const [pumpRatioStrategy, setPumpRatioStrategy] = useState('distribute');
  const [balancingPumpId, setBalancingPumpId] = useState(null);
  const [availablePumps, setAvailablePumps] = useState([]);
  const [hasPumpRatios, setHasPumpRatios] = useState(false);

  // Extract parameters from nodes
  useEffect(() => {
    const nodesWithParameters = nodes
      .filter(node => !selectedCarrierPumps.includes(node.id))
      .filter(node => node.data.type !== 'thermostat' || node.data.end !== 'true')
      .filter(node => node.data.parameters && node.data.parameters.length > 0);

    const params = nodesWithParameters.flatMap(node => 
      (node.data.parameters || []).map(param => ({
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.type,
        name: param.name,
        label: param.label || param.name,
        default: param.default || 0,
        min: param.min || 0,
        max: param.max || 100,
        id: `${node.id}-${param.name}`,
        selected: false
      }))
    );

    setAvailableParameters(params);
  }, [nodes, selectedCarrierPumps]);

  // Calculate sum of pump ratios whenever selected parameters change
  useEffect(() => {
    // Find all selected pump ratio parameters
    const selectedPumpRatios = availableParameters.filter(param => 
      selectedParameters.includes(param.id) && 
      isPumpRatio(param.nodeType, param.name)
    );
    
    // Calculate their max sum (using max values)
    const sum = selectedPumpRatios.reduce((acc, param) => acc + param.max, 0);
    setCurrentPumpRatioSum(sum);
    
    // Update hasPumpRatios flag
    setHasPumpRatios(selectedPumpRatios.length > 1);
    
    // Update available pumps for balancing
    if (selectedPumpRatios.length > 1) {
      const pumpsWithRatios = selectedPumpRatios.map(param => ({
        id: param.nodeId,
        label: param.nodeName
      }));
      
      setAvailablePumps(pumpsWithRatios);
      
      // Set first pump as default balancing pump if none selected
      if (!balancingPumpId && pumpsWithRatios.length > 0) {
        setBalancingPumpId(pumpsWithRatios[0].id);
      }
    }
  }, [selectedParameters, availableParameters, balancingPumpId]);

  // Toggle parameter selection
  const toggleParameterSelection = (parameterId) => {
    setSelectedParameters(prev => {
      if (prev.includes(parameterId)) {
        return prev.filter(id => id !== parameterId);
      } else {
        return [...prev, parameterId];
      }
    });
  };

  // Update parameter range
  const updateParameterRange = (parameterId, type, value) => {
    setAvailableParameters(prev => 
      prev.map(param => 
        param.id === parameterId 
          ? { ...param, [type]: parseFloat(value) } 
          : param
      )
    );
  };

  // Handle strategy change
  const handleStrategyChange = (strategy) => {
    setPumpRatioStrategy(strategy);
  };
  
  // Handle balancing pump change
  const handleBalancingPumpChange = (pumpId) => {
    setBalancingPumpId(pumpId);
  };

  // Generate droplets based on RSM design
  const generateDroplets = () => {
    if (selectedParameters.length < 2) {
      alert("Please select at least 2 parameters for Response Surface Methodology");
      return;
    }

    const selectedParamConfigs = availableParameters.filter(
      param => selectedParameters.includes(param.id)
    );

    // Check if pump ratios are included
    const pumpRatioParams = selectedParamConfigs.filter(param => 
      isPumpRatio(param.nodeType, param.name)
    );
    
    // Generate Box-Behnken design
    const design = generateBoxBehnkenDesign(selectedParamConfigs, numLevels);
    setDropletDesign(design);

    // Map design to actual parameter values
    let mappedDesign = mapDesignToValues(design, selectedParamConfigs);
    
    // Normalize pump ratios if present, using selected strategy
    if (pumpRatioParams.length > 1) {
      mappedDesign = normalizePumpRatios(
        mappedDesign, 
        selectedParamConfigs, 
        pumpRatioStrategy, 
        balancingPumpId
      );
    }

    // Create droplets from design
    const droplets = mappedDesign.map((point, index) => {
      // Create base droplet with all parameters
      const droplet = {
        id: Date.now() + index,
        parameters: availableParameters.flatMap(param => ({
          nodeId: param.nodeId,
          nodeName: param.nodeName,
          name: param.name,
          default: param.default,
          value: param.default // Default value for non-selected parameters
        }))
      };

      // Update selected parameters with design values
      droplet.parameters = droplet.parameters.map(param => {
        const paramId = `${param.nodeId}-${param.name}`;
        if (point[paramId] !== undefined) {
          return { ...param, value: point[paramId] };
        }
        return param;
      });

      return droplet;
    });

    setGeneratedDroplets(droplets);
  };

  // Proceed to the ManualDropletCreation with generated droplets
  const handleProceed = () => {
    if (generatedDroplets.length === 0) {
      alert("Please generate droplets first");
      return;
    }
    onNext(generatedDroplets);
  };

  const styles = {
    container: {
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      ...backgroundVariants.mainBackground
    },
    header: {
      marginBottom: '20px'
    },
    content: {
      display: 'flex',
      gap: '20px',
      flex: 1
    },
    leftPanel: {
      flex: 1,
      padding: '15px',
      borderRadius: '5px',
      ...backgroundVariants.panelBackground
    },
    rightPanel: {
      flex: 1,
      padding: '15px',
      borderRadius: '5px',
      ...backgroundVariants.panelBackground,
      overflowY: 'auto'
    },
    parameterList: {
      marginBottom: '20px'
    },
    parameterItem: {
      padding: '10px',
      margin: '5px 0',
      borderRadius: '4px',
      backgroundColor: '#444',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px'
    },
    selected: {
      borderLeft: '3px solid #4CAF50'
    },
    paramHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    rangeInputs: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    },
    input: {
      padding: '5px',
      width: '80px',
      backgroundColor: '#333',
      border: '1px solid #555',
      color: 'white',
      borderRadius: '3px'
    },
    levelSelector: {
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '20px'
    },
    designPreview: {
      marginTop: '20px'
    },
    previewTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '10px'
    },
    tableHead: {
      backgroundColor: '#444',
      textAlign: 'left'
    },
    tableRow: {
      borderBottom: '1px solid #444'
    },
    tableCell: {
      padding: '8px',
      borderBottom: '1px solid #444'
    },
    selectedParameters: {
      marginTop: '20px'
    },
    pumpRatioWarning: {
      marginBottom: '20px',
      padding: '10px',
      backgroundColor: '#444',
      borderRadius: '4px',
      border: '1px solid #555'
    },
    select: {
      padding: '5px',
      width: '100px',
      backgroundColor: '#333',
      border: '1px solid #555',
      color: 'white',
      borderRadius: '3px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Response Surface Methodology (Box–Behnken design)</h2>
        <p>Select parameters to include in the design and set their ranges</p>
      </div>

      <div style={styles.content}>
        <div style={styles.leftPanel}>
          <h3>Available Parameters</h3>
          <p>Select at least 2 parameters for the design</p>
          
          <div style={styles.parameterList}>
            {availableParameters.map(param => (
              <div 
                key={param.id}
                style={{
                  ...styles.parameterItem,
                  ...(selectedParameters.includes(param.id) ? styles.selected : {})
                }}
              >
                <div style={styles.paramHeader}>
                  <label>
                    <input 
                      type="checkbox"
                      checked={selectedParameters.includes(param.id)}
                      onChange={() => toggleParameterSelection(param.id)}
                    />
                    {param.nodeName} - {param.label}
                  </label>
                </div>
                
                {selectedParameters.includes(param.id) && (
                  <div style={styles.rangeInputs}>
                    <div>
                      <label>Min:</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={param.min}
                        onChange={(e) => updateParameterRange(param.id, 'min', e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Max:</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={param.max}
                        onChange={(e) => updateParameterRange(param.id, 'max', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pump ratio constraint info */}
          {selectedParameters.some(id => {
            const param = availableParameters.find(p => p.id === id);
            return param && isPumpRatio(param.nodeType, param.name);
          }) && (
            <div style={{
              padding: '10px',
              marginBottom: '15px', 
              backgroundColor: currentPumpRatioSum > 0 ? '#2c2c2c' : '#442c2c',
              border: `1px solid ${currentPumpRatioSum > 0 ? '#555' : '#a55'}`,
              borderRadius: '4px'
            }}>
              <p>
                <strong>Note:</strong> Pump ratios will be automatically normalized to ensure they sum to 1.
              </p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                <div>Current sum of max pump ratios: </div>
                <div style={{ 
                  marginLeft: '8px',
                  fontWeight: 'bold',
                  color: currentPumpRatioSum > 0 ? '#4CAF50' : '#FF5252'
                }}>
                  {currentPumpRatioSum.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div style={styles.buttonContainer}>
            <button 
              style={buttonVariants.primaryButton}
              onClick={generateDroplets}
              disabled={selectedParameters.length < 2}
            >
              Generate Droplets
            </button>
            
            <button 
              style={buttonVariants.secondaryButton}
              onClick={handleProceed}
              disabled={generatedDroplets.length === 0}
            >
              Proceed to Droplet Editor
            </button>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <h3>Design Preview</h3>
          <p>Generated droplets: {generatedDroplets.length}</p>
          
          {dropletDesign.length > 0 && (
            <div style={styles.designPreview}>
              <p>Box-Behnken Design for selected parameters:</p>
              
              <table style={styles.previewTable}>
                <thead style={styles.tableHead}>
                  <tr>
                    <th style={styles.tableCell}>Run</th>
                    {selectedParameters.map(paramId => {
                      const param = availableParameters.find(p => p.id === paramId);
                      return (
                        <th key={paramId} style={styles.tableCell}>
                          {param.nodeName} - {param.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dropletDesign.map((point, index) => {
                    // First, get the raw values from the design
                    const rawValues = {};
                    point.forEach((level, i) => {
                      const paramId = selectedParameters[i];
                      const param = availableParameters.find(p => p.id === paramId);
                      const value = level === -1 ? param.min : (level === 1 ? param.max : (param.min + param.max) / 2);
                      rawValues[paramId] = value;
                    });

                    // Check if we need to normalize pump ratios
                    const pumpRatioParams = selectedParameters.filter(paramId => {
                      const param = availableParameters.find(p => p.id === paramId);
                      return param && isPumpRatio(param.nodeType, param.name);
                    });

                    // Normalize if needed
                    if (pumpRatioParams.length > 1) {
                      // Calculate sum
                      let sum = 0;
                      pumpRatioParams.forEach(paramId => {
                        sum += rawValues[paramId] || 0;
                      });
                      
                      // Normalize
                      if (sum > 0) {
                        pumpRatioParams.forEach(paramId => {
                          rawValues[paramId] = (rawValues[paramId] || 0) / sum;
                        });
                      }
                    }

                    return (
                      <tr key={index} style={styles.tableRow}>
                        <td style={styles.tableCell}>{index + 1}</td>
                        {point.map((level, i) => {
                          const paramId = selectedParameters[i];
                          const param = availableParameters.find(p => p.id === paramId);
                          const isPumpRatioParam = isPumpRatio(param.nodeType, param.name);
                          
                          // Use normalized value for pump ratios
                          const value = rawValues[paramId];
                          const displayValue = value.toFixed(isPumpRatioParam ? 4 : 2);
                          
                          return (
                            <td key={i} style={styles.tableCell}>
                              {displayValue} 
                              {isPumpRatioParam ? '' : level === -1 ? ' (min)' : level === 1 ? ' (max)' : ' (mid)'}
                              {isPumpRatioParam && (
                                pumpRatioStrategy === 'single' && param.nodeId === balancingPumpId
                                ? <span style={{ color: '#FF9800' }}> (balancing)</span>
                                : <span style={{ color: '#4CAF50' }}> (normalized)</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedParameters.length > 0 && (
        <div style={styles.selectedParameters}>
          <h3>Selected Parameters</h3>
          <p>Adjust ranges for selected parameters:</p>

          {/* Display warning if multiple pump ratios are selected */}
          {hasPumpRatios && (
            <div style={styles.pumpRatioWarning}>
              <h4>Pump Ratio Normalization</h4>
              <p>Multiple pump ratios selected. Choose how to normalize:</p>
              
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
                    Distribute proportionally across all pumps
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
                      value={balancingPumpId || ''}
                      onChange={(e) => handleBalancingPumpChange(e.target.value)}
                      style={styles.select}
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

          {selectedParameters.map(paramId => {
            const param = availableParameters.find(p => p.id === paramId);
            return (
              <div key={paramId} style={styles.parameterItem}>
                <div style={styles.paramHeader}>
                  <label>
                    <input 
                      type="checkbox"
                      checked={selectedParameters.includes(paramId)}
                      onChange={() => toggleParameterSelection(paramId)}
                    />
                    {param.nodeName} - {param.label}
                  </label>
                </div>
                
                {selectedParameters.includes(paramId) && (
                  <div style={styles.rangeInputs}>
                    <div>
                      <label>Min:</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={param.min}
                        onChange={(e) => updateParameterRange(paramId, 'min', e.target.value)}
                      />
                    </div>
  <div>
                      <label>Max:</label>
                      <input 
                        type="number"
                        style={styles.input}
                        value={param.max}
                        onChange={(e) => updateParameterRange(paramId, 'max', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
  </div>
);
};

export default ResponseSurfaceGenerator;
