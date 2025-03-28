import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState } from 'react-flow-renderer';
import FlowchartEditor from './components/Flowchart/FlowchartEditor';
import SidePanel from './components/Flowchart/SidePanel';
import PlaceholderComponent from './components/DropletGenerator/PlaceholderComponent';
import ScriptBasedGeneration from './components/DropletGenerator/ScriptBasedGeneration';
import NavigationBar from './components/Navigation/NavigationBar';
import { ButtonColorSchemeProvider } from './context/ColorSchemeContext';
import { ButtonStyleProvider } from './styles/ButtonStyleProvider';
import { WS_URL } from './config';
import { createWebSocket, parseDeviceInfo, setupMQTTDebugger } from './utils/mqttDebugger';

// Lazy load heavy components
const Simulation = lazy(() => import('./components/Simulation/Simulation'));
const ManualDropletCreation = lazy(() => import('./components/DropletGenerator/Manual/ManualDropletCreation'));
const ResponseSurfaceGenerator = lazy(() => import('./components/DropletGenerator/ResponseSurfaceGenerator'));
const InterpolationGenerator = lazy(() => import('./components/DropletGenerator/InterpolationGenerator'));

// For WebSocket connection
const WebSocket = window.WebSocket || window.MozWebSocket;

const App = () => {
  const [step, setStep] = useState(1);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeType, setNodeType] = useState('');
  const [droplets, setDroplets] = useState([]);
  const [manualDroplets, setManualDroplets] = useState([]);
  const [rsmDroplets, setRsmDroplets] = useState([]);
  const [parameterRanges, setParameterRanges] = useState({});
  const [parameterVisibility, setParameterVisibility] = useState({});
  const [simulationAvailable, setSimulationAvailable] = useState(false);
  const [hasDropletNode, setHasDropletNode] = useState(false);
  const [ws, setWs] = useState(null);
  const [detectedDevices, setDetectedDevices] = useState([]);

  // Initialize MQTT debugger
  useEffect(() => {
    setupMQTTDebugger();
  }, []);

  useEffect(() => {
    // Create WebSocket connection with auto-reconnect
    const cleanup = createWebSocket(WS_URL, {
      onOpen: (websocket) => {
        console.log('Connected to WebSocket server');
        setWs(websocket);
        window.appWebSocket = websocket; // Make available for debugging
        
        // Send device scan message when the app starts
        const scanMessage = {
          topic: "common/device_scan",
          payload: {}
        };
        
        websocket.send(JSON.stringify(scanMessage));
        console.log('Sent device scan message on startup');
        
        // Reset the detected devices list
        setDetectedDevices([]);
      },
      onMessage: (data) => {
        // Check if this is a device response message
        if (data.topic === 'common/device_response') {
          const deviceInfo = parseDeviceInfo(data.payload);
          
          if (deviceInfo) {
            setDetectedDevices(prev => {
              // Check if device is already in the list
              const exists = prev.some(device => device.MQTTname === deviceInfo.MQTTname);
              if (!exists) {
                console.log(`New device detected: ${deviceInfo.MQTTname} (${deviceInfo.type})`);
                return [...prev, deviceInfo];
              }
              return prev;
            });
          }
        }
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      }
    });

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  const handleScanDevices = () => {
    console.log('Scan Devices button clicked');
    console.log('WebSocket state:', ws ? ws.readyState : 'No WebSocket');
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Reset the detected devices list
      setDetectedDevices([]);
      console.log('Detected devices list reset');
      
      // Send device scan message
      const scanMessage = {
        topic: "common/device_scan",
        payload: {}
      };
      
      ws.send(JSON.stringify(scanMessage));
      console.log('Sent device scan message via button click');
    } else {
      console.error('WebSocket is not connected - cannot scan for devices');
    }
  };

  useEffect(() => {
    console.log('Current Nodes in App.js:', nodes);
  }, [nodes]);
  
  useEffect(() => {
    // Check if ws is connected
    if (ws) {
      console.log('WebSocket connection state updated:', ws.readyState);
    }
  }, [ws]);

  useEffect(() => {
    console.log('Detected devices:', detectedDevices);
    // Make detected devices available globally for the CustomNode component
    window.detectedDevices = detectedDevices;
  }, [detectedDevices]);

  // Check if there's at least one droplet node in the flowchart
  useEffect(() => {
    const dropletNodeExists = nodes.some(node => node.data.type === 'droplet');
    setHasDropletNode(dropletNodeExists);
    console.log('Droplet node exists:', dropletNodeExists);
  }, [nodes]);

  const handleNavigate = (newStep) => {
    if (newStep === 7 && !simulationAvailable) {
      console.log('Simulation not available yet. Please create droplets first.');
      setStep(3); // Redirect to droplet creation if available
    } else if ((newStep === 3 || newStep === 4 || newStep === 8) && !hasDropletNode) {
      console.log('No droplet node in flowchart. Please add a droplet node first.');
      setStep(1); // Redirect to flowchart editor
    } else {
      setStep(newStep);
    }
  };

  const handlePropertyChange = useCallback((nodeId, propertyName, propertyValue) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, [propertyName]: propertyValue } }
          : node
      )
    );
  }, [setNodes]);

  const handleAddNode = useCallback(({ id, label, type }) => {
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: type,
        label: label,
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
          label,
          type,
          onPropertyChange: (propertyName, propertyValue) => handlePropertyChange(id, propertyName, propertyValue),
        },
      },
    ]);
  }, [setNodes,handlePropertyChange]);

  const handleSimulationStart = (createdDroplets) => {
    setDroplets(createdDroplets);
    setSimulationAvailable(true);
    setStep(7);
  };

  const handleRSMDropletGeneration = (generatedDroplets) => {
    setManualDroplets(generatedDroplets);
    setSimulationAvailable(true);
    setStep(3);
  };

  const handleInterpolationGeneration = (generatedDroplets) => {
    setManualDroplets(generatedDroplets);
    setSimulationAvailable(true);
    setStep(3); // Go to Manual Droplet Creation instead of simulation
  };

  const getCarrierPumps = () => {
    return nodes.filter(node => 
      node.data.type === 'pump' && 
      node.data.carrier === true
    ).map(node => node.id);
  };

  // Loading components
  const LoadingSimulation = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <h2>Loading Simulation...</h2>
    </div>
  );

  const LoadingDropletCreation = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <h2>Loading Droplet Creator...</h2>
    </div>
  );

  const LoadingRSM = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <h2>Loading Response Surface Methodology...</h2>
    </div>
  );

  const LoadingInterpolation = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <h2>Loading Parameter Interpolation...</h2>
    </div>
  );

  return (
    <ButtonColorSchemeProvider>
      <ButtonStyleProvider>
        <ReactFlowProvider>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <NavigationBar 
              currentStep={step} 
              onNavigate={handleNavigate} 
              simulationAvailable={simulationAvailable}
              hasDropletNode={hasDropletNode}
            />
            <div style={{ flex: 1, display: 'flex' }}>
              {step === 1 && (
                <div style={{ flex: 1 }}>
                  <FlowchartEditor 
                    onAddNode={handleAddNode}
                    nodes={nodes}
                    setNodes={setNodes}
                    edges={edges}
                    setEdges={setEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onProceed={() => handleNavigate(3)}
                    onScanDevices={handleScanDevices}
                    detectedDevices={detectedDevices}
                  />
                </div>
              )}

              {step === 3 && (
                <Suspense fallback={<LoadingDropletCreation />}>
                  <ManualDropletCreation 
                    availableParameters={[]}
                    nodes={nodes}
                    setNodes={setNodes}
                    onNext={handleSimulationStart}
                    selectedCarrierPumps={getCarrierPumps()}
                    droplets={manualDroplets}
                    setDroplets={setManualDroplets}
                    parameterRanges={parameterRanges}
                    setParameterRanges={setParameterRanges}
                    parameterVisibility={parameterVisibility}
                    setParameterVisibility={setParameterVisibility}
                  />
                </Suspense>
              )}
              
              {step === 4 && (
                <Suspense fallback={<LoadingRSM />}>
                  <ResponseSurfaceGenerator 
                    nodes={nodes}
                    setNodes={setNodes}
                    onNext={handleRSMDropletGeneration}
                    selectedCarrierPumps={getCarrierPumps()}
                  />
                </Suspense>
              )}
              {step === 5 && <ScriptBasedGeneration />}
              {step === 6 && <PlaceholderComponent />}
              {step === 8 && (
                <Suspense fallback={<LoadingInterpolation />}>
                  <InterpolationGenerator
                    nodes={nodes}
                    selectedCarrierPumps={getCarrierPumps()}
                    onNext={handleInterpolationGeneration}
                  />
                </Suspense>
              )}
              {step === 7 && (
                <Suspense fallback={<LoadingSimulation />}>
                  <Simulation 
                    nodes={nodes}
                    edges={edges}
                    droplets={droplets}
                    selectedCarrierPumps={getCarrierPumps()}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </ReactFlowProvider>
      </ButtonStyleProvider>
    </ButtonColorSchemeProvider>
  );
};

export default App;
