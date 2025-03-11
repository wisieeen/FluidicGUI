import { backgroundVariants } from '../../../styles/backgroundStyles';

const VideoControlPanelStyles = {
  videoControlPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  cameraControls: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  cameraSelect: {
    flex: '1',
    ...backgroundVariants.inputBackground,
    borderRadius: '4px',
    padding: '5px',
    marginRight: '8px',
  },
  startButton: {
    backgroundColor: 'rgba(0, 120, 200, 0.7)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  stopButton: {
    backgroundColor: 'rgba(200, 60, 60, 0.7)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  videoContainer: {
    backgroundColor: 'black',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  video: {
    objectFit: 'cover',
  },
  noCamera: {
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(60, 120, 200, 0.7)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    marginTop: '10px',
    cursor: 'pointer',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '16px',
    height: '16px',
    backgroundColor: 'rgba(60, 150, 220, 0.8)',
    cursor: 'nwse-resize',
    borderTopLeftRadius: '3px',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 3px rgba(0, 0, 0, 0.5)'
  },
  sizeIndicator: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 10,
  },
  lineControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    padding: '4px 8px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
  },
  lineControlsInfo: {
    fontSize: '12px',
    color: '#ccc',
  },
  lineControlsButtons: {
    display: 'flex',
    gap: '8px',
  },
  lineButton: {
    padding: '3px 8px',
    border: 'none',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
    color: 'white',
    backgroundColor: 'rgba(60, 60, 60, 0.8)',
  },
  lineTransformControls: {
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    borderRadius: '4px',
    padding: '8px',
    marginTop: '5px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  transformTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  transformControl: {
    display: 'flex',
    alignItems: 'center'
  },
  transformLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    width: '100%'
  },
  transformSlider: {
    flex: '1',
    height: '6px'
  },
  transformValue: {
    width: '40px',
    textAlign: 'right',
    fontSize: '11px'
  },
  fineTuneLabel: {
    color: 'rgba(120, 200, 255, 0.9)',
    fontSize: '11px',
    width: '55px'
  },
  fineSlider: {
    flex: '1',
    height: '4px',
    backgroundColor: 'rgba(120, 200, 255, 0.3)'
  },
  positionInfo: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: '4px',
    padding: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '2px'
  },
  resetTransformButton: {
    backgroundColor: 'rgba(100, 100, 100, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    alignSelf: 'flex-end'
  }
};

export default VideoControlPanelStyles; 