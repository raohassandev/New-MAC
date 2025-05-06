// client/src/components/templates/ParameterEditor.tsx
import React, { useState, useEffect } from 'react';
import { Info, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Form } from '../ui/Form';
import { Tooltip } from '../ui/Tooltip';
import { Checkbox } from '../ui/Checkbox';
import { ParameterConfig, RegisterRange } from '../../types/form.types';
import { useTemplateForm } from './TemplateFormContext';

// Custom Select component
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  options: SelectOption[];
  className?: string;
}

const Select: React.FC<SelectProps> = ({ id, value, onChange, options, error, className }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  // Group options if they have a group property
  const groupedOptions: { [key: string]: SelectOption[] } = {};
  const ungroupedOptions: SelectOption[] = [];

  options.forEach(option => {
    if (option.group) {
      if (!groupedOptions[option.group]) {
        groupedOptions[option.group] = [];
      }
      groupedOptions[option.group].push(option);
    } else {
      ungroupedOptions.push(option);
    }
  });

  return (
    <select
      id={id}
      value={value}
      onChange={handleChange}
      className={`block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm ${
        error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''
      } ${className || ''}`}
    >
      {/* Render ungrouped options first */}
      {ungroupedOptions.map(option => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}

      {/* Render grouped options */}
      {Object.entries(groupedOptions).map(([groupName, options]) => (
        <optgroup key={groupName} label={groupName}>
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

// Form field with tooltip help
interface FormFieldWithHelpProps {
  label: string;
  htmlFor: string;
  helpText: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormFieldWithHelp: React.FC<FormFieldWithHelpProps> = ({
  label,
  htmlFor,
  helpText,
  required,
  children,
}) => {
  return (
    <Form.Group>
      <div className="flex items-center">
        <Form.Label htmlFor={htmlFor} required={required}>
          {label}
        </Form.Label>
        <Tooltip content={helpText}>
          <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
        </Tooltip>
      </div>
      {children}
    </Form.Group>
  );
};

interface ParameterEditorProps {
  initialData?: ParameterConfig;
  onSave: (parameter: ParameterConfig) => void;
  onCancel: () => void;
  availableRanges: RegisterRange[];
}

const TemplateParameterEditor: React.FC<ParameterEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  availableRanges,
}) => {
  // Get access to the template form context 
  const { state } = useTemplateForm();
  
  // Use a default value for registerRange to avoid undefined issues
  const defaultRegisterRange = availableRanges.length > 0 ? availableRanges[0].rangeName : '';

  const [parameter, setParameter] = useState<ParameterConfig>({
    name: '',
    dataType: 'INT16',
    scalingFactor: 1,
    decimalPoint: 0,
    byteOrder: 'AB', // Default for single register
    registerRange: defaultRegisterRange,
    registerIndex: 0,
    bufferIndex: 0,
    signed: true,
    // Set defaults for new fields
    wordCount: 1,
    ...initialData, // This will override defaults if initialData is provided
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Whether to show specific fields based on data type
  const isMultiRegister = [
    'INT32',
    'UINT32',
    'INT64',
    'UINT64',
    'FLOAT32',
    'FLOAT',
    'DOUBLE',
    'FLOAT64',
    'STRING',
    'ASCII',
  ].includes(parameter.dataType);
  const isNumericType = [
    'INT8',
    'UINT8',
    'INT16',
    'UINT16',
    'INT32',
    'UINT32',
    'INT64',
    'UINT64',
    'FLOAT32',
    'FLOAT',
    'DOUBLE',
    'FLOAT64',
    'BCD',
  ].includes(parameter.dataType);
  const isBitType = ['BOOLEAN', 'BIT'].includes(parameter.dataType);
  const isStringType = ['STRING', 'ASCII'].includes(parameter.dataType);
  const isIntegerType = [
    'INT8',
    'UINT8',
    'INT16',
    'UINT16',
    'INT32',
    'UINT32',
    'INT64',
    'UINT64',
  ].includes(parameter.dataType);

  useEffect(() => {
    if (initialData) {
      // Ensure registerRange is not undefined
      setParameter({
        ...initialData,
        registerRange: initialData.registerRange || defaultRegisterRange,
      });

      // Show advanced options if any advanced fields are set
      if (
        initialData.scalingEquation ||
        initialData.bitmask ||
        initialData.bitPosition !== undefined ||
        initialData.unit ||
        initialData.description ||
        initialData.maxValue !== undefined ||
        initialData.minValue !== undefined ||
        initialData.formatString
      ) {
        setShowAdvancedOptions(true);
      }
    }
  }, [initialData, defaultRegisterRange]);

  // Update parameter if availableRanges changes and we need to set a new default
  useEffect(() => {
    if (!parameter.registerRange && availableRanges.length > 0) {
      setParameter(prev => ({
        ...prev,
        registerRange: availableRanges[0].rangeName,
      }));
    }
  }, [availableRanges, parameter.registerRange]);

  // Helper function to get byte size for data type
  const getByteSize = (dataType: string): number => {
    if (['INT8', 'UINT8', 'BOOLEAN', 'BIT'].includes(dataType)) {
      return 1; // 8-bit types
    } else if (['INT16', 'UINT16', 'BCD'].includes(dataType)) {
      return 2; // 16-bit types
    } else if (['INT32', 'UINT32', 'FLOAT32', 'FLOAT'].includes(dataType)) {
      return 4; // 32-bit types
    } else if (['INT64', 'UINT64', 'DOUBLE', 'FLOAT64'].includes(dataType)) {
      return 8; // 64-bit types
    } else if (['STRING', 'ASCII'].includes(dataType)) {
      return parameter.wordCount ? parameter.wordCount * 2 : 20; // String types (default 10 registers = 20 bytes)
    }
    return 2; // Default to 16-bit (2 bytes)
  };

  // Function to calculate the next available buffer index
  const calculateNextBufferIndex = (): number => {
    // If no parameters exist yet, start at 0
    if (!initialData && state.parameters.length === 0) {
      return 0;
    }

    // Get all existing parameters for the current register range
    const parametersInRange = state.parameters.filter(
      p => p.registerRange === parameter.registerRange
    );

    // If no parameters in this range yet, start at 0
    if (parametersInRange.length === 0) {
      return 0;
    }

    // If editing an existing parameter, exclude it from consideration
    const existingParams = initialData
      ? parametersInRange.filter(p => p.name !== initialData.name)
      : parametersInRange;

    // If there are no other parameters, start at 0
    if (existingParams.length === 0) {
      return 0;
    }

    // Find the maximum buffer index plus its size
    let maxIndex = 0;
    
    existingParams.forEach(p => {
      const byteSize = getByteSize(p.dataType);
      const endIndex = (p.bufferIndex !== undefined ? p.bufferIndex : p.registerIndex * 2) + byteSize;
      
      if (endIndex > maxIndex) {
        maxIndex = endIndex;
      }
    });

    return maxIndex;
  };

  // Update word count and buffer index when data type changes
  useEffect(() => {
    // Set appropriate word count based on data type
    const newWordCount = getRequiredWordCount(parameter.dataType);
    const currentByteSize = getByteSize(parameter.dataType);

    // Only update if word count changed and not manually set before
    if (newWordCount !== parameter.wordCount) {
      setParameter(prev => ({
        ...prev,
        wordCount: newWordCount,
      }));
    }

    // If this is a new parameter or the data type is changed, auto-increment buffer index
    if (!initialData || (initialData && initialData.dataType !== parameter.dataType)) {
      const nextBufferIndex = calculateNextBufferIndex();
      
      setParameter(prev => ({
        ...prev,
        bufferIndex: nextBufferIndex,
        // Keep registerIndex synced for backward compatibility 
        registerIndex: Math.floor(nextBufferIndex / 2)
      }));
    }

    // Update byte order options based on data type
    if (isMultiRegister && ['AB', 'BA'].includes(parameter.byteOrder)) {
      // If switching to multi-register, update to appropriate byte order
      setParameter(prev => ({
        ...prev,
        byteOrder: 'ABCD', // Default to big-endian format for multi-register
      }));
    } else if (!isMultiRegister && ['ABCD', 'DCBA', 'BADC', 'CDAB'].includes(parameter.byteOrder)) {
      // If switching to single register, update to appropriate byte order
      setParameter(prev => ({
        ...prev,
        byteOrder: 'AB', // Default to big-endian format for single register
      }));
    }

    // Add detail about register usage for the selected data type
    const registerDetail = document.getElementById('register-detail');
    if (registerDetail) {
      let message = '';
      if (['INT32', 'UINT32', 'FLOAT32', 'FLOAT'].includes(parameter.dataType)) {
        message = `This data type uses 2 consecutive registers (4 bytes) starting at buffer index ${parameter.bufferIndex}.`;
      } else if (['INT64', 'UINT64', 'DOUBLE', 'FLOAT64'].includes(parameter.dataType)) {
        message = `This data type uses 4 consecutive registers (8 bytes) starting at buffer index ${parameter.bufferIndex}.`;
      } else if (['STRING', 'ASCII'].includes(parameter.dataType)) {
        const byteCount = parameter.wordCount ? parameter.wordCount * 2 : 20;
        message = `String data uses ${parameter.wordCount || 10} registers (${byteCount} bytes) starting at buffer index ${parameter.bufferIndex}.`;
      } else if (['BOOLEAN', 'BIT'].includes(parameter.dataType)) {
        message = `Bit data extracts a single bit from a byte at the specified bit position.`;
      } else {
        message = `This data type uses 1 register (2 bytes) starting at buffer index ${parameter.bufferIndex}.`;
      }
      registerDetail.textContent = message;
    }
  }, [parameter.dataType, isMultiRegister, parameter.bufferIndex, parameter.registerRange, parameter.wordCount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    let parsedValue: string | number | boolean = value;
    if (type === 'checkbox') {
      parsedValue = checked;
    } else if (
      [
        'scalingFactor',
        'decimalPoint',
        'registerIndex',
        'bufferIndex',
        'wordCount',
        'bitPosition',
        'maxValue',
        'minValue',
      ].includes(name)
    ) {
      parsedValue = parseFloat(value) || 0;
    }

    // Handle special cases for bufferIndex and registerIndex to keep them in sync
    if (name === 'bufferIndex') {
      // When bufferIndex changes, update registerIndex for backward compatibility
      const bufferIndex = parseFloat(value) || 0;
      setParameter(prev => ({
        ...prev,
        bufferIndex,
        registerIndex: Math.floor(bufferIndex / 2) // 2 bytes per register
      }));
    } else if (name === 'registerIndex') {
      // When registerIndex changes, update bufferIndex
      const registerIndex = parseFloat(value) || 0;
      setParameter(prev => ({
        ...prev,
        registerIndex,
        bufferIndex: registerIndex * 2 // 2 bytes per register
      }));
    } else {
      // Normal field update
      setParameter(prev => ({
        ...prev,
        [name]: parsedValue,
      }));
    }

    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // For critical fields like bufferIndex, registerIndex, bitPosition, and wordCount,
    // validate immediately to give quick feedback
    if (['bufferIndex', 'registerIndex', 'bitPosition', 'wordCount'].includes(name)) {
      // Use setTimeout to ensure state is updated before validation
      setTimeout(() => {
        // Partial validation for just this field
        const newErrors: Record<string, string> = {};

        if (name === 'bufferIndex' || name === 'registerIndex') {
          // Check register range validity
          if (parameter.registerRange) {
            const selectedRange = availableRanges.find(
              range => range.rangeName === parameter.registerRange
            );

            if (selectedRange) {
              const registersNeeded = getRequiredWordCount(parameter.dataType);
              const bytesNeeded = getByteSize(parameter.dataType);
              const lastValidRegisterIndex = selectedRange.length - registersNeeded;
              
              // Different validation for bufferIndex vs registerIndex
              if (name === 'bufferIndex') {
                const bufferIndex = parseFloat(value) || 0;
                const lastValidBufferIndex = lastValidRegisterIndex * 2;
                
                if (bufferIndex < 0) {
                  newErrors.bufferIndex = 'Buffer index must be a positive number';
                } else if (bufferIndex > lastValidBufferIndex) {
                  newErrors.bufferIndex = `Index too high. Max buffer index: ${lastValidBufferIndex} for this data type`;
                }
                
                // Check for overlaps
                const overlapError = checkForParameterOverlaps();
                if (overlapError) {
                  newErrors.bufferIndex = overlapError;
                }
              } else { // registerIndex
                const registerIndex = parseFloat(value) || 0;
                
                if (registerIndex < 0) {
                  newErrors.registerIndex = 'Register index must be a positive number';
                } else if (registerIndex > lastValidRegisterIndex) {
                  newErrors.registerIndex = `Index too high. Max index: ${lastValidRegisterIndex} for this data type`;
                }
                
                // Check for overlaps
                const overlapError = checkForParameterOverlaps();
                if (overlapError) {
                  newErrors.registerIndex = overlapError;
                }
              }
            }
          }
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...newErrors }));
        }
      }, 0);
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setParameter(prev => ({
      ...prev,
      [name]: value,
    }));

    // If data type or register range changes, we should revalidate immediately
    if (name === 'dataType' || name === 'registerRange') {
      // Use setTimeout to ensure state is updated before validation
      setTimeout(() => validateForm(), 0);
    }
  };

  // Helper function to get required word count based on data type
  const getRequiredWordCount = (dataType: string): number => {
    if (['INT32', 'UINT32', 'FLOAT32', 'FLOAT'].includes(dataType)) {
      return 2;
    } else if (['INT64', 'UINT64', 'DOUBLE', 'FLOAT64'].includes(dataType)) {
      return 4;
    } else if (['STRING', 'ASCII'].includes(dataType)) {
      return parameter.wordCount || 10; // Default to 10 for strings unless already set
    }
    return 1; // Default for standard types (INT16, UINT16, etc.)
  };

  // Checks if a parameter overlaps with existing parameters in the same range
  const checkForParameterOverlaps = (): string | null => {
    // If no name or register range, can't check for overlaps
    if (!parameter.name || !parameter.registerRange) return null;

    // ===================================================================
    // PART 1: Check for duplicate parameter names GLOBALLY
    // ===================================================================
    // Names must be unique across ALL register ranges
    // ===================================================================
    
    // Get all parameters from all register ranges
    const allParamsFromAllRanges = availableRanges.flatMap(range => range.dataParser || []);
    
    // If we're editing an existing parameter, exclude it from the comparison
    const existingParamsAll = initialData
      ? allParamsFromAllRanges.filter(p => p.name !== initialData.name)
      : allParamsFromAllRanges;
    
    // Check for duplicate name (case-insensitive)
    const hasDuplicateName = existingParamsAll.some(
      p => p.name && p.name.trim().toLowerCase() === parameter.name.trim().toLowerCase()
    );

    if (hasDuplicateName) {
      return `Template parameter name "${parameter.name}" is already in use`;
    }

    // ===================================================================
    // PART 2: Check for buffer index overlaps WITHIN THE SAME RANGE ONLY
    // ===================================================================
    // Buffer indices only need to be unique within the SAME register range
    // ===================================================================
    
    // Find the selected range
    const selectedRange = availableRanges.find(
      range => range.rangeName === parameter.registerRange
    );
    if (!selectedRange) return null;

    // Calculate the start and end buffer indices for this parameter
    const byteSize = getByteSize(parameter.dataType);
    const startBufferIndex = parameter.bufferIndex;
    const endBufferIndex = parameter.bufferIndex + byteSize - 1;

    // Get existing parameters from the CURRENT selected register range only
    const parametersInCurrentRange = selectedRange?.dataParser || [];

    // If we're editing an existing parameter, exclude it from the comparison
    const existingParameters = initialData
      ? parametersInCurrentRange.filter(p => p.name !== initialData.name)
      : parametersInCurrentRange;

    if (existingParameters.length === 0) return null;

    // Special case for bit-level parameters - only check bit position conflicts
    if (['BOOLEAN', 'BIT'].includes(parameter.dataType)) {
      // For bit parameters, check if another bit parameter uses the same buffer byte AND bit position
      // ONLY within the same register range
      const conflictingBitParam = existingParameters.find(
        p =>
          ['BOOLEAN', 'BIT'].includes(p.dataType) &&
          (p.bufferIndex === parameter.bufferIndex || p.registerIndex * 2 === parameter.bufferIndex) &&
          p.bitPosition === parameter.bitPosition
      );

      if (conflictingBitParam) {
        return `Bit position ${parameter.bitPosition} at buffer index ${parameter.bufferIndex} is already used by template parameter "${conflictingBitParam.name}" in the same register range`;
      }

      return null; // Bit parameters can share buffer locations with other types
    }

    // Check for buffer overlaps with non-bit parameters 
    // ONLY within the same register range
    for (const existing of existingParameters) {
      // Skip bit-level parameters as they can share buffer locations with other types
      if (['BOOLEAN', 'BIT'].includes(existing.dataType)) continue;

      // Calculate existing parameter's buffer range
      const existingByteSize = getByteSize(existing.dataType);
      
      // If bufferIndex is defined use it, otherwise calculate from registerIndex
      const existingBufferIndex = existing.bufferIndex !== undefined 
        ? existing.bufferIndex 
        : existing.registerIndex * 2;
      
      const existingEndBufferIndex = existingBufferIndex + existingByteSize - 1;

      // Special case: exact same buffer index
      if (startBufferIndex === existingBufferIndex) {
        return `Buffer index ${startBufferIndex} in register range "${parameter.registerRange}" is already used by template parameter "${existing.name}"`;
      }

      // Check if buffer ranges overlap
      if (
        (startBufferIndex <= existingEndBufferIndex && endBufferIndex >= existingBufferIndex) ||
        (existingBufferIndex <= endBufferIndex && existingEndBufferIndex >= startBufferIndex)
      ) {
        return `Buffer range ${startBufferIndex}-${endBufferIndex} in "${parameter.registerRange}" overlaps with template parameter "${existing.name}" (buffer range ${existingBufferIndex}-${existingEndBufferIndex})`;
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!parameter.name.trim()) {
      newErrors.name = 'Parameter name is required';
    }

    if (!parameter.dataType) {
      newErrors.dataType = 'Data type is required';
    }

    if (!parameter.registerRange) {
      newErrors.registerRange = 'Register range is required';
    }

    // Check if the buffer index and register index are valid for the selected range
    if (parameter.registerRange) {
      const selectedRange = availableRanges.find(
        range => range.rangeName === parameter.registerRange
      );

      if (selectedRange) {
        // Validate based on wordCount and register index
        const registersNeeded = getRequiredWordCount(parameter.dataType);
        const bytesNeeded = getByteSize(parameter.dataType);
        const lastValidRegisterIndex = selectedRange.length - registersNeeded;
        const lastValidBufferIndex = lastValidRegisterIndex * 2;
        
        // Validate bufferIndex
        if (parameter.bufferIndex < 0) {
          newErrors.bufferIndex = 'Buffer index must be a positive number';
        } else if (parameter.bufferIndex > lastValidBufferIndex) {
          newErrors.bufferIndex = `Index too high. This ${parameter.dataType} uses ${bytesNeeded} bytes, max buffer index: ${lastValidBufferIndex}`;
        }
        
        // Validate registerIndex for backward compatibility
        if (parameter.registerIndex < 0) {
          newErrors.registerIndex = 'Register index must be a positive number';
        } else if (parameter.registerIndex > lastValidRegisterIndex) {
          newErrors.registerIndex = `Index too high. This ${parameter.dataType} uses ${registersNeeded} registers, max index: ${lastValidRegisterIndex}`;
        }

        // Check for overlaps with other parameters
        const overlapError = checkForParameterOverlaps();
        if (overlapError) {
          newErrors.bufferIndex = overlapError;
          newErrors.registerIndex = overlapError;
        }
      }
    }

    // Validate byte order based on data type using the already defined isMultiRegister constant
    if (isMultiRegister) {
      // Multi-register should use 4-char byte orders
      if (!['ABCD', 'DCBA', 'BADC', 'CDAB'].includes(parameter.byteOrder)) {
        newErrors.byteOrder = 'For multi-register types, use ABCD, DCBA, BADC, or CDAB';
      }
    } else {
      // Single register should use 2-char byte orders
      if (!['AB', 'BA'].includes(parameter.byteOrder)) {
        newErrors.byteOrder = 'For single register types, use AB or BA';
      }
    }

    // Validate scaling equation if provided
    if (parameter.scalingEquation) {
      try {
        // Check if equation contains 'x' variable
        if (!parameter.scalingEquation.includes('x')) {
          newErrors.scalingEquation = 'Equation must contain "x" as the variable';
        } else {
          // A simple test with x = 1 to see if the equation is valid
          // eslint-disable-next-line no-new-func
          const testFunc = new Function('x', `return ${parameter.scalingEquation}`);
          testFunc(1);
        }
      } catch (error) {
        newErrors.scalingEquation =
          'Invalid equation format. Use JavaScript syntax with "x" as the value.';
      }
    }

    // Validate bitmask if provided
    if (parameter.bitmask && !/^0x[0-9A-Fa-f]+$/.test(parameter.bitmask)) {
      newErrors.bitmask = 'Bitmask must be in hexadecimal format (e.g., 0xFF00)';
    }

    // Validate bit position for boolean types
    if (isBitType) {
      if (parameter.bitPosition === undefined || parameter.bitPosition === null) {
        newErrors.bitPosition = 'Bit position is required for boolean/bit types';
      } else if (parameter.bitPosition < 0 || parameter.bitPosition > 15) {
        newErrors.bitPosition = 'Bit position must be between 0 and 15';
      }
    }

    // Validate word count for string types
    if (isStringType) {
      if (!parameter.wordCount || parameter.wordCount < 1) {
        newErrors.wordCount = 'Word count must be at least 1 for string types';
      } else if (parameter.wordCount > 125) {
        newErrors.wordCount = 'Word count must not exceed 125 for strings';
      }
    }

    // Validate min/max values if both are provided
    if (parameter.minValue !== undefined && parameter.maxValue !== undefined) {
      if (parameter.minValue >= parameter.maxValue) {
        newErrors.minValue = 'Minimum value must be less than maximum value';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Display a summary of all validation errors at once
  const displayValidationSummary = (errors: Record<string, string>) => {
    if (Object.keys(errors).length === 0) return null;

    return (
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
        <h5 className="text-sm font-semibold text-red-700">Please fix the following errors:</h5>
        <ul className="mt-1 list-inside list-disc text-sm text-red-600">
          {Object.values(errors).map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Force validation and update error state
    const isValid = validateForm();

    // Scroll to top if there are errors to ensure error summary is visible
    if (!isValid && Object.keys(errors).length > 0) {
      // Find the first error element to scroll to
      const firstErrorId = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstErrorId);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
    } else if (isValid) {
      // Only save if form is valid
      onSave(parameter);
    }
  };

  // Data type options grouped by category
  const dataTypeOptions: SelectOption[] = [
    // 8-bit integers
    { value: 'INT8', label: 'INT8 (Signed 8-bit)', group: '8-bit Integers' },
    { value: 'UINT8', label: 'UINT8 (Unsigned 8-bit)', group: '8-bit Integers' },

    // 16-bit integers (1 register)
    { value: 'INT16', label: 'INT16 (Signed 16-bit)', group: '16-bit Integers' },
    { value: 'UINT16', label: 'UINT16 (Unsigned 16-bit)', group: '16-bit Integers' },

    // 32-bit integers (2 registers)
    { value: 'INT32', label: 'INT32 (Signed 32-bit)', group: '32-bit Types' },
    { value: 'UINT32', label: 'UINT32 (Unsigned 32-bit)', group: '32-bit Types' },
    { value: 'FLOAT32', label: 'FLOAT32 (32-bit Float)', group: '32-bit Types' },
    { value: 'FLOAT', label: 'FLOAT (32-bit Float)', group: '32-bit Types' },

    // 64-bit types (4 registers)
    { value: 'INT64', label: 'INT64 (Signed 64-bit)', group: '64-bit Types' },
    { value: 'UINT64', label: 'UINT64 (Unsigned 64-bit)', group: '64-bit Types' },
    { value: 'DOUBLE', label: 'DOUBLE (64-bit Float)', group: '64-bit Types' },
    { value: 'FLOAT64', label: 'FLOAT64 (64-bit Float)', group: '64-bit Types' },

    // Special types
    { value: 'BOOLEAN', label: 'BOOLEAN (Single Bit)', group: 'Special Types' },
    { value: 'BIT', label: 'BIT (Single Bit)', group: 'Special Types' },
    { value: 'BCD', label: 'BCD (Binary Coded Decimal)', group: 'Special Types' },
    { value: 'STRING', label: 'STRING (ASCII String)', group: 'Special Types' },
    { value: 'ASCII', label: 'ASCII (ASCII String)', group: 'Special Types' },
  ];

  // Byte order options based on word count
  const byteOrderOptions: SelectOption[] = isMultiRegister
    ? [
        { value: 'ABCD', label: 'ABCD (Big Endian)' },
        { value: 'DCBA', label: 'DCBA (Little Endian)' },
        { value: 'BADC', label: 'BADC (Mixed Endian)' },
        { value: 'CDAB', label: 'CDAB (Mixed Endian)' },
      ]
    : [
        { value: 'AB', label: 'AB (Big Endian)' },
        { value: 'BA', label: 'BA (Little Endian)' },
      ];

  return (
    <Form onSubmit={handleSubmit}>
      {/* Display error summary at the top of the form if there are any errors */}
      {Object.keys(errors).length > 0 && displayValidationSummary(errors)}

      <Form.Group>
        <Form.Label htmlFor="name" required>
          Template Parameter Name
        </Form.Label>
        <Input
          id="name"
          name="name"
          value={parameter.name}
          onChange={handleInputChange}
          error={errors.name}
          placeholder="e.g., Voltage_PhaseA"
        />
      </Form.Group>

      <FormFieldWithHelp
        label="Data Type"
        htmlFor="dataType"
        required
        helpText="Select the appropriate data type for this parameter. For multi-register values like 32-bit integers or floats, word count is automatically adjusted."
      >
        <Select
          id="dataType"
          value={parameter.dataType as string}
          onChange={handleSelectChange('dataType')}
          error={errors.dataType}
          options={dataTypeOptions}
        />
      </FormFieldWithHelp>

      {isMultiRegister && (
        <FormFieldWithHelp
          label="Word Count"
          htmlFor="wordCount"
          helpText={
            isStringType
              ? 'Number of 16-bit registers to use for this string. Each register can store 2 ASCII characters.'
              : 'Number of 16-bit registers used for this data type. Automatically set based on data type.'
          }
        >
          <Input
            id="wordCount"
            name="wordCount"
            type="number"
            min="1"
            max={isStringType ? '125' : '8'}
            value={parameter.wordCount}
            onChange={handleInputChange}
            error={errors.wordCount}
            disabled={!isStringType}
          />
        </FormFieldWithHelp>
      )}

      <Form.Row>
        <FormFieldWithHelp
          label="Byte Order"
          htmlFor="byteOrder"
          helpText={
            isMultiRegister
              ? 'Specifies the byte order for multi-register values in this template. ABCD is big-endian (most significant byte first), DCBA is little-endian.'
              : 'Specifies the byte order for this template. AB is big-endian (most significant byte first), BA is little-endian.'
          }
        >
          <Select
            id="byteOrder"
            value={parameter.byteOrder}
            onChange={handleSelectChange('byteOrder')}
            options={byteOrderOptions}
          />
        </FormFieldWithHelp>

        {isIntegerType && (
          <Form.Group>
            <div className="h-6"></div> {/* Empty space for alignment with label */}
            <div className="mt-2 flex items-center">
              <Checkbox
                id="signed"
                name="signed"
                checked={parameter.signed}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="signed" className="text-sm font-medium text-gray-700">
                Interpret as signed value
              </label>
              <Tooltip content="For integer types, indicates whether negative values are possible">
                <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
              </Tooltip>
            </div>
          </Form.Group>
        )}
      </Form.Row>

      <Form.Row>
        <Form.Group>
          <Form.Label htmlFor="registerRange" required>
            Register Range
          </Form.Label>
          <Select
            id="registerRange"
            value={parameter.registerRange || ''}
            onChange={handleSelectChange('registerRange')}
            error={errors.registerRange}
            options={availableRanges.map(range => ({
              value: range.rangeName,
              label: range.rangeName,
            }))}
          />
          {availableRanges.length === 0 && (
            <p className="mt-1 text-xs text-amber-500">
              No register ranges defined. Please add a register range first.
            </p>
          )}
        </Form.Group>

        <FormFieldWithHelp
          label="Buffer Index"
          htmlFor="bufferIndex"
          required
          helpText={`Starting index in the buffer for parsing the response. Auto-increments based on data type size (2 bytes for 16-bit, 4 bytes for 32-bit, etc.).`}
        >
          <Input
            id="bufferIndex"
            name="bufferIndex"
            type="number"
            min="0"
            value={parameter.bufferIndex}
            onChange={handleInputChange}
            error={errors.bufferIndex || errors.registerIndex} // Use both for backward compatibility
          />
          <div id="register-detail" className="mt-1 text-xs italic text-blue-600"></div>
        </FormFieldWithHelp>
      </Form.Row>

      {isBitType && (
        <FormFieldWithHelp
          label="Bit Position"
          htmlFor="bitPosition"
          required
          helpText="For bit/boolean types in this template, specifies which bit to extract (0-15). Bit 0 is least significant."
        >
          <Input
            id="bitPosition"
            name="bitPosition"
            type="number"
            min="0"
            max="15"
            value={parameter.bitPosition || 0}
            onChange={handleInputChange}
            error={errors.bitPosition}
          />
        </FormFieldWithHelp>
      )}

      <div className="mb-2 mt-4">
        <button
          type="button"
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          <Info size={16} className="mr-1" />
          {showAdvancedOptions ? 'Hide advanced options' : 'Show advanced options'}
        </button>
      </div>

      {showAdvancedOptions && (
        <>
          <Form.Row>
            <FormFieldWithHelp
              label="Scaling Factor"
              htmlFor="scalingFactor"
              helpText="Simple multiplier for the raw value in this template. For example, use 0.1 to divide by 10."
            >
              <Input
                id="scalingFactor"
                name="scalingFactor"
                type="number"
                step="0.001"
                value={parameter.scalingFactor}
                onChange={handleInputChange}
              />
            </FormFieldWithHelp>

            {isNumericType && (
              <FormFieldWithHelp
                label="Scaling Equation"
                htmlFor="scalingEquation"
                helpText="JavaScript expression using 'x' as the variable for this template parameter. For example: 'x * 0.1 + 32' to convert Celsius to Fahrenheit."
              >
                <Input
                  id="scalingEquation"
                  name="scalingEquation"
                  placeholder="e.g., x * 0.1 + 32"
                  value={parameter.scalingEquation || ''}
                  onChange={handleInputChange}
                  error={errors.scalingEquation}
                />
                {errors.scalingEquation ? (
                  <p className="mt-1 text-xs text-red-500">{errors.scalingEquation}</p>
                ) : (
                  <div className="mt-1 text-xs text-gray-500">
                    <p>Example equations:</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      <li>
                        Celsius to Fahrenheit: <code>x * 1.8 + 32</code>
                      </li>
                      <li>
                        Scale by 0.1: <code>x * 0.1</code>
                      </li>
                      <li>
                        Extract bits 8-15: <code>(x {'>>'} 8) & 0xFF</code>
                      </li>
                      <li>
                        Convert negative: <code>x {'<'} 32768 ? x : x - 65536</code>
                      </li>
                    </ul>
                  </div>
                )}
              </FormFieldWithHelp>
            )}
          </Form.Row>

          <Form.Row>
            <FormFieldWithHelp
              label="Decimal Places"
              htmlFor="decimalPoint"
              helpText="Number of decimal places to display for this template parameter."
            >
              <Input
                id="decimalPoint"
                name="decimalPoint"
                type="number"
                min="0"
                max="10"
                value={parameter.decimalPoint}
                onChange={handleInputChange}
              />
            </FormFieldWithHelp>

            <FormFieldWithHelp
              label="Unit"
              htmlFor="unit"
              helpText="Unit of measurement for this template parameter, such as °C, V, A, etc."
            >
              <Input
                id="unit"
                name="unit"
                placeholder="e.g., °C, V, A"
                value={parameter.unit || ''}
                onChange={handleInputChange}
              />
            </FormFieldWithHelp>
          </Form.Row>

          {!isBitType && (
            <FormFieldWithHelp
              label="Bitmask"
              htmlFor="bitmask"
              helpText="Hexadecimal mask to extract specific bits for this template parameter (e.g., 0xFF00 for high byte). Leave empty for no masking."
            >
              <Input
                id="bitmask"
                name="bitmask"
                placeholder="e.g., 0xFF00"
                value={parameter.bitmask || ''}
                onChange={handleInputChange}
                error={errors.bitmask}
              />
              {errors.bitmask ? (
                <p className="mt-1 text-xs text-red-500">{errors.bitmask}</p>
              ) : (
                <div className="mt-1 text-xs text-gray-500">
                  <p>Common bitmasks:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    <li>
                      <code>0xFF</code> - Low byte (bits 0-7)
                    </li>
                    <li>
                      <code>0xFF00</code> - High byte (bits 8-15)
                    </li>
                    <li>
                      <code>0xF0</code> - High nibble (bits 4-7)
                    </li>
                    <li>
                      <code>0x0F</code> - Low nibble (bits 0-3)
                    </li>
                    <li>
                      <code>0x8000</code> - Single bit (bit 15)
                    </li>
                  </ul>
                </div>
              )}
            </FormFieldWithHelp>
          )}

          {isNumericType && (
            <Form.Row>
              <FormFieldWithHelp
                label="Minimum Value"
                htmlFor="minValue"
                helpText="Optional minimum valid value for this template parameter. Values below this will be marked as errors."
              >
                <Input
                  id="minValue"
                  name="minValue"
                  type="number"
                  step="any"
                  placeholder="No minimum"
                  value={parameter.minValue === undefined ? '' : parameter.minValue}
                  onChange={handleInputChange}
                />
              </FormFieldWithHelp>

              <FormFieldWithHelp
                label="Maximum Value"
                htmlFor="maxValue"
                helpText="Optional maximum valid value for this template parameter. Values above this will be marked as errors."
              >
                <Input
                  id="maxValue"
                  name="maxValue"
                  type="number"
                  step="any"
                  placeholder="No maximum"
                  value={parameter.maxValue === undefined ? '' : parameter.maxValue}
                  onChange={handleInputChange}
                />
              </FormFieldWithHelp>
            </Form.Row>
          )}

          <FormFieldWithHelp
            label="Description"
            htmlFor="description"
            helpText="Description of this parameter for documentation in the template."
          >
            <Input
              id="description"
              name="description"
              placeholder="Description of this parameter"
              value={parameter.description || ''}
              onChange={handleInputChange}
            />
          </FormFieldWithHelp>
        </>
      )}

      <Form.Actions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Update Template Parameter' : 'Add Template Parameter'}</Button>
      </Form.Actions>
    </Form>
  );
};

export default TemplateParameterEditor;