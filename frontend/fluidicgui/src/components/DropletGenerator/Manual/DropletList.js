import React from 'react';
import DropletBar from './DropletBar';

const DropletItem = ({ droplet, isSelected, onClick, parameterVisibility, parameterRanges = {}, colorScheme }) => {
  return (
    <div
      onClick={(e) => onClick(droplet.id, e)}  // Pass event for Ctrl/Shift detection
      style={{
        border: isSelected ? '5px solid black' : '5px solid white',
        padding: '0px',
        margin: '0px',
        backgroundColor: droplet.group ? 'lightgray' : 'white',
        width: '37px',            // Set fixed width (or use percentage for responsive design)
        boxSizing: 'border-box',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      {/*<h4>Droplet ID: {droplet.id}</h4>*/}
      {droplet.parameters.map((param) => (
        parameterVisibility[`${param.nodeId}-${param.name}`] !== false && (
          <DropletBar 
            key={`${param.nodeId}-${param.name}`} 
            value={param.value}
            range={parameterRanges[param.name]}
            colorScheme={colorScheme}
          />
        )
      ))}
    </div>
  );
};

const DropletList = ({ droplets, selectedDroplets, onSelectDroplet, parameterVisibility = {}, parameterRanges = {}, colorScheme = 'cividis' }) => {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',         // Allow droplets to wrap to the next row
      justifyContent: 'flex-start', // Align droplets to the start
      gap: '0px',             // Add space between droplets
      width: '100%',           // Take the full width of the container
      padding: '10px',
      boxSizing: 'border-box',
      maxHeight: '800px',      // Set the maximum height for the droplet list
      overflowY: 'auto',       // Enable vertical scrolling if content exceeds maxHeight
    }}>
      {droplets.map((droplet) => (
        <DropletItem
          key={droplet.id}
          droplet={droplet}
          isSelected={selectedDroplets.includes(droplet.id)}
          onClick={onSelectDroplet}
          parameterVisibility={parameterVisibility}
          parameterRanges={parameterRanges}
          colorScheme={colorScheme}
        />
      ))}
    </div>
  );
};

export default DropletList;
