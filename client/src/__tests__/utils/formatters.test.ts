import * as formatters from '../../utils/formatters';

describe('Formatter Utilities', () => {
  describe('formatDate', () => {
    test('formats date strings correctly', () => {
      const dateString = '2023-05-15T10:30:00Z';
      const result = formatters.formatDate(dateString);

      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should match date pattern MM/DD/YYYY or similar
    });

    test('formats Date objects correctly', () => {
      const dateObj = new Date('2023-05-15T10:30:00Z');
      const result = formatters.formatDate(dateObj);

      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    test('returns a placeholder for undefined dates', () => {
      const result = formatters.formatDate(undefined);
      expect(result).toBe('Never');
    });

    test('returns a placeholder for null dates', () => {
      const result = formatters.formatDate(null);
      expect(result).toBe('Never');
    });

    test('formats dates with custom format string', () => {
      const dateString = '2023-05-15T10:30:00Z';
      const result = formatters.formatDate(dateString, 'yyyy-MM-dd');

      expect(result).toBe('2023-05-15');
    });
  });

  describe('formatNumber', () => {
    test('formats numbers with default decimal places', () => {
      expect(formatters.formatNumber(12345.6789)).toBe('12,345.68');
    });

    test('formats numbers with specified decimal places', () => {
      expect(formatters.formatNumber(12345.6789, 1)).toBe('12,345.7');
      expect(formatters.formatNumber(12345.6789, 3)).toBe('12,345.679');
    });

    test('handles integers correctly', () => {
      expect(formatters.formatNumber(12345)).toBe('12,345.00');
    });

    test('handles zero correctly', () => {
      expect(formatters.formatNumber(0)).toBe('0.00');
    });

    test('handles negative numbers correctly', () => {
      expect(formatters.formatNumber(-12345.6789, 1)).toBe('-12,345.7');
    });

    test('handles strings that can be parsed as numbers', () => {
      expect(formatters.formatNumber('12345.6789')).toBe('12,345.68');
    });

    test('returns a placeholder for non-numeric values', () => {
      expect(formatters.formatNumber('not a number')).toBe('N/A');
      expect(formatters.formatNumber(undefined)).toBe('N/A');
      expect(formatters.formatNumber(null)).toBe('N/A');
    });
  });

  describe('formatBytes', () => {
    test('formats bytes to appropriate units', () => {
      expect(formatters.formatBytes(0)).toBe('0 B');
      expect(formatters.formatBytes(500)).toBe('500 B');
      expect(formatters.formatBytes(1024)).toBe('1 KB');
      expect(formatters.formatBytes(1536)).toBe('1.5 KB');
      expect(formatters.formatBytes(1048576)).toBe('1 MB');
      expect(formatters.formatBytes(1073741824)).toBe('1 GB');
      expect(formatters.formatBytes(1099511627776)).toBe('1 TB');
    });

    test('handles decimal precision correctly', () => {
      expect(formatters.formatBytes(1500, 0)).toBe('1 KB');
      expect(formatters.formatBytes(1500, 1)).toBe('1.5 KB');
      expect(formatters.formatBytes(1500, 3)).toBe('1.465 KB');
    });

    test('handles non-numeric inputs', () => {
      expect(formatters.formatBytes('not a number')).toBe('N/A');
      expect(formatters.formatBytes(undefined)).toBe('N/A');
      expect(formatters.formatBytes(null)).toBe('N/A');
    });
  });

  describe('truncateText', () => {
    test('truncates text longer than specified length', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(formatters.truncateText(longText, 10)).toBe('This is a ...');
    });

    test('does not truncate text shorter than specified length', () => {
      const shortText = 'Short text';
      expect(formatters.truncateText(shortText, 20)).toBe('Short text');
    });

    test('truncates at exactly the specified length', () => {
      const text = '12345678901234567890';
      expect(formatters.truncateText(text, 10)).toBe('1234567890...');
    });

    test('handles custom suffix', () => {
      const text = 'This is a test';
      expect(formatters.truncateText(text, 7, ' [more]')).toBe('This is [more]');
    });

    test('handles edge cases', () => {
      expect(formatters.truncateText('', 10)).toBe('');
      expect(formatters.truncateText(null, 10)).toBe('');
      expect(formatters.truncateText(undefined, 10)).toBe('');
    });
  });

  describe('formatAddress', () => {
    test('formats IP and port correctly', () => {
      expect(formatters.formatAddress('192.168.1.1', 80)).toBe('192.168.1.1:80');
    });

    test('handles missing IP', () => {
      expect(formatters.formatAddress('', 80)).toBe('N/A');
      expect(formatters.formatAddress(null, 80)).toBe('N/A');
      expect(formatters.formatAddress(undefined, 80)).toBe('N/A');
    });

    test('handles missing port', () => {
      expect(formatters.formatAddress('192.168.1.1')).toBe('192.168.1.1');
      expect(formatters.formatAddress('192.168.1.1', null)).toBe('192.168.1.1');
      expect(formatters.formatAddress('192.168.1.1', undefined)).toBe('192.168.1.1');
    });
  });

  describe('formatStatus', () => {
    test('formats boolean status correctly', () => {
      expect(formatters.formatStatus(true)).toBe('Online');
      expect(formatters.formatStatus(false)).toBe('Offline');
    });

    test('handles string values', () => {
      expect(formatters.formatStatus('enabled')).toBe('Online');
      expect(formatters.formatStatus('disabled')).toBe('Offline');
      expect(formatters.formatStatus('active')).toBe('Online');
      expect(formatters.formatStatus('inactive')).toBe('Offline');
    });

    test('handles custom labels', () => {
      expect(formatters.formatStatus(true, { true: 'Running', false: 'Stopped' })).toBe('Running');
      expect(formatters.formatStatus(false, { true: 'Running', false: 'Stopped' })).toBe('Stopped');
    });

    test('handles edge cases', () => {
      expect(formatters.formatStatus(undefined)).toBe('Unknown');
      expect(formatters.formatStatus(null)).toBe('Unknown');
      expect(formatters.formatStatus('unknown')).toBe('Unknown');
    });
  });
});
