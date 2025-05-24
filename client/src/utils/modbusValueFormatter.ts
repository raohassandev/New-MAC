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
  
  // If it's already a string, return it as-is if it looks formatted, otherwise try to parse and format
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return value; // Return original string if not numeric
    }
    // Format the parsed numeric string consistently
    return formatModbusValue(parsed, decimalPlaces, preserveSmallValues);
  }
  
  // Convert to number if it's not already
  const numValue = Number(value);
  
  // Check for NaN
  if (isNaN(numValue)) {
    return 'Error';
  }
  
  // Handle extremely small values (values near zero that are likely noise or floating point errors)
  if (Math.abs(numValue) < 1e-30) {
    return '0.00';
  }
  
  // Handle very small values specially (but not too small)
  if (preserveSmallValues && Math.abs(numValue) < Math.pow(10, -(decimalPlaces + 1)) && Math.abs(numValue) >= 1e-10) {
    // For small but meaningful values, use scientific notation
    return numValue.toExponential(decimalPlaces);
  }
  
  // For normal values, always format with exactly 2 decimal places for consistency
  // Remove trailing zeros only if the value is a whole number
  const formatted = numValue.toFixed(decimalPlaces);
  
  // If decimalPlaces is 2, ensure we always show 2 decimals (16.39, not 16.4)
  if (decimalPlaces === 2) {
    return formatted; // Always keep exactly 2 decimal places
  }
  
  return formatted;
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
      // For floating point values, always use 2 decimal places for consistency
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
