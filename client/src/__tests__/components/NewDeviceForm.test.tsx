import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { DeviceFormProvider } from '../../components/devices/NewDeviceForm/DeviceformContext';
import DataReaderTab from '../../components/devices/NewDeviceForm/DataReaderTab';
import ParameterEditor from '../../components/devices/NewDeviceForm/ParameterEditor';
import { validateParameters } from '../../components/devices/NewDeviceForm/validation';
import { RegisterRange, ParameterConfig } from '../../types/form.types';

// Mock the UI components
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

// Test register ranges
const mockRegisterRanges: RegisterRange[] = [
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

// Sample parameter with valid data
const validParam: ParameterConfig = {
  name: 'Test Parameter',
  dataType: 'INT16',
  scalingFactor: 1,
  decimalPoint: 0,
  byteOrder: 'AB',
  registerRange: 'Holding Registers',
  registerIndex: 0,
  signed: true,
};

describe('NewDeviceForm Parameter Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('validateParameters function', () => {
    test('should validate parameter with valid data', () => {
      const errors = validateParameters([validParam], mockRegisterRanges);
      expect(Object.keys(errors).length).toBe(0);
    });

    test('should detect duplicate parameter names', () => {
      const params = [validParam, { ...validParam, name: 'Test Parameter', registerIndex: 1 }];
      const errors = validateParameters(params, mockRegisterRanges);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(Object.values(errors).some(msg => msg.includes('already used'))).toBe(true);
    });

    test('should detect register index out of range', () => {
      const param = { ...validParam, registerIndex: 15 };
      const errors = validateParameters([param], mockRegisterRanges);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(Object.values(errors).some(msg => msg.includes('exceeds range'))).toBe(true);
    });

    test('should detect register overlap for multi-register types', () => {
      const params = [
        { ...validParam, dataType: 'FLOAT32', registerIndex: 0, byteOrder: 'ABCD' },
        { ...validParam, name: 'Second Parameter', dataType: 'INT16', registerIndex: 1 },
      ];
      const errors = validateParameters(params, mockRegisterRanges);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(Object.values(errors).some(msg => msg.includes('overlap'))).toBe(true);
    });

    test('should allow bit parameters to share the same register with different bit positions', () => {
      const params = [
        { ...validParam, dataType: 'BOOLEAN', registerIndex: 0, bitPosition: 0 },
        { ...validParam, name: 'Bit 1', dataType: 'BOOLEAN', registerIndex: 0, bitPosition: 1 },
      ];
      const errors = validateParameters(params, mockRegisterRanges);
      expect(Object.keys(errors).length).toBe(0);
    });

    test('should reject bit parameters with the same register and bit position', () => {
      const params = [
        { ...validParam, dataType: 'BOOLEAN', registerIndex: 0, bitPosition: 0 },
        {
          ...validParam,
          name: 'Bit Duplicate',
          dataType: 'BOOLEAN',
          registerIndex: 0,
          bitPosition: 0,
        },
      ];
      const errors = validateParameters(params, mockRegisterRanges);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    test('should validate byte order based on data type', () => {
      // 16-bit type with 32-bit byte order
      const param = { ...validParam, byteOrder: 'ABCD' };
      const errors = validateParameters([param], mockRegisterRanges);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(Object.values(errors).some(msg => msg.includes('byte order'))).toBe(true);
    });

    test('should validate 32-bit types require proper byte order', () => {
      // 32-bit type with 16-bit byte order
      const param = { ...validParam, dataType: 'FLOAT32', byteOrder: 'AB' };
      const errors = validateParameters([param], mockRegisterRanges);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(Object.values(errors).some(msg => msg.includes('byte order'))).toBe(true);
    });
  });

  describe('DataReaderTab validation', () => {
    // Since DataReaderTab has complex dependencies, we'll create a simplified test
    // Just to ensure the component renders and basic interactions work
    test('should render with no parameters', () => {
      const { container } = render(
        <DeviceFormProvider initialData={{ registerRanges: mockRegisterRanges }}>
          <DataReaderTab />
        </DeviceFormProvider>
      );
      expect(container).toBeInTheDocument();
    });
  });
});
