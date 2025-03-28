// mqttDebugger.js - Utility to help debug MQTT communication

// Function to parse device info from different payload formats
export const parseDeviceInfo = (payload) => {
  if (!payload) {
    console.error("Empty payload received");
    return null;
  }
  
  console.log('🔍 Attempting to parse device payload:', payload);
  
  let MQTTname, type;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Try different formats
  
  // Format 1: "MQTTname:type"
  if (payloadStr.includes(':')) {
    [MQTTname, type] = payloadStr.split(':');
    console.log('🔍 Parsed using colon format:', { MQTTname, type });
  } 
  // Format 2: JSON object
  else {
    try {
      let jsonData;
      // Check if we need to parse it
      if (typeof payload === 'object') {
        jsonData = payload;
      } else {
        jsonData = JSON.parse(payloadStr);
      }
      
      MQTTname = jsonData.MQTTname || jsonData.name || jsonData.mqtt_name;
      type = jsonData.type || jsonData.device_type;
      console.log('🔍 Parsed using JSON format:', { MQTTname, type });
    } catch (e) {
      console.error('Failed to parse payload as JSON:', e);
    }
  }
  
  if (MQTTname && type) {
    return { MQTTname, type };
  }
  
  console.error('Could not parse device info from payload:', payload);
  return null;
};

// Create a WebSocket connection with auto-reconnect
export const createWebSocket = (url, options = {}) => {
  const {
    maxRetries = 5,
    retryDelay = 3000,
    onMessage,
    onOpen,
    onClose,
    onError
  } = options;

  let ws = null;
  let retryCount = 0;
  let reconnectTimeout = null;

  const connect = () => {
    ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      retryCount = 0;
      if (onOpen) onOpen(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('🔌 Received WebSocket message:', {
          topic: data.topic,
          payload: data.payload,
          timestamp: new Date().toISOString()
        });
        
        // Handle system status messages
        if (data.topic === 'system/status') {
          console.log('🔌 MQTT Broker status:', {
            connected: data.payload.mqttConnected,
            topics: data.payload.subscribedTopics
          });
        }
        
        // Log all messages on common/* topics
        if (data.topic && data.topic.startsWith('common/')) {
          console.log('🔌 Common topic message:', {
            topic: data.topic,
            payload: data.payload,
            timestamp: new Date().toISOString()
          });
        }
        
        if (onMessage) onMessage(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        console.log('Raw message:', event.data);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying connection (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
        reconnectTimeout = setTimeout(connect, retryDelay);
      } else {
        console.error('Max retries reached, giving up');
      }
      
      if (onClose) onClose();
    };

    ws.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
      if (onError) onError(error);
    };
  };

  // Initial connection
  connect();

  // Return cleanup function
  return () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws) {
      ws.close();
    }
  };
};

// Enhances the WebSocket handling for MQTT messages
export const setupMQTTDebugger = () => {
  console.log('🔍 MQTT Debugger initialized');
  
  // Add a global helper to test message parsing
  window.testMQTTParser = (payload) => {
    console.log('Test result:', parseDeviceInfo(payload));
  };
  
  // Add a global function to send a test scan message
  window.sendTestScan = () => {
    if (window.appWebSocket && window.appWebSocket.readyState === WebSocket.OPEN) {
      const testMessage = {
        topic: "common/device_scan",
        payload: {}
      };
      window.appWebSocket.send(JSON.stringify(testMessage));
      console.log('Test scan message sent!');
    } else {
      console.error('WebSocket not available for test');
    }
  };
  
  // Add a global function to check MQTT status
  window.checkMQTTStatus = () => {
    if (window.appWebSocket && window.appWebSocket.readyState === WebSocket.OPEN) {
      fetch('http://localhost:4000/mqtt-status')
        .then(response => response.json())
        .then(status => {
          console.log('🔌 MQTT Status:', status);
        })
        .catch(error => {
          console.error('Error fetching MQTT status:', error);
        });
    }
  };
  
  // Monkey patch console.log to highlight MQTT messages
  const originalLog = console.log;
  console.log = function(...args) {
    if (args.length > 0 && typeof args[0] === 'string') {
      if (args[0].includes('MQTT') || args[0].includes('device_')) {
        args[0] = `🔌 ${args[0]}`;
      }
    }
    originalLog.apply(console, args);
  };
};

// Export default function to initialize everything
export default function initMQTTDebugging() {
  setupMQTTDebugger();
} 