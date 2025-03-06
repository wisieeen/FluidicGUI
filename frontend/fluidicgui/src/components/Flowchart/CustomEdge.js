import React, { useState, useRef, useEffect } from 'react';
import { getBezierPath, getEdgeCenter} from 'react-flow-renderer';
import { backgroundVariants } from '../../styles/backgroundStyles';

const CustomEdge = ({ 
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style = [],
  selected, }) => {
  const [showProperties, setShowProperties] = useState(false); // State to manage property window visibility
  const propertiesRef = useRef(null); // Ref for the properties window
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY });

  // Close properties window only if the click is outside of the window
  const handleClickOutside = (event) => {
    if (propertiesRef.current && !propertiesRef.current.contains(event.target)) {
      setShowProperties(false);  // Close only when clicking outside
    }
  };

  useEffect(() => {
    if (showProperties) {
      // Add event listener only when properties are visible
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      // Cleanup event listener when properties are hidden
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProperties]);

  // Handle deleting the edge
  const handleDeleteEdge = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  // Render edge properties
  const renderProperties = () => {
    if (!data.properties || Object.keys(data.properties).length === 0) {
      return <div>No properties to display</div>;
    }

    return Object.keys(data.properties).map((property) => (
      <div key={property}>
        <label>{property}: </label>
        <input
          style={styles.input}
          type="number"
          value={data.properties[property] || property.default}
          onChange={(e) => data.onPropertyChange(property, e.target.value)}  // Handle property change
        />
      </div>
    ));
  };

  const styles = {
    edgeButtons: {
      display: 'flex',
      gap: '5px',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '1px',
      padding: '3px',
      zIndex: 20,
      ...backgroundVariants.edgeBackground
    },
    button: {
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      fontSize: '14px',
    },
    propertyText: {
      padding: '5px',
      fontSize: '10px',
      borderRadius: '8px',
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
      textAlign: 'center',
      ...backgroundVariants.overlay
    },
    propertiesWindow: {
      padding: '5px',
      borderRadius: '5px',
      fontSize: '12px',
      ...backgroundVariants.propertyBackground
    },
    input: {
      width: '50px',
      padding: '2px',
      marginTop: '2px',
      ...backgroundVariants.inputBackground
    },
    label: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '4px',
      color: '#333',
    },
    proplabel: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '4px',
      color: '#7c7',
    }
  };

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
      <foreignObject
        width={80}
        height={40}
        x={edgeCenterX - 40}
        y={edgeCenterY - 20}
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div style={styles.edgeButtons}>
        <button onClick={handleDeleteEdge} style={styles.button}>🗑️</button>
          <button onClick={() => setShowProperties(!showProperties)} style={styles.button}>⚙️</button>
        </div>
      </foreignObject>
      {/* Render properties when toggled */}
      {showProperties && (
        <foreignObject
          style={styles.propertiesWindow}
          width={100}
          height={100}
          x={edgeCenterX - 60}
          y={edgeCenterY + 40}
        >
          <div style={styles.propertiesWindow}>
            {renderProperties()}  {/* Render properties */}
            </div>
        </foreignObject>
      )}

      {/* Floating Edge Properties */}
      <foreignObject
        width={120}
        height={30}
        x={edgeCenterX - 60} // Centered below the control buttons
        y={edgeCenterY + 15} // Positioned below the control buttons
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div style={styles.propertyText}>
    Length: {data.properties?.length || 'N/A'}, Diameter: {data.properties?.diameter || 'N/A'}
  </div>
      </foreignObject>

    </>
  );
};

export default CustomEdge;
