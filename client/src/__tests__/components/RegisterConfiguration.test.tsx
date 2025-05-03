import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { DeviceFormProvider } from '../../components/devices/NewDeviceForm/DeviceformContext';
import RegisterConfiguration from '../../components/devices/NewDeviceForm/RegisterConfiguration';
import { RegisterRange } from '../../types/form.types';

// Mock UI components for testing
vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    size,
    variant,
    icon,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    size?: string;
    variant?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-${children?.toString()?.toLowerCase()?.replace(/\s+/g, '-')}`}
    >
      {icon && <span data-testid="button-icon"></span>}
      {children}
    </button>
  ),
}));

// Mock RegisterRangeEditor component
vi.mock('../../components/devices/NewDeviceForm/RegisterRangeEditor', () => ({
  default: ({
    initialData,
    onSave,
    onCancel,
  }: {
    initialData?: any;
    onSave: (range: any) => void;
    onCancel: () => void;
  }) => {
    const handleSaveClick = () => {
      const newRange = initialData || {
        rangeName: 'Test Range',
        startRegister: 0,
        length: 10,
        functionCode: 3,
      };
      onSave(newRange);
    };

    return (
      <div data-testid="register-range-editor">
        <input data-testid="range-name-input" defaultValue={initialData?.rangeName || ''} />
        <button data-testid="save-range-button" onClick={handleSaveClick}>
          {initialData ? 'Update Range' : 'Add Range'}
        </button>
        <button data-testid="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Trash: () => <span data-testid="trash-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  ChevronUp: () => <span data-testid="chevron-up-icon" />,
}));

// Sample register ranges for testing
const sampleRegisterRanges: RegisterRange[] = [
  {
    rangeName: 'Holding Registers',
    startRegister: 0,
    length: 10,
    functionCode: 3,
  },
  {
    rangeName: 'Input Registers',
    startRegister: 100,
    length: 20,
    functionCode: 4,
  },
];

describe('RegisterConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // Test initial render with no ranges
  test('renders empty state when no register ranges exist', () => {
    render(
      <DeviceFormProvider>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Should show empty state message
    expect(screen.getByText('No register ranges defined yet.')).toBeInTheDocument();

    // Add range button should be visible
    expect(screen.getByTestId('button-add-range')).toBeInTheDocument();
  });

  // Test with existing ranges
  test('renders existing register ranges', () => {
    render(
      <DeviceFormProvider initialData={{ registerRanges: sampleRegisterRanges }}>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Should show all range names
    expect(screen.getByText('Holding Registers')).toBeInTheDocument();
    expect(screen.getByText('Input Registers')).toBeInTheDocument();

    // Should show register details
    expect(screen.getByText('Start: 0, Length: 10, FC: 3')).toBeInTheDocument();
    expect(screen.getByText('Start: 100, Length: 20, FC: 4')).toBeInTheDocument();
  });

  // Test adding a new range
  test('allows adding a new register range', async () => {
    render(
      <DeviceFormProvider>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Initially no ranges
    expect(screen.getByText('No register ranges defined yet.')).toBeInTheDocument();

    // Click the "Add Range" button
    fireEvent.click(screen.getByTestId('button-add-range'));

    // Register range editor should be displayed
    expect(screen.getByTestId('register-range-editor')).toBeInTheDocument();

    // Click save button to add the range
    fireEvent.click(screen.getByTestId('save-range-button'));

    // New range should now be visible
    await waitFor(() => {
      expect(screen.getByText('Test Range')).toBeInTheDocument();
    });

    // Should show register details
    expect(screen.getByText('Start: 0, Length: 10, FC: 3')).toBeInTheDocument();
  });

  // Test editing a range
  test('allows editing an existing register range', async () => {
    render(
      <DeviceFormProvider initialData={{ registerRanges: sampleRegisterRanges }}>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Find and click edit button on first range
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Register range editor should be displayed with existing data
    expect(screen.getByTestId('register-range-editor')).toBeInTheDocument();

    // Click save button to update the range
    fireEvent.click(screen.getByTestId('save-range-button'));

    // Range should still be visible (since we're just updating with same data in the mock)
    await waitFor(() => {
      expect(screen.getByText('Holding Registers')).toBeInTheDocument();
    });
  });

  // Test deleting a range
  test('allows deleting a register range', async () => {
    render(
      <DeviceFormProvider initialData={{ registerRanges: sampleRegisterRanges }}>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Initially should have 2 ranges
    expect(screen.getByText('Holding Registers')).toBeInTheDocument();
    expect(screen.getByText('Input Registers')).toBeInTheDocument();

    // Find and click delete button on first range
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // First range should be gone, second should remain
    await waitFor(() => {
      expect(screen.queryByText('Holding Registers')).not.toBeInTheDocument();
      expect(screen.getByText('Input Registers')).toBeInTheDocument();
    });
  });

  // Test expanding/collapsing a range
  test('allows expanding and collapsing a register range', async () => {
    render(
      <DeviceFormProvider initialData={{ registerRanges: sampleRegisterRanges }}>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Initially ranges are collapsed
    expect(screen.queryByTestId('register-range-editor')).not.toBeInTheDocument();

    // Click on the first range to expand it
    fireEvent.click(screen.getByText('Holding Registers'));

    // Should show editor
    await waitFor(() => {
      expect(screen.getByTestId('register-range-editor')).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(screen.getByText('Holding Registers'));

    // Editor should be gone
    await waitFor(() => {
      expect(screen.queryByTestId('register-range-editor')).not.toBeInTheDocument();
    });
  });

  // Test canceling add/edit operations
  test('cancels add operation correctly', async () => {
    render(
      <DeviceFormProvider>
        <RegisterConfiguration />
      </DeviceFormProvider>
    );

    // Click add range
    fireEvent.click(screen.getByTestId('button-add-range'));

    // Range editor should be visible
    expect(screen.getByTestId('register-range-editor')).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByTestId('cancel-button'));

    // Range editor should be gone and no range added
    await waitFor(() => {
      expect(screen.queryByTestId('register-range-editor')).not.toBeInTheDocument();
      expect(screen.getByText('No register ranges defined yet.')).toBeInTheDocument();
    });
  });
});
