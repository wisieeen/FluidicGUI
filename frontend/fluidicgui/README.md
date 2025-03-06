# FluidicGUI

FluidicGUI is a web-based graphical user interface for designing, controlling, and simulating microfluidic flow chemistry experiments. It provides an intuitive interface for creating droplet sequences, managing flow parameters, and communicating with microfluidic hardware via MQTT.

![FluidicGUI Screenshot](screenshot.png) <!-- Add a screenshot of your application here -->

## Features

- Interactive flowchart designer for microfluidic setups
- Manual and automated droplet sequence generation
- Parameter interpolation and response surface modeling
- Real-time hardware control via MQTT
- Simulation capabilities for flow chemistry experiments
- Colorblind-friendly visualization options

## Project Structure

The project consists of two main parts:

- **Frontend**: React-based user interface (`/frontend/fluidicgui`)
- **Backend**: Node.js server for MQTT communication (`/backend`)

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MQTT broker (for hardware communication)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/fluidicgui.git
   cd fluidicgui
   ```

2. Install dependencies for the root project, frontend, and backend:
   ```
   npm install
   cd frontend/fluidicgui
   npm install
   cd ../../backend
   npm install
   cd ..
   ```

## Configuration

1. Configure the MQTT connection in `backend/server.js` by updating the broker URL:
   ```javascript
   const mqttClient = mqtt.connect('mqtt://your-mqtt-broker:1883');
   ```

## Running the Application

You can start both the frontend and backend with a single command from the root directory:

```
npm start
```

This will start:
- The React frontend on http://localhost:3000
- The backend server on http://localhost:4000

## Development

### Frontend

The frontend is built with React and includes:
- React Flow for flowchart visualization
- D3.js for data visualization
- Redux for state management

To run only the frontend:
```
cd frontend/fluidicgui
npm start
```

### Backend

The backend provides a WebSocket server that bridges between the frontend and MQTT:

To run only the backend:
```
cd backend
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- List any libraries, tools, or people you'd like to acknowledge here
