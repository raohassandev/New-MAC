import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Form } from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { NewDeviceType } from '../../types/deviceDriver.types';
import { Select } from '../ui';

interface NewDeviceTypeModalProps {
  onClose: () => void;
  onSubmit: (deviceType: NewDeviceType) => void;
}

const NewDeviceTypeModal: React.FC<NewDeviceTypeModalProps> = ({ onClose, onSubmit }) => {
  const [deviceType, setDeviceType] = useState<NewDeviceType>({
    name: '',
    description: '',
    category: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeviceType(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  const getDeviceTypeOptions = (loading = false) => {
    if (loading) {
      return [{ value: '', label: 'Loading device types...', disabled: true }];
    }

    // Default categories
    const defaultCategories = [
      { value: 'energy', label: 'Energy Monitoring' },
      { value: 'hvac', label: 'HVAC' },
      { value: 'plc', label: 'PLC' },
      { value: 'sensor', label: 'Sensor' },
      { value: 'other', label: 'Other' },
    ];

    return [
      { value: '', label: 'Select Category', disabled: true },
      ...defaultCategories,
      { value: 'custom', label: '+ Custom Category' },
    ];
  };
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!deviceType.name.trim()) {
      newErrors.name = 'Device type name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit(deviceType);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold">Add New Device Type</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group>
              <Form.Label htmlFor="name" required>
                Device Type Name
              </Form.Label>
              <Input
                id="name"
                name="name"
                value={deviceType.name}
                onChange={handleChange}
                placeholder="Energy Analyzer, PLC, Temperature Sensor, etc."
                className={errors.name ? 'border-red-300' : ''}
              />
              {errors.name && <div className="mt-1 text-sm text-red-500">{errors.name}</div>}
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="category">Category</Form.Label>
              {/* <Input
              type='dropdown'
                id="category"
                name="category"
                value={deviceType.category}
                onChange={handleChange}
                placeholder="Power Monitoring, Process Control, etc."
              /> */}
              <Select
                id="category"
                name="category"
                value={deviceType.category}
                onChange={value => {
                  setDeviceType(prev => ({
                    ...prev,
                    category: value,
                  }));
                }}
                options={getDeviceTypeOptions(false)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="description">Description</Form.Label>
              <Input
                id="description"
                name="description"
                value={deviceType.description}
                onChange={handleChange}
                placeholder="Short description of this device type"
              />
            </Form.Group>

            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button variant="default" type="submit">
                Create Device Type
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default NewDeviceTypeModal;
