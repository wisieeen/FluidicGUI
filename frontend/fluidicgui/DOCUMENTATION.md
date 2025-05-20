# fluidicGUI Documentation

## Overview
fluidicGUI is a modular, extensible GUI for fluidic device simulation and control, with real-time device integration. The application is built using React for the frontend and Node.js with MQTT/WebSocket for backend communication.

## Project Structure

### Frontend Structure
```
frontend/fluidicgui/
├── src/
│   ├── components/         # React components
│   ├── context/           # Context providers
│   ├── utils/             # Utility functions
│   ├── styles/            # CSS and styling
│   ├── data/              # Static data
│   └── App.js             # Main application component
```

## Core Components

### 1. Flowchart Editor
**Location**: `src/components/Flowchart/`

The Flowchart Editor is the main interface for creating and editing fluidic device workflows.

#### Key Components:
- `FlowchartEditor`: Main component for node/edge manipulation
- `CustomNode`: Custom node implementation for fluidic devices
- `CustomEdge`: Custom edge implementation for connections
- `SidePanel`: Property configuration panel

#### Props:
```javascript
{
  nodes: Array,              // Current nodes in the flowchart
  edges: Array,              // Current edges in the flowchart
  onAddNode: Function,       // Handler for adding new nodes
  onNodesChange: Function,   // Handler for node changes
  onEdgesChange: Function,   // Handler for edge changes
  onProceed: Function,       // Handler for proceeding to next step
  onScanDevices: Function,   // Handler for device scanning
  detectedDevices: Array     // List of detected devices
}
```

### 2. Simulation
**Location**: `src/components/Simulation/`

Handles the simulation of fluidic workflows and device interactions.

#### Key Components:
- `Simulation`: Main simulation component
- `DraggablePanel`: Resizable simulation control panel
- `USBSpectrometer`: USB spectrometer integration
- `SpectrometerMQTT`: MQTT-based spectrometer communication

### 3. Navigation
**Location**: `src/components/Navigation/`

Navigation components for the application workflow.

### 4. Settings
**Location**: `src/components/Settings/`

Application configuration and settings management.

### 5. MQTT
**Location**: `src/components/MQTT/`

MQTT communication components for device integration.

### 6. DropletGenerator
**Location**: `src/components/DropletGenerator/`

Components for droplet generation simulation and control.

## Utility Functions

### 1. Simulation Utilities
**Location**: `src/utils/simulationUtils.js`

Core simulation functions:
- Graph traversal
- Volume calculations
- Event generation
- Device state management

### 2. Flowchart Utilities
**Location**: `src/utils/flowchartUtils.js`

Flowchart manipulation functions:
- Node validation
- Edge management
- Graph validation
- Import/export functionality

### 3. Pump Calculations
**Location**: `src/utils/pumpCalculations.js`

Pump-related calculations:
- Flow rate calculations
- Pressure calculations
- Volume calculations

### 4. Detector Calculations
**Location**: `src/utils/detectorCalculations.js`

Detector-related functions:
- Signal processing
- Data analysis
- Calibration

### 5. Local Storage Utilities
**Location**: `src/utils/localStorageUtils.js`

Local storage management:
- Save/load configurations
- State persistence
- Data caching

### 6. MQTT Debugger
**Location**: `src/utils/mqttDebugger.js`

MQTT debugging tools:
- Connection monitoring
- Message logging
- Error tracking

## State Management

### Color Scheme Context
**Location**: `src/context/`

Provides button color schemes throughout the application:
```javascript
{
  buttonColorScheme: Object,
  updateButtonColorScheme: Function
}
```

## Error Handling

The application implements error handling at multiple levels:
1. Component-level error boundaries
2. Console warnings for development
3. UI fallbacks for error states
4. WebSocket error handling
5. MQTT connection error management

## Performance Considerations

1. Lazy loading for heavy components
2. Memoization of expensive calculations
3. Efficient state updates
4. Minimal re-renders
5. Optimized graph traversal

## Security

Current security implementation:
- CORS enabled on backend
- WebSocket and MQTT open to local network
- No authentication/authorization (to be implemented)

## Usage Examples

### Creating a New Flowchart
```javascript
import { FlowchartEditor } from './components/Flowchart';

function MyComponent() {
  return (
    <FlowchartEditor
      nodes={initialNodes}
      edges={initialEdges}
      onAddNode={handleAddNode}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
    />
  );
}
```

### Running a Simulation
```javascript
import { Simulation } from './components/Simulation';
import { calculateFlowRate } from './utils/pumpCalculations';

function SimulationComponent() {
  const flowRate = calculateFlowRate(pumpSettings);
  return (
    <Simulation
      flowRate={flowRate}
      devices={connectedDevices}
      onSimulationComplete={handleComplete}
    />
  );
}
```

## Best Practices

1. Always use the provided utility functions for calculations
2. Implement error handling for all device interactions
3. Use the context for shared state management
4. Follow the component structure for new features
5. Document new components and utilities
6. Test all device integrations thoroughly

## Contributing

When adding new features:
1. Follow the existing component structure
2. Implement proper error handling
3. Add documentation for new components
4. Update this documentation
5. Test thoroughly before submitting 