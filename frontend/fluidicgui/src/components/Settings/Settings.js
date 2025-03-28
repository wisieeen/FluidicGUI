import React, { useState } from 'react';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { useLocalStorage } from '../../utils/localStorageUtils';

// Settings key in localStorage
const SETTINGS_STORAGE_KEY = 'fluidicgui_settings';

const Settings = ({ isOpen, onClose }) => {
  const buttonVariants = useButtonStyles();
  const [openSections, setOpenSections] = useState({
    paths: true,
    connectivity: true,
    other: true
  });

  // Use the localStorage hook for settings
  const [settings, setSettings] = useLocalStorage(SETTINGS_STORAGE_KEY, {
    projects: '',
    modules: '',
    mqttBroker: 'localhost',
    port: '1883'
  });

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 1000,
    },
    modal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#333',
      padding: '20px',
      borderRadius: '8px',
      width: '500px',
      maxWidth: '90%',
      zIndex: 1001,
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    title: {
      fontSize: '1.5rem',
      color: '#fff',
      margin: 0,
    },
    content: {
      color: '#fff',
    },
    section: {
      marginBottom: '20px',
      border: '1px solid #555',
      borderRadius: '4px',
    },
    sectionHeader: {
      padding: '10px 15px',
      backgroundColor: '#444',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionContent: {
      padding: '15px',
      borderTop: '1px solid #555',
    },
    inputGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      color: '#ccc',
    },
    input: {
      width: '100%',
      padding: '8px',
      backgroundColor: '#444',
      border: '1px solid #555',
      borderRadius: '4px',
      color: '#fff',
      fontSize: '14px',
    },
    pathContainer: {
      display: 'flex',
      gap: '8px',
    },
    pathInput: {
      flex: 1,
      padding: '8px',
      backgroundColor: '#444',
      border: '1px solid #555',
      borderRadius: '4px',
      color: '#fff',
      fontSize: '14px',
    },
    browseButton: {
      ...buttonVariants.secondaryButton,
      whiteSpace: 'nowrap',
    },
    toggleIcon: {
      fontSize: '18px',
      color: '#888',
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
    },
    saveIndicator: {
      color: '#8f8',
      fontSize: '14px',
      marginRight: 'auto',
      alignSelf: 'center',
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBrowseClick = (field) => {
    // In a real implementation, this would use Electron's dialog.showOpenDialog
    alert("In a production app, this would open a native folder selection dialog");
    
    // For demo only - simulate a folder selection
    const demoPath = field === 'projects' ? 'C:\\Users\\username\\Documents\\projects' : 'C:\\Users\\username\\Documents\\modules';
    handleInputChange(field, demoPath);
  };

  const handleSave = () => {
    // Settings already saved via the useLocalStorage hook
    alert('Settings saved successfully!');
    onClose();
  };

  const handleReset = () => {
    // Reset to default settings
    const defaultSettings = {
      projects: '',
      modules: '',
      mqttBroker: 'localhost',
      port: '1883'
    };
    
    setSettings(defaultSettings);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button 
            onClick={onClose}
            style={buttonVariants.secondaryButton}
          >
            ✕
          </button>
        </div>
        <div style={styles.content}>
          {/* Paths Section */}
          <div style={styles.section}>
            <div 
              style={styles.sectionHeader}
              onClick={() => toggleSection('paths')}
            >
              <span>Paths</span>
              <span style={styles.toggleIcon}>
                {openSections.paths ? '▼' : '▶'}
              </span>
            </div>
            {openSections.paths && (
              <div style={styles.sectionContent}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Projects Path</label>
                  <div style={styles.pathContainer}>
                    <input
                      type="text"
                      style={styles.pathInput}
                      value={settings.projects}
                      onChange={(e) => handleInputChange('projects', e.target.value)}
                      placeholder="Enter projects path"
                    />
                    <button 
                      style={styles.browseButton}
                      onClick={() => handleBrowseClick('projects')}
                    >
                      Browse...
                    </button>
                  </div>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Modules Path</label>
                  <div style={styles.pathContainer}>
                    <input
                      type="text"
                      style={styles.pathInput}
                      value={settings.modules}
                      onChange={(e) => handleInputChange('modules', e.target.value)}
                      placeholder="Enter modules path"
                    />
                    <button 
                      style={styles.browseButton}
                      onClick={() => handleBrowseClick('modules')}
                    >
                      Browse...
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connectivity Section */}
          <div style={styles.section}>
            <div 
              style={styles.sectionHeader}
              onClick={() => toggleSection('connectivity')}
            >
              <span>Connectivity</span>
              <span style={styles.toggleIcon}>
                {openSections.connectivity ? '▼' : '▶'}
              </span>
            </div>
            {openSections.connectivity && (
              <div style={styles.sectionContent}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>MQTT Broker Address</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={settings.mqttBroker}
                    onChange={(e) => handleInputChange('mqttBroker', e.target.value)}
                    placeholder="Enter MQTT broker address"
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Port</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={settings.port}
                    onChange={(e) => handleInputChange('port', e.target.value)}
                    placeholder="Enter port number"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Other Section */}
          <div style={styles.section}>
            <div 
              style={styles.sectionHeader}
              onClick={() => toggleSection('other')}
            >
              <span>Other</span>
              <span style={styles.toggleIcon}>
                {openSections.other ? '▼' : '▶'}
              </span>
            </div>
            {openSections.other && (
              <div style={styles.sectionContent}>
                <p>Additional settings will be added here</p>
              </div>
            )}
          </div>
          
          {/* Buttons */}
          <div style={styles.buttonContainer}>
            <div style={styles.saveIndicator}>
              Settings are auto-saved
            </div>
            <button 
              style={buttonVariants.secondaryButton}
              onClick={handleReset}
            >
              Reset to Default
            </button>
            <button 
              style={buttonVariants.primaryButton}
              onClick={handleSave}
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 