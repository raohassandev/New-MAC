import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Server, Settings, MapPin, Tag } from 'lucide-react';
import { toast } from 'react-toastify';

// Import UI components
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Form } from '../../components/ui/Form';
import { Tabs } from '../../components/ui/Tabs';
import { Switch } from '../../components/ui/Switch';

interface DeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  title?: string;
  isEditing?: boolean;
}

const DeviceForm: React.FC<DeviceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Add New Device',
  isEditing = false,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [deviceData, setDeviceData] = useState({
    name: '',
    ip: '',
    port: '502',
    slaveId: '1',
    enabled: true,
    make: '',
    model: '',
    description: '',
    tags: [] as string[],
    connectionType: 'tcp',
    serialPort: '',
    baudRate: '9600',
  });
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with data if editing
  useEffect(() => {
    if (initialData) {
      setDeviceData({
        ...deviceData,
        ...initialData,
        port: initialData.port?.toString() || '502',
        slaveId: initialData.slaveId?.toString() || '1',
        baudRate: initialData.baudRate?.toString() || '9600',
      });
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setDeviceData({
      ...deviceData,
      [name]: newValue,
    });

    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !deviceData.tags.includes(newTag.trim())) {
      setDeviceData({
        ...deviceData,
        tags: [...deviceData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDeviceData({
      ...deviceData,
      tags: deviceData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!deviceData.name.trim()) {
      newErrors.name = 'Device name is required';
    }

    if (deviceData.connectionType === 'tcp') {
      if (!deviceData.ip.trim()) {
        newErrors.ip = 'IP address is required';
      }
    } else if (deviceData.connectionType === 'rtu') {
      if (!deviceData.serialPort.trim()) {
        newErrors.serialPort = 'Serial port is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Convert string values to numbers for submission
    const submissionData = {
      ...deviceData,
      port: parseInt(deviceData.port),
      slaveId: parseInt(deviceData.slaveId),
      baudRate: parseInt(deviceData.baudRate),
    };

    onSubmit(submissionData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const tabItems = [
    { id: 'basic', label: 'Basic Details', icon: <Server size={16} /> },
    { id: 'connection', label: 'Connection', icon: <Settings size={16} /> },
    { id: 'advanced', label: 'Advanced', icon: <MapPin size={16} /> },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
      <div className="w-[95vw] md:w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4 md:p-6">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">{title}</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 md:p-6">

        <Form onSubmit={handleSubmit}>
          <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} variant="boxed">
            <div className="overflow-y-auto max-h-[50vh] sm:max-h-[55vh] md:max-h-[60vh] pr-2">
            {activeTab === 'basic' && (
              <div className="space-y-4 pt-4">
                <Form.Group>
                  <Form.Label htmlFor="name" required>
                    Device Name
                  </Form.Label>
                  <Input
                    id="name"
                    name="name"
                    value={deviceData.name}
                    onChange={handleInputChange}
                    placeholder="Enter device name"
                    error={errors.name}
                  />
                </Form.Group>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Form.Group>
                    <Form.Label htmlFor="make">Manufacturer/Make</Form.Label>
                    <Input
                      id="make"
                      name="make"
                      value={deviceData.make}
                      onChange={handleInputChange}
                      placeholder="E.g. Schneider, ABB"
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label htmlFor="model">Model</Form.Label>
                    <Input
                      id="model"
                      name="model"
                      value={deviceData.model}
                      onChange={handleInputChange}
                      placeholder="Device model"
                    />
                  </Form.Group>
                </div>

                <Form.Group>
                  <Form.Label htmlFor="description">Description</Form.Label>
                  <Form.Textarea
                    id="description"
                    name="description"
                    value={deviceData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the device"
                    rows={3}
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label htmlFor="tags">Tags</Form.Label>
                  <div className="flex">
                    <Input
                      id="tags"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Add tag and press Enter"
                      icon={<Tag size={16} />}
                      className="flex-grow"
                    />
                    <Button type="button" onClick={handleAddTag} className="ml-2" variant="outline">
                      <Plus size={16} />
                    </Button>
                  </div>

                  {deviceData.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {deviceData.tags.map(tag => (
                        <div
                          key={tag}
                          className="flex items-center rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1.5 text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>

                <Switch
                  label="Device Enabled"
                  description="Device will be available for communication when enabled"
                  checked={deviceData.enabled}
                  onCheckedChange={(checked) => {
                    setDeviceData({
                      ...deviceData,
                      enabled: checked,
                    });
                  }}
                />
              </div>
            )}

            {activeTab === 'connection' && (
              <div className="space-y-4 pt-4">
                <Form.Group>
                  <Form.Label htmlFor="connectionType">Connection Type</Form.Label>
                  <Form.Select
                    id="connectionType"
                    name="connectionType"
                    value={deviceData.connectionType}
                    onChange={handleInputChange}
                    options={[
                      { value: 'tcp', label: 'Modbus TCP' },
                      { value: 'rtu', label: 'Modbus RTU' },
                    ]}
                  />
                </Form.Group>

                {deviceData.connectionType === 'tcp' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="ip" required>
                        IP Address
                      </Form.Label>
                      <Input
                        id="ip"
                        name="ip"
                        value={deviceData.ip}
                        onChange={handleInputChange}
                        placeholder="192.168.1.100"
                        error={errors.ip}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="port">Port</Form.Label>
                      <Input
                        id="port"
                        name="port"
                        type="number"
                        value={deviceData.port}
                        onChange={handleInputChange}
                        placeholder="502"
                      />
                    </Form.Group>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Form.Group>
                      <Form.Label htmlFor="serialPort" required>
                        Serial Port
                      </Form.Label>
                      <Input
                        id="serialPort"
                        name="serialPort"
                        value={deviceData.serialPort}
                        onChange={handleInputChange}
                        placeholder="COM1, /dev/ttyS0"
                        error={errors.serialPort}
                      />
                    </Form.Group>

                    <Form.Group>
                      <Form.Label htmlFor="baudRate">Baud Rate</Form.Label>
                      <Form.Select
                        id="baudRate"
                        name="baudRate"
                        value={deviceData.baudRate}
                        onChange={handleInputChange}
                        options={[
                          { value: '9600', label: '9600' },
                          { value: '19200', label: '19200' },
                          { value: '38400', label: '38400' },
                          { value: '57600', label: '57600' },
                          { value: '115200', label: '115200' },
                        ]}
                      />
                    </Form.Group>
                  </div>
                )}

                <Form.Group>
                  <Form.Label htmlFor="slaveId">Slave ID</Form.Label>
                  <Input
                    id="slaveId"
                    name="slaveId"
                    type="number"
                    value={deviceData.slaveId}
                    onChange={handleInputChange}
                    placeholder="1"
                  />
                </Form.Group>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-4 pt-4">
                <div className="rounded-md bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    Advanced settings will be available after you create the device.
                  </p>
                </div>
              </div>
            )}
            </div>
          </Tabs>

          <div className="mt-4 md:mt-6 flex justify-end gap-2 sm:space-x-2 border-t pt-3 sm:pt-4">
            <Button 
              variant="outline" 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Save size={16} className="mr-2" />
              {isEditing ? 'Update Device' : 'Create Device'}
            </Button>
          </div>
        </Form>
        </div>
      </div>
    </div>
  );
};

export default DeviceForm;
