// client/src/components/devices/NewTemplateForm/RegisterRangeEditor.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Form } from '../../ui/Form';
import { RegisterRange } from './types/form.types';

// Custom Select component
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  options: SelectOption[];
}

const Select: React.FC<SelectProps> = ({ id, value, onChange, options, error }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <select
      id={id}
      value={value}
      onChange={handleChange}
      className={`block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm ${
        error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''
      }`}
    >
      {options.map(option => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

interface RegisterRangeEditorProps {
  initialData?: RegisterRange;
  onSave: (range: RegisterRange) => void;
  onCancel: () => void;
}

const TemplateRegisterRangeEditor: React.FC<RegisterRangeEditorProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [range, setRange] = useState<RegisterRange>(
    initialData || {
      rangeName: '',
      startRegister: 0,
      length: 1,
      functionCode: 3, // Default function code (Read Holding Registers)
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setRange(initialData);
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let parsedValue: string | number = value;
    if (name === 'startRegister' || name === 'length' || name === 'functionCode') {
      parsedValue = parseInt(value, 10) || 0;
    }

    setRange(prev => ({
      ...prev,
      [name]: parsedValue,
    }));

    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFunctionCodeChange = (value: string) => {
    setRange(prev => ({
      ...prev,
      functionCode: parseInt(value, 10) || 3,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!range.rangeName.trim()) {
      newErrors.rangeName = 'Range name is required';
    }

    if (range.startRegister < 0) {
      newErrors.startRegister = 'Start register must be a positive number';
    }

    if (range.length <= 0) {
      newErrors.length = 'Length must be greater than 0';
    }

    if (![1, 2, 3, 4].includes(range.functionCode)) {
      newErrors.functionCode = 'Invalid function code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSave(range);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group>
        <Form.Label htmlFor="rangeName" required>
          Template Range Name
        </Form.Label>
        <Input
          id="rangeName"
          name="rangeName"
          value={range.rangeName}
          onChange={handleInputChange}
          error={errors.rangeName}
          placeholder="e.g., Energy Measurements"
        />
      </Form.Group>

      <Form.Row>
        <Form.Group>
          <Form.Label htmlFor="startRegister" required>
            Start Register
          </Form.Label>
          <Input
            id="startRegister"
            name="startRegister"
            type="number"
            value={range.startRegister}
            onChange={handleInputChange}
            error={errors.startRegister}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label htmlFor="length" required>
            Length
          </Form.Label>
          <Input
            id="length"
            name="length"
            type="number"
            value={range.length}
            onChange={handleInputChange}
            error={errors.length}
          />
        </Form.Group>
      </Form.Row>

      <Form.Group>
        <Form.Label htmlFor="functionCode" required>
          Function Code
        </Form.Label>
        <Select
          id="functionCode"
          value={range.functionCode.toString()}
          onChange={handleFunctionCodeChange}
          error={errors.functionCode}
          options={[
            { value: '1', label: '1 - Read Coils' },
            { value: '2', label: '2 - Read Discrete Inputs' },
            { value: '3', label: '3 - Read Holding Registers' },
            { value: '4', label: '4 - Read Input Registers' },
          ]}
        />
        <p className="mt-1 text-xs text-gray-500">
          Select the appropriate Modbus function code for this template register range
        </p>
      </Form.Group>

      <Form.Actions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Update Template Range' : 'Add Template Range'}</Button>
      </Form.Actions>
    </Form>
  );
};

export default TemplateRegisterRangeEditor;