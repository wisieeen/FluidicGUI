import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState } from 'react-flow-renderer';
import FlowchartEditor from './components/Flowchart/FlowchartEditor';
import SidePanel from './components/Flowchart/SidePanel';
import ManualDropletCreation from './components/DropletGenerator/Manual/ManualDropletCreation';
import ResponseSurfaceGenerator from './components/DropletGenerator/ResponseSurfaceGenerator';
import InterpolationGenerator from './components/DropletGenerator/InterpolationGenerator';
import ScriptBasedGeneration from './components/DropletGenerator/ScriptBasedGeneration';
import PlaceholderComponent from './components/DropletGenerator/PlaceholderComponent';
import Simulation from './components/Simulation/Simulation';
import NavigationBar from './components/Navigation/NavigationBar';
import { ButtonColorSchemeProvider } from './context/ColorSchemeContext';
import { ButtonStyleProvider } from './styles/ButtonStyleProvider';
import { WS_URL } from './config';

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
  const [ws, setWs] = useState(null);
  const [detectedDevices, setDetectedDevices] = useState([]);

  useEffect(() => {
    // Create WebSocket connection
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('Connected to WebSocket server');
      
      // Send device scan message when the app starts
      const scanMessage = {
        topic: "common/device_scan",
        payload: {}
      };
      
      websocket.send(JSON.stringify(scanMessage));
      console.log('Sent device scan message on startup');
      
      // Reset the detected devices list
      setDetectedDevices([]);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Check if this is a device response message
        if (data.topic === 'common/device_response') {
          // Parse the payload - format is "MQTTname:type"
          const responseData = data.payload.toString();
          const [MQTTname, type] = responseData.split(':');
          
          if (MQTTname && type) {
            setDetectedDevices(prev => {
              // Check if device is already in the list
              const exists = prev.some(device => device.MQTTname === MQTTname);
              if (!exists) {
                console.log(`New device detected: ${MQTTname} (${type})`);
                return [...prev, { MQTTname, type }];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    // Cleanup on unmount
    return () => {
      if (websocket) {
        websocket.close();
      }
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
    // Make ws available globally for debugging
    window.appWebSocket = ws;
    
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

  const handleNavigate = (newStep) => {
    if (newStep === 7 && droplets.length === 0) {
      console.log('No droplets available for simulation. Redirecting to droplet creation.');
      setStep(3);
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
    setStep(7);
  };

  const handleRSMDropletGeneration = (generatedDroplets) => {
    setManualDroplets(generatedDroplets);
    setStep(3);
  };

  const handleInterpolationGeneration = (generatedDroplets) => {
    setManualDroplets(generatedDroplets);
    setStep(3); // Go to Manual Droplet Creation instead of simulation
  };

  const getCarrierPumps = () => {
    return nodes.filter(node => 
      node.data.type === 'pump' && 
      node.data.carrier === true
    ).map(node => node.id);
  };

  return (
    <ButtonColorSchemeProvider>
      <ButtonStyleProvider>
        <ReactFlowProvider>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <NavigationBar currentStep={step} onNavigate={handleNavigate} />
            <div style={{ flex: 1, display: 'flex' }}>
              {step === 1 && (
                <div style={{ flex: 1 }}>
                  <SidePanel 
                    onAddNode={handleAddNode}
                    onScanDevices={handleScanDevices}
                    detectedDevices={detectedDevices}
                    nodes={nodes}
                    edges={edges}
                    onProceed={() => handleNavigate(3)}
                  />
                  <FlowchartEditor 
                    onAddNode={handleAddNode}
                    nodes={nodes}
                    setNodes={setNodes}
                    edges={edges}
                    setEdges={setEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onProceed={() => handleNavigate(3)} 
                  />
                </div>
              )}

              {step === 3 && (
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
              )}
              
              {step === 4 && (
                <ResponseSurfaceGenerator 
                  nodes={nodes}
                  setNodes={setNodes}
                  onNext={handleRSMDropletGeneration}
                  selectedCarrierPumps={getCarrierPumps()}
                />
              )}
              {step === 5 && <ScriptBasedGeneration />}
              {step === 6 && <PlaceholderComponent />}
              {step === 8 && (
                <InterpolationGenerator
                  nodes={nodes}
                  selectedCarrierPumps={getCarrierPumps()}
                  onNext={handleInterpolationGeneration}
                />
              )}
              {step === 7 && (
                <Simulation 
                  nodes={nodes}
                  edges={edges}
                  droplets={droplets}
                  selectedCarrierPumps={getCarrierPumps()}
                />
              )}
            </div>
          </div>
        </ReactFlowProvider>
      </ButtonStyleProvider>
    </ButtonColorSchemeProvider>
  );
};

export default App;
