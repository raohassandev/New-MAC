// client/src/components/templates/TemplateBasicInfo.tsx
import React, { useContext, useState, useEffect } from 'react';
import { useTemplateForm } from './TemplateFormContext';
import { Input } from '../ui/Input';
import { Form } from '../ui/Form';
import { AlertCircle } from 'lucide-react';
import { FormFieldRefsContext } from './FormFieldRefsContext';
import { createDeviceType, getDeviceTypes, NewDeviceType } from '../../services/deviceDrivers';
import NewDeviceTypeModal from '../devices/NewDeviceTypeModal';

// We need to create a custom Select component for type compatibility
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  ref?: React.RefObject<HTMLSelectElement>;
}

// Custom Select component with forwardRef to support refs
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, value, onChange, options, error }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    };

    return (
      <select
        id={id}
        value={value}
        onChange={handleChange}
        ref={ref}
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
  }
);

// Field Error component to display validation errors
const FieldError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="mt-1 flex items-center text-sm text-red-600">
      <AlertCircle className="mr-1 h-4 w-4" />
      {message}
    </div>
  );
};

const TemplateBasicInfo: React.FC = () => {
  const { state, actions } = useTemplateForm();
  const { deviceBasics, validationState } = state;
  const { refs } = useContext(FormFieldRefsContext);

  // State for device types and modal
  const [deviceTypes, setDeviceTypes] = useState<NewDeviceType[]>([]);
  const [showNewDeviceTypeModal, setShowNewDeviceTypeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State for real-time validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Field validation function
  const validateField = (fieldName: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (fieldName) {
      case 'name':
        if (!value || value.trim().length < 3) {
          newErrors.name = 'Device driver name must be at least 3 characters';
        } else {
          delete newErrors.name;
        }
        break;
      case 'deviceType':
        if (!value || value === '') {
          newErrors.deviceType = 'Device type is required';
        } else {
          delete newErrors.deviceType;
        }
        break;
      case 'make':
        if (!value || !value.trim()) {
          newErrors.make = 'Manufacturer/Make is required';
        } else {
          delete newErrors.make;
        }
        break;
      case 'model':
        if (!value || !value.trim()) {
          newErrors.model = 'Model is required';
        } else {
          delete newErrors.model;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Function to load device types
  const loadDeviceTypes = async () => {
    try {
      setLoading(true);
      const data = await getDeviceTypes();
      setDeviceTypes(data);
    } catch (error) {
      console.error('Error loading device types:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load device types on component mount and when modal is closed
  useEffect(() => {
    loadDeviceTypes();
  }, []);

  // Helper to get device basic info error message
  const getBasicFieldError = (fieldName: string): string | undefined => {
    // First check real-time validation if field is touched
    if (touched[fieldName] && errors[fieldName]) {
      return errors[fieldName];
    }
    // Fall back to validation state from form context
    const error = validationState.basicInfo.find(err => err.field === fieldName);
    return error?.message;
  };

  // Handle device basics changes with validation
  const handleDeviceBasicsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Update state
    actions.setDeviceBasics({ [name]: value });
    
    // Validate field after state update
    setTimeout(() => {
      validateField(name, value);
    }, 0);
  };


  // Handle device type changes
  const handleDeviceTypeChange = (value: string) => {
    if (value === 'new') {
      // Show the device type modal
      setShowNewDeviceTypeModal(true);
    } else {
      // Mark field as touched
      setTouched(prev => ({ ...prev, deviceType: true }));
      
      // Update state
      actions.setDeviceBasics({ deviceType: value });
      
      // Validate field after state update
      setTimeout(() => {
        validateField('deviceType', value);
      }, 0);
    }
  };

  // Handle new device type creation
  const handleNewDeviceTypeSubmit = async (deviceType: NewDeviceType) => {
    try {
      // Show user feedback
      setLoading(true);

      // First create the device type in the database
      const createdDeviceType = await createDeviceType(deviceType);

      // Add the new device type to the local state
      setDeviceTypes(prev => [...prev, createdDeviceType]);

      // Set the form data to include the new device type
      actions.setDeviceBasics({
        deviceType: deviceType.name,
      });

      // Close the modal
      setShowNewDeviceTypeModal(false);
      alert('Device type created successfully!');
    } catch (error: any) {
      console.error('Failed to create device type:', error);

      // Show detailed error message to user
      let errorMessage = 'Failed to create device type. Please try again.';

      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Device Driver Information</h3>

      <Form.Row>
        <Form.Group>
          <Form.Label htmlFor="name" required>
            Device Driver Name
          </Form.Label>
          <Input
            id="name"
            name="name"
            value={deviceBasics.name}
            onChange={handleDeviceBasicsChange}
            placeholder="Energy Analyzer Device Driver"
            className={getBasicFieldError('name') ? 'border-red-300' : ''}
            ref={refs.name as React.RefObject<HTMLInputElement>}
            minLength={3}
          />
          <FieldError message={getBasicFieldError('name')} />
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 3 characters long. Currently: {deviceBasics.name.length} characters
          </p>
        </Form.Group>

        <Form.Group>
          <Form.Label htmlFor="deviceType" required>
            Device Type
          </Form.Label>
          <div className="flex gap-2">
            <Select
              id="deviceType"
              value={deviceBasics.deviceType}
              onChange={handleDeviceTypeChange}
              options={
                loading
                  ? [{ value: '', label: 'Loading device types...', disabled: true }]
                  : [
                      { value: '', label: 'Select Device Type', disabled: true },
                      ...deviceTypes.map(type => ({ value: type.name, label: type.name })),
                      { value: 'new', label: '+ Add New Type' },
                    ]
              }
              error={getBasicFieldError('deviceType')}
              ref={refs.deviceType as React.RefObject<HTMLSelectElement>}
            />
          </div>
          <FieldError message={getBasicFieldError('deviceType')} />
        </Form.Group>
      </Form.Row>

      <Form.Row>
        <Form.Group>
          <Form.Label htmlFor="make" required>
            Manufacturer/Make
          </Form.Label>
          <Input
            id="make"
            name="make"
            value={deviceBasics.make}
            onChange={handleDeviceBasicsChange}
            placeholder="Siemens, Allen-Bradley, etc."
            className={getBasicFieldError('make') ? 'border-red-300' : ''}
            ref={refs.make as React.RefObject<HTMLInputElement>}
          />
          <FieldError message={getBasicFieldError('make')} />
        </Form.Group>

        <Form.Group>
          <Form.Label htmlFor="model" required>
            Model
          </Form.Label>
          <Input
            id="model"
            name="model"
            value={deviceBasics.model}
            onChange={handleDeviceBasicsChange}
            placeholder="S7-1200, CompactLogix, etc."
            className={getBasicFieldError('model') ? 'border-red-300' : ''}
            ref={refs.model as React.RefObject<HTMLInputElement>}
          />
          <FieldError message={getBasicFieldError('model')} />
        </Form.Group>

        <Form.Group>
          <Form.Label htmlFor="description">Description</Form.Label>
          <Input
            id="description"
            name="description"
            value={deviceBasics.description}
            onChange={handleDeviceBasicsChange}
            placeholder="Optional device driver description"
            ref={refs.description as React.RefObject<HTMLInputElement>}
          />
        </Form.Group>
      </Form.Row>

      {/* New Device Type Modal */}
      {showNewDeviceTypeModal && (
        <NewDeviceTypeModal
          onClose={() => {
            setShowNewDeviceTypeModal(false);
            // Refresh device types when modal is closed (in case user added one)
            loadDeviceTypes();
          }}
          onSubmit={handleNewDeviceTypeSubmit}
        />
      )}
    </div>
  );
};

export default TemplateBasicInfo;
