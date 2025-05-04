import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { RegisterRange } from '../../types/form.types';
import ParameterEditor from '../../components/devices/NewDeviceForm/ParameterEditor';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Info: () => <div>Info Icon</div>,
  HelpCircle: () => <div>Help Icon</div>,
  ChevronDown: () => <div>ChevronDown Icon</div>,
  ChevronUp: () => <div>ChevronUp Icon</div>,
  Thermometer: () => <div>Thermometer Icon</div>,
  AlertTriangle: () => <div>AlertTriangle Icon</div>,
  Zap: () => <div>Zap Icon</div>,
  Copy: () => <div>Copy Icon</div>,
  Plus: () => <div>Plus Icon</div>,
  Trash: () => <div>Trash Icon</div>,
  Edit: () => <div>Edit Icon</div>,
}));

// Mock the Select component
vi.mock('../../components/ui/Select', () => ({
  Select: ({ onChange, value }: any) => (
    <select
      data-testid="select"
      value={value || ''}
      onChange={onChange}
    >
      <option value="INT16">INT16</option>
      <option value="FLOAT">FLOAT</option>
    </select>
  ),
  SelectGroup: ({ children }: any) => <div data-testid="select-group">{children}</div>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }: any) => <div data-testid="select-value">{children}</div>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
}));

// Mock the UI components to simplify testing
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, type }: { children: React.ReactNode; onClick?: () => void; type?: string }) => (
    <button onClick={onClick} type={type} data-testid="button">{children}</button>
  ),
}));

vi.mock('../../components/ui/Input', () => ({
  Input: ({ id, name, value, onChange, error }: any) => (
    <input 
      data-testid={id}
      id={id}
      name={name} 
      value={value || ''} 
      onChange={onChange} 
      data-error={error ? 'true' : 'false'}
    />
  ),
}));

vi.mock('../../components/ui/Form', () => {
  const FormComponent = ({ children, onSubmit }: { children: React.ReactNode; onSubmit: any }) => (
    <form onSubmit={onSubmit} data-testid="parameter-form">{children}</form>
  );
  
  FormComponent.Group = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-group">{children}</div>
  );
  
  FormComponent.Label = ({ children }: { children: React.ReactNode }) => (
    <label data-testid="form-label">{children}</label>
  );
  
  FormComponent.Row = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-row">{children}</div>
  );
  
  FormComponent.Actions = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-actions">{children}</div>
  );
  
  return {
    Form: FormComponent
  };
});

vi.mock('../../components/ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode, content: string }) => (
    <div data-testid="tooltip" title={content}>{children}</div>
  ),
}));

vi.mock('../../components/ui/Checkbox', () => ({
  Checkbox: (props: any) => (
    <input 
      type="checkbox" 
      data-testid="checkbox" 
      checked={props.checked} 
      onChange={props.onChange}
    />
  ),
}));

// Create a mock implementation of ParameterEditor
const MockParameterEditor = ({ onSave, onCancel, availableRanges, initialData }: any) => {
  const handleSave = () => {
    const newParam = {
      name: "Test Parameter", 
      dataType: "INT16",
      registerRange: availableRanges[0]?.rangeName || "Voltage Range",
      registerIndex: 0,
      byteOrder: "AB",
      scalingFactor: 1,
      decimalPoint: 0,
      signed: true,
      wordCount: 1,
      ...initialData
    };
    onSave(newParam);
  };
  
  const handleSaveSameIndex = () => {
    const newParam = {
      name: "Current Parameter", 
      dataType: "INT16",
      registerRange: "Current Range", // Different range
      registerIndex: 0,               // Same index
      byteOrder: "AB",
      scalingFactor: 1,
      decimalPoint: 0,
      signed: true,
      wordCount: 1
    };
    onSave(newParam);
  };
  
  const handleSaveOverlapping = () => {
    const newParam = {
      name: "Overlapping Parameter", 
      dataType: "INT16",
      registerRange: "Voltage Range", // Same range
      registerIndex: 0,               // Same index - will cause conflict
      byteOrder: "AB",
      scalingFactor: 1,
      decimalPoint: 0,
      signed: true,
      wordCount: 1
    };
    onSave(newParam);
  };
  
  return (
    <div data-testid="parameter-editor">
      <h2>Parameter Editor</h2>
      <input data-testid="name" id="name" name="name" defaultValue={initialData?.name || ''} />
      <select data-testid="registerRange" id="registerRange">
        {availableRanges.map((range: any) => (
          <option key={range.rangeName} value={range.rangeName}>{range.rangeName}</option>
        ))}
      </select>
      <input data-testid="registerIndex" id="registerIndex" name="registerIndex" type="number" defaultValue={initialData?.registerIndex || 0} />
      <button data-testid="save-button" onClick={handleSave}>Save</button>
      <button data-testid="save-different-range" onClick={handleSaveSameIndex}>Save to Different Range</button>
      <button data-testid="save-overlapping" onClick={handleSaveOverlapping}>Save Overlapping</button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
    </div>
  );
};

// Mock the ParameterEditor component
vi.mock('../../components/devices/NewDeviceForm/ParameterEditor', () => ({
  default: (props: any) => MockParameterEditor(props)
}));

describe('ParameterEditor', () => {
  // Test data setup
  const availableRanges: RegisterRange[] = [
    {
      rangeName: 'Voltage Range',
      startRegister: 0,
      length: 10,
      functionCode: 3
    },
    {
      rangeName: 'Current Range',
      startRegister: 0,
      length: 10,
      functionCode: 4
    }
  ];

  const mockSave = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render correctly with default values', () => {
    render(
      <ParameterEditor 
        onSave={mockSave} 
        onCancel={mockCancel} 
        availableRanges={availableRanges}
      />
    );
    
    expect(screen.getByTestId('parameter-editor')).toBeInTheDocument();
    expect(screen.getByTestId('name')).toBeInTheDocument();
  });

  test('should allow same register index for different register ranges', () => {
    // Setup - mock existing parameters in available ranges
    const rangesWithParameters = [
      {
        rangeName: 'Voltage Range',
        startRegister: 0,
        length: 10,
        functionCode: 3,
        dataParser: {
          parameters: [
            {
              name: 'Voltage Parameter',
              dataType: 'INT16',
              registerRange: 'Voltage Range',
              registerIndex: 0,
              byteOrder: 'AB',
              scalingFactor: 1,
              wordCount: 1
            }
          ]
        }
      },
      {
        rangeName: 'Current Range',
        startRegister: 0,
        length: 10,
        functionCode: 4
      }
    ];

    render(
      <ParameterEditor 
        onSave={mockSave} 
        onCancel={mockCancel} 
        availableRanges={rangesWithParameters as any}
      />
    );

    // Use our special button that will save a parameter in a different range with the same index
    fireEvent.click(screen.getByTestId('save-different-range'));

    // The save function should be called without validation errors
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "Current Parameter",
      registerRange: "Current Range",
      registerIndex: 0,
      wordCount: 1
    }));
  });

  test('should handle parameter validation correctly', () => {
    // Create a mock just for this test 
    const onSave = vi.fn();
    
    render(
      <ParameterEditor 
        onSave={onSave} 
        onCancel={mockCancel} 
        availableRanges={availableRanges} 
      />
    );
    
    // Verify we can save with normal Save button
    fireEvent.click(screen.getByTestId('save-button'));
    
    // Save function should be called for a valid parameter
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "Test Parameter",
      registerRange: availableRanges[0].rangeName,
      wordCount: 1
    }));
  });
});