import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceFormProvider } from '../../components/devices/NewDeviceForm/DeviceFormContext';
import DataReaderTab from '../../components/devices/NewDeviceForm/DataReaderTab';
import { RegisterRange, ParameterConfig } from '../../types/form.types';

// Mock the UI components to simplify testing
jest.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('../../components/ui/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

jest.mock('../../components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}));

// Mock the ParameterEditor component to simplify testing
jest.mock('../../components/devices/NewDeviceForm/ParameterEditor', () => {
  return function MockParameterEditor({ onSave }: { onSave: (param: any) => void }) {
    return (
      <div data-testid="parameter-editor">
        <button
          data-testid="save-parameter-button"
          onClick={() =>
            onSave({
              name: 'Test Parameter',
              dataType: 'INT16',
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              registerRange: 'Holding Registers',
              registerIndex: 0,
              signed: true,
            })
          }
        >
          Save Parameter
        </button>
        <button
          data-testid="save-duplicate-parameter-button"
          onClick={() =>
            onSave({
              name: 'Duplicate Parameter',
              dataType: 'INT16',
              scalingFactor: 1,
              decimalPoint: 0,
              byteOrder: 'AB',
              registerRange: 'Holding Registers',
              // Same register index as first parameter, which should cause a validation error
              registerIndex: 0,
              signed: true,
            })
          }
        >
          Save Duplicate Parameter
        </button>
      </div>
    );
  };
});

// Test register ranges
const mockRegisterRanges: RegisterRange[] = [
  {
    rangeName: 'Holding Registers',
    startRegister: 0,
    length: 10,
    functionCode: 3,
  },
];

// Sample initial form state with one parameter already added
const initialFormState = {
  registerRanges: mockRegisterRanges,
  parameters: [
    {
      name: 'Existing Parameter',
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

describe('DataReaderTab', () => {
  test('should render with no parameters', () => {
    const { container } = render(
      <DeviceFormProvider initialData={{ registerRanges: mockRegisterRanges }}>
        <DataReaderTab />
      </DeviceFormProvider>
    );
    expect(container).toBeInTheDocument();
  });

  test('should show message when no register ranges', () => {
    render(
      <DeviceFormProvider>
        <DataReaderTab />
      </DeviceFormProvider>
    );
    expect(screen.getByText(/register ranges required/i)).toBeInTheDocument();
  });

  test('should show error when adding parameter with duplicate register index', () => {
    render(
      <DeviceFormProvider initialData={initialFormState}>
        <DataReaderTab />
      </DeviceFormProvider>
    );

    // Click to add a new parameter
    fireEvent.click(screen.getByText('Add Parameter'));

    // Should show Parameter Editor
    expect(screen.getByTestId('parameter-editor')).toBeInTheDocument();

    // Try to save a parameter with duplicate register index
    fireEvent.click(screen.getByTestId('save-duplicate-parameter-button'));

    // Should show error message about duplicate register
    expect(screen.getByText(/register conflict/i, { exact: false })).toBeInTheDocument();
  });
});
