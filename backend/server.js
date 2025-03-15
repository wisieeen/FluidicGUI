// server.js
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const mqtt = require('mqtt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Create MQTT client
const mqttClient = mqtt.connect('mqtt://10.0.0.4:1883'); // Replace with your MQTT broker URL

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
});

mqttClient.on('error', (error) => {
  console.error('MQTT client error:', error);
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Check if this is an MQTT-style message
      if (data.topic && data.payload) {
        console.log('Forwarding message to MQTT broker:', data);
        mqttClient.publish(data.topic, JSON.stringify(data.payload));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(4000, '0.0.0.0', () => {
  console.log('WebSocket server running on port 4000 (accessible from network)');
});
