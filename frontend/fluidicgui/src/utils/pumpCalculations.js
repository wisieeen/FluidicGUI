/**
 * Converts physical pump parameters to hardware-specific values
 * @param {Object} params - Physical parameters
 * @param {number} params.volume - Volume in μL
 * @param {number} params.speed - Speed in μL/s
 * @param {Object} deviceProperties - Device properties
 * @param {number} deviceProperties.diameter - Syringe diameter in mm
 * @param {number} deviceProperties.stepsPerRevolution - Steps per revolution
 * @param {number} deviceProperties.lead - Lead screw pitch in mm
 * @returns {Object} Hardware-specific values
 */
export const convertToHardwareValuesPump = (params, deviceProperties) => {
  // Extract device properties with defaults
  const syringeDiameter = deviceProperties.find(p => p.name === 'diameter')?.default || 0;
  const stepsPerRevolution = deviceProperties.find(p => p.name === 'steps per revolution')?.default || 0;
  const lead = deviceProperties.find(p => p.name === 'lead')?.default || 0;

  // Calculate syringe area in mm²
  const syringeArea = Math.PI * Math.pow(syringeDiameter / 2, 2);

  // Convert volumetric speed to linear speed (mm/s)
  const linearSpeed = (parseFloat(params.speed)) / syringeArea;

  // Calculate steps per mm of linear movement
  const stepsPerMm = stepsPerRevolution / lead;

  // Calculate steps per second
  const stepsPerSecond = linearSpeed * stepsPerMm;

  // Calculate delay between steps in microseconds
  const delayMicroseconds = stepsPerSecond ? Math.round(1000000 / stepsPerSecond / 2) : 0;

  // Calculate total time in microseconds
  const endTime = Math.round(Math.abs(params.volume / params.speed * 1000000));

  // Calculate direction based on speed sign
  const direction = Math.sign(params.speed) >= 0 ? 1 : -1;

  return {
    delayMicroseconds,
    endTime,
    direction,
    // Additional calculated values that might be useful
    stepsPerSecond,
    linearSpeed,
    syringeArea
  };
};

/**
 * Creates a pump movement command list
 * @param {Object} params - Physical parameters
 * @param {number} params.volume - Volume in μL
 * @param {number} params.speed - Speed in μL/s
 * @param {Object} deviceProperties - Device properties
 * @returns {Array} Command list for the pump
 */
export const createPumpCommand = (params, deviceProperties) => {
  const { delayMicroseconds, endTime } = convertToHardwareValuesPump(params, deviceProperties);
  
  return [
    [delayMicroseconds, 0],      // Start moving at specified speed
    [0, endTime]                 // Stop after specified time
  ];
}; 