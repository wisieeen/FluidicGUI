/**
 * Converts detector readings to calibrated values
 * @param {Object} reading - Raw detector reading
 * @param {number} reading.value - Raw reading value
 * @param {Object} deviceProperties - Device properties
 * @returns {Object} Calibrated values
 */
export const convertDetectorReading = (reading, deviceProperties) => {
  // Extract device properties with defaults
  const sensitivity = deviceProperties.find(p => p.name === 'sensitivity')?.default || 1;
  const offset = deviceProperties.find(p => p.name === 'offset')?.default || 0;
  
  // Calculate calibrated value
  const calibratedValue = reading.value * sensitivity + offset;
  
  return {
    rawValue: reading.value,
    calibratedValue,
    timestamp: reading.timestamp || Date.now(),
    unit: deviceProperties.find(p => p.name === 'unit')?.default || 'au'
  };
};

/**
 * Analyzes detector data for peaks and other metrics
 * @param {Array} readings - Array of detector readings
 * @returns {Object} Analysis results
 */
export const analyzeDetectorData = (readings) => {
  if (!readings || readings.length === 0) {
    return {
      peaks: [],
      average: 0,
      max: 0,
      min: 0
    };
  }
  
  const values = readings.map(r => r.calibratedValue);
  
  // Simple peak detection (this would be more sophisticated in a real app)
  const peaks = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i] > values[i-1] && values[i] > values[i+1] && values[i] > 0.05) {
      peaks.push({
        index: i,
        value: values[i],
        timestamp: readings[i].timestamp
      });
    }
  }
  
  return {
    peaks,
    average: values.reduce((sum, val) => sum + val, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values)
  };
};

/**
 * Analyzes video frame from camera feed for detector
 * This is a placeholder function that would be replaced with actual
 * computer vision algorithms in a real application
 * 
 * @param {HTMLCanvasElement} canvas - Canvas with the video frame
 * @param {Object} options - Analysis options
 * @param {string} options.analysisType - Type of analysis to perform
 * @returns {Object} Analysis results
 */
export const analyzeVideoFrame = (canvas, options = {}) => {
  const { analysisType = 'color' } = options;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Calculate average RGB values (very basic analysis)
  let totalR = 0, totalG = 0, totalB = 0;
  const pixelCount = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }
  
  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  
  // Calculate brightness
  const brightness = (avgR + avgG + avgB) / 3 / 255;
  
  // Different analysis types
  if (analysisType === 'color') {
    return {
      type: 'color',
      avgRed: avgR,
      avgGreen: avgG,
      avgBlue: avgB,
      brightness,
      timestamp: Date.now()
    };
  } else if (analysisType === 'motion') {
    // Placeholder for motion detection
    // Would compare with previous frames in real implementation
    return {
      type: 'motion',
      motionDetected: false,
      motionLevel: 0,
      timestamp: Date.now()
    };
  } else if (analysisType === 'particle') {
    // Placeholder for particle detection
    // Would use more advanced CV algorithms in real implementation
    return {
      type: 'particle',
      particleCount: 0,
      particleSizes: [],
      timestamp: Date.now()
    };
  }
  
  return {
    type: 'unknown',
    timestamp: Date.now()
  };
}; 