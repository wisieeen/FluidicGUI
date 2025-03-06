/**
 * Utility functions for simulation component
 */

import { convertToHardwareValuesPump } from './pumpCalculations';

/**
 * Find the outlet node in the graph
 * @param {Array} nodes - Array of graph nodes
 * @returns {Object|null} The outlet node or null if not found
 */
export const findOutletNode = (nodes) => {
  const outletNode = nodes.find(node => node.type === 'outlet');
  if (!outletNode) {
    console.error('No outlet node found');
    return null;
  }
  return outletNode;
};

/**
 * Find the only node in the graph of a given type, if there is more than one, it will return the first one it finds
 * @param {Array} nodes - Array of graph nodes
 * @param {string} type - Type of the node to find
 * @returns {Object|null} The node or null if not found
 */
export const findOnlyNode = (nodes, type) => {
    const onlyNode = nodes.find(node => node.type === type);
    if (!onlyNode) {
      console.error(`No ${type} node found`);
      return null;
    }
    return onlyNode;
  };

/**
 * Find the node furthest from the outlet in the graph (actually can search for furthest node in main line from any node)
 * @param {Object} outletNode - The outlet node
 * @param {Array} nodes - Array of graph nodes
 * @param {Array} links - Array of graph links
 * @returns {Object} The furthest node from outlet
 */
export const findFurthestNode = (outletNode, nodes, links) => {
  const visited = new Set();
  const queue = [[outletNode, 0]];
  let furthestNode = outletNode;
  let maxDistance = 0;

  while (queue.length > 0) {
    const [currentNode, distance] = queue.shift();
    
    if (distance > maxDistance && !['pump', 'droplet'].includes(currentNode.type)) {
      furthestNode = currentNode;
      maxDistance = distance;
    }

    visited.add(currentNode.id);

    const neighbors = links
      .filter(link => link.source === currentNode.id || link.target === currentNode.id)
      .map(link => link.source === currentNode.id ? link.target : link.source)
      .filter(nodeId => !visited.has(nodeId))
      .map(nodeId => nodes.find(n => n.id === nodeId));

    for (const neighbor of neighbors) {
      queue.push([neighbor, distance + 1]);
    }
  }

  return furthestNode;
};

/**
 * Order nodes by their distance from the outlet
 * @param {Object} outletNode - The outlet node
 * @param {Array} nodes - Array of graph nodes
 * @param {Array} links - Array of graph links
 * @returns {Array} Ordered array of nodes with their distances
 */
export const orderNodesByDistance = (outletNode, nodes, links) => {
  const visited = new Set();
  const queue = [[outletNode, 0]];
  const orderedNodes = [];

  while (queue.length > 0) {
    const [currentNode, distance] = queue.shift();
    if (!visited.has(currentNode.id)) {
      visited.add(currentNode.id);
      orderedNodes.push({ node: currentNode, distance });
      const neighbors = links
        .filter(link => link.source === currentNode.id || link.target === currentNode.id)
        .map(link => link.source === currentNode.id ? link.target : link.source)
        .filter(nodeId => !visited.has(nodeId))
        .map(nodeId => nodes.find(n => n.id === nodeId));

      for (const neighbor of neighbors) {
        queue.push([neighbor, distance + 1]);
      }
    }
  }
  return orderedNodes.sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate the volume of an edge
 * @param {Object} edge - Edge object with diameter and length properties
 * @returns {number} Volume of the edge in μL
 */
export const calculateEdgeVolume = (edge) => {
  const radius = edge.diameter / 2;
  const volume = Math.PI * radius * radius * edge.length;
  return volume;
};

/**
 * Get the volume between two nodes in the graph
 * @param {string} startNodeId - ID of the start node
 * @param {string} endNodeId - ID of the end node
 * @param {Array} nodes - Array of graph nodes
 * @param {Array} links - Array of graph links
 * @returns {number|null} Volume between nodes or null if path not found
 */
export const getVolumeBetweenNodes = (startNodeId, endNodeId, nodes, links) => {
  const startNode = nodes.find(node => node.id === startNodeId);
  const endNode = nodes.find(node => node.id === endNodeId);
  
  if (!startNode || !endNode) {
    console.error(`One or both nodes not found: ${startNodeId}, ${endNodeId}`);
    return null;
  }

  const outletNode = findOutletNode(nodes);
  const orderedNodes = orderNodesByDistance(outletNode, nodes, links);
  const startIndex = orderedNodes.findIndex(({node}) => node.id === startNodeId);
  const endIndex = orderedNodes.findIndex(({node}) => node.id === endNodeId);

  if (startIndex === -1 || endIndex === -1) {
    console.error("One or both nodes not found in ordered nodes");
    return null;
  }

  const setOfMainLineNodes = ['connector', 'outlet', 'thermostat', "led", "detector"];
  let nodesOfInterest = orderedNodes.slice(
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex) + 1
  );

  nodesOfInterest = nodesOfInterest.filter(({node}) => 
    setOfMainLineNodes.includes(node.type)
  );

  let volume = 0;
  
  for (let i = 0; i < nodesOfInterest.length - 1; i++) {
    const currentNode = nodesOfInterest[i].node;
    const nextNode = nodesOfInterest[i + 1].node;

    const edge = links.find(link => 
      (link.source === currentNode.id && link.target === nextNode.id) ||
      (link.target === currentNode.id && link.source === nextNode.id)
    );

    if (edge) {
      const edgeVolume = calculateEdgeVolume(edge);
      volume += edgeVolume;
    } else {
      console.error(`Edge not found between nodes ${currentNode.id} and ${nextNode.id}`);
      return null;
    }
  }

  return volume;
};

/**
 * Find the pump connected to a connector node
 * @param {string} connectorId - ID of the connector node
 * @param {Array} nodes - Array of graph nodes
 * @param {Array} links - Array of graph links
 * @returns {Object|null} Connected pump node or null if not found
 */
export const findConnectedPump = (connectorId, nodes, links) => {
  const pump = links.find(link => 
    link.target === connectorId && 
    nodes.find(node => node.id === link.source).type === 'pump'
  );

  return pump ? nodes.find(node => node.id === pump.source) : null;
};

/**
 * Get pump speed at a specific time from event list
 * @param {string} pumpId - ID of the pump
 * @param {Array} eventList - List of pump events
 * @param {number} timePassed - Current time
 * @returns {number} Current pump speed
 */
export const getPumpSpeed = (pumpId, eventList, timePassed) => {
  let lastSpeed = 0;
  eventList.forEach(event => {
    if (event.target === pumpId && event.time < timePassed) {
      lastSpeed = event.value;
    }
  });
  return lastSpeed;
};

/**
 * Get all pumps between two volumetric positions
 * @param {number} frontVolumetricPosition - Front position
 * @param {number} rearVolumetricPosition - Rear position
 * @param {Array} nodes - Array of graph nodes
 * @returns {Array} Array of pump nodes between positions
 */
export const getPumpsBetweenPositions = (frontVolumetricPosition, rearVolumetricPosition, nodes, links) => {
  const connectorsBetweenPositions = nodes.filter(node => 
    node.type === 'connector' && 
    node.volumetricPosition >= rearVolumetricPosition && 
    node.volumetricPosition <= frontVolumetricPosition
  );

  const pumpsBetweenPositions = connectorsBetweenPositions.map(connector => 
    findConnectedPump(connector.id, nodes, links)
  ).filter(pump => pump !== null);

  return pumpsBetweenPositions;
};

/**
 * Clean and sort event list by removing redundant events
 * @param {Array} eventList - List of events to clean and sort
 * @returns {Array} Cleaned and sorted event list
 */
export const cleanAndSortEventList = (eventList) => {
  const uniqueIds = [...new Set(eventList.map(event => event.target))];
  const idEvents = uniqueIds.map(id => eventList.filter(event => event.target === id));

  // Process events for each ID to remove meaningless ones
  idEvents.forEach((events, index) => {
    let filteredEvents = [];
    let prevEvent = null;

    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i];
      
      // Skip if same value as previous event
      if (prevEvent && prevEvent.value === currentEvent.value) {
        continue;
      }

      filteredEvents.push(currentEvent);
      prevEvent = currentEvent;
    }

    idEvents[index] = filteredEvents;
  });

  // Additional filtering passes
  idEvents.forEach((events, index) => {
    let filteredEvents = [];
    let prevEvent = null;

    for (let i = 0; i < events.length; i++) {
      const currentEvent = events[i];
      const nextEvent = events[i + 1];

      // Skip if next event has same time and value as previous
      if (nextEvent && 
          nextEvent.time === currentEvent.time && 
          prevEvent && 
          nextEvent.value === prevEvent.value) {
        continue;
      }

      filteredEvents.push(currentEvent);
      prevEvent = currentEvent;
    }

    idEvents[index] = filteredEvents;
  });

  return idEvents;
};

/**
 * Get pump speed at a specific time
 * @param {string} pumpId - ID of the pump
 * @param {Array} pumpEvents - List of pump events
 * @param {number} currentTime - Current time
 * @returns {number} Current pump speed
 */
export const getPumpSpeedAtTime = (pumpId, pumpEvents, currentTime) => {
  const relevantEvents = pumpEvents
    .filter(event => event.target === pumpId && event.time <= currentTime)
    .sort((a, b) => b.time - a.time);
  
  return relevantEvents.length > 0 ? relevantEvents[0].value : 0;
};

/**
 * Send events to devices via WebSocket
 * @param {Array} pumpEvents - List of pump events
 * @param {WebSocket} ws - WebSocket connection
 * @param {Array} nodes - Array of graph nodes
 * @param {Function} convertToHardwareValues - Function to convert values to hardware format
 * @returns {void}
 */
export const sendEventsToDevices = (pumpEvents, ws, nodes) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not connected');
    return;
  }

  // Group events by device
  const deviceEvents = new Map();

  pumpEvents.forEach(event => {
    const node = nodes.find(n => n.id === event.target);
    if (!node || !node.data?.MQTTname) return;

    if (!deviceEvents.has(node.data.MQTTname)) {
      deviceEvents.set(node.data.MQTTname, []);
    }

    const hardwareValues = convertToHardwareValuesPump(
      { volume: 0, speed: event.value },
      node.data.properties
    );

    deviceEvents.get(node.data.MQTTname).push([
      hardwareValues.delayMicroseconds,
      Math.round(event.time * 1000000)
    ]);
  });

  let deviceEntries = Array.from(deviceEvents.entries());

  deviceEntries.forEach(([deviceName, events]) => {
    for (let i = events.length - 1; i > 0; i--) {
      events[i][1] = events[i][1] - events[i - 1][1];
    }
  });
  
  deviceEntries.forEach(([deviceName, events], deviceIndex) => {
    const chunks = [];
    for (let i = 0; i < events.length; i += 5) {
      chunks.push(events.slice(i, i + 5));
    }

    const sendChunks = async () => {
      if (chunks.length > 0) {
        const firstMessage = {
          topic: `${deviceName}/new_program`,
          payload: chunks[0]
        };
        ws.send(JSON.stringify(firstMessage));

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 1; i < chunks.length; i++) {
          await delay(2);
          const message = {
            topic: `${deviceName}/continue_program`,
            payload: chunks[i]
          };
          ws.send(JSON.stringify(message));
        }

        await delay(2);

        const runMessage = {
          topic: `${deviceName}/${deviceIndex === 0 ? 'run_master' : 'run_slave'}`,
          payload: "run"
        };
        ws.send(JSON.stringify(runMessage));
      }
    };

    sendChunks();
  });
};

/**
 * Divide droplets into blocks based on thermostat volumes
 * @param {Array} droplets - Array of droplet objects
 * @param {Array} thermostatVolumes - Array of thermostat volume objects
 * @param {Array} nodes - Array of graph nodes
 * @param {Array} links - Array of graph links
 * @returns {Array} Array of blocks containing droplets
 */
export const divideDropletsIntoBlocks = (droplets, thermostatVolumes, nodes, links) => {
  if (thermostatVolumes.length === 0) {
    return [{
      droplets: droplets,
      thermostatId: null,
      totalVolume: droplets.reduce((acc, droplet) => acc + droplet.actualVolume, 0),
      temperature: null,
      time: null
    }];
  }

  const outletNode = findOutletNode(nodes);
  const furthestNode = findFurthestNode(outletNode, nodes, links);
  const volumeToFurthestNode = getVolumeBetweenNodes(
    thermostatVolumes[0].endThermostatId, 
    furthestNode.id,
    nodes,
    links
  );
  
  if (!droplets.length || !thermostatVolumes.length) return [];

  const blocks = [];
  let currentBlock = {
    droplets: [],
    thermostatId: thermostatVolumes[0].endThermostatId,
    totalVolume: 0,
    temperature: null,
    time: null
  };

  // Helper to finalize a block and start a new one
  const finalizeBlock = (thermostatId, temperature, time) => {
    if (currentBlock.droplets.length > 0) {
      // Add volumeToFurthestNode to the surfixVolume of the last droplet in the block
      const lastDroplet = currentBlock.droplets[currentBlock.droplets.length - 1];
      const surfixParam = lastDroplet.parameters.find(p => p.name === 'surfixVolume');
      if (surfixParam) {
        surfixParam.value = Math.max(volumeToFurthestNode, surfixParam.value);
      } else {
        lastDroplet.parameters.push({
          name: 'surfixVolume',
          value: volumeToFurthestNode
        });
      }
      
      blocks.push({ ...currentBlock });
    }
    currentBlock = {
      droplets: [],
      thermostatId: thermostatId,
      totalVolume: 0,
      temperature: temperature,
      time: time
    };
  };

  // Process droplets in order
  for (let i = 0; i < droplets.length; i++) {
    const droplet = droplets[i];
    const temperature = droplet.parameters.find(p => p.name === 'temperature')?.value;
    const time = droplet.parameters.find(p => p.name === 'time')?.value;

    // Start new block if temperature or time changes, or if volume limit exceeded
    const relevantVolume = thermostatVolumes.find(tv => 
      tv.startThermostatId === currentBlock.thermostatId || 
      tv.endThermostatId === currentBlock.thermostatId
    );

    let dropletVolume = droplet.parameters.find(p => p.name === 'volume')?.value;
    dropletVolume += droplet.parameters.find(p => p.name === 'prefixVolume')?.value;

    if (
      currentBlock.temperature !== temperature ||
      currentBlock.time !== time ||
      (relevantVolume && currentBlock.totalVolume + dropletVolume > relevantVolume.volume)
    ) {
      finalizeBlock(thermostatVolumes[0].endThermostatId, temperature, time);
    }
    dropletVolume += droplet.parameters.find(p => p.name === 'surfixVolume')?.value;
    // Add droplet to current block
    currentBlock.droplets.push(droplet);
    currentBlock.totalVolume += dropletVolume;
    currentBlock.temperature = temperature;
    currentBlock.time = time;
  }

  // Finalize last block
  finalizeBlock(null, null, null);

  return blocks;
};

/**
 * Print droplet front positions and speeds for debugging
 * @param {Array} droplets - Array of droplet objects
 */
export const printDropletFrontPositionsAndSpeeds = (droplets) => {
  droplets.forEach(droplet => {
    console.log(
      `Droplet ID: ${droplet.id}, ` +
      `Front Volumetric Position: ${droplet.frontVolumetricPosition}, ` +
      `Front time to next node: ${droplet.frontTimeToReachNextNode}, ` +
      `Front Volumetric Distance to next node: ${droplet.frontVolumetricDistanceToNextNode}, ` +
      `Rear Volumetric Position: ${droplet.rearVolumetricPosition}, ` +
      `Rear time to next node: ${droplet.rearTimeToReachNextNode}, ` +
      `Rear Volumetric Distance to next node: ${droplet.rearVolumetricDistanceToNextNode}, ` +
      `frontNextNodeID: ${droplet.frontNextNodeID}, ` +
      `rearNextNodeID: ${droplet.rearNextNodeID}`
    );
  });
}; 