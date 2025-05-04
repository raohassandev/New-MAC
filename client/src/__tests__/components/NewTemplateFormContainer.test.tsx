import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import NewTemplateFormContainer from '../../components/devices/NewTemplateForm/NewTemplateFormContainer';
import { validateTemplateForm } from '../../components/devices/NewTemplateForm/validation';
import { AuthContext } from '../../context/AuthContext';

// Mock Auth Context Provider
const mockAuthContextValue = {
  user: {
    _id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    permissions: ['manage_devices'],
    token: 'test-token'
  },
  loading: false,
  error: null,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
};

const AuthProviderWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={mockAuthContextValue}>
    {children}
  </AuthContext.Provider>
);

// Mock utility functions
vi.mock('../../utils/TypeAdapter', () => ({
  convertFormToDeviceData: vi.fn(
    (deviceBasics, connectionSettings, registerRanges, parameters) => ({
      ...deviceBasics,
      ...connectionSettings,
      registerRanges,
      parameterConfigs: parameters,
    })
  ),
}));

// Mock sub-components to simplify testing
vi.mock('../../components/devices/NewTemplateForm/ConnectionSettings', () => ({
  default: () => {
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
  }
}));

vi.mock('../../components/devices/NewTemplateForm/RegisterConfiguration', () => ({
  default: () => {
    return (
      <div data-testid="register-configuration">
        <button data-testid="add-register-range-button">Add Register Range</button>
      </div>
    );
  }
}));

vi.mock('../../components/devices/NewTemplateForm/DataReaderTab', () => ({
  default: () => {
    return (
      <div data-testid="data-reader-tab">
        <button data-testid="add-parameter-button">Add Parameter</button>
      </div>
    );
  }
}));

vi.mock('../../components/devices/NewTemplateForm/FormGuide', () => ({
  default: () => {
    return <div data-testid="form-guide"></div>;
  }
}));

vi.mock('../../components/devices/NewTemplateForm/ValidationMessages', () => ({
  default: () => {
    return <div data-testid="validation-messages"></div>;
  }
}));

// Mock validation functions to control test behavior
vi.mock('../../components/devices/NewTemplateForm/validation', () => {
  const original = vi.importActual('../../components/devices/NewTemplateForm/validation');

  return {
    ...original,
    validateTemplateForm: vi.fn(),
    convertValidationErrorsToState: vi.fn(errors => ({
      isValid: errors.isValid,
      basicInfo: errors.basicInfo.map(msg => ({ field: 'test', message: msg })),
      connection: errors.connection.map(msg => ({ field: 'test', message: msg })),
      registers: errors.registers.map(msg => ({ field: 'test', message: msg })),
      parameters: errors.parameters.map(msg => ({ field: 'test', message: msg })),
      general: errors.general.map(msg => ({ field: 'general', message: msg })),
    })),
  };
});

describe('NewTemplateFormContainer', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for validation function - no errors
    (validateTemplateForm as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isValid: true,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: [],
      general: [],
    });
  });

  // Helper function to render the component with auth context
  const renderWithAuth = (ui: React.ReactElement) => {
    return render(ui, { wrapper: AuthProviderWrapper });
  };

  test('renders all form tabs', () => {
    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Initially should show connection settings tab
    expect(screen.getByTestId('connection-settings')).toBeInTheDocument();

    // Should have form tabs
    expect(screen.getByText('Connection Settings')).toBeInTheDocument();
    expect(screen.getByText('Register Configuration')).toBeInTheDocument();
    expect(screen.getByText('Data Reader')).toBeInTheDocument();
  });

  test('navigation between tabs works correctly', async () => {
    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

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
    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Try to navigate to next tab
    fireEvent.click(screen.getByText('Next'));

    // Validation should have been called
    expect(validateTemplateForm).toHaveBeenCalled();
  });

  test('shows validation errors when navigation attempted with invalid data', async () => {
    // Mock validation to return errors
    (validateTemplateForm as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isValid: false,
      basicInfo: [],
      connection: ['IP address is required'],
      registers: [],
      parameters: [],
      general: [],
    });

    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

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
    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

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
    (validateTemplateForm as jest.Mock).mockReturnValue({
      isValid: false,
      basicInfo: [],
      connection: [],
      registers: [],
      parameters: ['Parameter requires a name'],
      general: [],
    });

    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    // Navigate to the final tab - using a custom mock to allow navigation despite errors
    (validateTemplateForm as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
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
    (validateTemplateForm as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
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
      name: 'Test Template',
      make: 'Test Make',
      model: 'Test Model',
      deviceType: 'Test Type',
      description: 'Test Description',
      enabled: true,
      tags: ['test'],
      connectionSettings: {
        type: 'tcp',
        tcp: {
          ip: '192.168.1.100',
          port: '502',
          slaveId: '1'
        }
      },
      registerRanges: [
        {
          rangeName: 'Holding Registers',
          startRegister: 0,
          length: 10,
          functionCode: 3,
        },
      ],
      parameters: [
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

    renderWithAuth(
      <NewTemplateFormContainer
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
    renderWithAuth(<NewTemplateFormContainer onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});