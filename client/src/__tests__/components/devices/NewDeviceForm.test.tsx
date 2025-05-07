import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import NewDeviceForm from '../../../components/devices/NewDeviceForm';
import * as deviceDriversService from '../../../services/deviceDrivers';

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock device drivers service
vi.mock('../../../services/deviceDrivers', () => ({
  getDeviceDrivers: vi.fn(),
}));

describe('NewDeviceForm Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  
  const mockDeviceDrivers = [
    {
      _id: 'driver1',
      name: 'Test Driver 1',
      make: 'Test Make',
      model: 'Test Model',
      description: 'Test description',
      dataPoints: [],
      connectionSetting: {
        connectionType: 'tcp',
      }
    },
    {
      _id: 'driver2',
      name: 'Test Driver 2',
      make: 'Test Make 2',
      model: 'Test Model 2',
      dataPoints: [],
      connectionSetting: {
        connectionType: 'rtu',
      }
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the getDeviceDrivers function to return our mock data
    (deviceDriversService.getDeviceDrivers as any).mockResolvedValue(mockDeviceDrivers);
  });

  test('renders correctly when open', async () => {
    render(
      <NewDeviceForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        title="Test Device Form"
      />
    );

    // Check title is rendered
    expect(screen.getByText('Test Device Form')).toBeInTheDocument();
    
    // Check basic form fields are rendered
    expect(screen.getByText('Device Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Device Enabled')).toBeInTheDocument();
    
    // Check form tabs are rendered
    expect(screen.getByText('Basic Details')).toBeInTheDocument();
    expect(screen.getByText('Device Driver')).toBeInTheDocument();
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(
      <NewDeviceForm
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        title="Test Device Form"
      />
    );

    // Form should not be rendered
    expect(screen.queryByText('Test Device Form')).not.toBeInTheDocument();
  });

  test('loads device drivers and displays them', async () => {
    render(
      <NewDeviceForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        title="Test Device Form"
      />
    );

    // Click on Device Driver tab
    fireEvent.click(screen.getByText('Device Driver'));
    
    // Check that the getDeviceDrivers function was called
    expect(deviceDriversService.getDeviceDrivers).toHaveBeenCalled();
    
    // Wait for device drivers to load
    await waitFor(() => {
      expect(screen.getByText('Select Device Driver')).toBeInTheDocument();
    });
  });

  test('validates form fields before submission', async () => {
    const { getByText, getByLabelText } = render(
      <NewDeviceForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        title="Test Device Form"
      />
    );

    // Try to submit with empty required fields
    fireEvent.click(screen.getByText('Create Device'));
    
    // Wait for validation to complete
    await waitFor(() => {
      // Check for error message
      expect(screen.getByText('Device name is required')).toBeInTheDocument();
      // Check that onSubmit wasn't called
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('handles form submission correctly', async () => {
    render(
      <NewDeviceForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        title="Test Device Form"
      />
    );

    // Fill in required fields
    await userEvent.type(screen.getByLabelText('Device Name'), 'Test Device');
    
    // Switch to Device Driver tab and select a driver
    fireEvent.click(screen.getByText('Device Driver'));
    
    // Wait for device drivers to load
    await waitFor(() => {
      expect(screen.getByText('Select a device driver')).toBeInTheDocument();
    });
    
    // Get the device driver select element and change it
    const driverSelect = screen.getByLabelText('Select Device Driver');
    fireEvent.change(driverSelect, { target: { value: 'driver1' } });
    
    // Switch to Metadata tab
    fireEvent.click(screen.getByText('Metadata'));
    
    // Select usage category
    const usageSelect = screen.getByLabelText('Device Usage Category');
    fireEvent.change(usageSelect, { target: { value: 'energy_analysis' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Create Device'));
    
    // Verify onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Device',
          deviceDriverId: 'driver1',
          usage: 'energy_analysis',
        })
      );
    });
  });

  test('connection fields change based on connection type', async () => {
    render(
      <NewDeviceForm
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        title="Test Device Form"
      />
    );
    
    // Switch to Connection tab
    fireEvent.click(screen.getByText('Connection'));
    
    // By default, should show TCP fields
    expect(screen.getByLabelText('IP Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Port')).toBeInTheDocument();
    
    // Switch to RTU
    const connectionTypeSelect = screen.getByLabelText('Connection Type');
    fireEvent.change(connectionTypeSelect, { target: { value: 'rtu' } });
    
    // Now should show RTU fields
    expect(screen.getByLabelText('Serial Port')).toBeInTheDocument();
    expect(screen.getByLabelText('Baud Rate')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Bits')).toBeInTheDocument();
    expect(screen.getByLabelText('Stop Bits')).toBeInTheDocument();
    expect(screen.getByLabelText('Parity')).toBeInTheDocument();
  });
});