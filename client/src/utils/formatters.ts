import { format } from 'date-fns';

/**
 * Format a date string or Date object to a readable format
 * @param date - Date string, Date object, or undefined/null
 * @param formatStr - Format string (defaults to 'MM/dd/yyyy')
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | undefined | null,
  formatStr = 'MM/dd/yyyy'
): string => {
  if (!date) return 'Never';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid Date';
  }
};

/**
 * Format a number with commas and decimal places
 * @param value - Number or string that can be parsed as a number
 * @param decimalPlaces - Number of decimal places (defaults to 2)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | string | undefined | null,
  decimalPlaces = 2
): string => {
  if (value === undefined || value === null) return 'N/A';

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return 'N/A';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

/**
 * Format bytes to human-readable format
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Formatted string with appropriate unit (B, KB, MB, GB, TB)
 */
export const formatBytes = (bytes: number | string | undefined | null, decimals = 2): string => {
  if (bytes === undefined || bytes === null) return 'N/A';

  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;

  if (isNaN(num)) return 'N/A';
  if (num === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(num) / Math.log(k));

  return parseFloat((num / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Truncate text to specified length with ellipsis
 * @param text - Text to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to append (defaults to '...')
 * @returns Truncated text
 */
export const truncateText = (
  text: string | undefined | null,
  length: number,
  suffix = '...'
): string => {
  if (!text) return '';

  if (text.length <= length) return text;

  return text.substring(0, length) + suffix;
};

/**
 * Format IP address and port
 * @param ip - IP address
 * @param port - Port number
 * @returns Formatted address string
 */
export const formatAddress = (
  ip: string | undefined | null,
  port?: number | undefined | null
): string => {
  if (!ip) return 'N/A';

  if (!port) return ip;

  return `${ip}:${port}`;
};

/**
 * Format status to a readable string
 * @param status - Status value (boolean or string)
 * @param labels - Custom labels (defaults to Online/Offline)
 * @returns Formatted status string
 */
export const formatStatus = (
  status: boolean | string | undefined | null,
  labels = { true: 'Online', false: 'Offline' }
): string => {
  if (status === undefined || status === null) return 'Unknown';

  if (typeof status === 'boolean') {
    return status ? labels.true : labels.false;
  }

  if (status === 'enabled' || status === 'active') return labels.true;
  if (status === 'disabled' || status === 'inactive') return labels.false;

  return 'Unknown';
};
