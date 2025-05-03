import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceFormProvider } from '../../components/devices/NewDeviceForm/DeviceFormContext';
import ConnectionSettings from '../../components/devices/NewDeviceForm/ConnectionSettings';
import { FormFieldRefsContext } from '../../components/devices/NewDeviceForm/FormFieldRefsContext';

// Mock UI components to simplify testing
jest.mock('../../components/ui/Input', () => ({
  Input: React.forwardRef(
    ({ id, name, value, onChange, placeholder, className, type = 'text' }, ref) => (
      <input
        data-testid={id}
        id={id}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        type={type}
        ref={ref}
      />
    )
  ),
}));

jest.mock('../../components/ui/Form', () => ({
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

// Create a mock FormFieldRefsContext provider
const createFieldRefs = () => {
  const refs = {
    name: React.createRef<HTMLInputElement>(),
    make: React.createRef<HTMLInputElement>(),
    model: React.createRef<HTMLInputElement>(),
    description: React.createRef<HTMLInputElement>(),
    connectionType: React.createRef<HTMLSelectElement>(),
    ip: React.createRef<HTMLInputElement>(),
    port: React.createRef<HTMLInputElement>(),
    slaveId: React.createRef<HTMLInputElement>(),
  };
  return { refs };
};

describe('ConnectionSettings', () => {
  // Test basic rendering
  test('renders device basics form fields', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceFormProvider>
          <ConnectionSettings />
        </DeviceFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if required fields are present
    expect(screen.getByTestId('name')).toBeInTheDocument();
    expect(screen.getByTestId('make')).toBeInTheDocument();
    expect(screen.getByTestId('model')).toBeInTheDocument();
    expect(screen.getByTestId('description')).toBeInTheDocument();

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
  });

  // Test TCP/IP settings
  test('renders TCP/IP connection settings when TCP is selected', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceFormProvider initialData={{ connectionSettings: { type: 'tcp' } }}>
          <ConnectionSettings />
        </DeviceFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if TCP specific fields are present
    expect(screen.getByTestId('ip')).toBeInTheDocument();
    expect(screen.getByTestId('port')).toBeInTheDocument();

    // RTU specific fields should not be present
    expect(screen.queryByTestId('serialPort')).not.toBeInTheDocument();
    expect(screen.queryByTestId('baudRate')).not.toBeInTheDocument();
  });

  // Test RTU settings
  test('renders RTU connection settings when RTU is selected', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceFormProvider initialData={{ connectionSettings: { type: 'rtu' } }}>
          <ConnectionSettings />
        </DeviceFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if RTU specific fields are present
    expect(screen.getByTestId('serialPort')).toBeInTheDocument();

    // TCP specific fields should not be present
    expect(screen.queryByTestId('ip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('port')).not.toBeInTheDocument();
  });

  // Test switching between connection types
  test('switches between TCP and RTU connection settings', () => {
    render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceFormProvider>
          <ConnectionSettings />
        </DeviceFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Initial state should be TCP
    expect(screen.getByTestId('ip')).toBeInTheDocument();

    // Find the connection type dropdown (using getElementsByTagName since we mocked select)
    const selectElement = document.getElementById('connectionType') as HTMLSelectElement;

    // Change to RTU
    fireEvent.change(selectElement, { target: { value: 'rtu' } });

    // Now RTU fields should be visible
    expect(screen.getByTestId('serialPort')).toBeInTheDocument();

    // TCP fields should be gone
    expect(screen.queryByTestId('ip')).not.toBeInTheDocument();

    // Change back to TCP
    fireEvent.change(selectElement, { target: { value: 'tcp' } });

    // TCP fields should be back
    expect(screen.getByTestId('ip')).toBeInTheDocument();
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
        <DeviceFormProvider initialData={{ validationState }}>
          <ConnectionSettings />
        </DeviceFormProvider>
      </FormFieldRefsContext.Provider>
    );

    // Check if error messages are displayed
    expect(screen.getByText('Device name is required')).toBeInTheDocument();
    expect(screen.getByText('IP address is required')).toBeInTheDocument();
  });

  // Test input changes update the form state
  test('updates form state when inputs change', () => {
    const { container } = render(
      <FormFieldRefsContext.Provider value={createFieldRefs()}>
        <DeviceFormProvider>
          <ConnectionSettings />
        </DeviceFormProvider>
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
