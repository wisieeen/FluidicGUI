import { backgroundVariants } from '../../../styles/backgroundStyles';

const GraphWaterfallPanelStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%'
  },
  integrationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    padding: '5px 8px',
    borderRadius: '4px'
  },
  integrationLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#ccc',
  },
  integrationInput: {
    width: '40px',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    color: '#fff',
    border: '1px solid rgba(120, 120, 120, 0.5)',
    borderRadius: '3px',
    padding: '2px 4px',
    fontSize: '12px',
  },
  resetButton: {
    backgroundColor: 'rgba(150, 70, 0, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '10px',
    cursor: 'pointer',
  },
  graphControls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px'
  },
  toggleButton: {
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '11px',
    cursor: 'pointer',
    marginRight: '4px',
  },
  waterfallModeSelector: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  waterfallModeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px'
  },
  waterfallIntervalControl: {
    display: 'flex',
    alignItems: 'center'
  },
  waterfallIntervalLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px'
  },
  waterfallIntervalSelect: {
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px'
  },
  waterfallHistoryControl: {
    display: 'flex',
    alignItems: 'center'
  },
  waterfallHistoryLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px'
  },
  waterfallHistorySlider: {
    width: '80px',
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    borderRadius: '4px'
  },
  waterfallHistoryValue: {
    minWidth: '20px',
    textAlign: 'right'
  },
  lineProfileContainer: {
    marginTop: '8px',
  },
  lineProfileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  lineProfileTitleArea: {
    display: 'flex',
    flexDirection: 'column',
  },
  lineProfileTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  integrationStatus: {
    fontSize: '10px',
    color: '#aaa',
  },
  lineProfileControls: {
    display: 'flex',
    gap: '6px',
  },
  infoButton: {
    backgroundColor: 'rgba(60, 180, 120, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px',
  },
  exportButton: {
    backgroundColor: 'rgba(180, 120, 60, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px',
  },
  backgroundButton: {
    backgroundColor: 'rgba(0, 100, 150, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '11px',
    cursor: 'pointer',
    marginRight: '4px',
  },
  clearBgButton: {
    backgroundColor: 'rgba(150, 50, 50, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '11px',
    cursor: 'pointer',
    marginRight: '4px',
  },
  normalizeButton: {
    backgroundColor: 'rgba(100, 100, 180, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '14px',
  },
  normalizationInfo: {
    fontSize: '10px',
    color: '#aaa',
    marginLeft: 'auto',
    marginTop: '2px',
  },
  graphSizeInfo: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 'auto'
  },
  lineProfileCanvas: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '2px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  graphWrapper: {
    position: 'relative',
    width: 'fit-content',
    height: 'fit-content'
  },
  graphResizeHandle: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '12px',
    height: '12px',
    cursor: 'nwse-resize',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1
    }
  },
  waterfallContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: '4px',
    padding: '8px',
    marginTop: '0',
    width: '100%'
  },
  waterfallHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px'
  },
  waterfallTitle: {
    fontWeight: 'bold',
    fontSize: '12px'
  },
  waterfallInfo: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  waterfallCanvas: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '2px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  waterfallLegend: {
    marginTop: '5px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  waterfallLegendGradient: {
    height: '10px',
    width: '100%',
    background: 'linear-gradient(to right, black, blue, cyan, green, yellow, red, white)',
    borderRadius: '2px'
  },
  waterfallLegendLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  lineProfileLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginTop: '4px',
    fontSize: '11px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
};

export default GraphWaterfallPanelStyles; 