import React, { useState, useEffect, useCallback, useRef } from 'react';
import PumpActions from './NodeActions/PumpActions';
import DraggablePanel from './DraggablePanel';
import { convertToHardwareValuesPump } from '../../utils/pumpCalculations';
import { useButtonStyles } from '../../styles/ButtonStyleProvider';
import { backgroundVariants } from '../../styles/backgroundStyles';
import {
  findOutletNode,
  findFurthestNode,
  orderNodesByDistance,
  calculateEdgeVolume,
  getVolumeBetweenNodes,
  findConnectedPump,
  getPumpSpeed,
  getPumpsBetweenPositions,
  cleanAndSortEventList,
  getPumpSpeedAtTime,
  sendEventsToDevices
} from '../../utils/simulationUtils';
import './simulation.css'; // We'll create this CSS file
import SvgDefs from './SvgDefs';
import { calculateEdgePoints, createLabels } from '../../utils/flowchartUtils';
import USBSpectrometer from './USBSpectrometer';
import { convertDetectorReading } from '../../utils/detectorCalculations';
import { WS_URL } from '../../config';

const Simulation = ({ nodes = [], edges = [], droplets = [], selectedCarrierPumps = [], onBack, onNext }) => {
  const buttonVariants = useButtonStyles();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [simulationDroplets, setSimulationDroplets] = useState([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [key, setKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [timeScale, setTimeScale] = useState(1); // Default 1x speed
  const animationFrameRef = useRef();
  const lastFrameTimeRef = useRef();
  const [currentBlockDroplets, setCurrentBlockDroplets] = useState([]);
  const [dropletHistory, setDropletHistory] = useState([]);
  const [currentTimepoint, setCurrentTimepoint] = useState(0);
  const [pumpEvents, setPumpEvents] = useState([]);
  const [displayPumpSpeeds, setDisplayPumpSpeeds] = useState(false);
  const [displayNodeIds, setDisplayNodeIds] = useState(false);
  const [displayDropletInfo, setDisplayDropletInfo] = useState(false);
  const [displayDropletGaps, setDisplayDropletGaps] = useState(true);
  const [displayEdgeLabels, setDisplayEdgeLabels] = useState(false);
  const [isDisplayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [displayTimelineDropletInfo, setDisplayTimelineDropletInfo] = useState(false);
  const displayMenuRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [ws, setWs] = useState(null);
  const [pumpPanelPosition, setPumpPanelPosition] = useState({ x: window.innerWidth - 300, y: 100 });
  const [visiblePumpPanel, setVisiblePumpPanel] = useState(null);
  const [selectedDetector, setSelectedDetector] = useState(null);
  const [detectorReadings, setDetectorReadings] = useState([]);

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

  // Check localStorage for a spectrometer node to open
  useEffect(() => {
    try {
      const spectrometerNodeData = localStorage.getItem('openSpectrometerNode');
      
      if (spectrometerNodeData) {
        console.log('Found spectrometer node data in localStorage');
        const nodeData = JSON.parse(spectrometerNodeData);
        
        // Clear the localStorage item to prevent reopening on refreshes
        localStorage.removeItem('openSpectrometerNode');
        
        // Find the actual node in our graphData
        const node = graphData.nodes.find(n => n.id === nodeData.id);
        
        if (node) {
          console.log('Found matching node in graphData, opening spectrometer', node);
          // Generate sample readings for demo purposes
          const sampleReadings = generateSampleDetectorReadings();
          
          // Set the selected detector with a small delay to ensure the component is fully mounted
          setTimeout(() => {
            setSelectedDetector(node);
            setDetectorReadings(sampleReadings);
          }, 500);
        } else {
          console.log('No matching node found in graphData');
        }
      }
    } catch (error) {
      console.error('Error processing spectrometer node from localStorage', error);
    }
  }, [graphData.nodes]);

  const sendingEventsToDevices = () => {
    sendEventsToDevices(pumpEvents, ws, nodes);
    // Reset simulation state
    setCurrentTime(0);
    setCurrentTimepoint(0);
    setIsSimulationRunning(true);
    setDropletHistory([]);
    // Generate new event list
    generateEventList([{ droplets: droplets }]);
  };

  const setOfMainLineNodes = ['connector', 'outlet', 'thermostat', "led", "detector", "USBSpectrometer"];
  const setOfSecondaryLineNodes = ['pump'];
  const eventType = ['setPumpSpeed', 'setThermostatTemperature', 'setLedIntensity', 'wait', 'blockEnd'];

  const calculateVolumesBetweenThermostats = (graphData) => {
  
    // Find outlet node first
    const outletNode = findOutletNode(graphData.nodes);
  
    const visited = new Set();
    const queue = [[outletNode.id, 0, []]]; // [nodeId, accumulated volume, path of thermostats]
    const thermostatVolumes = [];
  
    while (queue.length > 0) {
      let [currentNodeId, accumulatedVolume, thermostatPath] = queue.shift();
      const currentNode = graphData.nodes.find(n => n.id === currentNodeId);
  
      if (!currentNode) continue;
      
      // Track all visited nodes to prevent infinite loops
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);
  
      // If we found a thermostat, add it to the path
      let updatedPath = [...thermostatPath];
      if (currentNode.type === 'thermostat') {
        if (thermostatPath.length > 0) {
          thermostatVolumes.push({
            startThermostatId: thermostatPath[thermostatPath.length - 1],
            endThermostatId: currentNodeId,
            volume: accumulatedVolume
          });
        }
        updatedPath.push(currentNodeId);
        // Reset accumulated volume after finding a thermostat
        accumulatedVolume = 0;
      }
  
      // Find all connected edges and nodes
      const connectedEdges = graphData.links.filter(link => 
        link.source === currentNodeId || link.target === currentNodeId
      );
  
      for (const edge of connectedEdges) {
        const nextNodeId = edge.source === currentNodeId ? edge.target : edge.source;
        const nextNode = graphData.nodes.find(n => n.id === nextNodeId);
        
        // Skip paths to pumps
        if (nextNode && nextNode.type !== 'pump') {
          const edgeVolume = calculateEdgeVolume(edge);
          queue.push([nextNodeId, accumulatedVolume + edgeVolume, updatedPath]);
        }
      }
    }
  
    return thermostatVolumes;
  };
//add something to handle lack of thermostat
  const divideDropletsIntoBlocks = (droplets, thermostatVolumes) => {

    if (thermostatVolumes.length === 0) {
      return [{
        droplets: droplets,
        thermostatId: null,
        totalVolume: droplets.reduce((acc, droplet) => acc + droplet.actualVolume, 0),
        temperature: null,
        time: null
      }];
    }

    const furthestNode = findFurthestNode(findOutletNode(graphData.nodes), graphData.nodes, graphData.links);

    const volumeToFurthestNode = getVolumeBetweenNodes(thermostatVolumes[0].endThermostatId, furthestNode.id, graphData.nodes, graphData.links);
    
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

  function printDropletFrontPositionsAndSpeeds(droplets) {
    droplets.forEach(droplet => {
      console.log(`Droplet ID: ${droplet.id}, Front Volumetric Position: ${droplet.frontVolumetricPosition}, Front time to next node  : ${droplet.frontTimeToReachNextNode}, Front Volumetric Distance to next node: ${droplet.frontVolumetricDistanceToNextNode}, Rear Volumetric Position: ${droplet.rearVolumetricPosition}, Rear time to next node: ${droplet.rearTimeToReachNextNode}, Rear Volumetric Distance to next node: ${droplet.rearVolumetricDistanceToNextNode}, frontNextNodeID: ${droplet.frontNextNodeID}, rearNextNodeID: ${droplet.rearNextNodeID}`);
    });
  }

  const extractPumpEvents = (eventList) => {
    // eventList is now an array of arrays, where each inner array contains events for a specific pump
    return eventList
      .flat() // Flatten the array of arrays
      .filter(event => event.type === 'setPumpSpeed')
      .sort((a, b) => a.time - b.time);
  };

  const recalculateEventListForDevices = (eventList) => {
    const deviceEventMap = new Map();

    const convertPumpEvent = (event, deviceProperties) => {
      // Find properties by name from the properties array
      const syringeDiameter = deviceProperties.find(p => p.name === 'diameter')?.default || 0;
      const syringeLength = deviceProperties.find(p => p.name === 'length')?.default || 0;
      const stepsPerRevolution = deviceProperties.find(p => p.name === 'steps per revolution')?.default || 0;
      const lead = deviceProperties.find(p => p.name === 'lead')?.default || 0;

      const syringeArea = Math.PI * Math.pow(syringeDiameter / 2, 2);
      const linearSpeed = Math.abs(event.value) / syringeArea;
      const stepsPerMm = stepsPerRevolution / lead;
      const stepsPerSecond = linearSpeed * stepsPerMm;
      const delayMicroseconds = stepsPerSecond > 0 ? 
        Math.round(1000000 / stepsPerSecond) : 
        0;

      return {
        target: event.target,
        time: Math.round(event.time * 1000000),
        delay: delayMicroseconds
      };
    };

    const convertThermostatEvent = (event, deviceProperties) => {
      // Placeholder for thermostat conversion logic
      return {
        target: event.target,
        time: Math.round(event.time * 1000000),
        temperature: event.value,
        // Add other thermostat-specific parameters here
      };
    };

    const convertLedEvent = (event, deviceProperties) => {
      // Placeholder for LED conversion logic
      return {
        target: event.target,
        time: Math.round(event.time * 1000000),
        intensity: event.value,
        // Add other LED-specific parameters here
      };
    };

    const convertDetectorEvent = (event, deviceProperties) => {
      // Use the detector values in the event
      const reading = {
        value: event.value,
        timestamp: event.time * 1000 // Convert to milliseconds
      };
      
      // Use our detector calculations utility
      const processedReading = convertDetectorReading(reading, deviceProperties);
      
      return {
        target: event.target,
        time: Math.round(event.time * 1000000), // Convert to microseconds for hardware
        setting: processedReading.calibratedValue,
        rawValue: processedReading.rawValue,
        unit: processedReading.unit
      };
    };

    eventList.forEach(deviceEventList => {
      if (!deviceEventList.length) return;

      const targetId = deviceEventList[0].target;
      const deviceNode = nodes.find(node => node.id === targetId);
      
      if (!deviceNode || !deviceNode.data) {
        console.error(`Device node or data not found for ID: ${targetId}`);
        return;
      }

      const deviceEvents = deviceEventList.map(event => {
        switch (event.type) {
          case 'setPumpSpeed':
            return convertPumpEvent(event, deviceNode.data.properties);
          
          case 'setThermostatTemperature':
            return convertThermostatEvent(event, deviceNode.data.properties);
          
          case 'setLedIntensity':
            return convertLedEvent(event, deviceNode.data.properties);
          
          case 'setDetectorSetting':
            return convertDetectorEvent(event, deviceNode.data.properties);
          
          default:
            console.warn(`Unknown event type: ${event.type}`);
            return null;
        }
      }).filter(Boolean); // Remove any null events

      if (deviceEvents.length > 0) {
        deviceEventMap.set(targetId, deviceEvents);
      }
    });
    console.log('deviceEventMap: ', Array.from(deviceEventMap.values()));
    return Array.from(deviceEventMap.values());
  };

  const generateEventList = (blocks) => {
    // Early exit if blocks array is invalid
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      console.warn('No valid blocks found for event generation');
      return [];
    }

    const orderedNodes = orderNodesByDistance(findOutletNode(graphData.nodes), graphData.nodes, graphData.links);
    console.log('orderedNodes: ', orderedNodes);
    
    // Early exit if no ordered nodes
    if (!orderedNodes || orderedNodes.length === 0) {
      console.warn('No ordered nodes found for event generation');
      return [];
    }
    
    let eventList = [];
    let dropletSnapshot = [];
    
    // Validate block droplets
    if (!blocks[0] || !blocks[0].droplets || !Array.isArray(blocks[0].droplets) || blocks[0].droplets.length === 0) {
      console.warn('No valid droplets found in blocks for event generation');
      return [];
    }
    
    const i = 0;
    const currentBlockDroplets = blocks[i].droplets;
    
    // Add fallback for volumetricSpeed in case it's not found
    const dropletWithParams = currentBlockDroplets.find(d => d && d.parameters && Array.isArray(d.parameters));
    if (!dropletWithParams) {
      console.warn('No droplet with valid parameters found');
      return [];
    }
    
    // Make sure we can find the volumetricSpeed parameter or use a default
    const volumetricSpeedParam = dropletWithParams.parameters.find(p => p && p.name === 'volumetricSpeed');
    const commonVolumetricSpeed = volumetricSpeedParam?.value || 1;
    console.log('Using volumetricSpeed:', commonVolumetricSpeed);
    
    //adds some parameters to nodes
    orderedNodes.forEach(node => {
      node.inletVolumetricSpeed = commonVolumetricSpeed;
      node.outletVolumetricSpeed = commonVolumetricSpeed;
      const pump = findConnectedPump(node.node.id, graphData.nodes, graphData.links);
      if (pump) {
        node.connectedPump = pump;
      }
      else {
        node.connectedPump = 0;
      }
      node.connectedPumpRatio = 0;
      node.connectedPumpSpeedAtPause = 0;
      node.pumpSpeedMultiplier = 1;
      //node.requestedRatio = 0;
      node.pauseLevel = 0;

    });
    //ustawia carrier pump na odpowiednią predkość
    const carrierPumpConnector = graphData.links.find(link => link.source === selectedCarrierPumps[0]).target;
    if (carrierPumpConnector) {
      const connectorNode = orderedNodes.find(node => node.node.id === carrierPumpConnector);
      connectorNode.inletVolumetricSpeed = commonVolumetricSpeed;
      connectorNode.outletVolumetricSpeed = commonVolumetricSpeed;
      connectorNode.connectedPump = graphData.nodes.find(node => node.id === selectedCarrierPumps[0]);
      connectorNode.connectedPumpRatio = 1;
      connectorNode.connectedPumpSpeedAtPause = commonVolumetricSpeed;
      //connectorNode.requestedRatio = 0;
      connectorNode.pauseLevel = 0;
    }
    let event = { //it is ok
      type: 'setPumpSpeed',
      target: selectedCarrierPumps[0],
      time: 0,
      value: commonVolumetricSpeed
    };
    eventList.push(event);

    orderedNodes.filter(node => node.node.type === 'pump' && node.node.id !== selectedCarrierPumps[0]).forEach(pump => {
      event = {//it is ok
        type: 'setPumpSpeed',
        target: pump.node.id,
        time: 0,
        value: 0
      };
      eventList.push(event);
      
    });

    orderedNodes.filter(node => node.node.type !== 'pump' ).forEach(pump => {
      
    });


    let position = -0.001;
    //prepares all droplets in block and calculates some parameters
    currentBlockDroplets.forEach(droplet => {
      const prefixVolume = droplet.parameters.find(p => p.name === 'prefixVolume')?.value;
      const surfixVolume = droplet.parameters.find(p => p.name === 'surfixVolume')?.value;

      droplet.frontVolumetricSpeed = commonVolumetricSpeed;
      droplet.rearVolumetricSpeed = commonVolumetricSpeed;
      droplet.frontVolumetricPosition = position - prefixVolume;
      droplet.rearVolumetricPosition = droplet.frontVolumetricPosition;
      droplet.frontVolumetricDistanceToNextNode = Math.abs(droplet.frontVolumetricPosition);
      droplet.rearVolumetricDistanceToNextNode = Math.abs(droplet.rearVolumetricPosition); 
      droplet.frontTimeToReachNextNode = 0;
      droplet.rearTimeToReachNextNode = 0;
      droplet.frontNextNodeID = findFurthestNode(findOutletNode(graphData.nodes), graphData.nodes, graphData.links).id;
      droplet.rearNextNodeID = findFurthestNode(findOutletNode(graphData.nodes), graphData.nodes, graphData.links).id;
      droplet.pumpSpeedMultiplier = 1;
      droplet.pauseLevel = 0;
      droplet.frontVolumetricSpeedAtPause = 0;
      droplet.rearVolumetricSpeedAtPause = 0;
      droplet.stoppingDroplet = false;
      droplet.initialPumping = false;

      position -= ( prefixVolume + surfixVolume);
    });
    console.log('findFurthestNode: ', findFurthestNode(findOutletNode(graphData.nodes), graphData.nodes, graphData.links).id);
    console.log('Droplet positions initialized, nodes ready');

    let lastDropletRearPosition = currentBlockDroplets[currentBlockDroplets.length - 1].rearVolumetricPosition;
    let outletNodePosition = orderedNodes[0].node.volumetricPosition; 
    let timePassed = 0; //in s
    let newTimePassed = 0;

    // Simulate the movement of droplets in the current block
    currentBlockDroplets.forEach(droplet => {
      droplet.frontTimeToReachNextNode = Math.abs(droplet.frontVolumetricDistanceToNextNode / droplet.frontVolumetricSpeed);
      droplet.rearTimeToReachNextNode = Math.abs(droplet.rearVolumetricDistanceToNextNode / droplet.rearVolumetricSpeed);
    });

    while (lastDropletRearPosition < outletNodePosition) {
      
      let smallestFrontTime = Infinity;
      let smallestRearTime = Infinity;
      let smallestFrontTimeDroplet = [];
      let smallestRearTimeDroplet = [];

      currentBlockDroplets.forEach(droplet => {// Update the smallest front and rear times and associated droplet(s) based on the current droplet's front and rear times to reach the next node.
        
        if (Math.abs(droplet.frontTimeToReachNextNode) < smallestFrontTime) {
          smallestFrontTime = Math.abs(droplet.frontTimeToReachNextNode);
          smallestFrontTimeDroplet = [droplet];
        }
        else if (Math.abs(droplet.frontTimeToReachNextNode) === smallestFrontTime) {
          smallestFrontTimeDroplet.push(droplet);
        }
        if (Math.abs(droplet.rearTimeToReachNextNode) < smallestRearTime) {
          smallestRearTime = Math.abs(droplet.rearTimeToReachNextNode);
          smallestRearTimeDroplet = [droplet];
        }
        else if (Math.abs(droplet.rearTimeToReachNextNode) === smallestRearTime) {
          smallestRearTimeDroplet.push(droplet);
        }
      });

      newTimePassed += Math.min(Math.abs(smallestFrontTime), Math.abs(smallestRearTime));

      if (smallestFrontTime === smallestRearTime) {//przypadek w ktorym wiele kropel ma ten sam czas do przejścia do nastepnego noda, rzadki
        
        if (smallestFrontTimeDroplet.length > 1 || smallestRearTimeDroplet.length > 1) {//sprawdź czy wśród nich jest kropla z rear i front
          console.log('Multiple droplets have reached the next node simultaneously');
          console.log('smallestFrontTimeDroplet: ', smallestFrontTimeDroplet);
          console.log('smallestRearTimeDroplet: ', smallestRearTimeDroplet);
          
        }
        else if (smallestFrontTimeDroplet[0] === smallestRearTimeDroplet[0]) {//przypadek gdy kropla ma 0 objętości
          console.log('Both front and rear times are for the same droplet');
          const reachedNode = orderedNodes.find(n => n.node.id === smallestFrontTimeDroplet[0].frontNextNodeID);
          const reachedNodeDistance = orderedNodes.find(node => node.node.id === reachedNode.node.id).distance;
          if (reachedNode.node.type === 'connector') {


            const index = currentBlockDroplets.indexOf(smallestFrontTimeDroplet[0]);
            const dropletsOlder = currentBlockDroplets.slice(0, index);
            const dropletsNewer = currentBlockDroplets.slice(index + 1);

            const ds = [];
            ds.drops = JSON.parse(JSON.stringify(dropletsNewer)); // Create deep copy
            ds.snappedNode = smallestFrontTimeDroplet[0].frontNextNodeID;
            const existingSnapshotIndex = dropletSnapshot.findIndex(snapshot => snapshot.snappedNode === ds.snappedNode);
            if (existingSnapshotIndex !== -1) {
              dropletSnapshot[existingSnapshotIndex] = ds;
            } else {
              dropletSnapshot.push(ds);
            }

            //aktualizuje starsze krople
            dropletsOlder.forEach(droplet => {
              droplet.frontTimeToReachNextNode -= smallestFrontTime;
              droplet.rearTimeToReachNextNode -= smallestFrontTime;
              droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
              droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
              droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
              droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
            });

            //aktualizuje kroplę
            const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
            const nextEdge = graphData.links.find(link => link.source === smallestFrontTimeDroplet[0].frontNextNodeID && link.target === nextNode.node.id);

            if (reachedNode.connectedPump !== null){
              const pumpRatio = smallestFrontTimeDroplet[0].parameters.find(param => param.nodeId === reachedNode.connectedPump.id && param.name === 'ratio')?.value || 0;
              const dropletDesiredVolume = smallestFrontTimeDroplet[0].parameters.find(param => param.name === 'volume')?.value || 0;
              
              reachedNode.connectedPumpRatio = pumpRatio;
              //reachedNode.inletVolumetricSpeed = 0;
              //smallestFrontTimeDroplet[0].frontVolumetricSpeed = reachedNode.outletVolumetricSpeed;
              smallestFrontTimeDroplet[0].frontVolumetricSpeedAtPause = smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              smallestFrontTimeDroplet[0].rearVolumetricSpeedAtPause = smallestFrontTimeDroplet[0].rearVolumetricSpeed;
              smallestFrontTimeDroplet[0].rearVolumetricSpeed = 0;
              smallestFrontTimeDroplet[0].frontVolumetricPosition = reachedNode.node.volumetricPosition;
              smallestFrontTimeDroplet[0].rearVolumetricPosition = reachedNode.node.volumetricPosition;
              smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
              smallestFrontTimeDroplet[0].rearVolumetricDistanceToNextNode = 0; 
              smallestFrontTimeDroplet[0].frontTimeToReachNextNode = smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode/smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              smallestFrontTimeDroplet[0].rearTimeToReachNextNode = dropletDesiredVolume*pumpRatio/smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              smallestFrontTimeDroplet[0].frontNextNodeID = nextNode.node.id;
              //smallestFrontTimeDroplet[0].rearNextNodeID = findFurthestNode(findOutletNode(graphData.nodes), graphData.nodes, graphData.links).id;
              smallestFrontTimeDroplet[0].pumpSpeedMultiplier = 1;
              //smallestFrontTimeDroplet[0].pauseLevel = 0;
              smallestFrontTimeDroplet[0].stoppingDroplet = true;
              smallestFrontTimeDroplet[0].initialPumping = true;
              if (reachedNode.connectedPump.id !==selectedCarrierPumps[0]) {
                event={
                  type: 'setPumpSpeed',
                  target: reachedNode.connectedPump.id,
                  time: newTimePassed,
                  value: smallestFrontTimeDroplet[0].frontVolumetricSpeed
                };
                eventList.push(event);
              }

              //update newer droplets
              dropletsNewer.forEach(droplet => {
                droplet.pauseLevel += 1;
                if (droplet.pauseLevel===1){
                  droplet.frontVolumetricSpeedAtPause = droplet.frontVolumetricSpeed;
                  if (droplet.stoppingDroplet !== true){
                    droplet.rearVolumetricSpeedAtPause = droplet.rearVolumetricSpeed;
                  }
                }
                droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricSpeed = 0;
                droplet.rearVolumetricSpeed = 0;
                droplet.frontTimeToReachNextNode += smallestFrontTimeDroplet[0].rearTimeToReachNextNode-smallestFrontTime;
                droplet.rearTimeToReachNextNode += smallestFrontTimeDroplet[0].rearTimeToReachNextNode-smallestFrontTime;
              });
              getPumpsBetweenPositions(smallestFrontTimeDroplet[0].frontVolumetricPosition,-1, graphData.nodes, graphData.links).filter(pump => pump.id !== reachedNode.connectedPump.id, ).forEach(pump => {
                
                event={
                  type: 'setPumpSpeed',
                  target: pump.id,
                  time: newTimePassed,
                  value: 0
                };
                eventList.push(event);
              });
            }
            
          }
          else if (reachedNode.type === 'thermostat' || reachedNode.type === 'LED') {
            console.log('reachedNode is thermostat');
          }
          else if (reachedNode.type === 'outlet') {
            console.log('reachedNode is outlet');
          }
          else if (reachedNode.type === 'detector' || reachedNode.type === 'USBSpectrometer') {
            console.log('reachedNode is detector');
          }
        } 
        else {
          console.log('Front and rear times are for different droplets');
        }
      } 

      else if (smallestFrontTime < smallestRearTime) { //przypadek gdzie przód jest przed tyłem
        console.log('Front time is smaller than rear time');
        if (smallestFrontTimeDroplet.length > 1) {
          console.log(`Multiple droplets have reached the next node simultaneously`);
          smallestFrontTimeDroplet.forEach(droplet => {
            // Perform some action for each droplet in smallestFrontTimeDroplet
          });
        }
        else { //przypadek gdy przód jednej kropelki dochodzi do noda
          console.log(`Single droplet front has reached the next node`);
          const reachedNode = orderedNodes.find(n => n.node.id === smallestFrontTimeDroplet[0].frontNextNodeID);
          const reachedNodeDistance = orderedNodes.find(node => node.node.id === reachedNode.node.id).distance;

          if (reachedNode.node.type === 'connector') { //przypadek gdy dochodzi do connectora
            console.log('reachedNode is connector');

            const index = currentBlockDroplets.indexOf(smallestFrontTimeDroplet[0]);
            const dropletsOlder = currentBlockDroplets.slice(0, index);
            const dropletsNewer = currentBlockDroplets.slice(index + 1);

            //aktualizuje kroplę
            const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
            const nextEdge = graphData.links.find(link => link.source === reachedNode.node.id && link.target === nextNode.node.id);

            if (reachedNode.connectedPump.id !== null){

              const pumpRatio = smallestFrontTimeDroplet[0].parameters.find(param => param.nodeId === reachedNode.connectedPump.id && param.name === 'ratio')?.value || 0;
              const dropletDesiredVolume = smallestFrontTimeDroplet[0].parameters.find(param => param.name === 'volume')?.value || 0;
              smallestFrontTimeDroplet[0].frontVolumetricPosition = reachedNode.node.volumetricPosition;
              smallestFrontTimeDroplet[0].rearVolumetricPosition += smallestFrontTime * smallestFrontTimeDroplet[0].rearVolumetricSpeed;
              smallestFrontTimeDroplet[0].actualVolume =smallestFrontTimeDroplet[0].frontVolumetricPosition-smallestFrontTimeDroplet[0].rearVolumetricPosition;
              reachedNode.inletVolumetricSpeed = smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              reachedNode.connectedPumpRatio = pumpRatio;
              smallestFrontTimeDroplet[0].rearTimeToReachNextNode -= smallestFrontTime;
              smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
              smallestFrontTimeDroplet[0].rearVolumetricDistanceToNextNode -= smallestFrontTime * smallestFrontTimeDroplet[0].rearVolumetricSpeed; 

              if (smallestFrontTimeDroplet[0].initialPumping === true){ //przypadek gdy kropla jest w pierwszej fazie pompowania (od 0uL)
                console.log('Kropla jest w pierwszej fazie pompowania');
                //smallestFrontTimeDroplet[0].initialPumping = false;
                const rearTimeLeft = smallestFrontTimeDroplet[0].rearTimeToReachNextNode;
                const totalTimeLeft = rearTimeLeft + smallestFrontTimeDroplet[0].actualVolume/commonVolumetricSpeed;
                console.log('commonVolumetricSpeed: ', commonVolumetricSpeed);
                console.log('smallestFrontTimeDroplet[0].actualVolume: ', smallestFrontTimeDroplet[0].actualVolume);
                console.log('rearTimeLeft: ', rearTimeLeft);
                console.log('totalTimeLeft: ', totalTimeLeft);
                const thispumpspeed = pumpRatio*dropletDesiredVolume/totalTimeLeft;
                console.log('thispumpspeed: ', thispumpspeed);
                reachedNode.connectedPumpSpeedAtPause = thispumpspeed;
              }

              else {
                console.log('Normalne pompowanie');
                reachedNode.connectedPumpSpeedAtPause = (dropletDesiredVolume*pumpRatio) / (smallestFrontTimeDroplet[0].actualVolume / reachedNode.inletVolumetricSpeed);
              }

              reachedNode.outletVolumetricSpeed = reachedNode.inletVolumetricSpeed+reachedNode.connectedPumpSpeedAtPause;
              smallestFrontTimeDroplet[0].frontVolumetricSpeed += reachedNode.connectedPumpSpeedAtPause;
              //smallestFrontTimeDroplet[0].rearVolumetricSpeed = 0;
              smallestFrontTimeDroplet[0].frontTimeToReachNextNode = smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode/smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              smallestFrontTimeDroplet[0].frontNextNodeID = nextNode.node.id;
              //smallestFrontTimeDroplet[0].rearNextNodeID = findFurthestNode(findOutletNode(graphData.nodes), graphData.nodes, graphData.links).id;
              //smallestFrontTimeDroplet[0].pumpSpeedMultiplier = 1;
              //smallestFrontTimeDroplet[0].pauseLevel = 0;
              //smallestFrontTimeDroplet[0].frontVolumetricSpeedAtPause = smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              //smallestFrontTimeDroplet[0].rearVolumetricSpeedAtPause = smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              //smallestFrontTimeDroplet[0].stoppingDroplet = true;
              event={
                type: 'setPumpSpeed',
                target: reachedNode.connectedPump.id,
                time: newTimePassed,
                value: reachedNode.connectedPumpSpeedAtPause 
              };
              eventList.push(event);
              //update newer droplets
              dropletsNewer.forEach(droplet => {
                droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontTimeToReachNextNode -= smallestFrontTime;
                droplet.rearTimeToReachNextNode -= smallestFrontTime;
              });
              //aktualizuje starsze krople
              let accumulatedSpeed = reachedNode.connectedPumpSpeedAtPause;
              dropletsOlder.reverse().forEach(droplet => {
                droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.rearVolumetricSpeed += accumulatedSpeed; 
                getPumpsBetweenPositions(droplet.frontVolumetricPosition,droplet.rearVolumetricPosition, graphData.nodes, graphData.links).forEach(pump => {
                  const editedNode = orderedNodes.find(node => node.connectedPump.id === pump.id);
                  //editedNode.pumpSpeedMultiplier = 1;
                  const pumpBoost = editedNode.connectedPumpSpeedAtPause * accumulatedSpeed/editedNode.inletVolumetricSpeed;
                  editedNode.connectedPumpSpeedAtPause += pumpBoost;
                  editedNode.inletVolumetricSpeed += accumulatedSpeed;
                  accumulatedSpeed += pumpBoost;
                  editedNode.outletVolumetricSpeed += accumulatedSpeed;
                  event={
                    type: 'setPumpSpeed',
                    target: pump.id,
                    time: newTimePassed,
                    value: editedNode.connectedPumpSpeedAtPause
                  };
                  eventList.push(event);
                });
                droplet.frontVolumetricSpeed += accumulatedSpeed;
                droplet.frontTimeToReachNextNode = droplet.frontVolumetricDistanceToNextNode/droplet.frontVolumetricSpeed;
                droplet.rearTimeToReachNextNode = droplet.rearVolumetricDistanceToNextNode/droplet.rearVolumetricSpeed;

              });
            }
          }
          else if (reachedNode.node.type === 'thermostat' || reachedNode.type === 'LED') {//przypadek gdy dochodzi do termostatu
            console.log('reachedNode (thermostat, LED): ', reachedNode);
            const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
            if (nextNode) {
              const nextEdge = graphData.links.find(link => link.source === smallestFrontTimeDroplet[0].frontNextNodeID && link.target === nextNode.node.id);
              //aktualizuje krople
              currentBlockDroplets.forEach(droplet => {
                droplet.frontTimeToReachNextNode -= smallestFrontTime;
                droplet.rearTimeToReachNextNode -= smallestFrontTime;
                droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
              });
              smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
              smallestFrontTimeDroplet[0].frontTimeToReachNextNode = smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode / smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              smallestFrontTimeDroplet[0].frontNextNodeID = nextNode.node.id;
            }
          }
          else if (reachedNode.node.type === 'outlet') { //jeśli ostatni node osiągnięty
            console.log('reachedNode (outlet): ', reachedNode);
            //typowe zaktualizowanie czasu do następnego noda dla reszty kropel i zestallowanie frontu
            currentBlockDroplets.forEach(droplet => {
              droplet.frontTimeToReachNextNode -= smallestFrontTime;
              droplet.rearTimeToReachNextNode -= smallestFrontTime;
              droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
              droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
              droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
              droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
            });
            smallestFrontTimeDroplet[0].frontTimeToReachNextNode = Infinity;
            smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode = Infinity;
            smallestFrontTimeDroplet[0].frontNextNodeID = null;
          }
          else if (reachedNode.node.type === 'detector' || reachedNode.node.type === 'USBSpectrometer') { //przypadek gdy dochodzi do detektora
            console.log('reachedNode (detector): ', reachedNode);
            const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
            if (nextNode) {
              const nextEdge = graphData.links.find(link => link.source === smallestFrontTimeDroplet[0].frontNextNodeID && link.target === nextNode.node.id);
              //aktualizuje krople
              currentBlockDroplets.forEach(droplet => {
                droplet.frontTimeToReachNextNode -= smallestFrontTime;
                droplet.rearTimeToReachNextNode -= smallestFrontTime;
                droplet.frontVolumetricDistanceToNextNode -= smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestFrontTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricPosition += smallestFrontTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestFrontTime * droplet.rearVolumetricSpeed;
              });
              smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
              smallestFrontTimeDroplet[0].frontTimeToReachNextNode = smallestFrontTimeDroplet[0].frontVolumetricDistanceToNextNode / smallestFrontTimeDroplet[0].frontVolumetricSpeed;
              smallestFrontTimeDroplet[0].frontNextNodeID = nextNode.node.id;
            }
          }
        }
      } 
      
      else {//przypadek gdzie tył jest przed przodem
        console.log('Rear time is smaller than front time');
        if (smallestRearTimeDroplet.length > 1) { //przypadek gdy dochodzi do noda wiele kropel
          console.log(`Multiple droplets ends have reached the next node simultaneously`);
          smallestRearTimeDroplet.forEach(droplet => {
            // Perform some action for each droplet in smallestRearTimeDroplet
          });
        } 
        else { //przypadek gdy tył jednej kropelki dochodzi do noda
          const reachedNode = orderedNodes.find(n => n.node.id === smallestRearTimeDroplet[0].rearNextNodeID);
          const reachedNodeDistance = orderedNodes.find(node => node.node.id === reachedNode.node.id).distance;
          
          if (reachedNode.node.type === 'connector') { //przypadek gdy dochodzi do connectora
            console.log('reachedNode is connector');

            const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
            const nextEdge = graphData.links.find(link => link.source === smallestRearTimeDroplet[0].rearNextNodeID && link.target === nextNode.node.id);
            const index = currentBlockDroplets.indexOf(smallestRearTimeDroplet[0]);
            const dropletsOlder = currentBlockDroplets.slice(0, index);
            const dropletsNewer = currentBlockDroplets.slice(index + 1);
            if (smallestRearTimeDroplet[0].stoppingDroplet === true){ //wznawia jeśli była zatrzymana
              //aktualizuje starsze krople
              dropletsOlder.forEach(droplet => {
                droplet.frontTimeToReachNextNode -= smallestRearTime;
                droplet.rearTimeToReachNextNode -= smallestRearTime;
                droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed;
              });

              //aktualizuje nowsze krople
              dropletsNewer.forEach(droplet => {
                if (droplet.pauseLevel === 1){//
                  droplet.pauseLevel = 0;
                  droplet.frontVolumetricSpeed = droplet.frontVolumetricSpeedAtPause;
                  droplet.rearVolumetricSpeed = droplet.rearVolumetricSpeedAtPause;
                  getPumpsBetweenPositions(droplet.frontVolumetricPosition,droplet.rearVolumetricPosition, graphData.nodes, graphData.links).forEach(pump => {
                    
                    event={
                      type: 'setPumpSpeed',
                      target: pump.id,
                      time: newTimePassed,
                      value: orderedNodes.find(node => node.node.id === pump.id).connectedPumpSpeedAtPause
                    };
                    eventList.push(event);
                  });
                }
                else {
                  droplet.pauseLevel -= 1;
                }
                droplet.frontTimeToReachNextNode -= smallestRearTime;
                droplet.rearTimeToReachNextNode -= smallestRearTime;
              });

              reachedNode.connectedPumpRatio = 0; 
              //reachedNode.inletVolumetricSpeed = 0;
              //smallestRearTimeDroplet[0].frontVolumetricSpeed = reachedNode.outletVolumetricSpeed;
              smallestRearTimeDroplet[0].rearVolumetricSpeed = smallestRearTimeDroplet[0].rearVolumetricSpeedAtPause;
              smallestRearTimeDroplet[0].frontVolumetricPosition += smallestRearTimeDroplet[0].frontVolumetricSpeed*smallestRearTime;
              smallestRearTimeDroplet[0].rearVolumetricPosition = reachedNode.node.volumetricPosition;
              smallestRearTimeDroplet[0].frontVolumetricDistanceToNextNode -= smallestRearTimeDroplet[0].frontVolumetricSpeed*smallestRearTime;
              smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge); 
              smallestRearTimeDroplet[0].frontTimeToReachNextNode = smallestRearTimeDroplet[0].frontVolumetricDistanceToNextNode/smallestRearTimeDroplet[0].frontVolumetricSpeed;
              smallestRearTimeDroplet[0].rearTimeToReachNextNode = smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode/smallestRearTimeDroplet[0].rearVolumetricSpeed;
              //smallestRearTimeDroplet[0].frontNextNodeID = nextNode.id;
              smallestRearTimeDroplet[0].rearNextNodeID = nextNode.node.id;
              //smallestRearTimeDroplet[0].pumpSpeedMultiplier = 1;
              //smallestRearTimeDroplet[0].pauseLevel = 0;
              smallestRearTimeDroplet[0].frontVolumetricSpeedAtPause = smallestRearTimeDroplet[0].frontVolumetricSpeed;
              smallestRearTimeDroplet[0].rearVolumetricSpeedAtPause = smallestRearTimeDroplet[0].rearVolumetricSpeed;
              smallestRearTimeDroplet[0].stoppingDroplet = false;
              smallestRearTimeDroplet[0].initialPumping = false;

              reachedNode.connectedPumpRatio = 0;
              event = {
                type: 'setPumpSpeed',
                target: reachedNode.connectedPump.id,
                time: newTimePassed,
                value: 0
              };
              eventList.push(event);
              event = {
                type: 'setPumpSpeed',
                target: selectedCarrierPumps[0],
                time: newTimePassed,
                value: commonVolumetricSpeed
              };
              eventList.push(event);

            }
            else {
              console.log('it is not stopper');
              if (reachedNode.connectedPump.id !== null){
                
                const speedDifference = reachedNode.outletVolumetricSpeed - reachedNode.inletVolumetricSpeed;
                //reachedNode.inletVolumetricSpeed = smallestFrontTimeDroplet[0].frontVolumetricSpeed;
                reachedNode.outletVolumetricSpeed = reachedNode.inletVolumetricSpeed;
                reachedNode.connectedPumpRatio = 0;
                reachedNode.connectedPumpSpeedAtPause = 0;
                smallestRearTimeDroplet[0].frontVolumetricPosition += smallestRearTime * smallestRearTimeDroplet[0].frontVolumetricSpeed;
                smallestRearTimeDroplet[0].rearVolumetricPosition = reachedNode.node.volumetricPosition;
                smallestRearTimeDroplet[0].frontVolumetricDistanceToNextNode -= smallestRearTime * smallestRearTimeDroplet[0].frontVolumetricSpeed;
                smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge); 
                //smallestRearTimeDroplet[0].frontNextNodeID = nextNode.id;
                smallestRearTimeDroplet[0].rearNextNodeID = nextNode.node.id;
                //smallestRearTimeDroplet[0].pumpSpeedMultiplier = 1;
                //smallestRearTimeDroplet[0].pauseLevel = 0; 
                //smallestRearTimeDroplet[0].stoppingDroplet = true;
                smallestRearTimeDroplet[0].frontVolumetricSpeed = smallestRearTimeDroplet[0].frontVolumetricSpeed-speedDifference;
                //smallestRearTimeDroplet[0].rearVolumetricSpeed = 0;
                smallestRearTimeDroplet[0].frontVolumetricSpeedAtPause = smallestRearTimeDroplet[0].frontVolumetricSpeed;
                //smallestRearTimeDroplet[0].rearVolumetricSpeedAtPause = smallestRearTimeDroplet[0].rearVolumetricSpeed;
                smallestRearTimeDroplet[0].frontTimeToReachNextNode = smallestRearTimeDroplet[0].frontVolumetricDistanceToNextNode / smallestRearTimeDroplet[0].frontVolumetricSpeed;
                smallestRearTimeDroplet[0].rearTimeToReachNextNode = smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode / smallestRearTimeDroplet[0].rearVolumetricSpeed;
                event={
                  type: 'setPumpSpeed',
                  target: reachedNode.connectedPump.id,
                  time: newTimePassed,
                  value: reachedNode.connectedPumpSpeedAtPause 
                };
                eventList.push(event);
                //updte newer droplets
                dropletsNewer.forEach(droplet => {
                  droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed;
                  droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
                  droplet.frontTimeToReachNextNode -= smallestRearTime;
                  droplet.rearTimeToReachNextNode -= smallestRearTime;
                });
                //aktualizuje starsze krople
                let accumulatedSpeedDecrease = speedDifference;
                dropletsOlder.reverse().forEach(droplet => {
                  droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed;
                  droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
                  droplet.rearVolumetricSpeed -= accumulatedSpeedDecrease;
                  getPumpsBetweenPositions(droplet.frontVolumetricPosition,droplet.rearVolumetricPosition, graphData.nodes, graphData.links).forEach(pump => {
                    const editedNode = orderedNodes.find(node => node.connectedPump.id === pump.id);
                    const pumpBreak = editedNode.connectedPumpSpeedAtPause * accumulatedSpeedDecrease/editedNode.inletVolumetricSpeed;
                    editedNode.connectedPumpSpeedAtPause -= pumpBreak;
                    editedNode.inletVolumetricSpeed -= accumulatedSpeedDecrease;
                    accumulatedSpeedDecrease += pumpBreak;
                    editedNode.outletVolumetricSpeed -= accumulatedSpeedDecrease;
                    event={
                      type: 'setPumpSpeed',
                      target: pump.id,
                      time: newTimePassed,
                      value: editedNode.connectedPumpSpeedAtPause
                    };
                    eventList.push(event);
                  });
                  droplet.frontVolumetricSpeed -= accumulatedSpeedDecrease;
                  droplet.frontTimeToReachNextNode = droplet.frontVolumetricDistanceToNextNode/droplet.frontVolumetricSpeed;
                  droplet.rearTimeToReachNextNode = droplet.rearVolumetricDistanceToNextNode/droplet.rearVolumetricSpeed;
  
                });
              }
            }

          }
          else if (reachedNode.node.type === 'thermostat' || reachedNode.node.type === 'LED') {//przypadek gdy dochodzi do termostatu
            console.log('reachedNode thermostat: ', reachedNode);
            
            const isFarthestThermostatOrLED = orderedNodes.filter(node => node.node.type === 'thermostat' || node.node.type === 'LED').every(node => node.distance <= reachedNodeDistance);
            
            // This line checks if the smallestRearTimeDroplet is the last droplet in the currentBlockDroplets array.
            if (isFarthestThermostatOrLED && currentBlockDroplets.length === currentBlockDroplets.indexOf(smallestRearTimeDroplet[0])+1) {
              console.log('This is the farthest thermostat or LED node. Also, last droplet just passed through it.');
              const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
              const waitTime = smallestRearTimeDroplet[0].parameters.find(param => param.nodeId === reachedNode.node.id && param.name === 'time')?.value || 0;
              if (nextNode) {
                const nextEdge = graphData.links.find(link => link.source === smallestRearTimeDroplet[0].rearNextNodeID && link.target === nextNode.node.id);
                smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
                smallestRearTimeDroplet[0].rearTimeToReachNextNode = smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode/smallestRearTimeDroplet[0].rearVolumetricSpeed + smallestRearTime;
                smallestRearTimeDroplet[0].rearNextNodeID = nextNode.node.id;
                //aktualizuje resztę kropli
                currentBlockDroplets.forEach(droplet => {
                  droplet.frontTimeToReachNextNode += waitTime - smallestRearTime;
                  droplet.rearTimeToReachNextNode += waitTime - smallestRearTime;
                  droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
                  droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed-waitTime * droplet.frontVolumetricSpeed;//to jest zrobione na razie aby czas się zgadzał
                  droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed-waitTime * droplet.rearVolumetricSpeed;
                });

                let carrierPumpEvent = {
                  type: 'setPumpSpeed',
                  target: selectedCarrierPumps[0], // Assuming 'carrierPumpId' is the ID of the carrier pump
                  time: newTimePassed,
                  value: 0
                };
                eventList.push(carrierPumpEvent);
                carrierPumpEvent = {
                  type: 'setPumpSpeed',
                  target: selectedCarrierPumps[0], // Assuming 'carrierPumpId' is the ID of the carrier pump
                  time: newTimePassed+waitTime,
                  value: commonVolumetricSpeed
                };
                eventList.push(carrierPumpEvent);
              }
            }
            else { //droplet wasnt the last one
              console.log('smallestRearTimeDroplet is not the last droplet in the currentBlockDroplets array');
              const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
              if (nextNode) {
                const nextEdge = graphData.links.find(link => link.source === smallestRearTimeDroplet[0].rearNextNodeID && link.target === nextNode.node.id);
                //aktualizuje krople
                currentBlockDroplets.forEach(droplet => {
                  droplet.frontTimeToReachNextNode -= smallestRearTime;
                  droplet.rearTimeToReachNextNode -= smallestRearTime;
                  droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
                  droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed;
                  droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed;
                });
                smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
                smallestRearTimeDroplet[0].rearTimeToReachNextNode = smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode / smallestRearTimeDroplet[0].rearVolumetricSpeed;
                smallestRearTimeDroplet[0].rearNextNodeID = nextNode.node.id;
              }
            }
          }
          else if (reachedNode.node.type === 'outlet') { //jeśli ostatni node osiągnięty
            //typowe zaktualizowanie czasu do następnego noda dla reszty kropel i zestallowanie reara
            //aktualizuje resztę kropli
            currentBlockDroplets.forEach(droplet => {
              droplet.frontTimeToReachNextNode -= smallestRearTime;
              droplet.rearTimeToReachNextNode -= smallestRearTime;
              droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
              droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
              droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed;
              droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed;
            });
            smallestRearTimeDroplet[0].frontTimeToReachNextNode = Infinity;
            smallestRearTimeDroplet[0].frontVolumetricDistanceToNextNode = Infinity;
            smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode = Infinity;
            smallestRearTimeDroplet[0].rearNextNodeID = null;
            smallestRearTimeDroplet[0].rearTimeToReachNextNode = Infinity;
          }
          else if (reachedNode.node.type === 'detector' || reachedNode.node.type === 'USBSpectrometer') { //przypadek gdy dochodzi do detektora
            console.log('reachedNode (detector): ', reachedNode);
            const nextNode = orderedNodes.find(node => node.distance === reachedNodeDistance - 1 && node.node.type !== 'pump');
            if (nextNode) {
              const nextEdge = graphData.links.find(link => link.source === smallestRearTimeDroplet[0].rearNextNodeID && link.target === nextNode.node.id);
              //aktualizuje krople
              currentBlockDroplets.forEach(droplet => {
                droplet.frontTimeToReachNextNode -= smallestRearTime;
                droplet.rearTimeToReachNextNode -= smallestRearTime;
                droplet.frontVolumetricDistanceToNextNode -= smallestRearTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricDistanceToNextNode -= smallestRearTime * droplet.rearVolumetricSpeed;
                droplet.frontVolumetricPosition += smallestRearTime * droplet.frontVolumetricSpeed;
                droplet.rearVolumetricPosition += smallestRearTime * droplet.rearVolumetricSpeed;
              });
              smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode = calculateEdgeVolume(nextEdge);
              smallestRearTimeDroplet[0].rearTimeToReachNextNode = smallestRearTimeDroplet[0].rearVolumetricDistanceToNextNode / smallestRearTimeDroplet[0].rearVolumetricSpeed;
              smallestRearTimeDroplet[0].rearNextNodeID = nextNode.node.id;
            }
          }
        }
      }

      timePassed = newTimePassed;
      // Update last droplet rear position
      lastDropletRearPosition = currentBlockDroplets[currentBlockDroplets.length - 1].rearVolumetricPosition;

      //add code that preserves droplets positions and speeds for visualization
      const dropletState = {
        time: timePassed,
        droplets: currentBlockDroplets.map(droplet => ({
          id: droplet.id,
          frontVolumetricPosition: droplet.frontVolumetricPosition,
          rearVolumetricPosition: droplet.rearVolumetricPosition,
          frontVolumetricSpeed: droplet.frontVolumetricSpeed,
          rearVolumetricSpeed: droplet.rearVolumetricSpeed,
          pumpSpeedMultiplier: droplet.pumpSpeedMultiplier,
          frontTimeToReachNextNode: droplet.frontTimeToReachNextNode,
          rearTimeToReachNextNode: droplet.rearTimeToReachNextNode,
          frontVolumetricDistanceToNextNode: droplet.frontVolumetricDistanceToNextNode,
          rearVolumetricDistanceToNextNode: droplet.rearVolumetricDistanceToNextNode,
          volume: droplet.parameters.find(p => p.name === 'volume')?.value || 0,
          frontNextNodeID: droplet.frontNextNodeID,
          rearNextNodeID: droplet.rearNextNodeID
        }))
      };
      setDropletHistory(prev => [...prev, dropletState]);

      

      //if (timePassed > 9999) {//here for testing, preventing infinite loop
      //  lastDropletRearPosition = 88100;
      //}

    }
    event = {//it is ok
      type: 'setPumpSpeed',
      target: selectedCarrierPumps[0],
      time: timePassed,
      value: 0
    };
    eventList.push(event);

    eventList = cleanAndSortEventList(eventList);
    console.log('dropletHistory in event generator: ', dropletHistory);
    console.log('eventList: ', eventList.sort((a, b) => a.time - b.time));
    setPumpEvents(extractPumpEvents(eventList));
    return eventList;
  }

  // Generate some sample readings for demonstration
  const generateSampleDetectorReadings = () => {
    const readings = [];
    const now = Date.now();
    
    // Generate a sine wave with some noise for demo
    for (let i = 0; i < 100; i++) {
      const baseValue = Math.sin(i / 10) * 0.5 + 0.5; // 0 to 1 sine wave
      const noise = Math.random() * 0.1; // Random noise
      
      readings.push({
        value: baseValue + noise,
        timestamp: now - (100 - i) * 100, // timestamps going backwards from now
      });
    }
    
    return readings;
  };

  const handleNodeClick = useCallback((node) => {
    console.log('handleNodeClick called with node:', node);
    if (node.type === 'pump') {
      setSelectedNode(node);
    } else if (node.type === 'detector' || node.type === 'USBSpectrometer') {
      console.log('Setting selected detector:', node);
      setSelectedDetector(node);
      // Generate sample readings for demo purposes
      const sampleReadings = generateSampleDetectorReadings();
      setDetectorReadings(sampleReadings);
    }
  }, [generateSampleDetectorReadings]);

  // First useEffect to set initial graphData
  useEffect(() => {
    setDropletHistory([]);
    if (nodes.length > 0 && edges.length > 0) {
      const graphNodes = nodes.map(node => {
        // Create the base node
        const graphNode = {
          id: node.id,
          label: node.data.label,
          type: node.data.type,
          x: 0,
          y: 0,
          volumetricPosition: 0
        };
        
        // Add the onOpenSpectrometer handler for USBSpectrometer nodes
        if (node.data.type === 'USBSpectrometer') {
          console.log('Adding onOpenSpectrometer handler to node:', node.id);
          graphNode.onOpenSpectrometer = (nodeData) => {
            console.log('onOpenSpectrometer called for node:', nodeData);
            handleNodeClick(nodeData);
          };
        }
        
        return graphNode;
      });

      const graphLinks = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        length: edge.data?.properties?.length || 100,
        diameter: edge.data?.properties?.diameter || 1,
      }));

      setGraphData({ nodes: graphNodes, links: graphLinks });
    }
    
  }, [nodes, edges, handleNodeClick]);

  // Second useEffect to calculate nodes positions and set up simulation data
  useEffect(() => {
    if (!graphData.nodes.length || !graphData.links.length || !droplets.length) {
      console.log('Missing required data for simulation setup:', {
        nodesLength: graphData.nodes.length,
        linksLength: graphData.links.length,
        dropletsLength: droplets.length
      });
      return;
    }

    const graphNodes = [...graphData.nodes];
    
    // Find outlet node first
    const outletNode = findOutletNode(graphData.nodes);
    if (!outletNode) {
      console.error('No outlet node found. Cannot set up simulation.');
      return;
    }

    // Get ordered nodes from outlet
    const orderedNodes = orderNodesByDistance(outletNode, graphData.nodes, graphData.links);
    
    // Separate nodes into main line and secondary line
    const mainLineNodes = orderedNodes
      .filter(({node}) => 
        setOfMainLineNodes.includes(node.type))
      .reverse();
      
    const secondaryLineNodes = orderedNodes
      .filter(({node}) => setOfSecondaryLineNodes.includes(node.type))
      .sort((a, b) => b.distance - a.distance);

    // Position settings
    const mainLineY = 300;
    const secondaryLineY = 150;
    const pumpSpacing = 100; // Increased horizontal spacing between pumps
    let currentX = 100;

    // Position main line nodes
    let currentVolumetricPosition = 0;
    mainLineNodes.forEach(({node}, index) => {
      const graphNode = graphNodes.find(n => n.id === node.id);
      if (!graphNode) return;

      graphNode.x = currentX;
      graphNode.y = mainLineY;
      graphNode.volumetricPosition = currentVolumetricPosition;
      
      if (index < mainLineNodes.length - 1) {
        const nextNode = mainLineNodes[index + 1];
        const edge = graphData.links.find(e => 
          (e.source === graphNode.id && e.target === nextNode.node.id) ||
          (e.target === graphNode.id && e.source === nextNode.node.id)
        );
        
        if (edge && edge.length) {
          currentX += edge.length * 2;
          // Use existing calculateEdgeVolume function
          const edgeVolume = calculateEdgeVolume(edge);
          currentVolumetricPosition += edgeVolume;
        } else {
          currentX += 200;
          currentVolumetricPosition += 150;
        }
      }
    });

    // Group secondary nodes by distance
    const nodesByDistance = {};
    secondaryLineNodes.forEach(({node, distance}) => {
      if (!nodesByDistance[distance]) {
        nodesByDistance[distance] = [];
      }
      nodesByDistance[distance].push(node);
    });

    // Position secondary nodes based on their connected main line nodes
    const pumpOffset = 50; // Add this constant for pump spacing
    Object.entries(nodesByDistance).forEach(([distance, nodes]) => {
      nodes.forEach((node, index) => {
        const graphNode = graphNodes.find(n => n.id === node.id);
        if (!graphNode) return;

        // Find connected main line node through edges
        const connectedEdge = edges.find(e => 
          e.source === node.id || e.target === node.id
        );
        
        if (connectedEdge) {
          const connectedNodeId = connectedEdge.source === node.id ? connectedEdge.target : connectedEdge.source;
          const connectedMainNode = graphNodes.find(n => n.id === connectedNodeId);
          
          if (connectedMainNode) {
            // Position pump above its connected main line node with offset if needed
            graphNode.x = connectedMainNode.x + (index * pumpOffset) - ((nodes.length - 1) * pumpOffset / 2);
            graphNode.y = secondaryLineY;
          }
        }
      });
    });

    setGraphData(prev => ({ ...prev, nodes: graphNodes }));
    
    // Only calculate volumes and blocks if not already done
    if (currentBlockDroplets.length === 0) {
      console.log('Calculating thermostat volumes and blocks for droplets:', droplets.length);
      const thermoVol = calculateVolumesBetweenThermostats(graphData);
      
      // Create deep copy of droplets to avoid mutation issues
      const dropletsCopy = JSON.parse(JSON.stringify(droplets));
      const blocks = divideDropletsIntoBlocks(dropletsCopy, thermoVol);
      
      if (blocks.length > 0) {
        setCurrentBlockDroplets(blocks[0].droplets);
        // Generate event list only once when initializing
        const eventList = generateEventList(blocks);
        const eventListForDevices = recalculateEventListForDevices(eventList);
      }
    }
    
    // Important: the dependency array includes currentBlockDroplets.length to prevent infinite recalculations
  }, [graphData.nodes.length, graphData.links.length, droplets, edges, currentBlockDroplets.length]);

  const startSimulation = useCallback(() => {
    setIsSimulationRunning(true);
    lastFrameTimeRef.current = null; // Reset the last frame time
  }, []);

  const stopSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const restartSimulation = useCallback(() => {
    stopSimulation();
    setKey(prevKey => prevKey + 1);
    setCurrentTime(0);
    startSimulation();
  }, [stopSimulation, startSimulation]);


  const getNodeColor = (node) => {
    switch (node.type) {
      case 'pump': return '#4CAF50';
      case 'connector': return '#2196F3';
      case 'outlet': return '#F44336';
      case 'detector': return '#FFA000';
      case 'USBSpectrometer': return '#AA00FF'; // Purple color for USBSpectrometer
      default: return '#FFA000'; // Default color for unknown types
    }
  };

  // Update volumetricToXPosition function
  const volumetricToXPosition = useCallback((volumetricPosition) => {
    const outletNode = findOutletNode(graphData.nodes);
    const furthestNode = findFurthestNode(outletNode, graphData.nodes, graphData.links);
    
    if (!outletNode || !furthestNode) return 0;

    const totalVolume = getVolumeBetweenNodes(furthestNode.id, outletNode.id, graphData.nodes, graphData.links);
    const outletX = graphData.nodes.find(n => n.id === outletNode.id)?.x || 0;
    const furthestX = graphData.nodes.find(n => n.id === furthestNode.id)?.x || 0;
    
    // Handle edge cases
    if (!totalVolume || totalVolume === 0 || isNaN(totalVolume)) {
      console.warn('Total volume is invalid:', totalVolume);
      return furthestX;
    }

    if (volumetricPosition === undefined || volumetricPosition === null || isNaN(volumetricPosition)) {
      console.warn('Volumetric position is invalid:', volumetricPosition);
      return furthestX;
    }

    // Clamp the position to valid range
    const clampedPosition = Math.max(-totalVolume, Math.min(totalVolume, volumetricPosition));
    
    // Apply scaling factor to the position calculation
    const scaledX = furthestX + ((clampedPosition / totalVolume) * (outletX - furthestX));
    
    // Ensure the returned value is a valid number
    if (!isFinite(scaledX) || isNaN(scaledX)) {
      console.warn('Invalid scaled position calculated:', {
        scaledX,
        clampedPosition,
        totalVolume,
        outletX,
        furthestX
      });
      return furthestX;
    }
    
    return scaledX;
  }, [graphData.nodes]);    

  // Update the updateDropletPositions function
  const updateDropletPositions = useCallback((timestamp) => {
    if (!isSimulationRunning || dropletHistory.length === 0) return;

    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(updateDropletPositions);
      return;
    }

    const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000; // Convert to seconds
    const simulationDeltaTime = deltaTime * timeScale;
    
    setCurrentTime(prevTime => {
      const newTime = prevTime + simulationDeltaTime;
      
      // Get the time range of our history
      const lastHistoryTime = dropletHistory[dropletHistory.length - 1].time;
      
      // If we've reached the end, loop back to start
      if (newTime >= lastHistoryTime) {
        setCurrentTime(0);
        return 0;
      }

      // Find the appropriate states to interpolate between
      const currentState = interpolateDropletState(newTime);
      // Update droplet visualization
      const updatedDroplets = currentState.map(droplet => {
        const frontX = volumetricToXPosition(droplet.frontVolumetricPosition);
        const rearX = volumetricToXPosition(droplet.rearVolumetricPosition);

        if (isNaN(frontX) || isNaN(rearX)) {
          console.warn('Invalid droplet position calculated:', {
            dropletId: droplet.id,
            frontPosition: droplet.frontVolumetricPosition,
            rearPosition: droplet.rearVolumetricPosition,
            frontX,
            rearX
          });
          return null;
        }

        return {
          id: droplet.id,
          frontX,
          rearX,
          y: 300,
          volume: droplet.frontVolumetricPosition-droplet.rearVolumetricPosition,
          speed: droplet.frontVolumetricSpeed
        };
      }).filter(Boolean);

      setSimulationDroplets(updatedDroplets);
      return newTime;
    });

    lastFrameTimeRef.current = timestamp;
    animationFrameRef.current = requestAnimationFrame(updateDropletPositions);
  }, [isSimulationRunning, timeScale, volumetricToXPosition, dropletHistory]);

  // Add animation effect
  useEffect(() => {
    if (isSimulationRunning) {
      lastFrameTimeRef.current = null;
      animationFrameRef.current = requestAnimationFrame(updateDropletPositions);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSimulationRunning, updateDropletPositions]);

  // Add this helper function for interpolation
  const interpolateDropletState = (time) => {
    if (!dropletHistory.length) return [];
    
    // Find the two closest states
    const index = dropletHistory.findIndex(state => state.time > time);
    if (index === -1) return dropletHistory[dropletHistory.length - 1].droplets;
    if (index === 0) return dropletHistory[0].droplets;
    
    const beforeState = dropletHistory[index - 1];
    const afterState = dropletHistory[index];
    const fraction = (time - beforeState.time) / (afterState.time - beforeState.time);
    
    return beforeState.droplets.map(beforeDroplet => {
      const afterDroplet = afterState.droplets.find(d => d.id === beforeDroplet.id);
      if (!afterDroplet) return beforeDroplet;
      
      return {
        ...beforeDroplet,
        frontVolumetricPosition: beforeDroplet.frontVolumetricPosition + 
          (afterDroplet.frontVolumetricPosition - beforeDroplet.frontVolumetricPosition) * fraction,
        rearVolumetricPosition: beforeDroplet.rearVolumetricPosition + 
          (afterDroplet.rearVolumetricPosition - beforeDroplet.rearVolumetricPosition) * fraction,
      };
    });
  };

  // Add navigation functions
  const jumpToTimepoint = useCallback((index) => {
    if (index >= 0 && index < dropletHistory.length) {
      setCurrentTimepoint(index);
      setCurrentTime(dropletHistory[index].time);
    }
  }, [dropletHistory]);

  const nextTimepoint = useCallback(() => {
    jumpToTimepoint(currentTimepoint + 1);
  }, [currentTimepoint, jumpToTimepoint]);

  const previousTimepoint = useCallback(() => {
    jumpToTimepoint(currentTimepoint - 1);
  }, [currentTimepoint, jumpToTimepoint]);



  const handleNodeAction = (action) => {
    console.log('Node action:', action);
    // Here you would implement the actual device communication
    // based on the action type and parameters
  };

  const togglePumpSpeeds = () => {
    setDisplayPumpSpeeds(!displayPumpSpeeds);
  };

  // Toggle functions for each display option
  const toggleNodeIds = () => {
    setDisplayNodeIds(!displayNodeIds);
  };
  
  const toggleDropletInfo = () => {
    setDisplayDropletInfo(!displayDropletInfo);
  };
  
  const toggleDropletGaps = () => {
    setDisplayDropletGaps(!displayDropletGaps);
  };
  
  const toggleEdgeLabels = () => {
    setDisplayEdgeLabels(!displayEdgeLabels);
  };
  
  const toggleDisplayMenu = () => {
    setDisplayMenuOpen(!isDisplayMenuOpen);
  };
  
  const toggleTimelineDropletInfo = () => {
    setDisplayTimelineDropletInfo(!displayTimelineDropletInfo);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) {
        setDisplayMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to toggle pump panel visibility
  const togglePumpPanel = (pumpId) => {
    setVisiblePumpPanel((prev) => (prev === pumpId ? null : pumpId));
  };

  // Add styles for the display menu
  const styles = {
    container: {
      ...backgroundVariants.mainBackground,
      padding: '20px',
      minHeight: '100vh'
    },
    dropletInfo: {
      padding: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      ...backgroundVariants.panelBackground,
      color: '#fff',
      minWidth: '150px'
    },
    timelineContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '20px'
    },
    timeInput: {
      width: '100px',
      ...backgroundVariants.inputBackground,
      padding: '5px',
      borderRadius: '4px',
      marginLeft: '8px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px',
      marginBottom: '20px'
    },
    timelineControls: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      marginBottom: '20px',
      ...backgroundVariants.panelBackground,
      padding: '15px',
      borderRadius: '4px'
    },
    timeControls: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    sliderContainer: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      paddingBottom: '15px'
    },
    timeStepButtons: {
      display: 'flex',
      gap: '5px',
      alignItems: 'center',
      justifyContent: 'flex-start'
    },
    timeScaleContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      justifyContent: 'flex-start',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      paddingTop: '15px'
    },
    svgContainer: {
      background: backgroundVariants.panelBackground.background,
      borderRadius: '4px',
      padding: '10px'
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '20px'
    },
    timeSlider: {
      width: '33%',
      ...backgroundVariants.inputBackground,
      height: '20px',
      borderRadius: '10px',
      WebkitAppearance: 'none',
      appearance: 'none',
      background: backgroundVariants.inputBackground.background,
      outline: 'none',
      opacity: '0.7',
      transition: 'opacity .2s',
      '&:hover': {
        opacity: '1'
      },
      '&::-webkit-slider-thumb': {
        WebkitAppearance: 'none',
        appearance: 'none',
        width: '20px',
        height: '20px',
        background: '#4CAF50',
        cursor: 'pointer',
        borderRadius: '50%'
      },
      '&::-moz-range-thumb': {
        width: '20px',
        height: '20px',
        background: '#4CAF50',
        cursor: 'pointer',
        borderRadius: '50%'
      }
    },
    // Add styles for display menu
    displayMenuButton: {
      ...buttonVariants.infoButton,
      position: 'relative'
    },
    displayMenu: {
      position: 'absolute',
      top: '100%',
      right: 0,
      backgroundColor: '#333',
      border: '1px solid #555',
      borderRadius: '4px',
      padding: '8px 0',
      zIndex: 1000,
      width: '220px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
    },
    menuItem: {
      padding: '8px 16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: 'white',
      transition: 'background-color 0.2s',
      '&:hover': {
        backgroundColor: '#444'
      }
    },
    checkmark: {
      color: '#4CAF50',
      fontWeight: 'bold'
    }
  };

  const sliderStyle = {
    width: '100%',
    height: '10px',
    borderRadius: '5px', 
    background: '#333',
    outline: 'none',
    opacity: '0.7',
    transition: 'opacity .2s'
    // Remove all pseudo-element styles that were here
  };

  const handleCloseDetectorPanel = () => {
    setSelectedDetector(null);
  };

  // Update graphData nodes with this function
  useEffect(() => {
    if (nodes && nodes.length > 0 && edges && edges.length > 0) {
      const graphNodes = nodes.map(node => {
        // Add onOpenSpectrometer to USBSpectrometer nodes
        const nodeData = {
          ...node,
          label: node.label || node.id,
          x: node.position?.x || 0,
          y: node.position?.y || 0,
          volumetricPosition: 0 // Initial position
        };
        
        // Add the onOpenSpectrometer handler for USBSpectrometer nodes
        if (node.type === 'USBSpectrometer') {
          nodeData.onOpenSpectrometer = (nodeData) => {
            handleNodeClick(nodeData);
          };
        }
        
        return nodeData;
      });

      const graphLinks = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }));

      setGraphData({ nodes: graphNodes, links: graphLinks });
    }
  }, [nodes, edges]);

  // Register the global spectrometer handler
  useEffect(() => {
    const handleOpenSpectrometer = (nodeData) => {
      console.log("Simulation: received openSpectrometer event with data:", nodeData);
      
      if (nodeData && (nodeData.type === 'detector' || nodeData.type === 'USBSpectrometer')) {
        // Find the full node data
        const fullNode = graphData.nodes.find(n => n.id === nodeData.id) || nodeData;
        console.log("Simulation: opening spectrometer with node:", fullNode);
        
        setSelectedDetector(fullNode);
        // Generate sample readings for demo purposes
        const sampleReadings = generateSampleDetectorReadings();
        setDetectorReadings(sampleReadings);
      }
    };

    // Register the handler if window.customEvents exists
    if (window.customEvents) {
      console.log("Simulation: registering spectrometer handler");
      window.customEvents.setSpectrometerHandler(handleOpenSpectrometer);
    }

    // Cleanup function
    return () => {
      if (window.customEvents) {
        // Reset the handler on unmount
        window.customEvents.setSpectrometerHandler(() => {
          console.log('Simulation component unmounted, handler reset');
        });
      }
    };
  }, [graphData.nodes]);

  return (
    <div style={styles.container}>
      <div style={styles.timelineControls}>
        <div style={styles.timeControls}>
          <div style={styles.sliderContainer}>
            <input
              type="range"
              min={0}
              max={Math.max(0, dropletHistory.length - 1)}
              value={currentTimepoint}
              onChange={(e) => jumpToTimepoint(Number(e.target.value))}
              disabled={isSimulationRunning}
              style={styles.timeSlider}
              className="time-slider" // Add this className
            />
            {displayTimelineDropletInfo && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {dropletHistory.length > 0 && dropletHistory[currentTimepoint]?.droplets.map((droplet, index) => (
                  <div key={droplet.id} style={styles.dropletInfo}>
                    <div>Droplet {index + 1}:</div>
                    {droplet.frontNextNodeID && (
                      <div>Front → {graphData.nodes.find(n => n.id === droplet.frontNextNodeID)?.label || droplet.frontNextNodeID}</div>
                    )}
                    {droplet.rearNextNodeID && (
                      <div>Rear → {graphData.nodes.find(n => n.id === droplet.rearNextNodeID)?.label || droplet.rearNextNodeID}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.timeStepButtons}>
            <button
              onClick={() => jumpToTimepoint(0)}
              disabled={currentTimepoint === 0 || isSimulationRunning}
              style={{ ...buttonVariants.secondaryButton, padding: '4px 8px' }}
            >
              ⏮️ Start
            </button>
            <button
              onClick={() => jumpToTimepoint(currentTimepoint - 1)}
              disabled={currentTimepoint === 0 || isSimulationRunning}
              style={{ ...buttonVariants.secondaryButton, padding: '4px 8px' }}
            >
              ⏪ Previous
            </button>
            <button
              onClick={() => jumpToTimepoint(currentTimepoint + 1)}
              disabled={currentTimepoint >= dropletHistory.length - 1 || isSimulationRunning}
              style={{ ...buttonVariants.secondaryButton, padding: '4px 8px' }}
            >
              Next ⏩
            </button>
            <button
              onClick={() => jumpToTimepoint(dropletHistory.length - 1)}
              disabled={currentTimepoint >= dropletHistory.length - 1 || isSimulationRunning}
              style={{ ...buttonVariants.secondaryButton, padding: '4px 8px' }}
            >
              End ⏭️
            </button>
          </div>

          <div style={styles.timeScaleContainer}>
            <label style={{ color: '#fff', marginRight: '10px' }}>
              Time Scale:
              <select
                value={timeScale}
                onChange={(e) => setTimeScale(Number(e.target.value))}
                style={styles.timeInput}
              >
                <option value={0.0625}>1/16x</option>
                <option value={0.25}>1/4x</option>
                <option value={1}>1x</option>
                <option value={4}>4x</option>
                <option value={16}>16x</option>
                <option value={64}>64x</option>
                <option value={256}>256x</option>
                <option value={1024}>1024x</option>
              </select>
            </label>
            <label style={{ color: '#fff', marginRight: '10px' }}>
              Current Time: {currentTime.toFixed(2)}s
            </label>
            <label style={{ color: '#fff' }}>
              Step: {currentTimepoint + 1}/{dropletHistory.length}
            </label>
          </div>
        </div>
      </div>

      <div style={styles.buttonGroup}>
        <button 
          onClick={isSimulationRunning ? stopSimulation : startSimulation} 
          style={{ ...buttonVariants.primaryButton }}
        >
          {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>
        <button 
          onClick={restartSimulation} 
          style={{ ...buttonVariants.secondaryButton }}
        >
          Restart simulation
        </button>
        <button 
          onClick={sendingEventsToDevices} 
          style={{ ...buttonVariants.primaryButton }}
        >
          Send Events to Devices
        </button>
        <div ref={displayMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button 
            onClick={toggleDisplayMenu} 
            style={styles.displayMenuButton}
          >
            Display Settings
          </button>
          {isDisplayMenuOpen && (
            <div style={styles.displayMenu}>
              <div 
                style={styles.menuItem}
                onClick={toggleNodeIds}
              >
                <span>Show Node IDs</span>
                <span style={styles.checkmark}>{displayNodeIds ? '✓' : ''}</span>
              </div>
              <div 
                style={styles.menuItem}
                onClick={toggleDropletInfo}
              >
                <span>Show Droplet Info</span>
                <span style={styles.checkmark}>{displayDropletInfo ? '✓' : ''}</span>
              </div>
              <div 
                style={styles.menuItem}
                onClick={toggleDropletGaps}
              >
                <span>Show Droplet Gaps</span>
                <span style={styles.checkmark}>{displayDropletGaps ? '✓' : ''}</span>
              </div>
              <div 
                style={styles.menuItem}
                onClick={toggleEdgeLabels}
              >
                <span>Show Tube Dimensions</span>
                <span style={styles.checkmark}>{displayEdgeLabels ? '✓' : ''}</span>
              </div>
              <div 
                style={styles.menuItem}
                onClick={togglePumpSpeeds}
              >
                <span>Show Pump Speeds</span>
                <span style={styles.checkmark}>{displayPumpSpeeds ? '✓' : ''}</span>
              </div>
              <div 
                style={styles.menuItem}
                onClick={toggleTimelineDropletInfo}
              >
                <span>Show Timeline Droplet Info</span>
                <span style={styles.checkmark}>{displayTimelineDropletInfo ? '✓' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rest of the SVG rendering code */}
      {graphData.nodes.length > 0 && (
        <div style={styles.svgContainer}>
          <svg width="2000" height="400">
            {/* Render edges first (background) */}
            {graphData.links.map((link, index) => {
              const sourceNode = graphData.nodes.find(node => node.id === link.source);
              const targetNode = graphData.nodes.find(node => node.id === link.target);
              if (!sourceNode || !targetNode) return null;
              
              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;
              
              return (
                <g key={`edge-${index}`}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="#999"
                    strokeWidth={2}
                  />
                  <text
                    x={midX}
                    y={midY - 20}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="12px"
                    style={{ display: displayEdgeLabels ? 'block' : 'none' }}
                  >
                    {`${link.length} mm (Ø ${link.diameter} mm)`}
                  </text>
                </g>
              );
            })}

            {/* Render nodes (on top) */}
            {graphData.nodes.map((node, index) => (
              <g key={`node-${index}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={15}
                  fill={getNodeColor(node)}
                  stroke={selectedNode && selectedNode.id === node.id ? '#FFA500' : 'none'}
                  strokeWidth={selectedNode && selectedNode.id === node.id ? '3' : '0'}
                  onClick={() => handleNodeClick(node)}
                  style={{ cursor: 'pointer' }}
                />
                <text
                  x={node.x}
                  y={node.y - 25}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12px"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y - 10}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="10px"
                  style={{ display: displayNodeIds ? 'block' : 'none' }}
                >
                  {`ID: ${node.id}`}
                </text>
              </g>
            ))}

            {/* Render droplets and distances between them */}
            {interpolateDropletState(currentTime).map((droplet, index, droplets) => {
              const frontX = volumetricToXPosition(droplet.frontVolumetricPosition);
              const rearX = volumetricToXPosition(droplet.rearVolumetricPosition);
              const centerX = (frontX + rearX) / 2;
              
              // Calculate distance to next droplet if this isn't the last droplet
              const distanceInfo = index < droplets.length - 1 ? {
                nextDropletFront: droplets[index + 1].frontVolumetricPosition,
                distance: Math.abs(droplets[index + 1].frontVolumetricPosition - droplet.rearVolumetricPosition)
              } : null;
              
              // Calculate midpoint for distance label
              const distanceLabelX = distanceInfo ? 
                (volumetricToXPosition(droplet.rearVolumetricPosition) + 
                 volumetricToXPosition(distanceInfo.nextDropletFront)) / 2 : null;

              return (
                <g key={`droplet-${droplet.id}`}>
                  {/* Droplet body */}
                  <line
                    x1={rearX}
                    y1={300}
                    x2={frontX}
                    y2={300}
                    stroke="rgba(255, 100, 100, 0.9)"
                    strokeWidth={8}
                    strokeLinecap="butt"
                  />
                  
                  {/* Distance to next droplet */}
                  {distanceInfo && displayDropletGaps && (
                    <g>
                      {/* Distance line */}
                      <line
                        x1={rearX}
                        y1={320}
                        x2={volumetricToXPosition(distanceInfo.nextDropletFront)}
                        y2={320}
                        stroke="#fff"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                      />
                      {/* Distance arrows */}
                      <line
                        x1={rearX}
                        y1={315}
                        x2={rearX}
                        y2={325}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                      <line
                        x1={volumetricToXPosition(distanceInfo.nextDropletFront)}
                        y1={315}
                        x2={volumetricToXPosition(distanceInfo.nextDropletFront)}
                        y2={325}
                        stroke="#666"
                        strokeWidth={1}
                      />
                      {/* Distance label */}
                      <text
                        x={distanceLabelX}
                        y={335}
                        textAnchor="middle"
                        fill="#666"
                        fontSize="12px"
                      >
                        {`${distanceInfo.distance.toFixed(2)} μL`}
                      </text>
                    </g>
                  )}
                  
                  {/* Droplet info - wrap all info texts in conditional rendering */}
                  {displayDropletInfo && (
                    <>
                      <text
                        x={centerX}
                        y={270}
                        textAnchor="middle"
                        fill="#6f6"
                        fontSize="12px"
                      >
                        {`Vol: ${(droplet.frontVolumetricPosition-droplet.rearVolumetricPosition).toFixed(2)} μL`}
                      </text>
                      <text
                        x={centerX}
                        y={255}
                        textAnchor="middle"
                        fill="#6f6"
                        fontSize="12px"
                      >
                        {`Spd f: ${droplet.frontVolumetricSpeed.toFixed(2)} μL/s`}
                      </text>
                      <text
                        x={centerX}
                        y={240}
                        textAnchor="middle"
                        fill="#6f6"
                        fontSize="12px"
                      >
                        {`Spd r: ${droplet.rearVolumetricSpeed.toFixed(2)} μL/s`}
                      </text>
                      <text
                        x={centerX}
                        y={225}
                        textAnchor="middle"
                        fill="#6f6"
                        fontSize="12px"
                      >
                        {`mlt: ${droplet.pumpSpeedMultiplier.toFixed(2)}`}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {displayPumpSpeeds && graphData.nodes.map((node, index) => {
              if (node.type === 'pump') {
                const currentSpeed = getPumpSpeedAtTime(node.id, pumpEvents, currentTime);
                const maxTime = dropletHistory[dropletHistory.length - 1]?.time || 1;
                const pumpSpecificEvents = pumpEvents.filter(event => event.target === node.id);
                
                return (
                  <g key={`pump-speed-${node.id}`}>
                    {/* Current pump speed value */}
                    <text
                      x={node.x}
                      y={node.y - 35}
                      textAnchor="middle"
                      fill="#4CAF50"
                      fontSize="12px"
                    >
                      {`${currentSpeed.toFixed(2)} μL/s`}
                    </text>
                    
                    {/* Speed history visualization */}
                    <g transform={`translate(${node.x - 40}, ${node.y - 65})`}>
                      {pumpSpecificEvents.map((event, i, arr) => {
                        const nextEvent = arr[i + 1];
                        const width = 80;
                        const x = 0;
                        const y = 0;
                        
                        // Calculate position based on time
                        const timePosition = (event.time / maxTime) * width;
                        const nextTimePosition = nextEvent 
                          ? (nextEvent.time / maxTime) * width
                          : width;
                        
                        // Calculate height based on speed value (normalized)
                        const maxSpeed = Math.max(...pumpSpecificEvents.map(e => e.value));
                        const normalizedHeight = event.value / (maxSpeed || 1) * 20;
                        
                        return (
                          <g key={`pump-event-${i}`}>
                            {/* Speed segment */}
                            <line
                              x1={x + timePosition}
                              y1={y - normalizedHeight}
                              x2={x + nextTimePosition}
                              y2={y - normalizedHeight}
                              stroke="#4CAF50"
                              strokeWidth={2}
                            />
                            {/* Event point */}
                            <circle
                              cx={x + timePosition}
                              cy={y - normalizedHeight}
                              r={2}
                              fill="#4CAF50"
                            />
                            {/* Time marker */}
                            <text
                              x={x + timePosition}
                              y={y + 12}
                              textAnchor="middle"
                              fill="#666"
                              fontSize="10px"
                            >
                              {event.time.toFixed(1)}s
                            </text>
                            {/* Speed value */}
                            <text
                              x={x + timePosition}
                              y={y - normalizedHeight - 5}
                              textAnchor="middle"
                              fill="#4CAF50"
                              fontSize="8px"
                            >
                              {event.value.toFixed(1)}
                            </text>
                          </g>
                        );
                      })}
                      {/* Current time indicator */}
                      <line
                        x1={(currentTime / maxTime) * 80}
                        y1={-25}
                        x2={(currentTime / maxTime) * 80}
                        y2={15}
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />
                    </g>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>
      )}
      
      {selectedNode && selectedNode.type === 'pump' && (
        <DraggablePanel 
          initialPosition={pumpPanelPosition}
          title={`Pump Controls - ${selectedNode.label || selectedNode.id}`}
        >
          <PumpActions
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            onAction={handleNodeAction}
          />
        </DraggablePanel>
      )}
      {/* Add styles for PumpActions */}
      <style>
        {`
          .node-actions {
            position: fixed;
            top: 20px;
            right: 20px;
            background: black;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .node-actions h3 {
            margin: 0 0 15px 0;
            color: #333;
          }
          .node-actions button {
            margin: 5px;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .node-actions button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .node-actions input {
            margin: 5px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            width: 80px;
          }
          .move-controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 10px;
          }
          .input-group {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .input-group label {
            min-width: 100px;
            text-align: right;
            color: #666;
          }
        `}
      </style>
      
      {/* Render detector panel if a detector is selected */}
      {selectedDetector && (
        <USBSpectrometer 
          detector={selectedDetector} 
          readings={detectorReadings}
          onClose={handleCloseDetectorPanel}
          initialPosition={{ x: 50, y: 100 }}
        />
      )}
    </div>
  );
};

export default Simulation;