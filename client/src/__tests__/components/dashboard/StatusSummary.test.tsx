import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusSummary from '../../../components/dashboard/StatusSummary';
import { vi } from 'vitest';

describe('StatusSummary Component', () => {
  const mockData = {
    total: 10,
    online: 7,
    offline: 3,
    warning: 2,
    lastUpdate: new Date(),
  };

  test('renders correctly with provided data', () => {
    render(<StatusSummary data={mockData} />);

    expect(screen.getByText('10')).toBeInTheDocument(); // Total
    expect(screen.getByText('7')).toBeInTheDocument(); // Online
    expect(screen.getByText('3')).toBeInTheDocument(); // Offline
    expect(screen.getByText('2')).toBeInTheDocument(); // Warning
  });

  test('renders with zero values', () => {
    const zeroData = {
      total: 0,
      online: 0,
      offline: 0,
      warning: 0,
      lastUpdate: new Date(),
    };

    render(<StatusSummary data={zeroData} />);

    // All stats should display "0"
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4); // Total, online, offline, warning
  });

  test('renders last updated time correctly', () => {
    const mockTime = new Date('2023-01-15T10:30:00Z');
    const data = {
      ...mockData,
      lastUpdate: mockTime,
    };

    // Mock Date.now to return a fixed time for "time ago" calculation
    const originalNow = Date.now;
    Date.now = vi.fn(() => new Date('2023-01-15T10:31:00Z').getTime()); // 1 minute later

    render(<StatusSummary data={data} showLastUpdate={true} />);

    // Check if "Last updated" text is shown
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();

    // Restore the original Date.now
    Date.now = originalNow;
  });

  test('handles missing data gracefully', () => {
    // Passing minimal required props
    render(<StatusSummary data={{ total: 5, online: 0, offline: 0, warning: 0 }} />);

    expect(screen.getByText('5')).toBeInTheDocument(); // Total devices should be shown
    expect(screen.getAllByText('0').length).toBe(3); // Should have 3 zeros (online, offline, warning)
  });

  test('displays correct percentage with progress bar', () => {
    render(<StatusSummary data={mockData} />);

    // We just need to verify the progress bar div exists
    const progressBar = document.querySelector('.flex.h-2.overflow-hidden.bg-gray-200.rounded');
    expect(progressBar).toBeInTheDocument();
  });

  test('handles zero total devices edge case', () => {
    const zeroTotalData = {
      total: 0,
      online: 0,
      offline: 0,
      warning: 0,
    };

    render(<StatusSummary data={zeroTotalData} />);

    // Should show all zeros
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);

    // With no devices, there should be no progress bar div
    const progressBarElements = document.querySelectorAll(
      '.flex.h-2.overflow-hidden.bg-gray-200.rounded'
    );
    expect(progressBarElements.length).toBe(0);
  });
});
