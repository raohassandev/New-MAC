import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewDeviceFormContainer from '../../components/devices/NewDeviceForm/NewDeviceFormContainer';
import { validateDeviceForm } from '../../components/devices/NewDeviceForm/validation';

// Mock utility functions
jest.mock('../../utils/TypeAdapter', () => ({
  convertFormToDeviceData: jest.fn(
    (deviceBasics, connectionSettings, registerRanges, parameters) => ({
      ...deviceBasics,
      ...connectionSettings,
      registerRanges,
      parameterConfigs: parameters,
    })
  ),
}));

// Mock sub-components to simplify testing
jest.mock('../../components/devices/NewDeviceForm/ConnectionSettings', () => {
  return function MockConnectionSettings() {
    return (
      <div data-testid="connection-settings">
        <input data-testid="device-name-input" placeholder="Device Name" aria-label="Device Name" />
        <select data-testid="connection-type-select">
          <option value="tcp">TCP/IP</option>
          <option value="rtu">Serial RTU</option>
        </select>
        <input data-testid="ip-address-input" placeholder="IP Address" />
      </div>
    );
  };
});

jest.mock('../../components/devices/NewDeviceForm/RegisterConfiguration', () => {
  return function MockRegisterConfiguration() {
    return (
      <div data-testid="register-configuration">
        <button data-testid="add-register-range-button">Add Register Range</button>
      </div>
    );
  };
});

jest.mock('../../components/devices/NewDeviceForm/DataReaderTab', () => {
  return function MockDataReaderTab() {
    return (
      <div data-testid="data-reader-tab">
        <button data-testid="add-parameter-button">Add Parameter</button>
      </div>
    );
  };
});

jest.mock('../../components/devices/NewDeviceForm/FormGuide', () => {
  return function MockFormGuide() {
    return <div data-testid="form-guide"></div>;
  };
});

jest.mock('../../components/devices/NewDeviceForm/ValidationMessages', () => {
  return function MockValidationMessages() {
    return <div data-testid="validation-messages"></div>;
  };
});

// Mock validation functions to control test behavior
jest.mock('../../components/devices/NewDeviceForm/validation', () => {
  const original = jest.requireActual('../../components/devices/NewDeviceForm/validation');

  return {
    ...original,
    validateDeviceForm: jest.fn(),
    convertValidationErrorsToState: jest.fn(errors => ({
      isValid: errors.isValid,
      basicInfo: errors.basicInfo.map(msg => ({ field: 'test', message: msg })),
      connection: errors.connection.map(msg => ({ field: 'test', message: msg })),
      registers: errors.registers.map(msg => ({ field: 'test', message: msg })),
      parameters: errors.parameters.map(msg => ({ field: 'test', message: msg })),
      general: errors.general.map(msg => ({ field: 'general', message: msg })),
    })),
  };
});

describe('NewDeviceFormContainer', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation for validation function - no errors
    (validateDeviceForm as jest.Mock).mockReturnValue({
      isValid: true,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: [],
      general: [],
    });
  });

  test('renders all form tabs', () => {
    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Initially should show connection settings tab
    expect(screen.getByTestId('connection-settings')).toBeInTheDocument();

    // Should have form tabs
    expect(screen.getByText('Connection Settings')).toBeInTheDocument();
    expect(screen.getByText('Register Configuration')).toBeInTheDocument();
    expect(screen.getByText('Data Reader')).toBeInTheDocument();
  });

  test('navigation between tabs works correctly', async () => {
    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Click Next button to move to register configuration
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByTestId('register-configuration')).toBeInTheDocument();
    });

    // Click Next button to move to data reader
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByTestId('data-reader-tab')).toBeInTheDocument();
    });

    // Click Previous button to go back to register configuration
    fireEvent.click(screen.getByText('Previous'));
    await waitFor(() => {
      expect(screen.getByTestId('register-configuration')).toBeInTheDocument();
    });
  });

  test('validation runs on tab change', async () => {
    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Try to navigate to next tab
    fireEvent.click(screen.getByText('Next'));

    // Validation should have been called
    expect(validateDeviceForm).toHaveBeenCalled();
  });

  test('shows validation errors when navigation attempted with invalid data', async () => {
    // Mock validation to return errors
    (validateDeviceForm as jest.Mock).mockReturnValue({
      isValid: false,
      basicInfo: [],
      connection: ['IP address is required'],
      registers: [],
      parameters: [],
      general: [],
    });

    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Try to navigate to next tab
    fireEvent.click(screen.getByText('Next'));

    // Validation messages should be visible
    await waitFor(() => {
      expect(screen.getByTestId('validation-messages')).toBeInTheDocument();
    });

    // Should not navigate to next tab
    expect(screen.getByTestId('connection-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('register-configuration')).not.toBeInTheDocument();
  });

  test('form submission works with valid data', async () => {
    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Navigate to the final tab
    fireEvent.click(screen.getByText('Next')); // to register config
    await waitFor(() => {
      expect(screen.getByTestId('register-configuration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next')); // to data reader
    await waitFor(() => {
      expect(screen.getByTestId('data-reader-tab')).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByText('Save Device'));

    // onSubmit should have been called
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  test('form submission blocked with invalid data', async () => {
    // Mock validation to return errors on final step
    (validateDeviceForm as jest.Mock).mockReturnValue({
      isValid: false,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: ['Parameter requires a name'],
      general: [],
    });

    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Navigate to the final tab - using a custom mock to allow navigation despite errors
    (validateDeviceForm as jest.Mock).mockReturnValue({
      isValid: true,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: [],
      general: [],
    });

    fireEvent.click(screen.getByText('Next')); // to register config
    fireEvent.click(screen.getByText('Next')); // to data reader

    // Now set validation to fail for submission
    (validateDeviceForm as jest.Mock).mockReturnValue({
      isValid: false,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: ['Parameter requires a name'],
      general: [],
    });

    // Submit the form
    fireEvent.click(screen.getByText('Save Device'));

    // onSubmit should NOT have been called
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Validation messages should be visible
    await waitFor(() => {
      expect(screen.getByTestId('validation-messages')).toBeInTheDocument();
    });
  });

  test('form loads initial data correctly', () => {
    const initialData = {
      name: 'Test Device',
      make: 'Test Make',
      model: 'Test Model',
      description: 'Test Description',
      enabled: true,
      tags: ['test'],
      connectionType: 'tcp',
      ip: '192.168.1.100',
      port: 502,
      slaveId: 1,
      registerRanges: [
        {
          rangeName: 'Holding Registers',
          startRegister: 0,
          length: 10,
          functionCode: 3,
        },
      ],
      parameterConfigs: [
        {
          name: 'Test Parameter',
          dataType: 'INT16',
          scalingFactor: 1,
          decimalPoint: 0,
          byteOrder: 'AB',
          registerRange: 'Holding Registers',
          registerIndex: 0,
          signed: true,
        },
      ],
    };

    render(
      <NewDeviceFormContainer
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialData={initialData}
        isEditing={true}
      />
    );

    // Should render with initial tab
    expect(screen.getByTestId('connection-settings')).toBeInTheDocument();

    // Navigate to final tab to trigger submission
    fireEvent.click(screen.getByText('Next')); // to register config
    fireEvent.click(screen.getByText('Next')); // to data reader

    // Submit to see if data is passed correctly
    fireEvent.click(screen.getByText('Save Device'));

    // Should call onSubmit with the data
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  test('cancel button calls onClose', () => {
    render(<NewDeviceFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
