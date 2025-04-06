// FloatingComponentStyles.js
// Reusable styles for floating/modal components

export const floatingComponentStyles = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: '6px',
    border: '1px solid rgba(80, 80, 80, 0.5)',
    width: '100%'
  },
  title: {
    fontSize: '16px',
    marginTop: '0',
    marginBottom: '8px',
    color: '#eee'
  },
  mqttInputs: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px'
  },
  inputLabel: {
    width: '90px',
    color: '#ccc',
    fontSize: '14px'
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(60, 60, 60, 0.7)',
    border: '1px solid rgba(100, 100, 100, 0.5)',
    borderRadius: '4px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '14px'
  },
  slider: {
    flex: 1,
    marginLeft: '10px',
    marginRight: '10px'
  },
  value: {
    color: '#ccc',
    fontSize: '14px',
    width: '60px',
    textAlign: 'right'
  },
  cameraView: {
    position: 'relative',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(80, 80, 80, 0.5)',
    borderRadius: '4px',
    color: '#666',
    marginBottom: '8px',
    overflow: 'hidden'
  },
  lineControls: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '8px',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    border: '1px solid rgba(80, 80, 80, 0.5)',
    borderRadius: '4px',
    padding: '8px'
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px'
  },
  controlLabel: {
    width: '100px',
    color: '#ccc',
    fontSize: '14px'
  },
  controls: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  },
  settingsButton: {
    marginLeft: 'auto'
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#0f0',
    marginRight: '6px'
  },
  resizeHandle: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '18px',
    height: '18px',
    cursor: 'nwse-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  },
  resizeInfo: {
    position: 'absolute',
    bottom: '10px',
    right: '25px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 15
  },
  cameraSettings: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    display: 'block'
  },
  capabilitiesTable: {
    marginTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '10px'
  },
  capabilitiesTitle: {
    fontSize: '13px',
    margin: '0 0 8px 0'
  },
  scrollContainer: {
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '3px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px'
  },
  th: {
    padding: '4px 8px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.8)'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  td: {
    padding: '4px 8px',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  advancedToggle: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '12px',
    padding: '6px 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    userSelect: 'none'
  },
  toggleIcon: {
    marginRight: '6px',
    transition: 'transform 0.2s ease'
  },
  configMenuContainer: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    display: 'block'
  },
  configRow: {
    marginBottom: '8px'
  },
  configLabel: {
    width: '100px',
    color: '#ccc',
    fontSize: '14px'
  },
  configInput: {
    flex: 1,
    backgroundColor: 'rgba(60, 60, 60, 0.7)',
    border: '1px solid rgba(100, 100, 100, 0.5)',
    borderRadius: '4px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '14px'
  },
  roiInput: {
    width: '50px',
    backgroundColor: 'rgba(60, 60, 60, 0.7)',
    border: '1px solid rgba(100, 100, 100, 0.5)',
    borderRadius: '4px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '14px'
  },
  overlayText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    pointerEvents: 'none'
  },
  debugPanel: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#ddd',
    border: '1px solid rgba(100, 150, 200, 0.5)'
  },
  debugHideButton: {
    backgroundColor: 'rgba(60, 60, 60, 0.7)',
    border: 'none',
    color: '#ccc',
    padding: '0 5px',
    fontSize: '10px',
    cursor: 'pointer'
  },
  debugInfoRow: {
    margin: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderTop: '1px solid rgba(100, 100, 100, 0.5)',
    paddingTop: '4px'
  },
  debugSelect: {
    backgroundColor: 'rgba(60, 60, 60, 0.7)',
    border: '1px solid rgba(100, 100, 100, 0.5)',
    borderRadius: '2px',
    padding: '2px 4px',
    color: 'white',
    fontSize: '11px',
    marginLeft: '4px'
  },
  debugMessageBlock: {
    margin: '4px 0',
    borderTop: '1px solid rgba(100, 100, 100, 0.5)',
    paddingTop: '4px'
  },
  debugPre: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '4px',
    borderRadius: '2px',
    fontSize: '10px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    maxHeight: '100px'
  },
  canvas: {
    width: '100%',
    display: 'block',
    cursor: 'default',
    zIndex: 10
  },
  connectionStatusOverlay: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    transform: 'none',
    zIndex: 25,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    pointerEvents: 'none'
  }
}; 