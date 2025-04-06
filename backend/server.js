// server.js
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const mqtt = require('mqtt');
const cors = require('cors');

// Configuration
const MQTT_BROKER = 'mqtt://10.0.0.4:1883';
const MQTT_TOPICS = ['common/device_response', 'common/#', 'spectrometer_1/response/full_frame', 'spectrometer_1/response/crop_frame', 'spectrometer_1/response/data'];
const WS_PORT = 4000;

// Express setup
const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let mqttClient = null;

function setupMQTTClient() {
  if (mqttClient) {
    try {
      mqttClient.end(true);
    } catch (e) {
      console.error('Error closing existing MQTT connection:', e);
    }
  }

  console.log('Connecting to MQTT broker:', MQTT_BROKER);
  mqttClient = mqtt.connect(MQTT_BROKER, {
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    clean: true,
    clientId: `fluidicgui_${Math.random().toString(16).slice(2, 8)}`,
  });

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    subscribeToTopics();
  });

  mqttClient.on('message', handleMQTTMessage);
  mqttClient.on('error', error => console.error('MQTT client error:', error));
  mqttClient.on('close', () => console.log('MQTT client disconnected'));
  mqttClient.on('reconnect', () => console.log('MQTT client attempting to reconnect...'));
}

function subscribeToTopics() {
  MQTT_TOPICS.forEach(topic => {
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`Successfully subscribed to ${topic}`);
      }
    });
  });
}

function handleMQTTMessage(topic, message) {
  console.log(`MQTT message received on ${topic}`);
  
  // Add extra logging for spectrometer topics
  if (topic.includes('spectrometer') || topic.includes('response/full_frame')) {
    console.log(`⭐ IMPORTANT: Spectrometer message on ${topic}`);
    console.log(`⭐ Message payload preview:`, message.toString().substring(0, 200));
  }
  
  // Forward the message to all connected WebSocket clients
  const messageToSend = JSON.stringify({
    topic: topic,
    payload: message.toString()
  });
  
  broadcastToWebSocketClients(messageToSend);
}

function broadcastToWebSocketClients(message) {
  let forwardedCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        forwardedCount++;
      } catch (e) {
        console.error('Error sending message to WebSocket client:', e);
      }
    }
  });
  if (forwardedCount > 0) {
    console.log(`Message forwarded to ${forwardedCount} WebSocket clients`);
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  // Send initial MQTT status
  ws.send(JSON.stringify({
    topic: 'system/status',
    payload: {
      mqttConnected: mqttClient ? mqttClient.connected : false,
      subscribedTopics: MQTT_TOPICS
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data.topic);
      
      // Handle special server/subscribe requests
      if (data.topic === 'server/subscribe' && typeof data.payload === 'string') {
        const topicToSubscribe = data.payload;
        console.log(`Client requesting subscription to: ${topicToSubscribe}`);
        
        // Check if we're already subscribed
        if (!MQTT_TOPICS.includes(topicToSubscribe)) {
          // Add to our list
          MQTT_TOPICS.push(topicToSubscribe);
          console.log(`Added ${topicToSubscribe} to subscription list`);
          
          // Actually subscribe via MQTT client
          if (mqttClient && mqttClient.connected) {
            mqttClient.subscribe(topicToSubscribe, { qos: 1 }, (err) => {
              if (err) {
                console.error(`Failed to subscribe to ${topicToSubscribe}:`, err);
              } else {
                console.log(`Successfully subscribed to ${topicToSubscribe}`);
                
                // Send updated status to all clients
                broadcastToWebSocketClients(JSON.stringify({
                  topic: 'system/status',
                  payload: {
                    mqttConnected: mqttClient.connected,
                    subscribedTopics: MQTT_TOPICS
                  }
                }));
              }
            });
          }
        } else {
          console.log(`Already subscribed to ${topicToSubscribe}`);
        }
        
        return; // Skip regular message handling
      }
      
      if (data.topic && data.payload !== undefined) {
        if (mqttClient && mqttClient.connected) {
          mqttClient.publish(data.topic, JSON.stringify(data.payload), { qos: 1 }, (err) => {
            if (err) {
              console.error('Error publishing MQTT message:', err);
            }
          });
        } else {
          console.error('MQTT client not connected - attempting reconnection');
          setupMQTTClient();
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => console.log('WebSocket client disconnected'));
  ws.on('error', (error) => console.error('WebSocket client error:', error));
});

// Health check endpoint
app.get('/mqtt-status', (req, res) => {
  res.json({
    connected: mqttClient ? mqttClient.connected : false,
    topics: MQTT_TOPICS
  });
});

// Periodic MQTT connection check
setInterval(() => {
  if (!mqttClient || !mqttClient.connected) {
    console.log('MQTT client not connected, attempting to reconnect...');
    setupMQTTClient();
  }
}, 10000);

// Start server
server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${WS_PORT}`);
  setupMQTTClient();
});
