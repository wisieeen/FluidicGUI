import React, { useState, useEffect } from 'react';
import { convertToHardwareValuesPump, createPumpCommand } from '../../../utils/pumpCalculations';
import { useButtonStyles } from '../../../styles/ButtonStyleProvider';
import { WS_URL } from '../../../config';

const PumpActions = ({ node, nodes = [], edges = [], onAction }) => {
  const [volume, setVolume] = useState('');
  const [speed, setSpeed] = useState('');
  const [ws, setWs] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPumps, setSelectedPumps] = useState([node.id]);
  const [pumpMultipliers, setPumpMultipliers] = useState({});
  const buttonVariants = useButtonStyles();

  // Add debug logging
  useEffect(() => {
    console.log('All nodes:', nodes);
    console.log('Pump nodes:', nodes.filter(n => n.type === 'pump'));
    console.log('Current node:', node);
  }, [nodes, node]);

  // Filter only pump nodes, with safety check
  const pumpNodes = nodes?.filter(n => {
    //console.log('Checking node:', n);
    return n.type === 'pump' || n.data?.type === 'pump';
  }) || [];

  useEffect(() => {
    // Create WebSocket connection
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('Connected to WebSocket server');
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

  const handlePumpSelection = (pumpId) => {
    setSelectedPumps(prev => {
      if (prev.includes(pumpId)) {
        setPumpMultipliers(prevMultipliers => {
          const { [pumpId]: removed, ...rest } = prevMultipliers;
          return rest;
        });
        return prev.filter(id => id !== pumpId);
      } else {
        setPumpMultipliers(prev => ({ ...prev, [pumpId]: 1 }));
        return [...prev, pumpId];
      }
    });
  };

  const handleMultiplierChange = (pumpId, value) => {
    const multiplier = parseFloat(value) || 1;
    setPumpMultipliers(prev => ({
      ...prev,
      [pumpId]: multiplier
    }));
  };

  const sendCommandToSelectedPumps = (command, params) => {
    selectedPumps.forEach(pumpId => {
      const selectedNode = nodes.find(n => n.id === pumpId);
      if (!selectedNode || !selectedNode.data?.MQTTname) {
        console.error('No MQTTname found for node:', selectedNode);
        return;
      }
      const multipliedParams = params ? {
        ...params,
        volume: params.volume * (pumpMultipliers[pumpId] || 1),
        speed: params.speed * (pumpMultipliers[pumpId] || 1)
      } : params;
      command(selectedNode, multipliedParams);
    });
  };

  const handleHome = () => {
    const sendHome = (selectedNode) => {
      const mqttMessage = {
        topic: `${selectedNode.data.MQTTname}/homing`,
        payload: {
          command: 'home'
        }
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(mqttMessage));
      } else {
        console.error('WebSocket is not connected');
      }

      onAction({
        type: 'home',
        node: selectedNode
      });
    };

    sendCommandToSelectedPumps(sendHome);
  };

  const handleStop = () => {
    const sendStop = (selectedNode) => {
      if (!selectedNode.data?.properties) {
        console.error('No properties found for node:', selectedNode);
        return;
      }

      const stopCommand = [
        [0, 0]
      ];

      const programMessage = {
        topic: `${selectedNode.data.MQTTname}/new_program`,
        payload: stopCommand
      };

      const runMessage = {
        topic: `${selectedNode.data.MQTTname}/run_master`,
        payload: "run"
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(programMessage));
        ws.send(JSON.stringify(runMessage));
      }

      onAction({
        type: 'stop',
        nodeId: selectedNode.id,
        params: {
          volume: 0,
          speed: 1000,
          moveList: stopCommand
        }
      });
    };

    sendCommandToSelectedPumps(sendStop);
    setIsRunning(false);
  };

  const handleStopAll = () => {
    const sendStop = (node) => {
      if (!node.data?.properties || !node.data?.MQTTname) {
        console.error('No properties or MQTTname found for node:', node);
        return;
      }

      const stopCommand = [
        [0, 0]
      ];

      const programMessage = {
        topic: `${node.data.MQTTname}/new_program`,
        payload: stopCommand
      };

      const runMessage = {
        topic: `${node.data.MQTTname}/run_master`,
        payload: "run"
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(programMessage));
        ws.send(JSON.stringify(runMessage));
      }

      onAction({
        type: 'stop',
        nodeId: node.id,
        params: {
          volume: 0,
          speed: 1000,
          moveList: stopCommand
        }
      });
    };

    // Stop all pump nodes
    pumpNodes.forEach(sendStop);
    setIsRunning(false);
  };

  const handleMove = () => {
    if (!volume || !speed) {
      console.error('Missing volume or speed inputs');
      return;
    }

    const sendMove = (selectedNode) => {
      if (!selectedNode.data?.properties) {
        console.error('Missing required properties');
        return;
      }

      const params = {
        volume: parseFloat(volume) * (pumpMultipliers[selectedNode.id] || 1),
        speed: parseFloat(speed) * (pumpMultipliers[selectedNode.id] || 1)
      };

      const moveCommand = createPumpCommand(params, selectedNode.data.properties);

      const mqttMessage = {
        topic: `${selectedNode.data.MQTTname}/new_program`,
        payload: moveCommand
      };

      const mqttMessage2 = {
        topic: `${selectedNode.data.MQTTname}/run_master`,
        payload: "run"
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(mqttMessage));
        ws.send(JSON.stringify(mqttMessage2));
      }

      onAction({
        type: 'move',
        nodeId: selectedNode.id,
        params: {
          ...params,
          moveList: moveCommand
        }
      });
    };

    sendCommandToSelectedPumps(sendMove);
    setIsRunning(true);
  };

  const handleMoveInMm = () => {
    if (!volume || !speed) {
      console.log('Missing volume or speed inputs');
      return;
    }

    const sendMoveInMm = (selectedNode) => {
      if (!selectedNode.data?.properties) {
        console.error('Missing required properties');
        return;
      }

      // Find the next edge connected to this pump, edit it so main line edge is found
      const connectedEdge = edges.find(edge => 
        edge.source === selectedNode.id
      );

      if (!connectedEdge || !connectedEdge.data?.properties?.diameter) {
        console.error('No connected edge found or missing diameter property');
        return;
      }

      const diameter = connectedEdge.data.properties.diameter; // in mm
      const radius = diameter / 2;
      const area = Math.PI * radius * radius; // in mm²
      
      // Convert volume from μL to mm³ (1 μL = 1 mm³)
      const strokeLengthInMm = parseFloat(volume);
      
      // Calculate stroke volume in mm³
      const strokeVolumeInMm3 = strokeLengthInMm * area;
      
      const params = {
        volume: strokeVolumeInMm3 * (pumpMultipliers[selectedNode.id] || 1), // Now in mm
        speed: speed * (pumpMultipliers[selectedNode.id] || 1) // Now in mm/s
      };

      const moveCommand = createPumpCommand(params, selectedNode.data.properties);

      const mqttMessage = {
        topic: `${selectedNode.data.MQTTname}/new_program`,
        payload: moveCommand
      };

      const mqttMessage2 = {
        topic: `${selectedNode.data.MQTTname}/run_master`,
        payload: "run"
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(mqttMessage));
        ws.send(JSON.stringify(mqttMessage2));
      }

      onAction({
        type: 'move',
        nodeId: selectedNode.id,
        params: {
          ...params,
          moveList: moveCommand
        }
      });
    };

    sendCommandToSelectedPumps(sendMoveInMm);
    setIsRunning(true);
  };

  return (
    <div className="node-actions" style={{ padding: '10px' }}>
      <div className="pump-selection" style={{ 
        marginBottom: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '15px',
        borderRadius: '8px'
      }}>
        <h4 style={{ 
          color: '#4CAF50',
          marginTop: 0,
          marginBottom: '10px'
        }}>
          Select Pumps:
        </h4>
        <div style={{ 
          maxHeight: '150px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {pumpNodes.map(pump => (
            <div key={pump.id} style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fff'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flex: '1',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={selectedPumps.includes(pump.id)}
                  onChange={() => handlePumpSelection(pump.id)}
                  style={{ cursor: 'pointer' }}
                />
                {pump.data?.MQTTname || pump.data.properties.find(p => p.name === 'MQTTname')?.default}
              </label>
              {selectedPumps.includes(pump.id) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#aaa' }}>×</span>
                  <input
                    type="number"
                    value={pumpMultipliers[pump.id] || 1}
                    onChange={(e) => handleMultiplierChange(pump.id, e.target.value)}
                    min="0.1"
                    step="0.1"
                    style={{
                      width: '60px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      padding: '4px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="control-buttons" style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleHome}
          style={{ ...buttonVariants.primaryButton }}
        >
          Home
        </button>
        <button 
          onClick={handleStop}
          className="stop-button"
          style={{ ...buttonVariants.dangerButton }}
        >
          Stop
        </button>
        <button 
          onClick={handleStopAll}
          className="stop-all-button"
          style={{ ...buttonVariants.dangerButton }}
        >
          Stop All Pumps
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div>
          <label>Volume (μL): </label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            style={{ marginLeft: '10px', width: '80px' }}
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>Speed (μL/s): </label>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            style={{ marginLeft: '10px', width: '80px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleMove}
          disabled={!volume || !speed || selectedPumps.length === 0}
          style={{ ...buttonVariants.primaryButton }}
        >
          Move
        </button>
        <button 
          onClick={handleMoveInMm}
          disabled={!volume || !speed || selectedPumps.length === 0}
          style={{ ...buttonVariants.primaryButton }}
        >
          μL to mm
        </button>
      </div>
    </div>
  );
};

export default PumpActions; 