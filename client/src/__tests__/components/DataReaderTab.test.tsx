import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { TemplateFormProvider } from '../../components/templates/TemplateFormContext';
import DataReaderTab from '../../components/templates/DataReaderTab';
import { RegisterRange } from '../../types/form.types';

// Mock the UI components to simplify testing
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('../../components/ui/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

vi.mock('../../components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}));

// Mock the ParameterEditor component to simplify testing
vi.mock('../../components/templates/ParameterEditor', () => ({
  default: ({ onSave }: { onSave: (param: any) => void }) => {
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
              wordCount: 1,  // Added wordCount for new structure
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
              wordCount: 1, // Added wordCount for new structure
            })
          }
        >
          Save Duplicate Parameter
        </button>
      </div>
    );
  }
}));

// Test register ranges
const mockRegisterRanges: RegisterRange[] = [
  {
    rangeName: 'Holding Registers',
    startRegister: 0,
    length: 10,
    functionCode: 3,
  },
];

// Create a dataPoints array with the new structure
const dataPoints = [
  {
    range: {
      startAddress: 0,
      count: 10,
      fc: 3,
    },
    parser: {
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
          wordCount: 1,
        }
      ]
    }
  }
];

// Sample initial form state with updated structure
const initialFormState = {
  registerRanges: mockRegisterRanges,
  dataPoints: dataPoints,
  connectionSettings: {
    connectionType: 'tcp',
    tcp: {
      ip: '192.168.1.100',
      port: 502,
      slaveId: 1
    }
  }
};

describe('DataReaderTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render with no parameters', () => {
    const { container } = render(
      <TemplateFormProvider initialData={{ 
        registerRanges: mockRegisterRanges,
        connectionSettings: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.100',
            port: 502,
            slaveId: 1
          }
        }
      }}>
        <DataReaderTab />
      </TemplateFormProvider>
    );
    expect(container).toBeInTheDocument();
  });

  test('should show message when no register ranges', () => {
    render(
      <TemplateFormProvider initialData={{
        connectionSettings: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.100',
            port: 502,
            slaveId: 1
          }
        }
      }}>
        <DataReaderTab />
      </TemplateFormProvider>
    );
    expect(screen.getByText(/register ranges required/i)).toBeInTheDocument();
  });

  test('should show error when adding parameter with duplicate register index', async () => {
    render(
      <TemplateFormProvider initialData={initialFormState}>
        <DataReaderTab />
      </TemplateFormProvider>
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
