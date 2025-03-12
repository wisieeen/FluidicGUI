import React, { useState } from 'react';

const SettingsComponent = ({ onSettingsChange }) => {
  const [integrationValue, setIntegrationValue] = useState(1);
  const [displaySettings, setDisplaySettings] = useState({
    red: true,
    green: true,
    blue: true,
    intensity: true
  });
  
  // Handle integration value change
  const handleIntegrationChange = (e) => {
    const value = parseInt(e.target.value);
    setIntegrationValue(value);
    
    if (onSettingsChange) {
      onSettingsChange({
        type: 'integration',
        value
      });
    }
  };
  
  // Handle display settings change
  const handleDisplaySettingChange = (setting) => {
    const newSettings = {
      ...displaySettings,
      [setting]: !displaySettings[setting]
    };
    
    setDisplaySettings(newSettings);
    
    if (onSettingsChange) {
      onSettingsChange({
        type: 'display',
        value: newSettings
      });
    }
  };
  
  const styles = {
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '10px',
      borderRadius: '4px',
      position: 'relative',
    },
    title: {
      margin: '0 0 10px 0',
      fontSize: '14px'
    },
    settingRow: {
      marginBottom: '10px'
    },
    settingLabel: {
      display: 'block',
      marginBottom: '5px',
      fontSize: '13px'
    },
    checkboxContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px'
    },
    checkboxItem: {
      display: 'flex',
      alignItems: 'center',
      userSelect: 'none',
      cursor: 'pointer'
    },
    rangeContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    rangeInput: {
      flex: 1
    },
    rangeValue: {
      minWidth: '25px',
      textAlign: 'right'
    },
    advancedSettingRow: {
      marginTop: '15px',
      paddingTop: '10px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    }
  };
  
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Detector Settings</h3>
      
      <div style={styles.settingRow}>
        <label style={styles.settingLabel}>Integration:</label>
        <div style={styles.rangeContainer}>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={integrationValue}
            onChange={handleIntegrationChange}
            style={styles.rangeInput}
          />
          <span style={styles.rangeValue}>{integrationValue}</span>
        </div>
      </div>
      
      <div style={styles.settingRow}>
        <label style={styles.settingLabel}>Display Channels:</label>
        <div style={styles.checkboxContainer}>
          <label style={styles.checkboxItem}>
            <input 
              type="checkbox" 
              checked={displaySettings.red}
              onChange={() => handleDisplaySettingChange('red')}
              style={{ marginRight: '5px' }}
            /> 
            <span style={{ color: '#ff7777' }}>Red</span>
          </label>
          
          <label style={styles.checkboxItem}>
            <input 
              type="checkbox" 
              checked={displaySettings.green}
              onChange={() => handleDisplaySettingChange('green')}
              style={{ marginRight: '5px' }}
            /> 
            <span style={{ color: '#77ff77' }}>Green</span>
          </label>
          
          <label style={styles.checkboxItem}>
            <input 
              type="checkbox" 
              checked={displaySettings.blue}
              onChange={() => handleDisplaySettingChange('blue')}
              style={{ marginRight: '5px' }}
            /> 
            <span style={{ color: '#7777ff' }}>Blue</span>
          </label>
          
          <label style={styles.checkboxItem}>
            <input 
              type="checkbox" 
              checked={displaySettings.intensity}
              onChange={() => handleDisplaySettingChange('intensity')}
              style={{ marginRight: '5px' }}
            /> 
            <span style={{ color: '#ffffff' }}>Intensity</span>
          </label>
        </div>
      </div>
      
      <div style={styles.advancedSettingRow}>
        <label style={styles.checkboxItem}>
          <input 
            type="checkbox" 
            defaultChecked={true}
            style={{ marginRight: '5px' }}
          /> 
          <span>Stabilize Y-axis</span>
        </label>
      </div>
    </div>
  );
};

export default SettingsComponent; 