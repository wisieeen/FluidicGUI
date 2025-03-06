// App.js
import React, { useState, useEffect } from 'react';
import ReactFlow, { Background, Controls } from 'react-flow-renderer';

const initialNodes = [
  { id: 'pump-1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Pump 1', pressure: 0, flowRate: 0 } },
  // Add other nodes as required
];

const initialEdges = [
  // Define edges here if needed
];

const App = () => {
  const [nodes, setNodes] = useState(initialNodes);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');

    ws.onmessage = (event) => {
      const sensorData = JSON.parse(event.data);
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === sensorData.nodeId
            ? { ...node, data: { ...node.data, ...sensorData.data } }
            : node
        )
      );
    };

    return () => ws.close();
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <ReactFlow nodes={nodes} edges={initialEdges}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default App;
