import React, { useState, useCallback, useRef, useMemo  } from 'react';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
} from 'react-flow-renderer';
import defaultProperties from '../../data/defaultProperties.json';
import SidePanel from './SidePanel';
import { backgroundVariants } from '../../styles/backgroundStyles';

const FlowchartEditor = ({ nodes, setNodes, onAddNode,onNodesChange, onEdgesChange, edges, setEdges, onProceed }) => {
  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomEdge }), []);
  const [selectedNodes, setSelectedNodes] = useState([]); // Track multiple selected nodes
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false); // To toggle the color menu
  const [isInMenu, setIsInMenu] = useState(false); // Track if the mouse is inside a menu
  const contextMenuRef = useRef(null);

  // Colors to choose from
  const colorOptions = ['#7e91fc', '#fc7e91', '#91fc7e', '#00106b', '#6b0010', '#106b00', '#ffffff','#000000','#f80'];

  const handleNodeClick = (event, nodeId) => {
    console.log('Shift pressed:', event.shiftKey);  // Debug to check Shift key
    console.log('Clicked node ID:', nodeId);  // Debug the clicked node
    // Remove event.preventDefault() to allow normal click behavior
    const clickedNode = nodes.find(node => node.id === nodeId);
  
    // Check if Shift or Ctrl is pressed for multi-selection
    if (event.shiftKey || event.ctrlKey) {
      // Add or remove the node to/from the selection
      if (selectedNodes.some(selectedNode => selectedNode.id === nodeId)) {
        setSelectedNodes(selectedNodes.filter(selectedNode => selectedNode.id !== nodeId));
      } else {
        setSelectedNodes([...selectedNodes, clickedNode]);
      }
    } else {
      // If Shift/Ctrl is not pressed, select only the clicked node
      setSelectedNodes([clickedNode]); // Select only the clicked node
    }
  };

  // Handle context menu for nodes
  const handleContextMenu = (event, nodeId) => {
    event.preventDefault();
    const clickedNode = nodes.find(node => node.id === nodeId);

    if (event.shiftKey || event.ctrlKey) {
      if (!selectedNodes.some(selectedNode => selectedNode.id === nodeId)) {
        setSelectedNodes([...selectedNodes, clickedNode]);
      }
    } else {
      setSelectedNodes([clickedNode]);
    }

    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowContextMenu(true);
    setShowColorMenu(false);  // Hide color menu if it was previously open
  };

  // Handle edge deletion
  const handleDeleteEdge = useCallback((id) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== id));  // Remove the edge by its ID
  }, [setEdges]);

  // Hide both context and color menus when the mouse leaves both
  const hideMenus = () => {
    if (!isInMenu) {
      setShowContextMenu(false);
      setShowColorMenu(false);
    }
  };

  const openColorMenu = () => {
    setShowColorMenu(true);  // Show the color selection menu
  };

  // Handle renaming the selected node (only for single node selection)
  const changeNodeName = () => {
    if (selectedNodes.length === 1) {
      const selectedNode = selectedNodes[0];
      const newName = prompt('Enter new name for the node:', selectedNode.data.label);
      if (newName) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNode.id ? { ...node, data: { ...node.data, label: newName } } : node
          )
        );
        setShowContextMenu(false); // Close the menu
      }
    }
  };

  // Handle copying selected nodes
  const copySelectedNodes = () => {
    const nodeIdMap = {}; // Map to store old-to-new node ID mapping
  
    // Copy nodes and generate new unique IDs for them
    const newNodes = selectedNodes.map((node) => {
      const newNodeId = `node-${Date.now() + Math.random()}`;
      nodeIdMap[node.id] = newNodeId; // Map old node ID to new node ID
  
      return {
        ...node,
        id: newNodeId, // Assign the new ID to the copied node
        position: { x: node.position.x + 20, y: node.position.y + 20 }, // Offset to avoid overlap
        data: { ...node.data, label: `${node.data.label} (Copy)` },
      };
    });
  
    // Copy edges connected to the selected nodes
    const connectedEdges = edges.filter(edge =>
      selectedNodes.some(node => node.id === edge.source || node.id === edge.target)
    );
  
    // Copy edges and assign new unique IDs
    const newEdges = connectedEdges.map((edge) => ({
      ...edge,
      id: `edge-${Date.now() + Math.random()}`, // Ensure unique edge ID
      source: nodeIdMap[edge.source] || edge.source, // Map old source ID to new source ID if applicable
      target: nodeIdMap[edge.target] || edge.target, // Map old target ID to new target ID if applicable
    }));
  
    // Add the copied nodes and edges to the state
    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    setShowContextMenu(false); // Close the context menu
  };

  // Handle deleting selected nodes
  const deleteSelectedNodes = () => {
    setNodes((nds) => nds.filter((node) => !selectedNodes.some((selectedNode) => selectedNode.id === node.id)));
    setEdges((eds) => eds.filter((edge) => !selectedNodes.some((selectedNode) => edge.source === selectedNode.id || edge.target === selectedNode.id)));
    setShowContextMenu(false); // Close the menu
  };

  const changeNodeColor = (color) => {
    setNodes((nds) =>
      nds.map((node) =>
        selectedNodes.some(selectedNode => selectedNode.id === node.id)
          ? { ...node, style: { ...node.style, backgroundColor: color } }
          : node
      )
    );
    setShowContextMenu(false);  // Close the context menu
    setShowColorMenu(false);    // Close the color menu
  };

  const handleEdgePropertyChange = useCallback((id, propertyName, propertyValue) => {
    console.log('change edge:', id);
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, properties: { ...edge.data.properties, [propertyName]: propertyValue } } }
          : edge
      )
    );
  }, [setEdges]);

  const handleConnect = useCallback((params) => {
    const defaultEdgeProperties = defaultProperties.edges.default;  // Load default edge properties from JSON
    const newEdgeId = `edge-${Date.now()}`;  // Generate a unique ID for the edge
    setEdges((eds) => [
      ...eds,
      {
        ...params,
        type: 'customEdge',
        id: newEdgeId,
        data: {
          properties: defaultEdgeProperties, 
          onPropertyChange: (propertyName, propertyValue) => handleEdgePropertyChange(newEdgeId, propertyName, propertyValue),
          onDelete: () => handleDeleteEdge(newEdgeId),  // Pass the delete function
        },
        style: { strokeWidth: 5, stroke: '#bfb' },
      },
    ]);
    
  }, [setEdges, handleEdgePropertyChange,handleDeleteEdge]);
  
  // Handle node property changes
  const handlePropertyChange = useCallback((id, propertyName, propertyValue) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, [propertyName]: propertyValue } }
          : node
      )
    );
    
  }, [setNodes]);

  const handleAddNode = useCallback((newNode) => {
    setNodes((nds) => [
      ...nds,
      {
        id: newNode.id,
        type: newNode.type,  // React Flow type
        position: newNode.position,
        data: {
          label: newNode.data.label,
          type: newNode.data.type,  // Node type, e.g., 'pump'
          properties: newNode.data.properties || {},  // Load properties passed from SidePanel
          parameters: newNode.data.parameters || {},
          onPropertyChange: (propertyName, propertyValue) => 
            handlePropertyChange(newNode.id, propertyName, propertyValue),
        },
      },
    ]);
  }, [setNodes, handlePropertyChange]);

  const onImportFlow = (importedFlow) => {
    let parsedFlow;
    
    // Check if the imported flow is a string or already an object
    if (typeof importedFlow === 'string') {
      parsedFlow = JSON.parse(importedFlow);  // Parse the JSON string
    } else {
      parsedFlow = importedFlow;  // Use the object as is
    }
  
    const { nodes, edges } = parsedFlow;
  
    // Update nodes to include onPropertyChange handler
    const updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onPropertyChange: (propertyName, propertyValue) => handlePropertyChange(node.id, propertyName, propertyValue),
      }
    }));
  
    // Update edges to include onPropertyChange and onDelete handlers
    const updatedEdges = edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        onPropertyChange: (propertyName, propertyValue) => handleEdgePropertyChange(edge.id, propertyName, propertyValue),
        onDelete: () => handleDeleteEdge(edge.id),
      }
    }));
  
    setNodes(updatedNodes);  // Update nodes state with handlers
    setEdges(updatedEdges);  // Update edges state with handlers
  
    console.log('Flow imported:', updatedNodes, updatedEdges);
  };

  //console.log('Rendering Nodes in React Flow:', nodes);

  const styles = {
    menuButton: {
      display: 'block',
      margin: '5px 0',
      padding: '8px',
      border: 'none',
      cursor: 'pointer',
      borderRadius: '3px',
      width: '100%',
      ...backgroundVariants.menuBackground
    }
  };

  return (
    <ReactFlowProvider>
      <div className="screen-wide-component" style={{ display: 'flex' }}>
        <div style={{ flex: 1, height: '100vh', ...backgroundVariants.mainBackground }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              selected: selectedNodes.some(selectedNode => selectedNode.id === node.id),
              data: {
                ...node.data,
                onContextMenu: (event) => handleContextMenu(event, node.id),
                onClick: (event) => handleNodeClick(event, node.id),
              },
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#666666" gap={50} size={0.5} />
            <Controls />
            <SidePanel onAddNode={handleAddNode} onProceed={onProceed} onImportFlow={onImportFlow} />
          </ReactFlow>

          {showContextMenu && (
            <div
              ref={contextMenuRef}
              style={{
                position: 'absolute',
                top: `${contextMenuPosition.y}px`,
                left: `${contextMenuPosition.x}px`,
                borderRadius: '5px',
                padding: '10px',
                zIndex: 100,
                ...backgroundVariants.menuBackground
              }}
              onMouseEnter={() => setIsInMenu(true)}
              onMouseLeave={() => {
                setIsInMenu(false);
                hideMenus();
              }}
            >
              <button onClick={openColorMenu} style={styles.menuButton}>
                Change Color
              </button>
              {selectedNodes.length === 1 && (
                <button onClick={changeNodeName} style={styles.menuButton}>
                  Change Name
                </button>
              )}
              <button onClick={copySelectedNodes} style={styles.menuButton}>
                Copy
              </button>
              <button onClick={deleteSelectedNodes} style={styles.menuButton}>
                Delete
              </button>
              <button onClick={() => {
                setIsInMenu(false);
                hideMenus();
              }}
              style={styles.menuButton}>
                Close Menus
              </button>
            </div>
          )}

          {showColorMenu && (
            <div
              style={{
                position: 'absolute',
                top: `${contextMenuPosition.y}px`,
                left: `${contextMenuPosition.x + 120}px`,
                borderRadius: '5px',
                padding: '10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '5px',
                zIndex: 101,
                ...backgroundVariants.menuBackground
              }}
              onMouseEnter={() => setIsInMenu(true)}
              onMouseLeave={() => {
                setIsInMenu(false);
                hideMenus();
              }}
            >
              {colorOptions.map((color) => (
                <div
                  key={color}
                  onClick={() => changeNodeColor(color)}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: color,
                    cursor: 'pointer',
                    borderRadius: '50%',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default FlowchartEditor;