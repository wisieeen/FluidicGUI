import { backgroundVariants } from '../../../styles/backgroundStyles';

const DetectorPanelStyles = {
  container: {
    padding: '10px',
    ...backgroundVariants.panelBackground,
    borderRadius: '5px',
    overflow: 'auto',
    resize: 'both' // Enable native resizing as fallback
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
  chartSection: {
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '14px',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: '4px',
  },
  chartContainer: {
    height: '120px',
    display: 'flex',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '5px',
    borderRadius: '4px',
  },
  dataBar: {
    width: '2px',
    backgroundColor: '#66ccff',
    marginRight: '1px',
  },
  noData: {
    textAlign: 'center',
    padding: '10px',
    color: '#999',
  },
  analysisSection: {
    marginBottom: '15px',
  },
  closeButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(80, 80, 80, 0.5)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  videoSection: {
    marginBottom: '15px',
  },
  analysisControls: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  analysisTypeSelector: {
    flex: '1',
    marginRight: '8px',
  },
  analysisSelect: {
    width: '100%',
    ...backgroundVariants.inputBackground,
    borderRadius: '4px',
    padding: '5px',
  },
  startAnalysisButton: {
    backgroundColor: 'rgba(0, 150, 100, 0.7)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  stopAnalysisButton: {
    backgroundColor: 'rgba(150, 100, 0, 0.7)', 
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  analysisResultsContainer: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
  },
  analysisResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  noAnalysis: {
    color: '#999',
    textAlign: 'center',
    padding: '4px',
  },
  colorBox: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  lineProfileContainer: {
    marginTop: '8px',
  },
  lineProfileCanvas: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
  },
  lineProfileLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '4px',
    fontSize: '11px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendColor: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
  },
  lineProfileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  lineProfileTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: 'rgba(60, 120, 200, 0.7)',
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
  lineProfileTitleArea: {
    display: 'flex',
    flexDirection: 'column',
  },
  integrationStatus: {
    fontSize: '10px',
    color: '#aaa',
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
  toggleButton: {
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
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  managementButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  managementMenu: {
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    border: '1px solid rgba(80, 80, 80, 0.5)',
    borderRadius: '4px',
    padding: '10px',
    marginBottom: '15px',
  },
  managementMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  managementMenuTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  closeManagementButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
  },
  managementMenuSection: {
    marginBottom: '15px',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  },
  settingLabel: {
    width: '100px',
    fontSize: '12px',
  },
  settingInput: {
    flex: 1,
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
    color: '#fff',
    border: '1px solid rgba(120, 120, 120, 0.5)',
    borderRadius: '3px',
    padding: '3px 5px',
    fontSize: '12px',
  },
  settingSlider: {
    flex: 1,
    marginRight: '8px',
  },
  settingValue: {
    width: '40px',
    fontSize: '12px',
    textAlign: 'right',
  },
  applyButton: {
    backgroundColor: 'rgba(0, 120, 200, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '5px',
    width: '100%',
  },
  settingInfo: {
    fontSize: '10px',
    color: '#aaa',
    marginTop: '5px',
    fontStyle: 'italic',
  },
  checkboxRow: {
    marginBottom: '6px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '8px',
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
    gap: '5px'
  },
  
  rightColumn: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '200px',
    maxWidth: '100%', // Ensure it doesn't overflow
    overflow: 'hidden' // Prevent overflow
  },
  
  panelResizeHandle: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '16px',
    height: '16px',
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
  
  lineProfileCanvas: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '2px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  graphSizeInfo: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 'auto'
  },
  
  graphControls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px'
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
  
  waterfallContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: '4px',
    padding: '8px',
    marginTop: '0', // Remove top margin since it's now in a flex column
    width: '100%' // Ensure it takes full width of the column
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
  }
};

export default DetectorPanelStyles; 