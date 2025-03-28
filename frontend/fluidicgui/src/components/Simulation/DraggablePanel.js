import React, { useState, useRef, useEffect } from 'react';
import { backgroundVariants } from '../../styles/backgroundStyles';

const DraggablePanel = ({ children, initialPosition = { x: 0, y: 0 }, title = "Panel", width, height, onClose }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Update position when initialPosition changes
  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && panelRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Get window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Get panel dimensions
        const panelRect = panelRef.current.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;
        
        // Keep panel within window bounds and ensure minimum top margin for navigation
        const boundedX = Math.min(Math.max(0, newX), windowWidth - panelWidth);
        const boundedY = Math.min(Math.max(60, newY), windowHeight - panelHeight); // 60px minimum top margin
        
        setPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const styles = {
    panel: {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      ...backgroundVariants.panelBackground,
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      zIndex: 999, // Ensure it's always on top
      minWidth: '25px', // Slightly wider to accommodate all controls
      width: width || 'auto',
      height: height || 'auto'
    },
    header: {
      padding: '8px 12px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      cursor: 'move',
      userSelect: 'none',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    },
    title: {
      margin: 0,
      color: '#fff',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    closeButton: {
      width: '20px',
      height: '20px',
      background: 'rgba(255, 0, 0, 0.3)',
      border: 'none',
      borderRadius: '4px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      padding: 0,
      lineHeight: 1,
      transition: 'background-color 0.2s ease'
    },
    content: {
      padding: '12px',
      width: '100%',
      boxSizing: 'border-box'
    }
  };

  return (
    <div ref={panelRef} style={styles.panel}>
      <div style={styles.header} onMouseDown={handleMouseDown}>
        <h3 style={styles.title}>{title}</h3>
        {onClose && (
          <button 
            style={styles.closeButton} 
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering drag
              onClose();
            }}
            title="Close"
          >
            x
          </button>
        )}
      </div>
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default DraggablePanel; 