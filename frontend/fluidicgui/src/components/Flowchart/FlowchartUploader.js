import React, { useState, useRef } from 'react';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { saveToLocalStorage, loadFromLocalStorage } from '../../utils/localStorageUtils';

// Key for storing flowcharts in localStorage
export const FLOWCHARTS_STORAGE_KEY = 'fluidicgui_flowcharts';

const FlowchartUploader = ({ onFlowchartSelect }) => {
  const buttonVariants = useButtonStyles();
  const fileInputRef = useRef(null);
  const [savedFlowcharts, setSavedFlowcharts] = useState(() => {
    return loadFromLocalStorage(FLOWCHARTS_STORAGE_KEY, []);
  });

  const styles = {
    container: {
      marginBottom: '20px',
    },
    header: {
      fontSize: '16px',
      marginBottom: '10px',
    },
    uploadContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
    },
    fileInput: {
      display: 'none',
    },
    uploadButton: {
      ...buttonVariants.secondaryButton,
      flex: 1,
    },
    savedContainer: {
      marginTop: '15px',
    },
    savedHeader: {
      fontSize: '14px',
      marginBottom: '8px',
    },
    savedItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px',
      backgroundColor: '#333',
      borderRadius: '4px',
      marginBottom: '5px',
    },
    flowchartName: {
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    loadButton: {
      ...buttonVariants.secondaryButton,
      padding: '4px 8px',
      fontSize: '12px',
    },
    deleteButton: {
      ...buttonVariants.secondaryButton,
      padding: '4px 8px',
      fontSize: '12px',
      backgroundColor: '#553333',
      marginLeft: '5px',
    },
    noSavedText: {
      fontStyle: 'italic',
      color: '#888',
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flowchartData = JSON.parse(e.target.result);
        const timestamp = new Date().toISOString();
        const newFlowchart = {
          id: `flowchart-${Date.now()}`,
          name: file.name,
          data: flowchartData,
          createdAt: timestamp,
        };

        // Update saved flowcharts
        const updatedFlowcharts = [...savedFlowcharts, newFlowchart];
        setSavedFlowcharts(updatedFlowcharts);
        saveToLocalStorage(FLOWCHARTS_STORAGE_KEY, updatedFlowcharts);

        // Notify parent component if callback provided
        if (onFlowchartSelect) {
          onFlowchartSelect(newFlowchart.data);
        }
        
        // Reset file input
        event.target.value = '';
        
        console.log(`Flowchart "${file.name}" uploaded and saved`);
      } catch (error) {
        console.error('Error parsing flowchart JSON:', error);
        alert('Error: Invalid flowchart file. Please upload a valid JSON file.');
      }
    };
    
    reader.readAsText(file);
  };

  const handleFlowchartLoad = (flowchart) => {
    if (onFlowchartSelect) {
      onFlowchartSelect(flowchart.data);
    }
  };

  const handleFlowchartDelete = (flowchartId) => {
    const updatedFlowcharts = savedFlowcharts.filter(f => f.id !== flowchartId);
    setSavedFlowcharts(updatedFlowcharts);
    saveToLocalStorage(FLOWCHARTS_STORAGE_KEY, updatedFlowcharts);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Flowchart Files</h3>
      
      <div style={styles.uploadContainer}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={styles.fileInput}
          onChange={handleFileChange}
        />
        <button 
          style={styles.uploadButton}
          onClick={handleUploadClick}
        >
          Upload Flowchart
        </button>
      </div>
      
      <div style={styles.savedContainer}>
        <h4 style={styles.savedHeader}>Saved Flowcharts</h4>
        
        {savedFlowcharts.length === 0 ? (
          <p style={styles.noSavedText}>No saved flowcharts</p>
        ) : (
          savedFlowcharts.map((flowchart) => (
            <div key={flowchart.id} style={styles.savedItem}>
              <div style={styles.flowchartName}>{flowchart.name}</div>
              <div>
                <button
                  style={styles.loadButton}
                  onClick={() => handleFlowchartLoad(flowchart)}
                >
                  Load
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleFlowchartDelete(flowchart.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FlowchartUploader; 