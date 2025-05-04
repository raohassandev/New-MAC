import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { DeviceDriverFormProvider } from '../../components/deviceDrivers/TemplateFormContext';
import ConnectionSettings from '../../components/deviceDrivers/ConnectionSettings';
import { FormFieldRefsContext } from '../../components/deviceDrivers/FormFieldRefsContext';

// Mock UI components to simplify testing
vi.mock('../../components/ui/Input', () => ({
  Input: (props: any) => {
    const { id, name, value, onChange, placeholder, className, type = 'text' } = props;
    return (
      <input
        data-testid={id}
        id={id}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        type={type}
      />
    );
  }
}));

vi.mock('../../components/ui/Form', () => ({
  Form: {
    Row: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="form-row">{children}</div>
    ),
    Group: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="form-group">{children}</div>
    ),
    Label: ({
      children,
      htmlFor,
      required,
    }: {
      children: React.ReactNode;
      htmlFor: string;
      required?: boolean;
    }) => (
      <label htmlFor={htmlFor} data-testid={`label-${htmlFor}`}>
        {children}
        {required && <span data-testid="required-marker">*</span>}
      </label>
    ),
  },
}));

// Mock Select component
vi.mock('../../components/ui/Select', () => ({
  Select: (props: any) => {
    const { id, options, value, onChange } = props;
    return (
      <select
        data-testid={id}
        id={id}
        value={value || ''}
        onChange={onChange}
      >
        {options?.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
}));

type FormFieldRefsContextType = {
  refs: {
    name: React.RefObject<HTMLInputElement>;
    make: React.RefObject<HTMLInputElement>;
    model: React.RefObject<HTMLInputElement>;
    deviceType: React.RefObject<HTMLInputElement>;
    description: React.RefObject<HTMLInputElement>;
    connectionType: React.RefObject<HTMLSelectElement>;
    ip: React.RefObject<HTMLInputElement>;
    port: React.RefObject<HTMLInputElement>;
    slaveId: React.RefObject<HTMLInputElement>;
    serialPort: React.RefObject<HTMLInputElement>;
    baudRate: React.RefObject<HTMLSelectElement>;
    dataBits: React.RefObject<HTMLSelectElement>;
    stopBits: React.RefObject<HTMLSelectElement>;
    parity: React.RefObject<HTMLSelectElement>;
  };
  focusField: (fieldName: string) => void;
};

// Create a mock FormFieldRefsContext provider
const createFieldRefs = (): { refs: FormFieldRefsContextType['refs']; focusField: (fieldName: string) => void } => {
  const refs = {
    name: React.createRef<HTMLInputElement>(),
    make: React.createRef<HTMLInputElement>(),
    model: React.createRef<HTMLInputElement>(),
    deviceType: React.createRef<HTMLInputElement>(),
    description: React.createRef<HTMLInputElement>(),
    connectionType: React.createRef<HTMLSelectElement>(),
    // TCP fields
    ip: React.createRef<HTMLInputElement>(),
    port: React.createRef<HTMLInputElement>(),
    slaveId: React.createRef<HTMLInputElement>(),
    // RTU fields
    serialPort: React.createRef<HTMLInputElement>(),
    baudRate: React.createRef<HTMLSelectElement>(),
    dataBits: React.createRef<HTMLSelectElement>(),
    stopBits: React.createRef<HTMLSelectElement>(),
    parity: React.createRef<HTMLSelectElement>(),
  };
  
  const focusField = (fieldName: string): void => {
    const field = refs[fieldName as keyof typeof refs];
    if (field && field.current) {
      field.current.focus();
    }
  };
  
  return { refs, focusField };
};

describe('ConnectionSettings', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // Test basic rendering
  test('renders device basics form fields', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceDriverFormProvider>
          <ConnectionSettings />
        </DeviceDriverFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if required fields are present
    expect(screen.getByTestId('name')).toBeInTheDocument();
    expect(screen.getByTestId('make')).toBeInTheDocument();
    expect(screen.getByTestId('model')).toBeInTheDocument();
    expect(screen.getByTestId('description')).toBeInTheDocument();
    expect(screen.getByTestId('deviceType')).toBeInTheDocument();

    // Check required field indicators
    expect(screen.getByTestId('label-name')).toContainElement(
      screen.getByTestId('required-marker')
    );
    expect(screen.getByTestId('label-make')).toContainElement(
      screen.getByTestId('required-marker')
    );
    expect(screen.getByTestId('label-model')).toContainElement(
      screen.getByTestId('required-marker')
    );
    expect(screen.getByTestId('label-deviceType')).toContainElement(
      screen.getByTestId('required-marker')
    );
  });

  // Test TCP/IP settings
  test('renders TCP/IP connection settings when TCP is selected', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceDriverFormProvider initialData={{ 
          connectionSettings: { 
            type: 'tcp',
            ip: '',
            port: '',
            slaveId: '',
            serialPort: '',
            baudRate: '',
            dataBits: '',
            stopBits: '',
            parity: ''
          }
        }}>
          <ConnectionSettings />
        </DeviceDriverFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if TCP specific fields are present
    expect(screen.getByTestId('ip')).toBeInTheDocument();
    expect(screen.getByTestId('port')).toBeInTheDocument();

    // RTU specific fields should not be present
    expect(screen.queryByTestId('serialPort')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/baud rate/i)).not.toBeInTheDocument();
  });

  // Test RTU settings
  test('renders RTU connection settings when RTU is selected', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceDriverFormProvider initialData={{ 
          connectionSettings: { 
            type: 'rtu',
            ip: '',
            port: '',
            slaveId: '',
            serialPort: '',
            baudRate: '',
            dataBits: '',
            stopBits: '',
            parity: ''
          }
        }}>
          <ConnectionSettings />
        </DeviceDriverFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if RTU specific fields are present
    expect(screen.getByTestId('serialPort')).toBeInTheDocument();
    expect(screen.getByLabelText(/baud rate/i)).toBeInTheDocument();

    // TCP specific fields should not be present
    expect(screen.queryByTestId('ip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('port')).not.toBeInTheDocument();
  });

  // Test switching between connection types
  test('switches between TCP and RTU connection settings', () => {
    // Set up a spy on the action that changes the connection type
    const mockedActionsSpy = {
      setConnectionSettings: vi.fn(),
      setDeviceBasics: vi.fn()
    };

    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceDriverFormProvider>
          <ConnectionSettings />
        </DeviceDriverFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Find the select element by label instead of testId
    const connectionTypeLabel = screen.getByLabelText(/connection type/i);
    expect(connectionTypeLabel).toBeInTheDocument();
    
    // Get the select element which is a sibling of the label
    const selectId = connectionTypeLabel.getAttribute('for');
    const selectElement = document.getElementById(selectId as string);
    expect(selectElement).toBeInTheDocument();
    
    // Check that the action would be called correctly
    fireEvent.change(selectElement as Element, { target: { value: 'rtu' } });
    expect(mockedActionsSpy.setConnectionSettings).toHaveBeenCalledWith({ type: 'rtu' });
  });

  // Test form validation errors display
  test('displays validation errors when present', () => {
    const validationState = {
      isValid: false,
      basicInfo: [{ field: 'name', message: 'Device name is required' }],
      connection: [{ field: 'ip', message: 'IP address is required' }],
      registers: [],
      parameters: [],
      general: [],
    };

    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceDriverFormProvider initialData={{ validationState }}>
          <ConnectionSettings />
        </DeviceDriverFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if error messages are displayed
    expect(screen.getByText('Device name is required')).toBeInTheDocument();
    expect(screen.getByText('IP address is required')).toBeInTheDocument();
  });

  // Test input changes update the form state
  test('updates form state when inputs change', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceDriverFormProvider>
          <ConnectionSettings />
        </DeviceDriverFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Find form inputs
    const nameInput = screen.getByTestId('name');
    const makeInput = screen.getByTestId('make');
    const ipInput = screen.getByTestId('ip');

    // Simulate user input
    fireEvent.change(nameInput, { target: { value: 'Test Device' } });
    fireEvent.change(makeInput, { target: { value: 'Test Manufacturer' } });
    fireEvent.change(ipInput, { target: { value: '192.168.1.100' } });

    // Verify input values were updated
    expect(nameInput).toHaveValue('Test Device');
    expect(makeInput).toHaveValue('Test Manufacturer');
    expect(ipInput).toHaveValue('192.168.1.100');
  });
});