/**
 * Utility functions for flowchart operations
 */

/**
 * Calculates the start and end points for an edge between two nodes
 * @param {Object} sourceNode - The source node object
 * @param {Object} targetNode - The target node object
 * @returns {Object} Object with sourceX, sourceY, targetX, targetY coordinates
 */
export const calculateEdgePoints = (sourceNode, targetNode) => {
  if (!sourceNode || !targetNode) {
    console.warn('Missing node data for edge calculation');
    return { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 };
  }

  const sourceX = sourceNode.position.x + sourceNode.width;
  const sourceY = sourceNode.position.y + sourceNode.height / 2;
  const targetX = targetNode.position.x;
  const targetY = targetNode.position.y + targetNode.height / 2;

  return { sourceX, sourceY, targetX, targetY };
};

/**
 * Creates labels for edges based on node and edge data
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Array} Updated edges with label information
 */
export const createLabels = (nodes, edges) => {
  if (!nodes || !edges) {
    console.warn('Missing nodes or edges data for label creation');
    return [];
  }

  return edges.map(edge => {
    const sourceNode = nodes.find(node => node.id === edge.source);
    const targetNode = nodes.find(node => node.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      console.warn(`Could not find nodes for edge ${edge.id}`);
      return edge;
    }

    // Calculate the midpoint for the label
    const { sourceX, sourceY, targetX, targetY } = calculateEdgePoints(sourceNode, targetNode);
    const labelX = (sourceX + targetX) / 2;
    const labelY = (sourceY + targetY) / 2 - 10; // Offset above the line
    
    // Create a label based on node types or other logic
    let labelText = '';
    if (sourceNode.type === 'pump') {
      labelText = `Flow: ${sourceNode.data?.flowRate || '?'} μL/s`;
    } else if (sourceNode.type === 'thermostat') {
      labelText = `${sourceNode.data?.temperature || '?'}°C`;
    }
    
    return {
      ...edge,
      labelX,
      labelY,
      labelText
    };
  });
};

/**
 * Calculates the path for a curved edge between nodes
 * @param {Object} sourceNode - The source node
 * @param {Object} targetNode - The target node
 * @returns {String} SVG path string
 */
export const calculateEdgePath = (sourceNode, targetNode) => {
  if (!sourceNode || !targetNode) {
    return '';
  }
  
  const { sourceX, sourceY, targetX, targetY } = calculateEdgePoints(sourceNode, targetNode);
  
  // Calculate control points for a smooth curve
  const controlPointX1 = sourceX + Math.abs(targetX - sourceX) / 3;
  const controlPointX2 = targetX - Math.abs(targetX - sourceX) / 3;
  
  return `M ${sourceX} ${sourceY} C ${controlPointX1} ${sourceY}, ${controlPointX2} ${targetY}, ${targetX} ${targetY}`;
};

/**
 * Finds the shortest path between two nodes in a graph
 * @param {Array} nodes - Array of all nodes
 * @param {Array} edges - Array of all edges
 * @param {String} startNodeId - ID of the start node
 * @param {String} endNodeId - ID of the end node
 * @returns {Array} Array of node IDs representing the path
 */
export const findShortestPath = (nodes, edges, startNodeId, endNodeId) => {
  // Build adjacency list
  const adjacencyList = {};
  
  nodes.forEach(node => {
    adjacencyList[node.id] = [];
  });
  
  edges.forEach(edge => {
    adjacencyList[edge.source].push(edge.target);
  });
  
  // BFS for shortest path
  const queue = [[startNodeId]];
  const visited = new Set();
  
  while (queue.length > 0) {
    const path = queue.shift();
    const currentNodeId = path[path.length - 1];
    
    if (currentNodeId === endNodeId) {
      return path;
    }
    
    if (!visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      
      const neighbors = adjacencyList[currentNodeId] || [];
      for (const neighbor of neighbors) {
        const newPath = [...path, neighbor];
        queue.push(newPath);
      }
    }
  }
  
  return []; // No path found
}; 