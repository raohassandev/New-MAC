/**
 * Utility functions for formatting Modbus values
 */

/**
 * Format a Modbus value for display, handling special cases like very small numbers
 * @param value The raw value from the Modbus device
 * @param decimalPlaces Number of decimal places to display (default: 2)
 * @param preserveSmallValues Whether to preserve very small values in scientific notation (default: true)
 * @returns Formatted value as a string
 */
export function formatModbusValue(
  value: number | string | null | undefined,
  decimalPlaces: number = 2,
  preserveSmallValues: boolean = true
): string {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // Convert to number if it's not already
  const numValue = Number(value);
  
  // Check for NaN
  if (isNaN(numValue)) {
    return 'Error';
  }
  
  // Handle very small values specially
  if (preserveSmallValues && Math.abs(numValue) < Math.pow(10, -(decimalPlaces + 1))) {
    // For extremely small values, use scientific notation
    return numValue.toExponential(decimalPlaces);
  }
  
  // For normal values, format with fixed decimal places
  return numValue.toFixed(decimalPlaces);
}

/**
 * Apply default formatting based on data type
 * @param value The raw value
 * @param dataType The Modbus data type (e.g., 'FLOAT32', 'INT16')
 * @returns Formatted value
 */
export function formatByDataType(
  value: number | string | null | undefined,
  dataType: string | undefined
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  // Format based on data type
  switch (dataType) {
    case 'FLOAT32':
    case 'FLOAT':
      return formatModbusValue(value, 2, true);
    case 'INT16':
    case 'INT-16':
    case 'INT32':
    case 'INT-32':
      return formatModbusValue(value, 0, false);
    case 'UINT16':
    case 'UINT-16':
    case 'UINT32':
    case 'UINT-32':
      // Ensure positive integers
      const numVal = typeof value === 'string' ? parseInt(value, 10) : value;
      return formatModbusValue(Math.max(0, numVal), 0, false);
    default:
      // Default to 2 decimal places for unknown types
      return formatModbusValue(value, 2, true);
  }
}
