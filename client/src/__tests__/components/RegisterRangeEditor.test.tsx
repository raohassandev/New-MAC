import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import RegisterRangeEditor from '../../components/devices/NewDeviceForm/RegisterRangeEditor';
import { RegisterRange } from '../../types/form.types';

// Mock UI components for testing
vi.mock('../../components/ui/Input', () => ({
  Input: ({
    id,
    name,
    value,
    onChange,
    error,
    placeholder,
    type,
  }: {
    id: string;
    name: string;
    value: any;
    onChange: (e: any) => void;
    error?: string;
    placeholder?: string;
    type?: string;
  }) => (
    <div>
      <input
        data-testid={id}
        id={id}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        type={type || 'text'}
      />
      {error && (
        <div data-testid={`${id}-error`} className="error">
          {error}
        </div>
      )}
    </div>
  ),
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    type,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      type={type || 'button'}
      data-testid={`button-${children?.toString()?.toLowerCase()?.replace(/\s+/g, '-')}`}
    >
      {children}
    </button>
  ),
}));

vi.mock('../../components/ui/Form', () => ({
  Form: ({ children, onSubmit }: { children: React.ReactNode; onSubmit?: (e: any) => void }) => (
    <form onSubmit={onSubmit} data-testid="register-range-form">
      {children}
    </form>
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
      {required && <span data-testid="required-mark">*</span>}
    </label>
  ),
  Row: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-row">{children}</div>
  ),
  Actions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-actions">{children}</div>
  ),
}));

// Sample register range for testing
const sampleRegisterRange: RegisterRange = {
  rangeName: 'Test Range',
  startRegister: 0,
  length: 10,
  functionCode: 3,
};

describe('RegisterRangeEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test initial render with no data
  test('renders with default values when no initial data provided', () => {
    render(<RegisterRangeEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Check form fields are present with default values
    expect(screen.getByTestId('rangeName')).toHaveValue('');
    expect(screen.getByTestId('startRegister')).toHaveValue('0');
    expect(screen.getByTestId('length')).toHaveValue('1');

    // Check buttons
    expect(screen.getByTestId('button-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('button-add-range')).toBeInTheDocument();
  });

  // Test initial render with provided data
  test('renders with initial data when provided', () => {
    render(
      <RegisterRangeEditor
        initialData={sampleRegisterRange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Check form fields have the initial values
    expect(screen.getByTestId('rangeName')).toHaveValue('Test Range');
    expect(screen.getByTestId('startRegister')).toHaveValue('0');
    expect(screen.getByTestId('length')).toHaveValue('10');

    // Check button text for editing mode
    expect(screen.getByTestId('button-update-range')).toBeInTheDocument();
  });

  // Test validation prevents submission with invalid data
  test('validates form data before submission', async () => {
    render(<RegisterRangeEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Clear the range name (required field)
    const rangeNameInput = screen.getByTestId('rangeName');
    fireEvent.change(rangeNameInput, { target: { value: '' } });

    // Set invalid values
    const lengthInput = screen.getByTestId('length');
    fireEvent.change(lengthInput, { target: { value: '0' } });

    // Try to submit
    const form = screen.getByTestId('register-range-form');
    fireEvent.submit(form);

    // onSave should not have been called due to validation errors
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fix the validation errors
    fireEvent.change(rangeNameInput, { target: { value: 'Fixed Name' } });
    fireEvent.change(lengthInput, { target: { value: '5' } });

    // Submit again
    fireEvent.submit(form);

    // Now onSave should be called
    expect(mockOnSave).toHaveBeenCalled();
  });

  // Test cancel button
  test('calls onCancel when cancel button is clicked', () => {
    render(<RegisterRangeEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByTestId('button-cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  // Test form field changes
  test('updates form state when inputs change', () => {
    render(<RegisterRangeEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Change form fields
    const rangeNameInput = screen.getByTestId('rangeName');
    const startRegisterInput = screen.getByTestId('startRegister');
    const lengthInput = screen.getByTestId('length');

    fireEvent.change(rangeNameInput, { target: { value: 'New Range Name' } });
    fireEvent.change(startRegisterInput, { target: { value: '100' } });
    fireEvent.change(lengthInput, { target: { value: '20' } });

    // Submit form
    const form = screen.getByTestId('register-range-form');
    fireEvent.submit(form);

    // Check if onSave was called with updated values
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rangeName: 'New Range Name',
        startRegister: 100,
        length: 20,
      })
    );
  });

  // Test function code selection
  test('allows selecting different function codes', () => {
    render(<RegisterRangeEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Find function code select - since we've mocked it, need to get directly from DOM
    const functionCodeSelect = document.getElementById('functionCode') as HTMLSelectElement;

    // Change to function code 1
    fireEvent.change(functionCodeSelect, { target: { value: '1' } });

    // Submit form
    const form = screen.getByTestId('register-range-form');
    fireEvent.submit(form);

    // Check if onSave was called with updated function code
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        functionCode: 1,
      })
    );
  });
});
