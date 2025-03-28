import { backgroundVariants } from '../../../styles/backgroundStyles';

const USBSpectrometerStyles = {
  container: {
    position: 'relative',
    overflow: 'auto',
    ...backgroundVariants.panelBackground,
    borderRadius: '5px',
  },
  
  controlBar: {
    display: 'flex', 
    justifyContent: 'space-between', 
    marginBottom: '10px',
    padding: '5px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px'
  },
  
  controlLabel: {
    fontWeight: 'bold',
    marginRight: '15px'
  },
  
  detectorInfo: {
    marginBottom: '15px',
  },
  
  detectorProperty: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
  },
  
  propertyLabel: {
    fontWeight: 'bold',
  },
  
  propertyValue: {
    color: '#66ccff',
  },
  
  columnsContainer: {
    display: 'flex', 
    flexDirection: 'row', 
    gap: '10px', 
    width: '100%', 
    marginBottom: '10px'
  },
  
  leftColumn: {
    flex: '0 0 auto', 
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '10px',
    borderRadius: '4px',
    minWidth: '320px'
  },
  
  rightColumn: {
    flex: '1 1 auto', 
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '200px'
  },
  
  componentBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '10px',
    borderRadius: '4px'
  },
  
  componentTitle: {
    margin: '0 0 10px 0', 
    fontSize: '14px'
  },
  
  cameraContainer: {
    width: '320px', 
    height: '240px', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  graphContainer: {
    width: '100%', 
    height: '200px', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  waterfallContainer: {
    width: '100%', 
    height: '200px', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  settingRow: {
    marginBottom: '5px'
  },
  
  settingLabel: {
    display: 'block', 
    marginBottom: '3px'
  },
  
  checkboxContainer: {
    marginRight: '10px'
  },
  
  buttonRow: {
    marginTop: '5px'
  },
  
  resizeHandle: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '28px',
    height: '28px',
    cursor: 'nwse-resize',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 1,
    backgroundColor: 'rgba(60, 60, 60, 0.8)',
    borderTop: '1px solid rgba(180, 180, 180, 0.7)',
    borderLeft: '1px solid rgba(180, 180, 180, 0.7)',
    borderTopLeftRadius: '6px',
    boxShadow: 'inset 1px 1px 0px rgba(255, 255, 255, 0.3)',
    transform: 'none',
    userSelect: 'none',
    touchAction: 'none',
  }
};

export default USBSpectrometerStyles; 