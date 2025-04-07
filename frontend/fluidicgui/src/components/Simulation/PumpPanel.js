import React from 'react';
import DraggablePanel from './DraggablePanel';
import PumpActions from './NodeActions/PumpActions';

const PumpPanel = ({ pump, nodes, edges, onClose, initialPosition = { x: 150, y: 100 }, onAction }) => {
  if (!pump) return null;
  
  return (
    <DraggablePanel 
      title={`Pump Control: ${pump.label || pump.id}`}
      initialPosition={initialPosition}
      width={400}
      height={500}
      onClose={onClose}
    >
      <div style={styles.container}>
        <PumpActions 
          node={pump} 
          nodes={nodes} 
          edges={edges} 
          onAction={(action) => {
            console.log('Pump action:', action);
            if (onAction) onAction(action);
          }} 
        />
      </div>
    </DraggablePanel>
  );
};

const styles = {
  container: {
    padding: '10px',
    width: '100%',
    height: '100%',
    overflowY: 'auto'
  }
};

export default PumpPanel; 