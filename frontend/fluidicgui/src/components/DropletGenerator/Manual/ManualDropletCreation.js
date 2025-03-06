import React, { useState, useEffect } from 'react';
import DropletList from './DropletList';  
import ParameterAdjustment from './ParameterAdjustment';  
import defaultProperties from '../../../data/defaultProperties.json';
import { backgroundVariants } from '../../../styles/backgroundStyles';
import { ColorSchemePreview } from '../../../context/ColorSchemeContext';
import { useButtonStyles } from '../../../styles/ButtonStyleProvider';

// Available droplet color schemes
const dropletColorSchemeOptions = {
  viridis: 'Viridis',
  plasma: 'Plasma',
  inferno: 'Inferno',
  cividis: 'Cividis (Colorblind-friendly)',
  turbo: 'Turbo'
};

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

const ManualDropletCreation = ({ 
  nodes, 
  onNext, 
  selectedCarrierPumps, 
  droplets, 
  setDroplets,
  parameterRanges,
  setParameterRanges,
  parameterVisibility,
  setParameterVisibility
}) => {
  const [selectedDroplets, setSelectedDroplets] = useState([]);  
  const [lastSelected, setLastSelected] = useState(null);
  const [dropletColorScheme, setDropletColorScheme] = useState('cividis'); // Cividis as default
  
  // Get dynamic button styles
  const buttonVariants = useButtonStyles();
  
  const nodesWithParameters = nodes
    .filter(node => !selectedCarrierPumps.includes(node.id))
    .filter(node => !(node.data.type === 'thermostat' && node.data.end === 'true'))
    .filter(node => node.data.parameters && node.data.parameters.length > 0);
    
  // Initialize parameter ranges and visibility from defaultProperties
  useEffect(() => {
    // Initialize ranges and visibility for all parameters from all nodes
    const initialRanges = {};
    const initialVisibility = {};
    
    nodesWithParameters.forEach(node => {
      if (node.data.parameters) {
        node.data.parameters.forEach(param => {
          const key = `${node.id}-${param.name}`;
          const range = getParameterRange(node.data.type, param.name);
          initialRanges[param.name] = range;
          initialVisibility[key] = true;
        });
      }
    });

    // Only set if not already initialized
    if (Object.keys(parameterRanges).length === 0) {
      setParameterRanges(initialRanges);
    }
    if (Object.keys(parameterVisibility).length === 0) {
      setParameterVisibility(initialVisibility);
    }
  }, [nodesWithParameters, setParameterRanges, setParameterVisibility, parameterRanges, parameterVisibility]);
    
  useEffect(() => {
    if (droplets.length === 0) {
      const initialDroplet = {
        id: Date.now(),
        parameters: nodesWithParameters.flatMap(node =>
          deepClone(node.data.parameters).map(param => ({
            nodeId: node.id,
            nodeName: node.data.label,
            name: param.name,
            default: param.default || 0,
            value: param.default || 0
          }))
        ),
      };

      setDroplets([initialDroplet]);
      setSelectedDroplets([initialDroplet.id]);
      setLastSelected(initialDroplet.id);
    }
  }, [nodes, selectedCarrierPumps, droplets, setDroplets, nodesWithParameters]);

  const exportDroplets = () => {
    const dropletData = JSON.stringify(droplets, null, 2);
    const blob = new Blob([dropletData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'droplets.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDroplets = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedDroplets = JSON.parse(event.target.result);
          setDroplets(importedDroplets); // Update the droplets state with the imported data
        } catch (error) {
          console.error('Error parsing the imported file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const addDroplet = () => {
    const newDroplet = {
      id: Date.now(),
      parameters: nodesWithParameters.flatMap(node =>
        deepClone(node.data.parameters).map(param => ({
          nodeId: node.id,
          nodeName: node.data.label,
          name: param.name,
          default: param.default || 0,
          value: param.default || 0
        }))
      ),
    };
    setDroplets([...droplets, newDroplet]);
    setSelectedDroplets([newDroplet.id]);
    setLastSelected(newDroplet.id);
  };

  const handleSelectDroplet = (id, event) => {
    if (event.ctrlKey) {
      setSelectedDroplets((prevSelected) =>
        prevSelected.includes(id)
          ? prevSelected.filter((dropletId) => dropletId !== id)
          : [...prevSelected, id]
      );
    } else if (event.shiftKey && lastSelected !== null) {
      const currentIndex = droplets.findIndex((d) => d.id === id);
      const lastIndex = droplets.findIndex((d) => d.id === lastSelected);
      const [start, end] = [Math.min(currentIndex, lastIndex), Math.max(currentIndex, lastIndex)];
      const rangeIds = droplets.slice(start, end + 1).map((d) => d.id);
      setSelectedDroplets((prevSelected) => [...new Set([...prevSelected, ...rangeIds])]);
    } else {
      setSelectedDroplets([id]);
    }
    setLastSelected(id);
  };

  const deleteSelectedDroplets = () => {
    setDroplets(droplets.filter((droplet) => !selectedDroplets.includes(droplet.id)));
    setSelectedDroplets([]);
  };

  const copySelectedDroplets = () => {
    const copiedDroplets = selectedDroplets.map((selectedId) => {
      const dropletToCopy = droplets.find((d) => d.id === selectedId);
      return {
        ...deepClone(dropletToCopy), // Deep clone the droplet to avoid reference sharing
        id: Date.now() + Math.random() // Assign a new unique ID
      };
    });
    
    // Add the copied droplets to the existing list
    setDroplets([...droplets, ...copiedDroplets]);
    
    // Optionally, select the copied droplets
    setSelectedDroplets(copiedDroplets.map((d) => d.id));
  };

  const handleParameterChange = (nodeId, parameterName, value) => {
    // Update all selected droplets' parameters for the same parameter (name + nodeId)
    setDroplets(droplets.map(droplet => {
      if (selectedDroplets.includes(droplet.id)) {
        return {
          ...droplet,
          parameters: droplet.parameters.map(param =>
            param.name === parameterName && param.nodeId === nodeId
              ? { ...param, value: parseFloat(value) }
              : param
          )
        };
      }
      return droplet;
    }));
  };

  const toggleSelectAll = () => {
    if (selectedDroplets.length === droplets.length) {
      // If all are selected, deselect all
      setSelectedDroplets([]);
    } else {
      // Otherwise, select all
      setSelectedDroplets(droplets.map(droplet => droplet.id));
    }
  };

  const handleSimulate = () => {
    onNext(droplets);  // Pass the droplets to the parent component
  };

  const handleParameterVisibilityChange = (nodeId, paramName, isVisible) => {
    setParameterVisibility(prev => ({
      ...prev,
      [`${nodeId}-${paramName}`]: isVisible
    }));
  };

  const handleParameterRangeChange = (paramName, type, value) => {
    setParameterRanges(prev => ({
      ...prev,
      [paramName]: {
        ...prev[paramName],
        [type]: value
      }
    }));
  };

  const handleDropletColorSchemeChange = (e) => {
    setDropletColorScheme(e.target.value);
  };

  const styles = {
    container: {
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      ...backgroundVariants.mainBackground,
      position: 'relative'
    },
    buttonGroup: {
      marginTop: '20px',
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    },
    fileInput: {
      marginLeft: '10px',
      ...backgroundVariants.inputBackground
    },
    colorSchemeContainer: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      zIndex: 10,
      backgroundColor: 'rgba(40, 40, 40, 0.8)',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)'
    },
    colorSchemeSelector: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    select: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: '1px solid #555',
      backgroundColor: '#333',
      color: 'white',
      minWidth: '140px'
    }
  };

  return (
    <div className="screen-wide-component" style={styles.container}>
      <h2>Manual Droplet Creation</h2>
      
      <div style={styles.colorSchemeContainer}>
        <div style={styles.colorSchemeSelector}>
          <label htmlFor="dropletColorScheme">Droplet Colors:</label>
          <select 
            id="dropletColorScheme" 
            value={dropletColorScheme} 
            onChange={handleDropletColorSchemeChange}
            style={styles.select}
          >
            {Object.entries(dropletColorSchemeOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <ColorSchemePreview scheme={dropletColorScheme} width="100%" />
      </div>

      {selectedDroplets.length > 0 && (
        <ParameterAdjustment
          selectedDroplets={droplets.filter((d) => selectedDroplets.includes(d.id))}
          onParameterChange={handleParameterChange}
          onVisibilityChange={handleParameterVisibilityChange}
          onRangeChange={handleParameterRangeChange}
          parameterRanges={parameterRanges}
          selectedCarrierPumps={selectedCarrierPumps}
        />
      )}

      <div style={styles.buttonGroup}>
        <button 
          onClick={addDroplet}
          style={{ ...buttonVariants.primaryButton }}
        >
          Add Droplet
        </button>
        <button 
          onClick={toggleSelectAll}
          style={{ ...buttonVariants.secondaryButton }}
        >
          {selectedDroplets.length === droplets.length ? 'Deselect All' : 'Select All'}
        </button>
        <button 
          onClick={copySelectedDroplets}
          style={{ ...buttonVariants.secondaryButton }}
        >
          Copy Selected Droplets
        </button>
        <button 
          onClick={deleteSelectedDroplets}
          style={{ ...buttonVariants.dangerButton }}
        >
          Delete Selected Droplets
        </button>
        <button 
          onClick={exportDroplets}
          style={{ ...buttonVariants.infoButton }}
        >
          Export Droplets
        </button>
        <label style={{ marginLeft: '10px' }}>
          Import Droplets: 
          <input
            type="file"
            accept="application/json"
            onChange={importDroplets}
            style={styles.fileInput}
          />
        </label>
        <button 
          onClick={handleSimulate}
          style={{ ...buttonVariants.primaryButton }}
        >
          Next
        </button>
      </div>

      <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Droplets List:</h3>
      <DropletList
        droplets={droplets}
        selectedDroplets={selectedDroplets}
        onSelectDroplet={handleSelectDroplet}
        parameterVisibility={parameterVisibility}
        parameterRanges={parameterRanges}
        colorScheme={dropletColorScheme}
      />
    </div>
  );
};

export default ManualDropletCreation;
